import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, X } from 'lucide-react'

type Kind = 'success' | 'error'
interface ToastItem {
  id: number
  kind: Kind
  text: string
}

const ToastContext = createContext<{ notify: (text: string, kind?: Kind) => void }>({ notify: () => {} })

/** const { notify } = useToast();  notify('Added to cart')  or  notify('Something failed', 'error') */
export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), [])
  const notify = useCallback(
    (text: string, kind: Kind = 'success') => {
      const id = nextId.current++
      setItems((list) => [...list.slice(-2), { id, kind, text }])
      window.setTimeout(() => dismiss(id), kind === 'error' ? 6000 : 3500)
    },
    [dismiss]
  )
  const value = useMemo(() => ({ notify }), [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed inset-x-0 bottom-20 sm:bottom-6 z-[100] px-4 flex flex-col items-center sm:items-end gap-2 pointer-events-none">
        {items.map((t) => (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto w-full sm:w-auto sm:max-w-sm flex items-start gap-3 rounded-lg shadow-lg px-4 py-3 text-sm text-white ${
              t.kind === 'error' ? 'bg-red-600' : 'bg-gray-900'
            }`}
          >
            {t.kind === 'error' ? <AlertCircle size={18} className="mt-0.5 flex-shrink-0" /> : <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0 text-green-400" />}
            <span className="flex-1 break-words">{t.text}</span>
            <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss" className="opacity-70 hover:opacity-100">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
