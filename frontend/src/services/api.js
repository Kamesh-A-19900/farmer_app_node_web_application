import axios from 'axios';

// In production (Vercel), VITE_API_URL must be set to the Render backend URL.
// In development, auto-detect from browser hostname.
const BASE_URL = import.meta.env.VITE_API_URL
  || `http://${window.location.hostname}:5000/api`;

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
