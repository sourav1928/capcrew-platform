import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Warehouse,
  BarChart2,
  Tag,
  Settings,
  ChevronRight,
  X,
  ExternalLink,
  LogOut,
  LayoutTemplate,
} from 'lucide-react';
import { useDashboard } from '../../hooks/useAdminQueries';
import { useAdminUser } from '../shared/AdminGuard';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: number | string;
  children?: { label: string; path: string }[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/',
    icon: <LayoutDashboard className="w-[18px] h-[18px]" />,
  },
  {
    label: 'Products',
    path: '/products',
    icon: <Package className="w-[18px] h-[18px]" />,
    children: [
      { label: 'All Products', path: '/products' },
      { label: 'Add Product', path: '/products/new' },
      { label: 'Categories', path: '/products/categories' },
    ],
  },
  {
    label: 'Orders',
    path: '/orders',
    icon: <ShoppingBag className="w-[18px] h-[18px]" />,
    children: [
      { label: 'All Orders', path: '/orders' },
      { label: 'New (confirmed)', path: '/orders?status=confirmed' },
      { label: 'Packed', path: '/orders?status=processing' },
      { label: 'Shipped', path: '/orders?status=shipped' },
      { label: 'Delivered', path: '/orders?status=delivered' },
    ],
  },
  {
    label: 'Customers',
    path: '/customers',
    icon: <Users className="w-[18px] h-[18px]" />,
  },
  {
    label: 'Inventory',
    path: '/inventory',
    icon: <Warehouse className="w-[18px] h-[18px]" />,
  },
  {
    label: 'Analytics',
    path: '/analytics',
    icon: <BarChart2 className="w-[18px] h-[18px]" />,
  },
  {
    label: 'Website',
    path: '/website',
    icon: <LayoutTemplate className="w-[18px] h-[18px]" />,
  },
  {
    label: 'Promotions',
    path: '/promotions',
    icon: <Tag className="w-[18px] h-[18px]" />,
  },
  {
    label: 'Settings',
    path: '/settings',
    icon: <Settings className="w-[18px] h-[18px]" />,
  },
];

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const me = useAdminUser();
  const { data: stats } = useDashboard(30);
  const badges: Record<string, number | undefined> = { Orders: stats?.kpis.pending_orders, Inventory: stats?.kpis.low_stock_items };
  const logout = () => { localStorage.removeItem('authToken'); localStorage.removeItem('user'); window.location.href = '/login'; };
  const shopUrl: string = (import.meta as any).env.VITE_SHOP_URL || 'http://localhost:5175';
  const [expanded, setExpanded] = useState<string | null>(() => {
    // Auto-expand parent based on current route
    const active = navItems.find(
      (n) => n.children && location.pathname.startsWith(n.path) && n.path !== '/'
    );
    return active?.label ?? null;
  });

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path.split('?')[0]);
  };

  const toggleExpand = (label: string) => {
    setExpanded((prev) => (prev === label ? null : label));
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-screen w-64 bg-slate-900 flex flex-col z-50
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
        `}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm leading-none">C</span>
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none">CapCrew</p>
              <p className="text-slate-400 text-xs mt-0.5">Seller Dashboard</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const active = isActive(item.path);
              const hasChildren = item.children && item.children.length > 0;
              const isExpanded = expanded === item.label;

              return (
                <div key={item.label}>
                  {hasChildren ? (
                    <button
                      onClick={() => toggleExpand(item.label)}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        active
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        {item.icon}
                        <span className="font-medium">{item.label}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        {badges[item.label] ? (
                          <span className="bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
                            {badges[item.label]}
                          </span>
                        ) : null}
                        <ChevronRight
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${
                            isExpanded ? 'rotate-90' : ''
                          }`}
                        />
                      </span>
                    </button>
                  ) : (
                    <Link
                      to={item.path}
                      onClick={onClose}
                      className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        active
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        {item.icon}
                        <span className="font-medium">{item.label}</span>
                      </span>
                      {badges[item.label] ? (
                        <span className="bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
                          {badges[item.label]}
                        </span>
                      ) : null}
                    </Link>
                  )}

                  {/* Sub-items */}
                  {hasChildren && isExpanded && (
                    <div className="mt-0.5 mb-1 ml-3 pl-6 border-l border-slate-700 space-y-0.5">
                      {item.children!.map((child) => (
                        <Link
                          key={child.path}
                          to={child.path}
                          onClick={onClose}
                          className={`block px-3 py-2 rounded-lg text-xs transition-colors ${
                            location.pathname === child.path.split('?')[0]
                              ? 'text-white bg-slate-700'
                              : 'text-slate-400 hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-slate-800">
          <a
            href={shopUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>View Store</span>
          </a>
          <div className="mt-3 px-3 py-3 bg-slate-800 rounded-lg">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {(me?.email || 'A').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white text-xs font-semibold truncate">{me?.is_superuser ? 'Owner' : 'Staff'}</p>
                <p className="text-slate-400 text-xs truncate">{me?.email}</p>
              </div>
              <button onClick={logout} title="Log out" aria-label="Log out" className="text-slate-400 hover:text-white p-1"><LogOut className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
