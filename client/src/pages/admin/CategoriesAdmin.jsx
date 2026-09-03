import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, Tags, Plane, Ship } from 'lucide-react';
import Modal from '../../components/Modal.jsx';
import CategoryIcon, { ICON_NAMES } from '../../components/CategoryIcon.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { api, formatFCFA, MODE_META } from '../../api.js';
import { eurToFcfa } from '../../pricing.js';

const EMPTY = {
  name: '', subtitle: '', price_eur: '', value_pct: 0,
  conditions: '', icon: 'package', quote_only: false, active: true, mode: 'air'
};

export default function CategoriesAdmin() {
  const { isAdmin } = useAuth();
  const s = useSettings();
  const [items, setItems] = useState([]);
  const [mode, setMode] = useState('air');
  const [edit, setEdit] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function load() { api.adminCategories().then(setItems).catch(() => {}); }
  useEffect(() => { load(); }, []);

  const rate = Number(s.fcfa_rate) || 650;
  const shown = items.filter(c => c.mode === mode);

  async function save(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const payload = {
        ...edit,
        price_eur: edit.quote_only || edit.price_eur === '' ? null : Number(edit.price_eur),
        value_pct: Number(edit.value_pct) || 0
      };
      if (edit.id) await api.updateCategory(edit.id, payload);
      else await api.createCategory(payload);
      setEdit(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(item) {
    try {
      await api.updateCategory(item.id, { active: item.active ? 0 : 1 });
      load();
    } catch (err) { alert(err.message); }
  }

  async function remove(item) {
    if (!confirm(`Supprimer la catégorie « ${item.name} » ?`)) return;
    try { await api.deleteCategory(item.id); load(); }
    catch (err) { alert(err.message); }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Fiche tarifaire</h1>
          <p>Les catégories actives alimentent directement la page Tarifs et l’estimateur du site.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setEdit({ ...EMPTY, mode }); setError(''); }}>
          <Plus size={16} /> Nouvelle catégorie
        </button>
      </div>

      <div className="toolbar">
        <div className="chips">
          {['air', 'sea'].map(m => (
            <button key={m} className={`chip ${mode === m ? 'on' : ''}`} onClick={() => setMode(m)}>
              {m === 'sea' ? <Ship size={14} style={{ verticalAlign: -2, marginRight: 5 }} />
                           : <Plane size={14} style={{ verticalAlign: -2, marginRight: 5 }} />}
              {MODE_META[m].label} ({items.filter(c => c.mode === m).length})
            </button>
          ))}
        </div>
      </div>

      {mode === 'sea' && shown.length === 0 && (
        <div className="alert alert-info" style={{ marginBottom: '1.2rem' }}>
          Aucun tarif maritime pour l’instant. Créez-en ici, puis activez l’affichage
          du fret maritime dans <strong>Réglages</strong> pour le publier sur le site.
        </div>
      )}

      <div className="table-wrap">
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                <th>Catégorie</th>
                <th style={{ textAlign: 'right' }}>Prix / kg</th>
                <th style={{ textAlign: 'right' }}>FCFA / kg</th>
                <th style={{ textAlign: 'right' }}>Majoration</th>
                <th>Conditions</th><th>État</th><th></th>
              </tr>
            </thead>
            <tbody>
              {shown.map(c => (
                <tr key={c.id} style={c.active ? undefined : { opacity: .5 }}>
                  <td>
                    <div className="row" style={{ gap: '.7rem', flexWrap: 'nowrap' }}>
                      <span style={{ color: 'var(--pink-2)', display: 'grid', placeItems: 'center' }}>
                        <CategoryIcon name={c.icon} size={18} />
                      </span>
                      <div>
                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                        {c.subtitle && <div className="muted" style={{ fontSize: '.78rem', maxWidth: 260 }}>{c.subtitle}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="num" style={{ color: 'var(--red)' }}>
                    {c.price_eur == null ? 'Sur devis' : `${c.price_eur} €`}
                  </td>
                  <td className="num muted">
                    {c.price_eur == null ? '—' : formatFCFA(eurToFcfa(c.price_eur, rate))}
                  </td>
                  <td className="num">{c.value_pct ? `+ ${c.value_pct} %` : '—'}</td>
                  <td className="muted" style={{ fontSize: '.83rem' }}>{c.conditions || '—'}</td>
                  <td>
                    <button className="icon-btn" onClick={() => toggle(c)} title={c.active ? 'Masquer du site' : 'Afficher sur le site'}>
                      {c.active ? <Eye size={17} style={{ color: 'var(--ok)' }} /> : <EyeOff size={17} />}
                    </button>
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="icon-btn" onClick={() => { setEdit({ ...c, quote_only: !!c.quote_only, active: !!c.active }); setError(''); }}>
                      <Pencil size={16} />
                    </button>
                    {isAdmin && (
                      <button className="icon-btn danger" onClick={() => remove(c)}><Trash2 size={16} /></button>
                    )}
                  </td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr><td colSpan={7}>
                  <div className="empty">
                    <div className="ic"><Tags size={38} /></div>
                    Aucune catégorie {MODE_META[mode].label.toLowerCase()}.
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {edit && (
        <Modal title={edit.id ? 'Modifier la catégorie' : 'Nouvelle catégorie'} onClose={() => setEdit(null)} width={640}
          footer={
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => setEdit(null)}>Annuler</button>
              <button className="btn btn-primary btn-sm" form="cat-form" disabled={busy}>
                {busy ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </>
          }>
          <form id="cat-form" onSubmit={save} className="stack">
            <div className="form-grid">
              <div className="field full">
                <label>Nom *</label>
                <input className="input" required value={edit.name} onChange={e => setEdit(v => ({ ...v, name: e.target.value }))} />
              </div>
              <div className="field full">
                <label>Sous-titre</label>
                <input className="input" placeholder="Fromage, saucisson sec et autres…"
                  value={edit.subtitle || ''} onChange={e => setEdit(v => ({ ...v, subtitle: e.target.value }))} />
              </div>

              <div className="field full">
                <label>Mode de transport</label>
                <select className="select" value={edit.mode || 'air'}
                  onChange={e => setEdit(v => ({ ...v, mode: e.target.value }))}>
                  <option value="air">Aérien</option>
                  <option value="sea">Maritime</option>
                </select>
                <span className="hint">Une même nature d’article peut avoir un tarif aérien et un tarif maritime.</span>
              </div>

              <div className="field">
                <label>Prix au kilo (€)</label>
                <input className="input" type="number" min="0" step="0.5" disabled={edit.quote_only}
                  value={edit.price_eur ?? ''} onChange={e => setEdit(v => ({ ...v, price_eur: e.target.value }))} />
                {!edit.quote_only && edit.price_eur !== '' && edit.price_eur != null && (
                  <span className="hint">≈ {formatFCFA(eurToFcfa(edit.price_eur, rate))} / kg</span>
                )}
              </div>
              <div className="field">
                <label>Majoration sur la valeur (%)</label>
                <input className="input" type="number" min="0" step="1"
                  value={edit.value_pct} onChange={e => setEdit(v => ({ ...v, value_pct: e.target.value }))} />
                <span className="hint">Appliquée dès le 1er euro (objets de valeur).</span>
              </div>

              <div className="field full">
                <label>Conditions affichées</label>
                <input className="input" placeholder="Ordonnance obligatoire, plus de 80 cm…"
                  value={edit.conditions || ''} onChange={e => setEdit(v => ({ ...v, conditions: e.target.value }))} />
              </div>

              <div className="field full">
                <label>Icône</label>
                <div className="row" style={{ gap: '.4rem' }}>
                  {ICON_NAMES.map(n => (
                    <button key={n} type="button" className="icon-btn"
                      onClick={() => setEdit(v => ({ ...v, icon: n }))}
                      style={{
                        border: '1px solid var(--border-strong)',
                        background: edit.icon === n ? 'var(--grad-brand)' : 'var(--surface)',
                        color: edit.icon === n ? '#fff' : 'var(--muted)',
                        padding: 9
                      }}>
                      <CategoryIcon name={n} size={18} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <label className="check">
              <input type="checkbox" checked={edit.quote_only}
                onChange={e => setEdit(v => ({ ...v, quote_only: e.target.checked }))} />
              Cette catégorie est chiffrée sur devis (pas de prix au kilo)
            </label>
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
