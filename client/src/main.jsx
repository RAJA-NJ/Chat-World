import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import AuthPortal from './AuthPortal.jsx';
import './index.css';

const showGuestChat = new URLSearchParams(window.location.search).get('guest') === '1';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {showGuestChat ? <App /> : <AuthPortal />}
  </React.StrictMode>,
);
