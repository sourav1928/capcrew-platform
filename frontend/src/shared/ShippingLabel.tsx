import React from 'react'
import { code128Modules } from './code128'

export interface LabelData {
  order_number: string
  invoice_number: string
  date: string
  courier: string
  tracking_number: string
  barcode_value: string
  payment_type: 'COD' | 'PREPAID'
  cod_amount: string
  ship_to: { name: string; phone: string; lines: string[]; city: string; state: string; pincode: string }
  from: { name: string; address: string; phone: string; email: string; gstin: string }
  total_units: number
  items: Array<{ name: string; variant: string; qty: number }>
  weight_kg: string | null
  status: string
}

export type LabelSize = 'thermal' | 'a6'
/** thermal = the 4 x 6 inch roll used by label printers. a6 = four labels fit on one A4 sheet. */
export const LABEL_MM: Record<LabelSize, { w: number; h: number }> = { thermal: { w: 100, h: 150 }, a6: { w: 105, h: 148 } }

const inr = (v: string | number) => '₹' + Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

/** A scannable Code 128 barcode drawn as SVG (works on any printer, no images needed). */
export const Barcode: React.FC<{ value: string; height?: string }> = ({ value, height = '16mm' }) => {
  const modules = code128Modules(value)
  if (!modules) return null
  const quiet = 10
  const rects: React.ReactNode[] = []
  let i = 0
  while (i < modules.length) {
    if (modules[i] === '1') {
      let j = i
      while (j < modules.length && modules[j] === '1') j++
      rects.push(<rect key={i} x={i + quiet} y={0} width={j - i} height={1} />)
      i = j
    } else i++
  }
  return (
    <svg viewBox={`0 0 ${modules.length + quiet * 2} 1`} preserveAspectRatio="none" width="100%" height={height} shapeRendering="crispEdges" role="img" aria-label={`Barcode ${value}`}>
      <rect x={0} y={0} width={modules.length + quiet * 2} height={1} fill="#fff" />
      <g fill="#000">{rects}</g>
    </svg>
  )
}

/** The sticker that goes on the outside of the parcel. */
export const ShippingLabel: React.FC<{ label: LabelData; size?: LabelSize }> = ({ label: l, size = 'thermal' }) => {
  const { w, h } = LABEL_MM[size]
  const cod = l.payment_type === 'COD'
  const shown = l.items.slice(0, 3)
  const more = l.items.length - shown.length
  return (
    <div
      className="label-sheet bg-white text-black border border-black flex flex-col overflow-hidden"
      style={{ width: `${w}mm`, height: `${h}mm`, boxSizing: 'border-box', fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      {/* Courier + payment */}
      <div className="flex border-b border-black" style={{ height: '17mm' }}>
        <div className="flex-1 px-2 py-1 border-r border-black flex flex-col justify-center">
          <p className="text-[8px] uppercase tracking-wide text-gray-600">Courier</p>
          <p className="text-[15px] font-extrabold leading-tight">{l.courier || '—'}</p>
        </div>
        <div className={`px-2 py-1 flex flex-col items-center justify-center text-center ${cod ? 'bg-black text-white' : ''}`} style={{ width: '44mm' }}>
          {cod ? (
            <>
              <p className="text-[8px] uppercase tracking-wide">Cash on delivery</p>
              <p className="text-[17px] font-extrabold leading-tight">COLLECT {inr(l.cod_amount)}</p>
            </>
          ) : (
            <>
              <p className="text-[18px] font-extrabold leading-tight">PREPAID</p>
              <p className="text-[8px] uppercase tracking-wide">Do not collect cash</p>
            </>
          )}
        </div>
      </div>

      {/* Barcode */}
      <div className="px-2 pt-1.5 pb-1 border-b border-black text-center">
        <Barcode value={l.barcode_value} height="22mm" />
        <p className="text-[12px] font-bold tracking-widest mt-0.5">{l.barcode_value}</p>
        <p className="text-[7px] uppercase text-gray-600">{l.tracking_number ? 'Courier tracking no. (AWB)' : 'Order no.'}</p>
      </div>

      {/* Ship to */}
      <div className="px-2 py-2 border-b border-black flex-1 min-h-0 overflow-hidden">
        <p className="text-[9px] uppercase tracking-wide text-gray-600">Ship to</p>
        <p className="text-[20px] font-extrabold leading-tight mt-0.5">{l.ship_to.name}</p>
        {l.ship_to.lines.map((line) => <p key={line} className="text-[14px] leading-snug">{line}</p>)}
        <p className="text-[14px] leading-snug">{l.ship_to.city}, {l.ship_to.state}</p>
        <p className="text-[34px] font-black tracking-[0.18em] leading-none mt-2">{l.ship_to.pincode}</p>
        <p className="text-[14px] font-bold mt-1.5">Phone: {l.ship_to.phone}</p>
      </div>

      {/* Order details */}
      <div className="px-2 py-1.5 border-b border-black text-[10px] leading-snug">
        <div className="flex justify-between">
          <span><b>Order:</b> {l.order_number}</span>
          <span><b>Date:</b> {day(l.date)}</span>
        </div>
        <p className="truncate">
          <b>Contents ({l.total_units}):</b>{' '}
          {shown.map((it) => `${it.qty} × ${it.name}`).join(', ')}{more > 0 ? ` +${more} more` : ''}
        </p>
        {l.weight_kg && <p><b>Weight:</b> {Number(l.weight_kg)} kg</p>}
      </div>

      {/* Return address */}
      <div className="px-2 py-1.5 text-[9px] leading-snug">
        <p className="uppercase tracking-wide text-gray-600 text-[7.5px]">Sold by / return to</p>
        <p><b>{l.from.name}</b>{l.from.gstin ? ` · GSTIN ${l.from.gstin}` : ''}</p>
        <p>{l.from.address}</p>
        <p>{[l.from.phone, l.from.email].filter(Boolean).join(' · ')}</p>
      </div>
    </div>
  )
}
