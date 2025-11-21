'use client';

import Image from "next/image";
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
    <div className="w-full min-h-screen relative overflow-hidden bg-gray-50">
      {/* Hero Section */}
      <div className="w-full min-h-screen flex justify-center items-center p-8 relative">

        <div className="max-w-7xl w-full relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left Side - Text Content */}
            <motion.div
              className="space-y-8"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              {/* Label Tag */}
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-2 bg-white"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="w-2 h-2 bg-green-500 animate-pulse" />
                <span className="font-mono text-sm font-semibold text-green-600 uppercase tracking-wider">
                  Advanced AI Research
                </span>
              </motion.div>

              {/* Main Heading */}
              <div className="space-y-4">
                <motion.h1
                  className="font-display text-7xl lg:text-8xl font-black text-slate-900 leading-[0.9] tracking-tighter"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  DISCOVERING
                </motion.h1>

                <motion.div
                  className="relative"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <h2 className="font-heading text-5xl lg:text-6xl font-bold text-black leading-tight">
                    PROTEIN
                  </h2>
                  <h2 className="font-heading text-5xl lg:text-6xl font-bold text-green-600 leading-tight">
                    ANTIBACTERIALS
                  </h2>

                  {/* Accent Line */}
                  <motion.div
                    className="absolute -left-4 top-0 w-1.5 bg-orange-500"
                    initial={{ height: 0 }}
                    animate={{ height: "100%" }}
                    transition={{ delay: 0.6, duration: 0.6 }}
                  />
                </motion.div>
              </div>

              {/* Description */}
              <motion.p
                className="text-xl text-slate-600 font-medium leading-relaxed max-w-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                Leveraging artificial intelligence to accelerate the discovery of novel protein-based antimicrobial solutions.
              </motion.p>

              {/* CTA Button */}
              <motion.button
                onClick={handleAccessToolClick}
                className="group relative inline-flex items-center gap-4 px-10 py-5 bg-green-500 text-white font-ui font-semibold text-lg overflow-hidden cursor-pointer hover:bg-green-600 transition-colors"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="relative z-10">INITIALIZE ACCESS</span>
                <motion.span
                  className="relative z-10 text-2xl"
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  →
                </motion.span>
              </motion.button>
            </motion.div>

            {/* Right Side - Visual Card */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              {/* Main Card */}
              <div className="relative bg-white p-12">
                {/* Top Badge */}
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                  <div className="bg-orange-500 text-white px-6 py-2 font-mono text-sm font-bold">
                    POWERED BY AI
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-8 mt-4">
                  {/* Brand Name */}
                  <div className="text-center space-y-2">
                    <h3 className="font-space text-3xl font-black text-black tracking-tight">
                      GangaGen AI
                    </h3>
                    <p className="font-heading text-5xl font-bold text-green-600">
                      EctoLysin
                    </p>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-px bg-gray-300"></div>
                    <div className="w-3 h-3 bg-orange-500 rotate-45"></div>
                    <div className="flex-1 h-px bg-gray-300"></div>
                  </div>

                  {/* Features List */}
                  <div className="space-y-4">
                    {[
                      { icon: '🧬', text: 'Protein Structure Analysis' },
                      { icon: '🔬', text: 'Antibacterial Discovery' },
                      { icon: '🤖', text: 'AI-Powered Predictions' }
                    ].map((item, index) => (
                      <motion.div
                        key={index}
                        className="flex items-center gap-4 p-4 bg-green-50 hover:bg-green-100 transition-colors"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 + index * 0.1 }}
                      >
                        <div className="text-3xl">{item.icon}</div>
                        <span className="font-manrope font-semibold text-black">
                          {item.text}
                        </span>
                      </motion.div>
                    ))}
                  </div>

                  {/* Footer Badge */}
                  <div className="text-center pt-4 border-t border-gray-200">
                    <p className="font-mono text-sm font-bold text-slate-500 tracking-wider">
                      POWERED BY ORBUCULUM
                    </p>
                  </div>
                </div>
              </div>

              {/* Floating Stats Cards */}
              <motion.div
                className="absolute -bottom-6 -left-6 bg-green-500 text-white p-6"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.2 }}
                whileHover={{ scale: 1.05 }}
              >
                <div className="font-mono text-4xl font-black">1000+</div>
                <div className="font-manrope text-sm font-semibold">Proteins Analyzed</div>
              </motion.div>

              <motion.div
                className="absolute -top-6 -right-6 bg-orange-500 text-white p-6"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.4 }}
                whileHover={{ scale: 1.05 }}
              >
                <div className="font-mono text-4xl font-black">AI</div>
                <div className="font-manrope text-sm font-semibold">Powered</div>
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
