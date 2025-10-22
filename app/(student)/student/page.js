"use client"
import { useState, useEffect } from 'react';

export default function StudentDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState('');
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [activeTab, setActiveTab] = useState('available');
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Mock student data - replace with actual data from Supabase
  const studentInfo = {
    id: 'STU2024001',
    name: 'John Doe',
    email: 'john.doe@university.edu',
    department: 'Computer Science',
    level: '300',
    semester: '2024/2025 First Semester',
    photo: 'https://via.placeholder.com/100',
    biometricStatus: 'Verified',
    totalUnits: 0,
    maxUnits: 24
  };

  // Mock available courses
  const availableCourses = [
    { id: '1', code: 'CS301', title: 'Database Systems', unit: 3, semester: 'First', level: '300', department: 'Computer Science', lecturer: 'Dr. Smith', schedule: 'Mon/Wed 10:00 AM' },
    { id: '2', code: 'CS302', title: 'Software Engineering', unit: 4, semester: 'First', level: '300', department: 'Computer Science', lecturer: 'Prof. Johnson', schedule: 'Tue/Thu 2:00 PM' },
    { id: '3', code: 'CS303', title: 'Algorithm Design', unit: 3, semester: 'First', level: '300', department: 'Computer Science', lecturer: 'Dr. Williams', schedule: 'Mon/Wed 2:00 PM' },
    { id: '4', code: 'CS304', title: 'Computer Networks', unit: 3, semester: 'First', level: '300', department: 'Computer Science', lecturer: 'Dr. Brown', schedule: 'Tue/Thu 10:00 AM' },
    { id: '5', code: 'CS305', title: 'Web Development', unit: 3, semester: 'First', level: '300', department: 'Computer Science', lecturer: 'Dr. Davis', schedule: 'Wed/Fri 10:00 AM' },
    { id: '6', code: 'CS306', title: 'Operating Systems', unit: 4, semester: 'First', level: '300', department: 'Computer Science', lecturer: 'Prof. Wilson', schedule: 'Mon/Fri 2:00 PM' }
  ];

  // Mock registered courses
  const [registeredCourses, setRegisteredCourses] = useState([
    { id: '1', code: 'CS301', title: 'Database Systems', unit: 3, status: 'Approved', registeredDate: '2024-09-15' }
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const hour = currentTime.getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting('Good Morning');
    } else if (hour >= 12 && hour < 17) {
      setGreeting('Good Afternoon');
    } else if (hour >= 17 && hour < 21) {
      setGreeting('Good Evening');
    } else {
      setGreeting('Good Night');
    }
  }, [currentTime]);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCourseSelection = (course) => {
    const isSelected = selectedCourses.find(c => c.id === course.id);
    
    if (isSelected) {
      setSelectedCourses(selectedCourses.filter(c => c.id !== course.id));
    } else {
      const totalUnits = selectedCourses.reduce((sum, c) => sum + c.unit, 0) + course.unit;
      
      if (totalUnits > studentInfo.maxUnits) {
        showNotification(`Cannot exceed ${studentInfo.maxUnits} units. Current: ${totalUnits - course.unit} units`, 'error');
        return;
      }
      
      setSelectedCourses([...selectedCourses, course]);
    }
  };

  const handleRegisterCourses = async () => {
    if (selectedCourses.length === 0) {
      showNotification('Please select at least one course', 'error');
      return;
    }

    const newRegistrations = selectedCourses.map(course => ({
      ...course,
      status: 'Pending',
      registeredDate: new Date().toISOString().split('T')[0]
    }));

    setRegisteredCourses([...registeredCourses, ...newRegistrations]);
    showNotification(`${selectedCourses.length} course(s) registered successfully!`, 'success');
    setSelectedCourses([]);
    setActiveTab('registered');
  };

  const handleDropCourse = (courseId) => {
    if (window.confirm('Are you sure you want to drop this course?')) {
      setRegisteredCourses(registeredCourses.filter(c => c.id !== courseId));
      showNotification('Course dropped successfully', 'success');
    }
  };

  const filteredCourses = availableCourses.filter(course =>
    course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.lecturer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalSelectedUnits = selectedCourses.reduce((sum, c) => sum + c.unit, 0);
  const totalRegisteredUnits = registeredCourses.reduce((sum, c) => sum + c.unit, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
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
              <div className="flex items-center space-x-3">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Student Portal</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">{formatTime(currentTime)}</span>
              </div>
              <button className="flex items-center space-x-2 text-gray-600 hover:text-red-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline text-sm font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
              <img
                src={studentInfo.photo}
                alt="Student"
                className="w-20 h-20 rounded-full border-4 border-white shadow-lg"
              />
              <div className="flex-1">
                <h2 className="text-2xl sm:text-3xl font-bold mb-1">{greeting}, {studentInfo.name.split(' ')[0]}! 👋</h2>
                <p className="text-indigo-100 text-sm sm:text-base mb-2">{studentInfo.id} • {studentInfo.department}</p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm text-black">
                    {studentInfo.level} Level
                  </span>
                  <span className="px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm text-black">
                    {studentInfo.semester}
                  </span>
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    {studentInfo.biometricStatus}
                  </span>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-sm text-indigo-100 mb-1">Registered Units</p>
                <p className="text-3xl font-bold">{totalRegisteredUnits}/{studentInfo.maxUnits}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-md">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-3 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-600">Registered</p>
                <p className="text-2xl font-bold text-gray-800">{registeredCourses.length}</p>
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
                <p className="text-xs text-gray-600">Available</p>
                <p className="text-2xl font-bold text-gray-800">{availableCourses.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-md">
            <div className="flex items-center space-x-3">
              <div className="bg-purple-100 p-3 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-600">Selected</p>
                <p className="text-2xl font-bold text-gray-800">{selectedCourses.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-md">
            <div className="flex items-center space-x-3">
              <div className="bg-orange-100 p-3 rounded-lg">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-600">Total Units</p>
                <p className="text-2xl font-bold text-gray-800">{totalSelectedUnits}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('available')}
                className={`flex-1 px-6 py-4 text-center font-semibold transition-all ${
                  activeTab === 'available'
                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Available Courses</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('registered')}
                className={`flex-1 px-6 py-4 text-center font-semibold transition-all ${
                  activeTab === 'registered'
                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <span>My Courses</span>
                </div>
              </button>
            </div>
          </div>

          {/* Available Courses Tab */}
          {activeTab === 'available' && (
            <div className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 mb-6">
                <div className="relative flex-1 max-w-md">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search courses..."
                    className="pl-10 pr-4 py-2 w-full border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                {selectedCourses.length > 0 && (
                  <button
                    onClick={handleRegisterCourses}
                    className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Register {selectedCourses.length} Course(s) ({totalSelectedUnits} units)</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCourses.map(course => {
                  const isSelected = selectedCourses.find(c => c.id === course.id);
                  const isRegistered = registeredCourses.find(c => c.id === course.id);
                  
                  return (
                    <div
                      key={course.id}
                      className={`border-2 rounded-xl p-4 transition-all ${
                        isRegistered
                          ? 'border-gray-300 bg-gray-50 opacity-60'
                          : isSelected
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-300 hover:border-indigo-400 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-bold text-lg text-gray-800">{course.code}</h3>
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                              {course.unit} Units
                            </span>
                          </div>
                          <p className="text-gray-700 mb-2">{course.title}</p>
                          <div className="space-y-1 text-sm text-gray-600">
                            <p className="flex items-center space-x-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <span>{course.lecturer}</span>
                            </p>
                            <p className="flex items-center space-x-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>{course.schedule}</span>
                            </p>
                          </div>
                        </div>
                        <label className="flex items-center cursor-pointer">
                          <input
                          type="checkbox"
                          checked={Boolean(isSelected) || Boolean(isRegistered)}
                          onChange={() => !isRegistered && handleCourseSelection(course)}
                          disabled={isRegistered}
                        />
                        </label>
                      </div>
                      {isRegistered && (
                        <div className="mt-2 px-3 py-1 bg-gray-200 text-gray-600 rounded text-sm text-center">
                          Already Registered
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Registered Courses Tab */}
          {activeTab === 'registered' && (
            <div className="p-6">
              {registeredCourses.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-24 h-24 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">No Registered Courses</h3>
                  <p className="text-gray-600 mb-4">You have not registered for any courses yet</p>
                  <button
                    onClick={() => setActiveTab('available')}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Browse Available Courses
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {registeredCourses.map(course => (
                    <div
                      key={course.id}
                      className="border-2 border-gray-200 rounded-xl p-4 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-bold text-lg text-gray-800">{course.code}</h3>
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                              {course.unit} Units
                            </span>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              course.status === 'Approved'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {course.status}
                            </span>
                          </div>
                          <p className="text-gray-700 mb-2">{course.title}</p>
                          <p className="text-sm text-gray-500">
                            Registered on: {new Date(course.registeredDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                        </div>
                        {course.status === 'Pending' && (
                          <button
                            onClick={() => handleDropCourse(course.id)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}