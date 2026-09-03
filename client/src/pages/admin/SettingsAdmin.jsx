import { useEffect, useState } from 'react';
import { Save, Mail, Cloud, CheckCircle2, XCircle } from 'lucide-react';
import { api, formatDateTime } from '../../api.js';
import { useSettingsRefresh } from '../../context/SettingsContext.jsx';

const GROUPS = [
  {
    title: 'Identité',
    fields: [
      { key: 'company_name', label: 'Nom affiché' },
      { key: 'tagline', label: 'Slogan' },
      { key: 'corridor', label: 'Corridor', hint: 'Affiché dans le bandeau et le pied de page.' }
    ]
  },
  {
    title: 'Contacts',
    fields: [
      { key: 'phone_ga', label: 'WhatsApp Gabon' },
      { key: 'phone_fr', label: 'WhatsApp France' },
      { key: 'email', label: 'Email public', type: 'email' },
      { key: 'address_fr', label: 'Agence France' },
      { key: 'address_ga', label: 'Agence Gabon' },
      { key: 'facebook_url', label: 'Page Facebook', hint: 'Laisser vide pour masquer le lien.' },
      { key: 'instagram_url', label: 'Compte Instagram', hint: 'Laisser vide pour masquer le lien.' }
    ]
  },
  {
    title: 'Règles tarifaires',
    fields: [
      { key: 'fcfa_rate', label: 'Taux 1 € en FCFA', type: 'number', hint: 'Sert aux conversions affichées sur tout le site.' },
      { key: 'weight_step_kg', label: 'Pas d’arrondi du poids (kg)', type: 'number', step: '0.01', hint: '0,1 = arrondi au 100 g supérieur.' },
      { key: 'declaration_threshold_eur', label: 'Seuil de déclaration (€)', type: 'number' },
      { key: 'value_surcharge_pct', label: 'Majoration au-delà du seuil (%)', type: 'number' },
      { key: 'other_carrier_fee_eur', label: 'Frais autre transporteur (€)', type: 'number' },
      { key: 'oversize_cm', label: 'Hors format à partir de (cm)', type: 'number' },
      { key: 'departures_per_week', label: 'Départs par semaine (aérien)', type: 'number' },
      { key: 'deposit_split', label: 'Conditions de paiement' }
    ]
  },
  {
    title: 'Fret maritime',
    hint: 'Tant que l’affichage est désactivé, la page Tarifs annonce « bientôt disponible » au lieu des prix.',
    fields: [
      { key: 'sea_enabled', label: 'Afficher le fret maritime sur le site', type: 'toggle',
        hint: 'À activer une fois les tarifs maritimes créés dans la fiche tarifaire.' },
      { key: 'sea_title', label: 'Titre affiché' },
      { key: 'sea_frequency', label: 'Fréquence des départs', placeholder: 'Ex. 1 départ par mois' },
      { key: 'sea_transit', label: 'Délai de transit', placeholder: 'Ex. 45 à 60 jours' },
      { key: 'sea_intro', label: 'Présentation', type: 'textarea', full: true,
        placeholder: 'Décrivez le service maritime : volumes, conditionnement, port de départ…' },
      { key: 'sea_conditions', label: 'Conditions particulières', full: true,
        placeholder: 'Ex. minimum de facturation, groupage conteneur…' }
    ]
  }
];

