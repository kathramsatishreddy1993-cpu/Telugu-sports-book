import React, { useState } from "react";
import AdminDashboard from "./AdminDashboard";
import AdminControllerAccounts from "./AdminControllerAccounts";
import AutoGameControls from "./AutoGameControls";
import ManualSuperOverControls from "./ManualSuperOverControls";
import AdminPromoCodes from "./AdminPromoCodes";

const CONTROLLER_GAMES = [
  {
    id: "AVIATOR",
    name: "AVIATOR",
    icon: "✈️",
  },
  {
    id: "ROULETTE",
    name: "ROULETTE",
    icon: "🎡",
  },
  {
    id: "DEAL_OR_NO_DEAL",
    name: "DEAL OR NO DEAL",
    icon: "💼",
  },
];

export default function AdminManagementShell({
  admin,
  onLogout,
}) {
  const [view, setView] = useState("HOME");

  if (view === "PROMO_CODES") {
    return (
      <AdminPromoCodes
        onBack={() => setView("HOME")}
      />
    );
  }

  if (view === "CONTROLLED_SO") {
    return (
      <ManualSuperOverControls
        onBack={() => setView("GAMES")}
      />
    );
  }

  if (CONTROLLER_GAMES.some(game => game.id === view)) {
    return (
      <AdminControllerAccounts
        key={view}
        game={view}
        admin={admin}
        onBack={() => setView("GAMES")}
        onLogout={onLogout}
      />
    );
  }

  if (view === "GAMES") {
    return (
      <main className="min-h-screen bg-[#061c1a] p-4 text-white">
        <div className="mx-auto max-w-5xl">
          <button
            type="button"
            onClick={() => setView("HOME")}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm"
          >
            ‹ ADMIN DASHBOARD
          </button>

          <h1 className="my-6 text-2xl font-black text-amber-300">
            GAME IDs
          </h1>

          <p className="mb-5 text-sm leading-6 text-slate-300">
            Create and manage separate Controller IDs
            for Aviator, Roulette and Deal or No Deal.
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {CONTROLLER_GAMES.map(game => (
              <button
                key={game.id}
                type="button"
                onClick={() => setView(game.id)}
                className="rounded-2xl border border-teal-700 bg-[#083d37] px-4 py-6 text-left"
              >
                <span className="text-3xl">
                  {game.icon}
                </span>

                <span className="mt-4 block text-sm font-black text-white">
                  {game.name}
                </span>

                <span className="mt-2 block text-xs leading-5 text-cyan-200">
                  Create / Manage Controller IDs ›
                </span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setView("CONTROLLED_SO")}
            className="mt-6 w-full rounded-2xl border border-teal-700 bg-[#083d37] p-6 text-left"
          >
            <span className="block text-lg font-black text-amber-200">
              🏏 SUPER OVER · ADMIN CONTROL
            </span>

            <span className="mt-2 block text-sm text-cyan-100">
              Ball queue · Live rates · Publish match ›
            </span>
          </button>

          <div className="mt-6">
            <AutoGameControls />
          </div>

          <p className="mt-5 text-xs leading-6 text-slate-400">
            Color Prediction runs automatically with
            random results. It does not use a result
            Controller ID.
          </p>
        </div>
      </main>
    );
  }

  return (
    <>
      <div className="border-b border-teal-700 bg-[#061c1a] p-3 text-white">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setView("GAMES")}
            className="rounded-xl border border-teal-700 bg-[#083d37] p-4 text-left"
          >
            <span className="block font-black text-amber-300">
              🔑 GAME IDs
            </span>

            <span className="mt-1 block text-xs leading-5 text-cyan-100">
              Controller IDs · Automatic PLAY / PAUSE ›
            </span>
          </button>

          <button
            type="button"
            onClick={() => setView("PROMO_CODES")}
            className="rounded-xl border border-violet-400/30 bg-violet-500/10 p-4 text-left"
          >
            <span className="block font-black text-violet-200">
              PROMO CODES
            </span>

            <span className="mt-1 block text-xs leading-5 text-slate-300">
              Assign / Update Customer Promo Codes ›
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
