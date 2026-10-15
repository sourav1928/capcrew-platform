import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'
import { apiClient } from '../services/api'
import { addToCart } from '../store/slices/cartSlice'
import { productToCartItem } from '../utils/cart'
import { ProductCard } from '../components/ProductCard'
import { ChevronDown } from 'lucide-react'
import { usePageMeta } from '../utils/usePageMeta'
import { useToast } from '../components/Toast'
import ErrorNotice from '../components/ErrorNotice'

interface Product {
  id: string
  name: string
  slug: string
  short_description: string
  brand: string
  status: string
  primary_image?: string | null
  min_price: string | number | null
  mrp: string | number | null
  sku_code: string | null
  variant_name?: string | null
  in_stock?: boolean
  available_quantity?: number
}

function ProductsPage() {
  usePageMeta('Shop Caps', 'Browse solid caps, smiley caps, trucker and snapback caps for kids and adults. Quality checked, fast delivery and easy returns.')
  const dispatch = useDispatch()
  const { notify } = useToast()
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    category: '',
    brand: '',
    minPrice: 0,
    maxPrice: 10000,
    search: '',
  })
  const [sortBy, setSortBy] = useState('newest')

  const { data: productsData, isLoading, isError, refetch } = useQuery({
    queryKey: ['products', filters, sortBy],
    queryFn: () =>
      apiClient.getProducts({
        search: filters.search,
        category: filters.category,
        brand: filters.brand,
        min_price: filters.minPrice,
        max_price: filters.maxPrice,
        ordering:
          sortBy === 'newest'
            ? '-created_at'
            : sortBy === 'price_low'
              ? 'variants__skus__base_price'
              : sortBy === 'price_high'
                ? '-variants__skus__base_price'
                : '-created_at',
      }),
  })

  const products = productsData?.data?.results || []

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Our Products</h1>
          <p className="text-gray-600">
            Browse our collection of solid caps and smiley caps. Every cap is quality checked, comfortable to wear
            and easy to return if the fit is not right. Great prices with regular discounts and offers.
          </p>
          <div className="mt-4 flex gap-4 flex-wrap">
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">✓ 100% Authentic</span>
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">🚚 Fast Delivery</span>
            <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">🔒 Secure Payment</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Filters */}
          <div className="lg:col-span-1">
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              aria-expanded={showFilters}
              className="lg:hidden w-full flex items-center justify-between bg-gray-50 border border-gray-200 px-4 py-3 rounded-lg font-semibold"
            >
              <span>Filters</span>
              <ChevronDown size={18} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            <div className={`${showFilters ? 'block mt-3' : 'hidden'} lg:block bg-gray-50 p-6 rounded-lg lg:sticky lg:top-20`}>
              <h2 className="hidden lg:block text-xl font-bold mb-6">Filters</h2>

              {/* Search */}
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2">Search</label>
                <input
                  type="text"
                  placeholder="Product name..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2">Price Range</label>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-gray-600">Min: ₹{filters.minPrice}</label>
                    <input
                      type="range"
                      min="0"
                      max="10000"
                      value={filters.minPrice}
                      onChange={(e) =>
                        setFilters({ ...filters, minPrice: parseInt(e.target.value) })
                      }
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Max: ₹{filters.maxPrice}</label>
                    <input
                      type="range"
                      min="0"
                      max="10000"
                      value={filters.maxPrice}
                      onChange={(e) =>
                        setFilters({ ...filters, maxPrice: parseInt(e.target.value) })
                      }
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Brand */}
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2">Brand</label>
                <select
                  value={filters.brand}
                  onChange={(e) => setFilters({ ...filters, brand: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Brands</option>
                  <option value="CapCrew">CapCrew</option>
                  <option value="SunnySide">SunnySide</option>
                  <option value="ClassicLid">ClassicLid</option>
                </select>
              </div>

              {/* Clear Filters */}
              <button
                onClick={() =>
                  setFilters({
                    category: '',
                    brand: '',
                    minPrice: 0,
                    maxPrice: 10000,
                    search: '',
                  })
                }
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Sort */}
            <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <p className="text-gray-600">Showing {products.length} products</p>
              <div className="flex items-center gap-2">
                <label className="font-semibold">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="newest">Newest</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                </select>
              </div>
            </div>

            {/* Products Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-gray-200 rounded-lg h-80 animate-pulse" />
                ))}
              </div>
            ) : isError ? (
              <ErrorNotice onRetry={() => refetch()} />
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No products found matching your filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product: Product) => (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    name={product.name}
                    slug={product.slug}
                    image={product.primary_image || undefined}
                    price={Number(product.min_price ?? 0)}
                    mrp={Number(product.mrp ?? product.min_price ?? 0)}
                    inStock={!!product.sku_code && product.in_stock !== false}
                    onAddToCart={() => {
                      dispatch(addToCart(productToCartItem(product)))
                      notify(`${product.name} added to cart`)
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Product Guide Section */}
          <div className="mt-16 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">How to Choose the Right Cap?</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">1. Find Your Fit</h3>
                <p className="text-gray-700">
                  Most of our adult caps are adjustable and fit head sizes from about 54 to 60 cm. Kids caps come in smaller sizes, so check the size listed on the product.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">2. Pick the Material</h3>
                <p className="text-gray-700">
                  Cotton twill is soft and everyday friendly. Mesh-back trucker caps keep you cooler in summer. Check the material on each product page.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">3. Match the Style</h3>
                <p className="text-gray-700">
                  Go for a solid cap for a clean everyday look, or a smiley cap for something fun. Curved brims suit daily wear, flat brims give a street style.
                </p>
              </div>
            </div>
          </div>

          {/* Why Buy From Us */}
          <div className="mt-12 bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Why Buy From CapCrew?</h2>
            <div className="grid md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-4xl font-bold text-blue-600 mb-2">✓</div>
                <h3 className="font-bold text-gray-900 mb-2">Quality Checked</h3>
                <p className="text-sm text-gray-600">Every cap is inspected for stitching, shape and colour before dispatch</p>
              </div>
              <div>
                <div className="text-4xl font-bold text-blue-600 mb-2">🚚</div>
                <h3 className="font-bold text-gray-900 mb-2">Pan-India Delivery</h3>
                <p className="text-sm text-gray-600">Fast and reliable delivery to all corners of India in 2-3 days</p>
              </div>
              <div>
                <div className="text-4xl font-bold text-blue-600 mb-2">🛡️</div>
                <h3 className="font-bold text-gray-900 mb-2">Easy Returns</h3>
                <p className="text-sm text-gray-600">7-day returns if the fit or colour is not what you expected</p>
              </div>
              <div>
                <div className="text-4xl font-bold text-blue-600 mb-2">💬</div>
                <h3 className="font-bold text-gray-900 mb-2">Friendly Support</h3>
                <p className="text-sm text-gray-600">Help with sizing, colours and your orders whenever you need it</p>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-12 bg-blue-50 rounded-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Frequently Asked Questions</h2>
            <div className="space-y-3 max-w-3xl mx-auto">
              {[
                {
                  q: 'What sizes do your caps come in?',
                  a: 'Adult caps are adjustable (about 54-60 cm). Kids caps come in smaller sizes, listed on each product page.',
                },
                {
                  q: 'What is your return policy?',
                  a: 'You can return unused caps within 7 days of delivery if the fit or colour is not right.',
                },
                {
                  q: 'How do I wash my cap?',
                  a: 'Hand wash in cold water with mild soap, reshape the brim and air dry in the shade. Avoid the washing machine and dryer.',
                },
                {
                  q: 'Do you offer bulk orders?',
                  a: 'Yes, we offer special pricing for bulk orders, great for teams, schools and events. Contact us for a custom quote.',
                },
              ].map((item, i) => (
                <details key={i} className="bg-white rounded-lg p-4 cursor-pointer border border-gray-200">
                  <summary className="font-semibold text-gray-900 cursor-pointer">{item.q}</summary>
                  <p className="text-gray-600 mt-3">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductsPage
