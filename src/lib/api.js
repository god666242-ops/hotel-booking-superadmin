const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1/superadmin';
const TIMEOUT_MS = 20000;

export const TOKEN_KEY = 'purebook_superadmin_token';

export const getToken = () => (typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY));
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

/** Builds a query string, dropping empty values. */
export function buildQuery(query) {
  if (!query) return '';
  const entries = Object.entries(query)
    .filter(([, v]) => v !== '' && v !== null && v !== undefined)
    .map(([k, v]) => [k, String(v)]);
  return entries.length ? '?' + new URLSearchParams(entries).toString() : '';
}

async function request(path, { method = 'GET', body, query } = {}) {
  const token = getToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res;
  try {
    res = await fetch(`${BASE}${path}${buildQuery(query)}`, {
      method,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new Error(
      err.name === 'AbortError' ? 'The request timed out. Please try again.' : 'Cannot reach the server. Check your connection or API URL.'
    );
  } finally {
    clearTimeout(timer);
  }

  // Expired session (but let the login call report its own "invalid credentials" error)
  if (res.status === 401 && !path.startsWith('/auth/login') && typeof window !== 'undefined') {
    clearToken();
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || `Request failed (${res.status})`);
  return data;
}

const api = {
  // auth
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  me: () => request('/auth/me'),

  // metrics
  getOverview: (query) => request('/metrics/overview', { query }),

  // hotels
  listHotels: (query) => request('/hotels', { query }),
  getHotel: (id) => request(`/hotels/${id}`),
  updateHotelStatus: (id, status, reason) =>
    request(`/hotels/${id}/status`, { method: 'PATCH', body: { status, ...(reason ? { reason } : {}) } }),
  updateCommission: (id, commissionPercent) =>
    request(`/hotels/${id}/commission`, { method: 'PATCH', body: { commissionPercent } }),
  getHotelAuditLogs: (id, query) => request(`/hotels/${id}/audit-logs`, { query }),

  // bookings
  searchBookings: (query) => request('/bookings', { query }),

  // commission invoices
  listCommissionInvoices: (query) => request('/commission-invoices', { query }),
  markInvoicePaid: (id, reference) =>
    request(`/commission-invoices/${id}/mark-paid`, { method: 'POST', body: { reference } }),
  waiveInvoice: (id) => request(`/commission-invoices/${id}/waive`, { method: 'POST' }),

  // audit
  listAuditLogs: (query) => request('/audit-logs', { query }),
};

export default api;
