"use client";
import { useState, useEffect, useRef } from "react";
import {
  createStudent,
  getAllStudents,
  updateStudent,
  deleteStudent,
  saveFingerprintsPNG,
  getStudentStats,
  generateDepartmentCode,
  checkFingerprintDuplicatePNG,
  getStudentsWithFingerprintsPNG,
} from "@/lib/appwrite";
import { useRouter } from "next/navigation";
import fingerprintScanner from "@/lib/fingerprint-digitalpersona"; // UPDATED!

export default function StudentManagement() {
  const router = useRouter();
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState({ total: 0, verified: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showFingerprintModal, setShowFingerprintModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [notification, setNotification] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [profilePreview, setProfilePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Fingerprint capture states
  const [currentFingerIndex, setCurrentFingerIndex] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedFingers, setCapturedFingers] = useState({});
  const [captureStatus, setCaptureStatus] = useState(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
const [cameraReady, setCameraReady] = useState(false);
const [capturedPhoto, setCapturedPhoto] = useState(null);
const videoRef = useRef(null);
const canvasRef = useRef(null);
const streamRef = useRef(null);
  const scannerInitializedRef = useRef(false);
  const [scannerStatus, setScannerStatus] = useState({
    ready: false,
    message: null,
    type: null,
  });
  const fingerprintDbRef = useRef(null);
  // Note: We use a combined state object for clarity
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  const fingers = [
    { id: "thumb", label: "Thumb", icon: "👍", field: "thumbTemplate" },
    { id: "index", label: "Index Finger", icon: "☝️", field: "indexTemplate" },
    {
      id: "middle",
      label: "Middle Finger",
      icon: "🖕",
      field: "middleTemplate",
    },
    { id: "ring", label: "Ring Finger", icon: "💍", field: "ringTemplate" },
    { id: "pinky", label: "Pinky Finger", icon: "🤙", field: "pinkyTemplate" },
  ];

  const [formData, setFormData] = useState({
    surname: "",
    firstName: "",
    middleName: "",
    age: "",
    phoneNumber: "",
    email: "",
    department: "",
    course: "",
    level: "",
    profilePicture: null,
  });

  const departments = [
    "Engineering",
    // 'Social Science',
    // 'Education',
    // 'Environmetal',
  ];
  const courses = [
    "Electrical Electronics Engineering",
    // 'Social Science',
    // 'Education',
    // 'Environmetal',
  ];
  const levels = ["100", "200", "300", "400", "500"];

  useEffect(() => {
    fetchStudents();
    fetchStats();
  }, []);

  // Add this cleanup effect
  useEffect(() => {
    // Cleanup function when component unmounts
    return () => {
      fingerprintScanner.stopAcquisition();
    };
  }, []);

  useEffect(() => {
    // Import and run debug
    const testConnection = async () => {
      const { debugAppwriteConnection } = await import("@/lib/appwrite");
      await debugAppwriteConnection();
    };

    testConnection();
  }, []);

  const closeFingerprintModal = async () => {
    // Reset the initialization flag when closing the modal
    scannerInitializedRef.current = false;

    // Stop the acquisition process
    // NOTE: If you are using the old SDK wrapper, use fingerprintScanner.stop()
    // If you are using the fixed wrapper, use fingerprintScanner.stopAcquisition()
    await fingerprintScanner.stopAcquisition();

    setShowFingerprintModal(false);
    setCurrentFingerIndex(0);
    setCapturedFingers({});
    setCaptureStatus(null);
    setSelectedStudent(null);
  };

  const fetchStudents = async () => {
    setLoading(true);
    const result = await getAllStudents();
    if (result.success) {
      setStudents(result.data);
    } else {
      showNotification("Error loading students: " + result.error, "error");
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    const result = await getStudentStats();
    if (result.success) {
      setStats(result.data);
    }
  };

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showNotification("File size must be less than 5MB", "error");
        return;
      }
      setFormData({ ...formData, profilePicture: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.surname ||
      !formData.firstName ||
      !formData.middleName ||
      !formData.email ||
      !formData.course ||
      !formData.age ||
      !formData.phoneNumber ||
      !formData.department ||
      !formData.level
    ) {
      showNotification("Please fill in all required fields", "error");
      return;
    }

    setSubmitting(true);

    try {
      if (editMode) {
        const result = await updateStudent(
          selectedStudent.$id,
          {
            surname: formData.surname,
            firstName: formData.firstName,
            middleName: formData.middleName,
            age: parseInt(formData.age),
            phoneNumber: formData.phoneNumber,
            email: formData.email,
            department: formData.department,
            course: formData.course,
            level: formData.level,
          },
          formData.profilePicture instanceof File
            ? formData.profilePicture
            : null,
        );

        if (result.success) {
          showNotification("Student updated successfully!", "success");
          fetchStudents();
          fetchStats();
        } else {
          showNotification("Error updating student: " + result.error, "error");
        }
      } else {
        const result = await createStudent(
          formData,
          formData.profilePicture instanceof File
            ? formData.profilePicture
            : null,
        );

        if (result.success) {
          const message = result.emailSent
            ? `Student created! Matric: ${result.matricNumber}. Welcome email sent to ${formData.email}`
            : `Student created! Matric: ${result.matricNumber}. ⚠️ Email not sent - please notify student manually.`;

          showNotification(message, result.emailSent ? "success" : "warning");
          fetchStudents();
          fetchStats();
        } else {
          showNotification("Error creating student: " + result.error, "error");
        }
      }

      resetForm();
      setShowModal(false);
    } catch (error) {
      showNotification("Error: " + error.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (student) => {
    setSelectedStudent(student);
    setFormData({
      surname: student.surname,
      firstName: student.firstName,
      middleName: student.middleName,
      age: student.age.toString(),
      phoneNumber: student.phoneNumber,
      email: student.email,
      department: student.department,
      course: student.course,
      level: student.level,
      profilePicture: student.profilePictureUrl,
    });
    setProfilePreview(student.profilePictureUrl);
    setEditMode(true);
    setShowModal(true);
  };

  const handleDelete = async (student) => {
    if (
      window.confirm(
        `Are you sure you want to delete ${student.firstName} ${student.surname}?`,
      )
    ) {
      const result = await deleteStudent(student.$id);
      if (result.success) {
        showNotification("Student deleted successfully!", "success");
        fetchStudents();
        fetchStats();
      } else {
        showNotification("Error deleting student: " + result.error, "error");
      }
    }
  };

  // const openFingerprintModal = async (student) => {
  //   setSelectedStudent(student);
  //   setShowFingerprintModal(true);
  //   setCurrentFingerIndex(0);
  //   setCapturedFingers({});
  //   setCaptureStatus(null);
  //   setScannerStatus({ ready: false, message: null, type: null }); // Reset status

  //   // CRITICAL FIX: Only initialize if the scanner hasn't been initialized in this session/modal instance.
  //   if (scannerInitializedRef.current) {
  //     setScannerStatus({
  //       ready: true,
  //       message: 'Scanner ready! Click "Capture" to begin.',
  //       type: "success",
  //     });
  //     return;
  //   }

  //   // Initialize scanner
  //   const initResult = await fingerprintScanner.initialize();

  //   if (initResult.success) {
  //     scannerInitializedRef.current = true; // Mark as initialized
  //     setScannerStatus({
  //       ready: true,
  //       message: 'Scanner ready! Click "Capture" to begin.',
  //       type: "success",
  //     });
  //   } else {
  //     setScannerStatus({
  //       ready: false,
  //       message: initResult.error,
  //       type: "error",
  //     });
  //   }
  // };



const openFingerprintModal = async (student) => {
  setSelectedStudent(student);
  setShowFingerprintModal(true);
  setCurrentFingerIndex(0);
  setCapturedFingers({});
  setCaptureStatus(null);
  setScannerStatus({ ready: false, message: null, type: null });

  // Only initialize scanner once per component lifecycle
  if (scannerInitializedRef.current) {
    setScannerStatus({
      ready: true,
      message: 'Scanner ready! Click "Capture" to begin.',
      type: 'success',
    });
  } else {
    const initResult = await fingerprintScanner.initialize();
    if (initResult.success) {
      scannerInitializedRef.current = true;
      setScannerStatus({
        ready: true,
        message: 'Scanner ready! Click "Capture" to begin.',
        type: 'success',
      });
    } else {
      setScannerStatus({ ready: false, message: initResult.error, type: 'error' });
      return; // Don't preload if scanner failed
    }
  }

  // ⭐ Reset per-session DB ref and kick off background pre-load.
  // By the time the admin places the first finger, the DB will already
  // be loaded (or served from module-level cache instantly).
  fingerprintDbRef.current = null;
  preloadFingerprintDb(); // intentionally not awaited — runs in background
};

  const preloadFingerprintDb = async () => {
  console.log('🔄 Pre-loading fingerprint DB for duplicate check...');
  const result = await getStudentsWithFingerprintsPNG(); // uses module cache
  fingerprintDbRef.current = result;
  console.log(`✅ Fingerprint DB ready: ${result.data?.length ?? 0} entries`);
};

//   const handleCaptureFinger = async () => {
//     if (!scannerStatus.ready) {
//       setCaptureStatus({
//         type: "error",
//         message: scannerStatus.message || "Scanner not initialized.",
//       });
//       return;
//     }

//     setIsCapturing(true);
//     setCaptureStatus({ type: "info", message: "Place finger on scanner..." });

//     try {
//       const currentFinger = fingers[currentFingerIndex];

//       // ===== STEP 1: Capture fingerprint =====
//       console.log(`\n🔍 Capturing ${currentFinger.label}...`);
//       const captureResult = await fingerprintScanner.capturePNG(
//         currentFinger.label,
//       );

//       if (!captureResult.success) {
//         throw new Error(captureResult.error);
//       }

//       console.log("✅ Captured successfully");
//       console.log("📊 Quality:", captureResult.quality + "%");
//       console.log("📏 Size:", captureResult.imageData?.length || 0, "bytes");

//       // Quality check
//       if (captureResult.quality < 50) {
//         setCaptureStatus({
//           type: "warning",
//           message: `Quality too low (${captureResult.quality}%). Please clean your finger and try again.`,
//         });
//         setIsCapturing(false);
//         return;
//       }
// // ===== STEP 2: Check for duplicates (OPTIMIZED) with RETRY LOGIC =====
// setCheckingDuplicates(true);
// setCaptureStatus({ type: "info", message: "Checking for duplicates..." });

// console.log("🔍 Starting duplicate check...");

// // Get all stored fingerprints
// const storedFingerprints = await getStudentsWithFingerprintsPNG();

// if (storedFingerprints.success && storedFingerprints.data.length > 0) {
//   console.log(
//     `📊 Checking against ${storedFingerprints.data.length} stored fingerprints...`,
//   );

//   // 🚀 USE BATCH COMPARISON with RETRY LOGIC for 503 errors
//   let response;
//   let retryCount = 0;
//   const maxRetries = 3;
  
//   while (retryCount < maxRetries) {
//     try {
//       response = await fetch("/api/fingerprint/verify-batch", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           queryImage: captureResult.imageData,
//           database: storedFingerprints.data.map((fp) => ({
//             id: fp.fileId,
//             studentId: fp.student.$id,
//             matricNumber: fp.student.matricNumber,
//             studentName: `${fp.student.firstName} ${fp.student.surname}`,
//             fingerName: fp.fingerName,
//             imageData: fp.imageData,
//             student: fp.student,
//           })),
//           is_duplicate_check: true  // ⭐ Use HIGHER threshold (80 instead of 40)
//         }),
//       });

//       if (response.status === 503) {
//         // Server sleeping/overloaded - retry with exponential backoff
//         retryCount++;
//         const waitTime = retryCount * 2;
//         console.warn(`⚠️ Server unavailable (attempt ${retryCount}/${maxRetries}), retrying in ${waitTime}s...`);
        
//         if (retryCount < maxRetries) {
//           setCaptureStatus({
//             type: "info",
//             message: `Server busy, retrying in ${waitTime}s... (${retryCount}/${maxRetries})`
//           });
//           await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
//           continue; // Retry
//         } else {
//           throw new Error('NBIS server is unavailable. Please wait a moment and try again.');
//         }
//       }
      
//       // Success - break retry loop
//       break;
      
//     } catch (fetchError) {
//       retryCount++;
//       if (retryCount >= maxRetries) {
//         throw new Error(`Failed after ${maxRetries} retries: ${fetchError.message}`);
//       }
//       const waitTime = retryCount * 2;
//       console.warn(`⚠️ Fetch error (attempt ${retryCount}/${maxRetries}):`, fetchError.message);
//       setCaptureStatus({
//         type: "info",
//         message: `Connection error, retrying in ${waitTime}s...`
//       });
//       await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
//     }
//   }

//   const batchResult = await response.json();

//   if (batchResult.success && batchResult.matched) {
//     const match = batchResult.bestMatch;

//     // Check if it's the SAME student (OK) or DIFFERENT student (DUPLICATE)
//     if (match.studentId !== selectedStudent.$id) {
//       console.error("❌ DUPLICATE DETECTED!");
//       setCheckingDuplicates(false);
//       setCaptureStatus({
//         type: "error",
//         message: `⚠️ DUPLICATE! This fingerprint is already registered to ${match.studentName} (Score: ${match.score})`,
//       });
//       setIsCapturing(false);

//       try {
//         const audio = new Audio("/sounds/error.mp3");
//         audio.play().catch((e) => console.log("Audio play failed:", e));
//       } catch (e) {}

//       return;
//     }

//     console.log("✓ Same student - checking if same finger slot...");
//   }
// }

// setCheckingDuplicates(false);

// // ===== STEP 3: Check current session duplicates =====
// console.log("🔍 Checking session duplicates...");

// const sessionFingers = Object.entries(capturedFingers).filter(
//   ([fingerId, data]) => fingerId !== currentFinger.id && data?.imageData,
// );

// if (sessionFingers.length > 0) {
//   // Batch check session fingers too
//   const sessionResponse = await fetch("/api/fingerprint/verify-batch", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({
//       queryImage: captureResult.imageData,
//       database: sessionFingers.map(([fingerId, data]) => ({
//         id: fingerId,
//         fingerName: fingers.find((f) => f.id === fingerId)?.label,
//         imageData: data.imageData,
//       })),
//       is_duplicate_check: true  // ⭐ Use HIGHER threshold
//     }),
//   });

//   const sessionResult = await sessionResponse.json();

//   if (sessionResult.success && sessionResult.matched) {
//     setCaptureStatus({
//       type: "error",
//       message: `⚠️ DUPLICATE! You already captured this finger as "${sessionResult.bestMatch.fingerName}" (Score: ${sessionResult.bestMatch.score}). Please use a different finger.`,
//     });
//     setIsCapturing(false);

//     try {
//       const audio = new Audio("/sounds/error.mp3");
//       audio.play().catch((e) => console.log("Audio play failed:", e));
//     } catch (e) {}

//     return;
//   }
// }

//       // ===== STEP 4: Check if slot already used =====
//       if (capturedFingers[currentFinger.id]) {
//         setCaptureStatus({
//           type: "error",
//           message: `This finger slot (${currentFinger.label}) has already been captured. Please move to the next slot.`,
//         });
//         setIsCapturing(false);
//         return;
//       }

//       console.log("✅ Fingerprint is unique - accepting");

//       // ===== STEP 5: Save fingerprint =====
//       const newCapturedFingers = {
//         ...capturedFingers,
//         [currentFinger.id]: {
//           imageData: captureResult.imageData,
//           quality: captureResult.quality,
//           capturedAt: new Date().toISOString(),
//         },
//       };

//       setCapturedFingers(newCapturedFingers);

//       setCaptureStatus({
//         type: "success",
//         message: `✅ ${currentFinger.label} captured successfully! (Quality: ${captureResult.quality}%)`,
//       });

//       try {
//         const audio = new Audio("/sounds/success.mp3");
//         audio.play().catch((e) => console.log("Audio play failed:", e));
//       } catch (e) {}

//       const nextIndex = currentFingerIndex + 1;
//       const isLastFinger = nextIndex >= fingers.length;

//       setTimeout(() => {
//         if (isLastFinger) {
//           console.log("🎉 All 5 fingers captured! Saving to storage...");
//           saveFingerprintsPNGToStorage(newCapturedFingers);
//         } else {
//           setCurrentFingerIndex(nextIndex);
//           setCaptureStatus({
//             type: "info",
//             message: "Ready for next finger...",
//           });
//         }
//         setIsCapturing(false);
//       }, 1500);
//     } catch (error) {
//       console.error("❌ Capture error:", error);
//       setCaptureStatus({
//         type: "error",
//         message: error.message || "Capture failed. Please try again.",
//       });
//       setIsCapturing(false);
//       setCheckingDuplicates(false);
//     }
//   };

const handleCaptureFinger = async () => {
  if (!scannerStatus.ready) {
    setCaptureStatus({ type: 'error', message: scannerStatus.message || 'Scanner not initialized.' });
    return;
  }

  setIsCapturing(true);
  setCaptureStatus({ type: 'info', message: 'Place finger on scanner...' });

  try {
    const currentFinger = fingers[currentFingerIndex];
    console.log(`\n🔍 Capturing ${currentFinger.label}...`);

    // ── STEP 1: Capture ───────────────────────────────────────────────────
    const captureResult = await fingerprintScanner.capturePNG(currentFinger.label);
    if (!captureResult.success) throw new Error(captureResult.error);

    console.log(`✅ Captured | Quality: ${captureResult.quality}% | Size: ${captureResult.imageData?.length} bytes`);

    if (captureResult.quality < 50) {
      setCaptureStatus({ type: 'warning', message: `Quality too low (${captureResult.quality}%). Clean your finger and try again.` });
      setIsCapturing(false);
      return;
    }

    // ── STEP 2: Check slot already used ──────────────────────────────────
    if (capturedFingers[currentFinger.id]) {
      setCaptureStatus({ type: 'error', message: `${currentFinger.label} already captured. Move to the next finger slot.` });
      setIsCapturing(false);
      return;
    }

    // ── STEP 3: In-memory session duplicate check (FAST — no network) ────
    // Compare against fingers already captured THIS session.
    // Uses exact string match first (instant), then NBIS only if needed.
    const sessionFingers = Object.entries(capturedFingers).filter(
      ([id, data]) => id !== currentFinger.id && data?.imageData
    );

    if (sessionFingers.length > 0) {
      console.log(`🔍 Session duplicate check against ${sessionFingers.length} captured finger(s)...`);

      // Fast exact-match check first (catches scanner driver bugs)
      for (const [id, data] of sessionFingers) {
        if (data.imageData === captureResult.imageData) {
          setCaptureStatus({ type: 'error', message: '⚠️ Same image captured twice — please restart capture.' });
          setIsCapturing(false);
          return;
        }
      }

      // NBIS comparison for session fingers (small set, fast)
      setCaptureStatus({ type: 'info', message: 'Checking session duplicates...' });
      setCheckingDuplicates(true);

      const sessionResponse = await fetch('/api/fingerprint/verify-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queryImage: captureResult.imageData,
          database: sessionFingers.map(([id, data]) => ({
            id,
            fingerName: fingers.find(f => f.id === id)?.label,
            imageData: data.imageData,
          })),
          is_duplicate_check: true,
        }),
      });

      if (sessionResponse.ok) {
        const sessionResult = await sessionResponse.json();
        if (sessionResult.success && sessionResult.matched) {
          setCheckingDuplicates(false);
          setCaptureStatus({
            type: 'error',
            message: `⚠️ DUPLICATE! Already captured as "${sessionResult.bestMatch.fingerName}" (Score: ${sessionResult.bestMatch.score}). Use a different finger.`,
          });
          setIsCapturing(false);
          new Audio('/sounds/error.mp3').play().catch(() => {});
          return;
        }
      }

      setCheckingDuplicates(false);
      console.log('✅ Session duplicate check passed');
    }

    // ── STEP 4: DB duplicate check — uses pre-loaded ref, not a new fetch ─
    setCheckingDuplicates(true);
    setCaptureStatus({ type: 'info', message: 'Checking against database...' });

    // Use pre-loaded data if available, otherwise fetch (with module cache)
    const storedFingerprints = fingerprintDbRef.current ?? await getStudentsWithFingerprintsPNG();
    if (!fingerprintDbRef.current) fingerprintDbRef.current = storedFingerprints; // store for later fingers

    if (storedFingerprints.success && storedFingerprints.data.length > 0) {
      console.log(`📊 Checking against ${storedFingerprints.data.length} stored fingerprint(s)...`);

      // Retry loop for 503 (Render cold start)
      let response;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          response = await fetch('/api/fingerprint/verify-batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              queryImage: captureResult.imageData,
              database: storedFingerprints.data.map(fp => ({
                id: fp.fileId,
                studentId: fp.student.$id,
                matricNumber: fp.student.matricNumber,
                studentName: `${fp.student.firstName} ${fp.student.surname}`,
                fingerName: fp.fingerName,
                imageData: fp.imageData,
                student: fp.student,
              })),
              is_duplicate_check: true,
            }),
          });

          if (response.status !== 503) break;

          const wait = attempt * 2;
          console.warn(`⚠️ Server 503 (attempt ${attempt}/3), retrying in ${wait}s...`);
          setCaptureStatus({ type: 'info', message: `Server busy, retrying in ${wait}s... (${attempt}/3)` });
          await new Promise(r => setTimeout(r, wait * 1000));
        } catch (fetchErr) {
          if (attempt >= 3) throw new Error(`Network failed after 3 retries: ${fetchErr.message}`);
          await new Promise(r => setTimeout(r, attempt * 2000));
        }
      }

      const batchResult = await response.json();

      if (batchResult.success && batchResult.matched) {
        const match = batchResult.bestMatch;
        if (match.studentId !== selectedStudent.$id) {
          setCheckingDuplicates(false);
          setCaptureStatus({
            type: 'error',
            message: `⚠️ DUPLICATE! Already registered to ${match.studentName} (Score: ${match.score})`,
          });
          setIsCapturing(false);
          new Audio('/sounds/error.mp3').play().catch(() => {});
          return;
        }
        console.log('✓ Matched same student — OK');
      }
    }

    setCheckingDuplicates(false);
    console.log('✅ Fingerprint is unique — accepting');

    // ── STEP 5: Accept fingerprint ────────────────────────────────────────
    const newCapturedFingers = {
      ...capturedFingers,
      [currentFinger.id]: {
        imageData: captureResult.imageData,
        quality: captureResult.quality,
        capturedAt: new Date().toISOString(),
      },
    };

    setCapturedFingers(newCapturedFingers);
    setCaptureStatus({ type: 'success', message: `✅ ${currentFinger.label} captured! (Quality: ${captureResult.quality}%)` });
    new Audio('/sounds/success.mp3').play().catch(() => {});

    const nextIndex = currentFingerIndex + 1;
    const isLastFinger = nextIndex >= fingers.length;

    setTimeout(() => {
      if (isLastFinger) {
        console.log('🎉 All 5 fingers captured! Saving...');
        saveFingerprintsPNGToStorage(newCapturedFingers);
      } else {
        setCurrentFingerIndex(nextIndex);
        setCaptureStatus({ type: 'info', message: 'Ready for next finger...' });
      }
      setIsCapturing(false);
    }, 1500);

  } catch (error) {
    console.error('❌ Capture error:', error);
    setCaptureStatus({ type: 'error', message: error.message || 'Capture failed. Please try again.' });
    setIsCapturing(false);
    setCheckingDuplicates(false);
  }
};



