'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import AccessCodeModal from '../components/AccessCodeModal';

export default function Home() {
  const router = useRouter();
  const [showAccessModal, setShowAccessModal] = useState(false);

  // Check if user already has valid access on component mount
  useEffect(() => {
    const validAccess = sessionStorage.getItem('validAccess');
    if (validAccess === 'true') {
      // User already logged in, redirect to dashboard
      router.push('/dashboard');
    }
  }, [router]);

  const handleAccessToolClick = () => {
    // Show access code modal
    setShowAccessModal(true);
  };

  const handleAccessSuccess = () => {
    setShowAccessModal(false);
    // Redirect to dashboard after successful login
    router.push('/dashboard');
  };

  // Show login screen if user doesn't have access
  return (
    <div className="w-full min-h-screen relative overflow-hidden">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-100 via-green-50 to-green-200" />

      {/* Animated background glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#0ab079] opacity-[0.07] blur-[150px] rounded-full" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#07eea5] opacity-[0.07] blur-[150px] rounded-full" />

      {/* Hero Section */}
      <div className="w-full min-h-screen flex justify-center items-center px-8 py-16 relative z-10">
        <div className="max-w-7xl w-full mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-12 lg:gap-20 items-center">
            {/* Left Side - Text Content */}
            <motion.div
              className="space-y-10"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              {/* Label Tag */}
              <motion.div
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0ab079]/10 border border-[#0ab079]/20 rounded-full"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="w-2.5 h-2.5 bg-[#0ab079] rounded-full animate-pulse" />
                <span className="font-mono text-sm font-semibold text-[#0ab079] uppercase tracking-wider">
                  Advanced AI Research
                </span>
              </motion.div>

              {/* Main Heading */}
              <div className="relative">
                {/* Background glow */}
                <div className="absolute -left-10 top-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#0ab079] opacity-[0.06] blur-[120px] rounded-full pointer-events-none" />

                {/* Accent Line */}
                <div className="absolute -left-8 top-0 bottom-0 w-2 bg-gradient-to-b from-[#0ab079] to-[#07eea5] rounded-full" />

                <div className="space-y-1">
                  {/* DISCOVERING */}
                  <h1 className="text-[3.5rem] md:text-[5rem] lg:text-[6.5rem] xl:text-[8rem] font-black text-gray-900 leading-[0.9] tracking-[-0.04em]">
                    DISCOVERING
                  </h1>

                  {/* PROTEIN */}
                  <h2 className="text-[3rem] md:text-[4rem] lg:text-[5rem] xl:text-[6rem] font-bold text-gray-400 leading-[0.95] tracking-[-0.03em]">
                    PROTEIN
                  </h2>

                  {/* ANTIBACTERIALS */}
                  <h2 className="text-[3.5rem] md:text-[5rem] lg:text-[6.5rem] xl:text-[8rem] font-black leading-[0.9] tracking-[-0.04em]">
                    <span className="bg-gradient-to-r from-[#0ab079] to-[#07eea5] bg-clip-text text-transparent">
                      ANTIBACTERIALS
                    </span>
                  </h2>
                </div>
              </div>

              {/* Description */}
              <motion.p
                className="text-xl md:text-2xl text-gray-600 font-normal leading-[1.7] max-w-2xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                Leveraging artificial intelligence to accelerate the discovery of novel protein-based antimicrobial solutions.
              </motion.p>

              {/* CTA Button */}
              <motion.button
                onClick={handleAccessToolClick}
                className="group relative inline-flex items-center gap-3 px-10 py-5 text-white font-semibold text-lg overflow-hidden cursor-pointer rounded-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(10,176,121,0.4)] bg-gray-900 hover:bg-gray-800"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="relative z-10 uppercase tracking-wide">Initialize Access</span>
                <motion.span
                  className="relative z-10 text-2xl text-[#0ab079]"
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  →
                </motion.span>
              </motion.button>
            </motion.div>

            {/* Right Side - Visual Card */}
            <motion.div
              className="relative pt-6 pb-12"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              {/* Top Badge - Outside the card */}
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
                <div className="bg-gradient-to-r from-[#0ab079] to-[#07eea5] text-black px-6 py-2 font-mono text-sm font-bold rounded-full shadow-[0_0_20px_rgba(10,176,121,0.4)]">
                  POWERED BY ORBUCULUM
                </div>
              </div>

              {/* Main Card - Black Background */}
              <div className="relative rounded-3xl p-12 overflow-hidden mt-2 bg-gray-950">
                {/* Subtle inner glow effects */}
                <div className="absolute top-0 right-0 w-60 h-60 bg-[#0ab079] opacity-10 blur-[100px] rounded-full" />
                <div className="absolute bottom-0 left-0 w-60 h-60 bg-[#07eea5] opacity-10 blur-[100px] rounded-full" />

                {/* Border glow */}
                <div className="absolute inset-0 rounded-3xl border border-gray-800" />

                {/* Content */}
                <div className="relative z-10 space-y-8 mt-4">
                  {/* Brand Name */}
                  <div className="text-center space-y-2">
                    <h2 className="text-3xl font-black text-white tracking-tight">
                      GangaGen AI
                    </h2>
                    <p className="text-5xl font-bold gradient-text-modern">
                      EctoLysin
                    </p>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent"></div>
                    <div className="w-3 h-3 bg-[#0ab079] rotate-45 shadow-[0_0_10px_rgba(10,176,121,0.5)]"></div>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent"></div>
                  </div>

                  {/* Features List */}
                  <div className="space-y-3">
                    {/* Protein Structure Analysis */}
                    <div className="flex items-center gap-4 p-4 rounded-xl border border-[#0ab079]/50 bg-[#0ab079]/10 transition-all duration-300">
                      <div className="w-10 h-10 flex items-center justify-center">
                        <img src="/protein.png" alt="Protein" className="w-10 h-10 object-contain" />
                      </div>
                      <span className="font-medium text-gray-300">Protein Structure Analysis</span>
                    </div>

                    {/* Antibacterial Discovery */}
                    <div className="flex items-center gap-4 p-4 rounded-xl border border-[#0ab079]/50 bg-[#0ab079]/10 transition-all duration-300">
                      <div className="w-[3.2rem] h-[3.2rem] flex items-center justify-center">
                        <img src="/discovery.png" alt="Discovery" className="w-full h-full object-contain" />
                      </div>
                      <span className="font-medium text-gray-300">Antibacterial Discovery</span>
                    </div>

                    {/* AI-Powered Predictions */}
                    <div className="flex items-center gap-4 p-4 rounded-xl border border-[#0ab079]/50 bg-[#0ab079]/10 transition-all duration-300">
                      <div className="w-10 h-10 flex items-center justify-center">
                        <img src="/ai.png" alt="AI" className="w-10 h-10 object-contain" />
                      </div>
                      <span className="font-medium text-gray-300">AI-Powered Predictions</span>
                    </div>
                  </div>
                 
                </div>
              </div>

              {/* Floating Stats Cards */}
              <motion.div
                className="absolute -bottom-6 -left-6 bg-gradient-to-br from-[#0ab079] to-[#07eea5] text-black p-6 rounded-2xl shadow-[0_0_40px_rgba(10,176,121,0.3)]"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.2 }}
                whileHover={{ scale: 1.05 }}
              >
                <div className="font-mono text-4xl font-black">1Million+</div>
                <div className="text-sm font-semibold opacity-80">Proteins Analyzed</div>
              </motion.div>

              <motion.div
                className="absolute -top-6 -right-6 bg-white border border-green-400 text-gray-900 p-6 rounded-2xl shadow-lg"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.4 }}
                whileHover={{ scale: 1.05 }}
              >
                <div className="font-mono text-4xl font-black gradient-text-modern">AI</div>
                <div className="text-sm font-semibold text-gray-500">Powered</div>
              </motion.div>
            </motion.div>
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
