import { create } from 'zustand';
import { apiFetch } from '../api/client';
import { claimGuestProjects } from '../services/projectService';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  organization?: string;
  role: string;
  provider?: 'local' | 'google';
}

interface StoredLocalAccount {
  id: string;
  email: string;
  name: string;
  password?: string;
  organization?: string;
  role: string;
  provider: 'local' | 'google';
}

const USERS_KEY = 'bp_users';
const ACTIVE_USER_KEY = 'bp_user';
const TOKEN_KEY = 'bp_token';

function getLocalAccounts(): StoredLocalAccount[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalAccount(account: StoredLocalAccount): void {
  try {
    const accounts = getLocalAccounts();
    const idx = accounts.findIndex((a) => a.email.toLowerCase() === account.email.toLowerCase());
    if (idx !== -1) {
      accounts[idx] = { ...accounts[idx], ...account };
    } else {
      accounts.push(account);
    }
    localStorage.setItem(USERS_KEY, JSON.stringify(accounts));
  } catch (err) {
    console.error('Failed to save local account:', err);
  }
}

function getStoredUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(ACTIVE_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  setAuth: (user: UserProfile, token: string) => void;
  logout: () => void;
  loginWithEmail: (email: string, password: string) => Promise<UserProfile>;
  signupWithEmail: (name: string, email: string, password: string, organization?: string) => Promise<UserProfile>;
  loginWithGoogle: (email: string, name?: string) => Promise<UserProfile>;
  fetchMe: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: getStoredUser(),
  token: localStorage.getItem(TOKEN_KEY),
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  setAuth: (user, token) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(user));
    claimGuestProjects(user.id, user.email);
    set({ user, token, error: null, isLoading: false });
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ACTIVE_USER_KEY);
    set({ user: null, token: null, error: null, isLoading: false });
  },

  loginWithEmail: async (email: string, password: string): Promise<UserProfile> => {
    set({ isLoading: true, error: null });
    const cleanEmail = email.trim().toLowerCase();

    try {
      // 1. Try remote API first
      const data = await apiFetch<{ user: UserProfile; tokens: { accessToken: string; refreshToken?: string } }>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email: cleanEmail, password })
        }
      );

      const profile = { ...data.user, provider: 'local' as const };
      get().setAuth(profile, data.tokens.accessToken);
      return profile;
    } catch (apiErr: any) {
      console.warn('Remote login failed, trying local account storage:', apiErr?.message);

      // 2. Check local accounts fallback
      const accounts = getLocalAccounts();
      const existing = accounts.find((a) => a.email.toLowerCase() === cleanEmail);

      if (existing) {
        if (existing.password && existing.password !== password) {
          const msg = 'Incorrect password. Please verify and try again.';
          set({ error: msg, isLoading: false });
          throw new Error(msg);
        }

        const profile: UserProfile = {
          id: existing.id,
          email: existing.email,
          name: existing.name,
          organization: existing.organization,
          role: existing.role,
          provider: 'local'
        };

        const localToken = 'bp_tok_' + btoa(cleanEmail) + '_' + Date.now();
        get().setAuth(profile, localToken);
        return profile;
      }

      // If user not found and API failed with network/404, prompt account creation
      const errMsg = apiErr?.message?.includes('Invalid') 
        ? 'Invalid email or password.'
        : 'Account not found. Please sign up to create your account.';
      set({ error: errMsg, isLoading: false });
      throw new Error(errMsg);
    }
  },

  signupWithEmail: async (name: string, email: string, password: string, organization?: string): Promise<UserProfile> => {
    set({ isLoading: true, error: null });
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    try {
      // 1. Try remote API first
      const data = await apiFetch<{ user: UserProfile; tokens: { accessToken: string; refreshToken?: string } }>(
        '/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({ name: cleanName, email: cleanEmail, password, organization })
        }
      );

      const profile = { ...data.user, provider: 'local' as const };
      get().setAuth(profile, data.tokens.accessToken);
      return profile;
    } catch (apiErr: any) {
      console.warn('Remote registration failed, saving local account:', apiErr?.message);

      const accounts = getLocalAccounts();
      if (accounts.some((a) => a.email.toLowerCase() === cleanEmail)) {
        const msg = 'An account with this email address already exists. Please log in.';
        set({ error: msg, isLoading: false });
        throw new Error(msg);
      }

      const newId = 'usr_' + Date.now();
      const newAccount: StoredLocalAccount = {
        id: newId,
        email: cleanEmail,
        name: cleanName,
        password,
        organization,
        role: 'HOMEOWNER',
        provider: 'local'
      };

      saveLocalAccount(newAccount);

      const profile: UserProfile = {
        id: newId,
        email: cleanEmail,
        name: cleanName,
        organization,
        role: 'HOMEOWNER',
        provider: 'local'
      };

      const localToken = 'bp_tok_' + btoa(cleanEmail) + '_' + Date.now();
      get().setAuth(profile, localToken);
      return profile;
    }
  },

  loginWithGoogle: async (email: string, name?: string): Promise<UserProfile> => {
    set({ isLoading: true, error: null });
    const cleanEmail = email.trim().toLowerCase();
    const displayName = (name && name.trim()) || cleanEmail.split('@')[0].replace(/[._-]/g, ' ');
    const formattedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

    try {
      // 1. Try remote API endpoint
      const data = await apiFetch<{ user: UserProfile; tokens: { accessToken: string; refreshToken?: string } }>(
        '/auth/google',
        {
          method: 'POST',
          body: JSON.stringify({ email: cleanEmail, name: formattedName, googleId: 'g_' + Date.now() })
        }
      );

      const profile = { ...data.user, provider: 'google' as const };
      get().setAuth(profile, data.tokens.accessToken);
      return profile;
    } catch (apiErr: any) {
      console.warn('Remote Google auth failed, initializing local Google profile:', apiErr?.message);

      // 2. Offline / local fallback
      const accounts = getLocalAccounts();
      let account = accounts.find((a) => a.email.toLowerCase() === cleanEmail);

      if (!account) {
        account = {
          id: 'google_' + btoa(cleanEmail).replace(/=/g, '').slice(0, 16),
          email: cleanEmail,
          name: formattedName,
          role: 'HOMEOWNER',
          provider: 'google'
        };
        saveLocalAccount(account);
      }

      const profile: UserProfile = {
        id: account.id,
        email: account.email,
        name: account.name,
        role: account.role,
        provider: 'google'
      };

      const localToken = 'bp_google_tok_' + btoa(cleanEmail) + '_' + Date.now();
      get().setAuth(profile, localToken);
      return profile;
    }
  },

  fetchMe: async () => {
    const token = get().token;
    if (!token) return;

    try {
      set({ isLoading: true });
      const user = await apiFetch<UserProfile>('/auth/me');
      set({ user, isLoading: false });
    } catch {
      // Keep stored user if offline
      const stored = getStoredUser();
      set({ user: stored, isLoading: false });
    }
  }
}));
