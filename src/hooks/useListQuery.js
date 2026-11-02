'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDebounce } from './useDebounce';
import { get } from '@/lib/format';

const cmp = (a, b) => {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
};

/**
 * Loads a list from the API and handles filters, sorting, pagination and refresh.
 *
 * - If the response includes a `total` (or pagination.total / meta.total) the API is treated as
 *   server-paginated: page and sort changes trigger new requests (page, limit, sortBy, sortDir).
 * - Otherwise the full array is paginated/sorted in the browser, and `clientFilter(row, filters)`
 *   (if given) is applied as a safety net in case the API ignores some filters.
 */
export function useListQuery({ fetcher, listKey, filters, pageSize = 10, defaultSort = null, clientFilter }) {
  const debounced = useDebounce(filters, 300);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState(defaultSort);
  const [tick, setTick] = useState(0);
  const [state, setState] = useState({ loading: true, error: '', rows: [], total: 0, mode: 'client' });

  const modeRef = useRef('client');
  const reqId = useRef(0);
  const sortRef = useRef(sort);
  const fetcherRef = useRef(fetcher);
  sortRef.current = sort;
  fetcherRef.current = fetcher;

  const load = useCallback(
    async (p, s, f) => {
      const id = ++reqId.current;
      setState((st) => ({ ...st, loading: true, error: '' }));
      try {
        const query = { ...f, page: p, limit: pageSize, ...(s ? { sortBy: s.field, sortDir: s.dir } : {}) };
        const d = await fetcherRef.current(query);
        if (id !== reqId.current) return; // a newer request superseded this one
        const arr = Array.isArray(d) ? d : d?.[listKey] || d?.data || d?.items || [];
        const total = Array.isArray(d) ? undefined : d?.total ?? d?.pagination?.total ?? d?.meta?.total;
        const mode = total !== undefined ? 'server' : 'client';
        modeRef.current = mode;
        setState({ loading: false, error: '', rows: arr, total: mode === 'server' ? Number(total) : arr.length, mode });
      } catch (e) {
        if (id !== reqId.current) return;
        setState((st) => ({ ...st, loading: false, error: e.message || 'Failed to load data' }));
      }
    },
    [listKey, pageSize]
  );

  // Filters changed (or manual refresh): back to page 1 and refetch
  useEffect(() => {
    setPage(1);
    load(1, sortRef.current, debounced);
  }, [debounced, tick, load]);

  const onPage = useCallback(
    (p) => {
      setPage(p);
      if (modeRef.current === 'server') load(p, sortRef.current, debounced);
    },
    [load, debounced]
  );

  const onSort = useCallback(
    (field) => {
      const cur = sortRef.current;
      const next = { field, dir: cur?.field === field && cur.dir === 'asc' ? 'desc' : 'asc' };
      setSort(next);
      setPage(1);
      if (modeRef.current === 'server') load(1, next, debounced);
    },
    [load, debounced]
  );

  const { filtered, sorted } = useMemo(() => {
    if (state.mode === 'server') return { filtered: state.rows, sorted: state.rows };
    let rows = clientFilter ? state.rows.filter((r) => clientFilter(r, debounced)) : state.rows;
    if (sort) {
      const dir = sort.dir === 'asc' ? 1 : -1;
      rows = [...rows].sort((a, b) => cmp(get(a, sort.field), get(b, sort.field)) * dir);
    }
    return { filtered: rows, sorted: rows };
  }, [state.rows, state.mode, sort, debounced, clientFilter]);

  const total = state.mode === 'server' ? state.total : filtered.length;
  const rows = state.mode === 'server' ? sorted : sorted.slice((page - 1) * pageSize, page * pageSize);

  return {
    rows,
    allRows: sorted, // everything currently loaded (client mode: all filtered rows; server mode: current page)
    total,
    page,
    pageSize,
    sort,
    loading: state.loading,
    error: state.error,
    mode: state.mode,
    onPage,
    onSort,
    refresh: () => setTick((t) => t + 1),
  };
}
