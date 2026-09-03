import { useState, useEffect } from 'react';
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom';
import { Menu, X, Phone, MapPin, Mail, Plane } from 'lucide-react';
import { Brand } from './Brand.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import { WhatsAppIcon, FacebookIcon, InstagramIcon } from './SocialIcons.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { waLink } from '../api.js';

const LINKS = [
  { to: '/', label: 'Accueil', end: true },
  { to: '/tarifs', label: 'Tarifs' },
  { to: '/devis', label: 'Devis' },
  { to: '/suivi', label: 'Suivi de colis' },
  { to: '/contact', label: 'Contact' }
];

export default function PublicLayout() {
  const s = useSettings();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <>
      <div className="topbar">
        <div className="container">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Plane size={14} /> {s.corridor} — {s.departures_per_week} départs par semaine
          </span>
          <span className="row" style={{ gap: '1.1rem' }}>
            <a href={waLink(s.phone_ga)} target="_blank" rel="noreferrer"><WhatsAppIcon size={14} /> {s.phone_ga}</a>
            <a href={waLink(s.phone_fr)} target="_blank" rel="noreferrer"><WhatsAppIcon size={14} /> {s.phone_fr}</a>
          </span>
        </div>
      </div>

      <header className="nav">
        <div className="container">
          <Link to="/"><Brand /></Link>

          <nav className={`nav-links ${open ? 'open' : ''}`}>
            {LINKS.map(l => (
              <NavLink key={l.to} to={l.to} end={l.end}
                className={({ isActive }) => isActive ? 'active' : ''}>
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="row" style={{ gap: '.6rem', flexWrap: 'nowrap' }}>
            <ThemeToggle />
            <Link to="/devis" className="btn btn-primary btn-sm nav-cta">
              Demander un devis
            </Link>
            <button className="nav-toggle" onClick={() => setOpen(o => !o)} aria-label="Menu">
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      <main><Outlet /></main>

      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <Brand light sub={s.tagline} />
              <p style={{ fontSize: '.9rem', marginTop: '1rem', maxWidth: '34ch' }}>
                Expédition aérienne {s.corridor.toLowerCase()}. {s.departures_per_week} départs
                par semaine, suivi de colis en ligne et tarifs clairs au kilo.
              </p>
              <div className="social">
                <a href={waLink(s.phone_ga)} target="_blank" rel="noreferrer" aria-label="WhatsApp"><WhatsAppIcon /></a>
                {s.facebook_url && <a href={s.facebook_url} target="_blank" rel="noreferrer" aria-label="Facebook"><FacebookIcon /></a>}
                {s.instagram_url && <a href={s.instagram_url} target="_blank" rel="noreferrer" aria-label="Instagram"><InstagramIcon /></a>}
              </div>
            </div>

            <div>
              <h4>Navigation</h4>
              {LINKS.map(l => <Link key={l.to} to={l.to}>{l.label}</Link>)}
            </div>

            <div>
              <h4>Nous contacter</h4>
              <a href={waLink(s.phone_ga)} target="_blank" rel="noreferrer">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><Phone size={14} /> {s.phone_ga}</span>
              </a>
              <a href={waLink(s.phone_fr)} target="_blank" rel="noreferrer">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><Phone size={14} /> {s.phone_fr}</span>
              </a>
              <a href={`mailto:${s.email}`}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><Mail size={14} /> {s.email}</span>
              </a>
            </div>

            <div>
              <h4>Nos agences</h4>
              <span style={{ display: 'flex', gap: 7, fontSize: '.9rem', padding: '4px 0' }}>
                <MapPin size={14} style={{ flex: 'none', marginTop: 3 }} /> {s.address_fr}
              </span>
              <span style={{ display: 'flex', gap: 7, fontSize: '.9rem', padding: '4px 0' }}>
                <MapPin size={14} style={{ flex: 'none', marginTop: 3 }} /> {s.address_ga}
              </span>
            </div>
          </div>

          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} E-DOP — votre partenaire logistique de confiance.</span>
            <Link to="/admin" style={{ display: 'inline' }}>Espace équipe</Link>
          </div>
        </div>
      </footer>

      <a className="wa-float" href={waLink(s.phone_ga, 'Bonjour E-DOP, je souhaite des informations.')}
         target="_blank" rel="noreferrer" aria-label="Écrire sur WhatsApp">
        <WhatsAppIcon size={26} />
      </a>
    </>
  );
}
