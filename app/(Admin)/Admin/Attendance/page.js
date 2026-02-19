"use client"
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Fingerprint, AlertCircle, Loader2, Camera, RefreshCw } from 'lucide-react';
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
  
  // Refs for camera
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  
  // Core state
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [sessionType, setSessionType] = useState('signin');
  const [activeSession, setActiveSession] = useState(null);
  const [registeredStudents, setRegisteredStudents] = useState([]);
  
  // Verification method selection
  const [verificationMethod, setVerificationMethod] = useState('');
  
  // Verification state
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [status, setStatus] = useState({ message: '', type: '' });
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  
  // UI state
  const [attendanceLog, setAttendanceLog] = useState([]);
  const [sessionReport, setSessionReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fingerprint state
  const [fingerprintScanner, setFingerprintScanner] = useState(null);
  const [fingerprintCache, setFingerprintCache] = useState(null);
  const [cacheTimestamp, setCacheTimestamp] = useState(null);
  const CACHE_DURATION = 5 * 60 * 1000;
  
  // Face recognition state
  const [faceRecognition, setFaceRecognition] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);
  
  // NEW: Camera switching state
  const [facingMode, setFacingMode] = useState('user'); // 'user' for front, 'environment' for back
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);

  // Initialize both systems
  useEffect(() => {
    let mounted = true;

    const loadScanner = async () => {
      try {
        const scanner = (await import('@/lib/fingerprint-digitalpersona')).default;
        if (mounted) {
          setFingerprintScanner(scanner);
          const availability = await scanner.isAvailable();
          if (availability.available) {
            console.log('✅ Fingerprint scanner ready');
          }
        }
      } catch (error) {
        console.error('Scanner load error:', error);
      }
    };

    const loadFaceRecognition = async () => {
      try {
        const faceRec = await import('@/lib/face-recognition-browser').then(m => m.default);
        if (!mounted) return;

        setFaceRecognition(faceRec);

        const loadWithRetry = async (attempts = 3) => {
          for (let i = 0; i < attempts; i++) {
            try {
              const result = await faceRec.loadModels();
              if (result.success) {
                if (mounted) {
                  setModelsLoaded(true);
                  console.log('✅ Face recognition models loaded');
                }
                return true;
              }
            } catch (error) {
              console.warn(`Model load attempt ${i + 1}/${attempts} failed:`, error);
              if (i < attempts - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
          }
          return false;
        };

        await loadWithRetry();

      } catch (error) {
        console.error('Face recognition load error:', error);
      }
    };

    loadScanner();
    loadFaceRecognition();
    loadCourses();
    preloadFingerprintDatabase();

    return () => {
      mounted = false;
      stopCamera();
    };
  }, []);

  // Load students when course is selected
  useEffect(() => {
    if (selectedCourse) {
      loadRegisteredStudents();
    }
  }, [selectedCourse]);

  // Real-time face detection
  useEffect(() => {
    let animationFrameId;

    const detectFaceInRealTime = async () => {
      if (!cameraActive || !videoRef.current || !faceRecognition || !modelsLoaded) {
        return;
      }

      const video = videoRef.current;
      const overlay = overlayCanvasRef.current;

      if (!overlay || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animationFrameId = requestAnimationFrame(detectFaceInRealTime);
        return;
      }

      try {
        overlay.width = video.videoWidth;
        overlay.height = video.videoHeight;

        const ctx = overlay.getContext('2d');
        ctx.clearRect(0, 0, overlay.width, overlay.height);

        // const faceapi = window.faceapi;
        // const detection = await faceapi.detectSingleFace(video);
        const faceapi = window.faceapi;
const detection = await faceapi.detectSingleFace(
  video,
  new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 })
);

        if (detection) {
          setFaceDetected(true);

          const box = detection.box;
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 3;
          ctx.strokeRect(box.x, box.y, box.width, box.height);

          const confidence = Math.round(detection.score * 100);
          ctx.fillStyle = '#10b981';
          ctx.fillRect(box.x, box.y - 30, 100, 25);
          ctx.fillStyle = 'white';
          ctx.font = '16px Arial';
          ctx.fillText(`${confidence}%`, box.x + 5, box.y - 10);
        } else {
          setFaceDetected(false);
        }
      } catch (error) {
        // Silent fail
      }

      animationFrameId = requestAnimationFrame(detectFaceInRealTime);
    };

    if (cameraActive && modelsLoaded) {
      detectFaceInRealTime();
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [cameraActive, modelsLoaded, faceRecognition]);

  // Helper functions
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

  const preloadFingerprintDatabase = async () => {
    try {
      console.log('🔄 Pre-loading fingerprint database...');
      const { getStudentsWithFingerprintsPNG } = await import('@/lib/appwrite');
      const result = await getStudentsWithFingerprintsPNG();

      if (result.success) {
        setFingerprintCache(result);
        setCacheTimestamp(Date.now());
        console.log(`✅ Pre-loaded ${result.data.length} fingerprints`);
      }
    } catch (error) {
      console.error('❌ Pre-load error:', error);
    }
  };

  const getFingerprintsWithCache = async () => {
    const now = Date.now();

    if (fingerprintCache && cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION)) {
      console.log('💾 Using cached fingerprint database');
      return fingerprintCache;
    }

    console.log('📥 Fetching fresh fingerprint database...');
    const { getStudentsWithFingerprintsPNG } = await import('@/lib/appwrite');
    const result = await getStudentsWithFingerprintsPNG();

    if (result.success) {
      setFingerprintCache(result);
      setCacheTimestamp(now);
    }

    return result;
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

  // Camera functions
  const waitForVideoReady = (videoElement) => {
    return new Promise((resolve) => {
      if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
        resolve();
      } else {
        videoElement.addEventListener('loadeddata', () => resolve(), { once: true });
      }
    });
  };

 const startCamera = async (mode = facingMode) => {
  try {
    // Try with exact constraint first
    let mediaStream;
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { exact: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
    } catch (exactErr) {
      // Fallback without exact
      console.log('Exact constraint failed, trying without exact...');
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
    }

    if (videoRef.current) {
      videoRef.current.srcObject = mediaStream;

      await new Promise((resolve) => {
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          resolve();
        };
      });

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setStream(mediaStream);
    setCameraActive(true);
    setFacingMode(mode);
    setStatus({ 
      message: `✅ Camera ready (${mode === 'user' ? 'Front' : 'Back'}) - position your face in frame`, 
      type: 'success' 
    });

    console.log(`✅ Camera fully initialized (${mode === 'user' ? 'Front' : 'Back'}) and ready`);
  } catch (err) {
    console.error('Camera access error:', err);
    setStatus({ message: 'Camera access denied', type: 'error' });
  }
};

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraActive(false);
    setFaceDetected(false);
  };

 const switchCamera = async () => {
  if (!cameraActive) return;
  
  setIsSwitchingCamera(true);
  setStatus({ message: 'Switching camera...', type: 'info' });
  
  try {
    // Step 1: Stop current stream completely
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
    setCameraActive(false);
    setFaceDetected(false);
    
    // Step 2: Wait for cleanup
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Step 3: Determine new mode
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    
    // Step 4: Try with exact constraint first
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { exact: newMode },  // ✅ Use exact constraint
          width: { ideal: 1280 }, 
          height: { ideal: 720 } 
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await new Promise((resolve) => {
          videoRef.current.onloadedmetadata = () => { 
            videoRef.current.play(); 
            resolve(); 
          };
        });
        await new Promise(r => setTimeout(r, 500));
      }

      setStream(mediaStream);
      setFacingMode(newMode);  // ✅ Update state AFTER successful switch
      setCameraActive(true);
      setStatus({ 
        message: `✅ Switched to ${newMode === 'user' ? 'Front' : 'Back'} camera`, 
        type: 'success' 
      });
      
    } catch (exactErr) {
      // Fallback: Try without exact constraint
      console.log('Exact constraint failed, trying without exact...');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: newMode,  // ✅ Without exact
          width: { ideal: 1280 }, 
          height: { ideal: 720 } 
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await new Promise((resolve) => {
          videoRef.current.onloadedmetadata = () => { 
            videoRef.current.play(); 
            resolve(); 
          };
        });
        await new Promise(r => setTimeout(r, 500));
      }

      setStream(mediaStream);
      setFacingMode(newMode);
      setCameraActive(true);
      setStatus({ 
        message: `⚠️ Switched camera (fallback mode)`, 
        type: 'warning' 
      });
    }
    
  } catch (error) {
    console.error('Camera switch error:', error);
    setStatus({ 
      message: 'Failed to switch camera. Device may only have one camera.', 
      type: 'error' 
    });
    
    // Try to restart original camera
    try {
      await startCamera(facingMode);
    } catch (restartError) {
      console.error('Failed to restart camera:', restartError);
    }
  } finally {
    setIsSwitchingCamera(false);
  }
};

  const captureFaceImage = async () => {
    if (!videoRef.current || !canvasRef.current) {
      console.error('❌ Video or canvas ref is null');
      return null;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    await waitForVideoReady(video);

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.error('❌ Video has no dimensions yet');
      return null;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL('image/jpeg', 0.95);
    return imageData;
  };

  // Session management
  const handleStartSession = async () => {
    if (!selectedCourse) {
      alert('Please select a course first');
      return;
    }

    if (sessionType === 'signout') {
      const today = new Date().toISOString().split('T')[0];
      
      try {
        const todayAttendance = await databases.listDocuments(
          config.databaseId,
          config.attendanceCollectionId,
          [
            Query.equal('courseCode', selectedCourse.courseCode),
            Query.equal('attendanceDate', today),
            Query.limit(20)
          ]
        );
        
        const pendingSignOuts = todayAttendance.documents.filter(record => {
          const hasSignedIn = record.signInTime && record.signInStatus === 'Present';
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

  // Fingerprint verification (unchanged)
  const handleFingerprintVerification = async () => {
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

      const fingerprintsResult = await getFingerprintsWithCache();

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

      if (result.success && result.matched && result.bestMatch) {
        const student = result.bestMatch.student;

        const isRegistered = registeredStudents.find(
          s => s.matricNumber === student.matricNumber
        );

        if (!isRegistered) {
          setVerificationResult({
            matched: false,
            message: `${student.firstName} ${student.surname} (${student.matricNumber}) is not registered for ${activeSession.courseCode}`
          });
          setStatus({ message: 'Student not registered for this course', type: 'error' });

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

        const markResult = await markAttendanceInSession(
          activeSession.$id,
          student,
          sessionType,
          result.bestMatch.fingerName,
          selectedCourse.courseId,
          'Fingerprint'
        );

        if (markResult.success) {
          setVerificationResult({
            matched: true,
            student: student,
            confidence: result.bestMatch.confidence,
            score: result.bestMatch.score,
            fingerName: result.bestMatch.fingerName,
            action: sessionType,
            verificationType: 'Fingerprint (NBIS)',
            message: `${student.firstName} ${student.surname} ${sessionType === 'signin' ? 'signed in' : 'signed out'} successfully`
          });
          setStatus({ message: 'Attendance marked successfully!', type: 'success' });

          setAttendanceLog(prev => [{
            timestamp: new Date().toLocaleTimeString(),
            student: student,
            action: sessionType,
            method: 'Fingerprint',
            fingerUsed: result.bestMatch.fingerName,
            confidence: result.bestMatch.confidence,
            score: result.bestMatch.score
          }, ...prev]);

          setActiveSession(prev => ({
            ...prev,
            totalStudentsMarked: prev.totalStudentsMarked + 1
          }));

          try {
            const audio = new Audio('/sounds/success.mp3');
            audio.play().catch(e => console.log('Audio failed:', e));
          } catch (e) {}

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

  // Face verification (unchanged from your original code)
  const handleFaceVerification = async () => {
    if (!activeSession) {
      alert('Please start a session first');
      return;
    }

    if (!cameraActive) {
      await startCamera();
      setStatus({ message: '✅ Camera started. Position your face and click "Capture & Verify"', type: 'success' });
      return;
    }

    if (!faceDetected) {
      setStatus({ message: '⚠️ No face detected. Please ensure your face is visible in the green box.', type: 'warning' });
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);
    setProgress({ current: 0, total: 100 });
    setStatus({ message: 'Capturing face...', type: 'info' });

    await new Promise(resolve => setTimeout(resolve, 200));

    const MAX_RETRIES = 2;
    let attempt = 1;

    while (attempt <= MAX_RETRIES) {
      try {
        if (!faceRecognition) {
          throw new Error('Face recognition library not initialized');
        }

        if (!modelsLoaded) {
          setStatus({ message: 'Loading face recognition models...', type: 'info' });
          await faceRecognition.loadModels();
          setModelsLoaded(true);
        }

        const capturedImageBase64 = await captureFaceImage();

        if (!capturedImageBase64) {
          throw new Error('Failed to capture image from video');
        }

        console.log('✅ Image captured successfully');

        setProgress({ current: 20, total: 100 });
        setStatus({ message: 'Analyzing face features...', type: 'info' });

        const extractResult = await faceRecognition.extractDescriptor(capturedImageBase64);

        if (!extractResult.success) {
          throw new Error(extractResult.message || 'Failed to detect or extract face');
        }

        console.log(`✅ Face detected (confidence: ${extractResult.confidence}%)`);
        setProgress({ current: 40, total: 100 });

        setStatus({ message: 'Loading student database...', type: 'info' });
        const { getStudentsWithFaceDescriptors } = await import('@/lib/appwrite');
        const studentsResult = await getStudentsWithFaceDescriptors();

        if (!studentsResult.success || studentsResult.data.length === 0) {
          setVerificationResult({
            matched: false,
            message: '⚠️ No registered faces in database. Please register students first.'
          });
          setStatus({ message: 'No registered faces found', type: 'warning' });
          break;
        }

        const totalStudents = studentsResult.data.length;
        setProgress({ current: 60, total: 100 });
        setStatus({ message: `Comparing against ${totalStudents} registered faces...`, type: 'info' });

        const storedDescriptors = studentsResult.data.map(student => ({
          ...student,
          descriptor: JSON.parse(student.faceDescriptor),
          matricNumber: student.matricNumber,
          firstName: student.firstName,
          surname: student.surname,
          studentId: student.$id
        }));

        setStatus({ message: 'Finding best match...', type: 'info' });

        const verifyResult = await faceRecognition.verifyFaceWithMatcher(
          extractResult.descriptor,
          storedDescriptors
        );

        setProgress({ current: 100, total: 100 });

        if (verifyResult.success && verifyResult.matched) {
          const student = verifyResult.student;

          const isRegistered = registeredStudents.find(
            s => s.matricNumber === student.matricNumber
          );

          if (!isRegistered) {
            setVerificationResult({
              matched: false,
              message: `${student.firstName} ${student.surname} (${student.matricNumber}) is not registered for ${activeSession.courseCode}`
            });
            setStatus({ message: 'Student not registered for this course', type: 'error' });

            try {
              const audio = new Audio('/sounds/error.mp3');
              audio.play().catch(e => {});
            } catch (e) {}

            setIsVerifying(false);
            stopCamera();
            return;
          }

          const markResult = await markAttendanceInSession(
            activeSession.$id,
            student,
            sessionType,
            'Face Recognition',
            selectedCourse.courseId,
            'Face'
          );

          if (markResult.success) {
            setVerificationResult({
              matched: true,
              student: student,
              confidence: verifyResult.confidence,
              distance: verifyResult.distance,
              action: sessionType,
              verificationType: 'Face Recognition',
              message: `${student.firstName} ${student.surname} ${sessionType === 'signin' ? 'signed in' : 'signed out'} successfully`
            });
            setStatus({ message: 'Attendance marked successfully!', type: 'success' });

            setAttendanceLog(prev => [{
              timestamp: new Date().toLocaleTimeString(),
              student: student,
              action: sessionType,
              method: 'Face Recognition',
              confidence: verifyResult.confidence,
              distance: verifyResult.distance
            }, ...prev]);

            setActiveSession(prev => ({
              ...prev,
              totalStudentsMarked: prev.totalStudentsMarked + 1
            }));

            stopCamera();

            try {
              new Audio('/sounds/success.mp3').play().catch(() => {});
            } catch {}

            setTimeout(() => {
              setVerificationResult(null);
              setStatus({ message: 'Ready for next student', type: 'info' });
            }, 3000);

            break;
          } else {
            setVerificationResult({
              matched: false,
              message: markResult.error || 'Failed to mark attendance'
            });
            setStatus({ message: markResult.error || 'Failed to mark attendance', type: 'error' });
            break;
          }
        } else {
          setVerificationResult({
            matched: false,
            message: verifyResult.message || 'No matching student found',
            bestDistance: verifyResult.bestDistance
          });
          setStatus({ message: 'No match found', type: 'error' });

          try {
            new Audio('/sounds/error.mp3').play().catch(() => {});
          } catch {}

          break;
        }
      } catch (err) {
        console.error(`❌ Face verification attempt ${attempt}/${MAX_RETRIES} failed:`, err);

        const errorMessage = err.message || 'Unknown error during face verification';

        if (attempt < MAX_RETRIES) {
          setStatus({
            message: `Verification error — retrying (${attempt}/${MAX_RETRIES})...`,
            type: 'warning'
          });

          await new Promise(resolve => setTimeout(resolve, 1200));
          attempt++;
          continue;
        }

        setStatus({
          message: 'Verification failed after retries. Please try again or refresh.',
          type: 'error'
        });
        setVerificationResult({
          matched: false,
          message: errorMessage
        });
        break;
      }
    }

    setIsVerifying(false);
    setProgress({ current: 0, total: 0 });
  };

  // Mark attendance (unchanged)
  const markAttendanceInSession = async (sessionId, student, type, biometricIdentifier, courseId, verificationMethod) => {
    try {
      const timestamp = new Date().toISOString();
      const date = timestamp.split('T')[0];

      const sanitizedCourseId = String(courseId || '').trim().substring(0, 150);
      
      if (!sanitizedCourseId) {
        return {
          success: false,
          error: 'Course ID is required'
        };
      }

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
        const record = existingRecords.documents[0];
        
        if (type === 'signin') {
          if (record.signInTime && record.signInStatus === 'Present') {
            return {
              success: false,
              error: `${student.firstName} ${student.surname} already signed in at ${new Date(record.signInTime).toLocaleTimeString()}. Cannot sign in twice.`
            };
          }
          
          await databases.updateDocument(
            config.databaseId,
            config.attendanceCollectionId,
            record.$id,
            {
              signInTime: timestamp,
              signInFingerUsed: verificationMethod === 'Fingerprint' ? biometricIdentifier : '',
              signInStatus: 'Present',
              verificationMethod: verificationMethod,
              sessionId: sessionId
            }
          );
          
          return {
            success: true,
            message: `${student.firstName} ${student.surname} signed in successfully`
          };
          
        } else if (type === 'signout') {
          if (!record.signInTime || record.signInStatus !== 'Present') {
            return {
              success: false,
              error: `${student.firstName} ${student.surname} has not signed in yet. Please sign in first before signing out.`
            };
          }
          
          if (record.signOutTime && record.signOutStatus === 'Completed') {
            return {
              success: false,
              error: `${student.firstName} ${student.surname} already signed out at ${new Date(record.signOutTime).toLocaleTimeString()}. Cannot sign out twice.`
            };
          }
          
          const signInTime = new Date(record.signInTime);
          const signOutTime = new Date(timestamp);
          const durationMinutes = Math.floor((signOutTime - signInTime) / (1000 * 60));
          
          await databases.updateDocument(
            config.databaseId,
            config.attendanceCollectionId,
            record.$id,
            {
              signOutTime: timestamp,
              signOutFingerUsed: verificationMethod === 'Fingerprint' ? biometricIdentifier : '',
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
        if (type === 'signin') {
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
              signInFingerUsed: verificationMethod === 'Fingerprint' ? biometricIdentifier : '',
              signInStatus: 'Present',
              verificationMethod: verificationMethod,
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
        setVerificationMethod('');
        stopCamera();
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
    setVerificationMethod('');
    stopCamera();
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
            Biometric attendance marking system with fingerprint and face recognition
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
              <span>{progress.current}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress.current}%` }}
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
              verificationMethod={verificationMethod}
              setVerificationMethod={setVerificationMethod}
              handleFingerprintVerification={handleFingerprintVerification}
              handleFaceVerification={handleFaceVerification}
              isVerifying={isVerifying}
              verificationResult={verificationResult}
              handleCloseSession={handleCloseSession}
              fingerprintScanner={fingerprintScanner}
              faceRecognition={faceRecognition}
              modelsLoaded={modelsLoaded}
              cameraActive={cameraActive}
              faceDetected={faceDetected}
              videoRef={videoRef}
              canvasRef={canvasRef}
              overlayCanvasRef={overlayCanvasRef}
              progress={progress}
              switchCamera={switchCamera}
              facingMode={facingMode}
              isSwitchingCamera={isSwitchingCamera}
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

// Component: Session Report View (unchanged)
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
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
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
                  {item.verificationMethod ? (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {item.verificationMethod}
                    </span>
                  ) : '-'}
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

// Component: No Courses View (unchanged)
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

// Component: Session Setup Panel - UPDATED WITH CAMERA SWITCH BUTTON
function SessionSetupPanel({
  activeSession,
  courses,
  selectedCourse,
  setSelectedCourse,
  sessionType,
  setSessionType,
  handleStartSession,
  verificationMethod,
  setVerificationMethod,
  handleFingerprintVerification,
  handleFaceVerification,
  isVerifying,
  verificationResult,
  handleCloseSession,
  fingerprintScanner,
  faceRecognition,
  modelsLoaded,
  cameraActive,
  faceDetected,
  videoRef,
  canvasRef,
  overlayCanvasRef,
  progress,
  switchCamera,
  facingMode,
  isSwitchingCamera
}) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6">Session Setup</h2>

      {!activeSession && sessionType === 'signout' && (
        <div className="mb-6 p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
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

          {/* Verification Method Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Select Verification Method *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setVerificationMethod('fingerprint')}
                className={`p-6 border-2 rounded-xl transition-all ${
                  verificationMethod === 'fingerprint'
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-300 hover:border-indigo-400'
                }`}
              >
                <Fingerprint className={`w-12 h-12 mx-auto mb-3 ${
                  verificationMethod === 'fingerprint' ? 'text-indigo-600' : 'text-gray-400'
                }`} />
                <span className={`font-semibold ${
                  verificationMethod === 'fingerprint' ? 'text-indigo-600' : 'text-gray-700'
                }`}>
                  Fingerprint
                </span>
              </button>

              <button
                onClick={() => setVerificationMethod('face')}
                className={`p-6 border-2 rounded-xl transition-all ${
                  verificationMethod === 'face'
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-300 hover:border-purple-400'
                }`}
              >
                <Camera className={`w-12 h-12 mx-auto mb-3 ${
                  verificationMethod === 'face' ? 'text-purple-600' : 'text-gray-400'
                }`} />
                <span className={`font-semibold ${
                  verificationMethod === 'face' ? 'text-purple-600' : 'text-gray-700'
                }`}>
                  Face Recognition
                </span>
              </button>
            </div>
          </div>

          {/* Face Recognition Camera Preview */}
          {verificationMethod === 'face' && (
            <div className="mb-6">
              <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <canvas ref={overlayCanvasRef} className="absolute top-0 left-0 w-full h-full" />

                {!cameraActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
                    <p className="text-white text-sm text-center px-4">
                      Camera will activate when you click "Start Camera"
                    </p>
                  </div>
                )}

                {cameraActive && (
                  <>
                    {/* Face Detection Indicator */}
                    <div className="absolute top-4 right-4">
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                        faceDetected ? 'bg-green-500' : 'bg-red-500'
                      }`}>
                        <Camera className="w-4 h-4 text-white" />
                        <span className="text-white text-sm font-medium">
                          {faceDetected ? 'Face Detected' : 'No Face'}
                        </span>
                      </div>
                    </div>

                    {/* Camera Switch Button */}
                    <div className="absolute top-4 left-4">
                      <button
                        onClick={switchCamera}
                        disabled={isSwitchingCamera || isVerifying}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                          isSwitchingCamera || isVerifying
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-blue-500 hover:bg-blue-600'
                        }`}
                        title="Switch Camera"
                      >
                        <RefreshCw className={`w-4 h-4 text-white ${isSwitchingCamera ? 'animate-spin' : ''}`} />
                        <span className="text-white text-sm font-medium">
                          {facingMode === 'user' ? 'Front' : 'Back'}
                        </span>
                      </button>
                    </div>
                  </>
                )}

                {isVerifying && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
                    <div
                      className="h-full bg-green-500 transition-all duration-300"
                      style={{ width: `${progress.current}%` }}
                    />
                  </div>
                )}
              </div>
              <canvas ref={canvasRef} className="hidden" />
              <p className="text-xs text-gray-500 mt-2 text-center">
                💡 Position your face in the frame - a green box will appear when detected
                <br />
                🔄 Use the camera switch button to alternate between front and back camera
              </p>
            </div>
          )}

          {/* Fingerprint Instructions */}
          {verificationMethod === 'fingerprint' && (
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
          )}

          {/* Verification Button */}
          <button
            onClick={verificationMethod === 'fingerprint' ? handleFingerprintVerification : handleFaceVerification}
            disabled={
              isVerifying || 
              !verificationMethod || 
              (verificationMethod === 'fingerprint' && !fingerprintScanner) ||
              (verificationMethod === 'face' && !faceRecognition) ||
              (verificationMethod === 'face' && cameraActive && !faceDetected)
            }
            className={`w-full py-6 rounded-xl font-bold text-lg text-white transition-all shadow-lg flex items-center justify-center ${
              isVerifying || 
              !verificationMethod || 
              (verificationMethod === 'fingerprint' && !fingerprintScanner) ||
              (verificationMethod === 'face' && !faceRecognition) ||
              (verificationMethod === 'face' && cameraActive && !faceDetected)
                ? 'bg-gray-400 cursor-not-allowed'
                : verificationMethod === 'fingerprint'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700'
                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
            }`}
          >
            {isVerifying ? (
              <>
                <Loader2 className="animate-spin h-6 w-6 mr-3" />
                Verifying...
              </>
            ) : verificationMethod === 'fingerprint' ? (
              <>
                <Fingerprint className="w-6 h-6 mr-3" />
                Scan Fingerprint
              </>
            ) : cameraActive ? (
              faceDetected ? (
                <>
                  <Camera className="w-6 h-6 mr-3" />
                  Capture & Verify Face
                </>
              ) : (
                <>
                  <Camera className="w-6 h-6 mr-3" />
                  Waiting for face...
                </>
              )
            ) : (
              <>
                <Camera className="w-6 h-6 mr-3" />
                Start Camera
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
                      {verificationResult.verificationType && (
                        <p className="text-xs text-green-600 mt-1">
                          Method: {verificationResult.verificationType}
                        </p>
                      )}
                      {verificationResult.confidence && (
                        <p className="text-xs text-green-600">
                          Confidence: {verificationResult.confidence}%
                          {verificationResult.score && ` • Score: ${verificationResult.score}`}
                        </p>
                      )}
                      {verificationResult.fingerName && (
                        <p className="text-xs text-green-600">
                          Finger: {verificationResult.fingerName}
                        </p>
                      )}
                    </>
                  )}
                  {!verificationResult.matched && verificationResult.totalCompared && (
                    <p className="text-xs text-red-600 mt-1">
                      Compared against {verificationResult.totalCompared} records
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

// Component: Attendance Log Panel (unchanged)
function AttendanceLogPanel({ attendanceLog, verificationResult }) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6">Attendance Log</h2>

      {attendanceLog.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-96 text-gray-400">
          <svg className="w-32 h-32 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <p className="text-lg font-medium">No attendance marked yet</p>
          <p className="text-sm mt-2">Start verifying students with fingerprint or face recognition</p>
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
                        <div className="flex gap-2 mt-1 flex-wrap">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            log.action === 'signin' 
                              ? 'bg-green-200 text-green-800' 
                              : 'bg-orange-200 text-orange-800'
                          }`}>
                            {log.action === 'signin' ? '✅ Signed In' : '🚪 Signed Out'}
                          </span>
                          <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded-full font-medium">
                            {log.method}
                          </span>
                          {log.fingerUsed && (
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                              {log.fingerUsed}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {log.confidence && `Confidence: ${log.confidence}%`}
                          {log.score && ` • Score: ${log.score}`}
                          {log.distance && ` • Distance: ${log.distance.toFixed(3)}`}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="font-bold text-gray-900">
                        {log.student.firstName} {log.student.surname}
                      </p>
                      <p className="text-sm text-gray-600">{log.student.matricNumber}</p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          log.action === 'signin' 
                            ? 'bg-green-200 text-green-800' 
                            : 'bg-orange-200 text-orange-800'
                        }`}>
                          {log.action === 'signin' ? '✅ Signed In' : '🚪 Signed Out'}
                        </span>
                        <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded-full font-medium">
                          {log.method}
                        </span>
                        {log.fingerUsed && (
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                            {log.fingerUsed}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {log.confidence && `Confidence: ${log.confidence}%`}
                        {log.score && ` • Score: ${log.score}`}
                        {log.distance && ` • Distance: ${log.distance.toFixed(3)}`}
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