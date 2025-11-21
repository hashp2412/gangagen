/**
 * Protein Details Route - /details?id=123
 *
 * This page displays detailed information about a specific protein.
 * The protein ID is passed as a URL query parameter.
 *
 * Example: /details?id=12345
 *
 * Accessible after user logs in with access code.
 */

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import ProteinDetails from '../../components/ProteinDetails';

function ProteinDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Get protein ID from URL query parameter
  const proteinId = searchParams.get('id');

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
  }, [router]);

  const handleBack = () => {
    // Use browser back to preserve state
    router.back();
  };

  const handleLogout = () => {
    sessionStorage.removeItem('validAccess');
    sessionStorage.removeItem('accessCode');
    router.push('/');
  };

  // Show loading state while checking access
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen mt-24">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  // If no access, return null (router.push will redirect)
  if (!hasAccess) {
    return null;
  }

  // If no protein ID provided, redirect to dashboard
  if (!proteinId) {
    router.push('/dashboard');
    return null;
  }

  // Show protein details
  return (
    <ProteinDetails
      proteinId={proteinId}
      onBack={handleBack}
      onLogout={handleLogout}
    />
  );
}

export default function ProteinDetailsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen mt-24">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    }>
      <ProteinDetailsContent />
    </Suspense>
  );
}
