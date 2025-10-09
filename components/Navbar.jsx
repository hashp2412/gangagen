'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const lastScrollY = useRef(0);

    useEffect(() => {
        let timeoutId = null;
        
        const handleScroll = () => {
            if (timeoutId) clearTimeout(timeoutId);
            
            timeoutId = setTimeout(() => {
                const currentScrollY = window.scrollY;
                
                if (currentScrollY <= 10) {
                    // Always show when at top
                    setIsVisible(true);
                } else if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
                    // Scrolling down - show navbar
                    setIsVisible(true);
                } else if (currentScrollY < lastScrollY.current && currentScrollY > 50) {
                    // Scrolling up - hide navbar
                    setIsVisible(false);
                }
                
                lastScrollY.current = currentScrollY;
            }, 50);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        
        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, []);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    return (
        <motion.nav 
            className="fixed top-0 left-0 right-0 z-50"
            initial={{ y: 0 }}
            animate={{ 
                y: isVisible ? 0 : -100
            }}
            transition={{ 
                duration: 0.3, 
                ease: "easeInOut" 
            }}
                style={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
                    boxShadow: '0 2px 20px rgba(0, 0, 0, 0.05)'
                }}
            >
                <div className="w-[95%] mx-auto">
                    <div className="relative flex items-center h-20">
                        {/* Logo */}
                        <div className="flex-shrink-0">
                            <Link href="/" className="text-xl font-bold">
                                <motion.div 
                                    className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-xl rounded-2xl shadow-lg"
                                    whileHover={{ 
                                        scale: 1.1,
                                        background: 'linear-gradient(to bottom right, #fb923c, #ea580c)'
                                    }}
                                    whileTap={{ scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    G
                                </motion.div>
                            </Link>
                        </div>
                        
                        {/* Absolutely centered text */}
                        <motion.div 
                            className="absolute left-1/2 transform -translate-x-1/2 flex items-center"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.6 }}
                        >
                            <div className="font-space text-xl gradient-text-modern font-semibold tracking-wide">
                                GangaGen AI EctoLysin
                            </div>
                            <motion.div 
                                className="mx-6 w-px h-6 bg-gradient-to-b from-green-500 to-orange-500"
                                initial={{ scaleY: 0 }}
                                animate={{ scaleY: 1 }}
                                transition={{ delay: 0.4, duration: 0.4 }}
                            />
                            <div className="font-manrope text-sm text-gray-600 font-medium uppercase tracking-widest">
                                Powered by Orbuculum
                            </div>
                        </motion.div>
                    </div>
                </div>
        </motion.nav>
    );
}