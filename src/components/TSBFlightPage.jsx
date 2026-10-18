import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  flightApi,
  useFlightState,
  flightRequestKey,
  notifyFlightWallet,
} from './flightClient';

/* MOVING FLIGHT DISPLAY */

function FlightScene({
  round,
  phase,
  multiplier,
  serverNow,
  start,
  fresh,
  verified,
}) {
  const running = phase === 'RUNNING';
  const crashed = phase === 'CRASHED';

  const seconds = Math.max(
    0,
    (serverNow - start) / 1000,
  );

  const flightSeconds = crashed
    ? Math.log(
        Math.max(1, Number(round?.crashMultiplier || 1)),
      ) / 0.085
    : seconds;

  /*
    Visual progress does not reveal the crash point.
    The plane approaches the upper right as time passes.
  */
  const progress =
    running || crashed
      ? 1 - Math.exp(-flightSeconds / 15)
      : 0;

  const bob = running
    ? Math.sin(seconds * 2) * 4 * progress
    : 0;

  const x = 45 + 450 * progress;

  const y =
    270 -
    185 * Math.pow(progress, 1.35) +
    bob;

  const controlX = 45 + (x - 45) * 0.55;

  const curve =
    `M 45 270 Q ${controlX} 270 ${x} ${y}`;

  const area =
    `${curve} L ${x} 285 L 45 285 Z`;

  const countdown = Math.max(
    0,
    Math.ceil((start - serverNow) / 1000),
  );

  return (
    <section className="tsb-flight-scene">
      <style>{`
        .tsb-flight-scene {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(34,211,238,.25);
          border-radius: 24px;
          background:
            radial-gradient(
              ellipse at 65% 65%,
              rgba(8,145,178,.18),
              transparent 65%
            ),
            #070f1d;
        }

        .tsb-flight-grid {
          position: absolute;
          inset: 0;
          opacity: .18;
          background-image:
            linear-gradient(
              rgba(56,189,248,.35) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(56,189,248,.35) 1px,
              transparent 1px
            );
          background-size: 36px 36px;
        }

        .tsb-flight-grid-running {
          animation: tsbFlightGridMove 2s linear infinite;
        }

        @keyframes tsbFlightGridMove {
          from {
            background-position: 0 0;
          }
          to {
            background-position: -36px 36px;
          }
        }

        .tsb-flight-art {
          display: block;
          width: 100%;
          height: auto;
        }

        .tsb-flight-plane {
          filter:
            drop-shadow(0 0 5px rgba(34,211,238,.7));
        }

        .tsb-flight-engine {
          transform-box: fill-box;
          transform-origin: right center;
          animation: tsbFlightEngine .18s ease-in-out infinite alternate;
        }

        @keyframes tsbFlightEngine {
          from {
            opacity: .55;
            transform: scaleX(.7);
          }
          to {
            opacity: 1;
            transform: scaleX(1.2);
          }
        }

        .tsb-flight-departure {
          transform-box: fill-box;
          animation: tsbFlightDeparture .7s ease-in forwards;
        }

        @keyframes tsbFlightDeparture {
          from {
            opacity: 1;
            transform: translate(0, 0);
          }
          to {
            opacity: 0;
            transform: translate(200px, -120px);
          }
        }

        .tsb-flight-crash-flash {
          position: absolute;
          inset: 0;
          pointer-events: none;
          animation: tsbFlightCrashFlash .7s ease-out forwards;
        }

        @keyframes tsbFlightCrashFlash {
          from {
            background: rgba(248,113,113,.25);
          }
          to {
            background: transparent;
          }
        }
      `}</style>

      <div
        className={`tsb-flight-grid ${
          running
            ? 'tsb-flight-grid-running'
            : ''
        }`}
      />

      <div className="absolute inset-x-0 top-5 z-10 px-3 text-center">
        <p className="text-[10px] font-bold tracking-[0.25em] text-slate-400">
          {round
            ? `ROUND #${round.id}`
            : 'TSB FLIGHT'}
        </p>

        {phase === 'WAITING' ? (
          <>
            <p className="mt-5 text-2xl font-black text-white">
              Waiting for next round
            </p>

            <p className="mt-2 text-xs text-slate-400">
              Waiting for the controller to lock a round
            </p>
          </>
        ) : phase === 'COUNTDOWN' ? (
          <>
            <p className="mt-3 text-6xl font-black text-cyan-300">
              {countdown}
            </p>

            <p className="mt-2 text-[11px] font-black text-cyan-100">
              BETTING OPEN · RESULT LOCKED
            </p>
          </>
        ) : (
          <>
            <p
              className={`mt-4 text-5xl font-black sm:text-7xl ${
                crashed
                  ? 'text-red-400'
                  : 'text-emerald-300'
              }`}
            >
              {multiplier.toFixed(2)}×
            </p>

            <p className="mt-2 text-xs font-black tracking-widest text-white">
              {crashed
                ? 'ROUND CRASHED'
                : 'FLIGHT RUNNING'}
            </p>
          </>
        )}
      </div>

      <svg
        className="tsb-flight-art relative"
        viewBox="0 0 600 330"
        role="img"
        aria-label={
          crashed
            ? 'Flight round ended'
            : running
              ? 'Plane flying upward'
              : 'Plane waiting for takeoff'
        }
      >
        <defs>
          <linearGradient
            id="tsb-flight-area"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor={crashed ? '#f87171' : '#22d3ee'}
              stopOpacity=".35"
            />

            <stop
              offset="100%"
              stopColor={crashed ? '#f87171' : '#22d3ee'}
              stopOpacity="0"
            />
          </linearGradient>
        </defs>

        <path
          d="M 30 285 H 570"
          stroke="#334155"
          strokeWidth="1"
        />

        <path
          d="M 30 285 V 35"
          stroke="#334155"
          strokeWidth="1"
        />

        {[90, 150, 210, 270, 330, 390, 450, 510].map(
          (position) => (
            <circle
              key={position}
              cx={position}
              cy="285"
              r="2"
              fill="#64748b"
            />
          ),
        )}

        {(running || crashed) && (
          <>
            <path
              d={area}
              fill="url(#tsb-flight-area)"
            />

            <path
              d={curve}
              fill="none"
              stroke={crashed ? '#f87171' : '#22d3ee'}
              strokeWidth="4"
              strokeLinecap="round"
            />
          </>
        )}

        <g
          transform={`translate(${x} ${y})`}
        >
          <g
            key={`${round?.id || 'waiting'}-${crashed}`}
            className={
              crashed
                ? 'tsb-flight-departure'
                : undefined
            }
          >
            <g
              transform={`rotate(${
                running || crashed
                  ? -12 - progress * 15
                  : -5
              })`}
              className="tsb-flight-plane"
            >
              {running && (
                <path
                  className="tsb-flight-engine"
                  d="M -35 -4 L -65 0 L -35 5 Z"
                  fill="#fbbf24"
                />
              )}

              <path
                d="
                  M -36 -5
                  L -14 -6
                  L -5 -26
                  L 5 -26
                  L 4 -6
                  L 25 -5
                  Q 42 -3 44 1
                  Q 39 6 25 7
                  L 3 7
                  L -14 25
                  L -24 25
                  L -14 6
                  L -34 6
                  L -45 15
                  L -51 15
                  L -44 2
                  L -51 -11
                  L -44 -11
                  Z
                "
                fill="#67e8f9"
                stroke="#ecfeff"
                strokeWidth="1.3"
                strokeLinejoin="round"
              />

              <path
                d="M 18 -4 L 28 -3 L 32 0 L 18 0 Z"
                fill="#0c4a6e"
              />

              <path
                d="M -30 1 H 12"
                stroke="#0891b2"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </g>
          </g>
        </g>
      </svg>

      {crashed && (
        <div
          key={`flash-${round?.id}`}
          className="tsb-flight-crash-flash"
        />
      )}

      <div className="relative z-10 min-h-[34px] px-4 pb-3 text-center">
        {!fresh && round && (
          <p className="text-[10px] text-amber-300">
            Connection unavailable — actions paused;
            animation is an estimate.
          </p>
        )}

        {verified && (
          <p className="text-[10px] text-slate-300">
            {verified}
          </p>
        )}
      </div>
    </section>
  );
}

