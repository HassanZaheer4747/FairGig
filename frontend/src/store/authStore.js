import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('fg_user') || 'null'),
  token: localStorage.getItem('fg_token') || null,
  isAuthenticated: !!localStorage.getItem('fg_token'),

  setAuth: (user, token) => {
    localStorage.setItem('fg_token', token);
    localStorage.setItem('fg_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('fg_token');
    localStorage.removeItem('fg_user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  updateUser: (user) => {
    localStorage.setItem('fg_user', JSON.stringify(user));
    set({ user });
  },
}));
