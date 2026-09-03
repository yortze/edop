import { Router } from 'express';
import { db, getSettings, MODES } from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';
import { eurToFcfa } from '../pricing.js';

const router = Router();

// ---- PUBLIC : la fiche tarifaire affichée sur le site ----
router.get('/', (req, res) => {
  const all = req.query.all === '1';
  const { mode } = req.query;
  const where = [];
  const params = [];
  if (!all) where.push('active = 1');
  if (mode && MODES.includes(mode)) { where.push('mode = ?'); params.push(mode); }
  const rows = db.prepare(`
    SELECT * FROM categories
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY sort_order ASC, id ASC
  `).all(...params);
  const rate = Number(getSettings().fcfa_rate) || 650;
  res.json(rows.map(c => ({ ...c, price_fcfa: c.price_eur == null ? null : eurToFcfa(c.price_eur, rate) })));
});

// ---- ADMIN / MODÉRATEUR ----
router.use(requireAuth);

router.post('/', (req, res) => {
  const { slug, name, subtitle, price_eur, value_pct, conditions, icon, quote_only, sort_order, image_url, mode } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Nom requis' });

  const finalMode = MODES.includes(mode) ? mode : 'air';
  const base = (slug || name).toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  // Une même nature d'article peut exister en aérien et en maritime :
  // on suffixe le slug par le mode plutôt que de refuser le doublon.
  let finalSlug = base;
  if (db.prepare('SELECT 1 FROM categories WHERE slug = ?').get(finalSlug)) {
    finalSlug = `${base}-${finalMode}`;
    if (db.prepare('SELECT 1 FROM categories WHERE slug = ?').get(finalSlug)) {
      return res.status(409).json({ error: 'Une catégorie existe déjà avec ce nom pour ce mode' });
    }
  }
  const isQuoteOnly = quote_only ? 1 : 0;
  const nextOrder = sort_order ?? (db.prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM categories').get().n);

  const info = db.prepare(`
    INSERT INTO categories (slug, name, subtitle, price_eur, value_pct, conditions, icon, image_url, quote_only, sort_order, mode)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    finalSlug, name.trim(), subtitle || null,
    isQuoteOnly ? null : Number(price_eur) || 0,
    Number(value_pct) || 0,
    conditions || null, icon || 'package', image_url || null, isQuoteOnly, nextOrder, finalMode
  );
  res.status(201).json(db.prepare('SELECT * FROM categories WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Catégorie introuvable' });
  const { name, subtitle, price_eur, value_pct, conditions, icon, image_url, quote_only, active, sort_order, mode } = req.body || {};
  const isQuoteOnly = quote_only === undefined ? existing.quote_only : (quote_only ? 1 : 0);

  db.prepare(`
    UPDATE categories SET name = ?, subtitle = ?, price_eur = ?, value_pct = ?, conditions = ?,
                          icon = ?, image_url = ?, quote_only = ?, active = ?, sort_order = ?, mode = ?
    WHERE id = ?
  `).run(
    name?.trim() || existing.name,
    subtitle !== undefined ? (subtitle || null) : existing.subtitle,
    isQuoteOnly ? null : (price_eur != null ? Number(price_eur) : existing.price_eur),
    value_pct != null ? Number(value_pct) : existing.value_pct,
    conditions !== undefined ? (conditions || null) : existing.conditions,
    icon || existing.icon,
    image_url !== undefined ? (image_url || null) : existing.image_url,
    isQuoteOnly,
    active === undefined ? existing.active : (active ? 1 : 0),
    sort_order != null ? Number(sort_order) : existing.sort_order,
    MODES.includes(mode) ? mode : existing.mode,
    existing.id
  );
  res.json(db.prepare('SELECT * FROM categories WHERE id = ?').get(existing.id));
});

// Suppression définitive : réservée à l'administrateur.
router.delete('/:id', requireAdmin, (req, res) => {
  const used = db.prepare('SELECT COUNT(*) AS n FROM shipments WHERE category_id = ?').get(req.params.id).n;
  if (used > 0) {
    return res.status(400).json({ error: `${used} colis utilisent cette catégorie — désactivez-la plutôt que de la supprimer` });
  }
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
