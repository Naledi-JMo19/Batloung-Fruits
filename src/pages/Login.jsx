import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { FormError } from '../components/ui.jsx';

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try { await login(form.username.trim(), form.password); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="login">
      <form onSubmit={submit} className="login-card">
        <div className="brand dark"><span className="crate" aria-hidden="true" />Batloung Fruits</div>
        <h1>Log in</h1>
        <p className="muted">Distribution management for Maseru street vendors.</p>
        <label>Username<input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required autoFocus autoComplete="username" /></label>
        <label>Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required autoComplete="current-password" /></label>
        <FormError message={error} />
        <button className="btn primary" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
        <p className="hint">Use the admin or sales password you created during setup.</p>
      </form>
    </div>
  );
}
