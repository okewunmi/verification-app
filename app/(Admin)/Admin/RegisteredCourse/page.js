"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  getCurrentUser,
  logOut,
  getAllCourseRegistrations,
  approveCourseRegistration,
  rejectCourseRegistration,
  getCourseRegistrationStats,
  getStudentByMatricNumber
} from '@/lib/appwrite';

export default function AdminCourseRegistrations() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [registrationsLoading, setRegistrationsLoading] = useState(false);
  const [registrations, setRegistrations] = useState([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });
  
  // Filter states
  const [filters, setFilters] = useState({
    status: 'all',
    level: 'all',
    department: 'all',
    semester: 'all',
    search: ''
  });

  const [notification, setNotification] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [studentDetails, setStudentDetails] = useState({});

  // Unique values for filters
  const [uniqueLevels, setUniqueLevels] = useState([]);
  const [uniqueDepartments, setUniqueDepartments] = useState([]);
  const [uniqueSemesters, setUniqueSemesters] = useState([]);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          router.push('/admin-login');
          return;
        }
        setLoading(false);
      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/admin-login');
      }
    };

    checkAuth();
  }, [router]);

  // Fetch registrations and stats
  useEffect(() => {
    if (!loading) {
      fetchRegistrations();
      fetchStats();
    }
  }, [loading]);

  // Apply filters
  useEffect(() => {
    applyFilters();
  }, [registrations, filters]);

  const fetchRegistrations = async () => {
    try {
      setRegistrationsLoading(true);
      const result = await getAllCourseRegistrations();
      
      if (result.success) {
        setRegistrations(result.data);
        
        // Extract unique values for filters
        const levels = [...new Set(result.data.map(r => {
          // Extract level from student data if available
          return r.studentLevel || 'N/A';
        }))];
        
        const departments = [...new Set(result.data.map(r => {
          // Extract department from student data if available
          return r.studentDepartment || 'N/A';
        }))];
        
        const semesters = [...new Set(result.data.map(r => r.semester))];
        
        setUniqueLevels(levels.filter(l => l !== 'N/A'));
        setUniqueDepartments(departments.filter(d => d !== 'N/A'));
        setUniqueSemesters(semesters);
      }
    } catch (error) {
      console.error('Error fetching registrations:', error);
      showNotification('Failed to fetch registrations', 'error');
    } finally {
      setRegistrationsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const result = await getCourseRegistrationStats();
      
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchStudentDetails = async (matricNumber) => {
    if (studentDetails[matricNumber]) {
      return studentDetails[matricNumber];
    }

    try {
      const result = await getStudentByMatricNumber(matricNumber);
      
      if (result.success) {
        setStudentDetails(prev => ({
          ...prev,
          [matricNumber]: result.data
        }));
        return result.data;
      }
    } catch (error) {
      console.error('Error fetching student details:', error);
    }
    
    return null;
  };

  const applyFilters = () => {
    let filtered = [...registrations];

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(r => r.status === filters.status);
    }

    // Semester filter
    if (filters.semester !== 'all') {
      filtered = filtered.filter(r => r.semester === filters.semester);
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(r => 
        r.matricNumber.toLowerCase().includes(searchLower) ||
        r.courseCode.toLowerCase().includes(searchLower) ||
        r.courseTitle.toLowerCase().includes(searchLower)
      );
    }

    // Group by student
    const groupedByStudent = filtered.reduce((acc, reg) => {
      if (!acc[reg.matricNumber]) {
        acc[reg.matricNumber] = [];
      }
      acc[reg.matricNumber].push(reg);
      return acc;
    }, {});

    setFilteredRegistrations(groupedByStudent);
  };

  const handleApprove = async (registrationId) => {
    try {
      setActionLoading(registrationId);
      const result = await approveCourseRegistration(registrationId);
      
      if (result.success) {
        showNotification('Course registration approved successfully', 'success');
        await fetchRegistrations();
        await fetchStats();
      } else {
        showNotification(result.error || 'Failed to approve registration', 'error');
      }
    } catch (error) {
      console.error('Error approving registration:', error);
      showNotification('Failed to approve registration', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (registrationId) => {
    if (!window.confirm('Are you sure you want to reject this course registration?')) {
      return;
    }

    try {
      setActionLoading(registrationId);
      const result = await rejectCourseRegistration(registrationId);
      
      if (result.success) {
        showNotification('Course registration rejected', 'success');
        await fetchRegistrations();
        await fetchStats();
      } else {
        showNotification(result.error || 'Failed to reject registration', 'error');
      }
    } catch (error) {
      console.error('Error rejecting registration:', error);
      showNotification('Failed to reject registration', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkApprove = async (matricNumber) => {
    const studentRegs = filteredRegistrations[matricNumber];
    const pendingRegs = studentRegs.filter(r => r.status === 'Pending');

    if (pendingRegs.length === 0) {
      showNotification('No pending registrations to approve', 'error');
      return;
    }

    if (!window.confirm(`Approve all ${pendingRegs.length} pending course(s) for ${matricNumber}?`)) {
      return;
    }

    try {
      setActionLoading(matricNumber);
      
      for (const reg of pendingRegs) {
        await approveCourseRegistration(reg.$id);
      }
      
      showNotification(`${pendingRegs.length} course(s) approved successfully`, 'success');
      await fetchRegistrations();
      await fetchStats();
    } catch (error) {
      console.error('Error bulk approving:', error);
      showNotification('Failed to approve some registrations', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleStudentExpansion = async (matricNumber) => {
    if (expandedStudent === matricNumber) {
      setExpandedStudent(null);
    } else {
      setExpandedStudent(matricNumber);
      await fetchStudentDetails(matricNumber);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleLogout = async () => {
    try {
      await logOut();
      router.push('/admin-login');
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/admin-login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center space-x-3 px-6 py-4 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`}>
          {notification.type === 'success' ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span className="font-medium">{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/Admin')}
                className="text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Course Registrations</h1>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-gray-600 hover:text-red-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-md">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-3 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-md">
            <div className="flex items-center space-x-3">
              <div className="bg-yellow-100 p-3 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-800">{stats.pending}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-md">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 p-3 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-gray-800">{stats.approved}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-md">
            <div className="flex items-center space-x-3">
              <div className="bg-red-100 p-3 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-gray-800">{stats.rejected}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Filters</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                placeholder="Matric No. or Course..."
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            {/* Semester Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Semester</label>
              <select
                value={filters.semester}
                onChange={(e) => setFilters({...filters, semester: e.target.value})}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">All Semesters</option>
                {uniqueSemesters.map(sem => (
                  <option key={sem} value={sem}>{sem}</option>
                ))}
              </select>
            </div>

            {/* Reset Button */}
            <div className="flex items-end">
              <button
                onClick={() => setFilters({
                  status: 'all',
                  level: 'all',
                  department: 'all',
                  semester: 'all',
                  search: ''
                })}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>

        {/* Registrations List */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-800">
              Registrations by Student ({Object.keys(filteredRegistrations).length} students)
            </h3>
          </div>

          {registrationsLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading registrations...</p>
            </div>
          ) : Object.keys(filteredRegistrations).length === 0 ? (
            <div className="p-8 text-center">
              <svg className="w-24 h-24 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No Registrations Found</h3>
              <p className="text-gray-600">No course registrations match your filters</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {Object.entries(filteredRegistrations).map(([matricNumber, studentRegs]) => {
                const student = studentDetails[matricNumber];
                const isExpanded = expandedStudent === matricNumber;
                const totalUnits = studentRegs.reduce((sum, r) => sum + r.courseUnit, 0);
                const pendingCount = studentRegs.filter(r => r.status === 'Pending').length;
                const approvedCount = studentRegs.filter(r => r.status === 'Approved').length;

                return (
                  <div key={matricNumber} className="hover:bg-gray-50 transition-colors">
                    {/* Student Header */}
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 flex-1">
                          <button
                            onClick={() => toggleStudentExpansion(matricNumber)}
                            className="text-gray-600 hover:text-indigo-600 transition-colors"
                          >
                            <svg 
                              className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>

                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-1">
                              <h4 className="font-bold text-gray-800">{matricNumber}</h4>
                              {student && (
                                <span className="text-sm text-gray-600">
                                  {student.firstName} {student.surname}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2 text-sm">
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                {studentRegs.length} Course{studentRegs.length !== 1 ? 's' : ''}
                              </span>
                              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">
                                {totalUnits} Units
                              </span>
                              {pendingCount > 0 && (
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                                  {pendingCount} Pending
                                </span>
                              )}
                              {approvedCount > 0 && (
                                <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                                  {approvedCount} Approved
                                </span>
                              )}
                              {student && (
                                <>
                                  <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded">
                                    {student.level} Level
                                  </span>
                                  <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded">
                                    {student.department}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {pendingCount > 0 && (
                          <button
                            onClick={() => handleBulkApprove(matricNumber)}
                            disabled={actionLoading === matricNumber}
                            className="ml-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
                          >
                            {actionLoading === matricNumber ? 'Approving...' : 'Approve All'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expanded Course Details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pl-16">
                        <div className="space-y-2">
                          {studentRegs.map(reg => (
                            <div 
                              key={reg.$id}
                              className="border-2 border-gray-200 rounded-lg p-3"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <h5 className="font-semibold text-gray-800">{reg.courseCode}</h5>
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                                      {reg.courseUnit} Units
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                      reg.status === 'Approved'
                                        ? 'bg-green-100 text-green-800'
                                        : reg.status === 'Rejected'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {reg.status}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-700 mb-1">{reg.courseTitle}</p>
                                  <p className="text-xs text-gray-500">
                                    Registered: {new Date(reg.registeredAt).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </p>
                                  {reg.approvedAt && (
                                    <p className="text-xs text-gray-500">
                                      {reg.status} on: {new Date(reg.approvedAt).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                      })}
                                    </p>
                                  )}
                                </div>

                                {reg.status === 'Pending' && (
                                  <div className="flex items-center space-x-2 ml-4">
                                    <button
                                      onClick={() => handleApprove(reg.$id)}
                                      disabled={actionLoading === reg.$id}
                                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm disabled:opacity-50"
                                    >
                                      {actionLoading === reg.$id ? '...' : 'Approve'}
                                    </button>
                                    <button
                                      onClick={() => handleReject(reg.$id)}
                                      disabled={actionLoading === reg.$id}
                                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm disabled:opacity-50"
                                    >
                                      {actionLoading === reg.$id ? '...' : 'Reject'}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}