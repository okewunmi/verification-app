"use client"
import { useState } from 'react';
import { 
  Upload,
  BookOpen,
  Plus,
  Save,
  X,
  Edit,
  Trash2,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
export default function CourseUploadPage() {
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [courses, setCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState(null);

  // Form state for new course
  const [newCourse, setNewCourse] = useState({
    courseTitle: '',
    courseCode: '',
    courseUnit: ''
  });

  // Sample data - replace with Supabase fetch
  const semesters = [
    { id: '1', name: 'First Semester', value: 'First' },
    { id: '2', name: 'Second Semester', value: 'Second' }
  ];

  const levels = [
    { id: '1', name: '100 Level', value: '100' },
    { id: '2', name: '200 Level', value: '200' },
    { id: '3', name: '300 Level', value: '300' },
    { id: '4', name: '400 Level', value: '400' },
    { id: '5', name: '500 Level', value: '500' }
  ];

  const departments = [
    { id: '1', name: 'Computer Science', value: 'Computer Science' },
    { id: '2', name: 'Software Engineering', value: 'Software Engineering' },
    { id: '3', name: 'Information Technology', value: 'Information Technology' },
    { id: '4', name: 'Cyber Security', value: 'Cyber Security' },
    { id: '5', name: 'Data Science', value: 'Data Science' }
  ];

  // Mock existing courses
  const [existingCourses] = useState([
    { id: '1', title: 'Introduction to Programming', code: 'CS101', unit: 3, semester: 'First', level: '100', department: 'Computer Science' },
    { id: '2', title: 'Data Structures', code: 'CS201', unit: 4, semester: 'First', level: '200', department: 'Computer Science' },
    { id: '3', title: 'Database Systems', code: 'CS301', unit: 3, semester: 'Second', level: '300', department: 'Computer Science' }
  ]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAddCourse = () => {
    if (!newCourse.courseTitle || !newCourse.courseCode || !newCourse.courseUnit) {
      showNotification('Please fill all course fields', 'error');
      return;
    }

    if (!selectedSemester || !selectedLevel || !selectedDepartment) {
      showNotification('Please select semester, level, and department', 'error');
      return;
    }

    const course = {
      id: Date.now().toString(),
      title: newCourse.courseTitle,
      code: newCourse.courseCode.toUpperCase(),
      unit: parseInt(newCourse.courseUnit),
      semester: selectedSemester,
      level: selectedLevel,
      department: selectedDepartment,
      status: 'pending'
    };

    setCourses([...courses, course]);
    setNewCourse({ courseTitle: '', courseCode: '', courseUnit: '' });
    showNotification('Course added to list successfully', 'success');
  };

  const handleRemoveCourse = (id) => {
    setCourses(courses.filter(c => c.id !== id));
    showNotification('Course removed from list', 'success');
  };

  const handleSaveAllCourses = async () => {
    if (courses.length === 0) {
      showNotification('No courses to save', 'error');
      return;
    }

    // Here you would save to Supabase
    // const { data, error } = await supabase.from('courses').insert(courses);
    
    showNotification(`${courses.length} course(s) uploaded successfully!`, 'success');
    setCourses([]);
    setShowCreateForm(false);
  };

  const filteredExistingCourses = existingCourses.filter(course => 
    course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center space-x-3 px-6 py-4 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white animate-slide-in`}>
          {notification.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span className="font-medium">{notification.message}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
          onClick={() => router.push("/Admin")}
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center space-x-3">
                <Upload className="w-8 h-8 text-indigo-600" />
                <span>Course Management</span>
              </h1>
              <p className="text-gray-600 mt-1">Upload and manage courses for students</p>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
            >
              <Plus className="w-5 h-5" />
              <span>Create New Course</span>
            </button>
          </div>
        </div>

        {/* Create Course Form */}
        {showCreateForm && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border-2 border-indigo-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
                <BookOpen className="w-6 h-6 text-indigo-600" />
                <span>Create Course</span>
              </h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Filter Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Semester *
                </label>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select Semester</option>
                  {semesters.map(sem => (
                    <option key={sem.id} value={sem.value}>{sem.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Level *
                </label>
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select Level</option>
                  {levels.map(level => (
                    <option key={level.id} value={level.value}>{level.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Department *
                </label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.value}>{dept.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Course Details Form */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Course Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Course Title *
                  </label>
                  <input
                    type="text"
                    value={newCourse.courseTitle}
                    onChange={(e) => setNewCourse({...newCourse, courseTitle: e.target.value})}
                    placeholder="e.g., Introduction to Programming"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Course Code *
                  </label>
                  <input
                    type="text"
                    value={newCourse.courseCode}
                    onChange={(e) => setNewCourse({...newCourse, courseCode: e.target.value.toUpperCase()})}
                    placeholder="e.g., CS101"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent uppercase"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Course Unit *
                  </label>
                  <input
                    type="number"
                    value={newCourse.courseUnit}
                    onChange={(e) => setNewCourse({...newCourse, courseUnit: e.target.value})}
                    placeholder="e.g., 3"
                    min="1"
                    max="6"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              <button
                onClick={handleAddCourse}
                className="flex items-center space-x-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>Add Course to List</span>
              </button>
            </div>

            {/* Added Courses List */}
            {courses.length > 0 && (
              <div className="mt-6 border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Added Courses ({courses.length})
                  </h3>
                  <button
                    onClick={handleSaveAllCourses}
                    className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Save className="w-5 h-5" />
                    <span>Save All Courses</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {courses.map((course) => (
                    <div
                      key={course.id}
                      className="flex items-center justify-between p-4 bg-indigo-50 rounded-lg border border-indigo-200"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div>
                            <p className="font-semibold text-gray-800">{course.title}</p>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className="text-sm text-gray-600">
                                <span className="font-medium">Code:</span> {course.code}
                              </span>
                              <span className="text-sm text-gray-600">
                                <span className="font-medium">Unit:</span> {course.unit}
                              </span>
                              <span className="text-sm px-2 py-1 bg-white rounded text-indigo-600">
                                {course.semester} Semester
                              </span>
                              <span className="text-sm px-2 py-1 bg-white rounded text-purple-600">
                                {course.level} Level
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveCourse(course.id)}
                        className="text-red-600 hover:text-red-800 ml-4"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Existing Courses */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
            <h2 className="text-xl font-bold text-gray-800">Existing Courses</h2>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search courses..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Course Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Course Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Unit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Semester
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredExistingCourses.map((course) => (
                  <tr key={course.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-semibold text-indigo-600">{course.code}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-800">{course.title}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-gray-600">{course.unit}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                        {course.semester}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm">
                        {course.level}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-600 text-sm">{course.department}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button className="text-blue-600 hover:text-blue-800">
                          <Edit className="w-5 h-5" />
                        </button>
                        <button className="text-red-600 hover:text-red-800">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}