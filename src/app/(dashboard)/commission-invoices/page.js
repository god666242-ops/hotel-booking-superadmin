'use client';

import { Suspense } from 'react';
import { Download, RefreshCw, CheckCircle2, Clock, XCircle, AlertCircle, Check, Ban } from 'lucide-react';
import api from '@/lib/api';
import { downloadCsv, fmtDate, inDateRange, inNumberRange, inr, matchExact, matchText } from '@/lib/format';
import { useFilters } from '@/hooks/useFilters';
import { useListQuery } from '@/hooks/useListQuery';
import { useConfirm, useToast } from '@/components/Feedback';
import { FilterBar } from '@/components/FilterBar';
import { CopyChip, EmptyRow, ErrorBanner, PageHeader, Pagination, SortTh, StatCard, StatusBadge, StatusTabs, TableSkeleton } from '@/components/ui';

const DEFAULTS = { search: '', status: '', from: '', to: '', minAmount: '', maxAmount: '' };

const TABS = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'PAID', label: 'Paid' },
  { value: 'WAIVED', label: 'Waived' },
];

const FIELDS = [
  { type: 'search', name: 'search', label: 'Search', placeholder: 'Hotel or invoice number…' },
  { type: 'number', name: 'minAmount', label: 'Min amount (₹)', placeholder: '0' },
  { type: 'number', name: 'maxAmount', label: 'Max amount (₹)', placeholder: 'Any' },
  { type: 'dates', label: 'Issued between' },
];

const SORT_FIELD_MAP = {
  createdAt: 'createdAt',
  amount: 'totalDue',
  status: 'status',
};

const clientFilter = (r, f) =>
  matchText(r, ['hotelName', 'invoiceNumber'], f.search) &&
  matchExact(String(r.status || '').toUpperCase(), String(f.status || '').toUpperCase()) &&
  inNumberRange(r.totalDue, f.minAmount, f.maxAmount) &&
  inDateRange(r.createdAt, f.from, f.to);

const sum = (rows, status) =>
  rows
    .filter((r) => String(r.status || '').toUpperCase() === status)
    .reduce((s, r) => s + (Number(r.totalDue) || 0), 0);

const count = (rows, status) =>
  rows.filter((r) => String(r.status || '').toUpperCase() === status).length;

// periodEnd is the following Monday (exclusive), so show the Sunday before it
const fmtWeek = (start, end) =>
  `${fmtDate(start)} – ${fmtDate(new Date(new Date(end).getTime() - 86400000))}`;

