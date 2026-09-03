import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Layers, Plane, Ship, Package } from 'lucide-react';
import Modal from '../../components/Modal.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { api, formatEur, formatDate, MODE_META } from '../../api.js';

const EMPTY = { label: '', corridor_id: '', mode: 'air', departure_date: '', eta_date: '', notes: '' };

export default function GroupagesAdmin() {
  const [items, setItems] = useState([]);
  const [corridors, setCorridors] = useState([]);
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [create, setCreate] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    api.groupages(onlyOpen ? '?open=1' : '').then(setItems).catch(() => {});
  }
  useEffect(() => { load(); }, [onlyOpen]);
  useEffect(() => { api.adminCorridors().then(setCorridors).catch(() => {}); }, []);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.createGroupage({
        ...create,
        corridor_id: create.corridor_id ? Number(create.corridor_id) : null
      });
      setCreate(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // Choisir une ligne fixe le mode : une ligne maritime fait un groupage maritime.
  function pickCorridor(id) {
    const c = corridors.find(x => String(x.id) === String(id));
    setCreate(v => ({ ...v, corridor_id: id, mode: c?.mode || v.mode }));
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Groupages</h1>
          <p>Plusieurs colis qui voyagent ensemble et partagent le même niveau de suivi.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setCreate({ ...EMPTY }); setError(''); }}>
          <Plus size={16} /> Nouveau groupage
        </button>
      </div>

      <div className="alert alert-info" style={{ marginBottom: '1.2rem' }}>
        Une étape ajoutée sur un groupage s’applique d’un coup à tous ses colis :
        chacun change de statut, reçoit l’étape dans son historique, et son client est prévenu.
      </div>

      <div className="toolbar">
        <div className="chips">
          <button className={`chip ${!onlyOpen ? 'on' : ''}`} onClick={() => setOnlyOpen(false)}>Tous</button>
          <button className={`chip ${onlyOpen ? 'on' : ''}`} onClick={() => setOnlyOpen(true)}>En cours</button>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                <th>Code</th><th>Ligne</th><th>Mode</th>
                <th style={{ textAlign: 'right' }}>Colis</th>
                <th style={{ textAlign: 'right' }}>Poids</th>
                <th style={{ textAlign: 'right' }}>Valeur</th>
                <th>Départ</th><th>Statut</th><th></th>
              </tr>
            </thead>
            <tbody>
              {items.map(g => (
                <tr key={g.id}>
                  <td>
                    <Link to={`/admin/groupages/${g.id}`} className="tn">{g.code}</Link>
                    {g.label && <div className="muted" style={{ fontSize: '.78rem' }}>{g.label}</div>}
                  </td>
                  <td>{g.corridor_label || '—'}</td>
                  <td>
                    <span className="badge" style={{
                      color: g.mode === 'sea' ? '#2a7fd6' : 'var(--pink-2)',
                      background: 'var(--surface-3)'
                    }}>
                      {g.mode === 'sea' ? <Ship size={13} /> : <Plane size={13} />}
                      {MODE_META[g.mode]?.short}
                    </span>
                  </td>
                  <td className="num">{g.shipments_count}</td>
                  <td className="num">{Math.round(g.total_weight_kg * 10) / 10} kg</td>
                  <td className="num">{formatEur(g.total_eur)}</td>
                  <td className="muted" style={{ fontSize: '.83rem' }}>
                    {g.departure_date ? formatDate(g.departure_date) : '—'}
                  </td>
                  <td><StatusBadge status={g.status} mode={g.mode} /></td>
                  <td style={{ textAlign: 'right' }}>
                    <Link to={`/admin/groupages/${g.id}`} className="btn btn-ghost btn-sm">Ouvrir</Link>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={9}>
                  <div className="empty">
                    <div className="ic"><Layers size={38} /></div>
                    Aucun groupage. Créez-en un pour regrouper les colis d’un même départ.
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {create && (
        <Modal title="Nouveau groupage" onClose={() => setCreate(null)}
          footer={
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => setCreate(null)}>Annuler</button>
              <button className="btn btn-primary btn-sm" form="grp-form" disabled={busy}>
                {busy ? 'Création…' : 'Créer'}
              </button>
            </>
          }>
          <form id="grp-form" onSubmit={submit} className="stack">
            <div className="field">
              <label>Intitulé</label>
              <input className="input" placeholder="Départ du 10 septembre" value={create.label}
                onChange={e => setCreate(v => ({ ...v, label: e.target.value }))} />
              <span className="hint">Le code de suivi (GRP-…) est généré automatiquement.</span>
            </div>

            <div className="form-grid">
              <div className="field">
                <label>Ligne</label>
                <select className="select" value={create.corridor_id} onChange={e => pickCorridor(e.target.value)}>
                  <option value="">— À définir —</option>
                  {corridors.filter(c => c.active).map(c => (
                    <option key={c.id} value={c.id}>
                      {c.origin_city} → {c.dest_city} ({MODE_META[c.mode]?.short})
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Mode</label>
                <select className="select" value={create.mode}
                  onChange={e => setCreate(v => ({ ...v, mode: e.target.value }))}>
                  <option value="air">Aérien</option>
                  <option value="sea">Maritime</option>
                </select>
              </div>
              <div className="field">
                <label>Date de départ</label>
                <input className="input" type="date" value={create.departure_date}
                  onChange={e => setCreate(v => ({ ...v, departure_date: e.target.value }))} />
              </div>
              <div className="field">
                <label>Arrivée estimée</label>
                <input className="input" type="date" value={create.eta_date}
                  onChange={e => setCreate(v => ({ ...v, eta_date: e.target.value }))} />
              </div>
              <div className="field full">
                <label>Note interne</label>
                <textarea className="textarea" style={{ minHeight: 70 }} value={create.notes}
                  onChange={e => setCreate(v => ({ ...v, notes: e.target.value }))} />
              </div>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
          </form>
        </Modal>
      )}
    </>
  );
}
