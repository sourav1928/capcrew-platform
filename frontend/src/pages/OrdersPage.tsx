import { usePageMeta } from '../utils/usePageMeta'
import { useQuery } from '@tanstack/react-query'
import { Link, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Package, Calendar } from 'lucide-react'
import { RootState } from '../store'
import { apiClient } from '../services/api'
import { formatDate, formatINR } from '../utils/format'
import { STATUS_STYLES } from '../utils/orderTypes'

interface OrderRow {
  id: string
  order_number: string
  status: string
  status_display: string
  payment_status_display: string
  payment_method: 'cod' | 'online' | null
  order_total: string
  created_at: string
  items: Array<{ id: string; product_name: string; quantity: number }>
}

function OrdersPage() {
  usePageMeta("My Orders")
  const auth = useSelector((state: RootState) => state.auth)
  const { data, isLoading, error } = useQuery({
    queryKey: ['orders'],
    queryFn: () => apiClient.getOrders(),
    enabled: auth.isAuthenticated,
  })

  if (!auth.isAuthenticated) return <Navigate to="/login?next=/orders" replace />

  const orders: OrderRow[] = data?.data?.results || []

  return (
    <div className="bg-gray-50 min-h-screen py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <h1 className="text-3xl font-bold mb-1">My Orders</h1>
        <p className="text-gray-600 mb-8">Track, pay for or cancel your orders</p>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded-xl animate-pulse" />)}
          </div>
        ) : error ? (
          <p className="text-red-600">We couldn’t load your orders. Please refresh and try again.</p>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <Package size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-6">You haven’t placed any orders yet</p>
            <Link to="/products" className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700">
              Start shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Link key={order.id} to={`/orders/${order.order_number}`}
                className="block bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-gray-900">{order.order_number}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                      <Calendar size={14} /> {formatDate(order.created_at)}
                      {order.payment_method && ` · ${order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online'}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[order.status] || 'bg-gray-50 text-gray-700 border-gray-300'}`}>
                      {order.status_display}
                    </span>
                    <p className="text-xl font-bold text-blue-600 mt-1">{formatINR(order.order_total)}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-700 space-y-0.5">
                  {order.items.slice(0, 2).map((item) => (
                    <p key={item.id}>{item.product_name} × {item.quantity}</p>
                  ))}
                  {order.items.length > 2 && <p className="text-gray-500">+{order.items.length - 2} more item(s)</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default OrdersPage
