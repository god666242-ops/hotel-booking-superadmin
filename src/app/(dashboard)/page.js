"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CalendarCheck,
  ChevronRight,
  IndianRupee,
  Percent,
  RefreshCw,
} from "lucide-react";
import api from "@/lib/api";
import { inr } from "@/lib/format";
import { ErrorBanner, PageHeader, StatCard, StatusTabs } from "@/components/ui";

const RANGES = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "12m", label: "12 months" },
];

export default function OverviewPage() {
  const [range, setRange] = useState("30d");
  const [m, setM] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    api
      .getOverview({ range })
      .then((data) => setM(data))
      .catch((e) =>
        setError(e.message || "Failed to load platform overview metrics."),
      )
      .finally(() => setLoading(false));
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  const trend = Array.isArray(m?.trend) ? m.trend : [];
  const maxTrend = Math.max(1, ...trend.map((t) => Number(t.value) || 0));
  const pending = Number(m?.pendingKyc ?? m?.pendingHotels ?? 0);
  const overdue = Number(m?.overdueInvoices ?? 0);

  return (
    <>
      <PageHeader
        title="Platform overview"
        subtitle="Marketplace health and performance across all properties"
        actions={
          <button className="btn ghost" onClick={load} disabled={loading}>
            <RefreshCw size={16} className={loading ? "spin" : ""} /> Refresh
          </button>
        }
      />

      <StatusTabs options={RANGES} value={range} onChange={setRange} />
      <ErrorBanner message={error} onRetry={load} />

      {!loading && (pending > 0 || overdue > 0) && (
        <div className="alert warn" role="alert">
          <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <AlertTriangle size={18} className="shrink-0" />
            <span>
              {pending > 0 && (
                <span>
                  <b>{pending}</b> hotel{pending > 1 ? "s" : ""} awaiting
                  approval.{" "}
                </span>
              )}
              {overdue > 0 && (
                <span>
                  <b>{overdue}</b> overdue commission invoice
                  {overdue > 1 ? "s" : ""} need attention.
                </span>
              )}
            </span>
          </span>
          <span style={{ display: "flex", gap: 8 }}>
            {pending > 0 && (
              <Link className="btn ghost sm" href="/hotels?status=PENDING_KYC">
                Review hotels
              </Link>
            )}
            {overdue > 0 && (
              <Link
                className="btn ghost sm"
                href="/commission-invoices?status=OVERDUE"
              >
                View invoices
              </Link>
            )}
          </span>
        </div>
      )}

      <div className="stats">
        <StatCard
          loading={loading}
          icon={IndianRupee}
          tone="indigo"
          label="Total GMV"
          value={inr(m?.gmv || 0)}
          hint="Gross reservation value"
        />
        <StatCard
          loading={loading}
          icon={CalendarCheck}
          tone="blue"
          label="Confirmed Stays"
          value={Number(m?.totalBookings ?? 0).toLocaleString("en-IN")}
          hint="Direct reservations"
        />
        <StatCard
          loading={loading}
          icon={Building2}
          tone="green"
          label="Active Hotels"
          value={Number(m?.activeHotels ?? 0).toLocaleString("en-IN")}
          hint="Onboarded tenants"
        />
        <StatCard
          loading={loading}
          icon={Percent}
          tone="amber"
          label="Platform Revenue"
          value={inr(m?.platformFees || 0)}
          hint={`${inr(m?.outstandingCommission || 0)} commission outstanding`}
        />
        <StatCard
          loading={loading}
          icon={IndianRupee}
          tone="green"
          label="Collected Online"
          value={inr(m?.collectedOnline || 0)}
          hint="Payments received through the platform"
        />
      </div>

      <div className="two-col">
        <section className="panel panel-pad" aria-busy={loading}>
          <h2>Revenue trend</h2>
          {trend.length > 0 ? (
            <>
              <div className="chart">
                {trend.map((t, i) => {
                  const val = Number(t.value) || 0;
                  const heightPercent = Math.max(3, (val / maxTrend) * 100);
                  return (
                    <div
                      key={i}
                      className="bar"
                      style={{ height: `${heightPercent}%` }}
                      data-tip={`${t.label}: ${inr(val)}`}
                    />
                  );
                })}
              </div>
              <div className="chart-labels">
                {trend.map((t, i) => (
                  <span key={i}>{t.label}</span>
                ))}
              </div>
            </>
          ) : (
            <p className="muted">
              {loading
                ? "Loading revenue trend..."
                : "No trend data captured for this time period yet."}
            </p>
          )}
        </section>

        <section className="panel panel-pad">
          <h2>Quick actions</h2>
          <div className="quick">
            <Link href="/hotels?status=PENDING_KYC">
              <span>Approve new hotels</span>
              <ChevronRight size={16} />
            </Link>
            <Link href="/bookings?status=HELD">
              <span>Active booking holds</span>
              <ChevronRight size={16} />
            </Link>
            <Link href="/commission-invoices?status=OVERDUE">
              <span>Overdue commission invoices</span>
              <ChevronRight size={16} />
            </Link>
            <Link href="/audit-logs">
              <span>Security & audit log</span>
              <ChevronRight size={16} />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
