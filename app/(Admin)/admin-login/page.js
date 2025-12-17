"use client"
import { useState } from 'react';
import { MdLogin, MdEmail, MdLock, MdVisibility, MdVisibilityOff } from 'react-icons/md';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminLogin } from '@/lib/appwrite';
import { useAuthStore } from '@/lib/useAuth';                


export default function AdminLoginPage() {
  const router = useRouter();
  const clearCache = useAuthStore(state => state.clearCache);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // ✅ Clear any old cache before login
      clearCache();
      // ✅ Now uses Appwrite session
      const response = await adminLogin(formData.email, formData.password);
      
      if (response.success) {
        setSuccess(true);
        
        console.log('Login successful:', response);
        
       // ✅ Wait a bit for Appwrite session to be fully established
        await new Promise(resolve => setTimeout(resolve, 500));
        
        router.replace('/Admin');
      } else {
        setError(response.error || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen max-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-sm my-auto">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 sm:p-5 text-white">
            <div className="flex justify-center mb-3">
              <div className="bg-white bg-opacity-20 backdrop-blur-sm p-2 rounded-full">
                <MdLogin className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
            </div>
            <h2 className="text-2xl sm:text-2xl font-bold text-center mb-1">Admin Login</h2>
            <p className="text-indigo-100 text-center text-xs sm:text-sm">Sign in to your admin account</p>
          </div>

          <div className="p-5 sm:p-6">
            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-xs sm:text-sm">
                ✅ Login successful! Redirecting...
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs sm:text-sm">
                ❌ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none text-gray-400">
                    <MdEmail className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="block w-full pl-8 sm:pl-10 pr-3 py-2 sm:py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-black"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none text-gray-400">
                    <MdLock className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="block w-full pl-8 sm:pl-10 pr-9 sm:pr-10 py-2 sm:py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-black"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-2.5 sm:pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <MdVisibilityOff className="h-4 w-4 sm:h-5 sm:w-5" />
                    ) : (
                      <MdVisibility className="h-4 w-4 sm:h-5 sm:w-5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-2.5 sm:py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <AiOutlineLoading3Quarters className="animate-spin h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <MdLogin className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    Sign In
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs sm:text-sm text-gray-600">
                Don't have an account?{' '}
                <Link href="/admin-register" className="text-indigo-600 hover:text-indigo-800 font-semibold">
                  Create one here
                </Link>
              </p>
            </div>
          </div>
        </div>

        <p className="mt-3 sm:mt-4 text-center text-xs text-gray-500">
          🔒 Protected by industry-standard encryption
        </p>
      </div>
    </div>
  );
}
