import { useEffect, useState } from 'react';
import { Trash2, Copy, Check, Images, CloudOff, ExternalLink } from 'lucide-react';
import ImageUpload from '../../components/ImageUpload.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { api, formatDate } from '../../api.js';

const SECTIONS = [
  { key: 'hero', label: 'Accueil' },
  { key: 'galerie', label: 'Galerie' },
  { key: 'categories', label: 'Catégories' },
  { key: 'equipe', label: 'Équipe' }
];

export default function MediaAdmin() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [section, setSection] = useState('galerie');
  const [config, setConfig] = useState(null);
  const [copied, setCopied] = useState(null);

  function load() { api.allMedia().then(setItems).catch(() => {}); }
  useEffect(() => {
    load();
    api.integrations().then(i => setConfig(i.cloudinary)).catch(() => {});
  }, []);

  async function remove(item) {
    if (!confirm('Supprimer définitivement cette image ? Elle sera aussi retirée de Cloudinary.')) return;
    try { await api.deleteMedia(item.id); load(); }
    catch (err) { alert(err.message); }
  }

  function copyUrl(item) {
    navigator.clipboard?.writeText(item.url);
    setCopied(item.id);
    setTimeout(() => setCopied(null), 1800);
  }

  const filtered = items.filter(i => i.section === section);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Images</h1>
          <p>
            Les fichiers sont hébergés sur Cloudinary
            {config?.cloud_name ? ` (${config.cloud_name})` : ''} — le site ne stocke que l’adresse.
          </p>
        </div>
      </div>

      {config && !config.configured ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <div style={{ color: 'var(--muted-2)', display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <CloudOff size={44} />
          </div>
          <h3>Cloudinary n’est pas encore branché</h3>
          <p className="muted" style={{ maxWidth: '46ch', margin: '.8rem auto 1.4rem', fontSize: '.92rem' }}>
            Créez un compte sur cloudinary.com, puis renseignez <code>CLOUDINARY_CLOUD_NAME</code>,
            <code> CLOUDINARY_API_KEY</code> et <code>CLOUDINARY_API_SECRET</code> dans
            le fichier <code>server/.env</code> avant de relancer le serveur.
          </p>
          <a className="btn btn-ghost btn-sm" href="https://console.cloudinary.com/settings/api-keys" target="_blank" rel="noreferrer">
            Ouvrir la console Cloudinary <ExternalLink size={15} />
          </a>
        </div>
      ) : (
        <>
          <div className="toolbar">
            <div className="chips">
              {SECTIONS.map(s => (
                <button key={s.key} className={`chip ${section === s.key ? 'on' : ''}`} onClick={() => setSection(s.key)}>
                  {s.label} ({items.filter(i => i.section === s.key).length})
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '1.4rem' }}>
            <ImageUpload
              section={section}
              label={`Ajouter une image à « ${SECTIONS.find(s => s.key === section)?.label} »`}
              onUploaded={load}
            />
          </div>

          {filtered.length === 0 ? (
            <div className="card empty">
              <div className="ic"><Images size={38} /></div>
              Aucune image dans cette section.
            </div>
          ) : (
            <div className="media-grid">
              {filtered.map(m => (
                <div className="media-item" key={m.id}>
                  <img src={m.url} alt={m.alt || ''} loading="lazy" />
                  <div className="meta">
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.alt || m.public_id.split('/').pop()}
                      <br />
                      <span style={{ color: 'var(--muted-2)', fontSize: '.72rem' }}>{formatDate(m.created_at)}</span>
                    </span>
                    <span style={{ display: 'flex', flex: 'none' }}>
                      <button className="icon-btn" onClick={() => copyUrl(m)} title="Copier l’adresse">
                        {copied === m.id ? <Check size={15} style={{ color: 'var(--ok)' }} /> : <Copy size={15} />}
                      </button>
                      {isAdmin && (
                        <button className="icon-btn danger" onClick={() => remove(m)} title="Supprimer">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
