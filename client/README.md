# ChatWorld React frontend

A responsive React + Vite frontend for the ChatWorld project. The original HTML/CSS pages remain untouched in the repository.

## Run locally

Requirements: Node.js 18+ (Node.js 20 LTS recommended) and npm.

```bash
cd client
npm install
npm run dev
```

Open the local URL printed by Vite (usually http://localhost:5173).

## Available screens

- Landing page with account and guest entry points
- Login and registration form layouts with basic client-side validation
- Chat preview with direct/group filters, conversation search, and local message sending
- Responsive layout for desktop and mobile

## Important limitations

This is a **frontend-only prototype**. Login and registration do not authenticate users, account details are not submitted to a server, and chat messages exist only in browser memory. Data resets when the page refreshes. Do not enter real passwords or sensitive information.

## Next development steps

1. Connect a Node.js + Express API and MongoDB.
2. Implement secure registration/login, password hashing, sessions or token handling, and validation on the server.
3. Add authorization for private and group conversations.
4. Add Socket.IO for real-time messaging and persistent message storage.
5. Add tests and deployment configuration.
