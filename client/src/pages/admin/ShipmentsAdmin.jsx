import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Package, Trash2, Mail } from 'lucide-react';
import Modal from '../../components/Modal.jsx';
import SearchInput from '../../components/SearchInput.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { api, formatEur, formatDate, STATUS_META, STATUS_ORDER, MODE_META } from '../../api.js';
import { computePrice } from '../../pricing.js';

const EMPTY = {
  client_name: '', client_phone: '', client_email: '',
  recipient_name: '', recipient_phone: '', recipient_city: '',
  category_id: '', corridor_id: '', groupage_id: '', mode: 'air',
  weight_kg: '', declared_value_eur: '', description: '',
  price_eur: '', paid_eur: '', notify: true
};

export default function ShipmentsAdmin() {
  const { isAdmin } = useAuth();
  const s = useSettings();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [corridors, setCorridors] = useState([]);
  const [groupages, setGroupages] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState('');

  function load() {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (q) params.set('q', q);
    const qs = params.toString();
    api.shipments(qs ? `?${qs}` : '').then(setItems).catch(() => {});
  }

  useEffect(() => {
    api.categories().then(setCategories).catch(() => {});
    api.corridors().then(setCorridors).catch(() => {});
    api.groupages('?open=1').then(setGroupages).catch(() => {});
  }, []);
  useEffect(() => {
    const t = setTimeout(load, q ? 260 : 0);
    return () => clearTimeout(t);
  }, [q, status]);

  const category = categories.find(c => String(c.id) === String(form.category_id));
  const estimate = useMemo(
    () => computePrice(category, form.weight_kg, form.declared_value_eur, s),
    [category, form.weight_kg, form.declared_value_eur, s]
  );

  function set(key, value) { setForm(f => ({ ...f, [key]: value })); }

  // Ligne et groupage imposent le mode de transport : on l'aligne à la sélection.
  function pickCorridor(id) {
    const c = corridors.find(x => String(x.id) === String(id));
    setForm(f => ({ ...f, corridor_id: id, mode: c?.mode || f.mode }));
  }
  function pickGroupage(id) {
    const g = groupages.find(x => String(x.id) === String(id));
    setForm(f => ({
      ...f,
      groupage_id: id,
      corridor_id: g?.corridor_id ? String(g.corridor_id) : f.corridor_id,
      mode: g?.mode || f.mode
    }));
  }

  async function create(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const created = await api.createShipment({
        ...form,
        category_id: Number(form.category_id),
        corridor_id: form.corridor_id ? Number(form.corridor_id) : null,
        groupage_id: form.groupage_id ? Number(form.groupage_id) : null,
        weight_kg: Number(form.weight_kg) || 0,
        declared_value_eur: Number(form.declared_value_eur) || 0,
        price_eur: form.price_eur === '' ? null : Number(form.price_eur),
        paid_eur: Number(form.paid_eur) || 0
      });
      setOpen(false);
      setForm(EMPTY);
      setFlash(
        created.mail?.status === 'sent'
          ? `Colis ${created.tracking_number} créé — email envoyé à ${created.client_email}.`
          : `Colis ${created.tracking_number} créé.`
      );
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(item) {
    if (!confirm(`Supprimer définitivement le colis ${item.tracking_number} ? Cette action est irréversible.`)) return;
    try {
      await api.deleteShipment(item.id);
      load();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Colis</h1>
          <p>{items.length} colis {status ? `au statut « ${STATUS_META[status]?.label} »` : 'au total'}</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setForm(EMPTY); setOpen(true); }}>
          <Plus size={16} /> Nouveau colis
        </button>
      </div>

      {flash && (
        <div className="alert alert-ok" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
          <span>{flash}</span>
          <button className="icon-btn" onClick={() => setFlash('')}>×</button>
        </div>
      )}

      <div className="toolbar">
        <SearchInput value={q} onChange={setQ} placeholder="Numéro de suivi, client, destinataire…" />
        <div className="chips">
          <button className={`chip ${!status ? 'on' : ''}`} onClick={() => setStatus('')}>Tous</button>
          {[...STATUS_ORDER, 'cancelled'].map(st => (
            <button key={st} className={`chip ${status === st ? 'on' : ''}`} onClick={() => setStatus(st)}>
              {STATUS_META[st].label}
            </button>
          ))}
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                <th>Suivi</th><th>Client</th><th>Destinataire</th><th>Catégorie</th>
                <th style={{ textAlign: 'right' }}>Poids</th>
                <th style={{ textAlign: 'right' }}>Montant</th>
                <th>Statut</th><th></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td>
                    <Link to={`/admin/colis/${item.id}`} className="tn">{item.tracking_number}</Link>
                    <div className="muted" style={{ fontSize: '.78rem' }}>
                      {formatDate(item.created_at)}
                      {item.groupage_code && (
                        <> · <Link to={`/admin/groupages/${item.groupage_id}`} style={{ color: 'var(--pink-2)', fontWeight: 600 }}>
                          {item.groupage_code}
                        </Link></>
                      )}
                    </div>
                  </td>
                  <td>
                    {item.client_name}
                    <div className="muted" style={{ fontSize: '.78rem' }}>{item.client_phone || '—'}</div>
                  </td>
                  <td>{item.recipient_name || '—'}</td>
                  <td>{item.category_name || '—'}</td>
                  <td className="num">{item.weight_kg} kg</td>
                  <td className="num">{formatEur(item.price_eur)}</td>
                  <td><StatusBadge status={item.status} mode={item.mode} /></td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <Link to={`/admin/colis/${item.id}`} className="btn btn-ghost btn-sm">Ouvrir</Link>
                    {isAdmin && (
                      <button className="icon-btn danger" onClick={() => remove(item)} title="Supprimer">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={8}>
                  <div className="empty">
                    <div className="ic"><Package size={38} /></div>
                    Aucun colis ne correspond à cette recherche.
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <Modal title="Nouveau colis" onClose={() => setOpen(false)} width={700}
          footer={
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Annuler</button>
              <button className="btn btn-primary btn-sm" form="shipment-form" disabled={busy}>
                {busy ? 'Création…' : 'Créer le colis'}
              </button>
            </>
          }>
          <form id="shipment-form" onSubmit={create} className="stack">
            <div className="form-grid">
              <div className="field">
                <label>Expéditeur *</label>
                <input className="input" required value={form.client_name} onChange={e => set('client_name', e.target.value)} />
              </div>
              <div className="field">
                <label>Téléphone expéditeur</label>
                <input className="input" value={form.client_phone} onChange={e => set('client_phone', e.target.value)} />
                <span className="hint">Sert à retrouver le client existant.</span>
              </div>
              <div className="field full">
                <label>Email expéditeur</label>
                <input className="input" type="email" value={form.client_email} onChange={e => set('client_email', e.target.value)} />
                <span className="hint">Nécessaire pour l’envoi automatique du numéro de suivi.</span>
              </div>

              <div className="field">
                <label>Destinataire</label>
                <input className="input" value={form.recipient_name} onChange={e => set('recipient_name', e.target.value)} />
              </div>
              <div className="field">
                <label>Téléphone destinataire</label>
                <input className="input" value={form.recipient_phone} onChange={e => set('recipient_phone', e.target.value)} />
              </div>

              <div className="field full">
                <label>Mode de transport</label>
                <div className="chips">
                  {['air', 'sea'].map(m => (
                    <button key={m} type="button"
                      className={`chip ${form.mode === m ? 'on' : ''}`}
                      onClick={() => setForm(f => ({ ...f, mode: m, category_id: '' }))}>
                      {MODE_META[m].label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field full">
                <label>Catégorie *</label>
                <select className="select" required value={form.category_id} onChange={e => set('category_id', e.target.value)}>
                  <option value="">Choisir…</option>
                  {categories
                    .filter(c => c.mode === form.mode)
                    .map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}{c.price_eur != null ? ` — ${c.price_eur} €/kg` : ' — sur devis'}
                      </option>
                    ))}
                </select>
              </div>

              <div className="field">
                <label>Ligne</label>
                <select className="select" value={form.corridor_id} onChange={e => pickCorridor(e.target.value)}>
                  <option value="">— Par défaut —</option>
                  {corridors.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.origin_city} → {c.dest_city} ({MODE_META[c.mode]?.short})
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Groupage</label>
                <select className="select" value={form.groupage_id} onChange={e => pickGroupage(e.target.value)}>
                  <option value="">— Colis isolé —</option>
                  {groupages.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.code}{g.label ? ` · ${g.label}` : ''} ({g.shipments_count} colis)
                    </option>
                  ))}
                </select>
                <span className="hint">Le colis suivra le niveau de suivi du groupage.</span>
              </div>

              <div className="field">
                <label>Poids (kg)</label>
                <input className="input" type="number" min="0" step="0.1" value={form.weight_kg} onChange={e => set('weight_kg', e.target.value)} />
              </div>
              <div className="field">
                <label>Valeur déclarée (€)</label>
                <input className="input" type="number" min="0" step="1" value={form.declared_value_eur} onChange={e => set('declared_value_eur', e.target.value)} />
              </div>

              <div className="field">
                <label>Montant facturé (€)</label>
                <input className="input" type="number" min="0" step="0.01"
                  placeholder={estimate.quote_only ? 'À définir' : estimate.total_eur.toFixed(2)}
                  value={form.price_eur} onChange={e => set('price_eur', e.target.value)} />
                <span className="hint">Laissez vide pour appliquer le calcul automatique.</span>
              </div>
              <div className="field">
                <label>Déjà encaissé (€)</label>
                <input className="input" type="number" min="0" step="0.01" value={form.paid_eur} onChange={e => set('paid_eur', e.target.value)} />
                <span className="hint">{s.deposit_split}</span>
              </div>

              <div className="field full">
                <label>Description</label>
                <textarea className="textarea" style={{ minHeight: 80 }} value={form.description} onChange={e => set('description', e.target.value)} />
              </div>
            </div>

            {!estimate.quote_only && Number(form.weight_kg) > 0 && (
              <div className="alert alert-info">
                Calcul automatique : {estimate.billed_weight_kg.toFixed(1)} kg × {category?.price_eur} €
                {estimate.surcharge_eur > 0 && ` + ${estimate.surcharge_pct} % de ${estimate.declared_value_eur} €`}
                {' = '}<strong>{formatEur(estimate.total_eur)}</strong>
              </div>
            )}

            <label className="check">
              <input type="checkbox" checked={form.notify} onChange={e => set('notify', e.target.checked)} />
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Mail size={15} /> Envoyer le numéro de suivi au client par email
              </span>
            </label>

            {error && <div className="alert alert-error">{error}</div>}
          </form>
        </Modal>
      )}
    </>
  );
}
