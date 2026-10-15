import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AdminLogin from './components/shared/AdminLogin';
import AdminRouter from './AdminRouter';
import AdminInvoicePage from './components/shared/AdminInvoicePage';
import AdminPrintPage from './components/shared/AdminPrintPage';

/** The whole admin website: its own login page, then the panel (staff only). */
const AdminApp: React.FC = () => (
  <Routes>
    <Route path="/login" element={<AdminLogin />} />
    <Route path="/orders/:orderNumber/invoice" element={<AdminInvoicePage />} />
    <Route path="/print" element={<AdminPrintPage />} />
    <Route path="/*" element={<AdminRouter />} />
  </Routes>
);

export default AdminApp;
