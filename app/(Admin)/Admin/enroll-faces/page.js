"use client"
import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, XCircle, Users, AlertCircle, RefreshCw } from 'lucide-react';

export default function BatchFaceEnrollment() {
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [results, setResults] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [currentStudent, setCurrentStudent] = useState('');
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // Add log entry
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { message, type, timestamp }]);
    console.log(`[${timestamp}] ${message}`);
  };

  // Load stats on mount
  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      addLog('Loading enrollment statistics...');
      const { getFaceEnrollmentStats } = await import('@/lib/appwrite');
      const result = await getFaceEnrollmentStats();
      if (result.success) {
        setStats(result.stats);
        addLog(`Found ${result.stats.totalStudents} total students, ${result.stats.enrolledStudents} enrolled`, 'success');
      } else {
        addLog('Failed to load stats: ' + result.error, 'error');
      }
    } catch (error) {
      addLog('Error loading stats: ' + error.message, 'error');
      console.error('Error loading stats:', error);
    }
  };

  const loadModels = async () => {
    if (modelsLoaded) return true;

    try {
      addLog('Loading face recognition models...');
      const faceRecognition = (await import('@/lib/face-recognition-browser')).default;
      const result = await faceRecognition.loadModels();
      
      if (result.success) {
        setModelsLoaded(true);
        addLog('Models loaded successfully', 'success');
        return true;
      } else {
        addLog('Failed to load models: ' + result.error, 'error');
        return false;
      }
    } catch (error) {
      addLog('Error loading models: ' + error.message, 'error');
      return false;
    }
  };

  const handleBatchEnroll = async () => {
    setIsEnrolling(true);
    setResults(null);
    setProgress({ current: 0, total: 0 });
    setLogs([]);

    try {
      // Load models first
      addLog('Initializing face recognition...');
      const loaded = await loadModels();
      if (!loaded) {
        throw new Error('Failed to load face recognition models');
      }

      // Get students with photos
      addLog('Fetching students with profile pictures...');
      const { databases, config } = await import('@/lib/appwrite');
      const { Query } = await import('appwrite');
      
      const response = await databases.listDocuments(
        config.databaseId,
        config.studentsCollectionId,
        [
          Query.equal('isActive', true),
          Query.isNotNull('profilePictureUrl'),
          Query.limit(1000)
        ]
      );

      const studentsWithPhotos = response.documents.filter(
        s => s.profilePictureUrl && s.profilePictureUrl.trim() !== ''
      );

      addLog(`Found ${studentsWithPhotos.length} students with profile pictures`);
      setProgress({ current: 0, total: studentsWithPhotos.length });

      if (studentsWithPhotos.length === 0) {
        setResults({
          success: true,
          enrolled: 0,
          failed: 0,
          total: 0,
          message: 'No students to enroll'
        });
        setIsEnrolling(false);
        return;
      }

      // Import enrollment function
      const { enrollStudentFace } = await import('@/lib/face-enrollment');
      const faceRecognition = (await import('@/lib/face-recognition-browser')).default;

      const results = {
        enrolled: 0,
        failed: 0,
        errors: []
      };

      // Process each student
      for (let i = 0; i < studentsWithPhotos.length; i++) {
        const student = studentsWithPhotos[i];
        const studentName = `${student.firstName} ${student.surname}`;
        
        setCurrentStudent(studentName);
        setProgress({ current: i + 1, total: studentsWithPhotos.length });
        
        addLog(`[${i + 1}/${studentsWithPhotos.length}] Processing ${studentName}...`);

        try {
          // Check if already enrolled
          if (student.faceCaptured && student.faceDescriptor) {
            addLog(`  ⏭️ Skipping ${studentName} (already enrolled)`);
            results.enrolled++;
            continue;
          }

          // Enroll face
          const enrollResult = await enrollStudentFace(student);

          if (enrollResult.success) {
            results.enrolled++;
            addLog(`  ✅ ${studentName} enrolled (${enrollResult.confidence}% confidence)`, 'success');
          } else {
            results.failed++;
            results.errors.push({
              student: studentName,
              matricNumber: student.matricNumber,
              error: enrollResult.message
            });
            addLog(`  ❌ ${studentName}: ${enrollResult.message}`, 'error');
          }

          // Small delay to avoid overwhelming browser
          await new Promise(resolve => setTimeout(resolve, 200));

        } catch (error) {
          results.failed++;
          results.errors.push({
            student: studentName,
            matricNumber: student.matricNumber,
            error: error.message
          });
          addLog(`  ❌ ${studentName}: ${error.message}`, 'error');
        }
      }

      addLog('=== ENROLLMENT COMPLETE ===', 'success');
      addLog(`✅ Successfully enrolled: ${results.enrolled}`, 'success');
      addLog(`❌ Failed: ${results.failed}`, results.failed > 0 ? 'error' : 'info');

      setResults({
        success: true,
        enrolled: results.enrolled,
        failed: results.failed,
        total: studentsWithPhotos.length,
        errors: results.errors,
        message: `Enrolled ${results.enrolled}/${studentsWithPhotos.length} students`
      });

      await loadStats(); // Refresh stats

    } catch (error) {
      addLog('CRITICAL ERROR: ' + error.message, 'error');
      console.error('Batch enrollment error:', error);
      setResults({
        success: false,
        error: error.message,
        enrolled: 0,
        failed: 0
      });
    } finally {
      setIsEnrolling(false);
      setCurrentStudent('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
                <Users className="w-8 h-8 text-indigo-600" />
                Face Recognition Enrollment
              </h1>
              <p className="text-gray-600">
                Batch enroll all students with profile pictures for face recognition verification
              </p>
            </div>

            {/* Stats Card */}
            {stats && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-800">Enrollment Statistics</h3>
                  <button
                    onClick={loadStats}
                    className="text-indigo-600 hover:text-indigo-700"
                    disabled={isEnrolling}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-3xl font-bold text-blue-600">{stats.totalStudents}</p>
                    <p className="text-sm text-gray-600 mt-1">Total Students</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-3xl font-bold text-green-600">{stats.enrolledStudents}</p>
                    <p className="text-sm text-gray-600 mt-1">Enrolled</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <p className="text-3xl font-bold text-yellow-600">{stats.remaining}</p>
                    <p className="text-sm text-gray-600 mt-1">Remaining</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-3xl font-bold text-purple-600">{stats.percentage}%</p>
                    <p className="text-sm text-gray-600 mt-1">Complete</p>
                  </div>
                </div>
              </div>
            )}

            {/* Info Card */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">How It Works</h3>
                  <ul className="space-y-2 text-sm text-blue-800">
                    <li>• Extracts 128-dimensional face descriptors from profile pictures</li>
                    <li>• Uses face-api.js (runs in browser, no external APIs)</li>
                    <li>• Processes all students with profile pictures automatically</li>
                    <li>• Safe to run multiple times (skips already enrolled students)</li>
                    <li>• All processing happens client-side for privacy</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Card */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <button
                onClick={handleBatchEnroll}
                disabled={isEnrolling || !stats}
                className={`w-full py-4 rounded-lg font-semibold text-white transition-all ${
                  isEnrolling || !stats
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg'
                }`}
              >
                {isEnrolling ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin h-5 w-5" />
                    Enrolling faces...
                  </span>
                ) : !stats ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin h-5 w-5" />
                    Loading statistics...
                  </span>
                ) : (
                  'Start Batch Enrollment'
                )}
              </button>

              {currentStudent && (
                <p className="text-center text-sm text-gray-600 mt-3">
                  Processing: {currentStudent}
                </p>
              )}
            </div>

            {/* Progress */}
            {isEnrolling && progress.total > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Progress</span>
                  <span>{progress.current} / {progress.total}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Results */}
            {results && (
              <div className={`rounded-xl shadow-lg p-6 ${
                results.success ? 'bg-white' : 'bg-red-50 border-2 border-red-200'
              }`}>
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  {results.success ? (
                    <>
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      <span className="text-gray-800">Enrollment Complete</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-6 h-6 text-red-600" />
                      <span className="text-red-800">Enrollment Failed</span>
                    </>
                  )}
                </h3>

                {results.success && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-2xl font-bold text-green-600">{results.enrolled}</p>
                        <p className="text-sm text-gray-600">Enrolled</p>
                      </div>
                      <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-2xl font-bold text-red-600">{results.failed}</p>
                        <p className="text-sm text-gray-600">Failed</p>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-2xl font-bold text-blue-600">{results.total}</p>
                        <p className="text-sm text-gray-600">Total</p>
                      </div>
                    </div>

                    {results.errors && results.errors.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-semibold text-gray-800 mb-2">
                          Errors ({results.errors.length}):
                        </h4>
                        <div className="max-h-64 overflow-y-auto bg-gray-50 rounded-lg p-4 space-y-2">
                          {results.errors.map((err, idx) => (
                            <div key={idx} className="text-sm p-3 bg-white rounded border border-gray-200">
                              <p className="font-medium text-gray-800">{err.student}</p>
                              <p className="text-gray-600">{err.matricNumber}</p>
                              <p className="text-red-600 text-xs mt-1">{err.error}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!results.success && (
                  <p className="text-red-700">{results.error || 'An error occurred'}</p>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Logs */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-8">
              <h3 className="font-semibold text-gray-800 mb-4">Processing Log</h3>
              <div className="h-[600px] overflow-y-auto bg-gray-900 rounded-lg p-4 font-mono text-xs">
                {logs.length === 0 ? (
                  <p className="text-gray-500">No activity yet...</p>
                ) : (
                  <div className="space-y-1">
                    {logs.map((log, idx) => (
                      <div key={idx} className={`${
                        log.type === 'error' ? 'text-red-400' :
                        log.type === 'success' ? 'text-green-400' :
                        'text-gray-300'
                      }`}>
                        <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}