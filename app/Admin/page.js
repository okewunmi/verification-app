// "use client"
// import { useState, useEffect } from 'react';
// import { 
//   MdUploadFile, 
//   MdFingerprint, 
//   MdFace, 
//   MdChecklist, 
//   MdPersonAdd,
//   MdDashboard,
//   MdLogout,
//   MdMenu,
//   MdClose
// } from 'react-icons/md';
// import { FiClock, FiCalendar, FiUser } from 'react-icons/fi';

// export default function AdminDashboard() {
//   const [currentTime, setCurrentTime] = useState(new Date());
//   const [greeting, setGreeting] = useState('');
//   const [sidebarOpen, setSidebarOpen] = useState(false);

//   useEffect(() => {
//     const timer = setInterval(() => {
//       setCurrentTime(new Date());
//     }, 1000);

//     return () => clearInterval(timer);
//   }, []);

//   useEffect(() => {
//     const hour = currentTime.getHours();
//     if (hour >= 5 && hour < 12) {
//       setGreeting('Good Morning');
//     } else if (hour >= 12 && hour < 17) {
//       setGreeting('Good Afternoon');
//     } else if (hour >= 17 && hour < 21) {
//       setGreeting('Good Evening');
//     } else {
//       setGreeting('Good Night');
//     }
//   }, [currentTime]);

//   const formatDate = (date) => {
//     const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
//     return date.toLocaleDateString('en-US', options);
//   };

//   const formatTime = (date) => {
//     return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
//   };

//   const dashboardCards = [
//     {
//       id: 1,
//       title: 'Upload Course',
//       description: 'Add new courses and materials',
//       icon: <MdUploadFile className="w-8 h-8 text-black" />,
//       color: 'from-blue-500 to-blue-600',
//       hoverColor: 'hover:from-blue-600 hover:to-blue-700',
//       link: '/admin/upload-course'
//     },
//     {
//       id: 2,
//       title: 'Verify by Fingerprint',
//       description: 'Student fingerprint verification',
//       icon: <MdFingerprint className="w-8 h-8 text-black" />,
//       color: 'from-purple-500 to-purple-600',
//       hoverColor: 'hover:from-purple-600 hover:to-purple-700',
//       link: '/admin/verify-fingerprint'
//     },
//     {
//       id: 3,
//       title: 'Facial Recognition',
//       description: 'Verify students by face ID',
//       icon: <MdFace className="w-8 h-8 text-black" />,
//       color: 'from-pink-500 to-pink-600',
//       hoverColor: 'hover:from-pink-600 hover:to-pink-700',
//       link: '/admin/facial-recognition'
//     },
//     {
//       id: 4,
//       title: 'Mark Attendance',
//       description: 'Record student attendance',
//       icon: <MdChecklist className="w-8 h-8 text-black" />,
//       color: 'from-green-500 to-green-600',
//       hoverColor: 'hover:from-green-600 hover:to-green-700',
//       link: '/admin/mark-attendance'
//     },
//     {
//       id: 5,
//       title: 'Create Sub Admin',
//       description: 'Add new admin accounts',
//       icon: <MdPersonAdd className="w-8 h-8 text-black" />,
//       color: 'from-orange-500 to-orange-600',
//       hoverColor: 'hover:from-orange-600 hover:to-orange-700',
//       link: '/admin/create-sub-admin'
//     }
//   ];

//   const stats = [
//     { label: 'Total Students', value: '1,234', icon: <FiUser /> },
//     { label: 'Active Courses', value: '48', icon: <MdDashboard /> },
//     { label: 'Today\'s Attendance', value: '892', icon: <MdChecklist /> }
//   ];

//   const handleCardClick = (link) => {
//     console.log('Navigating to:', link);
//     // In Next.js, use: router.push(link)
//     alert(`Navigating to: ${link}`);
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
//       {/* Sidebar for mobile */}
//       <div className={`fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setSidebarOpen(false)}></div>
      
