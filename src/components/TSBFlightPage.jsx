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

  const [verified, setVerified] = useState('');

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
              value
                .toString(16)
                .padStart(2, '0'),
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
          The controller locks the crash point before betting
          opens. Demo coins only. Closing this page does not
          cash out; the server must accept your cash-out
          request before crash.
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

        {/* FLIGHT DISPLAY */}

        <section className="relative flex min-h-[310px] flex-col items-center justify-center overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-[#0b2039] to-[#080e1b] p-6">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                'linear-gradient(#38bdf8 1px,transparent 1px),linear-gradient(90deg,#38bdf8 1px,transparent 1px)',

              backgroundSize: '40px 40px',
            }}
          />

          <div className="relative w-full text-center">
            <p className="text-xs font-bold tracking-[0.25em] text-slate-400">
              {round
                ? `ROUND #${round.id}`
                : 'TSB FLIGHT'}
            </p>

            {phase === 'WAITING' ? (
              <>
                <p className="mt-6 text-3xl font-black">
                  Waiting for next round
                </p>

                <p className="mt-3 text-sm text-slate-400">
                  The controller must confirm and lock
                  a test round.
                </p>
              </>
            ) : phase === 'COUNTDOWN' ? (
              <>
                <p className="mt-5 text-7xl font-black text-cyan-300">
                  {Math.max(
                    0,
                    Math.ceil(
                      (start - serverNow) / 1000,
                    ),
                  )}
                </p>

                <p className="mt-3 text-sm font-bold text-cyan-100">
                  BETTING OPEN · RESULT LOCKED
                </p>
              </>
            ) : (
              <>
                <p
                  className={`mt-6 text-6xl font-black sm:text-8xl ${
                    phase === 'CRASHED'
                      ? 'text-red-400'
                      : 'text-emerald-300'
                  }`}
                >
                  {multiplier.toFixed(2)}×
                </p>

                <p className="mt-4 text-sm font-black tracking-widest">
                  {phase === 'CRASHED'
                    ? 'ROUND CRASHED'
                    : 'FLIGHT RUNNING'}
                </p>
              </>
            )}

            <div
              className={`mt-6 text-5xl ${
                phase === 'RUNNING'
                  ? 'animate-pulse'
                  : ''
              }`}
              aria-hidden="true"
            >
              ✈
            </div>

            {!fresh && data && (
              <p className="mt-3 text-xs text-amber-300">
                Connection unavailable — actions paused;
                displayed animation is an estimate.
              </p>
            )}

            {verified && (
              <p className="mt-3 text-xs text-slate-300">
                {verified}
              </p>
            )}
          </div>
        </section>

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
                onClick={() =>
                  doAction('cashout')
                }
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
                onClick={() =>
                  doAction('bet')
                }
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
            Cash-out timing and payout are decided by the
            server when it processes the request. A round
            can crash at 1.00× immediately. No new bets are
            accepted after flight starts.
          </p>
        </section>

        {/* RECENT ROUNDS */}

        <section className="rounded-2xl border border-white/10 bg-[#0d192a] p-4">
          <h2 className="font-black">
            Recent rounds
          </h2>

          <div className="mt-3 flex flex-wrap gap-2">
            {data?.history?.map((round) => (
              <span
                key={round.id}
                className="rounded-full border border-red-400/20 bg-red-400/10 px-3 py-1 text-xs text-red-200"
              >
                #{round.id}
                {' · '}
                {round.crashMultiplier.toFixed(2)}×
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

        <section className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0d192a] p-4">
          <h2 className="font-black">
            Your flight history
          </h2>

          <table className="mt-3 w-full text-left text-xs">
            <thead className="text-slate-400">
              <tr>
                <th className="py-2">
                  Round
                </th>

                <th>Stake</th>

                <th>Result</th>

                <th>Returned</th>
              </tr>
            </thead>

            <tbody>
              {data?.bets?.map((bet) => (
                <tr
                  key={bet.id}
                  className="border-t border-white/5"
                >
                  <td className="py-3">
                    #{bet.roundId}
                  </td>

                  <td>
                    {bet.stake}
                  </td>

                  <td>
                    {bet.status}

                    {bet.cashoutMultiplier
                      ? ` · ${bet.cashoutMultiplier.toFixed(2)}×`
                      : ''}
                  </td>

                  <td>
                    {bet.payout}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* LOCK VERIFICATION */}

        {round && (
          <details className="break-all rounded-xl border border-white/10 p-3 text-[10px] text-slate-400">
            <summary className="cursor-pointer">
              Locked round verification
            </summary>

            <p className="mt-2">
              SHA-256 commitment:{' '}
              {round.commitment}
            </p>

            {round.seed && (
              <p className="mt-2">
                Revealed seed:{' '}
                {round.seed}
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
