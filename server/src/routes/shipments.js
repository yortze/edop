import { Router } from 'express';
import { customAlphabet } from 'nanoid';
import { db, SHIPMENT_STATUSES, MODES, statusLabel, getSettings } from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';
import { computePrice, eurToFcfa } from '../pricing.js';
import { sendEmail, shipmentCreatedEmail, statusChangedEmail } from '../mailer.js';

const router = Router();
const genCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);

function makeTrackingNumber() {
  let tn;
  do {
    tn = `EDOP-${genCode()}`;
  } while (db.prepare('SELECT 1 FROM shipments WHERE tracking_number = ?').get(tn));
  return tn;
}

const shipmentSelect = `
  SELECT s.*,
         cl.name AS client_name, cl.phone AS client_phone, cl.email AS client_email,
         ca.name AS category_name, ca.slug AS category_slug, ca.icon AS category_icon, ca.price_eur AS category_price,
         g.code AS groupage_code, g.label AS groupage_label, g.departure_date AS groupage_departure,
         g.eta_date AS groupage_eta,
         co.origin_city, co.dest_city
  FROM shipments s
  LEFT JOIN clients cl ON cl.id = s.client_id
  LEFT JOIN categories ca ON ca.id = s.category_id
  LEFT JOIN groupages g ON g.id = s.groupage_id
  LEFT JOIN corridors co ON co.id = s.corridor_id
`;

// ---- PUBLIC : suivi par numéro de tracking ----
router.get('/track/:tn', (req, res) => {
  const tn = String(req.params.tn).trim().toUpperCase();
  const shipment = db.prepare(`${shipmentSelect} WHERE UPPER(s.tracking_number) = ?`).get(tn);
  if (!shipment) return res.status(404).json({ error: 'Aucun colis trouvé pour ce numéro' });
  const events = db.prepare('SELECT * FROM shipment_events WHERE shipment_id = ? ORDER BY created_at DESC, id DESC').all(shipment.id);

  // Le public ne voit ni le prix, ni les coordonnées complètes du client.
  res.json({
    tracking_number: shipment.tracking_number,
    status: shipment.status,
    status_label: statusLabel(shipment.status, shipment.mode),
    mode: shipment.mode,
    recipient_name: shipment.recipient_name,
    origin: shipment.origin,
    destination: shipment.destination,
    category: shipment.category_name,
    weight_kg: shipment.weight_kg,
    // Colis groupé : le client voit qu'il voyage avec d'autres et à quelle date.
    groupage: shipment.groupage_code ? {
      code: shipment.groupage_code,
      label: shipment.groupage_label,
      departure_date: shipment.groupage_departure,
      eta_date: shipment.groupage_eta
    } : null,
    created_at: shipment.created_at,
    updated_at: shipment.updated_at,
    events: events.map(e => ({
      status: e.status,
      status_label: statusLabel(e.status, shipment.mode),
      location: e.location,
      note: e.note,
      grouped: Boolean(e.groupage_id),
      created_at: e.created_at
    }))
  });
});

// ---- ÉQUIPE (admin + modérateurs) ----
router.use(requireAuth);

