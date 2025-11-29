"use client"
import React, { useState, useEffect } from 'react';

const FingerprintTest = () => {
  const [scanner, setScanner] = useState(null);
  const [testResults, setTestResults] = useState({
    sdkLoaded: false,
    serviceRunning: false,
    deviceConnected: false,
    canCapture: false
  });
  const [status, setStatus] = useState('Checking...');
  const [captureResult, setCaptureResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    setStatus('🔍 Running diagnostics...');
    const results = {
      sdkLoaded: false,
      serviceRunning: false,
      deviceConnected: false,
      canCapture: false
    };

    // Check 1: SDK Loaded
    if (typeof window !== 'undefined' && 
        typeof window.Fingerprint !== 'undefined' &&
        typeof window.Fingerprint.WebApi !== 'undefined') {
      results.sdkLoaded = true;
      setStatus('✅ SDK loaded');
    } else {
      setStatus('❌ SDK not loaded');
      setTestResults(results);
      return;
    }

    // Check 2: Initialize and check service
    try {
      const fp = new window.Fingerprint.WebApi();
      setScanner(fp);
      
      const devices = await fp.enumerateDevices();
      
      if (devices && devices.length > 0) {
        results.serviceRunning = true;
        results.deviceConnected = true;
        results.canCapture = true;
        setStatus('✅ Scanner ready!');
      } else {
        results.serviceRunning = true; // Service responded but no devices
        setStatus('⚠️ Service running but no scanner detected');
      }
    } catch (error) {
      setStatus('❌ Cannot connect to DigitalPersona service');
      console.error('Service error:', error);
    }

    setTestResults(results);
  };

  const testCapture = async () => {
    if (!scanner) {
      setCaptureResult({ success: false, error: 'Scanner not initialized' });
      return;
    }

    setLoading(true);
    setCaptureResult(null);
    setStatus('👆 Place finger on scanner...');

    try {
      const devices = await scanner.enumerateDevices();
      
      if (!devices || devices.length === 0) {
        setCaptureResult({ 
          success: false, 
          error: 'No scanner detected' 
        });
        setStatus('❌ No scanner detected');
        setLoading(false);
        return;
      }

      const reader = devices[0];
      
      // Capture fingerprint
      const sample = await scanner.startAcquisition(
        window.Fingerprint.SampleFormat.PngImage,
        reader
      );

      // Convert to FMD
      const fmd = await scanner.createFmd(
        sample,
        window.Fingerprint.FmdFormat.ANSI_378_2004
      );

      // Stop acquisition
      await scanner.stopAcquisition(reader);

      // Convert to base64
      const bytes = new Uint8Array(fmd);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const template = btoa(binary);

      setCaptureResult({
        success: true,
        templateLength: template.length,
        fmdSize: fmd.byteLength,
        message: 'Fingerprint captured successfully!'
      });
      
      setStatus('✅ Capture successful!');

    } catch (error) {
      setCaptureResult({
        success: false,
        error: error.message || 'Capture failed'
      });
      setStatus('❌ Capture failed');
      console.error('Capture error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            🔬 DigitalPersona Scanner Test
          </h1>

          {/* Status */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <p className="text-lg font-medium text-gray-900">
              Current Status: <span className="ml-2">{status}</span>
            </p>
          </div>

          {/* Diagnostics Results */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Diagnostic Results
            </h2>
            <div className="space-y-3">
              <DiagnosticRow
                label="SDK Loaded"
                passed={testResults.sdkLoaded}
                details="DigitalPersona JavaScript SDK"
              />
              <DiagnosticRow
                label="Service Running"
                passed={testResults.serviceRunning}
                details="DigitalPersona background service"
              />
              <DiagnosticRow
                label="Device Connected"
                passed={testResults.deviceConnected}
                details="DigitalPersona 4500 scanner"
              />
              <DiagnosticRow
                label="Can Capture"
                passed={testResults.canCapture}
                details="Ready to scan fingerprints"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-4 mb-8">
            <button
              onClick={runDiagnostics}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
            >
              🔄 Re-run Diagnostics
            </button>

            <button
              onClick={testCapture}
              disabled={!testResults.canCapture || loading}
              className={`w-full font-semibold py-3 px-6 rounded-lg transition duration-200 ${
                testResults.canCapture && !loading
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {loading ? '⏳ Scanning...' : '👆 Test Fingerprint Capture'}
            </button>
          </div>

          {/* Capture Result */}
          {captureResult && (
            <div className={`border rounded-lg p-4 ${
              captureResult.success
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <h3 className={`font-semibold mb-2 ${
                captureResult.success ? 'text-green-900' : 'text-red-900'
              }`}>
                {captureResult.success ? '✅ Success' : '❌ Failed'}
              </h3>
              {captureResult.success ? (
                <div className="text-green-800 space-y-1">
                  <p>Template Length: {captureResult.templateLength} chars</p>
                  <p>FMD Size: {captureResult.fmdSize} bytes</p>
                  <p className="font-medium">{captureResult.message}</p>
                </div>
              ) : (
                <p className="text-red-800">{captureResult.error}</p>
              )}
            </div>
          )}

          {/* Troubleshooting */}
          {!testResults.canCapture && (
            <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="font-semibold text-yellow-900 mb-3">
                🔧 Troubleshooting Steps:
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-yellow-900">
                <li>Install DigitalPersona software from official website</li>
                <li>Ensure DigitalPersona service is running (Windows Services)</li>
                <li>Connect scanner via USB and check Device Manager</li>
                <li>Try different USB port</li>
                <li>Restart computer and try again</li>
                <li>Use Chrome or Edge browser (best compatibility)</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const DiagnosticRow = ({ label, passed, details }) => (
  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
    <div>
      <p className="font-medium text-gray-900">{label}</p>
      <p className="text-sm text-gray-500">{details}</p>
    </div>
    <span className={`text-2xl ${passed ? 'text-green-500' : 'text-red-500'}`}>
      {passed ? '✅' : '❌'}
    </span>
  </div>
);

export default FingerprintTest;