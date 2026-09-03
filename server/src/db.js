import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');
mkdirSync(dataDir, { recursive: true });

// SQLite natif embarqué dans Node (node:sqlite) — aucune dépendance à compiler.
export const db = new DatabaseSync(join(dataDir, 'edop.db'));
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// node:sqlite ne fournit pas d'aide aux transactions comme better-sqlite3 :
// on ajoute un helper compatible db.transaction(fn) => (...args) => résultat.
db.transaction = (fn) => (...args) => {
  db.exec('BEGIN');
  try {
    const result = fn(...args);
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
};

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'moderator',
    active INTEGER NOT NULL DEFAULT 1,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    last_login_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Catégories tarifaires (la fiche tarifaire E-DOP : prix au kg par nature d'article)
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    subtitle TEXT,
    price_eur REAL,
    value_pct REAL NOT NULL DEFAULT 0,
    conditions TEXT,
    icon TEXT NOT NULL DEFAULT 'package',
    image_url TEXT,
    quote_only INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS shipments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tracking_number TEXT UNIQUE NOT NULL,
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    recipient_name TEXT,
    recipient_phone TEXT,
    recipient_city TEXT,
    origin TEXT NOT NULL DEFAULT 'Paris, France',
    destination TEXT NOT NULL DEFAULT 'Libreville, Gabon',
    weight_kg REAL NOT NULL DEFAULT 0,
    declared_value_eur REAL NOT NULL DEFAULT 0,
    description TEXT,
    price_eur REAL NOT NULL DEFAULT 0,
    paid_eur REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'registered',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS shipment_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shipment_id INTEGER NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    location TEXT,
    note TEXT,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS quotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    weight_kg REAL NOT NULL DEFAULT 0,
    declared_value_eur REAL NOT NULL DEFAULT 0,
    description TEXT,
    estimated_eur REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'nouveau',
    note TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Réglages éditables depuis le back-office (taux FCFA, seuils, téléphones…)
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Images hébergées sur Cloudinary
  CREATE TABLE IF NOT EXISTS media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id TEXT UNIQUE NOT NULL,
    url TEXT NOT NULL,
    format TEXT,
    width INTEGER,
    height INTEGER,
    bytes INTEGER,
    section TEXT NOT NULL DEFAULT 'galerie',
    alt TEXT,
    uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Journal des emails Brevo (pour renvoyer / diagnostiquer)
  CREATE TABLE IF NOT EXISTS email_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    to_email TEXT NOT NULL,
    to_name TEXT,
    subject TEXT NOT NULL,
    template TEXT NOT NULL,
    status TEXT NOT NULL,
    provider_id TEXT,
    error TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Lignes desservies : Paris → Libreville, Libreville → Paris, et toutes celles
  -- que l'équipe ajoutera. La colonne mode distingue l'aérien du maritime.
  CREATE TABLE IF NOT EXISTS corridors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    origin_city TEXT NOT NULL,
    origin_country TEXT NOT NULL,
    dest_city TEXT NOT NULL,
    dest_country TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'air',
    frequency TEXT,
    transit_days TEXT,
    notes TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Groupage : plusieurs colis voyagent ensemble et partagent le même suivi.
  CREATE TABLE IF NOT EXISTS groupages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    label TEXT,
    corridor_id INTEGER REFERENCES corridors(id) ON DELETE SET NULL,
    mode TEXT NOT NULL DEFAULT 'air',
    status TEXT NOT NULL DEFAULT 'registered',
    departure_date TEXT,
    eta_date TEXT,
    notes TEXT,
    closed_at TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_groupages_code ON groupages(code);

  CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON shipments(tracking_number);
  CREATE INDEX IF NOT EXISTS idx_events_shipment ON shipment_events(shipment_id);
  CREATE INDEX IF NOT EXISTS idx_media_section ON media(section);
`);

// --- Migrations légères ---
// node:sqlite n'a pas d'`ADD COLUMN IF NOT EXISTS` : on inspecte la table avant
// d'ajouter, pour que les bases déjà créées se mettent à niveau sans perte.
function addColumn(table, column, definition) {
  const exists = db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === column);
  if (!exists) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

addColumn('shipments', 'corridor_id', 'INTEGER REFERENCES corridors(id) ON DELETE SET NULL');
addColumn('shipments', 'groupage_id', 'INTEGER REFERENCES groupages(id) ON DELETE SET NULL');
addColumn('shipments', 'mode', "TEXT NOT NULL DEFAULT 'air'");
addColumn('shipment_events', 'groupage_id', 'INTEGER REFERENCES groupages(id) ON DELETE SET NULL');
addColumn('categories', 'mode', "TEXT NOT NULL DEFAULT 'air'");

db.exec('CREATE INDEX IF NOT EXISTS idx_shipments_groupage ON shipments(groupage_id)');

// Modes de transport
export const MODES = ['air', 'sea'];
export const MODE_LABELS = { air: 'Aérien', sea: 'Maritime' };

// Cycle de vie d'un colis, valable dans les deux sens et sur toutes les lignes.
export const SHIPMENT_STATUSES = [
  'registered',   // Enregistré
  'received',     // Réceptionné à l'entrepôt de départ
  'in_transit',   // En transit (en vol / en mer)
  'arrived',      // Arrivé à destination
  'ready',        // Disponible au retrait
  'delivered',    // Livré
  'cancelled'     // Annulé
];

export const STATUS_LABELS = {
  registered: 'Enregistré',
  received: 'Réceptionné au départ',
  in_transit: 'En transit',
  arrived: 'Arrivé à destination',
  ready: 'Disponible au retrait',
  delivered: 'Livré',
  cancelled: 'Annulé'
};

// Le transit se dit différemment selon le mode : « En vol » ou « En mer ».
const MODE_STATUS_LABELS = {
  air: { in_transit: 'En vol' },
  sea: { in_transit: 'En mer' }
};

export function statusLabel(status, mode = 'air') {
  return MODE_STATUS_LABELS[mode]?.[status] || STATUS_LABELS[status] || status;
}

// --- Réglages : accès typé avec valeurs par défaut ---
export const DEFAULT_SETTINGS = {
  company_name: 'E-DOP',
  tagline: 'Achetez, nous vous livrons',
  corridor: 'France → Gabon et partout ailleurs',
  phone_ga: '+241 074 729 338',
  phone_fr: '+33 7 54 59 76 65',
  email: 'contact@edop.com',
  address_fr: 'Paris, France',
  address_ga: 'Libreville, Gabon',
  facebook_url: '',
  instagram_url: '',
  fcfa_rate: '650',                 // 18 € = 11 700 FCFA -> 650 FCFA/€
  declaration_threshold_eur: '300', // déclaration obligatoire au-delà
  value_surcharge_pct: '10',        // + 10 % de la valeur déclarée au-delà du seuil
  weight_step_kg: '0.1',            // poids arrondi au 100 g supérieur
  other_carrier_fee_eur: '20',      // colis récupéré par un autre transporteur
  departures_per_week: '2',
  oversize_cm: '80',
  deposit_split: '50 % à Paris / 50 % à Libreville',

  // Fret maritime : E-DOP renseigne ces champs depuis le back-office.
  // Tant que sea_enabled vaut '0', le site affiche « bientôt disponible ».
  sea_enabled: '0',
  sea_title: 'Fret maritime',
  sea_intro: '',
  sea_frequency: '',
  sea_transit: '',
  sea_conditions: ''
};

export function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const out = { ...DEFAULT_SETTINGS };
  for (const r of rows) out[r.key] = r.value;
  return out;
}

export function setSetting(key, value) {
  db.prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `).run(key, value == null ? null : String(value));
}
