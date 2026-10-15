import React from 'react'

export interface Invoice {
  invoice_number: string
  order_number: string
  date: string
  seller: { name: string; address: string; email: string; phone: string; gstin: string; state: string }
  bill_to: { name: string; phone: string; lines: string[] } | null
  ship_to: { name: string; phone: string; lines: string[] } | null
  customer_email: string
  payment_method: string
  payment_status: string
  lines: Array<{ name: string; variant: string; sku: string; qty: number; rate: string; discount: string; taxable: string; tax: string }>
  gst_rate: string
  tax_type: 'cgst_sgst' | 'igst'
  cgst: string
  sgst: string
  igst: string
  totals: { subtotal: string; discount: string; taxable: string; tax: string; shipping: string; total: string }
  prices_include_gst: boolean
  amount_in_words: string
  coupon_code: string | null
  note: string
  is_paid: boolean
  status: string
}

const inr = (v: string | number) =>
  '₹' + Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

/** Printable GST tax invoice. Shared by the shop (customers) and the admin site (staff). */
export const InvoiceView: React.FC<{ invoice: Invoice }> = ({ invoice: i }) => {
  const half = Number(i.gst_rate) / 2
  return (
    <div className="bg-white text-gray-900 max-w-3xl mx-auto p-8 sm:p-10 shadow-sm border border-gray-200 print:shadow-none print:border-0 print:p-0 text-sm">
      <div className="flex justify-between gap-6 border-b border-gray-300 pb-5">
        <div>
          <h1 className="text-2xl font-bold">{i.seller.name}</h1>
          <p className="text-gray-600 mt-1 whitespace-pre-line">{i.seller.address}</p>
          <p className="text-gray-600">{[i.seller.phone, i.seller.email].filter(Boolean).join(' · ')}</p>
          {i.seller.gstin && <p className="mt-1"><span className="text-gray-500">GSTIN:</span> <strong>{i.seller.gstin}</strong></p>}
        </div>
        <div className="text-right">
          <p className="text-xl font-bold tracking-wide">TAX INVOICE</p>
          <p className="mt-2"><span className="text-gray-500">Invoice no:</span> <strong>{i.invoice_number}</strong></p>
          <p><span className="text-gray-500">Date:</span> {day(i.date)}</p>
          <p><span className="text-gray-500">Order:</span> {i.order_number}</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6 py-5 border-b border-gray-300">
        {[['Billed to', i.bill_to], ['Delivered to', i.ship_to]].map(([label, a]) => {
          const addr = a as Invoice['bill_to']
          return (
            <div key={label as string}>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">{label as string}</p>
              {addr && (<><p className="font-semibold">{addr.name}</p>{addr.lines.map((l) => <p key={l} className="text-gray-600">{l}</p>)}<p className="text-gray-600">Phone: {addr.phone}</p></>)}
            </div>
          )
        })}
      </div>

      <div className="overflow-x-auto"><table className="w-full mt-5 border-collapse">
        <thead>
          <tr className="bg-gray-100 text-xs uppercase text-gray-600">
            <th className="text-left p-2">#</th><th className="text-left p-2">Item</th><th className="text-right p-2">Qty</th>
            <th className="text-right p-2">Rate</th><th className="text-right p-2">Discount</th><th className="text-right p-2">Taxable</th>
            <th className="text-right p-2">GST</th>
          </tr>
        </thead>
        <tbody>
          {i.lines.map((l, idx) => (
            <tr key={l.sku + idx} className="border-b border-gray-200 align-top">
              <td className="p-2">{idx + 1}</td>
              <td className="p-2"><p className="font-medium">{l.name}</p><p className="text-xs text-gray-500">{l.variant} · {l.sku}</p></td>
              <td className="p-2 text-right">{l.qty}</td>
              <td className="p-2 text-right">{inr(l.rate)}</td>
              <td className="p-2 text-right">{Number(l.discount) > 0 ? inr(l.discount) : '–'}</td>
              <td className="p-2 text-right">{inr(l.taxable)}</td>
              <td className="p-2 text-right">{inr(l.tax)}</td>
            </tr>
          ))}
        </tbody>
      </table></div>

      <div className="flex justify-end mt-4">
        <div className="w-full sm:w-80 space-y-1">
          <Row l="Items total" v={inr(i.totals.subtotal)} />
          {Number(i.totals.discount) > 0 && <Row l={`Discount${i.coupon_code ? ` (${i.coupon_code})` : ''}`} v={`−${inr(i.totals.discount)}`} />}
          <Row l="Taxable value" v={inr(i.totals.taxable)} />
          {i.tax_type === 'cgst_sgst' ? (
            <>
              <Row l={`CGST @ ${half}%`} v={inr(i.cgst)} />
              <Row l={`SGST @ ${half}%`} v={inr(i.sgst)} />
            </>
          ) : (
            <Row l={`IGST @ ${Number(i.gst_rate)}%`} v={inr(i.igst)} />
          )}
          <Row l="Delivery" v={Number(i.totals.shipping) === 0 ? 'Free' : inr(i.totals.shipping)} />
          <div className="flex justify-between border-t border-gray-400 pt-2 mt-1 text-base font-bold"><span>Total</span><span>{inr(i.totals.total)}</span></div>
        </div>
      </div>

      <p className="mt-4 text-gray-700"><span className="text-gray-500">Amount in words:</span> {i.amount_in_words}</p>
      <p className="mt-1 text-gray-700">
        <span className="text-gray-500">Payment:</span> {i.payment_method} · {i.payment_status}
        {i.prices_include_gst ? ' · Prices include GST' : ''}
      </p>
      {i.note && <p className="mt-6 text-center text-gray-500">{i.note}</p>}
      <p className="mt-2 text-center text-xs text-gray-400">This is a computer-generated invoice.</p>
    </div>
  )
}

const Row: React.FC<{ l: string; v: string }> = ({ l, v }) => (
  <div className="flex justify-between text-gray-700"><span>{l}</span><span>{v}</span></div>
)

/** Page chrome: a Print button that disappears when printing. */
export const InvoiceFrame: React.FC<{ invoice: Invoice | null; error: string; loading: boolean; backHref: string }> = ({ invoice, error, loading, backHref }) => (
  <div className="min-h-screen bg-gray-100 print:bg-white py-8 px-4">
    <div className="max-w-3xl mx-auto mb-4 flex items-center justify-between print:hidden">
      <a href={backHref} className="text-blue-600 hover:underline text-sm font-medium">← Back</a>
      {invoice && (
        <button onClick={() => window.print()} className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700 text-sm">
          Print / Save as PDF
        </button>
      )}
    </div>
    {loading && <p className="text-center text-gray-500 py-20">Loading invoice…</p>}
    {error && <p className="text-center text-red-600 py-20">{error}</p>}
    {invoice && <InvoiceView invoice={invoice} />}
  </div>
)
