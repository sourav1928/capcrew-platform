import { usePageMeta } from '../utils/usePageMeta'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AlertTriangle, BadgeCheck, CreditCard, Loader2, MapPin, Plus, ShieldCheck, Tag, Truck, Wallet, X } from 'lucide-react'
import { RootState } from '../store'
import { CartItem, clearCart, replaceItems } from '../store/slices/cartSlice'
import { apiClient, CheckoutAddressInput } from '../services/api'
import { formatINR, newIdempotencyKey } from '../utils/format'
import { apiErrorMessage } from '../utils/orderTypes'
import { usePayment } from '../utils/payment'

interface SavedAddress extends CheckoutAddressInput {
  id: string
  is_default: boolean
}
interface QuoteLine {
  sku_code: string
  product_name: string
  variant_name: string
  image: string | null
  quantity: number
  unit_price: string | number
  mrp: string | number
  line_total: string | number
  available_quantity: number
}
interface Issue {
  sku_code: string
  code: string
  message: string
  available_quantity: number
}
interface Quote {
  lines: QuoteLine[]
  issues: Issue[]
  totals: {
    subtotal: string
    discount: string
    shipping: string
    gst_included: string
    gst_amount: string
    prices_include_gst: boolean
    gst_percent: string
    total: string
    savings: string
    free_shipping_threshold: string
    total_items: number
  }
  coupon: { code: string; description: string; discount: string } | null
  coupon_error: string
  payment_options: Array<{ id: 'online' | 'cod'; label: string; description: string; enabled: boolean; reason: string }>
  can_place: boolean
}

const EMPTY_FORM: CheckoutAddressInput = {
  full_name: '', phone: '', line1: '', line2: '', city: '', state: '', postal_code: '',
}
const STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh',
  'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry',
  'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
  'West Bengal',
]

const validate = (f: CheckoutAddressInput): Record<string, string> => {
  const e: Record<string, string> = {}
  if (f.full_name.trim().length < 2) e.full_name = 'Enter your full name'
  if (!/^[6-9]\d{9}$/.test(f.phone.replace(/[\s-]/g, '').replace(/^(\+?91|0)/, ''))) e.phone = 'Enter a valid 10-digit mobile number'
  if (!f.line1.trim()) e.line1 = 'Enter your house / street address'
  if (!f.city.trim()) e.city = 'Enter your city'
  if (!f.state) e.state = 'Select your state'
  if (!/^[1-9]\d{5}$/.test(f.postal_code.trim())) e.postal_code = 'Enter a valid 6-digit PIN code'
  return e
}

const inputClass = (error?: string) =>
  `w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${
    error ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-blue-500'
  }`

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      {children}
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </label>
  )
}

