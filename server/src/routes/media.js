import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';
import { cloudinaryConfigured, signUpload, destroyAsset, cloudName } from '../cloudinary.js';

const router = Router();

// ---- PUBLIC : images affichées sur le site (hero, galerie…) ----
router.get('/', (req, res) => {
  const { section } = req.query;
  const rows = section
    ? db.prepare('SELECT id, public_id, url, alt, section, width, height FROM media WHERE section = ? ORDER BY created_at DESC').all(section)
    : db.prepare('SELECT id, public_id, url, alt, section, width, height FROM media ORDER BY created_at DESC').all();
  res.json(rows);
});

// ---- ÉQUIPE ----
router.use(requireAuth);

router.get('/all', (req, res) => {
  res.json(db.prepare(`
    SELECT m.*, u.name AS uploaded_by_name
    FROM media m LEFT JOIN users u ON u.id = m.uploaded_by
    ORDER BY m.created_at DESC, m.id DESC
  `).all());
});

/**
 * Renvoie une signature d'upload à usage unique. Le navigateur poste ensuite
 * le fichier directement à Cloudinary : rien ne transite par notre serveur,
 * et l'API secret ne quitte jamais le back.
 */
router.post('/sign', (req, res) => {
  if (!cloudinaryConfigured()) {
    return res.status(503).json({
      error: 'Cloudinary n’est pas configuré. Renseignez CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY et CLOUDINARY_API_SECRET dans server/.env.'
    });
  }
  const section = String(req.body?.section || 'galerie').replace(/[^a-z0-9_-]/gi, '') || 'galerie';
  res.json(signUpload({ section }));
});

// Enregistre en base l'image renvoyée par Cloudinary après l'upload.
router.post('/', (req, res) => {
  const { public_id, secure_url, url, format, width, height, bytes, section, alt } = req.body || {};
  const finalUrl = secure_url || url;
  if (!public_id || !finalUrl) {
    return res.status(400).json({ error: 'public_id et url requis' });
  }
  db.prepare(`
    INSERT INTO media (public_id, url, format, width, height, bytes, section, alt, uploaded_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(public_id) DO UPDATE SET url = excluded.url, section = excluded.section, alt = excluded.alt
  `).run(
    public_id, finalUrl, format || null,
    Number(width) || null, Number(height) || null, Number(bytes) || null,
    section || 'galerie', alt || null, req.user.id
  );
  res.status(201).json(db.prepare('SELECT * FROM media WHERE public_id = ?').get(public_id));
});

router.patch('/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM media WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Image introuvable' });
  const { alt, section } = req.body || {};
  db.prepare('UPDATE media SET alt = ?, section = ? WHERE id = ?')
    .run(alt !== undefined ? (alt || null) : item.alt, section || item.section, item.id);
  res.json(db.prepare('SELECT * FROM media WHERE id = ?').get(item.id));
});

// Suppression définitive (base + Cloudinary) : réservée à l'administrateur.
router.delete('/:id', requireAdmin, async (req, res) => {
  const item = db.prepare('SELECT * FROM media WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Image introuvable' });
  const remote = await destroyAsset(item.public_id);
  db.prepare('DELETE FROM media WHERE id = ?').run(item.id);
  res.json({ ok: true, cloudinary: remote });
});

router.get('/config', (req, res) => {
  res.json({ configured: cloudinaryConfigured(), cloud_name: cloudName() });
});

export default router;
