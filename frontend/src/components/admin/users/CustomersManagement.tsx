import React, { useState } from 'react';
import { Search, Filter, Mail, Phone, MapPin, TrendingUp, MessageSquare, MoreVertical } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  status: 'active' | 'inactive';
  joinDate: string;
  lastOrderDate: string;
  city: string;
  lastOrderValue: number;
}

const CustomersManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const customers: Customer[] = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+91 98765 43210',
      totalOrders: 5,
      totalSpent: 15499,
      status: 'active',
      joinDate: '2024-01-15',
      lastOrderDate: '2024-09-28',
      city: 'Mumbai',
      lastOrderValue: 5499,
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+91 87654 32109',
      totalOrders: 3,
      totalSpent: 8999,
      status: 'active',
      joinDate: '2024-02-20',
      lastOrderDate: '2024-09-27',
      city: 'Delhi',
      lastOrderValue: 3299,
    },
    {
      id: '3',
      name: 'Mike Johnson',
      email: 'mike@example.com',
      phone: '+91 76543 21098',
      totalOrders: 8,
      totalSpent: 28999,
      status: 'active',
      joinDate: '2023-12-10',
      lastOrderDate: '2024-09-26',
      city: 'Bangalore',
      lastOrderValue: 7899,
    },
    {
      id: '4',
      name: 'Sarah Wilson',
      email: 'sarah@example.com',
      phone: '+91 65432 10987',
      totalOrders: 1,
      totalSpent: 2199,
      status: 'inactive',
      joinDate: '2024-08-15',
      lastOrderDate: '2024-09-25',
      city: 'Hyderabad',
      lastOrderValue: 2199,
    },
    {
      id: '5',
      name: 'Robert Brown',
      email: 'robert@example.com',
      phone: '+91 54321 09876',
      totalOrders: 6,
      totalSpent: 22499,
      status: 'active',
      joinDate: '2024-03-05',
      lastOrderDate: '2024-09-24',
      city: 'Pune',
      lastOrderValue: 4599,
    },
    {
      id: '6',
      name: 'Emma Davis',
      email: 'emma@example.com',
      phone: '+91 43210 98765',
      totalOrders: 2,
      totalSpent: 11199,
      status: 'active',
      joinDate: '2024-05-12',
      lastOrderDate: '2024-09-23',
      city: 'Chennai',
      lastOrderValue: 9999,
    },
  ];

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm);
    const matchesFilter = filterStatus === 'all' || customer.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const selectedCustomerData = customers.find((c) => c.id === selectedCustomer);

  const getStatusBadge = (status: string) => {
    return status === 'active'
      ? 'bg-green-100 text-green-700'
      : 'bg-gray-100 text-gray-700';
  };

  const getTotalSpentTrend = (spent: number) => {
    const avgSpend = customers.reduce((sum, c) => sum + c.totalSpent, 0) / customers.length;
    const trend = ((spent - avgSpend) / avgSpend) * 100;
    return trend > 0 ? `+${trend.toFixed(1)}%` : `${trend.toFixed(1)}%`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Customers List */}
      <div className="lg:col-span-2 space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filter */}
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Filter className="w-5 h-5 text-gray-600" />
            <span className="hidden sm:inline">Filter</span>
          </button>
        </div>

        {/* Status Tabs */}
        <div className="flex gap-2">
          {['all', 'active', 'inactive'].map((status) => (
            <button
              key={status}
              onClick={() => {
                setFilterStatus(status as any);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 font-medium rounded-lg transition-colors capitalize ${
                filterStatus === status
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {status === 'all' ? 'All' : status}
            </button>
          ))}
        </div>

        {/* Customers Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Total Orders
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Total Spent
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    onClick={() => setSelectedCustomer(customer.id)}
                    className={`cursor-pointer transition-colors ${
                      selectedCustomer === customer.id
                        ? 'bg-blue-50'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{customer.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600">{customer.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{customer.totalOrders}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">
                        ₹{customer.totalSpent.toLocaleString()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(
                          customer.status
                        )}`}
                      >
                        {customer.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600">{customer.joinDate}</p>
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
              {Math.min(currentPage * itemsPerPage, filteredCustomers.length)} of{' '}
              {filteredCustomers.length} customers
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

      {/* Customer Details Panel */}
      {selectedCustomerData && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-fit sticky top-24">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Details</h3>

          {/* Name and Status */}
          <div className="mb-4 pb-4 border-b border-gray-200">
            <p className="text-2xl font-bold text-gray-900">{selectedCustomerData.name}</p>
            <span
              className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(
                selectedCustomerData.status
              )}`}
            >
              {selectedCustomerData.status}
            </span>
          </div>

          {/* Contact Info */}
          <div className="mb-6 pb-6 border-b border-gray-200 space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-600 uppercase">Email</p>
                <p className="text-sm text-gray-900 font-medium">{selectedCustomerData.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-600 uppercase">Phone</p>
                <p className="text-sm text-gray-900 font-medium">{selectedCustomerData.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-600 uppercase">City</p>
                <p className="text-sm text-gray-900 font-medium">{selectedCustomerData.city}</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <p className="text-sm font-semibold text-gray-900 mb-3">Customer Stats</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Orders</span>
                <span className="font-semibold text-gray-900">
                  {selectedCustomerData.totalOrders}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Spent</span>
                <span className="font-semibold text-gray-900">
                  ₹{selectedCustomerData.totalSpent.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Avg Order Value</span>
                <span className="font-semibold text-gray-900">
                  ₹{(selectedCustomerData.totalSpent / selectedCustomerData.totalOrders).toFixed(0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last Order</span>
                <span className="font-semibold text-gray-900">
                  ₹{selectedCustomerData.lastOrderValue.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <p className="text-sm font-semibold text-gray-900 mb-3">Timeline</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Joined</span>
                <span className="font-medium text-gray-900">{selectedCustomerData.joinDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last Order</span>
                <span className="font-medium text-gray-900">
                  {selectedCustomerData.lastOrderDate}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Send Message
            </button>
            <button className="w-full px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">
              View Orders
            </button>
            <button className="w-full px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">
              Edit Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersManagement;
