import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  BarChart3,
  Package,
  ShoppingCart,
  Users,
  Settings,
  LogOut,
  ChevronDown,
} from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  submenu?: { name: string; path: string }[];
}

const AdminSidebar: React.FC = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

  const navItems: NavItem[] = [
    {
      name: 'Dashboard',
      path: '/admin',
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      name: 'Products',
      path: '/admin/products',
      icon: <Package className="w-5 h-5" />,
      submenu: [
        { name: 'All Products', path: '/admin/products' },
        { name: 'Categories', path: '/admin/products/categories' },
        { name: 'Add New', path: '/admin/products/new' },
        { name: 'Bulk Import', path: '/admin/products/bulk-import' },
      ],
    },
    {
      name: 'Orders',
      path: '/admin/orders',
      icon: <ShoppingCart className="w-5 h-5" />,
      submenu: [
        { name: 'All Orders', path: '/admin/orders' },
        { name: 'Pending', path: '/admin/orders?status=pending' },
        { name: 'Completed', path: '/admin/orders?status=completed' },
        { name: 'Cancelled', path: '/admin/orders?status=cancelled' },
      ],
    },
    {
      name: 'Customers',
      path: '/admin/customers',
      icon: <Users className="w-5 h-5" />,
      submenu: [
        { name: 'All Customers', path: '/admin/customers' },
        { name: 'Active', path: '/admin/customers?status=active' },
        { name: 'Inactive', path: '/admin/customers?status=inactive' },
      ],
    },
    {
      name: 'Analytics',
      path: '/admin/analytics',
      icon: <BarChart3 className="w-5 h-5" />,
      submenu: [
        { name: 'Overview', path: '/admin/analytics' },
        { name: 'Sales', path: '/admin/analytics/sales' },
        { name: 'Products', path: '/admin/analytics/products' },
        { name: 'Customers', path: '/admin/analytics/customers' },
      ],
    },
    {
      name: 'Settings',
      path: '/admin/settings',
      icon: <Settings className="w-5 h-5" />,
      submenu: [
        { name: 'General', path: '/admin/settings/general' },
        { name: 'Shipping', path: '/admin/settings/shipping' },
        { name: 'Payment', path: '/admin/settings/payment' },
        { name: 'Tax', path: '/admin/settings/tax' },
      ],
    },
  ];

  const isActive = (path: string) => location.pathname === path;
  const isActiveParent = (path: string) =>
    location.pathname.startsWith(path) && path !== '/admin';

  const toggleSubmenu = (name: string) => {
    setExpandedMenu(expandedMenu === name ? null : name);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50"
        >
          {isOpen ? (
            <X className="w-6 h-6 text-gray-700" />
          ) : (
            <Menu className="w-6 h-6 text-gray-700" />
          )}
        </button>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-gray-900 text-white w-64 overflow-y-auto z-40 transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-2xl font-bold text-blue-400">Admin Panel</h1>
          <p className="text-sm text-gray-400 mt-1">CapCrew</p>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navItems.map((item) => (
            <div key={item.name}>
              {item.submenu ? (
                <>
                  <button
                    onClick={() => toggleSubmenu(item.name)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                      isActiveParent(item.path)
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      {item.icon}
                      {item.name}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        expandedMenu === item.name ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Submenu */}
                  {expandedMenu === item.name && (
                    <div className="bg-gray-800 rounded-lg mt-1 overflow-hidden">
                      {item.submenu.map((subitem) => (
                        <Link
                          key={subitem.path}
                          to={subitem.path}
                          onClick={() => setIsOpen(false)}
                          className={`block px-6 py-2 text-sm transition-colors ${
                            isActive(subitem.path)
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-400 hover:text-white hover:bg-gray-700'
                          }`}
                        >
                          {subitem.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  {item.icon}
                  {item.name}
                </Link>
              )}
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors">
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content offset */}
      <div className="lg:ml-64" />
    </>
  );
};

export default AdminSidebar;
