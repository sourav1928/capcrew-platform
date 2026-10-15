import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Package, Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import {
  useCategories, useDeleteCategory, useDeleteProduct, useProduct, useProducts, useSaveCategory, useSaveProduct,
} from '../../hooks/useAdminQueries';
import { errorMessage, fieldErrors } from '../../services';
import type { Category, ProductInput, ProductOption } from '../../types';
import { formatINR } from '../../../utils/format';
import ImageUploader from '../shared/ImageUploader';
import { useToast } from '../shared/Toast';
import {
  Button, Card, Confirm, EmptyState, ErrorBox, Field, Modal, PageBar, Pagination, Pill, SearchBox, Select, Spinner,
  Table, inputCls, stockLabel, stockTone, useDebounced,
} from '../shared/ui';

const statusTone = (s: string) => (s === 'active' ? 'green' : s === 'draft' ? 'amber' : 'gray') as 'green' | 'amber' | 'gray';
const statusLabel = (s: string) => (s === 'active' ? 'Live on website' : s === 'draft' ? 'Hidden (draft)' : 'Discontinued');

const AdminProducts: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'products' | 'categories'>(pathname.endsWith('/categories') ? 'categories' : 'products');
  const [editing, setEditing] = useState<string | 'new' | null>(pathname.endsWith('/new') ? 'new' : null);

  useEffect(() => {
    setTab(pathname.endsWith('/categories') ? 'categories' : 'products');
    if (pathname.endsWith('/new')) setEditing('new');
  }, [pathname]);

  const closeForm = () => { setEditing(null); if (pathname.endsWith('/new')) navigate('/admin/products', { replace: true }); };

  return (
    <div>
      <div className="flex gap-1 border-b border-gray-200 mb-5">
        {([['products', 'Products', Package], ['categories', 'Categories', Tags]] as const).map(([k, label, Icon]) => (
          <button key={k} onClick={() => { setTab(k); navigate(k === 'products' ? '/admin/products' : '/admin/products/categories'); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px ${tab === k ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>
      {tab === 'products' ? <ProductList onEdit={setEditing} /> : <CategoryList />}
      {editing && <ProductForm id={editing === 'new' ? undefined : editing} onClose={closeForm} />}
    </div>
  );
};

// ─── Product list ─────────────────────────────────────────────────────────────
const ProductList: React.FC<{ onEdit: (id: string | 'new') => void }> = ({ onEdit }) => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');
  const [stock, setStock] = useState('all');
  const [page, setPage] = useState(1);
  const [removing, setRemoving] = useState<{ id: string; name: string } | null>(null);
  const q = useDebounced(search);
  const [sp] = useSearchParams();
  useEffect(() => setPage(1), [q, status, category, stock]);
  const { data, isLoading, error, refetch } = useProducts({ search: q, status, category, stock: stock === 'all' ? undefined : stock, page });
  const { data: cats } = useCategories();
  const del = useDeleteProduct();
  const { addToast } = useToast();
  void sp;

  return (
    <>
      <PageBar>
        <SearchBox value={search} onChange={setSearch} placeholder="Search name, brand or code" />
        <Select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">All categories</option>{(cats || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">Any visibility</option><option value="active">Live on website</option><option value="draft">Hidden (draft)</option><option value="discontinued">Discontinued</option>
        </Select>
        <Select value={stock} onChange={(e) => setStock(e.target.value)}>
          <option value="all">Any stock</option><option value="low">Running low</option><option value="out">Out of stock</option>
        </Select>
        <div className="sm:ml-auto"><Button onClick={() => onEdit('new')}><Plus className="w-4 h-4" /> Add product</Button></div>
      </PageBar>
      <Card pad={false}>
        {isLoading ? <Spinner /> : error ? <div className="p-4"><ErrorBox message={errorMessage(error)} onRetry={() => refetch()} /></div> :
          !data || data.results.length === 0 ? (
            <EmptyState icon={<Package className="w-6 h-6" />} title="No products yet" hint="Add your first product and it will appear on your website."
              action={<Button onClick={() => onEdit('new')}><Plus className="w-4 h-4" /> Add product</Button>} />
          ) : (
            <>
              <Table head={['Product', 'Category', 'Price', 'Stock', 'Visibility', '']} right={[2, 3]}>
                {data.results.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-lg bg-gray-100 overflow-hidden shrink-0">{p.image_url && <img src={p.image_url} alt="" className="w-full h-full object-cover" />}</div>
                        <div><p className="font-medium text-gray-900">{p.name}</p><p className="text-xs text-gray-400">{p.brand || '—'}{p.option_count > 1 ? ` · ${p.option_count} options` : ''}</p></div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.category_name}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">{p.min_price ? formatINR(p.min_price) : '—'}{p.max_price && p.max_price !== p.min_price ? ` – ${formatINR(p.max_price)}` : ''}</td>
                    <td className="px-4 py-3 text-right"><span className="font-semibold mr-2">{p.total_stock}</span><Pill tone={stockTone(p.stock_state)}>{stockLabel(p.stock_state)}</Pill></td>
                    <td className="px-4 py-3"><Pill tone={statusTone(p.status)}>{statusLabel(p.status)}</Pill></td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Button size="sm" variant="secondary" onClick={() => onEdit(p.id)}><Pencil className="w-3.5 h-3.5" /> Edit</Button>{' '}
                      <Button size="sm" variant="ghost" onClick={() => setRemoving({ id: p.id, name: p.name })} aria-label="Delete"><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    </td>
                  </tr>
                ))}
              </Table>
              <Pagination page={data.page} pages={data.pages} count={data.count} onPage={setPage} />
            </>
          )}
      </Card>
      {removing && (
        <Confirm danger title={`Remove “${removing.name}”?`} confirmLabel="Yes, remove" loading={del.isPending}
          message="It will disappear from your website. Past orders keep their details. If you only want to hide it for a while, edit it and set it to “Hidden (draft)” instead."
          onCancel={() => setRemoving(null)}
          onConfirm={() => del.mutate(removing.id, { onSuccess: () => { addToast('Product removed', 'success'); setRemoving(null); }, onError: (e) => { addToast(errorMessage(e), 'error'); setRemoving(null); } })} />
      )}
    </>
  );
};

// ─── Add / edit a product ────────────────────────────────────────────────────
const blankOption = (): ProductOption => ({ name: 'Standard', sku_code: '', price: '', mrp: '', stock: 0, active: true });
const blank: ProductInput = { name: '', category_id: '', status: 'active', brand: '', description: '', short_description: '', images: [], options: [blankOption()] };

const ProductForm: React.FC<{ id?: string; onClose: () => void }> = ({ id, onClose }) => {
  const { data: existing, isLoading } = useProduct(id);
  const { data: cats } = useCategories();
  const save = useSaveProduct();
  const { addToast } = useToast();
  const [f, setF] = useState<ProductInput>(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (existing) setF({
      name: existing.name, category_id: existing.category_id, status: existing.status, brand: existing.brand,
      description: existing.description, short_description: existing.short_description, images: existing.images || [],
      options: existing.options,
    });
  }, [existing]);
  useEffect(() => { if (!id && cats && cats.length && !f.category_id) setF((x) => ({ ...x, category_id: cats[0].id })); }, [id, cats, f.category_id]);

  const set = <K extends keyof ProductInput>(k: K, v: ProductInput[K]) => { setF((x) => ({ ...x, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })); };
  const setOpt = (i: number, patch: Partial<ProductOption>) => setF((x) => ({ ...x, options: x.options.map((o, j) => (j === i ? { ...o, ...patch } : o)) }));
  const optErr = (i: number, k: string) => errors[`options.${i}.${k}`];

  const submit = () => {
    setErrors({}); setMsg('');
    save.mutate({ id, body: f }, {
      onSuccess: () => { addToast(id ? 'Product saved' : 'Product added to your store', 'success'); onClose(); },
      onError: (e) => { setMsg(errorMessage(e)); setErrors(fieldErrors(e)); },
    });
  };

  if (id && isLoading) return <Modal wide title="Edit product" onClose={onClose}><Spinner /></Modal>;
  return (
    <Modal wide title={id ? 'Edit product' : 'Add a product'} onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={save.isPending} onClick={submit}>{id ? 'Save changes' : 'Add product'}</Button></>}>
      <div className="space-y-5">
        {msg && <ErrorBox message={msg} />}
        {cats && cats.length === 0 && <ErrorBox message="Create a category first (Products → Categories tab)." />}
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Product name" error={errors.name} className="sm:col-span-2"><input className={inputCls(errors.name)} value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. 6-Socket Surge Protector" /></Field>
          <Field label="Category" error={errors.category_id}>
            <select className={inputCls(errors.category_id)} value={f.category_id} onChange={(e) => set('category_id', e.target.value)}>
              <option value="">Choose…</option>{(cats || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Brand (optional)"><input className={inputCls()} value={f.brand} onChange={(e) => set('brand', e.target.value)} /></Field>
          <Field label="Short line shown on the product card" className="sm:col-span-2"><input className={inputCls()} maxLength={200} value={f.short_description} onChange={(e) => set('short_description', e.target.value)} /></Field>
          <Field label="Full description" className="sm:col-span-2"><textarea rows={4} className={inputCls()} value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
          <div className="sm:col-span-2">
            <ImageUploader label="Product photos" images={f.images} onChange={(v) => set('images', v)} />
            {errors.images && <p className="text-xs text-red-600 mt-1">{errors.images}</p>}
          </div>
          <Field label="Show on website?" hint="Hidden products cannot be bought" error={errors.status}>
            <select className={inputCls(errors.status)} value={f.status} onChange={(e) => set('status', e.target.value)}>
              <option value="active">Live – customers can buy it</option><option value="draft">Hidden (draft)</option><option value="discontinued">Discontinued</option>
            </select>
          </Field>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div><h4 className="font-semibold text-gray-900">Prices & stock</h4><p className="text-xs text-gray-400">One row per version of the product (for example different colours or sizes).</p></div>
            <Button size="sm" variant="secondary" onClick={() => set('options', [...f.options, blankOption()])}><Plus className="w-3.5 h-3.5" /> Add option</Button>
          </div>
          {errors.options && <p className="text-xs text-red-600 mb-2">{errors.options}</p>}
          <div className="space-y-3">
            {f.options.map((o, i) => (
              <div key={i} className={`rounded-lg border p-3 ${o.active ? 'border-gray-200' : 'border-gray-200 bg-gray-50 opacity-70'}`}>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <Field label="Option name" className="col-span-2 sm:col-span-1"><input className={inputCls()} value={o.name} onChange={(e) => setOpt(i, { name: e.target.value })} /></Field>
                  <Field label="Selling price ₹" error={optErr(i, 'price')}><input type="number" min="0" className={inputCls(optErr(i, 'price'))} value={o.price} onChange={(e) => setOpt(i, { price: e.target.value })} /></Field>
                  <Field label="MRP ₹" error={optErr(i, 'mrp')} hint="Crossed-out price"><input type="number" min="0" className={inputCls(optErr(i, 'mrp'))} value={o.mrp} onChange={(e) => setOpt(i, { mrp: e.target.value })} /></Field>
                  <Field label="In stock" error={optErr(i, 'stock')}><input type="number" min="0" className={inputCls(optErr(i, 'stock'))} value={o.stock} onChange={(e) => setOpt(i, { stock: e.target.value })} /></Field>
                  <Field label="Product code" error={optErr(i, 'sku_code')} hint="Leave blank to auto-create"><input className={inputCls(optErr(i, 'sku_code'))} value={o.sku_code} onChange={(e) => setOpt(i, { sku_code: e.target.value })} /></Field>
                </div>
                {f.options.length > 1 && (
                  <button className="mt-2 text-xs text-red-600 hover:underline"
                    onClick={() => (o.sku_id ? setOpt(i, { active: !o.active }) : set('options', f.options.filter((_, j) => j !== i)))}>
                    {o.sku_id ? (o.active ? 'Hide this option' : 'Show this option again') : 'Remove this option'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};

// ─── Categories ───────────────────────────────────────────────────────────────
const CategoryList: React.FC = () => {
  const { data, isLoading, error, refetch } = useCategories();
  const save = useSaveCategory();
  const del = useDeleteCategory();
  const { addToast } = useToast();
  const [edit, setEdit] = useState<Partial<Category> | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [removing, setRemoving] = useState<Category | null>(null);

  const submit = () => {
    if (!edit) return;
    save.mutate({ id: edit.id, body: { name: edit.name, description: edit.description, is_active: edit.is_active ?? true } }, {
      onSuccess: () => { addToast('Category saved', 'success'); setEdit(null); setErrors({}); },
      onError: (e) => setErrors({ name: fieldErrors(e).name || errorMessage(e) }),
    });
  };

  return (
    <>
      <PageBar><div className="sm:ml-auto"><Button onClick={() => { setEdit({ name: '', description: '', is_active: true }); setErrors({}); }}><Plus className="w-4 h-4" /> Add category</Button></div></PageBar>
      <Card pad={false}>
        {isLoading ? <Spinner /> : error ? <div className="p-4"><ErrorBox message={errorMessage(error)} onRetry={() => refetch()} /></div> :
          !data || data.length === 0 ? <EmptyState icon={<Tags className="w-6 h-6" />} title="No categories yet" hint="Categories group your products on the website, like “Solid Caps”." /> : (
            <Table head={['Category', 'Products', 'Visible', '']} right={[1]}>
              {data.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3"><p className="font-medium text-gray-900">{c.name}</p>{c.description && <p className="text-xs text-gray-400">{c.description}</p>}</td>
                  <td className="px-4 py-3 text-right">{c.product_count}</td>
                  <td className="px-4 py-3"><Pill tone={c.is_active ? 'green' : 'gray'}>{c.is_active ? 'Shown' : 'Hidden'}</Pill></td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Button size="sm" variant="secondary" onClick={() => { setEdit(c); setErrors({}); }}><Pencil className="w-3.5 h-3.5" /> Edit</Button>{' '}
                    <Button size="sm" variant="ghost" onClick={() => setRemoving(c)} aria-label="Delete"><Trash2 className="w-4 h-4 text-red-500" /></Button>
                  </td>
                </tr>
              ))}
            </Table>
          )}
      </Card>
      {edit && (
        <Modal title={edit.id ? 'Edit category' : 'Add category'} onClose={() => setEdit(null)}
          footer={<><Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button><Button loading={save.isPending} onClick={submit}>Save</Button></>}>
          <div className="space-y-4">
            <Field label="Name" error={errors.name}><input autoFocus className={inputCls(errors.name)} value={edit.name || ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Description (optional)"><input className={inputCls()} value={edit.description || ''} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={edit.is_active ?? true} onChange={(e) => setEdit({ ...edit, is_active: e.target.checked })} /> Show this category on the website</label>
          </div>
        </Modal>
      )}
      {removing && (
        <Confirm danger title={`Delete “${removing.name}”?`} confirmLabel="Delete" loading={del.isPending}
          message={removing.product_count > 0 ? 'This category still has products, so it cannot be deleted. Move the products first, or just hide the category.' : 'This cannot be undone.'}
          onCancel={() => setRemoving(null)}
          onConfirm={() => del.mutate(removing.id, { onSuccess: () => { addToast('Category deleted', 'success'); setRemoving(null); }, onError: (e) => { addToast(errorMessage(e), 'error'); setRemoving(null); } })} />
      )}
    </>
  );
};

export default AdminProducts;
