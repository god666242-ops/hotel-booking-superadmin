'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { downloadCsv, fmtDate, inDateRange, matchExact, matchText } from '@/lib/format';
import { useFilters } from '@/hooks/useFilters';
import { useListQuery } from '@/hooks/useListQuery';
import { useConfirm, useToast } from '@/components/Feedback';
import { FilterBar } from '@/components/FilterBar';
import { Avatar, EmptyRow, ErrorBanner, PageHeader, Pagination, SortTh, StatusBadge, StatusTabs, TableSkeleton } from '@/components/ui';

const DEFAULTS = { search: '', status: '', city: '', from: '', to: '' };
const TABS = [
  { value: '', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PENDING_KYC', label: 'Pending KYC' },
  { value: 'SUSPENDED', label: 'Suspended' },
];
const FIELDS = [
  { type: 'search', name: 'search', label: 'Search', placeholder: 'Hotel name, email or slug…' },
  { type: 'text', name: 'city', label: 'City', placeholder: 'e.g. Goa' },
  { type: 'dates', label: 'Onboarded between' },
];

const SORT_FIELD_MAP = {
  name: 'name',
  city: 'address.city',
  status: 'isActive',
  commissionPercent: 'paymentConfig.payAtHotelCommissionPercent',
  createdAt: 'createdAt',
};

const clientFilter = (h, f) =>
  matchText(h, ['name', 'email', 'slug'], f.search) &&
  matchExact(h.status, f.status) &&
  matchText(h, ['city'], f.city) &&
  inDateRange(h.createdAt, f.from, f.to);

const id = (h) => h._id || h.id;

function HotelsInner() {
  const { filters, setField, patch, reset, activeCount } = useFilters(DEFAULTS);

  const list = useListQuery({
    fetcher: (q) => {
      const apiQuery = { ...q };
      if (apiQuery.sortBy && SORT_FIELD_MAP[apiQuery.sortBy]) {
        apiQuery.sortBy = SORT_FIELD_MAP[apiQuery.sortBy];
      }
      return api.listHotels(apiQuery);
    },
    listKey: 'hotels',
    filters,
    pageSize: 20,
    defaultSort: { field: 'createdAt', dir: 'desc' },
    clientFilter,
  });

  const confirm = useConfirm();
  const toast = useToast();

  async function changeStatus(h, next) {
    const label = next === 'SUSPENDED' ? 'Suspend' : h.status === 'SUSPENDED' ? 'Reactivate' : 'Approve';
    const res = await confirm({
      title: `${label} ${h.name}?`,
      message: next === 'SUSPENDED' ? 'The hotel will stop accepting new bookings immediately.' : 'The hotel will be able to accept bookings.',
      confirmLabel: label,
      tone: next === 'SUSPENDED' ? 'danger' : 'primary',
      reason: next === 'SUSPENDED',
    });
    if (!res) return;
    try {
      await api.updateHotelStatus(id(h), next, res.reason);
      toast.success(`${h.name} ${next === 'SUSPENDED' ? 'suspended' : label === 'Approve' ? 'approved' : 'reactivated'}`);
      list.refresh();
    } catch (e) {
      toast.error(e.message);
    }
  }

  const exportCsv = () =>
    downloadCsv('hotels.csv', [
      { label: 'Name', value: (h) => h.name },
      { label: 'City', value: (h) => h.city },
      { label: 'Email', value: (h) => h.email },
      { label: 'Status', value: (h) => h.status },
      { label: 'Commission %', value: (h) => h.commissionPercent },
      { label: 'Hotel-fault cancellations (30d)', value: (h) => h.hotelFaultCancels30d ?? 0 },
      { label: 'Onboarded', value: (h) => h.createdAt },
    ], list.rows);

  return (
    <>
      <PageHeader
        title="Hotels"
        subtitle="Approve, suspend and manage tenant properties"
        actions={
          <>
            <button className="btn ghost" onClick={list.refresh}><RefreshCw size={16} /> Refresh</button>
            <button className="btn ghost" onClick={exportCsv} disabled={!list.rows.length}><Download size={16} /> Export CSV</button>
          </>
        }
      />
      <StatusTabs options={TABS} value={filters.status} onChange={(v) => setField('status', v)} />
      <FilterBar fields={FIELDS} filters={filters} onChange={setField} onPatch={patch} onReset={reset} activeCount={activeCount} />
      <ErrorBanner message={list.error} onRetry={list.refresh} />

      <section className="panel">
        {!list.loading && list.total > 0 && (
          <div className="summary">
            <span>
              <b>{list.total.toLocaleString('en-IN')}</b> total hotels
            </span>
          </div>
        )}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <SortTh label="Hotel" field="name" sort={list.sort} onSort={list.onSort} />
                <SortTh label="City" field="city" sort={list.sort} onSort={list.onSort} />
                <SortTh label="Status" field="status" sort={list.sort} onSort={list.onSort} />
                <SortTh label="Commission" field="commissionPercent" sort={list.sort} onSort={list.onSort} />
                <th title="Cancellations where the hotel said it could not host the guest (last 30 days)">Hotel-fault cancels (30d)</th>
                <SortTh label="Onboarded" field="createdAt" sort={list.sort} onSort={list.onSort} />
                <th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.loading && !list.rows.length ? (
                <TableSkeleton cols={7} />
              ) : list.rows.length === 0 ? (
                <EmptyRow cols={7} title="No hotels found" />
              ) : (
                list.rows.map((h) => (
                  <tr key={id(h)}>
                    <td>
                      <Link href={`/hotels/${id(h)}`} className="cell-main">
                        <Avatar name={h.name} />
                        <span><strong>{h.name}</strong><small>{h.email || h.slug || ''}</small></span>
                      </Link>
                    </td>
                    <td>{h.city || '—'}</td>
                    <td><StatusBadge status={h.status} /></td>
                    <td>
                      {h.commissionPercent != null ? `${h.commissionPercent}%` : '—'}
                      {h.paymentMode && (
                        <small className="muted"> · {h.paymentMode === 'HOTEL_GATEWAY' ? 'Own gateway' : 'Pay at hotel'}</small>
                      )}
                    </td>
                    <td
                      title="Cancellations where the hotel said it could not host the guest (last 30 days)"
                      style={h.hotelFaultCancels30d >= 3 ? { fontWeight: 700, color: '#b45309' } : undefined}
                    >
                      {h.hotelFaultCancels30d ?? 0}
                    </td>
                    <td title={h.createdAt}>{fmtDate(h.createdAt)}</td>
                    <td>
                      <div className="row-actions">
                        {h.status === 'PENDING_KYC' && <button className="btn sm" onClick={() => changeStatus(h, 'ACTIVE')}>Approve</button>}
                        {h.status === 'ACTIVE' && <button className="btn danger sm" onClick={() => changeStatus(h, 'SUSPENDED')}>Suspend</button>}
                        {h.status === 'SUSPENDED' && <button className="btn sm" onClick={() => changeStatus(h, 'ACTIVE')}>Reactivate</button>}
                        <Link className="btn ghost sm" href={`/hotels/${id(h)}`}>View</Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={list.page} total={list.total} pageSize={list.pageSize} onPage={list.onPage} />
      </section>
    </>
  );
}

export default function HotelsPage() {
  return <Suspense fallback={null}><HotelsInner /></Suspense>;
}