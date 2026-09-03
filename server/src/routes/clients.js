import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const { q } = req.query;
  let sql = `
    SELECT c.*,
           COUNT(s.id) AS shipments_count,
           COALESCE(SUM(s.price_eur), 0) AS total_eur,
           MAX(s.created_at) AS last_shipment_at
    FROM clients c
    LEFT JOIN shipments s ON s.client_id = c.id
  `;
  const params = [];
  if (q) {
    sql += ' WHERE c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?';
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  sql += ' GROUP BY c.id ORDER BY shipments_count DESC, c.name ASC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Client introuvable' });
  client.shipments = db.prepare(`
    SELECT s.*, ca.name AS category_name
    FROM shipments s LEFT JOIN categories ca ON ca.id = s.category_id
    WHERE s.client_id = ? ORDER BY s.created_at DESC
  `).all(client.id);
  res.json(client);
});

router.put('/:id', (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Client introuvable' });
  const { name, phone, email, address, city } = req.body || {};
  db.prepare('UPDATE clients SET name = ?, phone = ?, email = ?, address = ?, city = ? WHERE id = ?')
    .run(
      name?.trim() || client.name,
      phone !== undefined ? (phone || null) : client.phone,
      email !== undefined ? (email || null) : client.email,
      address !== undefined ? (address || null) : client.address,
      city !== undefined ? (city || null) : client.city,
      client.id
    );
  res.json(db.prepare('SELECT * FROM clients WHERE id = ?').get(client.id));
});

router.delete('/:id', requireAdmin, (req, res) => {
  const used = db.prepare('SELECT COUNT(*) AS n FROM shipments WHERE client_id = ?').get(req.params.id).n;
  if (used > 0) return res.status(400).json({ error: `${used} colis sont rattachés à ce client` });
  db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
