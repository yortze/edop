import jwt from 'jsonwebtoken';
import { db } from './db.js';

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    SECRET,
    { expiresIn: '7d' }
  );
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Non authentifié' });
  let payload;
  try {
    payload = jwt.verify(token, SECRET);
  } catch {
    return res.status(401).json({ error: 'Session expirée ou invalide' });
  }
  // On relit l'utilisateur : un compte désactivé ou supprimé par l'admin
  // perd l'accès immédiatement, sans attendre l'expiration du token.
  const user = db.prepare('SELECT id, email, name, role, active FROM users WHERE id = ?').get(payload.id);
  if (!user) return res.status(401).json({ error: 'Compte introuvable' });
  if (!user.active) return res.status(403).json({ error: 'Compte désactivé — contactez l’administrateur' });
  req.user = { id: user.id, email: user.email, name: user.name, role: user.role };
  next();
}

// Réservé à l'administrateur : gestion des comptes, réglages, suppressions.
export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Action réservée à l’administrateur' });
  }
  next();
}
