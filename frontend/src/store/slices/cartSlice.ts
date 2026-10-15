import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface CartItem {
  id: string
  productSlug: string
  productName: string
  variantId: string
  variantName: string
  skuCode: string
  quantity: number
  unitPrice: number
  mrp?: number
  image?: string
  /** Units currently in stock (capped at the per-item limit). */
  maxQuantity?: number
}

/** Rules the owner can change in the admin panel (loaded from the server). */
export interface CommerceConfig {
  gstPercent: number
  /** true: GST is already inside the listed prices. false: GST is added at checkout. */
  pricesIncludeGst: boolean
  freeShippingThreshold: number
  shippingFee: number
  maxQty: number
}

export interface CartState {
  items: CartItem[]
  config: CommerceConfig
  subtotal: number
  /** GST amount (inside the subtotal when prices include GST, otherwise added to the total). */
  tax: number
  shipping: number
  total: number
  savings: number
}

const DEFAULT_COMMERCE: CommerceConfig = {
  gstPercent: 18,
  pricesIncludeGst: true,
  freeShippingThreshold: 500,
  shippingFee: 50,
  maxQty: 10,
}

/** Kept for older imports; the live limit comes from the store settings. */
export const MAX_QTY_PER_ITEM = DEFAULT_COMMERCE.maxQty

const loadItems = (): CartItem[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem('cart') || '[]')
    return Array.isArray(parsed)
      ? // variantId 'default' marks placeholder items from the old demo cart (fake prices) - drop them
        parsed.filter((i) => i && i.skuCode && i.variantId !== 'default' && Number(i.quantity) > 0 && Number(i.unitPrice) > 0)
      : []
  } catch {
    return []
  }
}

export const itemLimit = (item: { maxQuantity?: number }, config: CommerceConfig) =>
  Math.max(1, Math.min(config.maxQty, item.maxQuantity ?? config.maxQty))

const calculateTotals = (items: CartItem[], config: CommerceConfig) => {
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const rate = config.gstPercent
  const tax = config.pricesIncludeGst ? (subtotal * rate) / (100 + rate) : (subtotal * rate) / 100
  const shipping = items.length === 0 || subtotal >= config.freeShippingThreshold ? 0 : config.shippingFee
  const mrpTotal = items.reduce((sum, item) => sum + (item.mrp ?? item.unitPrice) * item.quantity, 0)
  return {
    subtotal,
    tax,
    shipping,
    total: subtotal + shipping + (config.pricesIncludeGst ? 0 : tax),
    savings: Math.max(0, mrpTotal - subtotal),
  }
}

const savedItems = loadItems()

const initialState: CartState = {
  items: savedItems,
  config: DEFAULT_COMMERCE,
  ...calculateTotals(savedItems, DEFAULT_COMMERCE),
}

const persist = (state: CartState) => {
  Object.assign(state, calculateTotals(state.items, state.config))
  try {
    localStorage.setItem('cart', JSON.stringify(state.items))
  } catch {
    /* storage unavailable - cart still works for this session */
  }
}

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<CartItem>) => {
      const incoming = action.payload
      const existing = state.items.find((item) => item.skuCode === incoming.skuCode)
      if (existing) {
        // Refresh price/stock info from the latest catalog data
        existing.unitPrice = incoming.unitPrice
        existing.mrp = incoming.mrp ?? existing.mrp
        existing.maxQuantity = incoming.maxQuantity ?? existing.maxQuantity
        existing.quantity = Math.min(existing.quantity + incoming.quantity, itemLimit(existing, state.config))
      } else {
        state.items.push({ ...incoming, quantity: Math.min(incoming.quantity, itemLimit(incoming, state.config)) })
      }
      persist(state)
    },

    updateQuantity: (state, action: PayloadAction<{ skuCode: string; quantity: number }>) => {
      const item = state.items.find((i) => i.skuCode === action.payload.skuCode)
      if (item) {
        const requested = Number.isFinite(action.payload.quantity) ? action.payload.quantity : 1
        if (requested <= 0) {
          state.items = state.items.filter((i) => i.skuCode !== action.payload.skuCode)
        } else {
          item.quantity = Math.min(Math.floor(requested), itemLimit(item, state.config))
        }
      }
      persist(state)
    },

    removeFromCart: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item.skuCode !== action.payload)
      persist(state)
    },

    /** Replace the whole cart (used to apply the server's corrected prices / quantities). */
    replaceItems: (state, action: PayloadAction<CartItem[]>) => {
      state.items = action.payload
      persist(state)
    },

    /** The owner changed tax / delivery / quantity rules: recalculate immediately. */
    applyCommerceConfig: (state, action: PayloadAction<CommerceConfig>) => {
      state.config = action.payload
      state.items.forEach((item) => {
        item.quantity = Math.min(item.quantity, itemLimit(item, state.config))
      })
      persist(state)
    },

    clearCart: (state) => {
      state.items = []
      persist(state)
      try {
        localStorage.removeItem('cart')
      } catch {
        /* ignore */
      }
    },
  },
})

export const { addToCart, updateQuantity, removeFromCart, replaceItems, applyCommerceConfig, clearCart } = cartSlice.actions
export default cartSlice.reducer
