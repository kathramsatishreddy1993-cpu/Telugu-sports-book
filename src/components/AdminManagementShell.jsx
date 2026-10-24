import React, { useEffect, useRef, useState } from "react";

import AdminDashboard from "./AdminDashboard";
import AdminControllerAccounts from "./AdminControllerAccounts";
import AutoGameControls from "./AutoGameControls";
import ManualSuperOverControls from "./ManualSuperOverControls";
import AdminPromoCodes from "./AdminPromoCodes";
import AdminPlayingHistory from "./AdminPlayingHistory";

const CONTROLLER_GAMES = [
  {
    id: "AVIATOR",
    name: "AVIATOR",
    icon: "✈️",
    gamePath: "/games/tsb-flight",
    controllerPath: "/game-control",
  },
  {
    id: "ROULETTE",
    name: "ROULETTE",
    icon: "🎡",
    gamePath: "/games/roulette",
    controllerPath: "/game-control/roulette",
  },
  {
    id: "DEAL_OR_NO_DEAL",
    name: "DEAL OR NO DEAL",
    icon: "💼",
    gamePath: "/games/deal-or-no-deal",
    controllerPath: "/game-control/deal-or-no-deal",
  },
];

function LinkBox({ label, path }) {
  const inputRef = useRef(null);
  const [message, setMessage] = useState("");

  const url = new URL(
    path,
    window.location.origin,
  ).href;

  const copy = async () => {
    setMessage("");

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard unavailable");
      }

      await navigator.clipboard.writeText(url);
      setMessage("Link copied");
    } catch {
      const input = inputRef.current;

      if (!input) {
        setMessage("Select the link and copy it.");
        return;
      }

      input.focus();
      input.select();
      input.setSelectionRange(0, url.length);

      try {
        const copied = document.execCommand("copy");

        setMessage(
          copied
            ? "Link copied"
            : "Link selected. Long press and copy.",
        );
      } catch {
        setMessage(
          "Link selected. Long press and copy.",
        );
      }
    }
  };

  return (
    <div className="rounded-xl border border-teal-700/70 bg-black/20 p-3">
      <label className="block">
        <span className="mb-2 block text-[10px] font-black uppercase tracking-wide text-cyan-100">
          {label}
        </span>

        <input
          ref={inputRef}
          type="text"
          readOnly
          value={url}
          spellCheck={false}
          onFocus={event => event.target.select()}
          className="w-full min-w-0 rounded-lg border border-teal-700 bg-[#041f1c] px-2 py-2 text-[11px] text-white outline-none focus:border-cyan-300"
        />
      </label>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-label={`Copy ${label}`}
          onClick={copy}
          className="rounded-lg bg-cyan-300 px-2 py-2 text-[10px] font-black text-black"
        >
          COPY
        </button>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${label}`}
          className="rounded-lg border border-amber-300/50 bg-amber-300/10 px-2 py-2 text-center text-[10px] font-black text-amber-100"
        >
          OPEN ↗
        </a>
      </div>

      <p
        role="status"
        aria-live="polite"
        className="mt-2 min-h-[16px] text-[10px] text-emerald-200"
      >
        {message}
      </p>
    </div>
  );
}

export default function AdminManagementShell({
  admin,
  onLogout,
}) {
  const [view, setView] = useState("HOME");
  const [identity, setIdentity] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    fetch("/api/playing-history/me", {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async response => {
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Unable to verify Admin permissions.",
          );
        }

        if (active) {
          setIdentity(data.admin);
        }
      })
      .catch(failure => {
        if (active && failure.name !== "AbortError") {
          setError(failure.message);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [admin?.username]);

  if (error) {
    return (
      <main className="min-h-screen bg-[#061c1a] p-6 text-white">
        <p role="alert">{error}</p>

        <button
          type="button"
          onClick={onLogout}
          className="mt-4 rounded bg-rose-700 px-4 py-2"
        >
          Logout and login again
        </button>
      </main>
    );
  }

  if (!identity) {
    return (
      <main className="min-h-screen bg-[#061c1a] p-6 text-white">
        Verifying Admin permissions…
      </main>
    );
  }

  if (identity.historyOnly) {
    return (
      <AdminPlayingHistory
        admin={identity}
        onLogout={onLogout}
      />
    );
  }

  if (view === "PLAYING_HISTORY") {
    return (
      <AdminPlayingHistory
        admin={identity}
        onBack={() => setView("HOME")}
        onLogout={onLogout}
      />
    );
  }

  if (view === "PROMO_CODES") {
    return (
      <AdminPromoCodes
        admin={admin}
        onBack={() => setView("HOME")}
        onLogout={onLogout}
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

  if (
    CONTROLLER_GAMES.some(
      game => game.id === view,
    )
  ) {
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
            🔑 GAME IDs & LINKS
          </h1>

          <p className="mb-5 text-sm leading-6 text-slate-300">
            Create and manage separate Controller IDs
            for Aviator, Roulette and Deal or No Deal.
            Copy or open each game's links below.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CONTROLLER_GAMES.map(game => (
              <article
                key={game.id}
                className="min-w-0 overflow-hidden rounded-2xl border border-teal-700 bg-[#083d37]"
              >
                <button
                  type="button"
                  onClick={() => setView(game.id)}
                  className="block w-full px-4 py-6 text-left"
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

                <div className="space-y-3 border-t border-teal-700/70 p-3">
                  <LinkBox
                    label={`${game.name} Game Link`}
                    path={game.gamePath}
                  />

                  <LinkBox
                    label={`${game.name} Controller Link`}
                    path={game.controllerPath}
                  />
                </div>
              </article>
            ))}
          </div>

          <article className="mt-6 overflow-hidden rounded-2xl border border-teal-700 bg-[#083d37]">
            <button
              type="button"
              onClick={() => setView("CONTROLLED_SO")}
              className="block w-full p-6 text-left"
            >
              <span className="block text-lg font-black text-amber-200">
                🏏 SUPER OVER · ADMIN CONTROL
              </span>

              <span className="mt-2 block text-sm text-cyan-100">
                Ball queue · Live rates · Publish match ›
              </span>
            </button>

            <div className="border-t border-teal-700/70 p-3">
              <LinkBox
                label="Published Super Over Game Link"
                path="/games/animated-super-over"
              />
            </div>
          </article>

          <article className="mt-6 overflow-hidden rounded-2xl border border-teal-700 bg-[#083d37]">
            <div className="p-5">
              <h2 className="text-lg font-black text-amber-200">
                🟢 🔴 🟣 COLOR PREDICTION
              </h2>

              <p className="mt-2 text-xs leading-6 text-cyan-100">
                Automatic game with random results.
                This game does not use a result
                Controller ID.
              </p>
            </div>

            <div className="border-t border-teal-700/70 p-3">
              <LinkBox
                label="Color Prediction Game Link"
                path="/games/color-prediction"
              />
            </div>
          </article>

          <div className="mt-6">
            <AutoGameControls />
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <div className="border-b border-teal-700 bg-[#061c1a] p-3 text-white">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => setView("GAMES")}
            className="rounded-xl border border-teal-700 bg-[#083d37] p-4 text-left"
          >
            <span className="block font-black text-amber-300">
              🔑 GAME IDs & LINKS
            </span>

            <span className="mt-1 block text-xs leading-5 text-cyan-100">
              Controller IDs · Copy Links · PLAY / PAUSE ›
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

          <button
            type="button"
            onClick={() => setView("PLAYING_HISTORY")}
            className="rounded-xl border border-cyan-400/40 bg-teal-700/30 p-4 text-left"
          >
            <span className="block font-black text-cyan-100">
              📋 CUSTOMER PLAYING HISTORY
            </span>

            <span className="mt-1 block text-xs leading-5 text-slate-200">
              8 Games + Sports · New Admin IDs · Settlement ›
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
