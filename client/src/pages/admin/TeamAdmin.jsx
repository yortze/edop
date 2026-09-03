import { useEffect, useState } from 'react';
import {
  UserPlus, Pencil, Trash2, KeyRound, ShieldCheck, UserCog,
  Mail, RefreshCw, Check, X
} from 'lucide-react';
import Modal from '../../components/Modal.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { api, formatDateTime } from '../../api.js';

const EMPTY = { name: '', email: '', phone: '', password: '', role: 'moderator', send_email: true };

// Mot de passe provisoire lisible, à transmettre au nouveau membre.
function suggestPassword() {
  const words = ['colis', 'avion', 'kilo', 'envoi', 'cargo', 'fret'];
  return `${words[Math.floor(Math.random() * words.length)]}-${Math.floor(1000 + Math.random() * 8999)}`;
}

export default function TeamAdmin() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [create, setCreate] = useState(null);
  const [edit, setEdit] = useState(null);
  const [reset, setReset] = useState(null);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [busy, setBusy] = useState(false);

  function load() { api.users().then(setItems).catch(() => {}); }
  useEffect(() => { load(); }, []);

  async function submitCreate(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await api.createUser(create);
      setCreate(null);
      setFlash(
        res.mail?.status === 'sent'
          ? `${res.user.name} a été ajouté — ses identifiants viennent de lui être envoyés par email.`
          : `${res.user.name} a été ajouté. Transmettez-lui le mot de passe : ${create.password}`
      );
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitEdit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.updateUser(edit.id, { name: edit.name, phone: edit.phone, role: edit.role, active: edit.active });
      setEdit(null);
      setFlash('Compte mis à jour.');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitReset(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await api.resetUserPassword(reset.id, { password: reset.password, send_email: reset.send_email });
      setReset(null);
      setFlash(
        res.mail?.status === 'sent'
          ? 'Nouveau mot de passe envoyé par email.'
          : `Mot de passe réinitialisé : ${reset.password}`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(u) {
    try {
      await api.updateUser(u.id, { active: u.active ? 0 : 1 });
      load();
    } catch (err) { alert(err.message); }
  }

  async function remove(u) {
    if (!confirm(`Supprimer définitivement le compte de ${u.name} ?`)) return;
    try { await api.deleteUser(u.id); load(); }
    catch (err) { alert(err.message); }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Équipe</h1>
          <p>Seul l’administrateur peut créer, modifier ou supprimer des comptes.</p>
        </div>
        <button className="btn btn-primary btn-sm"
          onClick={() => { setCreate({ ...EMPTY, password: suggestPassword() }); setError(''); }}>
          <UserPlus size={16} /> Ajouter un membre
        </button>
      </div>

      {flash && (
        <div className="alert alert-ok" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
          <span>{flash}</span>
          <button className="icon-btn" onClick={() => setFlash('')}><X size={16} /></button>
        </div>
      )}

      <div className="alert alert-info" style={{ marginBottom: '1.2rem' }}>
        <strong>Modérateur</strong> : accès aux colis, devis, clients, fiche tarifaire et images.
        <br />
        <strong>Administrateur</strong> : tout cela, plus la gestion de l’équipe, les réglages du
        site et les suppressions définitives.
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr><th>Membre</th><th>Rôle</th><th>Ajouté par</th><th>Dernière connexion</th><th>État</th><th></th></tr>
            </thead>
            <tbody>
              {items.map(u => (
                <tr key={u.id} style={u.active ? undefined : { opacity: .55 }}>
                  <td>
                    <div className="row" style={{ gap: '.7rem', flexWrap: 'nowrap' }}>
                      <span className="avatar" style={{ width: 34, height: 34 }}>{u.name.charAt(0).toUpperCase()}</span>
                      <div>
                        <div style={{ fontWeight: 600 }}>
                          {u.name}
                          {u.id === user.id && <span className="muted" style={{ fontWeight: 400 }}> (vous)</span>}
                        </div>
                        <div className="muted" style={{ fontSize: '.78rem' }}>{u.email}{u.phone ? ` · ${u.phone}` : ''}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`role-badge role-${u.role}`}>
                      {u.role === 'admin' ? 'Admin' : 'Modérateur'}
                    </span>
                  </td>
                  <td className="muted" style={{ fontSize: '.83rem' }}>{u.created_by_name || '—'}</td>
                  <td className="muted" style={{ fontSize: '.83rem' }}>
                    {u.last_login_at ? formatDateTime(u.last_login_at) : 'Jamais'}
                  </td>
                  <td>
                    {u.active
                      ? <span className="badge" style={{ color: 'var(--ok)', background: 'rgba(22,163,74,.12)' }}><Check size={13} /> Actif</span>
                      : <span className="badge" style={{ color: 'var(--muted)', background: 'var(--surface-3)' }}>Désactivé</span>}
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="icon-btn" title="Modifier"
                      onClick={() => { setEdit({ ...u, active: !!u.active }); setError(''); }}>
                      <Pencil size={16} />
                    </button>
                    <button className="icon-btn" title="Réinitialiser le mot de passe"
                      onClick={() => { setReset({ ...u, password: suggestPassword(), send_email: true }); setError(''); }}>
                      <KeyRound size={16} />
                    </button>
                    {u.id !== user.id && (
                      <>
                        <button className="icon-btn" title={u.active ? 'Désactiver' : 'Réactiver'} onClick={() => toggleActive(u)}>
                          <RefreshCw size={16} />
                        </button>
                        <button className="icon-btn danger" title="Supprimer" onClick={() => remove(u)}>
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={6}>
                  <div className="empty"><div className="ic"><UserCog size={38} /></div>Aucun compte.</div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- Création ---- */}
      {create && (
        <Modal title="Ajouter un membre de l’équipe" onClose={() => setCreate(null)}
          footer={
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => setCreate(null)}>Annuler</button>
              <button className="btn btn-primary btn-sm" form="create-user" disabled={busy}>
                {busy ? 'Création…' : 'Créer le compte'}
              </button>
            </>
          }>
          <form id="create-user" onSubmit={submitCreate} className="stack">
            <div className="form-grid">
              <div className="field">
                <label>Nom complet *</label>
                <input className="input" required value={create.name}
                  onChange={e => setCreate(v => ({ ...v, name: e.target.value }))} />
              </div>
              <div className="field">
                <label>Téléphone</label>
                <input className="input" value={create.phone}
                  onChange={e => setCreate(v => ({ ...v, phone: e.target.value }))} />
              </div>
              <div className="field full">
                <label>Email *</label>
                <input className="input" type="email" required value={create.email}
                  onChange={e => setCreate(v => ({ ...v, email: e.target.value }))} />
                <span className="hint">Sert d’identifiant de connexion.</span>
              </div>
              <div className="field full">
                <label>Mot de passe provisoire *</label>
                <div className="row" style={{ flexWrap: 'nowrap' }}>
                  <input className="input" required minLength={6} value={create.password}
                    onChange={e => setCreate(v => ({ ...v, password: e.target.value }))} />
                  <button type="button" className="btn btn-ghost btn-sm"
                    onClick={() => setCreate(v => ({ ...v, password: suggestPassword() }))}>
                    <RefreshCw size={15} />
                  </button>
                </div>
                <span className="hint">6 caractères minimum. Le membre pourra le changer depuis « Mon compte ».</span>
              </div>
            </div>

            <div className="field">
              <label>Rôle</label>
              <div className="row" style={{ gap: '.6rem' }}>
                <RoleCard
                  active={create.role === 'moderator'}
                  onClick={() => setCreate(v => ({ ...v, role: 'moderator' }))}
                  Icon={UserCog} title="Modérateur"
                  text="Gère les colis, devis, clients, tarifs et images." />
                <RoleCard
                  active={create.role === 'admin'}
                  onClick={() => setCreate(v => ({ ...v, role: 'admin' }))}
                  Icon={ShieldCheck} title="Administrateur"
                  text="Accès complet, y compris l’équipe et les réglages." />
              </div>
            </div>

            <label className="check">
              <input type="checkbox" checked={create.send_email}
                onChange={e => setCreate(v => ({ ...v, send_email: e.target.checked }))} />
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Mail size={15} /> Envoyer les identifiants par email
              </span>
            </label>

            {error && <div className="alert alert-error">{error}</div>}
          </form>
        </Modal>
      )}

      {/* ---- Modification ---- */}
      {edit && (
        <Modal title={`Modifier ${edit.name}`} onClose={() => setEdit(null)}
          footer={
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => setEdit(null)}>Annuler</button>
              <button className="btn btn-primary btn-sm" form="edit-user" disabled={busy}>Enregistrer</button>
            </>
          }>
          <form id="edit-user" onSubmit={submitEdit} className="stack">
            <div className="form-grid">
              <div className="field">
                <label>Nom</label>
                <input className="input" value={edit.name} onChange={e => setEdit(v => ({ ...v, name: e.target.value }))} />
              </div>
              <div className="field">
                <label>Téléphone</label>
                <input className="input" value={edit.phone || ''} onChange={e => setEdit(v => ({ ...v, phone: e.target.value }))} />
              </div>
              <div className="field full">
                <label>Email</label>
                <input className="input" value={edit.email} disabled />
                <span className="hint">L’email d’un compte n’est pas modifiable.</span>
              </div>
            </div>

            <div className="field">
              <label>Rôle</label>
              <div className="row" style={{ gap: '.6rem' }}>
                <RoleCard active={edit.role === 'moderator'} disabled={edit.id === user.id}
                  onClick={() => setEdit(v => ({ ...v, role: 'moderator' }))}
                  Icon={UserCog} title="Modérateur" text="Accès métier uniquement." />
                <RoleCard active={edit.role === 'admin'} disabled={edit.id === user.id}
                  onClick={() => setEdit(v => ({ ...v, role: 'admin' }))}
                  Icon={ShieldCheck} title="Administrateur" text="Accès complet." />
              </div>
              {edit.id === user.id && (
                <span className="hint">Vous ne pouvez pas modifier votre propre rôle.</span>
              )}
            </div>

            {edit.id !== user.id && (
              <label className="check">
                <input type="checkbox" checked={edit.active}
                  onChange={e => setEdit(v => ({ ...v, active: e.target.checked }))} />
                Compte actif (un compte désactivé ne peut plus se connecter)
              </label>
            )}

            {error && <div className="alert alert-error">{error}</div>}
          </form>
        </Modal>
      )}

      {/* ---- Réinitialisation ---- */}
      {reset && (
        <Modal title={`Nouveau mot de passe — ${reset.name}`} onClose={() => setReset(null)}
          footer={
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => setReset(null)}>Annuler</button>
              <button className="btn btn-primary btn-sm" form="reset-user" disabled={busy}>Réinitialiser</button>
            </>
          }>
          <form id="reset-user" onSubmit={submitReset} className="stack">
            <div className="field">
              <label>Mot de passe</label>
              <div className="row" style={{ flexWrap: 'nowrap' }}>
                <input className="input" required minLength={6} value={reset.password}
                  onChange={e => setReset(v => ({ ...v, password: e.target.value }))} />
                <button type="button" className="btn btn-ghost btn-sm"
                  onClick={() => setReset(v => ({ ...v, password: suggestPassword() }))}>
                  <RefreshCw size={15} />
                </button>
              </div>
            </div>
            <label className="check">
              <input type="checkbox" checked={reset.send_email}
                onChange={e => setReset(v => ({ ...v, send_email: e.target.checked }))} />
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Mail size={15} /> Envoyer le nouveau mot de passe par email
              </span>
            </label>
            {error && <div className="alert alert-error">{error}</div>}
          </form>
        </Modal>
      )}
    </>
  );
}

function RoleCard({ active, disabled, onClick, Icon, title, text }) {
  return (
    <button type="button" onClick={disabled ? undefined : onClick} disabled={disabled}
      style={{
        flex: 1, minWidth: 170, textAlign: 'left', cursor: disabled ? 'not-allowed' : 'pointer',
        padding: '.9rem 1rem', borderRadius: 'var(--radius-sm)',
        border: `1.5px solid ${active ? 'var(--pink)' : 'var(--border-strong)'}`,
        background: active ? 'var(--surface-3)' : 'var(--surface)',
        opacity: disabled ? .5 : 1
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontFamily: 'var(--font-head)' }}>
        <Icon size={17} style={{ color: active ? 'var(--pink-2)' : 'var(--muted)' }} /> {title}
      </div>
      <div className="muted" style={{ fontSize: '.8rem', marginTop: 4 }}>{text}</div>
    </button>
  );
}
