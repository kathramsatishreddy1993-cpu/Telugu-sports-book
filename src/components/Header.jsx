import React from 'react';

export default function Header({
  onOpenAuth,
  user,
  isAuthenticated,
  onLogout,
}) {
  const loggedIn = Boolean(isAuthenticated || user?.isAuthenticated);

  return (
    <header className="sticky top-0 z-50 bg-[#0b121e]/95 backdrop-blur border-b border-gray-800 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">

        {/* LOGO / BRANDING */}
        <div className="flex items-center space-x-2 cursor-pointer">
          <span className="text-2xl font-black tracking-wider bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
            TELUGU
          </span>

          <span className="text-xl font-bold text-white tracking-widest uppercase">
            SPORTS BOOK
          </span>
        </div>

        {/* AUTHENTICATION BUTTONS */}
        <div className="flex items-center space-x-3">

          {loggedIn ? (
            <>
              <span className="text-xs sm:text-sm font-semibold text-emerald-400">
                {user?.name || 'Demo User'}
              </span>

              <button
                type="button"
                onClick={onLogout}
                className="px-3 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-500 rounded-lg transition"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onOpenAuth?.('login')}
                className="px-4 py-1.5 text-sm font-semibold text-gray-200 hover:text-white bg-gray-800/80 hover:bg-gray-700 rounded-lg border border-gray-700 transition"
              >
                Log In
              </button>

              <button
                type="button"
                onClick={() => onOpenAuth?.('signup')}
                className="px-4 py-1.5 text-sm font-bold text-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-lg shadow-md transition transform active:scale-95"
              >
                Sign Up
              </button>
            </>
          )}

        </div>
      </div>
    </header>
  );
}
