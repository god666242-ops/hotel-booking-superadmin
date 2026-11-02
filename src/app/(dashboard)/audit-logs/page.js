'use client';

import { Fragment, Suspense, useState } from 'react';
import { ChevronDown, ChevronRight, Download, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { downloadCsv, fmtDateTime, inDateRange, matchText } from '@/lib/format';
import { useFilters } from '@/hooks/useFilters';
import { useListQuery } from '@/hooks/useListQuery';
import { FilterBar } from '@/components/FilterBar';
import { Avatar, EmptyRow, ErrorBanner, PageHeader, Pagination, SortTh, TableSkeleton } from '@/components/ui';

const DEFAULTS = { search: '', actor: '', target: '', from: '', to: '' };
const FIELDS = [
  { type: 'search', name: 'search', label: 'Search action', placeholder: 'e.g. suspended, commission…' },
  { type: 'text', name: 'actor', label: 'Actor', placeholder: 'Admin email or name' },
  { type: 'text', name: 'target', label: 'Entity / target', placeholder: 'Hotel or entity' },
  { type: 'dates', label: 'Date range' },
];

const targetOf = (l) => l.target || l.hotelName || 'Platform';
const actionOf = (l) => l.action || l.reason || '';

const clientFilter = (l, f) =>
  matchText(l, ['action', 'reason'], f.search) &&
  matchText(l, ['actor'], f.actor) &&
  (!f.target || targetOf(l).toLowerCase().includes(f.target.toLowerCase())) &&
  inDateRange(l.createdAt, f.from, f.to);

function AuditInner() {
  const { filters, setField, patch, reset, activeCount } = useFilters(DEFAULTS);
  const list = useListQuery({
    fetcher: (q) => api.listAuditLogs(q),
    listKey: 'logs',
    filters,
    defaultSort: { field: 'createdAt', dir: 'desc' },
    clientFilter,
    pageSize: 15,
  });
  const [open, setOpen] = useState(null);

  const exportCsv = () =>
    downloadCsv('audit-logs.csv', [
      { label: 'Timestamp', value: (l) => l.createdAt },
      { label: 'Actor', value: (l) => l.actor || 'System' },
      { label: 'Target', value: targetOf },
      { label: 'Action', value: actionOf },
    ], list.allRows);

  return (
    <>
      <PageHeader
        title="Audit logs"
        subtitle="Every sensitive action taken on the platform"
        actions={
          <>
            <button className="btn ghost" onClick={list.refresh}><RefreshCw size={16} /> Refresh</button>
            <button className="btn ghost" onClick={exportCsv} disabled={!list.allRows.length}><Download size={16} /> Export CSV</button>
          </>
        }
      />
      <FilterBar fields={FIELDS} filters={filters} onChange={setField} onPatch={patch} onReset={reset} activeCount={activeCount} />
      <ErrorBanner message={list.error} onRetry={list.refresh} />

      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 32 }} />
                <SortTh label="Timestamp" field="createdAt" sort={list.sort} onSort={list.onSort} />
                <SortTh label="Actor" field="actor" sort={list.sort} onSort={list.onSort} />
                <th>Entity / target</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {list.loading && !list.rows.length ? <TableSkeleton cols={5} /> :
                list.rows.length === 0 ? <EmptyRow cols={5} title="No audit records" /> :
                list.rows.map((l, i) => {
                  const key = l._id || `${l.createdAt}-${i}`;
                  const details = l.details || l.changes || l.metadata;
                  const expanded = open === key;
                  return (
                    <Fragment key={key}>
                      <tr onClick={() => details && setOpen(expanded ? null : key)} style={{ cursor: details ? 'pointer' : 'default' }}>
                        <td>{details ? (expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />) : null}</td>
                        <td>{fmtDateTime(l.createdAt)}</td>
                        <td><span className="cell-main"><Avatar name={l.actor || 'System'} size={26} />{l.actor || 'System'}</span></td>
                        <td>{targetOf(l)}</td>
                        <td>{actionOf(l)}</td>
                      </tr>
                      {expanded && (
                        <tr><td colSpan={5} style={{ padding: 0 }}><pre className="json">{JSON.stringify(details, null, 2)}</pre></td></tr>
                      )}
                    </Fragment>
                  );
                })}
            </tbody>
          </table>
        </div>
        <Pagination page={list.page} total={list.total} pageSize={list.pageSize} onPage={list.onPage} />
      </section>
    </>
  );
}

export default function AuditLogsPage() {
  return <Suspense fallback={null}><AuditInner /></Suspense>;
}
