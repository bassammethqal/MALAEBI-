/* MALAEBI Venue Ops Dashboard — Multi-Tenant Portal Logic */
(function() {
  'use strict';

  // Application State
  const state = {
    user: null,
    venues: [],
    activeVenue: null,
    activeField: null,
    activeDate: getTodayAdenString(),
    currentView: 'dashboard',
    summary: null,
    bookings: [],
    pendingBookings: [],
    customers: [],
    reviews: [],
    reports: null,
    members: [],
    areas: [],
    countdownInterval: null
  };

  // Helper: Get today's date formatted as YYYY-MM-DD in Asia/Aden
  function getTodayAdenString() {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Aden',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  }

  // Helper: Format Time 12-hour Arabic
  function formatTime12Ar(input) {
    if (!input) return '';
    let hours = 0;
    let minutes = 0;

    if (typeof input === 'string' && input.includes('T')) {
      const d = new Date(input);
      if (isNaN(d.getTime())) return input;
      try {
        const str = d.toLocaleTimeString('en-US', {
          timeZone: 'Asia/Aden',
          hour12: false,
          hour: '2-digit',
          minute: '2-digit'
        });
        const parts = str.split(':');
        hours = parseInt(parts[0], 10);
        minutes = parseInt(parts[1], 10);
      } catch {
        hours = d.getHours();
        minutes = d.getMinutes();
      }
    } else if (typeof input === 'string' && input.includes(':')) {
      const parts = input.trim().split(':');
      hours = parseInt(parts[0], 10);
      minutes = parseInt(parts[1] || '0', 10);
    } else {
      return String(input);
    }

    let period = 'صباحاً';
    if (hours >= 0 && hours < 5) {
      period = 'فجراً';
    } else if (hours >= 5 && hours < 12) {
      period = 'صباحاً';
    } else if (hours >= 12 && hours < 15) {
      period = 'ظهراً';
    } else if (hours >= 15 && hours < 18) {
      period = 'عصراً';
    } else {
      period = 'مساءً';
    }

    let h12 = hours % 12;
    if (h12 === 0) h12 = 12;
    const mm = minutes < 10 ? '0' + minutes : minutes;
    return `${h12}:${mm} ${period}`;
  }

  // Helper: Format Date Arabic
  function formatDateAr(dateStr) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T12:00:00'));
      return d.toLocaleDateString('ar-YE', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }

  // Toast Notification
  function showToast(msg, isError = false) {
    const toast = document.getElementById('toastBar');
    if (!toast) return;
    toast.textContent = msg;
    toast.style.background = isError ? '#ef4444' : '#072b1c';
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }

  // Theme Management
  
// ==================== MALAEBI CUSTOM CONFIRM & PWA INSTALL SYSTEM ====================
function showConfirmDialog(options = {}) {
  const {
    title = 'تأكيد الإجراء',
    message = 'هل أنت متأكد من المتابعة؟',
    confirmText = 'تأكيد',
    cancelText = 'تراجع',
    danger = false,
    icon = null
  } = options;

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

    card.classList.toggle('is-danger', Boolean(danger));
    titleEl.textContent = title;
    msgEl.textContent = message;
    okBtn.textContent = confirmText;
    cancelBtn.textContent = cancelText;

    if (danger) {
      okBtn.className = 'malaebi-confirm-btn ok-danger';
    } else {
      okBtn.className = 'malaebi-confirm-btn ok-primary';
    }

    if (icon) {
      iconEl.innerHTML = icon;
      iconEl.style.display = 'flex';
    } else if (window.MalaebiIcons3D) {
      iconEl.innerHTML = danger ? window.MalaebiIcons3D.door(28) : window.MalaebiIcons3D.checkBadge(28);
      iconEl.style.display = 'flex';
    } else {
      iconEl.innerHTML = danger ? '⚠️' : '✓';
      iconEl.style.display = 'flex';
    }

    dialog.classList.remove('hidden');
    requestAnimationFrame(() => dialog.classList.add('visible'));

    const cleanup = (result) => {
      dialog.classList.remove('visible');
      setTimeout(() => dialog.classList.add('hidden'), 220);
      okBtn.onclick = null;
      cancelBtn.onclick = null;
      dialog.onclick = null;
      document.removeEventListener('keydown', keyHandler);
      resolve(result);
    };

    const keyHandler = (e) => {
      if (e.key === 'Escape') cleanup(false);
      if (e.key === 'Enter') cleanup(true);
    };

    okBtn.onclick = () => cleanup(true);
    cancelBtn.onclick = () => cleanup(false);
    dialog.onclick = (e) => {
      if (e.target === dialog) cleanup(false);
    };
    document.addEventListener('keydown', keyHandler);
  });
}

let deferredPwaPrompt = null;
function setupPwaInstallPrompt(appName = 'ملاعبي', appSubtitle = 'وصول أسرع وحجز بضغطة واحدة') {
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;

  const updateInstallButton = (canInstall) => {
    const btn = document.getElementById('accountInstallBtn') || document.getElementById('drawerInstallBtn');
    if (!btn) return;
    if (isStandalone) {
      const sub = btn.querySelector('small') || document.getElementById('accountInstallSubtitle');
      if (sub) sub.textContent = 'التطبيق مثبت على جهازك ✓';
      btn.style.opacity = '0.7';
    } else {
      btn.style.display = 'flex';
    }
  };

  const showInstallBanner = (isIosPrompt = false) => {
    let sheet = document.getElementById('malaebiInstallSheet');
    if (!sheet) {
      sheet = document.createElement('div');
      sheet.id = 'malaebiInstallSheet';
      sheet.className = 'malaebi-install-sheet';
      document.body.appendChild(sheet);
    }

    if (isIosPrompt) {
      sheet.innerHTML = `
        <div class="malaebi-install-card">
          <div class="malaebi-install-top">
            <img src="assets/images/logo.svg" alt="${appName}" class="malaebi-install-logo" />
            <div class="malaebi-install-info">
              <h4 class="malaebi-install-title">ثبّت ${appName} على شاشة الآيفون</h4>
              <p class="malaebi-install-desc">${appSubtitle}</p>
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
            <img src="assets/images/logo.svg" alt="${appName}" class="malaebi-install-logo" />
            <div class="malaebi-install-info">
              <h4 class="malaebi-install-title">ثبّت تطبيق ${appName} على هاتفك</h4>
              <p class="malaebi-install-desc">${appSubtitle}</p>
            </div>
          </div>
          <div class="malaebi-install-actions">
            <button type="button" class="malaebi-install-btn primary" id="pwaInstallNowBtn">📲 تثبيت التطبيق</button>
            <button type="button" class="malaebi-install-btn secondary" id="pwaDismissInstallBtn">لاحقاً</button>
          </div>
        </div>
      `;
    }

    requestAnimationFrame(() => sheet.classList.add('visible'));

    sheet.querySelector('#pwaInstallNowBtn')?.addEventListener('click', async () => {
      if (deferredPwaPrompt) {
        deferredPwaPrompt.prompt();
        const { outcome } = await deferredPwaPrompt.userChoice;
        if (outcome === 'accepted') {
          hideInstallBanner();
        }
        deferredPwaPrompt = null;
      }
    });

    sheet.querySelector('#pwaIosUnderstoodBtn')?.addEventListener('click', () => {
      localStorage.setItem('malaebi_ios_install_dismissed', 'true');
      hideInstallBanner();
    });

    sheet.querySelector('#pwaDismissInstallBtn')?.addEventListener('click', () => {
      localStorage.setItem('malaebi_install_dismissed_until', String(Date.now() + 7 * 86400000));
      hideInstallBanner();
    });
  };

  const hideInstallBanner = () => {
    const sheet = document.getElementById('malaebiInstallSheet');
    if (sheet) {
      sheet.classList.remove('visible');
    }
  };

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPwaPrompt = e;
    updateInstallButton(true);

    const dismissedUntil = localStorage.getItem('malaebi_install_dismissed_until');
    if (!dismissedUntil || Date.now() > Number(dismissedUntil)) {
      setTimeout(() => showInstallBanner(false), 2000);
    }
  });

  window.addEventListener('appinstalled', () => {
    hideInstallBanner();
    deferredPwaPrompt = null;
    updateInstallButton(false);
    if (typeof toast === 'function') toast('شكراً لك! تم تثبيت التطبيق بنجاح 🎉');
    else if (typeof showToast === 'function') showToast('شكراً لك! تم تثبيت التطبيق بنجاح 🎉', 'success');
  });

  if (isIos && !isStandalone) {
    const dismissedIos = localStorage.getItem('malaebi_ios_install_dismissed');
    if (!dismissedIos) {
      setTimeout(() => showInstallBanner(true), 2500);
    }
  }

  const manualBtn = document.getElementById('accountInstallBtn') || document.getElementById('drawerInstallBtn');
  if (manualBtn) {
    manualBtn.addEventListener('click', () => {
      if (deferredPwaPrompt) {
        showInstallBanner(false);
      } else if (isIos) {
        showInstallBanner(true);
      } else {
        if (typeof toast === 'function') toast('التطبيق جاهز للتثبيت أو مثبت بالفعل على جهازك.');
        else if (typeof showToast === 'function') showToast('التطبيق جاهز للتثبيت أو مثبت بالفعل على جهازك.', 'info');
      }
    });
  }

  updateInstallButton(Boolean(deferredPwaPrompt));
}

