import React, { useState } from 'react';
import { TrendingUp, Users, ShoppingCart, DollarSign, Eye, Package } from 'lucide-react';

interface KPICard {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  color: string;
}

interface ChartData {
  label: string;
  value: number;
}

const DashboardOverview: React.FC = () => {
  const [dateRange, setDateRange] = useState('7d');

  const kpiCards: KPICard[] = [
    {
      title: 'Total Revenue',
      value: '₹2,45,890',
      change: 12.5,
      icon: <DollarSign className="w-6 h-6" />,
      color: 'blue',
    },
    {
      title: 'Total Orders',
      value: '1,234',
      change: 8.2,
      icon: <ShoppingCart className="w-6 h-6" />,
      color: 'green',
    },
    {
      title: 'Active Customers',
      value: '856',
      change: 5.1,
      icon: <Users className="w-6 h-6" />,
      color: 'purple',
    },
    {
      title: 'Products Sold',
      value: '3,456',
      change: 15.3,
      icon: <Package className="w-6 h-6" />,
      color: 'orange',
    },
  ];

  const salesData: ChartData[] = [
    { label: 'Mon', value: 4000 },
    { label: 'Tue', value: 3000 },
    { label: 'Wed', value: 2000 },
    { label: 'Thu', value: 2780 },
    { label: 'Fri', value: 1890 },
    { label: 'Sat', value: 2390 },
    { label: 'Sun', value: 3490 },
  ];

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, string> = {
      blue: 'bg-blue-50 text-blue-600',
      green: 'bg-green-50 text-green-600',
      purple: 'bg-purple-50 text-purple-600',
      orange: 'bg-orange-50 text-orange-600',
    };
    return colorMap[color] || 'bg-gray-50 text-gray-600';
  };

  const getChangeColor = (change: number) => {
    return change > 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex gap-2">
        {['24h', '7d', '30d', '90d'].map((range) => (
          <button
            key={range}
            onClick={() => setDateRange(range)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              dateRange === range
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
            }`}
          >
            {range === '24h'
              ? 'Last 24h'
              : range === '7d'
              ? 'Last 7 days'
              : range === '30d'
              ? 'Last 30 days'
              : 'Last 90 days'}
          </button>
        ))}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((card) => (
          <div
            key={card.title}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            {/* Icon */}
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${getColorClasses(card.color)}`}>
              {card.icon}
            </div>

            {/* Content */}
            <h3 className="text-gray-600 text-sm font-medium mb-1">{card.title}</h3>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <span className={`text-sm font-semibold flex items-center gap-1 ${getChangeColor(card.change)}`}>
                <TrendingUp className="w-4 h-4" />
                {Math.abs(card.change)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Trend</h3>
          <div className="flex items-end justify-between h-64 gap-2">
            {salesData.map((item, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <div className="relative w-full h-48">
                  <div
                    className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg transition-all hover:opacity-80 cursor-pointer"
                    style={{ height: `${(item.value / 4000) * 100}%` }}
                    title={`${item.label}: ₹${item.value}`}
                  />
                </div>
                <span className="text-xs text-gray-600 font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Products</h3>
          <div className="space-y-3">
            {[
              { name: 'Classic Solid Cap', sales: 234 },
              { name: 'Premium Dad Cap', sales: 189 },
              { name: 'Smiley Face Cap', sales: 156 },
              { name: 'Heavy Duty Board', sales: 142 },
              { name: 'Retro Smiley Trucker Cap', sales: 128 },
            ].map((product, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{product.name}</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${(product.sales / 234) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs font-semibold text-gray-600 ml-2">{product.sales}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Orders</h3>
          <div className="space-y-3">
            {[
              { orderId: '#ORD-001234', customer: 'John Doe', amount: '₹5,499', status: 'Delivered' },
              { orderId: '#ORD-001233', customer: 'Jane Smith', amount: '₹3,299', status: 'Processing' },
              { orderId: '#ORD-001232', customer: 'Mike Johnson', amount: '₹7,899', status: 'Shipped' },
              { orderId: '#ORD-001231', customer: 'Sarah Wilson', amount: '₹2,199', status: 'Pending' },
            ].map((order) => (
              <div key={order.orderId} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{order.orderId}</p>
                  <p className="text-xs text-gray-600">{order.customer}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{order.amount}</p>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    order.status === 'Delivered'
                      ? 'bg-green-100 text-green-700'
                      : order.status === 'Processing'
                      ? 'bg-blue-100 text-blue-700'
                      : order.status === 'Shipped'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {[
              { icon: '📦', title: 'New Order', description: 'Order #ORD-001234 placed', time: '2 minutes ago' },
              { icon: '👤', title: 'New Customer', description: 'John Doe registered', time: '15 minutes ago' },
              { icon: '⭐', title: 'Product Review', description: '5-star review on Classic Solid Cap', time: '1 hour ago' },
              { icon: '💰', title: 'Payment Received', description: 'Payment of ₹5,499 received', time: '2 hours ago' },
              { icon: '📊', title: 'Report Generated', description: 'Monthly sales report ready', time: '3 hours ago' },
            ].map((activity, idx) => (
              <div key={idx} className="flex gap-3 items-start">
                <div className="text-2xl mt-1">{activity.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{activity.title}</p>
                  <p className="text-xs text-gray-600">{activity.description}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
