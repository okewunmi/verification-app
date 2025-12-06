
"use client"
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { studentLogin, changeStudentPassword } from '@/lib/appwrite';

export default function StudentLogin() {
  const router = useRouter();
  const [showChangePassword, setShowChangePassword] = useState(false);
  
  // Login form state
  const [formData, setFormData] = useState({
    matricNumber: '',
    password: ''
  });
  
  // Password change form state
  const [passwordChangeData, setPasswordChangeData] = useState({
    matricNumber: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const result = await studentLogin(
        formData.matricNumber.trim(),
        formData.password.trim()
      );

      if (result.success) {
        localStorage.setItem('studentData', JSON.stringify(result.user));
        localStorage.setItem('authId', result.authId);
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

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // Validate new password and confirmation match
    if (passwordChangeData.newPassword !== passwordChangeData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    // Validate password length
    if (passwordChangeData.newPassword.trim().length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const result = await changeStudentPassword(
        passwordChangeData.matricNumber.trim(),
        passwordChangeData.currentPassword.trim(),
        passwordChangeData.newPassword.trim()
      );

      if (result.success) {
        setSuccessMessage('Password changed successfully! You can now login with your new password.');
        setPasswordChangeData({
          matricNumber: '',
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        
        // Switch back to login form after 2 seconds
        setTimeout(() => {
          setShowChangePassword(false);
          setSuccessMessage('');
        }, 2000);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Password change error:', err);
      setError('Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {showChangePassword ? 'Change Password' : 'Student Login'}
          </h1>
          <p className="text-gray-600">
            {showChangePassword 
              ? 'Update your password for security' 
              : 'Enter your credentials to continue'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
            <p className="text-green-700 text-sm">{successMessage}</p>
          </div>
        )}

        {!showChangePassword ? (
          // LOGIN FORM
          <form onSubmit={handleLogin} className="space-y-4">
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
                Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="Enter your password"
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

            <button
              type="button"
              onClick={() => {
                setShowChangePassword(true);
                setError('');
              }}
              className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-all"
            >
              Change Password
            </button>
          </form>
        ) : (
          // PASSWORD CHANGE FORM
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Matric Number
              </label>
              <input
                type="text"
                value={passwordChangeData.matricNumber}
                onChange={(e) => setPasswordChangeData({...passwordChangeData, matricNumber: e.target.value})}
                placeholder="FTP/CS/24/0000001"
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Current Password
              </label>
              <input
                type="password"
                value={passwordChangeData.currentPassword}
                onChange={(e) => setPasswordChangeData({...passwordChangeData, currentPassword: e.target.value})}
                placeholder="Enter current password"
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                New Password
              </label>
              <input
                type="password"
                value={passwordChangeData.newPassword}
                onChange={(e) => setPasswordChangeData({...passwordChangeData, newPassword: e.target.value})}
                placeholder="Enter new password (min. 6 characters)"
                required
                minLength={6}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                value={passwordChangeData.confirmPassword}
                onChange={(e) => setPasswordChangeData({...passwordChangeData, confirmPassword: e.target.value})}
                placeholder="Re-enter new password"
                required
                minLength={6}
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
              {loading ? 'Changing Password...' : 'Change Password'}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowChangePassword(false);
                setError('');
                setPasswordChangeData({
                  matricNumber: '',
                  currentPassword: '',
                  newPassword: '',
                  confirmPassword: ''
                });
              }}
              className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-all"
            >
              Back to Login
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Default password is your surname </p>
          <p className="mt-2">Need help? Contact administrator</p>
        </div>
      </div>
    </div>
  );
}