function initTheme() {
    const saved = localStorage.getItem('malaebi_owner_theme');
    const isDark = saved === 'dark';
    document.body.classList.toggle('dark-mode', isDark);
    updateThemeIcon(isDark);

    const toggleBtn = document.getElementById('themeToggleBtn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const nextDark = !document.body.classList.contains('dark-mode');
        document.body.classList.toggle('dark-mode', nextDark);
        localStorage.setItem('malaebi_owner_theme', nextDark ? 'dark' : 'light');
        updateThemeIcon(nextDark);
      });
    }
  }

  function updateThemeIcon(isDark) {
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
      if (window.MalaebiIcons3D) {
        btn.innerHTML = isDark ? window.MalaebiIcons3D.sun(20) : window.MalaebiIcons3D.moon(20);
      } else {
        btn.textContent = isDark ? '☀️' : '🌙';
      }
    }
  }

  // ==================== APP INITIALIZATION ====================
  async function init() {
    initTheme();
    setupEventListeners();
    setupPwaInstallPrompt('بوابة المنشأة', 'إدارة أسرع لمنشأتك وحجوزاتك اليومية');
    await loadAreasList();

    // Check existing token
    const token = MalaebiOwnerAPI.getToken();
    if (!token) {
      showLoginScreen();
      return;
    }

    try {
      const user = await MalaebiOwnerAPI.me();
      state.user = user;

      if (user?.must_change_password) {
        showMandatoryPasswordModal();
        return;
      }

      await loadOwnerVenues();
    } catch (err) {
      console.warn('Session expired or invalid token:', err);
      showLoginScreen();
    }
  }

  async function loadAreasList() {
    try {
      const res = await MalaebiOwnerAPI.listAreas();
      state.areas = res?.data || [];
      populateAreaSelects();
    } catch (err) {
      console.warn('Could not load areas:', err);
    }
  }

  function populateAreaSelects() {
    const obSel = document.getElementById('obAreaSelect');
    const evSel = document.getElementById('evAreaSelect');

    const options = state.areas.map((a) => {
      return `<option value="${a.id}">${escapeHtml(a.area_name)} (${escapeHtml(a.district_name || 'مأرب')})</option>`;
    }).join('');

    if (obSel) obSel.innerHTML = options;
    if (evSel) evSel.innerHTML = options;
  }

  function showLoginScreen() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('onboardingScreen').style.display = 'none';
    document.getElementById('opsAppShell').style.display = 'none';
  }

  function showOnboardingScreen() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('onboardingScreen').style.display = 'flex';
    document.getElementById('opsAppShell').style.display = 'none';
    populateAreaSelects();
  }

  function showAppShell() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('onboardingScreen').style.display = 'none';
    document.getElementById('opsAppShell').style.display = 'flex';
    renderUserProfile();
  }

  function renderUserProfile() {
    if (!state.user) return;
    const nameEl = document.getElementById('userName');
    const avatarEl = document.getElementById('userAvatar');
    const roleEl = document.getElementById('userRoleBadge');
    const setMailEl = document.getElementById('setUserEmail');

    const name = state.user.full_name || state.user.name || 'مالك المنشأة';
    if (nameEl) nameEl.textContent = name;
    if (avatarEl) avatarEl.textContent = name.charAt(0);
    if (setMailEl) setMailEl.value = state.user.email || 'owner@malaebi.com';

    const activeRole = state.activeVenue?.user_role || state.user.role || 'owner';
    const roleMap = {
      owner: 'مالك رئيسي',
      manager: 'مدير منشأة',
      receptionist: 'مشرف حجوزات'
    };
    if (roleEl) roleEl.textContent = roleMap[activeRole] || activeRole;
  }

  // ==================== VENUES & FIELDS LOADING ====================
  async function loadOwnerVenues() {
    try {
      const res = await MalaebiOwnerAPI.myVenues();
      const venues = res?.data || (Array.isArray(res) ? res : []);

      // STRICT MULTI-TENANT CHECK:
      // If the owner has no venues yet, launch the Onboarding Wizard
      if (!venues || venues.length === 0) {
        showOnboardingScreen();
        return;
      }

      state.venues = venues;
      if (!state.activeVenue || !venues.some(v => v.id === state.activeVenue.id)) {
        state.activeVenue = venues[0];
      }
      state.activeField = state.activeVenue.fields?.[0] || null;

      renderVenueDropdown();
      renderFieldSelectors();
      updateTopGreeting();
      showAppShell();

      // Start Countdown Interval for Pending Bookings
      if (state.countdownInterval) clearInterval(state.countdownInterval);
      state.countdownInterval = setInterval(updateCountdownTimers, 1000);

      // Load active view data
      await refreshCurrentView();
    } catch (err) {
      console.error('Failed to load owner venues:', err);
      showToast(err.message || 'فشل تحميل بيانات المنشأة', true);
      showLoginScreen();
    }
  }

  function renderVenueDropdown() {
    const sel = document.getElementById('venueSelect');
    if (!sel) return;
    sel.innerHTML = '';
    state.venues.forEach((v) => {
      const opt = document.createElement('option');
      opt.value = v.id;
      opt.textContent = `${v.name} (${v.area_name || v.city || 'مأرب'})`;
      if (v.id === state.activeVenue?.id) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  function renderFieldSelectors() {
    const fields = state.activeVenue?.fields || [];
    
    // 1. Schedule field selector
    const sSel = document.getElementById('scheduleFieldSelect');
    if (sSel) {
      sSel.innerHTML = '';
      fields.forEach((f) => {
        const opt = document.createElement('option');
        opt.value = f.id;
        opt.textContent = f.name;
        sSel.appendChild(opt);
      });
    }

    // 2. Walkin field selector
    const wSel = document.getElementById('walkinFieldSelect');
    if (wSel) {
      wSel.innerHTML = '';
      fields.forEach((f) => {
        const opt = document.createElement('option');
        opt.value = f.id;
        opt.textContent = `${f.name} (${Number(f.hourly_price_from || f.price_per_hour || 7000).toLocaleString()} ر.ي)`;
        wSel.appendChild(opt);
      });
    }

    // 3. Settings field selector
    const setSel = document.getElementById('settingsFieldSelect');
    if (setSel) {
      setSel.innerHTML = '';
      fields.forEach((f) => {
        const opt = document.createElement('option');
        opt.value = f.id;
        opt.textContent = f.name;
        setSel.appendChild(opt);
      });
    }

    // Update venue info view
    const vName = document.getElementById('venueCardName');
    const vCity = document.getElementById('venueCardCity');
    const vDesc = document.getElementById('venueCardDesc');
    const sName = document.getElementById('setVenueName');
    const sCity = document.getElementById('setVenueCity');

    if (vName) vName.textContent = state.activeVenue?.name || 'منشأة رياضية';
    if (vCity) vCity.textContent = `${state.activeVenue?.area_name || 'مأرب'} — ${state.activeVenue?.address_text || ''}`;
    if (vDesc) vDesc.textContent = state.activeVenue?.description || 'مجمع رياضي متكامل بمواصفات حديثة.';
    if (sName) sName.value = state.activeVenue?.name || '';
    if (sCity) sCity.value = state.activeVenue?.area_name || state.activeVenue?.city || 'مأرب';
  }

  function updateTopGreeting() {
    const titleEl = document.getElementById('topbarTitle');
    const subEl = document.getElementById('topbarSubtitle');
    if (titleEl && state.activeVenue) {
      titleEl.innerHTML = `مرحباً، ${escapeHtml(state.activeVenue.name)} 👋`;
    }
    if (subEl) {
      subEl.textContent = formatDateAr(state.activeDate);
    }
    const dName = document.getElementById('drawerVenueName');
    const dArea = document.getElementById('drawerVenueArea');
    if (dName && state.activeVenue) dName.textContent = state.activeVenue.name;
    if (dArea && state.activeVenue) dArea.textContent = `${state.activeVenue.area_name || 'مأرب'} — ${state.activeVenue.address_text || ''}`;
  }

  // Drawer helpers
  function openDrawer() {
    document.getElementById('opsDrawer')?.classList.add('open');
    document.getElementById('drawerBackdrop')?.classList.add('open');
  }

  function closeDrawer() {
    document.getElementById('opsDrawer')?.classList.remove('open');
    document.getElementById('drawerBackdrop')?.classList.remove('open');
  }

  // ==================== VIEW SWITCHING ====================
  function switchView(viewName) {
    state.currentView = viewName;

    // Toggle active class on sidebar items, drawer items, and bottom nav items
    document.querySelectorAll('.nav-item, .drawer-nav-item, .b-nav-item, .m-nav-item').forEach((item) => {
      item.classList.toggle('active', item.dataset.view === viewName);
    });

    // Toggle view sections
    document.querySelectorAll('.view-section').forEach((sec) => {
      sec.classList.remove('active');
    });

    const targetSec = document.getElementById(`view${capitalize(viewName)}`);
    if (targetSec) targetSec.classList.add('active');

    closeDrawer();

    refreshCurrentView();
  }

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  async function refreshCurrentView() {
    if (!state.activeVenue) return;

    switch (state.currentView) {
      case 'dashboard':
        await loadDashboardData();
        break;
      case 'bookings':
        await loadBookingsData();
        break;
      case 'schedule':
        await loadScheduleData();
        break;
      case 'venues':
        renderVenuesView();
        loadVenueImages();
        break;
      case 'pricing':
        await loadPricingView();
        break;
      case 'customers':
        await loadCustomersData();
        break;
      case 'reviews':
        await loadReviewsData();
        break;
      case 'staff':
        await loadStaffData();
        break;
      case 'reports':
        await loadReportsData();
        break;
    }
  }

  // ==================== 1. DASHBOARD LOGIC & CHARTS ====================
  async function loadDashboardData() {
    const venueId = state.activeVenue.id;
    try {
      // 1. Summary KPIs & Chart Data
      const summary = await MalaebiOwnerAPI.venueSummary(venueId);
      state.summary = summary;
      renderKPIs(summary);
      renderDonutChart(summary?.status_distribution);
      renderLineChart(summary?.last_7_days_revenue);

      // 2. Pending Approvals
      const pendingRes = await MalaebiOwnerAPI.venueBookings(venueId, { status: 'pending' });
      const pendingList = pendingRes?.data || [];
      state.pendingBookings = pendingList;
      renderPendingApprovals(pendingList);

      // 3. Recent Bookings Table
      const allRes = await MalaebiOwnerAPI.venueBookings(venueId, { from: state.activeDate });
      const allList = allRes?.data || [];
      renderRecentBookings(allList.slice(0, 5));
    } catch (err) {
      console.error('Error loading dashboard:', err);
      showToast('تعذر تحديث بيانات لوحة التحكم', true);
    }
  }

  function renderKPIs(s) {
    const revEl = document.getElementById('kpiRevenue');
    const countEl = document.getElementById('kpiBookingsCount');
    const occEl = document.getElementById('kpiOccupancy');
    const fieldsEl = document.getElementById('kpiActiveFields');

    const revFormatted = Number(s?.expected_revenue_today || 0).toLocaleString();
    if (revEl) revEl.innerHTML = `${revFormatted} <span style="font-size:13px; font-weight:700;">ريال</span>`;
    if (countEl) countEl.textContent = s?.confirmed_today || 0;
    if (occEl) occEl.textContent = `${s?.occupancy_rate || 0}%`;
    if (fieldsEl) fieldsEl.textContent = s?.active_fields_count || (state.activeVenue?.fields?.length || 1);

    // Badges
    const navBadge = document.getElementById('navPendingBadge');
    const bottomNavBadge = document.getElementById('bottomNavPendingBadge');
    const countBadge = document.getElementById('pendingBadgeCount');
    const pCount = s?.pending_approval || 0;

    if (navBadge) {
      navBadge.textContent = pCount;
      navBadge.style.display = pCount > 0 ? 'inline-block' : 'none';
    }
    if (bottomNavBadge) {
      bottomNavBadge.textContent = pCount;
      bottomNavBadge.style.display = pCount > 0 ? 'inline-block' : 'none';
    }
    if (countBadge) countBadge.textContent = `${pCount} طلب`;
  }

  // Pure SVG Donut Chart (Strict real data)
  function renderDonutChart(dist) {
    const total = dist?.total || 0;
    const confirmed = dist?.confirmed || 0;
    const pending = dist?.pending || 0;
    const cancelled = dist?.cancelled || 0;

    document.getElementById('donutTotalText').textContent = total;
    document.getElementById('legendConfirmedVal').textContent = confirmed;
    document.getElementById('legendPendingVal').textContent = pending;
    document.getElementById('legendCancelledVal').textContent = cancelled;

    // Circumference = 2 * PI * 38 = ~238.76
    const C = 238.76;
    const cCircle = document.getElementById('donutConfirmed');
    const pCircle = document.getElementById('donutPending');
    const cancCircle = document.getElementById('donutCancelled');

    if (total === 0) {
      if (cCircle) cCircle.setAttribute('stroke-dasharray', `0 ${C}`);
      if (pCircle) pCircle.setAttribute('stroke-dasharray', `0 ${C}`);
      if (cancCircle) cancCircle.setAttribute('stroke-dasharray', `0 ${C}`);
      return;
    }

    const confLen = (confirmed / total) * C;
    const pendLen = (pending / total) * C;
    const cancLen = (cancelled / total) * C;

    if (cCircle && pCircle && cancCircle) {
      cCircle.setAttribute('stroke-dasharray', `${confLen} ${C}`);
      cCircle.setAttribute('stroke-dashoffset', '0');

      pCircle.setAttribute('stroke-dasharray', `${pendLen} ${C}`);
      pCircle.setAttribute('stroke-dashoffset', `${-confLen}`);

      cancCircle.setAttribute('stroke-dasharray', `${cancLen} ${C}`);
      cancCircle.setAttribute('stroke-dashoffset', `${-(confLen + pendLen)}`);
    }
  }

  // Pure SVG Line / Area Chart for 7 Days (Strict real data)
  function renderLineChart(daysData) {
    const container = document.getElementById('lineChartContainer');
    if (!container) return;

    let data = daysData;
    if (!data || data.length === 0) {
      const days = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
      data = days.map(d => ({ day_name: d, revenue: 0 }));
    }

    const maxRev = Math.max(10000, ...data.map(d => d.revenue || 0));
    const W = 520;
    const H = 160;
    const padX = 40;
    const padY = 20;
    const chartW = W - padX * 2;
    const chartH = H - padY * 2;

    const pts = data.map((d, i) => {
      const x = padX + (i / Math.max(1, data.length - 1)) * chartW;
      const y = H - padY - ((d.revenue || 0) / maxRev) * chartH;
      return { x, y, ...d };
    });

    let lineD = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const cur = pts[i];
      const cx = (prev.x + cur.x) / 2;
      lineD += ` C ${cx} ${prev.y}, ${cx} ${cur.y}, ${cur.x} ${cur.y}`;
    }

    const areaD = `${lineD} L ${pts[pts.length - 1].x} ${H - padY} L ${pts[0].x} ${H - padY} Z`;

    const svg = `
      <svg viewBox="0 0 ${W} ${H + 25}" class="line-chart-svg">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#10b981" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="#10b981" stop-opacity="0.0"/>
          </linearGradient>
        </defs>

        <line x1="${padX}" y1="${padY}" x2="${W - padX}" y2="${padY}" stroke="#e2e8f0" stroke-dasharray="3 3"/>
        <text x="10" y="${padY + 4}" font-size="10" fill="#94a3b8">${Math.round(maxRev / 1000)}k</text>

        <line x1="${padX}" y1="${padY + chartH / 2}" x2="${W - padX}" y2="${padY + chartH / 2}" stroke="#e2e8f0" stroke-dasharray="3 3"/>
        <text x="10" y="${padY + chartH / 2 + 4}" font-size="10" fill="#94a3b8">${Math.round(maxRev / 2000)}k</text>

        <line x1="${padX}" y1="${H - padY}" x2="${W - padX}" y2="${H - padY}" stroke="#e2e8f0"/>
        <text x="10" y="${H - padY + 4}" font-size="10" fill="#94a3b8">0k</text>

        <path d="${areaD}" fill="url(#areaGrad)"/>
        <path d="${lineD}" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round"/>

        ${pts.map((p) => `
          <circle cx="${p.x}" cy="${p.y}" r="4.5" fill="#ffffff" stroke="#10b981" stroke-width="2.5"/>
          <text x="${p.x}" y="${H + 14}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#64748b">${p.day_name}</text>
        `).join('')}
      </svg>
    `;

    container.innerHTML = svg;
  }

  // Pending Approvals
  function renderPendingApprovals(list) {
    const container = document.getElementById('pendingContainer');
    if (!container) return;

    if (!list || list.length === 0) {
      container.innerHTML = `
        <div style="grid-column:1/-1; background:var(--bg); padding:20px; border-radius:12px; text-align:center; color:var(--muted); font-size:13px;">
          ✓ لا توجد طلبات معلقة بانتظار الموافقة حالياً
        </div>
      `;
      return;
    }

    container.innerHTML = list.map((b) => {
      const field = state.activeVenue?.fields?.find((f) => f.id === b.field_id);
      const fieldName = field ? field.name : 'الملعب الرئيسي';
      const custName = b.customer_name || (b.user ? (b.user.full_name || b.user.email) : 'لاعب ملاعبي');
      const timeStr = `${formatTime12Ar(b.starts_at)} – ${formatTime12Ar(b.ends_at)}`;
      const priceStr = Number(b.total_price || 7000).toLocaleString();

      return `
        <div class="section-card" style="margin-bottom:0; border:1px solid #fde68a; background:var(--amber-light);" id="pendingCard_${b.id}">
          <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:10px;">
            <div>
              <span style="font-size:11px; font-weight:800; color:var(--muted);">${b.reference_code || 'MLB-NEW'}</span>
              <h4 style="font-size:15px; font-weight:800; margin-top:2px;">${escapeHtml(custName)}</h4>
              <small style="color:var(--muted);display:inline-flex;align-items:center;gap:4px;">${window.MalaebiIcons3D ? window.MalaebiIcons3D.stadium(14) : '🏟️'} ${escapeHtml(fieldName)}</small>
            </div>
            <div class="pending-badge-timer" id="timerBadge_${b.id}" data-expires="${b.expires_at || ''}" data-created="${b.created_at || ''}" style="background:#fef3c7; color:#b45309; padding:4px 10px; border-radius:20px; font-size:11px; font-weight:800; border:1px solid #fde68a;">
              ⏱️ <span class="countdown-text">10:00</span>
            </div>
          </div>

          <div style="font-size:13px; font-weight:700; margin-bottom:12px;">
            ${window.MalaebiIcons3D ? window.MalaebiIcons3D.calendar(14) : '📅'} ${formatDateAr(b.starts_at?.split('T')[0])} (${timeStr})
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <b style="color:var(--green); font-size:15px;">${priceStr} ر.ي</b>
            <span class="status-pill pending">بانتظار الموافقة</span>
          </div>

          <div style="display:flex; gap:8px;">
            <button type="button" class="btn-primary" style="flex:1; padding:8px;" onclick="MalaebiApp.approveBooking('${b.id}')">
              ✓ موافقة وتأكيد
            </button>
            <button type="button" class="btn-outline" style="color:var(--red); border-color:var(--red); padding:8px 14px;" onclick="MalaebiApp.openRejectModal('${b.id}', '${b.reference_code || ''}', '${escapeHtml(custName)}')">
              ✕ رفض
            </button>
          </div>
        </div>
      `;
    }).join('');

    updateCountdownTimers();
  }

  function updateCountdownTimers() {
    const timerEls = document.querySelectorAll('.pending-badge-timer');
    const now = Date.now();

    timerEls.forEach((el) => {
      let expires = el.dataset.expires ? new Date(el.dataset.expires).getTime() : 0;
      if (!expires && el.dataset.created) {
        expires = new Date(el.dataset.created).getTime() + 10 * 60 * 1000;
      }
      if (!expires) return;

      const diff = expires - now;
      const textSpan = el.querySelector('.countdown-text');
      if (!textSpan) return;

      if (diff <= 0) {
        textSpan.textContent = 'انتهت المهلة';
        el.style.background = '#fee2e2';
        el.style.color = '#ef4444';
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        const mm = mins < 10 ? '0' + mins : mins;
        const ss = secs < 10 ? '0' + secs : secs;
        textSpan.textContent = `${mm}:${ss} متبقية`;
      }
    });
  }

  // Recent Bookings in Dashboard
  function renderRecentBookings(list) {
    const tbody = document.getElementById('dashboardRecentBody');
    if (!tbody) return;

    if (!list || list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:28px; color:var(--muted);">لا توجد أي حجوزات مسجلة للمنشأة حتى الآن</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map((b) => {
      const field = state.activeVenue?.fields?.find((f) => f.id === b.field_id);
      const fieldName = field ? field.name : 'الملعب الرئيسي';
      const custName = b.customer_name || (b.user ? (b.user.full_name || b.user.email) : 'لاعب ملاعبي');
      const timeStr = `${formatTime12Ar(b.starts_at)} – ${formatTime12Ar(b.ends_at)}`;
      const priceStr = Number(b.total_price || 7000).toLocaleString();

      return `
        <tr>
          <td><b style="font-family:monospace; color:var(--green);">${b.reference_code || 'MLB-NEW'}</b></td>
          <td>${escapeHtml(fieldName)}</td>
          <td><b>${escapeHtml(custName)}</b></td>
          <td>${formatDateAr(b.starts_at?.split('T')[0])}</td>
          <td>${timeStr}</td>
          <td><b>${priceStr} ر.ي</b></td>
          <td>${getStatusPill(b.status)}</td>
          <td>
            <button type="button" class="btn-action-sm" onclick="MalaebiApp.openBookingDetail('${b.id}')">تفاصيل</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function getStatusPill(status) {
    switch (status) {
      case 'confirmed':
        return '<span class="status-pill active">مؤكد</span>';
      case 'pending':
        return '<span class="status-pill pending">بانتظار</span>';
      case 'completed':
        return '<span class="status-pill active">مكتمل</span>';
      case 'cancelled':
      case 'rejected':
        return '<span class="status-pill cancelled">ملغي</span>';
      default:
        return `<span class="status-pill">${status}</span>`;
    }
  }

  // ==================== 2. BOOKINGS VIEW LOGIC ====================
  async function loadBookingsData() {
    const venueId = state.activeVenue.id;
    try {
      const activeFilterBtn = document.querySelector('#bookingsFilterTabs .tab-pill.active');
      const status = activeFilterBtn ? activeFilterBtn.dataset.status : '';

      const res = await MalaebiOwnerAPI.venueBookings(venueId, { status: status || undefined });
      const list = res?.data || [];
      state.bookings = list;
      renderAllBookingsTable(list);
    } catch (err) {
      console.error('Error loading bookings:', err);
      showToast('تعذر تحميل الحجوزات', true);
    }
  }

  function renderAllBookingsTable(list) {
    const tbody = document.getElementById('allBookingsBody');
    if (!tbody) return;

    const query = (document.getElementById('bookingsSearchInput')?.value || '').trim().toLowerCase();
    const filtered = list.filter((b) => {
      if (!query) return true;
      const ref = (b.reference_code || '').toLowerCase();
      const name = (b.customer_name || (b.user ? (b.user.full_name || b.user.email) : '')).toLowerCase();
      return ref.includes(query) || name.includes(query);
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:32px; color:var(--muted);">لا توجد حجوزات مسجلة</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map((b) => {
      const field = state.activeVenue?.fields?.find((f) => f.id === b.field_id);
      const fieldName = field ? field.name : 'الملعب الرئيسي';
      const custName = b.customer_name || (b.user ? (b.user.full_name || b.user.email) : 'لاعب ملاعبي');
      const timeStr = `${formatTime12Ar(b.starts_at)} – ${formatTime12Ar(b.ends_at)}`;
      const priceStr = Number(b.total_price || 7000).toLocaleString();

      return `
        <tr>
          <td><b style="font-family:monospace; color:var(--green);">${b.reference_code || 'MLB-NEW'}</b></td>
          <td>${escapeHtml(fieldName)}</td>
          <td><b>${escapeHtml(custName)}</b></td>
          <td>${formatDateAr(b.starts_at?.split('T')[0])}</td>
          <td>${timeStr}</td>
          <td><b>${priceStr} ر.ي</b></td>
          <td>${getStatusPill(b.status)}</td>
          <td>
            <button type="button" class="btn-action-sm" onclick="MalaebiApp.openBookingDetail('${b.id}')">تفاصيل</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Booking Detail Modal
  function openBookingDetail(bookingId) {
    const b = state.bookings.find((x) => x.id === bookingId) || state.pendingBookings.find((x) => x.id === bookingId);
    if (!b) return;

    const modalTitle = document.getElementById('modalBookingNo');
    const content = document.getElementById('bookingDetailContent');
    const actions = document.getElementById('bookingDetailActions');

    const field = state.activeVenue?.fields?.find((f) => f.id === b.field_id);
    const fieldName = field ? field.name : 'الملعب الرئيسي';
    const custName = b.customer_name || (b.user ? (b.user.full_name || b.user.email) : 'لاعب ملاعبي');
    const phone = b.customer_phone || (b.user ? (b.user.phone || '-') : '-');
    const timeStr = `${formatTime12Ar(b.starts_at)} – ${formatTime12Ar(b.ends_at)}`;
    const priceStr = Number(b.total_price || 7000).toLocaleString();

    modalTitle.textContent = `تفاصيل الحجز ${b.reference_code || ''}`;
    content.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <span style="font-size:12px; color:var(--muted);">حالة الحجز:</span>
        ${getStatusPill(b.status)}
      </div>
      <div style="background:var(--bg); padding:14px; border-radius:12px; margin-bottom:14px;">
        <div><b>اسم العميل:</b> ${escapeHtml(custName)}</div>
        <div><b>رقم الهاتف:</b> <span dir="ltr">${escapeHtml(phone)}</span></div>
        <div><b>الملعب:</b> ${escapeHtml(fieldName)}</div>
        <div><b>الموعد:</b> ${formatDateAr(b.starts_at?.split('T')[0])} (${timeStr})</div>
        <div><b>المبلغ الإجمالي:</b> <b style="color:var(--green);">${priceStr} ريال</b></div>
        <div><b>طريقة الحجز:</b> ${b.booking_type === 'external' ? 'حجز خارجي (حضوري/هاتفي)' : 'تطبيق ملاعبي'}</div>
      </div>
    `;

    let acts = `<button type="button" class="btn-outline" data-close-modal="bookingDetailModal" style="flex:1;">إغلاق</button>`;
    if (b.status === 'confirmed') {
      acts = `
        <button type="button" class="btn-primary" style="flex:1;" onclick="MalaebiApp.completeBooking('${b.id}')">تسجيل الحضور (إكمال)</button>
        <button type="button" class="btn-outline" data-close-modal="bookingDetailModal" style="flex:1;">إغلاق</button>
      `;
    } else if (b.status === 'pending') {
      acts = `
        <button type="button" class="btn-primary" style="flex:1;" onclick="MalaebiApp.approveBooking('${b.id}')">موافقة وتأكيد</button>
        <button type="button" class="btn-outline" style="color:var(--red); border-color:var(--red); flex:1;" onclick="MalaebiApp.openRejectModal('${b.id}', '${b.reference_code || ''}', '${escapeHtml(custName)}')">رفض الحجز</button>
      `;
    }
    actions.innerHTML = acts;

    openModal('bookingDetailModal');
  }

  // ==================== 3. SCHEDULE VIEW LOGIC (18 SLOTS) ====================
  async function loadScheduleData() {
    const venue = state.activeVenue;
    if (!venue) return;

    const fields = venue.fields || [];
    if (fields.length === 0) return;

    const curFieldId = document.getElementById('scheduleFieldSelect')?.value || fields[0].id;
    const curField = fields.find((f) => f.id === curFieldId) || fields[0];

    // Update Date Display
    const dateLabel = document.getElementById('scheduleDateLabel');
    const dateInput = document.getElementById('scheduleDateInput');
    if (dateLabel) {
      dateLabel.textContent = (state.activeDate === getTodayAdenString())
        ? `اليوم (${formatDateAr(state.activeDate)})`
        : formatDateAr(state.activeDate);
    }
    if (dateInput) dateInput.value = state.activeDate;

    try {
      const availRes = await MalaebiOwnerAPI.fieldAvailability(curField.id, state.activeDate);
      const slots = availRes?.slots || [];

      const bRes = await MalaebiOwnerAPI.venueBookings(venue.id, {
        field_id: curField.id,
        from: state.activeDate,
        to: state.activeDate
      });
      const dayBookings = bRes?.data || [];

      renderScheduleTimeline(curField, slots, dayBookings);
    } catch (err) {
      console.error('Failed to load schedule:', err);
      showToast('تعذر تحميل الجدول لليوم المحدد', true);
    }
  }

  function renderScheduleTimeline(field, availabilitySlots, dayBookings) {
    const grid = document.getElementById('scheduleSlotsGrid');
    if (!grid) return;

    const hours = [];
    for (let h = 6; h <= 23; h++) {
      const hStr = h < 10 ? '0' + h : String(h);
      const nextH = (h + 1) === 24 ? '00' : ((h + 1) < 10 ? '0' + (h + 1) : String(h + 1));
      hours.push({
        start: `${hStr}:00`,
        end: `${nextH}:00`,
        label: `${formatTime12Ar(hStr + ':00')} – ${formatTime12Ar(nextH + ':00')}`
      });
    }

    grid.innerHTML = hours.map((hInfo) => {
      const b = dayBookings.find((item) => {
        if (!item.starts_at) return false;
        const bStart = item.starts_at.includes('T') ? item.starts_at.split('T')[1].slice(0, 5) : item.starts_at.slice(0, 5);
        return bStart === hInfo.start;
      });

      const avail = availabilitySlots.find((s) => {
        const sStart = s.starts_at?.includes('T') ? s.starts_at.split('T')[1].slice(0, 5) : s.starts_at?.slice(0, 5);
        return sStart === hInfo.start;
      });

      let cardClass = 'available';
      let tagText = 'متاح للحجز';
      let tagClass = '';
      let bodyText = `<small style="color:var(--green); font-weight:700;">+ اضغط لتسجيل حجز خارجي</small>`;

      if (b) {
        if (b.status === 'confirmed' || b.status === 'completed') {
          cardClass = 'confirmed';
          tagText = 'مؤكد';
          tagClass = 'active';
          const name = b.customer_name || (b.user ? (b.user.full_name || 'لاعب ملاعبي') : 'حجز خارجي');
          bodyText = `<b>${escapeHtml(name)}</b><br><small style="color:var(--muted);">${b.reference_code || ''} · ${Number(b.total_price || 0).toLocaleString()} ر.ي</small>`;
        } else if (b.status === 'pending') {
          cardClass = 'pending';
          tagText = 'بانتظار';
          tagClass = 'pending';
          bodyText = `<b>طلب معلق جديد</b><br><small style="color:var(--muted);">${b.reference_code || ''}</small>`;
        }
      } else if (avail && avail.is_available === false) {
        cardClass = 'maintenance';
        tagText = 'صيانة / محظور';
        tagClass = 'maintenance';
        bodyText = `<small style="color:var(--muted);">الفترة غير متاحة</small>`;
      }

      return `
        <div class="time-slot-card ${cardClass}" data-start="${hInfo.start}" data-end="${hInfo.end}" data-field-id="${field.id}">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <b style="font-size:13px;">${hInfo.label}</b>
            <span class="status-pill ${tagClass}" style="font-size:10px;">${tagText}</span>
          </div>
          <div style="margin-top:8px;">
            ${bodyText}
          </div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.time-slot-card.available').forEach((card) => {
      card.addEventListener('click', () => {
        const start = card.dataset.start;
        const end = card.dataset.end;
        document.getElementById('walkinTimeStart').value = start;
        document.getElementById('walkinTimeEnd').value = end;
        document.getElementById('walkinDateInput').value = state.activeDate;
        switchView('walkin');
      });
    });
  }

  // ==================== 4. WALKIN EXTERNAL BOOKING ====================
  async function handleExternalBookingSubmit() {
    const fieldId = document.getElementById('walkinFieldSelect').value;
    const date = document.getElementById('walkinDateInput').value || state.activeDate;
    const start = document.getElementById('walkinTimeStart').value;
    const end = document.getElementById('walkinTimeEnd').value;
    const price = Number(document.getElementById('walkinPriceInput').value) || 7000;
    const custName = document.getElementById('walkinCustName').value.trim() || 'عميل حضوري';
    const custPhone = document.getElementById('walkinCustPhone').value.trim();
    const notes = document.getElementById('walkinCustNotes').value.trim();

    const startsAt = `${date}T${start}:00+03:00`;
    const endsAt = `${date}T${end}:00+03:00`;

    try {
      await MalaebiOwnerAPI.createExternalBooking(state.activeVenue.id, {
        field_id: fieldId,
        starts_at: startsAt,
        ends_at: endsAt,
        customer_name: custName,
        customer_phone: custPhone || undefined,
        total_price: price,
        notes: notes || undefined
      });

      showToast('تم تسجيل الحجز الخارجي بنجاح!');
      switchView('schedule');
    } catch (err) {
      showToast(err.message || 'فشل تسجيل الحجز الخارجي', true);
    }
  }

  // ==================== 5. VENUES & FIELDS VIEW ====================
  function renderVenuesView() {
    const fields = state.activeVenue?.fields || [];
    const container = document.getElementById('fieldsGridContainer');
    if (!container) return;

    if (fields.length === 0) {
      container.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:32px; color:var(--muted);">لا توجد ملاعب مضافة حتى الآن</div>`;
      return;
    }

    container.innerHTML = fields.map((f) => {
      const priceStr = Number(f.hourly_price_from || f.price_per_hour || 7000).toLocaleString();
      return `
        <div class="field-card-item">
          <div style="background:#072b1c; height:120px; display:grid; place-items:center; color:#6ee7b7; font-size:38px;">
            🏟️
          </div>
          <div class="field-card-body">
            <div class="field-card-head">
              <h4 style="font-size:16px; font-weight:800;">${escapeHtml(f.name)}</h4>
              <span class="status-pill active">نشط</span>
            </div>
            <p style="font-size:12.5px; color:var(--muted); margin-bottom:12px;">
              ${escapeHtml(f.surface_type || 'عشب صناعي')} · سعة ${f.capacity || '12'} لاعب · إنارة ليلية
            </p>
            <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--line); padding-top:12px;">
              <div>
                <small style="color:var(--muted); font-size:11px;">السعر بالساعة</small>
                <b style="display:block; color:var(--green); font-size:16px;">${priceStr} ر.ي</b>
              </div>
              <button type="button" class="btn-outline" onclick="MalaebiApp.switchView('pricing')">تعديل الأسعار</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  async function loadVenueImages() {
    const grid = document.getElementById('venueImagesGrid');
    if (!grid || !state.activeVenue) return;

    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:18px;color:var(--muted);font-size:12px;">جاري تحميل الصور...</div>';

    let images = [];
    try {
      if (window.MalaebiOwnerAPI) {
        const res = await MalaebiOwnerAPI.getVenueImages(state.activeVenue.id);
        images = res.data || [];
        state.activeVenue.images = images;
      }
    } catch (e) {
      console.warn('Could not load venue images:', e);
      images = state.activeVenue?.images || [];
    }

    if (images.length === 0) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:26px 16px;color:var(--muted);background:var(--bg);border-radius:12px;border:1px dashed var(--card-border);">
          <div style="font-size:28px;margin-bottom:6px;">📷</div>
          <b style="font-size:13px;display:block;color:var(--ink);">لا توجد صور مضافة للمنشأة بعد</b>
          <p style="font-size:11.5px;margin:4px 0 0;color:var(--muted);">اضغط على «+ رفع صورة جديدة» لإضافة صور عالية الدقة لملعبك ومرافقه لتظهر للاعبين.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = images.map((img, idx) => `
      <div class="venue-image-card" style="position:relative;border-radius:12px;overflow:hidden;aspect-ratio:4/3;background:#e2e8f0;border:1px solid var(--card-border);box-shadow:var(--shadow-sm);">
        <img src="${escapeHtml(img.image_url)}" alt="صورة الملعب" style="width:100%;height:100%;object-fit:cover;display:block;" loading="lazy" />
        <button type="button" class="btn-delete-venue-image" data-image-id="${img.id}" title="حذف الصورة" style="position:absolute;top:6px;left:6px;width:28px;height:28px;border-radius:50%;background:rgba(220,38,38,0.85);color:#fff;border:0;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:13px;box-shadow:0 2px 6px rgba(0,0,0,0.3);transition:0.18s;">
          ✕
        </button>
        ${idx === 0 ? '<span style="position:absolute;bottom:6px;right:6px;background:var(--green);color:#fff;font-size:10px;font-weight:800;padding:2px 7px;border-radius:6px;box-shadow:0 2px 4px rgba(0,0,0,0.25);">الغلاف</span>' : ''}
      </div>
    `).join('');
  }

  // ==================== 6. PRICING & SETTINGS VIEW ====================
  async function loadPricingView() {
    const fields = state.activeVenue?.fields || [];
    const ratesList = document.getElementById('pricingRatesList');
    if (ratesList) {
      ratesList.innerHTML = fields.map((f) => `
        <div class="form-field">
          <label>${escapeHtml(f.name)} (السعر / ساعة)</label>
          <input type="text" class="form-input" value="${Number(f.hourly_price_from || f.price_per_hour || 7000).toLocaleString()} ريال يمني" readonly>
        </div>
      `).join('');
    }

    const curField = fields[0];
    if (curField) {
      try {
        const settings = await MalaebiOwnerAPI.getFieldSettings(state.activeVenue.id, curField.id);
        const isInstant = settings?.confirmation_mode === 'instant';
        document.getElementById('confInstant').checked = isInstant;
        document.getElementById('confApproval').checked = !isInstant;
      } catch (err) {
        console.warn('Field settings error:', err);
      }
    }
  }

  async function handleSaveBookingSettings() {
    const fields = state.activeVenue?.fields || [];
    const curFieldId = document.getElementById('settingsFieldSelect')?.value || fields[0]?.id;
    if (!curFieldId) return;

    const isInstant = document.getElementById('confInstant').checked;
    const mode = isInstant ? 'instant' : 'approval';

    try {
      await MalaebiOwnerAPI.updateFieldSettings(state.activeVenue.id, curFieldId, {
        confirmation_mode: mode,
        instant_booking_enabled: isInstant
      });
      showToast('تم حفظ إعدادات الحجز بنجاح!');
    } catch (err) {
      showToast(err.message || 'فشل حفظ الإعدادات', true);
    }
  }

  // ==================== 7. CUSTOMERS VIEW ====================
  async function loadCustomersData() {
    const venueId = state.activeVenue.id;
    try {
      const res = await MalaebiOwnerAPI.venueCustomers(venueId);
      const list = res?.data || [];
      state.customers = list;
      renderCustomersTable(list);
    } catch (err) {
      console.error('Customers error:', err);
      showToast('تعذر تحميل بيانات العملاء', true);
    }
  }

  function renderCustomersTable(list) {
    const tbody = document.getElementById('customersTableBody');
    if (!tbody) return;

    const query = (document.getElementById('customerSearchInput')?.value || '').trim().toLowerCase();
    const filtered = list.filter((c) => {
      if (!query) return true;
      return (c.customer_name || '').toLowerCase().includes(query) || (c.phone || '').includes(query);
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:32px; color:var(--muted);">لا يوجد عملاء حتى الآن، ستظهر هنا بيانات اللاعبين بمجرد إجراء أول حجز في منشأتك</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map((c) => `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="width:32px; height:32px; border-radius:50%; background:var(--mint); color:var(--mint-text); display:grid; place-items:center; font-weight:800; font-size:13px;">
              ${(c.customer_name || 'ع').charAt(0)}
            </div>
            <b>${escapeHtml(c.customer_name || 'عميل ملاعبي')}</b>
          </div>
        </td>
        <td dir="ltr" style="text-align:right;">${escapeHtml(c.phone || '-')}</td>
        <td><b>${c.total_bookings || 1}</b></td>
        <td><b style="color:var(--green);">${Number(c.total_spent || 0).toLocaleString()} ر.ي</b></td>
        <td>${c.last_booking_date ? formatDateAr(c.last_booking_date.split('T')[0]) : '-'}</td>
      </tr>
    `).join('');
  }

  // ==================== 8. REVIEWS VIEW ====================
  async function loadReviewsData() {
    const venueId = state.activeVenue.id;
    try {
      const res = await MalaebiOwnerAPI.venueReviews(venueId);
      const list = res?.data || [];
      state.reviews = list;
      renderReviewsList(list);
    } catch (err) {
      console.error('Reviews error:', err);
      showToast('تعذر تحميل التقييمات', true);
    }
  }

  function renderReviewsList(list) {
    const container = document.getElementById('reviewsListContainer');
    if (!container) return;

    if (!list || list.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:32px; color:var(--muted);">
          لا توجد تقييمات منشورة حتى الآن لهذا الملعب
        </div>
      `;
      return;
    }

    container.innerHTML = list.map((r) => {
      const stars = '⭐'.repeat(r.rating || 5);
      return `
        <div class="review-card-item">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <div style="width:34px; height:34px; border-radius:50%; background:#f1f5f9; display:grid; place-items:center; font-size:15px;">
                👤
              </div>
              <div>
                <b>${escapeHtml(r.player_name || 'لاعب ملاعبي')}</b>
                <small style="display:flex;align-items:center;gap:4px;color:var(--muted);font-size:11px;">${window.MalaebiIcons3D ? window.MalaebiIcons3D.stadium(13) : '🏟️'} ${escapeHtml(r.field_name || 'الملعب الرئيسي')}</small>
              </div>
            </div>
            <div style="text-align:left;">
              <div class="review-stars">${stars}</div>
              <small style="color:var(--muted); font-size:11px;">${r.created_at ? formatDateAr(r.created_at.split('T')[0]) : ''}</small>
            </div>
          </div>
          <p style="font-size:13px; color:var(--ink); line-height:1.6; margin-top:6px;">
            «${escapeHtml(r.comment || 'ملعب ممتاز وخدمة راقية')}»
          </p>
        </div>
      `;
    }).join('');
  }

  // ==================== 9. STAFF VIEW ====================
  async function loadStaffData() {
    const venueId = state.activeVenue.id;
    try {
      const res = await MalaebiOwnerAPI.venueMembers(venueId);
      const list = res?.data || [];
      state.members = list;
      renderStaffTable(list);
    } catch (err) {
      console.error('Staff error:', err);
      showToast('تعذر تحميل بيانات الموظفين', true);
    }
  }

  function renderStaffTable(list) {
    const tbody = document.getElementById('staffTableBody');
    if (!tbody) return;

    const roleNameMap = {
      owner: 'مالك المنشأة',
      manager: 'مدير منشأة',
      receptionist: 'مشرف حجوزات واستقبال'
    };

    const rolePerms = {
      owner: 'كامل الصلاحيات',
      manager: 'إدارة الحجوزات والملاعب والأسعار',
      receptionist: 'تسكين الحجوزات وإدارة المواعيد'
    };

    tbody.innerHTML = list.map((m) => {
      const isOwner = m.role === 'owner';
      const name = m.full_name || m.name || m.email || 'عضو منشأة';
      const contact = m.email || m.phone || '-';

      return `
        <tr>
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
              <div style="width:32px; height:32px; border-radius:50%; background:var(--mint); color:var(--mint-text); display:grid; place-items:center; font-weight:800;">
                ${name.charAt(0)}
              </div>
              <b>${escapeHtml(name)}</b>
            </div>
          </td>
          <td dir="ltr" style="text-align:right;">${escapeHtml(contact)}</td>
          <td><b>${roleNameMap[m.role] || m.role}</b></td>
          <td><small style="color:var(--muted);">${rolePerms[m.role] || 'صلاحيات قياسية'}</small></td>
          <td><span class="status-pill active">نشط</span></td>
          <td>
            ${!isOwner ? `<button type="button" class="btn-outline" style="color:var(--red); border-color:var(--red); padding:4px 10px; font-size:11px;" onclick="MalaebiApp.removeMember('${m.id}')">إزالة</button>` : `<span style="font-size:11.5px; color:var(--muted);">المالك</span>`}
          </td>
        </tr>
      `;
    }).join('');
  }

  async function handleAddStaffSubmit() {
    const identifier = document.getElementById('newStaffIdInput').value.trim();
    const role = document.getElementById('newStaffRoleSelect').value;

    if (!identifier) {
      showToast('يرجى إدخال البريد الإلكتروني أو الهاتف', true);
      return;
    }

    try {
      await MalaebiOwnerAPI.addMember(state.activeVenue.id, { identifier, role });
      closeModal('addStaffModal');
      document.getElementById('newStaffIdInput').value = '';
      showToast('تمت إضافة الموظف بنجاح!');
      await loadStaffData();
    } catch (err) {
      showToast(err.message || 'فشل إضافة الموظف', true);
    }
  }

  // ==================== 10. REPORTS VIEW ====================
  async function loadReportsData() {
    const venueId = state.activeVenue.id;
    try {
      const res = await MalaebiOwnerAPI.venueReports(venueId, '30d');
      state.reports = res;
      renderReportsView(res);
    } catch (err) {
      console.error('Reports error:', err);
      showToast('تعذر تحميل التقارير', true);
    }
  }

  function renderReportsView(r) {
    const totRev = document.getElementById('repTotalRev');
    const avgDaily = document.getElementById('repAvgDaily');
    const totBook = document.getElementById('repTotalBookings');
    const occ = document.getElementById('repOccupancyRate');

    if (totRev) totRev.innerHTML = `${Number(r?.total_revenue || 0).toLocaleString()} <span style="font-size:13px; font-weight:700;">ريال</span>`;
    if (avgDaily) avgDaily.innerHTML = `${Number(r?.avg_daily_revenue || 0).toLocaleString()} <span style="font-size:13px; font-weight:700;">ريال</span>`;
    if (totBook) totBook.textContent = r?.total_bookings || 0;
    if (occ) occ.textContent = `${r?.occupancy_rate || 0}%`;

    renderReportsBarChart(r?.daily_breakdown);
  }

  function renderReportsBarChart(days) {
    const container = document.getElementById('reportsBarChartContainer');
    if (!container) return;

    let data = days;
    if (!data || data.length === 0) {
      const dayNames = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
      data = dayNames.map(d => ({ day_name: d, revenue: 0 }));
    }

    const maxRev = Math.max(10000, ...data.map(d => d.revenue || 0));
    const W = 600;
    const H = 170;
    const barWidth = 24;
    const spacing = (W - 40) / data.length;

    const svg = `
      <svg viewBox="0 0 ${W} ${H + 30}" style="width:100%; height:190px;">
        <line x1="20" y1="${H}" x2="${W - 20}" y2="${H}" stroke="#e2e8f0"/>
        ${data.map((d, i) => {
          const val = d.revenue || 0;
          const barH = val > 0 ? Math.max(8, (val / maxRev) * (H - 30)) : 4;
          const x = 30 + i * spacing;
          const y = H - barH;
          return `
            <rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" rx="4" fill="${val > 0 ? '#10b981' : '#e2e8f0'}"/>
            <text x="${x + barWidth / 2}" y="${H + 16}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#64748b">${d.day_name}</text>
          `;
        }).join('')}
      </svg>
    `;

    container.innerHTML = svg;
  }

  // ==================== ONBOARDING SUBMISSION ====================
  async function handleOnboardingSubmit() {
    const btn = document.getElementById('obSubmitBtn');
    const errEl = document.getElementById('onboardingError');

    const venueName = document.getElementById('obVenueName').value.trim();
    const areaId = document.getElementById('obAreaSelect').value;
    const address = document.getElementById('obAddressText').value.trim();
    const phone = document.getElementById('obPhone').value.trim();
    const description = document.getElementById('obDescription').value.trim();

    const fieldName = document.getElementById('obFieldName').value.trim();
    const surfaceType = document.getElementById('obSurfaceType').value;
    const capacity = Number(document.getElementById('obCapacity').value) || 12;
    const hourlyPrice = Number(document.getElementById('obHourlyPrice').value) || 7000;
    const confMode = document.getElementById('obConfMode').value;

    if (!venueName || !fieldName) {
      if (errEl) {
        errEl.textContent = 'يرجى تعبئة اسم المنشأة واسم الملعب الأول';
        errEl.style.display = 'block';
      }
      return;
    }

    if (errEl) errEl.style.display = 'none';
    btn.disabled = true;
    btn.textContent = 'جاري حفظ المنشأة والملعب...';

    try {
      await MalaebiOwnerAPI.createVenue({
        name: venueName,
        area_id: areaId,
        address_text: address,
        phone: phone || undefined,
        description: description || undefined,
        field_name: fieldName,
        surface_type: surfaceType,
        capacity: capacity,
        hourly_price: hourlyPrice,
        confirmation_mode: confMode,
        opens_at: '06:00',
        closes_at: '24:00'
      });

      showToast('تهانينا! تم إنشاء منشأتك وملعبك بنجاح 🚀');
      await loadOwnerVenues();
    } catch (err) {
      if (errEl) {
        errEl.textContent = err.message || 'فشل إنشاء المنشأة، تحقق من البيانات';
        errEl.style.display = 'block';
      }
    } finally {
      btn.disabled = false;
      btn.textContent = '🚀 حفظ المنشأة وبدء التشغيل';
    }
  }

  // ==================== ADD FIELD & EDIT VENUE ====================
  async function handleAddFieldSubmit() {
    const name = document.getElementById('afName').value.trim();
    const surface = document.getElementById('afSurface').value;
    const capacity = Number(document.getElementById('afCapacity').value) || 12;
    const price = Number(document.getElementById('afPrice').value) || 7000;
    const confMode = document.getElementById('afConfMode').value;

    if (!name) {
      showToast('يرجى إدخال اسم الملعب', true);
      return;
    }

    try {
      await MalaebiOwnerAPI.addField(state.activeVenue.id, {
        name,
        surface_type: surface,
        capacity,
        hourly_price: price,
        confirmation_mode: confMode,
        opens_at: '06:00',
        closes_at: '24:00'
      });

      closeModal('addFieldModal');
      document.getElementById('afName').value = '';
      showToast('تمت إضافة الملعب بنجاح!');
      await loadOwnerVenues();
    } catch (err) {
      showToast(err.message || 'فشل إضافة الملعب', true);
    }
  }

  function openEditVenueModal() {
    if (!state.activeVenue) return;
    document.getElementById('evName').value = state.activeVenue.name || '';
    document.getElementById('evAreaSelect').value = state.activeVenue.area_id || '';
    document.getElementById('evPhone').value = state.activeVenue.phone || '';
    document.getElementById('evAddress').value = state.activeVenue.address_text || '';
    document.getElementById('evDescription').value = state.activeVenue.description || '';
    openModal('editVenueModal');
  }

  async function handleEditVenueSubmit() {
    const name = document.getElementById('evName').value.trim();
    const area_id = document.getElementById('evAreaSelect').value;
    const phone = document.getElementById('evPhone').value.trim();
    const address_text = document.getElementById('evAddress').value.trim();
    const description = document.getElementById('evDescription').value.trim();

    if (!name) {
      showToast('يرجى إدخال اسم المنشأة', true);
      return;
    }

    try {
      await MalaebiOwnerAPI.updateVenue(state.activeVenue.id, {
        name,
        area_id,
        phone: phone || undefined,
        address_text: address_text || undefined,
        description: description || undefined
      });

      closeModal('editVenueModal');
      showToast('تم تحديث بيانات المنشأة بنجاح!');
      await loadOwnerVenues();
    } catch (err) {
      showToast(err.message || 'فشل تحديث المنشأة', true);
    }
  }

  // ==================== ACTIONS & EVENT HANDLERS ====================
  async function handleApprove(bookingId) {
    const ok = await showConfirmDialog({
      title: 'تأكيد وقبول الحجز',
      message: 'هل ترغب بتأكيد هذا الحجز وإشعار اللاعب بالموافقة فوراً؟',
      confirmText: 'تأكيد الحجز',
      cancelText: 'إلغاء',
      danger: false
    });
    if (!ok) return;
    try {
      await MalaebiOwnerAPI.approveBooking(state.activeVenue.id, bookingId);
      closeModal('bookingDetailModal');
      showToast('تم قبول وتأكيد الحجز بنجاح!');
      await refreshCurrentView();
    } catch (err) {
      showToast(err.message || 'فشل قبول الحجز', true);
    }
  }

  function openRejectModal(bookingId, refCode, custName) {
    closeModal('bookingDetailModal');
    document.getElementById('rejectTargetId').value = bookingId;
    document.getElementById('rejectReasonText').value = '';
    const summary = document.getElementById('rejectModalSummary');
    if (summary) {
      summary.textContent = `طلب الحجز ${refCode} للعميل «${custName}». يرجى توضيح سبب الرفض:`;
    }
    openModal('rejectModal');
  }

  async function handleConfirmReject() {
    const bookingId = document.getElementById('rejectTargetId').value;
    const reason = document.getElementById('rejectReasonText').value.trim();
    if (!bookingId) return;

    try {
      await MalaebiOwnerAPI.rejectBooking(state.activeVenue.id, bookingId, reason);
      closeModal('rejectModal');
      showToast('تم رفض الحجز.');
      await refreshCurrentView();
    } catch (err) {
      showToast(err.message || 'فشل رفض الحجز', true);
    }
  }

  async function handleComplete(bookingId) {
    const ok = await showConfirmDialog({
      title: 'إكمال الحجز وتسجيل الحضور',
      message: 'هل تريد تسجيل حضور الفريق وإكمال حالة الحجز كـ «مكتمل»؟',
      confirmText: 'نعم، إكمال الحجز',
      cancelText: 'تراجع',
      danger: false
    });
    if (!ok) return;
    try {
      await MalaebiOwnerAPI.completeBooking(state.activeVenue.id, bookingId);
      closeModal('bookingDetailModal');
      showToast('تم إكمال الحجز وتسجيل الحضور!');
      await refreshCurrentView();
    } catch (err) {
      showToast(err.message || 'فشل إكمال الحجز', true);
    }
  }

  async function handleRemoveMember(memberId) {
    const ok = await showConfirmDialog({
      title: 'إزالة عضو من المنشأة',
      message: 'هل أنت متأكد من إزالة هذا الموظف؟ سيفقد صلاحيات الدخول إلى البوابة فوراً.',
      confirmText: 'إزالة الموظف',
      cancelText: 'إلغاء',
      danger: true
    });
    if (!ok) return;
    try {
      await MalaebiOwnerAPI.removeMember(state.activeVenue.id, memberId);
      showToast('تم إزالة العضو من المنشأة.');
      await loadStaffData();
    } catch (err) {
      showToast(err.message || 'فشل إزالة العضو', true);
    }
  }

  // Modal Helpers
  function openModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove('hidden');
  }

  function closeModal(id) {
    if (id === 'mandatoryChangePasswordModal' && state.user?.must_change_password) {
      return; // Cannot close mandatory first-login password change modal
    }
    const m = document.getElementById(id);
    if (m) m.classList.add('hidden');
  }

  function showMandatoryPasswordModal() {
    document.getElementById('loginScreen').style.display = 'none';
    openModal('mandatoryChangePasswordModal');
    const errEl = document.getElementById('mandatoryPassError');
    if (errEl) errEl.style.display = 'none';
    const nInput = document.getElementById('mandNewPassword');
    const cInput = document.getElementById('mandConfirmPassword');
    if (nInput) nInput.value = '';
    if (cInput) cInput.value = '';
    setTimeout(() => nInput?.focus(), 150);
  }

  async function handleMandatoryPasswordSubmit() {
    const nInput = document.getElementById('mandNewPassword');
    const cInput = document.getElementById('mandConfirmPassword');
    const errEl = document.getElementById('mandatoryPassError');
    const btn = document.getElementById('btnSubmitMandatoryPass');

    const newPass = nInput?.value || '';
    const confirmPass = cInput?.value || '';

    if (errEl) errEl.style.display = 'none';

    if (!newPass || newPass.length < 6) {
      if (errEl) {
        errEl.textContent = 'كلمة المرور يجب ألا تقل عن 6 خانات.';
        errEl.style.display = 'block';
      }
      return;
    }

    if (newPass !== confirmPass) {
      if (errEl) {
        errEl.textContent = 'كلمتا المرور غير متطابقتين، يرجى التأكد وإعادة المحاولة.';
        errEl.style.display = 'block';
      }
      return;
    }

    btn.disabled = true;
    btn.textContent = 'جاري حفظ كلمة المرور...';

    try {
      await MalaebiOwnerAPI.changePassword(newPass);
      if (state.user) {
        state.user.must_change_password = false;
      }
      closeModal('mandatoryChangePasswordModal');
      showToast('تم تعيين كلمة المرور بنجاح، مرحباً بك!');
      await loadOwnerVenues();
    } catch (err) {
      if (errEl) {
        errEl.textContent = err.message || 'فشل تعيين كلمة المرور، حاول مجدداً.';
        errEl.style.display = 'block';
      }
    } finally {
      btn.disabled = false;
      btn.textContent = 'حفظ كلمة المرور ومتابعة الدخول';
    }
  }

  async function handleChangePasswordSubmit() {
    const nInput = document.getElementById('changeNewPassword');
    const cInput = document.getElementById('changeConfirmPassword');
    const errEl = document.getElementById('changePassError');
    const btn = document.getElementById('btnSubmitChangePass');

    const newPass = nInput?.value || '';
    const confirmPass = cInput?.value || '';

    if (errEl) errEl.style.display = 'none';

    if (!newPass || newPass.length < 6) {
      if (errEl) {
        errEl.textContent = 'كلمة المرور يجب ألا تقل عن 6 خانات.';
        errEl.style.display = 'block';
      }
      return;
    }

    if (newPass !== confirmPass) {
      if (errEl) {
        errEl.textContent = 'كلمتا المرور غير متطابقتين، يرجى التأكد.';
        errEl.style.display = 'block';
      }
      return;
    }

    btn.disabled = true;
    btn.textContent = 'جاري التحديث...';

    try {
      await MalaebiOwnerAPI.changePassword(newPass);
      closeModal('changePasswordModal');
      showToast('تم تحديث كلمة المرور بنجاح!');
      if (nInput) nInput.value = '';
      if (cInput) cInput.value = '';
    } catch (err) {
      if (errEl) {
        errEl.textContent = err.message || 'فشل تحديث كلمة المرور';
        errEl.style.display = 'block';
      }
    } finally {
      btn.disabled = false;
      btn.textContent = 'حفظ كلمة المرور';
    }
  }

  // Event Listeners
  function setupEventListeners() {
    // 1. Navigation items click
    document.querySelectorAll('.nav-item, .drawer-nav-item, .b-nav-item, .m-nav-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        if (view) switchView(view);
      });
    });

    // Drawer Open & Close Controls
    document.getElementById('drawerOpenBtn')?.addEventListener('click', openDrawer);
    document.getElementById('bottomNavMoreBtn')?.addEventListener('click', openDrawer);
    document.getElementById('drawerCloseBtn')?.addEventListener('click', closeDrawer);
    document.getElementById('drawerBackdrop')?.addEventListener('click', closeDrawer);

    // 2. Login submit
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const pass = document.getElementById('loginPassword').value;
        const btn = document.getElementById('loginSubmitBtn');
        const errEl = document.getElementById('loginError');

        if (errEl) errEl.style.display = 'none';
        btn.disabled = true;
        btn.textContent = 'جاري التحقق...';

        try {
          const authData = await MalaebiOwnerAPI.login(email, pass);
          const user = authData?.user || await MalaebiOwnerAPI.me();
          state.user = user;

          if (user?.must_change_password) {
            showMandatoryPasswordModal();
            return;
          }

          await loadOwnerVenues();
        } catch (err) {
          if (errEl) {
            errEl.textContent = err.message || 'فشل تسجيل الدخول، تحقق من البيانات';
            errEl.style.display = 'block';
          }
        } finally {
          btn.disabled = false;
          btn.textContent = 'تسجيل الدخول';
        }
      });
    }

    // 3. Password Forms (Mandatory & Voluntary)
    document.getElementById('mandatoryPasswordForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      handleMandatoryPasswordSubmit();
    });

    document.getElementById('openChangePassBtn')?.addEventListener('click', () => {
      const errEl = document.getElementById('changePassError');
      if (errEl) errEl.style.display = 'none';
      const nInput = document.getElementById('changeNewPassword');
      const cInput = document.getElementById('changeConfirmPassword');
      if (nInput) nInput.value = '';
      if (cInput) cInput.value = '';
      openModal('changePasswordModal');
    });

    document.getElementById('changePasswordForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      handleChangePasswordSubmit();
    });

    // 5. Onboarding Form Submit
    document.getElementById('onboardingForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      handleOnboardingSubmit();
    });

    // 6. Logout
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
      const ok = await showConfirmDialog({
        title: 'تسجيل الخروج من البوابة',
        message: 'هل ترغب بإنهاء جلستك الحالية في بوابة المنشأة؟',
        confirmText: 'تسجيل الخروج',
        cancelText: 'البقاء',
        danger: true
      });
      if (ok) {
        MalaebiOwnerAPI.logout();
        state.user = null;
        state.venues = [];
        state.activeVenue = null;
        showLoginScreen();
      }
    });

    // 7. Venue Switcher
    document.getElementById('venueSelect')?.addEventListener('change', async (e) => {
      const found = state.venues.find((v) => v.id === e.target.value);
      if (found) {
        state.activeVenue = found;
        state.activeField = found.fields?.[0] || null;
        renderFieldSelectors();
        updateTopGreeting();
        await refreshCurrentView();
      }
    });

    // 8. Refresh button
    document.getElementById('refreshBtn')?.addEventListener('click', async () => {
      const btn = document.getElementById('refreshBtn');
      btn.style.transform = 'rotate(180deg)';
      await refreshCurrentView();
      setTimeout(() => { btn.style.transform = 'none'; }, 300);
      showToast('تم تحديث البيانات');
    });

    // 9. Bookings Filters & Search
    document.querySelectorAll('#bookingsFilterTabs .tab-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#bookingsFilterTabs .tab-pill').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        loadBookingsData();
      });
    });
    document.getElementById('bookingsSearchInput')?.addEventListener('input', () => {
      renderAllBookingsTable(state.bookings);
    });

    // 10. Schedule Date Controls
    document.getElementById('prevDayBtn')?.addEventListener('click', () => shiftScheduleDate(-1));
    document.getElementById('nextDayBtn')?.addEventListener('click', () => shiftScheduleDate(1));
    document.getElementById('todayScheduleBtn')?.addEventListener('click', () => {
      state.activeDate = getTodayAdenString();
      loadScheduleData();
    });
    document.getElementById('scheduleDateInput')?.addEventListener('change', (e) => {
      if (e.target.value) {
        state.activeDate = e.target.value;
        loadScheduleData();
      }
    });
    document.getElementById('scheduleFieldSelect')?.addEventListener('change', loadScheduleData);

    function shiftScheduleDate(delta) {
      const d = new Date(state.activeDate + 'T12:00:00');
      d.setDate(d.getDate() + delta);
      state.activeDate = d.toISOString().split('T')[0];
      loadScheduleData();
    }

    // 11. Walkin Form Submit
    document.getElementById('externalBookingForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      handleExternalBookingSubmit();
    });

    // 12. Pricing Tabs
    document.querySelectorAll('#pricingTabs .tab-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#pricingTabs .tab-pill').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const ptab = btn.dataset.ptab;
        document.getElementById('ptabHours').style.display = ptab === 'hours' ? 'block' : 'none';
        document.getElementById('ptabRates').style.display = ptab === 'rates' ? 'block' : 'none';
        document.getElementById('ptabRules').style.display = ptab === 'rules' ? 'block' : 'none';
      });
    });

    document.getElementById('saveBookingSettingsBtn')?.addEventListener('click', handleSaveBookingSettings);

    // 13. Customers Search
    document.getElementById('customerSearchInput')?.addEventListener('input', () => {
      renderCustomersTable(state.customers);
    });

    // 14. Add Staff Modal
    document.getElementById('openAddStaffModalBtn')?.addEventListener('click', () => openModal('addStaffModal'));
    document.getElementById('addStaffForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      handleAddStaffSubmit();
    });

    // 15. Add Field Modal & Edit Venue Modal
    document.getElementById('openAddFieldBtn')?.addEventListener('click', () => openModal('addFieldModal'));
    document.getElementById('addFieldForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      handleAddFieldSubmit();
    });

    document.getElementById('openEditVenueBtn')?.addEventListener('click', openEditVenueModal);
    document.getElementById('editVenueForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      handleEditVenueSubmit();
    });

    // 16. Reject Modal
    document.getElementById('confirmRejectBtn')?.addEventListener('click', handleConfirmReject);

    // 17. Close Modals
    document.querySelectorAll('[data-close-modal]').forEach((btn) => {
      btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
    });

    // 18. Venue Images Upload & Delete
    const btnTriggerUpload = document.getElementById('btnTriggerUploadImage');
    const fileInput = document.getElementById('venueImageFileInput');
    const statusEl = document.getElementById('imageUploadStatus');

    if (btnTriggerUpload && fileInput) {
      btnTriggerUpload.addEventListener('click', () => {
        fileInput.click();
      });

      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file || !state.activeVenue) return;

        fileInput.value = '';

        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
          showToast('يرجى اختيار صورة بصيغة JPEG أو PNG أو WEBP', 'error');
          return;
        }

        if (file.size > 5 * 1024 * 1024) {
          showToast('حجم الصورة كبير جداً، الحد الأقصى 5 ميجابايت', 'error');
          return;
        }

        if (statusEl) {
          statusEl.style.display = 'block';
          statusEl.style.background = 'var(--mint)';
          statusEl.style.color = 'var(--mint-text)';
          statusEl.textContent = 'جاري رفع الصورة إلى التخزين السحابي... ⏳';
        }

        try {
          btnTriggerUpload.disabled = true;
          btnTriggerUpload.textContent = 'جاري الرفع...';

          const res = await MalaebiOwnerAPI.uploadVenueImage(state.activeVenue.id, file);
          showToast('تم رفع الصورة بنجاح! ستظهر فوراً في تطبيق اللاعب 📸', 'success');

          if (statusEl) {
            statusEl.style.display = 'none';
          }

          await loadVenueImages();
          if (res.image_url && !state.activeVenue.cover_image_url) {
            state.activeVenue.cover_image_url = res.image_url;
          }
        } catch (err) {
          console.error('Image upload failed:', err);
          showToast(err.message || 'فشل رفع الصورة، يرجى المحاولة مرة أخرى', 'error');
          if (statusEl) {
            statusEl.style.display = 'block';
            statusEl.style.background = '#fee2e2';
            statusEl.style.color = '#b91c1c';
            statusEl.textContent = `فشل الرفع: ${err.message}`;
          }
        } finally {
          btnTriggerUpload.disabled = false;
          btnTriggerUpload.innerHTML = '<span>+</span> رفع صورة جديدة';
        }
      });
    }

    const imagesGrid = document.getElementById('venueImagesGrid');
    if (imagesGrid) {
      imagesGrid.addEventListener('click', async (e) => {
        const delBtn = e.target.closest('.btn-delete-venue-image');
        if (!delBtn) return;
        const imageId = delBtn.dataset.imageId;
        if (!imageId || !state.activeVenue) return;

        const ok = await showConfirmDialog({
          title: 'حذف صورة المنشأة',
          message: 'هل أنت متأكد من رغبتك في حذف هذه الصورة نهائياً؟',
          confirmText: 'حذف الصورة',
          cancelText: 'إلغاء',
          danger: true
        });
        if (!ok) return;

        try {
          delBtn.disabled = true;
          await MalaebiOwnerAPI.deleteVenueImage(state.activeVenue.id, imageId);
          showToast('تم حذف الصورة بنجاح', 'success');
          await loadVenueImages();
        } catch (err) {
          console.error('Delete image failed:', err);
          showToast(err.message || 'تعذر حذف الصورة', 'error');
          delBtn.disabled = false;
        }
      });
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Admin Contact Information
  const ADMIN_CONTACT = {
    phone: '773461637',
    intlPhone: '967773461637',
    email: 'malaebi12@gmail.com',
    whatsappMessage: 'السلام عليكم إدارة منصة ملاعبي، أرغب في تسجيل منشأتي الرياضية وإضافتها في التطبيق.'
  };

  function contactAdmin(customMessage) {
    const text = encodeURIComponent(customMessage || ADMIN_CONTACT.whatsappMessage);
    const url = 'https://wa.me/' + ADMIN_CONTACT.intlPhone + '?text=' + text;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  // Global API exposure
  window.MalaebiApp = {
    switchView: switchView,
    openBookingDetail: openBookingDetail,
    approveBooking: handleApprove,
    openRejectModal: openRejectModal,
    completeBooking: handleComplete,
    removeMember: handleRemoveMember,
    contactAdmin: contactAdmin,
    ADMIN_CONTACT: ADMIN_CONTACT
  };

  // Run on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
