import React from 'react';

const TSB_LOGO =
  '/file_0000000094288208a5d577eadc40844c.png';

export default function Header({
  onOpenAuth,
  user,
  isAuthenticated,
  onLogout,
}) {
  const loggedIn = Boolean(
    isAuthenticated ||
    user?.isAuthenticated
  );

  return (
    <header className="sticky top-0 z-50 border-b border-gray-800 bg-[#0b121e]/95 px-3 py-2 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">

        {/* =========================
            TSB LOGO
        ========================= */}

        <button
          type="button"
          onClick={() => {
            window.scrollTo({
              top: 0,
              behavior: 'smooth',
            });
          }}
          className="flex min-w-0 flex-1 items-center justify-start"
          aria-label="Telugu Sports Book Home"
        >
          <img
            src={TSB_LOGO}
            alt="Telugu Sports Book"
            className="h-[58px] w-auto max-w-[190px] rounded-md object-contain sm:h-[68px] sm:max-w-[260px]"
            draggable="false"
          />
        </button>

        {/* =========================
            AUTH BUTTONS
        ========================= */}

        <div className="flex flex-none items-center gap-2">

          {loggedIn ? (
            <>
              <span className="hidden max-w-[100px] truncate text-xs font-semibold text-emerald-400 sm:block">
                {user?.name ||
                  'Demo User'}
              </span>

              <button
                type="button"
                onClick={onLogout}
                className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-500 active:scale-95 sm:text-sm"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() =>
                  onOpenAuth?.(
                    'login'
                  )
                }
                className="rounded-lg border border-gray-700 bg-gray-800/80 px-3 py-2 text-xs font-bold text-gray-200 transition hover:bg-gray-700 hover:text-white active:scale-95 sm:px-4 sm:text-sm"
              >
                Log In
              </button>

              <button
                type="button"
                onClick={() =>
                  onOpenAuth?.(
                    'signup'
                  )
                }
                className="rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 px-3 py-2 text-xs font-black text-black shadow-md transition hover:from-amber-300 hover:to-amber-400 active:scale-95 sm:px-4 sm:text-sm"
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
