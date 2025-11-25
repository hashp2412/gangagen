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
    <div className="w-full min-h-screen relative overflow-hidden bg-black">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black" />

      {/* Animated background glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#08c88a] opacity-5 blur-[150px] rounded-full" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#07eea5] opacity-5 blur-[150px] rounded-full" />

      {/* Hero Section */}
      <div className="w-full min-h-screen flex justify-center items-center px-8 py-16 relative z-10">
        <div className="max-w-7xl w-full mx-auto">
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
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="w-2 h-2 bg-[#08c88a] rounded-full animate-pulse" />
                <span className="font-mono text-sm font-semibold text-[#08c88a] uppercase tracking-wider">
                  Advanced AI Research
                </span>
              </motion.div>

              {/* Main Heading */}
              <div className="space-y-4">
                <motion.h1
                  className="text-5xl lg:text-7xl font-black text-white leading-[0.95] tracking-tighter"
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
                  <h2 className="text-3xl lg:text-5xl font-bold text-gray-400 leading-tight">
                    PROTEIN
                  </h2>
                  <h2 className="text-3xl lg:text-5xl font-bold leading-tight gradient-text-modern">
                    ANTIBACTERIALS
                  </h2>

                  {/* Accent Line */}
                  <motion.div
                    className="absolute -left-6 top-0 w-1 bg-gradient-to-b from-[#0ab079] to-[#07eea5] rounded-full"
                    initial={{ height: 0 }}
                    animate={{ height: "100%" }}
                    transition={{ delay: 0.6, duration: 0.6 }}
                  />
                </motion.div>
              </div>

              {/* Description */}
              <motion.p
                className="text-lg text-gray-400 font-medium leading-relaxed max-w-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                Leveraging artificial intelligence to accelerate the discovery of novel protein-based antimicrobial solutions.
              </motion.p>

              {/* CTA Button */}
              <motion.button
                onClick={handleAccessToolClick}
                className="group relative inline-flex items-center gap-3 px-8 py-4 text-black font-semibold text-base overflow-hidden cursor-pointer rounded-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(8,200,138,0.3)]"
                style={{
                  background: 'linear-gradient(135deg, #0ab079 10%, #07eea5 90%)'
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="relative z-10 uppercase tracking-wide">Initialize Access</span>
                <motion.span
                  className="relative z-10 text-xl"
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
              <div className="relative bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-3xl p-12">
                {/* Top Badge */}
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-[#0ab079] to-[#07eea5] text-black px-6 py-2 font-mono text-sm font-bold rounded-full">
                    POWERED BY AI
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-8 mt-4">
                  {/* Brand Name */}
                  <div className="text-center space-y-2">
                    <h3 className="text-3xl font-black text-white tracking-tight">
                      GangaGen AI
                    </h3>
                    <p className="text-5xl font-bold gradient-text-modern">
                      EctoLysin
                    </p>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent"></div>
                    <div className="w-3 h-3 bg-[#08c88a] rotate-45"></div>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent"></div>
                  </div>

                  {/* Features List */}
                  <div className="space-y-3">
                    {[
                      { icon: '🧬', text: 'Protein Structure Analysis' },
                      { icon: '🔬', text: 'Antibacterial Discovery' },
                      { icon: '🤖', text: 'AI-Powered Predictions' }
                    ].map((item, index) => (
                      <motion.div
                        key={index}
                        className="flex items-center gap-4 p-4 bg-black/40 border border-gray-800 rounded-xl hover:border-[#08c88a]/30 hover:bg-[#08c88a]/5 transition-all duration-300"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 + index * 0.1 }}
                      >
                        <div className="text-2xl">{item.icon}</div>
                        <span className="font-medium text-gray-300">
                          {item.text}
                        </span>
                      </motion.div>
                    ))}
                  </div>

                  {/* Footer Badge */}
                  <div className="text-center pt-4 border-t border-gray-800">
                    <p className="font-mono text-xs font-semibold text-gray-500 uppercase tracking-widest">
                      Powered by Orbuculum
                    </p>
                  </div>
                </div>
              </div>

              {/* Floating Stats Cards */}
              <motion.div
                className="absolute -bottom-6 -left-6 bg-gradient-to-br from-[#0ab079] to-[#07eea5] text-black p-6 rounded-2xl shadow-[0_0_40px_rgba(8,200,138,0.2)]"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.2 }}
                whileHover={{ scale: 1.05 }}
              >
                <div className="font-mono text-4xl font-black">1000+</div>
                <div className="text-sm font-semibold opacity-80">Proteins Analyzed</div>
              </motion.div>

              <motion.div
                className="absolute -top-6 -right-6 bg-gray-900 border border-gray-800 text-white p-6 rounded-2xl"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.4 }}
                whileHover={{ scale: 1.05 }}
              >
                <div className="font-mono text-4xl font-black gradient-text-modern">AI</div>
                <div className="text-sm font-semibold text-gray-400">Powered</div>
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
