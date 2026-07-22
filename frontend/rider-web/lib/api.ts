export * from './types';
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ApiResponse, PaginatedResponse, ApiError, AuthTokens } from './types';

// ============================================================================
// Configuration - Use BFF proxy instead of direct backend
// ============================================================================

const API_URL = '/api/proxy'; // BFF proxy endpoint
const TOKEN_KEY = process.env.NEXT_PUBLIC_JWT_STORAGE_KEY || 'scooter_token';
const REFRESH_TOKEN_KEY = `${TOKEN_KEY}_refresh`;

// ============================================================================
// Axios Instance
// ============================================================================

let axiosInstance: AxiosInstance | null = null;
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: any) => void;
}> = [];

const processQueue = (error: any, token?: string) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });

  failedQueue = [];
};

function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: API_URL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true, // Send cookies automatically with each request
  });

  // ────────────────────────────────────────────────────────────────────────
  // Response Interceptor: Handle Errors
  // ────────────────────────────────────────────────────────────────────────
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const isGhostSession =
        error.response?.status === 404 &&
        error.config?.url?.includes('auth/me');

      if (error.response?.status === 401 || isGhostSession) {
        if (typeof window !== 'undefined') {
          let feature = 'your account';
          const url = error.config?.url || '';

          if (url.includes('wallet') || url.includes('payment')) feature = 'your Wallet';
          else if (url.includes('history') || url.includes('rides')) feature = 'your Ride History';
          else if (url.includes('profile') || url.includes('auth/me')) feature = 'your Profile';

          // Force NextAuth state to clear locally so the Menu and other UI updates
          const { signOut } = await import('next-auth/react');
          await signOut({ redirect: false });

          window.dispatchEvent(new CustomEvent('auth-required', { detail: { feature } }));
        }
        // Return a never-resolving promise to prevent UI from rendering the error while redirecting
        return new Promise(() => {});
      }

      return Promise.reject(handleApiError(error));
    },
  );

  return client;
}

// ============================================================================
// Token Management (Deprecated - using HTTPOnly cookies via BFF)
// ============================================================================

export function getAccessToken(): string | null {
  // Tokens are now in HTTPOnly cookies, not accessible from client
  return null;
}

export function getRefreshToken(): string | null {
  // Tokens are now in HTTPOnly cookies, not accessible from client
  return null;
}

export function setTokens(accessToken: string, refreshToken: string): void {
  // Tokens are set by NextAuth via HTTPOnly cookies
}

export function clearTokens(): void {
  // Tokens are cleared via NextAuth signOut
}

export function isAuthenticated(): boolean {
  // Check via NextAuth useSession hook instead
  return false;
}

// ============================================================================
// Error Handling
// ============================================================================

function handleApiError(error: AxiosError<any>): ApiError {
  if (error.response) {
    // Server responded with error status
    const data = error.response.data;
    const status = error.response.status;
    const code = data?.code || `HTTP_${status}`;
    const message = data?.error || data?.message || error.message || 'An error occurred';

    return new ApiError(status, code, message, data?.details);
  }

  if (error.request) {
    // Request made but no response
    return new ApiError(0, 'NO_RESPONSE', 'No response from server');
  }

  // Error in request setup
  return new ApiError(0, 'REQUEST_ERROR', error.message || 'An error occurred');
}

// ============================================================================
// API Client Instance
// ============================================================================

export function getApiClient(): AxiosInstance {
  if (!axiosInstance) {
    axiosInstance = createApiClient();
  }
  return axiosInstance;
}

// ============================================================================
// Generic Request Methods
// ============================================================================

