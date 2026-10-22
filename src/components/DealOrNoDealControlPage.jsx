import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  flightApi,
  useFlightState,
} from "./flightClient";

const GAME = "DEAL_OR_NO_DEAL";

const LEVELS = [
  { level: 1, count: 6, multiplier: "1.40" },
  { level: 2, count: 6, multiplier: "2.00" },
  { level: 3, count: 5, multiplier: "3.50" },
  { level: 4, count: 5, multiplier: "6.00" },
  { level: 5, count: 4, multiplier: "12.00" },
  { level: 6, count: 4, multiplier: "25.00" },
  { level: 7, count: 3, multiplier: "70.00" },
  { level: 8, count: 3, multiplier: "200.00" },
  { level: 9, count: 2, multiplier: "800.00" },
];

const field =
  "w-full rounded-xl border border-white/20 bg-black/40 p-3 text-white";

async function getSession() {
  const response = await fetch(
    "/api/deal-or-no-deal/controller/session",
    {
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" },
    },
  );

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(
      data.error || "Unable to check controller session.",
    );

    error.status = response.status;
    throw error;
  }

  return data;
}

export default function DealOrNoDealControlPage() {
  const [account, setAccount] = useState(null);
  const [checking, setChecking] = useState(true);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pending = useRef(false);

  useEffect(() => {
    let alive = true;

    getSession()
      .then(data => {
        if (alive) setAccount(data);
      })
      .catch(requestError => {
        if (alive && requestError.status !== 401) {
          setError(requestError.message);
        }
      })
      .finally(() => {
        if (alive) setChecking(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const authenticate = async event => {
    event.preventDefault();

    if (pending.current) return;

    pending.current = true;
    setBusy(true);
    setError("");

    try {
      if (account?.mustChangePassword) {
        if (
          newPassword !== confirmPassword ||
          newPassword === password ||
          newPassword.length < 12 ||
          new TextEncoder().encode(newPassword).length > 72
        ) {
          throw new Error(
            "Use a different password with at least 12 characters, maximum 72 UTF-8 bytes, and matching confirmation.",
          );
        }

        await flightApi(
          "/api/game-control/change-password",
          {
            currentPassword: password,
            newPassword,
            confirmPassword,
          },
        );
      } else {
        await flightApi("/api/game-control/login", {
          game: GAME,
          id: loginId.trim(),
          password,
        });
      }

      const session = await getSession();

      setAccount(session);
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  const logout = async () => {
    if (pending.current) return;

    pending.current = true;
    setBusy(true);
    setError("");

    try {
      await flightApi("/api/game-control/logout", {});

      setAccount(null);
      setPassword("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-amber-200">
        Checking controller session…
      </main>
    );
  }

  if (account && !account.mustChangePassword) {
    return (
      <PlanEditor
        controllerId={account.controllerId}
        onLogout={logout}
        logoutBusy={busy}
        logoutError={error}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#080b10] p-4 text-white">
      <div className="mx-auto max-w-md space-y-5 pt-10">
        <h1 className="text-center text-2xl font-black text-amber-300">
          DEAL OR NO DEAL
        </h1>

        <p className="text-center text-sm text-slate-300">
          {account?.mustChangePassword
            ? "Change your temporary password"
            : "Controller login"}
        </p>

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-500/15 p-3 text-sm text-red-200"
          >
            {error}
          </p>
        )}

        <form
          onSubmit={authenticate}
          className="space-y-4 rounded-2xl border border-amber-300/20 bg-white/5 p-5"
        >
          {!account && (
            <label className="block space-y-2 text-sm">
              <span>Controller ID</span>

              <input
                required
                autoComplete="username"
                value={loginId}
                disabled={busy}
                onChange={event =>
                  setLoginId(event.target.value)
                }
                className={field}
              />
            </label>
          )}

          <label className="block space-y-2 text-sm">
            <span>
              {account ? "Current password" : "Password"}
            </span>

            <input
              required
              type="password"
              autoComplete="current-password"
              value={password}
              disabled={busy}
              onChange={event =>
                setPassword(event.target.value)
              }
              className={field}
            />
          </label>

          {account?.mustChangePassword && (
            <>
              <label className="block space-y-2 text-sm">
                <span>New password</span>

                <input
                  required
                  minLength={12}
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  disabled={busy}
                  onChange={event =>
                    setNewPassword(event.target.value)
                  }
                  className={field}
                />
              </label>

              <label className="block space-y-2 text-sm">
                <span>Confirm new password</span>

                <input
                  required
                  minLength={12}
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  disabled={busy}
                  onChange={event =>
                    setConfirmPassword(event.target.value)
                  }
                  className={field}
                />
              </label>
            </>
          )}

          <button
            disabled={busy}
            className="w-full rounded-xl bg-amber-300 p-3 font-black text-black disabled:opacity-40"
          >
            {busy
              ? "PLEASE WAIT…"
              : account
                ? "CHANGE PASSWORD"
                : "LOGIN"}
          </button>
        </form>

        <a
          href="/"
          className="block text-center text-sm text-slate-400"
        >
          ← Customer home
        </a>
      </div>
    </main>
  );
}

function PlanEditor({
  controllerId,
  onLogout,
  logoutBusy,
  logoutError,
}) {
  const {
    data,
    error,
    unauthorized,
    receivedAt,
    refresh,
  } = useFlightState(
    "/api/deal-or-no-deal/controller/state",
  );

  const [plan, setPlan] = useState(() =>
    LEVELS.map(item => ({
      level: item.level,
      winners: [],
    })),
  );

  const [offers, setOffers] = useState({
    3: "100",
    6: "100",
  });

  const [clock, setClock] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [awaitingSession, setAwaitingSession] =
    useState(null);

  const submitting = useRef(false);
  const verification = useRef(null);

  useEffect(() => {
    const timer = setInterval(
      () => setClock(Date.now()),
      250,
    );

    return () => clearInterval(timer);
  }, []);

  const session = data?.session;

  const fresh = Boolean(
    data &&
      !error &&
      !unauthorized &&
      clock - receivedAt < 3500,
  );

  const serverNow = data
    ? new Date(data.serverTime).getTime() +
      Math.max(0, clock - receivedAt)
    : clock;

  const active = Boolean(
    session && session.phase !== "FINISHED",
  );

  useEffect(() => {
    if (
      awaitingSession &&
      String(session?.id) === String(awaitingSession)
    ) {
      setAwaitingSession(null);
    }
  }, [awaitingSession, session?.id]);

  useEffect(() => {
    const attempt = verification.current;

    if (
      !uncertain ||
      !fresh ||
      !attempt ||
      receivedAt <= attempt.startedAt
    ) {
      return;
    }

    const sessionChanged =
      String(session?.id || "") !== attempt.previousId;

    if (sessionChanged || !active) {
      verification.current = null;
      setUncertain(false);

      setMessage(
        sessionChanged
          ? "A published session is now visible. Check the locked plan below."
          : "No active session is visible. You can review the plan and publish again.",
      );
    }
  }, [
    uncertain,
    fresh,
    receivedAt,
    session?.id,
    active,
  ]);

  const locked =
    busy ||
    logoutBusy ||
    uncertain ||
    active ||
    Boolean(awaitingSession) ||
    !fresh;

  const toggleCase = (level, number) => {
    if (locked || submitting.current) return;

    const config = LEVELS.find(
      item => item.level === level,
    );

    setPlan(current =>
      current.map(row => {
        if (row.level !== level) return row;

        if (row.winners.includes(number)) {
          return {
            ...row,
            winners: row.winners.filter(
              value => value !== number,
            ),
          };
        }

        if (row.winners.length >= config.count) {
          return row;
        }

        return {
          ...row,
          winners: [...row.winners, number].sort(
            (a, b) => a - b,
          ),
        };
      }),
    );
  };

  const publish = async () => {
    if (locked || submitting.current) return;

    setActionError("");
    setMessage("");

    for (const config of LEVELS) {
      const row = plan.find(
        item => item.level === config.level,
      );

      if (row?.winners.length !== config.count) {
        setActionError(
          `Level ${config.level}: select exactly ${config.count} winning cases.`,
        );

        return;
      }
    }

    const percentages = {
      3: Number(offers[3]),
      6: Number(offers[6]),
    };

    if (
      Object.values(percentages).some(
        value =>
          !Number.isInteger(value) ||
          value < 90 ||
          value > 110,
      )
    ) {
      setActionError(
        "Banker offer percentages must be whole numbers from 90 to 110.",
      );

      return;
    }

    submitting.current = true;
    setBusy(true);

    verification.current = {
      startedAt: Date.now(),
      previousId: String(session?.id || ""),
    };

    try {
      const result = await flightApi(
        "/api/deal-or-no-deal/controller/publish",
        {
          plan,
          offers: percentages,
        },
      );

      verification.current = null;

      if (result.session?.id) {
        setAwaitingSession(result.session.id);
      } else {
        setUncertain(true);

        verification.current = {
          startedAt: Date.now(),
          previousId: String(session?.id || ""),
        };
      }

      setMessage(
        "Plan published and locked. Betting starts after the server countdown.",
      );
    } catch (requestError) {
      setActionError(requestError.message);

      if (
        !requestError.status ||
        requestError.status >= 500
      ) {
        setUncertain(true);

        setMessage(
          "The publish response is uncertain. Checking server state before allowing another publish.",
        );
      } else {
        verification.current = null;
      }
    } finally {
      try {
        await refresh();
      } finally {
        submitting.current = false;
        setBusy(false);
      }
    }
  };

  const deadline =
    session?.phase === "WAITING"
      ? session.opensAt
      : session?.phase === "BETTING"
        ? session.bettingClosesAt
        : session?.revealsAt;

  const seconds = deadline
    ? Math.max(
        0,
        Math.ceil(
          (new Date(deadline).getTime() - serverNow) /
            1000,
        ),
      )
    : 0;

  return (
    <main className="min-h-screen bg-[#080b10] p-3 text-white">
      <div className="mx-auto max-w-4xl space-y-4">
        <header className="flex items-center justify-between gap-3 rounded-2xl border border-amber-300/20 bg-white/5 p-4">
          <div>
            <h1 className="font-black text-amber-300">
              DEAL OR NO DEAL CONTROL
            </h1>

            <p className="mt-1 text-xs text-slate-400">
              Controller: {controllerId}
            </p>
          </div>

          <button
            type="button"
            disabled={busy || logoutBusy || uncertain}
            onClick={onLogout}
            className="rounded-lg border border-white/20 px-3 py-2 text-xs disabled:opacity-40"
          >
            LOGOUT
          </button>
        </header>

        <p className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm leading-6 text-cyan-100">
          Admin-selected demo. All nine levels are
          published together and locked before betting
          opens. Published outcomes cannot be edited.
          Players see this result mode on their game page.
        </p>

        {(actionError || error || logoutError) && (
          <p
            role="alert"
            className="rounded-xl bg-red-500/15 p-3 text-sm text-red-200"
          >
            {actionError || error || logoutError}
          </p>
        )}

        {message && (
          <p
            role="status"
            className="rounded-xl bg-emerald-400/10 p-3 text-sm text-emerald-100"
          >
            {message}
          </p>
        )}

        {unauthorized && (
          <p className="rounded-xl bg-amber-300/10 p-3 text-sm text-amber-200">
            Controller session expired. Reload this page
            to log in again.
          </p>
        )}

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h2 className="font-black text-amber-200">
            Current session
          </h2>

          <p className="mt-2 text-sm">
            {!fresh
              ? "Checking server state…"
              : session
                ? `#${session.id} · ${session.phase} · Level ${session.level || "—"}`
                : "No session published yet."}
          </p>

          {active && (
            <p className="mt-2 text-xl font-black text-amber-300">
              {seconds}s
            </p>
          )}

          {session?.lockedPlan && (
            <div className="mt-4 space-y-2">
              {session.lockedPlan.map(row => (
                <p
                  key={row.level}
                  className="rounded-lg bg-black/30 p-3 text-xs"
                >
                  Level {row.level} winners:{" "}
                  <strong className="text-emerald-300">
                    {row.winners.join(", ")}
                  </strong>
                </p>
              ))}
            </div>
          )}

          {session?.lockedOffers && (
            <p className="mt-3 text-xs text-slate-300">
              Locked banker offers: Level 3{" "}
              {session.lockedOffers[3]}% · Level 6{" "}
              {session.lockedOffers[6]}%
            </p>
          )}

          {session?.commitment && (
            <p className="mt-4 break-all text-[10px] text-slate-500">
              Commitment: {session.commitment}
            </p>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={() => refresh()}
            className="mt-4 text-xs text-cyan-300 underline disabled:opacity-40"
          >
            REFRESH STATE
          </button>
        </section>

        <section className="space-y-4 rounded-2xl border border-amber-300/20 bg-white/5 p-4">
          <div>
            <h2 className="font-black text-amber-200">
              Prepare next session
            </h2>

            <p className="mt-2 text-xs leading-5 text-slate-400">
              Select the required winning cases for each
              level. Multipliers are total returns on the
              original stake. Level 9 pays 800× when a
              selected winning case is chosen.
            </p>

            {active && (
              <p className="mt-2 text-xs text-amber-300">
                Wait until the current session finishes
                before publishing another plan.
              </p>
            )}
          </div>

          {LEVELS.map(config => {
            const row = plan.find(
              item => item.level === config.level,
            );

            return (
              <div
                key={config.level}
                className="rounded-xl border border-white/10 bg-black/20 p-3"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <strong>
                    LEVEL {config.level} ·{" "}
                    {config.multiplier}×
                  </strong>

                  <span
                    className={
                      row.winners.length === config.count
                        ? "text-emerald-300"
                        : "text-amber-300"
                    }
                  >
                    {row.winners.length}/{config.count}{" "}
                    winners
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-9">
                  {Array.from(
                    { length: 9 },
                    (_, index) => index + 1,
                  ).map(number => {
                    const selected =
                      row.winners.includes(number);

                    return (
                      <button
                        key={number}
                        type="button"
                        disabled={locked}
                        aria-pressed={selected}
                        onClick={() =>
                          toggleCase(config.level, number)
                        }
                        className={`rounded-lg border py-3 text-sm font-black disabled:opacity-50 ${
                          selected
                            ? "border-emerald-300 bg-emerald-400 text-black"
                            : "border-white/15 bg-slate-900 text-slate-200"
                        }`}
                      >
                        {String(number).padStart(2, "0")}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="grid gap-3 sm:grid-cols-2">
            {[3, 6].map(level => (
              <label
                key={level}
                className="block space-y-2 text-xs"
              >
                <span>
                  Level {level} banker offer (% of
                  current collect value)
                </span>

                <input
                  type="number"
                  min="90"
                  max="110"
                  step="1"
                  disabled={locked}
                  value={offers[level]}
                  onChange={event =>
                    setOffers(current => ({
                      ...current,
                      [level]: event.target.value,
                    }))
                  }
                  className={field}
                />
              </label>
            ))}
          </div>

          <button
            type="button"
            disabled={locked}
            onClick={publish}
            className="w-full rounded-xl bg-amber-300 p-4 font-black text-black disabled:opacity-40"
          >
            {busy
              ? "PUBLISHING…"
              : uncertain || awaitingSession
                ? "VERIFYING PUBLISHED SESSION…"
                : active
                  ? "CURRENT SESSION IS LOCKED"
                  : "LOCK & PUBLISH NEXT SESSION"}
          </button>
        </section>
      </div>
    </main>
  );
}