function CheckoutPage() {
  usePageMeta("Checkout")
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const cart = useSelector((state: RootState) => state.cart)
  const auth = useSelector((state: RootState) => state.auth)
  const { pay, modal } = usePayment()

  const [quote, setQuote] = useState<Quote | null>(null)
  const [quoteError, setQuoteError] = useState('')
  const [loadingQuote, setLoadingQuote] = useState(true)

  const [addresses, setAddresses] = useState<SavedAddress[]>([])
  const [addressesLoaded, setAddressesLoaded] = useState(false)
  const [selectedId, setSelectedId] = useState<string>('')
  const [useNew, setUseNew] = useState(false)
  const [form, setForm] = useState<CheckoutAddressInput>(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('online')
  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState('')
  const [notes, setNotes] = useState('')
  const [placing, setPlacing] = useState(false)
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const idempotencyKey = useRef(newIdempotencyKey())

  const itemsPayload = useMemo(
    () => cart.items.map((i) => ({ sku_code: i.skuCode, quantity: i.quantity })),
    [cart.items]
  )
  const itemsKey = JSON.stringify(itemsPayload)

  // Fresh server-side prices & stock whenever the cart or coupon changes
  useEffect(() => {
    if (!auth.isAuthenticated || itemsPayload.length === 0) return
    let cancelled = false
    setLoadingQuote(true)
    apiClient
      .quoteOrder(itemsPayload, appliedCoupon)
      .then((res) => {
        if (cancelled) return
        const q: Quote = res.data.data
        setQuote(q)
        setQuoteError('')
        if (!q.payment_options.find((o) => o.id === paymentMethod)?.enabled) {
          const first = q.payment_options.find((o) => o.enabled)
          if (first) setPaymentMethod(first.id)
        }
        if (appliedCoupon && q.coupon_error) {
          setFormError(q.coupon_error)
          setAppliedCoupon('')
        }
      })
      .catch((err) => !cancelled && setQuoteError(apiErrorMessage(err, 'Could not load your order summary.')))
      .finally(() => !cancelled && setLoadingQuote(false))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated, itemsKey, appliedCoupon])

  useEffect(() => {
    if (!auth.isAuthenticated) return
    apiClient
      .getAddresses()
      .then((res) => {
        const list: SavedAddress[] = res.data.data || []
        setAddresses(list)
        const def = list.find((a) => a.is_default) || list[0]
        if (def) setSelectedId(def.id)
        else setUseNew(true)
      })
      .catch(() => setUseNew(true))
      .finally(() => setAddressesLoaded(true))
  }, [auth.isAuthenticated])

  if (!auth.isAuthenticated) return <Navigate to="/login?next=/checkout" replace />
  if (cart.items.length === 0) {
    return (
      <div className="bg-white min-h-[60vh] py-16 text-center">
        <h1 className="text-3xl font-bold mb-3">Your cart is empty</h1>
        <p className="text-gray-600 mb-6">Add something to your cart to check out.</p>
        <Link to="/products" className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700">
          Browse products
        </Link>
      </div>
    )
  }

  const setField = (key: keyof CheckoutAddressInput, value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }))
  }

  /** Apply the server's view of the cart (prices, stock) to the local cart. */
  const syncCartWithServer = () => {
    if (!quote) return
    const byCode = new Map(quote.lines.map((l) => [l.sku_code, l]))
    const issueByCode = new Map(quote.issues.map((i) => [i.sku_code, i]))
    const next: CartItem[] = []
    for (const item of cart.items) {
      const issue = issueByCode.get(item.skuCode)
      const line = byCode.get(item.skuCode)
      if (issue) {
        if (issue.available_quantity > 0) {
          next.push({ ...item, quantity: issue.available_quantity, maxQuantity: issue.available_quantity })
        }
      } else if (line) {
        next.push({
          ...item,
          unitPrice: Number(line.unit_price),
          mrp: Number(line.mrp),
          maxQuantity: line.available_quantity,
          quantity: Math.min(item.quantity, line.available_quantity),
        })
      }
    }
    dispatch(replaceItems(next))
    setNotice('We updated your cart to match current prices and stock.')
  }

  const applyCoupon = () => {
    const code = couponInput.trim()
    if (!code) return
    setFormError('')
    setAppliedCoupon(code)
  }

  const placeOrder = async () => {
    if (placing) return
    setFormError('')
    setNotice('')
    if (!quote?.can_place) {
      setFormError('Please review the items in your order first.')
      return
    }
    let address: CheckoutAddressInput | undefined
    let addressId: string | undefined
    if (useNew || addresses.length === 0) {
      const found = validate(form)
      setErrors(found)
      if (Object.keys(found).length) {
        setFormError('Please correct the highlighted address fields.')
        document.getElementById('address-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        return
      }
      address = form
    } else {
      addressId = selectedId
      if (!addressId) {
        setFormError('Select a delivery address.')
        return
      }
    }

    setPlacing(true)
    try {
      const res = await apiClient.placeOrder({
        items: itemsPayload,
        address,
        address_id: addressId,
        payment_method: paymentMethod,
        coupon_code: appliedCoupon,
        notes,
        idempotency_key: idempotencyKey.current,
      })
      const { order, payment_intent } = res.data.data
      dispatch(clearCart())

      if (paymentMethod === 'cod') {
        navigate(`/orders/${order.order_number}?placed=1`, { replace: true })
        return
      }
      const result = await pay(order.order_number, payment_intent)
      if (result.status === 'paid') {
        navigate(`/orders/${order.order_number}?placed=1`, { replace: true })
      } else {
        navigate(`/orders/${order.order_number}?payment=${result.status}`, { replace: true })
      }
    } catch (err: any) {
      idempotencyKey.current = newIdempotencyKey()
      const data = err?.response?.data
      if (data?.errors) {
        setUseNew(true)
        setErrors(data.errors)
      }
      if (data?.code === 'cart_issues') {
        setNotice('Some items in your cart changed. We’ve refreshed your order summary below.')
        setAppliedCoupon((c) => c) // trigger nothing; quote reload below
        apiClient.quoteOrder(itemsPayload, appliedCoupon).then((r) => setQuote(r.data.data)).catch(() => undefined)
      } else {
        setFormError(apiErrorMessage(err, 'We could not place your order. Please try again.'))
      }
    } finally {
      setPlacing(false)
    }
  }

  const totals = quote?.totals
  const hasIssues = !!quote && quote.issues.length > 0
  const options = quote?.payment_options || []

  return (
    <div className="bg-gray-50 min-h-screen py-10">
      {modal}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Checkout</h1>
        <p className="text-gray-600 mb-6 flex items-center gap-2">
          <ShieldCheck size={18} className="text-green-600" /> Secure checkout – prices are verified on our server
        </p>

        {notice && (
          <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm">{notice}</div>
        )}
        {quoteError && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{quoteError}</div>
        )}
        {hasIssues && (
          <div className="mb-4 p-4 rounded-lg bg-amber-50 border border-amber-300 text-amber-900">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold mb-1">Some items need your attention</p>
                <ul className="list-disc ml-5 text-sm space-y-1">
                  {quote!.issues.map((i) => (
                    <li key={i.sku_code}>{i.message}</li>
                  ))}
                </ul>
                <button
                  onClick={syncCartWithServer}
                  className="mt-3 bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-700"
                >
                  Update my cart
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* 1. Address */}
            <section id="address-section" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center">1</span>
                <MapPin size={20} className="text-blue-600" /> Delivery address
              </h2>

              {!addressesLoaded ? (
                <div className="h-24 bg-gray-100 rounded-lg animate-pulse" />
              ) : (
                <>
                  {addresses.length > 0 && (
                    <div className="grid sm:grid-cols-2 gap-3 mb-4">
                      {addresses.map((a) => {
                        const active = !useNew && selectedId === a.id
                        return (
                          <label
                            key={a.id}
                            className={`cursor-pointer rounded-lg border-2 p-4 text-sm transition-colors ${
                              active ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="address"
                              className="sr-only"
                              checked={active}
                              onChange={() => {
                                setSelectedId(a.id)
                                setUseNew(false)
                              }}
                            />
                            <p className="font-semibold text-gray-900 flex items-center gap-2">
                              {a.full_name}
                              {a.is_default && (
                                <span className="text-[10px] uppercase bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">Default</span>
                              )}
                            </p>
                            <p className="text-gray-600 mt-1">
                              {a.line1}
                              {a.line2 ? `, ${a.line2}` : ''}
                              <br />
                              {a.city}, {a.state} – {a.postal_code}
                              <br />
                              Phone: {a.phone}
                            </p>
                          </label>
                        )
                      })}
                      <button
                        type="button"
                        onClick={() => setUseNew(true)}
                        className={`rounded-lg border-2 border-dashed p-4 text-sm flex items-center justify-center gap-2 font-medium ${
                          useNew ? 'border-blue-600 text-blue-700 bg-blue-50' : 'border-gray-300 text-gray-600 hover:border-blue-400'
                        }`}
                      >
                        <Plus size={18} /> Add a new address
                      </button>
                    </div>
                  )}

                  {(useNew || addresses.length === 0) && (
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Field label="Full name" error={errors.full_name}>
                        <input className={inputClass(errors.full_name)} value={form.full_name} autoComplete="name"
                          onChange={(e) => setField('full_name', e.target.value)} />
                      </Field>
                      <Field label="Mobile number" error={errors.phone}>
                        <input className={inputClass(errors.phone)} value={form.phone} inputMode="numeric" autoComplete="tel"
                          placeholder="10-digit number" maxLength={14} onChange={(e) => setField('phone', e.target.value)} />
                      </Field>
                      <div className="sm:col-span-2">
                        <Field label="House no., building, street" error={errors.line1}>
                          <input className={inputClass(errors.line1)} value={form.line1} autoComplete="address-line1"
                            onChange={(e) => setField('line1', e.target.value)} />
                        </Field>
                      </div>
                      <div className="sm:col-span-2">
                        <Field label="Area, landmark (optional)" error={errors.line2}>
                          <input className={inputClass(errors.line2)} value={form.line2 || ''} autoComplete="address-line2"
                            onChange={(e) => setField('line2', e.target.value)} />
                        </Field>
                      </div>
                      <Field label="City" error={errors.city}>
                        <input className={inputClass(errors.city)} value={form.city} autoComplete="address-level2"
                          onChange={(e) => setField('city', e.target.value)} />
                      </Field>
                      <Field label="State" error={errors.state}>
                        <select className={inputClass(errors.state)} value={form.state}
                          onChange={(e) => setField('state', e.target.value)}>
                          <option value="">Select state</option>
                          {STATES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="PIN code" error={errors.postal_code}>
                        <input className={inputClass(errors.postal_code)} value={form.postal_code} inputMode="numeric"
                          autoComplete="postal-code" maxLength={6}
                          onChange={(e) => setField('postal_code', e.target.value.replace(/\D/g, ''))} />
                      </Field>
                    </div>
                  )}
                </>
              )}
            </section>

            {/* 2. Payment */}
            <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center">2</span>
                <CreditCard size={20} className="text-blue-600" /> Payment method
              </h2>
              <div className="space-y-3">
                {options.map((o) => (
                  <label
                    key={o.id}
                    className={`flex items-start gap-3 rounded-lg border-2 p-4 ${
                      !o.enabled ? 'opacity-60 cursor-not-allowed border-gray-200'
                        : paymentMethod === o.id ? 'border-blue-600 bg-blue-50 cursor-pointer'
                        : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                    }`}
                  >
                    <input type="radio" name="payment" className="mt-1" disabled={!o.enabled}
                      checked={paymentMethod === o.id} onChange={() => setPaymentMethod(o.id)} />
                    {o.id === 'online' ? <CreditCard size={22} className="text-gray-700 mt-0.5" /> : <Wallet size={22} className="text-gray-700 mt-0.5" />}
                    <div>
                      <p className="font-semibold text-gray-900">{o.label}</p>
                      <p className="text-sm text-gray-600">{o.enabled ? o.description : o.reason}</p>
                    </div>
                  </label>
                ))}
              </div>
              <label className="block mt-5">
                <span className="block text-sm font-medium text-gray-700 mb-1">Delivery instructions (optional)</span>
                <textarea className={inputClass()} rows={2} maxLength={300} value={notes}
                  placeholder="e.g. Leave with the security guard" onChange={(e) => setNotes(e.target.value)} />
              </label>
            </section>
          </div>

          {/* Summary */}
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:sticky lg:top-20">
              <h2 className="text-xl font-bold mb-4">Order summary</h2>

              <div className="space-y-3 max-h-64 overflow-y-auto pr-1 mb-4">
                {(quote?.lines || []).map((l) => (
                  <div key={l.sku_code} className="flex gap-3 text-sm">
                    <div className="w-12 h-12 rounded bg-gray-100 overflow-hidden shrink-0">
                      {l.image && <img src={l.image} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 line-clamp-2">{l.product_name}</p>
                      <p className="text-gray-500">Qty {l.quantity} × {formatINR(l.unit_price)}</p>
                    </div>
                    <p className="font-semibold">{formatINR(l.line_total)}</p>
                  </div>
                ))}
                {!quote && loadingQuote && <div className="h-16 bg-gray-100 rounded animate-pulse" />}
              </div>

              {/* Coupon */}
              <div className="border-t border-gray-200 pt-4 mb-4">
                {quote?.coupon ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm">
                    <span className="flex items-center gap-2 text-green-800 font-medium">
                      <BadgeCheck size={16} /> {quote.coupon.code} applied
                    </span>
                    <button onClick={() => { setAppliedCoupon(''); setCouponInput('') }} aria-label="Remove coupon"
                      className="text-green-800 hover:text-green-950"><X size={16} /></button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag size={16} className="absolute left-3 top-3 text-gray-400" />
                      <input className={`${inputClass()} pl-9 uppercase`} placeholder="Coupon code" value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && applyCoupon()} />
                    </div>
                    <button onClick={applyCoupon} className="px-4 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700">
                      Apply
                    </button>
                  </div>
                )}
              </div>

              {totals && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600">Subtotal ({totals.total_items} items)</span><span>{formatINR(totals.subtotal)}</span></div>
                  {Number(totals.discount) > 0 && (
                    <div className="flex justify-between text-green-700"><span>Coupon discount</span><span>−{formatINR(totals.discount)}</span></div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivery</span>
                    <span>{Number(totals.shipping) === 0 ? <span className="text-green-700 font-medium">FREE</span> : formatINR(totals.shipping)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500"><span>{totals.prices_include_gst ? 'Includes GST' : 'GST'} ({Number(totals.gst_percent)}%)</span><span>{formatINR(totals.gst_amount ?? totals.gst_included)}</span></div>
                  <div className="border-t border-gray-200 pt-3 mt-2 flex justify-between items-baseline">
                    <span className="text-lg font-bold">Total</span>
                    <span className="text-2xl font-bold text-blue-600">{formatINR(totals.total)}</span>
                  </div>
                  {Number(totals.savings) > 0 && (
                    <p className="text-green-700 text-xs font-medium">You save {formatINR(totals.savings)} on this order</p>
                  )}
                  {Number(totals.shipping) > 0 && (
                    <p className="text-xs text-gray-500">Add {formatINR(Number(totals.free_shipping_threshold) - (Number(totals.subtotal) - Number(totals.discount)))} more for free delivery</p>
                  )}
                </div>
              )}

              {formError && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm" role="alert">{formError}</div>
              )}

              <button
                onClick={placeOrder}
                disabled={placing || loadingQuote || !quote?.can_place}
                className="mt-5 w-full bg-blue-600 text-white py-3.5 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {placing ? <><Loader2 size={18} className="animate-spin" /> Placing order…</>
                  : paymentMethod === 'cod' ? 'Place order' : `Pay ${totals ? formatINR(totals.total) : ''}`}
              </button>
              <p className="mt-3 text-xs text-gray-500 flex items-center justify-center gap-1.5">
                <Truck size={14} /> Standard delivery in 3–5 business days
              </p>
              <Link to="/cart" className="block text-center text-sm text-blue-600 hover:underline mt-3">← Back to cart</Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

export default CheckoutPage
