import { Router } from 'express';
import { customAlphabet } from 'nanoid';
import { db, SHIPMENT_STATUSES, MODES, statusLabel } from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';
import { sendEmail, statusChangedEmail } from '../mailer.js';

const router = Router();
const genCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

function makeCode() {
  let code;
  do {
    code = `GRP-${genCode()}`;
  } while (db.prepare('SELECT 1 FROM groupages WHERE code = ?').get(code));
  return code;
}

const groupageSelect = `
  SELECT g.*,
         c.origin_city, c.origin_country, c.dest_city, c.dest_country,
         (SELECT COUNT(*) FROM shipments s WHERE s.groupage_id = g.id) AS shipments_count,
         (SELECT COALESCE(SUM(s.weight_kg), 0) FROM shipments s WHERE s.groupage_id = g.id) AS total_weight_kg,
         (SELECT COALESCE(SUM(s.price_eur), 0) FROM shipments s WHERE s.groupage_id = g.id) AS total_eur
  FROM groupages g
  LEFT JOIN corridors c ON c.id = g.corridor_id
`;

function decorate(g) {
  if (!g) return g;
  return {
    ...g,
    status_label: statusLabel(g.status, g.mode),
    corridor_label: g.origin_city ? `${g.origin_city} → ${g.dest_city}` : null,
    origin: g.origin_city ? `${g.origin_city}, ${g.origin_country}` : null,
    destination: g.dest_city ? `${g.dest_city}, ${g.dest_country}` : null
  };
}

// Étapes partagées d'un groupage : un événement posé sur le groupage est
// recopié sur chaque colis, on relit donc la timeline depuis n'importe lequel.
function groupageEvents(groupageId) {
  return db.prepare(`
    SELECT e.status, e.location, e.note, MIN(e.created_at) AS created_at, u.name AS user_name
    FROM shipment_events e
    LEFT JOIN users u ON u.id = e.user_id
    WHERE e.groupage_id = ?
    GROUP BY e.status, e.location, e.note
    ORDER BY created_at DESC
  `).all(groupageId);
}

// ---- PUBLIC : suivi d'un groupage par son code ----
// On expose l'avancement partagé, jamais la liste des colis ni les clients.
router.get('/track/:code', (req, res) => {
  const code = String(req.params.code).trim().toUpperCase();
  const g = db.prepare(`${groupageSelect} WHERE UPPER(g.code) = ?`).get(code);
  if (!g) return res.status(404).json({ error: 'Aucun groupage trouvé pour ce code' });

  res.json({
    code: g.code,
    label: g.label,
    mode: g.mode,
    status: g.status,
    status_label: statusLabel(g.status, g.mode),
    origin: g.origin_city ? `${g.origin_city}, ${g.origin_country}` : null,
    destination: g.dest_city ? `${g.dest_city}, ${g.dest_country}` : null,
    departure_date: g.departure_date,
    eta_date: g.eta_date,
    shipments_count: g.shipments_count,
    events: groupageEvents(g.id).map(e => ({
      status: e.status,
      status_label: statusLabel(e.status, g.mode),
      location: e.location,
      note: e.note,
      created_at: e.created_at
    }))
  });
});

// ---- ÉQUIPE ----
router.use(requireAuth);

router.get('/', (req, res) => {
  const { status, open } = req.query;
  let sql = groupageSelect;
  const where = [];
  const params = [];
  if (status && SHIPMENT_STATUSES.includes(status)) { where.push('g.status = ?'); params.push(status); }
  if (open === '1') where.push("g.status NOT IN ('delivered', 'cancelled')");
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY g.created_at DESC, g.id DESC';
  res.json(db.prepare(sql).all(...params).map(decorate));
});

