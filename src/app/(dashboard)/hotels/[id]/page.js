"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Save, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import { fmtDate, fmtDateTime, inDateRange, matchText } from "@/lib/format";
import { useFilters } from "@/hooks/useFilters";
import { useListQuery } from "@/hooks/useListQuery";
import { useConfirm, useToast } from "@/components/Feedback";
import { FilterBar } from "@/components/FilterBar";
import {
  Avatar,
  EmptyRow,
  ErrorBanner,
  PageHeader,
  Pagination,
  SortTh,
  StatusBadge,
  TableSkeleton,
} from "@/components/ui";

const DEFAULTS = { search: "", from: "", to: "" };
const FIELDS = [
  {
    type: "search",
    name: "search",
    label: "Search audit log",
    placeholder: "Actor or action…",
  },
  { type: "dates", label: "Date range" },
];

const clientFilter = (l, f) =>
  matchText(l, ["actor", "action", "reason"], f.search) &&
  inDateRange(l.createdAt, f.from, f.to);

function HotelDetailInner() {
  const { id } = useParams();
  const toast = useToast();
  const confirm = useConfirm();

  const [hotel, setHotel] = useState(null);
  const [commission, setCommission] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const { filters, setField, patch, reset, activeCount } = useFilters(DEFAULTS);

  const logs = useListQuery({
    fetcher: (q) => api.getHotelAuditLogs(id, q),
    listKey: "logs",
    filters,
    defaultSort: { field: "createdAt", dir: "desc" },
    clientFilter,
    pageSize: 8,
  });

  const loadHotel = useCallback(() => {
    api
      .getHotel(id)
      .then((h) => {
        const hh = h.hotel || h;
        setHotel(hh);
        setCommission(
          hh.commissionPercent !== undefined && hh.commissionPercent !== null
            ? String(hh.commissionPercent)
            : "8.0",
        );
      })
      .catch((e) => setError(e.message || "Failed to load property details."));
  }, [id]);

  useEffect(() => {
    loadHotel();
  }, [loadHotel]);

  const commissionNum = Number(commission);
  const commissionInvalid =
    commission === "" ||
    Number.isNaN(commissionNum) ||
    commissionNum < 0 ||
    commissionNum > 100;
  const commissionDirty =
    hotel && String(hotel.commissionPercent ?? "") !== String(commission);

  async function saveCommission() {
    if (commissionInvalid) {
      return toast.error(
        "Enter a valid commission percentage between 0 and 100.",
      );
    }

    setSaving(true);
    try {
      await api.updateCommission(id, commissionNum);
      toast.success("Platform commission updated successfully.");
      loadHotel();
      logs.refresh();
    } catch (e) {
      toast.error(e.message || "Failed to update commission.");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(next) {
    const isSuspension = next === "SUSPENDED";
    const label = isSuspension
      ? "Suspend"
      : hotel.status === "SUSPENDED"
        ? "Reactivate"
        : "Approve";

    const res = await confirm({
      title: `${label} ${hotel.name}?`,
      message: isSuspension
        ? "The hotel will stop accepting new bookings immediately."
        : "The hotel will be activated to accept bookings online.",
      confirmLabel: label,
      tone: isSuspension ? "danger" : "primary",
      reason: isSuspension,
    });

    if (!res) return;

    try {
      await api.updateHotelStatus(id, next, res.reason);
      toast.success(
        `${hotel.name} ${isSuspension ? "suspended" : label === "Approve" ? "approved" : "reactivated"}.`,
      );
      loadHotel();
      logs.refresh();
    } catch (e) {
      toast.error(e.message || "Status update failed.");
    }
  }

  if (error) {
    return (
      <ErrorBanner
        message={error}
        onRetry={() => {
          setError("");
          loadHotel();
        }}
      />
    );
  }

  if (!hotel) {
    return (
      <div className="full-loader">
        <p className="muted">Loading property profile...</p>
      </div>
    );
  }

  const hotelSubtitle =
    hotel.email ||
    hotel.contact?.email ||
    (hotel.slug ? `@${hotel.slug}` : null) ||
    `ID: ${hotel._id || hotel.id}`;

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Hotels", href: "/hotels" },
          { label: hotel.name },
        ]}
        title={hotel.name}
        subtitle={hotelSubtitle}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={hotel.status} />
            {hotel.status === "PENDING_KYC" && (
              <button className="btn sm" onClick={() => changeStatus("ACTIVE")}>
                Approve
              </button>
            )}
            {hotel.status === "ACTIVE" && (
              <button
                className="btn danger sm"
                onClick={() => changeStatus("SUSPENDED")}
              >
                Suspend
              </button>
            )}
            {hotel.status === "SUSPENDED" && (
              <button className="btn sm" onClick={() => changeStatus("ACTIVE")}>
                Reactivate
              </button>
            )}
          </div>
        }
      />

      <div className="kv" style={{ marginBottom: 20 }}>
        <div className="panel panel-pad">
          <span className="muted">Location</span>
          <h2 style={{ margin: "6px 0 0" }}>
            {hotel.city || hotel.address?.city || "—"}
          </h2>
        </div>

        <div className="panel panel-pad">
          <span className="muted">Onboarded</span>
          <h2 style={{ margin: "6px 0 0" }}>
            {hotel.createdAt ? fmtDate(hotel.createdAt) : "—"}
          </h2>
        </div>

        <div className="panel panel-pad">
          <span className="muted">Platform Commission (%)</span>
          <div className="commission">
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              aria-invalid={commissionDirty && commissionInvalid}
            />
            <button
              className="btn sm"
              onClick={saveCommission}
              disabled={saving || !commissionDirty || commissionInvalid}
            >
              <Save size={14} /> {saving ? "Saving…" : "Save"}
            </button>
          </div>
          {commissionDirty && commissionInvalid && (
            <small
              style={{ color: "var(--red)", marginTop: 4, display: "block" }}
            >
              Must be a valid rate between 0 and 100%
            </small>
          )}
        </div>
      </div>

      <div
        className="flex items-center justify-between"
        style={{ marginBottom: 12 }}
      >
        <h2>Activity &amp; Inventory Audit Log</h2>
        <button
          className="btn ghost sm"
          onClick={logs.refresh}
          disabled={logs.loading}
        >
          <RefreshCw size={14} className={logs.loading ? "spin" : ""} /> Refresh
        </button>
      </div>

      <FilterBar
        fields={FIELDS}
        filters={filters}
        onChange={setField}
        onPatch={patch}
        onReset={reset}
        activeCount={activeCount}
      />

      <ErrorBanner message={logs.error} onRetry={logs.refresh} />

      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <SortTh
                  label="Timestamp"
                  field="createdAt"
                  sort={logs.sort}
                  onSort={logs.onSort}
                />
                <SortTh
                  label="Actor"
                  field="actor"
                  sort={logs.sort}
                  onSort={logs.onSort}
                />
                <th>Action Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.loading && !logs.rows.length ? (
                <TableSkeleton cols={3} rows={4} />
              ) : logs.rows.length === 0 ? (
                <EmptyRow
                  cols={3}
                  title="No audit entries found for this property"
                />
              ) : (
                logs.rows.map((l, i) => (
                  <tr key={l._id || i}>
                    <td>{fmtDateTime(l.createdAt)}</td>
                    <td>
                      <span className="cell-main">
                        <Avatar name={l.actor || "System"} size={26} />
                        {l.actor || "System"}
                      </span>
                    </td>
                    <td>{l.action || l.reason || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={logs.page}
          total={logs.total}
          pageSize={logs.pageSize}
          onPage={logs.onPage}
        />
      </section>
    </>
  );
}

export default function HotelDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="full-loader">
          <p className="muted">Loading...</p>
        </div>
      }
    >
      <HotelDetailInner />
    </Suspense>
  );
}