export default function SettingsAdmin() {
  const refreshSettings = useSettingsRefresh();
  const [form, setForm] = useState(null);
  const [integrations, setIntegrations] = useState(null);
  const [emails, setEmails] = useState([]);
  const [flash, setFlash] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.settings().then(setForm).catch(() => {});
    api.integrations().then(setIntegrations).catch(() => {});
    api.emailLog().then(setEmails).catch(() => {});
  }, []);

  if (!form) return <div className="skeleton" style={{ height: 300 }} />;

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.updateSettings(form);
      refreshSettings();
      setFlash('Réglages enregistrés — le site public est mis à jour.');
      setTimeout(() => setFlash(''), 4000);
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Réglages</h1>
          <p>Ces valeurs alimentent le site public, les calculs de prix et les emails.</p>
        </div>
        <button className="btn btn-primary btn-sm" form="settings-form" disabled={busy}>
          {busy ? 'Enregistrement…' : <><Save size={16} /> Enregistrer</>}
        </button>
      </div>

      {flash && <div className="alert alert-ok" style={{ marginBottom: '1.2rem' }}>{flash}</div>}

      <form id="settings-form" onSubmit={save} className="stack" style={{ gap: '1.2rem' }}>
        {GROUPS.map(group => (
          <div className="card" key={group.title}>
            <h3 style={{ marginBottom: group.hint ? '.4rem' : '1.1rem' }}>{group.title}</h3>
            {group.hint && <p className="muted" style={{ fontSize: '.86rem', marginBottom: '1.1rem' }}>{group.hint}</p>}
            <div className="form-grid">
              {group.fields.map(f => (
                <div className={`field ${f.full || f.type === 'toggle' ? 'full' : ''}`} key={f.key}>
                  {f.type === 'toggle' ? (
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={form[f.key] === '1'}
                        onChange={e => setForm(v => ({ ...v, [f.key]: e.target.checked ? '1' : '0' }))}
                      />
                      {f.label}
                    </label>
                  ) : f.type === 'textarea' ? (
                    <>
                      <label>{f.label}</label>
                      <textarea
                        className="textarea"
                        style={{ minHeight: 90 }}
                        placeholder={f.placeholder}
                        value={form[f.key] ?? ''}
                        onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
                      />
                    </>
                  ) : (
                    <>
                      <label>{f.label}</label>
                      <input
                        className="input"
                        type={f.type || 'text'}
                        step={f.step}
                        placeholder={f.placeholder}
                        value={form[f.key] ?? ''}
                        onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
                      />
                    </>
                  )}
                  {f.hint && <span className="hint">{f.hint}</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </form>

      <div className="split" style={{ marginTop: '1.2rem' }}>
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Intégrations</h3>
          {integrations && (
            <>
              <Integration
                Icon={Cloud} title="Cloudinary"
                ok={integrations.cloudinary.configured}
                detail={integrations.cloudinary.configured
                  ? `Compte : ${integrations.cloudinary.cloud_name}`
                  : 'CLOUDINARY_* absentes dans server/.env'}
              />
              <Integration
                Icon={Mail} title="Brevo"
                ok={integrations.brevo.configured}
                detail={integrations.brevo.configured
                  ? `Expéditeur : ${integrations.brevo.sender}`
                  : 'BREVO_API_KEY absente dans server/.env'}
              />
              {integrations.brevo.stats?.length > 0 && (
                <>
                  <div className="divider" />
                  {integrations.brevo.stats.map(s => (
                    <div className="kv" key={s.status}>
                      <span>Emails « {s.status} »</span><span>{s.n}</span>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>

        <div className="table-wrap">
          <div style={{ padding: '1.1rem 1.3rem' }}><h3>Journal des emails</h3></div>
          <div className="table-scroll" style={{ maxHeight: 340, overflowY: 'auto' }}>
            <table className="data" style={{ minWidth: 460 }}>
              <thead><tr><th>Destinataire</th><th>Type</th><th>État</th><th>Date</th></tr></thead>
              <tbody>
                {emails.map(e => (
                  <tr key={e.id}>
                    <td style={{ fontSize: '.84rem' }}>{e.to_email}</td>
                    <td className="muted" style={{ fontSize: '.8rem' }}>{e.template}</td>
                    <td>
                      <span className="badge" style={{
                        color: e.status === 'sent' ? 'var(--ok)' : e.status === 'error' ? 'var(--danger)' : 'var(--muted)',
                        background: 'var(--surface-3)'
                      }}>{e.status}</span>
                    </td>
                    <td className="muted" style={{ fontSize: '.79rem' }}>{formatDateTime(e.created_at)}</td>
                  </tr>
                ))}
                {emails.length === 0 && <tr><td colSpan={4} className="empty">Aucun email envoyé.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

function Integration({ Icon, title, ok, detail }) {
  return (
    <div className="feature" style={{ marginBottom: '1rem' }}>
      <div className="ic" style={{ background: ok ? 'var(--grad-brand)' : 'var(--surface-3)', color: ok ? '#fff' : 'var(--muted)', boxShadow: 'none' }}>
        <Icon size={20} />
      </div>
      <div>
        <h3 style={{ fontSize: '.98rem', display: 'flex', alignItems: 'center', gap: 7 }}>
          {title}
          {ok
            ? <CheckCircle2 size={15} style={{ color: 'var(--ok)' }} />
            : <XCircle size={15} style={{ color: 'var(--muted-2)' }} />}
        </h3>
        <p>{ok ? detail : `Non configuré — ${detail}`}</p>
      </div>
    </div>
  );
}
