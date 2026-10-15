import React, { useEffect, useState } from 'react';
import { ExternalLink, Lock } from 'lucide-react';
import { useSaveSettings, useSettings } from '../../hooks/useAdminQueries';
import { errorMessage, fieldErrors } from '../../services';
import type { StoreSettings } from '../../types';
import { formatDateTime } from '../../../utils/format';
import { useAdminUser } from '../shared/AdminGuard';
import { useToast } from '../shared/Toast';
import { Button, Card, ErrorBox, Field, Spinner, inputCls } from '../shared/ui';

const API = ((import.meta as any).env.VITE_API_URL || 'http://localhost:8001/api/v1').replace(/\/api\/v1\/?$/, '');

type Form = {
  gst_percent: string; prices_include_gst: boolean; free_shipping_threshold: string; shipping_flat_fee: string;
  cod_enabled: boolean; cod_max_order_value: string; online_payments_enabled: boolean; max_qty_per_item: string;
  support_email: string; support_phone: string; store_address: string; announcement_enabled: boolean; announcement_text: string;
  legal_name: string; gstin: string; business_state: string; invoice_note: string;
};
const toForm = (s: StoreSettings): Form => ({
  gst_percent: String(Number(s.gst_percent)), prices_include_gst: s.prices_include_gst,
  free_shipping_threshold: String(Number(s.free_shipping_threshold)), shipping_flat_fee: String(Number(s.shipping_flat_fee)),
  cod_enabled: s.cod_enabled, cod_max_order_value: String(Number(s.cod_max_order_value)),
  online_payments_enabled: s.online_payments_enabled, max_qty_per_item: String(s.max_qty_per_item),
  support_email: s.support_email, support_phone: s.support_phone, store_address: s.store_address,
  announcement_enabled: s.announcement_enabled, announcement_text: s.announcement_text,
  legal_name: s.legal_name, gstin: s.gstin, business_state: s.business_state, invoice_note: s.invoice_note,
});

