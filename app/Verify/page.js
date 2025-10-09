"use client"
import { useState } from 'react';

export default function ExamVerificationInterface() {
  const [verificationType, setVerificationType] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [selectedExamSession, setSelectedExamSession] = useState('');

  // Mock exam sessions - replace with Supabase data
  const examSessions = [
    { id: '1', name: 'CS301 - Database Systems', date: '2024-10-15', time: '09:00 AM' },
    { id: '2', name: 'CS401 - Software Engineering', date: '2024-10-15', time: '02:00 PM' },
    { id: '3', name: 'CS201 - Data Structures', date: '2024-10-16', time: '10:00 AM' }
  ];

  // Mock student data - replace with actual match result
  const mockStudent = {
    id: 'STU2024001',
    name: 'John Doe',
    department: 'Computer Science',
    level: '300',
    email: 'john.doe@university.edu',
    phone: '+234 801 234 5678',
    registeredCourses: ['CS301', 'CS302', 'CS303'],
    biometricStatus: 'Verified',
    photo: 'https://via.placeholder.com/150',
    admissionYear: '2021',
    semester: '2024/2025 First Semester'
  };

  const handleStartVerification = async () => {
    if (!verificationType || !selectedExamSession) {
      alert('Please select verification method and exam session');
      return;
    }

    setIsScanning(true);
    setVerificationResult(null);

    // Simulate scanning process
    setTimeout(() => {
      // Simulate API call to fingerprint/face recognition SDK
      // const result = await verifyBiometric(verificationType);
      
      // Randomly simulate match/no match for demo
      const isMatch = Math.random() > 0.3; // 70% success rate for demo
      
      if (isMatch) {
        // In production: fetch student data from Supabase where biometric matches
        setVerificationResult({
          success: true,
          student: mockStudent,
          confidence: 95.8,
          matchTime: new Date().toLocaleTimeString()
        });
      } else {
        setVerificationResult({
          success: false,
          message: 'No matching record found',
          confidence: 0
        });
      }
      
      setIsScanning(false);
    }, 3000);
  };

  const handleAllowEntry = async () => {
    if (!verificationResult?.student) return;

    // Save to student_verifications table in Supabase
    const verificationData = {
      student_id: verificationResult.student.id,
      exam_session_id: selectedExamSession,
      verification_method: verificationType,
      verification_status: 'Success',
      confidence_score: verificationResult.confidence,
      verification_time: new Date().toISOString(),
      checked_in: true
    };

    // await supabase.from('student_verifications').insert(verificationData);
    
    alert(`${verificationResult.student.name} has been checked in successfully!`);
    resetVerification();
  };

  const resetVerification = () => {
    setVerificationResult(null);
    setVerificationType('');
    setIsScanning(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 flex items-center space-x-3">
            <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Exam Verification System</span>
          </h1>
          <p className="text-gray-600 mt-2">Verify student identity for exam entry</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Verification Controls */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Verification Setup</h2>

            {/* Exam Session Selection */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Select Exam Session *
              </label>
              <select
                value={selectedExamSession}
                onChange={(e) => setSelectedExamSession(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Choose exam session...</option>
                {examSessions.map(session => (
                  <option key={session.id} value={session.id}>
                    {session.name} - {session.date} at {session.time}
                  </option>
                ))}
              </select>
            </div>

            {/* Verification Method Selection */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Select Verification Method *
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setVerificationType('Fingerprint')}
                  className={`p-6 border-2 rounded-xl transition-all ${
                    verificationType === 'Fingerprint'
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-300 hover:border-indigo-400'
                  }`}
                >
                  <svg className={`w-12 h-12 mx-auto mb-3 ${verificationType === 'Fingerprint' ? 'text-indigo-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                  </svg>
                  <span className={`font-semibold ${verificationType === 'Fingerprint' ? 'text-indigo-600' : 'text-gray-700'}`}>
                    Fingerprint
                  </span>
                </button>

                <button
                  onClick={() => setVerificationType('Face')}
                  className={`p-6 border-2 rounded-xl transition-all ${
                    verificationType === 'Face'
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-300 hover:border-purple-400'
                  }`}
                >
                  <svg className={`w-12 h-12 mx-auto mb-3 ${verificationType === 'Face' ? 'text-purple-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className={`font-semibold ${verificationType === 'Face' ? 'text-purple-600' : 'text-gray-700'}`}>
                    Face Recognition
                  </span>
                </button>
              </div>
            </div>

            {/* Start Verification Button */}
            <button
              onClick={handleStartVerification}
              disabled={isScanning || !verificationType || !selectedExamSession}
              className={`w-full py-4 rounded-xl font-semibold text-white transition-all ${
                isScanning || !verificationType || !selectedExamSession
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg'
              }`}
            >
              {isScanning ? 'Scanning...' : 'Start Verification'}
            </button>

            {/* Scanning Animation */}
            {isScanning && (
              <div className="mt-6 p-6 bg-blue-50 rounded-xl border-2 border-blue-200">
                <div className="flex items-center justify-center space-x-3 mb-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="text-blue-600 font-semibold">
                    {verificationType === 'Fingerprint' ? 'Scanning fingerprint...' : 'Scanning face...'}
                  </span>
                </div>
                <p className="text-center text-sm text-gray-600">
                  Please {verificationType === 'Fingerprint' ? 'place your finger on the scanner' : 'look at the camera'}
                </p>
              </div>
            )}
          </div>

          {/* Right Panel - Verification Result */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Verification Result</h2>

            {!verificationResult && !isScanning && (
              <div className="flex flex-col items-center justify-center h-96 text-gray-400">
                <svg className="w-32 h-32 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <p className="text-lg font-medium">No verification in progress</p>
                <p className="text-sm mt-2">Select method and start verification</p>
              </div>
            )}

            {verificationResult && !verificationResult.success && (
              <div className="flex flex-col items-center justify-center h-96">
                <div className="w-32 h-32 bg-red-100 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-16 h-16 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-red-600 mb-2">No Record Found</h3>
                <p className="text-gray-600 text-center mb-6">
                  {verificationResult.message}
                </p>
                <button
                  onClick={resetVerification}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}

            {verificationResult && verificationResult.success && (
              <div className="space-y-6">
                {/* Success Badge */}
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                  <div className="flex items-center justify-center space-x-3">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-green-600 font-semibold text-lg">Verification Successful!</p>
                      <p className="text-green-600 text-sm">Confidence: {verificationResult.confidence}%</p>
                    </div>
                  </div>
                </div>

                {/* Student Information */}
                <div className="space-y-4">
                  {/* Photo and Basic Info */}
                  <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-xl">
                    <img
                      src={verificationResult.student.photo}
                      alt="Student"
                      className="w-24 h-24 rounded-lg object-cover border-4 border-white shadow-lg"
                    />
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800">{verificationResult.student.name}</h3>
                      <p className="text-indigo-600 font-semibold">{verificationResult.student.id}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                          {verificationResult.student.level} Level
                        </span>
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                          {verificationResult.student.biometricStatus}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Information */}
                  <div className="grid grid-cols-1 gap-3">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Department</p>
                      <p className="font-semibold text-gray-800">{verificationResult.student.department}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Email</p>
                      <p className="font-semibold text-gray-800">{verificationResult.student.email}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Phone Number</p>
                      <p className="font-semibold text-gray-800">{verificationResult.student.phone}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Registered Courses</p>
                      <p className="font-semibold text-gray-800">{verificationResult.student.registeredCourses.join(', ')}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Admission Year</p>
                      <p className="font-semibold text-gray-800">{verificationResult.student.admissionYear}</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <button
                    onClick={handleAllowEntry}
                    className="py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                  >
                    Allow Entry
                  </button>
                  <button
                    onClick={resetVerification}
                    className="py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                  >
                    Next Student
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}