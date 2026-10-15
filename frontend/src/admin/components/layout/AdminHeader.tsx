import React from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, RefreshCw } from 'lucide-react';
import { useAdminUser } from '../shared/AdminGuard';

interface AdminHeaderProps {
  onMenuToggle: () => void;
}

const routeTitles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Your store at a glance' },
  '/products': { title: 'Products', subtitle: 'Manage your product catalog' },
  '/products/new': { title: 'Add Product', subtitle: 'Create a new product listing' },
  '/products/categories': { title: 'Categories', subtitle: 'Organize your catalog' },
  '/orders': { title: 'Orders', subtitle: 'Track and fulfill customer orders' },
  '/customers': { title: 'Customers', subtitle: 'Know your buyers' },
  '/inventory': { title: 'Inventory', subtitle: 'Stock levels and low-stock alerts' },
  '/analytics': { title: 'Analytics', subtitle: 'Sales performance and trends' },
  '/promotions': { title: 'Promotions', subtitle: 'Discount coupons for your customers' },
  '/website': { title: 'Website', subtitle: 'Banners, featured products and pages' },
  '/settings': { title: 'Settings', subtitle: 'Store configuration' },
};

const AdminHeader: React.FC<AdminHeaderProps> = ({ onMenuToggle }) => {
  const location = useLocation();
  const me = useAdminUser();
  const pathKey = Object.keys(routeTitles)
    .sort((a, b) => b.length - a.length)
    .find((k) => location.pathname.startsWith(k) || location.pathname === k);
  const meta = pathKey ? routeTitles[pathKey] : { title: 'Admin', subtitle: '' };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-100 h-16 flex items-center px-4 sm:px-6 gap-4">
      {/* Mobile menu toggle */}
      <button
        onClick={onMenuToggle}
        className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        aria-label="Toggle menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-semibold text-gray-900 leading-tight">{meta.title}</h1>
        <p className="text-xs text-gray-400 hidden sm:block">{meta.subtitle}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => window.location.reload()}
          className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          title="Refresh data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold ml-1 cursor-pointer select-none">
          {(me?.email || 'A').charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
