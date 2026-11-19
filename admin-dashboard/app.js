/* ==================== MALAEBI ADMIN DASHBOARD LOGIC ==================== */
(function() {
  'use strict';

  // Application State
  const state = {
    user: null,
    overview: null,
    venues: [],
    owners: [],
    bookings: [],
    areas: [],
    activeView: 'viewOverview',
    activeVenueSubtab: 'venues',
    currentTheme: localStorage.getItem('malaebi_admin_theme') || 'light',
    selectedVenueForUpload: null,
    lastCreatedCredentials: null
  };

  // ==================== MALAEBI CUSTOM CONFIRM & DIALOG SYSTEM ====================
  function showConfirmDialog({
    title = 'تأكيد الإجراء',
    message = 'هل أنت متأكد من رغبتك في المتابعة؟',
    confirmText = 'تأكيد',
    cancelText = 'إلغاء',
    danger = false,
    icon = null
  } = {}) {
    return new Promise((resolve) => {
      let dialog = document.getElementById('malaebiConfirmDialog');
      if (!dialog) {
        dialog = document.createElement('div');
        dialog.id = 'malaebiConfirmDialog';
        dialog.className = 'malaebi-confirm-backdrop hidden';
        dialog.innerHTML = `
          <div class="malaebi-confirm-card" role="dialog" aria-modal="true" aria-labelledby="confirmTitleText">
            <div class="malaebi-confirm-icon-wrap" id="malaebiConfirmIcon"></div>
            <h3 class="malaebi-confirm-title" id="confirmTitleText"></h3>
            <p class="malaebi-confirm-message" id="malaebiConfirmMessage"></p>
            <div class="malaebi-confirm-actions">
              <button type="button" class="malaebi-confirm-btn ok-primary" id="malaebiConfirmOk"></button>
              <button type="button" class="malaebi-confirm-btn btn-cancel" id="malaebiConfirmCancel"></button>
            </div>
          </div>
        `;
        document.body.appendChild(dialog);
      }

      const card = dialog.querySelector('.malaebi-confirm-card');
      const iconEl = dialog.querySelector('#malaebiConfirmIcon');
      const titleEl = dialog.querySelector('#confirmTitleText');
      const msgEl = dialog.querySelector('#malaebiConfirmMessage');
      const okBtn = dialog.querySelector('#malaebiConfirmOk');
      const cancelBtn = dialog.querySelector('#malaebiConfirmCancel');

      titleEl.textContent = title;
      msgEl.textContent = message;
      okBtn.textContent = confirmText;
      cancelBtn.textContent = cancelText;

      if (danger) {
        card.classList.add('is-danger');
        okBtn.className = 'malaebi-confirm-btn ok-danger';
      } else {
        card.classList.remove('is-danger');
        okBtn.className = 'malaebi-confirm-btn ok-primary';
      }

      if (icon) {
        iconEl.innerHTML = icon;
      } else if (window.MalaebiIcons3D) {
        iconEl.innerHTML = danger ? window.MalaebiIcons3D.trash(28) : window.MalaebiIcons3D.checkBadge(28);
      } else {
        iconEl.innerHTML = danger ? (window.MalaebiIcons3D ? window.MalaebiIcons3D.trash(28) : '✕') : (window.MalaebiIcons3D ? window.MalaebiIcons3D.checkBadge(28) : '✓');
      }

      dialog.classList.remove('hidden');
      requestAnimationFrame(() => dialog.classList.add('visible'));

      function cleanup(result) {
        dialog.classList.remove('visible');
        setTimeout(() => {
          dialog.classList.add('hidden');
          okBtn.removeEventListener('click', onOk);
          cancelBtn.removeEventListener('click', onCancel);
          dialog.removeEventListener('click', onBackdrop);
          resolve(result);
        }, 220);
      }

      function onOk() { cleanup(true); }
      function onCancel() { cleanup(false); }
      function onBackdrop(e) {
        if (e.target === dialog) cleanup(false);
      }

      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
      dialog.addEventListener('click', onBackdrop);
    });
  }

  // Toast Notification
  function showToast(message, type = 'info') {
    const toast = document.getElementById('toastBar');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast-bar visible ${type}`;
    setTimeout(() => {
      toast.className = 'toast-bar';
    }, 3500);
  }

  // Escape HTML Helper
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Theme Initializer
  function initTheme() {
    if (state.currentTheme === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    updateThemeIcon();
  }

  function toggleTheme() {
    state.currentTheme = state.currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('malaebi_admin_theme', state.currentTheme);
    initTheme();
  }

  function updateThemeIcon() {
    const icon = document.getElementById('themeIcon');
    if (icon && window.MalaebiIcons3D) {
      icon.innerHTML = state.currentTheme === 'dark'
        ? window.MalaebiIcons3D.sun(20)
        : window.MalaebiIcons3D.moon(20);
    }
  }

  // Render Static 3D Icons Across The Dashboard
  function renderStaticIcons() {
    if (!window.MalaebiIcons3D) return;
    const I = window.MalaebiIcons3D;

    // Topbar
    const refreshEl = document.getElementById('refreshIcon');
    if (refreshEl) refreshEl.innerHTML = I.refresh(20);
    const logoutEl = document.getElementById('logoutIcon');
    if (logoutEl) logoutEl.innerHTML = I.door(20);
    updateThemeIcon();

    // Headers
    const kpiStadEl = document.getElementById('kpiStadIcon');
    if (kpiStadEl) kpiStadEl.innerHTML = I.chart(22);
    const secVenuesEl = document.getElementById('sectionVenuesIcon');
    if (secVenuesEl) secVenuesEl.innerHTML = I.stadium(22);
    const secBookingsEl = document.getElementById('sectionBookingsIcon');
    if (secBookingsEl) secBookingsEl.innerHTML = I.clipboard(22);
    const secAccountEl = document.getElementById('sectionAccountIcon');
    if (secAccountEl) secAccountEl.innerHTML = I.crown(22);

    // Subtabs
    const subVenuesIcon = document.getElementById('subtabVenuesIcon');
    if (subVenuesIcon) subVenuesIcon.innerHTML = I.stadium(16);
    const subOwnersIcon = document.getElementById('subtabOwnersIcon');
    if (subOwnersIcon) subOwnersIcon.innerHTML = I.user(16);

    // KPI stat icons
    const kpiV = document.getElementById('kpiIconVenues');
    if (kpiV) kpiV.innerHTML = I.stadium(24);
    const kpiF = document.getElementById('kpiIconFields');
    if (kpiF) kpiF.innerHTML = I.ball(24);
    const kpiU = document.getElementById('kpiIconUsers');
    if (kpiU) kpiU.innerHTML = I.user(24);
    const kpiB = document.getElementById('kpiIconBookings');
    if (kpiB) kpiB.innerHTML = I.clipboard(24);

    // Account quick links
    const linkPwa = document.getElementById('linkPlayerPwaIcon');
    if (linkPwa) linkPwa.innerHTML = I.phone(18);
    const linkVenue = document.getElementById('linkVenueDashIcon');
    if (linkVenue) linkVenue.innerHTML = I.stadium(18);
    const installPwaIcon = document.getElementById('adminInstallPwaIcon');
    if (installPwaIcon) installPwaIcon.innerHTML = I.phone(18);
    const accLogout = document.getElementById('accountLogoutIcon');
    if (accLogout) accLogout.innerHTML = I.door(18);

    // Bottom Navigation
    const bOverview = document.getElementById('bnavIconOverview');
    if (bOverview) bOverview.innerHTML = I.chart(22);
    const bVenues = document.getElementById('bnavIconVenues');
    if (bVenues) bVenues.innerHTML = I.stadium(22);
    const bBookings = document.getElementById('bnavIconBookings');
    if (bBookings) bBookings.innerHTML = I.clipboard(22);
    const bAccount = document.getElementById('bnavIconAccount');
    if (bAccount) bAccount.innerHTML = I.crown(22);

    // Modal static icons
    const genPw = document.getElementById('genPwIcon');
    if (genPw) genPw.innerHTML = I.dice(16);
    const subOwner = document.getElementById('submitOwnerIcon');
    if (subOwner) subOwner.innerHTML = I.rocket(18);
    const credSucc = document.getElementById('credSuccessIcon');
    if (credSucc) credSucc.innerHTML = I.celebrate(22);
    const waShare = document.getElementById('waShareIcon');
    if (waShare) waShare.innerHTML = I.whatsapp(18);
    const copyCred = document.getElementById('copyCredIcon');
    if (copyCred) copyCred.innerHTML = I.copy(18);
    const noteEl = document.getElementById('ownerNoteIcon');
    if (noteEl) noteEl.innerHTML = I.about(16);
  }

  // Format YER Currency
  function formatMoney(amount) {
    const num = Number(amount) || 0;
    return num.toLocaleString('en-US') + ' ريال';
  }

  // View Navigation
  function switchView(viewId) {
    state.activeView = viewId;
    document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) target.classList.add('active');

    document.querySelectorAll('.bnav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewId);
    });

    if (viewId === 'viewVenues') {
      if (state.activeVenueSubtab === 'venues') {
        renderVenues();
      } else {
        renderOwners();
      }
    }
    if (viewId === 'viewBookings') renderBookings();
  }

  // Switch Subtabs between Venues and Owners
  function switchVenueSubtab(subtab) {
    state.activeVenueSubtab = subtab;
    const btnV = document.getElementById('subtabVenues');
    const btnO = document.getElementById('subtabOwners');
    const panelV = document.getElementById('venuesPanel');
    const panelO = document.getElementById('ownersPanel');

    if (subtab === 'venues') {
      if (btnV) {
        btnV.style.background = 'var(--card-bg)';
        btnV.style.color = 'var(--ink)';
        btnV.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
      }
      if (btnO) {
        btnO.style.background = 'transparent';
        btnO.style.color = 'var(--muted)';
        btnO.style.boxShadow = 'none';
      }
      if (panelV) panelV.style.display = 'block';
      if (panelO) panelO.style.display = 'none';
      renderVenues();
    } else {
      if (btnO) {
        btnO.style.background = 'var(--card-bg)';
        btnO.style.color = 'var(--ink)';
        btnO.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
      }
      if (btnV) {
        btnV.style.background = 'transparent';
        btnV.style.color = 'var(--muted)';
        btnV.style.boxShadow = 'none';
      }
      if (panelV) panelV.style.display = 'none';
      if (panelO) panelO.style.display = 'block';
      renderOwners();
    }
  }

  // ==================== DATA LOADING ====================
  async function loadDashboardData() {
    try {
      // 1. Overview
      const overviewData = await window.MalaebiAdminAPI.getOverview();
      state.overview = overviewData;
      renderOverview(overviewData);

      // 2. Venues
      const venues = await window.MalaebiAdminAPI.getVenues();
      state.venues = venues;
      renderVenues();

      // 3. Owners
      const owners = await window.MalaebiAdminAPI.getOwners();
      state.owners = owners;
      renderOwners();

      // 4. Bookings
      const bookings = await window.MalaebiAdminAPI.getBookings();
      state.bookings = bookings;
      renderBookings();

      // 5. Areas
      const areas = await window.MalaebiAdminAPI.getAreas();
      state.areas = areas;

    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      showToast(err.message || 'فشل تحميل بيانات لوحة الإدارة', 'error');
    }
  }

  // ==================== 1. RENDER OVERVIEW ====================
  function renderOverview(data) {
    if (!data) return;
    const v = data.venues || {};
    const f = data.fields || {};
    const u = data.users || {};
    const b = data.bookings || {};

    const elVTotal = document.getElementById('statVenuesTotal');
    const elVActive = document.getElementById('statVenuesActive');
    if (elVTotal) elVTotal.textContent = v.total || 0;
    if (elVActive) elVActive.textContent = `${v.active || 0} منشأة نشطة (${v.suspended || 0} معلقة)`;

    const elFTotal = document.getElementById('statFieldsTotal');
    const elFActive = document.getElementById('statFieldsActive');
    if (elFTotal) elFTotal.textContent = f.total || 0;
    if (elFActive) elFActive.textContent = `${f.active || 0} ملعب نشط`;

    const elUTotal = document.getElementById('statUsersTotal');
    if (elUTotal) elUTotal.textContent = u.total_users || 0;

    const elBTotal = document.getElementById('statBookingsTotal');
    const elRTotal = document.getElementById('statRevenueTotal');
    if (elBTotal) elBTotal.textContent = b.total || 0;
    if (elRTotal) elRTotal.textContent = formatMoney(b.total_revenue || 0);

    const elTodayB = document.getElementById('statTodayBookings');
    const elTodayR = document.getElementById('statTodayRevenue');
    if (elTodayB) elTodayB.textContent = b.today_bookings || 0;
    if (elTodayR) elTodayR.textContent = formatMoney(b.today_revenue || 0);

    const dateEl = document.getElementById('todayDateStr');
    if (dateEl) {
      try {
        dateEl.textContent = new Intl.DateTimeFormat('ar-YE', { dateStyle: 'full' }).format(new Date());
      } catch {
        dateEl.textContent = new Date().toLocaleDateString('ar-YE');
      }
    }
  }

  // ==================== 2. RENDER VENUES ====================
  function renderVenues() {
    const container = document.getElementById('venuesContainer');
    if (!container) return;

    const searchTerm = (document.getElementById('venueSearchInput')?.value || '').trim().toLowerCase();
    const statusFilter = document.getElementById('venueStatusFilter')?.value || 'all';

    let list = state.venues || [];

    if (statusFilter !== 'all') {
      list = list.filter(v => v.status === statusFilter);
    }

    if (searchTerm) {
      list = list.filter(v => {
        const name = (v.name || '').toLowerCase();
        const owner = (v.owner_name || '').toLowerCase();
        const area = (v.area_name || '').toLowerCase();
        return name.includes(searchTerm) || owner.includes(searchTerm) || area.includes(searchTerm);
      });
    }

    const badge = document.getElementById('venuesCountBadge');
    if (badge) badge.textContent = (state.venues || []).length;

    const I = window.MalaebiIcons3D;

    if (list.length === 0) {
      const emptyIcon = I ? I.stadium(36) : '';
      container.innerHTML = `
        <div style="text-align:center; padding:36px 16px; color:var(--muted); font-size:13px; background:var(--card); border-radius:16px; border:1px solid var(--line);">
          <div class="icon-3d-wrap lg" style="margin:0 auto 10px;">${emptyIcon}</div>
          <b>لا توجد منشآت مطابقة للبحث أو الفلتر</b>
          <p style="margin-top:6px; font-size:11.5px;">تظهر هنا المنشآت التي أنشأها الملاك بأنفسهم في بوابة المنشأة.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(v => {
      const isSuspended = v.status === 'suspended';
      const statusBadge = isSuspended
        ? '<span class="venue-badge suspended">معلقة مؤقتاً</span>'
        : '<span class="venue-badge active">نشطة ومعتمدة</span>';

      const toggleActionText = isSuspended ? 'تفعيل المنشأة' : 'إيقاف مؤقت';
      const toggleActionStatus = isSuspended ? 'active' : 'suspended';

      const thumbImg = v.cover_image_url
        ? `<img src="${escapeHtml(v.cover_image_url)}" alt="${escapeHtml(v.name)}" loading="lazy">`
        : `<div class="icon-3d-wrap lg">${I ? I.stadium(26) : ''}</div>`;

      const ownerPhoneClean = (v.owner_phone || v.phone || '').replace(/[^0-9]/g, '');
      const whatsappBtn = ownerPhoneClean
        ? `<a href="https://wa.me/967${ownerPhoneClean.slice(-9)}?text=${encodeURIComponent('السلام عليكم أخي ' + (v.owner_name || '') + '، بخصوص منشأتكم ' + v.name + ' في منصة ملاعبي.')}" target="_blank" rel="noopener" class="btn-outline btn-sm" style="display:inline-flex; align-items:center; gap:5px; text-decoration:none; color:#10b981; border-color:rgba(16,185,129,0.3);">
            ${I ? I.whatsapp(15) : ''}
            <span>واتساب</span>
           </a>`
        : '';

      return `
        <article class="venue-card" data-venue-id="${v.id}">
          <div class="venue-card-header">
            <div class="venue-thumbnail">
              ${thumbImg}
            </div>
            <div class="venue-card-meta">
              <h3 class="venue-card-title">${escapeHtml(v.name)}</h3>
              <div class="venue-card-area">
                <span class="icon-3d-wrap sm">${I ? I.pin(13) : ''}</span>
                <span>${escapeHtml(v.area_name || 'مأرب')}</span>
                <span>·</span>
                ${statusBadge}
              </div>
            </div>
          </div>

          <div class="venue-card-owner">
            <div><b>المالك:</b> ${escapeHtml(v.owner_name || 'غير محدد')}</div>
            <div><b>البريد:</b> <span dir="ltr">${escapeHtml(v.owner_email || '-')}</span></div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
              <div><b>الهاتف:</b> <span dir="ltr">${escapeHtml(v.owner_phone || v.phone || '-')}</span></div>
              ${whatsappBtn}
            </div>
          </div>

          <div class="venue-stats-row">
            <span><span class="icon-3d-wrap sm">${I ? I.ball(13) : ''}</span> <b>${v.fields_count || 1}</b> ملاعب</span>
            <span><span class="icon-3d-wrap sm">${I ? I.clipboard(13) : ''}</span> <b>${v.bookings_count || 0}</b> حجز</span>
            <span><span class="icon-3d-wrap sm">${I ? I.calendar(13) : ''}</span> مسجلة منذ: ${v.created_at ? v.created_at.slice(0, 10) : '-'}</span>
          </div>

          <div class="venue-actions-row">
            <button type="button" class="btn-outline btn-sm btn-upload-image" data-venue-id="${v.id}" style="display:inline-flex; align-items:center; gap:5px;">
              ${I ? I.camera(15) : ''}
              <span>رفع صورة غلاف</span>
            </button>
            <button type="button" class="btn-outline btn-sm btn-toggle-status" data-venue-id="${v.id}" data-next-status="${toggleActionStatus}" style="display:inline-flex; align-items:center; gap:5px;">
              ${I ? I.checkBadge(15) : ''}
              <span>${toggleActionText}</span>
            </button>
            <button type="button" class="btn-outline btn-danger-outline btn-sm btn-delete-venue" data-venue-id="${v.id}" data-venue-name="${escapeHtml(v.name)}" style="display:inline-flex; align-items:center; gap:5px;">
              ${I ? I.trash(15) : ''}
              <span>حذف المنشأة</span>
            </button>
          </div>
        </article>
      `;
    }).join('');
  }

  // ==================== 2.5 RENDER OWNERS ====================
  function renderOwners() {
    const container = document.getElementById('ownersContainer');
    if (!container) return;

    const searchTerm = (document.getElementById('ownerSearchInput')?.value || '').trim().toLowerCase();
    const statusFilter = document.getElementById('ownerStatusFilter')?.value || 'all';

    let list = state.owners || [];

    if (statusFilter === 'has_venues') {
      list = list.filter(o => o.venues_count > 0);
    } else if (statusFilter === 'no_venues') {
      list = list.filter(o => o.venues_count === 0);
    } else if (statusFilter === 'temporary') {
      list = list.filter(o => o.must_change_password);
    }

    if (searchTerm) {
      list = list.filter(o => {
        const name = (o.full_name || '').toLowerCase();
        const email = (o.email || '').toLowerCase();
        const phone = (o.phone || '').toLowerCase();
        return name.includes(searchTerm) || email.includes(searchTerm) || phone.includes(searchTerm);
      });
    }

    const badge = document.getElementById('ownersCountBadge');
    if (badge) badge.textContent = (state.owners || []).length;

    const I = window.MalaebiIcons3D;

    if (list.length === 0) {
      const emptyIcon = I ? I.user(36) : '';
      container.innerHTML = `
        <div style="text-align:center; padding:36px 16px; color:var(--muted); font-size:13px; background:var(--card); border-radius:16px; border:1px solid var(--line);">
          <div class="icon-3d-wrap lg" style="margin:0 auto 10px;">${emptyIcon}</div>
          <b>لا توجد حسابات ملاك مطابقة للبحث أو الفلتر</b>
          <p style="margin-top:6px; font-size:11.5px;">يمكنك إضافة مالك ملعب جديد بالضغط على زر «+ إضافة حساب مالك ملعب».</p>
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(o => {
      const isTempPass = o.must_change_password;
      const passBadge = isTempPass
        ? `<span class="venue-badge suspended" style="display:inline-flex; align-items:center; gap:5px; background:rgba(245,158,11,0.12); color:#d97706; border-color:rgba(245,158,11,0.3);">${I ? I.key(13) : ''}<span>كلمة مرور مؤقتة</span></span>`
        : `<span class="venue-badge active" style="display:inline-flex; align-items:center; gap:5px;">${I ? I.checkBadge(13) : ''}<span>تم تغيير كلمة المرور</span></span>`;

      const venueInfo = o.venues_count > 0
        ? `<div style="display:flex; align-items:center; gap:6px; font-size:12px; color:var(--primary); font-weight:700; margin-top:6px;"><span class="icon-3d-wrap sm">${I ? I.stadium(13) : ''}</span><span>المنشآت (${o.venues_count}): ${o.venues.map(v => escapeHtml(v.name)).join('، ')}</span></div>`
        : `<div style="font-size:12px; color:var(--muted); font-weight:600; margin-top:6px;">حساب جديد — لم يُضف منشأة بعد</div>`;

      const cleanPhone = (o.phone || '').replace(/[^0-9]/g, '');
      const whatsappBtn = cleanPhone
        ? `<a href="https://wa.me/967${cleanPhone.slice(-9)}?text=${encodeURIComponent('السلام عليكم أخي ' + (o.full_name || '') + '، إدارة منصة ملاعبي ترحب بك. يمكنك الدخول لبوابة المنشأة عبر: https://malaebi-venue-dashboard.vercel.app')}" target="_blank" rel="noopener" class="btn-outline btn-sm" style="display:inline-flex; align-items:center; gap:5px; text-decoration:none; color:#10b981; border-color:rgba(16,185,129,0.3);">
            ${I ? I.whatsapp(15) : ''}
            <span>واتساب</span>
           </a>`
        : '';

      return `
        <article class="venue-card" data-owner-id="${o.id}">
          <div class="venue-card-header">
            <div class="venue-thumbnail" style="display:grid; place-items:center; background:linear-gradient(135deg, rgba(8,123,67,0.12), rgba(8,123,67,0.22));">
              ${I ? I.user(26) : ''}
            </div>
            <div class="venue-card-meta">
              <h3 class="venue-card-title">${escapeHtml(o.full_name)}</h3>
              <div class="venue-card-area">
                ${passBadge}
              </div>
            </div>
          </div>

          <div class="venue-card-owner">
            <div><b>البريد:</b> <span dir="ltr">${escapeHtml(o.email || '-')}</span></div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
              <div><b>الهاتف:</b> <span dir="ltr">${escapeHtml(o.phone || 'غير مسجل')}</span></div>
              ${whatsappBtn}
            </div>
            ${venueInfo}
          </div>

          <div class="venue-stats-row">
            <span><span class="icon-3d-wrap sm">${I ? I.calendar(13) : ''}</span> مسجل منذ: ${o.created_at ? o.created_at.slice(0, 10) : '-'}</span>
            <span><span class="icon-3d-wrap sm">${I ? I.stadium(13) : ''}</span> المنشآت: <b>${o.venues_count}</b></span>
          </div>
        </article>
      `;
    }).join('');
  }

  // ==================== 3. RENDER BOOKINGS ====================
  function renderBookings() {
    const container = document.getElementById('bookingsContainer');
    if (!container) return;

    const searchTerm = (document.getElementById('bookingSearchInput')?.value || '').trim().toLowerCase();
    const statusFilter = document.getElementById('bookingStatusFilter')?.value || 'all';

    let list = state.bookings || [];

    if (statusFilter !== 'all') {
      list = list.filter(b => b.status === statusFilter);
    }

    if (searchTerm) {
      list = list.filter(b => {
        const no = (b.booking_no || '').toLowerCase();
        const player = (b.player_name || '').toLowerCase();
        const phone = (b.player_phone || '').toLowerCase();
        const venue = (b.venue_name || '').toLowerCase();
        const field = (b.field_name || '').toLowerCase();
        return no.includes(searchTerm) || player.includes(searchTerm) || phone.includes(searchTerm) || venue.includes(searchTerm) || field.includes(searchTerm);
      });
    }

    const badge = document.getElementById('bookingsCountBadge');
    if (badge) badge.textContent = `${list.length} حجز`;

    const I = window.MalaebiIcons3D;

    if (list.length === 0) {
      const emptyIcon = I ? I.clipboard(36) : '';
      container.innerHTML = `
        <div style="text-align:center; padding:36px 16px; color:var(--muted); font-size:13px; background:var(--card); border-radius:16px; border:1px solid var(--line);">
          <div class="icon-3d-wrap lg" style="margin:0 auto 10px;">${emptyIcon}</div>
          <b>لا توجد حجوزات مطابقة للبحث أو الفلتر</b>
        </div>
      `;
      return;
    }

    const statusMap = {
      confirmed: { label: 'مؤكد', cls: 'confirmed' },
      pending: { label: 'قيد المراجعة', cls: 'pending' },
      completed: { label: 'مكتمل', cls: 'completed' },
      cancelled: { label: 'ملغي', cls: 'cancelled' },
      expired: { label: 'منتهي', cls: 'expired' }
    };

    container.innerHTML = list.map(b => {
      const st = statusMap[b.status] || { label: b.status, cls: 'pending' };
      const dateStr = b.starts_at ? new Date(b.starts_at).toLocaleDateString('ar-YE', { weekday: 'short', month: 'short', day: 'numeric' }) : '-';
      const timeStr = b.starts_at ? new Date(b.starts_at).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }) : '-';

      return `
        <article class="booking-item">
          <div class="booking-item-header">
            <span class="booking-number">${escapeHtml(b.booking_no)}</span>
            <span class="booking-status-pill ${st.cls}">${st.label}</span>
          </div>

          <div class="booking-item-body">
            <div class="booking-meta-line">
              <span class="icon-3d-wrap sm">${I ? I.stadium(13) : ''}</span>
              <span><b>${escapeHtml(b.venue_name || 'المنشأة')}</b> (${escapeHtml(b.field_name || 'الملعب')})</span>
            </div>
            <div class="booking-meta-line">
              <span class="icon-3d-wrap sm">${I ? I.user(13) : ''}</span>
              <span>اللاعب: ${escapeHtml(b.player_name || 'لاعب')} · <span dir="ltr">${escapeHtml(b.player_phone || '-')}</span></span>
            </div>
            <div class="booking-meta-line">
              <span class="icon-3d-wrap sm">${I ? I.clock(13) : ''}</span>
              <span>الموعد: ${dateStr} الساعة ${timeStr} (${b.duration_minutes || 60} دقيقة)</span>
            </div>
            <div class="booking-meta-line" style="justify-content:space-between; margin-top:6px; padding-top:6px; border-top:1px dashed var(--line);">
              <span style="display:inline-flex; align-items:center; gap:6px;">
                <span class="icon-3d-wrap sm">${I ? I.cash(13) : ''}</span>
                <span>المبلغ الإجمالي:</span>
              </span>
              <b style="color:var(--primary); font-size:13.5px;">${formatMoney(b.total_price)}</b>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  // ==================== 4. CREATE OWNER ACCOUNT ====================
  function generateRandomPassword() {
    return 'Malaebi' + Math.floor(100000 + Math.random() * 900000) + '!';
  }

  function openNewOwnerModal() {
    const modal = document.getElementById('newOwnerModal');
    if (!modal) return;
    const form = document.getElementById('newOwnerForm');
    if (form) form.reset();
    const errEl = document.getElementById('newOwnerError');
    if (errEl) errEl.style.display = 'none';

    // Auto-populate generated temporary password
    const passInput = document.getElementById('noTempPassword');
    if (passInput) passInput.value = generateRandomPassword();

    modal.classList.add('visible');
    setTimeout(() => document.getElementById('noFullName')?.focus(), 120);
  }

  function closeNewOwnerModal() {
    document.getElementById('newOwnerModal')?.classList.remove('visible');
  }

  async function handleCreateOwnerSubmit() {
    const errEl = document.getElementById('newOwnerError');
    const submitBtn = document.getElementById('btnSubmitNewOwner');

    const full_name = document.getElementById('noFullName')?.value.trim();
    const email = document.getElementById('noEmail')?.value.trim();
    const phone = document.getElementById('noPhone')?.value.trim();
    const temp_password = document.getElementById('noTempPassword')?.value.trim();

    if (!full_name || !email) {
      if (errEl) {
        errEl.textContent = 'يرجى إدخال اسم المالك والبريد الإلكتروني (*)';
        errEl.style.display = 'block';
      }
      return;
    }

    if (!temp_password || temp_password.length < 6) {
      if (errEl) {
        errEl.textContent = 'كلمة المرور المؤقتة يجب ألا تقل عن 6 أحرف';
        errEl.style.display = 'block';
      }
      return;
    }

    if (errEl) errEl.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>جاري إنشاء حساب المالك... ⏳</span>';

    try {
      const payload = {
        full_name,
        email,
        phone: phone || undefined,
        temp_password
      };

      const res = await window.MalaebiAdminAPI.createOwner(payload);
      const ownerData = res.data || {};

      // Close create modal
      closeNewOwnerModal();

      // Show credentials card
      state.lastCreatedCredentials = {
        ownerName: ownerData.full_name || full_name,
        ownerEmail: ownerData.email || email,
        ownerPhone: ownerData.phone || phone,
        tempPassword: ownerData.temp_password || temp_password,
        portalUrl: ownerData.portal_url || 'https://malaebi-venue-dashboard.vercel.app'
      };

      renderCredentialsBox(state.lastCreatedCredentials);
      document.getElementById('credentialsModal').classList.add('visible');

      showToast('تم إنشاء حساب المالك بنجاح', 'success');
      await loadDashboardData();

    } catch (err) {
      console.error('Create owner error:', err);
      if (errEl) {
        errEl.textContent = err.message || 'فشل إنشاء حساب المالك، تحقق من صحة البيانات';
        errEl.style.display = 'block';
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>إنشاء حساب المالك وتوليد بيانات الدخول</span> <span id="submitOwnerIcon">' + (window.MalaebiIcons3D ? window.MalaebiIcons3D.rocket(18) : '') + '</span>';
    }
  }

  function renderCredentialsBox(c) {
    const box = document.getElementById('credentialsBoxContent');
    if (!box || !c) return;

    box.innerHTML = `
      <div class="credential-item">
        <span class="credential-label">اسم صاحب الملعب:</span>
        <span class="credential-value">${escapeHtml(c.ownerName)}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">البريد الإلكتروني للدخول:</span>
        <span class="credential-value" dir="ltr">${escapeHtml(c.ownerEmail)}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">كلمة المرور المؤقتة:</span>
        <span class="credential-value" dir="ltr" style="color:var(--primary); font-size:14px; font-weight:800;">${escapeHtml(c.tempPassword)}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">رابط بوابة المنشأة:</span>
        <span class="credential-value" dir="ltr"><a href="${c.portalUrl}" target="_blank" style="color:var(--accent); text-decoration:underline;">${c.portalUrl}</a></span>
      </div>
      <div style="display:flex; align-items:flex-start; gap:8px; background:var(--input-bg); border-radius:10px; padding:10px 12px; margin-top:8px; font-size:12px; color:var(--muted); line-height:1.5; border:1px solid var(--line);">
        <span class="icon-3d-wrap sm" style="flex-shrink:0;">${window.MalaebiIcons3D ? window.MalaebiIcons3D.about(14) : ''}</span>
        <span><b>ملاحظة للمالك:</b> سيُطلب منك تغيير كلمة المرور وإدخال بيانات منشأتك وملعبك عند أول تسجيل دخول.</span>
      </div>
    `;
  }

  function getWhatsAppShareText(c) {
    return `مرحباً بك أخي ${c.ownerName}،
تم إنشاء حسابك كمالك منشأة رياضية في منصة ملاعبي بنجاح! ⚽

بيانات الدخول إلى بوابة المنشأة لتسجيل وإدارة منشأتك وملعبك:
🏟️ رابط البوابة: ${c.portalUrl}
📧 البريد الإلكتروني: ${c.ownerEmail}
🔑 كلمة المرور المؤقتة: ${c.tempPassword}

📌 ملاحظة هامة:
سيُطلب منك تغيير كلمة المرور وإدخال بيانات منشأتك وملعبك الأول عند أول تسجيل دخول.

فريق منصة ملاعبي - مأرب`;
  }

  function shareCredentialsViaWhatsApp() {
    const c = state.lastCreatedCredentials;
    if (!c) return;
    const cleanPhone = (c.ownerPhone || '').replace(/[^0-9]/g, '');
    const intlPhone = cleanPhone ? (cleanPhone.startsWith('967') ? cleanPhone : `967${cleanPhone.slice(-9)}`) : '';
    const text = encodeURIComponent(getWhatsAppShareText(c));
    const url = intlPhone ? `https://wa.me/${intlPhone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async function copyCredentialsToClipboard() {
    const c = state.lastCreatedCredentials;
    if (!c) return;
    const text = getWhatsAppShareText(c);
    try {
      await navigator.clipboard.writeText(text);
      showToast('تم نسخ بيانات الاعتماد بنجاح إلى الحافظة', 'success');
    } catch {
      showToast('تعذر النسخ التلقائي، يمكنك تحديد النص ونسخه يدوياً', 'error');
    }
  }

  // ==================== 5. VENUE ACTIONS (TOGGLE & DELETE) ====================
  async function handleToggleVenueStatus(venueId, nextStatus) {
    const actionText = nextStatus === 'active' ? 'تفعيل وتشغيل' : 'إيقاف مؤقت لـ';
    const ok = await showConfirmDialog({
      title: `${actionText} المنشأة`,
      message: `هل أنت متأكد من تغيير حالة المنشأة إلى «${nextStatus === 'active' ? 'نشطة' : 'معلقة'}»؟`,
      confirmText: 'نعم، تغيير الحالة',
      cancelText: 'تراجع',
      danger: nextStatus === 'suspended'
    });
    if (!ok) return;

    try {
      await window.MalaebiAdminAPI.updateVenueStatus(venueId, nextStatus);
      showToast('تم تحديث حالة المنشأة بنجاح', 'success');
      await loadDashboardData();
    } catch (err) {
      showToast(err.message || 'فشل تحديث حالة المنشأة', 'error');
    }
  }

  async function handleDeleteVenue(venueId, venueName) {
    const ok = await showConfirmDialog({
      title: 'حذف المنشأة نهائياً',
      message: `تحذير: هل أنت متأكد من رغبتك في حذف منشأة «${venueName}»؟ سيتم حذف جميع ملاعبها وسجلاتها التجريبية نهائياً.`,
      confirmText: 'حذف المنشأة',
      cancelText: 'إلغاء',
      danger: true
    });
    if (!ok) return;

    try {
      const res = await window.MalaebiAdminAPI.deleteVenue(venueId);
      showToast(res.message || 'تم حذف المنشأة بنجاح', 'success');
      await loadDashboardData();
    } catch (err) {
      showToast(err.message || 'فشل حذف المنشأة', 'error');
    }
  }

  function triggerImageUpload(venueId) {
    state.selectedVenueForUpload = venueId;
    const fileInput = document.getElementById('adminImageFileInput');
    if (fileInput) {
      fileInput.value = '';
      fileInput.click();
    }
  }

  async function handleImageFileSelected(e) {
    const file = e.target.files?.[0];
    const venueId = state.selectedVenueForUpload;
    if (!file || !venueId) return;

    showToast('جاري رفع صورة المنشأة إلى السحابة... ⏳');
    try {
      await window.MalaebiAdminAPI.uploadVenueImage(venueId, file);
      showToast('تم رفع صورة الغلاف بنجاح', 'success');
      await loadDashboardData();
    } catch (err) {
      showToast(err.message || 'فشل رفع الصورة', 'error');
    } finally {
      state.selectedVenueForUpload = null;
    }
  }

  // ==================== 6. AUTHENTICATION & LOGIN ====================
  async function handleLoginSubmit() {
    const email = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPassword').value.trim();
    const errEl = document.getElementById('loginError');
    const submitBtn = document.getElementById('loginSubmitBtn');

    if (!email || !pass) {
      if (errEl) {
        errEl.textContent = 'يرجى إدخال البريد الإلكتروني وكلمة المرور';
        errEl.style.display = 'block';
      }
      return;
    }

    if (errEl) errEl.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.textContent = 'جاري تسجيل الدخول والتحقق من الصلاحيات...';

    try {
      const { user } = await window.MalaebiAdminAPI.login(email, pass);
      state.user = user;
      showToast(`مرحباً بك يا كابتن! تم الدخول بنجاح`, 'success');
      showAdminApp();
      await loadDashboardData();
    } catch (err) {
      console.error('Login error:', err);
      if (errEl) {
        errEl.textContent = err.message || 'البريد أو كلمة المرور غير صحيحة أو الحساب ليس مشرفاً';
        errEl.style.display = 'block';
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'تسجيل الدخول إلى لوحة الإدارة';
    }
  }

  async function handleLogout() {
    const ok = await showConfirmDialog({
      title: 'تسجيل الخروج',
      message: 'هل أنت متأكد من رغبتك في تسجيل الخروج من لوحة إدارة ملاعبي؟',
      confirmText: 'تسجيل الخروج',
      cancelText: 'إلغاء',
      danger: true
    });
    if (!ok) return;

    window.MalaebiAdminAPI.logout();
    state.user = null;
    state.overview = null;
    state.venues = [];
    state.owners = [];
    state.bookings = [];
    showLoginScreen();
    showToast('تم تسجيل الخروج بنجاح');
  }

  function showLoginScreen() {
    const login = document.getElementById('loginScreen');
    const app = document.getElementById('adminApp');
    if (login) login.style.display = 'flex';
    if (app) app.style.display = 'none';
  }

  function showAdminApp() {
    const login = document.getElementById('loginScreen');
    const app = document.getElementById('adminApp');
    if (login) login.style.display = 'none';
    if (app) app.style.display = 'flex';

    // Populate admin profile info
    const storedUser = window.MalaebiAdminAPI.getStoredUser();
    if (storedUser) {
      const nameEl = document.getElementById('adminDisplayName');
      const emailEl = document.getElementById('adminDisplayEmail');
      if (nameEl) nameEl.textContent = storedUser.full_name || 'إدارة ملاعبي';
      if (emailEl) emailEl.textContent = storedUser.email || 'malaebi12@gmail.com';
    }
  }

  // ==================== 7. EVENT LISTENERS ====================
  function bindEvents() {
    // Login form
    document.getElementById('loginForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      handleLoginSubmit();
    });

    // Theme toggle
    document.getElementById('themeToggleBtn')?.addEventListener('click', toggleTheme);

    // Refresh button
    document.getElementById('refreshBtn')?.addEventListener('click', async () => {
      showToast('جاري تحديث البيانات...');
      await loadDashboardData();
      showToast('تم تحديث البيانات بنجاح', 'success');
    });

    // Logout buttons
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    document.getElementById('accountLogoutBtn')?.addEventListener('click', handleLogout);

    // Bottom Navigation
    document.querySelectorAll('.bnav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const viewId = btn.dataset.view;
        if (viewId) switchView(viewId);
      });
    });

    // Subtabs switcher in Venues View
    document.getElementById('subtabVenues')?.addEventListener('click', () => switchVenueSubtab('venues'));
    document.getElementById('subtabOwners')?.addEventListener('click', () => switchVenueSubtab('owners'));

    // Open New Owner Modal
    document.getElementById('openNewOwnerBtn')?.addEventListener('click', openNewOwnerModal);
    document.getElementById('openNewOwnerFromBannerBtn')?.addEventListener('click', openNewOwnerModal);

    // Close Modal buttons
    document.getElementById('closeNewOwnerModalBtn')?.addEventListener('click', closeNewOwnerModal);
    document.getElementById('closeCredentialsModalBtn')?.addEventListener('click', () => {
      document.getElementById('credentialsModal').classList.remove('visible');
    });

    // Generate password button
    document.getElementById('btnGenOwnerPassword')?.addEventListener('click', () => {
      const pass = generateRandomPassword();
      const input = document.getElementById('noTempPassword');
      if (input) input.value = pass;
    });

    // Submit New Owner
    document.getElementById('newOwnerForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      handleCreateOwnerSubmit();
    });

    // Share / Copy Credentials
    document.getElementById('btnShareWhatsApp')?.addEventListener('click', shareCredentialsViaWhatsApp);
    document.getElementById('btnCopyCredentials')?.addEventListener('click', copyCredentialsToClipboard);

    // Filter inputs
    document.getElementById('venueSearchInput')?.addEventListener('input', renderVenues);
    document.getElementById('venueStatusFilter')?.addEventListener('change', renderVenues);
    document.getElementById('ownerSearchInput')?.addEventListener('input', renderOwners);
    document.getElementById('ownerStatusFilter')?.addEventListener('change', renderOwners);
    document.getElementById('bookingSearchInput')?.addEventListener('input', renderBookings);
    document.getElementById('bookingStatusFilter')?.addEventListener('change', renderBookings);

    // File input for image upload
    document.getElementById('adminImageFileInput')?.addEventListener('change', handleImageFileSelected);

    // Delegated actions for venue cards (status toggle, delete, upload image)
    document.getElementById('venuesContainer')?.addEventListener('click', (e) => {
      const toggleBtn = e.target.closest('.btn-toggle-status');
      if (toggleBtn) {
        handleToggleVenueStatus(toggleBtn.dataset.venueId, toggleBtn.dataset.nextStatus);
        return;
      }
      const deleteBtn = e.target.closest('.btn-delete-venue');
      if (deleteBtn) {
        handleDeleteVenue(deleteBtn.dataset.venueId, deleteBtn.dataset.venueName);
        return;
      }
      const uploadBtn = e.target.closest('.btn-upload-image');
      if (uploadBtn) {
        triggerImageUpload(uploadBtn.dataset.venueId);
        return;
      }
    });
  }

  
  // ==================== CUSTOM PWA INSTALL PROMPT ====================
  let deferredAdminPwaPrompt = null;
  let showInstallBannerGlobal = null;

  function initPwaInstallPrompt() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         window.navigator.standalone === true ||
                         document.referrer.includes('android-app://');
    const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent) && !window.MSStream;

    const manualBtn = document.getElementById('adminInstallPwaBtn');
    const sheet = document.getElementById('malaebiInstallSheet');

    function updateInstallButton() {
      if (!manualBtn) return;
      if (isStandalone) {
        manualBtn.style.display = 'none';
        return;
      }
      manualBtn.style.display = 'flex';
    }

    function showInstallBanner(isIosMode = false) {
      if (!sheet || isStandalone) return;

      const I = window.MalaebiIcons3D;
      const phoneIcon = I ? I.phone(16) : '';

      if (isIosMode) {
        sheet.innerHTML = `
          <div class="malaebi-install-card">
            <div class="malaebi-install-top">
              <div class="malaebi-install-logo-wrap">
                <img src="./assets/images/logo.svg" alt="ملاعبي" class="malaebi-install-logo">
              </div>
              <div class="malaebi-install-info">
                <h4 class="malaebi-install-title" id="pwaInstallTitle">ثبّت لوحة إدارة ملاعبي</h4>
                <p class="malaebi-install-desc">وصول سريع لإدارة الملاك والمنشآت</p>
              </div>
            </div>
            <div class="malaebi-ios-steps">
              اضغط على زر المشاركة <b>(Share ⎋)</b> في شريط متصفح سفاري، ثم مرّر للأسفل واختر <b>«إضافة إلى الشاشة الرئيسية ⊞»</b>.
            </div>
            <div class="malaebi-install-actions">
              <button type="button" class="malaebi-install-btn primary" id="pwaIosUnderstoodBtn">حسناً، فهمت</button>
              <button type="button" class="malaebi-install-btn secondary" id="pwaDismissInstallBtn">إغلاق</button>
            </div>
          </div>
        `;
      } else {
        sheet.innerHTML = `
          <div class="malaebi-install-card">
            <div class="malaebi-install-top">
              <div class="malaebi-install-logo-wrap">
                <img src="./assets/images/logo.svg" alt="ملاعبي" class="malaebi-install-logo">
              </div>
              <div class="malaebi-install-info">
                <h4 class="malaebi-install-title" id="pwaInstallTitle">ثبّت لوحة إدارة ملاعبي</h4>
                <p class="malaebi-install-desc">وصول سريع لإدارة الملاك والمنشآت</p>
              </div>
            </div>
            <div class="malaebi-install-actions">
              <button type="button" class="malaebi-install-btn primary" id="pwaInstallNowBtn">
                ${phoneIcon}
                <span>تثبيت التطبيق</span>
              </button>
              <button type="button" class="malaebi-install-btn secondary" id="pwaDismissInstallBtn">لاحقاً</button>
            </div>
          </div>
        `;
      }

      requestAnimationFrame(() => sheet.classList.add('visible'));

      sheet.querySelector('#pwaInstallNowBtn')?.addEventListener('click', async () => {
        if (deferredAdminPwaPrompt) {
          deferredAdminPwaPrompt.prompt();
          const { outcome } = await deferredAdminPwaPrompt.userChoice;
          if (outcome === 'accepted') {
            hideInstallBanner();
          }
          deferredAdminPwaPrompt = null;
        } else {
          hideInstallBanner();
          showToast('لتثبيت التطبيق، افتح قائمة خيارات المتصفح (⋮) واختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».', 'info');
        }
      });

      sheet.querySelector('#pwaIosUnderstoodBtn')?.addEventListener('click', () => {
        localStorage.setItem('malaebi_admin_ios_install_dismissed', 'true');
        hideInstallBanner();
      });

      sheet.querySelector('#pwaDismissInstallBtn')?.addEventListener('click', () => {
        localStorage.setItem('malaebi_admin_install_dismissed_until', String(Date.now() + 7 * 86400000));
        hideInstallBanner();
      });
    }

    showInstallBannerGlobal = showInstallBanner;

    function hideInstallBanner() {
      if (sheet) sheet.classList.remove('visible');
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredAdminPwaPrompt = e;
      updateInstallButton(true);

      const dismissedUntil = localStorage.getItem('malaebi_admin_install_dismissed_until');
      if (!dismissedUntil || Date.now() > Number(dismissedUntil)) {
        setTimeout(() => showInstallBanner(false), 2000);
      }
    });

    window.addEventListener('appinstalled', () => {
      hideInstallBanner();
      deferredAdminPwaPrompt = null;
      updateInstallButton(false);
      showToast('شكراً لك! تم تثبيت لوحة إدارة ملاعبي بنجاح', 'success');
    });

    if (isIos && !isStandalone) {
      const dismissedIos = localStorage.getItem('malaebi_admin_ios_install_dismissed');
      if (!dismissedIos) {
        setTimeout(() => showInstallBanner(true), 2500);
      }
      updateInstallButton(true);
    }

    if (manualBtn) {
      manualBtn.addEventListener('click', () => {
        if (isIos) {
          showInstallBanner(true);
        } else {
          showInstallBanner(false);
        }
      });
    }

    updateInstallButton();
  }

  async function init() {
    try {
      initTheme();
      renderStaticIcons();
      bindEvents();
      initPwaInstallPrompt();

      // Check if already authenticated
      if (window.MalaebiAdminAPI.isLoggedIn()) {
        try {
          showAdminApp();
          await loadDashboardData();
        } catch (err) {
          console.warn('Session expired or unauthorized:', err);
          window.MalaebiAdminAPI.logout();
          showLoginScreen();
        }
      } else {
        showLoginScreen();
      }
    } catch (topErr) {
      console.error('Fatal initialization error:', topErr);
      showLoginScreen();
    }

    // Register Service Worker
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('./sw.js').catch(err => {
        console.warn('SW registration failed:', err);
      });
    }
  }

  // Exposure for global inspection
  window.MalaebiAdminApp = {
    state,
    switchView,
    switchVenueSubtab,
    loadDashboardData,
    showConfirmDialog,
    showInstallBanner: (ios = false) => { if (showInstallBannerGlobal) showInstallBannerGlobal(ios); }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
