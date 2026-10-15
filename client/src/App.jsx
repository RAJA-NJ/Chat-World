import React, { useMemo, useState } from 'react';
import './App.css';

const starterMessages = [
  { id: 1, name: 'Maya', initials: 'M', color: 'lilac', text: 'Hey everyone! 👋 How is your day going?', time: '10:24 AM', own: false },
  { id: 2, name: 'You', initials: 'Y', color: 'mint', text: 'Pretty good! Just exploring ChatWorld.', time: '10:25 AM', own: true },
  { id: 3, name: 'Arun', initials: 'A', color: 'peach', text: 'Welcome! This place is for good conversations ✨', time: '10:26 AM', own: false },
];

const people = [
  { name: 'Maya Chen', initials: 'MC', color: 'lilac', status: 'Online now', preview: 'See you in a bit!', time: '2m' },
  { name: 'Arun Kumar', initials: 'AK', color: 'peach', status: 'Online now', preview: 'That sounds great 👍', time: '8m' },
  { name: 'Design crew', initials: 'DC', color: 'blue', status: '5 members', preview: 'Maya: shared a new idea', time: '15m', group: true },
  { name: 'Priya S', initials: 'PS', color: 'mint', status: 'Away', preview: 'Thanks for the notes!', time: '1h' },
];

function Brand({ compact = false }) {
  return <div className={`brand ${compact ? 'brand-compact' : ''}`}><span className="brand-mark">✳</span><span>chat<span className="brand-light">world</span></span></div>;
}

function Avatar({ person, small = false }) {
  return <span className={`avatar ${person.color || 'blue'} ${small ? 'avatar-small' : ''}`}>{person.initials}</span>;
}

function Landing({ onLogin, onRegister, onGuest }) {
  return <main className="landing">
    <nav className="top-nav"><Brand /><div className="nav-actions"><button className="button button-quiet" onClick={onLogin}>Log in</button><button className="button button-primary" onClick={onRegister}>Get started <span>↗</span></button></div></nav>
    <section className="hero">
      <div className="hero-copy"><div className="eyebrow"><span className="pulse-dot" /> YOUR PEOPLE. YOUR SPACE.</div><h1>Good conversations<br />start <span className="gradient-text">right here.</span></h1><p className="hero-description">A little corner of the internet to catch up, share ideas, and feel closer — wherever life takes you.</p><div className="hero-buttons"><button className="button button-primary button-large" onClick={onRegister}>Create your account <span>→</span></button><button className="button button-outline button-large" onClick={onGuest}>Try as a guest</button></div><div className="social-proof"><div className="avatar-stack"><Avatar person={{initials:'M',color:'lilac'}} small/><Avatar person={{initials:'A',color:'peach'}} small/><Avatar person={{initials:'J',color:'mint'}} small/><Avatar person={{initials:'S',color:'blue'}} small/></div><span><strong>Make room for connection.</strong><br/>Start with a simple hello.</span></div></div>
      <div className="hero-art" aria-label="Chat conversation preview"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="floating-chip chip-top">✦ Good energy only</div><div className="chat-preview"><div className="preview-head"><div><span className="live-dot" /> <strong>the good company</strong></div><span className="muted">•••</span></div><div className="preview-members"><div className="avatar-stack"><Avatar person={{initials:'M',color:'lilac'}} small/><Avatar person={{initials:'A',color:'peach'}} small/><Avatar person={{initials:'J',color:'mint'}} small/></div><span>3 friends chatting</span></div><div className="preview-message"><Avatar person={{initials:'M',color:'lilac'}} small/><div><small>Maya · 10:24</small><p>Okay, we need a weekend plan 🌿</p></div></div><div className="preview-message"><Avatar person={{initials:'A',color:'peach'}} small/><div><small>Arun · 10:25</small><p>Beach? Coffee? Both? ☕</p></div></div><div className="preview-message own-message"><div><small>You · 10:26</small><p>Why choose? 😄</p></div></div><div className="preview-input"><span>Write a message...</span><span className="send-icon">↑</span></div></div><div className="floating-chip chip-bottom"><span className="sparkle">✦</span> Your space to be you</div></div>
    </section>
    <section className="feature-row"><div><span className="feature-icon">↗</span><strong>One-to-one chats</strong><p>Catch up, just the two of you.</p></div><div><span className="feature-icon">◎</span><strong>Group conversations</strong><p>Bring your favourite people together.</p></div><div><span className="feature-icon">⌁</span><strong>Easy to get started</strong><p>Join in, even as a guest.</p></div></section>
    <footer className="landing-footer"><Brand compact/><span>A calmer kind of connected.</span><span>© 2026 ChatWorld · Frontend preview</span></footer>
  </main>;
}

