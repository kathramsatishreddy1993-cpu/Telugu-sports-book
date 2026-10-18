import React, {
  useRef,
  useState,
} from 'react';

import {
  flightApi,
  useFlightState,
} from './flightClient';

const futureGames = [
  'Creed Roomz',
  'Lightning',
  'Insta Live',
  'Ezugi',
  'Mines',
  'Bikini Games',
  'Color Prediction',
  'JILI',
  'Golden Kick',
  'Snakes & Ladders',
  'Predix',
  'Money Heist',
  'Football X',
  'Twist X',
  'Instant Rummy',
  'Jhandi Munda',
  'Blackjack',
  'Deal or No Deal',
  'Loot Boxes',
  'Aviator X',
  'Fantasy 11',
  'Cricket Battle',
  'Lightning Roulette',
  'Dragon Tiger',
  'Baccarat',
  'Roulette',
  'Teen Patti',
];

export default function GameControlPage() {
  const {
    data,
    error,
    unauthorized,
    refresh,
  } = useFlightState(
    '/api/game-control/state',
  );

  const [id, setId] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [multiplier, setMultiplier] =
    useState('2.00');

  const [message, setMessage] =
    useState('');

  const [busy, setBusy] =
    useState(false);

  const [confirmed, setConfirmed] =
    useState(false);

  const pending = useRef(false);

  const loggedIn = Boolean(
    data && !unauthorized,
  );

  const active =
    data?.round &&
    data.round.phase !== 'CRASHED';

  /* LOGIN / LOGOUT / LOCK ROUND */

  const act = async (
    action,
    event,
  ) => {
    event?.preventDefault();

    if (pending.current) {
      return;
    }

    pending.current = true;

    setBusy(true);

    setMessage('');

    try {
      if (action === 'login') {
        await flightApi(
          '/api/game-control/login',
          {
            id,
            password,
          },
        );

        setPassword('');

        setMessage(
          'Game Controller login successful.',
        );
      } else if (action === 'logout') {
        await flightApi(
          '/api/game-control/logout',
          {},
        );

        window.location.assign(
          '/game-control',
        );

        return;
      } else {
        if (!confirmed) {
          throw new Error(
            'Confirm that the crash point cannot be edited after locking.',
          );
        }

        const result = await flightApi(
          '/api/game-control/flight/rounds',
          {
            multiplier,
          },
        );

        setMessage(
          `Round #${result.round.id} locked at ${result.lockedMultiplier.toFixed(2)}×. Betting countdown has started.`,
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

  return (
    <div className="min-h-screen bg-[#080d16] text-white font-sans">
      {/* HEADER */}

      <header className="border-b border-white/10 bg-[#0d1728] p-5">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-widest text-cyan-400">
              SEPARATE CONTROLLER PANEL
            </p>

            <h1 className="mt-1 text-2xl font-black">
              TSB Games Control
            </h1>
          </div>

          {loggedIn ? (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                act('logout')
              }
              className="rounded-lg border border-red-400/30 px-3 py-2 text-xs text-red-200"
            >
              Logout
            </button>
          ) : (
            <a
              href="/"
              className="text-xs text-cyan-200"
            >
              Customer home →
            </a>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
        {!loggedIn ? (
          /* CONTROLLER LOGIN */

          <form
            onSubmit={(event) =>
              act('login', event)
            }
            className="mx-auto mt-10 max-w-md space-y-4 rounded-2xl border border-cyan-400/20 bg-[#101c2e] p-6"
          >
            <h2 className="text-xl font-black">
              Game Controller Login
            </h2>

            <p className="text-xs leading-5 text-slate-400">
              Login with an account created by the main Admin.
              Customer and main Admin logins do not grant
              Game Control access.
            </p>

            <label className="block text-xs">
              Game Control ID

              <input
                required
                autoComplete="username"
                value={id}
                onChange={(event) =>
                  setId(
                    event.target.value,
                  )
                }
                className="mt-2 w-full rounded-lg border border-white/20 bg-[#080d16] p-3 text-sm"
              />
            </label>

            <label className="block text-xs">
              Password

              <input
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value,
                  )
                }
                className="mt-2 w-full rounded-lg border border-white/20 bg-[#080d16] p-3 text-sm"
              />
            </label>

            <button
              disabled={busy}
              type="submit"
              className="w-full rounded-lg bg-cyan-400 p-3 text-sm font-black text-black disabled:opacity-50"
            >
              {busy
                ? 'CHECKING…'
                : 'LOGIN'}
            </button>

            {error && !unauthorized && (
              <p className="text-xs text-amber-200">
                {error}
              </p>
            )}

            {message && (
              <p
                role="status"
                className="text-sm text-amber-200"
              >
                {message}
              </p>
            )}
          </form>
        ) : data.mustChangePassword ? (
          <ControllerPasswordChange
            onComplete={refresh}
          />
        ) : (
          <>
            <p className="text-xs text-slate-400">
              Signed in:{' '}
              {data.controllerName ||
                data.controllerId}
              {' · ID: '}
              {data.controllerId}
            </p>

            {/* TSB FLIGHT */}

            <section className="rounded-2xl border border-cyan-400/25 bg-[#101c2e] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-cyan-300">
                    ✈ TSB Flight
                  </h2>

                  <p className="mt-1 text-xs text-slate-400">
                    Admin-controlled demo test mode ·
                    shared multiplayer rounds
                  </p>
                </div>

                <a
                  href="/games/tsb-flight"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-cyan-200 underline"
                >
                  Open customer game
                </a>
              </div>

              {/* CURRENT ROUND */}

              <div className="mt-4 rounded-xl bg-black/20 p-4">
                <p className="text-xs text-slate-400">
                  Current status
                </p>

                <p className="mt-1 text-lg font-black">
                  {data.round
                    ? `ROUND #${data.round.id} · ${data.round.phase}`
                    : 'WAITING FOR FIRST ROUND'}
                </p>

                {active && (
                  <p className="mt-2 text-amber-200">
                    Locked crash:{' '}
                    {Number(
                      data.lockedMultiplier,
                    ).toFixed(2)}
                    ×
                  </p>
                )}

                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Locked rounds cannot be edited, cancelled,
                  paused or crashed early from this panel.
                  Customer bets open only after Confirm &amp; Lock.
                </p>
              </div>

              {/* CONFIRM AND LOCK */}

              <form
                onSubmit={(event) =>
                  act('lock', event)
                }
                className="mt-5 space-y-4"
              >
                <label className="block text-xs font-bold">
                  Next test round crash multiplier
                  (1.00×–1000.00×)

                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={multiplier}
                    disabled={active || busy}
                    onChange={(event) =>
                      setMultiplier(
                        event.target.value,
                      )
                    }
                    className="mt-2 block w-full max-w-xs rounded-lg border border-white/20 bg-[#080d16] p-3 text-xl font-black disabled:opacity-40"
                  />
                </label>

                <label className="flex items-start gap-3 text-xs leading-5 text-slate-300">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    disabled={active || busy}
                    onChange={(event) =>
                      setConfirmed(
                        event.target.checked,
                      )
                    }
                    className="mt-1"
                  />

                  I confirm this result is fixed before any
                  bets are accepted. Locking immediately
                  opens the 10-second countdown. It cannot
                  be changed afterward.
                </label>

                <button
                  type="submit"
                  disabled={
                    active ||
                    busy ||
                    !confirmed ||
                    Boolean(error)
                  }
                  className="rounded-xl bg-cyan-400 px-6 py-3 text-sm font-black text-black disabled:opacity-40"
                >
                  {busy
                    ? 'LOCKING…'
                    : active
                      ? 'ROUND LOCKED'
                      : 'CONFIRM & LOCK'}
                </button>
              </form>

              {message && (
                <p
                  role="status"
                  className="mt-4 rounded-lg bg-white/5 p-3 text-sm text-amber-100"
                >
                  {message}
                </p>
              )}

              {error && (
                <p
                  role="alert"
                  className="mt-4 text-sm text-red-200"
                >
                  {error}
                </p>
              )}
            </section>

            {/* RESULT HISTORY */}

            <section className="overflow-x-auto rounded-2xl border border-white/10 bg-[#101c2e] p-5">
              <h2 className="font-black">
                Flight result history
              </h2>

              <table className="mt-3 w-full text-left text-xs">
                <thead className="text-slate-400">
                  <tr>
                    <th className="py-2">
                      Round
                    </th>

                    <th>
                      Crash
                    </th>

                    <th>
                      Flight started
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {data.history.map((round) => (
                    <tr
                      key={round.id}
                      className="border-t border-white/10"
                    >
                      <td className="py-3">
                        #{round.id}
                      </td>

                      <td className="text-red-300">
                        {round.crashMultiplier.toFixed(2)}
                        ×
                      </td>

                      <td>
                        {new Date(
                          round.startsAt,
                        ).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* OTHER GAMES */}

            <section>
              <h2 className="font-black">
                Game catalogue
              </h2>

              <p className="mt-2 text-xs text-slate-400">
                Other games can be connected here later.
                These entries do not change existing games.
              </p>

              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {futureGames.map((name) => (
                  <div
                    key={name}
                    className="rounded-xl border border-white/10 bg-[#101c2e] p-4"
                  >
                    <p className="text-sm font-bold">
                      {name}
                    </p>

                    <p className="mt-2 text-[10px] text-slate-500">
                      NOT CONNECTED
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

/* FIRST LOGIN PASSWORD CHANGE */

function ControllerPasswordChange({
  onComplete,
}) {
  const [
    currentPassword,
    setCurrentPassword,
  ] = useState('');

  const [
    newPassword,
    setNewPassword,
  ] = useState('');

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('');

  const [error, setError] =
    useState('');

  const [busy, setBusy] =
    useState(false);

  const pending = useRef(false);

  const submit = async (event) => {
    event.preventDefault();

    if (pending.current) {
      return;
    }

    pending.current = true;

    setBusy(true);

    setError('');

    try {
      await flightApi(
        '/api/game-control/change-password',
        {
          currentPassword,
          newPassword,
          confirmPassword,
        },
      );

      setCurrentPassword('');

      setNewPassword('');

      setConfirmPassword('');

      await onComplete();
    } catch (error) {
      setError(error.message);
    } finally {
      pending.current = false;

      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="mx-auto mt-10 max-w-md space-y-4 rounded-2xl border border-amber-400/30 bg-[#101c2e] p-6"
    >
      <h2 className="text-xl font-black text-amber-200">
        Change Temporary Password
      </h2>

      <p className="text-xs leading-5 text-slate-400">
        Set your own password before opening game controls.
        Changing/resetting the password signs out other
        sessions; ordinary new logins do not.
      </p>

      {[
        [
          'Current Temporary Password',
          currentPassword,
          setCurrentPassword,
        ],
        [
          'New Password',
          newPassword,
          setNewPassword,
        ],
        [
          'Confirm New Password',
          confirmPassword,
          setConfirmPassword,
        ],
      ].map(
        ([label, value, setValue]) => (
          <label
            key={label}
            className="block text-xs"
          >
            {label}

            <input
              required
              type="password"
              value={value}
              onChange={(event) =>
                setValue(
                  event.target.value,
                )
              }
              autoComplete={
                label === 'Current Temporary Password'
                  ? 'current-password'
                  : 'new-password'
              }
              className="mt-2 w-full rounded-lg border border-white/20 bg-[#080d16] p-3 text-sm"
            />
          </label>
        ),
      )}

      <p className="text-[10px] text-slate-400">
        New password: minimum 12 characters,
        maximum 72 UTF-8 bytes.
      </p>

      {error && (
        <p
          role="alert"
          className="text-xs text-red-200"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-cyan-400 p-3 text-sm font-black text-black disabled:opacity-50"
      >
        {busy
          ? 'SAVING…'
          : 'SAVE PASSWORD & CONTINUE'}
      </button>
    </form>
  );
}
