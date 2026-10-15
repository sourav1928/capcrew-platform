import React, { useState } from 'react';
import { Search, Filter, Eye, Download, Phone, Mail, MapPin, Clock } from 'lucide-react';

interface Order {
  id: string;
  orderNumber: string;
  customer: string;
  email: string;
  amount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  items: number;
  date: string;
  paymentMethod: string;
}

const OrdersManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'>('all');
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const orders: Order[] = [
    {
      id: '1',
      orderNumber: '#ORD-001234',
      customer: 'John Doe',
      email: 'john@example.com',
      amount: 5499,
      status: 'delivered',
      items: 2,
      date: '2024-09-28',
      paymentMethod: 'Credit Card',
    },
    {
      id: '2',
      orderNumber: '#ORD-001233',
      customer: 'Jane Smith',
      email: 'jane@example.com',
      amount: 3299,
      status: 'processing',
      items: 1,
      date: '2024-09-27',
      paymentMethod: 'Debit Card',
    },
    {
      id: '3',
      orderNumber: '#ORD-001232',
      customer: 'Mike Johnson',
      email: 'mike@example.com',
      amount: 7899,
      status: 'shipped',
      items: 3,
      date: '2024-09-26',
      paymentMethod: 'UPI',
    },
    {
      id: '4',
      orderNumber: '#ORD-001231',
      customer: 'Sarah Wilson',
      email: 'sarah@example.com',
      amount: 2199,
      status: 'pending',
      items: 1,
      date: '2024-09-25',
      paymentMethod: 'Net Banking',
    },
    {
      id: '5',
      orderNumber: '#ORD-001230',
      customer: 'Robert Brown',
      email: 'robert@example.com',
      amount: 4599,
      status: 'delivered',
      items: 2,
      date: '2024-09-24',
      paymentMethod: 'Credit Card',
    },
    {
      id: '6',
      orderNumber: '#ORD-001229',
      customer: 'Emma Davis',
      email: 'emma@example.com',
      amount: 9999,
      status: 'cancelled',
      items: 4,
      date: '2024-09-23',
      paymentMethod: 'Debit Card',
    },
  ];

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || order.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      processing: 'bg-blue-100 text-blue-700',
      shipped: 'bg-purple-100 text-purple-700',
      delivered: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    return statusColors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusStep = (status: string) => {
    const steps: Record<string, number> = {
      pending: 1,
      processing: 2,
      shipped: 3,
      delivered: 4,
      cancelled: -1,
    };
    return steps[status] || 0;
  };

  const selectedOrderData = orders.find((o) => o.id === selectedOrder);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Orders List */}
      <div className="lg:col-span-2 space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-2 w-full">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Export */}
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Download className="w-5 h-5 text-gray-600" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => {
                setFilterStatus(status as any);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 font-medium rounded-lg transition-colors capitalize whitespace-nowrap ${
                filterStatus === status
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {status === 'all' ? 'All' : status}
            </button>
          ))}
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedOrders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => setSelectedOrder(order.id)}
                    className={`cursor-pointer transition-colors ${
                      selectedOrder === order.id
                        ? 'bg-blue-50 hover:bg-blue-50'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {order.orderNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {order.customer}
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      ₹{order.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center font-semibold text-gray-700">
                      {order.items}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{order.date}</td>
                    <td className="px-6 py-4">
                      <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-600">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredOrders.length)} of{' '}
              {filteredOrders.length} orders
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Order Details Panel */}
      {selectedOrderData && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-fit sticky top-24">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Details</h3>

          {/* Order Header */}
          <div className="mb-4 pb-4 border-b border-gray-200">
            <p className="text-2xl font-bold text-gray-900">{selectedOrderData.orderNumber}</p>
            <p className="text-sm text-gray-600 mt-1">{selectedOrderData.date}</p>
          </div>

          {/* Status Progress */}
          <div className="mb-6">
            <p className="text-sm font-semibold text-gray-900 mb-3">Status Timeline</p>
            <div className="space-y-2">
              {['pending', 'processing', 'shipped', 'delivered'].map((status, idx) => {
                const isActive = getStatusStep(selectedOrderData.status) >= idx + 1;
                return (
                  <div key={status} className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded-full ${
                        isActive ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    />
                    <span className={`text-sm capitalize ${isActive ? 'text-gray-900 font-semibold' : 'text-gray-600'}`}>
                      {status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Customer Info */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <p className="text-sm font-semibold text-gray-900 mb-3">Customer Info</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span className="font-medium">{selectedOrderData.customer}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="w-4 h-4" />
                {selectedOrderData.email}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="w-4 h-4" />
                +91 98765 43210
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="mb-6">
            <p className="text-sm font-semibold text-gray-900 mb-3">Order Summary</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">₹{(selectedOrderData.amount * 0.85).toFixed(0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax (18%)</span>
                <span className="font-medium">₹{(selectedOrderData.amount * 0.15).toFixed(0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span className="font-medium">₹100</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-bold text-gray-900">₹{selectedOrderData.amount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <p className="text-sm font-semibold text-gray-900 mb-2">Payment Method</p>
            <p className="text-sm text-gray-600">{selectedOrderData.paymentMethod}</p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
              Update Status
            </button>
            <button className="w-full px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">
              Print Invoice
            </button>
            <button className="w-full px-4 py-2 border border-gray-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium">
              Cancel Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersManagement;
