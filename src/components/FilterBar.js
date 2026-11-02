'use client';

import { Search, X } from 'lucide-react';
import { DATE_PRESETS } from '@/lib/format';

/**
 * fields: [{ type: 'search'|'select'|'text'|'number'|'dates', name, label, placeholder, options, fromName, toName }]
 */
export function FilterBar({ fields, filters, onChange, onPatch, onReset, activeCount, children }) {
  return (
    <section className="panel filters" aria-label="Filters">
      <div className="filters-grid">
        {fields.map((f) => {
          if (f.type === 'search') {
            return (
              <label key={f.name} className="field field-search">
                <span>{f.label || 'Search'}</span>
                <div className="input-icon">
                  <Search size={16} />
                  <input
                    type="search"
                    placeholder={f.placeholder}
                    value={filters[f.name]}
                    onChange={(e) => onChange(f.name, e.target.value)}
                  />
                </div>
              </label>
            );
          }
          if (f.type === 'select') {
            return (
              <label key={f.name} className="field">
                <span>{f.label}</span>
                <select value={filters[f.name]} onChange={(e) => onChange(f.name, e.target.value)}>
                  {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
            );
          }
          if (f.type === 'dates') {
            const from = f.fromName || 'from';
            const to = f.toName || 'to';
            return (
              <div key={f.label} className="field field-dates">
                <span>{f.label || 'Date range'}</span>
                <div className="date-row">
                  <input type="date" aria-label="From date" value={filters[from]} max={filters[to] || undefined} onChange={(e) => onChange(from, e.target.value)} />
                  <em>to</em>
                  <input type="date" aria-label="To date" value={filters[to]} min={filters[from] || undefined} onChange={(e) => onChange(to, e.target.value)} />
                </div>
                <div className="presets">
                  {DATE_PRESETS.map((p) => (
                    <button key={p.label} type="button" onClick={() => onPatch({ [from]: p.range().from, [to]: p.range().to })}>{p.label}</button>
                  ))}
                </div>
              </div>
            );
          }
          return (
            <label key={f.name} className="field">
              <span>{f.label}</span>
              <input
                type={f.type === 'number' ? 'number' : 'text'}
                min={f.type === 'number' ? 0 : undefined}
                placeholder={f.placeholder}
                value={filters[f.name]}
                onChange={(e) => onChange(f.name, e.target.value)}
              />
            </label>
          );
        })}
      </div>
      <div className="filters-foot">
        <div className="filters-extra">{children}</div>
        {activeCount > 0 && (
          <button className="btn ghost sm" onClick={onReset}>
            <X size={14} /> Clear {activeCount} filter{activeCount > 1 ? 's' : ''}
          </button>
        )}
      </div>
    </section>
  );
}
