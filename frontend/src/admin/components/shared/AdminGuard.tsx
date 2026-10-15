import React, { createContext, useContext, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { adminApi, errorMessage } from '../../services';
import type { AdminUser } from '../../types';
import { Spinner } from './ui';

const AdminUserContext = createContext<AdminUser | null>(null);
export const useAdminUser = () => useContext(AdminUserContext);

/** Only staff may see the admin panel. Everyone else is sent to log in or told they have no access. */
const AdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const hasToken = !!localStorage.getItem('authToken');
  const [user, setUser] = useState<AdminUser | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'denied' | 'error'>(hasToken ? 'loading' : 'denied');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!hasToken) return;
    adminApi.me()
      .then((u) => { setUser(u); setState(u.is_staff ? 'ok' : 'denied'); })
      .catch((err) => { setError(errorMessage(err)); setState('error'); });
  }, [hasToken]);

  const logout = () => { localStorage.removeItem('authToken'); window.location.href = '/login'; };
  if (!hasToken) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (state === 'loading') return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Spinner label="Opening admin panel…" /></div>;
  if (state === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-center">
        <div><p className="font-semibold text-gray-900 mb-1">Could not open the admin panel</p><p className="text-sm text-gray-500">{error}</p></div>
      </div>
    );
  }
  if (state === 'denied') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-center">
        <div className="max-w-sm">
          <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-gray-900 mb-1">Admin access only</h1>
          <p className="text-sm text-gray-500 mb-5">
            Your account does not have permission to manage the store. Ask the store owner to give you staff access.
          </p>
          <button onClick={logout} className="text-blue-600 font-semibold hover:underline">Sign in with another account</button>
        </div>
      </div>
    );
  }
  return <AdminUserContext.Provider value={user}>{children}</AdminUserContext.Provider>;
};

export default AdminGuard;
