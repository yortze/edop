import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plane, ShieldCheck, Search, Headphones, ArrowRight, Package,
  Scale, FileCheck, Percent, Wallet, AlertTriangle, Sparkles
} from 'lucide-react';
import Reveal from '../components/Reveal.jsx';
import CategoryIcon from '../components/CategoryIcon.jsx';
import { WhatsAppIcon } from '../components/SocialIcons.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { api, formatFCFA, waLink } from '../api.js';
import { eurToFcfa } from '../pricing.js';

const ATOUTS = [
  { Icon: Plane, title: 'Livraison rapide par voie aérienne', text: 'Des départs réguliers vers Libreville, avec une prise en charge de bout en bout.' },
  { Icon: ShieldCheck, title: 'Sécurité & fiabilité', text: 'Vos colis sont vérifiés, déclarés et acheminés dans les règles.' },
  { Icon: Search, title: 'Suivi de colis disponible', text: 'Un numéro de suivi unique, consultable en ligne à chaque étape.' },
  { Icon: Headphones, title: 'Service client à votre écoute', text: 'Une équipe joignable sur WhatsApp en France comme au Gabon.' }
];

export default function Home() {
  const s = useSettings();
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api.categories().then(setCategories).catch(() => {});
  }, []);

  const rate = Number(s.fcfa_rate) || 650;
  const priced = categories.filter(c => c.price_eur != null);
  const cheapest = priced.length ? Math.min(...priced.map(c => c.price_eur)) : 18;
  const preview = categories.slice(0, 6);

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <Reveal>
              <span className="eyebrow"><Sparkles size={13} /> {s.tagline}</span>
            </Reveal>
            <Reveal delay={0.06}>
              <h1>
                Vos colis de <span className="accent">France</span> vers
                le <span className="accent">Gabon</span>, sans mauvaise surprise.
              </h1>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="lead">
                Expédition aérienne avec {s.departures_per_week} départs par semaine, tarifs au kilo
                affichés par catégorie, et un suivi en ligne du dépôt à la remise.
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <div className="hero-cta">
                <Link to="/devis" className="btn btn-primary">
                  Estimer mon envoi <ArrowRight size={17} />
                </Link>
                <Link to="/suivi" className="btn btn-ghost">
                  <Package size={17} /> Suivre un colis
                </Link>
              </div>
            </Reveal>
            <Reveal delay={0.24}>
              <div className="hero-stats">
                <div className="hero-stat">
                  <strong>{cheapest} €</strong>
                  <span>le kilo à partir de</span>
                </div>
                <div className="hero-stat">
                  <strong>{s.departures_per_week}×</strong>
                  <span>départs par semaine</span>
                </div>
                <div className="hero-stat">
                  <strong>{priced.length || 10}</strong>
                  <span>catégories tarifées</span>
                </div>
              </div>
            </Reveal>
          </div>

          <div className="hero-visual">
            <div className="hero-blob" />
            <motion.div
              className="hero-card"
              initial={{ opacity: 0, y: 26, rotate: -1.5 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="spread" style={{ marginBottom: '1.3rem' }}>
                <span className="eyebrow">Expédition aérienne</span>
                <span className="badge" style={{ color: 'var(--red)', background: 'rgba(216,17,89,.12)' }}>
                  <span className="pip" /> En vol
                </span>
              </div>

              <div className="route">
                <span className="dot" />
                <span className="line">
                  <motion.span
                    className="plane"
                    initial={{ left: '0%', y: '-50%' }}
                    animate={{ left: ['0%', '86%', '0%'] }}
                    transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Plane size={17} />
                  </motion.span>
                </span>
                <span className="dot end" />
              </div>
              <div className="spread" style={{ marginTop: '.6rem', fontSize: '.85rem', fontWeight: 600 }}>
                <span>{s.address_fr}</span>
                <span>{s.address_ga}</span>
              </div>

              <div className="divider" />

              <div className="kv"><span>Numéro de suivi</span><span className="tn">EDOP-DEMO2026</span></div>
              <div className="kv"><span>Catégorie</span><span>Vêtements et chaussures</span></div>
              <div className="kv"><span>Poids facturé</span><span>6,4 kg</span></div>
              <div className="kv">
                <span>Montant</span>
                <span style={{ color: 'var(--red)' }}>115,20 € · {formatFCFA(eurToFcfa(115.2, rate))}</span>
              </div>

              <Link to="/suivi" className="btn btn-dark btn-block btn-sm" style={{ marginTop: '1.2rem' }}>
                Essayer le suivi <ArrowRight size={15} />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ---------- Bandeau des catégories ---------- */}
      {priced.length > 0 && (
        <div className="marquee">
          <div className="marquee-track">
            {[...priced, ...priced].map((c, i) => (
              <span className="marquee-item" key={`${c.id}-${i}`}>
                <CategoryIcon name={c.icon} size={16} />
                {c.name} <b>{c.price_eur} €/kg</b>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ---------- Atouts ---------- */}
      <section className="section">
        <div className="container">
          <div className="section-head center">
            <span className="eyebrow">Pourquoi E-DOP</span>
            <h2>Expédiez vos colis en toute sérénité</h2>
            <p>De l’achat en France à la remise au Gabon, on s’occupe de tout.</p>
          </div>
          <div className="grid g4">
            {ATOUTS.map((a, i) => (
              <Reveal key={a.title} delay={i * 0.07}>
                <div className="card feature" style={{ height: '100%' }}>
                  <div className="ic"><a.Icon size={22} /></div>
                  <div>
                    <h3>{a.title}</h3>
                    <p>{a.text}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Aperçu des tarifs ---------- */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="spread section-head" style={{ maxWidth: '100%' }}>
            <div>
              <span className="eyebrow">Fiche tarifaire</span>
              <h2 style={{ marginTop: '.9rem' }}>Un prix au kilo par catégorie</h2>
            </div>
            <Link to="/tarifs" className="btn btn-ghost">
              Voir tous les tarifs <ArrowRight size={16} />
            </Link>
          </div>

          <div className="price-grid">
            {preview.map((c, i) => (
              <Reveal key={c.id} delay={i * 0.05}>
                <div className="price-card" style={{ height: '100%' }}>
                  <div className="ic"><CategoryIcon name={c.icon} /></div>
                  <div>
                    <h3>{c.name}</h3>
                    {c.subtitle && <div className="sub">{c.subtitle}</div>}
                  </div>
                  {c.conditions && <span className="price-cond">{c.conditions}</span>}
                  <div className="price-tag">
                    {c.price_eur == null
                      ? <b style={{ fontSize: '1.25rem' }}>Sur devis</b>
                      : (<>
                          <b>{c.price_eur} €</b><span>/kg</span>
                          <span className="fcfa">{formatFCFA(eurToFcfa(c.price_eur, rate))}</span>
                        </>)}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Règles de facturation ---------- */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container grid g2" style={{ gap: '2rem', alignItems: 'start' }}>
          <div>
            <span className="eyebrow">Les règles, sans détour</span>
            <h2 style={{ margin: '.9rem 0 1.6rem' }}>Comment votre facture est calculée</h2>
            <div className="rule-list">
              <Rule n={<Scale size={15} />} title="Règle de facturation"
                text={`Le poids est arrondi au ${Math.round(Number(s.weight_step_kg) * 1000)} g supérieur — un colis de 1,45 kg est compté 1,5 kg.`} />
              <Rule n={<FileCheck size={15} />} title="Déclaration obligatoire"
                text={`Tout article à partir de ${s.declaration_threshold_eur} € doit être déclaré.`} />
              <Rule n={<Percent size={15} />} title="Seuil & majoration"
                text={`Au-delà de ${s.declaration_threshold_eur} €, la facturation ajoute ${s.value_surcharge_pct} % de la valeur totale déclarée, en plus du kilo.`} />
              <Rule n={<Wallet size={15} />} title="Conditions de paiement"
                text={`Les colis déposés en main propre se règlent ${s.deposit_split}.`} />
            </div>
          </div>

          <div className="stack">
            <div className="callout">
              <span className="ic"><AlertTriangle size={26} /></span>
              <div>
                <h3>Colis récupéré par un autre transporteur</h3>
                <p>
                  Tout colis livré chez nous et récupéré par un autre transporteur est
                  facturé <b>{s.other_carrier_fee_eur} €</b>, à régler avant la récupération du colis.
                </p>
              </div>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: '.7rem' }}>Bon à savoir</h3>
              <div className="kv"><span>Colis hors format</span><span>&gt; {s.oversize_cm} cm → sur devis</span></div>
              <div className="kv"><span>Objets de valeur</span><span>+ {s.value_surcharge_pct} % de la valeur</span></div>
              <div className="kv"><span>Médicaments</span><span>Ordonnance obligatoire</span></div>
              <div className="kv"><span>Taux appliqué</span><span>1 € = {formatFCFA(rate)}</span></div>
              <p className="muted" style={{ fontSize: '.82rem', marginTop: '.9rem' }}>
                Les tarifs peuvent varier selon la nature des articles et les conditions
                d’expédition. Les articles interdits ou réglementés ne sont pas acceptés.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Appel à l'action ---------- */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="card center" style={{ background: 'var(--grad-brand)', border: 'none', color: '#fff', padding: '3rem 1.6rem' }}>
            <h2 style={{ color: '#fff' }}>Un colis à envoyer&nbsp;?</h2>
            <p style={{ maxWidth: '52ch', margin: '.8rem auto 1.8rem', opacity: .92 }}>
              Obtenez une estimation en quelques secondes, ou écrivez-nous directement
              sur WhatsApp — en France comme au Gabon.
            </p>
            <div className="row" style={{ justifyContent: 'center' }}>
              <Link to="/devis" className="btn" style={{ background: '#fff', color: 'var(--red)' }}>
                Demander un devis <ArrowRight size={17} />
              </Link>
              <a className="btn btn-dark" href={waLink(s.phone_ga, 'Bonjour E-DOP, je souhaite envoyer un colis.')} target="_blank" rel="noreferrer">
                <WhatsAppIcon size={17} /> Écrire sur WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function Rule({ n, title, text }) {
  return (
    <Reveal>
      <div className="rule">
        <span className="n">{n}</span>
        <div>
          <h4>{title}</h4>
          <p>{text}</p>
        </div>
      </div>
    </Reveal>
  );
}
