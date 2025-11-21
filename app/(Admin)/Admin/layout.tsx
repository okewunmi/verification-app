// 'use client';

// import { useEffect } from 'react';
// import { useRouter } from 'next/navigation';
// import { AdminAuthProvider, useAdminAuth } from '@/context/AdminAuthContext';

// interface AdminLayoutContentProps {
//   children: React.ReactNode;
// }

// function AdminLayoutContent({ children }: AdminLayoutContentProps) {
//   const { admin, loading, logout } = useAdminAuth();
//   const router = useRouter();

//   useEffect(() => {
//     if (!loading && !admin) {
//       router.push('/admin-login');
//     }
//   }, [admin, loading, router]);

//   // Redirect to home if already logged in
//   useEffect(() => {
//     if (!loading && admin) {
//       router.push('/Admin'); // or '/Admin/dashboard' - change to your admin home route
//     }
//   }, [admin, loading, router]);

//   if (loading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-gray-50">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
//           <p className="text-gray-600 font-medium">Loading...</p>
//         </div>
//       </div>
//     );
//   }

//   if (!admin) {
//     return null;
//   }

//   return <>{children}</>;
// }

// interface AdminLayoutProps {
//   children: React.ReactNode;
// }

// export default function AdminLayout({ children }: AdminLayoutProps) {
//   return (
//     <AdminAuthProvider>
//       <AdminLayoutContent>{children}</AdminLayoutContent>
//     </AdminAuthProvider>
//   );
// }



'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AdminAuthProvider, useAdminAuth } from '@/context/AdminAuthContext';

interface AdminLayoutContentProps {
  children: React.ReactNode;
}

function AdminLayoutContent({ children }: AdminLayoutContentProps) {
  const { admin, loading, logout } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname(); // Get current path

  useEffect(() => {
    console.log('🔐 Admin Layout Check:', {
      loading,
      admin: admin?.email || 'none',
      pathname
    });

    // Only redirect to login if NOT authenticated
    if (!loading && !admin) {
      console.log('❌ Not authenticated, redirecting to login');
      router.push('/admin-login');
    }
  }, [admin, loading, router, pathname]);

  // ❌ REMOVED THIS - It was causing the redirect loop!
  // useEffect(() => {
  //   if (!loading && admin) {
  //     router.push('/Admin');
  //   }
  // }, [admin, loading, router]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Show nothing while redirecting to login
  if (!admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 font-medium">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Render children if authenticated
  return <>{children}</>;
}

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AdminAuthProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminAuthProvider>
  );
}