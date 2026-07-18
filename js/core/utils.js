export function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function normalizeText(value = '') {
  return String(value).trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}

export function normalizeId(value = '') {
  return normalizeText(value).replace(/[^A-Z0-9]/g, '');
}

export function slugify(value = '') {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function calculateAge(birthDate, referenceDate = new Date()) {
  const birth = new Date(`${birthDate}T00:00:00`);
  const ref = referenceDate instanceof Date ? referenceDate : new Date(`${referenceDate}T00:00:00`);
  if (Number.isNaN(birth.getTime()) || Number.isNaN(ref.getTime())) return null;
  let age = ref.getFullYear() - birth.getFullYear();
  const monthDiff = ref.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < birth.getDate())) age -= 1;
  return age;
}

export function categoryByAgeAndSex(age, sex = 'M') {
  if (!Number.isInteger(age) || age < 8) return '';
  const female = sex === 'F';
  if (age <= 11) return 'Destete (Mixto)';
  if (age <= 14) return female ? 'Preinfantil Femenino' : 'Preinfantil';
  if (age <= 17) return female ? 'Infantil Femenino' : 'Infantil';
  if (female) return 'Femenino (Mayores)';
  if (age <= 23) return 'C';
  if (age <= 31) return 'B';
  if (age <= 39) return 'A';
  if (age <= 49) return 'AA';
  if (age <= 59) return 'Máster';
  return 'Supermaster';
}

export function categoryClass(category = '') {
  const value = normalizeText(category);
  if (value.includes('DESTETE')) return 'cat-destete';
  if (value.includes('PREINFANTIL')) return 'cat-preinfantil';
  if (value.includes('INFANTIL')) return 'cat-infantil';
  if (value.includes('FEMENINO')) return 'cat-femenino';
  if (value === 'AA') return 'cat-aa';
  if (value === 'A') return 'cat-a';
  if (value === 'B') return 'cat-b';
  if (value === 'C') return 'cat-c';
  if (value.includes('SUPERMASTER')) return 'cat-supermaster';
  if (value.includes('MASTER') || value.includes('MÁSTER')) return 'cat-master';
  return 'cat-c';
}

export function formatDate(value) {
  if (!value) return '—';
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium' }).format(date);
}

export function formatDateTime(value) {
  if (!value) return 'Pendiente';
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('es-VE', { dateStyle: 'short', timeStyle: 'medium' }).format(date);
}

export function toIso(value) {
  if (!value) return null;
  const date = value?.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

export function downloadBlob(filename, content, mimeType = 'application/octet-stream') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function rowsToCsv(headers, rows) {
  const quote = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
  return '\uFEFF' + [headers, ...rows].map(row => row.map(quote).join(';')).join('\r\n');
}

export function safeNumber(value, min = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.max(min, parsed) : min;
}

export function shortHash(value = '', length = 16) {
  if (!value) return '—';
  return `${value.slice(0, length)}…${value.slice(-8)}`;
}

export function getEventReferenceDate(event) {
  return event?.fecha ? new Date(`${event.fecha}T00:00:00`) : new Date();
}

export function assert(condition, message) {
  if (!condition) throw new Error(message);
}
