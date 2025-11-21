'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

// Access code validation using Supabase
const validateAccessCode = async (code) => {
  try {
    // Query the codes table to check if the code exists
    const { data, error } = await supabase
      .from('codes')
      .select('code')
      .eq('code', code)
      .single();

    if (error) {
      // If error is "PGRST116", it means no rows found (invalid code)
      if (error.code === 'PGRST116') {
        return false;
      }
      // For other errors, log and return false
      console.error('Error validating access code:', error);
      return false;
    }

    // If data exists, the code is valid
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

    // Validate that the code is exactly 6 digits
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
        // Store valid access in session/localStorage for the session
        sessionStorage.setItem('validAccess', 'true');
        sessionStorage.setItem('accessCode', trimmedCode);
        onSuccess();
        handleClose();
      } else {
        setError('Invalid access code. Please try again.');
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100]">
      <div className="card-linear max-w-md w-[90%] mx-4 p-10 shadow-linear-hover">
        <div className="text-center mb-8">
          <h2 className="text-xl font-semibold text-linear-text-primary mb-3 roboto tracking-wide uppercase">
            Authentication Required
          </h2>
          <p className="text-linear-text-secondary font-normal text-sm">
            Enter authorization code to proceed
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={accessCode}
              onChange={(e) => {
                // Only allow numbers and limit to 6 digits
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setAccessCode(value);
              }}
              onKeyPress={(e) => {
                // Prevent non-numeric characters from being entered
                if (!/[0-9]/.test(e.key)) {
                  e.preventDefault();
                }
              }}
              placeholder="••••••"
              maxLength={6}
              className="input-linear w-full text-center text-lg tracking-widest font-mono"
              disabled={isValidating}
              autoFocus
            />
          </div>

          {error && (
            <div className="mb-6 text-red-600 text-sm text-center bg-red-50 py-3 px-4 border border-red-200 rounded-lg font-normal">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isValidating}
              className="flex-1 px-4 py-3 border border-linear-border text-linear-text-secondary bg-white hover:bg-linear-white-soft disabled:opacity-50 font-normal uppercase tracking-wide text-sm transition-all duration-300 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isValidating || !accessCode.trim()}
              className="btn-linear flex-1 px-4 py-3 disabled:opacity-50 disabled:cursor-not-allowed text-sm uppercase tracking-wide"
            >
              {isValidating ? 'Validating...' : 'Authenticate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}