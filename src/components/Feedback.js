'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

const FeedbackContext = createContext(null);

function ConfirmModal({ dialog, onClose }) {
  const [reason, setReason] = useState('');
  const danger = dialog.tone === 'danger';
  return (
    <div className="modal-backdrop" onMouseDown={() => onClose(null)}>
      <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" onMouseDown={(e) => e.stopPropagation()}>
        <div className={`modal-icon ${danger ? 'red' : 'blue'}`}>
          {danger ? <AlertTriangle size={22} /> : <Info size={22} />}
        </div>
        <h3 id="confirm-title">{dialog.title}</h3>
        {dialog.message && <p>{dialog.message}</p>}
        {dialog.reason && (
          <textarea
            rows={3}
            autoFocus
            placeholder={dialog.reasonPlaceholder || 'Reason (optional, recorded in the audit log)'}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        )}
        <div className="modal-actions">
          <button className="btn ghost" onClick={() => onClose(null)}>Cancel</button>
          <button className={`btn ${danger ? 'danger' : ''}`} onClick={() => onClose({ reason: reason.trim() })}>
            {dialog.confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);

  const push = useCallback((type, message) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  const toast = useMemo(
    () => ({ success: (m) => push('success', m), error: (m) => push('error', m), info: (m) => push('info', m) }),
    [push]
  );

  /** Resolves to null when cancelled, or { reason } when confirmed. */
  const confirm = useCallback((opts) => new Promise((resolve) => setDialog({ ...opts, resolve })), []);

  const closeDialog = (result) => {
    dialog.resolve(result);
    setDialog(null);
  };

  const icons = { success: CheckCircle2, error: XCircle, info: Info };

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => {
          const Icon = icons[t.type];
          return (
            <div key={t.id} className={`toast ${t.type}`}>
              <Icon size={18} />
              <span>{t.message}</span>
              <button aria-label="Dismiss" onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))}><X size={14} /></button>
            </div>
          );
        })}
      </div>
      {dialog && <ConfirmModal dialog={dialog} onClose={closeDialog} />}
    </FeedbackContext.Provider>
  );
}

export const useToast = () => useContext(FeedbackContext).toast;
export const useConfirm = () => useContext(FeedbackContext).confirm;
