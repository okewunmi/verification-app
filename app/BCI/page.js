"use client"
import { useState } from 'react';

export default function BiometricCaptureInterface() {
  const [selectedStudent, setSelectedStudent] = useState('');
  const [captureStep, setCaptureStep] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedFingers, setCapturedFingers] = useState({});
  const [currentFinger, setCurrentFinger] = useState(null);
  const [studentSearch, setStudentSearch] = useState('');

  // Mock students - replace with Supabase query
  const students = [
    { id: 'STU2024001', name: 'John Doe', department: 'Computer Science', level: '300' },
    { id: 'STU2024002', name: 'Jane Smith', department: 'Software Engineering', level: '200' },
    { id: 'STU2024003', name: 'Mike Johnson', department: 'Computer Science', level: '400' }
  ];

  const fingers = [
    { id: 'right_thumb', label: 'Right Thumb', hand: 'right', icon: '👍' },
    { id: 'right_index', label: 'Right Index', hand: 'right', icon: '☝️' },
    { id: 'right_middle', label: 'Right Middle', hand: 'right', icon: '🖕' },
    { id: 'right_ring', label: 'Right Ring', hand: 'right', icon: '💍' },
    { id: 'right_pinky', label: 'Right Pinky', hand: 'right', icon: '🤙' },
    { id: 'left_thumb', label: 'Left Thumb', hand: 'left', icon: '👍' },
    { id: 'left_index', label: 'Left Index', hand: 'left', icon: '☝️' },
    { id: 'left_middle', label: 'Left Middle', hand: 'left', icon: '🖕' },
    { id: 'left_ring', label: 'Left Ring', hand: 'left', icon: '💍' },
    { id: 'left_pinky', label: 'Left Pinky', hand: 'left', icon: '🤙' }
  ];

  const handleStartCapture = () => {
    if (!selectedStudent) {
      alert('Please select a student first');
      return;
    }
    setCaptureStep(1);
  };

  const handleCaptureFinger = async (finger) => {
    setCurrentFinger(finger);
    setIsCapturing(true);

    // Simulate fingerprint capture from USB device
    // In production, integrate with fingerprint scanner SDK
    
    setTimeout(() => {
      const mockTemplate = `FP_TEMPLATE_${finger.id}_${Date.now()}`;
      const mockQuality = Math.floor(Math.random() * 30) + 70;

      setCapturedFingers(prev => ({
        ...prev,
        [finger.id]: {
          template: mockTemplate,
          quality: mockQuality,
          capturedAt: new Date().toISOString(),
          image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
        }
      }));

      setIsCapturing(false);
      setCurrentFinger(null);
    }, 2000);
  };

  const handleSaveFingerprints = async () => {
    const capturedCount = Object.keys(capturedFingers).length;
    
    if (capturedCount < 10) {
      alert(`Please capture all 10 fingerprints. ${10 - capturedCount} remaining.`);
      return;
    }

    const fingerprintData = {
      student_id: selectedStudent,
      right_thumb: capturedFingers.right_thumb?.template,
      right_index: capturedFingers.right_index?.template,
      right_middle: capturedFingers.right_middle?.template,
      right_ring: capturedFingers.right_ring?.template,
      right_pinky: capturedFingers.right_pinky?.template,
      left_thumb: capturedFingers.left_thumb?.template,
      left_index: capturedFingers.left_index?.template,
      left_middle: capturedFingers.left_middle?.template,
      left_ring: capturedFingers.left_ring?.template,
      left_pinky: capturedFingers.left_pinky?.template,
      quality_score: capturedFingers,
      captured_at: new Date().toISOString()
    };

    alert('All fingerprints saved successfully!');
    resetCapture();
  };

  const resetCapture = () => {
    setCaptureStep(0);
    setCapturedFingers({});
    setSelectedStudent('');
    setCurrentFinger(null);
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    student.id.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const capturedCount = Object.keys(capturedFingers).length;
  const progress = (capturedCount / 10) * 100;

  const selectedStudentData = students.find(s => s.id === selectedStudent);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 flex items-center space-x-3">
            <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
            </svg>
            <span>Biometric Capture System</span>
          </h1>
          <p className="text-gray-600 mt-2">Capture 10 fingerprints for student verification</p>
        </div>

        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center space-x-2 ${captureStep >= 0 ? 'text-indigo-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                captureStep >= 0 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-400'
              }`}>1</div>
              <span className="font-medium hidden sm:inline">Select Student</span>
            </div>
            <div className="w-16 h-1 bg-gray-300"></div>
            <div className={`flex items-center space-x-2 ${captureStep >= 1 ? 'text-indigo-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                captureStep >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-400'
              }`}>2</div>
              <span className="font-medium hidden sm:inline">Capture Fingerprints</span>
            </div>
            <div className="w-16 h-1 bg-gray-300"></div>
            <div className={`flex items-center space-x-2 ${captureStep >= 2 ? 'text-indigo-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                captureStep >= 2 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-400'
              }`}>3</div>
              <span className="font-medium hidden sm:inline">Save</span>
            </div>
          </div>
        </div>

        {/* Step 0: Student Selection */}
        {captureStep === 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-2xl mx-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Select Student</h2>
            
            <div className="mb-4">
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search by name or student ID..."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
              {filteredStudents.map(student => (
                <button
                  key={student.id}
                  onClick={() => setSelectedStudent(student.id)}
                  className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                    selectedStudent === student.id
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-300 hover:border-indigo-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-800">{student.name}</p>
                      <p className="text-sm text-gray-600">{student.id} • {student.department}</p>
                    </div>
                    <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                      {student.level} Level
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={handleStartCapture}
              disabled={!selectedStudent}
              className={`w-full py-4 rounded-lg font-semibold text-white transition-all ${
                selectedStudent
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              Start Fingerprint Capture
            </button>
          </div>
        )}

        {/* Step 1: Fingerprint Capture */}
        {captureStep === 1 && (
          <div className="space-y-6">
            {/* Progress Bar */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-800">Capture Progress</h3>
                <span className="text-sm font-medium text-indigo-600">{capturedCount} / 10 fingers</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            {/* Selected Student Info */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="font-semibold text-gray-800 mb-3">Student Information</h3>
              <div className="flex items-center space-x-4 p-4 bg-indigo-50 rounded-lg">
                <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  {selectedStudentData?.name.charAt(0) || '?'}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{selectedStudentData?.name}</p>
                  <p className="text-sm text-gray-600">{selectedStudent}</p>
                </div>
              </div>
            </div>

            {/* Fingerprint Capture Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Right Hand */}
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center space-x-2">
                  <span>🖐️</span>
                  <span>Right Hand</span>
                </h3>
                <div className="space-y-3">
                  {fingers.filter(f => f.hand === 'right').map(finger => (
                    <button
                      key={finger.id}
                      onClick={() => !capturedFingers[finger.id] && !isCapturing && handleCaptureFinger(finger)}
                      disabled={capturedFingers[finger.id] || isCapturing}
                      className={`w-full p-4 border-2 rounded-xl transition-all ${
                        capturedFingers[finger.id]
                          ? 'border-green-500 bg-green-50'
                          : currentFinger?.id === finger.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
                      } ${isCapturing && currentFinger?.id !== finger.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{finger.icon}</span>
                          <div className="text-left">
                            <p className="font-semibold text-gray-800">{finger.label}</p>
                            {capturedFingers[finger.id] && (
                              <p className="text-xs text-green-600">
                                Quality: {capturedFingers[finger.id].quality}%
                              </p>
                            )}
                            {currentFinger?.id === finger.id && (
                              <p className="text-xs text-blue-600 animate-pulse">Scanning...</p>
                            )}
                          </div>
                        </div>
                        {capturedFingers[finger.id] && (
                          <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Left Hand */}
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center space-x-2">
                  <span>🤚</span>
                  <span>Left Hand</span>
                </h3>
                <div className="space-y-3">
                  {fingers.filter(f => f.hand === 'left').map(finger => (
                    <button
                      key={finger.id}
                      onClick={() => !capturedFingers[finger.id] && !isCapturing && handleCaptureFinger(finger)}
                      disabled={capturedFingers[finger.id] || isCapturing}
                      className={`w-full p-4 border-2 rounded-xl transition-all ${
                        capturedFingers[finger.id]
                          ? 'border-green-500 bg-green-50'
                          : currentFinger?.id === finger.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
                      } ${isCapturing && currentFinger?.id !== finger.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{finger.icon}</span>
                          <div className="text-left">
                            <p className="font-semibold text-gray-800">{finger.label}</p>
                            {capturedFingers[finger.id] && (
                              <p className="text-xs text-green-600">
                                Quality: {capturedFingers[finger.id].quality}%
                              </p>
                            )}
                            {currentFinger?.id === finger.id && (
                              <p className="text-xs text-blue-600 animate-pulse">Scanning...</p>
                            )}
                          </div>
                        </div>
                        {capturedFingers[finger.id] && (
                          <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Scanning Animation */}
            {isCapturing && currentFinger && (
              <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    <div className="w-32 h-32 bg-blue-100 rounded-full flex items-center justify-center animate-pulse">
                      <svg className="w-16 h-16 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-gray-800 mb-2">Capturing {currentFinger.label}</p>
                    <p className="text-gray-600">Please place your finger firmly on the scanner</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={resetCapture}
                className="py-4 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFingerprints}
                disabled={capturedCount < 10}
                className={`py-4 rounded-xl font-semibold text-white transition-all ${
                  capturedCount === 10
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                Save Fingerprints ({capturedCount}/10)
              </button>
            </div>
          </div>
        )}

        {/* Instructions Panel */}
        <div className="mt-8 bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
          <h3 className="font-bold text-blue-900 mb-3 flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Capture Instructions</span>
          </h3>
          <ul className="space-y-2 text-blue-800 text-sm">
            <li className="flex items-start space-x-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Ensure the USB fingerprint scanner is properly connected before starting</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Clean the scanner surface and student's fingers for better quality</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Press finger firmly but gently on the scanner until capture is complete</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Capture quality should be above 70% for optimal verification</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>All 10 fingerprints must be captured before saving</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}