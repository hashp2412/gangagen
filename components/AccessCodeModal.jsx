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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100]">
      <div className="card-futuristic max-w-md w-[90%] mx-4 p-10">
        <div className="text-center mb-8">
          <h2 className="text-xl font-light text-green-200 mb-3 roboto tracking-wide uppercase">
            Authentication Required
          </h2>
          <p className="text-green-400 font-light text-sm">
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
              className="input-futuristic w-full text-center text-lg tracking-widest font-mono"
              disabled={isValidating}
              autoFocus
            />
          </div>

          {error && (
            <div className="mb-6 text-red-400 text-sm text-center bg-red-900/20 py-3 px-4 border border-red-500/30 font-light">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isValidating}
              className="flex-1 px-4 py-3 border border-gray-500/30 text-gray-400 bg-transparent hover:bg-gray-500/10 disabled:opacity-50 font-light uppercase tracking-wide text-sm transition-all duration-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isValidating || !accessCode.trim()}
              className="btn-futuristic flex-1 px-4 py-3 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isValidating ? 'Validating...' : 'Authenticate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}