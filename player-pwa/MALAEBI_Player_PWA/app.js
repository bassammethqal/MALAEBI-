/* MALAEBI Player PWA — واجهة اللاعب. البيانات المعروضة تجريبية حتى ربط API الفعلي. */
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const CONFIG = window.MALAEBI_CONFIG || {API_BASE_URL:'',DEMO_MODE:true};
const photos = {
  a:'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1000&q=85',
  b:'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1000&q=85',
  c:'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=1000&q=85'
};
const venues = [
 {id:'venue-marib-01',name:'ملعب مأرب الرياضي',area:'حي الجامعة، مدينة مأرب',price:7000,rating:4.8,reviews:36,photo:photos.a,features:['عشب صناعي','إضاءة ليلية','مواقف سيارات'],description:'ملعب كرة قدم بعشب صناعي ومرافق مناسبة للمباريات الودية والتدريبات. تتوفر إضاءة للمباريات المسائية ومواقف للسيارات.',mode:'instant',deposit:0},
 {id:'venue-marib-02',name:'ملعب الوحدة',area:'شارع صنعاء، مدينة مأرب',price:6000,rating:4.6,reviews:24,photo:photos.b,features:['عشب صناعي','غرف تبديل','دورات مياه'],description:'مساحة لعب مريحة مناسبة للأصدقاء والفرق الصغيرة، مع مرافق أساسية وخيارات متعددة للمواعيد.',mode:'approval',deposit:0},
 {id:'venue-marib-03',name:'ملعب الأبطال',area:'المجمع، مدينة مأرب',price:9000,rating:4.9,reviews:51,photo:photos.c,features:['عشب صناعي','إضاءة ليلية','مواقف سيارات','دورات مياه'],description:'ملعب مجهز للمباريات التنافسية، مع أرضية جيدة وإضاءة ليلية ومرافق مساندة.',mode:'instant',deposit:0}
];
const times=['16:00','17:00','18:00','19:00','20:00','21:00','22:00'];
const state={page:'home',venue:null,date:new Date(),time:null,sort:'recommended',price:15000,query:'',filter:'all',favoriteIds:new Set(JSON.parse(localStorage.getItem('malaebi_favorites')||'[]')),bookings:JSON.parse(localStorage.getItem('malaebi_demo_bookings')||'[]'),phone:localStorage.getItem('malaebi_phone')||'',bookingTab:'all',remoteVenues:null,availableSlots:[],selectedBookingId:null};
const money=n=>new Intl.NumberFormat('ar-YE').format(n)+' ريال';
const dateISO=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const dateLabel=d=>new Intl.DateTimeFormat('ar-YE',{weekday:'long',day:'numeric',month:'long'}).format(d);
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2600)}
function showPage(name){
  state.page=name;
  $$('.page').forEach(p=>p.classList.toggle('active',p.dataset.page===name));
  $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.go===name));
  const authFlows=['splash','onboarding','login','otp'];
  const isAuth=authFlows.includes(name);
  const topbar=$('.topbar');
  const bottomNav=$('.bottom-nav');
  if(topbar) topbar.style.display=isAuth?'none':'flex';
  if(bottomNav) bottomNav.style.display=isAuth?'none':'flex';
  const shell=$('.app-shell');
  if(shell) shell.classList.toggle('auth-flow',isAuth);
  window.location.hash=name;
  window.scrollTo({top:0,behavior:'smooth'});
  if(name==='search')renderSearch();
  if(name==='bookings'){if(window.MalaebiAPI?.enabled()&&sessionStorage.getItem('malaebi_access_token'))loadMyBookings();else renderBookings();}
  if(name==='account')renderAccount();
  if(name==='booking-detail')renderBookingDetail();
  if(name==='payment')$('#paymentAmount').textContent=state.venue?money(state.venue.price):'—';
}
function venueCard(v){const saved=state.favoriteIds.has(v.id);return `<article class="venue-card" data-venue="${v.id}"><div class="venue-photo" style="background-image:url('${v.photo}')"><span class="photo-badge">${v.mode==='instant'?'تأكيد فوري':'يتطلب موافقة'}</span><button class="favorite-btn ${saved?'saved':''}" data-fav="${v.id}" aria-label="إضافة للمفضلة">${saved?'♥':'♡'}</button></div><div class="venue-info"><div class="venue-title-row"><div><h3>${v.name}</h3><div class="venue-location">⌖ ${v.area}</div></div><span class="rating">★ ${v.rating} <small>(${v.reviews})</small></span></div><div class="venue-meta"><div class="amenities"><span>⚽ عشب</span><span>☾ إضاءة</span><span>♙ مرافق</span></div><div class="price">${money(v.price)} <small>/ ساعة</small></div></div></div></article>`}
async function renderHome(){const list=$('#homeVenues');if(window.MalaebiAPI?.enabled()){try{await loadRemoteVenues();list.innerHTML=state.remoteVenues.slice(0,2).map(venueCard).join('')}catch(e){list.innerHTML='<div class="empty-state">تعذر تحميل الملاعب من الخادم.</div>';toast(e.message)}return}list.innerHTML=venues.slice(0,2).map(venueCard).join('')}
async function loadRemoteVenues(){if(state.remoteVenues)return state.remoteVenues;const rows=await MalaebiAPI.venues();const mapped=[];for(const v of rows){let fieldId=v.default_field_id, price=Number(v.hourly_price_from||0), mode=(v.confirmation_mode==='instant'&&v.instant_booking_enabled===true)?'instant':'approval', features=Array.isArray(v.amenities)?v.amenities:[];if(!fieldId){const fs=await MalaebiAPI.fields(v.id);if(!fs.length)continue;const f=fs[0];fieldId=f.id;price=Number(f.hourly_price_from||0);mode=(f.confirmation_mode==='instant'&&f.instant_booking_enabled===true)?'instant':'approval';features=Array.isArray(f.amenities)?f.amenities:[];}mapped.push({id:v.id,fieldId,name:v.name,area:v.area||v.address_text||'مأرب',price,rating:Number(v.rating||0),reviews:0,photo:v.cover_image_url||photos.a,features,description:v.description||'',mode,deposit:0})}state.remoteVenues=mapped;return mapped}
function filteredVenues(){let list=(state.remoteVenues||venues).filter(v=>v.price<=state.price);if(state.query)list=list.filter(v=>(v.name+' '+v.area+' '+v.features.join(' ')).includes(state.query));if(state.filter==='grass')list=list.filter(v=>v.features.includes('عشب صناعي'));if(state.filter==='night')list=list.filter(v=>v.features.includes('إضاءة ليلية'));if(state.filter==='parking')list=list.filter(v=>v.features.includes('مواقف سيارات'));if(state.sort==='price_asc')list.sort((a,b)=>a.price-b.price);if(state.sort==='rating_desc')list.sort((a,b)=>b.rating-a.rating);return list}
async function renderSearch(){if(window.MalaebiAPI?.enabled()){try{await loadRemoteVenues()}catch(e){toast(e.message)}}const list=filteredVenues();$('#searchVenues').innerHTML=list.map(venueCard).join('');$('#resultCount').textContent=`(${list.length})`;$('#emptySearch').classList.toggle('hidden',list.length>0)}
function renderVenue(){
  const v=state.venue;
  if(!v)return;
  const currentTab=state.venueTab||'about';
  $('#venueDetails').innerHTML=`<div class="detail-cover" style="background-image:url('${v.photo}')"><button class="back-btn" data-go="search" type="button">→</button><button class="detail-fav ${state.favoriteIds.has(v.id)?'saved':''}" data-fav="${v.id}" type="button">${state.favoriteIds.has(v.id)?'♥':'♡'}</button></div><div class="detail-content"><div class="detail-title-row"><div><h1>${v.name}</h1><div class="detail-sub">⌖ ${v.area}</div></div><span class="detail-rating">★ ${v.rating} <small>(${v.reviews||0})</small></span></div><div class="detail-price">${money(v.price)} <small>للساعة الواحدة</small></div><div class="detail-tabs"><button type="button" class="detail-tab ${currentTab==='about'?'active':''}" data-detail-tab="about">عن الملعب</button><button type="button" class="detail-tab ${currentTab==='amenities'?'active':''}" data-detail-tab="amenities">المرافق</button><button type="button" class="detail-tab ${currentTab==='reviews'?'active':''}" data-detail-tab="reviews">التقييمات</button></div><div id="detailTabContent"></div><div class="detail-bottom"><div><small>السعر يبدأ من</small><b>${money(v.price)}</b></div><button class="primary-btn" data-book="${v.id}" type="button">احجز الآن ←</button></div></div>`;
  renderVenueTab(currentTab);
}
async function renderVenueTab(tab){
  state.venueTab=tab;
  const container=$('#detailTabContent');
  if(!container)return;
  const v=state.venue;
  if(!v)return;
  $$('.detail-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.detailTab===tab));
  if(tab==='about'){
    container.innerHTML=`<p class="detail-description">${v.description||'ملعب كرة قدم مجهز ومناسب للمباريات الودية والتمارين الرياضية والبطولات التنافسية.'}</p><div class="booking-summary"><div><span>طريقة التأكيد</span><b>${v.mode==='instant'?'فوري':'بموافقة المنشأة'}</b></div><div><span>مدة الحجز</span><b>60 دقيقة</b></div><div><span>العربون</span><b>${v.deposit?money(v.deposit):'لا يوجد (الدفع عند الملعب)'}</b></div></div>`;
    return;
  }
  if(tab==='amenities'){
    if(v.features&&v.features.length){
      container.innerHTML=`<div class="amenity-grid">${v.features.map(f=>`<div class="amenity"><b>${f.includes('إضاءة')?'☼':f.includes('مواقف')?'♙':f.includes('دورات')?'♧':f.includes('غرف')?'▣':'⚽'}</b>${f}</div>`).join('')}</div>`;
    }else{
      container.innerHTML=`<div class="tab-empty">لم تُضف مرافق محددة لهذا الملعب بعد.</div>`;
    }
    return;
  }
  if(tab==='reviews'){
    container.innerHTML=`<div class="tab-empty">جاري تحميل التقييمات...</div>`;
    if(window.MalaebiAPI?.enabled()){
      try{
        const data=await MalaebiAPI.venueReviews(v.id);
        const reviews=data.reviews||[];
        const avg=data.average_rating||v.rating||0;
        const total=data.total_reviews||reviews.length||0;
        if(!reviews.length){
          container.innerHTML=`<div class="tab-empty">لا توجد تقييمات بعد لهذا الملعب. كن أول من يقيّمه بعد إتمام حجزك!</div>`;
          return;
        }
        const fullStars=Math.round(avg);
        container.innerHTML=`<div class="reviews-summary"><div class="reviews-score">${avg}</div><div class="reviews-score-meta"><div class="reviews-score-stars">${'★'.repeat(fullStars)}${'☆'.repeat(Math.max(0,5-fullStars))}</div><small>بناءً على ${total} تقييم</small></div></div><div class="reviews-list">${reviews.map(r=>`<div class="review-item"><div class="review-item-head"><span class="review-player">⚽ ${r.player_name||'لاعب ملاعبي'}</span><span class="review-date">${r.created_at?new Intl.DateTimeFormat('ar-YE',{dateStyle:'medium'}).format(new Date(r.created_at)):''}</span></div><div class="review-stars">${'★'.repeat(r.rating||5)}${'☆'.repeat(Math.max(0,5-(r.rating||5)))}</div>${r.comment?`<p class="review-comment">${r.comment}</p>`:''}</div>`).join('')}</div>`;
        return;
      }catch(e){
        container.innerHTML=`<div class="tab-empty">تعذر تحميل التقييمات: ${e.message}</div>`;
        return;
      }
    }
    const demoReviews=[
      {player_name:'أحمد صالح',rating:5,comment:'الملعب ممتاز والعشب بحالة رائعة والإضاءة الليلية واضحة جداً.',created_at:new Date(Date.now()-86400000*2).toISOString()},
      {player_name:'محمد عبدالله',rating:4,comment:'تجربة حجز سهلة وسريعة والمواقف متوفرة بجانب الملعب.',created_at:new Date(Date.now()-86400000*6).toISOString()}
    ];
    const avg=v.rating||4.8;
    const fullStars=Math.round(avg);
    container.innerHTML=`<div class="reviews-summary"><div class="reviews-score">${avg}</div><div class="reviews-score-meta"><div class="reviews-score-stars">${'★'.repeat(fullStars)}${'☆'.repeat(Math.max(0,5-fullStars))}</div><small>بناءً على ${demoReviews.length} تقييم (معاينة)</small></div></div><div class="reviews-list">${demoReviews.map(r=>`<div class="review-item"><div class="review-item-head"><span class="review-player">⚽ ${r.player_name}</span><span class="review-date">${new Intl.DateTimeFormat('ar-YE',{dateStyle:'medium'}).format(new Date(r.created_at))}</span></div><div class="review-stars">${'★'.repeat(r.rating)}${'☆'.repeat(Math.max(0,5-r.rating))}</div><p class="review-comment">${r.comment}</p></div>`).join('')}</div>`;
  }
}
async function openVenue(id){state.venueTab='about';state.venue=(state.remoteVenues||venues).find(v=>v.id===id);if(!state.venue)return;if(window.MalaebiAPI?.enabled()&&!state.venue.fieldId){const fs=await MalaebiAPI.fields(id);if(!fs.length){toast('لا يوجد ملعب نشط للحجز');return}state.venue.fieldId=fs[0].id;state.venue.price=Number(fs[0].hourly_price_from||0);state.venue.mode=(fs[0].confirmation_mode==='instant'&&fs[0].instant_booking_enabled===true)?'instant':'approval';state.venue.features=Array.isArray(fs[0].amenities)?fs[0].amenities:[];}renderVenue();showPage('venue')}
function toggleFavorite(id){if(state.favoriteIds.has(id))state.favoriteIds.delete(id);else state.favoriteIds.add(id);localStorage.setItem('malaebi_favorites',JSON.stringify([...state.favoriteIds]));renderHome();if(state.page==='search')renderSearch();if(state.page==='venue')renderVenue();toast(state.favoriteIds.has(id)?'أضيف الملعب إلى المفضلة':'تمت إزالة الملعب من المفضلة')}
function renderBooking(){const v=state.venue;if(!v)return;$('#bookingVenueMini').innerHTML=`<div class="mini-thumb" style="background-image:url('${v.photo}')"></div><div><b>${v.name}</b><small>${v.area}</small></div>`;$('#bookingPrice').textContent=money(v.price);$('#bookingTotal').textContent=money(v.price);$('#confirmMethod').innerHTML=v.mode==='instant'?'هذا الملعب يعتمد <b>التأكيد الفوري</b> بعد نجاح إنشاء الحجز.':'هذا الملعب يعتمد <b>موافقة المنشأة</b> خلال المهلة المحددة في سياسة الحجز.';renderDates();renderTimes()}
function renderDates(){const base=new Date();base.setHours(0,0,0,0);$('#bookingMonth').textContent=new Intl.DateTimeFormat('ar-YE',{month:'long',year:'numeric'}).format(state.date);$('#dateScroller').innerHTML=Array.from({length:7},(_,i)=>{const d=new Date(base);d.setDate(base.getDate()+i);return `<button class="date-option ${dateISO(d)===dateISO(state.date)?'active':''}" data-date="${dateISO(d)}"><small>${new Intl.DateTimeFormat('ar-YE',{weekday:'short'}).format(d)}</small><b>${d.getDate()}</b><small>${new Intl.DateTimeFormat('ar-YE',{month:'short'}).format(d)}</small></button>`}).join('')}
async function renderTimes(){const now=new Date();const today=dateISO(state.date)===dateISO(now);if(window.MalaebiAPI?.enabled()&&state.venue?.fieldId){try{const result=await MalaebiAPI.availability(state.venue.fieldId,dateISO(state.date));state.availableSlots=result.slots||[];$('#timeGrid').innerHTML=state.availableSlots.map(s=>{const t=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Aden',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(s.starts_at));return `<button class="time-option ${!s.available?'unavailable':''} ${state.time===t?'active':''}" data-time="${t}" data-starts="${s.starts_at}" ${!s.available?'disabled':''}>${t}</button>`}).join('');$('#continueBooking').disabled=!state.time;return}catch(e){toast(e.message)}}$('#timeGrid').innerHTML=times.map(t=>{const [h]=t.split(':').map(Number);const unavailable=(today&&h<=now.getHours());return `<button class="time-option ${unavailable?'unavailable':''} ${state.time===t?'active':''}" data-time="${t}" ${unavailable?'disabled':''}>${t}</button>`}).join('');$('#continueBooking').disabled=!state.time}
async function openBooking(id){if(id)await openVenue(id);if(!state.venue)return;state.date=new Date();state.date.setHours(0,0,0,0);state.time=null;state.selectedStartsAt=null;renderBooking();showPage('booking')}
function openCheckout(){const v=state.venue;if(!v||!state.time)return;$('#checkoutSummary').innerHTML=`<h3>${v.name}</h3><div class="checkout-line"><span>التاريخ</span><b>${dateLabel(state.date)}</b></div><div class="checkout-line"><span>الوقت</span><b>${state.time} — ${String((Number(state.time.slice(0,2))+1)%24).padStart(2,'0')}:00</b></div><div class="checkout-line"><span>مدة الحجز</span><b>ساعة واحدة</b></div><div class="checkout-line"><span>طريقة التأكيد</span><b>${v.mode==='instant'?'فوري':'بموافقة المنشأة'}</b></div><div class="checkout-line"><span>الإجمالي</span><b style="color:var(--green)">${money(v.price)}</b></div>`;$('#phoneInput').value=state.phone.replace('+967','');showPage('checkout')}
function saveBooking(){state.phone='+967'+$('#phoneInput').value.trim();localStorage.setItem('malaebi_phone',state.phone);showPage('payment')}
function showConfirmation(b){$('#modalContent').innerHTML=`<div style="text-align:center;padding:8px 0"><div style="width:65px;height:65px;background:#e7f6ec;color:var(--green);border-radius:22px;display:grid;place-items:center;font-size:34px;margin:5px auto 15px">✓</div><h2 id="modalTitle">${b.status==='confirmed'?'تم تسجيل الحجز':'تم إرسال طلب الحجز'}</h2><p>${b.status==='confirmed'?'الحجز التجريبي مؤكد في هذه المعاينة.':'طلب الحجز التجريبي بانتظار موافقة المنشأة.'}</p><div class="checkout-card" style="text-align:right"><div class="checkout-line"><span>رقم مرجعي تجريبي</span><b>${b.id}</b></div><div class="checkout-line"><span>الملعب</span><b>${b.venue}</b></div><div class="checkout-line"><span>الموعد</span><b>${b.dateText} — ${b.time}</b></div><div class="checkout-line"><span>المبلغ عند الملعب</span><b>${money(b.price)}</b></div></div><p style="color:#a56b17">هذه ليست معاملة حقيقية؛ لم يتم إرسال OTP أو إنشاء حجز على الخادم.</p><button class="primary-btn full" id="viewBookings">عرض حجوزاتي</button></div>`;openModal();$('#viewBookings').onclick=()=>{closeModal();showPage('bookings')}}
async function loadMyBookings(){try{const rows=await MalaebiAPI.myBookings();state.bookings=rows.map(b=>({id:b.booking_no,serverId:b.id,venue:b.venue_name||'ملعب ملاعبي',area:'',date:b.starts_at?.slice(0,10)||'',dateText:b.starts_at?new Intl.DateTimeFormat('ar-YE',{dateStyle:'medium',timeZone:'Asia/Aden'}).format(new Date(b.starts_at)):'',time:b.starts_at?new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Aden',hour:'2-digit',minute:'2-digit'}).format(new Date(b.starts_at)):'',price:Number(b.total_price),status:b.status}));renderBookings()}catch(e){toast(e.message)}}
function renderBookings(){const list=state.bookings.filter(b=>state.bookingTab==='all'||(state.bookingTab==='upcoming'&&['confirmed','pending','held'].includes(b.status))||(state.bookingTab==='pending'&&b.status==='pending')||(state.bookingTab==='past'&&['completed','cancelled','expired','no_show','disputed'].includes(b.status)));$('#myBookings').innerHTML=list.map(b=>`<article class="booking-card" data-booking-detail="${b.serverId||b.id}"><div class="booking-card-top"><div><h3>${b.venue}</h3><small>⌖ ${b.area}</small></div><span class="status-pill ${b.status==='pending'?'pending':''}">${b.status==='pending'?'بانتظار الموافقة':b.status==='confirmed'?'مؤكد':b.status==='cancelled'?'ملغي':b.status==='expired'?'منتهي':'مكتمل'}</span></div><div class="booking-card-meta"><span>${b.dateText||b.date} · ${b.time}</span><b>${money(b.price)}</b></div><small style="display:block;margin-top:9px">مرجع: ${b.id} · ${b.demo?'حجز تجريبي':''}</small></article>`).join('');$('#emptyBookings').classList.toggle('hidden',list.length>0)}
function renderAccount(){
  const p = state.phone || localStorage.getItem('malaebi_phone') || '';
  if (p) state.phone = p;
  $('#profilePhone').textContent = p || 'سجّل الدخول لإدارة حسابك';
  $('#profileName').textContent = p ? 'لاعب ملاعبي' : 'مستخدم ضيف';
  $('#loginBtn').textContent = p ? 'تبديل الحساب' : 'تسجيل الدخول';
}
function openModal(){ $('#modalBackdrop').classList.remove('hidden') }function closeModal(){$('#modalBackdrop').classList.add('hidden')}
function showLogin(){
 $('#modalContent').innerHTML=`<h2 id="modalTitle">تسجيل الدخول</h2><p>أدخل رقم هاتفك اليمني لإرسال رمز تحقق لمرة واحدة.</p><label class="field-label">رقم الهاتف</label><div class="phone-input"><span>+967</span><input id="loginPhone" inputmode="tel" maxlength="9" placeholder="7XXXXXXXX" value="${state.phone.replace('+967','')}" /></div><button class="primary-btn full" style="margin-top:17px" id="requestOtp">إرسال رمز التحقق</button><p class="micro-note">${CONFIG.DEMO_MODE?'للمعاينة استخدم رمز 123456.':'سيتم إرسال OTP عبر Supabase Auth.'}</p>`;
 openModal();
 $('#requestOtp').onclick=async()=>{
  const p=$('#loginPhone').value.trim();if(!/^7\d{8}$/.test(p)){toast('أدخل رقم هاتف صحيحاً يبدأ بالرقم 7');return}
  if(window.MalaebiAPI?.enabled()){try{await MalaebiAPI.requestOtp('+967'+p);showOtp(p)}catch(e){toast(e.message)}}
  else showOtp(p);
 };
}
function showOtp(p){
 $('#modalContent').innerHTML=`<h2 id="modalTitle">رمز التحقق</h2><p>أدخل رمز التحقق المكوّن من 6 أرقام المرسل إلى هاتفك.</p><div class="otp-inputs">${Array.from({length:6},()=>'<input maxlength="1" inputmode="numeric">').join('')}</div><button class="primary-btn full" id="verifyOtp">تحقق</button><p class="micro-note">${CONFIG.DEMO_MODE?'للمعاينة استخدم 123456.':'سيتم التحقق عبر Supabase Auth.'}</p>`;
 const inputs=$$('.otp-inputs input');
 inputs.forEach((el,i)=>el.addEventListener('input',()=>{el.value=el.value.replace(/\D/g,'').slice(0,1);if(el.value&&inputs[i+1])inputs[i+1].focus()}));
 $('#verifyOtp').onclick=async()=>{
  const code=inputs.map(i=>i.value).join('');
  if(window.MalaebiAPI?.enabled()){
   try{await MalaebiAPI.verifyOtp('+967'+p,code);state.phone='+967'+p;localStorage.setItem('malaebi_phone',state.phone);closeModal();renderAccount();saveBooking()}
   catch(e){toast('رمز التحقق: '+e.message)}
   return;
  }
  if(code!=='123456'){toast('رمز المعاينة غير صحيح؛ استخدم 123456');return}
  state.phone='+967'+p;localStorage.setItem('malaebi_phone',state.phone);closeModal();renderAccount();toast('تم التحقق في وضع المعاينة');saveBooking();
 };
}
// Event delegation
$('#mainContent').addEventListener('click',e=>{
  const act=e.target.closest('[data-action]');
  if(act){
    const a=act.dataset.action;
    if(a==='personal'){
      if(state.phone||sessionStorage.getItem('malaebi_access_token')){
        toast(`رقم الهاتف: ${state.phone||'مسجل'} | الحساب نشط`);
      }else{
        toast('يرجى تسجيل الدخول أولاً');
        showPage('login');
      }
      return;
    }
    if(a==='favorites'){
      showPage('search');
      toast(state.favoriteIds.size?`لديك ${state.favoriteIds.size} ملعب في المفضلة`:'قائمة المفضلة فارغة حالياً');
      return;
    }
    if(a==='notifications'){
      if(window.MalaebiAPI?.enabled()&&sessionStorage.getItem('malaebi_access_token')){
        MalaebiAPI.notifications().then(rows=>toast(rows.length?`لديك ${rows.length} إشعاراً`:'لا توجد إشعارات جديدة')).catch(err=>toast(err.message));
      }else{
        toast('لا توجد إشعارات جديدة');
      }
      return;
    }
    if(a==='help'){
      toast('مركز المساعدة: تواصل عبر واتساب أو الهاتف على 773461637');
      return;
    }
    if(a==='about'){
      toast('تطبيق ملاعبي v1.0.0 — المنصة الأولى لحجز الملاعب في مأرب');
      return;
    }
  }
  const tabBtn=e.target.closest('[data-detail-tab]');if(tabBtn){renderVenueTab(tabBtn.dataset.detailTab);return}
  const fav=e.target.closest('[data-fav]');if(fav){e.stopPropagation();toggleFavorite(fav.dataset.fav);return}
  const book=e.target.closest('[data-book]');if(book){openBooking(book.dataset.book);return}
  const go=e.target.closest('[data-go]');if(go){showPage(go.dataset.go);return}
  const card=e.target.closest('[data-venue]');if(card)openVenue(card.dataset.venue);
});
document.addEventListener('click',e=>{const go=e.target.closest('[data-go]');if(go&&!$('#mainContent').contains(go))showPage(go.dataset.go)});
$('#searchInput').addEventListener('input',e=>{state.query=e.target.value.trim();renderSearch()});$('#clearSearch').onclick=()=>{$('#searchInput').value='';state.query='';renderSearch()};$('#priceRange').oninput=e=>{state.price=Number(e.target.value);$('#priceLabel').textContent='حتى '+money(state.price);renderSearch()};$$('[data-sort]').forEach(b=>b.onclick=()=>{state.sort=b.dataset.sort;$$('[data-sort]').forEach(x=>x.classList.toggle('active',x===b));renderSearch()});$('#resetFilters').onclick=()=>{state.query='';state.price=15000;state.sort='recommended';state.filter='all';$('#searchInput').value='';$('#priceRange').value=15000;$('#priceLabel').textContent='حتى '+money(15000);$$('[data-sort]').forEach((x,i)=>x.classList.toggle('active',i===0));renderSearch()};$$('[data-filter]').forEach(b=>b.onclick=()=>{state.filter=b.dataset.filter;$$('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));showPage('search');renderSearch()});
$('#dateScroller').addEventListener('click',e=>{const b=e.target.closest('[data-date]');if(!b)return;state.date=new Date(b.dataset.date+'T00:00:00');state.time=null;renderDates();renderTimes()});$('#timeGrid').addEventListener('click',e=>{const b=e.target.closest('[data-time]');if(!b||b.disabled)return;state.time=b.dataset.time;state.selectedStartsAt=b.dataset.starts||null;renderTimes()});$('#continueBooking').onclick=openCheckout;
$('#sendOtpBtn').onclick=async()=>{
 const phone=$('#phoneInput').value.trim();
 if(!/^7\d{8}$/.test(phone)){toast('أدخل رقم هاتف يمني صحيحاً');return}
 if(window.MalaebiAPI?.enabled()){
  try{await MalaebiAPI.requestOtp('+967'+phone);showOtp(phone)}
  catch(e){toast('تعذر إرسال رمز التحقق: '+e.message)}
 }else showOtp(phone);
};
$('#bookingTabs').addEventListener('click',e=>{const b=e.target.closest('[data-status]');if(!b)return;state.bookingTab=b.dataset.status;$$('[data-status]').forEach(x=>x.classList.toggle('active',x===b));renderBookings()});$('#modalClose').onclick=closeModal;$('#modalBackdrop').addEventListener('click',e=>{if(e.target.id==='modalBackdrop')closeModal()});$('#loginBtn').onclick=showLogin;$('#notificationsBtn').onclick=async()=>{if(window.MalaebiAPI?.enabled()&&sessionStorage.getItem('malaebi_access_token')){try{const rows=await MalaebiAPI.notifications();toast(rows.length?`لديك ${rows.length} إشعاراً`:'لا توجد إشعارات جديدة')}catch(e){toast(e.message)}}else toast('لا توجد إشعارات جديدة')};$('#locationBtn').onclick=()=>toast('نطاق الإطلاق الحالي: مدينة مأرب والمناطق القريبة');
window.addEventListener('hashchange',()=>{const p=location.hash.slice(1);if(document.querySelector(`[data-page="${p}"]`))showPage(p)});

let activeOtpPhone='';
let selectedRating=5;
async function renderBookingDetail(){
 const b=state.bookings.find(x=>x.serverId===state.selectedBookingId||x.id===state.selectedBookingId)||state.bookings[0];
 if(window.MalaebiAPI?.enabled()&&b?.serverId){try{const fresh=await MalaebiAPI.bookingDetail(b.serverId);Object.assign(b,{status:fresh.status,price:Number(fresh.total_price),time:new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Aden',hour:'2-digit',minute:'2-digit'}).format(new Date(fresh.starts_at))})}catch(e){toast(e.message)}}
 $('#bookingDetailContent').innerHTML=b?`<h3>${b.venue}</h3><div class="checkout-line"><span>المرجع</span><b>${b.id}</b></div><div class="checkout-line"><span>التاريخ</span><b>${b.dateText||b.date}</b></div><div class="checkout-line"><span>الوقت</span><b>${b.time}</b></div><div class="checkout-line"><span>الحالة</span><b>${b.status==='pending'?'بانتظار الموافقة':b.status==='confirmed'?'مؤكد':b.status==='cancelled'?'ملغي':b.status==='expired'?'منتهي':'مكتمل'}</b></div><div class="checkout-line"><span>المبلغ عند الملعب</span><b>${money(b.price)}</b></div>` :'لا توجد حجوزات لعرض تفاصيلها.';
 const reviewBtn=document.querySelector('#page-booking-detail [data-go=\"rating\"]');if(reviewBtn)reviewBtn.hidden=!(b&&b.status==='completed');
 const old=document.querySelector('#cancelBookingAction');if(old)old.remove();
 if(b&&['pending','held','confirmed'].includes(b.status)){
  const btn=document.createElement('button');btn.id='cancelBookingAction';btn.className='secondary-btn full';btn.textContent='إلغاء الحجز';
  btn.onclick=async()=>{if(!confirm('هل تريد إلغاء هذا الحجز؟'))return;
   if(window.MalaebiAPI?.enabled()&&b.serverId){try{const r=await MalaebiAPI.cancelBooking(b.serverId);toast(r.cancellation_refund_eligible?'تم الإلغاء وفق سياسة الست ساعات':'تم الإلغاء دون استرداد تلقائي')}catch(e){toast(e.message);return}}
   else{b.status='cancelled';localStorage.setItem('malaebi_demo_bookings',JSON.stringify(state.bookings));toast('تم إلغاء الحجز التجريبي')}
   showPage('bookings');
  };
  $('#bookingDetailContent').after(btn);
 }
}
$('#pageRequestOtp').onclick=async()=>{
 const p=$('#pageLoginPhone').value.trim();
 if(!/^7\d{8}$/.test(p)){toast('أدخل رقم هاتف صحيحاً يبدأ بالرقم 7');return}
 activeOtpPhone=p;
 if(window.MalaebiAPI?.enabled()){
  try{await MalaebiAPI.requestOtp('+967'+p);showPage('otp');toast('تم إرسال رمز التحقق')}
  catch(e){toast(e.message)}
 }else showPage('otp');
};
$('#pageVerifyOtp').onclick=async()=>{
 const code=$$('.otp-inputs input',document.querySelector('#page-otp')).map(x=>x.value).join('');
 if(window.MalaebiAPI?.enabled()){
  try{const r=await MalaebiAPI.verifyOtp('+967'+activeOtpPhone,code);state.phone=r.user?.phone||'+967'+activeOtpPhone;localStorage.setItem('malaebi_phone',state.phone);renderAccount();showPage('home')}
  catch(e){toast(e.message)}
  return;
 }
 if(code!=='123456'){toast('رمز المعاينة هو 123456');return}
 state.phone='+967'+activeOtpPhone;localStorage.setItem('malaebi_phone',state.phone);renderAccount();toast('تم تسجيل الدخول في وضع المعاينة');showPage('home');
};
$('#resendOtp').onclick=async()=>{if(window.MalaebiAPI?.enabled()){try{await MalaebiAPI.requestOtp('+967'+activeOtpPhone);toast('تم طلب رمز جديد')}catch(e){toast(e.message)}}else toast('رمز المعاينة هو 123456')};
$('#completeDemoBooking').onclick=async()=>{
 if(!state.venue||!state.time){toast('اختر الملعب والموعد أولاً');return}
 if(window.MalaebiAPI?.enabled()){
  if(!sessionStorage.getItem('malaebi_access_token')){toast('سجّل الدخول أولاً');showPage('login');return}
  try{
   const starts=state.selectedStartsAt||new Date(`${dateISO(state.date)}T${state.time}:00+03:00`).toISOString();
   const b=await MalaebiAPI.createBooking(state.venue.fieldId,starts);
   const item={id:b.booking_no,serverId:b.id,venue:state.venue.name,area:state.venue.area,date:dateISO(state.date),dateText:dateLabel(state.date),time:state.time,price:Number(b.total_price),status:b.status,demo:false};
   state.bookings.unshift(item);
   $('#confirmationInfo').innerHTML=`<div class="checkout-line"><span>رقم الحجز</span><b>${b.booking_no}</b></div><div class="checkout-line"><span>الحالة</span><b>${b.status==='pending'?'بانتظار موافقة المنشأة':'مؤكد'}</b></div><div class="checkout-line"><span>الملعب</span><b>${state.venue.name}</b></div><div class="checkout-line"><span>الوقت</span><b>${state.time}</b></div><div class="checkout-line"><span>المبلغ عند الملعب</span><b>${money(b.total_price)}</b></div>`;
   showPage('confirmation');return;
  }catch(e){toast(e.message);return}
 }
 const b={id:'DEMO-'+Date.now().toString().slice(-6),venueId:state.venue.id,venue:state.venue.name,area:state.venue.area,photo:state.venue.photo,date:dateISO(state.date),dateText:dateLabel(state.date),time:state.time,price:state.venue.price,status:state.venue.mode==='instant'?'confirmed':'pending',createdAt:new Date().toISOString(),demo:true};
 state.bookings.unshift(b);localStorage.setItem('malaebi_demo_bookings',JSON.stringify(state.bookings));
 $('#confirmationInfo').innerHTML=`<div class="checkout-line"><span>رقم الحجز</span><b>${b.id}</b></div><div class="checkout-line"><span>الملعب</span><b>${b.venue}</b></div><div class="checkout-line"><span>الموعد</span><b>${b.dateText} · ${b.time}</b></div><div class="checkout-line"><span>المبلغ</span><b>${money(b.price)}</b></div>`;
 showPage('confirmation');
};
$('#myBookings').addEventListener('click',e=>{const card=e.target.closest('[data-booking-detail]');if(card){state.selectedBookingId=card.dataset.bookingDetail;showPage('booking-detail')}});
$('#ratingStars').addEventListener('click',e=>{const b=e.target.closest('[data-star]');if(!b)return;selectedRating=Number(b.dataset.star);$$('[data-star]').forEach(x=>x.style.color=Number(x.dataset.star)<=selectedRating?'#e9aa2b':'#c9d1cb')});
$('#submitReview').onclick=async()=>{const b=state.bookings.find(x=>x.serverId===state.selectedBookingId||x.id===state.selectedBookingId)||state.bookings[0];if(window.MalaebiAPI?.enabled()&&b?.serverId){try{await MalaebiAPI.review(b.serverId,selectedRating,$('#reviewText').value);toast('تم إرسال التقييم');showPage('bookings')}catch(e){toast(e.message)}}else toast('التقييم تجريبي؛ لا يُرسل قبل ربط API والتحقق من اكتمال الحجز')};
$('#settingsNotifications').onclick=async()=>{if(window.MalaebiAPI?.enabled()&&sessionStorage.getItem('malaebi_access_token')){try{const n=await MalaebiAPI.notifications();toast(n.length?`لديك ${n.length} إشعاراً`:'لا توجد إشعارات جديدة')}catch(e){toast(e.message)}}else toast('الإشعارات ستُفعّل بعد ربط خدمة الإشعارات')};
$('#settingsHelp').onclick=()=>toast('سيتم إضافة قنوات الدعم عند تجهيز التشغيل');
$('#settingsLogout').onclick=async()=>{if(window.MalaebiAPI?.enabled())await window.MalaebiAPI.logout();else window.MalaebiAPI?.logout();state.phone='';localStorage.removeItem('malaebi_phone');renderAccount();showPage('home');toast('تم تسجيل الخروج من المعاينة')};

renderHome();
renderSearch();
renderAccount();
if(!location.hash) showPage('splash');
if('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      reg.update();
    }).catch(() => {});
  });
}

// OTP UX: six digits, auto-advance, and backspace navigation.
document.addEventListener('input',e=>{
 const el=e.target;
 if(!el.matches('.otp-inputs input')) return;
 el.value=el.value.replace(/\D/g,'').slice(0,1);
 if(el.value && el.nextElementSibling) el.nextElementSibling.focus();
});
document.addEventListener('keydown',e=>{
 const el=e.target;
 if(el.matches('.otp-inputs input')&&e.key==='Backspace'&&!el.value&&el.previousElementSibling) el.previousElementSibling.focus();
});
