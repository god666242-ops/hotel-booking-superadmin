export const inr = (n = 0) => '₹' + Number(n || 0).toLocaleString('en-IN');

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

export const pretty = (s = '') =>
  String(s).replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export const initials = (s = '') =>
  String(s).trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || '?';

/* ---------- dates ---------- */
const toISO = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export const DATE_PRESETS = [
  { label: 'Today', range: () => ({ from: toISO(new Date()), to: toISO(new Date()) }) },
  { label: '7 days', range: () => ({ from: toISO(new Date(Date.now() - 6 * 864e5)), to: toISO(new Date()) }) },
  { label: '30 days', range: () => ({ from: toISO(new Date(Date.now() - 29 * 864e5)), to: toISO(new Date()) }) },
  {
    label: 'This month',
    range: () => {
      const n = new Date();
      return { from: toISO(new Date(n.getFullYear(), n.getMonth(), 1)), to: toISO(n) };
    },
  },
];

/* ---------- client-side filter helpers (used only when the API does not paginate/filter) ---------- */
export const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);

export const matchText = (row, fields, q) => {
  if (!q) return true;
  const needle = String(q).toLowerCase();
  return fields.some((f) => String(get(row, f) ?? '').toLowerCase().includes(needle));
};

export const matchExact = (value, wanted) => !wanted || String(value ?? '').toUpperCase() === String(wanted).toUpperCase();

export const inDateRange = (value, from, to) => {
  if (!from && !to) return true;
  if (!value) return false;
  const t = new Date(value).getTime();
  if (from && t < new Date(from + 'T00:00:00').getTime()) return false;
  if (to && t > new Date(to + 'T23:59:59.999').getTime()) return false;
  return true;
};

export const inNumberRange = (value, min, max) => {
  if (min === '' && max === '') return true;
  const n = Number(value ?? 0);
  if (min !== '' && n < Number(min)) return false;
  if (max !== '' && n > Number(max)) return false;
  return true;
};

/* ---------- CSV export ---------- */
export function downloadCsv(filename, columns, rows) {
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.map((c) => esc(c.label)).join(',');
  const body = rows.map((r) => columns.map((c) => esc(c.value(r))).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + header + '\n' + body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
