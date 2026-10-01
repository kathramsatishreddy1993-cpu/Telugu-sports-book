import React, { useState } from 'react';

export default function AuthModal({
  isOpen,
  mode,
  onClose,
  onSwitchMode,
  onLoginSuccess,
}) {
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');

  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [verified, setVerified] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const isLogin = mode === 'login';

  const resetForm = () => {
    setFullName('');
    setMobile('');
    setPassword('');
    setOtpSent(false);
    setOtp('');
    setVerified(false);
    setLoading(false);
    setError('');
    setMessage('');
  };

  const closeModal = () => {
    resetForm();
    onClose();
  };

  const sendOtp = async () => {
    const cleanMobile = mobile.replace(/\D/g, '');

    if (!/^[0-9]{10}$/.test(cleanMobile)) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          mobile: cleanMobile,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP.');
      }

      setMobile(cleanMobile);
      setOtpSent(true);
      setMessage('OTP sent successfully. Please check your SMS.');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    const cleanMobile = mobile.replace(/\D/g, '');

    if (!/^[0-9]{10}$/.test(cleanMobile)) {
      setError('Invalid mobile number.');
      return;
    }

    if (!/^[0-9]{6}$/.test(otp)) {
      setError('Please enter the 6-digit OTP.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          mobile: cleanMobile,
          otp,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'OTP verification failed.');
      }

      setVerified(true);
      setMessage('✓ Mobile number verified successfully.');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const submitAuth = async (event) => {
    event.preventDefault();

    setError('');
    setMessage('');

    const cleanMobile = mobile.replace(/\D/g, '');

    if (!isLogin && !verified) {
      setError('Please verify your mobile number with OTP first.');
      return;
    }

    setLoading(true);

    try {
      const endpoint = isLogin
        ? '/api/auth/login'
        : '/api/auth/signup';

      const body = isLogin
        ? {
            mobile: cleanMobile,
            password,
          }
        : {
            fullName,
            mobile: cleanMobile,
            password,
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed.');
      }

      if (onLoginSuccess && data.user) {
        onLoginSuccess(data.user);
      }

      closeModal();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-[#0f172a] border border-gray-800 rounded-2xl p-6 shadow-2xl space-y-6">

        <button
          type="button"
          onClick={closeModal}
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl font-bold"
        >
          &times;
        </button>

        <div className="text-center space-y-1">
          <h2 className="text-2xl font-black text-white tracking-wide">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>

          <p className="text-xs text-gray-400">
            {isLogin
              ? 'Enter your mobile number and password to sign in'
              : 'Verify your mobile number with SMS OTP to create an account'}
          </p>
        </div>

        <form onSubmit={submitAuth} className="space-y-4">

          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                Full Name
              </label>

              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your name"
                required
                className="w-full bg-[#080d16] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
              Mobile Number
            </label>

            <div className="flex gap-2">
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={mobile}
                disabled={verified}
                onChange={(e) =>
                  setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))
                }
                placeholder="10-digit Mobile Number"
                required
                className="flex-1 bg-[#080d16] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 disabled:opacity-50"
              />

              {!isLogin && !verified && (
                <button
                  type="button"
                  onClick={sendOtp}
                  disabled={loading || mobile.length !== 10}
                  className="px-3 py-2 text-xs font-bold text-black bg-amber-400 rounded-lg disabled:opacity-50"
                >
                  {otpSent ? 'Resend OTP' : 'Send OTP'}
                </button>
              )}
            </div>
          </div>

          {!isLogin && otpSent && !verified && (
            <div className="p-3 bg-[#080d16] border border-gray-800 rounded-lg space-y-2">

              <label className="block text-xs font-semibold text-amber-400 uppercase">
                Enter SMS OTP
              </label>

              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  placeholder="6-digit OTP"
                  className="flex-1 bg-[#0f172a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white text-center tracking-widest focus:outline-none focus:border-amber-500"
                />

                <button
                  type="button"
                  onClick={verifyOtp}
                  disabled={loading || otp.length !== 6}
                  className="px-3 py-2 text-xs font-bold text-black bg-emerald-400 rounded-lg disabled:opacity-50"
                >
                  Verify OTP
                </button>
              </div>
            </div>
          )}

          {!isLogin && verified && (
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-lg">
              <span>✓</span>
              <span>Mobile Verified</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              minLength={6}
              required
              className="w-full bg-[#080d16] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 font-semibold">
              {error}
            </p>
          )}

          {message && !error && (
            <p className="text-xs text-emerald-400 font-semibold">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || (!isLogin && !verified)}
            className="w-full py-2.5 font-bold text-black bg-gradient-to-r from-amber-400 to-amber-500 rounded-lg shadow-md transition text-sm uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? 'Processing...'
              : isLogin
              ? 'Log In'
              : 'Complete Signup'}
          </button>
        </form>

        <div className="text-center text-xs text-gray-400 pt-2 border-t border-gray-800">
          {isLogin ? (
            <span>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  onSwitchMode('signup');
                }}
                className="text-amber-400 font-semibold hover:underline ml-1"
              >
                Sign Up
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  onSwitchMode('login');
                }}
                className="text-amber-400 font-semibold hover:underline ml-1"
              >
                Log In
              </button>
            </span>
          )}
        </div>

      </div>
    </div>
  );
}
