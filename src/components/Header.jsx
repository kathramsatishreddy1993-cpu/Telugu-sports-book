import React from 'react';

const TSB_LOGO =
  '/games/file_0000000092bc82118617f615539c5f17.png';

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
    <header className="sticky top-0 z-50 border-b border-gray-800 bg-[#08111d]/95 backdrop-blur">
      <div className="mx-auto flex h-[82px] max-w-7xl items-center justify-between gap-2 px-3 sm:h-[92px] sm:px-4">

        {/* =================================
            TSB LOGO
        ================================= */}

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
            className="
              h-[64px]
              w-auto
              max-w-[230px]
              object-contain
              object-left
              sm:h-[74px]
              sm:max-w-[300px]
              md:h-[80px]
              md:max-w-[360px]
            "
            draggable="false"
          />
        </button>

        {/* =================================
            AUTH BUTTONS
        ================================= */}

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
                className="
                  rounded-lg
                  bg-red-600
                  px-3
                  py-2
                  text-xs
                  font-bold
                  text-white
                  transition
                  active:scale-95
                  hover:bg-red-500
                "
              >
                Logout
              </button>
            </>
          ) : (
            <>
              {/* LOGIN */}

              <button
                type="button"
                onClick={() =>
                  onOpenAuth?.(
                    'login'
                  )
                }
                className="
                  rounded-xl
                  border
                  border-gray-700
                  bg-[#151e2d]
                  px-3
                  py-2.5
                  text-xs
                  font-black
                  text-gray-100
                  shadow-lg
                  transition
                  active:scale-95
                  hover:bg-gray-700
                  sm:px-4
                  sm:text-sm
                "
              >
                Log In
              </button>

              {/* SIGN UP */}

              <button
                type="button"
                onClick={() =>
                  onOpenAuth?.(
                    'signup'
                  )
                }
                className="
                  rounded-xl
                  bg-gradient-to-r
                  from-amber-400
                  to-orange-500
                  px-3
                  py-2.5
                  text-xs
                  font-black
                  text-black
                  shadow-lg
                  shadow-amber-500/10
                  transition
                  active:scale-95
                  hover:from-amber-300
                  hover:to-orange-400
                  sm:px-4
                  sm:text-sm
                "
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
