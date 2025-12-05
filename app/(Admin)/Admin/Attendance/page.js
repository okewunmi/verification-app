"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Fingerprint, AlertCircle, Loader2 } from 'lucide-react';
import { 
  getCoursesWithRegisteredStudents,
  createAttendanceSession,
  closeAttendanceSession,
  getSessionAttendanceReport,
  getStudentsForCourse,
  databases,
  config
} from '@/lib/appwrite';
import { Query, ID } from 'appwrite';

export default function AdminAttendanceInterface() {
  const router = useRouter();
  
  // Core state
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [sessionType, setSessionType] = useState('signin');
  const [activeSession, setActiveSession] = useState(null);
  const [registeredStudents, setRegisteredStudents] = useState([]);
  
  // Verification state
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [status, setStatus] = useState({ message: '', type: '' });
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  
  // UI state
  const [attendanceLog, setAttendanceLog] = useState([]);
  const [sessionReport, setSessionReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fingerprintScanner, setFingerprintScanner] = useState(null);

  // Initialize fingerprint scanner
  useEffect(() => {
    const loadScanner = async () => {
      try {
        const scanner = (await import('@/lib/fingerprint-digitalpersona')).default;
        setFingerprintScanner(scanner);
        
        const availability = await scanner.isAvailable();
        if (availability.available) {
          setStatus({ message: 'Fingerprint scanner ready', type: 'success' });
        } else {
          setStatus({ message: availability.error || 'Scanner unavailable', type: 'warning' });
        }
      } catch (error) {
        console.error('Scanner load error:', error);
        setStatus({ message: 'Fingerprint scanner unavailable', type: 'warning' });
      }
    };
    
    loadScanner();
    loadCourses();
  }, []);

  // Load students when course is selected
  useEffect(() => {
    if (selectedCourse) {
      loadRegisteredStudents();
    }
  }, [selectedCourse]);

  // Helper functions for status display
  const getStatusColor = () => {
    switch (status.type) {
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getStatusIcon = () => {
    switch (status.type) {
      case 'success': return <CheckCircle className="w-5 h-5" />;
      case 'error': return <XCircle className="w-5 h-5" />;
      case 'warning': return <AlertCircle className="w-5 h-5" />;
      default: return <Fingerprint className="w-5 h-5" />;
    }
  };

  const loadCourses = async () => {
    try {
      console.log('Loading courses for attendance...');
      const result = await getCoursesWithRegisteredStudents();
      
      if (result.success) {
        console.log('Courses loaded:', result.data.length);
        setCourses(result.data);
        
        if (result.data.length === 0) {
          setStatus({
            message: 'No courses with approved registrations found',
            type: 'warning'
          });
        }
      } else {
        setStatus({
          message: result.error || 'Failed to load courses',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error loading courses:', error);
      setStatus({
        message: 'Failed to load courses',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadRegisteredStudents = async () => {
    if (!selectedCourse) return;
    
    try {
      console.log('Loading registered students for:', selectedCourse.courseCode);
      const result = await getStudentsForCourse(selectedCourse.courseCode);
      
      if (result.success) {
        console.log('Registered students loaded:', result.data.length);
        setRegisteredStudents(result.data);
      } else {
        console.error('Failed to load students:', result.error);
        setRegisteredStudents([]);
      }
    } catch (error) {
      console.error('Error loading registered students:', error);
      setRegisteredStudents([]);
    }
  };

const handleStartSession = async () => {
  if (!selectedCourse) {
    alert('Please select a course first');
    return;
  }

  if (sessionType === 'signout') {
    const today = new Date().toISOString().split('T')[0];
    
    try {
      // Get all attendance for today
      const todayAttendance = await databases.listDocuments(
        config.databaseId,
        config.attendanceCollectionId,
        [
          Query.equal('courseCode', selectedCourse.courseCode),
          Query.equal('attendanceDate', today),
          Query.limit(20) // Get more records to analyze
        ]
      );
      
      // Filter in JavaScript for better control
      const pendingSignOuts = todayAttendance.documents.filter(record => {
        // Has signed in (signInTime exists and signInStatus is Present)
        const hasSignedIn = record.signInTime && record.signInStatus === 'Present';
        // Has not signed out (signOutTime is null)
        const notSignedOut = !record.signOutTime;
        return hasSignedIn && notSignedOut;
      });
      
      if (pendingSignOuts.length === 0) {
        const proceed = confirm('No signed-in students found for today. Do you want to proceed with sign-out session anyway?');
        if (!proceed) {
          setSessionType('signin');
          return;
        }
      } else {
        setStatus({
          message: `Found ${pendingSignOuts.length} student(s) pending sign-out`,
          type: 'info'
        });
      }
    } catch (error) {
      console.error('Error checking attendance records:', error);
      // Continue with sign-out session anyway
      const proceed = confirm('Error checking existing records. Do you want to proceed with sign-out session anyway?');
      if (!proceed) {
        return;
      }
    }
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
      await loadRegisteredStudents();
      
      setStatus({
        message: `${sessionType === 'signin' ? 'Sign-in' : 'Sign-out'} session started for ${selectedCourse.courseCode}`,
        type: 'success'
      });
    } else {
      setStatus({
        message: result.error || 'Failed to start session',
        type: 'error'
      });
    }
  } catch (error) {
    setStatus({
      message: error.message || 'Failed to start session',
      type: 'error'
    });
  }
};
const handleScanFingerprint = async () => {
    if (!activeSession) {
      alert('Please start a session first');
      return;
    }

    if (!fingerprintScanner) {
      setStatus({ message: 'Scanner not initialized', type: 'error' });
      return;
    }

    if (registeredStudents.length === 0) {
      alert('No registered students found for this course');
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);
    setProgress({ current: 0, total: 0 });
    setStatus({ 
      message: `Place finger on scanner for ${sessionType === 'signin' ? 'SIGN IN' : 'SIGN OUT'}...`, 
      type: 'info' 
    });

    try {
      // Step 1: Capture fingerprint
      console.log('🔍 Starting NBIS verification process...');
      const captureResult = await fingerprintScanner.capturePNG('Attendance');

      if (!captureResult.success) {
        throw new Error(captureResult.error);
      }

      console.log('✅ Fingerprint captured, quality:', captureResult.quality + '%');
      
      if (captureResult.quality < 50) {
        setStatus({ 
          message: `Quality too low (${captureResult.quality}%). Please try again with a cleaner finger.`, 
          type: 'warning' 
        });
        setIsVerifying(false);
        return;
      }

      setStatus({ message: 'Loading database...', type: 'info' });

      // Step 2: Get all stored fingerprints
      const { getStudentsWithFingerprintsPNG } = await import('@/lib/appwrite');
      const fingerprintsResult = await getStudentsWithFingerprintsPNG();

      if (!fingerprintsResult.success) {
        throw new Error('Failed to fetch stored fingerprints: ' + fingerprintsResult.error);
      }

      if (fingerprintsResult.data.length === 0) {
        setVerificationResult({
          matched: false,
          message: 'No registered fingerprints found in database'
        });
        setStatus({ message: 'No registered fingerprints', type: 'warning' });
        setIsVerifying(false);
        return;
      }

      const totalFingerprints = fingerprintsResult.data.length;
      console.log(`📊 Database size: ${totalFingerprints} fingerprints`);
      
      setProgress({ current: 0, total: totalFingerprints });
      setStatus({ 
        message: `Comparing against ${totalFingerprints} fingerprints using NBIS...`, 
        type: 'info' 
      });

      // Step 3: Use optimized batch comparison via NBIS
      const response = await fetch('/api/fingerprint/verify-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queryImage: captureResult.imageData,
          database: fingerprintsResult.data.map(fp => ({
            id: fp.fileId,
            studentId: fp.student.$id,
            matricNumber: fp.student.matricNumber,
            studentName: `${fp.student.firstName} ${fp.student.surname}`,
            fingerName: fp.fingerName,
            imageData: fp.imageData,
            student: fp.student
          }))
        })
      });

      if (!response.ok) {
        throw new Error(`Verification failed: ${response.status}`);
      }

      const result = await response.json();

      // Step 4: Handle result
      if (result.success && result.matched && result.bestMatch) {
        const student = result.bestMatch.student;

        // Check if student is registered for this course
        const isRegistered = registeredStudents.find(
          s => s.matricNumber === student.matricNumber
        );

        if (!isRegistered) {
          setVerificationResult({
            matched: false,
            message: `${student.firstName} ${student.surname} (${student.matricNumber}) is not registered for ${activeSession.courseCode}`
          });
          setStatus({ message: 'Student not registered for this course', type: 'error' });

          // Error sound
          try {
            const audio = new Audio('/sounds/error.mp3');
            audio.play().catch(e => console.log('Audio failed:', e));
          } catch (e) {}

          setIsVerifying(false);
          return;
        }

        console.log('\n✅ === MATCH FOUND (NBIS) ===');
        console.log('Student:', result.bestMatch.studentName);
        console.log('NBIS Score:', result.bestMatch.score);
        console.log('============================\n');

        // Mark attendance in database
        const markResult = await markAttendanceInSession(
          activeSession.$id,
          student,
          sessionType,
          result.bestMatch.fingerName,
          selectedCourse.courseId 
        );

        if (markResult.success) {
          setVerificationResult({
            matched: true,
            student: student,
            confidence: result.bestMatch.confidence,
            score: result.bestMatch.score,
            fingerName: result.bestMatch.fingerName,
            action: sessionType,
            message: `${student.firstName} ${student.surname} ${sessionType === 'signin' ? 'signed in' : 'signed out'} successfully`
          });
          setStatus({ message: 'Attendance marked successfully!', type: 'success' });

          // Add to log
          setAttendanceLog(prev => [{
            timestamp: new Date().toLocaleTimeString(),
            student: student,
            action: sessionType,
            fingerUsed: result.bestMatch.fingerName,
            confidence: result.bestMatch.confidence,
            score: result.bestMatch.score
          }, ...prev]);

          // Update session count
          setActiveSession(prev => ({
            ...prev,
            totalStudentsMarked: prev.totalStudentsMarked + 1
          }));

          // Success sound
          try {
            const audio = new Audio('/sounds/success.mp3');
            audio.play().catch(e => console.log('Audio failed:', e));
          } catch (e) {}

          // Auto-clear after 3 seconds
          setTimeout(() => {
            setVerificationResult(null);
            setStatus({ message: 'Ready for next student', type: 'info' });
          }, 3000);

        } else {
          setVerificationResult({
            matched: false,
            message: markResult.error || 'Failed to mark attendance'
          });
          setStatus({ message: markResult.error || 'Failed to mark attendance', type: 'error' });
        }

      } else {
        console.log('\n❌ === NO MATCH FOUND (NBIS) ===');
        console.log('Best score:', result.bestMatch?.score || 0);
        console.log('================================\n');

        setVerificationResult({
          matched: false,
          message: `No match found. Best score: ${result.bestMatch?.score || 0}`,
          totalCompared: result.totalCompared
        });
        setStatus({ message: 'No match found', type: 'error' });

        // Error sound
        try {
          const audio = new Audio('/sounds/error.mp3');
          audio.play().catch(e => console.log('Audio failed:', e));
        } catch (e) {}
      }

    } catch (error) {
      console.error('❌ Verification error:', error);
      setStatus({ message: error.message || 'Verification failed', type: 'error' });
      setVerificationResult({
        matched: false,
        message: 'Error: ' + error.message
      });
    } finally {
      setIsVerifying(false);
      setProgress({ current: 0, total: 0 });
      await fingerprintScanner.stop();
    }
  };


  const markAttendanceInSession = async (sessionId, student, type, fingerUsed, courseId) => {
  try {
    const timestamp = new Date().toISOString();
    const date = timestamp.split('T')[0];

    // Validate and sanitize courseId
    const sanitizedCourseId = String(courseId || '').trim().substring(0, 150);
    
    if (!sanitizedCourseId) {
      return {
        success: false,
        error: 'Course ID is required'
      };
    }

    // FIXED: Check for attendance record by date and course, NOT by sessionId
    // This allows sign-out to work even if it's a different session than sign-in
    const existingRecords = await databases.listDocuments(
      config.databaseId,
      config.attendanceCollectionId,
      [
        Query.equal('matricNumber', student.matricNumber),
        Query.equal('courseCode', activeSession.courseCode),
        Query.equal('attendanceDate', date),
        Query.limit(1)
      ]
    );

    if (existingRecords.documents.length > 0) {
      // Record exists
      const record = existingRecords.documents[0];
      
      if (type === 'signin') {
        // PREVENT MULTIPLE SIGN-INS: Check if already signed in
        if (record.signInTime && record.signInStatus === 'Present') {
          return {
            success: false,
            error: `${student.firstName} ${student.surname} already signed in at ${new Date(record.signInTime).toLocaleTimeString()}. Cannot sign in twice.`
          };
        }
        
        // Update sign-in time
        await databases.updateDocument(
          config.databaseId,
          config.attendanceCollectionId,
          record.$id,
          {
            signInTime: timestamp,
            signInFingerUsed: fingerUsed,
            signInStatus: 'Present',
            // Update sessionId to current session
            sessionId: sessionId
          }
        );
        
        return {
          success: true,
          message: `${student.firstName} ${student.surname} signed in successfully`
        };
        
      } else if (type === 'signout') {
        // PREVENT SIGN-OUT WITHOUT SIGN-IN: Check if student has signed in
        if (!record.signInTime || record.signInStatus !== 'Present') {
          return {
            success: false,
            error: `${student.firstName} ${student.surname} has not signed in yet. Please sign in first before signing out.`
          };
        }
        
        // PREVENT MULTIPLE SIGN-OUTS: Check if already signed out
        if (record.signOutTime && record.signOutStatus === 'Completed') {
          return {
            success: false,
            error: `${student.firstName} ${student.surname} already signed out at ${new Date(record.signOutTime).toLocaleTimeString()}. Cannot sign out twice.`
          };
        }
        
        // Calculate duration
        const signInTime = new Date(record.signInTime);
        const signOutTime = new Date(timestamp);
        const durationMinutes = Math.floor((signOutTime - signInTime) / (1000 * 60));
        
        // Update sign-out time
        await databases.updateDocument(
          config.databaseId,
          config.attendanceCollectionId,
          record.$id,
          {
            signOutTime: timestamp,
            signOutFingerUsed: fingerUsed,
            signOutStatus: 'Completed',
            totalDuration: durationMinutes
          }
        );
        
        return {
          success: true,
          message: `${student.firstName} ${student.surname} signed out successfully (${formatDuration(durationMinutes)})`
        };
      }
      
    } else {
      // No record exists - only allow creating for sign-in
      if (type === 'signin') {
        // Create new record for sign-in
        await databases.createDocument(
          config.databaseId,
          config.attendanceCollectionId,
          ID.unique(),
          {
            sessionId: sessionId,
            studentId: student.$id,
            matricNumber: student.matricNumber,
            courseId: sanitizedCourseId,
            courseCode: activeSession.courseCode,
            courseTitle: activeSession.courseTitle,
            attendanceDate: date,
            signInTime: timestamp,
            signInFingerUsed: fingerUsed,
            signInStatus: 'Present',
            signOutTime: null,
            signOutFingerUsed: '',
            signOutStatus: null,
            totalDuration: 0,
            isActive: true,
            semester: activeSession.semester,
            academicYear: activeSession.academicYear
          }
        );
        
        return {
          success: true,
          message: `${student.firstName} ${student.surname} signed in successfully`
        };
        
      } else if (type === 'signout') {
        // Prevent sign-out without sign-in
        return {
          success: false,
          error: `${student.firstName} ${student.surname} has not signed in yet. Please sign in first.`
        };
      }
    }

    return { success: false, error: 'Unknown error occurred' };

  } catch (error) {
    console.error('Error marking attendance:', error);
    return { success: false, error: error.message };
  }
};

// Helper function for duration formatting
const formatDuration = (minutes) => {
  if (!minutes) return '0 min';
  
  if (minutes < 60) {
    return `${minutes} min${minutes !== 1 ? 's' : ''}`;
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  return `${hours}h ${mins}m`;
};


const handleCloseSession = async () => {
    if (!activeSession) return;

    if (!confirm('Are you sure you want to close this session?')) {
      return;
    }

    try {
      const result = await closeAttendanceSession(activeSession.$id);
      
      if (result.success) {
        const reportResult = await getSessionAttendanceReport(activeSession.$id);
        if (reportResult.success) {
          setSessionReport(reportResult);
        }
        
        setActiveSession(null);
        setRegisteredStudents([]);
        setVerificationResult(null);
        setStatus({
          message: 'Session closed successfully',
          type: 'success'
        });
      }
    } catch (error) {
      setStatus({
        message: error.message || 'Failed to close session',
        type: 'error'
      });
    }
  };

  const handleNewSession = () => {
    setActiveSession(null);
    setSelectedCourse(null);
    setSessionType('signin');
    setAttendanceLog([]);
    setVerificationResult(null);
    setSessionReport(null);
    setRegisteredStudents([]);
    setStatus({ message: 'Ready to start new session', type: 'info' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-16 w-16 text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
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
          <p className="text-gray-600 mt-2">
            Invigilator attendance marking system using NBIS fingerprint verification
            {activeSession && registeredStudents.length > 0 && (
              <span className="ml-2 text-sm text-indigo-600 font-semibold">
                • {registeredStudents.length} registered students
              </span>
            )}
          </p>
        </div>

        {/* Status Display */}
        {status.message && (
          <div className={`mb-6 flex items-center gap-3 p-4 rounded-lg border ${getStatusColor()}`}>
            {getStatusIcon()}
            <span className="font-medium flex-1">{status.message}</span>
            {isVerifying && (
              <Loader2 className="w-5 h-5 animate-spin" />
            )}
          </div>
        )}

        {/* Progress Bar */}
        {progress.total > 0 && isVerifying && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Processing...</span>
              <span>{progress.current} / {progress.total}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Session Report View */}
        {sessionReport ? (
          <SessionReportView 
            sessionReport={sessionReport}
            onNewSession={handleNewSession}
          />
        ) : courses.length === 0 ? (
          <NoCoursesView />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Panel - Session Setup */}
            <SessionSetupPanel
              activeSession={activeSession}
              courses={courses}
              selectedCourse={selectedCourse}
              setSelectedCourse={setSelectedCourse}
              sessionType={sessionType}
              setSessionType={setSessionType}
              handleStartSession={handleStartSession}
              handleScanFingerprint={handleScanFingerprint}
              isVerifying={isVerifying}
              verificationResult={verificationResult}
              handleCloseSession={handleCloseSession}
              fingerprintScanner={fingerprintScanner}
            />

            {/* Right Panel - Results & Log */}
            <AttendanceLogPanel
              attendanceLog={attendanceLog}
              verificationResult={verificationResult}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Component: Session Report View
function SessionReportView({ sessionReport, onNewSession }) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Session Report</h2>
        <button
          onClick={onNewSession}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
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
  );
}

// Component: No Courses View
function NoCoursesView() {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
      <AlertCircle className="w-32 h-32 mx-auto mb-6 text-yellow-500" />
      <h3 className="text-2xl font-bold text-gray-800 mb-4">No Courses Available</h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        No courses with approved student registrations found.
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
  );
}

// Component: Session Setup Panel
function SessionSetupPanel({
  activeSession,
  courses,
  selectedCourse,
  setSelectedCourse,
  sessionType,
  setSessionType,
  handleStartSession,
  handleScanFingerprint,
  isVerifying,
  verificationResult,
  handleCloseSession,
  fingerprintScanner
}) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6">Session Setup</h2>
{!activeSession && sessionType === 'signout' && (
  <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
    <div className="flex items-center gap-2 mb-2">
      <AlertCircle className="w-5 h-5 text-orange-600" />
      <span className="font-semibold text-orange-800">Sign-out Session Notice</span>
    </div>
    <p className="text-sm text-orange-700">
      Students must have signed in earlier today to sign out.
      <br />
      Only students who have already signed in will be allowed to sign out.
    </p>
  </div>
)}
      {!activeSession ? (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Select Course *</label>
            
            {courses.length === 0 ? (
              <div className="text-center py-8 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                <AlertCircle className="w-16 h-16 mx-auto mb-3 text-yellow-600" />
                <p className="text-yellow-800 font-medium mb-2">No Courses Available</p>
                <p className="text-sm text-yellow-700">
                  No courses with approved student registrations found.
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
                        </div>
                      </div>
                      {selectedCourse?.courseCode === course.courseCode && (
                        <CheckCircle className="w-6 h-6 text-indigo-600 flex-shrink-0 ml-2" />
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
          {/* Active Session Info */}
          <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-6">
            <h3 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
              <Fingerprint className="w-5 h-5" />
              Active Session
            </h3>
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

          {/* NBIS Instructions */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-gray-600" />
              Fingerprint Scanning Tips:
            </h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li>Ensure finger is <strong>clean and dry</strong></li>
              <li>Place finger <strong>firmly and centered</strong></li>
              <li><strong>Do not move</strong> until scan completes</li>
              <li>Quality should be <strong>above 50%</strong></li>
            </ul>
            <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-800">
              💡 Using NIST NBIS (BOZORTH3) for accurate matching
            </div>
          </div>

          {/* Scan Button */}
          <button
            onClick={handleScanFingerprint}
            disabled={isVerifying || !fingerprintScanner}
            className={`w-full py-6 rounded-xl font-bold text-lg text-white transition-all shadow-lg flex items-center justify-center ${
              isVerifying || !fingerprintScanner
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
            }`}
          >
            {isVerifying ? (
              <>
                <Loader2 className="animate-spin h-6 w-6 mr-3" />
                Verifying...
              </>
            ) : (
              <>
                <Fingerprint className="w-6 h-6 mr-3" />
                Scan Student Fingerprint
              </>
            )}
          </button>

          {/* Verification Result */}
          {verificationResult && (
            <div className={`p-4 rounded-xl border-2 ${
              verificationResult.matched 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start space-x-3">
                {verificationResult.matched ? (
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`font-semibold ${verificationResult.matched ? 'text-green-800' : 'text-red-800'}`}>
                    {verificationResult.matched ? 'Success!' : 'Failed'}
                  </p>
                  <p className={`text-sm mt-1 ${verificationResult.matched ? 'text-green-700' : 'text-red-700'}`}>
                    {verificationResult.message}
                  </p>
                  {verificationResult.matched && (
                    <>
                      <p className="text-xs text-green-600 mt-1">
                        Confidence: {verificationResult.confidence}% • Score: {verificationResult.score}
                      </p>
                      <p className="text-xs text-green-600">
                        Finger: {verificationResult.fingerName}
                      </p>
                    </>
                  )}
                  {!verificationResult.matched && verificationResult.totalCompared && (
                    <p className="text-xs text-red-600 mt-1">
                      Compared against {verificationResult.totalCompared} fingerprints
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Close Session Button */}
          <button
            onClick={handleCloseSession}
            className="w-full py-3 rounded-lg font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Close Session & View Report
          </button>
        </div>
      )}
    </div>
  );
}

// Component: Attendance Log Panel
function AttendanceLogPanel({ attendanceLog, verificationResult }) {
  return (
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
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {attendanceLog.map((log, idx) => (
            <div key={idx} className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {log.student.profilePictureUrl ? (
                    <div className="flex items-start gap-3">
                      <img
                        src={log.student.profilePictureUrl}
                        alt="Student"
                        className="w-12 h-12 rounded-lg object-cover border-2 border-white shadow"
                      />
                      <div>
                        <p className="font-bold text-gray-900">
                          {log.student.firstName} {log.student.surname}
                        </p>
                        <p className="text-sm text-gray-600">{log.student.matricNumber}</p>
                        <div className="flex gap-2 mt-1">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            log.action === 'signin' 
                              ? 'bg-green-200 text-green-800' 
                              : 'bg-orange-200 text-orange-800'
                          }`}>
                            {log.action === 'signin' ? '✅ Signed In' : '🚪 Signed Out'}
                          </span>
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                            {log.fingerUsed}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Confidence: {log.confidence}% • Score: {log.score}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="font-bold text-gray-900">
                        {log.student.firstName} {log.student.surname}
                      </p>
                      <p className="text-sm text-gray-600">{log.student.matricNumber}</p>
                      <div className="flex gap-2 mt-1">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          log.action === 'signin' 
                            ? 'bg-green-200 text-green-800' 
                            : 'bg-orange-200 text-orange-800'
                        }`}>
                          {log.action === 'signin' ? '✅ Signed In' : '🚪 Signed Out'}
                        </span>
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                          {log.fingerUsed}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Confidence: {log.confidence}% • Score: {log.score}
                      </p>
                    </>
                  )}
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap ml-2">{log.timestamp}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}