import React, { useEffect, useRef, useState } from "react";

import {
  flightApi,
  flightRequestKey,
  notifyFlightWallet,
  useFlightState,
} from "./flightClient";

import { ACTIVE_GAMES } from "./GameArtwork";

const symbols = {
  S: "♠",
  H: "♥",
  C: "♣",
  D: "♦",
};

const ranks = [
  "?", "A", "2", "3", "4", "5", "6",
  "7", "8", "9", "10", "J", "Q", "K",
];

const coins = value =>
  Number(value || 0).toLocaleString("en-IN");

function PlayingCard({ card, label }) {
  const red = card?.suit === "H" || card?.suit === "D";

  return (
    <div className="text-center">
      <p className="mb-2 text-[10px] font-black tracking-wider text-amber-200">
        {label}
      </p>

      <div
        aria-label={
          card
            ? `${ranks[card.rank]} ${symbols[card.suit]}`
            : "Face-down card"
        }
        className={`relative mx-auto flex h-32 w-24 flex-col items-center justify-center rounded-xl border-2 border-amber-300/60 shadow-xl ${
          card ? "bg-[#fff8df]" : "bg-[#15212e]"
        }`}
        style={{
          color: red ? "#c82d42" : "#17212d",
          backgroundImage: card
            ? "none"
            : "repeating-linear-gradient(45deg,transparent,transparent 5px,#ffffff06 5px,#ffffff06 7px)",
        }}
      >
        {card ? (
          <>
            <span className="absolute left-2 top-1 text-xl font-black">
              {ranks[card.rank]}
            </span>

            <span className="text-5xl">
              {symbols[card.suit]}
            </span>

            <span className="absolute bottom-1 right-2 rotate-180 text-xl font-black">
              {ranks[card.rank]}
            </span>
          </>
        ) : (
          <span className="text-3xl font-black text-amber-200/50">
            TSB
          </span>
        )}
      </div>
    </div>
  );
}

function score(events, team) {
  const balls = events
    .filter(event => event.team === team)
    .map(event => event.value);

  return {
    balls,
    runs: balls.reduce(
      (total, value) => total + (value === "W" ? 0 : value),
      0,
    ),
    wickets: balls.filter(value => value === "W").length,
  };
}

