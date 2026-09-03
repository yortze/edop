import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db, DEFAULT_SETTINGS, setSetting } from './db.js';

// Fiche tarifaire E-DOP — expédition aérienne (2 départs par semaine)
const CATEGORIES = [
  { slug: 'medicaments',   name: 'Médicaments',                subtitle: null,                                     price_eur: 26, value_pct: 0,  conditions: 'Ordonnance obligatoire',                icon: 'pill',        sort_order: 1 },
  { slug: 'denrees',       name: 'Denrées alimentaires',       subtitle: 'Fromage, saucisson sec et autres',        price_eur: 19, value_pct: 0,  conditions: null,                                    icon: 'utensils',    sort_order: 2 },
  { slug: 'livres',        name: 'Livres',                     subtitle: null,                                     price_eur: 18, value_pct: 0,  conditions: null,                                    icon: 'book',        sort_order: 3 },
  { slug: 'vetements',     name: 'Vêtements et chaussures',    subtitle: 'Marques classiques',                     price_eur: 18, value_pct: 0,  conditions: null,                                    icon: 'shirt',       sort_order: 4 },
  { slug: 'electro',       name: 'Électrique, électroménagers', subtitle: null,                                    price_eur: 19, value_pct: 0,  conditions: null,                                    icon: 'plug',        sort_order: 5 },
  { slug: 'vins',          name: 'Vin et spiritueux',          subtitle: null,                                     price_eur: 20, value_pct: 0,  conditions: null,                                    icon: 'wine',        sort_order: 6 },
  { slug: 'cosmetiques',   name: 'Cosmétiques',                subtitle: null,                                     price_eur: 19, value_pct: 0,  conditions: null,                                    icon: 'sparkles',    sort_order: 7 },
  { slug: 'objets-valeur', name: 'Objets de valeur',           subtitle: 'Pièces auto-moto, composants électriques, informatique, téléphonie, marques de luxe', price_eur: 19, value_pct: 10, conditions: '+ 10 % de la valeur déclarée', icon: 'gem', sort_order: 8 },
  { slug: 'hors-format',   name: 'Colis hors format',          subtitle: 'Une dimension supérieure à 80 cm',        price_eur: null, value_pct: 0, conditions: 'Sur devis',                            icon: 'boxes',       sort_order: 9,  quote_only: 1 },
  { slug: 'express',       name: 'Expédition express',         subtitle: 'Expédition personnalisée',               price_eur: 26, value_pct: 0,  conditions: null,                                    icon: 'zap',         sort_order: 10 }
];

const DEMO_CLIENTS = [
  { name: 'Aline Mbadinga',  phone: '+241 066 12 34 56', email: null, city: 'Libreville' },
  { name: 'Serge Ondo',      phone: '+33 6 21 45 88 03', email: null, city: 'Paris' },
  { name: 'Nadia Boussougou', phone: '+241 074 90 11 22', email: null, city: 'Libreville' }
];

export function ensureSeed() {
  seedSettings();
  seedAdmin();
  seedCategories();
  seedCorridors();
  seedDemoData();
  backfillCorridors();
}

// Rattache à une ligne les colis créés avant l'arrivée des lignes.
function backfillCorridors() {
  const orphans = db.prepare('SELECT id, origin, destination FROM shipments WHERE corridor_id IS NULL').all();
  if (!orphans.length) return;
  const corridors = db.prepare('SELECT * FROM corridors').all();
  const update = db.prepare('UPDATE shipments SET corridor_id = ? WHERE id = ?');
  let n = 0;
  for (const s of orphans) {
    const match = corridors.find(c =>
      (s.origin || '').startsWith(c.origin_city) && (s.destination || '').startsWith(c.dest_city));
    if (match) { update.run(match.id, s.id); n++; }
  }
  if (n) console.log(`  🔗  ${n} colis rattachés à leur ligne`);
}

