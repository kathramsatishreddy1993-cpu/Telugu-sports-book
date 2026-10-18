import React, { useEffect, useRef, useState } from 'react';

import {
  flightApi,
  useFlightState,
  flightRequestKey,
  notifyFlightWallet,
} from './flightClient';

import { ControllerPasswordChange } from './GameControlPage';

const red = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18,
  19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

const wheel = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34,
  6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
  24, 16, 33, 1, 20, 14, 31, 9, 22, 18,
  29, 7, 28, 12, 35, 3, 26,
];

const color = (number) =>
  number === 0
    ? '#169c53'
    : red.has(number)
      ? '#d52e36'
      : '#252b35';

const field =
  'w-full rounded-lg border border-white/20 bg-black/30 p-3 text-white';

export default function RoulettePage({
  controller = false,
  onBack = () => window.location.assign('/'),
}) {
  const {
    data,
    error,
    unauthorized,
    receivedAt,
    refresh,
  } = useFlightState(
    controller
      ? '/api/game-control/roulette/state'
      : '/api/roulette/state',
  );

  const [clock, setClock] = useState(Date.now());
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [number, setNumber] = useState('9');
  const [confirmed, setConfirmed] = useState(false);

  const [chip, setChip] = useState(50);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);

  const [advanced, setAdvanced] = useState(false);
  const [type, setType] = useState('S');
  const [first, setFirst] = useState('1');
  const [second, setSecond] = useState('2');

  const undo = useRef([]);
  const previous = useRef({});
  const pending = useRef(false);
  const lastRound = useRef(null);

  useEffect(() => {
    const timer = setInterval(
      () => setClock(Date.now()),
      100,
    );

    return () => clearInterval(timer);
  }, []);

  const round = data?.round;
  const elapsed = Math.max(0, clock - receivedAt);

  const fresh = Boolean(
    data && !error && elapsed < 3500,
  );

  const now = data
    ? new Date(data.serverTime).getTime() + elapsed
    : clock;

  const close = round
    ? new Date(round.closesAt).getTime()
    : 0;

  const phase = !round
    ? 'WAITING'
    : round.phase === 'RESULT'
      ? 'RESULT'
      : now < close
        ? 'BETTING'
        : 'SPINNING';

  const open = fresh && phase === 'BETTING';

  const entry = data?.entries?.find(
    (item) =>
      String(item.round_id) === String(round?.id),
  );

  const bets = entry?.bets || {};
  const total = entry?.total || 0;

  const current = useRef({});
  current.current = { bets, total, entry, round };

  useEffect(() => {
    if (lastRound.current !== round?.id) {
      if (Object.keys(current.current.bets).length) {
        previous.current = {
          ...current.current.bets,
        };
      }

      undo.current = [];
      setPendingPayload(null);
      setMessage('');
      lastRound.current = round?.id;
    }
  }, [round?.id]);

  const action = async (kind, event) => {
    event?.preventDefault();

    if (pending.current) return;

    pending.current = true;
    setBusy(true);
    setMessage('');

    try {
      if (kind === 'login') {
        await flightApi('/api/game-control/login', {
          id: login,
          password,
          game: 'ROULETTE',
        });

        setPassword('');
      }

      if (kind === 'logout') {
        await flightApi('/api/game-control/logout', {});
        window.location.reload();
        return;
      }

      if (kind === 'lock') {
        await flightApi(
          '/api/game-control/roulette/rounds',
          {
            number: Number(number),
            confirmed,
          },
        );

        setConfirmed(false);
      }

      await refresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  const update = async (
    next,
    isUndo = false,
    retry = false,
  ) => {
    if (pending.current) return;

    if (!open) {
      setMessage('WAIT FOR NEXT ROUND');
      return;
    }

    if (pendingPayload && !retry) {
      setMessage('Retry the pending action first.');
      return;
    }

    const payload = retry
      ? pendingPayload
      : {
          roundId: round.id,
          revision: entry?.revision || 0,
          bets: next,
          requestKey: flightRequestKey(),
        };

    pending.current = true;
    setBusy(true);
    setMessage('');

    const snapshot = { ...bets };

    try {
      setPendingPayload(payload);

      await flightApi(
        '/api/roulette/bets',
        payload,
      );

      if (!isUndo) {
        undo.current.push(snapshot);
      } else {
        undo.current.pop();
      }

      if (Object.keys(payload.bets).length) {
        previous.current = { ...payload.bets };
      }

      setPendingPayload(null);
      notifyFlightWallet();
      await refresh();
    } catch (error) {
      setMessage(error.message);

      if (error.status) {
        setPendingPayload(null);
        await refresh();
      }
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  const add = (key) =>
    update({
      ...bets,
      [key]: (bets[key] || 0) + chip,
    });

  const cell = (
    key,
    label,
    background = '#fff1a8',
    extra = {},
  ) => (
    <button
      key={key}
      type="button"
      disabled={
        busy ||
        !open ||
        Boolean(pendingPayload)
      }
      onClick={() => add(key)}
      style={{
        background,
        color:
          background === '#fff1a8'
            ? '#b5262c'
            : 'white',
        ...extra,
      }}
      className="relative min-w-0 border border-black/80 p-1 text-center font-black disabled:opacity-70"
    >
      <span>{label}</span>

      {bets[key] > 0 && (
        <span className="absolute bottom-0 right-0 rounded-full border border-amber-100 bg-amber-400 px-1 text-[9px] text-black">
          {bets[key]}
        </span>
      )}
    </button>
  );

  return (
    <main className="min-h-screen bg-[#10191c] p-3 text-white">
      <div className="mx-auto max-w-3xl space-y-3">
        <header className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#0c5a50] p-3">
          <button
            type="button"
            onClick={onBack}
            className="text-sm"
          >
            ‹ HOME
          </button>

          <h1 className="font-black text-amber-200">
            TSB ROULETTE {controller ? 'CONTROL' : ''}
          </h1>

          <span className="text-xs">
            {controller
              ? data?.controllerId
              : `Available: ${Number(
                  data?.balance || 0,
                ).toLocaleString('en-IN')}`}
          </span>
        </header>

        <p className="text-[10px] text-slate-400">
          Controller-selected demo · Demo coins only ·
          Standard payouts
        </p>

        {(error || message) && (
          <p
            role="status"
            className="rounded-lg bg-amber-300/10 p-3 text-xs text-amber-100"
          >
            {message || error}
          </p>
        )}

        {controller && (!data || unauthorized) ? (
          <form
            onSubmit={(event) =>
              action('login', event)
            }
            className="space-y-3 rounded-xl bg-[#142c31] p-4"
          >
            <h2 className="font-black">
              ROULETTE CONTROLLER LOGIN
            </h2>

            <label className="block text-sm">
              Login ID
              <input
                required
                className={field}
                value={login}
                onChange={(event) =>
                  setLogin(event.target.value)
                }
              />
            </label>

            <label className="block text-sm">
              Password
              <input
                required
                type="password"
                className={field}
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
              />
            </label>

            <button
              disabled={busy}
              className="rounded-lg bg-amber-300 px-5 py-3 font-black text-black"
            >
              LOGIN
            </button>
          </form>
        ) : controller && data?.mustChangePassword ? (
          <ControllerPasswordChange
            onComplete={refresh}
          />
        ) : (
          <>
            {controller && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => action('logout')}
                  className="text-xs underline"
                >
                  LOGOUT
                </button>

                <form
                  onSubmit={(event) =>
                    action('lock', event)
                  }
                  className="space-y-3 rounded-xl bg-[#142c31] p-4"
                >
                  <h2 className="font-black">
                    NEXT ROUND RESULT
                  </h2>

                  <label className="block text-sm">
                    Winning number (0–36)
                    <input
                      type="number"
                      min="0"
                      max="36"
                      required
                      disabled={
                        phase === 'BETTING' ||
                        phase === 'SPINNING' ||
                        busy
                      }
                      className={field}
                      value={number}
                      onChange={(event) =>
                        setNumber(event.target.value)
                      }
                    />
                  </label>

                  <p className="text-xs">
                    {Number(number) === 0
                      ? 'GREEN · ZERO'
                      : `${
                          red.has(Number(number))
                            ? 'RED'
                            : 'BLACK'
                        } · ${
                          Number(number) % 2
                            ? 'ODD'
                            : 'EVEN'
                        } · Dozen ${
                          Math.ceil(Number(number) / 12)
                        } · Column ${
                          (Number(number) - 1) % 3 + 1
                        }`}
                  </p>

                  <label className="flex gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(event) =>
                        setConfirmed(event.target.checked)
                      }
                    />

                    I confirm this result is fixed before
                    bets open and cannot be changed after
                    locking.
                  </label>

                  <button
                    disabled={
                      !confirmed ||
                      busy ||
                      !fresh ||
                      phase === 'BETTING' ||
                      phase === 'SPINNING'
                    }
                    className="rounded-lg bg-amber-300 p-3 font-black text-black disabled:opacity-40"
                  >
                    CONFIRM & LOCK · OPEN 30 SECONDS
                  </button>

                  {round && (
                    <p className="text-xs text-cyan-200">
                      Round #{round.id} · Locked number{' '}
                      {round.number}
                    </p>
                  )}
                </form>
              </>
            )}

            <div className="rounded-lg bg-amber-300 p-2 text-center font-black text-black">
              {phase === 'BETTING'
                ? `Bets closing ${Math.max(
                    0,
                    Math.ceil((close - now) / 1000),
                  )}`
                : phase === 'SPINNING'
                  ? 'WAIT FOR NEXT GAME · SPINNING'
                  : phase === 'RESULT'
                    ? `RESULT: ${round.number} · ${
                        round.number === 0
                          ? 'GREEN'
                          : red.has(round.number)
                            ? 'RED'
                            : 'BLACK'
                      }`
                    : 'WAITING FOR NEXT ROUND'}
            </div>

            <div className="flex gap-2 overflow-x-auto">
              {data?.history?.map((item) => (
                <span
                  key={item.id}
                  style={{
                    color:
                      item.number === 0
                        ? '#4ade80'
                        : red.has(item.number)
                          ? '#fb7185'
                          : '#cbd5e1',
                  }}
                  className="rounded bg-black px-3 py-1 font-bold"
                >
                  {item.number}
                </span>
              ))}
            </div>

            {(phase === 'SPINNING' ||
              phase === 'RESULT') && (
              <Wheel
                key={`${round?.id}-${phase}`}
                phase={phase}
                number={round?.number}
                roundId={round?.id}
                elapsed={Math.max(
                  0,
                  (now - close) / 1000,
                )}
              />
            )}

            {!controller && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs">
                    Chip
                  </span>

                  {[10, 50, 100, 500, 1000, 5000].map(
                    (amount) => (
                      <button
                        key={amount}
                        onClick={() => setChip(amount)}
                        className={`rounded-full border px-3 py-2 text-xs ${
                          chip === amount
                            ? 'border-amber-200 bg-amber-300 text-black'
                            : 'border-white/20'
                        }`}
                      >
                        {amount}
                      </button>
                    ),
                  )}
                </div>

                <p className="text-xs">
                  Bet: {total.toLocaleString('en-IN')} ·
                  Chips reserve demo coins immediately;
                  clear or undo before betting closes
                  to release them.
                </p>

                <div className="flex gap-2">
                  <div
                    className="grid min-w-0 flex-1 grid-cols-[.8fr_.8fr_1fr_1fr_1fr]"
                    style={{
                      gridTemplateRows:
                        '48px repeat(12,44px) 44px',
                    }}
                  >
                    {cell(
                      'N:0',
                      '0',
                      '#169c53',
                      {
                        gridColumn: '3 / 6',
                        gridRow: '1',
                      },
                    )}

                    {[
                      'LOW',
                      'EVEN',
                      'RED',
                      'BLACK',
                      'ODD',
                      'HIGH',
                    ].map((key, index) =>
                      cell(
                        key,
                        [
                          '1–18',
                          'EVEN',
                          'RED',
                          'BLACK',
                          'ODD',
                          '19–36',
                        ][index],
                        key === 'RED'
                          ? '#d52e36'
                          : key === 'BLACK'
                            ? '#252b35'
                            : '#fff1a8',
                        {
                          gridColumn: '1',
                          gridRow:
                            `${2 + index * 2} / span 2`,
                          writingMode: 'vertical-rl',
                        },
                      ),
                    )}

                    {[1, 2, 3].map((value, index) =>
                      cell(
                        `D:${value}`,
                        `${
                          value === 1
                            ? '1st'
                            : value === 2
                              ? '2nd'
                              : '3rd'
                        } 12`,
                        '#fff1a8',
                        {
                          gridColumn: '2',
                          gridRow:
                            `${2 + index * 4} / span 4`,
                          writingMode: 'vertical-rl',
                        },
                      ),
                    )}

                    {Array.from(
                      { length: 36 },
                      (_, index) => index + 1,
                    ).map((value) =>
                      cell(
                        `N:${value}`,
                        value,
                        color(value),
                        {
                          gridColumn: String(
                            3 + (value - 1) % 3,
                          ),
                          gridRow: String(
                            2 + Math.floor((value - 1) / 3),
                          ),
                          fontSize: '22px',
                        },
                      ),
                    )}

                    {[1, 2, 3].map((value) =>
                      cell(
                        `C:${value}`,
                        '2 to 1',
                        '#fff1a8',
                        {
                          gridColumn: String(value + 2),
                          gridRow: '14',
                          fontSize: '12px',
                        },
                      ),
                    )}
                  </div>

                  <div className="flex w-16 flex-col gap-3 text-[10px]">
                    <button
                      disabled={
                        busy ||
                        !open ||
                        Boolean(pendingPayload)
                      }
                      onClick={() => update({})}
                    >
                      ✕
                      <br />
                      CLEAR
                    </button>

                    <button
                      disabled={
                        busy ||
                        !open ||
                        Boolean(pendingPayload) ||
                        !undo.current.length
                      }
                      onClick={() =>
                        update(
                          undo.current.at(-1),
                          true,
                        )
                      }
                    >
                      ↶
                      <br />
                      UNDO
                    </button>

                    <button
                      disabled={
                        busy ||
                        !open ||
                        Boolean(pendingPayload)
                      }
                      onClick={() =>
                        update(
                          Object.fromEntries(
                            Object.entries(bets).map(
                              ([key, value]) => [
                                key,
                                value * 2,
                              ],
                            ),
                          ),
                        )
                      }
                    >
                      2×
                      <br />
                      DOUBLE
                    </button>

                    <button
                      disabled={
                        busy ||
                        !open ||
                        Boolean(pendingPayload)
                      }
                      onClick={() =>
                        update(previous.current)
                      }
                    >
                      ↻
                      <br />
                      REBET
                    </button>

                    <button
                      onClick={() =>
                        setAdvanced((value) => !value)
                      }
                    >
                      ▦
                      <br />
                      INSIDE BETS
                    </button>
                  </div>
                </div>

                {advanced && (
                  <section className="space-y-2 rounded-lg bg-white/5 p-3">
                    <p className="text-xs">
                      Split: two adjacent numbers.
                      Street/Corner/Line: enter the first number.
                    </p>

                    <select
                      aria-label="Inside bet type"
                      value={type}
                      onChange={(event) =>
                        setType(event.target.value)
                      }
                      className={field}
                    >
                      <option value="S">
                        Split (17:1)
                      </option>

                      <option value="T">
                        Street (11:1)
                      </option>

                      <option value="K">
                        Corner (8:1)
                      </option>

                      <option value="L">
                        Six Line (5:1)
                      </option>
                    </select>

                    <input
                      aria-label="First number"
                      type="number"
                      min="0"
                      max="36"
                      value={first}
                      onChange={(event) =>
                        setFirst(event.target.value)
                      }
                      className={field}
                    />

                    {type === 'S' && (
                      <input
                        aria-label="Second number"
                        type="number"
                        min="0"
                        max="36"
                        value={second}
                        onChange={(event) =>
                          setSecond(event.target.value)
                        }
                        className={field}
                      />
                    )}

                    <button
                      disabled={
                        !open ||
                        busy ||
                        Boolean(pendingPayload)
                      }
                      onClick={() =>
                        add(
                          type === 'S'
                            ? `S:${Math.min(
                                Number(first),
                                Number(second),
                              )}:${Math.max(
                                Number(first),
                                Number(second),
                              )}`
                            : `${type}:${Number(first)}`,
                        )
                      }
                      className="rounded-lg bg-amber-300 p-3 text-black"
                    >
                      ADD CHIP {chip}
                    </button>
                  </section>
                )}

                {pendingPayload && (
                  <button
                    disabled={!open || busy}
                    onClick={() =>
                      update(null, false, true)
                    }
                    className="rounded-lg bg-amber-300 p-3 text-black"
                  >
                    RETRY SAME ACTION
                  </button>
                )}

                <section className="rounded-xl bg-white/5 p-3">
                  <h2 className="font-black">
                    Your roulette history
                  </h2>

                  {data?.entries?.map((item) => (
                    <p
                      key={item.round_id}
                      className="mt-2 text-xs"
                    >
                      #{item.round_id} · Bet {item.total} ·{' '}
                      {item.status === 'SETTLED'
                        ? `Result ${item.number} · Returned ${item.payout}`
                        : 'PLACED'}
                    </p>
                  ))}
                </section>
              </>
            )}

            <details className="text-xs text-slate-300">
              <summary>
                Standard payouts / result verification
              </summary>

              <p className="my-2">
                Straight 35:1 · Split 17:1 · Street 11:1 ·
                Corner 8:1 · Line 5:1 · Dozen/Column 2:1 ·
                Outside bets 1:1. Winning returns include
                original stake. Zero loses all outside bets.
              </p>

              <p>
                Commitment SHA-256(number:seed):{' '}
                {round?.commitment}
              </p>

              {round?.seed && (
                <p className="break-all">
                  Revealed seed: {round.seed}
                </p>
              )}
            </details>
          </>
        )}
      </div>
    </main>
  );
}

