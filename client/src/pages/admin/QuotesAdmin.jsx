import { useEffect, useState } from 'react';
import { FileText, Trash2 } from 'lucide-react';
import { WhatsAppIcon } from '../../components/SocialIcons.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { api, formatEur, formatDateTime, waLink, QUOTE_STATUS_META } from '../../api.js';

const STATUSES = Object.keys(QUOTE_STATUS_META);

export default function QuotesAdmin() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('');

  function load() {
    api.quotes(filter ? `?status=${filter}` : '').then(setItems).catch(() => {});
  }
  useEffect(() => { load(); }, [filter]);

  async function setStatus(quote, status) {
    try {
      await api.updateQuote(quote.id, { status });
      load();
    } catch (err) { alert(err.message); }
  }

  async function remove(quote) {
    if (!confirm(`Supprimer la demande de ${quote.name} ?`)) return;
    try { await api.deleteQuote(quote.id); load(); }
    catch (err) { alert(err.message); }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Devis</h1>
          <p>{items.length} demande{items.length > 1 ? 's' : ''} {filter ? `« ${QUOTE_STATUS_META[filter].label} »` : 'au total'}</p>
        </div>
      </div>

      <div className="toolbar">
        <div className="chips">
          <button className={`chip ${!filter ? 'on' : ''}`} onClick={() => setFilter('')}>Toutes</button>
          {STATUSES.map(st => (
            <button key={st} className={`chip ${filter === st ? 'on' : ''}`} onClick={() => setFilter(st)}>
              {QUOTE_STATUS_META[st].label}
            </button>
          ))}
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                <th>Client</th><th>Catégorie</th>
                <th style={{ textAlign: 'right' }}>Poids</th>
                <th style={{ textAlign: 'right' }}>Estimation</th>
                <th>Statut</th><th>Reçu le</th><th></th>
              </tr>
            </thead>
            <tbody>
              {items.map(q => (
                <tr key={q.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{q.name}</div>
                    <div className="muted" style={{ fontSize: '.78rem' }}>{q.phone}{q.email ? ` · ${q.email}` : ''}</div>
                    {q.description && (
                      <div className="muted" style={{ fontSize: '.78rem', marginTop: 4, maxWidth: 280 }}>{q.description}</div>
                    )}
                  </td>
                  <td>{q.category_name || '—'}</td>
                  <td className="num">{q.weight_kg} kg</td>
                  <td className="num">{q.estimated_eur ? formatEur(q.estimated_eur) : 'Sur devis'}</td>
                  <td>
                    <select className="select" style={{ padding: '6px 30px 6px 10px', fontSize: '.82rem' }}
                      value={q.status} onChange={e => setStatus(q, e.target.value)}>
                      {STATUSES.map(st => <option key={st} value={st}>{QUOTE_STATUS_META[st].label}</option>)}
                    </select>
                  </td>
                  <td className="muted" style={{ fontSize: '.82rem' }}>{formatDateTime(q.created_at)}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <a className="btn btn-ghost btn-sm" target="_blank" rel="noreferrer"
                       href={waLink(q.phone, `Bonjour ${q.name}, suite à votre demande de devis chez E-DOP :`)}>
                      <WhatsAppIcon size={14} />
                    </a>
                    {isAdmin && (
                      <button className="icon-btn danger" onClick={() => remove(q)} title="Supprimer">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={7}>
                  <div className="empty">
                    <div className="ic"><FileText size={38} /></div>
                    Aucune demande pour l’instant.
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
