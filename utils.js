/**
 * UTILS.JS
 * Utility functions for formatting, escaping, and general helpers.
 */

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function escAttr(s) {
  return String(s || '').replace(/[^a-zA-Z0-9_-]/g, c => '_' + c.charCodeAt(0) + '_');
}

function parseDateStr(str) {
  if (!str) return '';
  str = String(str).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  let datePart = str.split(',')[0].trim();
  let parts = datePart.split('/');
  if (parts.length === 3) {
    let day = parts[0].padStart(2, '0');
    let month = parts[1].padStart(2, '0');
    let year = parts[2];
    return `${year}-${month}-${day}`;
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  return str;
}

function formatDisplayDate(str) {
  if (!str) return '—';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return str;
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  return str;
}

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function labelToKey(label) {
  for (const [k, v] of Object.entries(PRODUCT_LABEL_MAP)) {
    if (v === label) return k;
  }
  return null;
}

function badgeClass(p) {
  if (!p) return '';
  if (p.includes('ไนโตรเจน')) return 'badge-n2';
  if (p.includes('0.5'))       return 'badge-o2s';
  if (p.includes('ออกซิเจน')) return 'badge-o2';
  return '';
}

function fixGDriveUrl(url) {
  if (!url || typeof url !== 'string') return '';
  url = url.trim();
  const match = url.match(/id=([a-zA-Z0-9_-]+)/) || url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
  }
  return url;
}