function Wheel({
  phase,
  number,
  roundId,
  elapsed,
}) {
  const joinedAt = useRef(
    Math.min(elapsed || 0, 15),
  );

  const step = 360 / 37;

  const gradient = wheel
    .map(
      (value, index) =>
        `${color(value)} ${index * step}deg ${
          (index + 1) * step
        }deg`,
    )
    .join(',');

  const rotation =
    number === null || number === undefined
      ? 0
      : -(wheel.indexOf(number) + 0.5) * step;

  return (
    <div
      className="relative mx-auto h-64 w-64 rounded-full border-8 border-amber-600 bg-black p-2"
      aria-label={
        phase === 'SPINNING'
          ? 'Roulette wheel spinning'
          : `Roulette result ${number}`
      }
    >
      <style>{`
        @keyframes tsb-wheel-spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes tsb-ball-spin {
          to {
            transform: rotate(-1440deg);
          }
        }
      `}</style>

      <div
        key={`${roundId}-${phase}`}
        className="absolute inset-2 rounded-full"
        style={{
          background: `conic-gradient(${gradient})`,
          transform: `rotate(${rotation}deg)`,
          animation:
            phase === 'SPINNING'
              ? 'tsb-wheel-spin 2.5s linear 6 forwards'
              : undefined,
          animationDelay:
            phase === 'SPINNING'
              ? `-${joinedAt.current}s`
              : undefined,
        }}
      >
        {wheel.map((value, index) => (
          <span
            key={value}
            className="absolute left-1/2 top-1/2 text-[9px] font-bold"
            style={{
              transform:
                'translate(-50%,-50%) ' +
                `rotate(${(index + 0.5) * step}deg) ` +
                'translateY(-99px) rotate(180deg)',
            }}
          >
            {value}
          </span>
        ))}
      </div>

      <div className="absolute inset-8 rounded-full border-4 border-amber-700 bg-[#15231f]" />

      <div
        key={`${roundId}-ball-${phase}`}
        className="absolute inset-3"
        style={{
          animation:
            phase === 'SPINNING'
              ? 'tsb-ball-spin 15s cubic-bezier(.15,.65,.35,1) 1 forwards'
              : undefined,
          animationDelay:
            phase === 'SPINNING'
              ? `-${joinedAt.current}s`
              : undefined,
        }}
      >
        <span className="absolute left-1/2 top-0 h-3 w-3 rounded-full bg-white shadow" />
      </div>

      <strong className="absolute inset-0 flex items-center justify-center text-4xl">
        {phase === 'RESULT' ? number : '●'}
      </strong>
    </div>
  );
}
