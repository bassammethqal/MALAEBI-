/* Public client configuration only. Never put Supabase secret/service-role keys here. */
const isLocal = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
);

window.MALAEBI_CONFIG = {
  API_BASE_URL: isLocal ? 'http://localhost:3000/api/v1' : 'https://malaebi-api.onrender.com/api/v1',
  DEMO_MODE: false,
  DEFAULT_CITY: 'مأرب',
  DEFAULT_COUNTRY: 'اليمن',
  CURRENCY: 'ريال'
};
