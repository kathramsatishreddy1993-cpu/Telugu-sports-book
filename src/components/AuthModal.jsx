import { useState } from 'react';

function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [otp, setOtp] = useState('');

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  if (!isOpen) {
    return null;
  }

  const closeModal = () => {
    setError('');
    setMessage('');
    onClose?.();
  };

  const handleDemoLogin = () => {
    setError('');
    setMessage('');

    const demoUser = {
      name: 'Demo User',
      identifier: 'demo',
      isAuthenticated: true,
      isDemo: true,
    };

    localStorage.setItem(
      'telugu_sports_auth_user',
      JSON.stringify(demoUser)
    );

    if (onLoginSuccess) {
      onLoginSuccess(demoUser);
    }

    closeModal();
  };

  const handleSendOtp = () => {
    setError('');
    setMessage('');

    if (!identifier.trim()) {
      setError('Please enter your mobile number.');
      return;
    }

    setMessage('Demo OTP sent successfully.');
  };

  const handleVerifyOtp = () => {
    setError('');
    setMessage('');

    if (!otp.trim()) {
      setError('Please enter the OTP.');
      return;
    }

    setVerified(true);
    setMessage('OTP verified successfully.');
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    setError('');
    setMessage('');
    setLoading(true);

    setTimeout(() => {
      if (!isLogin) {
        if (!verified) {
          setError('Please verify OTP first.');
          setLoading(false);
          return;
        }

        if (!username.trim()) {
          setError('Please enter a username.');
          setLoading(false);
          return;
        }

        if (!password) {
          setError('Please enter a password.');
          setLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          setLoading(false);
          return;
        }
      }

      const user = {
        name: username || 'Demo User',
        identifier: identifier || 'demo',
        isAuthenticated: true,
        isDemo: true,
      };

      localStorage.setItem(
        'telugu_sports_auth_user',
        JSON.stringify(user)
      );

      if (onLoginSuccess) {
        onLoginSuccess(user);
      }

      setLoading(false);
      closeModal();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 px-4">
      <div className="relative w-full max-w-md rounded-2xl border border-teal-900/50 bg-[#060913] p-6 shadow-2xl">

        <button
          type="button"
          onClick={closeModal}
          className="absolute right-4 top-4 text-xl text-gray-400 transition hover:text-white"
          aria-label="Close"
        >
          ×
        </button>

        <div className="mb-6 text-center">
          <div className="mb-2 text-2xl font-extrabold tracking-wide text-amber-400">
            TSB
          </div>

          <h2 className="text-xl font-bold text-white">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>

          <p className="mt-1 text-sm text-gray-400">
            {isLogin
              ? 'Login to continue to Telugu Sports Book'
              : 'Create your demo account'}
          </p>
        </div>

        <div className="mb-5 flex rounded-lg bg-[#0d111c] p-1">
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setError('');
              setMessage('');
            }}
            className={`flex-1 rounded-md py-2 text-sm font-bold transition ${
              isLogin
                ? 'bg-teal-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Log In
          </button>

          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setError('');
              setMessage('');
            }}
            className={`flex-1 rounded-md py-2 text-sm font-bold transition ${
              !isLogin
                ? 'bg-teal-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {!isLogin && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-300">
                Username
              </label>

              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full rounded-lg border border-gray-800 bg-[#0d111c] px-3 py-2.5 text-sm text-white outline-none focus:border-teal-500"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-300">
              Mobile Number / User ID
            </label>

            <div className="flex gap-2">
              {!isLogin && (
                <div className="flex items-center rounded-lg border border-gray-800 bg-[#0d111c] px-3 text-sm text-gray-300">
                  +91
                </div>
              )}

              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={
                  isLogin
                    ? 'Enter User ID or Mobile'
                    : 'Enter mobile number'
                }
                className="w-full rounded-lg border border-gray-800 bg-[#0d111c] px-3 py-2.5 text-sm text-white outline-none focus:border-teal-500"
              />

              {!isLogin && (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  className="whitespace-nowrap rounded-lg bg-teal-600 px-3 text-xs font-bold text-white hover:bg-teal-500"
                >
                  Get OTP
                </button>
              )}
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-300">
                OTP
              </label>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter OTP"
                  className="w-full rounded-lg border border-gray-800 bg-[#0d111c] px-3 py-2.5 text-sm text-white outline-none focus:border-teal-500"
                />

                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  className="whitespace-nowrap rounded-lg bg-amber-500 px-3 text-xs font-bold text-black hover:bg-amber-400"
                >
                  Verify
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-300">
              Password
            </label>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full rounded-lg border border-gray-800 bg-[#0d111c] px-3 py-2.5 pr-20 text-sm text-white outline-none focus:border-teal-500"
              />

              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 hover:text-white"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {!isLogin && (
            <>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-300">
                  Confirm Password
                </label>

                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full rounded-lg border border-gray-800 bg-[#0d111c] px-3 py-2.5 text-sm text-white outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-300">
                  Promo Code
                </label>

                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Optional promo code"
                  className="w-full rounded-lg border border-gray-800 bg-[#0d111c] px-3 py-2.5 text-sm text-white outline-none focus:border-teal-500"
                />
              </div>
            </>
          )}

          {error && (
            <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-400">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (!isLogin && !verified)}
            className="w-full rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 py-2.5 text-sm font-bold uppercase tracking-wider text-black shadow-md transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? 'Processing...'
              : isLogin
              ? 'Log In'
              : 'Complete Signup'}
          </button>

          {isLogin && (
            <>
              <div className="my-2 flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-800" />

                <span className="text-[11px] font-semibold text-gray-500">
                  OR
                </span>

                <div className="h-px flex-1 bg-gray-800" />
              </div>

              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={loading}
                className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-emerald-500 disabled:opacity-50"
              >
                Login with Demo ID
              </button>
            </>
          )}
        </form>

        <p className="mt-5 text-center text-[11px] text-gray-500">
          Demo / informational website only
        </p>
      </div>
    </div>
  );
}

export default AuthModal;
