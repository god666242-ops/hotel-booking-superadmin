'use client';

import { Suspense, useMemo } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { downloadCsv, fmtDate, fmtDateTime, inDateRange, inNumberRange, inr, matchExact, matchText } from '@/lib/format';
import { useFilters } from '@/hooks/useFilters';
import { useListQuery } from '@/hooks/useListQuery';
import { FilterBar } from '@/components/FilterBar';
import { CopyChip, EmptyRow, ErrorBanner, PageHeader, Pagination, SortTh, StatusBadge, StatusTabs, TableSkeleton } from '@/components/ui';

const DEFAULTS = { search: '', paymentId: '', hotel: '', status: '', from: '', to: '', minAmount: '', maxAmount: '' };
const TABS = [
  { value: '', label: 'All' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'HELD', label: 'Held' },
  { value: 'CHECKED_IN', label: 'Checked in' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];
const FIELDS = [
  { type: 'search', name: 'search', label: 'Search', placeholder: 'Booking ref or guest name…' },
  { type: 'text', name: 'paymentId', label: 'Razorpay payment ID', placeholder: 'pay_…' },
  { type: 'text', name: 'hotel', label: 'Hotel', placeholder: 'Hotel name' },
  { type: 'number', name: 'minAmount', label: 'Min amount (₹)', placeholder: '0' },
  { type: 'number', name: 'maxAmount', label: 'Max amount (₹)', placeholder: 'Any' },
  { type: 'dates', label: 'Booked between' },
];

const SORT_FIELD_MAP = {
  reference: 'bookingCode',
  guestName: 'guest.name',
  amount: 'billing.grandTotal',
  createdAt: 'createdAt',
  status: 'status',
};

const clientFilter = (b, f) =>
  matchText(b, ['reference', 'guestName'], f.search) &&
  matchText(b, ['razorpayPaymentId'], f.paymentId) &&
  matchText(b, ['hotelName'], f.hotel) &&
  matchExact(b.status, f.status) &&
  inNumberRange(b.amount, f.minAmount, f.maxAmount) &&
  inDateRange(b.createdAt, f.from, f.to);

function BookingsInner() {
  const { filters, setField, patch, reset, activeCount } = useFilters(DEFAULTS);

  const list = useListQuery({
    fetcher: (q) => {
      const apiQuery = { ...q };
      if (apiQuery.sortBy && SORT_FIELD_MAP[apiQuery.sortBy]) {
        apiQuery.sortBy = SORT_FIELD_MAP[apiQuery.sortBy];
      }
      return api.searchBookings(apiQuery);
    },
    listKey: 'bookings',
    filters,
    pageSize: 20,
    defaultSort: { field: 'createdAt', dir: 'desc' },
    clientFilter,
  });

  const totalAmount = useMemo(() => {
    return list.rows.reduce((s, b) => s + (Number(b.amount) || 0), 0);
  }, [list.rows]);

  const exportCsv = () =>
    downloadCsv(
      'bookings.csv',
      [
        { label: 'Reference', value: (b) => b.reference },
        { label: 'Hotel', value: (b) => b.hotelName },
        { label: 'Guest', value: (b) => b.guestName },
        { label: 'Amount', value: (b) => b.amount },
        { label: 'Collected online', value: (b) => b.collectedOnline },
        { label: 'Payment ID', value: (b) => b.razorpayPaymentId },
        { label: 'Status', value: (b) => b.status },
        { label: 'Booked at', value: (b) => b.createdAt },
      ],
      list.rows
    );

  return (
    <>
      <PageHeader
        title="Bookings"
        subtitle="Search every booking across all hotels"
        actions={
          <>
            <button className="btn ghost" onClick={list.refresh}>
              <RefreshCw size={16} /> Refresh
            </button>
            <button className="btn ghost" onClick={exportCsv} disabled={!list.rows.length}>
              <Download size={16} /> Export CSV
            </button>
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
              <b>{list.total.toLocaleString('en-IN')}</b> total bookings
            </span>
            <span>
              Value on this page: <b>{inr(totalAmount)}</b>
            </span>
          </div>
        )}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <SortTh label="Booking" field="reference" sort={list.sort} onSort={list.onSort} />
                <SortTh label="Hotel" field="hotelName" sort={list.sort} onSort={list.onSort} />
                <SortTh label="Guest" field="guestName" sort={list.sort} onSort={list.onSort} />
                <SortTh label="Amount" field="amount" sort={list.sort} onSort={list.onSort} align="right" />
                <th className="right">Collected online</th>
                <th>Payment ID</th>
                <SortTh label="Status" field="status" sort={list.sort} onSort={list.onSort} />
                <SortTh label="Booked" field="createdAt" sort={list.sort} onSort={list.onSort} />
              </tr>
            </thead>
            <tbody>
              {list.loading && !list.rows.length ? (
                <TableSkeleton cols={8} />
              ) : list.rows.length === 0 ? (
                <EmptyRow cols={8} title="No bookings found" />
              ) : (
                list.rows.map((b) => (
                  <tr key={b._id || b.id}>
                    <td>
                      <strong>{b.reference}</strong>
                    </td>
                    <td>{b.hotelName}</td>
                    <td>{b.guestName}</td>
                    <td className="right">{inr(b.amount)}</td>
                    <td className="right">{inr(b.collectedOnline)}</td>
                    <td>
                      <CopyChip value={b.razorpayPaymentId} />
                    </td>
                    <td>
                      <StatusBadge status={b.status} />
                    </td>
                    <td title={fmtDateTime(b.createdAt)}>{fmtDate(b.createdAt)}</td>
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

export default function BookingsPage() {
  return (
    <Suspense fallback={null}>
      <BookingsInner />
    </Suspense>
  );
}