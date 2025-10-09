'use client';

import Image from "next/image";
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
    <div className="w-full min-h-[200vh] relative overflow-hidden">
      {/* Hero Section */}
      <div className="w-full min-h-screen flex justify-center items-center p-4 relative z-10 pt-32">
        <motion.div 
          className="card-linear w-[50%] py-8 relative"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="text-center">
            {/* Main Title */}
            <motion.div 
              className="mb-16"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <motion.h1 
                className="font-display text-7xl mb-6 leading-tight tracking-tight"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                style={{
                  background: 'linear-gradient(135deg, #22c55e 0%, #f97316 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                DISCOVERING
              </motion.h1>
              <motion.h2 
                className="font-heading text-4xl text-linear-text-primary tracking-wide"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                PROTEIN ANTIBACTERIALS
              </motion.h2>
            </motion.div>

            {/* Subtitle */}
            <motion.div 
              className="mb-16 p-8 glass-effect rounded-2xl backdrop-blur-xl"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <p className="font-space text-xl text-linear-text-primary font-semibold tracking-wide mb-2">
                GangaGen AI EctoLysin
              </p>
              <p className="font-manrope text-base text-linear-text-secondary opacity-80 font-medium">
                — Powered by Orbuculum —
              </p>
              <div className="mt-4 flex justify-center space-x-2">
                {[0, 0.5, 1].map((delay, i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-green-500"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity, delay }}
                  />
                ))}
              </div>
            </motion.div>

            {/* CTA Button */}
            <motion.button 
              onClick={handleAccessToolClick}
              className="btn-linear px-20 py-5 text-base font-ui cursor-pointer relative group overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1 }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                initial={{ x: '-100%' }}
                whileHover={{ x: '100%' }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
              />
              <span className="relative z-10">INITIALIZE ACCESS</span>
            </motion.button>
          </div>
        </motion.div>
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
