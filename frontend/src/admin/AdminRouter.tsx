import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/layout/AdminLayout';
import AdminGuard from './components/shared/AdminGuard';
import AdminDashboard from './components/dashboard/AdminDashboard';
import AdminProducts from './components/products/AdminProducts';
import AdminOrders from './components/orders/AdminOrders';
import AdminCustomers from './components/customers/AdminCustomers';
import AdminInventory from './components/inventory/AdminInventory';
import AdminAnalytics from './components/analytics/AdminAnalytics';
import AdminPromotions from './components/promotions/AdminPromotions';
import AdminSettings from './components/settings/AdminSettings';
import AdminWebsite from './components/website/AdminWebsite';

const AdminRouter: React.FC = () => {
  return (
    <AdminGuard>
    <AdminLayout>
      <Routes>
        <Route path="/" element={<AdminDashboard />} />
        <Route path="/products" element={<AdminProducts />} />
        <Route path="/products/*" element={<AdminProducts />} />
        <Route path="/orders" element={<AdminOrders />} />
        <Route path="/orders/*" element={<AdminOrders />} />
        <Route path="/customers" element={<AdminCustomers />} />
        <Route path="/customers/*" element={<AdminCustomers />} />
        <Route path="/inventory" element={<AdminInventory />} />
        <Route path="/inventory/*" element={<AdminInventory />} />
        <Route path="/analytics" element={<AdminAnalytics />} />
        <Route path="/analytics/*" element={<AdminAnalytics />} />
        <Route path="/promotions" element={<AdminPromotions />} />
        <Route path="/promotions/*" element={<AdminPromotions />} />
        <Route path="/website" element={<AdminWebsite />} />
        <Route path="/website/*" element={<AdminWebsite />} />
        <Route path="/settings" element={<AdminSettings />} />
        <Route path="/settings/*" element={<AdminSettings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AdminLayout>
    </AdminGuard>
  );
};

export default AdminRouter;
