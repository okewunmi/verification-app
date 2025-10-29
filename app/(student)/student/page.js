// "use client"
// import { useState, useEffect } from 'react';
// import { useRouter } from 'next/navigation';
// import { 
//   getStudentByMatricNumber,
//   getAvailableCoursesForStudent,
//   getStudentRegisteredCourses,
//   registerStudentCourses,
//   dropCourseRegistration,
//   getStudentRegistrationStats
// } from '@/lib/appwrite';
// import QRCode from 'qrcode.react';
// export default function StudentDashboard() {
//   const router = useRouter();
//   const [currentTime, setCurrentTime] = useState(new Date());
//   const [greeting, setGreeting] = useState('');
//   const [selectedCourses, setSelectedCourses] = useState([]);
//   const [activeTab, setActiveTab] = useState('available');
//   const [searchTerm, setSearchTerm] = useState('');
//   const [notification, setNotification] = useState(null);
//   const [sidebarOpen, setSidebarOpen] = useState(false);
  
//   // Loading states
//   const [loading, setLoading] = useState(true);
//   const [coursesLoading, setCoursesLoading] = useState(false);
//   const [registering, setRegistering] = useState(false);
  
//   // Real data states
//   const [studentInfo, setStudentInfo] = useState(null);
//   const [availableCourses, setAvailableCourses] = useState([]);
//   const [registeredCourses, setRegisteredCourses] = useState([]);
//   const [registrationStats, setRegistrationStats] = useState({
//     totalRegistered: 0,
//     approved: 0,
//     pending: 0,
//     totalUnits: 0
//   });

//   const maxUnits = 24; // Maximum units allowed per semester

//   // Check authentication and load student data
//   useEffect(() => {
//     const loadStudentData = async () => {
//       try {
//         // Get student data from localStorage
//         const studentData = localStorage.getItem('studentData');
        
//         if (!studentData) {
//           router.push('/student-login');
//           return;
//         }

//         const student = JSON.parse(studentData);
        
//         // Fetch fresh student data from database
//         const result = await getStudentByMatricNumber(student.matricNumber);
        
//         if (result.success) {
//           setStudentInfo(result.data);
          
//           // Fetch available courses
//           await fetchAvailableCourses(result.data.level, result.data.department);
          
//           // Fetch registered courses
//           await fetchRegisteredCourses(result.data.matricNumber);
          
//           // Fetch registration stats
//           await fetchRegistrationStats(result.data.matricNumber);
//         } else {
//           router.push('/student-login');
//         }
//       } catch (error) {
//         console.error('Error loading student data:', error);
//         router.push('/student-login');
//       } finally {
//         setLoading(false);
//       }
//     };

//     loadStudentData();
//   }, [router]);

//   // Fetch available courses
//   const fetchAvailableCourses = async (level, department) => {
//     try {
//       setCoursesLoading(true);
//       const result = await getAvailableCoursesForStudent(level, department);
      
//       if (result.success) {
//         setAvailableCourses(result.data);
//       }
//     } catch (error) {
//       console.error('Error fetching courses:', error);
//     } finally {
//       setCoursesLoading(false);
//     }
//   };

//   // Fetch registered courses
//   const fetchRegisteredCourses = async (matricNumber) => {
//     try {
//       const result = await getStudentRegisteredCourses(matricNumber);
      
//       if (result.success) {
//         setRegisteredCourses(result.data);
//       }
//     } catch (error) {
//       console.error('Error fetching registered courses:', error);
//     }
//   };

//   // Fetch registration statistics
//   const fetchRegistrationStats = async (matricNumber) => {
//     try {
//       const result = await getStudentRegistrationStats(matricNumber);
      
//       if (result.success) {
//         setRegistrationStats(result.data);
//       }
//     } catch (error) {
//       console.error('Error fetching stats:', error);
//     }
//   };

//   // Current time updater
//   useEffect(() => {
//     const timer = setInterval(() => {
//       setCurrentTime(new Date());
//     }, 1000);

//     return () => clearInterval(timer);
//   }, []);

//   // Greeting based on time
//   useEffect(() => {
//     const hour = currentTime.getHours();
//     if (hour >= 5 && hour < 12) {
//       setGreeting('Good Morning');
//     } else if (hour >= 12 && hour < 17) {
//       setGreeting('Good Afternoon');
//     } else if (hour >= 17 && hour < 21) {
//       setGreeting('Good Evening');
//     } else {
//       setGreeting('Good Night');
//     }
//   }, [currentTime]);

