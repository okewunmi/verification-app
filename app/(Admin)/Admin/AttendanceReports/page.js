
"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCourseAttendanceReport } from '@/lib/appwrite'; // ← Changed import

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
      const result = await getCourseAttendanceReport(courseCode.toUpperCase(), selectedDate); // ← Changed function
      
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
  
const exportToCSV = () => {
  if (!report || !report.report || report.report.length === 0) {
    alert('No data to export');
    return;
  }

  // Prepare CSV headers
  const headers = [
    'Matric Number',
    'First Name',
    'Surname',
    'Sign In Time',
    'Sign Out Time',
    'Duration',
    'Status',
    'Finger Used'
  ];

  // Prepare CSV rows
  const rows = report.report.map(item => {
    const student = item.student;
    const signInTime = item.signInTime 
      ? new Date(item.signInTime).toLocaleString() 
      : '-';
    const signOutTime = item.signOutTime 
      ? new Date(item.signOutTime).toLocaleString() 
      : '-';
    const duration = formatDuration(item.duration);
    const status = item.signedOut 
      ? 'Completed' 
      : item.attended 
        ? 'Signed In' 
        : 'Absent';
    const fingerUsed = item.fingerUsed || '-';

    return [
      student.matricNumber,
      student.firstName || '',
      student.surname || '',
      signInTime,
      signOutTime,
      duration,
      status,
      fingerUsed
    ];
  });

  // Combine headers and rows
  const csvContent = [
    // Title rows
    [`Attendance Report - ${report.courseCode}`],
    [`Date: ${new Date(report.date).toLocaleDateString()}`],
    [`Generated: ${new Date().toLocaleString()}`],
    [],
    // Statistics
    [`Total Students: ${report.stats.totalStudents}`],
    [`Present: ${report.stats.present}`],
    [`Absent: ${report.stats.absent}`],
    [`Signed Out: ${report.stats.signedOut}`],
    [`Attendance Rate: ${report.stats.attendanceRate}%`],
    [],
    // Data table
    headers,
    ...rows
  ];

  // Convert to CSV string
  const csv = csvContent
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `attendance_${report.courseCode}_${report.date}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

  // Helper to get student name
  const getStudentName = (student) => {
    if (!student) return 'Unknown';
    return `${student.firstName || ''} ${student.surname || ''}`.trim();
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
          <p className="text-gray-600 mt-2">View and analyze attendance data by course and date</p>
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
                placeholder="e.g., CSC301 or EEE599"
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
            {/* Header with course info */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                {report.courseCode} - {new Date(report.date).toLocaleDateString()}
              </h2>
              <p className="text-gray-600 mb-4">Attendance Report Summary</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-indigo-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Total Students</p>
                  <p className="text-3xl font-bold text-indigo-600">{report.stats.totalStudents}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Present</p>
                  <p className="text-3xl font-bold text-green-600">{report.stats.present}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Signed Out</p>
                  <p className="text-3xl font-bold text-blue-600">{report.stats.signedOut}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Attendance Rate</p>
                  <p className="text-3xl font-bold text-purple-600">{report.stats.attendanceRate}%</p>
                </div>
              </div>
            </div>

            {/* Attendance Details Table */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800">Attendance Details</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Showing {report.report.length} students
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
                    {report.report.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.student.matricNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {getStudentName(item.student)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {item.signInTime ? new Date(item.signInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {item.signOutTime ? new Date(item.signOutTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDuration(item.duration)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {item.signedOut ? (
                            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Completed
                            </span>
                          ) : item.attended ? (
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

            {/* Export/Print Options */}
            {/* <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Export Options</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    // You can implement export to CSV/PDF here
                    alert('Export feature coming soon!');
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Export to CSV
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Print Report
                </button>
                <button
                  onClick={() => setReport(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  New Report
                </button>
              </div>
            </div> */}
             <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Export Options</h3>
              <div className="flex flex-wrap gap-3">
                <button
                onClick={exportToCSV}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export to CSV
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print Report
                </button>
                <button
                  onClick={() => setReport(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  New Report
                </button>
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
            <p className="text-sm text-gray-500 mt-2">Example: EEE599, CSC301, etc.</p>
          </div>
        )}
      </div>
    </div>
  );
}