export const api = {
  // GET request
  get<T>(url: string, config?: any) {
    return getApiClient()
      .get<ApiResponse<T>>(url, config)
      .then((res) => res.data);
  },

  // GET paginated
  getPaginated<T>(url: string, config?: any) {
    return getApiClient()
      .get<PaginatedResponse<T>>(url, config)
      .then((res) => res.data);
  },

  // POST request
  post<T>(url: string, data?: any, config?: any) {
    return getApiClient()
      .post<ApiResponse<T>>(url, data, config)
      .then((res) => res.data);
  },

  // PUT request
  put<T>(url: string, data?: any, config?: any) {
    return getApiClient()
      .put<ApiResponse<T>>(url, data, config)
      .then((res) => res.data);
  },

  // PATCH request
  patch<T>(url: string, data?: any, config?: any) {
    return getApiClient()
      .patch<ApiResponse<T>>(url, data, config)
      .then((res) => res.data);
  },

  // DELETE request
  delete<T>(url: string, config?: any) {
    return getApiClient()
      .delete<ApiResponse<T>>(url, config)
      .then((res) => res.data);
  },
};

// ============================================================================
// Specific API Endpoints
// ============================================================================

export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthTokens>('/auth/login', { email, password }),

  register: (email: string, password: string, name: string, phone?: string) =>
    api.post<AuthTokens>('/auth/register', { email, password, name, phone }),

  refresh: (refreshToken: string) => api.post<AuthTokens>('/auth/refresh', { refreshToken }),

  logout: () => api.post('/auth/logout'),
};

export const dockApi = {
  list: () => api.get('/docks'),

  nearest: (latitude: number, longitude: number, limit = 5) =>
    api.get(`/docks/nearest?lat=${latitude}&lng=${longitude}&limit=${limit}`),

  getById: (id: string) => api.get(`/docks/${id}`),

  getStatus: (id: string) => api.get(`/docks/${id}/status`),
};

export const bikeApi = {
  list: () => api.get('/fleet/bikes'),

  nearest: (latitude: number, longitude: number, limit = 5) =>
    api.get(`/fleet/nearby?lat=${latitude}&lng=${longitude}&limit=${limit}`),

  getById: (id: string) => api.get(`/fleet/bikes/${id}`),
};

export const rideApi = {
  reserve: (bikeId: string, startDockId?: string) => api.post('/rides', { bikeId, startDockId }),

  start: (rideId: string) => api.post(`/rides/${rideId}/start`, {}),

  end: (rideId: string, endDockId: string, latitude: number, longitude: number) =>
    api.post(`/rides/${rideId}/end`, { endDockId, latitude, longitude }),

  getHistory: (page = 1, limit = 20) =>
    api.getPaginated(`/rides/history?page=${page}&limit=${limit}`),

  getById: (id: string) => api.get(`/rides/${id}`),

  dispute: (id: string, reason: string) => api.post(`/rides/${id}/dispute`, { reason }),
};

export const userApi = {
  getProfile: () => api.get('/auth/me'),

  updateProfile: (data: any) => api.put('/auth/user/profile', data),

  getWallet: () =>
    api.get('/auth/me').then((res: any) => {
      // Adapter: convert walletCents from backend to NGN balance on frontend
      return { data: { balance: (res.data?.data?.walletCents || 0) / 100 } };
    }),
  topUpWallet: (reference: string) => {
    return api.post('/auth/wallet/topup', { reference }).then((res: any) => {
      // Return updated balance converted from cents
      return { data: { balance: (res.data?.data?.walletCents || 0) / 100 } };
    });
  },

  topUp: (amount: number, paymentMethodId: string) => Promise.resolve({ data: { success: true } }),

  getTransactions: (page = 1, limit = 20) =>
    Promise.resolve({ data: [], pagination: { hasMore: false } }),
};

export const paymentApi = {
  initializeTopUp: (email: string, amountCents: number) => 
    api.post('/payments/initialize', { email, amountCents }),
};

export const pricingApi = {
  estimate: (lat: number, lng: number, distKm: number = 1, durMin: number = 5) =>
    api.get<{
      baseFare: number;
      perMinute: number;
      perKm: number;
      surgeMult: number;
      estimatedFareCents: number;
    }>(`/pricing/estimate?lat=${lat}&lng=${lng}&distKm=${distKm}&durMin=${durMin}`),

  getSurge: (latitude: number, longitude: number) =>
    api.get(`/pricing/surge?lat=${latitude}&lng=${longitude}`),
};
