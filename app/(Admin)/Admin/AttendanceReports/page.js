"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSessionAttendanceReport } from '@/lib/appwrite';

export default function AttendanceReports() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [courseCode, setCourseCode] = useState('');
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateReport = async () => {
    if (!courseCode.trim()) {
      alert('Please enter a course code');
      return;
    }

    setIsLoading(true);

    try {
      const result = await getSessionAttendanceReport(courseCode.toUpperCase(), selectedDate);
      
      if (result.success) {
        setReport(result);
      } else {
        alert(result.error || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (minutes) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Attendance Reports</span>
          </h1>
          <p className="text-gray-600 mt-2">View and analyze attendance data</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Generate Report</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Course Code</label>
              <input
                type="text"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
                placeholder="e.g., CSC301"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleGenerateReport}
                disabled={isLoading}
                className="w-full px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isLoading ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
          </div>
        </div>

        {report && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <p className="text-sm text-gray-600 mb-1">Total Students</p>
                <p className="text-3xl font-bold text-indigo-600">{report.stats.totalStudents}</p>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6">
                <p className="text-sm text-gray-600 mb-1">Present</p>
                <p className="text-3xl font-bold text-green-600">{report.stats.signedIn}</p>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6">
                <p className="text-sm text-gray-600 mb-1">Completed</p>
                <p className="text-3xl font-bold text-blue-600">{report.stats.signedOut}</p>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6">
                <p className="text-sm text-gray-600 mb-1">Attendance Rate</p>
                <p className="text-3xl font-bold text-purple-600">{report.stats.attendanceRate}%</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800">Attendance Details</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {courseCode} • {new Date(selectedDate).toLocaleDateString()}
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Matric No.</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sign In</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sign Out</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {report.data.map((record) => (
                      <tr key={record.$id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {record.matricNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {/* You'll need to fetch student names separately or include in the query */}
                          Student
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {record.signInTime ? new Date(record.signInTime).toLocaleTimeString() : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {record.signOutTime ? new Date(record.signOutTime).toLocaleTimeString() : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDuration(record.totalDuration)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {record.signOutTime ? (
                            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Completed
                            </span>
                          ) : record.signInTime ? (
                            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              Signed In
                            </span>
                          ) : (
                            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                              Absent
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {!report && (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <svg className="w-32 h-32 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg font-medium text-gray-600">Enter course code and date to generate report</p>
          </div>
        )}
      </div>
    </div>
  );
}