//       {/* Header */}
//       <header className="bg-white shadow-sm sticky top-0 z-30">
//         <div className="px-4 sm:px-6 lg:px-8 py-4">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center space-x-4">
//               <button 
//                 className="lg:hidden text-gray-600 hover:text-gray-900"
//                 onClick={() => setSidebarOpen(!sidebarOpen)}
//               >
//                 {sidebarOpen ? <MdClose className="w-6 h-6" /> : <MdMenu className="w-6 h-6" />}
//               </button>
//               <div className="flex items-center space-x-3">
//                 <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-2 rounded-lg">
//                   <MdDashboard className="w-6 h-6 text-white" />
//                 </div>
//                 <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Admin Dashboard</h1>
//               </div>
//             </div>
//             <button className="flex items-center space-x-2 text-gray-600 hover:text-red-600 transition-colors">
//               <MdLogout className="w-5 h-5" />
//               <span className="hidden sm:inline text-sm font-medium">Logout</span>
//             </button>
//           </div>
//         </div>
//       </header>

//       {/* Main Content */}
//       <main className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
//         {/* Greeting Section */}
//         <div className="mb-6 sm:mb-8">
//           <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
//             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
//               <div>
//                 <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">{greeting}, Admin! 👋</h2>
//                 <p className="text-indigo-100 text-sm sm:text-base">Welcome back to your dashboard</p>
//               </div>
//               <div className="space-y-2">
//                 <div className="flex items-center space-x-2 text-indigo-100">
//                   <FiCalendar className="w-4 h-4 sm:w-5 sm:h-5" />
//                   <span className="text-xs sm:text-sm font-medium">{formatDate(currentTime)}</span>
//                 </div>
//                 <div className="flex items-center space-x-2 text-indigo-100">
//                   <FiClock className="w-4 h-4 sm:w-5 sm:h-5" />
//                   <span className="text-xs sm:text-sm font-medium">{formatTime(currentTime)}</span>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Stats Cards */}
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
//           {stats.map((stat, index) => (
//             <div key={index} className="bg-white rounded-xl p-4 sm:p-6 shadow-md hover:shadow-lg transition-shadow">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-xs sm:text-sm text-gray-600 font-medium">{stat.label}</p>
//                   <p className="text-2xl sm:text-3xl font-bold text-gray-800 mt-1">{stat.value}</p>
//                 </div>
//                 <div className="bg-indigo-100 p-3 rounded-lg text-indigo-600">
//                   {stat.icon}
//                 </div>
//               </div>
//             </div>
//           ))}
//         </div>

//         {/* Action Cards Grid */}
//         <div>
//           <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6">Quick Actions</h3>
//           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
//             {dashboardCards.map((card) => (
//               <button
//                 key={card.id}
//                 onClick={() => handleCardClick(card.link)}
//                 className={`group relative bg-gradient-to-br ${card.color} ${card.hoverColor} rounded-2xl p-6 sm:p-8 text-white shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300`}
//               >
//                 <div className="flex flex-col items-start space-y-4">
//                   <div className="bg-white bg-opacity-20 p-3 sm:p-4 rounded-xl group-hover:bg-opacity-30 transition-all">
//                     {card.icon}
//                   </div>
//                   <div className="text-left">
//                     <h4 className="text-lg sm:text-xl font-bold mb-2">{card.title}</h4>
//                     <p className="text-xs sm:text-sm text-white text-opacity-90">{card.description}</p>
//                   </div>
//                   <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
//                     <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
//                     </svg>
//                   </div>
//                 </div>
//               </button>
//             ))}
//           </div>
//         </div>

//         {/* Recent Activity Section */}
//         <div className="mt-6 sm:mt-8 bg-white rounded-2xl p-4 sm:p-6 shadow-md">
//           <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Recent Activity</h3>
//           <div className="space-y-3 sm:space-y-4">
//             {[
//               { action: 'New course uploaded', time: '2 hours ago', type: 'success' },
//               { action: 'Student verified via fingerprint', time: '4 hours ago', type: 'info' },
//               { action: 'Attendance marked for CS101', time: '6 hours ago', type: 'success' }
//             ].map((activity, index) => (
//               <div key={index} className="flex items-center justify-between py-3 border-b last:border-b-0">
//                 <div className="flex items-center space-x-3">
//                   <div className={`w-2 h-2 rounded-full ${activity.type === 'success' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
//                   <p className="text-sm sm:text-base text-gray-700">{activity.action}</p>
//                 </div>
//                 <span className="text-xs sm:text-sm text-gray-500">{activity.time}</span>
//               </div>
//             ))}
//           </div>
//         </div>
//       </main>
//     </div>
//   );
// }


