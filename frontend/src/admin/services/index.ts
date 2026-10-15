import axios from 'axios';
import { AdminApiClient } from './adminApi';

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:8001/api/v1';

// Create axios instance
const httpClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests (the login screens store it under "authToken")
httpClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Session expired -> send the person to log in again, then bring them back here
httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem('authToken')) {
      localStorage.removeItem('authToken');
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?next=${next}`;
    }
    return Promise.reject(error);
  }
);

// Create admin API client instance
export const adminApi = new AdminApiClient(httpClient);

export * from './adminApi';
