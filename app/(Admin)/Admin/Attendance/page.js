"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  getCoursesWithRegisteredStudents,
  createAttendanceSession,
  adminMarkAttendance,
  closeAttendanceSession,
  getSessionAttendanceReport
} from '@/lib/appwrite';

export default function AdminAttendanceInterface() {
  const router = useRouter();
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [sessionType, setSessionType] = useState('signin');
  const [activeSession, setActiveSession] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [attendanceLog, setAttendanceLog] = useState([]);
  const [sessionReport, setSessionReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      console.log('Loading courses for attendance...');
      const result = await getCoursesWithRegisteredStudents();
      
      if (result.success) {
        console.log('Courses loaded:', result.data.length);
        setCourses(result.data);
        
        if (result.data.length === 0) {
          setLastResult({
            success: false,
            error: 'No courses with approved registrations found. Please ensure students have registered and their registrations are approved.'
          });
        }
      } else {
        setLastResult({
          success: false,
          error: result.error || 'Failed to load courses'
        });
      }
    } catch (error) {
      console.error('Error loading courses:', error);
      setLastResult({
        success: false,
        error: 'Failed to load courses. Please try refreshing the page.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartSession = async () => {
    if (!selectedCourse) {
      alert('Please select a course first');
      return;
    }

    try {
      const result = await createAttendanceSession(
        selectedCourse.courseCode,
        selectedCourse.courseTitle,
        sessionType
      );

      if (result.success) {
        setActiveSession(result.data);
        setAttendanceLog([]);
        setLastResult({
          success: true,
          message: `${sessionType === 'signin' ? 'Sign-in' : 'Sign-out'} session started for ${selectedCourse.courseCode}`
        });
      } else {
        setLastResult({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      setLastResult({
        success: false,
        error: error.message
      });
    }
  };

  const handleScanFingerprint = async () => {
    if (!activeSession) {
      alert('Please start a session first');
      return;
    }

    setIsScanning(true);
    setLastResult(null);

    try {
      // Prompt for fingerprint
      const scanPrompt = sessionType === 'signin' 
        ? 'Please ask the student to place their finger on the scanner for SIGN IN...'
        : 'Please ask the student to place their finger on the scanner for SIGN OUT...';
      
      console.log(scanPrompt);
      
      // Simulate scanner prompt
      await new Promise(resolve => setTimeout(resolve, 1500));

      // TODO: Replace with actual fingerprint scanner SDK
      const capturedTemplate = 'FINGERPRINT_TEMPLATE_FROM_SCANNER';

      const result = await adminMarkAttendance(
        activeSession.$id,
        sessionType,
        capturedTemplate
      );

      setLastResult(result);

      if (result.success) {
        // Add to log
        setAttendanceLog(prev => [{
          timestamp: new Date().toLocaleTimeString(),
          student: result.student,
          action: result.action,
          fingerUsed: result.fingerUsed,
          message: result.message
        }, ...prev]);

        // Update session count
        setActiveSession(prev => ({
          ...prev,
          totalStudentsMarked: prev.totalStudentsMarked + 1
        }));

        // Auto-clear success message after 3 seconds
        setTimeout(() => {
          if (result.success) {
            setLastResult(null);
          }
        }, 3000);
      }

    } catch (error) {
      console.error('Error scanning fingerprint:', error);
      setLastResult({
        success: false,
        error: error.message || 'Failed to scan fingerprint'
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleCloseSession = async () => {
    if (!activeSession) return;

    if (!confirm('Are you sure you want to close this session?')) {
      return;
    }

    try {
      const result = await closeAttendanceSession(activeSession.$id);
      
      if (result.success) {
        // Load final report
        const reportResult = await getSessionAttendanceReport(activeSession.$id);
        if (reportResult.success) {
          setSessionReport(reportResult);
        }
        
        setActiveSession(null);
        setLastResult({
          success: true,
          message: 'Session closed successfully'
        });
      }
    } catch (error) {
      setLastResult({
        success: false,
        error: error.message
      });
    }
  };

  const handleNewSession = () => {
    setActiveSession(null);
    setSelectedCourse(null);
    setSessionType('signin');
    setAttendanceLog([]);
    setLastResult(null);
    setSessionReport(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600"></div>
      </div>
    );
  }

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
          
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 flex items-center space-x-3">
            <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <span>Mark Attendance</span>
          </h1>
          <p className="text-gray-600 mt-2">Invigilator attendance marking system</p>
        </div>

        {sessionReport ? (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Session Report</h2>
              <button
                onClick={handleNewSession}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Start New Session
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-indigo-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Total Students</p>
                <p className="text-3xl font-bold text-indigo-600">{sessionReport.stats.totalStudents}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Present</p>
                <p className="text-3xl font-bold text-green-600">{sessionReport.stats.present}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Absent</p>
                <p className="text-3xl font-bold text-red-600">{sessionReport.stats.absent}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Attendance Rate</p>
                <p className="text-3xl font-bold text-purple-600">{sessionReport.stats.attendanceRate}%</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Matric No.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sign In</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sign Out</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sessionReport.report.map((item, idx) => (
                    <tr key={idx} className={item.attended ? 'bg-green-50' : 'bg-red-50'}>
                      <td className="px-4 py-3 text-sm font-medium">{item.student.matricNumber}</td>
                      <td className="px-4 py-3 text-sm">{item.student.firstName} {item.student.surname}</td>
                      <td className="px-4 py-3">
                        {item.attended ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-200 text-green-800">
                            Present
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-200 text-red-800">
                            Absent
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {item.signInTime ? new Date(item.signInTime).toLocaleTimeString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {item.signOutTime ? new Date(item.signOutTime).toLocaleTimeString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : lastResult && !lastResult.success && courses.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <svg className="w-32 h-32 mx-auto mb-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-2xl font-bold text-gray-800 mb-4">No Courses Available</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {lastResult.error || 'No courses with approved student registrations found.'}
            </p>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 max-w-md mx-auto">
              <p className="text-sm text-blue-900 font-semibold mb-2">Next Steps:</p>
              <ol className="text-sm text-blue-800 text-left space-y-2">
                <li>1. Ensure students have registered for courses</li>
                <li>2. Approve student course registrations in the admin panel</li>
                <li>3. Refresh this page to see available courses</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Session Setup</h2>

              {!activeSession ? (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Select Course *</label>
                    
                    {courses.length === 0 ? (
                      <div className="text-center py-8 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                        <svg className="w-16 h-16 mx-auto mb-3 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="text-yellow-800 font-medium mb-2">No Courses Available</p>
                        <p className="text-sm text-yellow-700">
                          No courses with approved student registrations found.<br />
                          Please ensure students have registered and been approved.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto border-2 border-gray-200 rounded-lg p-2">
                        {courses.map((course) => (
                          <button
                            key={course.courseCode}
                            onClick={() => setSelectedCourse(course)}
                            className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                              selectedCourse?.courseCode === course.courseCode
                                ? 'border-indigo-600 bg-indigo-50'
                                : 'border-gray-200 hover:border-indigo-300 bg-white'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-bold text-gray-800">{course.courseCode}</p>
                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{course.courseTitle}</p>
                                <div className="flex gap-2 mt-2">
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                    {course.courseUnit} Units
                                  </span>
                                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                    {course.studentCount} Student{course.studentCount !== 1 ? 's' : ''}
                                  </span>
                                  <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                                    {course.semester}
                                  </span>
                                </div>
                              </div>
                              {selectedCourse?.courseCode === course.courseCode && (
                                <svg className="w-6 h-6 text-indigo-600 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Session Type *</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setSessionType('signin')}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          sessionType === 'signin'
                            ? 'border-green-600 bg-green-50'
                            : 'border-gray-300 hover:border-green-400'
                        }`}
                      >
                        <svg className={`w-10 h-10 mx-auto mb-2 ${sessionType === 'signin' ? 'text-green-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                        <span className={`font-semibold ${sessionType === 'signin' ? 'text-green-600' : 'text-gray-700'}`}>
                          Sign In
                        </span>
                      </button>

                      <button
                        onClick={() => setSessionType('signout')}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          sessionType === 'signout'
                            ? 'border-orange-600 bg-orange-50'
                            : 'border-gray-300 hover:border-orange-400'
                        }`}
                      >
                        <svg className={`w-10 h-10 mx-auto mb-2 ${sessionType === 'signout' ? 'text-orange-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span className={`font-semibold ${sessionType === 'signout' ? 'text-orange-600' : 'text-gray-700'}`}>
                          Sign Out
                        </span>
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleStartSession}
                    disabled={!selectedCourse}
                    className="w-full py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                  >
                    Start Attendance Session
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-indigo-900 mb-4">Active Session</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Course:</span>
                        <span className="font-semibold text-gray-900">{activeSession.courseCode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Type:</span>
                        <span className={`font-semibold ${sessionType === 'signin' ? 'text-green-600' : 'text-orange-600'}`}>
                          {sessionType === 'signin' ? 'Sign In' : 'Sign Out'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Students Marked:</span>
                        <span className="font-bold text-indigo-600 text-lg">{activeSession.totalStudentsMarked}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Started:</span>
                        <span className="font-semibold text-gray-900">
                          {new Date(activeSession.sessionStartTime).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleScanFingerprint}
                    disabled={isScanning}
                    className="w-full py-6 rounded-xl font-bold text-lg text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center"
                  >
                    {isScanning ? (
                      <>
                        <svg className="animate-spin h-6 w-6 mr-3" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Scanning...
                      </>
                    ) : (
                      <>
                        <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                        </svg>
                        Scan Student Fingerprint
                      </>
                    )}
                  </button>

                  {lastResult && (
                    <div className={`p-4 rounded-xl border-2 ${
                      lastResult.success 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-start space-x-3">
                        {lastResult.success ? (
                          <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        <div className="flex-1">
                          <p className={`font-semibold ${lastResult.success ? 'text-green-800' : 'text-red-800'}`}>
                            {lastResult.success ? 'Success!' : 'Failed'}
                          </p>
                          <p className={`text-sm mt-1 ${lastResult.success ? 'text-green-700' : 'text-red-700'}`}>
                            {lastResult.message || lastResult.error}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleCloseSession}
                    className="w-full py-3 rounded-lg font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
                  >
                    Close Session & View Report
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Attendance Log</h2>

              {attendanceLog.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-96 text-gray-400">
                  <svg className="w-32 h-32 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-lg font-medium">No attendance marked yet</p>
                  <p className="text-sm mt-2">Start scanning student fingerprints</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {attendanceLog.map((log, idx) => (
                    <div key={idx} className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-bold text-gray-900">
                            {log.student.firstName} {log.student.surname}
                          </p>
                          <p className="text-sm text-gray-600">{log.student.matricNumber}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {log.action === 'signin' ? '✅ Signed In' : '🚪 Signed Out'} • {log.fingerUsed} finger
                          </p>
                        </div>
                        <span className="text-xs text-gray-500">{log.timestamp}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}