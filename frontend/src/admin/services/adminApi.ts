import type { AxiosInstance } from 'axios';
import type {
  AdminUser, Banner, Category, Coupon, Customer, Dashboard, OrderDetail, OrderRow, Page,
  EditablePage, ProductDetail, ProductInput, ProductRow, StockRow, StoreSettings, TrackingInput,
} from '../types';

type Params = Record<string, string | number | undefined>;

/** Everything the admin panel can do. Each call hits the real Django API under /api/v1/admin/. */
export class AdminApiClient {
  constructor(private client: AxiosInstance) {}

  private async get<T>(url: string, params?: Params): Promise<T> {
    return (await this.client.get(`/admin${url}`, { params })).data;
  }
  private async data<T>(promise: Promise<{ data: { data: T } }>): Promise<T> {
    return (await promise).data.data;
  }

  me() { return this.data<AdminUser>(this.client.get('/admin/me/')); }
  dashboard(days = 30) { return this.data<Dashboard>(this.client.get('/admin/dashboard/', { params: { days } })); }

  // Orders
  getOrders(params?: Params) { return this.get<Page<OrderRow>>('/orders/', params); }
  getOrder(number: string) { return this.data<OrderDetail>(this.client.get(`/admin/orders/${number}/`)); }
  updateOrder(number: string, body: { status?: string; payment_status?: string; notes?: string; note?: string; tracking?: TrackingInput }) {
    return this.data<OrderDetail>(this.client.patch(`/admin/orders/${number}/`, body));
  }
  createOrder(body: unknown) { return this.data<OrderDetail>(this.client.post('/admin/orders/', body)); }

  // Products & categories
  getProducts(params?: Params) { return this.get<Page<ProductRow>>('/products/', params); }
  getProduct(id: string) { return this.data<ProductDetail>(this.client.get(`/admin/products/${id}/`)); }
  createProduct(body: ProductInput) { return this.data<ProductDetail>(this.client.post('/admin/products/', body)); }
  updateProduct(id: string, body: Partial<ProductInput>) {
    return this.data<ProductDetail>(this.client.patch(`/admin/products/${id}/`, body));
  }
  deleteProduct(id: string) { return this.client.delete(`/admin/products/${id}/`); }

  getCategories() { return this.data<Category[]>(this.client.get('/admin/categories/')); }
  createCategory(body: Partial<Category>) { return this.data<Category>(this.client.post('/admin/categories/', body)); }
  updateCategory(id: string, body: Partial<Category>) { return this.data<Category>(this.client.patch(`/admin/categories/${id}/`, body)); }
  deleteCategory(id: string) { return this.client.delete(`/admin/categories/${id}/`); }

  // Stock
  getStock(params?: Params) { return this.get<Page<StockRow>>('/inventory/', params); }
  adjustStock(body: { sku_code: string; change?: number; set_to?: number; notes?: string }) {
    return this.data<StockRow>(this.client.post('/admin/inventory/adjust/', body));
  }

  // Customers
  getCustomers(params?: Params) { return this.get<Page<Customer>>('/customers/', params); }
  getCustomer(id: number) { return this.data<Customer>(this.client.get(`/admin/customers/${id}/`)); }
  updateCustomer(id: number, body: { is_active?: boolean; is_staff?: boolean }) {
    return this.data<Customer>(this.client.patch(`/admin/customers/${id}/`, body));
  }

  // Photos, banners, featured products, pages
  async uploadImage(file: File): Promise<string> {
    const form = new FormData();
    form.append('file', file);
    const res = await this.client.post('/admin/uploads/', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data.data.url as string;
  }
  getBanners() { return this.data<Banner[]>(this.client.get('/admin/banners/')); }
  createBanner(body: Partial<Banner>) { return this.data<Banner>(this.client.post('/admin/banners/', body)); }
  updateBanner(id: string, body: Partial<Banner>) { return this.data<Banner>(this.client.patch(`/admin/banners/${id}/`, body)); }
  deleteBanner(id: string) { return this.client.delete(`/admin/banners/${id}/`); }
  getFeatured() { return this.data<ProductRow[]>(this.client.get('/admin/featured/')); }
  saveFeatured(product_ids: string[]) { return this.client.put('/admin/featured/', { product_ids }); }
  getPages() { return this.data<EditablePage[]>(this.client.get('/admin/pages/')); }
  savePage(slug: string, body: { title: string; content: string; is_published: boolean }) {
    return this.data<EditablePage>(this.client.put(`/admin/pages/${slug}/`, body));
  }
  getInvoice(number: string) { return this.data<any>(this.client.get(`/admin/orders/${number}/invoice/`)); }
  bulkPrint(doc: 'label' | 'invoice', orders: string[]) {
    return this.data<{ doc: 'label' | 'invoice'; documents: any[]; skipped: Array<{ order_number: string; reason: string }> }>(
      this.client.get('/admin/orders/bulk-print/', { params: { doc, orders: orders.join(',') } }));
  }

  // Store settings
  getSettings() { return this.data<StoreSettings>(this.client.get('/admin/settings/')); }
  saveSettings(body: Partial<StoreSettings>) { return this.data<StoreSettings>(this.client.patch('/admin/settings/', body)); }

  // Coupons
  getCoupons(params?: Params) { return this.get<Page<Coupon>>('/coupons/', params); }
  createCoupon(body: Partial<Coupon>) { return this.data<Coupon>(this.client.post('/admin/coupons/', body)); }
  updateCoupon(id: string, body: Partial<Coupon>) { return this.data<Coupon>(this.client.patch(`/admin/coupons/${id}/`, body)); }
  deleteCoupon(id: string) { return this.client.delete(`/admin/coupons/${id}/`); }
}

/** Turn an API error into a sentence a shop owner can read. */
export const errorMessage = (err: any, fallback = 'Something went wrong. Please try again.'): string => {
  const data = err?.response?.data;
  if (data?.message) return data.message;
  if (data?.detail) return data.detail;
  if (err?.response?.status === 403) return 'You do not have permission to do that.';
  if (err?.message === 'Network Error') return 'Cannot reach the server. Is the backend running?';
  return fallback;
};

/** Field-level errors from the API, flattened to { fieldName: message }. */
export const fieldErrors = (err: any): Record<string, string> => {
  const raw = err?.response?.data?.errors || err?.response?.data?.details?.errors || {};
  const flat: Record<string, string> = {};
  const walk = (obj: any, prefix = '') => {
    Object.entries(obj || {}).forEach(([k, v]) => {
      if (typeof v === 'string') flat[prefix + k] = v;
      else if (Array.isArray(v)) flat[prefix + k] = String(v[0]);
      else if (v && typeof v === 'object') walk(v, `${prefix}${k}.`);
    });
  };
  walk(raw);
  return flat;
};
