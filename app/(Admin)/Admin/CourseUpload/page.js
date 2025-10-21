// app/CourseUpload/page.js or components/CourseUploadPage.jsx
"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  createMultipleCourses,
  getAllCourses,
  updateCourse,
  deleteCourse,
  getCourseStats,
  courseCodeExists
} from '@/lib/appwrite';

export default function CourseUploadPage() {
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [courses, setCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingCourses, setExistingCourses] = useState([]);
  const [stats, setStats] = useState({ total: 0, byDepartment: {}, byLevel: {}, bySemester: {} });

  const [newCourse, setNewCourse] = useState({
    courseTitle: '',
    courseCode: '',
    courseUnit: ''
  });

  const semesters = [
    { id: '1', name: 'First Semester', value: 'First' },
    { id: '2', name: 'Second Semester', value: 'Second' }
  ];

  const levels = [
    { id: '1', name: '100 Level', value: '100' },
    { id: '2', name: '200 Level', value: '200' },
    { id: '3', name: '300 Level', value: '300' },
    { id: '4', name: '400 Level', value: '400' },
    { id: '5', name: '500 Level', value: '500' }
  ];

  const departments = [
    { id: '1', name: 'Computer Science', value: 'Computer Science' },
    { id: '2', name: 'Software Engineering', value: 'Software Engineering' },
    { id: '3', name: 'Information Technology', value: 'Information Technology' },
    { id: '4', name: 'Cyber Security', value: 'Cyber Security' },
    { id: '5', name: 'Data Science', value: 'Data Science' },
    { id: '6', name: 'Electrical and Electronics Engineering', value: 'Electrical and Electronics Engineering' },
    { id: '7', name: 'Mechanical Engineering', value: 'Mechanical Engineering' },
    { id: '8', name: 'Civil Engineering', value: 'Civil Engineering' }
  ];

  useEffect(() => {
    fetchCourses();
    fetchStats();
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    const result = await getAllCourses();
    if (result.success) {
      setExistingCourses(result.data);
    } else {
      showNotification('Error loading courses: ' + result.error, 'error');
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    const result = await getCourseStats();
    if (result.success) {
      setStats(result.data);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleAddCourse = async () => {
    if (!newCourse.courseTitle || !newCourse.courseCode || !newCourse.courseUnit) {
      showNotification('Please fill all course fields', 'error');
      return;
    }

    if (!selectedSemester || !selectedLevel || !selectedDepartment) {
      showNotification('Please select semester, level, and department', 'error');
      return;
    }

    const exists = await courseCodeExists(newCourse.courseCode);
    if (exists) {
      showNotification(`Course code ${newCourse.courseCode} already exists`, 'error');
      return;
    }

    const inList = courses.find(c => c.courseCode === newCourse.courseCode.toUpperCase());
    if (inList) {
      showNotification('Course already added to list', 'error');
      return;
    }

    const course = {
      courseTitle: newCourse.courseTitle,
      courseCode: newCourse.courseCode.toUpperCase(),
      courseUnit: parseInt(newCourse.courseUnit),
      semester: selectedSemester,
      level: selectedLevel,
      department: selectedDepartment,
    };

    setCourses([...courses, course]);
    setNewCourse({ courseTitle: '', courseCode: '', courseUnit: '' });
    showNotification('Course added to list successfully', 'success');
  };

  const handleRemoveCourse = (code) => {
    setCourses(courses.filter(c => c.courseCode !== code));
    showNotification('Course removed from list', 'success');
  };

  const handleSaveAllCourses = async () => {
    if (courses.length === 0) {
      showNotification('No courses to save', 'error');
      return;
    }

    setSubmitting(true);

    try {
      const result = await createMultipleCourses(courses);

      if (result.success) {
        showNotification(result.message, 'success');
        setCourses([]);
        setShowCreateForm(false);
        fetchCourses();
        fetchStats();
      } else {
        showNotification('Some courses failed to save', 'error');
        if (result.errors && result.errors.length > 0) {
          console.error('Failed courses:', result.errors);
        }
      }
    } catch (error) {
      showNotification('Error saving courses: ' + error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCourse = async (course) => {
    if (window.confirm(`Are you sure you want to delete ${course.courseCode}?`)) {
      const result = await deleteCourse(course.$id);
      if (result.success) {
        showNotification('Course deleted successfully', 'success');
        fetchCourses();
        fetchStats();
      } else {
        showNotification('Error deleting course: ' + result.error, 'error');
      }
    }
  };

  const filteredExistingCourses = existingCourses.filter(course => 
    course.courseTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.courseCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8">
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

      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <button 
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
            onClick={() => router.push("/Admin")}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Dashboard</span>
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center space-x-3">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span>Course Management</span>
              </h1>
              <p className="text-gray-600 mt-1">Upload and manage courses for students</p>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Create New Course</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-md">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-3 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-600">Total Courses</p>
                <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-md">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 p-3 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-800">{courses.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-md">
            <div className="flex items-center space-x-3">
              <div className="bg-purple-100 p-3 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-600">Departments</p>
                <p className="text-2xl font-bold text-gray-800">{Object.keys(stats.byDepartment).length}</p>
              </div>
            </div>
          </div>
        </div>

        {showCreateForm && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border-2 border-indigo-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Add New Course</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Semester</label>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select Semester</option>
                  {semesters.map(sem => (
                    <option key={sem.id} value={sem.value}>{sem.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Level</label>
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select Level</option>
                  {levels.map(lvl => (
                    <option key={lvl.id} value={lvl.value}>{lvl.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.value}>{dept.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Course Title</label>
                <input
                  type="text"
                  value={newCourse.courseTitle}
                  onChange={(e) => setNewCourse({...newCourse, courseTitle: e.target.value})}
                  placeholder="e.g., Introduction to Programming"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Course Code</label>
                <input
                  type="text"
                  value={newCourse.courseCode}
                  onChange={(e) => setNewCourse({...newCourse, courseCode: e.target.value.toUpperCase()})}
                  placeholder="e.g., CSC101"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Course Unit</label>
                <input
                  type="number"
                  value={newCourse.courseUnit}
                  onChange={(e) => setNewCourse({...newCourse, courseUnit: e.target.value})}
                  placeholder="e.g., 3"
                  min="1"
                  max="6"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <button
              onClick={handleAddCourse}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Add Course to List
            </button>

            {courses.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Pending Courses ({courses.length})</h3>
                <div className="space-y-2 mb-4">
                  {courses.map((course, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <div className="flex-1">
                        <span className="font-semibold text-indigo-600">{course.courseCode}</span>
                        <span className="text-gray-600 ml-2">- {course.courseTitle}</span>
                        <span className="text-gray-500 text-sm ml-2">({course.courseUnit} units)</span>
                      </div>
                      <button
                        onClick={() => handleRemoveCourse(course.courseCode)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleSaveAllCourses}
                  disabled={submitting}
                  className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Saving...' : `Save All ${courses.length} Courses`}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 sm:mb-0">Existing Courses</h2>
            <div className="relative">
              <input
                type="text"
                placeholder="Search courses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-full sm:w-64"
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Units</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Semester</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Level</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredExistingCourses.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <p className="text-gray-500 font-medium">No courses found</p>
                        <p className="text-gray-400 text-sm mt-1">Start by creating your first course</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredExistingCourses.map((course) => (
                    <tr key={course.$id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-semibold text-indigo-600">{course.courseCode}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-800">{course.courseTitle}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-gray-600">{course.courseUnit}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                          {course.semester}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm">
                          {course.level}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-600 text-sm">{course.department}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button 
                            className="text-red-600 hover:text-red-800"
                            onClick={() => handleDeleteCourse(course)}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}