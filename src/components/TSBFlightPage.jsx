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
        `${round.id}:` +
        `${Math.round(round.crashMultiplier * 100)}:` +
        `${round.seed}`;

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
          className="shrink-0 rounded-lg border border-cyan-400/30 px-3 py-2 text-sm text-cyan-200"
        >
          ← Home
        </button>

        <div className="min-w-0 flex-1 text-center">
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
          Demo coins only · Controller fixes the crash before betting opens.
          Closing the page does not cash out; the server must accept cash out
          before crash.
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
              Commitment input: round ID : crash multiplier × 100 : seed. This
              verifies the locked result; this test mode is admin-selected, not
              random.
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

  // The queue lives across round changes while this page stays open.
  // It is consumed once, never converted into repeating automatic bets.
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
      setMessage("This box already
