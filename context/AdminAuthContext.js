'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, logOut } from '@/lib/appwrite';
import { useRouter } from 'next/navigation';

const AdminAuthContext = createContext({});

export const AdminAuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
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
        setAdmin(result);
      } else {
        // No user found, redirect to login
        setAdmin(null);
        router.push('/Admin/admin-login');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setAdmin(null);
      router.push('/Admin/admin-login');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await logOut();
      setAdmin(null);
      router.push('/Admin/admin-login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value = {
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

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return context;
};