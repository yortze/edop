import { Phone, Mail, MapPin, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Reveal from '../components/Reveal.jsx';
import { WhatsAppIcon, FacebookIcon, InstagramIcon } from '../components/SocialIcons.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { waLink, formatFCFA } from '../api.js';

export default function Contact() {
  const s = useSettings();

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">Nous contacter</span>
          <h2>Une question sur votre envoi&nbsp;?</h2>
          <p>
            Le plus simple reste WhatsApp — nos deux numéros répondent en France
            comme au Gabon.
          </p>
        </div>

        <div className="grid g2" style={{ gap: '1.4rem', alignItems: 'start' }}>
          <div className="stack">
            <Reveal>
              <a className="card feature" href={waLink(s.phone_fr, 'Bonjour E-DOP,')} target="_blank" rel="noreferrer">
                <div className="ic"><WhatsAppIcon size={22} /></div>
                <div>
                  <h3>France — {s.phone_fr}</h3>
                  <p>Dépôts, achats et expéditions au départ de {s.address_fr}.</p>
                </div>
              </a>
            </Reveal>

            <Reveal delay={0.06}>
              <a className="card feature" href={waLink(s.phone_ga, 'Bonjour E-DOP,')} target="_blank" rel="noreferrer">
                <div className="ic"><WhatsAppIcon size={22} /></div>
                <div>
                  <h3>Gabon — {s.phone_ga}</h3>
                  <p>Retraits, livraisons et suivi à {s.address_ga}.</p>
                </div>
              </a>
            </Reveal>

            <Reveal delay={0.12}>
              <a className="card feature" href={`mailto:${s.email}`}>
                <div className="ic"><Mail size={22} /></div>
                <div>
                  <h3>{s.email}</h3>
                  <p>Devis, factures et demandes administratives.</p>
                </div>
              </a>
            </Reveal>

            {(s.facebook_url || s.instagram_url) && (
              <Reveal delay={0.18}>
                <div className="card">
                  <h3 style={{ marginBottom: '.8rem' }}>Suivez-nous</h3>
                  <div className="row">
                    {s.facebook_url && (
                      <a className="btn btn-ghost btn-sm" href={s.facebook_url} target="_blank" rel="noreferrer">
                        <FacebookIcon size={16} /> Facebook
                      </a>
                    )}
                    {s.instagram_url && (
                      <a className="btn btn-ghost btn-sm" href={s.instagram_url} target="_blank" rel="noreferrer">
                        <InstagramIcon size={16} /> Instagram
                      </a>
                    )}
                  </div>
                </div>
              </Reveal>
            )}
          </div>

          <div className="stack">
            <Reveal delay={0.06}>
              <div className="card">
                <h3 style={{ marginBottom: '1rem' }}>Nos points de dépôt</h3>
                <div className="feature" style={{ marginBottom: '1.2rem' }}>
                  <div className="ic"><MapPin size={20} /></div>
                  <div>
                    <h3 style={{ fontSize: '.95rem' }}>{s.address_fr}</h3>
                    <p>Dépôt des colis au départ de la France.</p>
                  </div>
                </div>
                <div className="feature">
                  <div className="ic"><MapPin size={20} /></div>
                  <div>
                    <h3 style={{ fontSize: '.95rem' }}>{s.address_ga}</h3>
                    <p>Retrait et livraison des colis au Gabon.</p>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.12}>
              <div className="card">
                <h3 style={{ marginBottom: '.8rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={17} style={{ color: 'var(--pink)' }} /> En pratique
                </h3>
                <div className="kv"><span>Départs</span><span>{s.departures_per_week} par semaine</span></div>
                <div className="kv"><span>Trajet</span><span>{s.corridor}</span></div>
                <div className="kv"><span>Paiement en main propre</span><span style={{ fontSize: '.82rem' }}>{s.deposit_split}</span></div>
                <div className="kv"><span>Déclaration obligatoire</span><span>dès {s.declaration_threshold_eur} €</span></div>
                <div className="kv"><span>Taux appliqué</span><span>1 € = {formatFCFA(s.fcfa_rate)}</span></div>
              </div>
            </Reveal>

            <Reveal delay={0.18}>
              <div className="card" style={{ background: 'var(--grad-brand)', border: 'none', color: '#fff' }}>
                <h3 style={{ color: '#fff' }}>Besoin d’un chiffrage ?</h3>
                <p style={{ opacity: .92, margin: '.6rem 0 1.2rem', fontSize: '.93rem' }}>
                  Notre estimateur calcule le montant en direct, majoration de valeur comprise.
                </p>
                <Link to="/devis" className="btn btn-block" style={{ background: '#fff', color: 'var(--red)' }}>
                  Demander un devis <ArrowRight size={16} />
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
