import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthUser, authApi, setTokens, clearTokens, isAuthenticated } from '@/lib/api';

interface AuthState {
  // State
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  setUser: (user: AuthUser | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: isAuthenticated(),
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login(email, password);
          if (response.data) {
            const { accessToken, refreshToken, expiresIn } = response.data;
            setTokens(accessToken, refreshToken);

            // Optionally fetch user profile here
            set({
              isAuthenticated: true,
              isLoading: false,
            });
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Login failed';
          set({
            isAuthenticated: false,
            isLoading: false,
            error: message,
          });
          throw error;
        }
      },

      register: async (email: string, password: string, name: string, phone?: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.register(email, password, name, phone);
          if (response.data) {
            const { accessToken, refreshToken } = response.data;
            setTokens(accessToken, refreshToken);

            set({
              isAuthenticated: true,
              isLoading: false,
            });
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Registration failed';
          set({
            isAuthenticated: false,
            isLoading: false,
            error: message,
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          clearTokens();
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      clearError: () => set({ error: null }),

      setUser: (user: AuthUser | null) => set({ user }),
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
      }),
    }
  )
);
