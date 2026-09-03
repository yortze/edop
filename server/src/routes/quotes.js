import { Router } from 'express';
import { db, getSettings } from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';
import { computePrice } from '../pricing.js';
import { sendEmail, quoteReceivedEmail, internalQuoteAlert } from '../mailer.js';

const router = Router();
const QUOTE_STATUSES = ['nouveau', 'contacte', 'converti', 'perdu'];

const quoteSelect = `
  SELECT q.*, c.name AS category_name, c.slug AS category_slug, c.icon AS category_icon
  FROM quotes q LEFT JOIN categories c ON c.id = q.category_id
`;

// ---- PUBLIC : estimation instantanée ----
router.post('/estimate', (req, res) => {
  const { category_id, weight_kg, declared_value_eur } = req.body || {};
  const category = db.prepare('SELECT * FROM categories WHERE id = ? AND active = 1').get(category_id);
  if (!category) return res.status(400).json({ error: 'Catégorie invalide' });
  res.json(computePrice(category, weight_kg, declared_value_eur, getSettings()));
});

// ---- PUBLIC : dépôt d'une demande de devis ----
router.post('/', async (req, res) => {
  const { name, phone, email, category_id, weight_kg, declared_value_eur, description } = req.body || {};
  if (!name || !phone) {
    return res.status(400).json({ error: 'Nom et téléphone requis' });
  }
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email))) {
    return res.status(400).json({ error: 'Adresse email invalide' });
  }

  const category = category_id
    ? db.prepare('SELECT * FROM categories WHERE id = ?').get(category_id)
    : null;
  const computed = computePrice(category, weight_kg, declared_value_eur, getSettings());

  const info = db.prepare(`
    INSERT INTO quotes (name, phone, email, category_id, weight_kg, declared_value_eur, description, estimated_eur)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name.trim(), phone.trim(), email || null, category?.id || null,
    computed.billed_weight_kg, computed.declared_value_eur, description || null,
    computed.quote_only ? 0 : computed.total_eur
  );

  const quote = db.prepare(`${quoteSelect} WHERE q.id = ?`).get(info.lastInsertRowid);

  // Accusé de réception au client + alerte interne (Brevo).
  if (quote.email) {
    const { subject, html } = quoteReceivedEmail(quote, category);
    await sendEmail({ to: quote.email, toName: quote.name, subject, html, template: 'quote_received' });
  }
  if (process.env.BREVO_NOTIFY_EMAIL) {
    const { subject, html } = internalQuoteAlert(quote, category);
    await sendEmail({ to: process.env.BREVO_NOTIFY_EMAIL, toName: 'E-DOP', subject, html, template: 'quote_internal' });
  }

  res.status(201).json({ ...quote, pricing: computed });
});

// ---- ÉQUIPE ----
router.use(requireAuth);

router.get('/', (req, res) => {
  const { status } = req.query;
  let sql = quoteSelect;
  const params = [];
  if (status && QUOTE_STATUSES.includes(status)) { sql += ' WHERE q.status = ?'; params.push(status); }
  sql += ' ORDER BY q.created_at DESC, q.id DESC';
  res.json(db.prepare(sql).all(...params));
});

router.patch('/:id', (req, res) => {
  const quote = db.prepare('SELECT * FROM quotes WHERE id = ?').get(req.params.id);
  if (!quote) return res.status(404).json({ error: 'Devis introuvable' });
  const { status, note } = req.body || {};
  if (status && !QUOTE_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Statut invalide' });
  }
  db.prepare('UPDATE quotes SET status = ?, note = ? WHERE id = ?')
    .run(status || quote.status, note !== undefined ? (note || null) : quote.note, quote.id);
  res.json(db.prepare(`${quoteSelect} WHERE q.id = ?`).get(quote.id));
});

router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM quotes WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
