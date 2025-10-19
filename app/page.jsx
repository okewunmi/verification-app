// "use client"
// import { useState } from 'react';
// import { MdLogin, MdPerson, MdLock, MdVisibility, MdVisibilityOff } from 'react-icons/md';
// import { AiOutlineLoading3Quarters } from 'react-icons/ai';
// import { useRouter } from 'next/navigation';
// import Link from 'next/link';
// // Import login function from lib/appwrite
// import { login } from '@/lib/appwrite';

// export default function LoginForm() {
//   const router = useRouter();
//   const [formData, setFormData] = useState({
//     email: '',
//     password: ''
//   });
//   const [showPassword, setShowPassword] = useState(false);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState('');
//   const [success, setSuccess] = useState(false);

//   const handleChange = (e) => {
//     setFormData({
//       ...formData,
//       [e.target.name]: e.target.value
//     });
//     setError('');
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError('');
//     setIsLoading(true);

//     try {
//       // Call the login function from lib/appwrite
//       const response = await login(formData.email, formData.password);
//       setSuccess(true);
//       console.log('Login successful:', response);
//       // Redirect or handle successful login
//        router.push('/Admin'); 
//     } catch (err) {
//       setError(err.message || 'Login failed. Please check your credentials.');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div className="h-screen max-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
//       <div className="w-full max-w-sm my-auto">
//         <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl overflow-hidden">
//           <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 sm:p-5 text-white">
//             <div className="flex justify-center mb-3">
//               <div className="bg-white bg-opacity-20 backdrop-blur-sm p-2 rounded-full">
//                 <MdLogin className="w-6 h-6 sm:w-7 sm:h-7 text-gray-700" />
//               </div>
//             </div>
//             <h2 className="text-2xl sm:text-2xl font-bold text-center mb-1">Welcome Back</h2>
//             <p className="text-indigo-100 text-center text-xs sm:text-sm">Sign in to continue to your account</p>
//           </div>

//           <div className="p-5 sm:p-6">
//             {success && (
//               <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-xs sm:text-sm">
//                 Login successful! Redirecting...
//               </div>
//             )}

//             {error && (
//               <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs sm:text-sm">
//                 {error}
//               </div>
//             )}

//             <div className="space-y-4">
//               <div>
//                 <label htmlFor="username" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
//                   Email
//                 </label>
//                 <div className="relative">
//                   <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none text-gray-400">
//                     <MdPerson className="h-4 w-4 sm:h-5 sm:w-5" />
//                   </div>
//                   <input
//                     id="email"
//                     name="email"
//                     type="text"
//                     required
//                     value={formData.email}
//                     onChange={handleChange}
//                     className="block w-full pl-8 sm:pl-10 pr-3 py-2 sm:py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-black"
//                     placeholder="Enter your email"
//                   />
//                 </div>
//               </div>

//               <div>
//                 <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
//                   Password
//                 </label>
//                 <div className="relative">
//                   <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none text-gray-400">
//                     <MdLock className="h-4 w-4 sm:h-5 sm:w-5" />
//                   </div>
//                   <input
//                     id="password"
//                     name="password"
//                     type={showPassword ? 'text' : 'password'}
//                     required
//                     value={formData.password}
//                     onChange={handleChange}
//                     onKeyDown={(e) => {
//                       if (e.key === 'Enter') {
//                         handleSubmit(e);
//                       }
//                     }}
//                     className="block w-full pl-8 sm:pl-10 pr-9 sm:pr-10 py-2 sm:py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-black"
//                     placeholder="Enter your password"
//                   />
//                   <button
//                     type="button"
//                     onClick={() => setShowPassword(!showPassword)}
//                     className="absolute inset-y-0 right-0 pr-2.5 sm:pr-3 flex items-center text-gray-400 hover:text-gray-600"
//                   >
//                     {showPassword ? (
//                       <MdVisibilityOff className="h-4 w-4 sm:h-5 sm:w-5" />
//                     ) : (
//                       <MdVisibility className="h-4 w-4 sm:h-5 sm:w-5" />
//                     )}
//                   </button>
//                 </div>
//               </div>

//               <button
//                 onClick={handleSubmit}
//                 disabled={isLoading}
//                 className="w-full flex justify-center items-center py-2.5 sm:py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
//               >
//                 {isLoading ? (
//                   <>
//                     <AiOutlineLoading3Quarters className="animate-spin h-4 w-4 sm:h-5 sm:w-5 mr-2" />
//                     Signing in...
//                   </>
//                 ) : (
//                   <>
//                     <MdLogin className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
//                     Sign In
//                   </>
//                 )}
//               </button>
//             </div>
//           </div>
//         </div>

//         <p className="mt-3 sm:mt-4 text-center text-xs text-gray-500">
//           Protected by industry-standard encryption
//         </p>
//       </div>
//     </div>
//   );
// }

"use client"
import { useState } from 'react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-800">FTP Fingerprint</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Biometric Attendance
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
              Made Simple
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12">
            Secure, efficient, and reliable fingerprint-based attendance system for educational institutions
          </p>
        </div>

        {/* Portal Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Admin Portal Card */}
          <Link href="/admin-login">
            <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all cursor-pointer border-2 border-transparent hover:border-indigo-200 group">
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-3">Admin Portal</h2>
                <p className="text-gray-600 text-center mb-6">
                  Manage student records, capture biometric data, and monitor attendance
                </p>
                <div className="flex items-center text-indigo-600 font-semibold group-hover:text-indigo-700">
                  <span>Access Admin Panel</span>
                  <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>

          {/* Student Portal Card */}
          <Link href="/student-login">
            <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all cursor-pointer border-2 border-transparent hover:border-blue-200 group">
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-3">Student Portal</h2>
                <p className="text-gray-600 text-center mb-6">
                  View your profile, check attendance records, and update your information
                </p>
                <div className="flex items-center text-blue-600 font-semibold group-hover:text-blue-700">
                  <span>Access Student Panel</span>
                  <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Features */}
        <div className="mt-20 grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Secure</h3>
            <p className="text-gray-600">Advanced biometric authentication ensures data security</p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Fast</h3>
            <p className="text-gray-600">Quick fingerprint verification in seconds</p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Accurate</h3>
            <p className="text-gray-600">Real-time attendance tracking and reporting</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-50 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-gray-600">
            © 2025 FTP Fingerprint System. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}