//   const formatTime = (date) => {
//     return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
//   };

//   const showNotification = (message, type = 'success') => {
//     setNotification({ message, type });
//     setTimeout(() => setNotification(null), 3000);
//   };

//   const handleCourseSelection = (course) => {
//     const isSelected = selectedCourses.find(c => c.$id === course.$id);
    
//     if (isSelected) {
//       setSelectedCourses(selectedCourses.filter(c => c.$id !== course.$id));
//     } else {
//       const totalUnits = selectedCourses.reduce((sum, c) => sum + c.courseUnit, 0) + course.courseUnit;
      
//       if (totalUnits > maxUnits) {
//         showNotification(`Cannot exceed ${maxUnits} units. Current: ${totalUnits - course.courseUnit} units`, 'error');
//         return;
//       }
      
//       setSelectedCourses([...selectedCourses, course]);
//     }
//   };

  
// const handleRegisterCourses = async () => {
//     if (selectedCourses.length === 0) {
//       showNotification('Please select at least one course', 'error');
//       return;
//     }

//     try {
//       setRegistering(true);
      
//       console.log('Registering courses:', selectedCourses.map(c => c.courseCode));
      
//       // Register all selected courses - let backend handle duplicate checks
//       const result = await registerStudentCourses(
//         studentInfo.$id,
//         studentInfo.matricNumber,
//         selectedCourses,
//         '2024/2025',
//         'First'
//       );

//       console.log('Registration result:', result);

//       // Handle response
//       if (result.success || (result.data && result.data.length > 0)) {
//         // Success or partial success
//         const successCount = result.data ? result.data.length : 0;
//         const skipCount = result.skipped ? result.skipped.length : 0;
//         const errorCount = result.errors ? result.errors.length : 0;

//         if (successCount > 0) {
//           let message = `${successCount} course(s) registered successfully`;
//           if (skipCount > 0) message += `, ${skipCount} already registered`;
//           if (errorCount > 0) message += `, ${errorCount} failed`;
          
//           showNotification(message, 'success');
//           setSelectedCourses([]);
          
//           // Refresh registered courses and stats
//           await fetchRegisteredCourses(studentInfo.matricNumber);
//           await fetchRegistrationStats(studentInfo.matricNumber);
          
//           setActiveTab('registered');
//         } else if (skipCount > 0 && errorCount === 0) {
//           showNotification('All selected courses are already registered', 'info');
//           setSelectedCourses([]);
//           // Still refresh to show updated data
//           await fetchRegisteredCourses(studentInfo.matricNumber);
//           await fetchRegistrationStats(studentInfo.matricNumber);
//         } else {
//           showNotification(result.message || 'Registration failed', 'error');
//         }
//       } else {
//         const errorMsg = result.error || result.message || 'Registration failed';
//         showNotification(errorMsg, 'error');
//         console.error('Registration error details:', result);
//       }
//     } catch (error) {
//       console.error('Error registering courses:', error);
//       showNotification(`Registration failed: ${error.message || 'Unknown error'}`, 'error');
//     } finally {
//       setRegistering(false);
//     }
//   };



//   const handleDropCourse = async (registrationId) => {
//     if (!window.confirm('Are you sure you want to drop this course?')) {
//       return;
//     }

//     try {
//       const result = await dropCourseRegistration(registrationId);
      
//       if (result.success) {
//         showNotification(result.message, 'success');
        
//         // Refresh registered courses and stats
//         await fetchRegisteredCourses(studentInfo.matricNumber);
//         await fetchRegistrationStats(studentInfo.matricNumber);
//       } else {
//         showNotification(result.error, 'error');
//       }
//     } catch (error) {
//       console.error('Error dropping course:', error);
//       showNotification('Failed to drop course', 'error');
//     }
//   };

//   const handleLogout = () => {
//     localStorage.removeItem('studentData');
//     localStorage.removeItem('authId');
//     router.push('/student-login');
//   };

//   const filteredCourses = availableCourses.filter(course =>
//     course.courseTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
//     course.courseCode.toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   const totalSelectedUnits = selectedCourses.reduce((sum, c) => sum + c.courseUnit, 0);

//   // Check if course is already registered
//   const isCourseRegistered = (courseCode) => {
//     return registeredCourses.some(r => r.courseCode === courseCode && r.isActive);
//   };

