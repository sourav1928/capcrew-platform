export const formatINR = (value: number | string | null | undefined): string => {
  const n = Number(value ?? 0)
  return '₹' + (isNaN(n) ? 0 : n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

export const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/** "Tue, 7 Oct – Thu, 9 Oct" style delivery window from an order date. */
export const deliveryWindow = (iso: string, minDays = 3, maxDays = 5): string => {
  const start = new Date(iso)
  const fmt = (d: Date) => d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
  const a = new Date(start)
  a.setDate(a.getDate() + minDays)
  const b = new Date(start)
  b.setDate(b.getDate() + maxDays)
  return `${fmt(a)} – ${fmt(b)}`
}

export const newIdempotencyKey = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
