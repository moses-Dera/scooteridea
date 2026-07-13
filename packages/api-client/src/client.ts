import axios from 'axios';

// API Gateway base URL from environment (default to localhost:80 for dev)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:80';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Configure Interceptors for JWT Injection
export const setupAuthInterceptor = (getToken: () => string | null) => {
  apiClient.interceptors.request.use(
    (config) => {
      const token = getToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    },
  );
};

export default apiClient;
