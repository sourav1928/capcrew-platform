import { ShoppingCart, Heart } from 'lucide-react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'

interface ProductCardProps {
  id: string
  name: string
  slug: string
  image?: string
  price: number
  mrp: number
  rating?: number
  reviews?: number
  inStock?: boolean
  onAddToCart?: () => void
  onAddToWishlist?: () => void
  isWishlisted?: boolean
}

export function ProductCard({
  name,
  slug,
  image,
  price,
  mrp,
  rating,
  reviews,
  inStock = true,
  onAddToCart,
  onAddToWishlist,
  isWishlisted,
}: ProductCardProps) {
  const discount = Math.round(((mrp - price) / mrp) * 100)

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      {/* Image Container */}
      <Link to={`/products/${slug}`} className="relative block overflow-hidden bg-gray-200 aspect-square">
        {image ? (
          <img
            src={image}
            alt={name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-orange-50">
            <span className="text-6xl" role="img" aria-label="Cap">🧢</span>
          </div>
        )}

        {discount > 0 && (
          <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-md text-sm font-bold">
            -{discount}%
          </div>
        )}

        {!inStock && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <span className="text-white font-bold">Out of Stock</span>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="p-4">
        {/* Rating */}
        {rating && (
          <div className="flex items-center mb-2">
            <div className="flex text-yellow-400">
              {[...Array(5)].map((_, i) => (
                <span key={i}>{i < Math.round(rating) ? '★' : '☆'}</span>
              ))}
            </div>
            {reviews && <span className="text-xs text-gray-600 ml-2">({reviews})</span>}
          </div>
        )}

        {/* Name */}
        <Link to={`/products/${slug}`}>
          <h3 className="font-semibold text-gray-800 hover:text-blue-600 transition-colors mb-2 line-clamp-2 min-h-14">
            {name}
          </h3>
        </Link>

        {/* Price */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg font-bold text-gray-900">₹{price.toFixed(2)}</span>
          {mrp > price && (
            <span className="text-sm text-gray-500 line-through">₹{mrp.toFixed(2)}</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onAddToCart}
            disabled={!inStock}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 py-2 rounded-md font-semibold transition-colors',
              inStock
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            )}
          >
            <ShoppingCart size={18} />
            <span>Add</span>
          </button>
          <button
            onClick={onAddToWishlist}
            className={clsx(
              'flex items-center justify-center px-3 py-2 rounded-md border transition-colors',
              isWishlisted
                ? 'bg-red-50 border-red-300 text-red-600'
                : 'border-gray-300 text-gray-600 hover:border-red-300'
            )}
          >
            <Heart size={18} fill={isWishlisted ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>
    </div>
  )
}
