export interface OrderItem {
  id: string
  product_name: string
  variant_name: string
  sku_code: string
  quantity: number
  unit_price: string | number
  line_total: string | number
}

export interface OrderAddress {
  full_name: string
  phone: string
  line1: string
  line2: string
  city: string
  state: string
  postal_code: string
}

export interface OrderDetail {
  id: string
  order_number: string
  status: string
  status_display: string
  payment_status: string
  payment_status_display: string
  total_items: number
  subtotal: string | number
  discount_amount: string | number
  tax_amount: string | number
  shipping_cost: string | number
  order_total: string | number
  shipping_method: string
  coupon_code: string | null
  prices_include_gst: boolean
  shipment: { courier: string; tracking_number: string; tracking_url: string; status: string; shipped_at: string | null; estimated_delivery: string | null } | null
  items: OrderItem[]
  shipping_address: OrderAddress | null
  payment: { method: 'cod' | 'online'; status: string; amount: string | number } | null
  status_history: Array<{ id: string; new_status: string; reason: string; created_at: string }>
  can_cancel: boolean
  needs_payment: boolean
  created_at: string
}

export interface PaymentIntent {
  provider: 'razorpay' | 'mock'
  order_number: string
  gateway_order_id: string
  amount: string | number
  amount_paise: number
  currency: string
  key_id: string
  business_name: string
  prefill: { name: string; email: string; contact: string }
}

export const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-300',
  confirmed: 'bg-blue-50 text-blue-700 border-blue-300',
  processing: 'bg-blue-50 text-blue-700 border-blue-300',
  shipped: 'bg-purple-50 text-purple-700 border-purple-300',
  delivered: 'bg-green-50 text-green-700 border-green-300',
  cancelled: 'bg-red-50 text-red-700 border-red-300',
}

export const apiErrorMessage = (err: any, fallback = 'Something went wrong. Please try again.'): string =>
  err?.response?.data?.message || err?.response?.data?.detail || err?.message || fallback