const saveFingerprintsPNGToStorage = async (fingersData = null) => {
    setCaptureStatus({
      type: "info",
      message: "Saving fingerprints to storage...",
    });

    try {
      const dataToSave = fingersData || capturedFingers;

      console.log("💾 Preparing to save fingerprints");

      // Extract the PNG image data
      const fingerprintData = {
        thumb: dataToSave.thumb?.imageData || "",
        index: dataToSave.index?.imageData || "",
        middle: dataToSave.middle?.imageData || "",
        ring: dataToSave.ring?.imageData || "",
        pinky: dataToSave.pinky?.imageData || "",
      };

      // 🔍 DEBUG BEFORE SAVING
      console.log("🔍 === DATA BEFORE SAVING ===");
      console.log("📋 Image data lengths:", {
        thumb: fingerprintData.thumb.length,
        index: fingerprintData.index.length,
        middle: fingerprintData.middle.length,
        ring: fingerprintData.ring.length,
        pinky: fingerprintData.pinky.length,
      });

      // Check each one
      Object.entries(fingerprintData).forEach(([key, data]) => {
        if (data) {
          console.log(`🔍 ${key}:`, {
            length: data.length,
            hasDataURL: data.includes("data:image"),
            hasComma: data.includes(","),
            first50: data.substring(0, 50),
            isValidBase64: /^[A-Za-z0-9+/]*={0,2}$/.test(data),
          });
        }
      });
      console.log("==========================\n");

      const result = await saveFingerprintsPNG(
        selectedStudent.$id,
        fingerprintData,
      );

      if (result.success) {
        console.log("✅ Fingerprints saved successfully");
        showNotification(
          "All fingerprints saved to storage successfully!",
          "success",
        );
        fetchStudents();
        fetchStats();

        setTimeout(() => {
          closeFingerprintModal();
        }, 2000);
      } else {
        console.error("❌ Failed to save:", result.error);
        showNotification("Error saving fingerprints: " + result.error, "error");
      }
    } catch (error) {
      showNotification("Error: " + error.message, "error");
      console.error("❌ Error in saveFingerprintsPNGToStorage:", error);
    }
  };
  const resetForm = () => {
    setFormData({
      surname: "",
      firstName: "",
      middleName: "",
      age: "",
      phoneNumber: "",
      email: "",
      department: "",
      course: "",
      level: "",
      profilePicture: null,
    });
    setProfilePreview(null);
    setEditMode(false);
    setSelectedStudent(null);
  };

  // Start camera when modal opens
