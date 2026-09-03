import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, Route, ArrowLeftRight, Plane, Ship } from 'lucide-react';
import Modal from '../../components/Modal.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { api, MODE_META } from '../../api.js';

const EMPTY = {
  origin_city: '', origin_country: '', dest_city: '', dest_country: '',
  mode: 'air', frequency: '', transit_days: '', notes: '', active: true
};

export default function CorridorsAdmin() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [edit, setEdit] = useState(null);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [busy, setBusy] = useState(false);

  function load() { api.adminCorridors().then(setItems).catch(() => {}); }
  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (edit.id) await api.updateCorridor(edit.id, edit);
      else await api.createCorridor(edit);
      setEdit(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function reverse(item) {
    try {
      const created = await api.reverseCorridor(item.id);
      setFlash(`Ligne inverse créée : ${created.label}`);
      load();
    } catch (err) {
      setFlash('');
      alert(err.message);
    }
  }

  async function toggle(item) {
    try { await api.updateCorridor(item.id, { active: item.active ? 0 : 1 }); load(); }
    catch (err) { alert(err.message); }
  }

  async function remove(item) {
    if (!confirm(`Supprimer la ligne « ${item.label} » ?`)) return;
    try { await api.deleteCorridor(item.id); load(); }
    catch (err) { alert(err.message); }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Lignes desservies</h1>
          <p>Chaque sens de trajet est une ligne. Les lignes actives s’affichent sur le site public.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setEdit({ ...EMPTY }); setError(''); }}>
          <Plus size={16} /> Nouvelle ligne
        </button>
      </div>

      {flash && (
        <div className="alert alert-ok" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
          <span>{flash}</span>
          <button className="icon-btn" onClick={() => setFlash('')}>×</button>
        </div>
      )}

      <div className="alert alert-info" style={{ marginBottom: '1.2rem' }}>
        Paris ⇄ Libreville sont créées par défaut. Ajoutez ici les autres villes et pays
        desservis — et le bouton <ArrowLeftRight size={14} style={{ verticalAlign: -2 }} /> crée
        le trajet retour en un clic.
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr><th>Ligne</th><th>Mode</th><th>Fréquence</th><th>Délai</th><th>État</th><th></th></tr>
            </thead>
            <tbody>
              {items.map(c => (
                <tr key={c.id} style={c.active ? undefined : { opacity: .5 }}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.origin_city} → {c.dest_city}</div>
                    <div className="muted" style={{ fontSize: '.78rem' }}>{c.origin_country} → {c.dest_country}</div>
                  </td>
                  <td>
                    <span className="badge" style={{
                      color: c.mode === 'sea' ? '#2a7fd6' : 'var(--pink-2)',
                      background: 'var(--surface-3)'
                    }}>
                      {c.mode === 'sea' ? <Ship size={13} /> : <Plane size={13} />}
                      {MODE_META[c.mode]?.label}
                    </span>
                  </td>
                  <td className="muted" style={{ fontSize: '.85rem' }}>{c.frequency || '—'}</td>
                  <td className="muted" style={{ fontSize: '.85rem' }}>{c.transit_days || '—'}</td>
                  <td>
                    <button className="icon-btn" onClick={() => toggle(c)} title={c.active ? 'Masquer du site' : 'Afficher'}>
                      {c.active ? <Eye size={17} style={{ color: 'var(--ok)' }} /> : <EyeOff size={17} />}
                    </button>
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="icon-btn" title="Créer la ligne retour" onClick={() => reverse(c)}>
                      <ArrowLeftRight size={16} />
                    </button>
                    <button className="icon-btn" title="Modifier" onClick={() => { setEdit({ ...c, active: !!c.active }); setError(''); }}>
                      <Pencil size={16} />
                    </button>
                    {isAdmin && (
                      <button className="icon-btn danger" title="Supprimer" onClick={() => remove(c)}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={6}>
                  <div className="empty"><div className="ic"><Route size={38} /></div>Aucune ligne enregistrée.</div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {edit && (
        <Modal title={edit.id ? 'Modifier la ligne' : 'Nouvelle ligne'} onClose={() => setEdit(null)} width={620}
          footer={
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => setEdit(null)}>Annuler</button>
              <button className="btn btn-primary btn-sm" form="corridor-form" disabled={busy}>
                {busy ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </>
          }>
          <form id="corridor-form" onSubmit={save} className="stack">
            <div className="form-grid">
              <div className="field">
                <label>Ville de départ *</label>
                <input className="input" required value={edit.origin_city}
                  onChange={e => setEdit(v => ({ ...v, origin_city: e.target.value }))} placeholder="Paris" />
              </div>
              <div className="field">
                <label>Pays de départ *</label>
                <input className="input" required value={edit.origin_country}
                  onChange={e => setEdit(v => ({ ...v, origin_country: e.target.value }))} placeholder="France" />
              </div>
              <div className="field">
                <label>Ville d’arrivée *</label>
                <input className="input" required value={edit.dest_city}
                  onChange={e => setEdit(v => ({ ...v, dest_city: e.target.value }))} placeholder="Libreville" />
              </div>
              <div className="field">
                <label>Pays d’arrivée *</label>
                <input className="input" required value={edit.dest_country}
                  onChange={e => setEdit(v => ({ ...v, dest_country: e.target.value }))} placeholder="Gabon" />
              </div>

              <div className="field">
                <label>Mode de transport</label>
                <select className="select" value={edit.mode} onChange={e => setEdit(v => ({ ...v, mode: e.target.value }))}>
                  <option value="air">Aérien</option>
                  <option value="sea">Maritime</option>
                </select>
              </div>
              <div className="field">
                <label>Délai de transit</label>
                <input className="input" value={edit.transit_days || ''}
                  onChange={e => setEdit(v => ({ ...v, transit_days: e.target.value }))} placeholder="3 à 5 jours" />
              </div>

              <div className="field full">
                <label>Fréquence</label>
                <input className="input" value={edit.frequency || ''}
                  onChange={e => setEdit(v => ({ ...v, frequency: e.target.value }))} placeholder="2 départs par semaine" />
              </div>
              <div className="field full">
                <label>Note interne</label>
                <textarea className="textarea" style={{ minHeight: 70 }} value={edit.notes || ''}
                  onChange={e => setEdit(v => ({ ...v, notes: e.target.value }))} />
              </div>
            </div>

            <label className="check">
              <input type="checkbox" checked={edit.active}
                onChange={e => setEdit(v => ({ ...v, active: e.target.checked }))} />
              Visible sur le site public
            </label>

            {error && <div className="alert alert-error">{error}</div>}
          </form>
        </Modal>
      )}
    </>
  );
}
