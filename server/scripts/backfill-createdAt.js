/**
 * One-time migration: backfill createdAt for transactions that don't have it.
 *
 * Usage:
 *   cd server
 *   node scripts/backfill-createdAt.js
 *
 * Notes:
 * - Requires firebase-admin credentials already configured in src/config/firebase.js
 * - Only updates records missing createdAt
 */

const admin = require('../src/config/firebase');
const db = admin.database();

function toIsoAtMidnight(dateStr) {
  // dateStr = 'YYYY-MM-DD'
  if (!dateStr || typeof dateStr !== 'string' || dateStr.length < 10) {
    return new Date(0).toISOString(); // fallback, very old
  }
  // Use UTC midnight to avoid timezone surprises
  return new Date(`${dateStr}T00:00:00.000Z`).toISOString();
}

async function main() {
  const usersSnap = await db.ref('users').once('value');
  if (!usersSnap.exists()) {
    console.log('No users found under /users');
    return;
  }

  const users = usersSnap.val();
  const userIds = Object.keys(users);

  let updated = 0;
  let scanned = 0;

  for (const userId of userIds) {
    const txRef = db.ref(`users/${userId}/transactions`);
    const txSnap = await txRef.once('value');
    if (!txSnap.exists()) continue;

    const txsObj = txSnap.val();
    const txIds = Object.keys(txsObj);

    // Group by date for stable ordering within the same day
    const byDate = new Map(); // dateStr -> [{id, tx}]
    for (const txId of txIds) {
      const tx = txsObj[txId];
      scanned += 1;

      if (!tx || tx.createdAt) continue;

      const dateKey = tx.date || '1970-01-01';
      if (!byDate.has(dateKey)) byDate.set(dateKey, []);
      byDate.get(dateKey).push({ id: txId, tx });
    }

    // For each date group, sort deterministically and assign createdAt with +N seconds
    const updates = {};
    for (const [dateKey, list] of byDate.entries()) {
      list.sort((a, b) => {
        // Stable ordering: amount -> category -> id
        const aa = Number(a.tx?.amount || 0);
        const bb = Number(b.tx?.amount || 0);
        if (aa !== bb) return aa - bb;

        const ac = String(a.tx?.category || '');
        const bc = String(b.tx?.category || '');
        if (ac !== bc) return ac.localeCompare(bc);

        return String(a.id).localeCompare(String(b.id));
      });

      const baseIso = toIsoAtMidnight(dateKey);
      const baseMs = new Date(baseIso).getTime();

      list.forEach((item, idx) => {
        const createdAt = new Date(baseMs + idx * 1000).toISOString(); // +1s each
        updates[`${item.id}/createdAt`] = createdAt;
      });
    }

    const count = Object.keys(updates).length;
    if (count > 0) {
      await txRef.update(updates);
      updated += count;
      console.log(`User ${userId}: backfilled createdAt for ${count} transactions`);
    }
  }

  console.log(`Done. Scanned ${scanned} transactions, updated ${updated}.`);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});