"use client"
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { studentLogin } from '@/lib/appwrite';

export default function StudentLogin() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    matricNumber: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setLoading(true);

  try {
    // Trim inputs before sending
    const result = await studentLogin(
      formData.matricNumber.trim(),
      formData.password.trim()
    );

    console.log('Login result:', result);

    if (result.success) {
      // Store student data in session/localStorage
      localStorage.setItem('studentData', JSON.stringify(result.user));
      localStorage.setItem('authId', result.authId);
      
      // Redirect to student dashboard
      router.push('/student');
    } else {
      setError(result.error);
    }
  } catch (err) {
    console.error('Login error:', err);
    setError('Login failed. Please try again.');
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Student Login</h1>
          <p className="text-gray-600">Enter your credentials to continue</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Matric Number
            </label>
            <input
              type="text"
              value={formData.matricNumber}
              onChange={(e) => setFormData({...formData, matricNumber: e.target.value})}
              placeholder="FTP/CS/24/0000001"
              required
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Password (Surname)
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder="Enter your surname"
              required
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold transition-all ${
              loading ? 'opacity-50 cursor-not-allowed' : 'hover:from-indigo-700 hover:to-purple-700'
            }`}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Default password is your surname</p>
          <p className="mt-2">Need help? Contact administrator</p>
        </div>
      </div>
    </div>
  );
}