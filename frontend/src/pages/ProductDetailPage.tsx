import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useDispatch, useSelector } from 'react-redux'
import { ChevronRight, Minus, Plus, ShoppingCart } from 'lucide-react'
import { apiClient } from '../services/api'
import { addToCart } from '../store/slices/cartSlice'
import { RootState } from '../store'
import { formatINR } from '../utils/format'
import { usePageMeta } from '../utils/usePageMeta'
import { descriptionToBlocks } from '../utils/text'
import { useToast } from '../components/Toast'
import ErrorNotice from '../components/ErrorNotice'

interface Sku {
  id: string
  sku_code: string
  base_price: string | number
  mrp: string | number
  status: string
  available_quantity: number
  in_stock: boolean
}
interface Media {
  id: string
  media_type: string
  file_url: string
  alt_text: string
  is_primary: boolean
  display_order: number
}
interface Variant {
  id: string
  name: string
  is_active: boolean
  skus: Sku[]
  media: Media[]
}
interface Attribute {
  id: string
  name: string
  value: string
  unit: string
}
interface ProductDetail {
  id: string
  name: string
  slug: string
  description: string
  short_description: string
  meta_description?: string
  brand: string
  category?: { name: string; slug: string } | null
  variants: Variant[]
  attributes: Attribute[]
  media: Media[]
}

const skuOf = (v?: Variant) => v?.skus.find((s) => s.status === 'active') || v?.skus[0]

