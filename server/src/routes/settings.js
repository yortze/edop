import { Router } from 'express';
import { db, getSettings, setSetting, DEFAULT_SETTINGS } from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';
import { brevoConfigured } from '../mailer.js';
import { cloudinaryConfigured } from '../cloudinary.js';

const router = Router();

// Réglages exposés publiquement (coordonnées, taux, seuils affichés sur le site).
const PUBLIC_KEYS = [
  'company_name', 'tagline', 'corridor', 'phone_ga', 'phone_fr', 'email',
  'address_fr', 'address_ga', 'facebook_url', 'instagram_url',
  'fcfa_rate', 'declaration_threshold_eur', 'value_surcharge_pct',
  'weight_step_kg', 'other_carrier_fee_eur', 'departures_per_week',
  'oversize_cm', 'deposit_split',
  'sea_enabled', 'sea_title', 'sea_intro', 'sea_frequency', 'sea_transit', 'sea_conditions'
];

router.get('/', (req, res) => {
  const all = getSettings();
  const out = {};
  for (const k of PUBLIC_KEYS) out[k] = all[k];
  res.json(out);
});

// Diagnostic des intégrations — visible par l'équipe connectée.
router.get('/integrations', requireAuth, (req, res) => {
  const lastEmails = db.prepare('SELECT status, COUNT(*) AS n FROM email_log GROUP BY status').all();
  res.json({
    cloudinary: { configured: cloudinaryConfigured(), cloud_name: process.env.CLOUDINARY_CLOUD_NAME || null },
    brevo: { configured: brevoConfigured(), sender: process.env.BREVO_SENDER_EMAIL || null, stats: lastEmails }
  });
});

router.put('/', requireAuth, requireAdmin, (req, res) => {
  const body = req.body || {};
  const updated = {};
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (body[key] !== undefined) {
      setSetting(key, body[key]);
      updated[key] = String(body[key]);
    }
  }
  res.json({ ok: true, updated, settings: getSettings() });
});

// Journal des emails Brevo (les 100 derniers).
router.get('/emails', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM email_log ORDER BY created_at DESC, id DESC LIMIT 100').all());
});

export default router;
