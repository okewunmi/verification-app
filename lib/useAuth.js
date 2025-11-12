import { create } from 'zustand';
import { getCurrentAdmin, adminLogout } from './appwrite';

// ✅ Global state management (persists across components)
export const useAuthStore = create((set, get) => ({
  user: null,
  loading: true,
  lastChecked: null,
  
  setUser: (user) => set({ user, loading: false }),
  setLoading: (loading) => set({ loading }),
  
  // ✅ Check auth with caching (5 minute cache)
  checkAuth: async (forceRefresh = false) => {
    const state = get();
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    // Return cached user if within 5 minutes
    if (
      !forceRefresh && 
      state.user && 
      state.lastChecked && 
      (now - state.lastChecked) < fiveMinutes
    ) {
      console.log('✅ Using cached user session');
      return { success: true, user: state.user };
    }
    
    // Fetch fresh data
    set({ loading: true });
    const result = await getCurrentAdmin();
    
    if (result.success) {
      set({ 
        user: result.user, 
        loading: false, 
        lastChecked: now 
      });
    } else {
      set({ user: null, loading: false });
    }
    
    return result;
  },
  
  // ✅ Logout and clear cache
  logout: async () => {
    await adminLogout();
    set({ user: null, loading: false, lastChecked: null });
  },
  
  // ✅ Clear cache manually
  clearCache: () => set({ user: null, lastChecked: null })
}));

// ✅ Custom hook for easy usage
export const useAuth = () => {
  const { user, loading, checkAuth, logout, clearCache } = useAuthStore();
  
  return {
    user,
    loading,
    isAuthenticated: !!user,
    checkAuth,
    logout,
    clearCache
  };
};