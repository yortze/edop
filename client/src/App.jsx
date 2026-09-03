import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';

import PublicLayout from './components/PublicLayout.jsx';
import AdminLayout from './components/AdminLayout.jsx';

import Home from './pages/Home.jsx';
import Tarifs from './pages/Tarifs.jsx';
import Quote from './pages/Quote.jsx';
import Track from './pages/Track.jsx';
import Contact from './pages/Contact.jsx';

import Login from './pages/admin/Login.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';
import ShipmentsAdmin from './pages/admin/ShipmentsAdmin.jsx';
import ShipmentDetail from './pages/admin/ShipmentDetail.jsx';
import QuotesAdmin from './pages/admin/QuotesAdmin.jsx';
import ClientsAdmin from './pages/admin/ClientsAdmin.jsx';
import CategoriesAdmin from './pages/admin/CategoriesAdmin.jsx';
import CorridorsAdmin from './pages/admin/CorridorsAdmin.jsx';
import GroupagesAdmin from './pages/admin/GroupagesAdmin.jsx';
import GroupageDetail from './pages/admin/GroupageDetail.jsx';
import MediaAdmin from './pages/admin/MediaAdmin.jsx';
import TeamAdmin from './pages/admin/TeamAdmin.jsx';
import SettingsAdmin from './pages/admin/SettingsAdmin.jsx';
import Account from './pages/admin/Account.jsx';

function Loading() {
  return (
    <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>
      Chargement…
    </div>
  );
}

// Accès réservé à l'équipe connectée (admin + modérateurs).
function RequireAuth({ children }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <Loading />;
  if (!user) return <Navigate to="/admin/login" state={{ from: location }} replace />;
  return children;
}

// Accès réservé à l'administrateur — le serveur applique la même règle.
function RequireAdmin({ children }) {
  const { isAdmin, ready } = useAuth();
  if (!ready) return <Loading />;
  if (!isAdmin) {
    return (
      <div className="card" style={{ maxWidth: 520 }}>
        <h2 style={{ fontSize: '1.2rem' }}>Accès réservé</h2>
        <p className="muted" style={{ marginTop: '.6rem' }}>
          Cette section est réservée à l’administrateur. Rapprochez-vous de lui
          si vous avez besoin d’un accès.
        </p>
      </div>
    );
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="/tarifs" element={<Tarifs />} />
        <Route path="/devis" element={<Quote />} />
        <Route path="/suivi" element={<Track />} />
        <Route path="/contact" element={<Contact />} />
      </Route>

      <Route path="/admin/login" element={<Login />} />

      <Route path="/admin" element={<RequireAuth><AdminLayout /></RequireAuth>}>
        <Route index element={<Dashboard />} />
        <Route path="colis" element={<ShipmentsAdmin />} />
        <Route path="colis/:id" element={<ShipmentDetail />} />
        <Route path="groupages" element={<GroupagesAdmin />} />
        <Route path="groupages/:id" element={<GroupageDetail />} />
        <Route path="devis" element={<QuotesAdmin />} />
        <Route path="clients" element={<ClientsAdmin />} />
        <Route path="lignes" element={<CorridorsAdmin />} />
        <Route path="tarifs" element={<CategoriesAdmin />} />
        <Route path="medias" element={<MediaAdmin />} />
        <Route path="equipe" element={<RequireAdmin><TeamAdmin /></RequireAdmin>} />
        <Route path="reglages" element={<RequireAdmin><SettingsAdmin /></RequireAdmin>} />
        <Route path="compte" element={<Account />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
