const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  const b = await client.query("SELECT id, player_user_id FROM bookings WHERE status = 'confirmed' AND player_user_id IS NOT NULL LIMIT 4");
  const comments = [
    'ملعب ممتاز جداً وأرضية العشب ممتازة والإنارة واضحة. تجربة رائعة وأنصح به!',
    'تعامل راقي وتنظيم ممتاز، المواعيد منضبطة بالدقيقة والمشرف متعاون جداً.',
    'الملعب نظيف والخدمات متوفرة ومواقف السيارات مريحة، نكرر التجربة أسبوعياً بإذن الله.',
    'أرضية جديدة وعالية الجودة والتهوية ممتازة، قضينا مباراة حماسية وممتعة.'
  ];
  for (let i = 0; i < b.rows.length; i++) {
    const row = b.rows[i];
    await client.query(
      `INSERT INTO reviews (booking_id, player_user_id, rating, comment, status)
       VALUES ($1, $2, $3, $4, 'published')
       ON CONFLICT (booking_id) DO NOTHING`,
      [row.id, row.player_user_id, 5 - (i % 2), comments[i % comments.length]]
    );
  }
  const r = await client.query('SELECT count(*) FROM reviews');
  console.log('Total reviews in DB:', r.rows[0].count);
  await client.end();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
