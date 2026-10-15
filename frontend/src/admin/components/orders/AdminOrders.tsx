import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useCreateOrder, useOrder, useOrders, useUpdateOrder, useProducts } from '../../hooks/useAdminQueries';
import { adminApi, errorMessage, fieldErrors } from '../../services';
import type { OrderDetail, OrderStatus, StockRow, TrackingInput } from '../../types';
import { formatDateTime, formatINR } from '../../../utils/format';
import { useToast } from '../shared/Toast';
import {
  Button, Card, Confirm, Drawer, EmptyState, ErrorBox, Field, Modal, PageBar, Pagination, Pill, SearchBox, Select,
  Spinner, Table, inputCls, orderTone, paymentTone, useDebounced,
} from '../shared/ui';

const STATUS_FILTERS = [
  ['all', 'All orders'], ['pending', 'Waiting for payment'], ['confirmed', 'New (confirmed)'], ['processing', 'Packed'],
  ['shipped', 'Shipped'], ['delivered', 'Delivered'], ['cancelled', 'Cancelled'],
] as const;

const NEXT_LABEL: Record<string, string> = {
  confirmed: 'Confirm order', processing: 'Mark as packed', shipped: 'Mark as shipped', delivered: 'Mark as delivered',
  cancelled: 'Cancel order', return_requested: 'Customer asked to return', returned: 'Mark as returned',
};

const AdminOrders: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || 'all';
  const [search, setSearch] = useState('');
  const [payment, setPayment] = useState('all');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const q = useDebounced(search);

  useEffect(() => { setPage(1); setPicked([]); }, [status, payment, q]);
  const { data, isLoading, error, refetch } = useOrders({ status, payment_status: payment, search: q, page });
  const onPage = (data?.results || []).map((o) => o.order_number);
  const allPicked = onPage.length > 0 && onPage.every((n) => picked.includes(n));
  const toggle = (n: string) => setPicked((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n]));
  const printDocs = (doc: 'label' | 'invoice') => window.open(`/print?doc=${doc}&orders=${encodeURIComponent(picked.join(','))}`, '_blank');

  return (
    <div>
      <PageBar>
        <SearchBox value={search} onChange={setSearch} placeholder="Search order no., name, phone or email" />
        <Select value={status} onChange={(e) => setParams(e.target.value === 'all' ? {} : { status: e.target.value })}>
          {STATUS_FILTERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
        <Select value={payment} onChange={(e) => setPayment(e.target.value)}>
          <option value="all">Any payment</option><option value="paid">Paid</option><option value="pending">Payment pending</option><option value="failed">Payment failed</option>
        </Select>
        <div className="sm:ml-auto"><Button onClick={() => setCreating(true)}><Plus className="w-4 h-4" /> Create order</Button></div>
      </PageBar>

      <Card pad={false}>
        {isLoading ? <Spinner /> : error ? <div className="p-4"><ErrorBox message={errorMessage(error)} onRetry={() => refetch()} /></div> :
          !data || data.results.length === 0 ? (
            <EmptyState icon={<ShoppingBag className="w-6 h-6" />} title="No orders found" hint="Orders placed on your website will show up here automatically." />
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50/60 text-sm">
                <label className="flex items-center gap-2 text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={allPicked} onChange={() => setPicked(allPicked ? picked.filter((n) => !onPage.includes(n)) : Array.from(new Set([...picked, ...onPage])))} />
                  Select all on this page
                </label>
                {picked.length > 0 ? (
                  <>
                    <span className="font-semibold text-gray-900">{picked.length} selected</span>
                    <Button size="sm" onClick={() => printDocs('label')}>Print shipping labels</Button>
                    <Button size="sm" variant="secondary" onClick={() => printDocs('invoice')}>Print invoices</Button>
                    <button className="text-gray-500 hover:underline" onClick={() => setPicked([])}>Clear</button>
                  </>
                ) : (
                  <span className="text-gray-400">Tick orders to print their shipping labels and invoices together.</span>
                )}
              </div>
              <Table head={['', 'Order', 'Customer', 'Date', 'Items', 'Total', 'Payment', 'Status']} right={[4, 5]}>
                {data.results.map((o) => (
                  <tr key={o.id} onClick={() => setOpen(o.order_number)} className="hover:bg-blue-50/40 cursor-pointer">
                    <td className="pl-4 pr-0 py-3 w-8" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={picked.includes(o.order_number)} onChange={() => toggle(o.order_number)} aria-label={`Select ${o.order_number}`} />
                    </td>
                    <td className="px-4 py-3 font-semibold text-blue-700">{o.order_number}</td>
                    <td className="px-4 py-3"><p className="font-medium text-gray-900">{o.customer_name || '—'}</p><p className="text-xs text-gray-400">{o.customer_email}</p></td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDateTime(o.created_at)}</td>
                    <td className="px-4 py-3 text-right">{o.total_items}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatINR(o.order_total)}</td>
                    <td className="px-4 py-3"><Pill tone={paymentTone(o.payment_status)}>{o.payment_method === 'cod' ? 'COD · ' : ''}{o.payment_status_display}</Pill></td>
                    <td className="px-4 py-3"><Pill tone={orderTone(o.status)}>{o.status_display}</Pill></td>
                  </tr>
                ))}
              </Table>
              <Pagination page={data.page} pages={data.pages} count={data.count} onPage={setPage} />
            </>
          )}
      </Card>

      {open && <OrderDrawer number={open} onClose={() => setOpen(null)} />}
      {creating && <CreateOrderModal onClose={() => setCreating(false)} onCreated={(n) => { setCreating(false); setOpen(n); }} />}
    </div>
  );
};

