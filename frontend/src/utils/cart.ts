import { CartItem } from '../store/slices/cartSlice'

export interface CatalogProduct {
  id: string
  name: string
  slug: string
  primary_image?: string | null
  min_price: string | number | null
  mrp: string | number | null
  sku_code: string | null
  variant_name?: string | null
  in_stock?: boolean
  available_quantity?: number
}

/** Build a cart line from a product returned by the catalog API (real SKU + real price). */
export const productToCartItem = (p: CatalogProduct): CartItem => ({
  id: p.id,
  productSlug: p.slug,
  productName: p.name,
  variantId: p.sku_code || '',
  variantName: p.variant_name || 'Standard',
  skuCode: p.sku_code || '',
  quantity: 1,
  unitPrice: Number(p.min_price),
  mrp: Number(p.mrp ?? p.min_price),
  image: p.primary_image || undefined,
  maxQuantity: p.available_quantity,
})
