import axios, { InternalAxiosRequestConfig } from 'axios';

interface RetryConfig extends InternalAxiosRequestConfig {
  _isRetry?: boolean;
}

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalConfig = err.config as RetryConfig;
    const isAuthPage = typeof window !== 'undefined' && window.location.pathname.startsWith('/auth');
    if (err.response?.status === 401 && !originalConfig._isRetry && !isAuthPage) {
      originalConfig._isRetry = true;
      try {
        await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh-token`, {}, { withCredentials: true });
        return apiClient.request(originalConfig);
      } catch {
        if (typeof window !== 'undefined') window.location.href = '/auth/login';
      }
    }
    return Promise.reject(err);
  }
);

export default apiClient;
