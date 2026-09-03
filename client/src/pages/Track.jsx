import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search, PackageSearch, MapPin, Calendar, Weight, Plane, Ship, Layers
} from 'lucide-react';
import Reveal from '../components/Reveal.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { WhatsAppIcon } from '../components/SocialIcons.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { api, formatDate, formatDateTime, STATUS_META, STATUS_ORDER, waLink } from '../api.js';

export default function Track() {
  const s = useSettings();
  const [params, setParams] = useSearchParams();
  const [code, setCode] = useState(params.get('n') || '');
  const [result, setResult] = useState(null);
  const [group, setGroup] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function search(e) {
    e?.preventDefault();
    const tn = code.trim();
    if (!tn) return;
    setBusy(true);
    setError('');
    setResult(null);
    setGroup(null);
    setParams({ n: tn });
    try {
      // Un code GRP- désigne un groupage entier, sinon c'est un colis.
      if (tn.toUpperCase().startsWith('GRP-')) setGroup(await api.trackGroupage(tn));
      else setResult(await api.track(tn));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const currentStep = result ? (STATUS_META[result.status]?.step ?? 0) : 0;
  const groupStep = group ? (STATUS_META[group.status]?.step ?? 0) : 0;

  return (
    <section className="section">
      <div className="container">
        <div className="section-head center">
          <span className="eyebrow"><PackageSearch size={13} /> Suivi de colis</span>
          <h2>Où est mon colis ?</h2>
          <p>
            Entrez le numéro de suivi reçu lors du dépôt (EDOP-XXXXXXXX),
            ou le code d’un groupage (GRP-XXXXXX).
          </p>
        </div>

        <div className="track-box">
          <form className="track-input" onSubmit={search}>
            <input
              className="input"
              placeholder="EDOP-DEMO2026"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
            />
            <button className="btn btn-primary" disabled={busy}>
              {busy ? 'Recherche…' : <><Search size={17} /> Suivre</>}
            </button>
          </form>

          {error && (
            <div className="alert alert-error" style={{ marginTop: '1rem' }}>
              {error} — vérifiez le numéro, ou écrivez-nous sur WhatsApp.
            </div>
          )}
        </div>

        {/* ---------- Suivi d'un colis ---------- */}
        {result && (
          <Reveal>
            <div className="split split-main-right" style={{ gap: '1.4rem', marginTop: '2.4rem' }}>
              <div className="card">
                <div className="spread" style={{ marginBottom: '1rem' }}>
                  <span className="tn" style={{ fontSize: '1.15rem' }}>{result.tracking_number}</span>
                  <StatusBadge status={result.status} mode={result.mode} />
                </div>

                {result.status !== 'cancelled' && (
                  <div className="progress-track">
                    {STATUS_ORDER.map((st, i) => (
                      <span key={st} className={`seg ${i <= currentStep ? 'on' : ''}`} />
                    ))}
                  </div>
                )}

                <div className="kv">
                  <span>
                    {result.mode === 'sea'
                      ? <Ship size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
                      : <Plane size={14} style={{ verticalAlign: -2, marginRight: 6 }} />}
                    Trajet
                  </span>
                  <span>{result.origin} → {result.destination}</span>
                </div>
                <div className="kv">
                  <span><MapPin size={14} style={{ verticalAlign: -2, marginRight: 6 }} />Destinataire</span>
                  <span>{result.recipient_name || '—'}</span>
                </div>
                <div className="kv">
                  <span><Weight size={14} style={{ verticalAlign: -2, marginRight: 6 }} />Poids facturé</span>
                  <span>{result.weight_kg} kg</span>
                </div>
                <div className="kv">
                  <span>Catégorie</span>
                  <span>{result.category || '—'}</span>
                </div>
                <div className="kv">
                  <span><Calendar size={14} style={{ verticalAlign: -2, marginRight: 6 }} />Enregistré le</span>
                  <span>{formatDateTime(result.created_at)}</span>
                </div>

                {/* Colis groupé : on le dit clairement au client */}
                {result.groupage && (
                  <div className="alert alert-info" style={{ marginTop: '1rem', display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                    <Layers size={17} style={{ flex: 'none', marginTop: 2 }} />
                    <span>
                      Ce colis voyage en groupage <strong>{result.groupage.code}</strong>
                      {result.groupage.label ? ` — ${result.groupage.label}` : ''}.
                      {result.groupage.departure_date && <> Départ le {formatDate(result.groupage.departure_date)}.</>}
                      {result.groupage.eta_date && <> Arrivée estimée le {formatDate(result.groupage.eta_date)}.</>}
                    </span>
                  </div>
                )}

                <a className="btn btn-ghost btn-block" style={{ marginTop: '1.2rem' }}
                   target="_blank" rel="noreferrer"
                   href={waLink(s.phone_ga, `Bonjour E-DOP, je souhaite des nouvelles du colis ${result.tracking_number}.`)}>
                  <WhatsAppIcon size={17} /> Demander des nouvelles
                </a>
              </div>

              <div className="card">
                <h3 style={{ marginBottom: '1.3rem' }}>Historique du colis</h3>
                {result.events.length === 0 ? (
                  <p className="muted">Aucune étape enregistrée pour le moment.</p>
                ) : (
                  <div className="timeline">
                    {result.events.map((e, i) => (
                      <div key={i} className="tl-item done">
                        <span className="tl-dot" />
                        <h4>
                          {e.status_label}
                          {e.grouped && (
                            <span className="badge" style={{ marginLeft: 8, color: 'var(--pink-2)', background: 'var(--surface-3)', fontSize: '.68rem' }}>
                              <Layers size={11} /> groupage
                            </span>
                          )}
                        </h4>
                        <div className="meta">
                          {formatDateTime(e.created_at)}{e.location ? ` · ${e.location}` : ''}
                        </div>
                        {e.note && <div className="note">{e.note}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Reveal>
        )}

        {/* ---------- Suivi d'un groupage entier ---------- */}
        {group && (
          <Reveal>
            <div className="split split-main-right" style={{ gap: '1.4rem', marginTop: '2.4rem' }}>
              <div className="card">
                <div className="spread" style={{ marginBottom: '1rem' }}>
                  <span className="tn" style={{ fontSize: '1.15rem' }}>{group.code}</span>
                  <StatusBadge status={group.status} mode={group.mode} />
                </div>

                {group.status !== 'cancelled' && (
                  <div className="progress-track">
                    {STATUS_ORDER.map((st, i) => (
                      <span key={st} className={`seg ${i <= groupStep ? 'on' : ''}`} />
                    ))}
                  </div>
                )}

                <div className="kv">
                  <span><Layers size={14} style={{ verticalAlign: -2, marginRight: 6 }} />Groupage</span>
                  <span>{group.label || '—'}</span>
                </div>
                <div className="kv">
                  <span>
                    {group.mode === 'sea'
                      ? <Ship size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
                      : <Plane size={14} style={{ verticalAlign: -2, marginRight: 6 }} />}
                    Trajet
                  </span>
                  <span>{group.origin && group.destination ? `${group.origin} → ${group.destination}` : '—'}</span>
                </div>
                <div className="kv"><span>Colis dans ce départ</span><span>{group.shipments_count}</span></div>
                <div className="kv"><span>Départ</span><span>{group.departure_date ? formatDate(group.departure_date) : '—'}</span></div>
                <div className="kv"><span>Arrivée estimée</span><span>{group.eta_date ? formatDate(group.eta_date) : '—'}</span></div>

                <p className="muted" style={{ fontSize: '.84rem', marginTop: '1rem' }}>
                  Pour le détail de votre colis, entrez son numéro EDOP-… ci-dessus.
                </p>
              </div>

              <div className="card">
                <h3 style={{ marginBottom: '1.3rem' }}>Étapes du groupage</h3>
                {group.events.length === 0 ? (
                  <p className="muted">Aucune étape enregistrée pour le moment.</p>
                ) : (
                  <div className="timeline">
                    {group.events.map((e, i) => (
                      <div key={i} className="tl-item done">
                        <span className="tl-dot" />
                        <h4>{e.status_label}</h4>
                        <div className="meta">
                          {formatDateTime(e.created_at)}{e.location ? ` · ${e.location}` : ''}
                        </div>
                        {e.note && <div className="note">{e.note}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
