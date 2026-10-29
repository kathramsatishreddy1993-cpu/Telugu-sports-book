import React, {
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import {
  flightApi,
  useFlightState,
  flightRequestKey,
  notifyFlightWallet,
} from "./flightClient";

import { ControllerPasswordChange } from "./GameControlPage";

import {
  SoundControls,
  useGameSound,
  useRouletteSound,
} from "./GameSound";

const red = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18,
  19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

const wheel = [
  0, 32, 15, 19, 4, 21, 2, 25, 17,
  34, 6, 27, 13, 36, 11, 30, 8, 23,
  10, 5, 24, 16, 33, 1, 20, 14, 31,
  9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

const color = (number) =>
  number === 0
    ? "#169c53"
    : red.has(number)
      ? "#d52e36"
      : "#252b35";

const field =
  "w-full rounded-lg border border-white/20 bg-black/30 p-3 text-white";

const money = (value) => {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return "—";
  }

  return `₹${Number(value).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
};

function AmountBox({ value }) {
  return (
    <span className="inline-flex max-w-full items-center justify-center rounded-lg border border-[#166534] bg-white px-3 py-2 text-sm font-black tabular-nums text-[#166534]">
      {money(value)}
    </span>
  );
}

export default function RoulettePage({
  controller = false,
  onBack = () => window.location.assign("/"),
}) {
  const {
    data,
    error,
    unauthorized,
    receivedAt,
    refresh,
  } = useFlightState(
    controller
      ? "/api/game-control/roulette/state"
      : "/api/roulette/state"
  );

  const [clock, setClock] = useState(Date.now());
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [number, setNumber] = useState("9");
  const [confirmed, setConfirmed] = useState(false);
  const [chip, setChip] = useState(50);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);
  const [advanced, setAdvanced] = useState(false);
  const [type, setType] = useState("S");
  const [first, setFirst] = useState("1");
  const [second, setSecond] = useState("2");

  const undo = useRef([]);
  const previous = useRef({});
  const pending = useRef(false);
  const lastRound = useRef(null);
  const lastBalance = useRef(null);

  const sound = useGameSound();

  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 100);
    return () => clearInterval(timer);
  }, []);

  const round = data?.round;

  const elapsed = Number.isFinite(receivedAt)
    ? Math.max(0, clock - receivedAt)
    : Infinity;

  const serverTime = data?.serverTime
    ? new Date(data.serverTime).getTime()
    : NaN;

  const fresh = Boolean(
    data &&
      !error &&
      !unauthorized &&
      Number.isFinite(serverTime) &&
      elapsed < 3500
  );

  const now =
    Number.isFinite(serverTime) && Number.isFinite(elapsed)
      ? serverTime + elapsed
      : clock;

  const close = round
    ? new Date(round.closesAt).getTime()
    : 0;

  const phase = !round
    ? "WAITING"
    : round.phase === "RESULT"
      ? "RESULT"
      : now < close
        ? "BETTING"
        : "SPINNING";

  const spinElapsed = Math.max(0, (now - close) / 1000);

  useRouletteSound(sound, {
    roundId: round?.id,
    phase,
    elapsed: spinElapsed,
    fresh,
    controller,
  });

  const open = fresh && phase === "BETTING";

  const entry = data?.entries?.find(
    (item) => String(item.round_id) === String(round?.id)
  );

  const bets = entry?.bets || {};
  const total = Number(entry?.total || 0);

  const balanceAvailable =
    data?.balance !== null &&
    data?.balance !== undefined &&
    Number.isFinite(Number(data.balance));

  const current = useRef({});

  current.current = {
    bets,
    total,
    entry,
    round,
  };

  useEffect(() => {
    if (lastRound.current !== round?.id) {
      if (Object.keys(current.current.bets).length) {
        previous.current = { ...current.current.bets };
      }

      undo.current = [];
      setPendingPayload(null);
      setMessage("");
      lastRound.current = round?.id;
    }
  }, [round?.id]);

  useEffect(() => {
    if (
      controller ||
      data?.balance === null ||
      data?.balance === undefined ||
      !Number.isFinite(Number(data.balance))
    ) {
      return;
    }

    const balance = Number(data.balance);
    const oldBalance = lastBalance.current;
    lastBalance.current = balance;

    if (oldBalance !== null && oldBalance !== balance) {
      notifyFlightWallet();
    }
  }, [controller, data?.balance]);

  const action = async (kind, event) => {
    event?.preventDefault();
    if (pending.current) return;

    pending.current = true;
    setBusy(true);
    setMessage("");

    try {
      if (kind === "login") {
        await flightApi("/api/game-control/login", {
          id: login,
          password,
          game: "ROULETTE",
        });

        setPassword("");
      }

      if (kind === "logout") {
        await flightApi("/api/game-control/logout", {});
        window.location.reload();
        return;
      }

      if (kind === "lock") {
        await flightApi("/api/game-control/roulette/rounds", {
          number: Number(number),
          confirmed,
        });

        setConfirmed(false);
      }

      await refresh();
    } catch (requestError) {
      setMessage(requestError.message || "Request failed.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  const update = async (
    next,
    isUndo = false,
    retry = false
  ) => {
    if (pending.current) return;

    if (!open) {
      setMessage("WAIT FOR NEXT ROUND");
      return;
    }

    if (pendingPayload && !retry) {
      setMessage("Retry the pending action first.");
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

    if (!payload) return;

    pending.current = true;
    setBusy(true);
    setMessage("");

    const snapshot = { ...bets };

    try {
      setPendingPayload(payload);

      await flightApi("/api/roulette/bets", payload);

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
    } catch (requestError) {
      setMessage(requestError.message || "Unable to update bets.");

      if (requestError.status) {
        setPendingPayload(null);

        try {
          await refresh();
        } catch {
          setMessage(
            "Unable to refresh game state. Please wait for the server connection."
          );
        }
      }
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  const add = (key) =>
    update({
      ...bets,
      [key]: Number(bets[key] || 0) + chip,
    });

  const cell = (
    key,
    label,
    background = "#fff1a8",
    extra = {}
  ) => (
    <button
      key={key}
      type="button"
      disabled={busy || !open || Boolean(pendingPayload)}
      onClick={() => add(key)}
      style={{
        background,
        color: background === "#fff1a8" ? "#b5262c" : "white",
        ...extra,
      }}
      className="relative min-w-0 border border-black/80 p-1 text-center font-black disabled:opacity-70"
    >
      <span>{label}</span>

      {bets[key] > 0 && (
        <span className="absolute bottom-0 right-0 rounded-full border border-[#166534] bg-white px-1 text-[9px] text-[#166534]">
          {money(bets[key])}
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

          <h1 className="min-w-0 flex-1 text-center font-black text-amber-200">
            TSB ROULETTE {controller ? "CONTROL" : ""}
          </h1>

          {controller ? (
            <span className="text-xs">{data?.controllerId}</span>
          ) : (
            <div
              aria-live="polite"
              aria-label="Demo wallet balance"
              className="max-w-full rounded-xl border-2 border-[#166534] bg-white px-3 py-2"
            >
              <p className="text-center text-[9px] font-black tracking-wide text-[#166534]">
                WALLET BALANCE
              </p>

              <div className="mt-1 flex items-center justify-center gap-2">
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#166534] text-xl font-black text-white"
                >
                  ₹
                </span>

                <strong className="break-all text-lg font-black tabular-nums text-[#166534]">
                  {unauthorized
                    ? "—"
                    : balanceAvailable
                      ? Number(data.balance).toLocaleString("en-IN", {
                          maximumFractionDigits: 2,
                        })
                      : data || error
                        ? "—"
                        : "Loading…"}
                </strong>
              </div>

              <p className="mt-1 text-center text-[9px] font-bold text-[#722f37]">
                DEMO COINS
              </p>

              {balanceAvailable && !fresh && (
                <p className="mt-1 text-center text-[9px] font-bold text-[#722f37]">
                  LAST RECEIVED BALANCE
                </p>
              )}
            </div>
          )}
        </header>

        {!controller && <SoundControls sound={sound} />}

        {(error || message) && (
          <p
            role="status"
            className="rounded-lg bg-amber-300/10 p-3 text-xs text-amber-100"
          >
            {message || String(error?.message || error)}
          </p>
        )}

        {!controller && unauthorized && (
          <button
            type="button"
            onClick={onBack}
            className="w-full rounded-xl bg-[#722f37] p-3 font-black text-white"
          >
            RETURN HOME TO LOGIN
          </button>
        )}

        {controller && (!data || unauthorized) ? (
          <form
            onSubmit={(event) => action("login", event)}
            className="space-y-3 rounded-xl bg-[#142c31] p-4"
          >
            <h2 className="font-black">
              ROULETTE CONTROLLER LOGIN
            </h2>

            <label className="block text-sm">
              Login ID
              <input
                required
                autoComplete="username"
                className={field}
                value={login}
                onChange={(event) => setLogin(event.target.value)}
              />
            </label>

            <label className="block text-sm">
              Password
              <input
                required
                type="password"
                autoComplete="current-password"
                className={field}
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
              />
            </label>

            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-amber-300 px-5 py-3 font-black text-black disabled:opacity-40"
            >
              LOGIN
            </button>
          </form>
        ) : controller && data?.mustChangePassword ? (
          <ControllerPasswordChange onComplete={refresh} />
        ) : (
          <>
            {controller && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => action("logout")}
                  className="text-xs underline"
                >
                  LOGOUT
                </button>

                <form
                  onSubmit={(event) => action("lock", event)}
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
                        phase === "BETTING" ||
                        phase === "SPINNING" ||
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
                      ? "GREEN · ZERO"
                      : `${
                          red.has(Number(number)) ? "RED" : "BLACK"
                        } · ${
                          Number(number) % 2 ? "ODD" : "EVEN"
                        } · Dozen ${Math.ceil(
                          Number(number) / 12
                        )} · Column ${
                          ((Number(number) - 1) % 3) + 1
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
                    I confirm this result is fixed before bets
                    open and cannot be changed after locking.
                  </label>

                  <button
                    type="submit"
                    disabled={
                      !confirmed ||
                      busy ||
                      !fresh ||
                      phase === "BETTING" ||
                      phase === "SPINNING"
                    }
                    className="rounded-lg bg-amber-300 p-3 font-black text-black disabled:opacity-40"
                  >
                    CONFIRM &amp; LOCK · OPEN 30 SECONDS
                  </button>

                  {round && (
                    <p className="text-xs text-cyan-200">
                      Round #{round.id} · Locked number {round.number}
                    </p>
                  )}
                </form>
              </>
            )}

            <div className="rounded-lg bg-amber-300 p-2 text-center font-black text-black">
              {phase === "BETTING"
                ? `Bets closing ${Math.max(
                    0,
                    Math.ceil((close - now) / 1000)
                  )}`
                : phase === "SPINNING"
                  ? "WAIT FOR NEXT GAME · SPINNING"
                  : phase === "RESULT"
                    ? `RESULT: ${round.number} · ${
                        round.number === 0
                          ? "GREEN"
                          : red.has(round.number)
                            ? "RED"
                            : "BLACK"
                      }`
                    : "WAITING FOR NEXT ROUND"}
            </div>

            <div className="flex gap-2 overflow-x-auto">
              {data?.history?.map((item) => (
                <span
                  key={item.id}
                  style={{
                    color:
                      item.number === 0
                        ? "#4ade80"
                        : red.has(item.number)
                          ? "#fb7185"
                          : "#cbd5e1",
                  }}
                  className="rounded bg-black px-3 py-1 font-bold"
                >
                  {item.number}
                </span>
              ))}
            </div>

            {(phase === "SPINNING" || phase === "RESULT") && (
              <Wheel
                key={round?.id}
                phase={phase}
                number={round?.number}
                landingNumber={round?.landingNumber}
                elapsed={spinElapsed}
              />
            )}

            {!controller && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold">Chip</span>

                  {[10, 50, 100, 500, 1000, 5000].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setChip(value)}
                      aria-pressed={chip === value}
                      className={`rounded-lg border px-3 py-2 text-xs font-black ${
                        chip === value
                          ? "border-[#166534] bg-[#166534] text-white"
                          : "border-[#166534] bg-white text-[#166534]"
                      }`}
                    >
                      {money(value)}
                    </button>
                  ))}
                </div>

                <section className="rounded-xl border border-[#166534] bg-white p-3 text-[#166534]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs font-black">
                      TOTAL BET
                    </p>
                    <AmountBox value={total} />
                  </div>

                  <p className="mt-2 text-[11px] leading-5 text-[#722f37]">
                    Chips reserve demo balance immediately.
                    Clear or undo before betting closes to release it.
                  </p>
                </section>

                <div className="flex gap-2">
                  <div
                    className="grid min-w-0 flex-1 grid-cols-[.8fr_.8fr_1fr_1fr_1fr]"
                    style={{
                      gridTemplateRows: "48px repeat(12,44px) 44px",
                    }}
                  >
                    {cell("N:0", "0", "#169c53", {
                      gridColumn: "3 / 6",
                      gridRow: "1",
                    })}

                    {[
                      "LOW",
                      "EVEN",
                      "RED",
                      "BLACK",
                      "ODD",
                      "HIGH",
                    ].map((key, index) =>
                      cell(
                        key,
                        ["1–18", "EVEN", "RED", "BLACK", "ODD", "19–36"][
                          index
                        ],
                        key === "RED"
                          ? "#d52e36"
                          : key === "BLACK"
                            ? "#252b35"
                            : "#fff1a8",
                        {
                          gridColumn: "1",
                          gridRow: `${2 + index * 2} / span 2`,
                          writingMode: "vertical-rl",
                        }
                      )
                    )}

                    {[1, 2, 3].map((value, index) =>
                      cell(
                        `D:${value}`,
                        `${value === 1 ? "1st" : value === 2 ? "2nd" : "3rd"} 12`,
                        "#fff1a8",
                        {
                          gridColumn: "2",
                          gridRow: `${2 + index * 4} / span 4`,
                          writingMode: "vertical-rl",
                        }
                      )
                    )}

                    {Array.from(
                      { length: 36 },
                      (_, index) => index + 1
                    ).map((value) =>
                      cell(`N:${value}`, value, color(value), {
                        gridColumn: String(3 + ((value - 1) % 3)),
                        gridRow: String(
                          2 + Math.floor((value - 1) / 3)
                        ),
                        fontSize: "22px",
                      })
                    )}

                    {[1, 2, 3].map((value) =>
                      cell(`C:${value}`, "2 to 1", "#fff1a8", {
                        gridColumn: String(value + 2),
                        gridRow: "14",
                        fontSize: "12px",
                      })
                    )}
                  </div>

                  <div className="flex w-16 flex-col gap-3 text-[10px]">
                    <button
                      type="button"
                      disabled={busy || !open || Boolean(pendingPayload)}
                      onClick={() => update({})}
                    >
                      ✕<br />CLEAR
                    </button>

                    <button
                      type="button"
                      disabled={
                        busy ||
                        !open ||
                        Boolean(pendingPayload) ||
                        !undo.current.length
                      }
                      onClick={() => update(undo.current.at(-1), true)}
                    >
                      ↶<br />UNDO
                    </button>

                    <button
                      type="button"
                      disabled={busy || !open || Boolean(pendingPayload)}
                      onClick={() =>
                        update(
                          Object.fromEntries(
                            Object.entries(bets).map(([key, value]) => [
                              key,
                              value * 2,
                            ])
                          )
                        )
                      }
                    >
                      2×<br />DOUBLE
                    </button>

                    <button
                      type="button"
                      disabled={busy || !open || Boolean(pendingPayload)}
                      onClick={() => update(previous.current)}
                    >
                      ↻<br />REBET
                    </button>

                    <button
                      type="button"
                      aria-expanded={advanced}
                      onClick={() => setAdvanced((value) => !value)}
                    >
                      ▦<br />INSIDE BETS
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
                      onChange={(event) => setType(event.target.value)}
                      className={field}
                    >
                      <option value="S">Split (17:1)</option>
                      <option value="T">Street (11:1)</option>
                      <option value="K">Corner (8:1)</option>
                      <option value="L">Six Line (5:1)</option>
                    </select>

                    <input
                      aria-label="First number"
                      type="number"
                      min="0"
                      max="36"
                      value={first}
                      onChange={(event) => setFirst(event.target.value)}
                      className={field}
                    />

                    {type === "S" && (
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
                      type="button"
                      disabled={!open || busy || Boolean(pendingPayload)}
                      onClick={() =>
                        add(
                          type === "S"
                            ? `S:${Math.min(
                                Number(first),
                                Number(second)
                              )}:${Math.max(
                                Number(first),
                                Number(second)
                              )}`
                            : `${type}:${Number(first)}`
                        )
                      }
                      className="rounded-lg bg-[#166534] p-3 font-black text-white disabled:opacity-40"
                    >
                      ADD CHIP {money(chip)}
                    </button>
                  </section>
                )}

                {pendingPayload && (
                  <button
                    type="button"
                    disabled={!open || busy}
                    onClick={() => update(null, false, true)}
                    className="rounded-lg bg-[#722f37] p-3 font-black text-white disabled:opacity-40"
                  >
                    RETRY SAME ACTION
                  </button>
                )}

                <section className="rounded-xl border border-[#166534] bg-white p-3 text-[#166534]">
                  <h2 className="font-black">Your roulette history</h2>

                  {!data?.entries?.length && (
                    <p className="mt-3 text-xs">No entries yet.</p>
                  )}

                  {data?.entries?.map((item) => (
                    <div
                      key={item.round_id}
                      className="mt-3 rounded-lg border border-[#166534] p-3"
                    >
                      <div className="flex flex-wrap justify-between gap-2 text-xs font-black">
                        <span>Round #{item.round_id}</span>
                        <span className="text-[#722f37]">
                          {item.status === "SETTLED"
                            ? `RESULT ${item.number}`
                            : "PLACED"}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                          <p className="mb-1 text-[10px] font-bold">
                            BET
                          </p>
                          <AmountBox value={item.total} />
                        </div>

                        <div>
                          <p className="mb-1 text-[10px] font-bold">
                            RETURNED
                          </p>

                          {item.status === "SETTLED" ? (
                            <AmountBox value={item.payout} />
                          ) : (
                            <span className="inline-block rounded-lg border border-[#722f37] px-3 py-2 text-xs font-bold text-[#722f37]">
                              PENDING
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  <p className="mt-3 text-[10px] text-[#722f37]">
                    Virtual demo balance only.
                  </p>
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
                Outside bets 1:1. Winning returns include original
                stake. Zero loses all outside bets.
              </p>

              <p className="break-all">
                Commitment SHA-256(number:seed): {round?.commitment}
              </p>

              {round?.seed && (
                <p className="break-all">
                  Revealed seed: {round.seed}
                </p>
              )}

              {!controller && (
                <p className="mt-3">
                  Demo coins only. ₹ is the display symbol for
                  virtual demo balance.
                </p>
              )}
            </details>
          </>
        )}
      </div>
    </main>
  );
}

function spinPose(seconds, target) {
  const progress = Math.min(1, Math.max(0, seconds / 15));
  const ease = 1 - Math.pow(1 - progress, 3);
  const step = 360 / 37;
  const index = wheel.indexOf(target);
  const endBall = -3960 + (index < 0 ? 0 : index * step);
  const drop = Math.min(1, Math.max(0, (progress - 0.65) / 0.35));
  const smoothDrop = drop * drop * (3 - 2 * drop);

  return {
    wheel: 2160 * ease,
    ball: endBall * ease,
    radius: 194 - 12 * smoothDrop,
  };
}

function Wheel({ phase, number, landingNumber, elapsed }) {
  const uid = useId().replace(/:/g, "");
  const spinning = phase === "SPINNING";

  const anchor = useRef({
    elapsed,
    at: performance.now(),
  });

  const [seconds, setSeconds] = useState(elapsed);

  useEffect(() => {
    anchor.current = {
      elapsed,
      at: performance.now(),
    };
  }, [elapsed]);

  useEffect(() => {
    if (!spinning) return;

    let frame;

    const tick = () => {
      const next =
        anchor.current.elapsed +
        (performance.now() - anchor.current.at) / 1000;

      setSeconds(Math.min(15, next));
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [spinning]);

  const target = spinning ? landingNumber : number;

  const ready =
    Number.isInteger(target) && target >= 0 && target <= 36;

  const pose = spinPose(spinning ? seconds : 15, target);
  const wheelAngle = pose.wheel;
  const ballAngle = pose.ball;
  const step = 360 / 37;

  const point = (radius, degrees) => {
    const radians = (degrees * Math.PI) / 180;

    return [
      300 + radius * Math.sin(radians),
      300 - radius * Math.cos(radians),
    ];
  };

  const sector = (inner, outer, start, end) => {
    const a = point(outer, start);
    const b = point(outer, end);
    const c = point(inner, end);
    const d = point(inner, start);

    return (
      `M ${a} A ${outer} ${outer} 0 0 1 ${b} ` +
      `L ${c} A ${inner} ${inner} 0 0 0 ${d} Z`
    );
  };

  const id = (name) => `${uid}-${name}`;
  const paint = (name) => `url(#${id(name)})`;

  return (
    <section
      className="overflow-hidden rounded-2xl border border-amber-200/20 bg-[#080d11] p-2 shadow-2xl"
      aria-label={
        spinning ? "Roulette wheel spinning" : `Roulette result ${number}`
      }
    >
      <div className="flex justify-between px-3 pt-2 text-[9px] font-bold tracking-widest text-amber-200/70">
        <span>TSB · EUROPEAN ROULETTE</span>
        <span>{spinning ? "SPINNING" : "RESULT"}</span>
      </div>

      <svg
        viewBox="0 0 600 560"
        className="mx-auto block w-full max-w-[620px]"
        role="img"
        aria-label={
          spinning
            ? "Gold roulette wheel and ivory ball rotating"
            : `Ball in the ${number} inner pocket`
        }
      >
        <defs>
          <linearGradient id={id("gold")} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#44230c" />
            <stop offset=".18" stopColor="#d69c37" />
            <stop offset=".34" stopColor="#fff1b8" />
            <stop offset=".48" stopColor="#9a5b17" />
            <stop offset=".65" stopColor="#f5d47e" />
            <stop offset=".85" stopColor="#96601f" />
            <stop offset="1" stopColor="#39200b" />
          </linearGradient>

          <radialGradient id={id("wood")} cx="35%" cy="25%">
            <stop stopColor="#82411e" />
            <stop offset=".35" stopColor="#431b0d" />
            <stop offset=".7" stopColor="#602811" />
            <stop offset="1" stopColor="#170b08" />
          </radialGradient>

          <radialGradient id={id("bowl")} cx="35%" cy="20%">
            <stop stopColor="#b17b44" />
            <stop offset=".25" stopColor="#4b2515" />
            <stop offset=".65" stopColor="#24130f" />
            <stop offset="1" stopColor="#080707" />
          </radialGradient>

          <linearGradient id={id("red")} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#ff3e45" />
            <stop offset=".5" stopColor="#b60e21" />
            <stop offset="1" stopColor="#4b050c" />
          </linearGradient>

          <linearGradient id={id("black")} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#50565d" />
            <stop offset=".5" stopColor="#15191e" />
            <stop offset="1" stopColor="#030405" />
          </linearGradient>

          <linearGradient id={id("green")} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#32df8a" />
            <stop offset=".5" stopColor="#078748" />
            <stop offset="1" stopColor="#023d20" />
          </linearGradient>

          <radialGradient id={id("ball")} cx="30%" cy="25%">
            <stop stopColor="#ffffff" />
            <stop offset=".45" stopColor="#fff8df" />
            <stop offset=".8" stopColor="#d4c8a9" />
            <stop offset="1" stopColor="#938365" />
          </radialGradient>

          <radialGradient id={id("hub")} cx="30%" cy="20%">
            <stop stopColor="#fff8ce" />
            <stop offset=".3" stopColor="#e4bd58" />
            <stop offset=".6" stopColor="#7e4814" />
            <stop offset=".78" stopColor="#f2cf73" />
            <stop offset="1" stopColor="#35200d" />
          </radialGradient>

          <filter
            id={id("shadow")}
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feDropShadow
              dx="0"
              dy="5"
              stdDeviation="4"
              floodColor="#000"
              floodOpacity=".75"
            />
          </filter>
        </defs>

        <ellipse
          cx="300"
          cy="495"
          rx="252"
          ry="28"
          fill="#000"
          opacity=".7"
        />

        <g transform="translate(0 12) scale(1 .86)">
          <circle
            cx="300"
            cy="307"
            r="286"
            fill="#170c09"
            stroke="#4d2b16"
            strokeWidth="8"
          />

          <circle
            cx="300"
            cy="300"
            r="286"
            fill={paint("wood")}
            stroke={paint("gold")}
            strokeWidth="5"
          />

          {[278, 273, 266].map((radius) => (
            <circle
              key={radius}
              cx="300"
              cy="300"
              r={radius}
              fill="none"
              stroke={radius === 266 ? paint("gold") : "#ac7040"}
              strokeWidth={radius === 266 ? 10 : 1}
              opacity={radius === 266 ? 1 : 0.4}
            />
          ))}

          {Array.from({ length: 8 }, (_, index) => (
            <path
              key={index}
              d="M 300 20 l 3 6 -3 6 -3 -6 Z"
              fill={paint("gold")}
              transform={`rotate(${index * 45} 300 300)`}
            />
          ))}

          <circle
            cx="300"
            cy="300"
            r="255"
            fill="#0a0806"
            stroke="#f0c86f"
            strokeWidth="2"
          />

          <g
            style={{
              transformOrigin: "300px 300px",
              transform: `rotate(${wheelAngle}deg)`,
            }}
          >
            {wheel.map((value, index) => {
              const angle = index * step;
              const start = angle - step / 2;
              const end = angle + step / 2;

              const fill = paint(
                value === 0 ? "green" : red.has(value) ? "red" : "black"
              );

              const label = point(225, angle);
              const inner = point(159, start);
              const outer = point(205, start);

              return (
                <g key={value}>
                  <path
                    d={sector(207, 247, start, end)}
                    fill={color(value)}
                    stroke="#e5be72"
                    strokeWidth=".8"
                  />

                  <text
                    x={label[0]}
                    y={label[1]}
                    dy=".35em"
                    textAnchor="middle"
                    fill="#fff6dc"
                    fontFamily="Georgia,serif"
                    fontSize="19"
                    fontWeight="bold"
                    transform={`rotate(${angle} ${label[0]} ${label[1]})`}
                  >
                    {value}
                  </text>

                  <path
                    d={sector(159, 204, start, end)}
                    fill={fill}
                    stroke="#69421c"
                    strokeWidth="1"
                  />

                  <path
                    d={`M ${inner} L ${outer}`}
                    stroke={paint("gold")}
                    strokeWidth="2.4"
                  />

                  <path
                    d={sector(160, 166, start + 0.6, end - 0.6)}
                    fill="#000"
                    opacity=".38"
                  />

                  {!spinning && value === number && (
                    <path
                      d={sector(159, 204, start, end)}
                      fill="none"
                      stroke="#fff0a1"
                      strokeWidth="2.5"
                    />
                  )}
                </g>
              );
            })}

            {[248, 206, 158].map((radius) => (
              <circle
                key={radius}
                cx="300"
                cy="300"
                r={radius}
                fill="none"
                stroke={paint("gold")}
                strokeWidth={radius === 206 ? 4 : 3}
              />
            ))}
          </g>

          <circle
            cx="300"
            cy="300"
            r="155"
            fill={paint("bowl")}
            stroke="#b88843"
            strokeWidth="2"
          />

          {[0, 90, 180, 270].map((angle) => (
            <path
              key={angle}
              d="M 300 156 L 300 300"
              stroke="#ca9a50"
              strokeWidth="1"
              opacity=".28"
              transform={`rotate(${angle} 300 300)`}
            />
          ))}

          <circle
            cx="300"
            cy="300"
            r="81"
            fill={paint("wood")}
            stroke={paint("gold")}
            strokeWidth="5"
          />

          <g filter={paint("shadow")}>
            <ellipse
              cx="300"
              cy="307"
              rx="48"
              ry="25"
              fill={paint("gold")}
            />

            <path
              d="M 270 299 Q 284 277 286 244 L 314 244 Q 316 277 330 299 Z"
              fill={paint("gold")}
              stroke="#e8c472"
            />

            <ellipse
              cx="300"
              cy="245"
              rx="31"
              ry="12"
              fill={paint("gold")}
              stroke="#f8df9a"
            />

            <path
              d="M 289 242 L 291 213 L 309 213 L 311 242 Z"
              fill={paint("gold")}
            />

            <ellipse
              cx="300"
              cy="212"
              rx="27"
              ry="9"
              fill={paint("gold")}
              stroke="#fce8ad"
            />

            <path
              d="M 292 210 L 293 195 L 307 195 L 308 210 Z"
              fill={paint("gold")}
            />

            <circle
              cx="300"
              cy="190"
              r="13"
              fill={paint("hub")}
            />

            <path
              d="M 289 257 L 237 240 M 311 257 L 363 240"
              fill="none"
              stroke="#6b4219"
              strokeWidth="9"
              strokeLinecap="round"
            />

            <path
              d="M 289 255 L 237 238 M 311 255 L 363 238"
              fill="none"
              stroke={paint("gold")}
              strokeWidth="6"
              strokeLinecap="round"
            />

            <circle
              cx="235"
              cy="238"
              r="7"
              fill={paint("hub")}
            />

            <circle
              cx="365"
              cy="238"
              r="7"
              fill={paint("hub")}
            />
          </g>

          <g
            visibility={ready ? "visible" : "hidden"}
            style={{
              transformOrigin: "300px 300px",
              transform: `rotate(${ballAngle}deg)`,
            }}
          >
            <g
              style={{
                transform: `translateY(${-pose.radius}px)`,
              }}
            >
              <ellipse
                cx="302"
                cy="305"
                rx="10"
                ry="6"
                fill="#000"
                opacity=".65"
              />

              <circle
                cx="300"
                cy="300"
                r="8.5"
                fill={paint("ball")}
                stroke="#e8ddbf"
                strokeWidth=".7"
                filter={paint("shadow")}
              />

              <circle
                cx="297"
                cy="297"
                r="2"
                fill="#fff"
                opacity=".85"
              />
            </g>
          </g>
        </g>
      </svg>

      <div className="pb-3 text-center">
        <span className="rounded-full border border-amber-300/25 bg-black/40 px-4 py-2 text-xs font-bold text-amber-100">
          {spinning
            ? "BALL IN MOTION"
            : `${number} · ${
                number === 0
                  ? "GREEN"
                  : red.has(number)
                    ? "RED"
                    : "BLACK"
              } · RESULT`}
        </span>
      </div>
    </section>
  );
}