// Seules les deux lignes que l'on connaît avec certitude. E-DOP dessert
// d'autres pays : l'équipe les ajoute depuis Back-office → Lignes.
function seedCorridors() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM corridors').get().n;
  if (count > 0) return;
  const insert = db.prepare(`
    INSERT INTO corridors (origin_city, origin_country, dest_city, dest_country, mode, frequency, transit_days, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insert.run('Paris', 'France', 'Libreville', 'Gabon', 'air', '2 départs par semaine', '3 à 5 jours', 1);
  insert.run('Libreville', 'Gabon', 'Paris', 'France', 'air', '2 départs par semaine', '3 à 5 jours', 2);
  console.log('  🛫  2 lignes aériennes créées (Paris ⇄ Libreville)');
}

function seedSettings() {
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    const existing = db.prepare('SELECT 1 FROM settings WHERE key = ?').get(key);
    if (!existing) setSetting(key, value);
  }
}

function seedAdmin() {
  const count = db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'").get().n;
  if (count > 0) return;
  const email = (process.env.ADMIN_EMAIL || 'admin@edop.com').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || 'edop2026';
  const name = process.env.ADMIN_NAME || 'Administrateur E-DOP';
  db.prepare("INSERT INTO users (email, password_hash, name, role, active) VALUES (?, ?, ?, 'admin', 1)")
    .run(email, bcrypt.hashSync(password, 10), name);
  console.log(`  👤  Admin créé : ${email} / ${password}`);
}

function seedCategories() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM categories').get().n;
  if (count > 0) return;
  const insert = db.prepare(`
    INSERT INTO categories (slug, name, subtitle, price_eur, value_pct, conditions, icon, quote_only, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const c of CATEGORIES) {
    insert.run(c.slug, c.name, c.subtitle, c.price_eur, c.value_pct, c.conditions, c.icon, c.quote_only || 0, c.sort_order);
  }
  console.log(`  💶  ${CATEGORIES.length} catégories tarifaires importées`);
}

function seedDemoData() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM shipments').get().n;
  if (count > 0) return;

  const clientIds = DEMO_CLIENTS.map(c =>
    db.prepare('INSERT INTO clients (name, phone, email, city) VALUES (?, ?, ?, ?)')
      .run(c.name, c.phone, c.email, c.city).lastInsertRowid
  );

  const cat = (slug) => db.prepare('SELECT * FROM categories WHERE slug = ?').get(slug);

  const demo = [
    {
      tn: 'EDOP-DEMO2026', client: clientIds[0], category: cat('vetements').id,
      recipient: 'Aline Mbadinga', phone: '+241 066 12 34 56', city: 'Libreville',
      weight: 6.4, value: 180, price: 115.2, status: 'in_transit',
      description: 'Carton vêtements + 2 paires de chaussures',
      events: [
        { status: 'registered', location: 'Paris, France',     note: 'Colis enregistré' },
        { status: 'received',   location: 'Entrepôt Paris',    note: 'Colis réceptionné et pesé' },
        { status: 'in_transit', location: 'Vol Paris → Libreville', note: 'Départ hebdomadaire' }
      ]
    },
    {
      tn: 'EDOP-DEMO7788', client: clientIds[1], category: cat('cosmetiques').id,
      recipient: 'Nadia Boussougou', phone: '+241 074 90 11 22', city: 'Libreville',
      weight: 3.2, value: 340, price: 94.8, status: 'delivered',
      description: 'Produits cosmétiques — valeur déclarée',
      events: [
        { status: 'registered', location: 'Paris, France',  note: 'Colis enregistré' },
        { status: 'received',   location: 'Entrepôt Paris', note: 'Déclaration de valeur enregistrée (340 €)' },
        { status: 'in_transit', location: 'Vol Paris → Libreville', note: null },
        { status: 'arrived',    location: 'Libreville, Gabon', note: 'Dédouanement terminé' },
        { status: 'ready',      location: 'Agence Libreville', note: 'Disponible au retrait' },
        { status: 'delivered',  location: 'Libreville, Gabon', note: 'Remis au destinataire' }
      ]
    },
    {
      tn: 'EDOP-DEMO4412', client: clientIds[2], category: cat('medicaments').id,
      recipient: 'Serge Ondo', phone: '+241 066 55 20 91', city: 'Libreville',
      weight: 1.5, value: 90, price: 39, status: 'registered',
      description: 'Médicaments avec ordonnance',
      events: [{ status: 'registered', location: 'Paris, France', note: 'Ordonnance vérifiée' }]
    }
  ];

  for (const d of demo) {
    const id = db.prepare(`
      INSERT INTO shipments
        (tracking_number, client_id, category_id, recipient_name, recipient_phone, recipient_city,
         weight_kg, declared_value_eur, description, price_eur, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(d.tn, d.client, d.category, d.recipient, d.phone, d.city, d.weight, d.value, d.description, d.price, d.status).lastInsertRowid;

    for (const e of d.events) {
      db.prepare('INSERT INTO shipment_events (shipment_id, status, location, note) VALUES (?, ?, ?, ?)')
        .run(id, e.status, e.location, e.note);
    }
  }

  db.prepare(`
    INSERT INTO quotes (name, phone, email, category_id, weight_kg, declared_value_eur, description, estimated_eur, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('Christelle Nzé', '+241 077 30 44 12', null, cat('vins').id, 12, 260, 'Caisse de vin pour un événement', 240, 'nouveau');

  console.log('  📦  Données de démonstration créées (suivi : EDOP-DEMO2026)');
}

// Exécution directe : `npm run seed`
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  ensureSeed();
  console.log('\n  ✅  Base E-DOP initialisée.\n');
}
