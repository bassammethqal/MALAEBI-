import { ConflictException, Injectable, NotFoundException, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { PoolClient } from 'pg';
import { DbService } from './db.service';

@Injectable()
export class PlayerService {
 constructor(private db:DbService) {}
 async listVenues(q:any) {
  const values:any[]=[]; const where=[`v.status='active'`];
  if(q.area_id){values.push(q.area_id);where.push(`v.area_id=$${values.length}`)}
  if(q.q){values.push(`%${String(q.q).slice(0,100)}%`);where.push(`(v.name ILIKE $${values.length} OR COALESCE(v.description,'') ILIKE $${values.length} OR COALESCE(v.address_text,'') ILIKE $${values.length})`)}
  const r=await this.db.query<any>(`SELECT v.id,v.name,v.description,v.address_text,v.status,a.name area,
    (SELECT image_url FROM venue_images vi WHERE vi.venue_id=v.id ORDER BY sort_order LIMIT 1) cover_image_url,
    COALESCE((SELECT json_agg(json_build_object('id', vi.id, 'image_url', vi.image_url, 'sort_order', vi.sort_order)) FROM venue_images vi WHERE vi.venue_id=v.id), '[]'::json) images,
    (SELECT round(avg(rv.rating)::numeric,1) FROM reviews rv JOIN bookings b ON b.id=rv.booking_id JOIN field_occupancies o ON o.booking_id=b.id JOIN fields f ON f.id=o.field_id WHERE f.venue_id=v.id) rating,
    df.id default_field_id,
    df.hourly_price_from,
    COALESCE(df.confirmation_mode,'approval'::confirmation_mode) confirmation_mode,
    COALESCE(df.instant_booking_enabled,false) instant_booking_enabled,
    COALESCE(df.amenities,'[]'::json) amenities
    FROM venues v
    LEFT JOIN areas a ON a.id=v.area_id
    LEFT JOIN LATERAL (
      SELECT f.id,
        (SELECT min(p.price) FROM pricing_rules p WHERE p.field_id=f.id AND p.active) hourly_price_from,
        bs.confirmation_mode,
        bs.instant_booking_enabled,
        (SELECT json_agg(am.name) FROM field_amenities fa JOIN amenities am ON am.id=fa.amenity_id WHERE fa.field_id=f.id) amenities
      FROM fields f
      LEFT JOIN booking_settings bs ON bs.field_id=f.id
      WHERE f.venue_id=v.id AND f.status='active'
      ORDER BY f.created_at
      LIMIT 1
    ) df ON true
    WHERE ${where.join(' AND ')} ORDER BY v.created_at DESC LIMIT 50`,values);
  return {data:r.rows,meta:{page:1,page_size:50,total:r.rowCount||0}};
 }
 async venue(id:string) {
  const r=await this.db.query<any>(`SELECT v.*,a.name area,
    (SELECT image_url FROM venue_images vi WHERE vi.venue_id=v.id ORDER BY sort_order LIMIT 1) cover_image_url,
    COALESCE((SELECT json_agg(json_build_object('id', vi.id, 'image_url', vi.image_url, 'sort_order', vi.sort_order)) FROM venue_images vi WHERE vi.venue_id=v.id), '[]'::json) images
    FROM venues v LEFT JOIN areas a ON a.id=v.area_id WHERE v.id=$1 AND v.status='active'`,[id]);
  if(!r.rowCount) throw new NotFoundException(); return r.rows[0];
 }
 async venueReviews(venueId:string) {
  const summaryRes = await this.db.query<any>(
    `SELECT COALESCE(ROUND(AVG(rv.rating)::numeric, 1), 0)::float AS average_rating,
            COUNT(rv.id)::int AS total_reviews
     FROM reviews rv
     JOIN bookings b ON b.id = rv.booking_id
     WHERE rv.status = 'published'
       AND EXISTS (
         SELECT 1 FROM field_occupancies o
         JOIN fields f ON f.id = o.field_id
         WHERE o.booking_id = b.id AND f.venue_id = $1
       )`,
    [venueId]
  );

  const reviewsRes = await this.db.query<any>(
    `SELECT rv.id, rv.rating, rv.comment, rv.created_at,
            COALESCE(u.full_name, 'لاعب ملاعبي') AS player_name
     FROM reviews rv
     JOIN bookings b ON b.id = rv.booking_id
     LEFT JOIN users u ON u.id = rv.player_user_id
     WHERE rv.status = 'published'
       AND EXISTS (
         SELECT 1 FROM field_occupancies o
         JOIN fields f ON f.id = o.field_id
         WHERE o.booking_id = b.id AND f.venue_id = $1
       )
     ORDER BY rv.created_at DESC
     LIMIT 30`,
    [venueId]
  );

  return {
    average_rating: Number(summaryRes.rows[0]?.average_rating) || 0,
    total_reviews: Number(summaryRes.rows[0]?.total_reviews) || 0,
    reviews: reviewsRes.rows.map(r => ({
      id: r.id,
      rating: Number(r.rating),
      comment: r.comment,
      created_at: r.created_at,
      player_name: r.player_name
    }))
  };
 }
 async fields(venueId:string) {
  const r=await this.db.query<any>(`SELECT f.id,f.venue_id,f.name,f.sport_type,f.capacity,f.surface_type,
   (SELECT min(price) FROM pricing_rules p WHERE p.field_id=f.id AND p.active) hourly_price_from,
   COALESCE(bs.confirmation_mode,'approval'::confirmation_mode) confirmation_mode,
   COALESCE(bs.instant_booking_enabled,false) instant_booking_enabled,
   COALESCE((SELECT json_agg(am.name) FROM field_amenities fa JOIN amenities am ON am.id=fa.amenity_id WHERE fa.field_id=f.id),'[]') amenities
   FROM fields f
   JOIN venues v ON v.id=f.venue_id
   LEFT JOIN booking_settings bs ON bs.field_id=f.id
   WHERE f.venue_id=$1 AND f.status='active' AND v.status='active' ORDER BY f.created_at`,[venueId]);
  return r.rows;
 }
 async availability(fieldId:string,date:string) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new BadRequestException('date must be YYYY-MM-DD');
  const f=await this.db.query<any>(`SELECT f.id FROM fields f JOIN venues v ON v.id=f.venue_id WHERE f.id=$1 AND f.status='active' AND v.status='active'`,[fieldId]);
  if(!f.rowCount) throw new NotFoundException('Field not found');
  const hours=await this.db.query<any>(`SELECT * FROM opening_hours WHERE field_id=$1 AND weekday=EXTRACT(DOW FROM $2::date)::int`,[fieldId,date]);
  if(!hours.rowCount || hours.rows[0].is_closed) return {field_id:fieldId,date,timezone:'Asia/Aden',slots:[]};
  const h=hours.rows[0]; const rules=await this.db.query<any>(`SELECT * FROM pricing_rules WHERE field_id=$1 AND active=true AND (weekday IS NULL OR weekday=EXTRACT(DOW FROM $2::date)::int) ORDER BY priority DESC`,[fieldId,date]);
  const occupied=await this.db.query<any>(`SELECT starts_at,ends_at FROM field_occupancies WHERE field_id=$1 AND status='active' AND starts_at < (($2::date + $3::time) AT TIME ZONE 'Asia/Aden') + interval '1 day' AND ends_at > ($2::date AT TIME ZONE 'Asia/Aden')`,[fieldId,date,h.closes_at]);
  const busy=occupied.rows.map(x=>[new Date(x.starts_at).getTime(),new Date(x.ends_at).getTime()]);
  const slots:any[]=[];
  let cursor=new Date(`${date}T${h.opens_at}+03:00`);
  let close: Date;
  if(String(h.closes_at).startsWith('24:') || String(h.closes_at) === '24:00:00'){
    close = new Date(`${date}T00:00:00+03:00`);
    close.setDate(close.getDate() + 1);
  } else {
    close = new Date(`${date}T${h.closes_at}+03:00`);
  }
  const timeFormatter=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Aden',hour:'2-digit',minute:'2-digit',hour12:false});
  while(cursor.getTime()+3600000<=close.getTime()){
   const end=new Date(cursor.getTime()+3600000); const time=timeFormatter.format(cursor);
   const rule=rules.rows.find(x=>{
     const s=String(x.starts_at).slice(0,5);
     const e=String(x.ends_at).slice(0,5);
     return time>=s && (e==='24:00'||e==='00:00' ? true : time<e);
   });
   const price=rule?Number(rule.price):null; const startMs=cursor.getTime();
   const isBusy=busy.some(([s,e])=>startMs<e&&startMs+3600000>s);
   const isPast=startMs<=Date.now();
   slots.push({starts_at:cursor.toISOString(),ends_at:end.toISOString(),available:!isBusy&&!!price&&!isPast,is_past:isPast,is_booked:isBusy,price,currency:'YER'});
   cursor=end;
  }
  return {field_id:fieldId,date,timezone:'Asia/Aden',slots};
 }
 async createBooking(userId:string,dto:any,key:string) {
  if(!key || key.length<8 || key.length>128) throw new BadRequestException('Idempotency-Key header is required');
  const requestHash=createHash('sha256').update(JSON.stringify({field_id:dto.field_id,starts_at:dto.starts_at,player_note:dto.player_note||''})).digest('hex');
  let result: any;
  try {
   result = await this.db.tx(async c=>{
    await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[userId+':'+key]);
    const old=await c.query<any>('SELECT request_hash,response_json FROM idempotency_keys WHERE user_id=$1 AND key=$2 FOR UPDATE',[userId,key]);
    if(old.rowCount){if(old.rows[0].request_hash!==requestHash) throw new ConflictException('Idempotency key reused with different request'); if(old.rows[0].response_json) return old.rows[0].response_json;}
    else await c.query('INSERT INTO idempotency_keys(user_id,key,request_hash) VALUES($1,$2,$3)',[userId,key,requestHash]);
    const start=new Date(dto.starts_at); if(!Number.isFinite(start.getTime()) || start.getTime()<=Date.now()) throw new BadRequestException('Booking start must be in the future');
    const field=await c.query<any>(`SELECT f.id,f.venue_id,COALESCE(bs.confirmation_mode,'approval'::confirmation_mode) confirmation_mode,COALESCE(bs.instant_booking_enabled,false) instant_booking_enabled,COALESCE(bs.deposit_enabled,false) deposit_enabled
      FROM fields f JOIN venues v ON v.id=f.venue_id LEFT JOIN booking_settings bs ON bs.field_id=f.id
      WHERE f.id=$1 AND f.status='active' AND v.status='active' FOR UPDATE OF f`,[dto.field_id]);
    if(!field.rowCount) throw new NotFoundException('Field unavailable');
    const local=await c.query<any>(`SELECT EXTRACT(DOW FROM $1::timestamptz AT TIME ZONE 'Asia/Aden')::int weekday,($1::timestamptz AT TIME ZONE 'Asia/Aden')::time local_time`,[start.toISOString()]);
    const day=local.rows[0];
    const opening=await c.query<any>(`SELECT 1 FROM opening_hours 
      WHERE field_id=$1 AND weekday=$2 AND is_closed=false 
        AND opens_at <= $3::time 
        AND (
          CASE 
            WHEN $3::time >= '23:00:00'::time THEN closes_at = '24:00:00'::time
            ELSE closes_at >= ($3::time + interval '60 minutes')
          END
        )`,[dto.field_id,day.weekday,day.local_time]);
    if(!opening.rowCount) throw new ConflictException('Field closed at selected time');
    const price=await c.query<any>(`SELECT price,currency FROM pricing_rules 
      WHERE field_id=$1 AND active=true AND (weekday IS NULL OR weekday=$2) 
        AND starts_at <= $3::time 
        AND (
          CASE 
            WHEN $3::time >= '23:00:00'::time THEN (ends_at = '24:00:00'::time OR ends_at = '00:00:00'::time)
            ELSE ends_at >= ($3::time + interval '60 minutes')
          END
        ) 
      ORDER BY priority DESC LIMIT 1`,[dto.field_id,day.weekday,day.local_time]);
    if(!price.rowCount) throw new ConflictException('No price configured for selected time');
    const settings=field.rows[0]; if(settings.deposit_enabled) throw new ServiceUnavailableException('العربون الإلكتروني غير متاح حالياً؛ لا يمكن إتمام حجز يتطلب عربوناً حتى ربط مزود الدفع.'); const instant=settings.confirmation_mode==='instant' && settings.instant_booking_enabled===true;
    const status=instant?'confirmed':'pending'; const minutes=instant?null:10;
    const total=Number(price.rows[0].price);
    const b=await c.query<any>(`INSERT INTO bookings(booking_no,player_user_id,status,source,duration_minutes,total_price,currency,deposit_required,deposit_paid,remaining_amount,price_snapshot,policy_snapshot,confirmation_snapshot,expires_at,confirmed_at)
      VALUES($1,$2,$3::booking_status,'app',60,$4,$5,0,0,$4,$6::jsonb,$7::jsonb,$8::jsonb,CASE WHEN $9::int IS NULL THEN NULL ELSE now()+($9 || ' minutes')::interval END,CASE WHEN $3::text='confirmed' THEN now() ELSE NULL END)
      RETURNING id,booking_no,status,total_price,currency,duration_minutes,expires_at,created_at`,['MLB-'+Date.now().toString(36).toUpperCase()+'-'+randomUUID().slice(0,4).toUpperCase(),userId,status,total,price.rows[0].currency,JSON.stringify({price:total,currency:price.rows[0].currency}),JSON.stringify({cancellation_cutoff_hours:6}),JSON.stringify({confirmation_mode:settings.confirmation_mode}),minutes===null?null:String(minutes)]);
    const end=new Date(start.getTime()+3600000);
    await c.query(`INSERT INTO field_occupancies(field_id,starts_at,ends_at,occupancy_type,status,booking_id) VALUES($1,$2,$3,'booking','active',$4)`,[dto.field_id,start.toISOString(),end.toISOString(),b.rows[0].id]);
    const result={...b.rows[0],field_id:dto.field_id,venue_id:settings.venue_id,starts_at:start.toISOString(),ends_at:end.toISOString(),deposit_required:0,deposit_paid:0,remaining_amount:total};

    await c.query('UPDATE idempotency_keys SET response_json=$3::jsonb WHERE user_id=$1 AND key=$2',[userId,key,JSON.stringify(result)]);
    return result;
   });
  } catch(e:any) { if(e.code==='23P01'||e.code==='23505') throw new ConflictException('The selected time is no longer available'); throw e; }

  try {
    const isConfirmed = result?.status === 'confirmed';
    const notifTitle = isConfirmed ? 'تم تأكيد حجزك بنجاح ⚽' : 'طلب الحجز قيد المراجعة ⏳';
    const notifBody = isConfirmed
      ? `تم تأكيد حجزك رقم ${result?.booking_no} بمبلغ ${result?.total_price} ريال بنجاح.`
      : `تم استلام طلب حجزك رقم ${result?.booking_no} وهو بانتظار موافقة إدارة المنشأة.`;
    await this.db.query(
      `INSERT INTO notifications(user_id, channel, title, body, status, sent_at)
       VALUES ($1, 'in_app', $2, $3, 'sent', now())`,
      [userId, notifTitle, notifBody]
    );
  } catch (notifErr) {
    console.warn('Failed to insert booking notification:', notifErr);
  }

  return result;
 }
 async myBookings(userId:string) {
  const r=await this.db.query<any>(`SELECT b.id,b.booking_no,b.status,b.total_price,b.currency,b.duration_minutes,b.expires_at,b.created_at,
    o.field_id,o.starts_at,o.ends_at,f.venue_id,v.name venue_name,f.name field_name
    FROM bookings b JOIN field_occupancies o ON o.booking_id=b.id JOIN fields f ON f.id=o.field_id JOIN venues v ON v.id=f.venue_id
    WHERE b.player_user_id=$1 ORDER BY b.created_at DESC LIMIT 100`,[userId]); return r.rows;
 }

 async bookingDetail(userId:string,bookingId:string) {
  const r=await this.db.query<any>(`SELECT b.id,b.booking_no,b.status,b.total_price,b.currency,b.duration_minutes,b.deposit_required,b.deposit_paid,b.remaining_amount,b.expires_at,b.created_at,b.cancelled_at,o.field_id,o.starts_at,o.ends_at,f.name field_name,v.id venue_id,v.name venue_name
   FROM bookings b JOIN field_occupancies o ON o.booking_id=b.id JOIN fields f ON f.id=o.field_id JOIN venues v ON v.id=f.venue_id
   WHERE b.id=$1 AND b.player_user_id=$2`,[bookingId,userId]);
  if(!r.rowCount) throw new NotFoundException('Booking not found'); return r.rows[0];
 }
 async cancelBooking(userId:string,bookingId:string) {
  const cancelRes = await this.db.tx(async c=>{
   const r=await c.query<any>(`SELECT b.id,b.status,b.total_price,b.deposit_paid,o.starts_at,o.id occupancy_id
    FROM bookings b JOIN field_occupancies o ON o.booking_id=b.id
    WHERE b.id=$1 AND b.player_user_id=$2 FOR UPDATE OF b,o`,[bookingId,userId]);
   if(!r.rowCount) throw new NotFoundException('Booking not found');
   const b=r.rows[0];
   if(!['held','pending','confirmed'].includes(b.status)) throw new BadRequestException('This booking cannot be cancelled in its current status');
   if(new Date(b.starts_at).getTime()<=Date.now()) throw new BadRequestException('A booking cannot be cancelled after its start time');
   const eligible=new Date(b.starts_at).getTime()-Date.now()>=6*60*60*1000;
   await c.query(`UPDATE bookings SET status='cancelled',cancelled_at=now(),cancelled_by_user_id=$2,cancellation_actor_type='player',cancellation_reason='Player cancellation',updated_at=now() WHERE id=$1`,[bookingId,userId]);
   await c.query(`UPDATE field_occupancies SET status='released' WHERE id=$1`,[b.occupancy_id]);

   return {success:true,booking_id:bookingId,cancellation_refund_eligible:eligible,refund_status:Number(b.deposit_paid)>0?(eligible?'manual_review_required':'not_eligible_under_6h'):'not_applicable',policy:'Player cancellation is free 6 hours or more before start. Within 6 hours, no automatic deposit refund.'};
  });

  try {
    await this.db.query(
      `INSERT INTO notifications(user_id, channel, title, body, status, sent_at)
       VALUES ($1, 'in_app', 'تم إلغاء الحجز ❌', 'تم إلغاء حجزك بنجاح وفق سياسة الإلغاء المعتمدة.', 'sent', now())`,
      [userId]
    );
  } catch (notifErr) {
    console.warn('Failed to insert cancellation notification:', notifErr);
  }

  return cancelRes;
 }
 async createReview(userId:string,bookingId:string,rating:number,comment?:string) {
  const r=await this.db.query<any>(`SELECT id FROM bookings WHERE id=$1 AND player_user_id=$2 AND status='completed'`,[bookingId,userId]);
  if(!r.rowCount) throw new BadRequestException('Only completed bookings can be reviewed');
  try {
   const created=await this.db.query<any>(`INSERT INTO reviews(booking_id,player_user_id,rating,comment) VALUES($1,$2,$3,$4) RETURNING id,booking_id,rating,comment,status,created_at`,[bookingId,userId,rating,comment||null]);
   return created.rows[0];
  } catch(e:any) { if(e.code==='23505') throw new ConflictException('A review already exists for this booking'); throw e; }
 }

 async notifications(userId:string) {
  const r=await this.db.query<any>(`SELECT id,channel,title,body,status,created_at,read_at FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`,[userId]);
  return r.rows;
 }

 async markNotificationsRead(userId: string) {
  await this.db.query(
    `UPDATE notifications SET read_at = now(), status = 'read' WHERE user_id = $1 AND (read_at IS NULL OR status != 'read')`,
    [userId]
  );
  return { success: true };
 }
}
