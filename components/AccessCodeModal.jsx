'use client';

import { useState } from 'react';

// Access code validation - designed for easy database integration
const validateAccessCode = async (code) => {
  // Current dummy implementation
  const validCodes = ['12345']; // This will be replaced with database call
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return validCodes.includes(code);
  
  // Future database integration would look like:
  // try {
  //   const response = await fetch('/api/validate-access-code', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ accessCode: code })
  //   });
  //   const data = await response.json();
  //   return data.valid;
  // } catch (error) {
  //   console.error('Access code validation failed:', error);
  //   return false;
  // }
};

export default function AccessCodeModal({ isOpen, onClose, onSuccess }) {
  const [accessCode, setAccessCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!accessCode.trim()) {
      setError('Please enter an access code');
      return;
    }

    setIsValidating(true);
    setError('');

    try {
      const isValid = await validateAccessCode(accessCode.trim());
      
      if (isValid) {
        // Store valid access in session/localStorage for the session
        sessionStorage.setItem('validAccess', 'true');
        sessionStorage.setItem('accessCode', accessCode.trim());
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
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="••••••"
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