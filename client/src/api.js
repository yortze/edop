const TOKEN_KEY = 'edop_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Une erreur est survenue');
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  // ---- Public ----
  settings: () => request('/settings'),
  categories: (mode) => request(`/categories${mode ? `?mode=${mode}` : ''}`),
  corridors: (mode) => request(`/corridors${mode ? `?mode=${mode}` : ''}`),
  media: (section) => request(`/media${section ? `?section=${encodeURIComponent(section)}` : ''}`),
  track: (tn) => request(`/shipments/track/${encodeURIComponent(tn)}`),
  trackGroupage: (code) => request(`/groupages/track/${encodeURIComponent(code)}`),
  estimate: (payload) => request('/quotes/estimate', { method: 'POST', body: payload }),
  submitQuote: (payload) => request('/quotes', { method: 'POST', body: payload }),

  // ---- Auth ----
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  changePassword: (current_password, new_password) =>
    request('/auth/password', { method: 'POST', body: { current_password, new_password }, auth: true }),

  // ---- Back-office ----
  stats: () => request('/stats', { auth: true }),

  shipments: (params = '') => request(`/shipments${params}`, { auth: true }),
  shipment: (id) => request(`/shipments/${id}`, { auth: true }),
  createShipment: (payload) => request('/shipments', { method: 'POST', body: payload, auth: true }),
  updateShipment: (id, payload) => request(`/shipments/${id}`, { method: 'PUT', body: payload, auth: true }),
  addEvent: (id, payload) => request(`/shipments/${id}/events`, { method: 'POST', body: payload, auth: true }),
  deleteShipment: (id) => request(`/shipments/${id}`, { method: 'DELETE', auth: true }),

  quotes: (params = '') => request(`/quotes${params}`, { auth: true }),
  updateQuote: (id, payload) => request(`/quotes/${id}`, { method: 'PATCH', body: payload, auth: true }),
  deleteQuote: (id) => request(`/quotes/${id}`, { method: 'DELETE', auth: true }),

  // Lignes desservies
  adminCorridors: () => request('/corridors?all=1'),
  createCorridor: (payload) => request('/corridors', { method: 'POST', body: payload, auth: true }),
  updateCorridor: (id, payload) => request(`/corridors/${id}`, { method: 'PUT', body: payload, auth: true }),
  reverseCorridor: (id) => request(`/corridors/${id}/reverse`, { method: 'POST', auth: true }),
  deleteCorridor: (id) => request(`/corridors/${id}`, { method: 'DELETE', auth: true }),

  // Groupages
  groupages: (params = '') => request(`/groupages${params}`, { auth: true }),
  groupage: (id) => request(`/groupages/${id}`, { auth: true }),
  createGroupage: (payload) => request('/groupages', { method: 'POST', body: payload, auth: true }),
  updateGroupage: (id, payload) => request(`/groupages/${id}`, { method: 'PUT', body: payload, auth: true }),
  addToGroupage: (id, shipment_ids) => request(`/groupages/${id}/shipments`, { method: 'POST', body: { shipment_ids }, auth: true }),
  removeFromGroupage: (id, shipmentId) => request(`/groupages/${id}/shipments/${shipmentId}`, { method: 'DELETE', auth: true }),
  addGroupageEvent: (id, payload) => request(`/groupages/${id}/events`, { method: 'POST', body: payload, auth: true }),
  deleteGroupage: (id) => request(`/groupages/${id}`, { method: 'DELETE', auth: true }),

  adminCategories: () => request('/categories?all=1'),
  createCategory: (payload) => request('/categories', { method: 'POST', body: payload, auth: true }),
  updateCategory: (id, payload) => request(`/categories/${id}`, { method: 'PUT', body: payload, auth: true }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE', auth: true }),

  clients: (params = '') => request(`/clients${params}`, { auth: true }),
  client: (id) => request(`/clients/${id}`, { auth: true }),
  updateClient: (id, payload) => request(`/clients/${id}`, { method: 'PUT', body: payload, auth: true }),

  // Équipe — réservé à l'administrateur
  users: () => request('/users', { auth: true }),
  createUser: (payload) => request('/users', { method: 'POST', body: payload, auth: true }),
  updateUser: (id, payload) => request(`/users/${id}`, { method: 'PUT', body: payload, auth: true }),
  resetUserPassword: (id, payload) => request(`/users/${id}/password`, { method: 'POST', body: payload, auth: true }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE', auth: true }),

  // Réglages — lecture équipe, écriture admin
  updateSettings: (payload) => request('/settings', { method: 'PUT', body: payload, auth: true }),
  integrations: () => request('/settings/integrations', { auth: true }),
  emailLog: () => request('/settings/emails', { auth: true }),

  // Médias Cloudinary
  allMedia: () => request('/media/all', { auth: true }),
  signUpload: (section) => request('/media/sign', { method: 'POST', body: { section }, auth: true }),
  saveMedia: (payload) => request('/media', { method: 'POST', body: payload, auth: true }),
  updateMedia: (id, payload) => request(`/media/${id}`, { method: 'PATCH', body: payload, auth: true }),
  deleteMedia: (id) => request(`/media/${id}`, { method: 'DELETE', auth: true })
};

/**
 * Upload direct navigateur → Cloudinary, avec la signature fournie par l'API.
 * Le fichier ne transite jamais par notre serveur.
 */
export function uploadToCloudinary(file, sign, onProgress) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);
    form.append('api_key', sign.api_key);
    form.append('timestamp', sign.timestamp);
    form.append('signature', sign.signature);
    form.append('folder', sign.folder);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', sign.upload_url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      const data = JSON.parse(xhr.responseText || '{}');
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new Error(data.error?.message || 'Échec de l’envoi vers Cloudinary'));
    };
    xhr.onerror = () => reject(new Error('Connexion à Cloudinary impossible'));
    xhr.send(form);
  });
}

