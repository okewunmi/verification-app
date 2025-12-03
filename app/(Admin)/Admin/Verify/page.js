
"use client"
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { searchStudentByFace, verifyStudentFingerprint  } from '@/lib/appwrite';
import fingerprintScanner from '@/lib/fingerprint-digitalpersona';
export default function ExamVerificationInterface() {
  const router = useRouter();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [verificationType, setVerificationType] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 1280, height: 720 } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      setStream(mediaStream);
      setCameraActive(true);
      setErrorMessage('');
    } catch (err) {
      console.error('Camera access error:', err);
      setErrorMessage('Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  const captureFaceImage = () => {
    if (!videoRef.current || !canvasRef.current) return null;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    return canvas.toDataURL('image/jpeg', 0.95);
  };

 const handleFaceVerification = async () => {
  if (!cameraActive) {
    await startCamera();
    return;
  }

  setIsScanning(true);
  setVerificationResult(null);
  setScanProgress(0);
  setErrorMessage('');

  try {
    setScanProgress(20);
    const capturedImageBase64 = captureFaceImage();
    
    if (!capturedImageBase64) {
      throw new Error('Failed to capture image');
    }

    setScanProgress(40);
    console.log('📸 Image captured, sending to API...');

    // Make the request
    const response = await fetch('/api/verify-face-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ capturedImageBase64: capturedImageBase64 })
    });

    // ✅ CHECK RESPONSE FIRST before parsing JSON
    console.log('📥 Response status:', response.status);
    console.log('📥 Response ok?', response.ok);

    // Get the raw text first
    const responseText = await response.text();
    console.log('📥 Raw response:', responseText);

    // Check if we got an empty response
    if (!responseText || responseText.trim() === '') {
      throw new Error('API returned empty response. Check server logs.');
    }

    // Try to parse JSON
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse JSON:', parseError);
      console.error('❌ Response was:', responseText);
      throw new Error(`Invalid response from server: ${responseText.substring(0, 100)}`);
    }

    setScanProgress(100);
    console.log('🔍 Search result:', result);

    if (result.success && result.matched) {
      setVerificationResult({
        success: true,
        student: result.student,
        confidence: result.confidence,
        matchTime: result.matchTime,
        verificationType: 'Face Recognition',
        allMatches: result.allMatches
      });
      stopCamera();
    } else {
      setVerificationResult({
        success: false,
        message: result.message || 'No matching student found',
        confidence: result.confidence || 0,
        error: result.error
      });
    }
  } catch (err) {
    console.error('❌ Face verification error:', err);
    setErrorMessage(err.message);
    setVerificationResult({
      success: false,
      message: err.message || 'Verification failed',
      confidence: 0
    });
  } finally {
    setIsScanning(false);
    setScanProgress(0);
  }
};

 const handleFingerprintVerification = async () => {
  setIsScanning(true);
  setVerificationResult(null);
  setScanProgress(0);
  setErrorMessage('');

  try {
    console.log('🔧 Checking fingerprint availability...');
    setScanProgress(10);

    // Check if fingerprint is available
    const checkResult = await fingerprintScanner.isAvailable();
    
    if (!checkResult.available) {
      throw new Error(checkResult.error || 'Fingerprint reader not available');
    }

    setScanProgress(20);
    alert('Please use your fingerprint to verify...');

    // Verify fingerprint (WebAuthn handles everything)
    const result = await verifyStudentFingerprint();

    setScanProgress(100);

    if (result.success && result.matched) {
      setVerificationResult({
        success: true,
        student: result.student,
        confidence: result.confidence,
        matchTime: result.matchTime,
        verificationType: 'Fingerprint (Windows Hello)',
        fingerUsed: result.fingerUsed
      });
    } else {
      setVerificationResult({
        success: false,
        message: result.message || 'No matching student found',
        confidence: 0
      });
    }

  } catch (err) {
    console.error('Fingerprint verification error:', err);
    setErrorMessage(err.message);
    setVerificationResult({
      success: false,
      message: err.message || 'Verification failed',
      confidence: 0
    });
  } finally {
    setIsScanning(false);
    setScanProgress(0);
    await fingerprintScanner.stop();
  }
};

  const handleStartVerification = async () => {
    if (!verificationType) {
      alert('Please select a verification method');
      return;
    }

    if (verificationType === 'Face') {
      await handleFaceVerification();
    } else if (verificationType === 'Fingerprint') {
      await handleFingerprintVerification();
    }
  };

  const handleAllowEntry = async () => {
    if (!verificationResult?.student) return;

    const verificationData = {
      studentId: verificationResult.student.$id,
      matricNumber: verificationResult.student.matricNumber,
      verificationMethod: verificationResult.verificationType,
      verificationStatus: 'Success',
      confidenceScore: verificationResult.confidence,
      verificationTime: new Date().toISOString(),
      checkedIn: true
    };

    console.log('Verification logged:', verificationData);
    
    alert(`${verificationResult.student.firstName} ${verificationResult.student.surname} has been verified and checked in!`);
    resetVerification();
  };

  const resetVerification = () => {
    setVerificationResult(null);
    setVerificationType('');
    setIsScanning(false);
    setErrorMessage('');
    stopCamera();
  };

  useEffect(() => {
    return () => {
      stopCamera();
      // fingerprintScanner.stop();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Student Identity Verification</span>
          </h1>
          <p className="text-gray-600 mt-2">Verify student identity using biometric authentication</p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
            <div className="flex items-start space-x-3">
              <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-semibold text-red-800">Error</p>
                <p className="text-red-700 text-sm">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Verification Method</h2>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Select Verification Method *
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setVerificationType('Fingerprint');
                    stopCamera();
                  }}
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

            {verificationType === 'Face' && (
              <div className="mb-6">
                <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
                  <video 
                    ref={videoRef}
                    autoPlay 
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  {!cameraActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
                      <p className="text-white text-sm text-center px-4">
                        Camera will activate when you click "Start Verification"
                      </p>
                    </div>
                  )}
                  {isScanning && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
                      <div 
                        className="h-full bg-green-500 transition-all duration-300"
                        style={{ width: `${scanProgress}%` }}
                      />
                    </div>
                  )}
                </div>
                <canvas ref={canvasRef} className="hidden" />
                <p className="text-xs text-gray-500 mt-2 text-center">
                  💡 Tip: Ensure good lighting and face the camera directly
                </p>
              </div>
            )}

            <button
              onClick={handleStartVerification}
              disabled={isScanning || !verificationType}
              className={`w-full py-4 rounded-xl font-semibold text-white transition-all ${
                isScanning || !verificationType
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg'
              }`}
            >
              {isScanning ? `Scanning... ${scanProgress}%` : cameraActive ? 'Capture & Verify' : 'Start Verification'}
            </button>

            {isScanning && (
              <div className="mt-6 p-6 bg-blue-50 rounded-xl border-2 border-blue-200">
                <div className="flex items-center justify-center space-x-3 mb-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="text-blue-600 font-semibold">
                    {verificationType === 'Fingerprint' ? 'Verifying fingerprint...' : 'Searching for matching face...'}
                  </span>
                </div>
                <p className="text-center text-sm text-gray-600">
                  Comparing against registered student database
                </p>
              </div>
            )}
          </div>

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
                <h3 className="text-2xl font-bold text-red-600 mb-2">No Match Found</h3>
                <p className="text-gray-600 text-center mb-6 px-4">
                  {verificationResult.message}
                </p>
                {verificationResult.confidence > 0 && (
                  <p className="text-sm text-gray-500 mb-4">
                    Confidence: {verificationResult.confidence}%
                  </p>
                )}
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
                      {verificationResult.fingerUsed && (
                        <p className="text-green-600 text-xs">Matched: {verificationResult.fingerUsed} finger</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-xl">
                    {verificationResult.student.profilePictureUrl ? (
                      <img
                        src={verificationResult.student.profilePictureUrl}
                        alt="Student"
                        className="w-24 h-24 rounded-lg object-cover border-4 border-white shadow-lg"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-lg bg-gray-200 border-4 border-white shadow-lg flex items-center justify-center">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800">
                        {verificationResult.student.firstName} {verificationResult.student.middleName} {verificationResult.student.surname}
                      </h3>
                      <p className="text-indigo-600 font-semibold">{verificationResult.student.matricNumber}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                          {verificationResult.student.level} Level
                        </span>
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                          {verificationResult.verificationType}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Department</p>
                      <p className="font-semibold text-gray-800">{verificationResult.student.department}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Course</p>
                      <p className="font-semibold text-gray-800">{verificationResult.student.course}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Email</p>
                      <p className="font-semibold text-gray-800">{verificationResult.student.email}</p>
                    </div>
                  </div>
                </div>

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

