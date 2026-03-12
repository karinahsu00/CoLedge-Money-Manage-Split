/**
 * Recompute account balances for a single user from their transaction history.
 *
 * Usage (run from anywhere):
 *   node server/scripts/recompute-balances.js <uid>
 *   # or from the server/ directory:
 *   node scripts/recompute-balances.js <uid>
 *
 * Reads credentials from server/.env (resolved relative to this script).
 */

const path = require('path');

// Load server/.env regardless of the working directory
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const admin = require('../src/config/firebase');
const db = admin.database();

const uid = process.argv[2];

if (!uid) {
  console.error('Usage: node scripts/recompute-balances.js <uid>');
  process.exit(1);
}

/**
 * Return a stable sort key for a transaction so that ordering is
 * deterministic: primary date, secondary createdAt, tertiary id.
 */
function sortKey(tx, id) {
  const date = tx.date || '1970-01-01';
  const createdAt = tx.createdAt || '1970-01-01T00:00:00.000Z';
  return `${date}|${createdAt}|${id}`;
}

async function main() {
  // Fetch accounts
  const accountsSnap = await db.ref(`users/${uid}/accounts`).once('value');
  if (!accountsSnap.exists()) {
    console.log(`No accounts found for user ${uid}.`);
    process.exit(0);
  }
  const accountsObj = accountsSnap.val();

  // Fetch transactions
  const txSnap = await db.ref(`users/${uid}/transactions`).once('value');
  const txObj = txSnap.exists() ? txSnap.val() : {};

  // Build map: accountId -> running balance (start from initialBalance)
  const balances = {};
  for (const [accountId, account] of Object.entries(accountsObj)) {
    balances[accountId] = Number(account.initialBalance ?? 0);
  }

  // Sort transactions in stable order
  const txEntries = Object.entries(txObj).sort(([idA, txA], [idB, txB]) =>
    sortKey(txA, idA).localeCompare(sortKey(txB, idB))
  );

  // Apply each transaction to the relevant account balance(s)
  for (const [txId, tx] of txEntries) {
    const type = tx.type;

    if (type === 'income') {
      const accountId = tx.accountId;
      if (!accountId || balances[accountId] === undefined) {
        console.warn(`  Skipping income tx ${txId}: accountId "${accountId}" not found`);
        continue;
      }
      const amount = Number(tx.amount);
      if (!isFinite(amount)) {
        console.warn(`  Skipping income tx ${txId}: invalid amount`);
        continue;
      }
      balances[accountId] += amount;

    } else if (type === 'expense') {
      const accountId = tx.accountId;
      if (!accountId || balances[accountId] === undefined) {
        console.warn(`  Skipping expense tx ${txId}: accountId "${accountId}" not found`);
        continue;
      }
      const amount = Number(tx.amount);
      if (!isFinite(amount)) {
        console.warn(`  Skipping expense tx ${txId}: invalid amount`);
        continue;
      }
      balances[accountId] -= amount;

    } else if (type === 'transfer') {
      const fromId = tx.accountId;
      const toId = tx.accountToId;

      // fromAmount / toAmount are the local-currency amounts for each side.
      // Fall back to amount on both sides for older records that lack these fields.
      const fromAmount = tx.fromAmount !== undefined ? Number(tx.fromAmount) : Number(tx.amount);
      const toAmount   = tx.toAmount   !== undefined ? Number(tx.toAmount)   : Number(tx.amount);

      if (!isFinite(fromAmount) || !isFinite(toAmount)) {
        console.warn(`  Skipping transfer tx ${txId}: fromAmount/toAmount are missing or invalid (fromAmount=${tx.fromAmount}, toAmount=${tx.toAmount}, amount=${tx.amount})`);
        continue;
      }

      if (fromId && balances[fromId] !== undefined) {
        balances[fromId] -= fromAmount;
      }
      if (toId && balances[toId] !== undefined) {
        balances[toId] += toAmount;
      }

    } else {
      // Unknown type – skip
      console.warn(`  Skipping tx ${txId}: unknown type "${type}"`);
    }
  }

  // Write recomputed balances back to RTDB
  let updatedCount = 0;
  for (const [accountId, newBalance] of Object.entries(balances)) {
    await db.ref(`users/${uid}/accounts/${accountId}/balance`).set(newBalance);
    updatedCount += 1;
  }

  console.log(`✅ Recomputed balances for user ${uid}. Updated ${updatedCount} accounts.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Error recomputing balances:', err);
  process.exit(1);
});
