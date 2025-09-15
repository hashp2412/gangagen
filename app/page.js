'use client';

import Image from "next/image";
import { useState, useEffect } from 'react';
import AccessCodeModal from '../components/AccessCodeModal';
import Dashboard from '../components/Dashboard';

export default function Home() {
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  // Check if user already has valid access on component mount
  useEffect(() => {
    const validAccess = sessionStorage.getItem('validAccess');
    if (validAccess === 'true') {
      setHasAccess(true);
    }
  }, []);

  const handleAccessToolClick = () => {
    if (hasAccess) {
      // User already has access, redirect to tool
      handleToolAccess();
    } else {
      // Show access code modal
      setShowAccessModal(true);
    }
  };

  const handleAccessSuccess = () => {
    setHasAccess(true);
    setShowAccessModal(false);
  };

  const handleLogout = () => {
    setHasAccess(false);
    sessionStorage.removeItem('validAccess');
    sessionStorage.removeItem('accessCode');
  };

  // Show dashboard if user has access
  if (hasAccess) {
    return <Dashboard onLogout={handleLogout} />;
  }

  // Show login screen if user doesn't have access
  return (
    <div className="w-full min-h-screen relative">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(0, 255, 136, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 136, 0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      {/* Hero Section */}
      <div className="w-full h-screen flex justify-center items-center p-4 relative z-10">
        <div className="card-futuristic w-full max-w-2xl p-16 scan-lines relative">
          <div className="text-center">
            {/* Main Title */}
            <div className="mb-12">
              <h1 className="arca text-5xl mb-4 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-green-200 font-bold leading-tight">
                DISCOVERING
              </h1>
              <h2 className="arca text-3xl text-gray-300 font-light tracking-wider">
                PROTEIN ANTIBACTERIALS
              </h2>
            </div>

            {/* Subtitle */}
            <div className="mb-12 p-6 border border-green-500/30 bg-green-900/20 backdrop-blur-sm">
              <p className="roboto text-lg text-green-200 font-light tracking-wide">
                GangaGen AI EctoLysin
              </p>
              <p className="roboto text-sm text-green-400 mt-1 font-mono">
                — Powered by Orbuculum —
              </p>
            </div>

            {/* CTA Button */}
            <button 
              onClick={handleAccessToolClick}
              className="btn-futuristic px-16 py-4 text-sm roboto cursor-pointer pulse-glow"
            >
              INITIALIZE ACCESS
            </button>
            
            {/* Minimal Decorative Elements */}
            <div className="mt-16 flex justify-center items-center space-x-8 opacity-60">
              <div className="w-2 h-2 bg-green-400"></div>
              <div className="w-8 h-px bg-gradient-to-r from-transparent via-green-400 to-transparent"></div>
              <div className="w-2 h-2 bg-green-400"></div>
              <div className="w-8 h-px bg-gradient-to-r from-transparent via-green-400 to-transparent"></div>
              <div className="w-2 h-2 bg-green-400"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Access Code Modal */}
      <AccessCodeModal 
        isOpen={showAccessModal}
        onClose={() => setShowAccessModal(false)}
        onSuccess={handleAccessSuccess}
      />
    </div>
  );
}
