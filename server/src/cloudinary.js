import { createHash } from 'node:crypto';

// Upload signé : le navigateur envoie le fichier directement à Cloudinary
// (le fichier ne transite jamais par notre serveur), mais seule une signature
// générée ici avec l'API secret rend l'upload valide.

export function cloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

export function cloudName() {
  return process.env.CLOUDINARY_CLOUD_NAME || '';
}

/** Signature Cloudinary : params triés, joints en k=v&…, puis SHA-1 avec l'API secret. */
function sign(params) {
  const payload = Object.keys(params)
    .filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&');
  return createHash('sha1').update(payload + process.env.CLOUDINARY_API_SECRET).digest('hex');
}

/** Paramètres à renvoyer au client pour un upload direct. */
export function signUpload({ section = 'galerie' } = {}) {
  const timestamp = Math.round(Date.now() / 1000);
  const folder = `${process.env.CLOUDINARY_FOLDER || 'edop'}/${section}`;
  const params = { folder, timestamp };
  return {
    cloud_name: cloudName(),
    api_key: process.env.CLOUDINARY_API_KEY,
    upload_url: `https://api.cloudinary.com/v1_1/${cloudName()}/image/upload`,
    folder,
    timestamp,
    signature: sign(params)
  };
}

/** Suppression définitive d'une image côté Cloudinary. */
export async function destroyAsset(publicId) {
  if (!cloudinaryConfigured()) return { ok: false, error: 'Cloudinary non configuré' };
  const timestamp = Math.round(Date.now() / 1000);
  const signature = sign({ public_id: publicId, timestamp });
  const body = new URLSearchParams({
    public_id: publicId,
    timestamp: String(timestamp),
    api_key: process.env.CLOUDINARY_API_KEY,
    signature
  });
  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName()}/image/destroy`, { method: 'POST', body });
    const data = await res.json().catch(() => ({}));
    return { ok: data.result === 'ok' || data.result === 'not found', result: data.result };
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
}

/** URL transformée (redimensionnement / compression automatique). */
export function transformed(url, { w = 800, h, crop = 'fill' } = {}) {
  if (!url || !url.includes('/upload/')) return url;
  const t = [`w_${w}`, h ? `h_${h}` : null, h ? `c_${crop}` : 'c_limit', 'q_auto', 'f_auto']
    .filter(Boolean).join(',');
  return url.replace('/upload/', `/upload/${t}/`);
}