// ---------- Helpers d'affichage ----------

export function formatEur(n) {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0) + ' €';
}
export function formatFCFA(n) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(Number(n) || 0)) + ' FCFA';
}
export function formatDate(s) {
  if (!s) return '—';
  return new Date(s.replace(' ', 'T') + (s.includes('Z') ? '' : 'Z'))
    .toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}
export function formatDateTime(s) {
  if (!s) return '—';
  return new Date(s.replace(' ', 'T') + (s.includes('Z') ? '' : 'Z'))
    .toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
export function waLink(phone, text = '') {
  const clean = String(phone || '').replace(/[^0-9]/g, '');
  return `https://wa.me/${clean}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

// Cycle de vie d'un colis — doit rester aligné sur server/src/db.js
export const STATUS_META = {
  registered: { label: 'Enregistré',            color: '#7a6a78', step: 0 },
  received:   { label: 'Réceptionné au départ', color: '#e5308f', step: 1 },
  in_transit: { label: 'En transit',            color: '#d81159', step: 2 },
  arrived:    { label: 'Arrivé à destination',  color: '#a80c42', step: 3 },
  ready:      { label: 'Disponible au retrait', color: '#e8992d', step: 4 },
  delivered:  { label: 'Livré',                 color: '#16a34a', step: 5 },
  cancelled:  { label: 'Annulé',                color: '#dc2626', step: -1 }
};

export const STATUS_ORDER = ['registered', 'received', 'in_transit', 'arrived', 'ready', 'delivered'];

// Modes de transport
export const MODE_META = {
  air: { label: 'Aérien', short: 'Avion', transit: 'En vol' },
  sea: { label: 'Maritime', short: 'Bateau', transit: 'En mer' }
};

/** Le transit se dit « En vol » ou « En mer » selon le mode. */
export function statusLabel(status, mode = 'air') {
  if (status === 'in_transit' && MODE_META[mode]) return MODE_META[mode].transit;
  return STATUS_META[status]?.label || status;
}

export const QUOTE_STATUS_META = {
  nouveau:  { label: 'Nouveau',   color: '#e5308f' },
  contacte: { label: 'Contacté',  color: '#e8992d' },
  converti: { label: 'Converti',  color: '#16a34a' },
  perdu:    { label: 'Perdu',     color: '#7a6a78' }
};
