/**
 * migrate-fx.js  —  server/migrate-fx.js
 *
 * One-time migration: backfill fxRateToUSD for every account that is
 * missing the field, has it set to null, or has it incorrectly set to 1
 * for a non-USD currency (legacy 1:1 bug).
 *
 * Usage (from the server/ directory):
 *   node migrate-fx.js
 *
 * Dry-run (preview only, no writes):
 *   DRY_RUN=true node migrate-fx.js
 */

'use strict';

// ─── Path note ────────────────────────────────────────────────────────────────
// This script lives at server/migrate-fx.js
// firebase config  →  server/src/config/firebase  (one level deeper)
// fxHelper         →  server/src/utils/fxHelper    (one level deeper)
const admin    = require('./src/config/firebase');
const { getRate } = require('./src/utils/fxHelper');

const db       = admin.database();
const DRY_RUN  = process.env.DRY_RUN === 'true';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns true when the stored fxRateToUSD is clearly wrong and needs updating.
 * Conditions:
 *   - field is missing / null / 0 / NaN
 *   - currency is non-USD but rate is exactly 1  (classic 1:1 bug)
 */
const needsUpdate = (currency, storedRate) => {
  const rate = Number(storedRate);
  if (!Number.isFinite(rate) || rate <= 0) return true;      // missing or invalid
  if (currency !== 'USD' && currency !== 'TWD' && rate === 1) return true;  // 1:1 bug
  // NTD is aliased to TWD; also check TWD
  if ((currency === 'NTD' || currency === 'TWD') && rate === 1) return true;
  return false;
};

// ─── Main ─────────────────────────────────────────────────────────────────────

(async () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║        CoLedge — FX Rate Migration Script        ║');
  console.log('╚══════════════════════════════════════════════════╝');
  if (DRY_RUN) {
    console.log('⚠️  DRY RUN mode — no data will be written\n');
  }

  // 1. Read all users
  const usersSnap = await db.ref('users').once('value');
  if (!usersSnap.exists()) {
    console.log('ℹ️  No users found in database. Exiting.');
    process.exit(0);
  }

  const users     = usersSnap.val();
  const userIds   = Object.keys(users);
  console.log(`👥 Found ${userIds.length} user(s)\n`);

  let totalAccounts = 0;
  let updatedCount  = 0;
  let skippedCount  = 0;
  let errorCount    = 0;

  for (const userId of userIds) {
    const accountsSnap = await db.ref(`users/${userId}/accounts`).once('value');
    if (!accountsSnap.exists()) continue;

    const accounts = Object.values(accountsSnap.val());
    console.log(`─── User: ${userId}  (${accounts.length} account(s)) ───`);
    totalAccounts += accounts.length;

    for (const account of accounts) {
      const { id, name, currency = 'USD', fxRateToUSD } = account;

      // 2. Decide whether this account needs updating
      if (!needsUpdate(currency, fxRateToUSD)) {
        console.log(`  ✅  ${name} (${currency})  →  ${Number(fxRateToUSD).toFixed(6)} USD  [already correct, skipped]`);
        skippedCount++;
        continue;
      }

      // 3. Resolve correct rate
      let newRate;
      if (currency === 'USD') {
        newRate = 1;
      } else {
        try {
          newRate = await getRate(currency, 'USD');
        } catch (err) {
          console.error(`  ❌  ${name} (${currency})  →  FX lookup failed: ${err.message}`);
          errorCount++;
          continue;
        }
      }

      // 4. Write back to Firebase
      if (!DRY_RUN) {
        await db.ref(`users/${userId}/accounts/${id}/fxRateToUSD`).set(newRate);
      }

      const tag = DRY_RUN ? '[DRY RUN — not written]' : '[updated ✓]';
      console.log(`  🔄  ${name} (${currency})  →  ${newRate.toFixed(6)} USD  ${tag}`);
      updatedCount++;
    }

    console.log('');
  }

  // 5. Summary
  console.log('══════════════════════════════════════════════════');
  console.log(`📊 Summary`);
  console.log(`   Total accounts : ${totalAccounts}`);
  console.log(`   Updated        : ${updatedCount}`);
  console.log(`   Skipped        : ${skippedCount}`);
  console.log(`   Errors         : ${errorCount}`);
  console.log('══════════════════════════════════════════════════');

  if (errorCount > 0) {
    console.log('\n⚠️  Some accounts could not be updated. Check the errors above.');
    console.log('   You can re-run the script — already-correct accounts will be skipped.\n');
  } else if (DRY_RUN) {
    console.log('\n✅  Dry run complete. Re-run without DRY_RUN=true to apply changes.\n');
  } else {
    console.log('\n✅  Migration complete. All accounts now have correct fxRateToUSD.\n');
  }

  process.exit(errorCount > 0 ? 1 : 0);
})();
