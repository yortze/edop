import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash2, Mail, Copy, Check, PackagePlus,
  Layers, Plane, Ship, X
} from 'lucide-react';
import Modal from '../../components/Modal.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import SearchInput from '../../components/SearchInput.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  api, formatEur, formatDate, formatDateTime,
  STATUS_ORDER, MODE_META, statusLabel
} from '../../api.js';

export default function GroupageDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [g, setG] = useState(null);
  const [eventOpen, setEventOpen] = useState(false);
  const [event, setEvent] = useState({ status: '', location: '', note: '', notify: true });
  const [addOpen, setAddOpen] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [picked, setPicked] = useState([]);
  const [q, setQ] = useState('');
  const [flash, setFlash] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  function load() {
    api.groupage(id).then(setG).catch(() => navigate('/admin/groupages'));
  }
  useEffect(() => { load(); }, [id]);

  if (!g) return <div className="skeleton" style={{ height: 320 }} />;

  const ModeIcon = g.mode === 'sea' ? Ship : Plane;

  function openAdd() {
    setPicked([]);
    setQ('');
    api.shipments('?ungrouped=1').then(setCandidates).catch(() => {});
    setAddOpen(true);
  }

  async function attach() {
    if (!picked.length) return;
    setBusy(true);
    try {
      await api.addToGroupage(g.id, picked);
      setAddOpen(false);
      setFlash(`${picked.length} colis rattaché${picked.length > 1 ? 's' : ''} au groupage.`);
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function detach(shipment) {
    if (!confirm(`Retirer ${shipment.tracking_number} du groupage ?`)) return;
    try { await api.removeFromGroupage(g.id, shipment.id); load(); }
    catch (err) { alert(err.message); }
  }

  async function addEvent(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const updated = await api.addGroupageEvent(g.id, event);
      setEventOpen(false);
      setEvent({ status: '', location: '', note: '', notify: true });
      setFlash(
        `Étape appliquée à ${updated.affected} colis` +
        (updated.notified ? ` — ${updated.notified} client${updated.notified > 1 ? 's' : ''} prévenu${updated.notified > 1 ? 's' : ''} par email.` : '.')
      );
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Supprimer le groupage ${g.code} ? Les colis seront détachés, pas supprimés.`)) return;
    await api.deleteGroupage(g.id);
    navigate('/admin/groupages');
  }

  function copyCode() {
    navigator.clipboard?.writeText(g.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const filtered = candidates.filter(c =>
    !q || `${c.tracking_number} ${c.client_name || ''} ${c.recipient_name || ''}`.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <>
      <Link to="/admin/groupages" className="muted"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '.88rem', marginBottom: '1rem' }}>
        <ArrowLeft size={15} /> Retour aux groupages
      </Link>

      <div className="page-head">
        <div>
          <div className="row" style={{ gap: '.7rem' }}>
            <h1 className="tn" style={{ fontSize: '1.6rem' }}>{g.code}</h1>
            <button className="icon-btn" onClick={copyCode} title="Copier le code">
              {copied ? <Check size={16} style={{ color: 'var(--ok)' }} /> : <Copy size={16} />}
            </button>
            <StatusBadge status={g.status} mode={g.mode} />
            <span className="badge" style={{ color: g.mode === 'sea' ? '#2a7fd6' : 'var(--pink-2)', background: 'var(--surface-3)' }}>
              <ModeIcon size={13} /> {MODE_META[g.mode]?.label}
            </span>
          </div>
          <p>{g.label || 'Sans intitulé'} · {g.corridor_label || 'ligne à définir'}</p>
        </div>
        <div className="row">
          <button className="btn btn-ghost btn-sm" onClick={openAdd}>
            <PackagePlus size={15} /> Ajouter des colis
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setEventOpen(true)} disabled={!g.shipments.length}>
            <Plus size={15} /> Étape pour tout le groupage
          </button>
          {isAdmin && <button className="btn btn-danger btn-sm" onClick={remove}><Trash2 size={15} /></button>}
        </div>
      </div>

      {flash && (
        <div className="alert alert-ok" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
          <span>{flash}</span>
          <button className="icon-btn" onClick={() => setFlash('')}><X size={16} /></button>
        </div>
      )}

      <div className="kpi-grid" style={{ marginBottom: '1.2rem' }}>
        <Kpi Icon={Layers} value={g.shipments_count} label="Colis dans le groupage" />
        <Kpi Icon={ModeIcon} value={`${Math.round(g.total_weight_kg * 10) / 10} kg`} label="Poids total" />
        <Kpi Icon={Layers} value={formatEur(g.total_eur)} label="Valeur facturée" />
        <Kpi Icon={Layers} value={g.departure_date ? formatDate(g.departure_date) : '—'} label="Départ prévu" />
      </div>

      <div className="split split-main-left">
        <div className="table-wrap">
          <div className="spread" style={{ padding: '1.1rem 1.3rem' }}>
            <h3>Colis du groupage</h3>
            <span className="muted" style={{ fontSize: '.83rem' }}>
              Ils suivent tous le statut « {statusLabel(g.status, g.mode)} »
            </span>
          </div>
          <div className="table-scroll">
            <table className="data">
              <thead>
                <tr><th>Suivi</th><th>Client</th><th>Catégorie</th><th style={{ textAlign: 'right' }}>Poids</th><th>Statut</th><th></th></tr>
              </thead>
              <tbody>
                {g.shipments.map(s => (
                  <tr key={s.id}>
                    <td><Link to={`/admin/colis/${s.id}`} className="tn">{s.tracking_number}</Link></td>
                    <td>
                      {s.client_name || '—'}
                      {!s.client_email && (
                        <div className="muted" style={{ fontSize: '.74rem' }}>pas d’email</div>
                      )}
                    </td>
                    <td>{s.category_name || '—'}</td>
                    <td className="num">{s.weight_kg} kg</td>
                    <td><StatusBadge status={s.status} mode={g.mode} /></td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="icon-btn danger" title="Retirer du groupage" onClick={() => detach(s)}>
                        <X size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {g.shipments.length === 0 && (
                  <tr><td colSpan={6}>
                    <div className="empty">
                      <div className="ic"><PackagePlus size={38} /></div>
                      Aucun colis. Ajoutez-en pour qu’ils partagent ce suivi.
                    </div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <h3 style={{ marginBottom: '.8rem' }}>Informations</h3>
            <div className="kv"><span>Ligne</span><span>{g.corridor_label || '—'}</span></div>
            <div className="kv"><span>Trajet</span><span>{g.origin && g.destination ? `${g.origin} → ${g.destination}` : '—'}</span></div>
            <div className="kv"><span>Mode</span><span>{MODE_META[g.mode]?.label}</span></div>
            <div className="kv"><span>Départ</span><span>{g.departure_date ? formatDate(g.departure_date) : '—'}</span></div>
            <div className="kv"><span>Arrivée estimée</span><span>{g.eta_date ? formatDate(g.eta_date) : '—'}</span></div>
            <div className="kv"><span>Créé le</span><span>{formatDate(g.created_at)}</span></div>
            {g.notes && (<><div className="divider" /><p className="muted" style={{ fontSize: '.88rem' }}>{g.notes}</p></>)}
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '1.2rem' }}>Étapes partagées</h3>
            {g.events.length === 0 ? (
              <p className="muted" style={{ fontSize: '.9rem' }}>Aucune étape pour l’instant.</p>
            ) : (
              <div className="timeline">
                {g.events.map((e, i) => (
                  <div key={i} className="tl-item done">
                    <span className="tl-dot" />
                    <h4>{e.status_label}</h4>
                    <div className="meta">
                      {formatDateTime(e.created_at)}
                      {e.location ? ` · ${e.location}` : ''}
                      {e.user_name ? ` · ${e.user_name}` : ''}
                    </div>
                    {e.note && <div className="note">{e.note}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---- Étape appliquée à tout le groupage ---- */}
      {eventOpen && (
        <Modal title="Étape pour tout le groupage" onClose={() => setEventOpen(false)}
          footer={
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => setEventOpen(false)}>Annuler</button>
              <button className="btn btn-primary btn-sm" form="grp-event" disabled={busy || !event.status}>
                {busy ? 'Application…' : `Appliquer aux ${g.shipments.length} colis`}
              </button>
            </>
          }>
          <form id="grp-event" onSubmit={addEvent} className="stack">
            <div className="alert alert-info">
              Cette étape sera écrite dans l’historique de <strong>{g.shipments.length} colis</strong>,
              et chacun passera au statut choisi.
            </div>
            <div className="field">
              <label>Nouveau statut *</label>
              <select className="select" required value={event.status}
                onChange={e => setEvent(v => ({ ...v, status: e.target.value }))}>
                <option value="">Choisir…</option>
                {[...STATUS_ORDER, 'cancelled'].map(st => (
                  <option key={st} value={st}>{statusLabel(st, g.mode)}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Lieu</label>
              <input className="input" value={event.location}
                onChange={e => setEvent(v => ({ ...v, location: e.target.value }))}
                placeholder={g.mode === 'sea' ? 'Port du Havre, en mer…' : 'Entrepôt, vol…'} />
            </div>
            <div className="field">
              <label>Note visible par les clients</label>
              <textarea className="textarea" style={{ minHeight: 80 }} value={event.note}
                onChange={e => setEvent(v => ({ ...v, note: e.target.value }))} />
            </div>
            <label className="check">
              <input type="checkbox" checked={event.notify}
                onChange={e => setEvent(v => ({ ...v, notify: e.target.checked }))} />
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Mail size={15} /> Prévenir tous les clients par email
              </span>
            </label>
          </form>
        </Modal>
      )}

      {/* ---- Rattachement de colis ---- */}
      {addOpen && (
        <Modal title="Ajouter des colis au groupage" onClose={() => setAddOpen(false)} width={720}
          footer={
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => setAddOpen(false)}>Annuler</button>
              <button className="btn btn-primary btn-sm" onClick={attach} disabled={busy || !picked.length}>
                {busy ? 'Ajout…' : `Ajouter ${picked.length || ''}`}
              </button>
            </>
          }>
          <SearchInput value={q} onChange={setQ} placeholder="Numéro de suivi, client…" />
          <p className="muted" style={{ fontSize: '.84rem' }}>
            Seuls les colis non groupés et non livrés apparaissent ici.
          </p>

          <div className="table-scroll" style={{ maxHeight: 340, overflowY: 'auto' }}>
            <table className="data" style={{ minWidth: 520 }}>
              <thead>
                <tr><th style={{ width: 40 }}></th><th>Suivi</th><th>Client</th><th>Catégorie</th><th style={{ textAlign: 'right' }}>Poids</th></tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} style={{ cursor: 'pointer' }}
                    onClick={() => setPicked(p => p.includes(s.id) ? p.filter(x => x !== s.id) : [...p, s.id])}>
                    <td>
                      <input type="checkbox" readOnly checked={picked.includes(s.id)}
                        style={{ width: 17, height: 17, accentColor: 'var(--pink)' }} />
                    </td>
                    <td className="tn">{s.tracking_number}</td>
                    <td>{s.client_name || '—'}</td>
                    <td>{s.category_name || '—'}</td>
                    <td className="num">{s.weight_kg} kg</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="empty">Aucun colis disponible.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
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
