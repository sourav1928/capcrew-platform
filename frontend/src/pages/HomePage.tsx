import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { apiClient } from '../services/api'
import { addToCart } from '../store/slices/cartSlice'
import { productToCartItem } from '../utils/cart'
import { ProductCard } from '../components/ProductCard'
import HeroBanners, { Banner } from '../components/HeroBanners'
import { ShoppingCart } from 'lucide-react'
import { usePageMeta } from '../utils/usePageMeta'
import { useToast } from '../components/Toast'
import ErrorNotice from '../components/ErrorNotice'

interface Category {
  id: string
  name: string
  slug: string
  description: string
  display_order: number
}

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

interface Variant {
  id: string
  sku: string
  skus: Array<{
    id: string
    sku_code: string
    base_price: number
    mrp: number
  }>
}

function HomePage() {
  usePageMeta('', 'Shop solid caps and smiley caps online at CapCrew. Quality checked, fast delivery and easy returns.')
  const dispatch = useDispatch()
  const { notify } = useToast()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiClient.getCategories(),
  })

  // Fetch products
  const { data: productsData, isLoading: productsLoading, isError: productsError, refetch: refetchProducts } = useQuery({
    queryKey: ['products', selectedCategory],
    queryFn: () =>
      selectedCategory
        ? apiClient.getProductsByCategory(selectedCategory)
        : apiClient.getProducts(),
  })

  // Banners + featured products chosen by the owner in the admin panel
  const { data: homeData } = useQuery({
    queryKey: ['home-content'],
    queryFn: async () => (await apiClient.getHomeContent()).data.data,
    staleTime: 60_000,
    retry: 1,
  })
  const banners: Banner[] = homeData?.banners || []
  const featured: Product[] = homeData?.featured || []

  const categories = categoriesData?.data?.results || []
  const products = productsData?.data?.results || []

  return (
    <div className="bg-white">
      {/* Hero: the owner's banners, or the built-in hero until banners are added */}
      <HeroBanners banners={banners} />
      {banners.length === 0 && (
      <section className="relative bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Solid & Smiley Caps for Every Day
              </h1>
              <p className="text-lg mb-8 text-blue-100">
                Comfortable, well-stitched caps in classic solid colours and fun smiley designs.
                Easy to style, easy on the pocket.
              </p>
              <div className="flex gap-4">
                <Link
                  to="/products"
                  className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center gap-2"
                >
                  <ShoppingCart size={20} />
                  Shop Now
                </Link>
                <Link
                  to="/about"
                  className="border-2 border-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Learn More
                </Link>
              </div>
            </div>
            <div className="hidden md:flex justify-center">
              <span className="text-[200px] leading-none opacity-40 select-none" aria-hidden="true">🧢</span>
            </div>
          </div>
        </div>
      </section>
      )}

      {featured.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
          <h2 className="text-3xl font-bold mb-8">Featured Products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featured.map((product) => (
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
        </section>
      )}


      {/* Categories Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-3xl font-bold mb-8">Shop by Category</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`p-4 rounded-lg font-semibold transition-colors ${
              selectedCategory === null
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            All Products
          </button>

          {categories.map((category: Category) => (
            <button
              key={category.slug}
              onClick={() => setSelectedCategory(category.slug)}
              className={`p-4 rounded-lg font-semibold transition-colors text-left ${
                selectedCategory === category.slug
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              <p className="font-bold">{category.name}</p>
              <p className="text-sm opacity-80">{category.description}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Products Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-3xl font-bold mb-8">
          {selectedCategory
            ? `Products in ${categories.find((c: Category) => c.slug === selectedCategory)?.name}`
            : 'All Products'}
        </h2>

        {productsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-64 animate-pulse" />
            ))}
          </div>
        ) : productsError ? (
          <ErrorNotice onRetry={() => refetchProducts()} />
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No products found in this category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
      </section>

      {/* Features Section */}
      <section className="bg-gray-50 py-12 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold mb-12 text-center">Why Choose Us?</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: '✓',
                title: 'Quality Assured',
                description:
                  'Every cap is checked for stitching, shape and colour before it ships',
              },
              {
                icon: '🚚',
                title: 'Fast Delivery',
                description: 'Quick delivery across India with real-time tracking',
              },
              {
                icon: '🔒',
                title: 'Secure Shopping',
                description: 'Safe payments and buyer protection guaranteed',
              },
              {
                icon: '💰',
                title: 'Best Prices',
                description: 'Competitive pricing with regular discounts and offers',
              },
              {
                icon: '🤝',
                title: 'Friendly Support',
                description: 'Friendly help with sizing, colours and orders',
              },
              {
                icon: '♻️',
                title: 'Easy Returns',
                description: '7-day returns if the fit or colour is not right',
              },
            ].map((feature, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  )
}

export default HomePage
