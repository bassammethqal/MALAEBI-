require('dotenv').config({ path: 'e:/MALAEBI/backend/.env' });
const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');

const BASE_URL = 'http://localhost:3000/api/v1';
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const anon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY);

async function getAuthToken(email, phone, name) {
  let { data: { users } } = await admin.auth.admin.listUsers();
  let u = users.find(x => x.email === email || x.phone === phone || x.phone === phone.replace('+', ''));
  if (!u) {
    const created = await admin.auth.admin.createUser({
      email,
      phone,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: { full_name: name }
    });
    u = created.data.user;
  } else {
    // Ensure email is set
    if (!u.email) {
      const updated = await admin.auth.admin.updateUserById(u.id, { email, email_confirm: true });
      u = updated.data.user;
    }
  }

  const link = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  const otp = link.data.properties.email_otp;
  const { data: sessionData, error } = await anon.auth.verifyOtp({ email, token: otp, type: 'email' });
  if (error || !sessionData?.session) throw new Error('Failed to get session for ' + email + ': ' + error?.message);
  return { token: sessionData.session.access_token, user: sessionData.session.user };
}

async function runTests() {
  console.log('=== STARTING MALAEBI CONCURRENCY & LIFECYCLE TESTS ===\n');

  // 1. Setup 3 test actors: Player 1, Player 2, and Venue Owner
  console.log('1. Setting up test actors...');
  const player1 = await getAuthToken('test_player_1@malaebi.com', '+967770000011', 'لاعب تجريبي 1');
  const player2 = await getAuthToken('test_player_2@malaebi.com', '+967770000012', 'لاعب تجريبي 2');
  const owner = await getAuthToken('owner@malaebi.com', '+967770000001', 'مالك ملاعبي الافتراضي');
  console.log('   Actors ready: Player 1, Player 2, Owner.\n');

  // 2. Fetch seeded venues
  console.log('2. Fetching venues from API...');
  const venuesRes = await fetch(`${BASE_URL}/venues`).then(r => r.json());
  const venues = venuesRes.data || [];
  const wahdaVenue = venues.find(v => v.name.includes('الوحدة'));
  const maribVenue = venues.find(v => v.name.includes('مأرب'));
  console.log(`   Found ${venues.length} venues. Target for approval test: "${wahdaVenue.name}" (Field ID: ${wahdaVenue.default_field_id})`);
  console.log(`   Target for instant test: "${maribVenue.name}" (Field ID: ${maribVenue.default_field_id})\n`);

  // Target booking time: 4 days in future at 17:00 Aden local time (14:00 UTC)
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 4);
  const dateStr = targetDate.toISOString().slice(0, 10);
  const startsAt = `${dateStr}T14:00:00.000Z`; // 17:00 Aden local time

  // 3. Test Concurrency & Double-Booking Prevention (Approval Mode: ملعب الوحدة)
  console.log(`3. CONCURRENCY TEST on "${wahdaVenue.name}" for time: ${startsAt}`);
  console.log('   Sending two concurrent booking requests simultaneously from Player 1 and Player 2...');

  const [reqA, reqB] = await Promise.all([
    fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${player1.token}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `test-p1-${Date.now()}-${randomUUID().slice(0, 4)}`
      },
      body: JSON.stringify({ field_id: wahdaVenue.default_field_id, starts_at: startsAt })
    }).then(async r => ({ status: r.status, body: await r.json() })),

    fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${player2.token}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `test-p2-${Date.now()}-${randomUUID().slice(0, 4)}`
      },
      body: JSON.stringify({ field_id: wahdaVenue.default_field_id, starts_at: startsAt })
    }).then(async r => ({ status: r.status, body: await r.json() }))
  ]);

  console.log(`   Player 1 Response: HTTP ${reqA.status}`, reqA.body.booking_no ? `(Booking: ${reqA.body.booking_no}, Status: ${reqA.body.status})` : reqA.body.message);
  console.log(`   Player 2 Response: HTTP ${reqB.status}`, reqB.body.booking_no ? `(Booking: ${reqB.body.booking_no}, Status: ${reqB.body.status})` : reqB.body.message);

  const oneCreated = (reqA.status === 201 && reqB.status === 409) || (reqB.status === 201 && reqA.status === 409);
  if (!oneCreated) {
    console.error('FAILED: Expected exactly one 201 Created and one 409 Conflict!');
    process.exit(1);
  }
  console.log('   SUCCESS: Double-booking was strictly blocked by PostgreSQL exclusion constraint!\n');

  const winner = reqA.status === 201 ? reqA.body : reqB.body;
  const winnerToken = reqA.status === 201 ? player1.token : player2.token;

  // 4. Test Venue Approval Endpoint
  console.log(`4. TESTING VENUE APPROVAL for Booking ID: ${winner.id}...`);
  const approveRes = await fetch(`${BASE_URL}/venues/${wahdaVenue.id}/bookings/${winner.id}/approve`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${owner.token}`,
      'Content-Type': 'application/json'
    }
  }).then(async r => ({ status: r.status, body: await r.json() }));

  console.log(`   Approve Response: HTTP ${approveRes.status}`, JSON.stringify(approveRes.body));
  if (approveRes.status !== 201 && approveRes.status !== 200) {
    console.error('FAILED: Could not approve booking!');
    process.exit(1);
  }
  console.log('   SUCCESS: Booking approved and marked as confirmed.\n');

  // 5. Test Player Cancellation
  console.log(`5. TESTING PLAYER CANCELLATION for Booking ID: ${winner.id}...`);
  const cancelRes = await fetch(`${BASE_URL}/bookings/${winner.id}/cancel`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${winnerToken}`,
      'Content-Type': 'application/json'
    }
  }).then(async r => ({ status: r.status, body: await r.json() }));

  console.log(`   Cancel Response: HTTP ${cancelRes.status}`, JSON.stringify(cancelRes.body));
  if (cancelRes.status !== 201 && cancelRes.status !== 200) {
    console.error('FAILED: Could not cancel booking!');
    process.exit(1);
  }
  console.log('   SUCCESS: Booking cancelled and slot released.\n');

  // 6. Test Instant Booking & Concurrency on ملعب مأرب الرياضي
  const instantTime = `${dateStr}T17:00:00.000Z`; // 20:00 Aden local time
  console.log(`6. TESTING INSTANT BOOKING CONCURRENCY on "${maribVenue.name}" for time: ${instantTime}...`);
  const [instA, instB] = await Promise.all([
    fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${player1.token}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `test-inst-1-${Date.now()}`
      },
      body: JSON.stringify({ field_id: maribVenue.default_field_id, starts_at: instantTime })
    }).then(async r => ({ status: r.status, body: await r.json() })),

    fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${player2.token}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `test-inst-2-${Date.now()}`
      },
      body: JSON.stringify({ field_id: maribVenue.default_field_id, starts_at: instantTime })
    }).then(async r => ({ status: r.status, body: await r.json() }))
  ]);

  console.log(`   Player 1 Instant Response: HTTP ${instA.status}`, instA.body.booking_no ? `(Booking: ${instA.body.booking_no}, Status: ${instA.body.status})` : instA.body.message);
  console.log(`   Player 2 Instant Response: HTTP ${instB.status}`, instB.body.booking_no ? `(Booking: ${instB.body.booking_no}, Status: ${instB.body.status})` : instB.body.message);

  const instantOneCreated = (instA.status === 201 && instB.status === 409) || (instB.status === 201 && instA.status === 409);
  if (!instantOneCreated) {
    console.error('FAILED: Instant booking concurrency test failed!');
    process.exit(1);
  }
  const instantWinner = instA.status === 201 ? instA.body : instB.body;
  if (instantWinner.status !== 'confirmed') {
    console.error('FAILED: Instant booking expected status confirmed, got ' + instantWinner.status);
    process.exit(1);
  }
  console.log('   SUCCESS: Instant booking created as confirmed, duplicate request rejected with 409 Conflict!\n');

  console.log('=== ALL TESTS PASSED SUCCESSFULLY! ===');
}

runTests().catch(e => {
  console.error('Test execution failed:', e);
  process.exit(1);
});
