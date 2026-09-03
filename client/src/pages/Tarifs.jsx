import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Scale, FileCheck, Percent, Wallet, AlertTriangle,
  Plane, Ship, Route, Clock, Hourglass
} from 'lucide-react';
import Reveal from '../components/Reveal.jsx';
import CategoryIcon from '../components/CategoryIcon.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { api, formatFCFA, MODE_META } from '../api.js';
import { eurToFcfa } from '../pricing.js';

export default function Tarifs() {
  const s = useSettings();
  const [categories, setCategories] = useState([]);
  const [corridors, setCorridors] = useState([]);
  const [mode, setMode] = useState('air');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.categories(), api.corridors()])
      .then(([cats, cors]) => { setCategories(cats); setCorridors(cors); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const rate = Number(s.fcfa_rate) || 650;
  const seaEnabled = s.sea_enabled === '1' || s.sea_enabled === 1 || s.sea_enabled === true;

  const shown = useMemo(() => categories.filter(c => c.mode === mode), [categories, mode]);
  const lines = useMemo(() => corridors.filter(c => c.mode === mode), [corridors, mode]);

  return (
    <>
      <section className="section" style={{ paddingBottom: '2rem' }}>
        <div className="container">
          <div className="section-head">
            <span className="eyebrow"><Route size={13} /> Nos tarifs</span>
            <h2>Fiche tarifaire</h2>
            <p>
              Les prix s’entendent au kilo, poids arrondi au
              {' '}{Math.round(Number(s.weight_step_kg) * 1000)} g supérieur.
            </p>
          </div>

          {/* Bascule aérien / maritime */}
          <div className="chips" style={{ marginBottom: '2rem' }}>
            <button className={`chip ${mode === 'air' ? 'on' : ''}`} onClick={() => setMode('air')}>
              <Plane size={14} style={{ verticalAlign: -2, marginRight: 5 }} /> Aérien
            </button>
            <button className={`chip ${mode === 'sea' ? 'on' : ''}`} onClick={() => setMode('sea')}>
              <Ship size={14} style={{ verticalAlign: -2, marginRight: 5 }} /> Maritime
            </button>
          </div>

          {/* ---------- Maritime pas encore renseigné ---------- */}
          {mode === 'sea' && !seaEnabled ? (
            <div className="card" style={{ textAlign: 'center', padding: '3.4rem 1.6rem' }}>
              <div style={{ color: 'var(--pink)', display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                <Hourglass size={44} />
              </div>
              <h3 style={{ fontSize: '1.3rem' }}>{s.sea_title || 'Fret maritime'} — bientôt disponible</h3>
              <p className="muted" style={{ maxWidth: '48ch', margin: '.9rem auto 1.6rem' }}>
                Nos tarifs et délais maritimes sont en cours de finalisation.
                Contactez-nous dès maintenant : nous vous chiffrons votre envoi au cas par cas.
              </p>
              <Link to="/devis" className="btn btn-primary">
                Demander un devis maritime <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <>
              {/* Présentation du maritime, écrite par E-DOP */}
              {mode === 'sea' && (s.sea_intro || s.sea_frequency || s.sea_transit) && (
                <div className="card" style={{ marginBottom: '1.6rem' }}>
                  <h3 style={{ marginBottom: '.7rem' }}>{s.sea_title || 'Fret maritime'}</h3>
                  {s.sea_intro && <p className="muted" style={{ marginBottom: '.9rem' }}>{s.sea_intro}</p>}
                  {s.sea_frequency && <div className="kv"><span>Fréquence des départs</span><span>{s.sea_frequency}</span></div>}
                  {s.sea_transit && <div className="kv"><span>Délai de transit</span><span>{s.sea_transit}</span></div>}
                  {s.sea_conditions && <div className="kv"><span>Conditions</span><span>{s.sea_conditions}</span></div>}
                </div>
              )}

              {loading ? (
                <div className="price-grid">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="skeleton" style={{ height: 190 }} />
                  ))}
                </div>
              ) : shown.length === 0 ? (
                <div className="card empty">
                  Aucun tarif {MODE_META[mode].label.toLowerCase()} publié pour l’instant.
                </div>
              ) : (
                <div className="price-grid">
                  {shown.map((c, i) => (
                    <Reveal key={c.id} delay={Math.min(i * 0.04, 0.3)}>
                      <div className="price-card" style={{ height: '100%' }}>
                        <div className="ic"><CategoryIcon name={c.icon} /></div>
                        <div>
                          <h3>{c.name}</h3>
                          {c.subtitle && <div className="sub">{c.subtitle}</div>}
                        </div>
                        {c.conditions && <span className="price-cond">{c.conditions}</span>}
                        <div className="price-tag">
                          {c.price_eur == null
                            ? <b style={{ fontSize: '1.3rem' }}>Sur devis</b>
                            : (<>
                                <b>{c.price_eur} €</b><span>/kg</span>
                                <span className="fcfa">{formatFCFA(eurToFcfa(c.price_eur, rate))}</span>
                              </>)}
                        </div>
                      </div>
                    </Reveal>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ---------- Lignes desservies ---------- */}
      {lines.length > 0 && (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="section-head">
              <span className="eyebrow"><Route size={13} /> Lignes desservies</span>
              <h2 style={{ fontSize: 'clamp(1.4rem, 2.6vw, 1.9rem)' }}>
                Nos trajets {MODE_META[mode].label.toLowerCase()}s
              </h2>
            </div>
            <div className="grid g3">
              {lines.map((c, i) => (
                <Reveal key={c.id} delay={i * 0.05}>
                  <div className="card" style={{ height: '100%' }}>
                    <div className="row" style={{ gap: '.6rem', marginBottom: '.7rem', flexWrap: 'nowrap' }}>
                      <span style={{ color: 'var(--pink)' }}>
                        {mode === 'sea' ? <Ship size={19} /> : <Plane size={19} />}
                      </span>
                      <h3 style={{ fontSize: '1.02rem' }}>{c.origin_city} → {c.dest_city}</h3>
                    </div>
                    <div className="muted" style={{ fontSize: '.86rem' }}>
                      {c.origin_country} → {c.dest_country}
                    </div>
                    {(c.frequency || c.transit_days) && <div className="divider" />}
                    {c.frequency && (
                      <div className="kv"><span>Fréquence</span><span>{c.frequency}</span></div>
                    )}
                    {c.transit_days && (
                      <div className="kv">
                        <span><Clock size={13} style={{ verticalAlign: -2, marginRight: 5 }} />Délai</span>
                        <span>{c.transit_days}</span>
                      </div>
                    )}
                  </div>
                </Reveal>
              ))}
            </div>
            <p className="muted" style={{ fontSize: '.85rem', marginTop: '1rem' }}>
              Une autre destination ? Nous expédions aussi vers d’autres pays —
              <Link to="/devis" style={{ color: 'var(--pink-2)', fontWeight: 600 }}> demandez un devis</Link>.
            </p>
          </div>
        </section>
      )}

      {/* ---------- Tableau récapitulatif ---------- */}
      {shown.length > 0 && (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="table-wrap">
              <div className="table-scroll">
                <table className="data">
                  <thead>
                    <tr>
                      <th>Catégorie</th>
                      <th style={{ textAlign: 'right' }}>Tarif</th>
                      <th style={{ textAlign: 'right' }}>Équivalent FCFA</th>
                      <th>Conditions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map(c => (
                      <tr key={c.id}>
                        <td>
                          <div className="row" style={{ gap: '.7rem', flexWrap: 'nowrap' }}>
                            <span style={{ color: 'var(--pink-2)', display: 'grid', placeItems: 'center' }}>
                              <CategoryIcon name={c.icon} size={18} />
                            </span>
                            <div>
                              <div style={{ fontWeight: 600 }}>{c.name}</div>
                              {c.subtitle && <div className="muted" style={{ fontSize: '.8rem' }}>{c.subtitle}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="num" style={{ color: 'var(--red)', fontFamily: 'var(--font-head)', fontSize: '1.05rem' }}>
                          {c.price_eur == null ? 'Sur devis' : `${c.price_eur} €/kg`}
                        </td>
                        <td className="num muted">
                          {c.price_eur == null ? '—' : formatFCFA(eurToFcfa(c.price_eur, rate))}
                        </td>
                        <td className="muted" style={{ fontSize: '.85rem' }}>{c.conditions || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="muted" style={{ fontSize: '.82rem', marginTop: '.9rem' }}>
              Conversion indicative sur la base de 1 € = {formatFCFA(rate)}. E-DOP se réserve le droit
              de demander tout justificatif nécessaire. Les articles interdits ou réglementés par la loi
              ne seront pas acceptés.
            </p>
          </div>
        </section>
      )}

      {/* ---------- Règles ---------- */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container grid g2" style={{ gap: '2rem', alignItems: 'start' }}>
          <div className="rule-list">
            <Rule n="1" Icon={Scale} title="Règle de facturation"
              text={`Poids arrondi au ${Math.round(Number(s.weight_step_kg) * 1000)} g supérieur. Exemple : 1,45 kg est facturé 1,5 kg.`} />
            <Rule n="2" Icon={FileCheck} title="Déclaration obligatoire"
              text={`Tout article à partir de ${s.declaration_threshold_eur} € doit être déclaré au moment du dépôt.`} />
            <Rule n="3" Icon={Percent} title="Seuil & majoration"
              text={`Plafond de valeur : ${s.declaration_threshold_eur} €. Au-delà, ${s.value_surcharge_pct} % de la valeur totale déclarée s’ajoutent au prix du kilo.`} />
            <Rule n="4" Icon={Wallet} title="Conditions de paiement"
              text={`Colis déposés en main propre : ${s.deposit_split}.`} />
          </div>

          <div className="stack">
            <div className="callout">
              <span className="ic"><AlertTriangle size={26} /></span>
              <div>
                <h3>Récupération par un autre transporteur</h3>
                <p>
                  Tout colis livré chez nous et récupéré par un autre transporteur est
                  facturé <b>{s.other_carrier_fee_eur} €</b>, à régler avant la récupération du colis.
                </p>
              </div>
            </div>

            <div className="card">
              <h3>Une estimation immédiate ?</h3>
              <p className="muted" style={{ margin: '.6rem 0 1.2rem', fontSize: '.92rem' }}>
                Choisissez une catégorie, entrez le poids et la valeur : le montant se calcule
                en direct, majoration comprise.
              </p>
              <Link to="/devis" className="btn btn-primary btn-block">
                Estimer mon envoi <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function Rule({ n, Icon, title, text }) {
  return (
    <Reveal>
      <div className="rule">
        <span className="n">{n}</span>
        <div>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Icon size={15} style={{ color: 'var(--pink)' }} /> {title}
          </h4>
          <p>{text}</p>
        </div>
      </div>
    </Reveal>
  );
}
