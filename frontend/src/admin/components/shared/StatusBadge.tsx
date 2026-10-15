import React from 'react';
import type { OrderStatus } from '../../types';

interface StatusBadgeProps {
  status: string;
  variant?: 'order' | 'payment' | 'product' | 'inventory' | 'promotion' | 'customer';
}

const orderColors: Record<string, string> = {
  pending:    'bg-amber-50 text-amber-700 border-amber-200',
  confirmed:  'bg-blue-50 text-blue-700 border-blue-200',
  processing: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  shipped:    'bg-purple-50 text-purple-700 border-purple-200',
  delivered:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled:  'bg-red-50 text-red-700 border-red-200',
  refunded:   'bg-gray-100 text-gray-600 border-gray-200',
};

const paymentColors: Record<string, string> = {
  paid:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending:  'bg-amber-50 text-amber-700 border-amber-200',
  failed:   'bg-red-50 text-red-700 border-red-200',
  refunded: 'bg-gray-100 text-gray-600 border-gray-200',
};

const productColors: Record<string, string> = {
  active:       'bg-emerald-50 text-emerald-700 border-emerald-200',
  inactive:     'bg-gray-100 text-gray-600 border-gray-200',
  discontinued: 'bg-red-50 text-red-700 border-red-200',
  draft:        'bg-amber-50 text-amber-700 border-amber-200',
};

const inventoryColors: Record<string, string> = {
  in_stock:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  low_stock:   'bg-amber-50 text-amber-700 border-amber-200',
  out_of_stock:'bg-red-50 text-red-700 border-red-200',
  overstocked: 'bg-blue-50 text-blue-700 border-blue-200',
};

const promotionColors: Record<string, string> = {
  active:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  inactive:  'bg-gray-100 text-gray-600 border-gray-200',
  expired:   'bg-red-50 text-red-700 border-red-200',
  scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
};

const customerColors: Record<string, string> = {
  active:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  inactive: 'bg-gray-100 text-gray-600 border-gray-200',
  blocked:  'bg-red-50 text-red-700 border-red-200',
};

const variantMap: Record<string, Record<string, string>> = {
  order:      orderColors,
  payment:    paymentColors,
  product:    productColors,
  inventory:  inventoryColors,
  promotion:  promotionColors,
  customer:   customerColors,
};

const labelMap: Record<string, string> = {
  in_stock:    'In Stock',
  low_stock:   'Low Stock',
  out_of_stock:'Out of Stock',
  overstocked: 'Overstocked',
  buy_x_get_y: 'Buy X Get Y',
  free_shipping:'Free Shipping',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, variant = 'order' }) => {
  const colors = variantMap[variant] ?? orderColors;
  const colorClass = colors[status] ?? 'bg-gray-100 text-gray-600 border-gray-200';
  const label = labelMap[status] ?? status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorClass}`}>
      {label}
    </span>
  );
};