function InvoicesInner() {
  const { filters, setField, patch, reset, activeCount } = useFilters(DEFAULTS);

  const list = useListQuery({
    fetcher: (q) => {
      const apiQuery = { ...q };
      if (apiQuery.sortBy && SORT_FIELD_MAP[apiQuery.sortBy]) {
        apiQuery.sortBy = SORT_FIELD_MAP[apiQuery.sortBy];
      }
      return api.listCommissionInvoices(apiQuery);
    },
    listKey: 'invoices',
    filters,
    pageSize: 20,
    defaultSort: { field: 'createdAt', dir: 'desc' },
    clientFilter,
  });

  const confirm = useConfirm();
  const toast = useToast();

  async function markPaid(inv) {
    const res = await confirm({
      title: 'Mark this invoice as paid?',
      message: `${inr(inv.totalDue)} from ${inv.hotelName} (${inv.invoiceNumber}). Use this only if the hotel paid you outside Razorpay, for example by bank transfer.`,
      reason: true,
      reasonPlaceholder: 'Bank reference / UTR / note (recorded on the invoice)',
      confirmLabel: 'Mark paid',
    });
    if (!res) return;
    try {
      await api.markInvoicePaid(inv._id || inv.id, res.reason);
      toast.success('Invoice marked as paid');
      list.refresh();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function waive(inv) {
    const res = await confirm({
      title: 'Waive this invoice?',
      message: `${inv.hotelName} will owe nothing for ${inv.invoiceNumber} (${inr(inv.totalDue)}). This cannot be undone.`,
      tone: 'danger',
      confirmLabel: 'Waive invoice',
    });
    if (!res) return;
    try {
      await api.waiveInvoice(inv._id || inv.id);
      toast.success('Invoice waived');
      list.refresh();
    } catch (e) {
      toast.error(e.message);
    }
  }

  const exportCsv = () =>
    downloadCsv(
      'commission-invoices.csv',
      [
        { label: 'Issued', value: (r) => r.createdAt },
        { label: 'Hotel', value: (r) => r.hotelName },
        { label: 'Invoice', value: (r) => r.invoiceNumber },
        { label: 'Week start', value: (r) => r.periodStart },
        { label: 'Bookings', value: (r) => r.bookingCount },
        { label: 'Commission', value: (r) => r.commissionAmount },
        { label: 'GST', value: (r) => r.gstAmount },
        { label: 'Total due', value: (r) => r.totalDue },
        { label: 'Status', value: (r) => r.status },
        { label: 'Due date', value: (r) => r.dueDate },
        { label: 'Paid at', value: (r) => r.paidAt || '' },
      ],
      list.rows,
    );

  const scope = list.mode === 'server' ? 'on this page' : 'in results';
  const busy = list.loading && !list.rows.length;

  return (
    <>
      <PageHeader
        title="Commission invoices"
        subtitle="Weekly commission billed to hotels that use their own Razorpay account"
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

      <div className="stats">
        <StatCard
          loading={busy}
          icon={CheckCircle2}
          tone="green"
          label={`Paid ${scope}`}
          value={inr(sum(list.rows, 'PAID'))}
          hint={`${count(list.rows, 'PAID')} invoices`}
        />
        <StatCard
          loading={busy}
          icon={Clock}
          tone="amber"
          label={`Pending ${scope}`}
          value={inr(sum(list.rows, 'PENDING'))}
          hint={`${count(list.rows, 'PENDING')} invoices`}
        />
        <StatCard
          loading={busy}
          icon={AlertCircle}
          tone="red"
          label={`Overdue ${scope}`}
          value={inr(sum(list.rows, 'OVERDUE'))}
          hint={`${count(list.rows, 'OVERDUE')} invoices`}
        />
        <StatCard
          loading={busy}
          icon={XCircle}
          tone="blue"
          label={`Waived ${scope}`}
          value={inr(sum(list.rows, 'WAIVED'))}
          hint={`${count(list.rows, 'WAIVED')} invoices`}
        />
      </div>

      <StatusTabs options={TABS} value={filters.status} onChange={(v) => setField('status', v)} />
      <FilterBar fields={FIELDS} filters={filters} onChange={setField} onPatch={patch} onReset={reset} activeCount={activeCount} />
      <ErrorBanner message={list.error} onRetry={list.refresh} />

      <section className="panel">
        {!list.loading && list.total > 0 && (
          <div className="summary">
            <span>
              <b>{list.total.toLocaleString('en-IN')}</b> total invoices
            </span>
          </div>
        )}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <SortTh label="Issued" field="createdAt" sort={list.sort} onSort={list.onSort} />
                <SortTh label="Hotel" field="hotelName" sort={list.sort} onSort={list.onSort} />
                <th>Invoice</th>
                <th>Week</th>
                <th className="right">Bookings</th>
                <th className="right">Commission</th>
                <SortTh label="Total due" field="amount" sort={list.sort} onSort={list.onSort} align="right" />
                <SortTh label="Status" field="status" sort={list.sort} onSort={list.onSort} />
                <th>Payment link</th>
                <th className="right">Action</th>
              </tr>
            </thead>
            <tbody>
              {busy ? (
                <TableSkeleton cols={10} />
              ) : list.rows.length === 0 ? (
                <EmptyRow cols={10} title="No commission invoices found" />
              ) : (
                list.rows.map((inv) => {
                  const status = String(inv.status || '').toUpperCase();
                  const unpaid = status === 'PENDING' || status === 'OVERDUE';
                  return (
                    <tr key={inv._id || inv.id}>
                      <td>{fmtDate(inv.createdAt)}</td>
                      <td><strong>{inv.hotelName}</strong></td>
                      <td><code style={{ fontSize: '12px' }}>{inv.invoiceNumber}</code></td>
                      <td>{fmtWeek(inv.periodStart, inv.periodEnd)}</td>
                      <td className="right">{inv.bookingCount}</td>
                      <td className="right">{inr(inv.commissionAmount)}</td>
                      <td className="right"><strong>{inr(inv.totalDue)}</strong></td>
                      <td>
                        <StatusBadge status={status} />
                        {unpaid && inv.suspendedHotel && (
                          <div>
                            <small className="muted">Hotel suspended</small>
                          </div>
                        )}
                        {status === 'PAID' && inv.paidAt && (
                          <div>
                            <small className="muted">{fmtDate(inv.paidAt)}</small>
                          </div>
                        )}
                      </td>
                      <td>
                        {inv.paymentLinkUrl ? (
                          <CopyChip value={inv.paymentLinkUrl} />
                        ) : (
                          <span style={{ color: '#94a3b8' }}>—</span>
                        )}
                      </td>
                      <td className="right">
                        {unpaid && (
                          <span style={{ display: 'inline-flex', gap: 6 }}>
                            <button className="btn sm" onClick={() => markPaid(inv)}>
                              <Check size={14} /> Mark paid
                            </button>
                            <button className="btn ghost sm" onClick={() => waive(inv)}>
                              <Ban size={14} /> Waive
                            </button>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={list.page} total={list.total} pageSize={list.pageSize} onPage={list.onPage} />
      </section>
    </>
  );
}

export default function CommissionInvoicesPage() {
  return (
    <Suspense fallback={null}>
      <InvoicesInner />
    </Suspense>
  );
}