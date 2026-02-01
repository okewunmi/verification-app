"use client"
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Fingerprint, AlertCircle, Loader2 } from 'lucide-react';

export default function ExamVerificationInterface() {
  const router = useRouter();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [verificationType, setVerificationType] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [status, setStatus] = useState({ message: '', type: '' });
  const [errorMessage, setErrorMessage] = useState('');
  const [fingerprintScanner, setFingerprintScanner] = useState(null);
  const [faceRecognition, setFaceRecognition] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  useEffect(() => {
    const loadScanner = async () => {
      try {
        const scanner = (await import('@/lib/fingerprint-digitalpersona')).default;
        setFingerprintScanner(scanner);
        const availability = await scanner.isAvailable();
        if (availability.available) {
          setStatus({ message: 'Fingerprint scanner ready', type: 'success' });
        }
      } catch (error) {
        console.error('Scanner load error:', error);
      }
    };
    
    const loadFaceRecognition = async () => {
      try {
        // const faceRec = (await import('@/lib/face-recognition-browser')).default;
        const faceRec = await import('@/lib/face-recognition-browser').then(m => m.default);

        setFaceRecognition(faceRec);
        const result = await faceRec.loadModels();
        if (result.success) {
          setModelsLoaded(true);
          console.log('✅ Face recognition models loaded');
        }
      } catch (error) {
        console.error('Face recognition load error:', error);
      }
    };
    
    loadScanner();
    loadFaceRecognition();

    return () => stopCamera();
  }, []);

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

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 1280, height: 720 } 
      });
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
      setStream(mediaStream);
      setCameraActive(true);
      setErrorMessage('');
      setStatus({ message: 'Camera activated', type: 'success' });
    } catch (err) {
      console.error('Camera access error:', err);
      setErrorMessage('Unable to access camera. Please check permissions.');
      setStatus({ message: 'Camera access denied', type: 'error' });
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

  setIsVerifying(true);
  setVerificationResult(null);
  setProgress({ current: 0, total: 100 });
  setErrorMessage('');
  setStatus({ message: 'Capturing face...', type: 'info' });

  try {
    if (!faceRecognition || !modelsLoaded) {
      setStatus({ message: 'Loading face recognition models...', type: 'info' });
      const faceRec = (await import('@/lib/face-recognition-browser')).default;
      setFaceRecognition(faceRec);
      const loadResult = await faceRec.loadModels();
      if (!loadResult.success) throw new Error('Failed to load face recognition models');
      setModelsLoaded(true);
    }

    const capturedImageBase64 = captureFaceImage();
    if (!capturedImageBase64) throw new Error('Failed to capture image');

    setProgress({ current: 20, total: 100 });
    setStatus({ message: 'Analyzing face features...', type: 'info' });
    
    const extractResult = await faceRecognition.extractDescriptor(capturedImageBase64);
    if (!extractResult.success) throw new Error(extractResult.message || 'Failed to detect face');

    console.log(`✅ Face detected (confidence: ${extractResult.confidence}%)`);
    setProgress({ current: 40, total: 100 });

    setStatus({ message: 'Loading database...', type: 'info' });
    const { getStudentsWithFaceDescriptors } = await import('@/lib/appwrite');
    const studentsResult = await getStudentsWithFaceDescriptors();

    if (!studentsResult.success || studentsResult.data.length === 0) {
      setVerificationResult({ matched: false, message: 'No registered faces in database' });
      setStatus({ message: 'No registered faces', type: 'warning' });
      setIsVerifying(false);
      setProgress({ current: 0, total: 0 });
      return;
    }

    const totalStudents = studentsResult.data.length;
    setProgress({ current: 60, total: 100 });
    setStatus({ message: `Comparing against ${totalStudents} faces...`, type: 'info' });

    const storedDescriptors = studentsResult.data.map(student => ({
      ...student,
      descriptor: JSON.parse(student.faceDescriptor), // Parse to array
      matricNumber: student.matricNumber,
      firstName: student.firstName,
      surname: student.surname,
      studentId: student.$id
    }));

    setStatus({ message: 'Finding match...', type: 'info' });
    
    // CRITICAL FIX: Use the corrected verifyFace method
    // You can use either verifyFace or verifyFaceWithMatcher
    // verifyFaceWithMatcher is more accurate but slightly slower
    const verifyResult = await faceRecognition.verifyFaceWithMatcher(
      extractResult.descriptor, 
      storedDescriptors
    );

    setProgress({ current: 100, total: 100 });

    if (verifyResult.success && verifyResult.matched) {
      setVerificationResult({
        matched: true,
        student: verifyResult.student,
        confidence: verifyResult.confidence,
        distance: verifyResult.distance,
        matchTime: new Date().toLocaleTimeString(),
        verificationType: 'Face Recognition',
        method: 'FaceAPI_Browser',
        threshold: faceRecognition.getThreshold()
      });
      setStatus({ message: 'Match found!', type: 'success' });
      stopCamera();
      try {
        new Audio('/sounds/success.mp3').play().catch(() => {});
      } catch (e) {}
    } else {
      setVerificationResult({
        matched: false,
        message: verifyResult.message || 'No matching student found',
        bestDistance: verifyResult.bestDistance
      });
      setStatus({ message: 'No match found', type: 'error' });
      try {
        new Audio('/sounds/error.mp3').play().catch(() => {});
      } catch (e) {}
    }
  } catch (err) {
    console.error('❌ Face verification error:', err);
    setErrorMessage(err.message);
    setStatus({ message: err.message || 'Verification failed', type: 'error' });
    setVerificationResult({ matched: false, message: err.message || 'Verification failed' });
  } finally {
    setIsVerifying(false);
    setProgress({ current: 0, total: 0 });
  }
};


  // Fingerprint verification (UNCHANGED)
  const handleFingerprintVerification = async () => {
    if (!fingerprintScanner) {
      setStatus({ message: 'Scanner not initialized', type: 'error' });
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);
    setProgress({ current: 0, total: 0 });
    setErrorMessage('');
    setStatus({ message: 'Place your finger on the scanner...', type: 'info' });

    try {
      const captureResult = await fingerprintScanner.capturePNG('Verification');
      if (!captureResult.success) throw new Error(captureResult.error);

      if (captureResult.quality < 50) {
        setStatus({ message: `Quality too low (${captureResult.quality}%). Please try again.`, type: 'warning' });
        setIsVerifying(false);
        return;
      }

      setStatus({ message: 'Loading database...', type: 'info' });
      const { getStudentsWithFingerprintsPNG } = await import('@/lib/appwrite');
      const fingerprintsResult = await getStudentsWithFingerprintsPNG();

      if (!fingerprintsResult.success) throw new Error('Failed to fetch fingerprints');
      if (fingerprintsResult.data.length === 0) {
        setVerificationResult({ matched: false, message: 'No registered fingerprints' });
        setStatus({ message: 'No registered fingerprints', type: 'warning' });
        setIsVerifying(false);
        return;
      }

      const totalFingerprints = fingerprintsResult.data.length;
      setProgress({ current: 0, total: totalFingerprints });
      setStatus({ message: `Comparing against ${totalFingerprints} fingerprints...`, type: 'info' });

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

      if (!response.ok) throw new Error(`Verification failed: ${response.status}`);
      const result = await response.json();

      if (result.success && result.matched && result.bestMatch) {
        setVerificationResult({
          matched: true,
          student: result.bestMatch.student,
          confidence: result.bestMatch.confidence,
          score: result.bestMatch.score,
          fingerName: result.bestMatch.fingerName,
          verificationType: 'Fingerprint (NBIS)',
          method: 'NIST_NBIS'
        });
        setStatus({ message: 'Match found!', type: 'success' });
        try {
          new Audio('/sounds/success.mp3').play().catch(() => {});
        } catch (e) {}
      } else {
        setVerificationResult({
          matched: false,
          message: `No match found. Best score: ${result.bestMatch?.score || 0}`,
          totalCompared: result.totalCompared
        });
        setStatus({ message: 'No match found', type: 'error' });
        try {
          new Audio('/sounds/error.mp3').play().catch(() => {});
        } catch (e) {}
      }
    } catch (error) {
      console.error('❌ Verification error:', error);
      setStatus({ message: error.message || 'Verification failed', type: 'error' });
      setErrorMessage(error.message);
      setVerificationResult({ matched: false, message: 'Error: ' + error.message });
    } finally {
      setIsVerifying(false);
      setProgress({ current: 0, total: 0 });
      await fingerprintScanner.stop();
    }
  };

  const handleStartVerification = async () => {
    if (!verificationType) {
      alert('Please select a verification method');
      return;
    }
    if (verificationType === 'Face') await handleFaceVerification();
    else if (verificationType === 'Fingerprint') await handleFingerprintVerification();
  };

  const handleAllowEntry = async () => {
    if (!verificationResult?.student) return;
    alert(`${verificationResult.student.firstName} ${verificationResult.student.surname} has been verified and checked in!`);
    resetVerification();
  };

  const resetVerification = () => {
    setVerificationResult(null);
    setVerificationType('');
    setIsVerifying(false);
    setErrorMessage('');
    setStatus({ message: '', type: '' });
    setProgress({ current: 0, total: 0 });
    stopCamera();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4" onClick={() => router.push("/Admin")}>
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

        {status.message && (
          <div className={`mb-6 flex items-center gap-3 p-4 rounded-lg border ${getStatusColor()}`}>
            {getStatusIcon()}
            <span className="font-medium flex-1">{status.message}</span>
            {isVerifying && <Loader2 className="w-5 h-5 animate-spin" />}
          </div>
        )}

        {progress.total > 0 && isVerifying && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Processing...</span>
              <span>{progress.current}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress.current}%` }} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Verification Method</h2>
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Select Verification Method *</label>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => { setVerificationType('Fingerprint'); stopCamera(); }}
                  className={`p-6 border-2 rounded-xl transition-all ${verificationType === 'Fingerprint' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'}`}>
                  <Fingerprint className={`w-12 h-12 mx-auto mb-3 ${verificationType === 'Fingerprint' ? 'text-indigo-600' : 'text-gray-400'}`} />
                  <span className={`font-semibold ${verificationType === 'Fingerprint' ? 'text-indigo-600' : 'text-gray-700'}`}>Fingerprint</span>
                </button>
                <button onClick={() => setVerificationType('Face')}
                  className={`p-6 border-2 rounded-xl transition-all ${verificationType === 'Face' ? 'border-purple-600 bg-purple-50' : 'border-gray-300 hover:border-purple-400'}`}>
                  <svg className={`w-12 h-12 mx-auto mb-3 ${verificationType === 'Face' ? 'text-purple-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className={`font-semibold ${verificationType === 'Face' ? 'text-purple-600' : 'text-gray-700'}`}>Face Recognition</span>
                </button>
              </div>
            </div>

            {verificationType === 'Face' && (
              <div className="mb-6">
                <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  {!cameraActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
                      <p className="text-white text-sm text-center px-4">Camera will activate when you click "Start Verification"</p>
                    </div>
                  )}
                  {isVerifying && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
                      <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${progress.current}%` }} />
                    </div>
                  )}
                </div>
                <canvas ref={canvasRef} className="hidden" />
                <p className="text-xs text-gray-500 mt-2 text-center">💡 Tip: Ensure good lighting and face the camera directly</p>
                <div className="mt-3 p-2 bg-purple-50 rounded text-xs text-purple-800">
                  🔒 <strong>Privacy:</strong> Face-api.js runs entirely in your browser - no images sent to external servers
                </div>
              </div>
            )}

            {verificationType === 'Fingerprint' && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-gray-600" />
                  Instructions for Best Results:
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                  <li>Ensure your finger is <strong>clean and dry</strong></li>
                  <li>Place your finger <strong>firmly and centered</strong> on the scanner</li>
                  <li><strong>Do not move</strong> your finger until capture is complete</li>
                  <li>Use the <strong>same finger</strong> you registered with</li>
                </ol>
              </div>
            )}

            <button onClick={handleStartVerification} disabled={isVerifying || !verificationType}
              className={`w-full py-4 rounded-xl font-semibold text-white transition-all ${
                isVerifying || !verificationType ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg'
              }`}>
              {isVerifying ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin h-5 w-5" />
                  {verificationType === 'Fingerprint' ? 'Verifying fingerprint...' : `Verifying face... ${progress.current}%`}
                </span>
              ) : cameraActive ? 'Capture & Verify' : 'Start Verification'}
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Verification Result</h2>

            {!verificationResult && !isVerifying && (
              <div className="flex flex-col items-center justify-center h-96 text-gray-400">
                <svg className="w-32 h-32 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <p className="text-lg font-medium">No verification in progress</p>
                <p className="text-sm mt-2">Select method and start verification</p>
              </div>
            )}

            {verificationResult && !verificationResult.matched && (
              <div className="flex flex-col items-center justify-center h-96">
                <div className="w-32 h-32 bg-red-100 rounded-full flex items-center justify-center mb-6">
                  <XCircle className="w-16 h-16 text-red-600" />
                </div>
                <h3 className="text-2xl font-bold text-red-600 mb-2">No Match Found</h3>
                <p className="text-gray-600 text-center mb-6 px-4">{verificationResult.message}</p>
                <button onClick={resetVerification} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Try Again</button>
              </div>
            )}

            {verificationResult && verificationResult.matched && (
              <div className="space-y-6">
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                  <div className="flex items-center justify-center space-x-3">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-green-600 font-semibold text-lg">Verification Successful!</p>
                      <p className="text-green-600 text-sm">Confidence: {verificationResult.confidence}%</p>
                      {verificationResult.fingerName && <p className="text-green-600 text-xs">Matched: {verificationResult.fingerName} finger</p>}
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-xl">
                  {verificationResult.student.profilePictureUrl ? (
                    <img src={verificationResult.student.profilePictureUrl} alt="Student" className="w-24 h-24 rounded-lg object-cover border-4 border-white shadow-lg" />
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
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">{verificationResult.student.level} Level</span>
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">{verificationResult.verificationType}</span>
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
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <button onClick={handleAllowEntry} className="py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center justify-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Allow Entry
                  </button>
                  <button onClick={resetVerification} className="py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold">Next Student</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}