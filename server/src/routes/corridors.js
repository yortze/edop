import { Router } from 'express';
import { db, MODES } from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';

const router = Router();

function label(c) {
  return `${c.origin_city} → ${c.dest_city}`;
}

function decorate(c) {
  return {
    ...c,
    label: label(c),
    origin: `${c.origin_city}, ${c.origin_country}`,
    destination: `${c.dest_city}, ${c.dest_country}`
  };
}

// ---- PUBLIC : lignes desservies ----
router.get('/', (req, res) => {
  const { mode, all } = req.query;
  let sql = 'SELECT * FROM corridors';
  const where = [];
  const params = [];
  if (all !== '1') where.push('active = 1');
  if (mode && MODES.includes(mode)) { where.push('mode = ?'); params.push(mode); }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY sort_order ASC, id ASC';
  res.json(db.prepare(sql).all(...params).map(decorate));
});

// ---- ÉQUIPE ----
router.use(requireAuth);

router.post('/', (req, res) => {
  const { origin_city, origin_country, dest_city, dest_country, mode, frequency, transit_days, notes, sort_order } = req.body || {};
  if (!origin_city || !origin_country || !dest_city || !dest_country) {
    return res.status(400).json({ error: 'Ville et pays de départ et d’arrivée requis' });
  }
  const finalMode = MODES.includes(mode) ? mode : 'air';
  const nextOrder = sort_order ?? db.prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM corridors').get().n;

  const info = db.prepare(`
    INSERT INTO corridors (origin_city, origin_country, dest_city, dest_country, mode, frequency, transit_days, notes, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    origin_city.trim(), origin_country.trim(), dest_city.trim(), dest_country.trim(),
    finalMode, frequency || null, transit_days || null, notes || null, nextOrder
  );
  res.status(201).json(decorate(db.prepare('SELECT * FROM corridors WHERE id = ?').get(info.lastInsertRowid)));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM corridors WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Ligne introuvable' });
  const { origin_city, origin_country, dest_city, dest_country, mode, frequency, transit_days, notes, active, sort_order } = req.body || {};

  db.prepare(`
    UPDATE corridors SET origin_city = ?, origin_country = ?, dest_city = ?, dest_country = ?,
                         mode = ?, frequency = ?, transit_days = ?, notes = ?, active = ?, sort_order = ?
    WHERE id = ?
  `).run(
    origin_city?.trim() || existing.origin_city,
    origin_country?.trim() || existing.origin_country,
    dest_city?.trim() || existing.dest_city,
    dest_country?.trim() || existing.dest_country,
    MODES.includes(mode) ? mode : existing.mode,
    frequency !== undefined ? (frequency || null) : existing.frequency,
    transit_days !== undefined ? (transit_days || null) : existing.transit_days,
    notes !== undefined ? (notes || null) : existing.notes,
    active === undefined ? existing.active : (active ? 1 : 0),
    sort_order != null ? Number(sort_order) : existing.sort_order,
    existing.id
  );
  res.json(decorate(db.prepare('SELECT * FROM corridors WHERE id = ?').get(existing.id)));
});

// Création rapide de la ligne inverse (Libreville → Paris depuis Paris → Libreville).
router.post('/:id/reverse', (req, res) => {
  const c = db.prepare('SELECT * FROM corridors WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Ligne introuvable' });

  const already = db.prepare(`
    SELECT 1 FROM corridors
    WHERE origin_city = ? AND dest_city = ? AND mode = ?
  `).get(c.dest_city, c.origin_city, c.mode);
  if (already) return res.status(409).json({ error: 'La ligne inverse existe déjà' });

  const nextOrder = db.prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM corridors').get().n;
  const info = db.prepare(`
    INSERT INTO corridors (origin_city, origin_country, dest_city, dest_country, mode, frequency, transit_days, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(c.dest_city, c.dest_country, c.origin_city, c.origin_country, c.mode, c.frequency, c.transit_days, nextOrder);

  res.status(201).json(decorate(db.prepare('SELECT * FROM corridors WHERE id = ?').get(info.lastInsertRowid)));
});

router.delete('/:id', requireAdmin, (req, res) => {
  const used = db.prepare('SELECT COUNT(*) AS n FROM shipments WHERE corridor_id = ?').get(req.params.id).n;
  if (used > 0) {
    return res.status(400).json({ error: `${used} colis utilisent cette ligne — désactivez-la plutôt que de la supprimer` });
  }
  db.prepare('DELETE FROM corridors WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
