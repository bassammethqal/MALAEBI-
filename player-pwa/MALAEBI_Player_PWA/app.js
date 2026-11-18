/* MALAEBI Player PWA — واجهة اللاعب */
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
const times=[
  '06:00','07:00','08:00','09:00','10:00','11:00',
  '12:00','13:00','14:00','15:00','16:00','17:00',
  '18:00','19:00','20:00','21:00','22:00','23:00'
];
const state={
  page:'home',
  venue:null,
  date:new Date(),
  time:null,
  sort:'recommended',
  price:50000,
  query:'',
  filter:'all',
  favoriteIds:new Set(JSON.parse(localStorage.getItem('malaebi_favorites')||'[]')),
  bookings:JSON.parse(localStorage.getItem('malaebi_demo_bookings')||'[]'),
  user:JSON.parse(localStorage.getItem('malaebi_user')||'null'),
  email:localStorage.getItem('malaebi_email')||'',
  phone:localStorage.getItem('malaebi_phone')||'',
  bookingTab:'all',
  remoteVenues:null,
  availableSlots:[],
  selectedBookingId:null,
  venueTab:'about'
};
let activeAuthEmail = '';
let selectedRating = 5;

const money=n=>new Intl.NumberFormat('ar-YE').format(n)+' ريال';
const dateISO=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const dateLabel=d=>new Intl.DateTimeFormat('ar-YE',{weekday:'long',day:'numeric',month:'long'}).format(d);

function formatTime12Ar(input){
  if(!input) return '';
  if(typeof input === 'string' && /(صباحاً|ظهراً|عصراً|مساءً|فجراً)/.test(input)) return input;
  let hours = 0;
  let minutes = 0;

  if(typeof input === 'string' && /^\d{1,2}:\d{2}(:\d{2})?$/.test(input.trim())){
    const parts = input.trim().split(':');
    hours = parseInt(parts[0], 10);
    minutes = parseInt(parts[1], 10);
  } else {
    const d = (input instanceof Date) ? input : new Date(input);
    if(isNaN(d.getTime())) return String(input);
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Aden',
      hour: 'numeric',
      minute: '2-digit',
      hour12: false
    });
    const parts = formatter.formatToParts(d);
    for(const p of parts){
      if(p.type === 'hour') hours = parseInt(p.value, 10);
      if(p.type === 'minute') minutes = parseInt(p.value, 10);
    }
  }

  let period = 'مساءً';
  if(hours >= 0 && hours < 5){
    period = 'فجراً';
  } else if(hours >= 5 && hours < 12){
    period = 'صباحاً';
  } else if(hours >= 12 && hours < 15){
    period = 'ظهراً';
  } else if(hours >= 15 && hours < 18){
    period = 'عصراً';
  } else {
    period = 'مساءً';
  }

  const h12 = hours % 12 || 12;
  const mm = String(minutes).padStart(2, '0');
  return `${h12}:${mm} ${period}`;
}

let lastConfirmedBooking = null;

function toggleTheme(isDark){
  document.body.classList.toggle('dark-mode', isDark);
  localStorage.setItem('malaebi_theme', isDark ? 'dark' : 'light');
  const darkSwitch = $('#settingDarkMode');
  if(darkSwitch && darkSwitch.checked !== isDark) darkSwitch.checked = isDark;
  updateThemeIcons(isDark);
}

function updateThemeIcons(isDark){
  const moon = $('.theme-moon');
  const sun = $('.theme-sun');
  if(moon) moon.classList.toggle('hidden', isDark);
  if(sun) sun.classList.toggle('hidden', !isDark);
}

async function renderQrCode(container, text){
  if(!container) return;
  if(!text){
    container.innerHTML = '';
    return;
  }
  try {
    if(window.QRCode && typeof window.QRCode.toString === 'function'){
      const svgString = await window.QRCode.toString(String(text), {
        type: 'svg',
        margin: 1,
        color: {
          dark: '#064e3b',
          light: '#ffffff'
        }
      });
      container.innerHTML = svgString;
    } else {
      container.innerHTML = `<div style="font-size:12px;color:var(--muted);padding:20px 0">رمز الحجز: <b>${text}</b></div>`;
    }
  } catch(err) {
    console.warn('QR Code render error:', err);
    container.innerHTML = `<div style="font-size:12px;color:var(--muted);padding:20px 0">رمز الحجز: <b>${text}</b></div>`;
  }
}

function shareBooking(b){
  if(!b) return;
  const venueName = b.venue || state.venue?.name || 'ملعب ملاعبي';
  const dateStr = b.dateText || b.date || dateLabel(state.date);
  const timeStr = formatTime12Ar(b.time || state.time);
  const bookingNo = b.id || b.booking_no || '—';
  const price = Number(b.price || state.venue?.price || 0);
  const perPlayer = Math.round(price / 10);

  const shareText = `⚽ *دعوة لمباراة في ${venueName}*\n\n` +
    `📅 *التاريخ:* ${dateStr}\n` +
    `⏰ *الوقت:* ${timeStr}\n` +
    `🎫 *رقم الحجز:* ${bookingNo}\n` +
    `💰 *المبلغ الإجمالي:* ${money(price)}\n` +
    `👥 *نصيب اللاعب (10 لاعبين):* ${money(perPlayer)}\n\n` +
    `📍 تم الحجز عبر منصة ملاعبي (MALAEBI)\n` +
    `https://malaebi-player-psi.vercel.app`;

  if(navigator.share){
    navigator.share({
      title: `حجز ملعب: ${venueName}`,
      text: shareText
    }).catch(err => {
      if(err.name !== 'AbortError'){
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
      }
    });
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
  }
}

const MAIN_TABS = ['home', 'search', 'bookings', 'account'];
let previousPage = 'home';

function updateNavIndicator(navItem){
  const indicator = $('#navIndicator');
  const bottomNav = $('.bottom-nav');
  if(!indicator || !bottomNav || !navItem) return;
  const navRect = bottomNav.getBoundingClientRect();
  const itemRect = navItem.getBoundingClientRect();
  if(!itemRect.width) return;
  const offset = itemRect.left - navRect.left;
  indicator.style.width = `${itemRect.width}px`;
  indicator.style.transform = `translateX(${offset}px)`;
  indicator.style.opacity = '1';
}

function toast(msg){
  const el=$('#toast');
  if(!el) return;
  el.textContent=msg;
  el.classList.add('show');
  clearTimeout(toast.t);
  toast.t=setTimeout(()=>el.classList.remove('show'),2800);
}

function showPage(name){
  const fromPage = state.page || previousPage;
  const toPage = name;
  previousPage = fromPage;
  state.page = name;

  const fromIndex = MAIN_TABS.indexOf(fromPage);
  const toIndex = MAIN_TABS.indexOf(toPage);

  let animClass = 'anim-fade';
  if(fromIndex !== -1 && toIndex !== -1){
    if(toIndex > fromIndex){
      animClass = 'anim-slide-left';
    } else if(toIndex < fromIndex){
      animClass = 'anim-slide-right';
    } else {
      animClass = 'anim-fade';
    }
  } else if(toIndex === -1){
    animClass = 'anim-push';
  } else {
    animClass = 'anim-fade';
  }

  $$('.page').forEach(p => {
    const isActive = p.dataset.page === name;
    p.classList.remove('anim-slide-left', 'anim-slide-right', 'anim-push', 'anim-fade');
    p.classList.toggle('active', isActive);
    if(isActive){
      p.classList.add(animClass);
    }
  });

  const activeNavBtn = $(`.nav-item[data-go="${name}"]`);
  $$('.nav-item').forEach(b => b.classList.toggle('active', b === activeNavBtn));
  if(activeNavBtn){
    updateNavIndicator(activeNavBtn);
  }

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

  if(name==='home') renderHome();
  if(name==='search') renderSearch();
  if(name==='venue'){
    if(!state.venue){
      const savedId=localStorage.getItem('malaebi_last_venue_id')||'venue-marib-01';
      openVenue(savedId);
    }else{
      renderVenue();
    }
  }
  if(name==='bookings'){
    if(window.MalaebiAPI?.enabled()&&localStorage.getItem('malaebi_access_token')) loadMyBookings();
    else renderBookings();
  }
  if(name==='account') renderAccount();
  if(name==='settings') renderSettings();
  if(name==='booking-detail') renderBookingDetail();
  if(name==='payment'){
    const el=$('#paymentAmount');
    if(el) el.textContent=state.venue?money(state.venue.price):'—';
  }
}

