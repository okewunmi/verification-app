import React, { useState, useEffect } from 'react';

const SDKVerification = () => {
  const [checks, setChecks] = useState({});
  const [sdkObject, setSdkObject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      runChecks();
    }, 2000); // Wait 2 seconds for scripts to load
  }, []);

  const runChecks = () => {
    const results = {
      // Basic checks
      windowExists: typeof window !== 'undefined',
      fingerprintExists: typeof window.Fingerprint !== 'undefined',
      
      // Your SDK has these
      webApiExists: typeof window.Fingerprint?.WebApi !== 'undefined',
      sampleFormatExists: typeof window.Fingerprint?.SampleFormat !== 'undefined',
      pngImageExists: typeof window.Fingerprint?.SampleFormat?.PngImage !== 'undefined',
      
      // Check actual values
      pngImageValue: window.Fingerprint?.SampleFormat?.PngImage,
      
      // What your SDK has
      hasQualityCode: typeof window.Fingerprint?.QualityCode !== 'undefined',
      hasDeviceModality: typeof window.Fingerprint?.DeviceModality !== 'undefined',
      
      // Check if we can create instance
      canInstantiate: false
    };

    // Try to instantiate
    try {
      if (window.Fingerprint?.WebApi) {
        const test = new window.Fingerprint.WebApi();
        results.canInstantiate = true;
      }
    } catch (e) {
      results.instantiateError = e.message;
    }

    // Get full Fingerprint object
    if (window.Fingerprint) {
      setSdkObject(Object.keys(window.Fingerprint));
    }

    setChecks(results);
    setLoading(false);
  };

  const allGood = checks.fingerprintExists && 
                  checks.webApiExists && 
                  checks.sampleFormatExists && 
                  checks.pngImageExists &&
                  checks.canInstantiate;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-6">
            🔬 SDK Verification
          </h1>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading SDK...</p>
            </div>
          ) : (
            <>
              {/* Overall Status */}
              <div className={`p-6 rounded-lg mb-6 ${
                allGood 
                  ? 'bg-green-50 border-2 border-green-500' 
                  : 'bg-red-50 border-2 border-red-500'
              }`}>
                <div className="flex items-center gap-3">
                  <span className="text-4xl">
                    {allGood ? '✅' : '❌'}
                  </span>
                  <div>
                    <h2 className={`text-xl font-bold ${
                      allGood ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {allGood ? 'SDK Ready!' : 'SDK Not Ready'}
                    </h2>
                    <p className={allGood ? 'text-green-700' : 'text-red-700'}>
                      {allGood 
                        ? 'DigitalPersona SDK is properly loaded and working'
                        : 'SDK has issues - see details below'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Detailed Checks */}
              <div className="space-y-3 mb-6">
                <h3 className="text-lg font-semibold mb-3">Component Checks:</h3>
                
                <CheckRow 
                  label="Window Object" 
                  passed={checks.windowExists}
                />
                <CheckRow 
                  label="Fingerprint Namespace" 
                  passed={checks.fingerprintExists}
                />
                <CheckRow 
                  label="WebApi Class" 
                  passed={checks.webApiExists}
                />
                <CheckRow 
                  label="SampleFormat Object" 
                  passed={checks.sampleFormatExists}
                />
                <CheckRow 
                  label="PngImage Constant" 
                  passed={checks.pngImageExists}
                  value={checks.pngImageValue}
                />
                <CheckRow 
                  label="Can Instantiate SDK" 
                  passed={checks.canInstantiate}
                  error={checks.instantiateError}
                />
              </div>

              {/* Available Properties */}
              {sdkObject && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-blue-900 mb-2">
                    Available SDK Properties:
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {sdkObject.map(prop => (
                      <span 
                        key={prop}
                        className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm"
                      >
                        {prop}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* File Check */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">
                  📁 Required Files:
                </h3>
                <div className="space-y-1 text-sm text-gray-700">
                  <p>✓ /public/sdk/websdk.client.ui.js</p>
                  <p>✓ /public/sdk/fingerprint.sdk.js</p>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={runChecks}
                className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition"
              >
                🔄 Re-check SDK
              </button>

              {/* Debug Info */}
              {!allGood && (
                <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-900 mb-2">
                    🔧 Troubleshooting:
                  </h3>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-900">
                    <li>Clear browser cache (Ctrl+Shift+Delete)</li>
                    <li>Hard reload page (Ctrl+Shift+R)</li>
                    <li>Check browser console for errors (F12)</li>
                    <li>Verify files exist at /public/sdk/</li>
                    <li>Try different browser (Chrome/Edge)</li>
                  </ol>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const CheckRow = ({ label, passed, value, error }) => (
  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
    <div>
      <p className="font-medium text-gray-900">{label}</p>
      {value !== undefined && (
        <p className="text-sm text-gray-500">Value: {String(value)}</p>
      )}
      {error && (
        <p className="text-sm text-red-600">Error: {error}</p>
      )}
    </div>
    <span className={`text-2xl ${passed ? 'text-green-500' : 'text-red-500'}`}>
      {passed ? '✅' : '❌'}
    </span>
  </div>
);

export default SDKVerification;