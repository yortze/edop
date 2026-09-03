import { useEffect, useState } from 'react';
import { Users, Pencil } from 'lucide-react';
import Modal from '../../components/Modal.jsx';
import SearchInput from '../../components/SearchInput.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { WhatsAppIcon } from '../../components/SocialIcons.jsx';
import { api, formatEur, formatDate, waLink } from '../../api.js';

export default function ClientsAdmin() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [detail, setDetail] = useState(null);
  const [edit, setEdit] = useState(null);

  function load() {
    api.clients(q ? `?q=${encodeURIComponent(q)}` : '').then(setItems).catch(() => {});
  }
  useEffect(() => {
    const t = setTimeout(load, q ? 260 : 0);
    return () => clearTimeout(t);
  }, [q]);

  async function save(e) {
    e.preventDefault();
    try {
      await api.updateClient(edit.id, edit);
      setEdit(null);
      load();
    } catch (err) { alert(err.message); }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Clients</h1>
          <p>{items.length} client{items.length > 1 ? 's' : ''} au répertoire</p>
        </div>
      </div>

      <div className="toolbar">
        <SearchInput value={q} onChange={setQ} placeholder="Nom, téléphone, email…" />
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                <th>Client</th><th>Contact</th><th>Ville</th>
                <th style={{ textAlign: 'right' }}>Colis</th>
                <th style={{ textAlign: 'right' }}>Total facturé</th>
                <th>Dernier envoi</th><th></th>
              </tr>
            </thead>
            <tbody>
              {items.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td className="muted" style={{ fontSize: '.85rem' }}>
                    {c.phone || '—'}{c.email ? <><br />{c.email}</> : null}
                  </td>
                  <td>{c.city || '—'}</td>
                  <td className="num">{c.shipments_count}</td>
                  <td className="num">{formatEur(c.total_eur)}</td>
                  <td className="muted" style={{ fontSize: '.82rem' }}>{c.last_shipment_at ? formatDate(c.last_shipment_at) : '—'}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="btn btn-ghost btn-sm"
                      onClick={() => api.client(c.id).then(setDetail)}>Fiche</button>
                    <button className="icon-btn" onClick={() => setEdit({ ...c })} title="Modifier">
                      <Pencil size={15} />
                    </button>
                    {c.phone && (
                      <a className="icon-btn" target="_blank" rel="noreferrer" href={waLink(c.phone, `Bonjour ${c.name},`)}>
                        <WhatsAppIcon size={15} />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={7}>
                  <div className="empty">
                    <div className="ic"><Users size={38} /></div>
                    Aucun client trouvé.
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detail && (
        <Modal title={detail.name} onClose={() => setDetail(null)} width={620}>
          <div className="card card-flat" style={{ padding: 0 }}>
            <div className="kv"><span>Téléphone</span><span>{detail.phone || '—'}</span></div>
            <div className="kv"><span>Email</span><span>{detail.email || '—'}</span></div>
            <div className="kv"><span>Ville</span><span>{detail.city || '—'}</span></div>
            <div className="kv"><span>Adresse</span><span>{detail.address || '—'}</span></div>
          </div>

          <h4 style={{ marginTop: '.6rem' }}>Colis ({detail.shipments.length})</h4>
          <div className="table-scroll">
            <table className="data" style={{ minWidth: 420 }}>
              <thead><tr><th>Suivi</th><th>Catégorie</th><th>Statut</th><th style={{ textAlign: 'right' }}>Montant</th></tr></thead>
              <tbody>
                {detail.shipments.map(s => (
                  <tr key={s.id}>
                    <td className="tn">{s.tracking_number}</td>
                    <td>{s.category_name || '—'}</td>
                    <td><StatusBadge status={s.status} /></td>
                    <td className="num">{formatEur(s.price_eur)}</td>
                  </tr>
                ))}
                {detail.shipments.length === 0 && <tr><td colSpan={4} className="empty">Aucun colis</td></tr>}
              </tbody>
            </table>
          </div>
        </Modal>
      )}

      {edit && (
        <Modal title="Modifier le client" onClose={() => setEdit(null)}
          footer={
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => setEdit(null)}>Annuler</button>
              <button className="btn btn-primary btn-sm" form="client-form">Enregistrer</button>
            </>
          }>
          <form id="client-form" onSubmit={save} className="form-grid">
            <div className="field full">
              <label>Nom</label>
              <input className="input" value={edit.name} onChange={e => setEdit(v => ({ ...v, name: e.target.value }))} />
            </div>
            <div className="field">
              <label>Téléphone</label>
              <input className="input" value={edit.phone || ''} onChange={e => setEdit(v => ({ ...v, phone: e.target.value }))} />
            </div>
            <div className="field">
              <label>Email</label>
              <input className="input" type="email" value={edit.email || ''} onChange={e => setEdit(v => ({ ...v, email: e.target.value }))} />
            </div>
            <div className="field">
              <label>Ville</label>
              <input className="input" value={edit.city || ''} onChange={e => setEdit(v => ({ ...v, city: e.target.value }))} />
            </div>
            <div className="field">
              <label>Adresse</label>
              <input className="input" value={edit.address || ''} onChange={e => setEdit(v => ({ ...v, address: e.target.value }))} />
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
