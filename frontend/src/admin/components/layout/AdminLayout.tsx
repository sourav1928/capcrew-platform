import React, { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../../services/queryClient';
import { ToastProvider } from '../shared/Toast';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <div className="flex h-screen bg-gray-50 overflow-hidden">
          {/* Sidebar */}
          <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          {/* Main area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <AdminHeader onMenuToggle={() => setSidebarOpen((v) => !v)} />
            <main className="flex-1 overflow-y-auto">
              <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
                {children}
              </div>
            </main>
          </div>
        </div>
      </ToastProvider>
    </QueryClientProvider>
  );
};

export default AdminLayout;
