/* ==================== MALAEBI ADMIN DASHBOARD LOGIC ==================== */
(function() {
  'use strict';

  // Application State
  const state = {
    user: null,
    overview: null,
    venues: [],
    bookings: [],
    areas: [],
    activeView: 'viewOverview',
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
        iconEl.innerHTML = danger ? window.MalaebiIcons3D.door(28) : window.MalaebiIcons3D.checkBadge(28);
      } else {
        iconEl.innerHTML = danger ? '⚠️' : '✓';
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
    if (icon) {
      icon.textContent = state.currentTheme === 'dark' ? '☀️' : '🌙';
    }
  }

  // Format YER Currency
  function formatMoney(amount) {
    const num = Number(amount) || 0;
    return num.toLocaleString('en-US') + ' ريال';
  }

  // Format Date in Arabic (Aden Timezone)
  function formatDate(isoStr) {
    if (!isoStr) return '-';
    try {
      const d = new Date(isoStr);
      return new Intl.DateTimeFormat('ar-YE', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Aden'
      }).format(d);
    } catch {
      return isoStr.slice(0, 16);
    }
  }

  // Switch View Tab
  function switchView(viewId) {
    state.activeView = viewId;
    document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) target.classList.add('active');

    document.querySelectorAll('.bnav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewId);
    });

    if (viewId === 'viewVenues') renderVenues();
    if (viewId === 'viewBookings') renderBookings();
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

      // 3. Bookings
      const bookings = await window.MalaebiAdminAPI.getBookings();
      state.bookings = bookings;
      renderBookings();

      // 4. Areas
      const areas = await window.MalaebiAdminAPI.getAreas();
      state.areas = areas;
      populateAreaSelect(areas);

    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      showToast(err.message || 'فشل تحميل بيانات لوحة الإدارة', 'error');
    }
  }

  function populateAreaSelect(areas) {
    const select = document.getElementById('nvAreaSelect');
    if (!select) return;
    select.innerHTML = areas.map(a => `<option value="${a.id}">${escapeHtml(a.name)}</option>`).join('');
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
        const phone = (v.owner_phone || v.phone || '').toLowerCase();
        return name.includes(searchTerm) || owner.includes(searchTerm) || area.includes(searchTerm) || phone.includes(searchTerm);
      });
    }

    if (list.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:36px 16px; color:var(--muted); font-size:13px; background:var(--card); border-radius:16px; border:1px solid var(--line);">
          <div style="font-size:32px; margin-bottom:8px;">🏟️</div>
          <b>لا توجد منشآت مطابقة للبحث أو الفلتر</b>
          <p style="margin-top:6px; font-size:11.5px;">يمكنك إضافة منشأة جديدة بالضغط على زر «+ منشأة جديدة» أعلاه.</p>
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
        : `<div style="font-size:24px;">🏟️</div>`;

      const ownerPhoneClean = (v.owner_phone || v.phone || '').replace(/[^0-9]/g, '');
      const whatsappBtn = ownerPhoneClean
        ? `<a href="https://wa.me/967${ownerPhoneClean.slice(-9)}?text=${encodeURIComponent('السلام عليكم أخي ' + (v.owner_name || '') + '، بخصوص منشأتكم ' + v.name + ' في ملاعبي.')}" target="_blank" rel="noopener" class="btn-outline btn-sm" style="text-decoration:none; color:#10b981; border-color:rgba(16,185,129,0.3);">
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
                <span>📍 ${escapeHtml(v.area_name || 'مأرب')}</span>
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
            <span>⚽ <b>${v.fields_count || 1}</b> ملاعب</span>
            <span>📋 <b>${v.bookings_count || 0}</b> حجز</span>
            <span>📅 مسجلة منذ: ${v.created_at ? v.created_at.slice(0, 10) : '-'}</span>
          </div>

          <div class="venue-actions-row">
            <button type="button" class="btn-outline btn-sm btn-upload-image" data-venue-id="${v.id}">
              <span>📷 رفع صورة غلاف</span>
            </button>
            <button type="button" class="btn-outline btn-sm btn-toggle-status" data-venue-id="${v.id}" data-next-status="${toggleActionStatus}">
              <span>${toggleActionText}</span>
            </button>
            <button type="button" class="btn-outline btn-danger-outline btn-sm btn-delete-venue" data-venue-id="${v.id}" data-venue-name="${escapeHtml(v.name)}">
              <span>🗑️ حذف المنشأة</span>
            </button>
          </div>
        </article>
      `;
    }).join('');
  }

  // ==================== 3. RENDER BOOKINGS ====================
  function renderBookings() {
    const container = document.getElementById('bookingsContainer');
    const badge = document.getElementById('bookingsCountBadge');
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
        const vName = (b.venue_name || '').toLowerCase();
        const fName = (b.field_name || '').toLowerCase();
        const player = (b.player_name || '').toLowerCase();
        const phone = (b.player_phone || '').toLowerCase();
        return no.includes(searchTerm) || vName.includes(searchTerm) || fName.includes(searchTerm) || player.includes(searchTerm) || phone.includes(searchTerm);
      });
    }

    if (badge) badge.textContent = `${list.length} حجز`;

    if (list.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:36px 16px; color:var(--muted); font-size:13px; background:var(--card); border-radius:16px; border:1px solid var(--line);">
          <div style="font-size:32px; margin-bottom:8px;">📋</div>
          <b>لا توجد حجوزات مطابقة</b>
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(b => {
      let badgeClass = 'pending';
      let badgeText = 'بانتظار الموافقة';
      if (b.status === 'confirmed') { badgeClass = 'confirmed'; badgeText = 'مؤكد'; }
      else if (b.status === 'completed') { badgeClass = 'completed'; badgeText = 'مكتمل'; }
      else if (b.status === 'cancelled') { badgeClass = 'cancelled'; badgeText = 'ملغي'; }

      return `
        <div class="booking-item">
          <div class="booking-top">
            <span class="booking-no">#${escapeHtml(b.booking_no)}</span>
            <span class="booking-badge ${badgeClass}">${badgeText}</span>
          </div>
          <div class="booking-details">
            <div><b>المنشأة والملعب:</b> ${escapeHtml(b.venue_name)} — ${escapeHtml(b.field_name)}</div>
            <div><b>اللاعب:</b> ${escapeHtml(b.player_name || 'لاعب')} (${escapeHtml(b.player_phone || '-')})</div>
            <div><b>التوقيت:</b> ${formatDate(b.starts_at)}</div>
            <div style="display:flex; justify-content:space-between; margin-top:4px;">
              <span><b>المبلغ:</b> <span style="color:var(--primary); font-weight:800;">${formatMoney(b.total_price)}</span></span>
              <span style="font-size:11px; color:var(--muted);">حجز بتاريخ: ${b.created_at ? b.created_at.slice(0, 10) : ''}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // ==================== 4. CREATE VENUE & ONBOARDING ====================
  function generateRandomPassword() {
    return 'Malaebi' + Math.floor(100000 + Math.random() * 900000) + '!';
  }

  async function handleCreateVenueSubmit() {
    const errEl = document.getElementById('newVenueError');
    const submitBtn = document.getElementById('btnSubmitNewVenue');

    const owner_name = document.getElementById('nvOwnerName').value.trim();
    const owner_email = document.getElementById('nvOwnerEmail').value.trim();
    const owner_phone = document.getElementById('nvOwnerPhone').value.trim();
    const temp_password = document.getElementById('nvTempPassword').value.trim();

    const venue_name = document.getElementById('nvVenueName').value.trim();
    const area_id = document.getElementById('nvAreaSelect').value;
    const address_text = document.getElementById('nvAddressText').value.trim();
    const description = document.getElementById('nvDescription').value.trim();

    const field_name = document.getElementById('nvFieldName').value.trim();
    const hourly_price = Number(document.getElementById('nvHourlyPrice').value) || 8000;
    const capacity = Number(document.getElementById('nvCapacity').value) || 12;
    const confirmation_mode = document.getElementById('nvConfirmMode').value;

    if (!owner_name || !owner_email || !owner_phone || !venue_name || !field_name) {
      if (errEl) {
        errEl.textContent = 'يرجى تعبئة جميع الحقول المطلوبة (*)';
        errEl.style.display = 'block';
      }
      return;
    }

    if (errEl) errEl.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>جاري إنشاء المنشأة والمالك... ⏳</span>';

    try {
      const payload = {
        owner_name,
        owner_email,
        owner_phone,
        temp_password,
        venue_name,
        area_id,
        address_text,
        description,
        field_name,
        hourly_price,
        capacity,
        confirmation_mode
      };

      const res = await window.MalaebiAdminAPI.createVenue(payload);
      const ownerData = res.data?.owner;
      const venueData = res.data?.venue;

      // Close create modal
      document.getElementById('newVenueModal').classList.remove('visible');
      document.getElementById('newVenueForm').reset();

      // Show credentials card
      state.lastCreatedCredentials = {
        ownerName: ownerData?.name || owner_name,
        ownerEmail: ownerData?.email || owner_email,
        ownerPhone: ownerData?.phone || owner_phone,
        tempPassword: ownerData?.temp_password || temp_password,
        venueName: venueData?.name || venue_name,
        dashboardUrl: ownerData?.dashboard_url || 'https://malaebi-venue-dashboard.vercel.app'
      };

      renderCredentialsBox(state.lastCreatedCredentials);
      document.getElementById('credentialsModal').classList.add('visible');

      showToast('تم إنشاء المنشأة وحساب المالك بنجاح 🎉', 'success');
      await loadDashboardData();

    } catch (err) {
      console.error('Create venue error:', err);
      if (errEl) {
        errEl.textContent = err.message || 'فشل إنشاء المنشأة، تحقق من صحة البيانات';
        errEl.style.display = 'block';
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>حفظ المنشأة وتوليد بيانات المالك 🚀</span>';
    }
  }

  function renderCredentialsBox(c) {
    const box = document.getElementById('credentialsBoxContent');
    if (!box || !c) return;

    box.innerHTML = `
      <div class="credential-item">
        <span class="credential-label">المنشأة الرياضية:</span>
        <span class="credential-value">${escapeHtml(c.venueName)}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">اسم المالك:</span>
        <span class="credential-value">${escapeHtml(c.ownerName)}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">البريد الإلكتروني للدخول:</span>
        <span class="credential-value" dir="ltr">${escapeHtml(c.ownerEmail)}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">كلمة المرور المؤقتة:</span>
        <span class="credential-value" dir="ltr" style="color:var(--primary); font-size:14px;">${escapeHtml(c.tempPassword)}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">رابط بوابة المنشأة:</span>
        <span class="credential-value" dir="ltr"><a href="${c.dashboardUrl}" target="_blank" style="color:var(--accent); text-decoration:underline;">${c.dashboardUrl}</a></span>
      </div>
    `;
  }

  function getWhatsAppShareText(c) {
    return `مرحباً بك أخي ${c.ownerName}،
تم تسجيل منشأتك الرياضية (${c.venueName}) في منصة ملاعبي بنجاح!

بيانات دخولك الرسمية إلى بوابة المنشأة لإدارة الملاعب والحجوزات:
🏟️ الرابط: ${c.dashboardUrl}
📧 البريد: ${c.ownerEmail}
🔑 كلمة المرور المؤقتة: ${c.tempPassword}

*ملاحظة: سيُطلب منك النظام تعيين كلمة مرور جديدة خاصة بك عند تسجيل الدخول لأول مرة لأمان حسابك.
فريق منصة ملاعبي - مأرب`;
  }

  function shareCredentialsViaWhatsApp() {
    const c = state.lastCreatedCredentials;
    if (!c) return;
    const cleanPhone = (c.ownerPhone || '').replace(/[^0-9]/g, '');
    const intlPhone = cleanPhone.startsWith('967') ? cleanPhone : `967${cleanPhone.slice(-9)}`;
    const text = encodeURIComponent(getWhatsAppShareText(c));
    const url = `https://wa.me/${intlPhone}?text=${text}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async function copyCredentialsToClipboard() {
    const c = state.lastCreatedCredentials;
    if (!c) return;
    const text = getWhatsAppShareText(c);
    try {
      await navigator.clipboard.writeText(text);
      showToast('تم نسخ بيانات الاعتماد بنجاح إلى الحافظة 📋', 'success');
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
      showToast('تم رفع صورة الغلاف بنجاح 📷', 'success');
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
    submitBtn.innerHTML = '<span>جاري التحقق من صلاحيات الإدارة... ⏳</span>';

    try {
      const { user } = await window.MalaebiAdminAPI.login(email, pass);
      state.user = user;
      showAdminApp();
      await loadDashboardData();
    } catch (err) {
      console.error('Admin login error:', err);
      if (errEl) {
        errEl.textContent = err.message || 'فشل تسجيل الدخول، تحقق من البيانات';
        errEl.style.display = 'block';
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>تسجيل الدخول إلى لوحة الإدارة</span> <span>←</span>';
    }
  }

  async function handleLogout() {
    const ok = await showConfirmDialog({
      title: 'تسجيل الخروج من لوحة الإدارة',
      message: 'هل ترغب بإنهاء جلستك الحالية في لوحة الإدارة العليا لمنصة ملاعبي؟',
      confirmText: 'تسجيل الخروج',
      cancelText: 'البقاء',
      danger: true
    });
    if (!ok) return;

    window.MalaebiAdminAPI.logout();
    state.user = null;
    showLoginScreen();
    showToast('تم تسجيل الخروج بنجاح');
  }

  function showAdminApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminApp').style.display = 'flex';
    const storedUser = window.MalaebiAdminAPI.getStoredUser();
    if (storedUser) {
      const emailEl = document.getElementById('adminDisplayEmail');
      const nameEl = document.getElementById('adminDisplayName');
      if (emailEl) emailEl.textContent = storedUser.email || 'malaebi12@gmail.com';
      if (nameEl) nameEl.textContent = storedUser.user_metadata?.full_name || 'إدارة ملاعبي';
    }
  }

  function showLoginScreen() {
    document.getElementById('adminApp').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
  }

  // ==================== INITIALIZATION & EVENT LISTENERS ====================
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
      showToast('جاري تحديث البيانات... 🔄');
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

    // Open New Venue Modal
    const openModal = () => {
      const modal = document.getElementById('newVenueModal');
      const passInput = document.getElementById('nvTempPassword');
      if (passInput && !passInput.value) {
        passInput.value = generateRandomPassword();
      }
      modal.classList.add('visible');
    };
    document.getElementById('openNewVenueBtn')?.addEventListener('click', openModal);
    document.getElementById('openNewVenueFromBannerBtn')?.addEventListener('click', openModal);

    // Close Modal buttons
    document.getElementById('closeNewVenueModalBtn')?.addEventListener('click', () => {
      document.getElementById('newVenueModal').classList.remove('visible');
    });
    document.getElementById('closeCredentialsModalBtn')?.addEventListener('click', () => {
      document.getElementById('credentialsModal').classList.remove('visible');
    });

    // Generate password button
    document.getElementById('btnGenPassword')?.addEventListener('click', () => {
      document.getElementById('nvTempPassword').value = generateRandomPassword();
    });

    // Submit New Venue
    document.getElementById('newVenueForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      handleCreateVenueSubmit();
    });

    // Share / Copy Credentials
    document.getElementById('btnShareWhatsApp')?.addEventListener('click', shareCredentialsViaWhatsApp);
    document.getElementById('btnCopyCredentials')?.addEventListener('click', copyCredentialsToClipboard);

    // Filter inputs
    document.getElementById('venueSearchInput')?.addEventListener('input', renderVenues);
    document.getElementById('venueStatusFilter')?.addEventListener('change', renderVenues);
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

  async function init() {
    initTheme();
    bindEvents();

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
    loadDashboardData,
    showConfirmDialog
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
