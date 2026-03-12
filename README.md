# CoLedge-Money-Manage-Split
Collaborate, Track, Settle — Smarter Together.  The shared expense and splitting app designed for couples, family, and friends. Say goodbye to basic budgeting, and hello to simple, collaborative financial management.

## Server Setup

Copy `server/.env.example` to `server/.env` and fill in your Firebase credentials before starting the server.

```bash
cd server
cp .env.example .env   # then edit .env with your values
npm start
```

## Maintenance Scripts

### Recompute Account Balances

If account balances get out of sync with the transaction history, run:

```bash
cd server
node scripts/recompute-balances.js <uid>
```

- `<uid>` is the Firebase user ID whose balances you want to recompute.
- The script automatically loads credentials from `server/.env` regardless of the working directory.
- Balances are recalculated from each account's `initialBalance` by replaying all transactions in chronological order, then written back to the database.

