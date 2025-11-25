'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

// Access code validation using Supabase
const validateAccessCode = async (code) => {
  try {
    const { data, error } = await supabase
      .from('codes')
      .select('code')
      .eq('code', code)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return false;
      }
      console.error('Error validating access code:', error);
      return false;
    }

    return data !== null;
  } catch (error) {
    console.error('Access code validation failed:', error);
    return false;
  }
};

export default function AccessCodeModal({ isOpen, onClose, onSuccess }) {
  const [accessCode, setAccessCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');
  const isAutoSubmitting = useRef(false);
  const inputRefs = useRef([]);

  // Auto-submit when 6 digits are entered
  useEffect(() => {
    const autoSubmit = async () => {
      if (accessCode.length === 6 && !isValidating && !isAutoSubmitting.current) {
        isAutoSubmitting.current = true;
        await handleSubmit();
        isAutoSubmitting.current = false;
      }
    };

    autoSubmit();
  }, [accessCode]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    const trimmedCode = accessCode.trim();
    if (!trimmedCode) {
      setError('Please enter an access code');
      return;
    }

    if (trimmedCode.length !== 6) {
      setError('Access code must be exactly 6 digits');
      return;
    }

    if (!/^\d{6}$/.test(trimmedCode)) {
      setError('Access code must contain only numbers');
      return;
    }

    setIsValidating(true);
    setError('');

    try {
      const isValid = await validateAccessCode(trimmedCode);

      if (isValid) {
        sessionStorage.setItem('validAccess', 'true');
        sessionStorage.setItem('accessCode', trimmedCode);
        onSuccess();
        handleClose();
      } else {
        setError('Invalid access code. Please try again.');
        setAccessCode('');
      }
    } catch (error) {
      setError('Validation failed. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleClose = () => {
    setAccessCode('');
    setError('');
    setIsValidating(false);
    onClose();
  };

  const handleInputChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = accessCode.split('');
    newCode[index] = value.slice(-1);
    const updatedCode = newCode.join('').slice(0, 6);
    setAccessCode(updatedCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !accessCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    setAccessCode(pastedData);
    if (pastedData.length === 6) {
      inputRefs.current[5]?.focus();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      >
        <motion.div
          className="relative max-w-md w-[90%] mx-4"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-[#0ab079] to-[#07eea5] rounded-3xl blur-xl opacity-20" />

          {/* Modal content */}
          <div className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-10 shadow-2xl">
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-white/10"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#0ab079] to-[#07eea5] flex items-center justify-center">
                <svg className="w-8 h-8 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Enter Access Code
              </h2>
              <p className="text-gray-400 text-sm">
                Please enter your 6-digit authorization code
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Code Input Boxes */}
              <div className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
                {[...Array(6)].map((_, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={accessCode[index] || ''}
                    onChange={(e) => handleInputChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    disabled={isValidating}
                    autoFocus={index === 0}
                    className="w-12 h-14 text-center text-2xl font-bold bg-white/5 border-2 border-white/10 rounded-xl text-white focus:border-[#08c88a] focus:bg-white/10 outline-none transition-all disabled:opacity-50"
                  />
                ))}
              </div>

              {/* Error Message */}
              {error && (
                <motion.div
                  className="mb-6 text-red-400 text-sm text-center bg-red-500/10 py-3 px-4 border border-red-500/20 rounded-xl"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {error}
                </motion.div>
              )}

              {/* Loading State */}
              {isValidating && (
                <div className="flex items-center justify-center gap-3 mb-6 text-[#08c88a]">
                  <div className="w-5 h-5 border-2 border-[#08c88a] border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-medium">Validating...</span>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isValidating}
                  className="flex-1 px-6 py-3 border border-white/10 text-gray-400 bg-transparent hover:bg-white/5 disabled:opacity-50 font-medium text-sm transition-all duration-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isValidating || accessCode.length !== 6}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-[#0ab079] to-[#07eea5] text-black font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 rounded-xl hover:shadow-[0_0_30px_rgba(8,200,138,0.3)]"
                >
                  {isValidating ? 'Validating...' : 'Access Platform'}
                </button>
              </div>
            </form>

            {/* Footer hint */}
            <p className="text-center text-gray-500 text-xs mt-6">
              Contact your administrator if you don't have an access code
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
