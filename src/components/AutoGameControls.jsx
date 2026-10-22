import React, {
  useRef,
  useState,
} from "react";

import GameArtwork from "./GameArtwork";

import {
  flightApi,
  useFlightState,
} from "./flightClient";

const AUTOMATIC_GAMES = [
  {
    id: "super-over",
    name: "SUPER OVER",
    href: "/games/super-over",
  },
  {
    id: "dragon-tiger",
    name: "DRAGON TIGER",
    href: "/games/dragon-tiger",
  },
  {
    id: "andar-bahar",
    name: "ANDAR BAHAR",
    href: "/games/andar-bahar",
  },
  {
    id: "lucky-seven",
    name: "LUCKY SEVEN",
    href: "/games/lucky-seven",
  },
  {
    id: "color-prediction",
    name: "COLOR PREDICTION",
    href: "/games/color-prediction",
  },
];

function GameLink({ game }) {
  const inputRef = useRef(null);
  const [message, setMessage] = useState("");

  const url = new URL(
    game.href,
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
    <div className="mt-4 rounded-xl border border-teal-700/70 bg-black/20 p-3">
      <label className="block">
        <span className="mb-2 block text-[10px] font-black uppercase tracking-wide text-cyan-100">
          {game.name} GAME LINK
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
          aria-label={`Copy ${game.name} game link`}
          onClick={copy}
          className="rounded-lg bg-cyan-300 px-2 py-2 text-[10px] font-black text-black"
        >
          COPY
        </button>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${game.name}`}
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

export default function AutoGameControls() {
  const {
    data,
    error,
    unauthorized,
    refresh,
  } = useFlightState(
    "/api/admin/automatic-games",
  );

  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState("");

  const pending = useRef(false);

  const controls = Array.isArray(data?.controls)
    ? data.controls
    : [];

  const change = async (
    game,
    action,
    version,
  ) => {
    if (pending.current || unauthorized) return;

    pending.current = true;
    setBusy(game);
    setMessage("");

    try {
      await flightApi(
        `/api/admin/automatic-games/${game}/status`,
        {
          action,
          version,
        },
      );

      const name = AUTOMATIC_GAMES.find(
        item => item.id === game,
      )?.name || game;

      setMessage(
        `${name}: ${
          action === "PAUSE"
            ? "PAUSED"
            : "PLAYING"
        }`,
      );
    } catch (requestError) {
      setMessage(requestError.message);
    } finally {
      try {
        await refresh();
      } catch {
        // Polling will retry loading the server state.
      }

      pending.current = false;
      setBusy(null);
    }
  };

  return (
    <section className="mt-8 border-t border-teal-700/60 pt-6 text-white">
      <h2 className="text-lg font-black text-amber-200">
        AUTOMATIC GAME CONTROLS
      </h2>

      <p className="mt-2 text-sm leading-6 text-slate-300">
        Play / Pause controls are available when
        the server supplies this game's control
        state. Copy or open each game link below.
      </p>

      {(message || error) && (
        <p
          role="status"
          className="my-4 rounded-xl border border-amber-200/20 bg-amber-200/10 p-3 text-sm text-amber-100"
        >
          {message || error}
        </p>
      )}

      {unauthorized && (
        <p className="mt-3 text-sm text-amber-200">
          Admin session expired.
          Please login again.
        </p>
      )}

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {AUTOMATIC_GAMES.map(game => {
          const control = controls.find(
            item => item.game === game.id,
          );

          const hasControl =
            typeof control?.paused === "boolean" &&
            control.version !== undefined &&
            control.version !== null;

          const disabled =
            !hasControl ||
            Boolean(busy) ||
            Boolean(unauthorized) ||
            Boolean(error);

          const status = unauthorized
            ? "LOGIN REQUIRED"
            : error
              ? "UNAVAILABLE"
              : !data
                ? "LOADING"
                : !hasControl
                  ? "NOT CONNECTED"
                  : control.paused
                    ? "PAUSED"
                    : "PLAYING";

          return (
            <article
              key={game.id}
              className="min-w-0 overflow-hidden rounded-2xl border border-teal-700 bg-[#08332e]"
            >
              <div className="h-40 bg-black">
                <GameArtwork game={game.id} />
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-black">
                    {game.name}
                  </h3>

                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-black ${
                      !hasControl || error || unauthorized
                        ? "bg-slate-300/15 text-slate-200"
                        : control.paused
                          ? "bg-amber-300/15 text-amber-200"
                          : "bg-emerald-300/15 text-emerald-200"
                    }`}
                  >
                    {status}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    aria-label={`Play ${game.name}`}
                    disabled={
                      disabled || !control?.paused
                    }
                    onClick={() =>
                      change(
                        game.id,
                        "PLAY",
                        control.version,
                      )
                    }
                    className="rounded-xl bg-emerald-300 py-3 text-sm font-black text-black disabled:opacity-30"
                  >
                    {busy === game.id
                      ? "UPDATING…"
                      : "▶ PLAY"}
                  </button>

                  <button
                    type="button"
                    aria-label={`Pause ${game.name}`}
                    disabled={
                      disabled || control?.paused
                    }
                    onClick={() =>
                      change(
                        game.id,
                        "PAUSE",
                        control.version,
                      )
                    }
                    className="rounded-xl bg-amber-300 py-3 text-sm font-black text-black disabled:opacity-30"
                  >
                    {busy === game.id
                      ? "UPDATING…"
                      : "Ⅱ PAUSE"}
                  </button>
                </div>

                {data &&
                  !hasControl &&
                  !error &&
                  !unauthorized && (
                    <p className="mt-3 text-xs leading-5 text-amber-200">
                      Server Play / Pause control is
                      not connected for this game yet.
                      The game link is available below.
                    </p>
                  )}

                <GameLink game={game} />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