/* CUSTOMER GAME */

export default function TSBFlightPage({
  user,
  onBack,
  onLogout,
}) {
  const {
    data,
    error,
    receivedAt,
    refresh,
  } = useFlightState('/api/flight/state');

  const [stake, setStake] = useState('100');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [clock, setClock] = useState(Date.now());
  const [verified, setVerified] = useState('');

  const busyRef = useRef(false);
  const pendingRef = useRef(null);
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

  const elapsed = Math.max(
    0,
    clock - receivedAt,
  );

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
    round?.phase === 'CRASHED'
      ? 'CRASHED'
      : !round
        ? 'WAITING'
        : serverNow < start
          ? 'COUNTDOWN'
          : 'RUNNING';

  const multiplier =
    phase === 'CRASHED'
      ? round.crashMultiplier
      : phase === 'RUNNING'
        ? Math.floor(
            Math.exp(
              (
                (data?.growthRate || 0.085) *
                Math.max(0, serverNow - start)
              ) / 1000,
            ) * 100,
          ) / 100
        : 1;

  const currentBet = data?.bets?.find(
    (bet) =>
      String(bet.roundId) === round?.id,
  );

  const activeBet =
    currentBet?.status === 'PLACED';

  useEffect(() => {
    const pending = pendingRef.current;

    if (
      pending &&
      round?.id &&
      pending.roundId !== round.id &&
      !busyRef.current
    ) {
      pendingRef.current = null;

      setMessage(
        'Previous round has ended. You can place a new bet in this round.',
      );
    }
  }, [round?.id]);

  const shownBalance = data
    ? Number(data.balance).toLocaleString('en-IN')
    : 'Loading...';

  const doAction = async (action) => {
    if (busyRef.current || !fresh) {
      return;
    }

    busyRef.current = true;

    setBusy(true);
    setMessage('');

    try {
      if (action === 'bet') {
        const amount = Number(stake);

        if (
          !Number.isSafeInteger(amount) ||
          amount < 100 ||
          amount > 25000
        ) {
          throw new Error(
            'Enter 100–25,000 whole demo coins.',
          );
        }

        const payload = pendingRef.current || {
          roundId: round.id,
          stake: amount,
          requestKey: flightRequestKey(),
        };

        pendingRef.current = payload;

        const result = await flightApi(
          '/api/flight/bets',
          payload,
        );

        if (alive.current) {
          setMessage(
            `Bet #${result.bet.id} saved. Server balance: ${result.balance.toLocaleString('en-IN')} demo coins.`,
          );
        }

        pendingRef.current = null;
      } else {
        const result = await flightApi(
          `/api/flight/bets/${currentBet.id}/cashout`,
          {},
        );

        if (alive.current) {
          setMessage(
            `Cashed out at ${result.bet.cashoutMultiplier.toFixed(2)}×. ${result.bet.payout.toLocaleString('en-IN')} coins returned, including stake.`,
          );
        }
      }

      notifyFlightWallet();
    } catch (error) {
      if (alive.current) {
        setMessage(error.message);
      }
    } finally {
      busyRef.current = false;

      if (alive.current) {
        setBusy(false);
        refresh();
      }
    }
  };

  /* VERIFY LOCKED RESULT */

  useEffect(() => {
    let active = true;

    setVerified('');

    if (
      round?.phase === 'CRASHED' &&
      round.seed &&
      globalThis.crypto?.subtle
    ) {
      const text =
        `${round.id}:${Math.round(round.crashMultiplier * 100)}:${round.seed}`;

      crypto.subtle
        .digest(
          'SHA-256',
          new TextEncoder().encode(text),
        )
        .then((hash) => {
          const result = Array.from(
            new Uint8Array(hash),
            (value) =>
              value.toString(16).padStart(2, '0'),
          ).join('');

          if (active) {
            setVerified(
              result === round.commitment
                ? 'Locked result verified ✓'
                : 'Result verification failed',
            );
          }
        })
        .catch(() => {
          if (active) {
            setVerified(
              'Verification unavailable.',
            );
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
    <div className="min-h-screen bg-[#060d19] text-white font-sans">
      <header className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#0b1628] p-4">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-cyan-400/30 px-3 py-2 text-sm text-cyan-200"
        >
          ← Home
        </button>

        <div>
          <h1 className="text-lg font-black text-cyan-300">
            TSB FLIGHT
          </h1>

          <p className="text-[10px] text-slate-400">
            MULTIPLAYER DEMO
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs text-slate-400">
            Demo coins
          </p>

          <p className="font-black text-amber-300">
            {shownBalance}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-4 p-4">
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100">
          <strong>
            Admin-controlled demo test round.
          </strong>{' '}
          The controller locks the crash point before
          betting opens. Demo coins only. Closing this
          page does not cash out; the server must accept
          your cash-out request before crash.
        </div>

        {(error || wrongAccount) && (
          <div
            role="alert"
            className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200"
          >
            {wrongAccount
              ? 'Customer session does not match. Logout and login again.'
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
          serverNow={serverNow}
          start={start}
          fresh={fresh}
          verified={verified}
        />

        {/* BET AND CASH OUT */}

        <section className="rounded-2xl border border-white/10 bg-[#0d192a] p-4">
          <label
            htmlFor="flight-stake"
            className="text-xs font-bold text-slate-300"
          >
            Stake · 100–25,000 demo coins · one bet per round
          </label>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              id="flight-stake"
              type="text"
              inputMode="numeric"
              value={stake}
              disabled={
                busy ||
                Boolean(currentBet) ||
                Boolean(pendingRef.current)
              }
              onChange={(event) => {
                if (
                  /^\d*$/.test(event.target.value)
                ) {
                  setStake(event.target.value);
                }
              }}
              className="min-w-0 rounded-xl border border-white/20 bg-[#060d19] px-4 py-3 text-xl font-bold disabled:opacity-50"
            />

            {activeBet && phase === 'RUNNING' ? (
              <button
                type="button"
                disabled={busy || !fresh}
                onClick={() => doAction('cashout')}
                className="rounded-xl bg-amber-300 px-4 py-3 font-black text-black disabled:opacity-40"
              >
                {busy
                  ? 'PROCESSING…'
                  : `CASH OUT · ≈ ${Math.floor(currentBet.stake * multiplier).toLocaleString('en-IN')}`}
              </button>
            ) : (
              <button
                type="button"
                disabled={
                  busy ||
                  !fresh ||
                  phase !== 'COUNTDOWN' ||
                  Boolean(currentBet)
                }
                onClick={() => doAction('bet')}
                className="rounded-xl bg-cyan-400 px-4 py-3 font-black text-[#06101b] disabled:opacity-40"
              >
                {busy
                  ? 'SAVING…'
                  : currentBet
                    ? 'BET RECORDED'
                    : pendingRef.current
                      ? 'RETRY SAME BET'
                      : 'PLACE DEMO BET'}
              </button>
            )}
          </div>

          {currentBet && (
            <p className="mt-3 text-xs text-slate-300">
              This round:{' '}
              {currentBet.stake.toLocaleString('en-IN')}
              {' coins · '}
              {currentBet.status}
            </p>
          )}

          {message && (
            <p
              role="status"
              className="mt-3 rounded-lg bg-white/5 p-3 text-sm text-cyan-100"
            >
              {message}
            </p>
          )}

          <p className="mt-3 text-[11px] leading-5 text-slate-400">
            Cash-out timing and payout are decided by
            the server when it processes the request.
            A round can crash at 1.00× immediately.
            No new bets are accepted after flight starts.
          </p>
        </section>

        {/* RECENT ROUNDS */}

        <section className="rounded-2xl border border-white/10 bg-[#0d192a] p-4">
          <h2 className="font-black">
            Recent rounds
          </h2>

          <div className="mt-3 flex flex-wrap gap-2">
            {data?.history?.map((item) => (
              <span
                key={item.id}
                className="rounded-full border border-red-400/20 bg-red-400/10 px-3 py-1 text-xs text-red-200"
              >
                #{item.id}
                {' · '}
                {item.crashMultiplier.toFixed(2)}×
              </span>
            ))}

            {!data?.history?.length && (
              <p className="text-xs text-slate-400">
                No completed rounds.
              </p>
            )}
          </div>
        </section>

        {/* CUSTOMER HISTORY */}

        <section className="overflow-x-auto rounded-2xl border border-white/
