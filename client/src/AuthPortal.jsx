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
  const [adminStats, setAdminStats] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [auditEvents, setAuditEvents] = useState([]);
  const [adminSearch, setAdminSearch] = useState('');
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
      } else if (mode === 'admin') {
        await loadAdmin();
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
  async function loadAdmin(search = adminSearch) {
    const [dashboard, pending, allUsers, audit] = await Promise.all([
      request('/api/auth/admin/dashboard', { token: accessToken }),
      request('/api/auth/admin/pending', { token: accessToken }),
      request('/api/auth/admin/users' + (search ? '?search=' + encodeURIComponent(search) : ''), { token: accessToken }),
      request('/api/auth/admin/audit', { token: accessToken }),
    ]);
    setAdminStats(dashboard.stats);
    setAuditEvents(audit.events || dashboard.audit || []);
    const pendingIds = new Set((pending.users || []).map(item => item._id));
    setAdminUsers([...(pending.users || []).map(item => ({ ...item, approvalStatus: 'pending' })), ...(allUsers.users || []).filter(item => !pendingIds.has(item._id))]);
    setMode('admin');
  }
  async function adminAction(id, action, payload) {
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await request('/api/auth/admin/users/' + id + '/' + action, { method: 'POST', token: accessToken, body: JSON.stringify(payload) });
      setNotice(result.message);
      await loadAdmin();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function logout() {
    try { await request('/api/auth/logout', { method: 'POST', body: '{}' }); } catch {}
    setAccessToken(''); setUser(null); setMode('home'); setNotice('You have signed out.');
  }
  async function uploadAvatar(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('Avatar upload endpoint validates files, but persistent avatar storage is not configured yet.');
  }
  const title = ({home:'Good conversations start here.',register:'Create your ChatWorld account',login:'Welcome back',verify:'Verify your email',forgot:'Reset your password',reset:'Choose a new password',profile:'Your ChatWorld profile',pending:'Pending registrations',admin:'Admin dashboard'})[mode] || 'ChatWorld';
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
      {mode === 'profile' && <><p>Signed in as <strong>{user?.username}</strong> · {user?.role}</p><label>Display name<input name="displayName" value={form.displayName} onChange={change} maxLength="40" required /></label><label>Bio<input name="bio" value={form.bio} onChange={change} maxLength="160" /></label><label>Status<input name="status" value={form.status} onChange={change} maxLength="60" /></label><label>Avatar image (PNG, JPEG or WebP; max 2 MB)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadAvatar} /></label><button type="submit">Save profile</button>{['super_admin','moderator'].includes(user?.role) && <button type="button" className="secondary" onClick={() => loadAdmin().catch(e => setError(e.message))}>Open admin dashboard</button>}<button type="button" className="secondary" onClick={logout}>Log out</button></>}
      {mode === 'pending' && <><p>Use the admin pending endpoint to review requests. Approval/rejection controls will be added in the next UI pass.</p><button type="submit">Load pending accounts</button><button type="button" className="secondary" onClick={() => setMode('profile')}>Back to profile</button></>}
      {['register','login','verify','forgot','reset'].includes(mode) && <button type="submit" disabled={busy}>{busy ? 'Please wait…' : ({register:'Request account',login:'Log in',verify:'Verify email',forgot:'Send reset link',reset:'Reset password'}[mode])}</button>}
    </form>}
    {mode === 'admin' && <section className="cw-admin-panel">
      <div className="cw-admin-top"><p>Signed in as <strong>{user?.username}</strong> · {user?.role === 'super_admin' ? 'Super Admin' : 'Moderator'}</p><button className="secondary" onClick={() => setMode('profile')}>Back to profile</button></div>
      <div className="cw-stat-grid">{[['Total users',adminStats?.totalUsers],['Pending approvals',adminStats?.pendingApprovals],['Email verified',adminStats?.verifiedUsers],['Suspended',adminStats?.suspendedUsers]].map(([label,value])=><div className="cw-stat" key={label}><small>{label}</small><strong>{value ?? '—'}</strong></div>)}</div>
      <h2>Verified registration queue & user management</h2>
      <form className="cw-admin-search" onSubmit={e => { e.preventDefault(); loadAdmin(adminSearch).catch(err => setError(err.message)); }}><input value={adminSearch} onChange={e => setAdminSearch(e.target.value)} placeholder="Search exact username, display name, or email"/><button type="submit">Search</button></form>
      <div className="cw-admin-users">{adminUsers.map(item=><article className="cw-admin-user" key={item._id}><div><strong>{item.displayName || item.username}</strong><small>@{item.username} · {item.email}</small><small>{item.approvalStatus} · {item.suspendedAt ? 'Suspended' : 'Active'}</small></div><div className="cw-admin-actions">{item.approvalStatus === 'pending' && <><button disabled={busy} onClick={() => adminAction(item._id,'approval',{status:'approved'})}>Approve</button><button className="secondary" disabled={busy} onClick={() => adminAction(item._id,'approval',{status:'rejected'})}>Reject</button></>}{item.approvalStatus === 'approved' && <button className="secondary" disabled={busy} onClick={() => adminAction(item._id,'suspension',{suspended:!item.suspendedAt,reason:'Administrative moderation'})}>{item.suspendedAt ? 'Reactivate' : 'Suspend'}</button>}{user?.role === 'super_admin' && <><button className="secondary" disabled={busy} onClick={() => adminAction(item._id,'role',{role:'moderator'})}>Make Moderator</button><button className="secondary" disabled={busy} onClick={() => adminAction(item._id,'role',{role:'user'})}>Remove Admin Role</button></>}</div></article>)}{adminUsers.length === 0 && <p>No matching accounts found.</p>}</div>
      <h2>Recent audit history</h2><div className="cw-audit-list">{auditEvents.map((event,index)=><div key={event._id || index}><strong>{event.action}</strong><small>{event.actorId?.username || 'Administrator'} · {new Date(event.createdAt).toLocaleString()}</small></div>)}{auditEvents.length === 0 && <p>No audit events yet.</p>}</div>
    </section>}
    {mode === 'guest' && <div className="cw-form"><p>Guest public-chat entry remains available through the existing lobby screen.</p><button onClick={() => { window.location.href = '/?guest=1'; }}>Continue to guest chat</button></div>}
    <div className="cw-bottom-links">{mode !== 'home' && <button className="cw-link" onClick={() => { setMode('home'); setError(''); setNotice(''); }}>Back to home</button>}{mode === 'register' && <button className="cw-link" onClick={() => setMode('login')}>Already have an account? Log in</button>}{mode === 'login' && <button className="cw-link" onClick={() => setMode('register')}>Request an account</button>}</div>
    <small>Accounts require email verification and admin approval. Never use a production password in this development build.</small>
  </section></main>;
}
