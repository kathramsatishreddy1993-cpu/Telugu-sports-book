import React, { useEffect, useRef, useState } from "react";
import CricketScene from "./CricketStadium3D";

export {
  default as AnimatedSuperOverLobby,
} from "./CricketMatchList";

const API = "/api/animated-cricket";

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

const ist = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
};

const remaining = (milliseconds) => {
  const seconds = Number.isFinite(milliseconds)
    ? Math.max(0, Math.ceil(milliseconds / 1000))
    : 0;

  return (
    `${String(Math.floor(seconds / 60)).padStart(2, "0")}:` +
    String(seconds % 60).padStart(2, "0")
  );
};

function AmountBox({ label, value }) {
  return (
    <div className="so-money-box">
      {label && <span className="so-money-label">{label}</span>}
      <strong>{money(value)}</strong>
    </div>
  );
}

async function api(path, body) {
  const response = await fetch(API + path, {
    credentials: "same-origin",
    cache: "no-store",
    ...(body
      ? {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      : {}),
  });

  const data = await response.json();

  if (!response.ok) {
    throw Object.assign(
      new Error(data.error || "Unable to connect."),
      { status: response.status }
    );
  }

  return data;
}

export default function AnimatedSuperOverPage({
  onBack = () => window.location.assign("/"),
}) {
  const [data, setData] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState("");

  const [amount, setAmount] = useState(100);
  const [selection, setSelection] = useState(null);
  const [busy, setBusy] = useState(false);

  const [pending, setPending] = useState(null);
  const [message, setMessage] = useState("");
  const [betError, setBetError] = useState("");

  const anchor = useRef({
    server: Date.now(),
    local: performance.now(),
  });

  const received = useRef(0);
  const refresh = useRef(() => {});
  const lastBalance = useRef(null);
  const inFlight = useRef(false);
  const mounted = useRef(false);

  useEffect(() => {
    let alive = true;
    let loading = false;
    mounted.current = true;

    async function load() {
      if (loading) return;
      loading = true;

      try {
        const selectedStart = new URLSearchParams(
          window.location.search
        ).get("start");

        const value = await api(
          selectedStart === null
            ? "/state"
            : `/state?start=${encodeURIComponent(selectedStart)}`
        );

        if (alive) {
          anchor.current = {
            server: new Date(value.serverTime).getTime(),
            local: performance.now(),
          };

          received.current = performance.now();
          setData(value);
          setError("");
        }
      } catch (failure) {
        if (alive) setError(failure.message);
      } finally {
        loading = false;
      }
    }

    refresh.current = load;
    void load();

    const poll = setInterval(load, 750);

    const timer = setInterval(
      () =>
        setNow(
          anchor.current.server +
            performance.now() -
            anchor.current.local
        ),
      100
    );

    return () => {
      alive = false;
      mounted.current = false;
      clearInterval(poll);
      clearInterval(timer);
    };
  }, []);

  const match = data?.match;

  const fresh = Boolean(
    data &&
      received.current > 0 &&
      performance.now() - received.current < 2500 &&
      !error
  );

  const open = Boolean(
    match?.phase === "BETTING" &&
      now < new Date(match.closesAt).getTime() &&
      fresh
  );

  const canConfirm = Boolean(
    open &&
      selection &&
      selection.matchId === match.id &&
      selection.windowId === match.windowId &&
      selection.quoteVersion === match.quoteVersion &&
      selection.points ===
        match.rates?.[selection.team]?.[
          selection.direction.toLowerCase()
        ]
  );

  const validAmount =
    Number.isSafeInteger(amount) &&
    amount >= 100 &&
    amount <= 25000;

  const balanceAvailable =
    data?.balance !== null &&
    data?.balance !== undefined &&
    Number.isFinite(Number(data.balance));

  const bets = Array.isArray(data?.bets) ? data.bets : [];

  useEffect(() => {
    if (
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
      window.dispatchEvent(new Event("demo-balance-updated"));
    }
  }, [data?.balance]);

  async function send(payload) {
    if (inFlight.current || !payload) return;

    inFlight.current = true;
    setBusy(true);
    setBetError("");
    setMessage("");

    try {
      await api("/bets", payload);

      window.dispatchEvent(new Event("demo-balance-updated"));

      if (mounted.current) {
        setPending(null);
        setSelection(null);
        setMessage("Demo bet accepted.");
        void refresh.current();
      }
    } catch (failure) {
      if (mounted.current) {
        setBetError(failure.message);

        if (!failure.status || failure.status >= 500) {
          setPending(payload);
        } else {
          setPending(null);
        }
      }
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  function confirm() {
    if (
      !canConfirm ||
      busy ||
      pending ||
      !validAmount
    ) {
      return;
    }

    void send({
      ...selection,
      amount,
      requestKey:
        globalThis.crypto?.randomUUID?.() ||
        `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    });
  }

  return (
    <main className="so-page">
      <style>{`
        .so-page {
          --so-green:#166534;
          --so-wine:#722f37;
          --so-white:#ffffff;
          min-height:100vh;
          background:#080d16;
          color:#fff;
          font-family:Inter,Arial,sans-serif;
          padding-bottom:30px;
        }

        .so-page * { box-sizing:border-box; }
        .so-wrap { max-width:880px; margin:auto; }
        .so-page button,.so-page input { font:inherit; }
        .so-page button { cursor:pointer; }
        .so-page button:disabled {
          cursor:not-allowed;
          opacity:.5;
        }
        .so-page :focus-visible {
          outline:3px solid var(--so-wine);
          outline-offset:3px;
        }

        .so-header {
          display:flex;
          flex-wrap:wrap;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          padding:16px;
          background:var(--so-green);
          border-bottom:3px solid var(--so-wine);
        }
        .so-brand {
          flex:1;
          min-width:0;
          text-align:center;
          font-size:14px;
          font-weight:900;
          color:var(--so-white);
        }
        .so-brand small {
          display:block;
          margin-top:5px;
          font-size:10px;
        }

        .so-wallet {
          max-width:100%;
          border:2px solid var(--so-green);
          border-radius:12px;
          padding:10px 12px;
          background:var(--so-white);
          color:var(--so-green);
          text-align:center;
        }
        .so-wallet-title {
          display:block;
          font-size:9px;
          font-weight:900;
          letter-spacing:.5px;
        }
        .so-wallet-value {
          display:flex;
          align-items:center;
          justify-content:center;
          gap:8px;
          margin-top:6px;
        }
        .so-wallet-symbol {
          display:grid;
          place-items:center;
          flex-shrink:0;
          width:32px;
          height:32px;
          background:var(--so-green);
          color:var(--so-white);
          border-radius:8px;
          font-size:23px;
          font-weight:900;
        }
        .so-wallet-number {
          font-size:20px;
          font-weight:900;
          overflow-wrap:anywhere;
          font-variant-numeric:tabular-nums;
        }
        .so-wallet small {
          display:block;
          margin-top:5px;
          color:var(--so-wine);
          font-size:9px;
          font-weight:bold;
        }

        .so-money-grid {
          display:grid;
          grid-template-columns:repeat(2,minmax(0,1fr));
          gap:10px;
          margin-top:12px;
        }
        .so-money-box {
          display:inline-flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          gap:5px;
          max-width:100%;
          background:var(--so-white);
          color:var(--so-green);
          border:1px solid var(--so-green);
          border-radius:10px;
          padding:10px 12px;
          font-variant-numeric:tabular-nums;
        }
        .so-money-label {
          color:var(--so-wine);
          font-size:10px;
          font-weight:bold;
          text-align:center;
        }
        .so-money-box strong {
          color:var(--so-green);
          font-size:18px;
          overflow-wrap:anywhere;
        }

        .so-page .so-row {
          display:grid;
          grid-template-columns:minmax(0,1fr) 88px 88px;
          border-bottom:1px solid var(--so-green);
        }
        .so-cell {
          padding:14px 10px;
          background:var(--so-white);
          color:var(--so-green);
          font-size:14px;
          font-weight:800;
        }
        .so-back {
          background:var(--so-green);
          color:var(--so-white);
        }
        .so-lay {
          background:var(--so-wine);
          color:var(--so-white);
        }
        .so-market {
          border:0;
          border-left:1px solid var(--so-white);
          font-weight:900;
          font-size:22px;
        }
        .so-strip {
          padding:12px 16px;
          background:var(--so-green);
          color:var(--so-white);
          font-weight:900;
        }
        .so-pill {
          display:inline-flex;
          align-items:center;
          justify-content:center;
          min-width:30px;
          height:30px;
          background:var(--so-green);
          color:var(--so-white);
          border-radius:50%;
          margin:4px;
          font-weight:bold;
        }
        .so-panel {
          padding:16px;
          background:var(--so-white);
          color:var(--so-green);
          border-bottom:1px solid var(--so-green);
        }
        .so-panel p { line-height:1.7; }
        .so-button {
          padding:12px 20px;
          border:0;
          background:var(--so-green);
          color:var(--so-white);
          border-radius:8px;
          font-weight:900;
        }
        .so-button-wine {
          background:var(--so-wine);
          color:var(--so-white);
        }
        .so-stake-box {
          display:flex;
          align-items:center;
          max-width:300px;
          overflow:hidden;
          border:2px solid var(--so-green);
          border-radius:10px;
          background:var(--so-white);
        }
        .so-stake-symbol {
          display:grid;
          place-items:center;
          align-self:stretch;
          padding:0 14px;
          font-size:24px;
          font-weight:900;
          background:var(--so-green);
          color:var(--so-white);
        }
        .so-page .so-stake-input {
          min-width:0;
          width:100%;
          max-width:100%;
          padding:12px;
          border:0;
          border-radius:0;
          background:var(--so-white);
          color:var(--so-green);
          font-size:20px;
          font-weight:900;
        }
        .so-bet-record {
          border:1px solid var(--so-green);
          border-radius:12px;
          padding:12px;
          margin-top:12px;
          font-size:12px;
          line-height:1.7;
        }
        .so-bet-status {
          display:inline-block;
          margin-top:8px;
          border:1px solid var(--so-wine);
          border-radius:6px;
          padding:4px 8px;
          color:var(--so-wine);
          font-size:10px;
          font-weight:900;
        }

        .so-ball { animation:soBall 10s linear both; }
        .so-ball.so-four { animation-name:soFour; }
        .so-ball.so-six { animation-name:soSix; }
        .so-bat {
          transform-origin:10px 6px;
          animation:soBat 10s ease both;
        }
        .so-bowler { animation:soBowler 10s ease both; }

        @keyframes soBall {
          0% { transform:translate(0,0); }
          12% { transform:translate(22px,-75px); }
          22%,100% {
            transform:translate(30px,-80px);
            opacity:0;
          }
        }
        @keyframes soFour {
          0% { transform:translate(0,0); }
          12% { transform:translate(22px,-75px); }
          40%,100% {
            transform:translate(330px,-50px);
            opacity:0;
          }
        }
        @keyframes soSix {
          0% { transform:translate(0,0); }
          12% { transform:translate(22px,-75px); }
          30% { transform:translate(130px,-260px); }
          45%,100% {
            transform:translate(290px,-180px);
            opacity:0;
          }
        }
        @keyframes soBat {
          0%,10% { transform:rotate(0); }
          18% { transform:rotate(-110deg); }
          30%,100% { transform:rotate(0); }
        }
        @keyframes soBowler {
          0% { transform:translateY(18px); }
          12%,100% { transform:translateY(0); }
        }

        @media(max-width:430px) {
          .so-page .so-row {
            grid-template-columns:minmax(0,1fr) 76px 76px;
          }
          .so-cell { font-size:12px; padding:12px 8px; }
          .so-header { padding:12px; gap:8px; }
          .so-brand { font-size:12px; }
          .so-wallet { padding:8px; }
          .so-wallet-number { font-size:17px; }
        }
      `}</style>

      <div className="so-wrap">
        <header className="so-header">
          <button
            type="button"
            className="so-button so-button-wine"
            onClick={onBack}
          >
            ← HOME
          </button>

          <div className="so-brand">
            TELUGU SPORTS BOOK
            <small>VIRTUAL SUPER OVER</small>
          </div>

          <div
            className="so-wallet"
            aria-live="polite"
            aria-label="Demo wallet balance"
          >
            <span className="so-wallet-title">WALLET BALANCE</span>

            <div className="so-wallet-value">
              <span className="so-wallet-symbol" aria-hidden="true">
                ₹
              </span>

              <strong className="so-wallet-number">
                {balanceAvailable
                  ? Number(data.balance).toLocaleString("en-IN", {
                      maximumFractionDigits: 2,
                    })
                  : data || error
                    ? "—"
                    : "Loading…"}
              </strong>
            </div>

            <small>DEMO COINS</small>

            {balanceAvailable && !fresh && (
              <small>LAST RECEIVED BALANCE</small>
            )}
          </div>
        </header>

        <div
          className="so-panel"
          style={{
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            fontSize: 12,
            gap: 8,
          }}
        >
          <span>{ist(now)} IST</span>
          <span>VIRTUAL DEMO COINS ONLY</span>
        </div>

        {!match ? (
          <div className="so-panel">
            {error || data?.message || "Connecting to match server…"}
          </div>
        ) : (
          <>
            <div className="so-strip">
              {match.teams.join(" vs ")}

              <div style={{ fontSize: 11, marginTop: 6 }}>
                START: {ist(match.startAt)} IST ·
                Admin-controlled virtual demo
              </div>
            </div>

            <CricketScene match={match} now={now} />

            <section
              className="so-panel"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              {match.teams.map((team, index) => (
                <div key={team}>
                  <strong
                    style={{
                      color: index === 0 ? "#166534" : "#722f37",
                    }}
                  >
                    {team}
                  </strong>

                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 900,
                      margin: "6px 0",
                    }}
                  >
                    {match.scores[index].runs}/
                    {match.scores[index].wickets}{" "}
                    <small style={{ fontSize: 13 }}>
                      ({match.scores[index].overs})
                    </small>
                  </div>

                  <div>
                    {match.scores[index].balls.map((ball, ballIndex) => (
                      <span
                        key={ballIndex}
                        className="so-pill"
                        style={{
                          background:
                            ball === "W" ? "#722f37" : "#166534",
                        }}
                      >
                        {ball}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </section>

            <div
              className="so-panel"
              style={{
                textAlign: "center",
                color: open ? "#166534" : "#722f37",
                fontWeight: 900,
              }}
            >
              {match.phase === "RESULT"
                ? match.result.winner === "TIE"
                  ? "TIE · ALL RESERVED COINS REFUNDED"
                  : `${match.teams[match.result.winner]} WON`
                : open
                  ? `BETTING OPEN · ${remaining(
                      new Date(match.closesAt).getTime() - now
                    )}`
                  : match.phase === "WAITING"
                    ? `NEXT START · ${remaining(
                        new Date(match.startAt).getTime() - now
                      )}`
                    : match.phase === "SUSPENDED"
                      ? "MARKET CLOSED · 0 / 0"
                      : "BETTING LOCKED · BALL IN PLAY"}

              {match.lockReason && match.phase !== "RESULT" && (
                <div style={{ marginTop: 8, fontSize: 12 }}>
                  {match.lockReason}
                </div>
              )}

              {!fresh && (
                <div style={{ marginTop: 8, fontSize: 12 }}>
                  Connection unavailable. Betting actions paused.
                </div>
              )}

              {match.phase === "RESULT" && (
                <div style={{ marginTop: 8, fontSize: 12 }}>
                  NEXT MATCH: {ist(match.nextAt)} IST ·{" "}
                  {remaining(new Date(match.nextAt).getTime() - now)}
                </div>
              )}
            </div>

            <div className="so-strip">
              MATCH WINNER · DEMO COINS ONLY
            </div>

            <div className="so-row">
              <div className="so-cell">
                Min: ₹100 · Max: ₹25,000
              </div>
              <div className="so-cell so-back">BACK</div>
              <div className="so-cell so-lay">LAY</div>
            </div>

            {match.teams.map((team, index) => (
              <div className="so-row" key={team}>
                <div className="so-cell">{team}</div>

                {["BACK", "LAY"].map((direction) => (
                  <button
                    key={direction}
                    type="button"
                    className={`so-market ${
                      direction === "BACK" ? "so-back" : "so-lay"
                    }`}
                    disabled={!open || busy || Boolean(pending)}
                    onClick={() => {
                      setSelection({
                        matchId: match.id,
                        windowId: match.windowId,
                        quoteVersion: match.quoteVersion,
                        team: index,
                        direction,
                        points:
                          match.rates[index][direction.toLowerCase()],
                      });

                      setMessage("");
                      setBetError("");
                    }}
                  >
                    {match.rates[index][direction.toLowerCase()]}

                    <small style={{ display: "block", fontSize: 10 }}>
                      POINTS
                    </small>
                  </button>
                ))}
              </div>
            ))}

            <section className="so-panel">
              <label
                htmlFor="so-stake"
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 900,
                  marginBottom: 8,
                }}
              >
                STAKE · WHOLE DEMO UNITS
              </label>

              <div className="so-stake-box">
                <span className="so-stake-symbol" aria-hidden="true">
                  ₹
                </span>

                <input
                  id="so-stake"
                  className="so-stake-input"
                  type="number"
                  inputMode="numeric"
                  min="100"
                  max="25000"
                  step="1"
                  value={amount}
                  disabled={busy || Boolean(pending)}
                  onChange={(event) =>
                    setAmount(Number(event.target.value))
                  }
                />
              </div>

              {selection && (
                <p>
                  {match.teams[selection.team]} ·{" "}
                  {selection.direction} · {selection.points} points
                  <br />
                  <small>
                    {canConfirm
                      ? "Review and confirm your demo bet."
                      : "Window or rate changed. Select the current rate again."}
                  </small>
                </p>
              )}

              <div style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="so-button"
                  disabled={
                    !canConfirm ||
                    busy ||
                    Boolean(pending) ||
                    !validAmount
                  }
                  onClick={confirm}
                >
                  {busy ? "SENDING…" : "CONFIRM DEMO BET"}
                </button>
              </div>

              {pending && (
                <div style={{ color: "#722f37", marginTop: 12 }}>
                  <p>
                    Connection interrupted. Retry the same request
                    to check acceptance.
                  </p>

                  <button
                    type="button"
                    className="so-button so-button-wine"
                    disabled={busy}
                    onClick={() => void send(pending)}
                  >
                    CHECK / RETRY SAME BET
                  </button>
                </div>
              )}

              {message && (
                <p role="status" style={{ color: "#166534" }}>
                  {message}
                </p>
              )}

              <p style={{ fontSize: 11, color: "#722f37" }}>
                ₹ is the display symbol for virtual demo balance.
              </p>
            </section>

            <section className="so-panel">
              <strong>MY DEMO BETS</strong>

              {bets.length === 0 ? (
                <p>No bets yet.</p>
              ) : (
                bets.slice(0, 20).map((bet) => (
                  <div key={bet.id} className="so-bet-record">
                    <div>
                      Match #{bet.match_id} · Team{" "}
                      {Number(bet.team) + 1} · {bet.direction} ·{" "}
                      {bet.points} points
                    </div>

                    <span className="so-bet-status">
                      {bet.status}
                    </span>

                    <div className="so-money-grid">
                      <AmountBox label="STAKE" value={bet.amount} />
                      <AmountBox label="RESERVED" value={bet.hold} />
                    </div>

                    {bet.status === "SETTLED" && (
                      <div style={{ marginTop: 10 }}>
                        <AmountBox label="RETURNED" value={bet.payout} />
                      </div>
                    )}
                  </div>
                ))
              )}
            </section>

            <details className="so-panel">
              <summary>RULES &amp; RESULT VERIFICATION</summary>

              <p>
                Admin-controlled virtual demo. The Admin prepares
                ball outcomes and manually changes match rates.
                Results are not random in this mode. A ball result
                freezes when its betting window opens; an unopened
                future ball may be changed by Admin. Previously
                accepted bets retain their accepted rate.
              </p>

              <p>
                Two innings, at most six balls and two wickets each.
                A successful chase stops the match. A tie refunds
                reserved coins. Maximum match time is two minutes.
                Each ball has eight seconds of betting and two
                seconds locked for the result animation. A prepared
                match releases five minutes before its quarter-hour
                start. Unprepared matches do not open for betting.
              </p>

              <p>
                Initial Back points are 95 on each team; initial Lay
                points are 105. Admin may change both quotes.
                Rates are profit points per 100 stake. Back reserves
                stake and returns stake plus profit on a win; Lay
                reserves rounded-up liability and returns that
                liability plus stake on a win. No cancellation
                after confirmation.
              </p>

              <p>
                If a team can no longer win, including level scores
                during the chase where only a chasing-team win or
                tie remains, all new betting closes automatically
                at 0 / 0. This does not decide the final ball; the
                actual win or tie still settles from the played results.
              </p>

              <p>
                Each committed ball has a SHA-256 hash.
                Its value and seed are revealed only when the result
                is due. Verify canonicalOutcome(
                {"{matchId, seq, team, teamBall, value}"})
                + &apos;:&apos; + seed, sorting object keys
                recursively. Admin changes are recorded in the audit log.
              </p>

              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                  fontSize: 11,
                }}
              >
                {JSON.stringify(match.verification)}
              </pre>
            </details>
          </>
        )}

        {(error || betError) && (
          <div
            role="alert"
            className="so-panel"
            style={{ color: "#722f37" }}
          >
            {error || betError}
          </div>
        )}

        <footer
          style={{
            padding: 16,
            fontSize: 11,
            lineHeight: 1.7,
            color: "#ffffff",
          }}
        >
          Unofficial virtual demo using IPL team abbreviations.
          No real-money play. Admin-controlled 3D virtual cricket.
        </footer>
      </div>
    </main>
  );
}
