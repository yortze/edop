import { db, getSettings } from './db.js';
import { eurToFcfa } from './pricing.js';

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

export function brevoConfigured() {
  return Boolean(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL);
}

function logEmail(entry) {
  db.prepare(`
    INSERT INTO email_log (to_email, to_name, subject, template, status, provider_id, error)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    entry.to_email, entry.to_name || null, entry.subject, entry.template,
    entry.status, entry.provider_id || null, entry.error || null
  );
}

/**
 * Envoi transactionnel via Brevo. Ne jette jamais : un email raté ne doit pas
 * faire échouer la création d'un colis. Tout est tracé dans `email_log`.
 */
export async function sendEmail({ to, toName, subject, html, template = 'generic' }) {
  if (!to) return { status: 'skipped', reason: 'no-recipient' };

  if (!brevoConfigured()) {
    logEmail({ to_email: to, to_name: toName, subject, template, status: 'skipped', error: 'Brevo non configuré (BREVO_API_KEY manquante)' });
    return { status: 'skipped', reason: 'not-configured' };
  }

  try {
    const res = await fetch(BREVO_URL, {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
        accept: 'application/json'
      },
      body: JSON.stringify({
        sender: { name: process.env.BREVO_SENDER_NAME || 'E-DOP', email: process.env.BREVO_SENDER_EMAIL },
        to: [{ email: to, name: toName || to }],
        subject,
        htmlContent: html
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = data.message || `HTTP ${res.status}`;
      logEmail({ to_email: to, to_name: toName, subject, template, status: 'error', error: message });
      return { status: 'error', error: message };
    }
    logEmail({ to_email: to, to_name: toName, subject, template, status: 'sent', provider_id: data.messageId });
    return { status: 'sent', id: data.messageId };
  } catch (err) {
    logEmail({ to_email: to, to_name: toName, subject, template, status: 'error', error: String(err.message || err) });
    return { status: 'error', error: String(err.message || err) };
  }
}

// ---------- Gabarit HTML commun ----------

function escapeHtml(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function publicUrl() {
  return process.env.PUBLIC_URL || 'http://localhost:5173';
}

function layout(title, bodyHtml) {
  const s = getSettings();
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px 12px;background:#fdf3f8;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#1b1524;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #f6d6e6;">
    <tr><td style="background:linear-gradient(120deg,#e5308f,#d81159);padding:22px 26px;">
      <div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:.06em;">E-DOP</div>
      <div style="font-size:12px;color:#ffd9ea;margin-top:2px;">${escapeHtml(s.tagline)}</div>
    </td></tr>
    <tr><td style="padding:26px;">
      <h1 style="margin:0 0 14px;font-size:19px;color:#1b1524;">${escapeHtml(title)}</h1>
      ${bodyHtml}
    </td></tr>
    <tr><td style="padding:18px 26px;background:#fdf3f8;border-top:1px solid #f6d6e6;font-size:12px;color:#7a6a78;line-height:1.7;">
      ${escapeHtml(s.corridor)}<br>
      WhatsApp Gabon ${escapeHtml(s.phone_ga)} &nbsp;&bull;&nbsp; France ${escapeHtml(s.phone_fr)}<br>
      <span style="color:#a695a4;">E-DOP, votre partenaire logistique de confiance.</span>
    </td></tr>
  </table>
</body></html>`;
}

function row(label, value) {
  return `<tr>
    <td style="padding:7px 0;color:#7a6a78;font-size:13px;">${escapeHtml(label)}</td>
    <td style="padding:7px 0;text-align:right;font-weight:600;font-size:13px;">${escapeHtml(value)}</td>
  </tr>`;
}

function bigCode(code) {
  return `<div style="margin:18px 0;padding:14px;border:2px dashed #e5308f;border-radius:12px;text-align:center;">
    <div style="font-size:11px;color:#7a6a78;text-transform:uppercase;letter-spacing:.12em;">Numéro de suivi</div>
    <div style="font-size:24px;font-weight:800;color:#d81159;letter-spacing:.08em;margin-top:4px;">${escapeHtml(code)}</div>
  </div>`;
}

function money(eur, rate) {
  const n = Number(eur) || 0;
  return `${n.toFixed(2)} € (${new Intl.NumberFormat('fr-FR').format(eurToFcfa(n, rate))} FCFA)`;
}

// ---------- Emails métier ----------

export function quoteReceivedEmail(quote, category) {
  const s = getSettings();
  const price = quote.estimated_eur ? money(quote.estimated_eur, s.fcfa_rate) : 'Sur devis';
  const html = layout('Nous avons bien reçu votre demande', `
    <p style="margin:0 0 14px;font-size:14px;line-height:1.7;">
      Bonjour ${escapeHtml(quote.name)},<br>
      Merci pour votre demande de devis. Notre équipe vous recontacte sous 24 h ouvrées.
    </p>
    <table role="presentation" width="100%" style="border-top:1px solid #f1e3ec;margin-top:10px;">
      ${row('Catégorie', category?.name || '—')}
      ${row('Poids', `${quote.weight_kg} kg`)}
      ${quote.declared_value_eur ? row('Valeur déclarée', `${quote.declared_value_eur} €`) : ''}
      ${row('Estimation', price)}
    </table>
    <p style="margin:16px 0 0;font-size:13px;color:#7a6a78;line-height:1.7;">
      Cette estimation est indicative : le tarif définitif dépend de la nature réelle des articles
      et des conditions d'expédition.
    </p>
  `);
  return { subject: 'E-DOP — votre demande de devis est bien reçue', html };
}

export function shipmentCreatedEmail(shipment, settings) {
  const s = settings || getSettings();
  const html = layout('Votre colis est enregistré', `
    <p style="margin:0 0 6px;font-size:14px;line-height:1.7;">
      Bonjour ${escapeHtml(shipment.client_name || '')},<br>
      Votre colis à destination de ${escapeHtml(shipment.destination)} est enregistré.
    </p>
    ${bigCode(shipment.tracking_number)}
    <table role="presentation" width="100%" style="border-top:1px solid #f1e3ec;">
      ${row('Destinataire', shipment.recipient_name || '—')}
      ${row('Catégorie', shipment.category_name || '—')}
      ${row('Poids facturé', `${shipment.weight_kg} kg`)}
      ${row('Montant', money(shipment.price_eur, s.fcfa_rate))}
    </table>
    <p style="margin:18px 0 0;font-size:13px;line-height:1.7;">
      Suivez votre colis à tout moment sur
      <a href="${publicUrl()}/suivi" style="color:#d81159;font-weight:600;">${escapeHtml(publicUrl() + '/suivi')}</a>
      avec le numéro ci-dessus.
    </p>
  `);
  return { subject: `E-DOP — colis ${shipment.tracking_number} enregistré`, html };
}

export function statusChangedEmail(shipment, statusLabel, event) {
  const html = layout('Mise à jour de votre colis', `
    <p style="margin:0 0 6px;font-size:14px;line-height:1.7;">
      Bonjour ${escapeHtml(shipment.client_name || '')}, votre colis a changé de statut.
    </p>
    ${bigCode(shipment.tracking_number)}
    <div style="padding:14px;background:#fdf3f8;border-radius:12px;text-align:center;">
      <div style="font-size:11px;color:#7a6a78;text-transform:uppercase;letter-spacing:.12em;">Nouveau statut</div>
      <div style="font-size:18px;font-weight:700;color:#1b1524;margin-top:4px;">${escapeHtml(statusLabel)}</div>
      ${event?.location ? `<div style="font-size:13px;color:#7a6a78;margin-top:4px;">${escapeHtml(event.location)}</div>` : ''}
    </div>
    ${event?.note ? `<p style="margin:14px 0 0;font-size:13px;line-height:1.7;color:#4b3d4a;">${escapeHtml(event.note)}</p>` : ''}
  `);
  return { subject: `E-DOP — ${shipment.tracking_number} : ${statusLabel}`, html };
}

export function moderatorWelcomeEmail(user, password) {
  const html = layout('Votre accès au back-office E-DOP', `
    <p style="margin:0 0 14px;font-size:14px;line-height:1.7;">
      Bonjour ${escapeHtml(user.name)},<br>
      Un accès ${user.role === 'admin' ? 'administrateur' : 'modérateur'} vient d'être créé pour vous.
    </p>
    <table role="presentation" width="100%" style="border-top:1px solid #f1e3ec;">
      ${row('Identifiant', user.email)}
      ${row('Mot de passe provisoire', password)}
    </table>
    <p style="margin:18px 0 0;font-size:13px;line-height:1.7;">
      Connexion : <a href="${publicUrl()}/admin" style="color:#d81159;font-weight:600;">${escapeHtml(publicUrl() + '/admin')}</a><br>
      <strong>Changez ce mot de passe à votre première connexion.</strong>
    </p>
  `);
  return { subject: 'E-DOP — votre accès au back-office', html };
}

export function internalQuoteAlert(quote, category) {
  const html = layout('Nouvelle demande de devis', `
    <table role="presentation" width="100%" style="border-top:1px solid #f1e3ec;">
      ${row('Client', quote.name)}
      ${row('Téléphone', quote.phone)}
      ${row('Email', quote.email || '—')}
      ${row('Catégorie', category?.name || '—')}
      ${row('Poids', `${quote.weight_kg} kg`)}
      ${row('Estimation', quote.estimated_eur ? `${Number(quote.estimated_eur).toFixed(2)} €` : 'Sur devis')}
    </table>
    ${quote.description ? `<p style="margin:14px 0 0;font-size:13px;color:#4b3d4a;">${escapeHtml(quote.description)}</p>` : ''}
  `);
  return { subject: `E-DOP — devis de ${quote.name}`, html };
}