function venueCard(v){
  const saved=state.favoriteIds.has(v.id);
  return `<article class="venue-card" data-venue="${v.id}"><div class="venue-photo" style="background-image:url('${v.photo}')"><span class="photo-badge">${v.mode==='instant'?'تأكيد فوري':'يتطلب موافقة'}</span><button class="favorite-btn ${saved?'saved':''}" data-fav="${v.id}" aria-label="إضافة للمفضلة">${saved?'♥':'♡'}</button></div><div class="venue-info"><div class="venue-title-row"><div><h3>${v.name}</h3><div class="venue-location">⌖ ${v.area}</div></div><span class="rating">★ ${v.rating} <small>(${v.reviews})</small></span></div><div class="venue-meta"><div class="amenities"><span>⚽ عشب</span><span>☾ إضاءة</span><span>♙ مرافق</span></div><div class="price">${money(v.price)} <small>/ ساعة</small></div></div></div></article>`;
}

function renderSkeletons(container, count = 3){
  if(!container) return;
  container.innerHTML = Array.from({length: count}, () => `
    <div class="skeleton-card">
      <div class="skeleton-photo skeleton-shimmer"></div>
      <div class="skeleton-body" style="padding:13px 14px 14px">
        <div class="skeleton-line skeleton-shimmer" style="height:18px;width:60%;margin-bottom:8px"></div>
        <div class="skeleton-line skeleton-shimmer" style="height:12px;width:40%;margin-bottom:12px"></div>
        <div class="skeleton-line skeleton-shimmer" style="height:14px;width:85%"></div>
      </div>
    </div>
  `).join('');
}

let loadVenuesPromise = null;
async function loadRemoteVenues(){
  if(loadVenuesPromise) return loadVenuesPromise;

  loadVenuesPromise = (async () => {
    try {
      const rows = await MalaebiAPI.venues();
      const fallbackPhotos = [photos.a, photos.b, photos.c];
      const mapped = await Promise.all(rows.map(async (v, idx) => {
        let fieldId = v.default_field_id;
        let price = Number(v.hourly_price_from || 0);
        let mode = (v.confirmation_mode === 'instant' && v.instant_booking_enabled === true) ? 'instant' : 'approval';
        let features = (Array.isArray(v.amenities) && v.amenities.length) ? v.amenities : ['عشب صناعي', 'إضاءة ليلية'];
        if(!fieldId){
          try {
            const fs = await MalaebiAPI.fields(v.id);
            if(fs && fs.length){
              fieldId = fs[0].id;
              price = Number(fs[0].hourly_price_from || 0) || price;
              mode = (fs[0].confirmation_mode === 'instant' && fs[0].instant_booking_enabled === true) ? 'instant' : 'approval';
              features = (Array.isArray(fs[0].amenities) && fs[0].amenities.length) ? fs[0].amenities : features;
            }
          } catch {}
        }
        const photo = v.cover_image_url || fallbackPhotos[idx % fallbackPhotos.length];
        return {
          id: v.id,
          fieldId,
          name: v.name,
          area: v.area || v.address_text || 'مأرب',
          price: price || 7000,
          rating: Number(v.rating || 4.8),
          reviews: Number(v.rating ? 15 : 6),
          photo,
          features,
          description: v.description || '',
          mode,
          deposit: 0
        };
      }));

      state.remoteVenues = mapped;
      try {
        localStorage.setItem('malaebi_cached_venues', JSON.stringify(mapped));
      } catch {}

      // Immediately re-render Home and Search lists with fresh data
      const homeList = $('#homeVenues');
      if(homeList && mapped && mapped.length){
        homeList.innerHTML = mapped.slice(0, 10).map(venueCard).join('');
      }
      const searchList = $('#searchVenues');
      if(searchList){
        renderSearch();
      }

      return mapped;
    } finally {
      loadVenuesPromise = null;
    }
  })();

  return loadVenuesPromise;
}

function renderHome(){
  const list = $('#homeVenues');
  if(!list) return;

  if(window.MalaebiAPI?.enabled()){
    // 1. If loaded in memory, render immediately (up to 10 venues)
    if(state.remoteVenues && state.remoteVenues.length){
      list.innerHTML = state.remoteVenues.slice(0, 10).map(venueCard).join('');
    } else {
      // 2. Check localStorage cache for 0ms startup
      const cached = localStorage.getItem('malaebi_cached_venues');
      if(cached){
        try {
          const parsed = JSON.parse(cached);
          if(Array.isArray(parsed) && parsed.length){
            state.remoteVenues = parsed;
            list.innerHTML = parsed.slice(0, 10).map(venueCard).join('');
          } else {
            renderSkeletons(list, 3);
          }
        } catch {
          renderSkeletons(list, 3);
        }
      } else {
        renderSkeletons(list, 3);
      }
    }

    // 3. Stale-While-Revalidate: ALWAYS fetch the latest venues from server in background
    loadRemoteVenues().then(venuesList => {
      if(venuesList && venuesList.length && list){
        list.innerHTML = venuesList.slice(0, 10).map(venueCard).join('');
        if(state.page === 'search') renderSearch();
      }
    }).catch(e => {
      if(!state.remoteVenues || !state.remoteVenues.length){
        list.innerHTML = '<div class="empty-state">تعذر تحميل الملاعب من الخادم. جاري الاتصال...</div>';
      }
      console.warn('Venue load notice:', e.message);
    });
    return;
  }

  list.innerHTML = venues.slice(0, 10).map(venueCard).join('');
}

function filteredVenues(){
  let list=(state.remoteVenues||venues).filter(v=>v.price<=state.price);
  if(state.query) list=list.filter(v=>(v.name+' '+v.area+' '+v.features.join(' ')).includes(state.query));
  if(state.filter==='grass') list=list.filter(v=>v.features.includes('عشب صناعي'));
  if(state.filter==='night') list=list.filter(v=>v.features.includes('إضاءة ليلية'));
  if(state.filter==='parking') list=list.filter(v=>v.features.includes('مواقف سيارات'));
  if(state.sort==='price_asc') list.sort((a,b)=>a.price-b.price);
  if(state.sort==='rating_desc') list.sort((a,b)=>b.rating-a.rating);
  return list;
}

async function renderSearch(){
  if(window.MalaebiAPI?.enabled()){
    try{ await loadRemoteVenues(); }catch(e){ toast(e.message); }
  }
  const list=filteredVenues();
  const searchVenues=$('#searchVenues');
  if(searchVenues) searchVenues.innerHTML=list.map(venueCard).join('');
  const resultCount=$('#resultCount');
  if(resultCount) resultCount.textContent=`(${list.length})`;
  const emptySearch=$('#emptySearch');
  if(emptySearch) emptySearch.classList.toggle('hidden',list.length>0);
}

function renderVenue(){
  const v=state.venue;
  if(!v) return;
  const currentTab=state.venueTab||'about';
  const venueDetails=$('#venueDetails');
  if(!venueDetails) return;
  venueDetails.innerHTML=`<div class="detail-cover" style="background-image:url('${v.photo}')"><button class="back-btn" data-go="search" type="button">→</button><button class="detail-fav ${state.favoriteIds.has(v.id)?'saved':''}" data-fav="${v.id}" type="button">${state.favoriteIds.has(v.id)?'♥':'♡'}</button></div><div class="detail-content"><div class="detail-title-row"><div><h1>${v.name}</h1><div class="detail-sub">⌖ ${v.area}</div></div><span class="detail-rating">★ ${v.rating} <small>(${v.reviews||0})</small></span></div><div class="detail-price">${money(v.price)} <small>للساعة الواحدة</small></div><div class="detail-tabs"><button type="button" class="detail-tab ${currentTab==='about'?'active':''}" data-detail-tab="about">عن الملعب</button><button type="button" class="detail-tab ${currentTab==='amenities'?'active':''}" data-detail-tab="amenities">المرافق</button><button type="button" class="detail-tab ${currentTab==='reviews'?'active':''}" data-detail-tab="reviews">التقييمات</button></div><div id="detailTabContent"></div><div class="detail-bottom"><div><small>السعر يبدأ من</small><b>${money(v.price)}</b></div><button class="primary-btn" data-book="${v.id}" type="button">احجز الآن ←</button></div></div>`;
  renderVenueTab(currentTab);
}

