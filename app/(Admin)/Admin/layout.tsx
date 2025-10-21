// 'use client';

// import { useEffect } from 'react';
// import { useRouter } from 'next/navigation';
// import { AdminAuthProvider, useAdminAuth } from '@/context/AdminAuthContext';

// function AdminLayoutContent({ children }) {
//   const { admin, loading, logout } = useAdminAuth();
//   const router = useRouter();

//   useEffect(() => {
//     if (!loading && !admin) {
//       router.push('/Admin/admin-login');
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

//   // ADD THIS RETURN - Your layout was missing it!
//   return <>{children}</>;
// }

// export default function AdminLayout({ children }) {
//   return (
//     <AdminAuthProvider>
//       <AdminLayoutContent>{children}</AdminLayoutContent>
//     </AdminAuthProvider>
//   );
// }

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminAuthProvider, useAdminAuth } from '@/context/AdminAuthContext';

interface AdminLayoutContentProps {
  children: React.ReactNode;
}

function AdminLayoutContent({ children }: AdminLayoutContentProps) {
  const { admin, loading, logout } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !admin) {
      router.push('/Admin/admin-login');
    }
  }, [admin, loading, router]);

  // Redirect to home if already logged in
  useEffect(() => {
    if (!loading && admin) {
      router.push('/Admin'); // or '/Admin/dashboard' - change to your admin home route
    }
  }, [admin, loading, router]);

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

  if (!admin) {
    return null;
  }

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