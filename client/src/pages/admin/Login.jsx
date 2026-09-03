import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { LogIn, ArrowLeft } from 'lucide-react';
import { Brand } from '../../components/Brand.jsx';
import ThemeToggle from '../../components/ThemeToggle.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Déjà connecté (retour sur /admin/login) : on renvoie vers le back-office.
  useEffect(() => {
    if (user) navigate(location.state?.from?.pathname || '/admin', { replace: true });
  }, [user]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(form.email, form.password);
      navigate(location.state?.from?.pathname || '/admin', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="spread" style={{ marginBottom: '1.8rem' }}>
          <Brand sub="Back-office" />
          <ThemeToggle />
        </div>

        <h2 style={{ fontSize: '1.4rem' }}>Espace équipe</h2>
        <p className="muted" style={{ fontSize: '.9rem', marginTop: '.3rem', marginBottom: '1.6rem' }}>
          Connectez-vous avec les identifiants fournis par l’administrateur.
        </p>

        <form onSubmit={submit} className="stack" style={{ gap: '1rem' }}>
          <div className="field">
            <label>Email</label>
            <input className="input" type="email" autoComplete="username" required
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="field">
            <label>Mot de passe</label>
            <input className="input" type="password" autoComplete="current-password" required
              value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Connexion…' : <>Se connecter <LogIn size={17} /></>}
          </button>
        </form>

        <Link to="/" className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '.86rem', marginTop: '1.4rem' }}>
          <ArrowLeft size={15} /> Retour au site
        </Link>
      </div>
    </div>
  );
}
