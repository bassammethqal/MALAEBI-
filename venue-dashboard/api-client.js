/* MALAEBI Venue Ops Dashboard — API Client */
(function(window){
  const CONFIG = window.MALAEBI_OWNER_CONFIG || { API_BASE_URL: 'http://localhost:3000/api/v1' };
  const BASE_URL = CONFIG.API_BASE_URL.replace(/\/+$/, '');

  const TOKEN_KEY = 'malaebi_owner_access_token';
  const REFRESH_KEY = 'malaebi_owner_refresh_token';
  const USER_KEY = 'malaebi_owner_user';

  async function request(endpoint, options = {}){
    const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    const token = localStorage.getItem(TOKEN_KEY);
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    let res;
    try {
      res = await fetch(url, { ...options, headers });
    } catch (netErr) {
      throw new Error('تعذر الاتصال بالخادم، تحقق من اتصال الإنترنت أو حالة الخدمة');
    }

    let data;
    const isJson = (res.headers.get('content-type') || '').includes('application/json');
    if (isJson) {
      try {
        data = await res.json();
      } catch {
        data = null;
      }
    } else {
      data = await res.text();
    }

    if (!res.ok) {
      if (res.status === 401 && !endpoint.includes('/auth/login')) {
        MalaebiOwnerAPI.logout();
        throw new Error('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً');
      }
      const msg = (data && typeof data === 'object' && (data.message || data.error))
        ? (Array.isArray(data.message) ? data.message.join(' · ') : data.message || data.error)
        : (typeof data === 'string' && data ? data : `خطأ في الخادم (${res.status})`);
      throw new Error(msg);
    }

    return data;
  }

  const MalaebiOwnerAPI = {
    getToken(){
      return localStorage.getItem(TOKEN_KEY);
    },
    setTokens(access, refresh){
      if (access) localStorage.setItem(TOKEN_KEY, access);
      if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
    },
    clearTokens(){
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem(USER_KEY);
    },
    getUser(){
      try {
        return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
      } catch {
        return null;
      }
    },
    setUser(u){
      localStorage.setItem(USER_KEY, JSON.stringify(u));
    },

    async login(email, password){
      const data = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      if (data?.access_token) {
        this.setTokens(data.access_token, data.refresh_token);
      }
      if (data?.user) {
        this.setUser(data.user);
      }
      return data;
    },

    async me(){
      const data = await request('/me');
      if (data) this.setUser(data);
      return data;
    },

    async myVenues(){
      return request('/owner/venues');
    },

    async venueSummary(venueId){
      return request(`/venues/${venueId}/summary`);
    },

    async venueBookings(venueId, params = {}){
      const q = new URLSearchParams();
      if (params.status) q.set('status', params.status);
      if (params.field_id) q.set('field_id', params.field_id);
      if (params.from) q.set('from', params.from);
      if (params.to) q.set('to', params.to);
      const qs = q.toString();
      return request(`/venues/${venueId}/bookings${qs ? '?' + qs : ''}`);
    },

    async approveBooking(venueId, bookingId){
      return request(`/venues/${venueId}/bookings/${bookingId}/approve`, {
        method: 'POST'
      });
    },

    async rejectBooking(venueId, bookingId, reason = ''){
      return request(`/venues/${venueId}/bookings/${bookingId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });
    },

    async completeBooking(venueId, bookingId){
      return request(`/venues/${venueId}/bookings/${bookingId}/complete`, {
        method: 'POST'
      });
    },

    async createExternalBooking(venueId, dto){
      return request(`/venues/${venueId}/bookings/external`, {
        method: 'POST',
        body: JSON.stringify(dto)
      });
    },

    async blockSlot(venueId, fieldId, dto){
      return request(`/venues/${venueId}/fields/${fieldId}/blocked-slots`, {
        method: 'POST',
        body: JSON.stringify(dto)
      });
    },

    async fieldAvailability(fieldId, date){
      return request(`/fields/${fieldId}/availability?date=${date}`);
    },

    async getFieldSettings(venueId, fieldId){
      return request(`/venues/${venueId}/fields/${fieldId}/settings`);
    },

    async updateFieldSettings(venueId, fieldId, dto){
      return request(`/venues/${venueId}/fields/${fieldId}/settings`, {
        method: 'PUT',
        body: JSON.stringify(dto)
      });
    },

    async venueMembers(venueId){
      return request(`/venues/${venueId}/members`);
    },

    async addMember(venueId, dto){
      return request(`/venues/${venueId}/members`, {
        method: 'POST',
        body: JSON.stringify(dto)
      });
    },

    async removeMember(venueId, memberId){
      return request(`/venues/${venueId}/members/${memberId}`, {
        method: 'DELETE'
      });
    },

    async venueCustomers(venueId){
      return request(`/venues/${venueId}/customers`);
    },

    async venueReviews(venueId){
      return request(`/venues/${venueId}/reviews`);
    },

    async venueReports(venueId, range = '30d'){
      return request(`/venues/${venueId}/reports?range=${range}`);
    },

    async register(full_name, email, password){
      const res = await request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ full_name, email, password })
      });
      if (res?.access_token) {
        this.setTokens(res.access_token, res.refresh_token);
        if (res.user) this.setUser(res.user);
        return res;
      }
      // If no session returned directly, try login
      return this.login(email, password);
    },

    async listAreas(){
      return request('/areas');
    },

    async createVenue(dto){
      return request('/owner/venues', {
        method: 'POST',
        body: JSON.stringify(dto)
      });
    },

    async updateVenue(venueId, dto){
      return request(`/venues/${venueId}`, {
        method: 'PATCH',
        body: JSON.stringify(dto)
      });
    },

    async addField(venueId, dto){
      return request(`/venues/${venueId}/fields`, {
        method: 'POST',
        body: JSON.stringify(dto)
      });
    },

    logout(){
      this.clearTokens();
    }
  };

  window.MalaebiOwnerAPI = MalaebiOwnerAPI;
})(window);
