import React, { useEffect, useState } from 'react';
import './AuthPortal.css';

const API = import.meta.env.VITE_CHAT_API_URL || 'http://localhost:3001';
async function request(path, options = {}) {
  const response = await fetch(API + path, {
    ...options,
    credentials: 'include',
    headers: { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(options.token ? { Authorization: 'Bearer ' + options.token } : {}), ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Request failed.');
  return data;
}

export default function AuthPortal() {
  const [mode, setMode] = useState('home');
  const [form, setForm] = useState({ username: '', displayName: '', email: '', identity: '', password: '', token: '', bio: '', status: 'Available' });
  const [accessToken, setAccessToken] = useState('');
  const [user, setUser] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const change = event => setForm(old => ({ ...old, [event.target.name]: event.target.value }));
  async function run(event) {
    event?.preventDefault();
    setBusy(true); setNotice(''); setError('');
    try {
      if (mode === 'register') {
        const result = await request('/api/auth/register', { method: 'POST', body: JSON.stringify(form) });
        setNotice(result.message); setMode('login');
      } else if (mode === 'login') {
        const result = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ identity: form.identity, password: form.password }) });
        setAccessToken(result.accessToken); setUser(result.user); setMode('profile'); setNotice('Signed in successfully.');
      } else if (mode === 'verify') {
        const result = await request('/api/auth/verify-email', { method: 'POST', body: JSON.stringify({ token: form.token }) });
        setNotice(result.message); setMode('login');
      } else if (mode === 'forgot') {
        const result = await request('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: form.email }) });
        setNotice(result.message);
      } else if (mode === 'reset') {
        const result = await request('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token: form.token, password: form.password }) });
        setNotice(result.message); setMode('login');
      } else if (mode === 'profile') {
        const result = await request('/api/auth/profile', { method: 'PATCH', token: accessToken, body: JSON.stringify({ displayName: form.displayName, bio: form.bio, status: form.status }) });
        setUser(old => ({ ...old, ...result.user })); setNotice('Profile saved.');
      } else if (mode === 'pending') {
        const result = await request('/api/auth/admin/pending', { token: accessToken });
        setNotice(JSON.stringify(result.users, null, 2));
      }
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('verify')) { setForm(old => ({ ...old, token: params.get('verify') })); setMode('verify'); }
    if (params.has('reset')) { setForm(old => ({ ...old, token: params.get('reset') })); setMode('reset'); }
  }, []);
  useEffect(() => {
    if (user) setForm(old => ({ ...old, displayName: user.displayName || '', bio: user.bio || '', status: user.status || 'Available' }));
  }, [user]);
  async function logout() {
    try { await request('/api/auth/logout', { method: 'POST', body: '{}' }); } catch {}
    setAccessToken(''); setUser(null); setMode('home'); setNotice('You have signed out.');
  }
  async function uploadAvatar(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('Avatar upload endpoint validates files, but persistent avatar storage is not configured yet.');
  }
  const title = ({home:'Good conversations start here.',register:'Create your ChatWorld account',login:'Welcome back',verify:'Verify your email',forgot:'Reset your password',reset:'Choose a new password',profile:'Your ChatWorld profile',pending:'Pending registrations'})[mode] || 'ChatWorld';
  return <main className="cw-auth-page"><section className="cw-auth-card">
    <div className="cw-brand"><span>✳</span> chat<strong>world</strong></div>
    <p className="cw-eyebrow">YOUR PEOPLE. YOUR SPACE.</p><h1>{title}</h1>
    {notice && <pre className="cw-notice" role="status">{notice}</pre>}{error && <p className="cw-error" role="alert">{error}</p>}
    {mode === 'home' && <div className="cw-actions"><p>Join the public lobby as a guest, or create an account for a profile and registered-user features.</p><button onClick={() => setMode('login')}>Log in</button><button onClick={() => setMode('register')}>Create an account</button><button className="secondary" onClick={() => setMode('guest')}>Continue as guest</button></div>}
    {(mode === 'register' || mode === 'login' || mode === 'verify' || mode === 'forgot' || mode === 'reset' || mode === 'profile' || mode === 'pending') && <form className="cw-form" onSubmit={run}>
      {mode === 'register' && <><label>Username<input name="username" value={form.username} onChange={change} minLength="3" maxLength="24" autoComplete="username" required /></label><label>Display name<input name="displayName" value={form.displayName} onChange={change} maxLength="40" required /></label><label>Email<input name="email" type="email" value={form.email} onChange={change} autoComplete="email" required /></label><label>Password (12+ characters)<input name="password" type="password" value={form.password} onChange={change} minLength="12" maxLength="128" autoComplete="new-password" required /></label></>}
      {mode === 'login' && <><label>Email or username<input name="identity" value={form.identity} onChange={change} autoComplete="username" required /></label><label>Password<input name="password" type="password" value={form.password} onChange={change} autoComplete="current-password" required /></label><button type="button" className="cw-link" onClick={() => setMode('forgot')}>Forgot password?</button></>}
      {(mode === 'verify' || mode === 'reset') && <label>Verification/reset token<input name="token" value={form.token} onChange={change} required /></label>}
      {(mode === 'reset') && <label>New password (12+ characters)<input name="password" type="password" value={form.password} onChange={change} minLength="12" maxLength="128" required /></label>}
      {mode === 'forgot' && <label>Email<input name="email" type="email" value={form.email} onChange={change} required /></label>}
      {mode === 'profile' && <><p>Signed in as <strong>{user?.username}</strong> · {user?.role}</p><label>Display name<input name="displayName" value={form.displayName} onChange={change} maxLength="40" required /></label><label>Bio<input name="bio" value={form.bio} onChange={change} maxLength="160" /></label><label>Status<input name="status" value={form.status} onChange={change} maxLength="60" /></label><label>Avatar image (PNG, JPEG or WebP; max 2 MB)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadAvatar} /></label><button type="submit">Save profile</button>{user?.role === 'admin' && <button type="button" className="secondary" onClick={() => setMode('pending')}>View pending registrations</button>}<button type="button" className="secondary" onClick={logout}>Log out</button></>}
      {mode === 'pending' && <><p>Use the admin pending endpoint to review requests. Approval/rejection controls will be added in the next UI pass.</p><button type="submit">Load pending accounts</button><button type="button" className="secondary" onClick={() => setMode('profile')}>Back to profile</button></>}
      {['register','login','verify','forgot','reset'].includes(mode) && <button type="submit" disabled={busy}>{busy ? 'Please wait…' : ({register:'Request account',login:'Log in',verify:'Verify email',forgot:'Send reset link',reset:'Reset password'}[mode])}</button>}
    </form>}
    {mode === 'guest' && <div className="cw-form"><p>Guest public-chat entry remains available through the existing lobby screen.</p><button onClick={() => { window.location.href = '/?guest=1'; }}>Continue to guest chat</button></div>}
    <div className="cw-bottom-links">{mode !== 'home' && <button className="cw-link" onClick={() => { setMode('home'); setError(''); setNotice(''); }}>Back to home</button>}{mode === 'register' && <button className="cw-link" onClick={() => setMode('login')}>Already have an account? Log in</button>}{mode === 'login' && <button className="cw-link" onClick={() => setMode('register')}>Request an account</button>}</div>
    <small>Accounts require email verification and admin approval. Never use a production password in this development build.</small>
  </section></main>;
}
