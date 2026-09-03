import { useState } from 'react';
import { KeyRound, ShieldCheck, UserCog } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../api.js';

export default function Account() {
  const { user, isAdmin } = useAuth();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setFlash('');
    if (form.next !== form.confirm) {
      setError('Les deux nouveaux mots de passe ne correspondent pas.');
      return;
    }
    setBusy(true);
    try {
      await api.changePassword(form.current, form.next);
      setForm({ current: '', next: '', confirm: '' });
      setFlash('Mot de passe modifié.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Mon compte</h1>
          <p>Vos informations de connexion au back-office E-DOP.</p>
        </div>
      </div>

      <div className="split">
        <div className="card">
          <div className="row" style={{ gap: '.9rem', marginBottom: '1.2rem', flexWrap: 'nowrap' }}>
            <span className="avatar" style={{ width: 48, height: 48, fontSize: '1.2rem' }}>
              {user?.name?.charAt(0).toUpperCase()}
            </span>
            <div>
              <h3>{user?.name}</h3>
              <div className="muted" style={{ fontSize: '.86rem' }}>{user?.email}</div>
            </div>
          </div>

          <div className="kv">
            <span>Rôle</span>
            <span className={`role-badge role-${user?.role}`}>
              {isAdmin ? 'Administrateur' : 'Modérateur'}
            </span>
          </div>

          <div className="divider" />

          <div className="feature">
            <div className="ic" style={{ background: 'var(--surface-3)', color: 'var(--pink-2)', boxShadow: 'none' }}>
              {isAdmin ? <ShieldCheck size={20} /> : <UserCog size={20} />}
            </div>
            <div>
              <h3 style={{ fontSize: '.95rem' }}>Ce que vous pouvez faire</h3>
              <p>
                {isAdmin
                  ? 'Accès complet : colis, devis, clients, tarifs, images, gestion de l’équipe, réglages du site et suppressions définitives.'
                  : 'Colis, devis, clients, fiche tarifaire et images. La gestion de l’équipe, les réglages et les suppressions définitives sont réservés à l’administrateur.'}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '1.1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <KeyRound size={18} style={{ color: 'var(--pink)' }} /> Changer mon mot de passe
          </h3>

          <form onSubmit={submit} className="stack">
            <div className="field">
              <label>Mot de passe actuel</label>
              <input className="input" type="password" autoComplete="current-password" required
                value={form.current} onChange={e => setForm(v => ({ ...v, current: e.target.value }))} />
            </div>
            <div className="field">
              <label>Nouveau mot de passe</label>
              <input className="input" type="password" autoComplete="new-password" required minLength={6}
                value={form.next} onChange={e => setForm(v => ({ ...v, next: e.target.value }))} />
              <span className="hint">6 caractères minimum.</span>
            </div>
            <div className="field">
              <label>Confirmer le nouveau mot de passe</label>
              <input className="input" type="password" autoComplete="new-password" required minLength={6}
                value={form.confirm} onChange={e => setForm(v => ({ ...v, confirm: e.target.value }))} />
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {flash && <div className="alert alert-ok">{flash}</div>}

            <button className="btn btn-primary btn-block" disabled={busy}>
              {busy ? 'Enregistrement…' : 'Mettre à jour'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
