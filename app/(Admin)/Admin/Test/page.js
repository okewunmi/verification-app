"use client"
import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Fingerprint, AlertCircle } from 'lucide-react';

export default function FingerprintVerification() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [status, setStatus] = useState({ message: '', type: '' });
  const [fingerprintScanner, setFingerprintScanner] = useState(null);

  useEffect(() => {
    // Load fingerprint scanner
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
    setStatus({ message: 'Place your finger on the scanner...', type: 'info' });

    try {
      // Step 1: Capture fingerprint
      console.log('🔍 Starting verification process...');
      const captureResult = await fingerprintScanner.capturePNG('Verification');

      if (!captureResult.success) {
        throw new Error(captureResult.error);
      }

      console.log('✅ Fingerprint captured, quality:', captureResult.quality + '%');
      setStatus({ message: 'Fingerprint captured! Searching database...', type: 'info' });

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

      console.log(`📊 Comparing against ${fingerprintsResult.data.length} stored fingerprints...`);
      setStatus({ 
        message: `Comparing against ${fingerprintsResult.data.length} fingerprints...`, 
        type: 'info' 
      });

      // Step 3: Compare with each stored fingerprint
      let bestMatch = null;
      let highestSimilarity = 0;
      let comparisonCount = 0;

      for (const stored of fingerprintsResult.data) {
        comparisonCount++;
        
        if (comparisonCount % 10 === 0) {
          setStatus({ 
            message: `Comparing... (${comparisonCount}/${fingerprintsResult.data.length})`, 
            type: 'info' 
          });
        }

        try {
          // Use server-side comparison API
          const response = await fetch('/api/fingerprint/compare', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image1: captureResult.imageData,
              image2: stored.imageData
            })
          });

          const compareResult = await response.json();

          if (compareResult.success) {
            console.log(`  ${stored.matricNumber} (${stored.fingerName}): ${compareResult.similarity}%`);

            if (compareResult.matched && compareResult.similarity > highestSimilarity) {
              highestSimilarity = compareResult.similarity;
              bestMatch = {
                student: stored.student,
                fingerName: stored.fingerName,
                similarity: compareResult.similarity,
                confidence: compareResult.confidence
              };
            }
          }
        } catch (compareError) {
          console.warn(`⚠️ Error comparing with ${stored.matricNumber}:`, compareError.message);
        }
      }

      // Step 4: Return result
      if (bestMatch) {
        console.log('\n✅ === MATCH FOUND ===');
        console.log('Student:', bestMatch.student.firstName, bestMatch.student.surname);
        console.log('Confidence:', bestMatch.similarity + '%');
        console.log('==================\n');

        setVerificationResult({
          matched: true,
          student: bestMatch.student,
          confidence: bestMatch.similarity,
          fingerName: bestMatch.fingerName,
          message: `Verified: ${bestMatch.student.firstName} ${bestMatch.student.surname}`
        });
        setStatus({ message: 'Match found!', type: 'success' });

        // Play success sound
        try {
          const audio = new Audio('/sounds/success.mp3');
          audio.play().catch(e => console.log('Audio failed:', e));
        } catch (e) {}
      } else {
        console.log('\n❌ === NO MATCH FOUND ===');
        console.log('Highest similarity:', highestSimilarity.toFixed(1) + '%');
        console.log('=======================\n');

        setVerificationResult({
          matched: false,
          message: `No match found. Highest similarity: ${highestSimilarity.toFixed(1)}%`
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
    }
  };

  const getStatusColor = () => {
    switch (status.type) {
      case 'success': return 'text-green-600 bg-green-50';
      case 'error': return 'text-red-600 bg-red-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-blue-600 bg-blue-50';
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
            Place your finger on the scanner to verify identity
          </p>
        </div>

        {/* Status Display */}
        {status.message && (
          <div className={`flex items-center gap-3 p-4 rounded-lg mb-6 ${getStatusColor()}`}>
            {getStatusIcon()}
            <span className="font-medium">{status.message}</span>
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
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
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
                  {verificationResult.matched ? 'Verification Successful' : 'Verification Failed'}
                </h3>
                
                {verificationResult.matched ? (
                  <div className="space-y-2">
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
                        <span className="text-gray-600">Confidence:</span>
                        <p className="font-medium">{verificationResult.confidence}%</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-700">
                    {verificationResult.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">Instructions:</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
            <li>Ensure your finger is clean and dry</li>
            <li>Place your finger firmly on the scanner</li>
            <li>Keep your finger still until capture is complete</li>
            <li>Wait for the verification result</li>
          </ol>
        </div>
      </div>
    </div>
  );
}