//   // Loading screen
//   if (loading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
//           <p className="text-gray-600 font-medium">Loading your dashboard...</p>
//         </div>
//       </div>
//     );
//   }

//   // No student data
//   if (!studentInfo) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
//         <div className="text-center">
//           <p className="text-gray-600">Unable to load student data</p>
//           <button
//             onClick={() => router.push('/student-login')}
//             className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg"
//           >
//             Back to Login
//           </button>
//         </div>
//       </div>
//     );
//   }

  
  
//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
//       {/* Notification */}
//       {notification && (
//         <div className={`fixed top-4 right-4 z-50 flex items-center space-x-3 px-6 py-4 rounded-lg shadow-lg ${
//           notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
//         } text-white animate-slide-in`}>
//           {notification.type === 'success' ? (
//             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
//             </svg>
//           ) : (
//             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
//             </svg>
//           )}
//           <span className="font-medium">{notification.message}</span>
//         </div>
//       )}

//       {/* Header */}
//       <header className="bg-white shadow-sm sticky top-0 z-40">
//         <div className="px-4 sm:px-6 lg:px-8 py-4">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center space-x-4">
//               <div className="flex items-center space-x-3">
//                 <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
//                 </svg>
//                 <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Student Portal</h1>
//               </div>
//             </div>
//             <div className="flex items-center space-x-4">
//               <div className="hidden sm:flex items-center space-x-2 text-gray-600">
//                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
//                 </svg>
//                 <span className="text-sm">{formatTime(currentTime)}</span>
//               </div>
//               <button 
//                 onClick={handleLogout}
//                 className="flex items-center space-x-2 text-gray-600 hover:text-red-600 transition-colors"
//               >
//                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
//                 </svg>
//                 <span className="hidden sm:inline text-sm font-medium">Logout</span>
//               </button>
//             </div>
//           </div>
//         </div>
//       </header>

//       <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
//         {/* Welcome Section */}
//         <div className="mb-6 sm:mb-8">
//           <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
//             <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
//               {studentInfo.profilePictureUrl ? (
//                 <img
//                   src={studentInfo.profilePictureUrl}
//                   alt="Student"
//                   className="w-20 h-20 rounded-full border-4 border-white shadow-lg object-cover"
//                 />
//               ) : (
//                 <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg bg-indigo-400 flex items-center justify-center">
//                   <span className="text-2xl font-bold text-white">
//                     {studentInfo.firstName?.charAt(0)}{studentInfo.surname?.charAt(0)}
//                   </span>
//                 </div>
//               )}
//               <div className="flex-1">
//                 <h2 className="text-2xl sm:text-3xl font-bold mb-1">
//                   {greeting}, {studentInfo.firstName}! 👋
//                 </h2>
//                 <p className=" text-sm sm:text-base mb-2">
//                   {studentInfo.matricNumber} • {studentInfo.department}
//                 </p>
//                 <div className="flex flex-wrap gap-2">
//                   <span className="px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm text-black">
//                     {studentInfo.level} Level
//                   </span>
//                   <span className="px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm text-black">
//                     2024/2025 First Semester
//                   </span>
//                   <span className={`px-3 py-1 rounded-full text-sm font-medium ${
//                     studentInfo.fingerprintsCaptured 
//                       ? 'bg-green-100 text-green-800' 
//                       : 'bg-yellow-100 text-yellow-800'
//                   }`}>
//                     {studentInfo.fingerprintsCaptured ? 'Biometric Verified' : 'Pending Verification'}
//                   </span>
//                 </div>
//               </div>
//               <div className="text-left sm:text-right">
//                 <p className="text-sm text-indigo-100 mb-1">Registered Units</p>
//                 <p className="text-3xl font-bold">{registrationStats.totalUnits}/{maxUnits}</p>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Stats Cards */}
//         <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
//           <div className="bg-white rounded-xl p-4 shadow-md">
//             <div className="flex items-center space-x-3">
//               <div className="bg-blue-100 p-3 rounded-lg">
//                 <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
//                 </svg>
//               </div>
//               <div>
//                 <p className="text-xs text-gray-600">Registered</p>
//                 <p className="text-2xl font-bold text-gray-800">{registrationStats.totalRegistered}</p>
//               </div>
//             </div>
//           </div>

