# ChatWorld React frontend

ChatWorld is being developed in stages. This branch adds the first authentication API and account portal; it is not yet production-ready.

## Prerequisites

- Node.js 20 LTS recommended
- npm
- MongoDB local instance or MongoDB Atlas database
- SMTP credentials for email verification and password reset

## Configure the backend

In a terminal:

```powershell
cd server
npm install
Copy-Item .env.example .env
```

Edit `server/.env` and set:
- `MONGODB_URI`
- two different strong random secrets for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`
- SMTP settings and `MAIL_FROM`
- optional `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_USERNAME`, and a unique strong `INITIAL_ADMIN_PASSWORD` (at least 16 characters) for one-time first-admin creation

Never commit `.env` or share its values. If email is not configured, registration will not complete because verification mail is required.

Start the backend:

```powershell
npm run dev
```

## Start the frontend

In a second terminal from the repository root:

```powershell
cd client
npm install
npm run dev
```

Open the URL printed by Vite (usually `http://localhost:5173`). The default page is the account portal. To open the existing guest lobby, use `http://localhost:5173/?guest=1`.

## Current authentication features

- Registration requests with username, display name, email and a 12+ character password
- Email verification link endpoint (30-minute expiry)
- Admin approval required before login; first admin can be bootstrapped from environment configuration
- Email-or-username login, bcrypt password hashing, short-lived JWT access token and rotating opaque refresh token in an HTTP-only cookie
- Logout, generic password-reset response and expiring one-time reset links
- Profile fields (display name, bio and status)
- Advanced admin dashboard APIs: verified-only approval queue, account search, approval/rejection, suspension/reactivation, audit history, and Super Admin role management
- Helmet, CORS credentials, JSON body limit and API rate limiting

## Known gaps — do not treat as production-ready

- Avatar file validation exists, but persistent avatar storage is not yet configured.
- Registered-user chat is not integrated with account status yet. The guest lobby is still unauthenticated and separate; suspension enforcement for registered sockets must be added when authenticated chat is connected.
- Access token is kept in React memory and there is not yet a complete automatic refresh flow.
- Authenticated accounts are not yet wired into private/group chat; the existing guest lobby remains separate and in-memory.
- Online presence statistics are not yet available for registered accounts; dashboard metrics currently show total, verified, pending-approval and suspended users.
- Refresh-token replay detection, comprehensive CSRF review, automatic access-token refresh, automated tests, abuse controls, deployment hardening and independent security review remain necessary.
- Email delivery, MongoDB connection, initial admin setup and all browser flows have not been tested in this environment.

Email verification is required once during registration. Normal sign-in uses email or username plus password; login does not send an OTP. Email is used again for password recovery and generic rejection notification when SMTP is configured.

The database-backed authentication service requires the configuration above and must be tested locally before use. Do not use real personal data or production passwords during development.