router.get('/', (req, res) => {
  const { status, q, groupage, ungrouped, mode } = req.query;
  let sql = shipmentSelect;
  const where = [];
  const params = [];
  if (status && SHIPMENT_STATUSES.includes(status)) { where.push('s.status = ?'); params.push(status); }
  if (mode && MODES.includes(mode)) { where.push('s.mode = ?'); params.push(mode); }
  if (groupage) { where.push('s.groupage_id = ?'); params.push(groupage); }
  // Pour la constitution d'un groupage : les colis pas encore rattachés.
  if (ungrouped === '1') where.push("s.groupage_id IS NULL AND s.status NOT IN ('delivered', 'cancelled')");
  if (q) {
    where.push('(s.tracking_number LIKE ? OR cl.name LIKE ? OR s.recipient_name LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY s.created_at DESC, s.id DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const shipment = db.prepare(`${shipmentSelect} WHERE s.id = ?`).get(req.params.id);
  if (!shipment) return res.status(404).json({ error: 'Colis introuvable' });
  shipment.events = db.prepare(`
    SELECT e.*, u.name AS user_name
    FROM shipment_events e LEFT JOIN users u ON u.id = e.user_id
    WHERE e.shipment_id = ? ORDER BY e.created_at DESC, e.id DESC
  `).all(shipment.id);
  const rate = Number(getSettings().fcfa_rate) || 650;
  shipment.price_fcfa = eurToFcfa(shipment.price_eur, rate);
  res.json(shipment);
});

router.post('/', async (req, res) => {
  const {
    client_name, client_phone, client_email,
    recipient_name, recipient_phone, recipient_city,
    category_id, weight_kg, declared_value_eur, description,
    price_eur, paid_eur, origin, destination, status, notify,
    corridor_id, groupage_id, mode
  } = req.body || {};

  if (!client_name || !category_id) {
    return res.status(400).json({ error: 'Nom de l’expéditeur et catégorie requis' });
  }
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(category_id);
  if (!category) return res.status(400).json({ error: 'Catégorie invalide' });

  const settings = getSettings();

  // Retrouve ou crée le client à partir de son téléphone.
  let client = client_phone
    ? db.prepare('SELECT * FROM clients WHERE phone = ?').get(client_phone)
    : null;
  if (!client) {
    const info = db.prepare('INSERT INTO clients (name, phone, email, city) VALUES (?, ?, ?, ?)')
      .run(client_name, client_phone || null, client_email || null, recipient_city || null);
    client = { id: info.lastInsertRowid, email: client_email || null };
  } else if (client_email && !client.email) {
    db.prepare('UPDATE clients SET email = ? WHERE id = ?').run(client_email, client.id);
    client.email = client_email;
  }

  // Groupage éventuel : il impose sa ligne, son mode et son avancement.
  const groupage = groupage_id ? db.prepare('SELECT * FROM groupages WHERE id = ?').get(groupage_id) : null;
  const corridor = (groupage?.corridor_id || corridor_id)
    ? db.prepare('SELECT * FROM corridors WHERE id = ?').get(groupage?.corridor_id || corridor_id)
    : null;
  const finalMode = groupage?.mode || (MODES.includes(mode) ? mode : (corridor?.mode || 'air'));

  const finalOrigin = origin
    || (corridor ? `${corridor.origin_city}, ${corridor.origin_country}` : settings.address_fr);
  const finalDestination = destination
    || (corridor ? `${corridor.dest_city}, ${corridor.dest_country}` : settings.address_ga);

  const value = Number(declared_value_eur) || 0;
  const computed = computePrice(category, weight_kg, value, settings);
  // Le prix saisi par l'équipe l'emporte sur le calcul automatique.
  const finalPrice = price_eur != null && price_eur !== '' ? Number(price_eur) : computed.total_eur;
  const requested = SHIPMENT_STATUSES.includes(status) ? status : 'registered';
  // Un colis rattaché à un groupage démarre au niveau de suivi du groupage.
  const st = groupage && SHIPMENT_STATUSES.indexOf(groupage.status) > SHIPMENT_STATUSES.indexOf(requested)
    ? groupage.status
    : requested;
  const tn = makeTrackingNumber();

  const tx = db.transaction(() => {
    const info = db.prepare(`
      INSERT INTO shipments
        (tracking_number, client_id, category_id, corridor_id, groupage_id, mode,
         recipient_name, recipient_phone, recipient_city,
         origin, destination, weight_kg, declared_value_eur, description, price_eur, paid_eur, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      tn, client.id, category_id, corridor?.id || null, groupage?.id || null, finalMode,
      recipient_name || null, recipient_phone || null, recipient_city || null,
      finalOrigin, finalDestination,
      computed.billed_weight_kg, value, description || null, finalPrice, Number(paid_eur) || 0, st
    );
    db.prepare('INSERT INTO shipment_events (shipment_id, status, location, note, user_id, groupage_id) VALUES (?, ?, ?, ?, ?, ?)')
      .run(
        info.lastInsertRowid, st, finalOrigin,
        groupage ? `Colis enregistré dans le groupage ${groupage.code}` : 'Colis enregistré',
        req.user.id, groupage?.id || null
      );
    return info.lastInsertRowid;
  });

  const id = tx();
  const shipment = db.prepare(`${shipmentSelect} WHERE s.id = ?`).get(id);
  shipment.pricing = computed;

  // Email de confirmation au client (ne bloque jamais la création).
  if (notify !== false && shipment.client_email) {
    const { subject, html } = shipmentCreatedEmail(shipment, settings);
    shipment.mail = await sendEmail({
      to: shipment.client_email, toName: shipment.client_name,
      subject, html, template: 'shipment_created'
    });
  }
  res.status(201).json(shipment);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM shipments WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Colis introuvable' });
  const {
    recipient_name, recipient_phone, recipient_city, category_id,
    weight_kg, declared_value_eur, description, price_eur, paid_eur, origin, destination,
    corridor_id, mode
  } = req.body || {};

  // Changer de ligne réaligne le trajet affiché, sauf si l'équipe l'a saisi à la main.
  const corridor = corridor_id ? db.prepare('SELECT * FROM corridors WHERE id = ?').get(corridor_id) : null;

  db.prepare(`
    UPDATE shipments SET
      recipient_name = ?, recipient_phone = ?, recipient_city = ?, category_id = ?,
      corridor_id = ?, mode = ?,
      weight_kg = ?, declared_value_eur = ?, description = ?, price_eur = ?, paid_eur = ?,
      origin = ?, destination = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    recipient_name ?? existing.recipient_name,
    recipient_phone ?? existing.recipient_phone,
    recipient_city ?? existing.recipient_city,
    category_id ?? existing.category_id,
    corridor_id !== undefined ? (corridor?.id || null) : existing.corridor_id,
    MODES.includes(mode) ? mode : (corridor?.mode || existing.mode),
    weight_kg != null ? Number(weight_kg) : existing.weight_kg,
    declared_value_eur != null ? Number(declared_value_eur) : existing.declared_value_eur,
    description ?? existing.description,
    price_eur != null ? Number(price_eur) : existing.price_eur,
    paid_eur != null ? Number(paid_eur) : existing.paid_eur,
    origin ?? (corridor ? `${corridor.origin_city}, ${corridor.origin_country}` : existing.origin),
    destination ?? (corridor ? `${corridor.dest_city}, ${corridor.dest_country}` : existing.destination),
    existing.id
  );
  res.json(db.prepare(`${shipmentSelect} WHERE s.id = ?`).get(existing.id));
});

// Ajoute une étape de suivi, met à jour le statut et prévient le client.
router.post('/:id/events', async (req, res) => {
  const shipment = db.prepare(`${shipmentSelect} WHERE s.id = ?`).get(req.params.id);
  if (!shipment) return res.status(404).json({ error: 'Colis introuvable' });
  const { status, location, note, notify } = req.body || {};
  if (!SHIPMENT_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Statut invalide' });
  }

  const tx = db.transaction(() => {
    db.prepare('INSERT INTO shipment_events (shipment_id, status, location, note, user_id) VALUES (?, ?, ?, ?, ?)')
      .run(shipment.id, status, location || null, note || null, req.user.id);
    db.prepare("UPDATE shipments SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, shipment.id);
  });
  tx();

  let mail = null;
  if (notify !== false && shipment.client_email) {
    const label = statusLabel(status, shipment.mode);
    const { subject, html } = statusChangedEmail(shipment, label, { location, note });
    mail = await sendEmail({
      to: shipment.client_email, toName: shipment.client_name,
      subject, html, template: 'status_changed'
    });
  }

  const updated = db.prepare(`${shipmentSelect} WHERE s.id = ?`).get(shipment.id);
  updated.events = db.prepare(`
    SELECT e.*, u.name AS user_name
    FROM shipment_events e LEFT JOIN users u ON u.id = e.user_id
    WHERE e.shipment_id = ? ORDER BY e.created_at DESC, e.id DESC
  `).all(shipment.id);
  updated.mail = mail;
  res.status(201).json(updated);
});

// Suppression définitive : réservée à l'administrateur.
router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM shipments WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
