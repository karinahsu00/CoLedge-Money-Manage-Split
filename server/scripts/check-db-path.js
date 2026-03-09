const admin = require('../src/config/firebase');
const db = admin.database();

async function main() {
  const usersSnap = await db.ref('users').limitToFirst(1).once('value');
  console.log('Has /users ?', usersSnap.exists());

  if (!usersSnap.exists()) return;

  const users = usersSnap.val();
  const firstUserId = Object.keys(users)[0];
  console.log('Example uid:', firstUserId);

  const txSnap = await db.ref(`users/${firstUserId}/transactions`).limitToFirst(3).once('value');
  console.log(`Has /users/${firstUserId}/transactions ?`, txSnap.exists());

  if (txSnap.exists()) {
    const txs = txSnap.val();
    const ids = Object.keys(txs);
    console.log('Sample tx ids:', ids);
    const firstTx = txs[ids[0]];
    console.log('Sample tx object keys:', Object.keys(firstTx || {}));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});