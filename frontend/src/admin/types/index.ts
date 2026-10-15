// ─── Shared types for the admin panel (match the Django /api/v1/admin/ responses) ───

export interface Page<T> {
  success: boolean;
  count: number;
  page: number;
  pages: number;
  page_size: number;
  results: T[];
}

export interface AdminUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  is_superuser: boolean;
}

export type OrderStatus =
  | 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered'
  | 'cancelled' | 'return_requested' | 'returned';

export interface OrderRow {
  id: string;
  order_number: string;
  status: OrderStatus;
  status_display: string;
  payment_status: string;
  payment_status_display: string;
  payment_method: 'cod' | 'online' | null;
  total_items: number;
  order_total: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  city: string;
  allowed_next_statuses: OrderStatus[];
}

export interface OrderDetail extends OrderRow {
  subtotal: string;
  discount_amount: string;
  tax_amount: string;
  shipping_cost: string;
  coupon_code: string | null;
  notes: string;
  items: Array<{
    id: string; product_name: string; variant_name: string; sku_code: string;
    quantity: number; unit_price: string; line_total: string;
  }>;
  shipping_address: {
    full_name: string; phone: string; line1: string; line2: string;
    city: string; state: string; postal_code: string;
  } | null;
  history: Array<{ id: string; old_status: string | null; new_status: string; reason: string; by: string; at: string }>;
  shipment: Shipment | null;
}

export interface Shipment {
  courier: string;
  tracking_number: string;
  tracking_url: string;
  status: string;
  shipped_at: string | null;
  estimated_delivery: string | null;
}

export interface TrackingInput {
  courier: string;
  tracking_number?: string;
  tracking_url?: string;
  estimated_delivery?: string;
}

export interface ProductRow {
  id: string;
  name: string;
  slug: string;
  brand: string;
  status: 'draft' | 'active' | 'discontinued';
  category_id: string;
  category_name: string;
  image_url: string | null;
  min_price: string | null;
  max_price: string | null;
  total_stock: number;
  option_count: number;
  stock_state: 'ok' | 'low' | 'out';
  created_at: string;
}

export interface ProductOption {
  variant_id?: string;
  sku_id?: string;
  name: string;
  sku_code: string;
  price: string | number;
  mrp: string | number;
  stock: string | number;
  active: boolean;
}

export interface ProductDetail extends ProductRow {
  description: string;
  short_description: string;
  images: string[];
  options: ProductOption[];
}

export interface ProductInput {
  name: string;
  category_id: string;
  status: string;
  brand: string;
  description: string;
  short_description: string;
  images: string[];
  options: ProductOption[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  display_order: number;
  product_count: number;
}

export interface StockRow {
  sku_id: string;
  sku_code: string;
  product_id: string;
  product_name: string;
  variant_name: string;
  price: string;
  stock: number;
  on_hand: number;
  state: 'ok' | 'low' | 'out';
  active: boolean;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  is_staff: boolean;
  joined: string;
  order_count: number;
  total_spent: string;
  last_login: string | null;
  orders?: Array<{ order_number: string; status: string; status_display: string; order_total: string; created_at: string }>;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: string;
  max_discount_amount: string | null;
  min_order_value: string;
  max_usage_limit: number | null;
  usage_per_user_limit: number;
  is_first_order_only: boolean;
  is_active: boolean;
  valid_from: string;
  valid_until: string;
  times_used: number;
  state: 'live' | 'scheduled' | 'expired' | 'inactive';
}

export interface Dashboard {
  days: number;
  kpis: {
    revenue: string; revenue_change: number | null;
    orders: number; orders_change: number | null;
    avg_order_value: string; new_customers: number; pending_orders: number;
    low_stock_items: number; total_customers: number;
  };
  chart: Array<{ date: string; revenue: string; orders: number }>;
  top_products: Array<{ name: string; units: number; revenue: string }>;
  low_stock: Array<{ sku_code: string; product_name: string; variant_name: string; stock: number }>;
  orders_by_status: Record<string, number>;
  recent_orders: OrderRow[];
}

export interface StoreSettings {
  gst_percent: string;
  prices_include_gst: boolean;
  free_shipping_threshold: string;
  shipping_flat_fee: string;
  cod_enabled: boolean;
  cod_max_order_value: string;
  online_payments_enabled: boolean;
  max_qty_per_item: number;
  support_email: string;
  support_phone: string;
  store_address: string;
  announcement_enabled: boolean;
  announcement_text: string;
  legal_name: string;
  gstin: string;
  business_state: string;
  invoice_note: string;
  updated_at: string | null;
  updated_by: string | null;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  link_url: string;
  button_text: string;
  is_active: boolean;
  display_order: number;
  valid_from: string;
  valid_until: string | null;
  state: 'live' | 'scheduled' | 'expired' | 'off';
}

export interface EditablePage {
  slug: string;
  label: string;
  title: string;
  content: string;
  is_published: boolean;
  updated_at: string | null;
}

// Older sample-data shapes, still used by utils/mockData.ts and the KPICard component
export type { KPI, Product, Order, InventoryItem, Promotion, SalesDataPoint, CategorySplit } from './legacy';
