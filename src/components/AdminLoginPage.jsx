import React, { useState } from 'react';

export default function AdminLoginPage({
  onLogin,
  onBack,
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    setError('');

    // DEMO ADMIN LOGIN ONLY
    if (
      username.trim() === 'admin' &&
      password === 'admin123'
    ) {
      const admin = {
        username: 'admin',
        role: 'DEMO_ADMIN',
        isAuthenticated: true,
      };

      try {
        localStorage.setItem(
          'telugu_sports_demo_admin',
          JSON.stringify(admin)
        );
      } catch {
        // localStorage unavailable
      }

      if (onLogin) {
        onLogin(admin);
      }

      return;
    }

    setError(
      'Invalid demo admin username or password.'
    );
  };

  return (
    <div className="min-h-screen bg-[#061c1a] text-white">

      {/* TOP BAR */}

      <header className="border-b border-amber-500/30 bg-[#9a5a00] px-4 py-4">
        <div className="mx-auto flex max-w-md items-center justify-between">

          <button
            type="button"
            onClick={onBack}
            className="rounded-md border border-amber-300 px-3 py-2 text-xs font-black"
          >
            ‹ BACK
          </button>

          <div className="text-right">
            <p className="text-[9px] font-black tracking-[0.15em] text-amber-200">
              TELUGU SPORTS BOOK
            </p>

            <h1 className="text-sm font-black">
              ADMIN
            </h1>
          </div>

        </div>
      </header>

      {/* LOGIN AREA */}

      <main className="flex min-h-[80vh] items-center justify-center px-4 py-8">

        <div className="w-full max-w-sm">

          {/* TITLE */}

          <div className="mb-6 text-center">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-amber-400 bg-[#9a5a00] text-3xl shadow-lg">
              🛡️
            </div>

            <h2 className="mt-4 text-2xl font-black text-amber-300">
              ADMIN LOGIN
            </h2>

            <p className="mt-2 text-[11px] text-gray-400">
              Demo Management Panel
            </p>

          </div>

          {/* LOGIN CARD */}

          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-[#27645d] bg-[#083d37] p-5 shadow-2xl"
          >

            {/* USERNAME */}

            <label className="block">

              <span className="text-[10px] font-black text-gray-300">
                ADMIN USERNAME
              </span>

              <input
                type="text"
                value={username}
                onChange={(event) =>
                  setUsername(
                    event.target.value
                  )
                }
                placeholder="Enter username"
                autoComplete="username"
                className="mt-2 h-[46px] w-full rounded-md border border-[#39756f] bg-[#062f2b] px-3 text-sm font-bold text-white outline-none focus:border-amber-400"
              />

            </label>

            {/* PASSWORD */}

            <label className="mt-4 block">

              <span className="text-[10px] font-black text-gray-300">
                PASSWORD
              </span>

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                placeholder="Enter password"
                autoComplete="current-password"
                className="mt-2 h-[46px] w-full rounded-md border border-[#39756f] bg-[#062f2b] px-3 text-sm font-bold text-white outline-none focus:border-amber-400"
              />

            </label>

            {/* ERROR */}

            {error && (
              <div className="mt-4 rounded-md border border-red-500/40 bg-red-500/10 p-3">
                <p className="text-[10px] font-bold text-red-300">
                  {error}
                </p>
              </div>
            )}

            {/* LOGIN */}

            <button
              type="submit"
              className="mt-5 h-[46px] w-full rounded-md border border-amber-300 bg-gradient-to-r from-amber-500 to-orange-600 text-sm font-black text-black shadow-lg"
            >
              LOGIN TO ADMIN
            </button>

          </form>

          {/* DEMO CREDENTIALS */}

          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">

            <p className="text-[9px] font-black text-amber-300">
              DEMO ADMIN ACCESS
            </p>

            <div className="mt-2 flex items-center justify-between text-[10px]">

              <span className="text-gray-400">
                Username
              </span>

              <span className="font-black">
                admin
              </span>

            </div>

            <div className="mt-2 flex items-center justify-between text-[10px]">

              <span className="text-gray-400">
                Password
              </span>

              <span className="font-black">
                admin123
              </span>

            </div>

          </div>

          <p className="mt-5 text-center text-[9px] leading-4 text-gray-500">
            Demo administration interface only.
            No real-money transactions.
          </p>

        </div>

      </main>

    </div>
  );
}
