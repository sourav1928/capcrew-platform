import React, { useState } from 'react';
import { Pencil, Plus, Tag, Trash2 } from 'lucide-react';
import { useCoupons, useDeleteCoupon, useSaveCoupon } from '../../hooks/useAdminQueries';
import { errorMessage, fieldErrors } from '../../services';
import type { Coupon } from '../../types';
import { formatDate, formatINR } from '../../../utils/format';
import { useToast } from '../shared/Toast';
import { Button, Card, Confirm, EmptyState, ErrorBox, Field, Modal, PageBar, Pill, SearchBox, Spinner, Table, inputCls, useDebounced } from '../shared/ui';

const stateTone = { live: 'green', scheduled: 'blue', expired: 'gray', inactive: 'amber' } as const;
const stateLabel = { live: 'Live', scheduled: 'Starts later', expired: 'Expired', inactive: 'Switched off' } as const;
const toLocal = (iso: string) => { const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
const inDays = (n: number) => toLocal(new Date(Date.now() + n * 864e5).toISOString());
const describe = (c: Coupon) => (c.discount_type === 'percentage' ? `${Number(c.discount_value)}% off` : `${formatINR(c.discount_value)} off`)
  + (c.max_discount_amount ? ` (up to ${formatINR(c.max_discount_amount)})` : '') + (Number(c.min_order_value) > 0 ? ` on orders above ${formatINR(c.min_order_value)}` : '');

type Form = { id?: string; code: string; description: string; discount_type: string; discount_value: string; max_discount_amount: string; min_order_value: string; max_usage_limit: string; usage_per_user_limit: string; is_first_order_only: boolean; is_active: boolean; valid_from: string; valid_until: string };
const blank = (): Form => ({ code: '', description: '', discount_type: 'percentage', discount_value: '', max_discount_amount: '', min_order_value: '', max_usage_limit: '', usage_per_user_limit: '1', is_first_order_only: false, is_active: true, valid_from: inDays(0), valid_until: inDays(30) });
const fromCoupon = (c: Coupon): Form => ({ id: c.id, code: c.code, description: c.description, discount_type: c.discount_type, discount_value: String(Number(c.discount_value)), max_discount_amount: c.max_discount_amount ? String(Number(c.max_discount_amount)) : '', min_order_value: Number(c.min_order_value) ? String(Number(c.min_order_value)) : '', max_usage_limit: c.max_usage_limit ? String(c.max_usage_limit) : '', usage_per_user_limit: String(c.usage_per_user_limit), is_first_order_only: c.is_first_order_only, is_active: c.is_active, valid_from: toLocal(c.valid_from), valid_until: toLocal(c.valid_until) });

const AdminPromotions: React.FC = () => {
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const { data, isLoading, error, refetch } = useCoupons({ search: q });
  const save = useSaveCoupon();
  const del = useDeleteCoupon();
  const { addToast } = useToast();
  const [form, setForm] = useState<Form | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  const [removing, setRemoving] = useState<Coupon | null>(null);

  const submit = () => {
    if (!form) return;
    setErrors({}); setMsg('');
    const body = {
      code: form.code, description: form.description, discount_type: form.discount_type, discount_value: form.discount_value,
      max_discount_amount: form.max_discount_amount || null, min_order_value: form.min_order_value || 0,
      max_usage_limit: form.max_usage_limit || null, usage_per_user_limit: form.usage_per_user_limit || 1,
      is_first_order_only: form.is_first_order_only, is_active: form.is_active,
      valid_from: new Date(form.valid_from).toISOString(), valid_until: new Date(form.valid_until).toISOString(),
    };
    save.mutate({ id: form.id, body }, {
      onSuccess: () => { addToast('Coupon saved', 'success'); setForm(null); },
      onError: (e) => { setMsg(errorMessage(e)); setErrors(fieldErrors(e)); },
    });
  };
  const set = (k: keyof Form, v: string | boolean) => { setForm((f) => (f ? { ...f, [k]: v } : f)); setErrors((e) => ({ ...e, [k]: '' })); };

  return (
    <div>
      <PageBar>
        <SearchBox value={search} onChange={setSearch} placeholder="Search coupon code" />
        <div className="sm:ml-auto"><Button onClick={() => { setForm(blank()); setErrors({}); setMsg(''); }}><Plus className="w-4 h-4" /> Create coupon</Button></div>
      </PageBar>
      <Card pad={false}>
        {isLoading ? <Spinner /> : error ? <div className="p-4"><ErrorBox message={errorMessage(error)} onRetry={() => refetch()} /></div> :
          !data || data.results.length === 0 ? <EmptyState icon={<Tag className="w-6 h-6" />} title="No coupons yet" hint="Create a code like WELCOME10 and customers can use it at checkout." /> : (
            <Table head={['Code', 'Offer', 'Valid', 'Used', 'Status', '']} right={[3]}>
              {data.results.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-mono font-bold text-gray-900">{c.code}</td>
                  <td className="px-4 py-3 text-gray-700">{describe(c)}{c.is_first_order_only && <span className="text-xs text-gray-400"> · first order only</span>}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(c.valid_from)} → {formatDate(c.valid_until)}</td>
                  <td className="px-4 py-3 text-right">{c.times_used}{c.max_usage_limit ? ` / ${c.max_usage_limit}` : ''}</td>
                  <td className="px-4 py-3"><Pill tone={stateTone[c.state]}>{stateLabel[c.state]}</Pill></td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Button size="sm" variant="secondary" onClick={() => { setForm(fromCoupon(c)); setErrors({}); setMsg(''); }}><Pencil className="w-3.5 h-3.5" /> Edit</Button>{' '}
                    <Button size="sm" variant="ghost" onClick={() => setRemoving(c)} aria-label="Delete"><Trash2 className="w-4 h-4 text-red-500" /></Button>
                  </td>
                </tr>
              ))}
            </Table>
          )}
      </Card>

      {form && (
        <Modal wide title={form.id ? `Edit ${form.code}` : 'Create a coupon'} onClose={() => setForm(null)}
          footer={<><Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button><Button loading={save.isPending} onClick={submit}>Save coupon</Button></>}>
          <div className="space-y-4">
            {msg && <ErrorBox message={msg} />}
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Coupon code" error={errors.code} hint="Customers type this at checkout"><input className={`${inputCls(errors.code)} uppercase`} value={form.code} onChange={(e) => set('code', e.target.value)} placeholder="WELCOME10" /></Field>
              <Field label="Description (optional)"><input className={inputCls()} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="10% off for new customers" /></Field>
              <Field label="Type of discount"><select className={inputCls()} value={form.discount_type} onChange={(e) => set('discount_type', e.target.value)}><option value="percentage">Percentage off</option><option value="fixed">Fixed ₹ amount off</option></select></Field>
              <Field label={form.discount_type === 'percentage' ? 'Percent off' : 'Rupees off'} error={errors.discount_value}><input type="number" min="0" className={inputCls(errors.discount_value)} value={form.discount_value} onChange={(e) => set('discount_value', e.target.value)} /></Field>
              {form.discount_type === 'percentage' && <Field label="Maximum discount ₹ (optional)" error={errors.max_discount_amount}><input type="number" min="0" className={inputCls(errors.max_discount_amount)} value={form.max_discount_amount} onChange={(e) => set('max_discount_amount', e.target.value)} /></Field>}
              <Field label="Minimum order ₹ (optional)" error={errors.min_order_value}><input type="number" min="0" className={inputCls(errors.min_order_value)} value={form.min_order_value} onChange={(e) => set('min_order_value', e.target.value)} /></Field>
              <Field label="Starts" error={errors.valid_from}><input type="datetime-local" className={inputCls(errors.valid_from)} value={form.valid_from} onChange={(e) => set('valid_from', e.target.value)} /></Field>
              <Field label="Ends" error={errors.valid_until}><input type="datetime-local" className={inputCls(errors.valid_until)} value={form.valid_until} onChange={(e) => set('valid_until', e.target.value)} /></Field>
              <Field label="Total uses allowed (optional)" error={errors.max_usage_limit}><input type="number" min="1" className={inputCls(errors.max_usage_limit)} value={form.max_usage_limit} onChange={(e) => set('max_usage_limit', e.target.value)} /></Field>
              <Field label="Uses per customer" error={errors.usage_per_user_limit}><input type="number" min="1" className={inputCls(errors.usage_per_user_limit)} value={form.usage_per_user_limit} onChange={(e) => set('usage_per_user_limit', e.target.value)} /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.is_first_order_only} onChange={(e) => set('is_first_order_only', e.target.checked)} /> Only for a customer’s first order</label>
            <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} /> Coupon is switched on</label>
          </div>
        </Modal>
      )}
      {removing && (
        <Confirm danger title={`Delete ${removing.code}?`} confirmLabel="Delete" loading={del.isPending}
          message={removing.times_used > 0 ? 'This coupon was already used, so it will be switched off instead of deleted.' : 'This cannot be undone.'}
          onCancel={() => setRemoving(null)}
          onConfirm={() => del.mutate(removing.id, { onSuccess: () => { addToast('Done', 'success'); setRemoving(null); }, onError: (e) => { addToast(errorMessage(e), 'error'); setRemoving(null); } })} />
      )}
    </div>
  );
};

export default AdminPromotions;