//           <div className="bg-white rounded-xl p-4 shadow-md">
//             <div className="flex items-center space-x-3">
//               <div className="bg-green-100 p-3 rounded-lg">
//                 <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
//                 </svg>
//               </div>
//               <div>
//                 <p className="text-xs text-gray-600">Approved</p>
//                 <p className="text-2xl font-bold text-gray-800">{registrationStats.approved}</p>
//               </div>
//             </div>
//           </div>

//           <div className="bg-white rounded-xl p-4 shadow-md">
//             <div className="flex items-center space-x-3">
//               <div className="bg-yellow-100 p-3 rounded-lg">
//                 <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
//                 </svg>
//               </div>
//               <div>
//                 <p className="text-xs text-gray-600">Pending</p>
//                 <p className="text-2xl font-bold text-gray-800">{registrationStats.pending}</p>
//               </div>
//             </div>
//           </div>

//           <div className="bg-white rounded-xl p-4 shadow-md">
//             <div className="flex items-center space-x-3">
//               <div className="bg-purple-100 p-3 rounded-lg">
//                 <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
//                 </svg>
//               </div>
//               <div>
//                 <p className="text-xs text-gray-600">Available</p>
//                 <p className="text-2xl font-bold text-gray-800">{availableCourses.length}</p>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Tabs */}
//         <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
//           <div className="border-b border-gray-200">
//             <div className="flex">
//               <button
//                 onClick={() => setActiveTab('available')}
//                 className={`flex-1 px-6 py-4 text-center font-semibold transition-all ${
//                   activeTab === 'available'
//                     ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
//                     : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
//                 }`}
//               >
//                 <div className="flex items-center justify-center space-x-2">
//                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
//                   </svg>
//                   <span>Available Courses</span>
//                 </div>
//               </button>
//               <button
//                 onClick={() => setActiveTab('registered')}
//                 className={`flex-1 px-6 py-4 text-center font-semibold transition-all ${
//                   activeTab === 'registered'
//                     ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
//                     : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
//                 }`}
//               >
//                 <div className="flex items-center justify-center space-x-2">
//                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
//                   </svg>
//                   <span>My Courses</span>
//                 </div>
//               </button>
//             </div>
//           </div>

//           {/* Available Courses Tab */}
//           {activeTab === 'available' && (
//             <div className="p-6">
//               <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 mb-6">
//                 <div className="relative flex-1 max-w-md">
//                   <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
//                   </svg>
//                   <input
//                     type="text"
//                     value={searchTerm}
//                     onChange={(e) => setSearchTerm(e.target.value)}
//                     placeholder="Search courses..."
//                     className="pl-10 pr-4 py-2 w-full border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
//                   />
//                 </div>
//                 {selectedCourses.length > 0 && (
//                   <button
//                     onClick={handleRegisterCourses}
//                     disabled={registering}
//                     className={`flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2 rounded-lg transition-all shadow-lg ${
//                       registering ? 'opacity-50 cursor-not-allowed' : 'hover:from-indigo-700 hover:to-purple-700'
//                     }`}
//                   >
//                     {registering ? (
//                       <>
//                         <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
//                         </svg>
//                         <span>Registering...</span>
//                       </>
//                     ) : (
//                       <>
//                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
//                         </svg>
//                         <span>Register {selectedCourses.length} Course(s) ({totalSelectedUnits} units)</span>
//                       </>
//                     )}
//                   </button>
//                 )}
//               </div>

