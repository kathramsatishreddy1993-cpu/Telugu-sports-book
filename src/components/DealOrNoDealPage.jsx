import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  flightApi,
  flightRequestKey,
  notifyFlightWallet,
  useFlightState,
} from "./flightClient";

import {
  SoundControls,
  useGameSound,
  useDealSound,
} from "./GameSound";

const BASE = "/api/deal-or-no-deal";

const LEVELS = [
  [1, 6, "1.40"],
  [2, 6, "2.00"],
  [3, 5, "3.50"],
  [4, 5, "6.00"],
  [5, 4, "12.00"],
  [6, 4, "25.00"],
  [7, 3, "70.00"],
  [8, 3, "200.00"],
  [9, 2, "800.00"],
];

const coins = value =>
  Number(value || 0).toLocaleString("en-IN");

export default function DealOrNoDealPage({
  onBack = () => window.location.assign("/"),
}) {
  const {
    data,
    error,
    unauthorized,
    receivedAt,
    refresh,
  } = useFlightState(`${BASE}/state`);

  const [clock, setClock] = useState(Date.now());
  const [amount, setAmount] = useState("100");
  const [selection, setSelection] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null);
  const [message, setMessage] = useState("");

  const [showHistory, setShowHistory] =
    useState(false);

  const inFlight = useRef(false);
  const confirmBox = useRef(null);

  const sound = useGameSound();

  useEffect(() => {
    const timer = setInterval(
      () => setClock(Date.now()),
      250,
    );

    return () => clearInterval(timer);
  }, []);

  const session = data?.session;

  const now = data
    ? new Date(data.serverTime).getTime() +
      Math.max(0, clock - receivedAt)
    : clock;

  const fresh = Boolean(
    data &&
      !error &&
      !unauthorized &&
      clock - receivedAt < 3500,
  );

  const entries = data?.entries || [];

  const entry = entries.find(
    item =>
      String(item.sessionId) ===
        String(session?.id) &&
      item.status !== "CANCELLED",
  );

  const level = Number(session?.level || 1);

  const deadline =
    session?.phase === "WAITING"
      ? session.opensAt
      : session?.phase === "BETTING"
        ? session.bettingClosesAt
        : session?.revealsAt;

  const remaining = deadline
    ? Math.max(
        0,
        Math.ceil(
          (
            new Date(deadline).getTime() -
            now
          ) / 1000,
        ),
      )
    : 0;

  const bettingOpen = Boolean(
    fresh &&
      session?.phase === "BETTING" &&
      remaining > 0,
  );

  const canJoin = Boolean(
    bettingOpen && level === 1 && !entry,
  );

  const canContinue = Boolean(
    bettingOpen &&
      entry?.status === "WON" &&
      level === Number(entry.completedLevel) + 1,
  );

  const canSelect =
    (canJoin || canContinue) &&
    !busy &&
    !pending;

  const canCollect = Boolean(
    fresh &&
      entry?.status === "WON" &&
      !busy &&
      !pending,
  );

  const canCancel = Boolean(
    bettingOpen &&
      level === 1 &&
      entry?.status === "PLAYING" &&
      Number(entry.completedLevel) === 0 &&
      !busy &&
      !pending,
  );

  const offerDeadline = entry?.offer?.deadline
    ? new Date(entry.offer.deadline).getTime()
    : 0;

  const offerSeconds = Math.max(
    0,
    Math.ceil((offerDeadline - now) / 1000),
  );

  const canDeal = Boolean(
    canCollect &&
      entry?.offer &&
      offerSeconds > 0,
  );

  const choice = entry?.choices?.find(
    item => Number(item.level) === level,
  );

  const revealed = session?.revealed || [];

  const currentResult = revealed.find(
    item => Number(item.level) === level,
  );

  const lastResult = revealed.length
    ? revealed[revealed.length - 1]
    : null;

  const selectedNumber =
    selection?.sessionId === String(session?.id) &&
    selection?.level === level
      ? selection.number
      : null;

  useDealSound(sound, {
    session,
    entry,
    fresh,
    now,
  });

  useEffect(() => {
    setSelection(null);
  }, [session?.id, session?.level]);

  const sendRequest = async request => {
    if (inFlight.current || !request) return;

    inFlight.current = true;
    setBusy(true);
    setMessage("");
    setPending(request);

    try {
      await flightApi(
        request.path,
        request.body,
      );

      setPending(null);
      setSelection(null);

      setMessage(
        request.kind === "BET"
          ? "Bet confirmed."
          : request.kind === "CONTINUE"
            ? "Case confirmed for the next level."
            : request.kind === "CANCEL"
              ? "Bet cancelled. Stake returned."
              : "Demo coins collected.",
      );

      if (
        request.kind === "BET" ||
        request.kind === "CONTINUE"
      ) {
        sound.cue("confirm");
      }

      notifyFlightWallet();
    } catch (requestError) {
      setMessage(requestError.message);

      if (
        requestError.status >= 400 &&
        requestError.status < 500
      ) {
        setPending(null);
      }
    } finally {
      try {
        await refresh();
      } finally {
        inFlight.current = false;
        setBusy(false);
      }
    }
  };

  const confirmSelection = () => {
    if (
      inFlight.current ||
      pending ||
      !canSelect ||
      !selectedNumber
    ) {
      return;
    }

    if (canJoin) {
      const stake = Number(amount);

      if (
        !Number.isSafeInteger(stake) ||
        stake < 100 ||
        stake > 25000
      ) {
        setMessage(
          "Enter 100–25,000 whole demo coins.",
        );

        return;
      }

      sendRequest({
        kind: "BET",
        path: `${BASE}/bets`,
        body: {
          sessionId: session.id,
          amount: stake,
          caseNumber: selectedNumber,
          requestKey: flightRequestKey(),
        },
      });

      return;
    }

    if (canContinue && entry) {
      sendRequest({
        kind: "CONTINUE",
        path: `${BASE}/entries/${entry.id}/action`,
        body: {
          action: "CONTINUE",
          level,
          caseNumber: selectedNumber,
        },
      });
    }
  };

  const act = action => {
    if (
      !entry ||
      inFlight.current ||
      pending ||
      !fresh
    ) {
      return;
    }

    if (
      action === "CANCEL" &&
      !canCancel
    ) {
      return;
    }

    if (
      action === "COLLECT" &&
      !canCollect
    ) {
      return;
    }

    if (
      action === "DEAL" &&
      !canDeal
    ) {
      return;
    }

    sendRequest({
      kind: action,
      path: `${BASE}/entries/${entry.id}/action`,
      body: {
        action,
        level:
          action === "CANCEL"
            ? 1
            : Number(entry.completedLevel),
      },
    });
  };

  const chooseCase = number => {
    if (!canSelect) return;

    setSelection({
      sessionId: String(session.id),
      level,
      number,
    });

    setMessage("");
    sound.cue("select");

    confirmBox.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  const statusText = !fresh
    ? "CONNECTING TO SERVER…"
    : !session
      ? "WAITING FOR A PUBLISHED SESSION"
      : session.phase === "WAITING"
        ? `SESSION STARTS IN ${remaining}s`
        : session.phase === "FINISHED"
          ? "SESSION FINISHED"
          : session.phase === "BETTING"
            ? `LEVEL ${level} · BETTING CLOSES IN ${remaining}s`
            : `LEVEL ${level} · REVEAL IN ${remaining}s`;

  return (
    <main className="min-h-screen bg-black p-3 text-white">
      <div className="mx-auto max-w-3xl space-y-4">
        <header className="flex items-center justify-between gap-3 rounded-xl border border-amber-300/25 bg-[#171108] p-4">
          <button
            type="button"
            disabled={busy || Boolean(pending)}
            onClick={onBack}
            className="text-xs font-bold disabled:opacity-40"
          >
            ‹ HOME
          </button>

          <h1 className="min-w-0 text-center text-sm font-black text-amber-300 sm:text-xl">
            DEAL OR NO DEAL
          </h1>

          <div className="shrink-0 rounded-xl border border-amber-400/30 bg-[#03121d]/90 px-3 py-2 text-right">
            <p className="whitespace-nowrap text-sm font-black tabular-nums text-amber-300">
              {data
                ? `₹${coins(data.balance)}`
                : "Loading..."}
            </p>
          </div>
        </header>

        <SoundControls sound={sound} />

        {unauthorized && (
          <button
            type="button"
            onClick={onBack}
            className="w-full rounded-xl bg-amber-300 p-3 font-black text-black"
          >
            RETURN HOME TO LOGIN
          </button>
        )}

        {(message || error) && (
          <p
            role="status"
            className="rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-100"
          >
            {message || error}
          </p>
        )}

        <section className="rounded-xl border border-amber-300/30 bg-gradient-to-r from-[#4a2708] via-[#251805] to-[#4a2708] p-4 text-center">
          <p className="text-sm font-black text-amber-200">
            {statusText}
          </p>

          <p className="mt-2 text-[10px] text-amber-100/60">
            SESSION #{session?.id || "—"}
          </p>
        </section>

        <section className="grid grid-cols-3 gap-x-3 gap-y-6 rounded-2xl border border-amber-300/10 bg-[radial-gradient(ellipse_at_center,_#51340a_0%,_#080705_70%)] px-3 py-6">
          {Array.from(
            { length: 9 },
            (_, index) => index + 1,
          ).map(number => {
            const won = currentResult
              ? currentResult.winners.includes(number)
              : null;

            const selected =
              selectedNumber === number;

            const confirmed =
              Number(choice?.caseNumber) === number;

            return (
              <button
                key={number}
                type="button"
                disabled={!canSelect}
                aria-label={`Case ${number}`}
                aria-pressed={selected}
                onClick={() => chooseCase(number)}
                className="relative pt-3 disabled:cursor-default"
              >
                <span className="absolute left-1/2 top-0 h-5 w-8 -translate-x-1/2 rounded-t-lg border-2 border-slate-300" />

                <span
                  className={`relative flex aspect-[4/3] flex-col items-center justify-center rounded-lg border-[3px] shadow-lg ${
                    won === true
                      ? "border-emerald-400 bg-[#102746] text-emerald-400"
                      : won === false
                        ? "border-red-500 bg-[#3b1010] text-red-400"
                        : selected || confirmed
                          ? "border-amber-300 bg-amber-100 text-black"
                          : "border-slate-400 bg-gradient-to-b from-white via-slate-200 to-slate-400 text-black"
                  }`}
                >
                  <strong className="text-3xl font-black sm:text-5xl">
                    {won === true
                      ? "✓"
                      : won === false
                        ? "✕"
                        : String(number).padStart(2, "0")}
                  </strong>

                  {won !== null && (
                    <span className="mt-1 text-[10px] font-black">
                      {won ? "WIN" : "LOSS"}
                    </span>
                  )}
                </span>

                <span className="mx-auto mt-1 block w-fit rounded-full bg-amber-300 px-3 py-1 text-[9px] font-black text-black">
                  CASE {String(number).padStart(2, "0")}
                  {confirmed ? " · YOUR PICK" : ""}
                  {selected ? " · SELECTED" : ""}
                </span>
              </button>
            );
          })}
        </section>

        {lastResult && (
          <p className="rounded-xl border border-amber-300/30 bg-[#2c1906] p-3 text-center text-xs font-bold text-amber-100">
            Level {lastResult.level} winners:{" "}
            {lastResult.winners.join(", ")}
          </p>
        )}

        {entry && (
          <section className="rounded-xl border border-white/10 bg-[#12100c] p-4">
            <div className="flex justify-between gap-3 text-xs">
              <span>
                Your stake
                <strong className="mt-1 block text-lg text-amber-200">
                  {coins(entry.stake)}
                </strong>
              </span>

              <span className="text-right">
                Status
                <strong className="mt-1 block text-sm text-amber-200">
                  {entry.status}
                </strong>
              </span>
            </div>

            <p className="mt-3 text-xs text-slate-400">
              Completed level: {entry.completedLevel}
            </p>

            {entry.status === "PLAYING" && (
              <p className="mt-3 text-sm text-amber-100">
                Your case is confirmed. Waiting for the
                shared draw.
              </p>
            )}

            {entry.status === "WON" && (
              <>
                <p className="mt-4 text-center text-xs text-slate-400">
                  CURRENT COLLECT VALUE
                </p>

                <p className="mt-1 text-center text-3xl font-black text-emerald-300">
                  {coins(entry.collectAmount)}
                </p>

                <button
                  type="button"
                  disabled={!canCollect}
                  onClick={() => act("COLLECT")}
                  className="mt-4 w-full rounded-xl bg-emerald-400 p-3 font-black text-black disabled:opacity-40"
                >
                  COLLECT {coins(entry.collectAmount)}
                </button>

                <p className="mt-3 text-center text-xs leading-5 text-slate-400">
                  To continue, select a case during the
                  next level’s betting window. No extra
                  stake is deducted. A losing case loses
                  the current uncollected winnings.
                </p>
              </>
            )}

            {canDeal && (
              <div className="mt-4 rounded-xl border border-amber-300/40 bg-amber-300/10 p-4 text-center">
                <h2 className="font-black text-amber-200">
                  BANKER’S OFFER
                </h2>

                <p className="mt-2 text-2xl font-black">
                  {coins(entry.offer.amount)}
                </p>

                <p className="mt-1 text-xs text-amber-100">
                  Offer expires in {offerSeconds}s
                </p>

                <button
                  type="button"
                  disabled={!canDeal}
                  onClick={() => act("DEAL")}
                  className="mt-3 w-full rounded-xl bg-amber-300 p-3 font-black text-black disabled:opacity-40"
                >
                  DEAL · COLLECT OFFER
                </button>

                <p className="mt-3 text-xs text-slate-300">
                  For NO DEAL, leave this offer and
                  choose a case to continue.
                </p>
              </div>
            )}

            {entry.status === "COLLECTED" && (
              <p className="mt-4 text-center text-lg font-black text-emerald-300">
                COLLECTED {coins(entry.payout)} DEMO COINS
              </p>
            )}

            {entry.status === "LOST" && (
              <p className="mt-4 text-center font-black text-red-400">
                Your selected case lost.
              </p>
            )}

            {canCancel && (
              <button
                type="button"
                onClick={() => act("CANCEL")}
                className="mt-4 w-full rounded-xl border border-white/20 p-3 text-xs font-bold"
              >
                CANCEL BET · RETURN STAKE
              </button>
            )}
          </section>
        )}

        <section
          ref={confirmBox}
          className="scroll-mt-4 space-y-4 rounded-2xl border border-amber-300/25 bg-[#241707] p-4"
        >
          <h2 className="text-sm font-black text-amber-200">
            {canContinue
              ? `CONTINUE TO LEVEL ${level}`
              : "BET AMOUNT"}
          </h2>

          {!entry && (
            <>
              <input
                type="number"
                inputMode="numeric"
                aria-label="Demo coin stake"
                min="100"
                max="25000"
                step="1"
                value={amount}
                disabled={busy || Boolean(pending)}
                onChange={event =>
                  setAmount(event.target.value)
                }
                className="w-full rounded-xl border border-amber-300/20 bg-black/40 p-3 text-center text-2xl font-black text-white"
              />

              <div className="grid grid-cols-4 gap-2">
                {[100, 500, 1000, 5000].map(value => (
                  <button
                    key={value}
                    type="button"
                    disabled={busy || Boolean(pending)}
                    onClick={() =>
                      setAmount(String(value))
                    }
                    className="rounded-full border border-amber-300/20 bg-black/30 py-2 text-xs font-bold disabled:opacity-40"
                  >
                    {coins(value)}
                  </button>
                ))}
              </div>

              <p className="text-center text-[10px] text-slate-400">
                100–25,000 whole demo coins
              </p>
            </>
          )}

          <p className="text-center text-sm text-amber-100">
            {selectedNumber
              ? `Selected case: ${String(selectedNumber).padStart(2, "0")}`
              : canSelect
                ? "Select one case above."
                : entry
                  ? "Follow your entry status above."
                  : "Join during Level 1 betting."}
          </p>

          <button
            type="button"
            disabled={!canSelect || !selectedNumber}
            onClick={confirmSelection}
            className="w-full rounded-xl bg-amber-300 p-4 font-black text-black disabled:opacity-35"
          >
            {busy
              ? "SENDING…"
              : canContinue
                ? "CONFIRM CASE · CONTINUE"
                : "CONFIRM BET"}
          </button>

          {pending && (
            <div className="space-y-3 rounded-xl border border-amber-300/30 bg-black/30 p-3">
              <p className="text-xs leading-5 text-amber-100">
                Waiting for a definite response. Retry
                sends the same request.
              </p>

              <button
                type="button"
                disabled={busy}
                onClick={() => sendRequest(pending)}
                className="w-full rounded-lg bg-amber-200 p-3 text-xs font-black text-black disabled:opacity-40"
              >
                RETRY SAME REQUEST
              </button>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-white/10 p-4">
          <button
            type="button"
            onClick={() =>
              setShowHistory(current => !current)
            }
            className="flex w-full items-center justify-between text-sm font-black text-amber-200"
          >
            <span>MY GAME HISTORY</span>
            <span>{showHistory ? "−" : "+"}</span>
          </button>

          {showHistory && (
            <div className="mt-4 space-y-3">
              {!entries.length && (
                <p className="text-xs text-slate-500">
                  No entries yet.
                </p>
              )}

              {entries.map(item => (
                <div
                  key={item.id}
                  className="rounded-lg bg-white/5 p-3 text-xs"
                >
                  <div className="flex justify-between gap-3">
                    <strong>
                      Session #{item.sessionId}
                    </strong>

                    <span>{item.status}</span>
                  </div>

                  <p className="mt-2 text-slate-400">
                    Stake: {coins(item.stake)} · Level:{" "}
                    {item.completedLevel}
                  </p>

                  <p className="mt-1 text-amber-200">
                    Returned: {coins(item.payout)}
                  </p>

                  {!!item.choices?.length && (
                    <p className="mt-2 leading-5 text-slate-400">
                      {item.choices
                        .map(
                          pick =>
                            `L${pick.level}: Case ${pick.caseNumber} ${
                              pick.won === true
                                ? "✓"
                                : pick.won === false
                                  ? "✕"
                                  : "pending"
                            }`,
                        )
                        .join(" · ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <details className="rounded-xl border border-white/10 p-4 text-xs leading-6 text-slate-300">
          <summary className="cursor-pointer font-black text-amber-200">
            HOW TO PLAY & PAYOUTS
          </summary>

          <p className="mt-3">
            This is an admin-selected demo. The
            controller selects all winning cases before
            betting starts. The complete session plan is
            locked before players can place bets.
          </p>

          <p className="mt-3">
            Join at Level 1, choose one of nine cases,
            and confirm your stake. Winning cases are
            revealed together after the betting window.
          </p>

          <p className="mt-3">
            After a win, collect or select a case for the
            next level. Continuing does not deduct another
            stake. A losing case ends your entry without
            a return.
          </p>

          <p className="mt-3">
            Returns below include the original stake and
            are calculated from that original stake.
            They are not added together. For example,
            100 coins at Level 2 returns 200 coins.
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-amber-200">
                <tr>
                  <th className="p-2">Level</th>
                  <th className="p-2">Winning cases</th>
                  <th className="p-2">Total return</th>
                </tr>
              </thead>

              <tbody>
                {LEVELS.map(
                  ([number, winners, multiplier]) => (
                    <tr
                      key={number}
                      className="border-t border-white/10"
                    >
                      <td className="p-2">{number}</td>

                      <td className="p-2">
                        {winners} of 9
                      </td>

                      <td className="p-2">
                        {multiplier}×
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-4">
            Banker offers appear after Levels 3 and 6.
            DEAL collects the offered amount. To decline,
            continue with a case for the next level.
            Offers expire when ten seconds remain in
            that next betting window.
          </p>

          <p className="mt-3">
            If you win and do not confirm a next-level
            case before its betting closes, the server
            automatically collects your current return.
            A Level 9 win automatically collects 800×.
          </p>

          <p className="mt-3">
            Each level has 30 seconds for selection and
            5 seconds for the reveal. Only confirmed
            entries participate. Initial bets can be
            cancelled before Level 1 betting closes.
          </p>
        </details>

        {session?.commitment && (
          <details className="rounded-xl border border-white/10 p-4 text-[10px] leading-5 text-slate-400">
            <summary className="cursor-pointer font-bold text-slate-200">
              LOCKED SESSION RECORD
            </summary>

            <p className="mt-3 break-all">
              Commitment: {session.commitment}
            </p>

            {session.seed && (
              <p className="mt-3 break-all">
                Seed: {session.seed}
              </p>
            )}

            {session.plan && (
              <p className="mt-3 break-all">
                Published plan:{" "}
                {JSON.stringify(session.plan)}
              </p>
            )}

            {session.offers && (
              <p className="mt-3 break-all">
                Offer percentages:{" "}
                {JSON.stringify(session.offers)}
              </p>
            )}
          </details>
        )}
      </div>
    </main>
  );
}
