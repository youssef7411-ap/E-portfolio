const normalizeBaseUrl = (value) => String(value || '').trim().replace(/\/+$/, '');

const envUrl = normalizeBaseUrl(process.env.REACT_APP_API_URL);
const isLocalhost = typeof window !== 'undefined'
  && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const API_URL = envUrl || (isLocalhost ? 'http://localhost:5002' : '');

