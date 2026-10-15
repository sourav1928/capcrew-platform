import React, { useEffect, useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';

// ─── tiny shared UI kit for the admin pages ───────────────────────────────────

export const useDebounced = <T,>(value: T, delay = 350): T => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
};

type Tone = 'gray' | 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'indigo';
const tones: Record<Tone, string> = {
  gray: 'bg-gray-100 text-gray-600 border-gray-200',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

export const Pill: React.FC<{ tone?: Tone; children: React.ReactNode }> = ({ tone = 'gray', children }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${tones[tone]}`}>
    {children}
  </span>
);

export const orderTone = (s: string): Tone =>
  ({ pending: 'amber', confirmed: 'blue', processing: 'indigo', shipped: 'purple', delivered: 'green',
     cancelled: 'red', return_requested: 'amber', returned: 'gray' } as Record<string, Tone>)[s] || 'gray';
export const paymentTone = (s: string): Tone =>
  ({ paid: 'green', pending: 'amber', failed: 'red', refunded: 'gray', partially_refunded: 'gray', authorized: 'blue' } as Record<string, Tone>)[s] || 'gray';
export const stockTone = (s: string): Tone => (s === 'out' ? 'red' : s === 'low' ? 'amber' : 'green');
export const stockLabel = (s: string) => (s === 'out' ? 'Out of stock' : s === 'low' ? 'Low stock' : 'In stock');

// ─── Buttons ──────────────────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
const btn: Record<BtnVariant, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300',
  secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-50',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300',
  ghost: 'text-gray-600 hover:bg-gray-100 disabled:opacity-50',
};
export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; loading?: boolean; size?: 'sm' | 'md' }
> = ({ variant = 'primary', loading, size = 'md', className = '', children, disabled, ...rest }) => (
  <button
    {...rest}
    disabled={disabled || loading}
    className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed ${
      size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
    } ${btn[variant]} ${className}`}
  >
    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
    {children}
  </button>
);

// ─── Form bits ────────────────────────────────────────────────────────────────
export const inputCls = (error?: string) =>
  `w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 ${
    error ? 'border-red-400 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-200 focus:border-blue-400'
  }`;

export const Field: React.FC<{ label: string; error?: string; hint?: string; children: React.ReactNode; className?: string }> = ({
  label, error, hint, children, className = '',
}) => (
  <label className={`block ${className}`}>
    <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
    {children}
    {error ? <span className="block text-xs text-red-600 mt-1">{error}</span> : hint ? <span className="block text-xs text-gray-400 mt-1">{hint}</span> : null}
  </label>
);

export const SearchBox: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string }> = ({ value, onChange, placeholder }) => (
  <input
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder || 'Search…'}
    className="w-full sm:w-72 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
  />
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ className = '', children, ...rest }) => (
  <select {...rest} className={`px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 ${className}`}>
    {children}
  </select>
);

// ─── Layout bits ──────────────────────────────────────────────────────────────
export const Card: React.FC<{ title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string; pad?: boolean }> = ({
  title, action, children, className = '', pad = true,
}) => (
  <div className={`bg-white rounded-xl border border-gray-100 ${className}`}>
    {(title || action) && (
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        {action}
      </div>
    )}
    <div className={pad ? 'p-5' : ''}>{children}</div>
  </div>
);

export const PageBar: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 flex-wrap">{children}</div>
);

export const Spinner: React.FC<{ label?: string }> = ({ label = 'Loading…' }) => (
  <div className="flex items-center justify-center gap-2 py-16 text-gray-400 text-sm">
    <Loader2 className="w-4 h-4 animate-spin" /> {label}
  </div>
);

export const EmptyState: React.FC<{ icon?: React.ReactNode; title: string; hint?: string; action?: React.ReactNode }> = ({ icon, title, hint, action }) => (
  <div className="text-center py-14 px-4">
    {icon && <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mb-3">{icon}</div>}
    <p className="font-semibold text-gray-800">{title}</p>
    {hint && <p className="text-sm text-gray-500 mt-1">{hint}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const ErrorBox: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 p-4 text-sm flex items-center justify-between gap-3">
    <span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {message}</span>
    {onRetry && <Button size="sm" variant="secondary" onClick={onRetry}>Try again</Button>}
  </div>
);

export const Pagination: React.FC<{ page: number; pages: number; count: number; onPage: (p: number) => void }> = ({ page, pages, count, onPage }) => (
  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
    <span>{count} {count === 1 ? 'result' : 'results'}</span>
    {pages > 1 && (
      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft className="w-4 h-4" /></Button>
        <span>Page {page} of {pages}</span>
        <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => onPage(page + 1)}><ChevronRight className="w-4 h-4" /></Button>
      </div>
    )}
  </div>
);

export const Table: React.FC<{ head: string[]; children: React.ReactNode; right?: number[] }> = ({ head, children, right = [] }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
          {head.map((h, i) => (
            <th key={h + i} className={`px-4 py-3 font-semibold ${right.includes(i) ? 'text-right' : 'text-left'}`}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">{children}</tbody>
    </table>
  </div>
);

// ─── Overlays ─────────────────────────────────────────────────────────────────
export const Modal: React.FC<{
  title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean;
}> = ({ title, onClose, children, footer, wide }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`bg-white rounded-xl shadow-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-500" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
};

export const Drawer: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] bg-black/40" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl flex flex-col" role="dialog" aria-modal="true">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-500" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
};

export const Confirm: React.FC<{
  title: string; message: string; confirmLabel?: string; danger?: boolean; loading?: boolean; onConfirm: () => void; onCancel: () => void;
}> = ({ title, message, confirmLabel = 'Confirm', danger, loading, onConfirm, onCancel }) => (
  <Modal title={title} onClose={onCancel} footer={
    <>
      <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      <Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
    </>
  }>
    <p className="text-sm text-gray-600">{message}</p>
  </Modal>
);