function AuthPage({ mode, onBack, onSuccess, onSwitch }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const register = mode === 'register';
  function submit(event) {
    event.preventDefault();
    if (register && !name.trim()) return setError('Please enter your name.');
    if (!email.includes('@') || !email.includes('.')) return setError('Enter a valid email address.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    setError('');
    onSuccess(name.trim() || email.split('@')[0] || 'Friend');
  }
  return <main className="auth-shell"><button className="back-link" onClick={onBack}>← Back to home</button><div className="auth-card"><Brand/><div className="auth-heading"><div className="eyebrow">YOUR NEXT CONVERSATION AWAITS</div><h1>{register ? 'Make yourself at home.' : 'Welcome back.'}</h1><p>{register ? 'Create an account and find your people.' : 'Pick up right where the conversation left off.'}</p></div><form onSubmit={submit} className="auth-form">{register && <label>Your name<input value={name} onChange={e=>setName(e.target.value)} placeholder="What should we call you?" autoComplete="name" /></label>}<label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required /></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters" autoComplete={register ? 'new-password' : 'current-password'} required /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-primary button-full" type="submit">{register ? 'Create account' : 'Log in'} <span>→</span></button></form><p className="auth-switch">{register ? 'Already have an account?' : 'New around here?'} <button onClick={onSwitch}>{register ? 'Log in' : 'Create an account'}</button></p><p className="demo-note">Frontend demo only — no account details are sent or saved.</p></div></main>;
}

function ChatApp({ username, onHome }) {
  const [selected, setSelected] = useState('Design crew');
  const [kind, setKind] = useState('All chats');
  const [messages, setMessages] = useState(starterMessages);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [notice, setNotice] = useState('');
  const filtered = useMemo(() => people.filter(p => (kind === 'All chats' || (kind === 'Groups' ? p.group : !p.group)) && (p.name.toLowerCase().includes(search.toLowerCase()) || p.preview.toLowerCase().includes(search.toLowerCase()))), [kind, search]);
  function sendMessage(event) {
    event.preventDefault();
    if (!draft.trim()) return;
    setMessages(old => [...old, { id: Date.now(), name: username, initials: username.slice(0,2).toUpperCase(), color: 'mint', text: draft.trim(), time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}), own: true }]);
    setDraft('');
  }
  return <main className="chat-app"><aside className="sidebar"><div className="sidebar-top"><button className="brand-button" onClick={onHome}><Brand/></button><button className="icon-button" title="Back to home" onClick={onHome}>↗</button></div><div className="workspace-label">YOUR WORKSPACE</div><div className="workspace-card"><span className="workspace-icon">✳</span><div><strong>My ChatWorld</strong><small>Free space</small></div><span className="muted">⌄</span></div><div className="inbox-heading"><span>MESSAGES</span><button className="icon-button" title="New conversation" onClick={()=>setShowNew(!showNew)}>＋</button></div>{showNew && <div className="new-chat-note">Choose a conversation from the list, or switch between direct and group chats below.</div>}<div className="search-box"><span>⌕</span><input aria-label="Search chats" placeholder="Search chats..." value={search} onChange={e=>setSearch(e.target.value)}/><kbd>⌘ K</kbd></div><div className="filter-tabs">{['All chats','Direct','Groups'].map(k=><button key={k} className={kind===k?'active':''} onClick={()=>setKind(k)}>{k}</button>)}</div><div className="conversation-list">{filtered.map(p=><button key={p.name} className={`conversation ${selected===p.name?'selected':''}`} onClick={()=>{setSelected(p.name);setNotice('')}}><Avatar person={p}/><span className="conversation-copy"><strong>{p.name}</strong><small>{p.preview}</small></span><span className="conversation-meta"><small>{p.time}</small>{p.status==='Online now'&&<i/>}</span></button>)}{filtered.length===0&&<p className="empty-search">No conversations found.</p>}</div><div className="sidebar-profile"><Avatar person={{initials:username.slice(0,2).toUpperCase(),color:'mint'}}/><div><strong>{username}</strong><small>Guest preview</small></div><span className="online-status" title="Online"/></div></aside><section className="conversation-panel"><header className="chat-header"><div className="chat-heading"><Avatar person={{initials:selected.split(' ').map(s=>s[0]).join('').slice(0,2),color:people.find(p=>p.name===selected)?.color||'blue'}}/><div><h2>{selected}</h2><p><span className="live-dot"/> {people.find(p=>p.name===selected)?.status || 'Demo conversation'}</p></div></div><div className="header-actions"><button className="icon-button" title="Search messages" onClick={()=>setNotice('Message search is a placeholder in this frontend demo.')}>⌕</button><button className="icon-button" title="Conversation details" onClick={()=>setNotice(`You're viewing the ${selected} demo conversation.`)}>ⓘ</button></div></header>{notice&&<div className="notice-bar">{notice}<button onClick={()=>setNotice('')}>×</button></div>}<div className="chat-topic"><span>✦</span> A good place for good conversations <span>·</span> <strong>{selected==='Design crew'?'Group chat':'Direct message'}</strong></div><div className="message-area"><div className="day-divider"><span/> TODAY <span/></div>{messages.map(m=><div key={m.id} className={`message-row ${m.own?'message-own':''}`}>{!m.own&&<Avatar person={m} small/>}<div className="message-content">{!m.own&&<div className="message-byline"><strong>{m.name}</strong><span>{m.time}</span></div>}<div className="message-bubble">{m.text}</div>{m.own&&<small className="message-time">{m.time} · Sent</small>}</div></div>)}<div className="typing-note"><span className="typing-dots"><i/><i/><i/></span> Your conversation is just getting started.</div></div><form className="composer" onSubmit={sendMessage}><div className="composer-tools"><button type="button" title="Formatting" onClick={()=>setNotice('Rich text formatting will be added in a later step.')}>Aa</button><button type="button" title="Attach file" onClick={()=>setNotice('File sharing will be added after the backend is connected.')}>＋</button><span>Messages are local to this preview</span></div><div className="composer-entry"><input value={draft} onChange={e=>setDraft(e.target.value)} placeholder={`Message ${selected}...`} aria-label="Write a message"/><button className="send-button" type="submit" disabled={!draft.trim()} aria-label="Send message">↑</button></div></form><div className="demo-warning">Demo mode · Messages reset when you refresh. No backend is connected yet.</div></section></main>;
}

export default function App() {
  const [page, setPage] = useState('home');
  const [username, setUsername] = useState('Guest');
  function enterChat(name) { setUsername(name || 'Guest'); setPage('chat'); }
  if (page === 'chat') return <ChatApp username={username} onHome={()=>setPage('home')}/>;
  if (page === 'login' || page === 'register') return <AuthPage mode={page} onBack={()=>setPage('home')} onSwitch={()=>setPage(page==='login'?'register':'login')} onSuccess={enterChat}/>;
  return <Landing onLogin={()=>setPage('login')} onRegister={()=>setPage('register')} onGuest={()=>enterChat('Guest')}/>;
}
