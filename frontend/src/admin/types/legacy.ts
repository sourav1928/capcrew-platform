// ─── Shared types for the admin panel ─────────────────────────────────────────

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type ProductStatus = 'active' | 'inactive' | 'discontinued' | 'draft';

export interface KPI {
  label: string;
  value: string;
  subtext: string;
  delta: number; // % change, positive = up
  trend: 'up' | 'down' | 'neutral';
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  mrp: number;
  stock: number;
  status: ProductStatus;
  image?: string;
  rating: number;
  reviewCount: number;
  lastUpdated: string;
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  attributes: Record<string, string>;
}

export interface Order {
  id: string;
  orderNumber: string;
  customer: string;
  email: string;
  phone: string;
  items: number;
  total: number;
  status: OrderStatus;
  paymentStatus: 'paid' | 'pending' | 'failed' | 'refunded';
  createdAt: string;
  updatedAt: string;
  address: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  orderCount: number;
  totalSpend: number;
  lastOrder: string;
  joinDate: string;
  status: 'active' | 'inactive' | 'blocked';
  avatar?: string;
}

export interface InventoryItem {
  id: string;
  productName: string;
  sku: string;
  category: string;
  stockLevel: number;
  reorderPoint: number;
  maxStock: number;
  unitCost: number;
  totalValue: number;
  lastRestocked: string;
  supplier: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstocked';
}

export interface Promotion {
  id: string;
  name: string;
  code: string;
  type: 'percentage' | 'fixed' | 'free_shipping' | 'buy_x_get_y';
  value: number;
  minOrderAmount: number;
  maxDiscount?: number;
  usageLimit: number;
  usedCount: number;
  validFrom: string;
  validTo: string;
  status: 'active' | 'inactive' | 'expired' | 'scheduled';
  applicableTo: 'all' | 'category' | 'product';
}

export interface SalesDataPoint {
  date: string;
  revenue: number;
  orders: number;
  units: number;
}

export interface CategorySplit {
  name: string;
  revenue: number;
  percentage: number;
  color: string;
}
