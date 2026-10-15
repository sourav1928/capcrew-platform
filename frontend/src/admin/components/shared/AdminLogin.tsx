import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Loader2, Lock, ShieldCheck } from 'lucide-react';

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:8001/api/v1';

/** Staff sign-in for the admin website. Customer accounts are refused here. */
const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (localStorage.getItem('authToken')) return <Navigate to="/" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/login/`, { email: email.trim(), password });
      const token: string = res.data.token;
      const me = await axios.get(`${API_BASE_URL}/admin/me/`, { headers: { Authorization: `Bearer ${token}` } });
      if (!me.data?.data?.is_staff) {
        setError('This account is not allowed to use the admin panel.');
        return;
      }
      localStorage.setItem('authToken', token);
      const next = new URLSearchParams(window.location.search).get('next');
      navigate(next && next.startsWith('/') && !next.startsWith('//') ? next : '/', { replace: true });
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401 || status === 400) setError(err?.response?.data?.message || 'Wrong email or password.');
      else if (status === 403) setError('This account is not allowed to use the admin panel.');
      else if (err?.message === 'Network Error') setError('Cannot reach the server. Is the backend running?');
      else setError('Could not sign in. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8">
        <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-4"><ShieldCheck className="w-6 h-6" /></div>
        <h1 className="text-2xl font-bold text-gray-900">Store admin</h1>
        <p className="text-sm text-gray-500 mb-6">Sign in with your staff account to manage the store.</p>

        {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3" role="alert">{error}</div>}

        <label className="block mb-4">
          <span className="block text-sm font-medium text-gray-700 mb-1">Email</span>
          <input type="email" autoComplete="username" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400" />
        </label>
        <label className="block mb-6">
          <span className="block text-sm font-medium text-gray-700 mb-1">Password</span>
          <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400" />
        </label>
        <button type="submit" disabled={busy}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-blue-300">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />} Sign in
        </button>
      </form>
    </div>
  );
};

export default AdminLogin;
