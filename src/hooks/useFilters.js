'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * Filter state that starts from the URL query string and keeps it in sync,
 * so filtered views can be bookmarked/shared. Wrap the calling page in <Suspense>.
 */
export function useFilters(defaults) {
  const params = useSearchParams();
  const defaultsRef = useRef(defaults);

  const [filters, setFilters] = useState(() => {
    const init = { ...defaults };
    Object.keys(defaults).forEach((k) => {
      const v = params.get(k);
      if (v !== null) init[k] = v;
    });
    return init;
  });

  useEffect(() => {
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== '' && v !== defaultsRef.current[k]) qs.set(k, v);
    });
    const s = qs.toString();
    window.history.replaceState(null, '', s ? `?${s}` : window.location.pathname);
  }, [filters]);

  const setField = useCallback((name, value) => setFilters((f) => ({ ...f, [name]: value })), []);
  const patch = useCallback((obj) => setFilters((f) => ({ ...f, ...obj })), []);
  const reset = useCallback(() => setFilters(defaultsRef.current), []);

  const activeCount = Object.entries(filters).filter(
    ([k, v]) => v !== '' && v !== defaultsRef.current[k]
  ).length;

  return { filters, setField, patch, reset, activeCount };
}
