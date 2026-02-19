"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  Fingerprint,
  AlertCircle,
  Loader2,
  Camera,
} from "lucide-react";

export default function OptimizedExamVerification() {
  const router = useRouter();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);

  const [verificationType, setVerificationType] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [status, setStatus] = useState({ message: "", type: "" });
  const [errorMessage, setErrorMessage] = useState("");
  const [fingerprintScanner, setFingerprintScanner] = useState(null);
  const [faceRecognition, setFaceRecognition] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [facingMode, setFacingMode] = useState("user");

  // ── NBIS server warm-up state ──────────────────────────────────────────────
  const [nbisReady, setNbisReady] = useState(false);
  const nbisWarmStarted = useRef(false);

  // Caching
  const [fingerprintCache, setFingerprintCache] = useState(null);
  const [cacheTimestamp, setCacheTimestamp] = useState(null);
  const CACHE_DURATION = 5 * 60 * 1000;

  // ── Pre-warm NBIS server on mount (runs once, non-blocking) ───────────────
  // This means by the time the operator clicks "Start Verification",
  // the Render server has already had ~60s to wake up.
  useEffect(() => {
    if (nbisWarmStarted.current) return;
    nbisWarmStarted.current = true;

    const warmUpNBIS = async () => {
      console.log("🔥 Pre-warming NBIS server...");
      try {
        const res = await fetch("/api/fingerprint/health-check", {
          signal: AbortSignal.timeout(90_000), // wait up to 90s for cold start
        });
        if (res.ok) {
          setNbisReady(true);
          console.log("✅ NBIS server is warm and ready");
        }
      } catch {
        console.warn("⚠️ NBIS warm-up failed — will retry on first use");
      }
    };

    warmUpNBIS();
  }, []);

  const waitForVideoReady = (videoElement) => {
    return new Promise((resolve) => {
      if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
        resolve();
      } else {
        videoElement.addEventListener("loadeddata", () => resolve(), {
          once: true,
        });
      }
    });
  };

  // Real-time face detection overlay
  useEffect(() => {
    let animationFrameId;

    const detectFaceInRealTime = async () => {
      if (
        !cameraActive ||
        !videoRef.current ||
        !faceRecognition ||
        !modelsLoaded
      )
        return;

      const video = videoRef.current;
      const overlay = overlayCanvasRef.current;

      if (!overlay || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animationFrameId = requestAnimationFrame(detectFaceInRealTime);
        return;
      }

      try {
        overlay.width = video.videoWidth;
        overlay.height = video.videoHeight;
        const ctx = overlay.getContext("2d");
        ctx.clearRect(0, 0, overlay.width, overlay.height);

        const faceapi = window.faceapi;
        // const detection = await faceapi.detectSingleFace(video);
        const detection = await faceapi.detectSingleFace(
          video,
          new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 }),
        );

        if (detection) {
          setFaceDetected(true);
          const box = detection.box;
          ctx.strokeStyle = "#10b981";
          ctx.lineWidth = 3;
          ctx.strokeRect(box.x, box.y, box.width, box.height);

          const confidence = Math.round(detection.score * 100);
          ctx.fillStyle = "#10b981";
          ctx.fillRect(box.x, box.y - 30, 100, 25);
          ctx.fillStyle = "white";
          ctx.font = "16px Arial";
          ctx.fillText(`${confidence}%`, box.x + 5, box.y - 10);
        } else {
          setFaceDetected(false);
        }
      } catch {
        // silent
      }

      animationFrameId = requestAnimationFrame(detectFaceInRealTime);
    };

    if (cameraActive && modelsLoaded) detectFaceInRealTime();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [cameraActive, modelsLoaded, faceRecognition]);

  useEffect(() => {
    let mounted = true;

    const loadScanner = async () => {
      try {
        const scanner = (await import("@/lib/fingerprint-digitalpersona"))
          .default;
        if (mounted) {
          setFingerprintScanner(scanner);
          const availability = await scanner.isAvailable();
          if (availability.available) {
            setStatus({
              message: "Fingerprint scanner ready",
              type: "success",
            });
          }
        }
      } catch (error) {
        console.error("Scanner load error:", error);
      }
    };

    const loadFaceRecognition = async () => {
      try {
        const faceRec = await import("@/lib/face-recognition-browser").then(
          (m) => m.default,
        );
        if (!mounted) return;
        setFaceRecognition(faceRec);

        for (let i = 0; i < 3; i++) {
          try {
            const result = await faceRec.loadModels();
            if (result.success && mounted) {
              setModelsLoaded(true);
              console.log("✅ Face recognition models loaded");
              return;
            }
          } catch (e) {
            console.warn(`Model load attempt ${i + 1}/3 failed:`, e);
            if (i < 2) await new Promise((r) => setTimeout(r, 1000));
          }
        }
      } catch (error) {
        console.error("Face recognition load error:", error);
        if (mounted)
          setStatus({
            message: "Face recognition unavailable. Please refresh.",
            type: "error",
          });
      }
    };

    loadScanner();
    loadFaceRecognition();
    preloadFingerprintDatabase();

    return () => {
      mounted = false;
      stopCamera();
    };
  }, []);

  const preloadFingerprintDatabase = async () => {
    try {
      console.log("🔄 Pre-loading fingerprint database...");
      const { getStudentsWithFingerprintsPNG } = await import("@/lib/appwrite");
      const result = await getStudentsWithFingerprintsPNG();
      if (result.success) {
        setFingerprintCache(result);
        setCacheTimestamp(Date.now());
        console.log(`✅ Pre-loaded ${result.data.length} fingerprints`);
      }
    } catch (error) {
      console.error("❌ Pre-load error:", error);
    }
  };

  const getFingerprintsWithCache = async () => {
    const now = Date.now();
    if (
      fingerprintCache &&
      cacheTimestamp &&
      now - cacheTimestamp < CACHE_DURATION
    ) {
      console.log("💾 Using cached fingerprint database");
      return fingerprintCache;
    }
    console.log("📥 Fetching fresh fingerprint database...");
    const { getStudentsWithFingerprintsPNG } = await import("@/lib/appwrite");
    const result = await getStudentsWithFingerprintsPNG();
    if (result.success) {
      setFingerprintCache(result);
      setCacheTimestamp(now);
    }
    return result;
  };

  const getStatusColor = () => {
    switch (status.type) {
      case "success":
        return "text-green-600 bg-green-50 border-green-200";
      case "error":
        return "text-red-600 bg-red-50 border-red-200";
      case "warning":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      default:
        return "text-blue-600 bg-blue-50 border-blue-200";
    }
  };

  const getStatusIcon = () => {
    switch (status.type) {
      case "success":
        return <CheckCircle className="w-5 h-5" />;
      case "error":
        return <XCircle className="w-5 h-5" />;
      case "warning":
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <Fingerprint className="w-5 h-5" />;
    }
  };

  // const startCamera = async (facing = facingMode) => {
  //   try {
  //     const mediaStream = await navigator.mediaDevices.getUserMedia({
  //       video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } }
  //     });

  //     if (videoRef.current) {
  //       videoRef.current.srcObject = mediaStream;
  //       await new Promise((resolve) => {
  //         videoRef.current.onloadedmetadata = () => { videoRef.current.play(); resolve(); };
  //       });
  //       await new Promise(r => setTimeout(r, 500));
  //     }

  //     setStream(mediaStream);
  //     setCameraActive(true);
  //     setErrorMessage('');
  //     setStatus({ message: '✅ Camera ready - position your face in frame', type: 'success' });
  //   } catch (err) {
  //     console.error('Camera access error:', err);
  //     setErrorMessage('Unable to access camera. Please check permissions.');
  //     setStatus({ message: 'Camera access denied', type: 'error' });
  //   }
  // };

  const startCamera = async (facing = facingMode) => {
    try {
      // Try with exact constraint first
      let mediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { exact: facing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      } catch (exactErr) {
        // Fallback without exact
        console.log("Exact constraint failed, trying without exact...");
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facing,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
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
        await new Promise((r) => setTimeout(r, 500));
      }

      setStream(mediaStream);
      setCameraActive(true);
      setErrorMessage("");
      setStatus({
        message: `✅ Camera ready (${facing === "user" ? "Front" : "Back"}) - position your face in frame`,
        type: "success",
      });
    } catch (err) {
      console.error("Camera access error:", err);
      setErrorMessage("Unable to access camera. Please check permissions.");
      setStatus({ message: "Camera access denied", type: "error" });
    }
  };

  // const toggleCamera = async () => {
  //   if (stream) { stream.getTracks().forEach(t => t.stop()); setStream(null); }
  //   const newMode = facingMode === 'user' ? 'environment' : 'user';
  //   setFacingMode(newMode);
  //   await startCamera(newMode);
  //   setStatus({ message: `✅ Switched to ${newMode === 'user' ? 'front' : 'back'} camera`, type: 'success' });
  // };

  const toggleCamera = async () => {
    try {
      setStatus({ message: "Switching camera...", type: "info" });

      // Step 1: Stop current stream completely
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        setStream(null);
      }
      setCameraActive(false);
      setFaceDetected(false);

      // Step 2: Wait for cleanup
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Step 3: Determine new mode
      const newMode = facingMode === "user" ? "environment" : "user";

      // Step 4: Start camera with new mode
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { exact: newMode }, // ✅ Use exact constraint
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await new Promise((resolve) => {
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            resolve();
          };
        });
        await new Promise((r) => setTimeout(r, 500));
      }

      setStream(mediaStream);
      setFacingMode(newMode); // ✅ Update state AFTER successful switch
      setCameraActive(true);
      setStatus({
        message: `✅ Switched to ${newMode === "user" ? "Front" : "Back"} camera`,
        type: "success",
      });
    } catch (err) {
      console.error("Camera switch error:", err);

      // Fallback: Try without exact constraint
      try {
        const newMode = facingMode === "user" ? "environment" : "user";
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: newMode, // ✅ Without exact
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          await new Promise((resolve) => {
            videoRef.current.onloadedmetadata = () => {
              videoRef.current.play();
              resolve();
            };
          });
        }

        setStream(mediaStream);
        setFacingMode(newMode);
        setCameraActive(true);
        setStatus({
          message: `⚠️ Switched camera (fallback mode)`,
          type: "warning",
        });
      } catch (fallbackErr) {
        console.error("Fallback camera switch failed:", fallbackErr);
        setStatus({
          message: "Failed to switch camera. Device may only have one camera.",
          type: "error",
        });

        // Restart original camera
        await startCamera(facingMode);
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setCameraActive(false);
    setFaceDetected(false);
  };

  const captureFaceImage = async () => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    await waitForVideoReady(video);
    if (video.videoWidth === 0 || video.videoHeight === 0) return null;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.95);
  };

  const handleFaceVerification = async () => {
    if (!cameraActive) {
      await startCamera();
      setStatus({
        message:
          '✅ Camera started. Position your face and click "Capture & Verify"',
        type: "success",
      });
      return;
    }

    if (!faceDetected) {
      setStatus({
        message: "⚠️ No face detected. Please ensure your face is visible.",
        type: "warning",
      });
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);
    setProgress({ current: 0, total: 100 });
    setErrorMessage("");
    setStatus({ message: "Capturing face...", type: "info" });

    await new Promise((r) => setTimeout(r, 200));

    const MAX_RETRIES = 2;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (!faceRecognition)
          throw new Error("Face recognition library not initialized");

        if (!modelsLoaded) {
          setStatus({
            message: "Loading face recognition models...",
            type: "info",
          });
          await faceRecognition.loadModels();
          setModelsLoaded(true);
        }

        const capturedImageBase64 = await captureFaceImage();
        if (!capturedImageBase64)
          throw new Error("Failed to capture image from video");

        setProgress({ current: 20, total: 100 });
        setStatus({ message: "Analyzing face features...", type: "info" });

        const extractResult =
          await faceRecognition.extractDescriptor(capturedImageBase64);
        if (!extractResult.success)
          throw new Error(extractResult.message || "Failed to detect face");

        setProgress({ current: 40, total: 100 });
        setStatus({ message: "Loading student database...", type: "info" });

        const { getStudentsWithFaceDescriptors } =
          await import("@/lib/appwrite");
        const studentsResult = await getStudentsWithFaceDescriptors();

        if (!studentsResult.success || studentsResult.data.length === 0) {
          setVerificationResult({
            matched: false,
            message: "⚠️ No registered faces in database.",
          });
          setStatus({ message: "No registered faces found", type: "warning" });
          break;
        }

        setProgress({ current: 60, total: 100 });
        setStatus({
          message: `Comparing against ${studentsResult.data.length} registered faces...`,
          type: "info",
        });

        const storedDescriptors = studentsResult.data.map((student) => ({
          ...student,
          descriptor: JSON.parse(student.faceDescriptor),
        }));

        const verifyResult = await faceRecognition.verifyFaceWithMatcher(
          extractResult.descriptor,
          storedDescriptors,
        );

        setProgress({ current: 100, total: 100 });

        if (verifyResult.success && verifyResult.matched) {
          setVerificationResult({
            matched: true,
            student: verifyResult.student,
            confidence: verifyResult.confidence,
            distance: verifyResult.distance,
            verificationType: "Face Recognition",
            method: "FaceAPI_Browser",
          });
          setStatus({
            message: "Identity verified successfully!",
            type: "success",
          });
          stopCamera();
          new Audio("/sounds/success.mp3").play().catch(() => {});
        } else {
          setVerificationResult({
            matched: false,
            message: verifyResult.message || "No matching student found",
          });
          setStatus({ message: "No match found", type: "error" });
          new Audio("/sounds/error.mp3").play().catch(() => {});
        }
        break;
      } catch (err) {
        console.error(
          `❌ Face verification attempt ${attempt}/${MAX_RETRIES} failed:`,
          err,
        );
        if (attempt < MAX_RETRIES) {
          setStatus({
            message: `Retrying... (${attempt}/${MAX_RETRIES})`,
            type: "warning",
          });
          await new Promise((r) => setTimeout(r, 1200));
          continue;
        }
        setErrorMessage(err.message);
        setStatus({
          message: "Verification failed. Please try again.",
          type: "error",
        });
        setVerificationResult({ matched: false, message: err.message });
      }
    }

    setIsVerifying(false);
    setProgress({ current: 0, total: 0 });
  };

  const handleFingerprintVerification = async () => {
    if (!fingerprintScanner) {
      setStatus({ message: "Scanner not initialized", type: "error" });
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);
    setProgress({ current: 0, total: 100 });
    setErrorMessage("");

    // ── If NBIS isn't warm yet, start warming now and tell the operator ───────
    if (!nbisReady) {
      setStatus({
        message: "🔥 Waking up fingerprint server... (first use takes ~30s)",
        type: "info",
      });
    } else {
      setStatus({
        message: "Place your finger on the scanner...",
        type: "info",
      });
    }

    try {
      // ── Capture + DB fetch run concurrently ─────────────────────────────────
      // No need to wait for the capture before fetching — start both immediately.
      const [captureResult, fingerprintsResult] = await Promise.all([
        fingerprintScanner.capturePNG("Verification"),
        getFingerprintsWithCache(), // ✅ uses cache when available
      ]);

      if (!captureResult.success) throw new Error(captureResult.error);

      if (captureResult.quality < 50) {
        setStatus({
          message: `Quality too low (${captureResult.quality}%). Please try again.`,
          type: "warning",
        });
        setIsVerifying(false);
        return;
      }

      if (!fingerprintsResult.success)
        throw new Error("Failed to fetch fingerprints");

      if (fingerprintsResult.data.length === 0) {
        setVerificationResult({
          matched: false,
          message: "No registered fingerprints",
        });
        setStatus({ message: "No registered fingerprints", type: "warning" });
        setIsVerifying(false);
        return;
      }

      setProgress({ current: 40, total: 100 });
      setStatus({
        message: `Comparing against ${fingerprintsResult.data.length} fingerprint(s)...`,
        type: "info",
      });

      const verificationStart = Date.now();

      const response = await fetch("/api/fingerprint/verify-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queryImage: captureResult.imageData,
          is_duplicate_check: false, // ✅ AUTHENTICATION mode (threshold 40, not 80)
          database: fingerprintsResult.data.map((fp) => ({
            id: fp.fileId,
            studentId: fp.student.$id,
            matricNumber: fp.student.matricNumber,
            studentName: `${fp.student.firstName} ${fp.student.surname}`,
            fingerName: fp.fingerName,
            imageData: fp.imageData,
            student: fp.student,
          })),
        }),
      });

      setProgress({ current: 80, total: 100 });

      if (!response.ok)
        throw new Error(`Verification failed: ${response.status}`);
      const result = await response.json();

      const verificationTime = (
        (Date.now() - verificationStart) /
        1000
      ).toFixed(2);
      console.log(`⚡ Verification completed in ${verificationTime}s`);

      setProgress({ current: 100, total: 100 });

      if (result.success && result.matched && result.bestMatch) {
        setNbisReady(true); // mark server as warm after a successful call
        setVerificationResult({
          matched: true,
          student: result.bestMatch.student,
          confidence: result.bestMatch.confidence,
          score: result.bestMatch.score,
          fingerName: result.bestMatch.fingerName,
          verificationType: "Fingerprint (NBIS)",
          method: result.method || "NIST_NBIS",
          verificationTime,
        });
        setStatus({
          message: `Match found in ${verificationTime}s!`,
          type: "success",
        });
        new Audio("/sounds/success.mp3").play().catch(() => {});
      } else {
        setVerificationResult({
          matched: false,
          message: `No match found. Best score: ${result.bestMatch?.score ?? 0}`,
          totalCompared: result.totalCompared,
          verificationTime,
        });
        setStatus({ message: "No match found", type: "error" });
        new Audio("/sounds/error.mp3").play().catch(() => {});
      }
    } catch (error) {
      console.error("❌ Verification error:", error);
      setStatus({
        message: error.message || "Verification failed",
        type: "error",
      });
      setErrorMessage(error.message);
      setVerificationResult({
        matched: false,
        message: "Error: " + error.message,
      });
    } finally {
      setIsVerifying(false);
      setProgress({ current: 0, total: 0 });
      await fingerprintScanner.stop();
    }
  };

  const handleStartVerification = async () => {
    if (!verificationType) {
      alert("Please select a verification method");
      return;
    }
    if (verificationType === "Face") await handleFaceVerification();
    else if (verificationType === "Fingerprint")
      await handleFingerprintVerification();
  };

  const resetVerification = () => {
    setVerificationResult(null);
    setVerificationType("");
    setIsVerifying(false);
    setErrorMessage("");
    setStatus({ message: "", type: "" });
    setProgress({ current: 0, total: 0 });
    stopCamera();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
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

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 flex items-center space-x-3">
            <svg
              className="w-10 h-10 text-indigo-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <span>⚡ Optimized Identity Verification</span>
          </h1>
          <p className="text-gray-600 mt-2">
            Fast biometric authentication with real-time face detection
          </p>

          {/* Status indicators */}
          <div className="mt-3 flex flex-wrap gap-2">
            {fingerprintCache && (
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-200 rounded-full text-sm text-green-700">
                <CheckCircle className="w-4 h-4" />
                {fingerprintCache.data.length} fingerprints cached
              </div>
            )}
            <div
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm border ${
                nbisReady
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-yellow-50 border-yellow-200 text-yellow-700"
              }`}
            >
              {nbisReady ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              {nbisReady ? "NBIS server ready" : "NBIS server warming up..."}
            </div>
          </div>
        </div>

        {/* Error banner */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-start space-x-3">
            <svg
              className="w-6 h-6 text-red-600 flex-shrink-0"
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
            <div>
              <p className="font-semibold text-red-800">Error</p>
              <p className="text-red-700 text-sm">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Status bar */}
        {status.message && (
          <div
            className={`mb-6 flex items-center gap-3 p-4 rounded-lg border ${getStatusColor()}`}
          >
            {getStatusIcon()}
            <span className="font-medium flex-1">{status.message}</span>
            {isVerifying && <Loader2 className="w-5 h-5 animate-spin" />}
          </div>
        )}

        {/* Progress bar */}
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Left Panel ──────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">
              Verification Method
            </h2>

            {/* Method selector */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Select Verification Method *
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setVerificationType("Fingerprint");
                    stopCamera();
                  }}
                  className={`p-6 border-2 rounded-xl transition-all ${
                    verificationType === "Fingerprint"
                      ? "border-indigo-600 bg-indigo-50"
                      : "border-gray-300 hover:border-indigo-400"
                  }`}
                >
                  <Fingerprint
                    className={`w-12 h-12 mx-auto mb-3 ${
                      verificationType === "Fingerprint"
                        ? "text-indigo-600"
                        : "text-gray-400"
                    }`}
                  />
                  <span
                    className={`font-semibold ${
                      verificationType === "Fingerprint"
                        ? "text-indigo-600"
                        : "text-gray-700"
                    }`}
                  >
                    Fingerprint
                  </span>
                </button>

                <button
                  onClick={() => setVerificationType("Face")}
                  className={`p-6 border-2 rounded-xl transition-all ${
                    verificationType === "Face"
                      ? "border-purple-600 bg-purple-50"
                      : "border-gray-300 hover:border-purple-400"
                  }`}
                >
                  <svg
                    className={`w-12 h-12 mx-auto mb-3 ${
                      verificationType === "Face"
                        ? "text-purple-600"
                        : "text-gray-400"
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span
                    className={`font-semibold ${
                      verificationType === "Face"
                        ? "text-purple-600"
                        : "text-gray-700"
                    }`}
                  >
                    Face Recognition
                  </span>
                </button>
              </div>
            </div>

            {/* Face camera view */}
            {verificationType === "Face" && (
              <div className="mb-6">
                <div
                  className="relative bg-black rounded-lg overflow-hidden"
                  style={{ aspectRatio: "4/3" }}
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <canvas
                    ref={overlayCanvasRef}
                    className="absolute top-0 left-0 w-full h-full"
                  />

                  {!cameraActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
                      <p className="text-white text-sm text-center px-4">
                        Camera will activate when you click "Start Camera"
                      </p>
                    </div>
                  )}

                  {cameraActive && (
                    <>
                      <div className="absolute top-4 left-4">
                        <button
                          onClick={toggleCamera}
                          className="flex items-center gap-2 px-3 py-2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-lg transition-all"
                          title="Switch Camera"
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
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                          <span className="text-sm font-medium">
                            {facingMode === "user" ? "Back" : "Front"}
                          </span>
                        </button>
                      </div>

                      <div className="absolute top-4 right-4">
                        <div
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                            faceDetected ? "bg-green-500" : "bg-red-500"
                          }`}
                        >
                          <Camera className="w-4 h-4 text-white" />
                          <span className="text-white text-sm font-medium">
                            {faceDetected ? "Face Detected" : "No Face"}
                          </span>
                        </div>
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
                  💡 Position your face in the frame — a green box will appear
                  when detected
                </p>
              </div>
            )}

            {/* Fingerprint instructions */}
            {verificationType === "Fingerprint" && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-gray-600" />
                  Instructions for Best Results:
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                  <li>
                    Ensure your finger is <strong>clean and dry</strong>
                  </li>
                  <li>
                    Place your finger <strong>firmly and centered</strong> on
                    the scanner
                  </li>
                  <li>
                    <strong>Do not move</strong> your finger until capture is
                    complete
                  </li>
                  <li>
                    Use the <strong>same finger</strong> you registered with
                  </li>
                </ol>

                {/* NBIS warm-up notice */}
                {!nbisReady && (
                  <div className="mt-3 flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-700">
                    <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                    <span>
                      Fingerprint server is waking up — first verification may
                      take up to 30s longer
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Action button */}
            <button
              onClick={handleStartVerification}
              disabled={
                isVerifying ||
                !verificationType ||
                (verificationType === "Face" && cameraActive && !faceDetected)
              }
              className={`w-full py-4 rounded-xl font-semibold text-white transition-all ${
                isVerifying ||
                !verificationType ||
                (verificationType === "Face" && cameraActive && !faceDetected)
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg"
              }`}
            >
              {isVerifying ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin h-5 w-5" />
                  {verificationType === "Fingerprint"
                    ? "Verifying fingerprint..."
                    : `Verifying face... ${progress.current}%`}
                </span>
              ) : cameraActive ? (
                faceDetected ? (
                  "📸 Capture & Verify Face"
                ) : (
                  "⏳ Waiting for face..."
                )
              ) : verificationType === "Face" ? (
                "🎥 Start Camera"
              ) : (
                "Start Verification"
              )}
            </button>
          </div>

          {/* ── Right Panel — Results ────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">
              Verification Result
            </h2>

            {/* Idle state */}
            {!verificationResult && !isVerifying && (
              <div className="flex flex-col items-center justify-center h-96 text-gray-400">
                <svg
                  className="w-32 h-32 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                <p className="text-lg font-medium">
                  No verification in progress
                </p>
                <p className="text-sm mt-2">
                  Select method and start verification
                </p>
              </div>
            )}

            {/* No match */}
            {verificationResult && !verificationResult.matched && (
              <div className="flex flex-col items-center justify-center h-96">
                <div className="w-32 h-32 bg-red-100 rounded-full flex items-center justify-center mb-6">
                  <XCircle className="w-16 h-16 text-red-600" />
                </div>
                <h3 className="text-2xl font-bold text-red-600 mb-2">
                  No Match Found
                </h3>
                <p className="text-gray-600 text-center mb-6 px-4">
                  {verificationResult.message}
                </p>
                {verificationResult.verificationTime && (
                  <p className="text-sm text-gray-500 mb-4">
                    Verification time: {verificationResult.verificationTime}s
                  </p>
                )}
                <button
                  onClick={resetVerification}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Match found */}
            {verificationResult?.matched && verificationResult?.student && (
              <div className="text-center py-4">
                <div className="mb-6">
                  <div className="relative inline-block">
                    <img
                      src={
                        verificationResult.student.profilePictureUrl?.trim()
                          ? verificationResult.student.profilePictureUrl
                          : "https://via.placeholder.com/300"
                      }
                      alt={verificationResult.student.firstName}
                      className="w-64 h-64 rounded-2xl object-cover border-8 border-green-500 shadow-2xl mx-auto"
                      onError={(e) => {
                        e.target.src = "https://via.placeholder.com/300";
                      }}
                    />
                    <div className="absolute -top-4 -right-4 bg-green-500 text-white p-4 rounded-full shadow-lg">
                      <svg
                        className="w-12 h-12"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-2xl p-6 border-4 border-green-200">
                  <h3 className="text-3xl font-bold text-green-800 mb-4">
                    ✓ MATCH FOUND!
                  </h3>

                  <div className="space-y-3 text-left max-w-md mx-auto">
                    <div className="bg-white p-4 rounded-lg shadow">
                      <p className="text-sm text-gray-600 mb-1">Full Name</p>
                      <p className="text-xl font-bold text-gray-900">
                        {verificationResult.student.firstName}{" "}
                        {verificationResult.student.middleName}{" "}
                        {verificationResult.student.surname}
                      </p>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow">
                      <p className="text-sm text-gray-600 mb-1">
                        Matric Number
                      </p>
                      <p className="text-xl font-mono font-bold text-indigo-600">
                        {verificationResult.student.matricNumber}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white p-4 rounded-lg shadow">
                        <p className="text-sm text-gray-600 mb-1">Department</p>
                        <p className="font-semibold text-gray-900">
                          {verificationResult.student.department}
                        </p>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow">
                        <p className="text-sm text-gray-600 mb-1">Level</p>
                        <p className="font-semibold text-gray-900">
                          {verificationResult.student.level}
                        </p>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow">
                      <p className="text-sm text-gray-600 mb-1">
                        Match Confidence
                      </p>
                      <div className="flex items-center space-x-3">
                        <div className="flex-1 bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-green-500 h-3 rounded-full transition-all duration-500"
                            style={{
                              width: `${verificationResult.confidence}%`,
                            }}
                          />
                        </div>
                        <span className="text-xl font-bold text-green-600">
                          {verificationResult.confidence}%
                        </span>
                      </div>
                    </div>

                    {verificationResult.verificationTime && (
                      <div className="bg-white p-3 rounded-lg shadow text-center">
                        <span className="text-sm text-gray-500">
                          ⚡ Verified in{" "}
                        </span>
                        <span className="font-bold text-indigo-600">
                          {verificationResult.verificationTime}s
                        </span>
                        {verificationResult.fingerName && (
                          <span className="text-sm text-gray-500">
                            {" "}
                            · {verificationResult.fingerName} finger
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    onClick={resetVerification}
                    className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg font-semibold"
                  >
                    Verify Another Student
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