async function renderVenueTab(tab){
  state.venueTab=tab;
  const container=$('#detailTabContent');
  if(!container) return;
  const v=state.venue;
  if(!v) return;
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

        let eligibleBooking = null;
        if(localStorage.getItem('malaebi_access_token')){
          try{
            let myB = state.bookings;
            if(!myB || !myB.length){
              myB = await MalaebiAPI.myBookings();
              state.bookings = myB;
            }
            eligibleBooking = myB.find(b => {
              const matchesVenue = (b.venue_id && b.venue_id === v.id) || (b.venue_name && b.venue_name === v.name);
              return matchesVenue && b.status === 'completed';
            });
          }catch(bErr){
            console.warn('Could not check player bookings for review banner:', bErr);
          }
        }

        const addReviewBanner = eligibleBooking ? `
          <div style="background:var(--mint);border:1px solid #bfe5cb;border-radius:14px;padding:12px 14px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:10px;">
            <div>
              <b style="font-size:12.5px;color:var(--green);display:block;">لديك حجز مكتمل في هذا الملعب! ⭐</b>
              <small style="color:var(--ink);font-size:10.5px;">شارك تجربتك وساعد اللاعبين الآخرين في معرفة رأيك.</small>
            </div>
            <button class="primary-btn" id="openReviewFromTabBtn" data-booking-id="${eligibleBooking.id || eligibleBooking.serverId}" type="button" style="padding:8px 12px;font-size:11px;white-space:nowrap;box-shadow:none;">
              أضف تقييمك الآن
            </button>
          </div>
        ` : '';

        if(!reviews.length){
          container.innerHTML=`${addReviewBanner}<div class="tab-empty">لا توجد تقييمات بعد لهذا الملعب. كن أول من يقيّمه بعد إتمام حجزك!</div>`;
          const reviewBtn = $('#openReviewFromTabBtn');
          if(reviewBtn){
            reviewBtn.onclick = () => {
              state.selectedBookingId = reviewBtn.dataset.bookingId;
              showPage('rating');
            };
          }
          return;
        }
        const fullStars=Math.round(avg);
        container.innerHTML=`${addReviewBanner}<div class="reviews-summary"><div class="reviews-score">${avg}</div><div class="reviews-score-meta"><div class="reviews-score-stars">${'★'.repeat(fullStars)}${'☆'.repeat(Math.max(0,5-fullStars))}</div><small>بناءً على ${total} تقييم</small></div></div><div class="reviews-list">${reviews.map(r=>`<div class="review-item"><div class="review-item-head"><span class="review-player">⚽ ${r.player_name||'لاعب ملاعبي'}</span><span class="review-date">${r.created_at?new Intl.DateTimeFormat('ar-YE',{dateStyle:'medium'}).format(new Date(r.created_at)):''}</span></div><div class="review-stars">${'★'.repeat(r.rating||5)}${'☆'.repeat(Math.max(0,5-(r.rating||5)))}</div>${r.comment?`<p class="review-comment">${r.comment}</p>`:''}</div>`).join('')}</div>`;
        const reviewBtn = $('#openReviewFromTabBtn');
        if(reviewBtn){
          reviewBtn.onclick = () => {
            state.selectedBookingId = reviewBtn.dataset.bookingId;
            showPage('rating');
          };
        }
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

async function openVenue(id){
  state.venueTab='about';
  if(window.MalaebiAPI?.enabled()&&!state.remoteVenues){
    try{ await loadRemoteVenues(); }catch(e){}
  }
  const pool=state.remoteVenues||venues;
  state.venue=pool.find(v=>v.id===id)||pool[0];
  if(!state.venue) return;
  localStorage.setItem('malaebi_last_venue_id',state.venue.id);
  if(window.MalaebiAPI?.enabled()&&!state.venue.fieldId){
    try{
      const fs=await MalaebiAPI.fields(state.venue.id);
      if(fs.length){
        state.venue.fieldId=fs[0].id;
        state.venue.price=Number(fs[0].hourly_price_from||0);
        state.venue.mode=(fs[0].confirmation_mode==='instant'&&fs[0].instant_booking_enabled===true)?'instant':'approval';
        state.venue.features=Array.isArray(fs[0].amenities)?fs[0].amenities:[];
      }
    }catch(e){}
  }
  renderVenue();
  showPage('venue');
}

function toggleFavorite(id){
  if(state.favoriteIds.has(id)) state.favoriteIds.delete(id);
  else state.favoriteIds.add(id);
  localStorage.setItem('malaebi_favorites',JSON.stringify([...state.favoriteIds]));
  renderHome();
  if(state.page==='search') renderSearch();
  if(state.page==='venue') renderVenue();
  toast(state.favoriteIds.has(id)?'أضيف الملعب إلى المفضلة':'تمت إزالة الملعب من المفضلة');
}

function renderBooking(){
  const v=state.venue;
  if(!v) return;
  const mini = $('#bookingVenueMini');
  if(mini){
    mini.innerHTML=`<div class="mini-thumb" style="background-image:url('${v.photo}')"></div><div class="mini-info"><b>${v.name}</b><small>⌖ ${v.area}</small></div>`;
  }
  $('#bookingPrice').textContent=money(v.price);
  $('#bookingTotal').textContent=money(v.price);
  $('#confirmMethod').innerHTML=v.mode==='instant'?'هذا الملعب يعتمد <b>التأكيد الفوري</b> بعد نجاح إنشاء الحجز.':'هذا الملعب يعتمد <b>موافقة المنشأة</b> خلال المهلة المحددة في سياسة الحجز.';
  renderDates();
  renderTimes();
}

function renderDates(){
  const base=new Date();
  base.setHours(0,0,0,0);
  $('#bookingMonth').textContent=new Intl.DateTimeFormat('ar-YE',{month:'long',year:'numeric'}).format(state.date);
  $('#dateScroller').innerHTML=Array.from({length:7},(_,i)=>{
    const d=new Date(base);
    d.setDate(base.getDate()+i);
    return `<button class="date-option ${dateISO(d)===dateISO(state.date)?'active':''}" data-date="${dateISO(d)}"><small>${new Intl.DateTimeFormat('ar-YE',{weekday:'short'}).format(d)}</small><b>${d.getDate()}</b><small>${new Intl.DateTimeFormat('ar-YE',{month:'short'}).format(d)}</small></button>`;
  }).join('');
}

async function renderTimes(){
  const now = new Date();
  const today = dateISO(state.date) === dateISO(now);
  const timeGrid = $('#timeGrid');
  if(!timeGrid) return;

  const oldBanner = $('#allPastBanner');
  if(oldBanner) oldBanner.remove();

  if(window.MalaebiAPI?.enabled() && state.venue?.fieldId){
    try{
      const result = await MalaebiAPI.availability(state.venue.fieldId, dateISO(state.date));
      state.availableSlots = result.slots || [];

      let hasAvailable = false;
      let allPast = state.availableSlots.length > 0;

      const html = state.availableSlots.map(s => {
        const t = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Aden',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }).format(new Date(s.starts_at));

        const isPast = s.is_past || (today && new Date(s.starts_at).getTime() <= Date.now());
        const isBooked = s.is_booked || (!s.available && !isPast);
        const isAvail = s.available && !isPast && !isBooked;

        if(isAvail) hasAvailable = true;
        if(!isPast) allPast = false;

        let statusClass = 'available';
        let badgeText = 'متاح';
        if(isPast){
          statusClass = 'past';
          badgeText = 'انتهى';
        } else if(isBooked){
          statusClass = 'booked';
          badgeText = 'محجوز';
        }

        const isSelected = state.time === t;

        return `<button class="time-option ${statusClass} ${isSelected ? 'active' : ''}" data-time="${t}" data-starts="${s.starts_at}" ${!isAvail ? 'disabled' : ''}><span>${formatTime12Ar(t)}</span><span class="slot-status">${badgeText}</span></button>`;
      }).join('');

      timeGrid.innerHTML = html;

      if(allPast && today){
        const banner = document.createElement('div');
        banner.id = 'allPastBanner';
        banner.className = 'all-past-banner';
        banner.innerHTML = `
          <div class="past-icon">⏱</div>
          <div>
            <b>انتهت مواعيد اليوم</b>
            <small>انتهت كافة الأوقات المتاحة لهذا اليوم. يمكنك حجز موعد للغد بكل سهولة.</small>
          </div>
          <button type="button" class="tomorrow-btn" id="selectTomorrowBtn">عرض مواعيد الغد ←</button>
        `;
        timeGrid.before(banner);
        $('#selectTomorrowBtn').onclick = () => {
          const nextDay = new Date();
          nextDay.setDate(nextDay.getDate() + 1);
          nextDay.setHours(0,0,0,0);
          state.date = nextDay;
          state.time = null;
          state.selectedStartsAt = null;
          renderDates();
          renderTimes();
        };
      }

      $('#continueBooking').disabled = !state.time;
      return;
    }catch(e){
      toast(e.message);
    }
  }

  let hasAvailable = false;
  let allPast = true;
  const html = times.map(t => {
    const [h] = t.split(':').map(Number);
    const isPast = (today && h <= now.getHours());
    const isAvail = !isPast;
    if(isAvail) hasAvailable = true;
    if(!isPast) allPast = false;
    const statusClass = isPast ? 'past' : 'available';
    const badgeText = isPast ? 'انتهى' : 'متاح';
    const isSelected = state.time === t;
    return `<button class="time-option ${statusClass} ${isSelected ? 'active' : ''}" data-time="${t}" ${!isAvail ? 'disabled' : ''}><span>${formatTime12Ar(t)}</span><span class="slot-status">${badgeText}</span></button>`;
  }).join('');

  timeGrid.innerHTML = html;

  if(allPast && today){
    const banner = document.createElement('div');
    banner.id = 'allPastBanner';
    banner.className = 'all-past-banner';
    banner.innerHTML = `
      <div class="past-icon">⏱</div>
      <div>
        <b>انتهت مواعيد اليوم</b>
        <small>انتهت كافة الأوقات المتاحة لهذا اليوم. يمكنك حجز موعد للغد بكل سهولة.</small>
      </div>
      <button type="button" class="tomorrow-btn" id="selectTomorrowBtn">عرض مواعيد الغد ←</button>
    `;
    timeGrid.before(banner);
    $('#selectTomorrowBtn').onclick = () => {
      const nextDay = new Date();
      nextDay.setDate(nextDay.getDate() + 1);
      nextDay.setHours(0,0,0,0);
      state.date = nextDay;
      state.time = null;
      renderDates();
      renderTimes();
    };
  }

  $('#continueBooking').disabled = !state.time;
}

async function openBooking(id){
  if(id) await openVenue(id);
  if(!state.venue) return;
  const now = new Date();
  state.date = new Date();
  if(now.getHours() >= 23){
    state.date.setDate(state.date.getDate() + 1);
  }
  state.date.setHours(0,0,0,0);
  state.time = null;
  state.selectedStartsAt = null;
  renderBooking();
  showPage('booking');
}

function openCheckout(){
  const v=state.venue;
  if(!v||!state.time) return;
  const endHour = String((Number(state.time.slice(0,2))+1)%24).padStart(2,'0') + ':00';
  $('#checkoutSummary').innerHTML=`<h3>${v.name}</h3><div class="checkout-line"><span>التاريخ</span><b>${dateLabel(state.date)}</b></div><div class="checkout-line"><span>الوقت</span><b>${formatTime12Ar(state.time)} — ${formatTime12Ar(endHour)}</b></div><div class="checkout-line"><span>مدة الحجز</span><b>ساعة واحدة</b></div><div class="checkout-line"><span>طريقة التأكيد</span><b>${v.mode==='instant'?'فوري':'بموافقة المنشأة'}</b></div><div class="checkout-line"><span>الإجمالي</span><b style="color:var(--green)">${money(v.price)}</b></div>`;
  showPage('checkout');
}

async function loadMyBookings(){
  try{
    const rows=await MalaebiAPI.myBookings();
    state.bookings=rows.map(b=>({
      id:b.booking_no,
      serverId:b.id,
      venue:b.venue_name||'ملعب ملاعبي',
      area:'',
      date:b.starts_at?.slice(0,10)||'',
      dateText:b.starts_at?new Intl.DateTimeFormat('ar-YE',{dateStyle:'medium',timeZone:'Asia/Aden'}).format(new Date(b.starts_at)):'',
      time:b.starts_at?formatTime12Ar(b.starts_at):'',
      price:Number(b.total_price),
      status:b.status
    }));
    renderBookings();
  }catch(e){
    toast(e.message);
  }
}

function renderBookings(){
  const list=state.bookings.filter(b=>state.bookingTab==='all'||(state.bookingTab==='upcoming'&&['confirmed','pending','held'].includes(b.status))||(state.bookingTab==='pending'&&b.status==='pending')||(state.bookingTab==='past'&&['completed','cancelled','expired','no_show','disputed'].includes(b.status)));
  const myBookings=$('#myBookings');
  if(myBookings){
    myBookings.innerHTML=list.map(b=>`<article class="booking-card" data-booking-detail="${b.serverId||b.id}"><div class="booking-card-top"><div><h3>${b.venue}</h3><small>⌖ ${b.area}</small></div><span class="status-pill ${b.status==='pending'?'pending':''}">${b.status==='pending'?'بانتظار الموافقة':b.status==='confirmed'?'مؤكد':b.status==='cancelled'?'ملغي':b.status==='expired'?'منتهي':'مكتمل'}</span></div><div class="booking-card-meta"><span>${b.dateText||b.date} · ${formatTime12Ar(b.time)}</span><b>${money(b.price)}</b></div><small style="display:block;margin-top:9px">مرجع: ${b.id} · ${b.demo?'حجز تجريبي':''}</small></article>`).join('');
  }
  const emptyBookings=$('#emptyBookings');
  if(emptyBookings) emptyBookings.classList.toggle('hidden',list.length>0);
}

function renderAccount(){
  const u = state.user || JSON.parse(localStorage.getItem('malaebi_user') || 'null');
  if (u) state.user = u;
  const fullName = u?.full_name?.trim();
  const displayEmail = u?.email || state.email || u?.phone || state.phone || '';
  const profilePhone = $('#profilePhone');
  const profileName = $('#profileName');
  const loginBtn = $('#loginBtn');
  const logoutWrap = $('#accountLogoutWrap');
  const hasToken = !!localStorage.getItem('malaebi_access_token');

  if(profilePhone) profilePhone.textContent = displayEmail || 'سجّل الدخول لإدارة حسابك وحجوزاتك';
  if(profileName) profileName.textContent = fullName || (displayEmail ? 'لاعب ملاعبي' : 'مستخدم ضيف');
  if(loginBtn) loginBtn.textContent = (hasToken || u) ? 'تبديل الحساب' : 'تسجيل الدخول';
  if(logoutWrap) logoutWrap.classList.toggle('hidden', !hasToken && !u);
  const changePassBtn = $('#accountChangePassBtn');
  if(changePassBtn) changePassBtn.classList.toggle('hidden', !hasToken && !u);
}

function openModal(){ const m=$('#modalBackdrop'); if(m) m.classList.remove('hidden'); }
function closeModal(){ const m=$('#modalBackdrop'); if(m) m.classList.add('hidden'); }

function openChangePasswordModal(){
  if(!localStorage.getItem('malaebi_access_token')){
    toast('يرجى تسجيل الدخول أولاً لتغيير كلمة المرور');
    showPage('login');
    return;
  }
  $('#modalContent').innerHTML = `
    <h2 id="modalTitle">تغيير كلمة المرور</h2>
    <p>أدخل كلمة المرور الجديدة لحسابك (6 أحرف على الأقل):</p>
    <div id="playerChangePassError" style="display:none;background:#fee2e2;color:#dc2626;padding:10px 14px;border-radius:10px;font-size:12.5px;font-weight:700;margin:12px 0;text-align:right;"></div>
    <div style="display:grid;gap:12px;margin:16px 0;">
      <div>
        <label class="field-label" style="margin:0 0 5px;">كلمة المرور الجديدة (6 أحرف على الأقل) *</label>
        <input type="password" id="playerNewPass" class="review-input" placeholder="••••••••" minlength="6" autocomplete="new-password" dir="ltr" style="margin:0;height:46px;width:100%;" />
      </div>
      <div>
        <label class="field-label" style="margin:0 0 5px;">تأكيد كلمة المرور الجديدة *</label>
        <input type="password" id="playerConfirmPass" class="review-input" placeholder="••••••••" minlength="6" autocomplete="new-password" dir="ltr" style="margin:0;height:46px;width:100%;" />
      </div>
    </div>
    <div style="display:flex;gap:10px;margin-top:16px;">
      <button class="primary-btn full" id="submitPlayerChangePassBtn" type="button">حفظ كلمة المرور</button>
      <button class="outline-btn" style="color:var(--muted);border-color:var(--line);padding:11px 18px;border-radius:14px;" type="button" onclick="closeModal()">إلغاء</button>
    </div>
  `;
  openModal();

  $('#submitPlayerChangePassBtn').onclick = async () => {
    const p1 = $('#playerNewPass')?.value || '';
    const p2 = $('#playerConfirmPass')?.value || '';
    const errEl = $('#playerChangePassError');
    const btn = $('#submitPlayerChangePassBtn');

    if (errEl) errEl.style.display = 'none';

    if (!p1 || p1.length < 6) {
      if (errEl) { errEl.textContent = 'كلمة المرور يجب ألا تقل عن 6 أحرف.'; errEl.style.display = 'block'; }
      return;
    }
    if (p1 !== p2) {
      if (errEl) { errEl.textContent = 'كلمتا المرور غير متطابقتين، يرجى التأكد.'; errEl.style.display = 'block'; }
      return;
    }

    btn.disabled = true;
    btn.textContent = 'جاري الحفظ...';

    try {
      await MalaebiAPI.changePassword(p1);
      closeModal();
      toast('تم تغيير كلمة المرور بنجاح!');
    } catch (err) {
      if (errEl) {
        errEl.textContent = err.message || 'فشل تغيير كلمة المرور';
        errEl.style.display = 'block';
      }
    } finally {
      btn.disabled = false;
      btn.textContent = 'حفظ كلمة المرور';
    }
  };
}

function openPersonalInfoModal(){
  const u = state.user || JSON.parse(localStorage.getItem('malaebi_user') || 'null');
  if(!u && !localStorage.getItem('malaebi_access_token')){
    toast('يرجى تسجيل الدخول أولاً لإدارة بياناتك');
    showPage('login');
    return;
  }
  const name = u?.full_name || '';
  const email = u?.email || state.email || '';
  const phone = (u?.phone || state.phone || '').replace('+967', '');
  $('#modalContent').innerHTML = `
    <h2 id="modalTitle">البيانات الشخصية</h2>
    <p>تعديل اسمك الحقيقي ورقم هاتفك لحسابك وتقييماتك وحجوزاتك.</p>
    <label class="field-label">الاسم الكامل</label>
    <input id="editProfileName" class="auth-input" type="text" placeholder="الاسم الكامل" value="${name}">
    <label class="field-label">البريد الإلكتروني (للقراءة فقط)</label>
    <input class="auth-input" type="email" value="${email}" disabled style="opacity:.65;cursor:not-allowed">
    <label class="field-label">رقم الهاتف (اختياري)</label>
    <div class="phone-input">
      <span>+967</span>
      <input id="editProfilePhone" inputmode="tel" maxlength="9" placeholder="7XXXXXXXX" value="${phone}">
    </div>
    <button class="primary-btn full" id="saveProfileBtn" type="button" style="margin-top:18px">حفظ التعديلات <span>←</span></button>
  `;
  openModal();
  $('#saveProfileBtn').onclick = async () => {
    const newName = $('#editProfileName').value.trim();
    const rawPhone = $('#editProfilePhone').value.trim();
    if(!newName || newName.length < 2){
      toast('الاسم الكامل يجب أن يتكون من حرفين على الأقل');
      return;
    }
    if(rawPhone && !/^7\d{8}$/.test(rawPhone)){
      toast('رقم الهاتف يجب أن يبدأ بالرقم 7 ويتكون من 9 أرقام');
      return;
    }
    const fullPhone = rawPhone ? '+967' + rawPhone : '';
    if(window.MalaebiAPI?.enabled()){
      try{
        const updated = await MalaebiAPI.updateProfile({ full_name: newName, phone: fullPhone });
        state.user = updated;
        if(fullPhone) state.phone = fullPhone;
        localStorage.setItem('malaebi_user', JSON.stringify(updated));
        if(fullPhone) localStorage.setItem('malaebi_phone', fullPhone);
        renderAccount();
        closeModal();
        toast('تم حفظ البيانات الشخصية بنجاح!');
      }catch(err){
        toast(err.message || 'تعذر حفظ البيانات');
      }
      return;
    }
    state.user = { ...(state.user || {}), full_name: newName, phone: fullPhone };
    if(fullPhone) state.phone = fullPhone;
    localStorage.setItem('malaebi_user', JSON.stringify(state.user));
    if(fullPhone) localStorage.setItem('malaebi_phone', fullPhone);
    renderAccount();
    closeModal();
    toast('تم حفظ البيانات بنجاح (وضع المعاينة)');
  };
}

function openFavoritesModal(){
  const pool = state.remoteVenues || venues;
  const favVenues = pool.filter(v => state.favoriteIds.has(v.id));
  if(!favVenues.length){
    $('#modalContent').innerHTML = `
      <h2 id="modalTitle">الملاعب المفضلة</h2>
      <div class="empty-state">
        <span style="font-size:42px;color:var(--green)">♡</span>
        <b>قائمة المفضلة فارغة حالياً</b>
        <small>اضغط على رمز القلب في أي ملعب لحفظه هنا والوصول إليه بسرعة.</small>
        <button class="primary-btn full" style="margin-top:14px" type="button" id="modalExploreBtn">استكشف الملاعب</button>
      </div>
    `;
    openModal();
    const btn = $('#modalExploreBtn');
    if(btn) btn.onclick = () => { closeModal(); showPage('search'); };
    return;
  }
  $('#modalContent').innerHTML = `
    <h2 id="modalTitle">الملاعب المفضلة (${favVenues.length})</h2>
    <p>ملاعبك المفضلة لسهولة الوصول والحجز السريع:</p>
    <div style="display:grid;gap:10px;margin-top:12px;max-height:55vh;overflow-y:auto;padding:2px" id="favModalList">
      ${favVenues.map(v => `
        <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;border:1px solid var(--line);border-radius:14px;background:var(--white)">
          <div style="width:52px;height:52px;border-radius:10px;background-image:url('${v.photo}');background-size:cover;background-position:center;flex-shrink:0"></div>
          <div style="flex:1;min-width:0">
            <b style="font-size:13px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${v.name}</b>
            <small style="color:var(--muted);font-size:10px">${v.area} · ${money(v.price)}</small>
          </div>
          <button type="button" class="primary-btn" style="padding:6px 10px;font-size:11px;gap:4px" data-fav-book="${v.id}">حجز</button>
          <button type="button" style="border:0;background:transparent;color:#e05262;font-size:18px;cursor:pointer;padding:4px" data-fav-remove="${v.id}" title="إزالة من المفضلة">♥</button>
        </div>
      `).join('')}
    </div>
  `;
  openModal();
  $('#favModalList')?.addEventListener('click', e => {
    const bookBtn = e.target.closest('[data-fav-book]');
    if(bookBtn){
      closeModal();
      openVenue(bookBtn.dataset.favBook);
      return;
    }
    const remBtn = e.target.closest('[data-fav-remove]');
    if(remBtn){
      toggleFavorite(remBtn.dataset.favRemove);
      openFavoritesModal();
    }
  });
}

async function openNotificationsModal(){
  $('#modalContent').innerHTML = `
    <h2 id="modalTitle">الإشعارات والتنبيهات</h2>
    <div class="empty-state">جاري تحميل الإشعارات...</div>
  `;
  openModal();
  let notifs = [];
  if(window.MalaebiAPI?.enabled() && localStorage.getItem('malaebi_access_token')){
    try{
      notifs = await MalaebiAPI.notifications();
      // Mark notifications as read and clear dot
      MalaebiAPI.markNotificationsRead().catch(() => {});
      const dot = $('#headerNotificationDot');
      if(dot) dot.classList.remove('active');
    }catch(err){
      $('#modalContent').innerHTML = `
        <h2 id="modalTitle">الإشعارات والتنبيهات</h2>
        <div class="empty-state"><b>تعذر جلب الإشعارات</b><small>${err.message}</small></div>
      `;
      return;
    }
  } else {
    notifs = [
      { id: '1', title: 'مرحباً بك في ملاعبي', message: 'اكتشف أفضل ملاعب كرة القدم في مأرب واحجز موعدك بسهولة وسرعة.', created_at: new Date().toISOString() }
    ];
  }

  if(!notifs || !notifs.length){
    $('#modalContent').innerHTML = `
      <h2 id="modalTitle">الإشعارات والتنبيهات</h2>
      <div class="empty-state">
        <span style="font-size:42px;color:var(--green)">🔔</span>
        <b>لا توجد إشعارات جديدة حالياً</b>
        <small>ستظهر هنا تأكيدات الحجوزات والعروض والتحديثات الرياضية.</small>
      </div>
    `;
    return;
  }

  $('#modalContent').innerHTML = `
    <h2 id="modalTitle">الإشعارات والتنبيهات (${notifs.length})</h2>
    <div style="display:grid;gap:10px;margin-top:14px;max-height:55vh;overflow-y:auto;padding:2px">
      ${notifs.map(n => `
        <div class="notif-item">
          <div class="notif-item-head">
            <span class="notif-item-title">⚽ ${n.title || 'إشعار ملاعبي'}</span>
            <span class="notif-item-time">${n.created_at ? new Intl.DateTimeFormat('ar-YE', { dateStyle: 'short', timeStyle: 'short', hour12: true }).format(new Date(n.created_at)) : ''}</span>
          </div>
          <p class="notif-item-body">${n.body || n.message || ''}</p>
        </div>
      `).join('')}
    </div>
  `;
}

async function updateNotificationBadge(){
  const dot = $('#headerNotificationDot');
  if(!dot) return;
  if(!localStorage.getItem('malaebi_access_token') || !window.MalaebiAPI?.enabled()){
    dot.classList.remove('active');
    return;
  }
  try {
    const list = await MalaebiAPI.notifications();
    const hasUnread = Array.isArray(list) && list.some(n => !n.read_at && n.status !== 'read');
    if(hasUnread) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  } catch(e) {
    dot.classList.remove('active');
  }
}

function openContactModal(){
  $('#modalContent').innerHTML = `
    <h2 id="modalTitle">تواصل معنا والدعم الفني</h2>
    <p>نسعد بخدمتك والإجابة على أي استفسارات أو مقترحات عبر القنوات المعتمدة:</p>
    <div class="contact-cards">
      <a href="https://wa.me/967773461637" target="_blank" rel="noopener" class="contact-card">
        <div class="contact-card-icon wa">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        </div>
        <div class="contact-card-info">
          <b>واتساب مباشر</b>
          <small>773461637 · محادثة فورية واستفسارات الحجز</small>
        </div>
        <span class="contact-card-arrow">←</span>
      </a>

      <a href="https://instagram.com/bassam.methqal" target="_blank" rel="noopener" class="contact-card">
        <div class="contact-card-icon ig">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
        </div>
        <div class="contact-card-info">
          <b>إنستغرام</b>
          <small>@bassam.methqal · أخبار المنصة والأنشطة الرياضية</small>
        </div>
        <span class="contact-card-arrow">←</span>
      </a>

      <a href="mailto:malaebi12@gmail.com" class="contact-card">
        <div class="contact-card-icon mail">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
        </div>
        <div class="contact-card-info">
          <b>البريد الإلكتروني</b>
          <small>malaebi12@gmail.com · الدعم الرسمي والمراسلات</small>
        </div>
        <span class="contact-card-arrow">←</span>
      </a>
    </div>
    <button class="primary-btn full" type="button" onclick="closeModal()">إغلاق النافذة</button>
  `;
  openModal();
}

function openAboutModal(){
  $('#modalContent').innerHTML = `
    <div style="text-align:center;padding:10px 0 16px">
      <img src="assets/images/logo.svg" alt="ملاعبي" class="brand-logo" style="width:58px;height:58px;border-radius:18px;margin:0 auto 12px;display:block" />
      <h2 id="modalTitle" style="font-size:22px;margin:0 0 4px">ملاعبي · MALAEBI</h2>
      <small style="color:var(--green);font-weight:700">المنصة الأولى لحجز ملاعب كرة القدم في مأرب</small>
    </div>
    <p style="font-size:12px;color:var(--muted);line-height:1.8;text-align:right">
      ملاعبي منصة رياضية رقمية متكاملة تهدف إلى تسهيل حجز ملاعب كرة القدم، وتنظيم المباريات الودية والبطولات بين الفرق واللاعبين، مع توفير تجربة حجز واضحة وشفافة.
    </p>
    <div style="background:var(--mint);padding:14px;border-radius:14px;margin:14px 0;text-align:right;font-size:11px;color:var(--ink);line-height:1.7">
      <div style="margin-bottom:6px">⏱ <b>سياسة الإلغاء:</b> إلغاء مرن متاح حتى <b>6 ساعات</b> قبل موعد المباراة.</div>
      <div style="margin-bottom:6px">📍 <b>نطاق الخدمة:</b> مدينة مأرب والمناطق المجاورة.</div>
      <div>⚡ <b>طريقة الحجز:</b> تأكيد فوري أو بموافقة المنشأة مع الدفع عند الملعب.</div>
    </div>
    <div style="text-align:center;font-size:11px;color:var(--muted);margin-bottom:14px">
      الإصدار 1.0.0 (الإنتاج الفعلي) · جميع الحقوق محفوظة © ملاعبي
    </div>
    <button class="primary-btn full" type="button" onclick="closeModal()">حسناً</button>
  `;
  openModal();
}

function renderSettings(){
  const darkSwitch = $('#settingDarkMode');
  const alertBookingSwitch = $('#settingBookingAlerts');
  const alertMatchSwitch = $('#settingMatchReminder');
  if(darkSwitch) darkSwitch.checked = localStorage.getItem('malaebi_theme') === 'dark';
  if(alertBookingSwitch) alertBookingSwitch.checked = localStorage.getItem('malaebi_alert_booking') !== 'false';
  if(alertMatchSwitch) alertMatchSwitch.checked = localStorage.getItem('malaebi_alert_match') !== 'false';
}

function performLogout(){
  if(window.MalaebiAPI?.enabled()) window.MalaebiAPI.logout().catch(()=>{});
  else window.MalaebiAPI?.logout();
  state.user=null;
  state.email='';
  state.phone='';
  state.bookings=[];
  localStorage.removeItem('malaebi_user');
  localStorage.removeItem('malaebi_email');
  localStorage.removeItem('malaebi_phone');
  localStorage.removeItem('malaebi_demo_bookings');
  localStorage.removeItem('malaebi_access_token');
  localStorage.removeItem('malaebi_refresh_token');
  renderAccount();
  renderBookings();
  updateNotificationBadge();
  showPage('home');
  toast('تم تسجيل الخروج بنجاح');
}

// Event delegation for clicks in main content
$('#mainContent')?.addEventListener('click',e=>{
  const act=e.target.closest('[data-action]');
  if(act){
    const a=act.dataset.action;
    if(a==='personal'){ openPersonalInfoModal(); return; }
    if(a==='change-password'){ openChangePasswordModal(); return; }
    if(a==='favorites'){ openFavoritesModal(); return; }
    if(a==='notifications'){ openNotificationsModal(); return; }
    if(a==='help'){ openContactModal(); return; }
    if(a==='about'){ openAboutModal(); return; }
  }
  const tabBtn=e.target.closest('[data-detail-tab]');if(tabBtn){renderVenueTab(tabBtn.dataset.detailTab);return;}
  const fav=e.target.closest('[data-fav]');if(fav){e.stopPropagation();toggleFavorite(fav.dataset.fav);return;}
  const book=e.target.closest('[data-book]');if(book){openBooking(book.dataset.book);return;}
  const go=e.target.closest('[data-go]');if(go){showPage(go.dataset.go);return;}
  const card=e.target.closest('[data-venue]');if(card)openVenue(card.dataset.venue);
});

document.addEventListener('click',e=>{
  const go=e.target.closest('[data-go]');
  if(go&&!$('#mainContent')?.contains(go)) showPage(go.dataset.go);
});

// Search and filter listeners
const searchInput=$('#searchInput');
if(searchInput) searchInput.addEventListener('input',e=>{state.query=e.target.value.trim();renderSearch();});
const clearSearch=$('#clearSearch');
if(clearSearch) clearSearch.onclick=()=>{if(searchInput)searchInput.value='';state.query='';renderSearch();};
const priceRange=$('#priceRange');
if(priceRange) priceRange.oninput=e=>{state.price=Number(e.target.value);const l=$('#priceLabel');if(l)l.textContent='حتى '+money(state.price);renderSearch();};
$$('[data-sort]').forEach(b=>b.onclick=()=>{state.sort=b.dataset.sort;$$('[data-sort]').forEach(x=>x.classList.toggle('active',x===b));renderSearch();});
const resetFilters=$('#resetFilters');
if(resetFilters) resetFilters.onclick=()=>{state.query='';state.price=50000;state.sort='recommended';state.filter='all';if(searchInput)searchInput.value='';if(priceRange)priceRange.value=50000;const l=$('#priceLabel');if(l)l.textContent='حتى '+money(50000);$$('[data-sort]').forEach((x,i)=>x.classList.toggle('active',i===0));renderSearch();};
$$('[data-filter]').forEach(b=>b.onclick=()=>{state.filter=b.dataset.filter;$$('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));showPage('search');renderSearch();});

// Booking flow listeners
$('#dateScroller')?.addEventListener('click',e=>{
  const b=e.target.closest('[data-date]');
  if(!b) return;
  state.date=new Date(b.dataset.date+'T00:00:00');
  state.time=null;
  renderDates();
  renderTimes();
});
$('#timeGrid')?.addEventListener('click',e=>{
  const b=e.target.closest('[data-time]');
  if(!b||b.disabled) return;
  state.time=b.dataset.time;
  state.selectedStartsAt=b.dataset.starts||null;
  renderTimes();
});
const continueBooking=$('#continueBooking');
if(continueBooking) continueBooking.onclick=openCheckout;

const sendOtpBtn=$('#sendOtpBtn');
if(sendOtpBtn) {
  sendOtpBtn.onclick=()=>{
    const hasToken = !!localStorage.getItem('malaebi_access_token');
    if(window.MalaebiAPI?.enabled()){
      if(!hasToken){
        toast('سجّل الدخول أولاً لإتمام الحجز');
        showPage('login');
        return;
      }
      showPage('payment');
    }else{
      if(!state.user && !hasToken){
        toast('سجّل الدخول أولاً لإتمام الحجز');
        showPage('login');
        return;
      }
      showPage('payment');
    }
  };
}

$('#bookingTabs')?.addEventListener('click',e=>{
  const b=e.target.closest('[data-status]');
  if(!b) return;
  state.bookingTab=b.dataset.status;
  $$('[data-status]').forEach(x=>x.classList.toggle('active',x===b));
  renderBookings();
});

const modalClose=$('#modalClose');
if(modalClose) modalClose.onclick=closeModal;
const modalBackdrop=$('#modalBackdrop');
if(modalBackdrop) modalBackdrop.addEventListener('click',e=>{if(e.target.id==='modalBackdrop')closeModal();});
const loginBtn=$('#loginBtn');
if(loginBtn) loginBtn.onclick=()=>showPage('login');
const notificationsBtn=$('#notificationsBtn');
if(notificationsBtn) notificationsBtn.onclick=()=>openNotificationsModal();
const locationBtn=$('#locationBtn');
if(locationBtn) locationBtn.onclick=()=>toast('نطاق الإطلاق الحالي: مدينة مأرب والمناطق القريبة');

window.addEventListener('hashchange',()=>{
  const p=location.hash.slice(1);
  if(document.querySelector(`[data-page="${p}"]`)) showPage(p);
});

async function renderBookingDetail(){
  const b=state.bookings.find(x=>x.serverId===state.selectedBookingId||x.id===state.selectedBookingId)||state.bookings[0];
  if(window.MalaebiAPI?.enabled()&&b?.serverId){
    try{
      const fresh=await MalaebiAPI.bookingDetail(b.serverId);
      Object.assign(b,{
        status:fresh.status,
        price:Number(fresh.total_price),
        time:fresh.starts_at?formatTime12Ar(fresh.starts_at):(b.time?formatTime12Ar(b.time):'')
      });
    }catch(e){
      toast(e.message);
    }
  }
  const content=$('#bookingDetailContent');
  if(content){
    content.innerHTML=b?`<h3>${b.venue}</h3><div class="checkout-line"><span>المرجع</span><b>${b.id}</b></div><div class="checkout-line"><span>التاريخ</span><b>${b.dateText||b.date}</b></div><div class="checkout-line"><span>الوقت</span><b>${formatTime12Ar(b.time)}</b></div><div class="checkout-line"><span>الحالة</span><b>${b.status==='pending'?'بانتظار الموافقة':b.status==='confirmed'?'مؤكد':b.status==='cancelled'?'ملغي':b.status==='expired'?'منتهي':'مكتمل'}</b></div><div class="checkout-line"><span>المبلغ عند الملعب</span><b>${money(b.price)}</b></div>`:'لا توجد حجوزات لعرض تفاصيلها.';
  }
  renderQrCode($('#detailQrCode'), b?.id || b?.booking_no || '');
  const detailShareBtn = $('#detailShareBtn');
  if(detailShareBtn) detailShareBtn.onclick = () => shareBooking(b);
  const reviewBtn=document.querySelector('#page-booking-detail [data-go="rating"]');
  if(reviewBtn) reviewBtn.hidden=!(b&&b.status==='completed');
  const old=document.querySelector('#cancelBookingAction');
  if(old) old.remove();
  if(b&&['pending','held','confirmed'].includes(b.status)){
    const btn=document.createElement('button');
    btn.id='cancelBookingAction';
    btn.className='secondary-btn full';
    btn.textContent='إلغاء الحجز';
    btn.onclick=async()=>{
      if(!confirm('هل تريد إلغاء هذا الحجز؟')) return;
      if(window.MalaebiAPI?.enabled()&&b.serverId){
        try{
          const r=await MalaebiAPI.cancelBooking(b.serverId);
          toast(r.cancellation_refund_eligible?'تم الإلغاء وفق سياسة الست ساعات':'تم الإلغاء دون استرداد تلقائي');
        }catch(e){
          toast(e.message);
          return;
        }
      }else{
        b.status='cancelled';
        localStorage.setItem('malaebi_demo_bookings',JSON.stringify(state.bookings));
        toast('تم إلغاء الحجز التجريبي');
      }
      showPage('bookings');
    };
    if(content) content.after(btn);
  }
}

// Auth Tabs (تسجيل الدخول / إنشاء حساب)
const authTabs=$('#pageAuthTabs');
if(authTabs){
  authTabs.addEventListener('click',e=>{
    const tabBtn=e.target.closest('[data-auth-tab]');
    if(!tabBtn) return;
    const tab=tabBtn.dataset.authTab;
    $$('.auth-tab',authTabs).forEach(b=>b.classList.toggle('active',b===tabBtn));
    const loginForm=$('#pageLoginForm');
    const regForm=$('#pageRegisterForm');
    if(loginForm) loginForm.classList.toggle('hidden',tab!=='login');
    if(regForm) regForm.classList.toggle('hidden',tab!=='register');
  });
}

// Login submission
const submitLogin=$('#pageSubmitLogin');
if(submitLogin){
  submitLogin.onclick=async()=>{
    const email=$('#pageLoginEmail')?.value.trim();
    const password=$('#pageLoginPassword')?.value;
    if(!email||!/\S+@\S+\.\S+/.test(email)){
      toast('يرجى إدخال بريد إلكتروني صحيح');
      return;
    }
    if(!password){
      toast('يرجى إدخال كلمة المرور');
      return;
    }
    if(window.MalaebiAPI?.enabled()){
      try{
        const r=await MalaebiAPI.login(email,password);
        state.user=r.user;
        state.email=r.user?.email||email;
        localStorage.setItem('malaebi_user',JSON.stringify(r.user));
        localStorage.setItem('malaebi_email',state.email);
        renderAccount();
        updateNotificationBadge();
        showPage('home');
        toast(`مرحباً بك مجدداً يا ${r.user?.full_name||'لاعبنا'}`);
      }catch(e){
        toast(e.message||'فشل تسجيل الدخول');
      }
      return;
    }
    state.user={id:'demo-user',full_name:'لاعب تجريبي',email};
    state.email=email;
    localStorage.setItem('malaebi_user',JSON.stringify(state.user));
    localStorage.setItem('malaebi_email',email);
    renderAccount();
    showPage('home');
    toast('تم تسجيل الدخول في وضع المعاينة');
  };
}

function goToLoginWithEmail(email){
  showPage('login');
  const authTabs=$('#pageAuthTabs');
  if(authTabs){
    $$('.auth-tab',authTabs).forEach(b=>b.classList.toggle('active',b.dataset.authTab==='login'));
    const loginForm=$('#pageLoginForm');
    const regForm=$('#pageRegisterForm');
    if(loginForm) loginForm.classList.remove('hidden');
    if(regForm) regForm.classList.add('hidden');
  }
  const emInput=$('#pageLoginEmail');
  if(emInput && email) emInput.value=email;
  const passInput=$('#pageLoginPassword');
  if(passInput) passInput.focus();
}

function showOtp(email){
  activeAuthEmail=email||activeAuthEmail;
  const target=$('#pageOtpTarget');
  if(target){
    target.innerHTML=`أرسلنا رابط تفعيل الحساب إلى بريدك الإلكتروني (<b>${activeAuthEmail}</b>). افتح بريدك واضغط على رابط التأكيد، ثم عد إلى هنا لتسجيل الدخول.`;
  }
  showPage('otp');
}

// Register submission
const submitRegister=$('#pageSubmitRegister');
if(submitRegister){
  submitRegister.onclick=async()=>{
    const name=$('#pageRegisterName')?.value.trim();
    const email=$('#pageRegisterEmail')?.value.trim();
    const password=$('#pageRegisterPassword')?.value;
    if(!name||name.length<2){
      toast('يرجى كتابة الاسم الكامل (حرفان على الأقل)');
      return;
    }
    if(!email||!/\S+@\S+\.\S+/.test(email)){
      toast('يرجى إدخال بريد إلكتروني صحيح');
      return;
    }
    if(!password||password.length<6){
      toast('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    activeAuthEmail=email;
    if(window.MalaebiAPI?.enabled()){
      try{
        await MalaebiAPI.register(name,email,password);
        showOtp(email);
        toast('تم إرسال رابط التفعيل إلى بريدك الإلكتروني');
      }catch(e){
        toast(e.message||'تعذر إنشاء الحساب');
      }
      return;
    }
    showOtp(email);
    toast('أرسلنا رابط التفعيل إلى بريدك الإلكتروني');
  };
}

// Go to login after email confirmation
const pageGoLogin=$('#pageGoLogin');
if(pageGoLogin){
  pageGoLogin.onclick=()=>{
    goToLoginWithEmail(activeAuthEmail);
  };
}

// Resend OTP
const resendOtpBtn=$('#resendOtp');
if(resendOtpBtn){
  resendOtpBtn.onclick=async()=>{
    if(!activeAuthEmail){
      toast('يرجى إدخال البريد الإلكتروني أولاً');
      showPage('login');
      return;
    }
    if(window.MalaebiAPI?.enabled()){
      try{
        await MalaebiAPI.resendEmailOtp(activeAuthEmail);
        toast('تمت إعادة إرسال رمز التحقق إلى بريدك');
      }catch(e){
        toast(e.message||'تعذر إعادة الإرسال');
      }
    }else{
      toast('رمز المعاينة هو 123456');
    }
  };
}

// Booking confirmation button
const completeDemoBooking=$('#completeDemoBooking');
if(completeDemoBooking){
  completeDemoBooking.onclick=async()=>{
    if(!state.venue||!state.time){
      toast('اختر الملعب والموعد أولاً');
      return;
    }
    if(window.MalaebiAPI?.enabled()){
      if(!localStorage.getItem('malaebi_access_token')){
        toast('سجّل الدخول أولاً لتأكيد الحجز');
        showPage('login');
        return;
      }
      try{
        const starts=state.selectedStartsAt||new Date(`${dateISO(state.date)}T${state.time}:00+03:00`).toISOString();
        const b=await MalaebiAPI.createBooking(state.venue.fieldId,starts);
        const item={
          id:b.booking_no,
          serverId:b.id,
          venue:state.venue.name,
          area:state.venue.area,
          date:dateISO(state.date),
          dateText:dateLabel(state.date),
          time:formatTime12Ar(state.time),
          price:Number(b.total_price),
          status:b.status,
          demo:false
        };
        state.bookings.unshift(item);
        lastConfirmedBooking = item;
        const confInfo=$('#confirmationInfo');
        if(confInfo){
          confInfo.innerHTML=`<div class="checkout-line"><span>رقم الحجز</span><b>${b.booking_no}</b></div><div class="checkout-line"><span>الحالة</span><b>${b.status==='pending'?'بانتظار موافقة المنشأة':'مؤكد'}</b></div><div class="checkout-line"><span>الملعب</span><b>${state.venue.name}</b></div><div class="checkout-line"><span>الوقت</span><b>${formatTime12Ar(state.time)}</b></div><div class="checkout-line"><span>المبلغ عند الملعب</span><b>${money(b.total_price)}</b></div>`;
        }
        renderQrCode($('#confirmationQrCode'), b.booking_no || b.id);
        const confShareBtn = $('#confirmationShareBtn');
        if(confShareBtn) confShareBtn.onclick = () => shareBooking(item);
        showPage('confirmation');
        return;
      }catch(e){
        toast(e.message);
        return;
      }
    }
    const b={
      id:'DEMO-'+Date.now().toString().slice(-6),
      venueId:state.venue.id,
      venue:state.venue.name,
      area:state.venue.area,
      photo:state.venue.photo,
      date:dateISO(state.date),
      dateText:dateLabel(state.date),
      time:formatTime12Ar(state.time),
      price:state.venue.price,
      status:state.venue.mode==='instant'?'confirmed':'pending',
      createdAt:new Date().toISOString(),
      demo:true
    };
    state.bookings.unshift(b);
    lastConfirmedBooking = b;
    localStorage.setItem('malaebi_demo_bookings',JSON.stringify(state.bookings));
    const confInfo=$('#confirmationInfo');
    if(confInfo){
      confInfo.innerHTML=`<div class="checkout-line"><span>رقم الحجز</span><b>${b.id}</b></div><div class="checkout-line"><span>الملعب</span><b>${b.venue}</b></div><div class="checkout-line"><span>الموعد</span><b>${b.dateText} · ${formatTime12Ar(b.time)}</b></div><div class="checkout-line"><span>المبلغ</span><b>${money(b.price)}</b></div>`;
    }
    renderQrCode($('#confirmationQrCode'), b.id);
    const confShareBtn = $('#confirmationShareBtn');
    if(confShareBtn) confShareBtn.onclick = () => shareBooking(b);
    showPage('confirmation');
  };
}

$('#myBookings')?.addEventListener('click',e=>{
  const card=e.target.closest('[data-booking-detail]');
  if(card){
    state.selectedBookingId=card.dataset.bookingDetail;
    showPage('booking-detail');
  }
});

$('#ratingStars')?.addEventListener('click',e=>{
  const b=e.target.closest('[data-star]');
  if(!b) return;
  selectedRating=Number(b.dataset.star);
  $$('[data-star]').forEach(x=>x.style.color=Number(x.dataset.star)<=selectedRating?'#e9aa2b':'#c9d1cb');
});

const submitReview=$('#submitReview');
if(submitReview){
  submitReview.onclick=async()=>{
    const b=state.bookings.find(x=>x.serverId===state.selectedBookingId||x.id===state.selectedBookingId)||state.bookings[0];
    if(window.MalaebiAPI?.enabled()&&b?.serverId){
      try{
        await MalaebiAPI.review(b.serverId,selectedRating,$('#reviewText')?.value||'');
        toast('تم إرسال التقييم بنجاح!');
        showPage('bookings');
      }catch(e){
        toast(e.message);
      }
    }else{
      toast('التقييم تجريبي؛ لا يُرسل قبل ربط API والتحقق من اكتمال الحجز');
    }
  };
}

// Account Logout Button
const accountLogoutBtn=$('#accountLogoutBtn');
if(accountLogoutBtn){
  accountLogoutBtn.onclick=()=>{
    if(confirm('هل أنت متأكد من رغبتك في تسجيل الخروج؟')){
      performLogout();
    }
  };
}

const settingsLogout=$('#settingsLogout');
if(settingsLogout){
  settingsLogout.onclick=()=>{
    if(confirm('هل أنت متأكد من رغبتك في تسجيل الخروج؟')){
      performLogout();
    }
  };
}

// Settings Controls
const settingDarkMode=$('#settingDarkMode');
if(settingDarkMode){
  settingDarkMode.onchange=e=>{
    const isDark = e.target.checked;
    toggleTheme(isDark);
    toast(isDark ? 'تم تفعيل الوضع الليلي' : 'تم تفعيل الوضع الفاتح');
  };
}

const topThemeToggle=$('#topThemeToggle');
if(topThemeToggle){
  topThemeToggle.onclick=()=>{
    const isDark = !document.body.classList.contains('dark-mode');
    toggleTheme(isDark);
    toast(isDark ? 'تم تفعيل الوضع الليلي' : 'تم تفعيل الوضع الفاتح');
  };
}

const settingBookingAlerts=$('#settingBookingAlerts');
if(settingBookingAlerts){
  settingBookingAlerts.onchange=e=>{
    localStorage.setItem('malaebi_alert_booking', e.target.checked ? 'true' : 'false');
    toast(e.target.checked ? 'تم تفعيل تنبيهات حالة الحجز' : 'تم إيقاف تنبيهات حالة الحجز');
  };
}

const settingMatchReminder=$('#settingMatchReminder');
if(settingMatchReminder){
  settingMatchReminder.onchange=e=>{
    localStorage.setItem('malaebi_alert_match', e.target.checked ? 'true' : 'false');
    toast(e.target.checked ? 'تم تفعيل تذكير موعد المباراة' : 'تم إيقاف تذكير موعد المباراة');
  };
}

const settingClearCache=$('#settingClearCache');
if(settingClearCache){
  settingClearCache.onclick=async()=>{
    if(!confirm('هل تريد مسح ملفات الكاش وتحديث التطبيق لأحدث نسخة؟')) return;
    if('caches' in window){
      try{
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }catch{}
    }
    toast('تم مسح الكاش بنجاح، جاري إعادة تحميل التطبيق...');
    setTimeout(() => {
      window.location.reload(true);
    }, 700);
  };
}

// Check for Supabase Auth tokens in URL (e.g. from email verification link)
let isEmailVerificationRedirect = false;
try {
  const rawHash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
  const rawSearch = window.location.search.startsWith('?') ? window.location.search.slice(1) : window.location.search;
  let params = new URLSearchParams(rawHash);
  if (!params.get('access_token') && rawSearch) {
    const s = new URLSearchParams(rawSearch);
    if (s.get('access_token')) params = s;
  }
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  if (accessToken) {
    localStorage.setItem('malaebi_access_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('malaebi_refresh_token', refreshToken);
    }
    try {
      history.replaceState(null, '', window.location.pathname + '#home');
    } catch {}
    isEmailVerificationRedirect = true;
  } else if (params.get('error_description')) {
    const errDesc = decodeURIComponent(params.get('error_description').replace(/\+/g, ' '));
    toast(errDesc || 'تعذر تأكيد الرابط، يرجى طلب رابط جديد');
    try {
      history.replaceState(null, '', window.location.pathname + '#login');
    } catch {}
  }
} catch (e) {
  console.warn('Auth redirect token parse error:', e);
}

// Apply Saved Theme immediately on Startup
const initialDark = localStorage.getItem('malaebi_theme') === 'dark';
if(initialDark){
  document.body.classList.add('dark-mode');
}
updateThemeIcons(initialDark);

// App Startup & Initialization
renderHome();
renderSearch();
renderAccount();
renderSettings();

if(window.MalaebiAPI?.enabled()&&localStorage.getItem('malaebi_access_token')){
  MalaebiAPI.me().then(me=>{
    if(me){
      state.user=me;
      localStorage.setItem('malaebi_user',JSON.stringify(me));
      if(me.email) localStorage.setItem('malaebi_email',me.email);
      renderAccount();
      updateNotificationBadge();
    }
  }).catch(()=>{});
  loadMyBookings();
  updateNotificationBadge();
}

if (isEmailVerificationRedirect) {
  toast('تم تفعيل حسابك وتسجيل دخولك بنجاح');
  showPage('home');
} else {
  // Determine initial page
  const requestedPage=location.hash?location.hash.slice(1):'';
  const validPage=requestedPage&&document.querySelector(`[data-page="${requestedPage}"]`);
  showPage(validPage?requestedPage:'home');
}

// Bottom Nav Indicator layout sync
window.addEventListener('resize', () => {
  const activeNav = $('.nav-item.active');
  if(activeNav) updateNavIndicator(activeNav);
});
setTimeout(() => {
  const activeNav = $('.nav-item.active');
  if(activeNav) updateNavIndicator(activeNav);
}, 60);
if('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      reg.update();
    }).catch(() => {});
  });
}

// OTP Inputs auto-advance and backspace
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
