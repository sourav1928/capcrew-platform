import axios, { AxiosInstance, AxiosError } from 'axios'

// @ts-ignore
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api/v1'

interface ApiResponse<T> {
  success?: boolean
  count?: number
  results?: T[]
  data?: T
  error?: {
    code: string
    message: string
  }
}

interface PaginatedResponse<T> {
  success: boolean
  count: number
  next: string | null
  previous: string | null
  page: number
  total_pages: number
  results: T[]
}

export interface CheckoutLineInput {
  sku_code: string
  quantity: number
}

export interface CheckoutAddressInput {
  full_name: string
  phone: string
  line1: string
  line2?: string
  city: string
  state: string
  postal_code: string
}

export interface PlaceOrderPayload {
  items: CheckoutLineInput[]
  address?: CheckoutAddressInput
  address_id?: string
  payment_method: 'cod' | 'online'
  coupon_code?: string
  notes?: string
  idempotency_key?: string
}

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Add token to requests
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })

    // Handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401 && localStorage.getItem('authToken')) {
          // Session expired: clear it and send the user to log in, then back here
          localStorage.removeItem('authToken')
          localStorage.removeItem('user')
          const next = encodeURIComponent(window.location.pathname + window.location.search)
          window.location.href = `/login?next=${next}`
        }
        return Promise.reject(error)
      }
    )
  }

  // Catalog endpoints
  getCategories(params?: Record<string, unknown>) {
    return this.client.get<PaginatedResponse<any>>('/catalog/categories/', { params })
  }

  getCategory(slug: string) {
    return this.client.get(`/catalog/categories/${slug}/`)
  }

  getProducts(params?: Record<string, unknown>) {
    return this.client.get<PaginatedResponse<any>>('/catalog/products/', { params })
  }

  getProduct(slug: string) {
    return this.client.get(`/catalog/products/${slug}/`)
  }

  getFeaturedProducts() {
    return this.client.get('/catalog/products/featured/')
  }

  getProductsByCategory(categorySlug: string, params?: Record<string, unknown>) {
    return this.client.get('/catalog/products/by_category/', {
      params: { slug: categorySlug, ...params },
    })
  }

  // Store settings (tax, delivery, COD, contact, banner)
  getStoreConfig() {
    return this.client.get('/store/config/')
  }

  // Editable homepage + pages
  getHomeContent() {
    return this.client.get('/cms/home/')
  }

  getCmsPage(slug: string) {
    return this.client.get(`/cms/pages/${slug}/`)
  }

  getInvoice(orderNumber: string) {
    return this.client.get(`/orders/${orderNumber}/invoice/`)
  }

  // Orders endpoints
  getOrders() {
    return this.client.get('/orders/')
  }

  getOrder(orderNumber: string) {
    return this.client.get(`/orders/${orderNumber}/`)
  }

  getOrderItems(orderNumber: string) {
    return this.client.get(`/orders/${orderNumber}/items/`)
  }

  getOrderStatusHistory(orderNumber: string) {
    return this.client.get(`/orders/${orderNumber}/status_history/`)
  }

  getOrderSummary() {
    return this.client.get('/orders/summary/')
  }

  cancelOrder(orderNumber: string, data: { reason?: string; notes?: string }) {
    return this.client.post(`/orders/${orderNumber}/cancel/`, data)
  }

  // Checkout
  quoteOrder(items: CheckoutLineInput[], couponCode?: string) {
    return this.client.post('/orders/quote/', { items, coupon_code: couponCode || '' })
  }

  placeOrder(payload: PlaceOrderPayload) {
    return this.client.post('/orders/place/', payload)
  }

  getAddresses() {
    return this.client.get('/auth/addresses/')
  }

  deleteAddress(id: string) {
    return this.client.delete(`/auth/addresses/${id}/`)
  }

  // Payments
  initiatePayment(orderNumber: string) {
    return this.client.post('/payments/initiate/', { order_number: orderNumber })
  }

  verifyPayment(payload: {
    order_number: string
    gateway_order_id: string
    gateway_payment_id?: string
    signature?: string
  }) {
    return this.client.post('/payments/verify/', payload)
  }

  reportPaymentFailure(orderNumber: string, reason?: string, errorCode?: string) {
    return this.client.post('/payments/failed/', {
      order_number: orderNumber,
      reason: reason || '',
      error_code: errorCode || '',
    })
  }

  // Auth endpoints (when implemented)
  login(email: string, password: string) {
    return this.client.post('/auth/login/', { email, password })
  }

  register(userData: {
    username: string
    email: string
    password: string
    first_name?: string
    last_name?: string
  }) {
    return this.client.post('/auth/register/', userData)
  }

  logout() {
    localStorage.removeItem('authToken')
    return Promise.resolve()
  }

  // Public contact form
  sendContactMessage(payload: { name: string; email: string; subject: string; message: string; website?: string }) {
    return this.client.post('/support/contact/', payload)
  }

  // Health check
  getHealth() {
    return this.client.get('/health/')
  }
}

export const apiClient = new ApiClient()
export type { ApiResponse, PaginatedResponse }