const STATES = ['Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'];

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }> = ({ checked, onChange, label, hint, disabled }) => (
  <label className={`flex items-start gap-3 ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
    <input type="checkbox" className="mt-1 h-4 w-4" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
    <span><span className="block text-sm font-medium text-gray-800">{label}</span>{hint && <span className="block text-xs text-gray-500">{hint}</span>}</span>
  </label>
);

const AdminSettings: React.FC = () => {
  const me = useAdminUser();
  const { data, isLoading, error, refetch } = useSettings();
  const save = useSaveSettings();
  const { addToast } = useToast();
  const [f, setF] = useState<Form | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  const canEdit = !!me?.is_superuser;

  useEffect(() => { if (data) setF(toForm(data)); }, [data]);
  if (isLoading || !f) return error ? <ErrorBox message={errorMessage(error)} onRetry={() => refetch()} /> : <Spinner />;

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setF((x) => (x ? { ...x, [k]: v } : x)); setErrors((e) => ({ ...e, [k]: '' })); };
  const dirty = JSON.stringify(f) !== JSON.stringify(toForm(data!));

  const submit = () => {
    setErrors({}); setMsg('');
    save.mutate({ ...f, max_qty_per_item: Number(f.max_qty_per_item) } as any, {
      onSuccess: () => addToast('Settings saved. Your website is updated.', 'success'),
      onError: (e) => { setMsg(errorMessage(e)); setErrors(fieldErrors(e)); },
    });
  };

  const gst = Number(f.gst_percent) || 0;
  const example = f.prices_include_gst
    ? `A ₹1,000 product still costs ₹1,000. It contains ₹${((1000 * gst) / (100 + gst)).toFixed(2)} of GST.`
    : `A ₹1,000 product costs ₹${(1000 + (1000 * gst) / 100).toFixed(2)} at checkout (₹1,000 + ₹${((1000 * gst) / 100).toFixed(2)} GST).`;

  return (
    <div className="space-y-6 max-w-3xl pb-24">
      {!canEdit && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-sm p-4">
          <Lock className="w-4 h-4" /> You can look at these settings, but only the store owner can change them.
        </div>
      )}
      {msg && <ErrorBox message={msg} />}

      <Card title="Tax (GST)">
        <div className="space-y-4">
          <Field label="GST rate (%)" error={errors.gst_percent} hint="For example 5, 12 or 18">
            <input type="number" min="0" max="100" step="0.01" disabled={!canEdit} className={`${inputCls(errors.gst_percent)} max-w-[10rem]`} value={f.gst_percent} onChange={(e) => set('gst_percent', e.target.value)} />
          </Field>
          <Toggle disabled={!canEdit} checked={f.prices_include_gst} onChange={(v) => set('prices_include_gst', v)}
            label="Prices already include GST" hint="Switch off if your listed prices are before tax and GST should be added at checkout." />
          <p className="text-sm rounded-lg bg-blue-50 text-blue-800 px-3 py-2">{example}</p>
        </div>
      </Card>

      <Card title="Delivery charges">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Free delivery on orders of (₹)" error={errors.free_shipping_threshold} hint="Set to 0 to always give free delivery">
            <input type="number" min="0" disabled={!canEdit} className={inputCls(errors.free_shipping_threshold)} value={f.free_shipping_threshold} onChange={(e) => set('free_shipping_threshold', e.target.value)} />
          </Field>
          <Field label="Delivery fee below that (₹)" error={errors.shipping_flat_fee}>
            <input type="number" min="0" disabled={!canEdit} className={inputCls(errors.shipping_flat_fee)} value={f.shipping_flat_fee} onChange={(e) => set('shipping_flat_fee', e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card title="Payment options">
        <div className="space-y-4">
          <Toggle disabled={!canEdit} checked={f.online_payments_enabled} onChange={(v) => set('online_payments_enabled', v)} label="Online payment (UPI, cards, net banking)" hint="Switch off if your payment gateway is down." />
          <Toggle disabled={!canEdit} checked={f.cod_enabled} onChange={(v) => set('cod_enabled', v)} label="Cash on Delivery" />
          <Field label="Cash on Delivery allowed up to (₹)" error={errors.cod_max_order_value} hint="Bigger orders must be paid online">
            <input type="number" min="0" disabled={!canEdit || !f.cod_enabled} className={`${inputCls(errors.cod_max_order_value)} max-w-[14rem]`} value={f.cod_max_order_value} onChange={(e) => set('cod_max_order_value', e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card title="Cart">
        <Field label="Most units of one product per order" error={errors.max_qty_per_item} hint="Stops accidental huge orders">
          <input type="number" min="1" disabled={!canEdit} className={`${inputCls(errors.max_qty_per_item)} max-w-[10rem]`} value={f.max_qty_per_item} onChange={(e) => set('max_qty_per_item', e.target.value)} />
        </Field>
      </Card>

      <Card title="Banner at the top of your website">
        <div className="space-y-4">
          <Toggle disabled={!canEdit} checked={f.announcement_enabled} onChange={(v) => set('announcement_enabled', v)} label="Show the banner" />
          <Field label="Message" error={errors.announcement_text} hint="For example: Free delivery on all orders this weekend!">
            <input maxLength={200} disabled={!canEdit} className={inputCls(errors.announcement_text)} value={f.announcement_text} onChange={(e) => set('announcement_text', e.target.value)} />
          </Field>
          {f.announcement_enabled && f.announcement_text && <div className="bg-blue-600 text-white text-center text-sm font-medium px-4 py-2 rounded">{f.announcement_text}</div>}
        </div>
      </Card>

      <Card title="Contact details (shown in your website footer)">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Support email" error={errors.support_email}><input type="email" disabled={!canEdit} className={inputCls(errors.support_email)} value={f.support_email} onChange={(e) => set('support_email', e.target.value)} /></Field>
          <Field label="Support phone" error={errors.support_phone}><input disabled={!canEdit} className={inputCls(errors.support_phone)} value={f.support_phone} onChange={(e) => set('support_phone', e.target.value)} /></Field>
          <Field label="Store address" error={errors.store_address} className="sm:col-span-2"><input disabled={!canEdit} className={inputCls(errors.store_address)} value={f.store_address} onChange={(e) => set('store_address', e.target.value)} /></Field>
        </div>
      </Card>

      <Card title="Business details (printed on invoices)">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Registered business name" error={errors.legal_name} hint="Appears at the top of every invoice"><input disabled={!canEdit} className={inputCls(errors.legal_name)} value={f.legal_name} onChange={(e) => set('legal_name', e.target.value)} /></Field>
          <Field label="GSTIN" error={errors.gstin} hint="15 letters and numbers, e.g. 29ABCDE1234F1Z5"><input disabled={!canEdit} className={`${inputCls(errors.gstin)} uppercase`} maxLength={15} value={f.gstin} onChange={(e) => set('gstin', e.target.value)} /></Field>
          <Field label="Your state" error={errors.business_state} hint="Decides CGST + SGST (same state) or IGST (other states)">
            <select disabled={!canEdit} className={inputCls(errors.business_state)} value={f.business_state} onChange={(e) => set('business_state', e.target.value)}>
              <option value="">Choose…</option>{STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Message at the bottom of the invoice" error={errors.invoice_note}><input disabled={!canEdit} className={inputCls(errors.invoice_note)} value={f.invoice_note} onChange={(e) => set('invoice_note', e.target.value)} /></Field>
        </div>
      </Card>

      <Card title="Your account">
        <p className="text-sm text-gray-700"><span className="text-gray-400">Signed in as</span> <strong>{me?.email}</strong> · {me?.is_superuser ? 'Owner' : 'Staff member'}</p>
        <p className="text-sm text-gray-500 mt-3">The Django admin has every technical table. Only the owner should use it.</p>
        <a href={`${API}/admin/`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-blue-600 font-semibold hover:underline mt-1 text-sm">Open Django admin <ExternalLink className="w-4 h-4" /></a>
      </Card>

      {canEdit && (
        <div className="fixed bottom-0 right-0 left-0 lg:left-64 bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between gap-3 z-20">
          <span className="text-xs text-gray-400">{data?.updated_at ? `Last saved ${formatDateTime(data.updated_at)}${data.updated_by ? ` by ${data.updated_by}` : ''}` : 'Not changed yet'}</span>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={!dirty} onClick={() => { setF(toForm(data!)); setErrors({}); setMsg(''); }}>Undo changes</Button>
            <Button loading={save.isPending} disabled={!dirty} onClick={submit}>Save settings</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
