import React, { useEffect, useRef, useState } from "react";

import {
  flightApi,
  useFlightState,
  flightRequestKey,
  notifyFlightWallet,
} from "./flightClient";

export default function TSBFlightPage({
  user,
  onBack,
  onLogout,
}) {
  const { data, error, receivedAt, refresh } =
    useFlightState("/api/flight/state");

  const [clock, setClock] = useState(Date.now());
  const [drafts, setDrafts] = useState({
    1: "50",
    2: "50",
  });

  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;

    const timer = setInterval(
      () => setClock(Date.now()),
      50,
    );

    return () => {
      alive.current = false;
      clearInterval(timer);
    };
  }, []);

  const customerId =
    user?.id ??
    user?.customerId ??
    user?.customer_id;

  const wrongAccount =
    data &&
    String(data.customerId) !== String(customerId);

  const round = data?.round;

  const elapsed = Math.max(0, clock - receivedAt);

  const serverNow = data
    ? new Date(data.serverTime).getTime() + elapsed
    : clock;

  const start = round
    ? new Date(round.startsAt).getTime()
    : 0;

  const fresh = Boolean(
    data &&
    !error &&
    elapsed < 3500 &&
    !wrongAccount,
  );

  const phase =
    round?.phase === "CRASHED"
      ? "CRASHED"
      : !round
        ? "WAITING"
        : serverNow < start
          ? "COUNTDOWN"
          : "RUNNING";

  const multiplier =
    phase === "CRASHED"
      ? round.crashMultiplier
      : phase === "RUNNING"
        ? Math.floor(
            Math.exp(
              (
                (data?.growthRate || 0.085) *
                Math.max(0, serverNow - start)
              ) / 1000,
            ) * 100,
          ) / 100
        : 1;

  const sound = useFlightSound(
    phase,
    round?.id,
    fresh,
  );

  const shownBalance = data
    ? `₹${Number(data.balance).toLocaleString("en-IN")}`
    : "Loading...";

  const [verified, setVerified] = useState("");

  useEffect(() => {
    let active = true;

    setVerified("");

    if (
      round?.phase === "CRASHED" &&
      round.seed &&
      globalThis.crypto?.subtle
    ) {
      const text =
        `${round.id}:${Math.round(
          round.crashMultiplier * 100,
        )}:${round.seed}`;

      crypto.subtle
        .digest(
          "SHA-256",
          new TextEncoder().encode(text),
        )
        .then(hash => {
          const result = Array.from(
            new Uint8Array(hash),
            x => x.toString(16).padStart(2, "0"),
          ).join("");

          if (active) {
            setVerified(
              result === round.commitment
                ? "Locked result verified ✓"
                : "Result verification failed",
            );
          }
        })
        .catch(() => {
          if (active) {
            setVerified("Verification unavailable.");
          }
        });
    }

    return () => {
      active = false;
    };
  }, [
    round?.id,
    round?.phase,
    round?.seed,
    round?.crashMultiplier,
    round?.commitment,
  ]);

  return (
    <div className="min-h-screen bg-[#060d19] font-sans text-white">
      <header className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#0b1628] p-4">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-cyan-400/30 px-3 py-2 text-sm text-cyan-200"
        >
          ← Home
        </button>

        <div className="min-w-0 text-center">
          <h1 className="text-lg font-black text-cyan-300">
            TSB FLIGHT
          </h1>

          <p className="text-[10px] text-slate-400">
            MULTIPLAYER DEMO
          </p>
        </div>

        <div className="shrink-0 rounded-xl border border-amber-400/30 bg-[#03121d]/90 px-3 py-2 text-right">
          <p className="whitespace-nowrap text-sm font-black tabular-nums text-amber-300">
            {shownBalance}
          </p>
        </div>
      </header>

      <div className="mx-auto flex max-w-4xl justify-end px-4 pt-2">
        <button
          type="button"
          onClick={sound.toggle}
          aria-pressed={sound.enabled}
          className="rounded-lg border border-cyan-400/30 px-3 py-2 text-xs text-cyan-200"
        >
          {sound.enabled
            ? "🔊 Sound ON"
            : "🔇 Sound OFF"}
        </button>
      </div>

      <main className="mx-auto max-w-4xl space-y-4 p-4">
        {(error || wrongAccount) && (
          <div
            role="alert"
            className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200"
          >
            {wrongAccount
              ? "Customer session does not match. Logout and login again."
              : error}

            <button
              type="button"
              onClick={onLogout}
              className="ml-3 underline"
            >
              Logout / login again
            </button>
          </div>
        )}

        <FlightScene
          round={round}
          phase={phase}
          multiplier={multiplier}
          now={serverNow}
          start={start}
          verified={verified}
          fresh={fresh}
        />

        {[1, 2].map(slot => (
          <BetBox
            key={`${customerId}-${slot}`}
            slot={slot}
            round={round}
            phase={phase}
            fresh={fresh}
            multiplier={multiplier}
            stake={drafts[slot]}
            setStake={value =>
              setDrafts(previous => ({
                ...previous,
                [slot]: value,
              }))
            }
            bets={data?.bets || []}
            refresh={refresh}
          />
        ))}

        <section className="rounded-2xl border border-white/10 bg-[#0d192a] p-4">
          <h2 className="font-black">
            Recent rounds
          </h2>

          <div className="mt-3 flex flex-wrap gap-2">
            {data?.history?.map(r => (
              <span
                key={r.id}
                className="rounded-full border border-red-400/20 bg-red-400/10 px-3 py-1 text-xs text-red-200"
              >
                #{r.id} · {r.crashMultiplier.toFixed(2)}×
              </span>
            ))}

            {!data?.history?.length && (
              <p className="text-xs text-slate-400">
                No completed rounds.
              </p>
            )}
          </div>
        </section>

        <section className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0d192a] p-4">
          <h2 className="font-black">
            Your flight history
          </h2>

          <table className="mt-3 w-full text-left text-xs">
            <thead className="text-slate-400">
              <tr>
                <th className="py-2">Round</th>
                <th>Box</th>
                <th>Stake</th>
                <th>Result</th>
                <th>Returned</th>
              </tr>
            </thead>

            <tbody>
              {data?.bets?.map(b => (
                <tr
                  key={b.id}
                  className="border-t border-white/5"
                >
                  <td className="py-3">
                    #{b.roundId}
                  </td>

                  <td>{b.slot || 1}</td>
                  <td>{b.stake}</td>

                  <td>
                    {b.status}

                    {b.cashoutMultiplier
                      ? ` · ${b.cashoutMultiplier.toFixed(2)}×`
                      : ""}
                  </td>

                  <td>{b.payout}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <p className="px-1 text-[10px] leading-5 text-slate-400">
          Demo coins only · Controller fixes the crash
          before betting opens. Closing the page does
          not cash out; the server must accept cash
          out before crash.
        </p>

        {round && (
          <details className="break-all rounded-xl border border-white/10 p-3 text-[10px] text-slate-400">
            <summary className="cursor-pointer">
              Locked round verification
            </summary>

            <p className="mt-2">
              SHA-256 commitment: {round.commitment}
            </p>

            {round.seed && (
              <p className="mt-2">
                Revealed seed: {round.seed}
              </p>
            )}

            <p className="mt-2">
              Commitment input: round ID : crash
              multiplier × 100 : seed. This verifies
              the locked result; this test mode is
              admin-selected, not random.
            </p>
          </details>
        )}
      </main>
    </div>
  );
}

function BetBox({
  slot,
  round,
  phase,
  fresh,
  multiplier,
  bets,
  refresh,
  stake,
  setStake,
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(null);
  const [queued, setQueued] = useState(null);

  const pending = useRef(null);
  const inflight = useRef(false);
  const mounted = useRef(false);
  const queueRef = useRef(null);
  const latest = useRef(null);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  const remote = bets
    .filter(
      b =>
        String(b.roundId) === String(round?.id) &&
        Number(b.slot || 1) === slot,
    )
    .reduce(
      (best, b) =>
        !best || BigInt(b.id) > BigInt(best.id)
          ? b
          : best,
      null,
    );

  const local =
    saved &&
    String(saved.roundId) === String(round?.id)
      ? saved
      : null;

  let bet = remote;

  if (
    local &&
    (!remote || BigInt(local.id) > BigInt(remote.id))
  ) {
    bet = local;
  } else if (
    local &&
    remote &&
    String(local.id) === String(remote.id) &&
    local.status !== "PLACED"
  ) {
    bet = local;
  }

  const placed = bet?.status === "PLACED";
  const cancel = placed && phase === "COUNTDOWN";
  const cashout = placed && phase === "RUNNING";

  const canBet =
    (!bet || bet.status === "CANCELLED") &&
    phase === "COUNTDOWN";

  const editable =
    !busy &&
    !queued &&
    !placed &&
    !pending.current;

  latest.current = {
    fresh,
    round,
    phase,
    bet,
    canBet,
  };

  const clearQueue = () => {
    queueRef.current = null;
    setQueued(null);
  };

  const submit = async (
    action,
    payload,
    selectedBet,
  ) => {
    if (inflight.current) return;

    inflight.current = true;
    setBusy(true);
    setMessage("");

    try {
      const result =
        action === "bet"
          ? await flightApi(
              "/api/flight/bets",
              payload,
            )
          : await flightApi(
              `/api/flight/bets/${selectedBet.id}/${action}`,
              {},
            );

      if (!result?.bet) {
        throw new Error(
          "Unable to confirm bet status.",
        );
      }

      if (action === "bet") {
        pending.current = null;
      }

      notifyFlightWallet();

      if (mounted.current) {
        setSaved(result.bet);

        setMessage(
          result.bet.status === "CANCELLED"
            ? "Bet cancelled · stake returned."
            : result.bet.status === "CASHED_OUT"
              ? `Cashed out · ${Number(
                  result.bet.payout,
                ).toLocaleString("en-IN")} coins returned.`
              : "",
        );
      }
    } catch (error) {
      if (
        [400, 401, 403, 404, 409].includes(
          error.status,
        )
      ) {
        pending.current = null;
      }

      if (mounted.current) {
        setMessage(
          action === "bet" && pending.current
            ? "Confirming bet · tap RETRY to check."
            : error.status === 409
              ? "Action closed · refreshing status."
              : error.message,
        );
      }
    } finally {
      inflight.current = false;

      if (mounted.current) {
        setBusy(false);
        refresh();
      }
    }
  };

  // A queued selection is consumed once.
  useEffect(() => {
    const q = queueRef.current;

    if (
      !q ||
      !fresh ||
      inflight.current ||
      phase !== "COUNTDOWN" ||
      !round
    ) {
      return;
    }

    if (
      q.afterRound != null &&
      BigInt(round.id) <= BigInt(q.afterRound)
    ) {
      return;
    }

    clearQueue();

    if (!canBet) {
      setMessage("This box already has a bet.");
      return;
    }

    const payload = {
      roundId: round.id,
      slot,
      stake: q.stake,
      requestKey: q.requestKey,
    };

    pending.current = payload;

    void submit("bet", payload);
  }, [round?.id, phase, fresh, queued, canBet]);

  const change = delta => {
    if (editable) {
      setStake(
        String(
          Math.min(
            25000,
            Math.max(
              10,
              (Number(stake) || 0) + delta,
            ),
          ),
        ),
      );
    }
  };

  const act = () => {
    if (inflight.current) return;

    if (queueRef.current) {
      clearQueue();
      setMessage("Next bet cancelled.");
      return;
    }

    const state = latest.current;

    if (!state.fresh) {
      setMessage("Connection unavailable.");
      return;
    }

    if (cancel) {
      void submit("cancel", null, bet);
      return;
    }

    if (cashout) {
      void submit("cashout", null, bet);
      return;
    }

    if (pending.current) {
      void submit("bet", pending.current);
      return;
    }

    const amount = Number(stake);

    if (
      !Number.isSafeInteger(amount) ||
      amount < 10 ||
      amount > 25000
    ) {
      setMessage(
        "Enter 10–25,000 whole demo coins.",
      );

      return;
    }

    if (placed) {
      setMessage("Refreshing bet status.");
      refresh();
      return;
    }

    if (canBet) {
      const payload = {
        roundId: round.id,
        slot,
        stake: amount,
        requestKey: flightRequestKey(),
      };

      pending.current = payload;

      void submit("bet", payload);
    } else {
      const q = {
        stake: amount,
        requestKey: flightRequestKey(),
        afterRound: round?.id ?? null,
      };

      queueRef.current = q;
      setQueued(q);
      setMessage("");
    }
  };

  const red = Boolean(queued || cancel);

  const label = busy
    ? "PROCESSING…"
    : red
      ? "CANCEL"
      : cashout
        ? "CASH OUT"
        : pending.current
          ? "RETRY"
          : "BET";

  const amount = cashout
    ? `≈ ${Math.floor(
        Number(bet.stake) * multiplier,
      ).toLocaleString("en-IN")}`
    : Number(
        queued?.stake ??
          (cancel || cashout
            ? bet.stake
            : stake || 0),
      ).toLocaleString("en-IN");

  return (
    <section className="rounded-2xl border border-white/10 bg-[#0d192a] p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-black text-cyan-200">
          BET BOX {slot}
        </h2>

        <span className="text-[10px] text-slate-400">
          10–25,000 demo coins
        </span>
      </div>

      <div className="grid grid-cols-2 items-end gap-3">
        <div className="min-w-0">
          <div className="flex items-center rounded-full border border-white/20 bg-[#060d19] p-1">
            <button
              type="button"
              aria-label={`Decrease box ${slot} stake`}
              disabled={!editable}
              onClick={() => change(-10)}
              className="h-10 w-8 shrink-0 rounded-full text-xl disabled:opacity-30"
            >
              −
            </button>

            <input
              aria-label={`Box ${slot} stake`}
              inputMode="numeric"
              value={stake}
              disabled={!editable}
              onChange={event => {
                if (
                  /^\d*$/.test(event.target.value)
                ) {
                  setStake(event.target.value);
                }
              }}
              className="w-full min-w-0 bg-transparent text-center text-xl font-black outline-none disabled:opacity-50"
            />

            <button
              type="button"
              aria-label={`Increase box ${slot} stake`}
              disabled={!editable}
              onClick={() => change(10)}
              className="h-10 w-8 shrink-0 rounded-full text-xl disabled:opacity-30"
            >
              +
            </button>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            {[100, 500, 1000, 5000].map(n => (
              <button
                key={n}
                type="button"
                disabled={!editable}
                onClick={() => change(n)}
                className="rounded-full bg-white/5 py-2 text-xs font-bold text-slate-300 disabled:opacity-30"
              >
                +{n.toLocaleString("en-IN")}
              </button>
            ))}
          </div>
        </div>

        <div className="min-w-0">
          <p className="mb-2 whitespace-nowrap text-center text-[9px] text-slate-400 sm:text-xs">
            {queued
              ? "Waiting for next round"
              : cancel
                ? "Bet placed"
                : cashout
                  ? "Flight running"
                  : "\u00a0"}
          </p>

          <button
            type="button"
            disabled={busy || (!fresh && !queued)}
            onClick={act}
            className={`w-full min-w-0 rounded-2xl px-2 py-3 font-black disabled:opacity-40 ${
              red
                ? "bg-red-500 text-white"
                : cashout
                  ? "bg-amber-300 text-black"
                  : "bg-emerald-400 text-black"
            }`}
          >
            <span className="block text-sm">
              {label}
            </span>

            <span className="mt-2 block break-words text-xl">
              {amount}
            </span>

            <span className="mt-1 block text-[10px]">
              DEMO COINS
            </span>
          </button>
        </div>
      </div>

      {message && (
        <p
          role="status"
          className="mt-2 text-xs text-cyan-100"
        >
          {message}
        </p>
      )}
    </section>
  );
}

function FlightScene({
  round,
  phase,
  multiplier,
  now,
  start,
  verified,
  fresh,
}) {
  const running = phase === "RUNNING";
  const crashed = phase === "CRASHED";

  const seconds = Math.max(
    0,
    (now - start) / 1000,
  );

  const duration = crashed
    ? Math.log(
        Math.max(
          1,
          round?.crashMultiplier || 1,
        ),
      ) / 0.085
    : seconds;

  const progress =
    running || crashed
      ? 1 - Math.exp(-duration / 15)
      : 0;

  const x = 52 + 440 * progress;

  const y =
    265 -
    165 * Math.pow(progress, 1.35) +
    (
      running
        ? Math.sin(seconds * 2) * 4 * progress
        : 0
    );

  const curve =
    `M 52 265 Q ${
      52 + (x - 52) * 0.55
    } 265 ${x} ${y}`;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-[#07111f]">
      <style>{`
        @keyframes tsb-grid {
          to {
            background-position: -36px 36px;
          }
        }

        @keyframes tsb-depart {
          to {
            transform: translate(200px, -120px);
            opacity: 0;
          }
        }

        @keyframes tsb-engine {
          to {
            opacity: .4;
            transform: scaleX(.6);
          }
        }

        .tsb-flight-grid {
          position: absolute;
          inset: 0;
          opacity: .15;
          background-image:
            linear-gradient(
              #38bdf8 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              #38bdf8 1px,
              transparent 1px
            );
          background-size: 36px 36px;
        }

        .tsb-flight-grid.fly {
          animation: tsb-grid 2s linear infinite;
        }

        .tsb-plane-depart {
          animation: tsb-depart .7s ease-in forwards;
        }

        .tsb-plane-engine {
          transform-box: fill-box;
          transform-origin: right;
          animation: tsb-engine .18s infinite alternate;
        }
      `}</style>

      <div
        className={`tsb-flight-grid ${
          running ? "fly" : ""
        }`}
      />

      <div className="absolute inset-x-0 top-5 z-10 px-3 text-center">
        <p className="text-[10px] font-bold tracking-widest text-slate-400">
          {round
            ? `ROUND #${round.id}`
            : "TSB FLIGHT"}
        </p>

        <p
          className={`mt-4 text-5xl font-black sm:text-7xl ${
            crashed
              ? "text-red-400"
              : "text-cyan-300"
          }`}
        >
          {phase === "WAITING"
            ? "WAITING"
            : phase === "COUNTDOWN"
              ? Math.max(
                  0,
                  Math.ceil((start - now) / 1000),
                )
              : `${multiplier.toFixed(2)}×`}
        </p>

        <p className="mt-2 text-[10px] font-black">
          {phase === "COUNTDOWN"
            ? "BETTING OPEN · RESULT LOCKED"
            : crashed
              ? "ROUND CRASHED"
              : running
                ? "FLIGHT RUNNING"
                : "WAITING FOR NEXT ROUND"}
        </p>
      </div>

      <svg
        viewBox="0 0 600 330"
        className="relative block w-full"
        role="img"
        aria-label={
          running
            ? "Plane flying upward"
            : "Flight display"
        }
      >
        <defs>
          <linearGradient
            id="tsb-flight-fill"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor={
                crashed ? "#f87171" : "#22d3ee"
              }
              stopOpacity=".3"
            />

            <stop
              offset="100%"
              stopColor="#22d3ee"
              stopOpacity="0"
            />
          </linearGradient>
        </defs>

        <path
          d="M 30 35 V 285 H 570"
          fill="none"
          stroke="#334155"
        />

        {(running || crashed) && (
          <>
            <path
              d={`${curve} L ${x} 285 L 52 285 Z`}
              fill="url(#tsb-flight-fill)"
            />

            <path
              d={curve}
              fill="none"
              stroke={
                crashed ? "#f87171" : "#22d3ee"
              }
              strokeWidth="4"
              strokeLinecap="round"
            />
          </>
        )}

        <g transform={`translate(${x} ${y})`}>
          <g
            key={`${round?.id}-${crashed}`}
            className={
              crashed ? "tsb-plane-depart" : ""
            }
          >
            <g
              transform={`rotate(${
                -8 - progress * 25
              })`}
            >
              {running && (
                <path
                  className="tsb-plane-engine"
                  d="M -30 -3 L -65 0 L -30 5 Z"
                  fill="#fbbf24"
                />
              )}

              <path
                d="M -36 -5 L -14 -6 L -5 -26 L 5 -26 L 4 -6 L 25 -5 Q 42 -3 44 1 Q 39 6 25 7 L 3 7 L -14 25 L -24 25 L -14 6 L -34 6 L -45 15 L -51 15 L -44 2 L -51 -11 L -44 -11 Z"
                fill="#67e8f9"
                stroke="#ecfeff"
                strokeWidth="1.3"
              />

              <path
                d="M 18 -4 L 28 -3 L 32 0 L 18 0 Z"
                fill="#0c4a6e"
              />
            </g>
          </g>
        </g>
      </svg>

      <div className="relative min-h-[30px] px-3 pb-3 text-center text-[10px] text-slate-300">
        {!fresh && round
          ? "Connection unavailable — actions paused; animation is an estimate."
          : verified}
      </div>
    </section>
  );
}

function useFlightSound(phase, roundId, fresh) {
  const [enabled, setEnabled] = useState(false);

  const [visible, setVisible] = useState(
    () => !document.hidden,
  );

  const context = useRef(null);
  const previous = useRef(null);

  useEffect(() => {
    const changed = () =>
      setVisible(!document.hidden);

    document.addEventListener(
      "visibilitychange",
      changed,
    );

    return () =>
      document.removeEventListener(
        "visibilitychange",
        changed,
      );
  }, []);

  useEffect(
    () => () => {
      context.current?.close().catch(() => {});
    },
    [],
  );

  const toggle = async () => {
    if (enabled) {
      setEnabled(false);
      return;
    }

    try {
      const AudioContext =
        window.AudioContext ||
        window.webkitAudioContext;

      if (!AudioContext) return;

      if (!context.current) {
        context.current = new AudioContext();
      }

      await context.current.resume();
      setEnabled(true);
    } catch {
      setEnabled(false);
    }
  };

  useEffect(() => {
    const key = `${roundId}:${phase}`;

    const transitioned =
      previous.current &&
      previous.current !== key;

    previous.current = key;

    const ctx = context.current;

    if (
      !enabled ||
      !visible ||
      !fresh ||
      !ctx
    ) {
      return;
    }

    const nodes = [];

    const master =
      ctx.createDynamicsCompressor();

    master.threshold.value = -12;
    master.knee.value = 18;
    master.ratio.value = 6;
    master.attack.value = 0.005;
    master.release.value = 0.15;

    const outputBoost = ctx.createGain();
    outputBoost.gain.value = 4.5;

    const limiter =
      ctx.createDynamicsCompressor();

    limiter.threshold.value = -1;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.08;

    master.connect(outputBoost);
    outputBoost.connect(limiter);
    limiter.connect(ctx.destination);

    nodes.push(master, outputBoost, limiter);

    const tone = (
      frequency,
      duration,
      type = "sine",
      volume = 0.22,
      end = frequency,
    ) => {
      const oscillator =
        ctx.createOscillator();

      const gain = ctx.createGain();

      oscillator.type = type;

      oscillator.frequency.setValueAtTime(
        frequency,
        ctx.currentTime,
      );

      oscillator.frequency.exponentialRampToValueAtTime(
        end,
        ctx.currentTime + duration,
      );

      gain.gain.setValueAtTime(
        volume,
        ctx.currentTime,
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        ctx.currentTime + duration,
      );

      oscillator.connect(gain);
      gain.connect(master);

      oscillator.start();
      oscillator.stop(ctx.currentTime + duration);

      nodes.push(oscillator, gain);
    };

    let timer;

    if (phase === "RUNNING") {
      const thump = () => {
        const now = ctx.currentTime;

        const bass = ctx.createOscillator();
        const knock = ctx.createOscillator();
        const body = ctx.createGain();
        const attack = ctx.createGain();

        bass.type = "sine";
        knock.type = "triangle";

        bass.frequency.setValueAtTime(135, now);
        bass.frequency.exponentialRampToValueAtTime(
          48,
          now + 0.19,
        );

        knock.frequency.setValueAtTime(380, now);
        knock.frequency.exponentialRampToValueAtTime(
          105,
          now + 0.055,
        );

        body.gain.setValueAtTime(0.0001, now);
        body.gain.linearRampToValueAtTime(
          0.85,
          now + 0.008,
        );

        body.gain.exponentialRampToValueAtTime(
          0.0001,
          now + 0.24,
        );

        attack.gain.setValueAtTime(0.28, now);
        attack.gain.exponentialRampToValueAtTime(
          0.0001,
          now + 0.075,
        );

        bass.connect(body);
        body.connect(master);

        knock.connect(attack);
        attack.connect(master);

        bass.start(now);
        knock.start(now);

        bass.stop(now + 0.26);
        knock.stop(now + 0.09);

        const group = [
          bass,
          knock,
          body,
          attack,
        ];

        nodes.push(...group);

        bass.onended = () => {
          group.forEach(node => {
            node.disconnect();

            const index = nodes.indexOf(node);

            if (index >= 0) {
              nodes.splice(index, 1);
            }
          });
        };
      };

      thump();
      timer = setInterval(thump, 290);
    } else if (phase === "COUNTDOWN") {
      tone(660, 0.09);

      timer = setInterval(
        () => tone(660, 0.09),
        1000,
      );
    } else if (
      phase === "CRASHED" &&
      transitioned
    ) {
      tone(320, 0.8, "triangle", 0.4, 65);
    }

    return () => {
      clearInterval(timer);

      nodes.forEach(node => {
        try {
          if (node.stop) node.stop();
          node.disconnect();
        } catch {
          // Already stopped.
        }
      });
    };
  }, [enabled, visible, fresh, phase, roundId]);

  return { enabled, toggle };
}
