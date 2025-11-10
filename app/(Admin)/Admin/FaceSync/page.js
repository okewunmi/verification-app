'use client'

import { useState } from 'react';
import { syncStudentFacesToFacePlusPlus } from '@/lib/appwrite';

export default function FacesetSyncPage() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState('');

  // const handleSync = async () => {
  //   setSyncing(true);
  //   setResult(null);
  //   setProgress('Starting sync...');

  //   try {
  //     setProgress('Creating/checking faceset...');
  //     const syncResult = await syncStudentFacesToFacePlusPlus();
      
  //     setResult(syncResult);
  //     setProgress('Sync complete!');
  //   } catch (error) {
  //     setResult({
  //       success: false,
  //       error: error.message
  //     });
  //     setProgress('Sync failed');
  //   } finally {
  //     setSyncing(false);
  //   }
  // };

  const handleSync = async () => {
  setSyncing(true);
    setResult(null);
    setProgress('Starting sync...');
  try {
    setProgress('Creating/checking faceset...');
    const response = await fetch('/api/sync-faces', {
      method: 'POST'
    });
    const syncResult = await response.json();
    setResult(syncResult);
    setProgress('Sync complete!');
    
  } catch (error) {
      setResult({
        success: false,
        error: error.message
      });
      setProgress('Sync failed');
    } finally {
      setSyncing(false);
    }
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Face++ Faceset Sync</h1>
              <p className="text-gray-600">Initialize and sync student faces to Face++ database</p>
            </div>
          </div>

          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
            <div className="flex items-start space-x-3">
              <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">What does this do?</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Creates a Face++ faceset named "students" if it doesn't exist</li>
                  <li>• Detects faces from all registered student profile pictures</li>
                  <li>• Adds face data to the Face++ faceset for verification</li>
                  <li>• Links each face to the student's matric number</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 mb-6">
            <div className="flex items-start space-x-3">
              <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="font-semibold text-yellow-900 mb-2">Before you start:</h3>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Ensure students have uploaded profile pictures with clear faces</li>
                  <li>• Only active students with face images will be synced</li>
                  <li>• This process may take a few minutes depending on the number of students</li>
                  <li>• Run this sync whenever you add new students</li>
                </ul>
              </div>
            </div>
          </div>

          {!result && !syncing && (
            <button
              onClick={handleSync}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold text-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              Start Sync
            </button>
          )}

          {syncing && (
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-3 py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600"></div>
                <span className="text-xl font-semibold text-indigo-600">{progress}</span>
              </div>
              <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                <div className="bg-indigo-600 h-full animate-pulse" style={{ width: '100%' }}></div>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {result.success ? (
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
                  <div className="flex items-start space-x-3">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-green-800 mb-2">Sync Successful!</h3>
                      <p className="text-green-700 mb-4">{result.message}</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg p-4">
                          <p className="text-sm text-gray-600 mb-1">Faces Added</p>
                          <p className="text-3xl font-bold text-green-600">{result.addedFaces}</p>
                        </div>
                        <div className="bg-white rounded-lg p-4">
                          <p className="text-sm text-gray-600 mb-1">Errors</p>
                          <p className="text-3xl font-bold text-red-600">{result.errors?.length || 0}</p>
                        </div>
                      </div>
                      {result.errors && result.errors.length > 0 && (
                        <div className="mt-4 bg-white rounded-lg p-4">
                          <p className="font-semibold text-gray-800 mb-2">Errors:</p>
                          <div className="max-h-40 overflow-y-auto space-y-2">
                            {result.errors.map((err, idx) => (
                              <div key={idx} className="text-sm text-red-600 bg-red-50 rounded p-2">
                                {err.matricNumber}: {err.error}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
                  <div className="flex items-start space-x-3">
                    <svg className="w-8 h-8 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h3 className="text-xl font-bold text-red-800 mb-2">Sync Failed</h3>
                      <p className="text-red-700">{result.error}</p>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  setResult(null);
                  setProgress('');
                }}
                className="w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
              >
                Run Sync Again
              </button>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-3">Next Steps:</h3>
            <ol className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start space-x-2">
                <span className="font-bold text-indigo-600">1.</span>
                <span>After successful sync, go to the Verification page to test face recognition</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="font-bold text-indigo-600">2.</span>
                <span>Re-run this sync whenever you add new students with face images</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="font-bold text-indigo-600">3.</span>
                <span>Check the Face++ console if you encounter any issues</span>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}