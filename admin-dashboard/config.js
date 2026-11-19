/* MALAEBI Admin Dashboard Configuration */
window.MALAEBI_ADMIN_CONFIG = {
  API_BASE_URL: (typeof location !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1'))
    ? 'http://localhost:3001/api/v1'
    : 'https://malaebi-api.onrender.com/api/v1',
  APP_NAME: 'ملاعبي — لوحة الإدارة العليا',
  VENUE_PORTAL_URL: 'https://malaebi-venue-dashboard.vercel.app'
};