router.get('/:id', (req, res) => {
  const g = db.prepare(`${groupageSelect} WHERE g.id = ?`).get(req.params.id);
  if (!g) return res.status(404).json({ error: 'Groupage introuvable' });

  const out = decorate(g);
  out.shipments = db.prepare(`
    SELECT s.id, s.tracking_number, s.status, s.weight_kg, s.price_eur, s.recipient_name,
           cl.name AS client_name, cl.email AS client_email, ca.name AS category_name
    FROM shipments s
    LEFT JOIN clients cl ON cl.id = s.client_id
    LEFT JOIN categories ca ON ca.id = s.category_id
    WHERE s.groupage_id = ?
    ORDER BY s.created_at ASC
  `).all(g.id);
  out.events = groupageEvents(g.id).map(e => ({ ...e, status_label: statusLabel(e.status, g.mode) }));
  res.json(out);
});

router.post('/', (req, res) => {
  const { label, corridor_id, mode, departure_date, eta_date, notes } = req.body || {};
  const corridor = corridor_id ? db.prepare('SELECT * FROM corridors WHERE id = ?').get(corridor_id) : null;
  const finalMode = MODES.includes(mode) ? mode : (corridor?.mode || 'air');
  const code = makeCode();

  const info = db.prepare(`
    INSERT INTO groupages (code, label, corridor_id, mode, departure_date, eta_date, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(code, label || null, corridor?.id || null, finalMode, departure_date || null, eta_date || null, notes || null, req.user.id);

  res.status(201).json(decorate(db.prepare(`${groupageSelect} WHERE g.id = ?`).get(info.lastInsertRowid)));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM groupages WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Groupage introuvable' });
  const { label, corridor_id, mode, departure_date, eta_date, notes } = req.body || {};

  db.prepare(`
    UPDATE groupages SET label = ?, corridor_id = ?, mode = ?, departure_date = ?, eta_date = ?, notes = ?,
                         updated_at = datetime('now')
    WHERE id = ?
  `).run(
    label !== undefined ? (label || null) : existing.label,
    corridor_id !== undefined ? (corridor_id || null) : existing.corridor_id,
    MODES.includes(mode) ? mode : existing.mode,
    departure_date !== undefined ? (departure_date || null) : existing.departure_date,
    eta_date !== undefined ? (eta_date || null) : existing.eta_date,
    notes !== undefined ? (notes || null) : existing.notes,
    existing.id
  );
  res.json(decorate(db.prepare(`${groupageSelect} WHERE g.id = ?`).get(existing.id)));
});

// Rattache des colis au groupage. Ils héritent de sa ligne et de son mode,
// et sont alignés sur son statut courant pour partager le même suivi.
router.post('/:id/shipments', (req, res) => {
  const g = db.prepare('SELECT * FROM groupages WHERE id = ?').get(req.params.id);
  if (!g) return res.status(404).json({ error: 'Groupage introuvable' });

  const ids = Array.isArray(req.body?.shipment_ids) ? req.body.shipment_ids.map(Number).filter(Boolean) : [];
  if (!ids.length) return res.status(400).json({ error: 'Aucun colis sélectionné' });

  const corridor = g.corridor_id ? db.prepare('SELECT * FROM corridors WHERE id = ?').get(g.corridor_id) : null;

  const tx = db.transaction(() => {
    for (const id of ids) {
      const s = db.prepare('SELECT * FROM shipments WHERE id = ?').get(id);
      if (!s || s.status === 'cancelled') continue;
      db.prepare(`
        UPDATE shipments SET groupage_id = ?, corridor_id = ?, mode = ?,
                             origin = ?, destination = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(
        g.id, g.corridor_id, g.mode,
        corridor ? `${corridor.origin_city}, ${corridor.origin_country}` : s.origin,
        corridor ? `${corridor.dest_city}, ${corridor.dest_country}` : s.destination,
        id
      );
      // Le colis rejoint l'avancement du groupage s'il est en retard sur lui.
      if (SHIPMENT_STATUSES.indexOf(s.status) < SHIPMENT_STATUSES.indexOf(g.status)) {
        db.prepare("UPDATE shipments SET status = ?, updated_at = datetime('now') WHERE id = ?").run(g.status, id);
        db.prepare('INSERT INTO shipment_events (shipment_id, status, location, note, user_id, groupage_id) VALUES (?, ?, ?, ?, ?, ?)')
          .run(id, g.status, null, `Rattaché au groupage ${g.code}`, req.user.id, g.id);
      }
    }
  });
  tx();

  res.json(decorate(db.prepare(`${groupageSelect} WHERE g.id = ?`).get(g.id)));
});

