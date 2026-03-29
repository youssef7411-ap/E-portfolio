export const normalizeLinks = (links) => {
  if (!Array.isArray(links)) return [];
  return links
    .map((l) => ({ title: String(l?.title || '').trim(), url: String(l?.url || '').trim() }))
    .filter((l) => /^https?:\/\//i.test(l.url));
};

export const filenameFromUrl = (rawUrl, fallback) => {
  const url = String(rawUrl || '').trim();
  if (!url) return fallback;
  try {
    const u = new URL(url);
    const last = (u.pathname || '').split('/').filter(Boolean).pop() || '';
    return decodeURIComponent(last) || fallback;
  } catch {
    const last = url.split('?')[0].split('#')[0].split('/').pop() || '';
    return last || fallback;
  }
};