useEffect(() => {
  if (showCameraModal && !capturedPhoto) {
    startCamera();
  }
  
  return () => {
    stopCamera();
  };
}, [showCameraModal]);

const startCamera = async () => {
  try {
    setCameraReady(false);
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user' // Front camera
      }
    });
    
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      setCameraReady(true);
    }
  } catch (error) {
    console.error('Camera error:', error);
    showNotification('Failed to access camera: ' + error.message, 'error');
  }
};

const stopCamera = () => {
  if (streamRef.current) {
    streamRef.current.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  }
  setCameraReady(false);
};

const capturePhoto = () => {
  if (!videoRef.current || !canvasRef.current) return;
  
  const video = videoRef.current;
  const canvas = canvasRef.current;
  
  // Set canvas dimensions to match video
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  // Draw video frame to canvas
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  // Convert to base64
  const photoData = canvas.toDataURL('image/jpeg', 0.9);
  setCapturedPhoto(photoData);
  
  // Stop camera
  stopCamera();
};

const retakePhoto = () => {
  setCapturedPhoto(null);
  startCamera();
};

const usePhoto = async () => {
  // Convert base64 to File object
  const response = await fetch(capturedPhoto);
  const blob = await response.blob();
  const file = new File([blob], `profile_${Date.now()}.jpg`, { type: 'image/jpeg' });
  
  // Update form data
  setFormData({ ...formData, profilePicture: file });
  setProfilePreview(capturedPhoto);
  
  // Close camera modal
  closeCameraModal();
  
  showNotification('Photo captured successfully!', 'success');
};

