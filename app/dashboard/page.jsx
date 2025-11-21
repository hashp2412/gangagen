/**
 * Dashboard Route - /dashboard
 *
 * This page displays the main dashboard with protein database exploration,
 * sequence search, and saved queries functionality.
 *
 * Accessible after user logs in with access code.
 */

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Dashboard from '../../components/Dashboard';

export default function DashboardPage() {
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user has valid access on mount
  useEffect(() => {
    const validAccess = sessionStorage.getItem('validAccess');
    if (validAccess === 'true') {
      setHasAccess(true);
    } else {
      // No access, redirect to homepage
      router.push('/');
    }
    setIsLoading(false);

    // Prevent automatic scroll to top on navigation
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, [router]);

  const handleLogout = () => {
    sessionStorage.removeItem('validAccess');
    sessionStorage.removeItem('accessCode');
    router.push('/');
  };

  // Show loading state while checking access
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  // If no access, return null (router.push will redirect)
  if (!hasAccess) {
    return null;
  }

  // Show dashboard
  return <Dashboard onLogout={handleLogout} />;
}