function GameStage({ game, round }) {
  const events = round?.events || [];

  if (game === "super-over") {
    const rcb = score(events, "RCB");
    const csk = score(events, "CSK");
    const team = csk.balls.length ? "CSK" : "RCB";
    const active = team === "RCB" ? rcb : csk;

    return (
      <div className="min-h-[270px] rounded-2xl border border-white/10 bg-black p-4">
        <div className="space-y-3 border-b border-white/10 pb-4">
          {[
            ["RCB", rcb],
            ["CHENNAI", csk],
          ].map(([name, innings]) => (
            <div
              key={name}
              className="flex items-center justify-between"
            >
              <strong className="text-amber-200">
                {name}
              </strong>

              <span className="text-xl font-black">
                {innings.runs}–{innings.wickets}{" "}
                <small className="text-xs font-normal text-slate-400">
                  (
                  {innings.balls.length === 6
                    ? "1.0"
                    : `0.${innings.balls.length}`}
                  )
                </small>
              </span>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-slate-500">
          {team === "RCB" ? "RCB" : "CHENNAI"} · BALLS
        </p>

        <div className="mt-3 flex gap-2">
          {Array.from({ length: 6 }, (_, index) => (
            <span
              key={index}
              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-black ${
                active.balls[index] === "W"
                  ? "bg-red-600"
                  : active.balls[index] >= 4
                    ? "bg-emerald-600"
                    : "bg-slate-800"
              }`}
            >
              {active.balls[index] ?? "·"}
            </span>
          ))}
        </div>

        <div className="mt-3 flex gap-2 text-xs text-slate-400">
          {active.balls.map((value, index) => (
            <span key={index}>
              {value === "W" ? "K · WICKET" : value}
              {index < active.balls.length - 1 ? " /" : ""}
            </span>
          ))}
        </div>

        {round?.result && (
          <p className="mt-6 text-lg font-black text-amber-200">
            {round.result.winner === "TIE"
              ? "TIE · STAKES RETURNED"
              : `${
                  round.result.winner === "CSK"
                    ? "CHENNAI"
                    : "RCB"
                } WON`}
          </p>
        )}
      </div>
    );
  }

  const find = side =>
    events.filter(event => event.side === side).at(-1)?.card;

  if (game === "dragon-tiger") {
    return (
      <div className="flex min-h-[270px] items-center justify-evenly rounded-2xl border border-white/10 bg-black p-5">
        <PlayingCard label="DRAGON" card={find("DRAGON")} />

        <span className="font-black text-amber-300/40">
          VS
        </span>

        <PlayingCard label="TIGER" card={find("TIGER")} />
      </div>
    );
  }

  if (game === "lucky-seven") {
    return (
      <div className="flex min-h-[270px] items-center justify-center gap-6 rounded-2xl border border-white/10 bg-black p-5">
        <span className="text-xs font-black text-slate-500">
          A–6
          <br />
          LOW
        </span>

        <PlayingCard label="LUCKY SEVEN" card={find("CARD")} />

        <span className="text-xs font-black text-slate-500">
          8–K
          <br />
          HIGH
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black p-4">
      <PlayingCard label="REFERENCE CARD" card={find("JOKER")} />

      <div className="mt-5 flex justify-evenly gap-4">
        <PlayingCard label="A · ANDAR" card={find("A")} />
        <PlayingCard label="B · BAHAR" card={find("B")} />
      </div>

      <p className="mt-4 text-center text-xs text-slate-400">
        Cards dealt:{" "}
        {events.filter(event => event.side !== "JOKER").length}
      </p>
    </div>
  );
}

const rules = {
  "super-over":
    "RCB bats first. Each team has up to six balls or two wickets. Chennai stops when it passes RCB. A=1, 2=2, 3=3, 4=4, 6=6, 10=0, K=wicket. Five cards of each value are shuffled each round. Equal totals void both main markets; stakes return. Betting: 30s. Both innings: 15s. Back odds: 1.98. Lay odds: 1.98; the reserved liability is stake × 0.98.",

  "dragon-tiger":
    "One fresh shuffled 52-card deck per round. A=1 through K=13. Higher rank wins. Equal ranks use ♠ > ♥ > ♣ > ♦. Dragon/Tiger each use their own card for side markets. Back/Lay: 1.98. Side-market returns are shown on each market. Betting: 30s; reveal: 6s.",

  "lucky-seven":
    "An eight-deck shoe contains 416 cards and is shuffled when empty. A–6=Low; 8–K=High. On 7, Low/High return half their stake. Odd includes A,3,5,7,9,J,K; Even includes 2,4,6,8,10,Q. Payout multipliers include the stake. Betting: 30s; reveal: 5s.",

  "andar-bahar":
    "One shuffled 52-card deck per round. The reference card is revealed only after the first 30s betting window. Red reference starts Andar; black starts Bahar. Cards alternate until a rank matches the reference. If the first card does not match, Second Bet opens for 5s; only Second Bet markets can then be used. First Bet returns 1.5× if a match occurs within the first two cards, otherwise 2×. Second Bet returns 2×. SA/SB win only on a first-card match (15×). Odd/Even and suit refer to the matching card. Card-count bets exclude the reference. First 3 uses reference plus first card on each side: straight flush 121×, straight 9×, flush 6×, otherwise loses; fewer than three total cards refunds. A23 and QKA are straights.",
};

export default function CardGamesPage({
  game,
  onBack = () => window.location.assign("/"),
}) {
  const {
    data,
    error,
    unauthorized,
    receivedAt,
    refresh,
  } = useFlightState(`/api/card-games/${game}/state`);

  const [clock, setClock] = useState(Date.now());
  const [amount, setAmount] = useState("100");
  const [selection, setSelection] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null);
  const [message, setMessage] = useState("");

  const inFlight = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 100);
    return () => clearInterval(timer);
  }, []);

  const round = data?.round;

  const now = data
    ? new Date(data.serverTime).getTime() +
      (data.paused ? 0 : Math.max(0, clock - receivedAt))
    : clock;

  const fresh = Boolean(
    data && !error && clock - receivedAt < 3500,
  );

  const remaining = Math.max(
    0,
    Math.ceil(
      (
        new Date(round?.bettingClosesAt).getTime() - now
      ) / 1000,
    ),
  );

  const open =
    fresh &&
    !data?.paused &&
    round?.phase === "BETTING" &&
    remaining > 0;

  const markets = data?.markets || [];

  const currentBets =
    data?.bets?.filter(
      bet =>
        String(bet.round_id) === round?.id &&
        bet.status !== "CANCELLED",
    ) || [];

  const held = currentBets.reduce(
    (total, bet) => total + bet.hold,
    0,
  );

  const title =
    ACTIVE_GAMES.find(item => item.id === game)?.name ||
    "TSB GAME";

  useEffect(() => {
    setSelection(null);
    setMessage("");
  }, [round?.id, round?.stage]);

  const submit = async (retry = false) => {
    if (inFlight.current) return;

    const stake = Number(amount);

    if (!retry && (!open || !selection)) {
      setMessage("Choose a market during its betting window.");
      return;
    }

    if (
      !retry &&
      (
        !Number.isSafeInteger(stake) ||
        stake < 100 ||
        stake > 25000
      )
    ) {
      setMessage("Enter 100–25,000 whole demo coins.");
      return;
    }

    const payload = retry
      ? pending
      : {
          roundId: round.id,
          market: selection.key,
          direction: selection.direction,
          amount: stake,
          requestKey: flightRequestKey(),
        };

    if (!payload) return;

    inFlight.current = true;
    setBusy(true);
    setMessage("");
    setPending(payload);

    try {
      await flightApi(
        `/api/card-games/${game}/bets`,
        payload,
      );

      setPending(null);
      setSelection(null);
      setMessage("Bet recorded.");

      notifyFlightWallet();
      await refresh();
    } catch (requestError) {
      setMessage(requestError.message);

      if (requestError.status) {
        setPending(null);
        await refresh();
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const cancel = async betId => {
    if (inFlight.current || pending) return;

    inFlight.current = true;
    setBusy(true);

    try {
      await flightApi(
        `/api/card-games/${game}/cancel`,
        { betId },
      );

      setMessage("Bet cancelled.");

      notifyFlightWallet();
      await refresh();
    } catch (requestError) {
           setMessage(requestError.message);
      await refresh();
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#080d16] p-3 text-white">
      <div className="mx-auto max-w-3xl space-y-4">
        <header className="flex items-center justify-between gap-2 rounded-2xl border border-teal-400/20 bg-[#0b3935] p-4">
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-bold"
          >
            ‹ HOME
          </button>

          <h1 className="text-sm font-black text-amber-200">
            {title}
          </h1>

          <span className="text-right text-xs text-slate-300">
            Demo coins
            <strong className="block text-base text-amber-200">
              {coins(data?.balance)}
            </strong>
          </span>
        </header>

        {unauthorized && (
          <button
            onClick={onBack}
            className="w-full rounded-xl bg-amber-300 p-4 font-black text-black"
          >
            RETURN HOME TO LOGIN
          </button>
        )}

        {(message || error) && (
          <p
            role="status"
            className="rounded-xl border border-amber-200/15 bg-amber-200/10 p-3 text-sm text-amber-100"
          >
            {message || error}
          </p>
        )}

        <div
          className={`rounded-xl p-3 text-center text-sm font-black ${
            open
              ? "bg-amber-300 text-black"
              : "bg-slate-800 text-amber-100"
          }`}
        >
          {data?.paused
            ? "PAUSED BY ADMIN"
            : !round
              ? "CONNECTING…"
              : open
                ? `${
                    round.stage === 2
                      ? "SECOND BET"
                      : "BETS CLOSING"
                  } · ${remaining}s`
                : round.phase === "RESULT"
                  ? `RESULT · ${
                      round.result?.winner === "CSK"
                        ? "CHENNAI"
                        : round.result?.winner
                    }`
                  : "BETS LOCKED · REVEALING"}
        </div>

        <div className="flex justify-between text-[10px] text-slate-500">
          <span>ROUND #{round?.id || "—"}</span>
          <span>
            {round?.phase === "RESULT"
              ? "NEXT ROUND STARTS AUTOMATICALLY"
              : "SHARED ROUND"}
          </span>
        </div>

        <GameStage game={game} round={round} />

        <section className="rounded-2xl border border-white/10 bg-[#101a29] p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-amber-200">
              BET AMOUNT
            </h2>
            <span className="text-[10px] text-slate-400">
              100–25,000 demo coins
            </span>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              aria-label="Decrease stake"
              onClick={() =>
                setAmount(
                  String(
                    Math.max(
                      100,
                      (Number(amount) || 100) - 100,
                    ),
                  ),
                )
              }
              className="w-12 rounded-xl bg-black/30 text-xl"
            >
              −
            </button>

            <input
              aria-label="Bet amount"
              inputMode="numeric"
              type="number"
              min="100"
              max="25000"
              step="1"
              value={amount}
              onChange={event => setAmount(event.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 p-3 text-center text-2xl font-black"
            />

            <button
              type="button"
              aria-label="Increase stake"
              onClick={() =>
                setAmount(
                  String(
                    Math.min(
                      25000,
                      (Number(amount) || 0) + 100,
                    ),
                  ),
                )
              }
              className="w-12 rounded-xl bg-black/30 text-xl"
            >
              +
            </button>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2">
            {[100, 500, 1000, 5000].map(value => (
              <button
                key={value}
                onClick={() =>
                  setAmount(
                    String(
                      Math.min(
                        25000,
                        (Number(amount) || 0) + value,
                      ),
                    ),
                  )
                }
                className="rounded-full bg-slate-800 py-2 text-xs font-bold"
              >
                +{coins(value)}
              </button>
            ))}
          </div>

          <p className="mt-3 text-xs text-slate-400">
            Reserved this round: {coins(held)}
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-black">MARKETS</h2>

          <div className="grid grid-cols-2 gap-2">
            {markets.map(market => {
              const enabled =
                open &&
                market.stage === round?.stage &&
                !busy &&
                !pending;

              return (
                <div
                  key={market.key}
                  className="overflow-hidden rounded-xl border border-white/10 bg-[#101a29]"
                >
                  <p className="p-3 text-xs font-bold text-slate-200">
                    {market.label}
                  </p>

                  <div className="flex gap-px">
                    {(market.lay
                      ? ["BACK", "LAY"]
                      : ["BACK"]
                    ).map(direction => (
                      <button
                        key={direction}
                        disabled={!enabled}
                        onClick={() => {
                          setSelection({
                            ...market,
                            direction,
                          });
                          setMessage("");
                        }}
                        className={`min-w-0 flex-1 p-3 text-xs font-black disabled:opacity-35 ${
                          selection?.key === market.key &&
                          selection?.direction === direction
                            ? "ring-2 ring-inset ring-amber-300"
                            : ""
                        } ${
                          direction === "LAY"
                            ? "bg-pink-300 text-[#25101c]"
                            : "bg-cyan-300 text-[#071c28]"
                        }`}
                      >
                        {direction} ·{" "}
                        {market.key === "FIRST3"
                          ? "VARIABLE"
                          : `${market.returns.toFixed(2)}×`}

                        {!enabled && (
                          <span className="ml-1">🔒</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {selection && (
          <section className="rounded-xl border border-amber-200/30 bg-[#172324] p-4">
            <p className="font-bold">
              {selection.label} · {selection.direction}
            </p>

            <p className="mt-2 text-xs text-slate-300">
              Stake: {coins(amount)}
              {selection.direction === "LAY"
                ? ` · Reserved liability: ${coins(
                    Math.round(
                      Number(amount) * (selection.returns - 1),
                    ),
                  )}`
                : ""}
            </p>

            <button
              disabled={!open || busy || Boolean(pending)}
              onClick={() => submit()}
              className="mt-3 w-full rounded-xl bg-emerald-400 p-3 font-black text-black disabled:opacity-40"
            >
              {busy ? "SENDING…" : "CONFIRM BET"}
            </button>
          </section>
        )}

        {pending && (
          <button
            disabled={busy}
            onClick={() => submit(true)}
            className="w-full rounded-xl bg-amber-300 p-3 font-black text-black"
          >
            RETRY SAME BET REQUEST
          </button>
        )}

        <section className="rounded-xl border border-white/10 p-4">
          <h2 className="font-black">This round</h2>

          {!currentBets.length && (
            <p className="mt-2 text-xs text-slate-500">
              No bets placed.
            </p>
          )}

          {currentBets.map(bet => (
            <div
              key={bet.id}
              className="mt-3 flex items-center justify-between gap-2 border-t border-white/5 pt-3 text-xs"
            >
              <p>
                {markets.find(
                  market => market.key === bet.market,
                )?.label || bet.market}
                {" · "}
                {bet.direction}

                <span className="mt-1 block text-slate-400">
                  {coins(bet.amount)} ·{" "}
                  {bet.status === "SETTLED"
                    ? `Returned ${coins(bet.payout)}`
                    : "PLACED"}
                </span>
              </p>

              {open &&
                bet.stage === round?.stage &&
                bet.status === "PLACED" && (
                  <button
                    disabled={busy || Boolean(pending)}
                    onClick={() => cancel(bet.id)}
                    className="rounded-lg border border-white/20 px-3 py-2"
                  >
                    CANCEL
                  </button>
                )}
            </div>
          ))}
        </section>

        <section className="rounded-xl border border-white/10 p-4">
          <h2 className="text-sm font-black">
            Recent results
          </h2>

          <div className="mt-3 flex flex-wrap gap-2">
            {data?.history?.map(item => (
              <span
                key={item.id}
                className="rounded-lg border border-amber-200/15 bg-amber-200/5 px-3 py-2 text-xs text-amber-100"
              >
                #{item.id} ·{" "}
                {item.winner === "CSK"
                  ? "CHENNAI"
                  : item.winner}
              </span>
            ))}
          </div>
        </section>

        <details className="rounded-xl border border-white/10 p-4 text-xs leading-6 text-slate-400">
          <summary className="font-bold text-slate-200">
            Rules & payouts
          </summary>

          <p className="mt-3">{rules[game]}</p>

          <p className="mt-3">
            All returns include original stake.
            Whole demo coins only; fractional
            returns round down per bet.
            No automatic bets. Amount editing
            stays available for planning.
            Only placed bets reserve coins.
            Results do not depend on bets
            or balances.
          </p>

          <p className="mt-3 break-all">
            Commitment SHA-256(game:canonical
            JSON outcome:seed; sort object keys
            recursively): {round?.commitment}
          </p>

          {round?.seed && (
            <>
              <p className="break-all">
                Seed: {round.seed}
              </p>
              <p className="break-all">
                Outcome: {JSON.stringify(round.result)}
              </p>
            </>
          )}
        </details>
      </div>
    </main>
  );
}