export default function ProductDetailPage() {
  const { slug = '' } = useParams()
  const dispatch = useDispatch()
  const { notify } = useToast()
  const storeMaxQty = useSelector((state: RootState) => state.cart.config.maxQty)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => (await apiClient.getProduct(slug)).data as ProductDetail,
    retry: (count, err: any) => err?.response?.status !== 404 && count < 1,
  })

  usePageMeta(data?.name || 'Cap', data?.meta_description || data?.short_description || undefined)

  const variants = useMemo(
    () => (data?.variants || []).filter((v) => v.is_active && v.skus.some((s) => s.status === 'active')),
    [data]
  )
  const [variantId, setVariantId] = useState('')
  const [qty, setQty] = useState(1)
  const [activeImg, setActiveImg] = useState(0)

  // Start on the first colour/size that is in stock whenever a product loads
  useEffect(() => {
    if (!variants.length) return
    const start = variants.find((v) => skuOf(v)?.in_stock) || variants[0]
    setVariantId(start.id)
    setQty(1)
    setActiveImg(0)
  }, [data?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const variant = variants.find((v) => v.id === variantId) || variants[0]
  const sku = skuOf(variant)

  const images = useMemo(() => {
    const all = [...(variant?.media || []), ...(data?.media || [])].filter((m) => m.media_type === 'image')
    const seen = new Set<string>()
    return all
      .filter((m) => (seen.has(m.file_url) ? false : (seen.add(m.file_url), true)))
      .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.display_order - b.display_order)
  }, [variant, data])

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid md:grid-cols-2 gap-10" aria-busy="true">
        <div className="bg-gray-200 rounded-xl aspect-square animate-pulse" />
        <div className="space-y-4">
          <div className="bg-gray-200 rounded h-8 w-3/4 animate-pulse" />
          <div className="bg-gray-200 rounded h-6 w-1/3 animate-pulse" />
          <div className="bg-gray-200 rounded h-32 animate-pulse" />
        </div>
      </div>
    )
  }

  if ((error as any)?.response?.status === 404 || (!isLoading && !error && !data)) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4" aria-hidden="true">🧢</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">We could not find that cap</h1>
        <p className="text-gray-600 mb-6">It may have been removed or the link may be wrong.</p>
        <Link to="/products" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
          Browse all caps
        </Link>
      </div>
    )
  }

  if (error || !data) {
    return <ErrorNotice onRetry={() => refetch()} />
  }

  const price = Number(sku?.base_price ?? 0)
  const mrp = Number(sku?.mrp ?? price)
  const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0
  const available = sku?.available_quantity ?? 0
  const limit = Math.max(1, Math.min(available || 1, storeMaxQty || 10))
  const canBuy = !!sku && sku.in_stock
  const blocks = descriptionToBlocks(data.description)

  const handleAdd = () => {
    if (!sku || !variant || !canBuy) return
    dispatch(
      addToCart({
        id: data.id,
        productSlug: data.slug,
        productName: data.name,
        variantId: sku.sku_code,
        variantName: variant.name,
        skuCode: sku.sku_code,
        quantity: qty,
        unitPrice: price,
        mrp,
        image: images[0]?.file_url,
        maxQuantity: sku.available_quantity,
      })
    )
    notify(`${qty > 1 ? `${qty} x ` : ''}${data.name} (${variant.name}) added to cart`)
  }

  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-gray-500 mb-6">
          <Link to="/" className="hover:text-blue-600">Home</Link>
          <ChevronRight size={14} />
          <Link to="/products" className="hover:text-blue-600">Caps</Link>
          {data.category && (
            <>
              <ChevronRight size={14} />
              <Link to={`/products?category=${data.category.slug}`} className="hover:text-blue-600">{data.category.name}</Link>
            </>
          )}
          <ChevronRight size={14} />
          <span className="text-gray-800 font-medium break-words">{data.name}</span>
        </nav>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Photos */}
          <div>
            <div className="bg-orange-50 rounded-xl overflow-hidden aspect-square flex items-center justify-center">
              {images[activeImg] ? (
                <img
                  src={images[activeImg].file_url}
                  alt={images[activeImg].alt_text || data.name}
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-9xl" role="img" aria-label="Cap">🧢</span>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-3 mt-3 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setActiveImg(i)}
                    aria-label={`Show photo ${i + 1}`}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${i === activeImg ? 'border-blue-600' : 'border-transparent'}`}
                  >
                    <img src={img.file_url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            {data.brand && <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-1">{data.brand}</p>}
            <h1 className="text-3xl font-bold text-gray-900 mb-3">{data.name}</h1>
            {data.short_description && <p className="text-gray-600 mb-4">{data.short_description}</p>}

            {variants.length === 0 ? (
              <p className="p-4 bg-gray-50 rounded-lg text-gray-700">This cap is not available right now. Please check back soon.</p>
            ) : (
              <>
                <div className="flex flex-wrap items-baseline gap-3 mb-6">
                  <span className="text-3xl font-bold text-gray-900">{formatINR(price)}</span>
                  {discount > 0 && (
                    <>
                      <span className="text-lg text-gray-500 line-through">{formatINR(mrp)}</span>
                      <span className="text-sm font-bold text-white bg-red-500 px-2 py-0.5 rounded">-{discount}%</span>
                    </>
                  )}
                </div>

                <div className="mb-6">
                  <p className="text-sm font-semibold text-gray-800 mb-2">
                    Option: <span className="font-normal text-gray-600">{variant?.name}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {variants.map((v) => {
                      const s = skuOf(v)
                      const selected = v.id === variant?.id
                      const out = !s?.in_stock
                      return (
                        <button
                          key={v.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => { setVariantId(v.id); setQty(1); setActiveImg(0) }}
                          className={`px-4 py-2 rounded-lg border-2 text-sm font-semibold transition-colors ${
                            selected ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-800 hover:border-gray-400'
                          } ${out ? 'opacity-50 line-through' : ''}`}
                        >
                          {v.name}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <p className={`text-sm font-semibold mb-4 ${canBuy ? 'text-green-700' : 'text-red-600'}`}>
                  {!canBuy ? 'Out of stock' : available <= 5 ? `Only ${available} left` : 'In stock'}
                </p>

                <div className="flex flex-col sm:flex-row gap-3 mb-8">
                  <div className="flex items-center border border-gray-300 rounded-lg self-start">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      disabled={!canBuy || qty <= 1}
                      className="p-3 disabled:opacity-40"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="w-10 text-center font-semibold" aria-live="polite">{qty}</span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      onClick={() => setQty((q) => Math.min(limit, q + 1))}
                      disabled={!canBuy || qty >= limit}
                      className="p-3 disabled:opacity-40"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleAdd}
                    disabled={!canBuy}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    <ShoppingCart size={20} />
                    {canBuy ? 'Add to cart' : 'Out of stock'}
                  </button>
                </div>
              </>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700 mb-8">
              <div className="bg-gray-50 rounded-lg p-3">✓ Quality checked before dispatch</div>
              <div className="bg-gray-50 rounded-lg p-3">↩ Easy returns if it does not fit</div>
            </div>

            {blocks.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-3">About this cap</h2>
                {blocks.map((b, i) =>
                  b.type === 'p' ? (
                    <p key={i} className="text-gray-700 mb-3 leading-relaxed">{b.text}</p>
                  ) : (
                    <ul key={i} className="list-disc ml-6 mb-3 space-y-1 text-gray-700">
                      {b.items.map((it, j) => <li key={j}>{it}</li>)}
                    </ul>
                  )
                )}
              </div>
            )}

            {data.attributes.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-3">Details</h2>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  {data.attributes.map((a) => (
                    <div key={a.id} className="flex justify-between gap-4 border-b border-gray-100 pb-2">
                      <dt className="text-gray-500">{a.name}</dt>
                      <dd className="font-medium text-gray-900 text-right">{a.value} {a.unit}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
