import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Calculator, Send, AlertTriangle, Plane, Ship } from 'lucide-react';
import Reveal from '../components/Reveal.jsx';
import CategoryIcon from '../components/CategoryIcon.jsx';
import { WhatsAppIcon } from '../components/SocialIcons.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { api, formatEur, formatFCFA, waLink } from '../api.js';
import { computePrice } from '../pricing.js';

export default function Quote() {
  const s = useSettings();
  const [categories, setCategories] = useState([]);
  const [mode, setMode] = useState('air');
  const [form, setForm] = useState({
    name: '', phone: '', email: '',
    category_id: '', weight_kg: '', declared_value_eur: '', description: ''
  });
  const [sent, setSent] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.categories().then(list => {
      setCategories(list);
      const first = list.find(c => c.mode === 'air') || list[0];
      if (first) setForm(f => ({ ...f, category_id: String(first.id) }));
    }).catch(() => {});
  }, []);

  const inMode = categories.filter(c => c.mode === mode);
  const hasSea = categories.some(c => c.mode === 'sea');
  const category = categories.find(c => String(c.id) === String(form.category_id));

  // Changer de mode : on repositionne la catégorie sur la première du mode choisi.
  function pickMode(m) {
    setMode(m);
    const first = categories.find(c => c.mode === m);
    setForm(f => ({ ...f, category_id: first ? String(first.id) : '' }));
  }

  // Estimation recalculée à chaque frappe, avec la même formule que le serveur.
  const estimate = useMemo(
    () => computePrice(category, form.weight_kg, form.declared_value_eur, s),
    [category, form.weight_kg, form.declared_value_eur, s]
  );

  function set(key, value) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.phone.trim()) {
      setError('Votre nom et votre téléphone sont nécessaires pour vous répondre.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.submitQuote({
        ...form,
        category_id: form.category_id ? Number(form.category_id) : null,
        weight_kg: Number(form.weight_kg) || 0,
        declared_value_eur: Number(form.declared_value_eur) || 0
      });
      setSent(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <section className="section">
        <div className="container" style={{ maxWidth: 620 }}>
          <div className="card center">
            <div style={{ color: 'var(--ok)', display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <CheckCircle2 size={52} />
            </div>
            <h2 style={{ fontSize: '1.5rem' }}>Demande envoyée</h2>
            <p className="muted" style={{ margin: '.8rem 0 1.4rem' }}>
              Merci {sent.name}, notre équipe vous recontacte sous 24 h ouvrées
              {sent.email ? ' — un récapitulatif vient de partir par email.' : '.'}
            </p>

            {!sent.pricing?.quote_only && (
              <div className="estimate" style={{ textAlign: 'left', marginBottom: '1.4rem' }}>
                <div className="label">Estimation transmise</div>
                <div className="total">{formatEur(sent.pricing.total_eur)}</div>
                <div className="fcfa">{formatFCFA(sent.pricing.total_fcfa)}</div>
              </div>
            )}

            <div className="row" style={{ justifyContent: 'center' }}>
              <a className="btn btn-primary" target="_blank" rel="noreferrer"
                 href={waLink(s.phone_ga, `Bonjour E-DOP, je viens d'envoyer une demande de devis au nom de ${sent.name}.`)}>
                <WhatsAppIcon size={17} /> Poursuivre sur WhatsApp
              </a>
              <button className="btn btn-ghost" onClick={() => { setSent(null); setForm(f => ({ ...f, weight_kg: '', declared_value_eur: '', description: '' })); }}>
                Faire une autre estimation
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow"><Calculator size={13} /> Estimation en direct</span>
          <h2>Demander un devis</h2>
          <p>
            Choisissez la catégorie, indiquez le poids et la valeur du contenu :
            le montant se met à jour instantanément.
          </p>
        </div>

        <div className="split split-form" style={{ gap: '1.6rem' }}>
          <Reveal>
            <form className="card" onSubmit={submit}>
              <div className="form-grid">
                {hasSea && (
                  <div className="field full">
                    <label>Mode d’expédition</label>
                    <div className="chips">
                      <button type="button" className={`chip ${mode === 'air' ? 'on' : ''}`} onClick={() => pickMode('air')}>
                        <Plane size={14} style={{ verticalAlign: -2, marginRight: 5 }} /> Aérien
                      </button>
                      <button type="button" className={`chip ${mode === 'sea' ? 'on' : ''}`} onClick={() => pickMode('sea')}>
                        <Ship size={14} style={{ verticalAlign: -2, marginRight: 5 }} /> Maritime
                      </button>
                    </div>
                  </div>
                )}

                <div className="field full">
                  <label>Catégorie d’articles</label>
                  <select className="select" value={form.category_id} onChange={e => set('category_id', e.target.value)}>
                    {inMode.length === 0 && <option value="">Aucune catégorie disponible</option>}
                    {inMode.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}{c.price_eur != null ? ` — ${c.price_eur} €/kg` : ' — sur devis'}
                      </option>
                    ))}
                  </select>
                  {category?.conditions && (
                    <span className="hint" style={{ color: 'var(--pink-2)', fontWeight: 600 }}>
                      {category.conditions}
                    </span>
                  )}
                </div>

                <div className="field">
                  <label>Poids (kg)</label>
                  <input className="input" type="number" min="0" step="0.1" placeholder="Ex. 4,5"
                    value={form.weight_kg} onChange={e => set('weight_kg', e.target.value)} />
                  <span className="hint">Arrondi au {Math.round(Number(s.weight_step_kg) * 1000)} g supérieur</span>
                </div>

                <div className="field">
                  <label>Valeur du contenu (€)</label>
                  <input className="input" type="number" min="0" step="1" placeholder="Ex. 250"
                    value={form.declared_value_eur} onChange={e => set('declared_value_eur', e.target.value)} />
                  <span className="hint">Déclaration obligatoire à partir de {s.declaration_threshold_eur} €</span>
                </div>

                <div className="field full">
                  <label>Description du colis</label>
                  <textarea className="textarea" placeholder="Contenu, dimensions, contraintes particulières…"
                    value={form.description} onChange={e => set('description', e.target.value)} />
                </div>

                <div className="field full"><div className="divider" style={{ margin: 0 }} /></div>

                <div className="field">
                  <label>Votre nom *</label>
                  <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required />
                </div>
                <div className="field">
                  <label>Téléphone / WhatsApp *</label>
                  <input className="input" placeholder="+241 …" value={form.phone} onChange={e => set('phone', e.target.value)} required />
                </div>
                <div className="field full">
                  <label>Email</label>
                  <input className="input" type="email" placeholder="Pour recevoir le récapitulatif"
                    value={form.email} onChange={e => set('email', e.target.value)} />
                  <span className="hint">Facultatif, mais c’est par là que passe la confirmation.</span>
                </div>
              </div>

              {error && <div className="alert alert-error" style={{ marginTop: '1rem' }}>{error}</div>}

              <button className="btn btn-primary btn-block" style={{ marginTop: '1.2rem' }} disabled={busy}>
                {busy ? 'Envoi…' : <>Envoyer ma demande <Send size={16} /></>}
              </button>
            </form>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="stack sticky-side">
              <div className="estimate">
                <div className="label">Estimation</div>
                {estimate.quote_only ? (
                  <>
                    <div className="total" style={{ fontSize: '1.9rem' }}>Sur devis</div>
                    <div className="fcfa">Cette catégorie est chiffrée au cas par cas.</div>
                  </>
                ) : (
                  <>
                    <div className="total">{formatEur(estimate.total_eur)}</div>
                    <div className="fcfa">{formatFCFA(estimate.total_fcfa)}</div>
                    <div className="breakdown">
                      <div><span>Poids facturé</span><span>{estimate.billed_weight_kg.toFixed(1)} kg</span></div>
                      <div><span>Prix au kilo</span><span>{category?.price_eur} €</span></div>
                      <div><span>Transport</span><span>{formatEur(estimate.base_eur)}</span></div>
                      {estimate.surcharge_eur > 0 && (
                        <div>
                          <span>Majoration valeur ({estimate.surcharge_pct} %)</span>
                          <span>{formatEur(estimate.surcharge_eur)}</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {estimate.declaration_required && (
                <div className="alert alert-warn" style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                  <AlertTriangle size={17} style={{ flex: 'none', marginTop: 2 }} />
                  <span>
                    Valeur supérieure à {s.declaration_threshold_eur} € : la déclaration est
                    obligatoire et {s.value_surcharge_pct} % de la valeur s’ajoutent au prix du kilo.
                  </span>
                </div>
              )}

              <div className="card card-flat">
                <h3 style={{ fontSize: '1rem', marginBottom: '.7rem' }}>Rappel</h3>
                <div className="kv"><span>Départs</span><span>{s.departures_per_week} / semaine</span></div>
                <div className="kv"><span>Trajet</span><span>{s.address_fr} → {s.address_ga}</span></div>
                <div className="kv"><span>Paiement</span><span style={{ fontSize: '.82rem' }}>{s.deposit_split}</span></div>
                <div className="kv"><span>Taux</span><span>1 € = {formatFCFA(s.fcfa_rate)}</span></div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
