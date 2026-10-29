import React, { useEffect, useRef, useState } from "react";

import {
  flightApi,
  flightRequestKey,
  notifyFlightWallet,
  useFlightState,
} from "./flightClient";

const MODES = [
  { id: "30s", label: "30 Sec" },
  { id: "1m", label: "1 Min" },
  { id: "3m", label: "3 Min" },
  { id: "5m", label: "5 Min" },
];

const coins = (value) => {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return "—";
  }

  return Number(value).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
};

const money = (value) => {
  const formatted = coins(value);
  return formatted === "—" ? "—" : `₹${formatted}`;
};

function AmountBox({ label, value }) {
  return (
    <div className="inline-flex max-w-full flex-col items-center justify-center gap-1 rounded-xl border border-[#166534] bg-white px-3 py-2">
      {label && (
        <span className="text-center text-[9px] font-black text-[#722f37]">
          {label}
        </span>
      )}

      <strong className="break-all text-base font-black tabular-nums text-[#166534]">
        {money(value)}
      </strong>
    </div>
  );
}

function marketLabel(key) {
  if (key?.startsWith("NUMBER_")) {
    return `Number ${key.slice(7)}`;
  }

  return (
    {
      GREEN: "Green",
      VIOLET: "Violet",
      RED: "Red",
      BIG: "Big",
      SMALL: "Small",
    }[key] || key
  );
}

function numberBackground(number) {
  if (number === 0) {
    return "linear-gradient(135deg,#ef4444 50%,#a855f7 50%)";
  }

  if (number === 5) {
    return "linear-gradient(135deg,#22c55e 50%,#a855f7 50%)";
  }

  return number % 2 === 1 ? "#16a86b" : "#e44350";
}

