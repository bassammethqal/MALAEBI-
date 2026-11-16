require('dotenv').config({ path: 'e:/MALAEBI/backend/.env' });
const { Client } = require('pg');

(async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  try {
    await client.query('BEGIN');
    const occDel = await client.query('DELETE FROM field_occupancies WHERE booking_id IS NOT NULL');
    const bDel = await client.query('DELETE FROM bookings');
    const idemDel = await client.query('DELETE FROM idempotency_keys');
    const notifDel = await client.query("DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE phone LIKE '+96777000001%')");
    await client.query('COMMIT');
    console.log(`Cleaned: ${occDel.rowCount} occupancies, ${bDel.rowCount} bookings, ${idemDel.rowCount} idempotency keys.`);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error cleaning bookings:', e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
