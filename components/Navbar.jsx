'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            
            if (currentScrollY < lastScrollY) {
                // Scrolling up
                setIsVisible(true);
            } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
                // Scrolling down and past 100px
                setIsVisible(false);
            }
            
            setLastScrollY(currentScrollY);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        
        return () => window.removeEventListener('scroll', handleScroll);
    }, [lastScrollY]);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    return (
        <nav className={`backdrop-blur-md bg-black/20 border-b border-green-500/30 fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
            isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
        }`}>
            <div className="w-[95%] mx-auto">
                <div className="relative flex items-center h-20">
                    {/* Logo */}
                    <div className="flex-shrink-0">
                        <Link href="/" className="text-xl font-bold">
                            <div className="w-10 h-10 border border-green-400 flex items-center justify-center text-green-400 font-bold text-lg font-mono hover:bg-green-400/10 transition-colors">
                                G
                            </div>
                        </Link>
                    </div>
                    
                    {/* Absolutely centered text */}
                    <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center">
                        <div className="roboto text-lg text-green-200 font-light tracking-wider">
                            GangaGen AI EctoLysin
                        </div>
                        <div className="mx-4 w-px h-4 bg-green-500/50"></div>
                        <div className="roboto text-xs text-green-400 font-mono uppercase">
                            Powered by Orbuculum
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}