const closeCameraModal = () => {
  stopCamera();
  setCapturedPhoto(null);
  setShowCameraModal(false);
};

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.matricNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.surname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDepartment =
      !filterDepartment || student.department === filterDepartment;
    const matchesLevel = !filterLevel || student.level === filterLevel;

    return matchesSearch && matchesDepartment && matchesLevel;
  });

  const capturedCount = Object.keys(capturedFingers).length;
  const captureProgress = (capturedCount / 5) * 100;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading students...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8">
      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center space-x-3 px-6 py-4 rounded-lg shadow-lg ${
            notification.type === "success"
              ? "bg-green-500"
              : notification.type === "warning"
                ? "bg-yellow-500"
                : "bg-red-500"
          } text-white animate-slide-in max-w-md`}
        >
          {notification.type === "success" ? (
            <svg
              className="w-5 h-5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          ) : notification.type === "warning" ? (
            <svg
              className="w-5 h-5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          )}
          <span className="font-medium">{notification.message}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
            onClick={() => router.push("/Admin")}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span>Back to Dashboard</span>
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center space-x-3">
                <svg
                  className="w-8 h-8 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
                <span>Student Management</span>
              </h1>
              <p className="text-gray-600 mt-1">
                Manage student records and biometric data
              </p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              <span>Add New Student</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-md">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-3 rounded-lg">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-600">Total Students</p>
                <p className="text-2xl font-bold text-gray-800">
                  {stats.total}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-md">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 p-3 rounded-lg">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-600">Verified</p>
                <p className="text-2xl font-bold text-gray-800">
                  {stats.verified}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-md">
            <div className="flex items-center space-x-3">
              <div className="bg-orange-100 p-3 rounded-lg">
                <svg
                  className="w-6 h-6 text-orange-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-800">
                  {stats.pending}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by matric, name, or email..."
                className="pl-10 pr-4 py-2 w-full border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800"
              />
            </div>

            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>

            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800"
            >
              <option value="">All Levels</option>
              {levels.map((level) => (
                <option key={level} value={level}>
                  {level} Level
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                    Student
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                    Matric Number
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                    Contact
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                    Department
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                    Level
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <svg
                          className="w-16 h-16 text-gray-300 mb-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1}
                            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                          />
                        </svg>
                        <p className="text-gray-500 font-medium">
                          No students found
                        </p>
                        <p className="text-gray-400 text-sm mt-1">
                          Try adjusting your search or filters
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr key={student.$id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <img
                            src={
                              student.profilePictureUrl &&
                              student.profilePictureUrl.trim() !== ""
                                ? student.profilePictureUrl
                                : "https://via.placeholder.com/40"
                            }
                            alt={student.firstName}
                            className="w-10 h-10 rounded-full object-cover"
                            onError={(e) => {
                              e.target.src = "https://via.placeholder.com/40";
                            }}
                          />
                          <div>
                            <p className="font-semibold text-gray-800">
                              {student.firstName} {student.surname}
                            </p>
                            <p className="text-sm text-gray-500">
                              {student.middleName}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-indigo-600 font-semibold text-sm">
                          {student.matricNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-800">{student.email}</p>
                        <p className="text-sm text-gray-500">
                          {student.phoneNumber}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">
                          {student.department}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                          {student.level}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {student.fingerprintsCaptured ? (
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium flex items-center space-x-1 w-fit">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            <span>Verified</span>
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          {!student.fingerprintsCaptured && (
                            <button
                              onClick={() => openFingerprintModal(student)}
                              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                              title="Capture Fingerprints"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"
                                />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(student)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(student)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
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

        {/* Create/Edit Student Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">
                  {editMode ? "Edit Student" : "Add New Student"}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                {/* Profile Picture */}
                
                
                {/* Profile Picture - LIVE CAMERA CAPTURE */}
                {/* <div className="mb-6">
                  <div className="text-center">
                    <div className="inline-block relative">
                      <img
                        src={
                          profilePreview || "https://via.placeholder.com/150"
                        }
                        alt="Profile"
                        className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                      />
                      <div className="absolute bottom-0 right-0 flex gap-2">
                        <label className="bg-indigo-600 text-white p-2 rounded-full cursor-pointer hover:bg-indigo-700">
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          <input
                            type="file"
                            accept="image/*"
                            capture="user"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Tap camera to capture photo
                    </p>
                  </div>
                </div> */}
                {/* Profile Picture - LIVE CAMERA CAPTURE + FILE UPLOAD */}
<div className="mb-6">
  <div className="text-center">
    <div className="inline-block relative">
      <img
        src={profilePreview || "https://via.placeholder.com/150"}
        alt="Profile"
        className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
      />
      <div className="absolute bottom-0 right-0 flex gap-2">
        {/* Live Camera Button */}
        <button
          type="button"
          onClick={() => setShowCameraModal(true)}
          className="bg-purple-600 text-white p-2 rounded-full hover:bg-purple-700 transition-colors"
          title="Take Photo"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
        
        {/* File Upload Button */}
        <label className="bg-indigo-600 text-white p-2 rounded-full cursor-pointer hover:bg-indigo-700 transition-colors" title="Upload Photo">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      </div>
    </div>
    <p className="text-sm text-gray-500 mt-2">
      Take a photo or upload from device
    </p>
  </div>
</div>
                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Surname *
                    </label>
                    <input
                      type="text"
                      name="surname"
                      value={formData.surname}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Middle Name *
                    </label>
                    <input
                      type="text"
                      name="middleName"
                      value={formData.middleName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Age *
                    </label>
                    <input
                      type="number"
                      name="age"
                      value={formData.age}
                      onChange={handleInputChange}
                      required
                      min="15"
                      max="100"
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      required
                      placeholder="+234 xxx xxx xxxx"
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Faculty *
                    </label>
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800"
                    >
                      <option value="">Select Department</option>
                      {departments.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Department *
                    </label>
                    {/* <input
                      type="text"
                      name="course"
                      value={formData.course}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g., Computer Science"
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    /> */}
                    <select
                      name="course"
                      value={formData.course}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800"
                    >
                      <option value="">Select course</option>
                      {courses.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                    {formData.course && (
                      <p className="text-xs text-gray-500 mt-1">
                        Code: {generateDepartmentCode(formData.course)}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Level *
                    </label>
                    <select
                      name="level"
                      value={formData.level}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800"
                    >
                      <option value="">Select Level</option>
                      {levels.map((level) => (
                        <option key={level} value={level}>
                          {level} Level
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end space-x-4 mt-6 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg ${
                      submitting ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    {submitting
                      ? "Saving..."
                      : editMode
                        ? "Update Student"
                        : "Create Student"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Fingerprint Capture Modal */}
        {showFingerprintModal && selectedStudent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      DigitalPersona Fingerprint Capture
                    </h2>
                    <p className="text-purple-100 text-sm">
                      {selectedStudent.firstName} {selectedStudent.surname} -{" "}
                      {selectedStudent.matricNumber}
                    </p>
                  </div>
                  <button
                    onClick={closeFingerprintModal}
                    className="text-white hover:text-gray-200"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">
                      Progress
                    </span>
                    <span className="text-sm font-medium text-indigo-600">
                      {capturedCount} / 5 fingers
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${captureProgress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Scanner Status */}
                {/* {!scannerReady && !captureStatus && (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Initializing scanner...</p>
                  </div>
                )} */}

                {/* Scanner Status */}
                {/* Check if scanner is NOT ready AND we have no status message yet (initializing) */}
                {!scannerStatus.ready && !scannerStatus.message && (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Initializing scanner...</p>
                  </div>
                )}

                {/* Current Finger */}
                {capturedCount < 5 && scannerStatus.ready && (
                  <div className="text-center mb-6">
                    <div className="text-6xl mb-4">
                      {fingers[currentFingerIndex].icon}
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">
                      {fingers[currentFingerIndex].label}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Place your{" "}
                      {fingers[currentFingerIndex].label.toLowerCase()} on the
                      DigitalPersona scanner
                    </p>

                    {/* Capture Status */}
                    {captureStatus && (
                      <div
                        className={`mb-4 p-4 rounded-lg ${
                          captureStatus.type === "success"
                            ? "bg-green-50 border-2 border-green-200"
                            : captureStatus.type === "error"
                              ? "bg-red-50 border-2 border-red-200"
                              : "bg-blue-50 border-2 border-blue-200"
                        }`}
                      >
                        <p
                          className={`font-medium ${
                            captureStatus.type === "success"
                              ? "text-green-700"
                              : captureStatus.type === "error"
                                ? "text-red-700"
                                : "text-blue-700"
                          }`}
                        >
                          {captureStatus.message}
                        </p>
                      </div>
                    )}

                    {checkingDuplicates && (
                      <div className="mb-4 p-4 rounded-lg bg-yellow-50 border-2 border-yellow-200">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600"></div>
                          <p className="font-medium text-yellow-700">
                            Checking for duplicate fingerprints...
                          </p>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleCaptureFinger}
                      disabled={isCapturing || checkingDuplicates}
                      className={`px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg font-semibold ${
                        isCapturing || checkingDuplicates
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                    >
                      {checkingDuplicates ? (
                        <span className="flex items-center space-x-2">
                          <svg
                            className="animate-spin h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                          <span>Checking...</span>
                        </span>
                      ) : isCapturing ? (
                        <span className="flex items-center space-x-2">
                          <svg
                            className="animate-spin h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                          <span>Scanning...</span>
                        </span>
                      ) : (
                        "Capture Fingerprint"
                      )}
                    </button>
                  </div>
                )}

                {/* All Captured - Success */}
                {capturedCount === 5 && (
                  <div className="text-center py-8">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg
                        className="w-12 h-12 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">
                      All Fingerprints Captured!
                    </h3>
                    <p className="text-gray-600 mb-6">Saving to database...</p>
                    <div className="animate-pulse">
                      <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </div>
                  </div>
                )}

                {/* Captured Fingers List */}
                <div className="grid grid-cols-5 gap-2 mt-6">
                  {fingers.map((finger, index) => {
                    const isCaptured = capturedFingers[finger.id];
                    const isCurrent =
                      index === currentFingerIndex && !isCaptured;

                    return (
                      <div
                        key={finger.id}
                        className={`p-3 rounded-lg border-2 text-center transition-all ${
                          isCaptured
                            ? "border-green-500 bg-green-50"
                            : isCurrent
                              ? "border-indigo-500 bg-indigo-50 animate-pulse"
                              : "border-gray-300 bg-gray-50"
                        }`}
                      >
                        <div className="text-2xl mb-1">{finger.icon}</div>
                        <p className="text-xs font-medium text-gray-700">
                          {finger.label}
                        </p>
                        {isCaptured && (
                          <div className="mt-1">
                            <span className="text-xs text-green-600 font-semibold">
                              ✓ {capturedFingers[finger.id].quality}%
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Important Notice */}
                <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <svg
                      className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <div className="text-sm text-yellow-800">
                      <p className="font-semibold mb-1">
                        Duplicate Detection Enabled
                      </p>
                      <p>
                        Each fingerprint is checked against all registered
                        students to prevent duplicates. If a duplicate is
                        detected, you'll be prompted to use a different finger.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Camera Capture Modal */}
{showCameraModal && (
  <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl max-w-2xl w-full">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 rounded-t-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Take Photo</h2>
          <button
            onClick={closeCameraModal}
            className="text-white hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="p-6">
        {!capturedPhoto ? (
          <>
            {/* Video Preview */}
            <div className="relative bg-black rounded-lg overflow-hidden mb-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-96 object-cover"
              />
              {/* Camera not ready overlay */}
              {!cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                  <div className="text-center text-white">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-3"></div>
                    <p>Starting camera...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Capture Button */}
            <div className="text-center">
              <button
                onClick={capturePhoto}
                disabled={!cameraReady}
                className={`px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold shadow-lg ${
                  !cameraReady ? 'opacity-50 cursor-not-allowed' : 'hover:from-purple-700 hover:to-indigo-700'
                }`}
              >
                <span className="flex items-center space-x-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Capture Photo</span>
                </span>
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Captured Photo Preview */}
            <div className="mb-4">
              <img
                src={capturedPhoto}
                alt="Captured"
                className="w-full h-96 object-cover rounded-lg"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={retakePhoto}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              >
                Retake
              </button>
              <button
                onClick={usePhoto}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg font-semibold"
              >
                Use This Photo
              </button>
            </div>
          </>
        )}
      </div>
    </div>

    {/* Hidden Canvas for Capture */}
    <canvas ref={canvasRef} className="hidden" />
  </div>
)}
      </div>
    </div>
  );
}
