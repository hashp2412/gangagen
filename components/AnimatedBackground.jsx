'use client';

import { motion, useReducedMotion, LazyMotion, domAnimation } from 'framer-motion';
import { useState, useEffect } from 'react';

export default function AnimatedBackground() {
  const prefersReducedMotion = useReducedMotion();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient || prefersReducedMotion) {
    return (
      <>
        <div className="fixed inset-0 bg-gradient-to-br from-green-50/20 via-transparent to-orange-50/20 -z-10" />
      </>
    );
  }

  return (
    <LazyMotion features={domAnimation}>
      {/* Mesh Gradient Background */}
      <motion.div
        className="fixed -top-1/2 -left-1/2 w-[200%] h-[200%] -z-30 pointer-events-none"
        animate={{
          x: ['0%', '25%', '0%'],
          y: ['0%', '25%', '0%'],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 60,
          ease: 'linear',
          repeat: Infinity,
        }}
        style={{ willChange: 'transform' }}
      >
        <div className="w-full h-full opacity-30">
          <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 via-transparent to-transparent" 
               style={{ filter: 'blur(40px)' }} />
          <div className="absolute inset-0 bg-gradient-to-br from-orange-400/20 via-transparent to-transparent translate-x-1/2 translate-y-1/2" 
               style={{ filter: 'blur(40px)' }} />
        </div>
      </motion.div>

      {/* Floating Shapes - Limited to 4 for better performance */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white/5 border border-white/10"
            style={{
              width: `${60 + i * 15}px`,
              height: `${60 + i * 15}px`,
              left: `${15 + i * 20}%`,
              top: `${15 + i * 15}%`,
              willChange: 'transform',
            }}
            animate={{
              y: ['0px', '-20px', '0px'],
            }}
            transition={{
              duration: 20 + i * 3,
              ease: 'easeInOut',
              repeat: Infinity,
              delay: i * 0.5,
            }}
          />
        ))}
      </div>

      {/* Animated Lines - Removed for better performance */}
    </LazyMotion>
  );
}