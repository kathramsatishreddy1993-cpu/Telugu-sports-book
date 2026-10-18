import React, { useState } from 'react';
import AdminDashboard from './AdminDashboard';
import AdminControllerAccounts from './AdminControllerAccounts';

export default function AdminManagementShell({
  admin,
  onLogout,
}) {
  const [view, setView] = useState('HOME');

  if (['AVIATOR', 'ROULETTE'].includes(view)) {
    return (
      <AdminControllerAccounts
        key={view}
        game={view}
        admin={admin}
        onBack={() => setView('GAMES')}
        onLogout={onLogout}
      />
    );
  }

  if (view === 'GAMES') {
    return (
      <main className="min-h-screen bg-[#061c1a] p-4 text-white">
        <div className="mx-auto max-w-5xl">
          <button
            type="button"
            onClick={() => setView('HOME')}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm"
          >
            ‹ ADMIN DASHBOARD
          </button>

          <h1 className="my-6 text-2xl font-black text-amber-300">
            🔑 GAME IDs
          </h1>

          <p className="mb-5 text-sm text-slate-300">
            Select a game to create or manage its Controller IDs.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {[
              ['AVIATOR', '✈️'],
              ['ROULETTE', '🎡'],
            ].map(([game, icon]) => (
              <button
                key={game}
                type="button"
                onClick={() => setView(game)}
                className="rounded-2xl border border-teal-700 bg-[#083d37] px-4 py-8 text-left"
              >
                <span className="text-4xl">
                  {icon}
                </span>

                <span className="mt-5 block text-lg font-black">
                  {game}
                </span>

                <span className="mt-2 block text-xs text-cyan-200">
                  Create / Manage Controller IDs ›
                </span>
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <div className="border-b border-teal-700 bg-[#061c1a] p-3 text-white">
        <div className="mx-auto max-w-5xl">
          <button
            type="button"
            onClick={() => setView('GAMES')}
            className="w-full rounded-xl border border-teal-700 bg-[#083d37] p-4 text-left"
          >
            <span className="block font-black text-amber-300">
              🔑 GAME IDs
            </span>

            <span className="mt-1 block text-xs text-cyan-100">
              Aviator · Roulette · Controller account management ›
            </span>
          </button>
        </div>
      </div>

      <AdminDashboard
        admin={admin}
        onLogout={onLogout}
      />
    </>
  );
}