router.delete('/:id/shipments/:shipmentId', (req, res) => {
  const s = db.prepare('SELECT * FROM shipments WHERE id = ? AND groupage_id = ?')
    .get(req.params.shipmentId, req.params.id);
  if (!s) return res.status(404).json({ error: 'Ce colis n’est pas dans ce groupage' });
  db.prepare("UPDATE shipments SET groupage_id = NULL, updated_at = datetime('now') WHERE id = ?").run(s.id);
  res.json({ ok: true });
});

/**
 * Une étape posée sur le groupage s'applique à tous ses colis :
 * un événement par colis, le statut de chacun mis à jour, et un email
 * à chaque client qui en a un. C'est le cœur du « même niveau de suivi ».
 */
router.post('/:id/events', async (req, res) => {
  const g = db.prepare('SELECT * FROM groupages WHERE id = ?').get(req.params.id);
  if (!g) return res.status(404).json({ error: 'Groupage introuvable' });

  const { status, location, note, notify } = req.body || {};
  if (!SHIPMENT_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Statut invalide' });
  }

  const shipments = db.prepare(`
    SELECT s.*, cl.name AS client_name, cl.email AS client_email, ca.name AS category_name
    FROM shipments s
    LEFT JOIN clients cl ON cl.id = s.client_id
    LEFT JOIN categories ca ON ca.id = s.category_id
    WHERE s.groupage_id = ? AND s.status != 'cancelled'
  `).all(g.id);

  const tx = db.transaction(() => {
    for (const s of shipments) {
      db.prepare('INSERT INTO shipment_events (shipment_id, status, location, note, user_id, groupage_id) VALUES (?, ?, ?, ?, ?, ?)')
        .run(s.id, status, location || null, note || null, req.user.id, g.id);
      db.prepare("UPDATE shipments SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, s.id);
    }
    db.prepare(`
      UPDATE groupages SET status = ?, updated_at = datetime('now'),
                           closed_at = CASE WHEN ? IN ('delivered', 'cancelled') THEN datetime('now') ELSE closed_at END
      WHERE id = ?
    `).run(status, status, g.id);
  });
  tx();

  // Emails aux clients concernés — un envoi raté ne bloque jamais l'étape.
  const label = statusLabel(status, g.mode);
  let notified = 0;
  if (notify !== false) {
    for (const s of shipments) {
      if (!s.client_email) continue;
      const { subject, html } = statusChangedEmail(s, label, { location, note });
      const result = await sendEmail({
        to: s.client_email, toName: s.client_name,
        subject, html, template: 'groupage_status'
      });
      if (result.status === 'sent') notified++;
    }
  }

  const out = decorate(db.prepare(`${groupageSelect} WHERE g.id = ?`).get(g.id));
  out.events = groupageEvents(g.id).map(e => ({ ...e, status_label: statusLabel(e.status, g.mode) }));
  out.affected = shipments.length;
  out.notified = notified;
  res.status(201).json(out);
});

// Suppression du groupage : les colis sont détachés, jamais supprimés.
router.delete('/:id', requireAdmin, (req, res) => {
  const g = db.prepare('SELECT * FROM groupages WHERE id = ?').get(req.params.id);
  if (!g) return res.status(404).json({ error: 'Groupage introuvable' });
  const tx = db.transaction(() => {
    db.prepare('UPDATE shipments SET groupage_id = NULL WHERE groupage_id = ?').run(g.id);
    db.prepare('DELETE FROM groupages WHERE id = ?').run(g.id);
  });
  tx();
  res.json({ ok: true });
});

export default router;