"use client"
import { useState, useEffect } from 'react';
import { 
  Upload,
  Fingerprint,
  User,
  CheckSquare,
  UserPlus,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  Trash2,
  Edit,
  GraduationCap,
  Users,
  BookOpen,
  ShieldCheck,
  Clock,
  Calendar,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

export default function AdminDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [coursesExpanded, setCoursesExpanded] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const hour = currentTime.getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting('Good Morning');
    } else if (hour >= 12 && hour < 17) {
      setGreeting('Good Afternoon');
    } else if (hour >= 17 && hour < 21) {
      setGreeting('Good Evening');
    } else {
      setGreeting('Good Day');
    }
  }, [currentTime]);

  const formatDate = (date) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const menuItems = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      link: '/admin/dashboard'
    },
    {
      id: 'students',
      title: 'Students',
      icon: <Users className="w-5 h-5" />,
      link: '/admin/students'
    },
    {
      id: 'courses',
      title: 'Courses',
      icon: <BookOpen className="w-5 h-5" />,
       link: '/CourseUpload'
      // hasSubmenu: true,
      // submenu: [
      //   { id: 'upload', title: 'Upload Course', icon: <Upload className="w-4 h-4" />, link: '/admin/courses/upload' },
      //   { id: 'manage', title: 'Manage Courses', icon: <Edit className="w-4 h-4" />, link: '/admin/courses/manage' },
      //   { id: 'delete', title: 'Delete Course', icon: <Trash2 className="w-4 h-4" />, link: '/admin/courses/delete' }
      // ]
    },
    {
      id: 'verify',
      title: 'Verify Student',
      icon: <ShieldCheck className="w-5 h-5" />,
      link: '/admin/verify'
    },
    {
      id: 'attendance',
      title: 'Attendance',
      icon: <CheckSquare className="w-5 h-5" />,
      link: '/admin/attendance'
    },
    {
      id: 'exam-sessions',
      title: 'Exam Sessions',
      icon: <GraduationCap className="w-5 h-5" />,
      link: '/admin/exam-sessions'
    },
    {
      id: 'sub-admin',
      title: 'Sub Admin',
      icon: <UserPlus className="w-5 h-5" />,
      link: '/admin/sub-admin'
    }
  ];

  const stats = [
    { label: 'Total Students', value: '1,234', icon: <User className="w-5 h-5" />, color: 'bg-blue-100 text-blue-600' },
    { label: 'Active Courses', value: '48', icon: <BookOpen className="w-5 h-5" />, color: 'bg-green-100 text-green-600' },
    { label: 'Verified Students', value: '892', icon: <Fingerprint className="w-5 h-5" />, color: 'bg-purple-100 text-purple-600' },
    { label: 'Upcoming Exams', value: '12', icon: <GraduationCap className="w-5 h-5" />, color: 'bg-orange-100 text-orange-600' }
  ];

  const handleMenuClick = (menuId) => {
    if (menuId === 'courses') {
      setCoursesExpanded(!coursesExpanded);
    } else {
      setActiveMenu(menuId);
      setSidebarOpen(false);
    }
  };

  const handleSubmenuClick = (parentId, submenuId) => {
    setActiveMenu(`${parentId}-${submenuId}`);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Sidebar Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Fingerprint className="w-8 h-8 text-white" />
              <div className="hidden lg:block">
                <h2 className="text-white font-bold text-lg">Exam Auth</h2>
                <p className="text-indigo-200 text-xs">Admin Panel</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Sidebar Menu */}
        <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100vh-120px)]">
          {menuItems.map((item) => (
            <div key={item.id}>
              <button
                onClick={() => handleMenuClick(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
                  activeMenu === item.id 
                    ? 'bg-indigo-100 text-indigo-600' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {item.icon}
                  <span className="font-medium hidden lg:block">{item.title}</span>
                </div>
                {item.hasSubmenu && (
                  <span className="hidden lg:block">
                    {coursesExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </span>
                )}
              </button>
              
              {/* Submenu */}
              {item.hasSubmenu && coursesExpanded && (
                <div className="ml-4 mt-2 space-y-1 hidden lg:block">
                  {item.submenu.map((subitem) => (
                    <button
                      key={subitem.id}
                      onClick={() => handleSubmenuClick(item.id, subitem.id)}
                      className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-sm transition-all ${
                        activeMenu === `${item.id}-${subitem.id}`
                          ? 'bg-indigo-50 text-indigo-600'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {subitem.icon}
                      <span>{subitem.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
          <button className="w-full flex items-center justify-center lg:justify-start space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-all">
            <LogOut className="w-5 h-5" />
            <span className="font-medium hidden lg:block">Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden transition-opacity ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`} 
        onClick={() => setSidebarOpen(false)}
      ></div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button 
                  className="lg:hidden text-gray-600 hover:text-gray-900"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                  <Menu className="w-6 h-6" />
                </button>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Admin Dashboard</h1>
              </div>
              <div className="flex items-center space-x-4">
                <div className="hidden sm:flex items-center space-x-2 text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">{formatTime(currentTime)}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl mx-auto w-full">
          {/* Greeting Section */}
          <div className="mb-6 sm:mb-8">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">{greeting}, Admin! 👋</h2>
                  <p className="text-indigo-100 text-sm sm:text-base">5 Fingerprint Based Exam Hall Authentication System</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-indigo-100">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-xs sm:text-sm font-medium">{formatDate(currentTime)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white rounded-xl p-4 sm:p-6 shadow-md hover:shadow-lg transition-shadow">
                <div className="flex flex-col items-start space-y-3">
                  <div className={`${stat.color} p-3 rounded-lg`}>
                    {stat.icon}
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600 font-medium">{stat.label}</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-800 mt-1">{stat.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl p-6 shadow-md mb-6">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <button className="flex flex-col items-center justify-center p-4 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors">
                <UserPlus className="w-8 h-8 text-blue-600 mb-2" />
                <span className="text-sm font-medium text-gray-700">Add Student</span>
              </button>
              <button className="flex flex-col items-center justify-center p-4 rounded-xl bg-green-50 hover:bg-green-100 transition-colors">
                <Upload className="w-8 h-8 text-green-600 mb-2" />
                <span className="text-sm font-medium text-gray-700">Upload Course</span>
              </button>
              <button className="flex flex-col items-center justify-center p-4 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors">
                <Fingerprint className="w-8 h-8 text-purple-600 mb-2" />
                <span className="text-sm font-medium text-gray-700">Verify Student</span>
              </button>
              <button className="flex flex-col items-center justify-center p-4 rounded-xl bg-orange-50 hover:bg-orange-100 transition-colors">
                <GraduationCap className="w-8 h-8 text-orange-600 mb-2" />
                <span className="text-sm font-medium text-gray-700">Exam Session</span>
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-md">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Recent Activity</h3>
            <div className="space-y-3 sm:space-y-4">
              {[
                { action: 'New student profile created', student: 'John Doe', time: '2 hours ago', type: 'success' },
                { action: 'Student fingerprints captured', student: 'Jane Smith', time: '4 hours ago', type: 'info' },
                { action: 'Course uploaded: CS301', time: '6 hours ago', type: 'success' },
                { action: 'Student verified for exam', student: 'Mike Johnson', time: '8 hours ago', type: 'success' }
              ].map((activity, index) => (
                <div key={index} className="flex items-center justify-between py-3 border-b last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${activity.type === 'success' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                    <div>
                      <p className="text-sm sm:text-base text-gray-700 font-medium">{activity.action}</p>
                      {activity.student && <p className="text-xs text-gray-500">{activity.student}</p>}
                    </div>
                  </div>
                  <span className="text-xs sm:text-sm text-gray-500">{activity.time}</span>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}