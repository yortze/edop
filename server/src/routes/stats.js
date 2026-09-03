import { Router } from 'express';
import { db, STATUS_LABELS, getSettings } from '../db.js';
import { requireAuth } from '../auth.js';
import { eurToFcfa } from '../pricing.js';

const router = Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const rate = Number(getSettings().fcfa_rate) || 650;

  const totals = db.prepare(`
    SELECT
      COUNT(*) AS shipments,
      COALESCE(SUM(price_eur), 0) AS revenue_eur,
      COALESCE(SUM(weight_kg), 0) AS weight_kg,
      COALESCE(SUM(CASE WHEN status NOT IN ('delivered','cancelled') THEN 1 ELSE 0 END), 0) AS in_progress
    FROM shipments
  `).get();

  const clients = db.prepare('SELECT COUNT(*) AS n FROM clients').get().n;
  const newQuotes = db.prepare("SELECT COUNT(*) AS n FROM quotes WHERE status = 'nouveau'").get().n;

  const byStatus = db.prepare(`
    SELECT status, COUNT(*) AS count FROM shipments GROUP BY status
  `).all().map(r => ({ ...r, label: STATUS_LABELS[r.status] || r.status }));

  // 6 derniers mois : volume + chiffre d'affaires
  const monthly = db.prepare(`
    SELECT strftime('%Y-%m', created_at) AS month,
           COUNT(*) AS shipments,
           COALESCE(SUM(price_eur), 0) AS revenue_eur
    FROM shipments
    WHERE created_at >= date('now', '-6 months')
    GROUP BY month ORDER BY month ASC
  `).all().map(r => ({ ...r, revenue_fcfa: eurToFcfa(r.revenue_eur, rate) }));

  const topCategories = db.prepare(`
    SELECT ca.name, ca.slug, COUNT(s.id) AS shipments, COALESCE(SUM(s.price_eur), 0) AS revenue_eur
    FROM shipments s JOIN categories ca ON ca.id = s.category_id
    GROUP BY ca.id ORDER BY shipments DESC LIMIT 6
  `).all();

  const recent = db.prepare(`
    SELECT s.id, s.tracking_number, s.status, s.price_eur, s.weight_kg, s.created_at,
           cl.name AS client_name, ca.name AS category_name
    FROM shipments s
    LEFT JOIN clients cl ON cl.id = s.client_id
    LEFT JOIN categories ca ON ca.id = s.category_id
    ORDER BY s.created_at DESC, s.id DESC LIMIT 6
  `).all();

  res.json({
    totals: {
      ...totals,
      revenue_fcfa: eurToFcfa(totals.revenue_eur, rate),
      clients,
      new_quotes: newQuotes
    },
    by_status: byStatus,
    monthly,
    top_categories: topCategories,
    recent,
    fcfa_rate: rate
  });
});

export default router;
