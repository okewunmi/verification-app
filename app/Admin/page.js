"use client"
import { useState, useEffect } from 'react';
import { 
  MdUploadFile, 
  MdFingerprint, 
  MdFace, 
  MdChecklist, 
  MdPersonAdd,
  MdDashboard,
  MdLogout,
  MdMenu,
  MdClose
} from 'react-icons/md';
import { FiClock, FiCalendar, FiUser } from 'react-icons/fi';

export default function AdminDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      setGreeting('Good Night');
    }
  }, [currentTime]);

  const formatDate = (date) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const dashboardCards = [
    {
      id: 1,
      title: 'Upload Course',
      description: 'Add new courses and materials',
      icon: <MdUploadFile className="w-8 h-8 text-black" />,
      color: 'from-blue-500 to-blue-600',
      hoverColor: 'hover:from-blue-600 hover:to-blue-700',
      link: '/admin/upload-course'
    },
    {
      id: 2,
      title: 'Verify by Fingerprint',
      description: 'Student fingerprint verification',
      icon: <MdFingerprint className="w-8 h-8 text-black" />,
      color: 'from-purple-500 to-purple-600',
      hoverColor: 'hover:from-purple-600 hover:to-purple-700',
      link: '/admin/verify-fingerprint'
    },
    {
      id: 3,
      title: 'Facial Recognition',
      description: 'Verify students by face ID',
      icon: <MdFace className="w-8 h-8 text-black" />,
      color: 'from-pink-500 to-pink-600',
      hoverColor: 'hover:from-pink-600 hover:to-pink-700',
      link: '/admin/facial-recognition'
    },
    {
      id: 4,
      title: 'Mark Attendance',
      description: 'Record student attendance',
      icon: <MdChecklist className="w-8 h-8 text-black" />,
      color: 'from-green-500 to-green-600',
      hoverColor: 'hover:from-green-600 hover:to-green-700',
      link: '/admin/mark-attendance'
    },
    {
      id: 5,
      title: 'Create Sub Admin',
      description: 'Add new admin accounts',
      icon: <MdPersonAdd className="w-8 h-8 text-black" />,
      color: 'from-orange-500 to-orange-600',
      hoverColor: 'hover:from-orange-600 hover:to-orange-700',
      link: '/admin/create-sub-admin'
    }
  ];

  const stats = [
    { label: 'Total Students', value: '1,234', icon: <FiUser /> },
    { label: 'Active Courses', value: '48', icon: <MdDashboard /> },
    { label: 'Today\'s Attendance', value: '892', icon: <MdChecklist /> }
  ];

  const handleCardClick = (link) => {
    console.log('Navigating to:', link);
    // In Next.js, use: router.push(link)
    alert(`Navigating to: ${link}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Sidebar for mobile */}
      <div className={`fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setSidebarOpen(false)}></div>
      
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                className="lg:hidden text-gray-600 hover:text-gray-900"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? <MdClose className="w-6 h-6" /> : <MdMenu className="w-6 h-6" />}
              </button>
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-2 rounded-lg">
                  <MdDashboard className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Admin Dashboard</h1>
              </div>
            </div>
            <button className="flex items-center space-x-2 text-gray-600 hover:text-red-600 transition-colors">
              <MdLogout className="w-5 h-5" />
              <span className="hidden sm:inline text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
        {/* Greeting Section */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">{greeting}, Admin! 👋</h2>
                <p className="text-indigo-100 text-sm sm:text-base">Welcome back to your dashboard</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-indigo-100">
                  <FiCalendar className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-xs sm:text-sm font-medium">{formatDate(currentTime)}</span>
                </div>
                <div className="flex items-center space-x-2 text-indigo-100">
                  <FiClock className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-xs sm:text-sm font-medium">{formatTime(currentTime)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-xl p-4 sm:p-6 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 font-medium">{stat.label}</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-800 mt-1">{stat.value}</p>
                </div>
                <div className="bg-indigo-100 p-3 rounded-lg text-indigo-600">
                  {stat.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Cards Grid */}
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {dashboardCards.map((card) => (
              <button
                key={card.id}
                onClick={() => handleCardClick(card.link)}
                className={`group relative bg-gradient-to-br ${card.color} ${card.hoverColor} rounded-2xl p-6 sm:p-8 text-white shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300`}
              >
                <div className="flex flex-col items-start space-y-4">
                  <div className="bg-white bg-opacity-20 p-3 sm:p-4 rounded-xl group-hover:bg-opacity-30 transition-all">
                    {card.icon}
                  </div>
                  <div className="text-left">
                    <h4 className="text-lg sm:text-xl font-bold mb-2">{card.title}</h4>
                    <p className="text-xs sm:text-sm text-white text-opacity-90">{card.description}</p>
                  </div>
                  <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="mt-6 sm:mt-8 bg-white rounded-2xl p-4 sm:p-6 shadow-md">
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Recent Activity</h3>
          <div className="space-y-3 sm:space-y-4">
            {[
              { action: 'New course uploaded', time: '2 hours ago', type: 'success' },
              { action: 'Student verified via fingerprint', time: '4 hours ago', type: 'info' },
              { action: 'Attendance marked for CS101', time: '6 hours ago', type: 'success' }
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-3 border-b last:border-b-0">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${activity.type === 'success' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                  <p className="text-sm sm:text-base text-gray-700">{activity.action}</p>
                </div>
                <span className="text-xs sm:text-sm text-gray-500">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
