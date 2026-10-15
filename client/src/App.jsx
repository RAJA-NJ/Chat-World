import React, { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
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

function LivePublicRoom({ nickname, onLeave }) {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [draft, setDraft] = useState('');
  const [connection, setConnection] = useState('Connecting…');
  const endRef = React.useRef(null);

  useEffect(() => {
    const serverUrl = import.meta.env.VITE_CHAT_SERVER_URL || 'http://localhost:3001';
    const liveSocket = io(serverUrl, { transports: ['websocket', 'polling'] });
    setSocket(liveSocket);
    liveSocket.on('connect', () => setConnection('Connected'));
    liveSocket.on('disconnect', () => setConnection('Reconnecting…'));
    liveSocket.on('chat:history', (history) => setMessages(history));
    liveSocket.on('users:update', (onlineUsers) => setUsers(onlineUsers));
    liveSocket.on('chat:message', (message) => setMessages((previous) => [...previous, message].slice(-200)));
    liveSocket.on('chat:error', (message) => setConnection(message || 'Unable to send message'));
    liveSocket.emit('room:join', { nickname });
    return () => liveSocket.disconnect();
  }, [nickname]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  function sendMessage(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !socket?.connected) return;
    socket.emit('chat:send', { text });
    setDraft('');
  }

  return <main className="chat-app">
    <aside className="sidebar">
      <div className="sidebar-top"><div className="brand"><span className="brand-mark">✳</span><span>chat<span className="brand-light">world</span></span></div><button className="icon-button" onClick={onLeave} title="Leave chat">↗</button></div>
      <div className="workspace-label">PUBLIC COMMUNITY</div>
      <div className="workspace-card"><span className="workspace-icon">✳</span><div><strong>ChatWorld Lobby</strong><small>Public chat room</small></div></div>
      <div className="inbox-heading"><span>ONLINE NOW · {users.length}</span></div>
      <div className="conversation-list">{users.map((user) => <div className="conversation" key={user.id}><span className="avatar mint">{user.nickname.slice(0,2).toUpperCase()}</span><span className="conversation-copy"><strong>{user.nickname}{user.id === socket?.id ? ' (you)' : ''}</strong><small>Online in lobby</small></span><span className="online-status" /></div>)}</div>
      <div className="sidebar-profile"><span className="avatar mint">{nickname.slice(0,2).toUpperCase()}</span><div><strong>{nickname}</strong><small>Guest account</small></div><span className="online-status" /></div>
    </aside>
    <section className="conversation-panel">
      <header className="chat-header"><div className="chat-heading"><span className="avatar blue">#</span><div><h2>Public Lobby</h2><p><span className="live-dot" /> {connection} · {users.length} online</p></div></div><button className="button button-outline" onClick={onLeave}>Change nickname</button></header>
      <div className="chat-topic"><span>✦</span> Welcome to ChatWorld — be kind, respect everyone, and enjoy the conversation.</div>
      <div className="message-area">{messages.length === 0 && <div className="empty-search">Welcome, {nickname}! Say hello to the room to start the conversation.</div>}
        {messages.map((message) => <div className={`message-row ${message.socketId === socket?.id ? 'message-own' : ''}`} key={message.id}>
          {message.socketId !== socket?.id && <span className="avatar avatar-small blue">{message.nickname.slice(0,2).toUpperCase()}</span>}
          <div className="message-content"><div className="message-byline"><strong>{message.nickname}{message.socketId === socket?.id ? ' (you)' : ''}</strong><span>{new Date(message.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span></div><div className="message-bubble">{message.text}</div></div>
        </div>)}<div ref={endRef} /></div>
      <form className="composer" onSubmit={sendMessage}><div className="composer-tools"><span>Posting as <strong>{nickname}</strong></span><span>Keep it friendly · Never share passwords</span></div><div className="composer-entry"><input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={500} placeholder={connection === 'Connected' ? 'Write a message to everyone…' : 'Connecting to ChatWorld…'} aria-label="Write a public message" disabled={connection !== 'Connected'} /><button className="send-button" type="submit" disabled={!draft.trim() || connection !== 'Connected'} aria-label="Send message">↑</button></div></form>
      <div className="demo-warning">Guest chat · Public messages are visible to everyone in this room.</div>
    </section>
  </main>;
}

export default function App() {
  const [nickname, setNickname] = useState('');
  const [draftName, setDraftName] = useState('');
  const [error, setError] = useState('');

  function enterRoom(event) {
    event.preventDefault();
    const clean = draftName.trim().split(' ').filter(Boolean).join(' ');
    if (clean.length < 2 || clean.length > 24) {
      setError('Choose a nickname between 2 and 24 characters.');
      return;
    }
    if (!/^[A-Za-z0-9_ -]+$/.test(clean)) {
      setError('Use English letters, numbers, spaces, underscores, or hyphens only.');
      return;
    }
    setNickname(clean);
    setError('');
  }

  if (nickname) return <LivePublicRoom nickname={nickname} onLeave={() => { setNickname(''); setDraftName(''); }} />;
  return <main className="auth-shell"><div className="auth-card"><div className="brand"><span className="brand-mark">✳</span><span>chat<span className="brand-light">world</span></span></div><div className="auth-heading"><div className="eyebrow">YOUR PEOPLE. YOUR SPACE.</div><h1>Join the conversation.</h1><p>Choose a nickname and enter the public ChatWorld lobby.</p></div><form className="auth-form" onSubmit={enterRoom}><label>Your nickname<input value={draftName} onChange={(event) => setDraftName(event.target.value)} placeholder="e.g. Raja" autoComplete="nickname" maxLength={24} required autoFocus /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-primary button-full" type="submit">Enter public chat <span>→</span></button></form><p className="demo-note">Guest mode · No account needed. Messages in the public room can be seen by everyone.</p></div></main>;
}
