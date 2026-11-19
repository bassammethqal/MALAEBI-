/* MALAEBI Admin Dashboard — API Client */
(function(window) {
  'use strict';

  function getBaseUrl() {
    const cfg = window.MALAEBI_ADMIN_CONFIG;
    if (cfg && cfg.API_BASE_URL) return cfg.API_BASE_URL;
    if (typeof location !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      return 'http://localhost:3001/api/v1';
    }
    return 'https://malaebi-api.onrender.com/api/v1';
  }

  const TOKEN_KEY = 'malaebi_admin_access_token';
  const REFRESH_KEY = 'malaebi_admin_refresh_token';
  const USER_KEY = 'malaebi_admin_user';

  async function request(endpoint, options = {}) {
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}${endpoint}`;
    const token = localStorage.getItem(TOKEN_KEY);

    const headers = { ...options.headers };
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeout || 35000);

    try {
      const res = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (res.status === 401) {
        MalaebiAdminAPI.logout();
        throw new Error('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً');
      }

      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        data = { message: text };
      }

      if (!res.ok) {
        const errorMsg = data?.message || data?.error || `خطأ في الاتصال بالخادم (${res.status})`;
        const err = new Error(Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg);
        err.status = res.status;
        err.response = data;
        throw err;
      }

      return data;
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new Error('استغرقت الاستجابة وقتاً أطول من المتوقع، يرجى إعادة المحاولة');
      }
      throw err;
    }
  }

  const MalaebiAdminAPI = {
    async login(email, password) {
      const res = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase(), password })
      });

      const token = res.access_token || res.session?.access_token;
      const refreshToken = res.refresh_token || res.session?.refresh_token;
      const user = res.user || (res.session && res.session.user) || { email };

      if (!token) throw new Error('فشل تسجيل الدخول، لم يتم استلام رمز التحقق');

      localStorage.setItem(TOKEN_KEY, token);
      if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
      localStorage.setItem(USER_KEY, JSON.stringify(user));

      // Verify admin privileges immediately
      try {
        await this.getOverview();
      } catch (err) {
        this.logout();
        throw new Error('عذراً، هذا الحساب لا يملك صلاحيات الإدارة العليا لمنصة ملاعبي');
      }

      return { user, token };
    },

    logout() {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem(USER_KEY);
    },

    isLoggedIn() {
      return !!localStorage.getItem(TOKEN_KEY);
    },

    getStoredUser() {
      try {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    },

    getStoredToken() {
      return localStorage.getItem(TOKEN_KEY);
    },

    // Overview Stats
    async getOverview() {
      const res = await request('/admin/overview');
      return res.data || res;
    },

    // Venues Listing
    async getVenues() {
      const res = await request('/admin/venues');
      return res.data || [];
    },

    // Create Owner + Venue + Field
    async createVenue(payload) {
      return request('/admin/venues', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },

    // Update Venue Status
    async updateVenueStatus(venueId, status) {
      return request(`/admin/venues/${venueId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
    },

    // Delete Test Venue
    async deleteVenue(venueId) {
      return request(`/admin/venues/${venueId}`, {
        method: 'DELETE'
      });
    },

    // Upload Venue Image
    async uploadVenueImage(venueId, file) {
      const formData = new FormData();
      formData.append('file', file);
      return request(`/admin/venues/${venueId}/images`, {
        method: 'POST',
        body: formData
      });
    },

    // Global Bookings
    async getBookings() {
      const res = await request('/admin/bookings');
      return res.data || [];
    },

    // Areas
    async getAreas() {
      try {
        const res = await request('/areas');
        return res.data || [];
      } catch {
        return [
          { id: '1', name: 'المجمع' },
          { id: '2', name: 'حي الجامعة' },
          { id: '3', name: 'الروضة' },
          { id: '4', name: 'شارع صنعاء' },
          { id: '5', name: 'الشركة' }
        ];
      }
    }
  };

  window.MalaebiAdminAPI = MalaebiAdminAPI;
})(window);
