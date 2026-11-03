'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import Logo from '@/components/Logo';
import { useSuperAdminAuth } from '@/context/SuperAdminAuthContext';

export default function LoginPage() {
  const { user, loading, login } = useSuperAdminAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/');
  }, [loading, user, router]);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(form.email.trim(), form.password);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={onSubmit}>
        <div className="login-logo"><Logo /></div>
        <div>
          <h2>Super Admin sign in</h2>
          <p className="muted" style={{ margin: '4px 0 0' }}>Platform operations console</p>
        </div>

        <label className="field"><span>Email</span>
          <input name="email" type="email" autoComplete="username" placeholder="admin@purebook.in" value={form.email} onChange={onChange} required />
        </label>
        <label className="field"><span>Password</span>
          <div className="pw">
            <input name="password" type={show ? 'text' : 'password'} autoComplete="current-password" value={form.password} onChange={onChange} required />
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </div>
        </label>

        {error && <div className="alert error" role="alert" style={{ margin: 0 }}>{error}</div>}
        <button className="btn" type="submit" disabled={busy}>
          {busy && <Loader2 size={16} className="spin" />} {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
