import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Mail, Save, Trash2, Copy, Check, Layers, Plane, Ship } from 'lucide-react';
import Modal from '../../components/Modal.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { WhatsAppIcon } from '../../components/SocialIcons.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import {
  api, formatEur, formatFCFA, formatDateTime, waLink,
  STATUS_ORDER, MODE_META, statusLabel
} from '../../api.js';
import { eurToFcfa } from '../../pricing.js';

export default function ShipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const s = useSettings();

  const [item, setItem] = useState(null);
  const [categories, setCategories] = useState([]);
  const [eventOpen, setEventOpen] = useState(false);
  const [event, setEvent] = useState({ status: '', location: '', note: '', notify: true });
  const [edit, setEdit] = useState(null);
  const [flash, setFlash] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  function load() {
    api.shipment(id).then(setItem).catch(() => navigate('/admin/colis'));
  }
  useEffect(() => { load(); }, [id]);
  useEffect(() => { api.categories().then(setCategories).catch(() => {}); }, []);

  if (!item) return <div className="skeleton" style={{ height: 320 }} />;

  const rate = Number(s.fcfa_rate) || 650;
  const balance = Number(item.price_eur) - Number(item.paid_eur);

  async function addEvent(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const updated = await api.addEvent(item.id, event);
      setItem(updated);
      setEventOpen(false);
      setEvent({ status: '', location: '', note: '', notify: true });
      setFlash(
        updated.mail?.status === 'sent'
          ? 'Étape ajoutée — le client a été prévenu par email.'
          : 'Étape ajoutée.'
      );
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.updateShipment(item.id, {
        ...edit,
        category_id: Number(edit.category_id),
        weight_kg: Number(edit.weight_kg),
        declared_value_eur: Number(edit.declared_value_eur),
        price_eur: Number(edit.price_eur),
        paid_eur: Number(edit.paid_eur)
      });
      setEdit(null);
      setFlash('Colis mis à jour.');
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Supprimer définitivement ${item.tracking_number} ?`)) return;
    await api.deleteShipment(item.id);
    navigate('/admin/colis');
  }

  function copyTn() {
    navigator.clipboard?.writeText(item.tracking_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <>
      <Link to="/admin/colis" className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '.88rem', marginBottom: '1rem' }}>
        <ArrowLeft size={15} /> Retour aux colis
      </Link>

      <div className="page-head">
        <div>
          <div className="row" style={{ gap: '.7rem' }}>
            <h1 className="tn" style={{ fontSize: '1.6rem' }}>{item.tracking_number}</h1>
            <button className="icon-btn" onClick={copyTn} title="Copier le numéro">
              {copied ? <Check size={16} style={{ color: 'var(--ok)' }} /> : <Copy size={16} />}
            </button>
            <StatusBadge status={item.status} mode={item.mode} />
            {item.groupage_code && (
              <Link to={`/admin/groupages/${item.groupage_id}`} className="badge"
                style={{ color: 'var(--pink-2)', background: 'var(--surface-3)' }}>
                <Layers size={13} /> {item.groupage_code}
              </Link>
            )}
          </div>
          <p>Créé le {formatDateTime(item.created_at)} · dernière mise à jour {formatDateTime(item.updated_at)}</p>
        </div>
        <div className="row">
          <button className="btn btn-ghost btn-sm" onClick={() => setEdit({
            recipient_name: item.recipient_name || '', recipient_phone: item.recipient_phone || '',
            recipient_city: item.recipient_city || '', category_id: item.category_id || '',
            weight_kg: item.weight_kg, declared_value_eur: item.declared_value_eur,
            price_eur: item.price_eur, paid_eur: item.paid_eur, description: item.description || ''
          })}>
            <Save size={15} /> Modifier
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setEventOpen(true)}>
            <Plus size={15} /> Ajouter une étape
          </button>
          {isAdmin && (
            <button className="btn btn-danger btn-sm" onClick={remove}><Trash2 size={15} /></button>
          )}
        </div>
      </div>

      {flash && (
        <div className="alert alert-ok" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
          <span>{flash}</span>
          <button className="icon-btn" onClick={() => setFlash('')}>×</button>
        </div>
      )}

      <div className="split split-detail">
        <div className="stack">
          <div className="card">
            <h3 style={{ marginBottom: '.8rem' }}>Expéditeur</h3>
            <div className="kv"><span>Nom</span><span>{item.client_name || '—'}</span></div>
            <div className="kv"><span>Téléphone</span><span>{item.client_phone || '—'}</span></div>
            <div className="kv"><span>Email</span><span>{item.client_email || '—'}</span></div>
            {item.client_phone && (
              <a className="btn btn-ghost btn-sm btn-block" style={{ marginTop: '.9rem' }} target="_blank" rel="noreferrer"
                 href={waLink(item.client_phone, `Bonjour, au sujet de votre colis ${item.tracking_number} :`)}>
                <WhatsAppIcon size={15} /> Écrire au client
              </a>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '.8rem' }}>Destinataire & trajet</h3>
            <div className="kv"><span>Nom</span><span>{item.recipient_name || '—'}</span></div>
            <div className="kv"><span>Téléphone</span><span>{item.recipient_phone || '—'}</span></div>
            <div className="kv"><span>Ville</span><span>{item.recipient_city || '—'}</span></div>
            <div className="kv"><span>Trajet</span><span>{item.origin} → {item.destination}</span></div>
            <div className="kv">
              <span>Mode</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {item.mode === 'sea' ? <Ship size={14} /> : <Plane size={14} />}
                {MODE_META[item.mode]?.label || 'Aérien'}
              </span>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '.8rem' }}>Colis & facturation</h3>
            <div className="kv"><span>Catégorie</span><span>{item.category_name || '—'}</span></div>
            <div className="kv"><span>Poids facturé</span><span>{item.weight_kg} kg</span></div>
            <div className="kv"><span>Valeur déclarée</span><span>{formatEur(item.declared_value_eur)}</span></div>
            <div className="kv">
              <span>Montant</span>
              <span style={{ color: 'var(--red)' }}>
                {formatEur(item.price_eur)} · {formatFCFA(eurToFcfa(item.price_eur, rate))}
              </span>
            </div>
            <div className="kv"><span>Encaissé</span><span>{formatEur(item.paid_eur)}</span></div>
            <div className="kv">
              <span>Reste à payer</span>
              <span style={{ color: balance > 0 ? 'var(--warn)' : 'var(--ok)' }}>{formatEur(Math.max(0, balance))}</span>
            </div>
            {item.description && (
              <>
                <div className="divider" />
                <p className="muted" style={{ fontSize: '.88rem' }}>{item.description}</p>
              </>
            )}
          </div>
        </div>

        <div className="card">
          <div className="spread" style={{ marginBottom: '1.3rem' }}>
            <h3>Historique du suivi</h3>
            <span className="muted" style={{ fontSize: '.82rem' }}>{item.events.length} étape{item.events.length > 1 ? 's' : ''}</span>
          </div>

          {item.events.length === 0 ? (
            <p className="muted">Aucune étape enregistrée.</p>
          ) : (
            <div className="timeline">
              {item.events.map(e => (
                <div key={e.id} className="tl-item done">
                  <span className="tl-dot" />
                  <h4>
                    {statusLabel(e.status, item.mode)}
                    {e.groupage_id && (
                      <span className="badge" style={{ marginLeft: 8, color: 'var(--pink-2)', background: 'var(--surface-3)', fontSize: '.68rem' }}>
                        <Layers size={11} /> groupage
                      </span>
                    )}
                  </h4>
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

      {eventOpen && (
        <Modal title="Ajouter une étape de suivi" onClose={() => setEventOpen(false)}
          footer={
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => setEventOpen(false)}>Annuler</button>
              <button className="btn btn-primary btn-sm" form="event-form" disabled={busy || !event.status}>
                {busy ? 'Enregistrement…' : 'Ajouter'}
              </button>
            </>
          }>
          <form id="event-form" onSubmit={addEvent} className="stack">
            <div className="field">
              <label>Nouveau statut *</label>
              <select className="select" required value={event.status}
                onChange={e => setEvent(v => ({ ...v, status: e.target.value }))}>
                <option value="">Choisir…</option>
                {[...STATUS_ORDER, 'cancelled'].map(st => (
                  <option key={st} value={st}>{statusLabel(st, item.mode)}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Lieu</label>
              <input className="input" placeholder="Entrepôt Paris, Vol Paris → Libreville…"
                value={event.location} onChange={e => setEvent(v => ({ ...v, location: e.target.value }))} />
            </div>
            <div className="field">
              <label>Note visible par le client</label>
              <textarea className="textarea" style={{ minHeight: 80 }}
                value={event.note} onChange={e => setEvent(v => ({ ...v, note: e.target.value }))} />
            </div>
            <label className="check">
              <input type="checkbox" checked={event.notify}
                onChange={e => setEvent(v => ({ ...v, notify: e.target.checked }))} />
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Mail size={15} /> Prévenir le client par email
              </span>
            </label>
            {!item.client_email && event.notify && (
              <div className="alert alert-warn">Ce client n’a pas d’email : aucune notification ne partira.</div>
            )}
          </form>
        </Modal>
      )}

      {edit && (
        <Modal title="Modifier le colis" onClose={() => setEdit(null)} width={680}
          footer={
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => setEdit(null)}>Annuler</button>
              <button className="btn btn-primary btn-sm" form="edit-form" disabled={busy}>Enregistrer</button>
            </>
          }>
          <form id="edit-form" onSubmit={saveEdit} className="form-grid">
            <div className="field">
              <label>Destinataire</label>
              <input className="input" value={edit.recipient_name} onChange={e => setEdit(v => ({ ...v, recipient_name: e.target.value }))} />
            </div>
            <div className="field">
              <label>Téléphone destinataire</label>
              <input className="input" value={edit.recipient_phone} onChange={e => setEdit(v => ({ ...v, recipient_phone: e.target.value }))} />
            </div>
            <div className="field">
              <label>Ville</label>
              <input className="input" value={edit.recipient_city} onChange={e => setEdit(v => ({ ...v, recipient_city: e.target.value }))} />
            </div>
            <div className="field">
              <label>Catégorie</label>
              <select className="select" value={edit.category_id} onChange={e => setEdit(v => ({ ...v, category_id: e.target.value }))}>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Poids (kg)</label>
              <input className="input" type="number" step="0.1" min="0" value={edit.weight_kg} onChange={e => setEdit(v => ({ ...v, weight_kg: e.target.value }))} />
            </div>
            <div className="field">
              <label>Valeur déclarée (€)</label>
              <input className="input" type="number" step="1" min="0" value={edit.declared_value_eur} onChange={e => setEdit(v => ({ ...v, declared_value_eur: e.target.value }))} />
            </div>
            <div className="field">
              <label>Montant (€)</label>
              <input className="input" type="number" step="0.01" min="0" value={edit.price_eur} onChange={e => setEdit(v => ({ ...v, price_eur: e.target.value }))} />
            </div>
            <div className="field">
              <label>Encaissé (€)</label>
              <input className="input" type="number" step="0.01" min="0" value={edit.paid_eur} onChange={e => setEdit(v => ({ ...v, paid_eur: e.target.value }))} />
            </div>
            <div className="field full">
              <label>Description</label>
              <textarea className="textarea" style={{ minHeight: 80 }} value={edit.description} onChange={e => setEdit(v => ({ ...v, description: e.target.value }))} />
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
