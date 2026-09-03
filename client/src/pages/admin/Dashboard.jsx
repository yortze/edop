import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { Package, Euro, Users, FileText, Weight, ArrowRight, CloudOff, MailWarning } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge.jsx';
import { api, formatEur, formatFCFA, formatDate } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const { resolved } = useTheme();
  const [stats, setStats] = useState(null);
  const [integrations, setIntegrations] = useState(null);

  // Recharts reçoit des couleurs en dur : on les choisit selon le thème.
  const chart = resolved === 'dark'
    ? { grid: '#322942', axis: '#b1a2b6', bar: '#f45bab', line: '#ff4d80', tooltipBg: '#1e1827', tooltipBd: '#453856' }
    : { grid: '#f4dbe8', axis: '#7a6a78', bar: '#e5308f', line: '#d81159', tooltipBg: '#ffffff', tooltipBd: '#f4dbe8' };

  useEffect(() => {
    api.stats().then(setStats).catch(() => {});
    api.integrations().then(setIntegrations).catch(() => {});
  }, []);

  if (!stats) {
    return (
      <div className="kpi-grid">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 128 }} />)}
      </div>
    );
  }

  const monthly = stats.monthly.map(m => ({
    ...m,
    label: new Date(`${m.month}-01T00:00:00`).toLocaleDateString('fr-FR', { month: 'short' })
  }));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Bonjour {user?.name?.split(' ')[0]} 👋</h1>
          <p>Voici l’activité E-DOP en un coup d’œil.</p>
        </div>
        <Link to="/admin/colis" className="btn btn-primary btn-sm">
          Gérer les colis <ArrowRight size={15} />
        </Link>
      </div>

      {/* Alertes d'intégration */}
      {integrations && (!integrations.cloudinary.configured || !integrations.brevo.configured) && (
        <div className="stack" style={{ gap: '.7rem', marginBottom: '1.4rem' }}>
          {!integrations.cloudinary.configured && (
            <div className="alert alert-warn" style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
              <CloudOff size={17} />
              Cloudinary n’est pas configuré : l’envoi d’images est désactivé.
              Renseignez les clés dans <code>server/.env</code>.
            </div>
          )}
          {!integrations.brevo.configured && (
            <div className="alert alert-warn" style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
              <MailWarning size={17} />
              Brevo n’est pas configuré : les emails clients sont seulement journalisés,
              pas envoyés.
            </div>
          )}
        </div>
      )}

      <div className="kpi-grid">
        <Kpi Icon={Package} value={stats.totals.shipments} label="Colis enregistrés" />
        <Kpi Icon={Euro} value={formatEur(stats.totals.revenue_eur)} label={formatFCFA(stats.totals.revenue_fcfa)} />
        <Kpi Icon={Weight} value={`${Math.round(stats.totals.weight_kg)} kg`} label="Poids total expédié" />
        <Kpi Icon={Users} value={stats.totals.clients} label="Clients au répertoire" />
      </div>

      <div className="split" style={{ marginTop: '1.2rem' }}>
        <div className="card">
          <div className="spread" style={{ marginBottom: '1rem' }}>
            <h3>Volume mensuel</h3>
            <span className="muted" style={{ fontSize: '.82rem' }}>6 derniers mois</span>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: chart.axis }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: chart.axis }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: chart.grid, opacity: .35 }}
                contentStyle={{ borderRadius: 12, border: `1px solid ${chart.tooltipBd}`, background: chart.tooltipBg, color: 'var(--ink)', fontSize: 13 }}
                formatter={(v) => [v, 'colis']}
              />
              <Bar dataKey="shipments" fill={chart.bar} radius={[7, 7, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="spread" style={{ marginBottom: '1rem' }}>
            <h3>Chiffre d’affaires</h3>
            <span className="muted" style={{ fontSize: '.82rem' }}>en euros</span>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: chart.axis }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: chart.axis }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: `1px solid ${chart.tooltipBd}`, background: chart.tooltipBg, color: 'var(--ink)', fontSize: 13 }}
                formatter={(v) => [formatEur(v), 'CA']}
              />
              <Line type="monotone" dataKey="revenue_eur" stroke={chart.line} strokeWidth={3}
                dot={{ r: 4, fill: chart.line }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="split split-main-left" style={{ marginTop: '1.2rem' }}>
        <div className="table-wrap">
          <div className="spread" style={{ padding: '1.1rem 1.3rem' }}>
            <h3>Derniers colis</h3>
            <Link to="/admin/colis" className="muted" style={{ fontSize: '.85rem' }}>Tout voir →</Link>
          </div>
          <div className="table-scroll">
            <table className="data">
              <thead>
                <tr><th>Suivi</th><th>Client</th><th>Statut</th><th style={{ textAlign: 'right' }}>Montant</th></tr>
              </thead>
              <tbody>
                {stats.recent.map(s => (
                  <tr key={s.id}>
                    <td>
                      <Link to={`/admin/colis/${s.id}`} className="tn">{s.tracking_number}</Link>
                      <div className="muted" style={{ fontSize: '.78rem' }}>{formatDate(s.created_at)}</div>
                    </td>
                    <td>{s.client_name || '—'}</td>
                    <td><StatusBadge status={s.status} /></td>
                    <td className="num">{formatEur(s.price_eur)}</td>
                  </tr>
                ))}
                {stats.recent.length === 0 && (
                  <tr><td colSpan={4} className="empty">Aucun colis pour le moment</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <h3 style={{ marginBottom: '.9rem' }}>Répartition par statut</h3>
            {stats.by_status.map(s => (
              <div className="kv" key={s.status}>
                <span><StatusBadge status={s.status} /></span>
                <span>{s.count}</span>
              </div>
            ))}
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '.9rem' }}>Catégories les plus expédiées</h3>
            {stats.top_categories.map(c => (
              <div className="kv" key={c.slug}>
                <span>{c.name}</span>
                <span>{c.shipments} · {formatEur(c.revenue_eur)}</span>
              </div>
            ))}
            {stats.top_categories.length === 0 && <p className="muted" style={{ fontSize: '.88rem' }}>Pas encore de données.</p>}
          </div>

          {stats.totals.new_quotes > 0 && (
            <Link to="/admin/devis" className="card" style={{ background: 'var(--grad-brand)', color: '#fff', border: 'none' }}>
              <div className="row" style={{ gap: '.8rem', flexWrap: 'nowrap' }}>
                <FileText size={26} />
                <div>
                  <div style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: '1.4rem' }}>
                    {stats.totals.new_quotes}
                  </div>
                  <div style={{ fontSize: '.86rem', opacity: .92 }}>
                    demande{stats.totals.new_quotes > 1 ? 's' : ''} de devis à traiter
                  </div>
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>
    </>
  );
}

function Kpi({ Icon, value, label }) {
  return (
    <div className="kpi">
      <div className="ic"><Icon size={19} /></div>
      <div className="val">{value}</div>
      <div className="lab">{label}</div>
    </div>
  );
}
