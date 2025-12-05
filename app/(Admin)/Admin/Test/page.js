
"use client"
import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Fingerprint, AlertCircle, Loader2 } from 'lucide-react';

export default function FingerprintVerification() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [status, setStatus] = useState({ message: '', type: '' });
  const [fingerprintScanner, setFingerprintScanner] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    const loadScanner = async () => {
      try {
        const scanner = (await import('@/lib/fingerprint-digitalpersona')).default;
        setFingerprintScanner(scanner);
        
        const availability = await scanner.isAvailable();
        if (availability.available) {
          setStatus({ message: 'Scanner ready', type: 'success' });
        } else {
          setStatus({ message: availability.error, type: 'error' });
        }
      } catch (error) {
        setStatus({ message: 'Failed to load scanner', type: 'error' });
      }
    };
    
    loadScanner();
  }, []);

  const handleVerifyFingerprint = async () => {
    if (!fingerprintScanner) {
      setStatus({ message: 'Scanner not initialized', type: 'error' });
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);
    setProgress({ current: 0, total: 0 });
    setStatus({ message: 'Place your finger on the scanner...', type: 'info' });

    try {
      // Step 1: Capture fingerprint
      console.log('🔍 Starting NBIS verification process...');
      const captureResult = await fingerprintScanner.capturePNG('Verification');

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
        console.log('\n✅ === MATCH FOUND (NBIS) ===');
        console.log('Student:', result.bestMatch.studentName);
        console.log('NBIS Score:', result.bestMatch.score);
        console.log('Confidence:', result.bestMatch.confidence + '%');
        console.log('============================\n');

        setVerificationResult({
          matched: true,
          student: result.bestMatch.student,
          confidence: result.bestMatch.confidence,
          score: result.bestMatch.score,
          fingerName: result.bestMatch.fingerName,
          message: `Verified: ${result.bestMatch.studentName}`,
          method: 'NIST_NBIS'
        });
        setStatus({ message: 'Match found!', type: 'success' });

        // Play success sound
        try {
          const audio = new Audio('/sounds/success.mp3');
          audio.play().catch(e => console.log('Audio failed:', e));
        } catch (e) {}
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

        // Play error sound
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
    }
  };

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

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Fingerprint className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Fingerprint Verification
          </h2>
          <p className="text-gray-600">
            Using NIST NBIS for accurate matching
          </p>
        </div>

        {/* Status Display */}
        {status.message && (
          <div className={`flex items-center gap-3 p-4 rounded-lg border mb-6 ${getStatusColor()}`}>
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

        {/* Verify Button */}
        <div className="text-center mb-8">
          <button
            onClick={handleVerifyFingerprint}
            disabled={isVerifying || !fingerprintScanner}
            className={`
              px-8 py-4 rounded-lg font-semibold text-white text-lg
              transition-all duration-200 transform
              ${isVerifying || !fingerprintScanner
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 hover:scale-105 active:scale-95'
              }
            `}
          >
            {isVerifying ? (
              <span className="flex items-center gap-2">
                <Loader2 className="animate-spin h-5 w-5" />
                Verifying...
              </span>
            ) : (
              'Verify Fingerprint'
            )}
          </button>
        </div>

        {/* Verification Result */}
        {verificationResult && (
          <div className={`
            p-6 rounded-lg border-2 
            ${verificationResult.matched 
              ? 'border-green-500 bg-green-50' 
              : 'border-red-500 bg-red-50'
            }
          `}>
            <div className="flex items-start gap-4">
              {verificationResult.matched ? (
                <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
              ) : (
                <XCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
              )}
              
              <div className="flex-1">
                <h3 className={`text-xl font-bold mb-2 ${
                  verificationResult.matched ? 'text-green-900' : 'text-red-900'
                }`}>
                  {verificationResult.matched ? '✅ Verification Successful' : '❌ Verification Failed'}
                </h3>
                
                {verificationResult.matched ? (
                  <div className="space-y-3">
                    <p className="text-lg font-semibold text-gray-900">
                      {verificationResult.student.firstName} {verificationResult.student.surname}
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Matric Number:</span>
                        <p className="font-medium">{verificationResult.student.matricNumber}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Department:</span>
                        <p className="font-medium">{verificationResult.student.department}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Level:</span>
                        <p className="font-medium">{verificationResult.student.level}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Finger Used:</span>
                        <p className="font-medium">{verificationResult.fingerName}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">NBIS Score:</span>
                        <p className="font-medium">{verificationResult.score}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Confidence:</span>
                        <p className="font-medium">{verificationResult.confidence}%</p>
                      </div>
                    </div>
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-xs text-blue-800">
                        ✓ Verified using NIST NBIS (BOZORTH3) - Industry standard for fingerprint matching
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-gray-700">
                      {verificationResult.message}
                    </p>
                    {verificationResult.totalCompared && (
                      <p className="text-sm text-gray-600">
                        Compared against {verificationResult.totalCompared} fingerprints
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-gray-600" />
            Instructions for Best Results:
          </h4>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
            <li>Ensure your finger is <strong>clean and dry</strong></li>
            <li>Place your finger <strong>firmly and centered</strong> on the scanner</li>
            <li><strong>Do not move</strong> your finger until capture is complete</li>
            <li>Use the <strong>same finger</strong> you registered with</li>
            <li>For best accuracy, quality should be <strong>above 70%</strong></li>
          </ol>
          {/* <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-800">
            💡 <strong>Tip:</strong> The NBIS algorithm extracts minutiae points (ridge endings and bifurcations) 
            for matching - this is the same technology used by law enforcement and government agencies.
          </div> */}
        </div>
      </div>
    </div>
  );
}