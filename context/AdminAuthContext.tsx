'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCurrentUser, logOut } from '@/lib/appwrite';
import { useRouter } from 'next/navigation';

// Define the shape of your admin/user object
interface Admin {
  $id: string;
  email: string;
  name?: string;
  // Add other properties from your Appwrite user object
}

// Define the context type
interface AdminAuthContextType {
  admin: Admin | null;
  loading: boolean;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

// Create context with proper typing
const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

interface AdminAuthProviderProps {
  children: ReactNode;
}

export const AdminAuthProvider = ({ children }: AdminAuthProviderProps) => {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const result = await getCurrentUser(); // This returns user object
      
      if (result) {
        // User is logged in, set admin state
        setAdmin(result as Admin);
      } else {
        // No user found, redirect to login
        setAdmin(null);
        router.push('/admin-login');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setAdmin(null);
      router.push('/admin-login');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await logOut();
      setAdmin(null);
      router.push('/admin-login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value: AdminAuthContextType = {
    admin,
    loading,
    checkAuth,
    logout,
    isAuthenticated: !!admin,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = (): AdminAuthContextType => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return context;
};