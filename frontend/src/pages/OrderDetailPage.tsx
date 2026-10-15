import { usePageMeta } from '../utils/usePageMeta'
import { useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, Loader2, MapPin, Package, Truck, Wallet, XCircle } from 'lucide-react'
import { RootState } from '../store'
import { apiClient } from '../services/api'
import { deliveryWindow, formatDateTime, formatINR } from '../utils/format'
import { OrderDetail, STATUS_STYLES, apiErrorMessage } from '../utils/orderTypes'
import { usePayment } from '../utils/payment'

const STEPS = [
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle2 },
  { key: 'processing', label: 'Packed', icon: Package },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle2 },
]
const STEP_INDEX: Record<string, number> = { pending: -1, confirmed: 0, processing: 1, shipped: 2, delivered: 3 }

function OrderDetailPage() {
  usePageMeta("Order Details")
  const { orderNumber = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const auth = useSelector((state: RootState) => state.auth)
  const queryClient = useQueryClient()
  const { pay, modal } = usePayment()
  const [message, setMessage] = useState('')
  const [confirmCancel, setConfirmCancel] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['order', orderNumber],
    queryFn: async () => (await apiClient.getOrder(orderNumber)).data as OrderDetail,
    enabled: auth.isAuthenticated && !!orderNumber,
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['order', orderNumber] })
    queryClient.invalidateQueries({ queryKey: ['orders'] })
  }

  const cancel = useMutation({
    mutationFn: () => apiClient.cancelOrder(orderNumber, { reason: 'Cancelled by customer' }),
    onSuccess: () => {
      setConfirmCancel(false)
      setMessage('')
      refresh()
    },
    onError: (err) => setMessage(apiErrorMessage(err, 'Could not cancel this order.')),
  })

  const retryPayment = async () => {
    setMessage('')
    setParams({}, { replace: true })
    const result = await pay(orderNumber)
    if (result.status === 'paid') setParams({ placed: '1' }, { replace: true })
    else setMessage(result.message || 'Payment was not completed.')
    refresh()
  }

  if (!auth.isAuthenticated) return <Navigate to={`/login?next=/orders/${orderNumber}`} replace />

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-4">
        <div className="h-24 bg-gray-200 rounded-xl animate-pulse" />
        <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
      </div>
    )
  }
  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <XCircle size={48} className="mx-auto text-red-400 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Order not found</h1>
        <p className="text-gray-600 mb-6">We couldn’t find order {orderNumber} on your account.</p>
        <Link to="/orders" className="text-blue-600 font-semibold hover:underline">View my orders</Link>
      </div>
    )
  }

  const order = data
  const justPlaced = params.get('placed') === '1'
  const paymentProblem = params.get('payment')
  const cancelled = order.status === 'cancelled'
  const stepIndex = STEP_INDEX[order.status] ?? -1
  const isCod = order.payment?.method === 'cod'
  const addr = order.shipping_address

  return (
    <div className="bg-gray-50 min-h-screen py-10">
      {modal}
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <Link to="/orders" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mb-4">
          <ArrowLeft size={16} /> My orders
        </Link>

        {justPlaced && !cancelled && (
          <div className="mb-6 rounded-xl bg-green-50 border border-green-200 p-6 text-center">
            <CheckCircle2 size={48} className="mx-auto text-green-600 mb-2" />
            <h1 className="text-2xl font-bold text-green-900">Thank you! Your order is placed</h1>
            <p className="text-green-800 mt-1">
              Order <strong>{order.order_number}</strong> · {isCod ? 'Pay on delivery' : 'Payment received'}
            </p>
            <p className="text-green-800 text-sm mt-1">We’ve emailed you the confirmation.</p>
          </div>
        )}

        {(order.needs_payment || paymentProblem) && !cancelled && (
          <div className="mb-6 rounded-xl bg-amber-50 border border-amber-300 p-5 flex gap-3 items-start">
            <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-amber-900">
                {paymentProblem === 'failed' ? 'Your payment didn’t go through' : 'Payment pending'}
              </p>
              <p className="text-sm text-amber-800">
                Your order is saved, but it won’t be processed until payment is complete.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={retryPayment}
                  className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700">
                  Pay {formatINR(order.order_total)}
                </button>
                {order.can_cancel && (
                  <button onClick={() => setConfirmCancel(true)}
                    className="border border-gray-300 bg-white px-5 py-2 rounded-lg font-semibold text-gray-700 hover:bg-gray-50">
                    Cancel order
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm" role="alert">{message}</div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-gray-500">Order number</p>
              <h2 className="text-2xl font-bold text-gray-900">{order.order_number}</h2>
              <p className="text-sm text-gray-500 mt-1">Placed on {formatDateTime(order.created_at)}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${STATUS_STYLES[order.status] || 'bg-gray-50 text-gray-700 border-gray-300'}`}>
              {order.status_display}
            </span>
          </div>

          {cancelled ? (
            <p className="mt-6 flex items-center gap-2 text-red-700 bg-red-50 rounded-lg p-3 text-sm">
              <XCircle size={18} /> This order was cancelled.
              {order.payment?.status === 'paid' && ' Your refund will be processed to the original payment method.'}
            </p>
          ) : order.status === 'pending' ? (
            <p className="mt-6 flex items-center gap-2 text-gray-600 text-sm"><Clock size={18} /> Waiting for payment</p>
          ) : (
            <>
              <ol className="mt-8 grid grid-cols-4 gap-2">
                {STEPS.map((s, i) => {
                  const done = i <= stepIndex
                  const Icon = s.icon
                  return (
                    <li key={s.key} className="text-center">
                      <div className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center ${done ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                        <Icon size={20} />
                      </div>
                      <p className={`text-xs mt-2 ${done ? 'text-gray-900 font-semibold' : 'text-gray-400'}`}>{s.label}</p>
                    </li>
                  )
                })}
              </ol>
              {order.status !== 'delivered' && (
                <p className="mt-6 text-sm text-gray-700 flex items-center gap-2">
                  <Truck size={18} className="text-blue-600" />
                  Estimated delivery: <strong>{deliveryWindow(order.created_at)}</strong>
                </p>
              )}
            </>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-bold text-lg mb-4">Items ({order.total_items})</h3>
            <div className="divide-y divide-gray-100">
              {order.items.map((item) => (
                <div key={item.id} className="py-3 flex justify-between gap-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-900">{item.product_name}</p>
                    <p className="text-gray-500">{item.variant_name} · Qty {item.quantity} × {formatINR(item.unit_price)}</p>
                  </div>
                  <p className="font-semibold">{formatINR(item.line_total)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm">
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><MapPin size={18} /> Delivering to</h3>
              {addr && (
                <p className="text-gray-700 leading-relaxed">
                  <strong>{addr.full_name}</strong><br />
                  {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}<br />
                  {addr.city}, {addr.state} – {addr.postal_code}<br />
                  Phone: {addr.phone}
                </p>
              )}
            </div>

            {order.shipment && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm">
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><Truck size={18} /> Tracking</h3>
                <p className="text-gray-600">Shipped with <strong className="text-gray-900">{order.shipment.courier}</strong></p>
                {!order.shipment.tracking_number.startsWith('OWN-') && (
                  <p className="text-gray-600 mt-1">Tracking number: <strong className="text-gray-900 select-all">{order.shipment.tracking_number}</strong></p>
                )}
                {order.shipment.estimated_delivery && (
                  <p className="text-gray-600 mt-1">Expected by <strong className="text-gray-900">{new Date(order.shipment.estimated_delivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</strong></p>
                )}
                {order.shipment.tracking_url && (
                  <a href={order.shipment.tracking_url} target="_blank" rel="noreferrer"
                    className="inline-block mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700">Track my parcel</a>
                )}
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm space-y-2">
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><Wallet size={18} /> Payment</h3>
              <p className="text-gray-600">
                {isCod ? 'Cash on Delivery' : 'Paid online'} ·{' '}
                <span className="font-medium text-gray-900">{order.payment_status_display}</span>
              </p>
              <div className="border-t border-gray-100 pt-3 space-y-1.5">
                <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>{formatINR(order.subtotal)}</span></div>
                {Number(order.discount_amount) > 0 && (
                  <div className="flex justify-between text-green-700"><span>Discount{order.coupon_code ? ` (${order.coupon_code})` : ''}</span><span>−{formatINR(order.discount_amount)}</span></div>
                )}
                <div className="flex justify-between"><span className="text-gray-600">Delivery</span><span>{Number(order.shipping_cost) === 0 ? 'FREE' : formatINR(order.shipping_cost)}</span></div>
                <div className="flex justify-between text-gray-500"><span>{order.prices_include_gst ? 'Includes GST' : 'GST'}</span><span>{formatINR(order.tax_amount)}</span></div>
                <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold"><span>Total</span><span>{formatINR(order.order_total)}</span></div>
              </div>
            </div>
          </div>
        </div>

        {order.status !== 'pending' && order.status !== 'cancelled' && (
          <div className="mt-6 text-right">
            <Link to={`/orders/${order.order_number}/invoice`} className="text-sm text-blue-600 font-semibold hover:underline">
              View / print invoice
            </Link>
          </div>
        )}

        {order.can_cancel && !order.needs_payment && (
          <div className="mt-6 text-right">
            <button onClick={() => setConfirmCancel(true)} className="text-sm text-red-600 hover:underline">
              Cancel this order
            </button>
          </div>
        )}

        {confirmCancel && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full">
              <h3 className="text-lg font-bold mb-2">Cancel this order?</h3>
              <p className="text-gray-600 text-sm mb-5">
                The items will go back to stock. {order.payment?.status === 'paid' && 'Your payment will be refunded.'}
              </p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setConfirmCancel(false)} className="px-4 py-2 rounded-lg border border-gray-300 font-medium">Keep order</button>
                <button onClick={() => cancel.mutate()} disabled={cancel.isPending}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-60 flex items-center gap-2">
                  {cancel.isPending && <Loader2 size={16} className="animate-spin" />} Yes, cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default OrderDetailPage
