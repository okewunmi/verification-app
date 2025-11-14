"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  getStudentByMatricNumber,
  getAvailableCoursesForStudent,
  getStudentRegisteredCourses,
  registerStudentCourses,
  dropCourseRegistration,
  getStudentRegistrationStats,
  isStudentCourseRegistered,
  checkMultipleCoursesRegistration,
  validateCourseRegistration
} from '@/lib/appwrite';

import QRCode from 'react-qr-code';

// ========================================
// PRINTABLE RECEIPT COMPONENT
// ========================================
const PrintableReceipt = ({ studentInfo, registeredCourses, registrationStats, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const qrData = JSON.stringify({
    matricNumber: studentInfo.matricNumber,
    name: `${studentInfo.firstName} ${studentInfo.surname}`,
    level: studentInfo.level,
    department: studentInfo.department,
    totalCourses: registrationStats.totalRegistered,
    totalUnits: registrationStats.totalUnits,
    courses: registeredCourses.map(c => ({
      code: c.courseCode,
      title: c.courseTitle,
      unit: c.courseUnit,
      status: c.status
    }))
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-auto">
        <style>{`
          @media print {
            body * { visibility: hidden; }
            .printable-area, .printable-area * { visibility: visible; }
            .printable-area { 
              position: absolute; 
              left: 0; 
              top: 0; 
              width: 100%; 
              padding: 15mm;
            }
            .no-print { display: none !important; }
            @page { margin: 12mm; size: A4; }
            .page-break-inside-avoid { page-break-inside: avoid; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
          }
        `}</style>

        <div className="no-print sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
          <h3 className="text-lg font-bold text-gray-800">Course Registration Receipt</h3>
          <div className="flex space-x-2">
            <button
              onClick={handlePrint}
              className="px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-colors"
            >
              ✕ Close
            </button>
          </div>
        </div>

        <div className="printable-area p-6">
          <div className="text-center mb-6 border-b-2 border-gray-800 pb-4 page-break-inside-avoid">
            <h1 className="text-xl font-bold text-gray-900 mb-1">FEDERAL UNIVERSITY OYE EKITI</h1>
            <h3 className="text-base font-semibold text-gray-800">COURSE REGISTRATION FORM</h3>
            <p className="text-xs text-gray-600 mt-1">2024/2025 Academic Session - {course.semester}</p>
          </div>

          <div className="mb-6 page-break-inside-avoid">
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0">
                {studentInfo.profilePictureUrl ? (
                  <img src={studentInfo.profilePictureUrl} alt="Student" className="w-24 h-24 rounded-lg border-2 border-gray-400 object-cover" />
                ) : (
                  <div className="w-24 h-24 rounded-lg border-2 border-gray-400 bg-gray-200 flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-500">
                      {studentInfo.firstName?.charAt(0)}{studentInfo.surname?.charAt(0)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex-shrink-0">
                <div className="p-2 bg-white border-2 border-gray-400 rounded-lg">
                  <QRCode value={qrData} size={80} level="H" />
                  <p className="text-[9px] text-center mt-1 text-gray-600">Scan to verify</p>
                </div>
              </div>

              <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <p className="text-xs text-gray-600 font-semibold mb-0.5">Matric Number:</p>
                  <p className="text-sm font-bold text-gray-900">{studentInfo.matricNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-semibold mb-0.5">Full Name:</p>
                  <p className="text-sm font-bold text-gray-900">
                    {studentInfo.surname} {studentInfo.firstName} {studentInfo.middleName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-semibold mb-0.5">Department:</p>
                  <p className="text-xs text-gray-800">{studentInfo.department}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-semibold mb-0.5">Level:</p>
                  <p className="text-xs text-gray-800">{studentInfo.level}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-semibold mb-0.5">Email:</p>
                  <p className="text-xs text-gray-800">{studentInfo.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-semibold mb-0.5">Phone:</p>
                  <p className="text-xs text-gray-800">{studentInfo.phoneNumber}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b-2 border-gray-800">
              Registered Courses
            </h3>
            <table className="w-full border-collapse border border-gray-400 text-xs">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-gray-400 px-2 py-1.5 text-left font-semibold">S/N</th>
                  <th className="border border-gray-400 px-2 py-1.5 text-left font-semibold">Course Code</th>
                  <th className="border border-gray-400 px-2 py-1.5 text-left font-semibold">Course Title</th>
                  <th className="border border-gray-400 px-2 py-1.5 text-center font-semibold">Units</th>
                </tr>
              </thead>
              <tbody>
                {registeredCourses.map((course, index) => (
                  <tr key={course.$id} className="hover:bg-gray-50">
                    <td className="border border-gray-400 px-2 py-1.5">{index + 1}</td>
                    <td className="border border-gray-400 px-2 py-1.5 font-semibold">{course.courseCode}</td>
                    <td className="border border-gray-400 px-2 py-1.5">{course.courseTitle}</td>
                    <td className="border border-gray-400 px-2 py-1.5 text-center">{course.courseUnit}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-200 font-bold">
                  <td colSpan="3" className="border border-gray-400 px-2 py-1.5 text-right">TOTAL:</td>
                  <td className="border border-gray-400 px-2 py-1.5 text-center">{registrationStats.totalUnits} Units</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="border-t-2 border-gray-800 pt-4 mt-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-gray-700 mb-6 font-semibold">Student's Signature:</p>
                <div className="border-b-2 border-gray-500 w-3/4"></div>
                <p className="text-[10px] text-gray-600 mt-1">Date: {new Date().toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-700 mb-6 font-semibold">HOD's Signature:</p>
                <div className="border-b-2 border-gray-500 w-3/4"></div>
                <p className="text-[10px] text-gray-600 mt-1">Date: _______________</p>
              </div>
            </div>
          </div>

          <div className="text-center mt-6 text-[9px] text-gray-500">
            <p>Printed on: {new Date().toLocaleString()}</p>
            <p className="mt-0.5">This is a computer-generated document. No signature is required.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ========================================
// MAIN STUDENT DASHBOARD COMPONENT
// ========================================
export default function StudentDashboard() {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState('');
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [activeTab, setActiveTab] = useState('available');
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState(null);
  const [showPrintReceipt, setShowPrintReceipt] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  
  const [studentInfo, setStudentInfo] = useState(null);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [registeredCourses, setRegisteredCourses] = useState([]);
  const [registeredCourseCodes, setRegisteredCourseCodes] = useState(new Set());
  const [registrationStats, setRegistrationStats] = useState({
    totalRegistered: 0,
    approved: 0,
    pending: 0,
    totalUnits: 0
  });

  const maxUnits = 24;

  useEffect(() => {
    const loadStudentData = async () => {
      try {
        const studentData = localStorage.getItem('studentData');
        if (!studentData) {
          router.push('/student-login');
          return;
        }

        const student = JSON.parse(studentData);
        const result = await getStudentByMatricNumber(student.matricNumber);
        
        if (result.success) {
          setStudentInfo(result.data);
          await fetchAvailableCourses(result.data.level, result.data.department);
          await fetchRegisteredCourses(result.data.matricNumber);
          await fetchRegistrationStats(result.data.matricNumber);
        } else {
          router.push('/student-login');
        }
      } catch (error) {
        console.error('Error loading student data:', error);
        router.push('/student-login');
      } finally {
        setLoading(false);
      }
    };

    loadStudentData();
  }, [router]);

  const fetchAvailableCourses = async (level, department) => {
    try {
      setCoursesLoading(true);
      const result = await getAvailableCoursesForStudent(level, department);
      if (result.success) {
        setAvailableCourses(result.data);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setCoursesLoading(false);
    }
  };

  const fetchRegisteredCourses = async (matricNumber) => {
    try {
      const result = await getStudentRegisteredCourses(matricNumber);
      if (result.success) {
        setRegisteredCourses(result.data);
        const courseCodes = new Set(result.data.map(c => c.courseCode));
        setRegisteredCourseCodes(courseCodes);
      }
    } catch (error) {
      console.error('Error fetching registered courses:', error);
    }
  };

  const fetchRegistrationStats = async (matricNumber) => {
    try {
      const result = await getStudentRegistrationStats(matricNumber);
      if (result.success) {
        setRegistrationStats(result.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const hour = currentTime.getHours();
    if (hour >= 5 && hour < 12) setGreeting('Good Morning');
    else if (hour >= 12 && hour < 17) setGreeting('Good Afternoon');
    else if (hour >= 17 && hour < 21) setGreeting('Good Evening');
    else setGreeting('Good Night');
  }, [currentTime]);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleCourseSelection = (course) => {
    const isSelected = selectedCourses.find(c => c.$id === course.$id);
    
    if (isSelected) {
      setSelectedCourses(selectedCourses.filter(c => c.$id !== course.$id));
    } else {
      if (registeredCourseCodes.has(course.courseCode)) {
        showNotification(`${course.courseCode} is already registered`, 'error');
        return;
      }

      const totalUnits = selectedCourses.reduce((sum, c) => sum + c.courseUnit, 0) + course.courseUnit;
      
      if (totalUnits + registrationStats.totalUnits > maxUnits) {
        showNotification(
          `Cannot exceed ${maxUnits} units. Current: ${registrationStats.totalUnits} units, Selected: ${totalUnits} units`,
          'error'
        );
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

    if (!studentInfo || !studentInfo.$id) {
      showNotification('Student information not found. Please refresh the page.', 'error');
      return;
    }

    try {
      setRegistering(true);
      
      const result = await registerStudentCourses(
        studentInfo.$id,
        studentInfo.matricNumber,
        selectedCourses,
        '2024/2025',
        course.semester
      );

      if (result.success || (result.data && result.data.length > 0)) {
        const successCount = result.data ? result.data.length : 0;
        const skipCount = result.skipped ? result.skipped.length : 0;
        const errorCount = result.errors ? result.errors.length : 0;

        if (successCount > 0) {
          let message = `✅ ${successCount} course(s) registered successfully`;
          if (skipCount > 0) message += `, ${skipCount} already registered`;
          if (errorCount > 0) message += `, ${errorCount} failed`;
          
          showNotification(message, 'success');
          setSelectedCourses([]);
          
          await fetchRegisteredCourses(studentInfo.matricNumber);
          await fetchRegistrationStats(studentInfo.matricNumber);
          
          setTimeout(() => setActiveTab('registered'), 1000);
        } else if (skipCount > 0 && errorCount === 0) {
          showNotification('All selected courses are already registered', 'info');
          setSelectedCourses([]);
          await fetchRegisteredCourses(studentInfo.matricNumber);
          await fetchRegistrationStats(studentInfo.matricNumber);
        } else if (errorCount > 0) {
          const errorMessages = result.errors.map(e => `${e.course}: ${e.error}`).join(', ');
          showNotification(`Registration failed: ${errorMessages}`, 'error');
        } else {
          showNotification(result.message || 'Registration completed with issues', 'error');
        }
      } else {
        showNotification(result.error || result.message || 'Registration failed', 'error');
      }
    } catch (error) {
      console.error('❌ Error registering courses:', error);
      showNotification(`Registration failed: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      setRegistering(false);
    }
  };

  const handleDropCourse = async (registrationId, courseCode) => {
    if (!window.confirm(`Are you sure you want to drop ${courseCode}?`)) return;

    try {
      const result = await dropCourseRegistration(registrationId);
      
      if (result.success) {
        showNotification(result.message || 'Course dropped successfully', 'success');
        await fetchRegisteredCourses(studentInfo.matricNumber);
        await fetchRegistrationStats(studentInfo.matricNumber);
      } else {
        showNotification(result.error || 'Failed to drop course', 'error');
      }
    } catch (error) {
      console.error('Error dropping course:', error);
      showNotification('Failed to drop course', 'error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('studentData');
    localStorage.removeItem('authId');
    router.push('/student-login');
  };

  const filteredCourses = availableCourses.filter(course =>
    course.courseTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.courseCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalSelectedUnits = selectedCourses.reduce((sum, c) => sum + c.courseUnit, 0);
  const isCourseRegistered = (courseCode) => registeredCourseCodes.has(courseCode);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!studentInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <p className="text-gray-600">Unable to load student data</p>
          <button onClick={() => router.push('/student-login')} className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg">
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center space-x-3 px-6 py-4 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500' : 
          notification.type === 'info' ? 'bg-blue-500' : 'bg-red-500'
        } text-white animate-slide-in max-w-md`}>
          {notification.type === 'success' ? (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : notification.type === 'info' ? (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span className="font-medium text-sm">{notification.message}</span>
        </div>
      )}

      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Student Portal</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">{formatTime(currentTime)}</span>
              </div>
              <button onClick={handleLogout} className="flex items-center space-x-2 text-gray-600 hover:text-red-600 transition-colors">
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
        <div className="mb-6 sm:mb-8">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
              {studentInfo.profilePictureUrl ? (
                <img src={studentInfo.profilePictureUrl} alt="Student" className="w-20 h-20 rounded-full border-4 border-white shadow-lg object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg bg-indigo-400 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {studentInfo.firstName?.charAt(0)}{studentInfo.surname?.charAt(0)}
                  </span>
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-2xl sm:text-3xl font-bold mb-1">{greeting}, {studentInfo.firstName}! 👋</h2>
                <p className="text-white text-sm sm:text-base mb-2">{studentInfo.matricNumber} • {studentInfo.department}</p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm">{studentInfo.level} Level</span>
                  <span className="px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm">2024/2025 {course.semester}</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    studentInfo.fingerprintsCaptured ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {studentInfo.fingerprintsCaptured ? 'Biometric Verified' : 'Pending Verification'}
                  </span>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-sm text-indigo-100 mb-1">Registered Units</p>
                <p className="text-3xl font-bold">{registrationStats.totalUnits}/{maxUnits}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253", label: "Registered", value: registrationStats.totalRegistered, color: "blue" },
            { icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", label: "Approved", value: registrationStats.approved, color: "green" },
            { icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", label: "Pending", value: registrationStats.pending, color: "yellow" },
            { icon: "M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4", label: "Available", value: availableCourses.length, color: "purple" }
          ].map((stat, idx) => (
            <div key={idx} className="bg-white rounded-xl p-4 shadow-md">
              <div className="flex items-center space-x-3">
                <div className={`bg-${stat.color}-100 p-3 rounded-lg`}>
                  <svg className={`w-6 h-6 text-${stat.color}-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('available')}
                className={`flex-1 px-6 py-4 text-center font-semibold transition-all ${
                  activeTab === 'available' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
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
                  activeTab === 'registered' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
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
                    disabled={registering}
                    className={`flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2 rounded-lg transition-all shadow-lg ${
                      registering ? 'opacity-50 cursor-not-allowed' : 'hover:from-indigo-700 hover:to-purple-700'
                    }`}
                  >
                    {registering ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Registering...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Register {selectedCourses.length} Course(s) ({totalSelectedUnits} units)</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {coursesLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="border-2 border-gray-200 rounded-xl p-4 animate-pulse">
                      <div className="h-6 bg-gray-300 rounded w-1/3 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : filteredCourses.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-24 h-24 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">No Courses Found</h3>
                  <p className="text-gray-600">{searchTerm ? 'Try adjusting your search' : 'No courses available for your level'}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredCourses.map(course => {
                    const isSelected = selectedCourses.find(c => c.$id === course.$id);
                    const isRegistered = isCourseRegistered(course.courseCode);
                    
                    return (
                      <div
                        key={course.$id}
                        className={`border-2 rounded-xl p-4 transition-all cursor-pointer ${
                          isRegistered ? 'border-gray-300 bg-gray-50 opacity-60' : isSelected ? 'border-indigo-500 bg-indigo-50 shadow-md' : 'border-gray-300 hover:border-indigo-400 hover:shadow-md'
                        }`}
                        onClick={() => !isRegistered && handleCourseSelection(course)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="font-bold text-lg text-gray-800">{course.courseCode}</h3>
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">{course.courseUnit} Units</span>
                            </div>
                            <p className="text-gray-700 mb-2">{course.courseTitle}</p>
                            <div className="space-y-1 text-sm text-gray-600">
                              <p className="flex items-center space-x-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                                <span>{course.semester} Semester</span>
                              </p>
                              {course.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{course.description}</p>}
                            </div>
                          </div>
                          <label className="flex items-center cursor-pointer ml-2" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={Boolean(isSelected) || Boolean(isRegistered)}
                              onChange={() => !isRegistered && handleCourseSelection(course)}
                              disabled={isRegistered}
                              className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 disabled:opacity-50"
                            />
                          </label>
                        </div>
                        {isRegistered && (
                          <div className="mt-2 px-3 py-1.5 bg-gray-200 text-gray-600 rounded text-sm text-center font-medium">
                            ✓ Already Registered
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'registered' && (
            <div className="p-6">
              {registeredCourses.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-24 h-24 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">No Registered Courses</h3>
                  <p className="text-gray-600 mb-4">You have not registered for any courses yet</p>
                  <button onClick={() => setActiveTab('available')} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                    Browse Available Courses
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {registeredCourses.map(course => (
                    <div key={course.$id} className="border-2 border-gray-200 rounded-xl p-4 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2 flex-wrap gap-2">
                            <h3 className="font-bold text-lg text-gray-800">{course.courseCode}</h3>
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">{course.courseUnit} Units</span>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              course.status === 'Approved' ? 'bg-green-100 text-green-800' : course.status === 'Rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {course.status}
                            </span>
                          </div>
                          <p className="text-gray-700 mb-2">{course.courseTitle}</p>
                          <p className="text-sm text-gray-500">
                            Registered on: {new Date(course.registeredAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                          {course.semester && <p className="text-sm text-gray-500 mt-1">Semester: {course.semester}</p>}
                        </div>
                        {course.status === 'Pending' && (
                          <button
                            onClick={() => handleDropCourse(course.$id, course.courseCode)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-lg transition-colors ml-4"
                            title="Drop Course"
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  <div className="mt-6 bg-indigo-50 border-2 border-indigo-200 rounded-xl p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-1">Registration Summary</h4>
                        <p className="text-sm text-gray-600">
                          Total Courses: {registrationStats.totalRegistered} • Total Units: {registrationStats.totalUnits}/{maxUnits}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">
                          <span className="text-green-600 font-semibold">{registrationStats.approved}</span> Approved • 
                          <span className="text-yellow-600 font-semibold ml-1">{registrationStats.pending}</span> Pending
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 text-center">
                    <button
                      onClick={() => setShowPrintReceipt(true)}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold flex items-center space-x-2 mx-auto shadow-lg"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      <span>Print Registration Form</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showPrintReceipt && (
        <PrintableReceipt
          studentInfo={studentInfo}
          registeredCourses={registeredCourses}
          registrationStats={registrationStats}
          onClose={() => setShowPrintReceipt(false)}
        />
      )}

      <style jsx global>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
        
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
