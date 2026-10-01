import React from 'react';

export default function AuthModal({ isOpen, mode, onClose, onSwitchMode }) {
  if (!isOpen) return null;

  const isLogin = mode === 'login';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-[#0f172a] border border-gray-800 rounded-2xl p-6 shadow-2xl space-y-6">
        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl font-bold transition"
        >
          &times;
        </button>

        {/* MODAL HEADER */}
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-black text-white tracking-wide">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-xs text-gray-400">
            {isLogin
              ? 'Enter your credentials to access your account'
              : 'Join Telugu Sports Book and claim your bonuses'}
          </p>
        </div>

        {/* FORM */}
        <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                Full Name
              </label>
              <input
                type="text"
                placeholder="Enter your name"
                className="w-full bg-[#080d16] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
              Mobile / Email
            </label>
            <input
              type="text"
              placeholder="Enter mobile or email"
              className="w-full bg-[#080d16] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
              Password
            </label>
            <input
              type="password"
              placeholder="Enter password"
              className="w-full bg-[#080d16] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            type="submit"
            onClick={onClose}
            className="w-full py-2.5 font-bold text-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-lg shadow-md transition transform active:scale-95 text-sm uppercase tracking-wider"
          >
            {isLogin ? 'Log In' : 'Sign Up'}
          </button>
        </form>

        {/* SWITCH MODE FOOTER */}
        <div className="text-center text-xs text-gray-400 pt-2 border-t border-gray-800">
          {isLogin ? (
            <span>
              Don't have an account?{' '}
              <button
                onClick={() => onSwitchMode('signup')}
                className="text-amber-400 font-semibold hover:underline ml-1"
              >
                Sign Up
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{' '}
              <button
                onClick={() => onSwitchMode('login')}
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
