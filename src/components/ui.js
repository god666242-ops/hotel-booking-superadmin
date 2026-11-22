'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsUpDown, Copy, Inbox, ChevronRight as Crumb } from 'lucide-react';
import { pretty } from '@/lib/format';

const TONES = {
  ACTIVE: 'green', CONFIRMED: 'green', COMPLETED: 'green', PROCESSED: 'green', SUCCESS: 'green', PAID: 'green', SETTLED: 'green',
  PENDING_KYC: 'amber', HELD: 'amber', PROCESSING: 'amber', PENDING: 'amber', QUEUED: 'amber', ON_HOLD: 'amber', READY_FOR_SETTLEMENT: 'blue',
  EXPIRED: 'gray', EXPIRED_REFUNDED: 'gray',
  CHECKED_IN: 'blue',
  NO_SHOW: 'amber',
  SUSPENDED: 'red', CANCELLED: 'red', FAILED: 'red', REVERSED: 'red', REJECTED: 'red', OVERDUE: 'red',
};

export function StatusBadge({ status }) {
  const tone = TONES[String(status || '').toUpperCase()] || 'gray';
  return (
    <span className={`badge ${tone}`}>
      <i />
      {pretty(status) || '—'}
    </span>
  );
}

export function PageHeader({ title, subtitle, actions, breadcrumbs }) {
  return (
    <div className="page-header">
      <div>
        {breadcrumbs && (
          <nav className="crumbs" aria-label="Breadcrumb">
            {breadcrumbs.map((c, i) => (
              <span key={i} className="crumb">
                {c.href ? <Link href={c.href}>{c.label}</Link> : <span>{c.label}</span>}
                {i < breadcrumbs.length - 1 && <Crumb size={14} />}
              </span>
            ))}
          </nav>
        )}
        <h1>{title}</h1>
        {subtitle && <p className="subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function StatusTabs({ options, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} className={`tab ${value === o.value ? 'active' : ''}`} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SortTh({ label, field, sort, onSort, align }) {
  if (!field) return <th style={{ textAlign: align }}>{label}</th>;
  const active = sort?.field === field;
  const Icon = !active ? ChevronsUpDown : sort.dir === 'asc' ? ChevronUp : ChevronDown;
  return (
    <th style={{ textAlign: align }} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button className={`th-sort ${active ? 'active' : ''}`} onClick={() => onSort(field)}>
        {label} <Icon size={14} />
      </button>
    </th>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }) {
  return Array.from({ length: rows }).map((_, r) => (
    <tr key={r}>
      {Array.from({ length: cols }).map((__, c) => (
        <td key={c}><span className="skeleton" style={{ width: `${50 + ((r * 7 + c * 13) % 40)}%` }} /></td>
      ))}
    </tr>
  ));
}

export function EmptyRow({ cols, title = 'Nothing found', hint = 'Try adjusting or clearing your filters.' }) {
  return (
    <tr>
      <td colSpan={cols}>
        <div className="empty">
          <Inbox size={36} />
          <strong>{title}</strong>
          <span>{hint}</span>
        </div>
      </td>
    </tr>
  );
}

export function ErrorBanner({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="alert error" role="alert">
      <span>{message}</span>
      {onRetry && <button className="btn ghost sm" onClick={onRetry}>Retry</button>}
    </div>
  );
}

export function Pagination({ page, total, pageSize, onPage }) {
  if (!total) return null;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  const first = Math.max(1, Math.min(page - 2, pages - 4));
  const last = Math.min(pages, first + 4);
  const nums = [];
  for (let i = first; i <= last; i++) nums.push(i);

  return (
    <div className="pagination">
      <span className="muted">Showing {start}–{end} of {total.toLocaleString('en-IN')}</span>
      <div className="pager">
        <button className="icon-btn" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft size={16} /></button>
        {nums.map((n) => (
          <button key={n} className={`page-num ${n === page ? 'active' : ''}`} onClick={() => onPage(n)}>{n}</button>
        ))}
        <button className="icon-btn" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight size={16} /></button>
      </div>
    </div>
  );
}

export function CopyChip({ value }) {
  const [done, setDone] = useState(false);
  if (!value) return <span className="muted">—</span>;
  return (
    <button
      className="copy-chip"
      title="Copy"
      onClick={() => {
        navigator.clipboard?.writeText(String(value));
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      <code>{value}</code>
      {done ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

export function Avatar({ name, size = 32 }) {
  const text = String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';
  return <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>{text}</span>;
}

export function StatCard({ icon: Icon, label, value, hint, tone = 'blue', loading }) {
  return (
    <div className="stat">
      <div className={`stat-icon ${tone}`}>{Icon && <Icon size={20} />}</div>
      <div className="stat-body">
        <span className="stat-label">{label}</span>
        {loading ? <span className="skeleton" style={{ width: 90, height: 26 }} /> : <span className="stat-value">{value}</span>}
        {hint && !loading && <span className="stat-hint">{hint}</span>}
      </div>
    </div>
  );
}