// ─── One order ────────────────────────────────────────────────────────────────
const OrderDrawer: React.FC<{ number: string; onClose: () => void }> = ({ number, onClose }) => {
  const { data: order, isLoading, error } = useOrder(number);
  const update = useUpdateOrder();
  const { addToast } = useToast();
  const [confirm, setConfirm] = useState<OrderStatus | null>(null);
  const [notes, setNotes] = useState<string | null>(null);
  const [tracking, setTracking] = useState(false);

  const run = (body: Parameters<typeof update.mutate>[0]['body'], ok: string) =>
    update.mutate({ number, body }, {
      onSuccess: () => { addToast(ok, 'success'); setConfirm(null); setNotes(null); },
      onError: (e) => { addToast(errorMessage(e), 'error'); setConfirm(null); },
    });

  return (
    <Drawer title={`Order ${number}`} onClose={onClose}>
      {isLoading ? <Spinner /> : error || !order ? <ErrorBox message={errorMessage(error, 'Could not load this order.')} /> : (
        <div className="space-y-5 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={orderTone(order.status)}>{order.status_display}</Pill>
            <Pill tone={paymentTone(order.payment_status)}>{order.payment_method === 'cod' ? 'Cash on Delivery · ' : 'Online · '}{order.payment_status_display}</Pill>
            <span className="text-gray-400 ml-auto">{formatDateTime(order.created_at)}</span>
          </div>

          {order.allowed_next_statuses.length > 0 && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
              <p className="font-semibold text-gray-800 mb-2">What do you want to do?</p>
              <div className="flex flex-wrap gap-2">
                {order.allowed_next_statuses.map((s) => (
                  <Button key={s} size="sm" variant={s === 'cancelled' ? 'danger' : 'primary'} loading={update.isPending && update.variables?.body.status === s}
                    onClick={() => (s === 'cancelled' ? setConfirm(s) : s === 'shipped' ? setTracking(true) : run({ status: s }, `Order marked ${s.replace('_', ' ')}`))}>
                    {NEXT_LABEL[s] || s}
                  </Button>
                ))}
                {order.payment_status !== 'paid' && order.status !== 'cancelled' && (
                  <Button size="sm" variant="success" onClick={() => run({ payment_status: 'paid' }, 'Payment marked as received')}>Mark payment received</Button>
                )}
              </div>
            </div>
          )}

          {order.status !== 'pending' && order.status !== 'cancelled' && (
            <div className="flex flex-wrap gap-2">
              {['confirmed', 'processing', 'shipped'].includes(order.status) && (
                <a href={`/print?doc=label&orders=${order.order_number}`} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-gray-900 text-white px-4 py-2 font-semibold hover:bg-gray-700">
                  Print shipping label
                </a>
              )}
              <a href={`/print?doc=invoice&orders=${order.order_number}`} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50">
                Print invoice
              </a>
            </div>
          )}

          {order.shipment && (
            <Section title="Shipment">
              <div className="rounded-lg border border-gray-200 p-3 flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">{order.shipment.courier}</p>
                  {!order.shipment.tracking_number.startsWith('OWN-') && <p className="text-gray-600">Tracking no: <span className="font-mono select-all">{order.shipment.tracking_number}</span></p>}
                  {order.shipment.tracking_url && <a className="text-blue-600 hover:underline text-xs" href={order.shipment.tracking_url} target="_blank" rel="noreferrer">Open tracking page</a>}
                </div>
                {order.status === 'shipped' && <Button size="sm" variant="secondary" onClick={() => setTracking(true)}>Edit</Button>}
              </div>
            </Section>
          )}

          <Section title="Customer & delivery">
            <p className="font-medium text-gray-900">{order.shipping_address?.full_name || order.customer_name}</p>
            <p className="text-gray-600">{order.customer_email}</p>
            {order.shipping_address && (
              <p className="text-gray-600 mt-1">
                {order.shipping_address.line1}{order.shipping_address.line2 ? `, ${order.shipping_address.line2}` : ''}<br />
                {order.shipping_address.city}, {order.shipping_address.state} – {order.shipping_address.postal_code}<br />
                Phone: {order.shipping_address.phone}
              </p>
            )}
          </Section>

          <Section title={`Items (${order.total_items})`}>
            <div className="divide-y divide-gray-100">
              {order.items.map((i) => (
                <div key={i.id} className="py-2 flex justify-between gap-3">
                  <div><p className="font-medium text-gray-900">{i.product_name}</p><p className="text-xs text-gray-400">{i.variant_name} · {i.sku_code} · {i.quantity} × {formatINR(i.unit_price)}</p></div>
                  <p className="font-semibold">{formatINR(i.line_total)}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
              <Row l="Subtotal" v={formatINR(order.subtotal)} />
              {Number(order.discount_amount) > 0 && <Row l={`Discount${order.coupon_code ? ` (${order.coupon_code})` : ''}`} v={`−${formatINR(order.discount_amount)}`} />}
              <Row l="Delivery" v={Number(order.shipping_cost) === 0 ? 'Free' : formatINR(order.shipping_cost)} />
              <Row l="GST included" v={formatINR(order.tax_amount)} muted />
              <Row l="Total" v={formatINR(order.order_total)} bold />
            </div>
          </Section>

          <Section title="Internal notes">
            <textarea rows={3} className={inputCls()} placeholder="Notes only your team can see (e.g. customer asked to call first)"
              value={notes ?? order.notes} onChange={(e) => setNotes(e.target.value)} />
            {notes !== null && notes !== order.notes && (
              <Button className="mt-2" size="sm" loading={update.isPending} onClick={() => run({ notes }, 'Notes saved')}>Save notes</Button>
            )}
          </Section>

          <Section title="History">
            <ol className="space-y-2">
              {order.history.map((h) => (
                <li key={h.id} className="flex gap-3">
                  <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  <div><p className="text-gray-800"><span className="font-medium">{h.new_status.replace('_', ' ')}</span>{h.reason ? ` – ${h.reason}` : ''}</p>
                    <p className="text-xs text-gray-400">{h.by} · {formatDateTime(h.at)}</p></div>
                </li>
              ))}
            </ol>
          </Section>
        </div>
      )}
      {tracking && (
        <TrackingModal order={order!} saving={update.isPending}
          onClose={() => setTracking(false)}
          onSave={(t) => update.mutate(
            { number, body: order!.status === 'shipped' ? { tracking: t } : { status: 'shipped', tracking: t } },
            { onSuccess: () => { addToast('Shipping details saved. Print the label again so it carries the tracking barcode.', 'success'); setTracking(false); }, onError: (e) => addToast(errorMessage(e), 'error') })} />
      )}
      {confirm && (
        <Confirm danger title="Cancel this order?" confirmLabel="Yes, cancel order" loading={update.isPending}
          message="The items will go back into stock. If the customer already paid, remember to refund them."
          onConfirm={() => run({ status: 'cancelled' }, 'Order cancelled')} onCancel={() => setConfirm(null)} />
      )}
    </Drawer>
  );
};

const COURIERS = ['Delhivery', 'Blue Dart', 'DTDC', 'India Post', 'Ecom Express', 'Xpressbees', 'Shadowfax', 'FedEx', 'Own delivery'];

const TrackingModal: React.FC<{ order: OrderDetail; saving: boolean; onClose: () => void; onSave: (t: TrackingInput) => void }> = ({ order, saving, onClose, onSave }) => {
  const s = order.shipment;
  const [courier, setCourier] = useState(s?.courier || 'Delhivery');
  const [number, setNumber] = useState(s && !s.tracking_number.startsWith('OWN-') ? s.tracking_number : '');
  const [url, setUrl] = useState('');
  const [eta, setEta] = useState(s?.estimated_delivery || '');
  const [error, setError] = useState('');
  const own = courier === 'Own delivery';

  const submit = () => {
    if (!own && !number.trim()) { setError('Enter the tracking number from the courier receipt.'); return; }
    onSave({ courier, tracking_number: own ? '' : number.trim(), tracking_url: url.trim(), estimated_delivery: eta || undefined });
  };
  return (
    <Modal title={order.status === 'shipped' ? 'Edit shipping details' : 'Mark as shipped'} onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={saving} onClick={submit}>{order.status === 'shipped' ? 'Save' : 'Mark as shipped'}</Button></>}>
      <div className="space-y-4">
        <p className="text-sm text-gray-500">The customer will see these details on their order page.</p>
        <Field label="Courier company">
          <select className={inputCls()} value={courier} onChange={(e) => setCourier(e.target.value)}>{COURIERS.map((c) => <option key={c}>{c}</option>)}</select>
        </Field>
        {!own && (
          <>
            <Field label="Tracking number" error={error}>
              <input autoFocus className={inputCls(error)} value={number} onChange={(e) => { setNumber(e.target.value); setError(''); }} placeholder="From the courier receipt" />
            </Field>
            <Field label="Tracking link (optional)" hint="Delhivery and FedEx links are made automatically. For others you can paste the courier’s tracking page.">
              <input className={inputCls()} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
            </Field>
          </>
        )}
        <Field label="Expected delivery date (optional)"><input type="date" className={inputCls()} value={eta} onChange={(e) => setEta(e.target.value)} /></Field>
      </div>
    </Modal>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div><h4 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">{title}</h4>{children}</div>
);
const Row: React.FC<{ l: string; v: string; bold?: boolean; muted?: boolean }> = ({ l, v, bold, muted }) => (
  <div className={`flex justify-between ${bold ? 'font-bold text-base text-gray-900' : muted ? 'text-gray-400' : 'text-gray-600'}`}><span>{l}</span><span>{v}</span></div>
);

// ─── Create an order for a customer ──────────────────────────────────────────
interface Line { sku_code: string; label: string; price: number; quantity: number }
const CreateOrderModal: React.FC<{ onClose: () => void; onCreated: (n: string) => void }> = ({ onClose, onCreated }) => {
  const create = useCreateOrder();
  const { addToast } = useToast();
  const [cust, setCust] = useState({ name: '', email: '', phone: '' });
  const [addr, setAddr] = useState({ line1: '', line2: '', city: '', state: '', postal_code: '' });
  const [lines, setLines] = useState<Line[]>([]);
  const [markPaid, setMarkPaid] = useState(false);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  const [find, setFind] = useState('');
  const [options, setOptions] = useState<StockRow[]>([]);
  const q = useDebounced(find);
  const total = useMemo(() => lines.reduce((s, l) => s + l.price * l.quantity, 0), [lines]);

  useEffect(() => {
    if (q.trim().length < 2) { setOptions([]); return; }
    adminApi.getStock({ search: q, page_size: 8 }).then((r) => setOptions(r.results.filter((x) => x.active && x.stock > 0))).catch(() => setOptions([]));
  }, [q]);

  const addLine = (s: StockRow) => {
    setLines((cur) => cur.find((l) => l.sku_code === s.sku_code) ? cur.map((l) => l.sku_code === s.sku_code ? { ...l, quantity: l.quantity + 1 } : l)
      : [...cur, { sku_code: s.sku_code, label: `${s.product_name} (${s.variant_name})`, price: Number(s.price), quantity: 1 }]);
    setFind(''); setOptions([]);
  };

  const submit = () => {
    setErrors({}); setMsg('');
    create.mutate({
      customer: cust, address: { ...addr, full_name: cust.name, phone: cust.phone }, mark_paid: markPaid, notes,
      items: lines.map((l) => ({ sku_code: l.sku_code, quantity: l.quantity })),
    }, {
      onSuccess: (o: OrderDetail) => { addToast(`Order ${o.order_number} created`, 'success'); onCreated(o.order_number); },
      onError: (e) => { setMsg(errorMessage(e)); setErrors(fieldErrors(e)); },
    });
  };
  const err = (k: string) => errors[k] || errors[`customer.${k}`];

  return (
    <Modal wide title="Create an order for a customer" onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button loading={create.isPending} disabled={lines.length === 0} onClick={submit}>Create order · {formatINR(total)}</Button></>}>
      <div className="space-y-5">
        <p className="text-sm text-gray-500">Use this for phone or walk-in orders. The order is paid by Cash on Delivery unless you tick “already paid”.</p>
        {msg && <ErrorBox message={msg} />}
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Customer name" error={err('full_name')}><input className={inputCls(err('full_name'))} value={cust.name} onChange={(e) => setCust({ ...cust, name: e.target.value })} /></Field>
          <Field label="Email" error={err('email')}><input className={inputCls(err('email'))} type="email" value={cust.email} onChange={(e) => setCust({ ...cust, email: e.target.value })} /></Field>
          <Field label="Mobile number" error={err('phone')}><input className={inputCls(err('phone'))} value={cust.phone} onChange={(e) => setCust({ ...cust, phone: e.target.value })} /></Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Address" error={err('line1')} className="sm:col-span-2"><input className={inputCls(err('line1'))} value={addr.line1} onChange={(e) => setAddr({ ...addr, line1: e.target.value })} /></Field>
          <Field label="City" error={err('city')}><input className={inputCls(err('city'))} value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} /></Field>
          <Field label="State" error={err('state')}><input className={inputCls(err('state'))} placeholder="e.g. Haryana" value={addr.state} onChange={(e) => setAddr({ ...addr, state: e.target.value })} /></Field>
          <Field label="PIN code" error={err('postal_code')}><input className={inputCls(err('postal_code'))} value={addr.postal_code} maxLength={6} onChange={(e) => setAddr({ ...addr, postal_code: e.target.value.replace(/\D/g, '') })} /></Field>
        </div>

        <div>
          <Field label="Add products"><input className={inputCls()} placeholder="Type a product name or code…" value={find} onChange={(e) => setFind(e.target.value)} /></Field>
          {options.length > 0 && (
            <div className="mt-1 border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
              {options.map((s) => (
                <button key={s.sku_id} onClick={() => addLine(s)} className="w-full text-left px-3 py-2 hover:bg-blue-50 flex justify-between text-sm">
                  <span>{s.product_name} <span className="text-gray-400">({s.variant_name})</span></span><span className="text-gray-500">{formatINR(s.price)} · {s.stock} in stock</span>
                </button>
              ))}
            </div>
          )}
          {lines.length > 0 && (
            <div className="mt-3 border border-gray-200 rounded-lg divide-y divide-gray-100">
              {lines.map((l) => (
                <div key={l.sku_code} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <span className="flex-1">{l.label}</span>
                  <input type="number" min={1} value={l.quantity} className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                    onChange={(e) => setLines(lines.map((x) => x.sku_code === l.sku_code ? { ...x, quantity: Math.max(1, parseInt(e.target.value) || 1) } : x))} />
                  <span className="w-24 text-right font-semibold">{formatINR(l.price * l.quantity)}</span>
                  <button onClick={() => setLines(lines.filter((x) => x.sku_code !== l.sku_code))} className="text-red-500 hover:text-red-700" aria-label="Remove"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={markPaid} onChange={(e) => setMarkPaid(e.target.checked)} /> Customer has already paid</label>
        <Field label="Notes (optional)"><input className={inputCls()} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      </div>
    </Modal>
  );
};

export default AdminOrders;