function ResultBall({ number, small = false }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full border-2 border-white/40 font-black text-white shadow-lg ${
        small ? "h-8 w-8 text-sm" : "h-12 w-12 text-xl"
      }`}
      style={{ background: numberBackground(number) }}
    >
      {number}
    </span>
  );
}

export default function ColorPredictionPage({
  onBack = () => window.location.assign("/"),
}) {
  const [mode, setMode] = useState("30s");

  return (
    <ColorGame
      key={mode}
      mode={mode}
      onChangeMode={setMode}
      onBack={onBack}
    />
  );
}

function ColorGame({ mode, onChangeMode, onBack }) {
  const {
    data,
    error,
    unauthorized,
    receivedAt,
    refresh,
  } = useFlightState(`/api/color-prediction/${mode}/state`);

  const [clock, setClock] = useState(Date.now());
  const [amount, setAmount] = useState("100");
  const [selection, setSelection] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null);
  const [pendingCancel, setPendingCancel] = useState(null);
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState("HISTORY");
  const [showRules, setShowRules] = useState(false);

  const inFlight = useRef(false);
  const confirmBox = useRef(null);
  const mounted = useRef(false);
  const lastBalance = useRef(null);

  useEffect(() => {
    mounted.current = true;
    const timer = setInterval(() => setClock(Date.now()), 100);

    return () => {
      mounted.current = false;
      clearInterval(timer);
    };
  }, []);

  const matchingData = data?.round?.mode === mode;
  const round = matchingData ? data.round : null;

  const paused = Boolean(
    matchingData &&
      (data.paused === true || data.control?.paused === true)
  );

  const elapsed = Number.isFinite(receivedAt)
    ? Math.max(0, clock - receivedAt)
    : Infinity;

  const serverTime = Date.parse(data?.serverTime);

  const now =
    Number.isFinite(serverTime) && Number.isFinite(elapsed)
      ? serverTime + (paused ? 0 : elapsed)
      : clock;

  const fresh = Boolean(
    matchingData &&
      !error &&
      !unauthorized &&
      Number.isFinite(serverTime) &&
      elapsed < 3500
  );

  const closesAt = Date.parse(round?.closesAt);
  const endsAt = Date.parse(round?.endsAt);

  const open = Boolean(
    fresh &&
      !paused &&
      round?.phase === "BETTING" &&
      now < closesAt
  );

  const drawing = Boolean(round && now >= closesAt);

  const seconds = round
    ? Math.max(
        0,
        Math.ceil(((drawing ? endsAt : closesAt) - now) / 1000) || 0
      )
    : 0;

  const timerText =
    `${String(Math.floor(seconds / 60)).padStart(2, "0")}:` +
    String(seconds % 60).padStart(2, "0");

  const bets = matchingData ? data.bets || [] : [];
  const history = matchingData ? data.history || [] : [];

  const currentBets = bets.filter(
    (bet) => String(bet.roundId) === String(round?.id)
  );

  const unresolved = Boolean(pending || pendingCancel);
  const locked = busy || unresolved;
  const stake = Number(amount);

  const validAmount =
    Number.isSafeInteger(stake) &&
    stake >= 100 &&
    stake <= 25000;

  const selectedForRound = Boolean(
    selection &&
      String(selection.roundId) === String(round?.id)
  );

  const canConfirm =
    open && selectedForRound && validAmount && !locked;

  const balanceAvailable =
    matchingData &&
    !unauthorized &&
    data?.balance !== null &&
    data?.balance !== undefined &&
    Number.isFinite(Number(data.balance));

  useEffect(() => {
    setSelection(null);
  }, [round?.id]);

  useEffect(() => {
    if (paused) setSelection(null);
  }, [paused]);

  useEffect(() => {
    if (
      !matchingData ||
      unauthorized ||
      data?.balance === null ||
      data?.balance === undefined ||
      !Number.isFinite(Number(data.balance))
    ) {
      return;
    }

    const balance = Number(data.balance);
    const previous = lastBalance.current;
    lastBalance.current = balance;

    if (previous !== null && previous !== balance) {
      notifyFlightWallet();
    }
  }, [matchingData, unauthorized, data?.balance]);

  const chooseMarket = (key) => {
    if (!open || locked) return;

    setSelection({ key, roundId: round.id });
    setMessage("");

    requestAnimationFrame(() => {
      confirmBox.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  };

  const changeAmount = (value) => {
    if (locked) return;
    setAmount(String(Math.min(25000, Math.max(100, value))));
  };

  const refreshSafely = async () => {
    try {
      await refresh();
    } catch {
      // Regular state polling will retry.
    }
  };

  const requestBet = async (retry = false) => {
    if (inFlight.current || pendingCancel) return;

    if (!retry && !canConfirm) {
      setMessage(
        paused
          ? "Color Prediction is paused by Admin."
          : "Choose a market and enter ₹100–₹25,000 in demo balance during betting."
      );
      return;
    }

    const payload = retry
      ? pending
      : {
          roundId: round.id,
          market: selection.key,
          amount: stake,
          requestKey: flightRequestKey(),
        };

    if (!payload) return;

    inFlight.current = true;
    setBusy(true);
    setPending(payload);
    setMessage("");

    try {
      const result = await flightApi(
        `/api/color-prediction/${mode}/bets`,
        payload
      );

      notifyFlightWallet();

      if (mounted.current) {
        setPending(null);
        setSelection(null);
        setMessage(
          result.bet?.status === "CANCELLED"
            ? "This bet was already cancelled."
            : "Bet recorded."
        );
      }
    } catch (requestError) {
      if (mounted.current) {
        if (
          requestError.status >= 400 &&
          requestError.status < 500
        ) {
          setPending(null);
        }

        setMessage(
          requestError.message || "Unable to confirm bet."
        );
      }
    } finally {
      inFlight.current = false;

      if (mounted.current) {
        setBusy(false);
        void refreshSafely();
      }
    }
  };

  const cancelBet = async (betId) => {
    if (inFlight.current || pending) return;

    if (
      pendingCancel &&
      String(pendingCancel) !== String(betId)
    ) {
      return;
    }

    if (!pendingCancel && !open) {
      setMessage(
        paused
          ? "Color Prediction is paused by Admin."
          : "Betting is closed or the connection is unavailable."
      );
      return;
    }

    inFlight.current = true;
    setBusy(true);
    setPendingCancel(betId);
    setMessage("");

    try {
      await flightApi(
        `/api/color-prediction/${mode}/cancel`,
        { betId }
      );

      notifyFlightWallet();

      if (mounted.current) {
        setPendingCancel(null);
        setMessage("Bet cancelled. Full stake returned.");
      }
    } catch (requestError) {
      if (mounted.current) {
        if (
          requestError.status >= 400 &&
          requestError.status < 500
        ) {
          setPendingCancel(null);
        }

        setMessage(
          requestError.message || "Unable to cancel bet."
        );
      }
    } finally {
      inFlight.current = false;

      if (mounted.current) {
        setBusy(false);
        void refreshSafely();
      }
    }
  };

  const reserved = currentBets
    .filter((bet) => bet.status === "PLACED")
    .reduce((total, bet) => total + Number(bet.amount), 0);

  return (
    <main className="min-h-screen bg-[#111535] p-3 text-white">
      <div className="mx-auto max-w-2xl space-y-3">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#09204e] p-4">
          <button
            type="button"
            disabled={locked}
            onClick={onBack}
            className="text-xs font-black disabled:opacity-40"
          >
            ‹ HOME
          </button>

          <h1 className="min-w-0 flex-1 text-center text-sm font-black">
            COLOR PREDICTION
          </h1>

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
                {balanceAvailable
                  ? coins(data.balance)
                  : data || error || unauthorized
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
        </header>

        <nav className="grid grid-cols-4 gap-2">
          {MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={locked}
              aria-pressed={mode === item.id}
              onClick={() => onChangeMode(item.id)}
              className={`rounded-xl border px-1 py-4 text-xs font-black disabled:opacity-40 ${
                mode === item.id
                  ? "border-cyan-200/60 bg-blue-500"
                  : "border-white/10 bg-[#303b7d] text-slate-300"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {(message || error) && (
          <p
            role="status"
            className="rounded-xl border border-amber-200/20 bg-amber-200/10 p-3 text-xs leading-6 text-amber-100"
          >
            {message || String(error?.message || error)}
          </p>
        )}

        {unauthorized && (
          <button
            type="button"
            disabled={locked}
            onClick={onBack}
            className="w-full rounded-xl bg-[#722f37] p-3 text-xs font-black text-white disabled:opacity-40"
          >
            RETURN HOME TO LOGIN
          </button>
        )}

        {paused && (
          <div
            role="status"
            className="rounded-xl border border-amber-300/40 bg-amber-300/15 p-3 text-center"
          >
            <p className="text-sm font-black text-amber-200">
              Ⅱ PAUSED BY ADMIN
            </p>
            <p className="mt-1 text-xs leading-5 text-amber-100">
              All four time modes are paused. Existing bets remain
              reserved. The timer resumes when Admin selects Play.
            </p>
          </div>
        )}

        <section className="rounded-2xl border border-blue-300/20 bg-gradient-to-br from-blue-500 to-indigo-700 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <button
                type="button"
                onClick={() => setShowRules((value) => !value)}
                aria-expanded={showRules}
                className="rounded-full border border-white/50 px-3 py-1 text-xs font-bold"
              >
                How to play
              </button>

              <h2 className="mt-3 text-lg font-black">
                Win Go {MODES.find((item) => item.id === mode)?.label}
              </h2>

              <div className="mt-3 flex flex-wrap gap-1">
                {history.slice(0, 5).map((item) => (
                  <ResultBall
                    key={item.id}
                    number={item.result.number}
                    small
                  />
                ))}
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs font-bold">
                {!round
                  ? "CONNECTING…"
                  : paused
                    ? "PAUSED BY ADMIN"
                    : drawing
                      ? "Waiting for draw"
                      : "Betting closes in"}
              </p>

              <p
                className={`mt-2 font-mono text-4xl font-black ${
                  paused ? "text-amber-200" : ""
                }`}
              >
                {timerText}
              </p>

              <p className="mt-3 break-all text-[9px]">
                {round?.period || "—"}
              </p>
            </div>
          </div>

          {round && !fresh && (
            <p className="mt-3 text-xs text-amber-100">
              Connection unavailable. Actions paused.
            </p>
          )}
        </section>

        {showRules && (
          <section className="rounded-xl border border-white/15 bg-[#202951] p-4 text-xs leading-6 text-slate-200">
            <h2 className="font-black text-white">How to play</h2>

            <p className="mt-2">
              Each result is a random number from 0 to 9.
              A 2% fee is deducted from each stake.
              Returns use the remaining 98%.
            </p>

            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>Green: 1, 3, 7, 9 → 2×; 5 → 1.5×.</li>
              <li>Red: 2, 4, 6, 8 → 2×; 0 → 1.5×.</li>
              <li>Violet: 0 or 5 → 2×.</li>
              <li>Exact number match → 9×.</li>
              <li>Big: 5–9 → 2×.</li>
              <li>Small: 0–4 → 2×.</li>
            </ul>

            <p className="mt-2">
              For a ₹100 demo stake, the contract amount is ₹98.
              A 2× win returns ₹196 in total demo balance.
              Fractional returns round down per bet.
              The final 5 seconds are reserved for the draw.
              Results can repeat.
            </p>

            <p className="mt-2">
              Switching time modes does not cancel existing bets.
              Confirmed bets can be cancelled before betting closes
              while the game is playing.
            </p>

            <p className="mt-2">
              Admin Pause freezes all four time modes.
              New bets and cancellations are unavailable while paused.
              Existing bets stay reserved, and Play resumes the game
              from the same logical time.
              Pause does not change a round&apos;s result.
            </p>

            <p className="mt-2">
              Demo coins only. ₹ is the display symbol for virtual
              demo balance.
            </p>
          </section>
        )}

        <section className="rounded-2xl border border-white/10 bg-[#242e65] p-4">
          <div className="flex flex-wrap justify-between gap-2">
            <h2 className="text-sm font-black">BET AMOUNT</h2>
            <span className="text-[10px] text-slate-300">
              ₹100–₹25,000 · Demo balance
            </span>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              aria-label="Decrease stake"
              disabled={locked}
              onClick={() => changeAmount((stake || 100) - 100)}
              className="w-10 rounded-xl bg-[#166534] text-xl text-white disabled:opacity-40"
            >
              −
            </button>

            <div className="flex min-w-0 flex-1 items-center overflow-hidden rounded-xl border-2 border-[#166534] bg-white">
              <span
                aria-hidden="true"
                className="flex self-stretch items-center bg-[#166534] px-3 text-2xl font-black text-white"
              >
                ₹
              </span>

              <input
                aria-label="Demo bet amount"
                type="text"
                inputMode="numeric"
                value={amount}
                disabled={locked}
                onChange={(event) => {
                  if (/^\d*$/.test(event.target.value)) {
                    setAmount(event.target.value);
                  }
                }}
                className="min-w-0 flex-1 bg-white p-3 text-center text-2xl font-black text-[#166534] outline-none disabled:opacity-40"
              />
            </div>

            <button
              type="button"
              aria-label="Increase stake"
              disabled={locked}
              onClick={() => changeAmount((stake || 0) + 100)}
              className="w-10 rounded-xl bg-[#166534] text-xl text-white disabled:opacity-40"
            >
              +
            </button>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2">
            {[100, 500, 1000, 5000].map((value) => (
              <button
                key={value}
                type="button"
                disabled={locked}
                onClick={() => changeAmount((stake || 0) + value)}
                className="rounded-lg border border-[#166534] bg-white py-2 text-[10px] font-black text-[#166534] disabled:opacity-40"
              >
                +{money(value)}
              </button>
            ))}
          </div>

          <div className="mt-3">
            <AmountBox label="RESERVED THIS ROUND" value={reserved} />
          </div>
        </section>

        <section
          ref={confirmBox}
          className="scroll-mt-4 rounded-2xl border border-amber-200/30 bg-[#182e3b] p-4"
        >
          <h2 className="text-sm font-black">
            {paused
              ? "Paused by Admin"
              : selectedForRound
                ? marketLabel(selection.key)
                : "Select a color, number, Big or Small"}
          </h2>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <AmountBox label="STAKE" value={stake} />

            {validAmount && (
              <AmountBox
                label="CONTRACT AMOUNT · FEE 2%"
                value={(stake * 98) / 100}
              />
            )}
          </div>

          <button
            type="button"
            disabled={!canConfirm}
            onClick={() => requestBet()}
            className="mt-3 w-full rounded-xl bg-[#166534] p-3 text-sm font-black text-white disabled:opacity-40"
          >
            {busy
              ? "PROCESSING…"
              : paused
                ? "PAUSED BY ADMIN"
                : "CONFIRM BET"}
          </button>

          <p className="mt-2 text-[10px] text-slate-300">
            Virtual demo coins only.
          </p>
        </section>

        {pending && (
          <button
            type="button"
            disabled={busy}
            onClick={() => requestBet(true)}
            className="w-full rounded-xl bg-[#722f37] p-3 text-xs font-black text-white disabled:opacity-40"
          >
            RETRY SAME BET REQUEST
          </button>
        )}

        {pendingCancel && (
          <button
            type="button"
            disabled={busy}
            onClick={() => cancelBet(pendingCancel)}
            className="w-full rounded-xl bg-[#722f37] p-3 text-xs font-black text-white disabled:opacity-40"
          >
            RETRY SAME CANCEL REQUEST
          </button>
        )}

        <section className="rounded-2xl border border-white/10 bg-[#242e65] p-3">
          <div className="grid grid-cols-3 gap-2">
            {[
              ["GREEN", "bg-emerald-500"],
              ["VIOLET", "bg-violet-500"],
              ["RED", "bg-red-500"],
            ].map(([key, color]) => (
              <button
                key={key}
                type="button"
                disabled={!open || locked}
                aria-pressed={
                  selectedForRound && selection.key === key
                }
                onClick={() => chooseMarket(key)}
                className={`rounded-xl py-3 text-sm font-black disabled:opacity-40 ${color} ${
                  selectedForRound && selection.key === key
                    ? "ring-2 ring-amber-200"
                    : ""
                }`}
              >
                {marketLabel(key)}
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-5 gap-3">
            {Array.from({ length: 10 }, (_, number) => {
              const key = `NUMBER_${number}`;

              return (
                <button
                  key={number}
                  type="button"
                  aria-label={`Bet on number ${number}`}
                  aria-pressed={
                    selectedForRound && selection.key === key
                  }
                  disabled={!open || locked}
                  onClick={() => chooseMarket(key)}
                  style={{ background: numberBackground(number) }}
                  className={`aspect-square rounded-full border-4 border-white/40 text-2xl font-black shadow-lg disabled:opacity-40 ${
                    selectedForRound && selection.key === key
                      ? "ring-2 ring-amber-200 ring-offset-2 ring-offset-[#242e65]"
                      : ""
                  }`}
                >
                  {number}
                </button>
              );
            })}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {[
              ["BIG", "5–9", "bg-orange-400"],
              ["SMALL", "0–4", "bg-blue-400"],
            ].map(([key, range, color]) => (
              <button
                key={key}
                type="button"
                disabled={!open || locked}
                aria-pressed={
                  selectedForRound && selection.key === key
                }
                onClick={() => chooseMarket(key)}
                className={`rounded-full py-3 text-sm font-black disabled:opacity-40 ${color} ${
                  selectedForRound && selection.key === key
                    ? "ring-2 ring-amber-200"
                    : ""
                }`}
              >
                {marketLabel(key)} · {range}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#202951] p-4">
          <h2 className="text-sm font-black">This round</h2>

          {!currentBets.length && (
            <p className="mt-3 text-xs text-slate-400">
              No bets placed.
            </p>
          )}

          {currentBets.map((bet) => (
            <div
              key={bet.id}
              className="mt-3 rounded-xl border border-white/10 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black">
                    {marketLabel(bet.market)}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-300">
                    {bet.status}
                  </p>
                </div>

                {open && bet.status === "PLACED" && (
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => cancelBet(bet.id)}
                    className="rounded-lg bg-[#722f37] px-3 py-2 text-[10px] font-black text-white disabled:opacity-40"
                  >
                    CANCEL
                  </button>
                )}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <AmountBox label="STAKE" value={bet.amount} />

                {bet.status !== "PLACED" ? (
                  <AmountBox label="RETURNED" value={bet.payout} />
                ) : (
                  <div className="flex items-center justify-center rounded-xl border border-white/20 p-2 text-[10px] font-bold text-slate-300">
                    RETURN PENDING
                  </div>
                )}
              </div>
            </div>
          ))}
        </section>

        <nav className="grid grid-cols-2 gap-2">
          {[
            ["HISTORY", "Game History"],
            ["BETS", "My Bets"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={tab === key}
              onClick={() => setTab(key)}
              className={`rounded-xl py-3 text-xs font-black ${
                tab === key ? "bg-blue-500" : "bg-[#202951]"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <section className="overflow-x-auto rounded-2xl border border-white/10 bg-[#202951] p-3">
          {tab === "HISTORY" ? (
            <table className="w-full text-left text-[10px]">
              <thead className="text-slate-300">
                <tr>
                  <th className="py-2">Period</th>
                  <th>Number</th>
                  <th>Big/Small</th>
                  <th>Color</th>
                </tr>
              </thead>

              <tbody>
                {history.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-white/10"
                  >
                    <td className="py-3 pr-2">{item.period}</td>
                    <td>
                      <ResultBall
                        number={item.result.number}
                        small
                      />
                    </td>
                    <td>
                      {item.result.size === "BIG" ? "Big" : "Small"}
                    </td>
                    <td>
                      <div className="flex gap-1">
                        {item.result.colors.map((color) => (
                          <span
                            key={color}
                            title={marketLabel(color)}
                            aria-label={marketLabel(color)}
                            className={`h-3 w-3 rounded-full ${
                              color === "GREEN"
                                ? "bg-emerald-400"
                                : color === "RED"
                                  ? "bg-red-400"
                                  : "bg-violet-400"
                            }`}
                          />
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="space-y-3">
              {bets.map((bet) => (
                <div
                  key={bet.id}
                  className="rounded-xl border border-white/10 p-3 text-xs"
                >
                  <p className="font-black">
                    {marketLabel(bet.market)}
                  </p>

                  <p className="mt-1 text-[10px] text-slate-300">
                    {bet.period} · {bet.status}
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <AmountBox label="STAKE" value={bet.amount} />

                    {bet.status === "PLACED" ? (
                      <div className="flex items-center justify-center rounded-xl border border-white/20 p-2 text-[10px] font-bold text-slate-300">
                        RETURN PENDING
                      </div>
                    ) : (
                      <AmountBox label="RETURNED" value={bet.payout} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {((tab === "HISTORY" && !history.length) ||
            (tab === "BETS" && !bets.length)) && (
            <p className="py-5 text-center text-xs text-slate-400">
              No records yet.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
