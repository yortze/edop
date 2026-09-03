import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';
import { sendEmail, moderatorWelcomeEmail } from '../mailer.js';

const router = Router();

// Toute la gestion de l'équipe est réservée à l'administrateur.
router.use(requireAuth, requireAdmin);

const SAFE_FIELDS = 'id, email, name, phone, role, active, last_login_at, created_at, created_by';
const ROLES = ['admin', 'moderator'];

router.get('/', (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.email, u.name, u.phone, u.role, u.active, u.last_login_at, u.created_at,
           c.name AS created_by_name
    FROM users u
    LEFT JOIN users c ON c.id = u.created_by
    ORDER BY (u.role = 'admin') DESC, u.created_at ASC
  `).all();
  res.json(users);
});

router.post('/', async (req, res) => {
  const { email, name, phone, password, role, send_email } = req.body || {};
  if (!email || !name || !password) {
    return res.status(400).json({ error: 'Nom, email et mot de passe requis' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Le mot de passe doit faire au moins 6 caractères' });
  }
  const cleanEmail = String(email).toLowerCase().trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: 'Adresse email invalide' });
  }
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(cleanEmail)) {
    return res.status(409).json({ error: 'Un compte existe déjà avec cet email' });
  }
  const finalRole = ROLES.includes(role) ? role : 'moderator';

  const info = db.prepare(`
    INSERT INTO users (email, password_hash, name, phone, role, active, created_by)
    VALUES (?, ?, ?, ?, ?, 1, ?)
  `).run(cleanEmail, bcrypt.hashSync(String(password), 10), name.trim(), phone || null, finalRole, req.user.id);

  const user = db.prepare(`SELECT ${SAFE_FIELDS} FROM users WHERE id = ?`).get(info.lastInsertRowid);

  let mail = null;
  if (send_email !== false) {
    const { subject, html } = moderatorWelcomeEmail(user, String(password));
    mail = await sendEmail({ to: user.email, toName: user.name, subject, html, template: 'moderator_welcome' });
  }
  res.status(201).json({ user, mail });
});

router.put('/:id', (req, res) => {
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'Compte introuvable' });

  const { name, phone, role, active } = req.body || {};

  // On ne peut pas se rétrograder soi-même ni se désactiver : cela pourrait
  // laisser la plateforme sans administrateur actif.
  if (target.id === req.user.id && (role && role !== 'admin' || active === 0 || active === false)) {
    return res.status(400).json({ error: 'Vous ne pouvez pas modifier votre propre rôle ni vous désactiver' });
  }
  if (target.role === 'admin' && role && role !== 'admin' && lastActiveAdmin(target.id)) {
    return res.status(400).json({ error: 'Il doit rester au moins un administrateur actif' });
  }

  db.prepare(`
    UPDATE users SET name = ?, phone = ?, role = ?, active = ? WHERE id = ?
  `).run(
    name?.trim() || target.name,
    phone !== undefined ? (phone || null) : target.phone,
    ROLES.includes(role) ? role : target.role,
    active === undefined ? target.active : (active ? 1 : 0),
    target.id
  );
  res.json(db.prepare(`SELECT ${SAFE_FIELDS} FROM users WHERE id = ?`).get(target.id));
});

// Réinitialisation du mot de passe d'un membre par l'admin.
router.post('/:id/password', async (req, res) => {
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'Compte introuvable' });
  const { password, send_email } = req.body || {};
  if (!password || String(password).length < 6) {
    return res.status(400).json({ error: 'Le mot de passe doit faire au moins 6 caractères' });
  }
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
    .run(bcrypt.hashSync(String(password), 10), target.id);

  let mail = null;
  if (send_email) {
    const { subject, html } = moderatorWelcomeEmail(target, String(password));
    mail = await sendEmail({ to: target.email, toName: target.name, subject, html, template: 'password_reset' });
  }
  res.json({ ok: true, mail });
});

router.delete('/:id', (req, res) => {
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'Compte introuvable' });
  if (target.id === req.user.id) {
    return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
  }
  if (target.role === 'admin' && lastActiveAdmin(target.id)) {
    return res.status(400).json({ error: 'Il doit rester au moins un administrateur actif' });
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(target.id);
  res.json({ ok: true });
});

function lastActiveAdmin(excludeId) {
  const n = db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND active = 1 AND id != ?").get(excludeId).n;
  return n === 0;
}

export default router;
