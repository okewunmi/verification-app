"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MdPersonAdd, MdEdit, MdDelete, MdBlock, MdCheckCircle, MdRefresh } from 'react-icons/md';
import { getAllAdminUsers, updateAdminUserStatus, deleteAdminUser } from '@/lib/appwrite';

export default function AdminManagement() {
  const router = useRouter();
  const [admins, setAdmins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const result = await getAllAdminUsers();
      if (result.success) {
        setAdmins(result.data);
      } else {
        setError(result.error || 'Failed to load admins');
      }
    } catch (err) {
      setError('Error loading admin users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (adminId, currentStatus) => {
    try {
      const result = await updateAdminUserStatus(adminId, !currentStatus);
      if (result.success) {
        setSuccessMessage(result.message);
        fetchAdmins();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to update admin status');
    }
  };

  const handleDelete = async (adminId, username) => {
    if (!confirm(`Are you sure you want to delete admin "${username}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const result = await deleteAdminUser(adminId);
      if (result.success) {
        setSuccessMessage(result.message);
        fetchAdmins();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to delete admin');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <button 
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"  
            onClick={() => router.push("/Admin")}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Dashboard</span>
          </button>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 flex items-center space-x-3">
                <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span>Admin Management</span>
              </h1>
              <p className="text-gray-600 mt-2">Manage administrator accounts and permissions</p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={fetchAdmins}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <MdRefresh className="w-5 h-5" />
                <span className="text-sm font-medium">Refresh</span>
              </button>
              
              <button
                onClick={() => router.push('/admin-register')}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors shadow-lg"
              >
                <MdPersonAdd className="w-5 h-5" />
                <span className="text-sm font-medium">Add New Admin</span>
              </button>
            </div>
          </div>
        </div>

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-xl">
            <div className="flex items-center space-x-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-green-800 font-medium">{successMessage}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
            <div className="flex items-center space-x-3">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">Administrator Accounts</h2>
            <p className="text-sm text-gray-600 mt-1">Total: {admins.length} admin{admins.length !== 1 ? 's' : ''}</p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : admins.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-gray-400">
              <svg className="w-24 h-24 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <p className="text-lg font-medium">No administrators found</p>
              <p className="text-sm mt-2">Click "Add New Admin" to create one</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {admins.map((admin) => (
                    <tr key={admin.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span className="text-indigo-600 font-semibold text-sm">
                              {admin.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{admin.username}</div>
                            <div className="text-xs text-gray-500">ID: {admin.id.substring(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{admin.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {admin.isActive ? (
                          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            <MdCheckCircle className="w-4 h-4 mr-1" />
                            Active
                          </span>
                        ) : (
                          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            <MdBlock className="w-4 h-4 mr-1" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(admin.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleToggleStatus(admin.id, admin.isActive)}
                            className={`p-2 rounded-lg transition-colors ${
                              admin.isActive 
                                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' 
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                            title={admin.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {admin.isActive ? <MdBlock className="w-4 h-4" /> : <MdCheckCircle className="w-4 h-4" />}
                          </button>
                          
                          <button
                            onClick={() => handleDelete(admin.id, admin.username)}
                            className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                            title="Delete"
                          >
                            <MdDelete className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}