//               {coursesLoading ? (
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   {[1, 2, 3, 4].map((i) => (
//                     <div key={i} className="border-2 border-gray-200 rounded-xl p-4 animate-pulse">
//                       <div className="h-6 bg-gray-300 rounded w-1/3 mb-2"></div>
//                       <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
//                       <div className="h-3 bg-gray-200 rounded w-1/2"></div>
//                     </div>
//                   ))}
//                 </div>
//               ) : filteredCourses.length === 0 ? (
//                 <div className="text-center py-12">
//                   <svg className="w-24 h-24 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
//                   </svg>
//                   <h3 className="text-xl font-semibold text-gray-800 mb-2">No Courses Found</h3>
//                   <p className="text-gray-600">
//                     {searchTerm ? 'Try adjusting your search' : 'No courses available for your level'}
//                   </p>
//                 </div>
//               ) : (
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   {filteredCourses.map(course => {
//                     const isSelected = selectedCourses.find(c => c.$id === course.$id);
//                     const isRegistered = isCourseRegistered(course.courseCode);
                    
//                     return (
//                       <div
//                         key={course.$id}
//                         className={`border-2 rounded-xl p-4 transition-all ${
//                           isRegistered
//                             ? 'border-gray-300 bg-gray-50 opacity-60'
//                             : isSelected
//                             ? 'border-indigo-500 bg-indigo-50'
//                             : 'border-gray-300 hover:border-indigo-400 hover:shadow-md'
//                         }`}
//                       >
//                         <div className="flex items-start justify-between mb-3">
//                           <div className="flex-1">
//                             <div className="flex items-center space-x-2 mb-1">
//                               <h3 className="font-bold text-lg text-gray-800">{course.courseCode}</h3>
//                               <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
//                                 {course.courseUnit} Units
//                               </span>
//                             </div>
//                             <p className="text-gray-700 mb-2">{course.courseTitle}</p>
//                             <div className="space-y-1 text-sm text-gray-600">
//                               <p className="flex items-center space-x-1">
//                                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
//                                 </svg>
//                                 <span>{course.semester} Semester</span>
//                               </p>
//                               {course.description && (
//                                 <p className="text-xs text-gray-500 mt-1">{course.description}</p>
//                               )}
//                             </div>
//                           </div>
//                           <label className="flex items-center cursor-pointer">
//                             <input
//                               type="checkbox"
//                               checked={Boolean(isSelected) || Boolean(isRegistered)}
//                               onChange={() => !isRegistered && handleCourseSelection(course)}
//                               disabled={isRegistered}
//                               className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
//                             />
//                           </label>
//                         </div>
//                         {isRegistered && (
//                           <div className="mt-2 px-3 py-1 bg-gray-200 text-gray-600 rounded text-sm text-center">
//                             Already Registered
//                           </div>
//                         )}
//                       </div>
//                     );
//                   })}
//                 </div>
//               )}
//             </div>
//           )}

//           {/* Registered Courses Tab */}
//           {activeTab === 'registered' && (
//             <div className="p-6">
//               {registeredCourses.length === 0 ? (
//                 <div className="text-center py-12">
//                   <svg className="w-24 h-24 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
//                   </svg>
//                   <h3 className="text-xl font-semibold text-gray-800 mb-2">No Registered Courses</h3>
//                   <p className="text-gray-600 mb-4">You have not registered for any courses yet</p>
//                   <button
//                     onClick={() => setActiveTab('available')}
//                     className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
//                   >
//                     Browse Available Courses
//                   </button>
//                 </div>
//               ) : (
//                 <div className="space-y-4">
//                   {registeredCourses.map(course => (
//                     <div
//                       key={course.$id}
//                       className="border-2 border-gray-200 rounded-xl p-4 hover:shadow-md transition-all"
//                     >
//                       <div className="flex items-start justify-between">
//                         <div className="flex-1">
//                           <div className="flex items-center space-x-3 mb-2 flex-wrap gap-2">
//                             <h3 className="font-bold text-lg text-gray-800">{course.courseCode}</h3>
//                             <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
//                               {course.courseUnit} Units
//                             </span>
//                             <span className={`px-3 py-1 rounded-full text-sm font-medium ${
//                               course.status === 'Approved'
//                                 ? 'bg-green-100 text-green-800'
//                                 : course.status === 'Rejected'
//                                 ? 'bg-red-100 text-red-800'
//                                 : 'bg-yellow-100 text-yellow-800'
//                             }`}>
//                               {course.status}
//                             </span>
//                           </div>
//                           <p className="text-gray-700 mb-2">{course.courseTitle}</p>
//                           <p className="text-sm text-gray-500">
//                             Registered on: {new Date(course.registeredAt).toLocaleDateString('en-US', { 
//                               year: 'numeric', 
//                               month: 'long', 
//                               day: 'numeric' 
//                             })}
//                           </p>
//                           {course.semester && (
//                             <p className="text-sm text-gray-500 mt-1">
//                               Semester: {course.semester}
//                             </p>
//                           )}
//                         </div>
//                         {course.status === 'Pending' && (
//                           <button
//                             onClick={() => handleDropCourse(course.$id)}
//                             className="text-red-600 hover:text-red-800 transition-colors ml-4"
//                             title="Drop Course"
//                           >
//                             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
//                             </svg>
//                           </button>
//                         )}
//                       </div>
//                     </div>
//                   ))}
                  
//                   {/* Summary */}
//                   <div className="mt-6 bg-indigo-50 border-2 border-indigo-200 rounded-xl p-4">
//                     <div className="flex justify-between items-center">
//                       <div>
//                         <h4 className="font-semibold text-gray-800 mb-1">Registration Summary</h4>
//                         <p className="text-sm text-gray-600">
//                           Total Courses: {registrationStats.totalRegistered} • 
//                           Total Units: {registrationStats.totalUnits}/{maxUnits}
//                         </p>
//                       </div>
//                       <div className="text-right">
//                         <p className="text-sm text-gray-600">
//                           <span className="text-green-600 font-semibold">{registrationStats.approved}</span> Approved • 
//                           <span className="text-yellow-600 font-semibold ml-1">{registrationStats.pending}</span> Pending
//                         </p>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               )}
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

// npm uninstall qrcode.react
// npm install react-qr-code


"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  getStudentByMatricNumber,
  getAvailableCoursesForStudent,
  getStudentRegisteredCourses,
  registerStudentCourses,
  dropCourseRegistration,
  getStudentRegistrationStats
} from '@/lib/appwrite';

import QRCode from 'react-qr-code';

// Printable Receipt Component
const PrintableReceipt = ({ studentInfo, registeredCourses, registrationStats, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  // Generate QR data
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
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        {/* Print Styles */}
        <style>{`
          @media print {
            body * { visibility: hidden; }
            .printable-area, .printable-area * { visibility: visible; }
            .printable-area { 
              position: absolute; 
              left: 0; 
              top: 0; 
              width: 100%; 
              padding: 20px;
            }
            .no-print { display: none !important; }
            @page { 
              margin: 15mm; 
              size: A4;
            }
          }
        `}</style>

        {/* Non-printable controls */}
        <div className="no-print sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
          <h3 className="text-xl font-bold text-gray-800">Course Registration Receipt</h3>
          <div className="flex space-x-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Printable Content */}
        <div className="printable-area p-8">
          {/* Header */}
          <div className="text-center mb-8 border-b-2 border-gray-300 pb-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">FEDERAL TRAINING POLYTECHNIC</h1>
            <h2 className="text-xl font-semibold text-gray-700">COURSE REGISTRATION FORM</h2>
            <p className="text-gray-600 mt-2">2024/2025 Academic Session - First Semester</p>
          </div>

          <div className="grid grid-cols-3 gap-6 mb-8">
            {/* Student Photo and QR Code */}
            <div className="col-span-1 space-y-4">
              {studentInfo.profilePictureUrl ? (
                <img
                  src={studentInfo.profilePictureUrl}
                  alt="Student"
                  className="w-40 h-40 rounded-lg border-4 border-gray-300 object-cover mx-auto"
                />
              ) : (
                <div className="w-40 h-40 rounded-lg border-4 border-gray-300 bg-gray-200 flex items-center justify-center mx-auto">
                  <span className="text-4xl font-bold text-gray-500">
                    {studentInfo.firstName?.charAt(0)}{studentInfo.surname?.charAt(0)}
                  </span>
                </div>
              )}
              
              {/* QR Code */}
              <div className="flex justify-center">
                <div className="p-4 bg-white border-2 border-gray-300 rounded-lg">
                  <QRCode value={qrData} size={150} level="H" />
                  <p className="text-xs text-center mt-2 text-gray-600">Scan for verification</p>
                </div>
              </div>
            </div>

            {/* Student Information */}
            <div className="col-span-2 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Matric Number:</p>
                  <p className="text-lg font-bold text-gray-800">{studentInfo.matricNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Full Name:</p>
                  <p className="text-lg font-bold text-gray-800">
                    {studentInfo.surname} {studentInfo.firstName} {studentInfo.middleName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Department:</p>
                  <p className="text-base text-gray-800">{studentInfo.department}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Level:</p>
                  <p className="text-base text-gray-800">{studentInfo.level}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Email:</p>
                  <p className="text-base text-gray-800">{studentInfo.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Phone:</p>
                  <p className="text-base text-gray-800">{studentInfo.phoneNumber}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Course Table */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4 border-b-2 border-gray-300 pb-2">
              Registered Courses
            </h3>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left">S/N</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Course Code</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Course Title</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Units</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {registeredCourses.map((course, index) => (
                  <tr key={course.$id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">{index + 1}</td>
                    <td className="border border-gray-300 px-4 py-2 font-semibold">{course.courseCode}</td>
                    <td className="border border-gray-300 px-4 py-2">{course.courseTitle}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center">{course.courseUnit}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        course.status === 'Approved' ? 'bg-green-100 text-green-800' :
                        course.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {course.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-bold">
                  <td colSpan="3" className="border border-gray-300 px-4 py-2 text-right">
                    TOTAL:
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    {registrationStats.totalUnits} Units
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    {registrationStats.totalRegistered} Courses
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-600 font-semibold">Total Registered</p>
              <p className="text-2xl font-bold text-blue-600">{registrationStats.totalRegistered}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-sm text-gray-600 font-semibold">Approved</p>
              <p className="text-2xl font-bold text-green-600">{registrationStats.approved}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <p className="text-sm text-gray-600 font-semibold">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{registrationStats.pending}</p>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t-2 border-gray-300 pt-6 mt-8">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-sm text-gray-600 mb-8">Student's Signature:</p>
                <div className="border-b-2 border-gray-400 w-3/4"></div>
                <p className="text-xs text-gray-600 mt-2">Date: {new Date().toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-8">HOD's Signature:</p>
                <div className="border-b-2 border-gray-400 w-3/4"></div>
                <p className="text-xs text-gray-600 mt-2">Date: _______________</p>
              </div>
            </div>
          </div>

          {/* Print Info */}
          <div className="text-center mt-8 text-xs text-gray-500">
            <p>Printed on: {new Date().toLocaleString()}</p>
            <p className="mt-1">This is a computer-generated document. No signature is required.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Student Dashboard Component
export default function StudentDashboard() {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState('');
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [activeTab, setActiveTab] = useState('available');
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState(null);
  const [showPrintReceipt, setShowPrintReceipt] = useState(false); // Print receipt state
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  
  // Real data states
  const [studentInfo, setStudentInfo] = useState(null);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [registeredCourses, setRegisteredCourses] = useState([]);
  const [registrationStats, setRegistrationStats] = useState({
    totalRegistered: 0,
    approved: 0,
    pending: 0,
    totalUnits: 0
  });

  const maxUnits = 24;

  // Check authentication and load student data
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
    const isSelected = selectedCourses.find(c => c.$id === course.$id);
    
    if (isSelected) {
      setSelectedCourses(selectedCourses.filter(c => c.$id !== course.$id));
    } else {
      const totalUnits = selectedCourses.reduce((sum, c) => sum + c.courseUnit, 0) + course.courseUnit;
      
      if (totalUnits > maxUnits) {
        showNotification(`Cannot exceed ${maxUnits} units. Current: ${totalUnits - course.courseUnit} units`, 'error');
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

    try {
      setRegistering(true);
      
      const result = await registerStudentCourses(
        studentInfo.$id,
        studentInfo.matricNumber,
        selectedCourses,
        '2024/2025',
        'First'
      );

      if (result.success || (result.data && result.data.length > 0)) {
        const successCount = result.data ? result.data.length : 0;
        const skipCount = result.skipped ? result.skipped.length : 0;
        const errorCount = result.errors ? result.errors.length : 0;

        if (successCount > 0) {
          let message = `${successCount} course(s) registered successfully`;
          if (skipCount > 0) message += `, ${skipCount} already registered`;
          if (errorCount > 0) message += `, ${errorCount} failed`;
          
          showNotification(message, 'success');
          setSelectedCourses([]);
          
          await fetchRegisteredCourses(studentInfo.matricNumber);
          await fetchRegistrationStats(studentInfo.matricNumber);
          
          setActiveTab('registered');
        } else if (skipCount > 0 && errorCount === 0) {
          showNotification('All selected courses are already registered', 'info');
          setSelectedCourses([]);
          await fetchRegisteredCourses(studentInfo.matricNumber);
          await fetchRegistrationStats(studentInfo.matricNumber);
        } else {
          showNotification(result.message || 'Registration failed', 'error');
        }
      } else {
        showNotification(result.error || result.message || 'Registration failed', 'error');
      }
    } catch (error) {
      console.error('Error registering courses:', error);
      showNotification(`Registration failed: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      setRegistering(false);
    }
  };

  const handleDropCourse = async (registrationId) => {
    if (!window.confirm('Are you sure you want to drop this course?')) {
      return;
    }

    try {
      const result = await dropCourseRegistration(registrationId);
      
      if (result.success) {
        showNotification(result.message, 'success');
        await fetchRegisteredCourses(studentInfo.matricNumber);
        await fetchRegistrationStats(studentInfo.matricNumber);
      } else {
        showNotification(result.error, 'error');
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

  const isCourseRegistered = (courseCode) => {
    return registeredCourses.some(r => r.courseCode === courseCode && r.isActive);
  };

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
          <button
            onClick={() => router.push('/student-login')}
            className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center space-x-3 px-6 py-4 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white animate-slide-in`}>
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
        </div>
      </header>

      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
              {studentInfo.profilePictureUrl ? (
                <img
                  src={studentInfo.profilePictureUrl}
                  alt="Student"
                  className="w-20 h-20 rounded-full border-4 border-white shadow-lg object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg bg-indigo-400 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {studentInfo.firstName?.charAt(0)}{studentInfo.surname?.charAt(0)}
                  </span>
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-2xl sm:text-3xl font-bold mb-1">
                  {greeting}, {studentInfo.firstName}! 👋
                </h2>
                <p className="text-white text-sm sm:text-base mb-2">
                  {studentInfo.matricNumber} • {studentInfo.department}
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm">
                    {studentInfo.level} Level
                  </span>
                  <span className="px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm">
                    2024/2025 First Semester
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    studentInfo.fingerprintsCaptured 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
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
                <p className="text-2xl font-bold text-gray-800">{registrationStats.totalRegistered}</p>
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
                <p className="text-2xl font-bold text-gray-800">{registrationStats.approved}</p>
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
                <p className="text-2xl font-bold text-gray-800">{registrationStats.pending}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-md">
            <div className="flex items-center space-x-3">
              <div className="bg-purple-100 p-3 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-600">Available</p>
                <p className="text-2xl font-bold text-gray-800">{availableCourses.length}</p>
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
                  <p className="text-gray-600">
                    {searchTerm ? 'Try adjusting your search' : 'No courses available for your level'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredCourses.map(course => {
                    const isSelected = selectedCourses.find(c => c.$id === course.$id);
                    const isRegistered = isCourseRegistered(course.courseCode);
                    
                    return (
                      <div
                        key={course.$id}
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
                              <h3 className="font-bold text-lg text-gray-800">{course.courseCode}</h3>
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                {course.courseUnit} Units
                              </span>
                            </div>
                            <p className="text-gray-700 mb-2">{course.courseTitle}</p>
                            <div className="space-y-1 text-sm text-gray-600">
                              <p className="flex items-center space-x-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                                <span>{course.semester} Semester</span>
                              </p>
                              {course.description && (
                                <p className="text-xs text-gray-500 mt-1">{course.description}</p>
                              )}
                            </div>
                          </div>
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(isSelected) || Boolean(isRegistered)}
                              onChange={() => !isRegistered && handleCourseSelection(course)}
                              disabled={isRegistered}
                              className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
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
              )}
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
                      key={course.$id}
                      className="border-2 border-gray-200 rounded-xl p-4 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2 flex-wrap gap-2">
                            <h3 className="font-bold text-lg text-gray-800">{course.courseCode}</h3>
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                              {course.courseUnit} Units
                            </span>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              course.status === 'Approved'
                                ? 'bg-green-100 text-green-800'
                                : course.status === 'Rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {course.status}
                            </span>
                          </div>
                          <p className="text-gray-700 mb-2">{course.courseTitle}</p>
                          <p className="text-sm text-gray-500">
                            Registered on: {new Date(course.registeredAt).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </p>
                          {course.semester && (
                            <p className="text-sm text-gray-500 mt-1">
                              Semester: {course.semester}
                            </p>
                          )}
                        </div>
                        {course.status === 'Pending' && (
                          <button
                            onClick={() => handleDropCourse(course.$id)}
                            className="text-red-600 hover:text-red-800 transition-colors ml-4"
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
                  
                  {/* Summary */}
                  <div className="mt-6 bg-indigo-50 border-2 border-indigo-200 rounded-xl p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-1">Registration Summary</h4>
                        <p className="text-sm text-gray-600">
                          Total Courses: {registrationStats.totalRegistered} • 
                          Total Units: {registrationStats.totalUnits}/{maxUnits}
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

                  {/* Print Button */}
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

      {/* Print Receipt Modal */}
      {showPrintReceipt && (
        <PrintableReceipt
          studentInfo={studentInfo}
          registeredCourses={registeredCourses}
          registrationStats={registrationStats}
          onClose={() => setShowPrintReceipt(false)}
        />
      )}
    </div>
  );
}