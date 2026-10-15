import { usePageMeta } from '../utils/usePageMeta'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { RootState } from '../store'
import { updateQuantity, removeFromCart, itemLimit } from '../store/slices/cartSlice'
import { formatINR } from '../utils/format'
import { Trash2, Plus, Minus } from 'lucide-react'

function CartPage() {
  usePageMeta("Your Cart", "Review the caps in your cart and continue to checkout.")
  const dispatch = useDispatch()
  const cart = useSelector((state: RootState) => state.cart)

  if (cart.items.length === 0) {
    return (
      <div className="bg-white min-h-screen py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Shopping Cart</h1>
            <p className="text-gray-600 mb-8">Your cart is empty</p>
            <Link
              to="/products"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold mb-8">Shopping Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-gray-50 rounded-lg overflow-hidden">
              {cart.items.map((item) => (
                <div
                  key={item.skuCode}
                  className="p-6 border-b border-gray-200 flex gap-6 hover:bg-gray-100 transition-colors"
                >
                  {/* Product Info */}
                  <div className="flex-1">
                    <p className="text-lg font-semibold text-gray-900">{item.productName}</p>
                    <p className="text-sm text-gray-600">{item.variantName}</p>
                    <p className="text-lg font-bold text-gray-900 mt-2">
                      {formatINR(item.unitPrice)}
                      {item.mrp && item.mrp > item.unitPrice && (
                        <span className="ml-2 text-sm font-normal text-gray-400 line-through">{formatINR(item.mrp)}</span>
                      )}
                    </p>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() =>
                        dispatch(
                          updateQuantity({ skuCode: item.skuCode, quantity: item.quantity - 1 })
                        )
                      }
                      className="p-1 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      <Minus size={18} />
                    </button>
                    <input
                      type="number"
                      value={item.quantity}
                      min={1}
                      max={itemLimit(item, cart.config)}
                      onChange={(e) => {
                        const value = parseInt(e.target.value)
                        if (!isNaN(value) && value > 0) {
                          dispatch(updateQuantity({ skuCode: item.skuCode, quantity: value }))
                        }
                      }}
                      className="w-16 px-2 py-1 text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() =>
                        dispatch(
                          updateQuantity({ skuCode: item.skuCode, quantity: item.quantity + 1 })
                        )
                      }
                      disabled={item.quantity >= itemLimit(item, cart.config)}
                      className="p-1 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Plus size={18} />
                    </button>
                  </div>

                  {/* Total & Remove */}
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900 mb-2">
                      {formatINR(item.unitPrice * item.quantity)}
                    </p>
                    <button
                      onClick={() => dispatch(removeFromCart(item.skuCode))}
                      className="text-red-600 hover:text-red-700 transition-colors flex items-center gap-1"
                    >
                      <Trash2 size={18} />
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 rounded-lg p-6 sticky top-20">
              <h2 className="text-2xl font-bold mb-6">Order Summary</h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold">{formatINR(cart.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className={cart.config.pricesIncludeGst ? 'text-gray-500' : 'text-gray-600'}>
                    {cart.config.pricesIncludeGst ? 'Includes GST' : 'GST'} ({cart.config.gstPercent}%)
                  </span>
                  <span className={cart.config.pricesIncludeGst ? 'text-gray-500' : 'font-semibold'}>{formatINR(cart.tax)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-semibold">
                    {cart.shipping === 0 ? (
                      <span className="text-green-600">FREE</span>
                    ) : (
                      formatINR(cart.shipping)
                    )}
                  </span>
                </div>
                <div className="border-t border-gray-300 pt-4 flex justify-between">
                  <span className="text-lg font-bold">Total</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {formatINR(cart.total)}
                  </span>
                </div>
              </div>

              <Link
                to="/checkout"
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-center block mb-3"
              >
                Proceed to Checkout
              </Link>

              <Link
                to="/products"
                className="w-full border-2 border-blue-600 text-blue-600 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors text-center block"
              >
                Continue Shopping
              </Link>

              <p className="text-xs text-gray-600 text-center mt-4">
                Free shipping on orders above ₹500
              </p>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-12 bg-blue-50 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Shopping at CapCrew</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">✓</div>
              <h3 className="font-bold text-gray-900 mb-2">Secure Checkout</h3>
              <p className="text-gray-700">Your payment information is encrypted and secure. We accept all major payment methods.</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">📦</div>
              <h3 className="font-bold text-gray-900 mb-2">Fast Delivery</h3>
              <p className="text-gray-700">Most orders ship within 24 hours. Track your package in real-time with our tracking system.</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">↩️</div>
              <h3 className="font-bold text-gray-900 mb-2">Easy Returns</h3>
              <p className="text-gray-700">Not satisfied? Return within 30 days for a full refund. No questions asked.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CartPage
