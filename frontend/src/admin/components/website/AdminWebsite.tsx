import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FileText, Image as ImageIcon, Pencil, Plus, Star, Trash2, X } from 'lucide-react';
import { useBanners, useDeleteBanner, useFeatured, usePages, useProducts, useSaveBanner, useSaveFeatured, useSavePage } from '../../hooks/useAdminQueries';
import { errorMessage, fieldErrors } from '../../services';
import type { Banner, EditablePage } from '../../types';
import { formatDate, formatINR } from '../../../utils/format';
import ImageUploader from '../shared/ImageUploader';
import { useToast } from '../shared/Toast';
import { Button, Card, Confirm, EmptyState, ErrorBox, Field, Modal, Pill, SearchBox, Spinner, inputCls, useDebounced } from '../shared/ui';

const TABS = [['banners', 'Homepage banners', ImageIcon], ['featured', 'Featured products', Star], ['pages', 'Pages', FileText]] as const;
type Tab = typeof TABS[number][0];

const AdminWebsite: React.FC = () => {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const tab: Tab = pathname.endsWith('/featured') ? 'featured' : pathname.endsWith('/pages') ? 'pages' : 'banners';
  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">Change what visitors see on your website. Changes go live as soon as you save.</p>
      <div className="flex gap-1 border-b border-gray-200 mb-5 overflow-x-auto">
        {TABS.map(([k, label, Icon]) => (
          <button key={k} onClick={() => nav(k === 'banners' ? '/website' : `/website/${k}`)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap ${tab === k ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>
      {tab === 'banners' ? <Banners /> : tab === 'featured' ? <Featured /> : <Pages />}
    </div>
  );
};

// ─── Banners ──────────────────────────────────────────────────────────────────
const stateTone = { live: 'green', scheduled: 'blue', expired: 'gray', off: 'amber' } as const;
const stateLabel = { live: 'Showing now', scheduled: 'Starts later', expired: 'Ended', off: 'Switched off' } as const;
const toLocal = (iso?: string | null) => { if (!iso) return ''; const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

type BForm = { id?: string; title: string; subtitle: string; image: string[]; link_url: string; button_text: string; is_active: boolean; display_order: string; valid_from: string; valid_until: string };
const blankBanner = (n: number): BForm => ({ title: '', subtitle: '', image: [], link_url: '/products', button_text: 'Shop now', is_active: true, display_order: String(n), valid_from: '', valid_until: '' });

const Banners: React.FC = () => {
  const { data, isLoading, error, refetch } = useBanners();
  const save = useSaveBanner();
  const del = useDeleteBanner();
  const { addToast } = useToast();
  const [form, setForm] = useState<BForm | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  const [removing, setRemoving] = useState<Banner | null>(null);

  const edit = (b?: Banner) => {
    setErrors({}); setMsg('');
    setForm(b ? { id: b.id, title: b.title, subtitle: b.subtitle, image: [b.image_url], link_url: b.link_url, button_text: b.button_text, is_active: b.is_active, display_order: String(b.display_order), valid_from: toLocal(b.valid_from), valid_until: toLocal(b.valid_until) } : blankBanner((data?.length || 0) + 1));
  };
  const set = <K extends keyof BForm>(k: K, v: BForm[K]) => { setForm((f) => (f ? { ...f, [k]: v } : f)); setErrors((e) => ({ ...e, [k]: '' })); };
  const submit = () => {
    if (!form) return;
    setErrors({}); setMsg('');
    save.mutate({ id: form.id, body: {
      title: form.title, subtitle: form.subtitle, image_url: form.image[0] || '', link_url: form.link_url, button_text: form.button_text,
      is_active: form.is_active, display_order: form.display_order || 0,
      valid_from: form.valid_from ? new Date(form.valid_from).toISOString() : undefined,
      valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : '',
    } }, {
      onSuccess: () => { addToast('Banner saved', 'success'); setForm(null); },
      onError: (e) => { setMsg(errorMessage(e)); setErrors(fieldErrors(e)); },
    });
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <p className="text-sm text-gray-500">Big pictures at the top of your homepage. With two or more, they slide automatically. With none, the standard blue banner is shown.</p>
        <Button onClick={() => edit()}><Plus className="w-4 h-4" /> Add banner</Button>
      </div>
      {isLoading ? <Spinner /> : error ? <ErrorBox message={errorMessage(error)} onRetry={() => refetch()} /> :
        !data || data.length === 0 ? <Card><EmptyState icon={<ImageIcon className="w-6 h-6" />} title="No banners yet" hint="Add a picture and a headline, for example for a festival sale." action={<Button onClick={() => edit()}><Plus className="w-4 h-4" /> Add banner</Button>} /></Card> : (
          <div className="grid sm:grid-cols-2 gap-4">
            {data.map((b) => (
              <div key={b.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="relative h-36 bg-gray-100"><img src={b.image_url} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent p-4 text-white"><p className="font-bold">{b.title}</p><p className="text-xs opacity-90">{b.subtitle}</p></div></div>
                <div className="p-3 flex items-center justify-between gap-2">
                  <div className="text-xs text-gray-500"><Pill tone={stateTone[b.state]}>{stateLabel[b.state]}</Pill><span className="ml-2">Order {b.display_order}{b.valid_until ? ` · until ${formatDate(b.valid_until)}` : ''}</span></div>
                  <div className="whitespace-nowrap"><Button size="sm" variant="secondary" onClick={() => edit(b)}><Pencil className="w-3.5 h-3.5" /> Edit</Button>{' '}
                    <Button size="sm" variant="ghost" onClick={() => setRemoving(b)} aria-label="Delete"><Trash2 className="w-4 h-4 text-red-500" /></Button></div>
                </div>
              </div>
            ))}
          </div>
        )}
      {form && (
        <Modal wide title={form.id ? 'Edit banner' : 'Add a banner'} onClose={() => setForm(null)}
          footer={<><Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button><Button loading={save.isPending} onClick={submit}>Save banner</Button></>}>
          <div className="space-y-4">
            {msg && <ErrorBox message={msg} />}
            <div><ImageUploader label="Banner picture" images={form.image} max={1} onChange={(v) => set('image', v)} />
              {errors.image_url && <p className="text-xs text-red-600 mt-1">{errors.image_url}</p>}
              <p className="text-xs text-gray-400">Wide pictures work best (about 1600 × 600). Text is shown on the left, so keep that side simple.</p></div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Headline" error={errors.title} className="sm:col-span-2"><input className={inputCls(errors.title)} value={form.title} maxLength={80} onChange={(e) => set('title', e.target.value)} placeholder="Diwali Sale – up to 30% off" /></Field>
              <Field label="Smaller line (optional)" className="sm:col-span-2"><input className={inputCls()} value={form.subtitle} maxLength={120} onChange={(e) => set('subtitle', e.target.value)} /></Field>
              <Field label="Button text" hint="Leave empty for no button"><input className={inputCls()} value={form.button_text} maxLength={40} onChange={(e) => set('button_text', e.target.value)} /></Field>
              <Field label="Where the button goes" error={errors.link_url} hint="/products or a full https:// link"><input className={inputCls(errors.link_url)} value={form.link_url} onChange={(e) => set('link_url', e.target.value)} /></Field>
              <Field label="Show from (optional)" error={errors.valid_from}><input type="datetime-local" className={inputCls(errors.valid_from)} value={form.valid_from} onChange={(e) => set('valid_from', e.target.value)} /></Field>
              <Field label="Show until (optional)" error={errors.valid_until}><input type="datetime-local" className={inputCls(errors.valid_until)} value={form.valid_until} onChange={(e) => set('valid_until', e.target.value)} /></Field>
              <Field label="Position (1 = first)" error={errors.display_order}><input type="number" min="0" className={inputCls(errors.display_order)} value={form.display_order} onChange={(e) => set('display_order', e.target.value)} /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} /> Show this banner on the website</label>
          </div>
        </Modal>
      )}
      {removing && (
        <Confirm danger title="Delete this banner?" confirmLabel="Delete" loading={del.isPending} message={`“${removing.title}” will be removed from your homepage.`} onCancel={() => setRemoving(null)}
          onConfirm={() => del.mutate(removing.id, { onSuccess: () => { addToast('Banner deleted', 'success'); setRemoving(null); }, onError: (e) => { addToast(errorMessage(e), 'error'); setRemoving(null); } })} />
      )}
    </>
  );
};

// ─── Featured products ────────────────────────────────────────────────────────
const Featured: React.FC = () => {
  const { data, isLoading, error, refetch } = useFeatured();
  const save = useSaveFeatured();
  const { addToast } = useToast();
  const [ids, setIds] = useState<string[] | null>(null);
  const [names, setNames] = useState<Record<string, { name: string; price: string | null; image: string | null }>>({});
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const { data: found } = useProducts({ search: q, status: 'active', page_size: 8 });

  useEffect(() => {
    if (data && ids === null) {
      setIds(data.map((p) => p.id));
      setNames(Object.fromEntries(data.map((p) => [p.id, { name: p.name, price: p.min_price, image: p.image_url }])));
    }
  }, [data, ids]);
  if (isLoading || ids === null) return error ? <ErrorBox message={errorMessage(error)} onRetry={() => refetch()} /> : <Spinner />;

  const move = (i: number, d: number) => { const n = [...ids]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; setIds(n); };
  const dirty = JSON.stringify(ids) !== JSON.stringify(data?.map((p) => p.id) || []);

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card title={`On your homepage (${ids.length}/12)`}>
        {ids.length === 0 ? <p className="text-sm text-gray-500">Nothing chosen. Your homepage shows its normal product list. Add products on the right to show a “Featured Products” row at the top.</p> : (
          <ul className="space-y-2">
            {ids.map((id, i) => (
              <li key={id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-2">
                <div className="w-10 h-10 rounded bg-gray-100 overflow-hidden shrink-0">{names[id]?.image && <img src={names[id].image!} alt="" className="w-full h-full object-cover" />}</div>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-900 truncate">{names[id]?.name || 'Product'}</p>{names[id]?.price && <p className="text-xs text-gray-400">{formatINR(names[id].price!)}</p>}</div>
                <button onClick={() => move(i, -1)} disabled={i === 0} className="px-2 text-gray-500 disabled:opacity-30" aria-label="Move up">↑</button>
                <button onClick={() => move(i, 1)} disabled={i === ids.length - 1} className="px-2 text-gray-500 disabled:opacity-30" aria-label="Move down">↓</button>
                <button onClick={() => setIds(ids.filter((x) => x !== id))} className="text-red-500 hover:text-red-700" aria-label="Remove"><X className="w-4 h-4" /></button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex gap-2">
          <Button disabled={!dirty} loading={save.isPending} onClick={() => save.mutate(ids, { onSuccess: () => addToast('Featured products saved', 'success'), onError: (e) => addToast(errorMessage(e), 'error') })}>Save</Button>
          {ids.length > 0 && <Button variant="secondary" onClick={() => setIds([])}>Clear all</Button>}
        </div>
      </Card>
      <Card title="Add a product">
        <SearchBox value={search} onChange={setSearch} placeholder="Search your live products" />
        <ul className="mt-3 space-y-2">
          {(found?.results || []).map((p) => {
            const already = ids.includes(p.id);
            return (
              <li key={p.id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-2">
                <div className="w-10 h-10 rounded bg-gray-100 overflow-hidden shrink-0">{p.image_url && <img src={p.image_url} alt="" className="w-full h-full object-cover" />}</div>
                <p className="flex-1 text-sm font-medium text-gray-900 truncate">{p.name}</p>
                <Button size="sm" variant="secondary" disabled={already || ids.length >= 12}
                  onClick={() => { setIds([...ids, p.id]); setNames({ ...names, [p.id]: { name: p.name, price: p.min_price, image: p.image_url } }); }}>{already ? 'Added' : 'Add'}</Button>
              </li>
            );
          })}
          {found && found.results.length === 0 && <p className="text-sm text-gray-400">No live products match.</p>}
        </ul>
      </Card>
    </div>
  );
};

// ─── Pages ────────────────────────────────────────────────────────────────────
const Pages: React.FC = () => {
  const { data, isLoading, error, refetch } = usePages();
  const [open, setOpen] = useState<EditablePage | null>(null);
  if (isLoading) return <Spinner />;
  if (error || !data) return <ErrorBox message={errorMessage(error)} onRetry={() => refetch()} />;
  return (
    <>
      <p className="text-sm text-gray-500 mb-4">Write these pages in your own words. Until you publish your own text, the website keeps showing its built-in version.</p>
      <div className="grid sm:grid-cols-3 gap-4">
        {data.map((p) => (
          <div key={p.slug} className="bg-white rounded-xl border border-gray-100 p-5">
            <FileText className="w-6 h-6 text-gray-400 mb-3" />
            <p className="font-semibold text-gray-900">{p.label}</p>
            <div className="mt-1 mb-4"><Pill tone={p.is_published ? 'green' : 'gray'}>{p.is_published ? 'Your text is live' : 'Showing built-in text'}</Pill></div>
            <Button size="sm" variant="secondary" onClick={() => setOpen(p)}><Pencil className="w-3.5 h-3.5" /> Edit</Button>
          </div>
        ))}
      </div>
      {open && <PageEditor page={open} onClose={() => setOpen(null)} />}
    </>
  );
};

const PageEditor: React.FC<{ page: EditablePage; onClose: () => void }> = ({ page, onClose }) => {
  const save = useSavePage();
  const { addToast } = useToast();
  const [title, setTitle] = useState(page.title);
  const [content, setContent] = useState(page.content);
  const [publish, setPublish] = useState(page.is_published);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  const submit = () => {
    setErrors({}); setMsg('');
    save.mutate({ slug: page.slug, body: { title, content, is_published: publish } }, {
      onSuccess: () => { addToast(publish ? 'Page saved and live' : 'Page saved (not shown yet)', 'success'); onClose(); },
      onError: (e) => { setMsg(errorMessage(e)); setErrors(fieldErrors(e)); },
    });
  };
  return (
    <Modal wide title={`Edit: ${page.label}`} onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={save.isPending} onClick={submit}>Save</Button></>}>
      <div className="space-y-4">
        {msg && <ErrorBox message={msg} />}
        <Field label="Page title"><input className={inputCls()} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Page text" error={errors.content} hint="Leave a blank line between paragraphs. Start a line with # for a heading, or with - for a bullet list.">
          <textarea rows={14} className={`${inputCls(errors.content)} font-mono`} value={content} onChange={(e) => setContent(e.target.value)}
            placeholder={'# Our story\n\nWe started in 2010 with one shop...\n\n## Why customers trust us\n\n- Genuine ISI-marked products\n- Fast delivery'} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} /> Show my text on the website (otherwise the built-in page is shown)</label>
      </div>
    </Modal>
  );
};

export default AdminWebsite;
