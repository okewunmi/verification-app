'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentStudent, studentLogout } from '@/lib/appwrite';
import { useRouter } from 'next/navigation';

const StudentAuthContext = createContext({});

export const StudentAuthProvider = ({ children }) => {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const result = await getCurrentStudent();
      if (result) {
        setStudent(result);
      } else {
        setStudent(null);
 router.push('/student/student-login');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setStudent(null);
 router.push('/student/student-login');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await studentLogout();
      setStudent(null);
      router.push('/student/student-login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value = {
    student,
    loading,
    checkAuth,
    logout,
    isAuthenticated: !!student,
  };

  return (
    <StudentAuthContext.Provider value={value}>
      {children}
    </StudentAuthContext.Provider>
  );
};

export const useStudentAuth = () => {
  const context = useContext(StudentAuthContext);
  if (!context) {
    throw new Error('useStudentAuth must be used within StudentAuthProvider');
  }
  return context;
};