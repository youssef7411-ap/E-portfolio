export const htmlToPlainText = (value) => {
  const html = String(value || '');
  if (!html.trim()) return '';
  const prepared = html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|h[1-6]|li|tr|td)>/gi, '</$1> ');
  try {
    const doc = new DOMParser().parseFromString(prepared, 'text/html');
    return String(doc?.body?.textContent || '')
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  } catch {
    return prepared
      .replace(/\u00a0/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
};

export const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

export const plainTextToQuillHtml = (value) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return `<p>${escapeHtml(text)}</p>`;
};
