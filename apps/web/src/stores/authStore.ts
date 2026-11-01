import { create } from 'zustand';
import { apiFetch } from '../api/client';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  organization?: string;
  role: string;
}

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  setAuth: (user: UserProfile, token: string) => void;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('bp_token'),
  isLoading: false,
  error: null,

  setAuth: (user, token) => {
    localStorage.setItem('bp_token', token);
    set({ user, token, error: null });
  },

  logout: () => {
    localStorage.removeItem('bp_token');
    set({ user: null, token: null });
  },

  fetchMe: async () => {
    try {
      set({ isLoading: true });
      const user = await apiFetch<UserProfile>('/auth/me');
      set({ user, isLoading: false });
    } catch {
      set({ user: null, isLoading: false });
    }
  }
}));
