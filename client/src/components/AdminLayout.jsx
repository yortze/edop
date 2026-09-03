import { useState } from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, FileText, Users, Tags, Layers, Route,
  UserCog, Settings, Images, LogOut, ExternalLink, Menu, KeyRound
} from 'lucide-react';
import { Brand } from './Brand.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import { useAuth } from '../context/AuthContext.jsx';

// `admin: true` = entrée visible uniquement par l'administrateur.
const NAV = [
  { group: 'Activité', items: [
    { to: '/admin', Icon: LayoutDashboard, label: 'Tableau de bord', end: true },
    { to: '/admin/colis', Icon: Package, label: 'Colis' },
    { to: '/admin/groupages', Icon: Layers, label: 'Groupages' },
    { to: '/admin/devis', Icon: FileText, label: 'Devis' },
    { to: '/admin/clients', Icon: Users, label: 'Clients' }
  ] },
  { group: 'Contenu', items: [
    { to: '/admin/lignes', Icon: Route, label: 'Lignes' },
    { to: '/admin/tarifs', Icon: Tags, label: 'Fiche tarifaire' },
    { to: '/admin/medias', Icon: Images, label: 'Images' }
  ] },
  { group: 'Administration', items: [
    { to: '/admin/equipe', Icon: UserCog, label: 'Équipe', admin: true },
    { to: '/admin/reglages', Icon: Settings, label: 'Réglages', admin: true },
    { to: '/admin/compte', Icon: KeyRound, label: 'Mon compte' }
  ] }
];

export default function AdminLayout() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/admin/login');
  }

  return (
    <div className="admin">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <Link to="/admin" onClick={() => setOpen(false)}>
          <Brand light sub="Back-office" size={30} />
        </Link>

        <nav style={{ flex: 1 }}>
          {NAV.map(section => {
            const items = section.items.filter(i => !i.admin || isAdmin);
            if (!items.length) return null;
            return (
              <div key={section.group}>
                <div className="side-group">{section.group}</div>
                {items.map(n => (
                  <NavLink key={n.to} to={n.to} end={n.end}
                    className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}
                    onClick={() => setOpen(false)}>
                    <span className="ic"><n.Icon size={18} /></span> {n.label}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="side-foot">
          <div className="side-user">
            <div className="avatar">{(user?.name || 'E').charAt(0).toUpperCase()}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 600, color: '#fff', fontSize: '.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name}
              </div>
              <div style={{ fontSize: '.72rem', color: '#a695a4' }}>
                {isAdmin ? 'Administrateur' : 'Modérateur'}
              </div>
            </div>
            <ThemeToggle tone="light" />
          </div>
          <Link to="/" className="side-link"><span className="ic"><ExternalLink size={18} /></span> Voir le site</Link>
          <button className="side-link" onClick={handleLogout}
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', font: 'inherit', textAlign: 'left' }}>
            <span className="ic"><LogOut size={18} /></span> Déconnexion
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <button className="nav-toggle" style={{ marginBottom: 16 }}
          onClick={() => setOpen(o => !o)} aria-label="Menu">
          <Menu size={20} />
        </button>
        <Outlet />
      </div>
    </div>
  );
}
