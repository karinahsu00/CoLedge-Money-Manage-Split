# Deployment Guide

This guide explains how to deploy CoLedge to **Render** (server) and **Vercel** (client).

---

## Prerequisites

- A Firebase project with Realtime Database enabled.
- A [Render](https://render.com) account.
- A [Vercel](https://vercel.com) account.

---

## 1 – Server (Render)

### Create a new Web Service

1. Connect your GitHub repository to Render.
2. Set **Root Directory** to `server`.
3. **Build command**: `npm install`
4. **Start command**: `node src/index.js`

### Environment Variables

Set the following env vars under *Environment* in the Render dashboard:

| Variable | Description |
|---|---|
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Firebase service-account client email |
| `FIREBASE_PRIVATE_KEY` | Firebase service-account private key (include newlines) |
| `FIREBASE_DATABASE_URL` | Firebase Realtime Database URL |
| `PORT` | (optional) Port – Render injects this automatically |
| `CORS_ORIGIN` | Your Vercel frontend URL e.g. `https://your-app.vercel.app` |
| `CORS_ORIGINS` | Comma-separated list if you have multiple frontend origins |

> **Tip:** Set at least one of `CORS_ORIGIN` or `CORS_ORIGINS` so the server
> rejects requests from non-allowed origins in production.

---

## 2 – Client (Vercel)

### Create a new Project

1. Import the GitHub repository in Vercel.
2. Set **Root Directory** to `client`.
3. **Build command**: `npm run build`
4. **Output directory**: `build`

### Environment Variables

Set the following env vars under *Settings → Environment Variables* in Vercel:

| Variable | Description |
|---|---|
| `REACT_APP_API_BASE_URL` | Full URL of your Render server **including `/api`**, e.g. `https://your-server.onrender.com/api` |
| `REACT_APP_FIREBASE_API_KEY` | Firebase Web API key |
| `REACT_APP_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `REACT_APP_FIREBASE_PROJECT_ID` | Firebase project ID |
| `REACT_APP_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `REACT_APP_FIREBASE_APP_ID` | Firebase app ID |

> **Note:** `REACT_APP_API_BASE_URL` is baked into the static bundle at build
> time, so you must trigger a new Vercel deployment after changing it.

---

## 3 – Local Development

No environment variables are required for a basic local setup.

```bash
# Terminal 1 – server (listens on port 5002)
cp server/.env.example server/.env   # fill in Firebase credentials
cd server && npm install && npm start

# Terminal 2 – client (listens on port 3000)
cd client && npm install && npm start
```

The client falls back to `http://localhost:5002/api` automatically, and the
server always allows `http://localhost:3000` in non-production mode.

---

## 4 – Manual Test Notes

### Health check (curl)
```bash
# Server root
curl https://your-server.onrender.com/
# Expected: "Welcome to CoLedge API!"

# CORS pre-flight from production origin
curl -I -X OPTIONS https://your-server.onrender.com/api/auth/login \
  -H "Origin: https://your-app.vercel.app" \
  -H "Access-Control-Request-Method: POST"
# Expected: 204 with Access-Control-Allow-Origin matching your frontend URL

# CORS blocked from unknown origin
curl -I -X OPTIONS https://your-server.onrender.com/api/auth/login \
  -H "Origin: https://evil.example.com" \
  -H "Access-Control-Request-Method: POST"
# Expected: 500 (CORS error logged server-side)
```

### Browser smoke-test
1. Navigate to your Vercel URL.
2. Register a new account – should succeed without console CORS errors.
3. Log in with the same credentials – should land on the dashboard.
4. Create a new account/transaction and verify it persists after a page reload.
