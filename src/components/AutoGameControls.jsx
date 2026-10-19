import React, {
  useRef,
  useState,
} from "react";

import GameArtwork, {
  ACTIVE_GAMES,
} from "./GameArtwork";

import {
  flightApi,
  useFlightState,
} from "./flightClient";

export default function AutoGameControls() {
  const {
    data,
    error,
    unauthorized,
    refresh,
  } = useFlightState(
    "/api/admin/automatic-games",
  );

  const [busy, setBusy] =
    useState(null);

  const [message, setMessage] =
    useState("");

  const pending = useRef(false);

  const change = async (
    game,
    action,
    version,
  ) => {
    if (pending.current) return;

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

      const name = ACTIVE_GAMES.find(
        item => item.id === game,
      )?.name;

      setMessage(
        `${name}: ${
          action === "PAUSE"
            ? "PAUSED"
            : "PLAYING"
        }`,
      );

      await refresh();
    } catch (requestError) {
      setMessage(
        requestError.message,
      );

      await refresh();
    } finally {
      pending.current = false;
      setBusy(null);
    }
  };

  return (
    <section className="mt-8 border-t border-teal-700/60 pt-6">
      <h2 className="text-lg font-black text-amber-200">
        AUTOMATIC GAME CONTROLS
      </h2>

      <p className="mt-2 text-sm leading-6 text-slate-300">
        Pause freezes this game's timer and
        card reveal. Existing bets stay
        reserved. Play resumes from the same
        point. Other games keep running.
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
        {ACTIVE_GAMES.slice(2).map(game => {
          const control =
            data?.controls?.find(
              item =>
                item.game === game.id,
            );

          return (
            <article
              key={game.id}
              className="overflow-hidden rounded-2xl border border-teal-700 bg-[#08332e]"
            >
              <div className="h-40 bg-black">
                <GameArtwork
                  game={game.id}
                />
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-black">
                    {game.name}
                  </h3>

                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-black ${
                      control?.paused
                        ? "bg-amber-300/15 text-amber-200"
                        : "bg-emerald-300/15 text-emerald-200"
                    }`}
                  >
                    {!control
                      ? "LOADING"
                      : control.paused
                        ? "PAUSED"
                        : "PLAYING"}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    aria-label={
                      `Play ${game.name}`
                    }
                    disabled={
                      !control ||
                      !control.paused ||
                      Boolean(busy)
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
                    ▶ PLAY
                  </button>

                  <button
                    type="button"
                    aria-label={
                      `Pause ${game.name}`
                    }
                    disabled={
                      !control ||
                      control.paused ||
                      Boolean(busy)
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
                    Ⅱ PAUSE
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
