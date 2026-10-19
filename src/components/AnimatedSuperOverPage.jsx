import React, { useEffect, useRef, useState } from "react";
import CricketScene from "./CricketStadium3D";

export {
  default as AnimatedSuperOverLobby,
} from "./CricketMatchList";

const API = "/api/animated-cricket";

const ist = (value) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));

const remaining = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));

  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(
    s % 60,
  ).padStart(2, "0")}`;
};

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
      {
        status: response.status,
      },
    );
  }

  return data;
}

export default function AnimatedSuperOverPage({
  onBack = () => window.location.assign("/"),
}) {
  const [data, setData] = useState(null),
    [now, setNow] = useState(Date.now()),
    [error, setError] = useState("");

  const [amount, setAmount] = useState(100),
    [selection, setSelection] = useState(null),
    [busy, setBusy] = useState(false);

  const [pending, setPending] = useState(null),
    [message, setMessage] = useState("");

  const [betError, setBetError] = useState("");

  const anchor = useRef({
    server: Date.now(),
    local: performance.now(),
  });

  const received = useRef(0),
    refresh = useRef(() => {});

  useEffect(() => {
    let alive = true,
      loading = false;

    async function load() {
      if (loading) return;

      loading = true;

      try {
        const selectedStart = new URLSearchParams(
          window.location.search,
        ).get("start");

        const value = await api(
          selectedStart === null
            ? "/state"
            : `/state?start=${encodeURIComponent(selectedStart)}`,
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
      } catch (e) {
        if (alive) setError(e.message);
      } finally {
        loading = false;
      }
    }

    refresh.current = load;
    load();

    const poll = setInterval(load, 750);

    const timer = setInterval(
      () =>
        setNow(
          anchor.current.server +
            performance.now() -
            anchor.current.local,
        ),
      100,
    );

    return () => {
      alive = false;
      clearInterval(poll);
      clearInterval(timer);
    };
  }, []);

  const match = data?.match;

  const open =
    match?.phase === "BETTING" &&
    now < new Date(match.closesAt).getTime() &&
    performance.now() - received.current < 2500 &&
    !error;

  const canConfirm =
    open &&
    selection &&
    selection.matchId === match.id &&
    selection.windowId === match.windowId &&
    selection.quoteVersion === match.quoteVersion &&
    selection.points ===
      match.rates[selection.team][
        selection.direction.toLowerCase()
      ];

  async function send(payload) {
    setBusy(true);
    setBetError("");
    setMessage("");

    try {
      await api("/bets", payload);

      setPending(null);
      setSelection(null);
      setMessage("Demo bet accepted.");

      refresh.current();
    } catch (e) {
      setBetError(e.message);

      if (!e.status || e.status >= 500) {
        setPending(payload);
      } else {
        setPending(null);
      }
    } finally {
      setBusy(false);
    }
  }

  function confirm() {
    if (
      !canConfirm ||
      busy ||
      pending ||
      !Number.isInteger(amount) ||
      amount < 100 ||
      amount > 25000
    ) {
      return;
    }

    send({
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
          min-height: 100vh;
          background: #080d16;
          color: #fff;
          font-family: Inter, Arial, sans-serif;
          padding-bottom: 30px;
        }

        .so-wrap {
          max-width: 880px;
          margin: auto;
        }

        .so-page button {
          cursor: pointer;
        }

        .so-page button:disabled {
          cursor: not-allowed;
          opacity: .5;
        }

        .so-page .so-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 88px 88px;
          border-bottom: 1px solid #b8c2c9;
        }

        .so-cell {
          padding: 14px 10px;
          background: #f1f4f5;
          color: #17252a;
          font-size: 14px;
          font-weight: 800;
        }

        .so-back {
          background: #a5d9fa;
          color: #102739;
        }

        .so-lay {
          background: #f8c5d2;
          color: #3a1921;
        }

        .so-market {
          border: 0;
          border-left: 1px solid #bac8ce;
          font-weight: 900;
          font-size: 22px;
        }

        .so-strip {
          padding: 12px 16px;
          background: #1d665b;
          font-weight: 900;
        }

        .so-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 30px;
          height: 30px;
          background: #164e63;
          border-radius: 50%;
          margin: 4px;
          font-weight: bold;
        }

        .so-panel {
          padding: 16px;
          background: #111c2b;
          border-bottom: 1px solid #334155;
        }

        .so-button {
          padding: 12px 20px;
          border: 0;
          background: #5eead4;
          color: #052e29;
          border-radius: 8px;
          font-weight: 900;
        }

        .so-page input {
          color: #111;
          background: white;
          border: 1px solid #718399;
          border-radius: 6px;
          padding: 12px;
          max-width: 100%;
        }

        .so-ball {
          animation: soBall 10s linear both;
        }

        .so-ball.so-four {
          animation-name: soFour;
        }

        .so-ball.so-six {
          animation-name: soSix;
        }

        .so-bat {
          transform-origin: 10px 6px;
          animation: soBat 10s ease both;
        }

        .so-bowler {
          animation: soBowler 10s ease both;
        }

        @keyframes soBall {
          0% {
            transform: translate(0, 0);
          }
          12% {
            transform: translate(22px, -75px);
          }
          22%, 100% {
            transform: translate(30px, -80px);
            opacity: 0;
          }
        }

        @keyframes soFour {
          0% {
            transform: translate(0, 0);
          }
          12% {
            transform: translate(22px, -75px);
          }
          40%, 100% {
            transform: translate(330px, -50px);
            opacity: 0;
          }
        }

        @keyframes soSix {
          0% {
            transform: translate(0, 0);
          }
          12% {
            transform: translate(22px, -75px);
          }
          30% {
            transform: translate(130px, -260px);
          }
          45%, 100% {
            transform: translate(290px, -180px);
            opacity: 0;
          }
        }

        @keyframes soBat {
          0%, 10% {
            transform: rotate(0);
          }
          18% {
            transform: rotate(-110deg);
          }
          30%, 100% {
            transform: rotate(0);
          }
        }

        @keyframes soBowler {
          0% {
            transform: translateY(18px);
          }
          12%, 100% {
            transform: translateY(0);
          }
        }

        @media (max-width: 430px) {
          .so-page .so-row {
            grid-template-columns: minmax(0, 1fr) 76px 76px;
          }

          .so-cell {
            font-size: 12px;
            padding: 12px 8px;
          }
        }
      `}</style>

      <div className="so-wrap">
        <header
          className="so-panel"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <button
            className="so-button"
            onClick={onBack}
          >
            ← HOME
          </button>

          <strong style={{ color: "#fcd34d" }}>
            TELUGU SPORTS BOOK
          </strong>
        </header>

        <div
          className="so-panel"
          style={{
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            fontSize: 12,
            color: "#99f6e4",
            gap: 8,
          }}
        >
          <span>{ist(now)} IST</span>

          <span>
            DEMO COINS:{" "}
            {data?.balance?.toLocaleString("en-IN") ?? "…"}
          </span>
        </div>

        {!match ? (
          <div className="so-panel">
            {error ||
              data?.message ||
              "Connecting to match server…"}
          </div>
        ) : (
          <>
            <div className="so-strip">
              {match.teams.join(" vs ")}

              <div
                style={{
                  fontSize: 11,
                  marginTop: 6,
                }}
              >
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
              {match.teams.map((team, i) => (
                <div key={team}>
                  <strong
                    style={{
                      color:
                        i === 0 ? "#fca5a5" : "#93c5fd",
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
                    {match.scores[i].runs}/
                    {match.scores[i].wickets}{" "}

                    <small style={{ fontSize: 13 }}>
                      ({match.scores[i].overs})
                    </small>
                  </div>

                  <div>
                    {match.scores[i].balls.map((b, n) => (
                      <span
                        key={n}
                        className="so-pill"
                        style={{
                          background:
                            b === "W"
                              ? "#be123c"
                              : b === 4 || b === 6
                                ? "#047857"
                                : undefined,
                        }}
                      >
                        {b}
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
                color: open ? "#5eead4" : "#fcd34d",
                fontWeight: 900,
              }}
            >
              {match.phase === "RESULT"
                ? match.result.winner === "TIE"
                  ? "TIE · ALL RESERVED COINS REFUNDED"
                  : `${match.teams[match.result.winner]} WON`
                : open
                  ? `BETTING OPEN · ${remaining(
                      new Date(match.closesAt).getTime() - now,
                    )}`
                  : match.phase === "WAITING"
                    ? `NEXT START · ${remaining(
                        new Date(match.startAt).getTime() - now,
                      )}`
                    : match.phase === "SUSPENDED"
                      ? "MARKET CLOSED · 0 / 0"
                      : "BETTING LOCKED · BALL IN PLAY"}

              {match.lockReason &&
                match.phase !== "RESULT" && (
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 12,
                    }}
                  >
                    {match.lockReason}
                  </div>
                )}

              {match.phase === "RESULT" && (
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                  }}
                >
                  NEXT MATCH: {ist(match.nextAt)} IST ·{" "}
                  {remaining(
                    new Date(match.nextAt).getTime() - now,
                  )}
                </div>
              )}
            </div>

            <div className="so-strip">
              MATCH WINNER · DEMO COINS ONLY
            </div>

            <div className="so-row">
              <div className="so-cell">
                Min: 100 · Max: 25,000
              </div>

              <div className="so-cell so-back">
                BACK
              </div>

              <div className="so-cell so-lay">
                LAY
              </div>
            </div>

            {match.teams.map((team, i) => (
              <div className="so-row" key={team}>
                <div className="so-cell">{team}</div>

                {["BACK", "LAY"].map((direction) => (
                  <button
                    key={direction}
                    className={`so-market ${
                      direction === "BACK"
                        ? "so-back"
                        : "so-lay"
                    }`}
                    disabled={
                      !open || busy || Boolean(pending)
                    }
                    onClick={() => {
                      setSelection({
                        matchId: match.id,
                        windowId: match.windowId,
                        quoteVersion: match.quoteVersion,
                        team: i,
                        direction,
                        points:
                          match.rates[i][
                            direction.toLowerCase()
                          ],
                      });

                      setMessage("");
                      setBetError("");
                    }}
                  >
                    {
                      match.rates[i][
                        direction.toLowerCase()
                      ]
                    }

                    <small
                      style={{
                        display: "block",
                        fontSize: 10,
                      }}
                    >
                      POINTS
                    </small>
                  </button>
                ))}
              </div>
            ))}

            <section className="so-panel">
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  marginBottom: 8,
                }}
              >
                STAKE · WHOLE DEMO COINS
              </label>

              <input
                type="number"
                min="100"
                max="25000"
                step="1"
                value={amount}
                onChange={(e) =>
                  setAmount(Number(e.target.value))
                }
              />

              {selection && (
                <p>
                  {match.teams[selection.team]} ·{" "}
                  {selection.direction} ·{" "}
                  {selection.points} points
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
                  className="so-button"
                  disabled={
                    !canConfirm ||
                    busy ||
                    Boolean(pending) ||
                    !Number.isInteger(amount) ||
                    amount < 100 ||
                    amount > 25000
                  }
                  onClick={confirm}
                >
                  {busy
                    ? "SENDING…"
                    : "CONFIRM DEMO BET"}
                </button>
              </div>

              {pending && (
                <p style={{ color: "#fcd34d" }}>
                  Connection interrupted. Retry the same
                  request to check acceptance.
                  <br />

                  <button
                    className="so-button"
                    disabled={busy}
                    onClick={() => send(pending)}
                  >
                    CHECK / RETRY SAME BET
                  </button>
                </p>
              )}

              {message && (
                <p style={{ color: "#5eead4" }}>
                  {message}
                </p>
              )}
            </section>

            <section className="so-panel">
              <strong>MY DEMO BETS</strong>

              {data.bets.length === 0 ? (
                <p>No bets yet.</p>
              ) : (
                data.bets.slice(0, 20).map((b) => (
                  <div
                    key={b.id}
                    style={{
                      borderBottom: "1px solid #334155",
                      padding: "10px 0",
                      fontSize: 12,
                    }}
                  >
                    Match #{b.match_id} · Team{" "}
                    {b.team + 1} · {b.direction}{" "}
                    {b.points} · Stake {b.amount}
                    <br />
                    Reserved {b.hold} · {b.status}{" "}
                    {b.status === "SETTLED"
                      ? `· Returned ${b.payout}`
                      : ""}
                  </div>
                ))
              )}
            </section>

            <details className="so-panel">
              <summary>
                RULES & RESULT VERIFICATION
              </summary>

              <p>
                Admin-controlled virtual demo. The Admin
                prepares ball outcomes and manually changes
                match rates. Results are not random in this
                mode. A ball result freezes when its betting
                window opens; an unopened future ball may be
                changed by Admin. Previously accepted bets
                retain their accepted rate.
              </p>

              <p>
                Two innings, at most six balls and two
                wickets each. A successful chase stops the
                match. A tie refunds reserved coins.
                Maximum match time is two minutes. Each ball
                has eight seconds of betting and two seconds
                locked for the result animation. A prepared
                match releases five minutes before its
                quarter-hour start. Unprepared matches do
                not open for betting.
              </p>

              <p>
                Initial Back points are 95 on each team;
                initial Lay points are 105. Admin may change
                both quotes. Rates are profit points per
                100 stake. Back reserves stake and returns
                stake plus profit on a win; Lay reserves
                rounded-up liability and returns that
                liability plus stake on a win. No
                cancellation after confirmation.
              </p>

              <p>
                If a team can no longer win, including
                level scores during the chase where only a
                chasing-team win or tie remains, all new
                betting closes automatically at 0 / 0.
                This does not decide the final ball; the
                actual win or tie still settles from the
                played results.
              </p>

              <p>
                Each committed ball has a SHA-256 hash.
                Its value and seed are revealed only when
                the result is due. Verify canonicalOutcome(
                {"{matchId, seq, team, teamBall, value}"})
                + ':' + seed, sorting object keys
                recursively. Admin changes are recorded
                in the audit log.
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
            style={{ color: "#fca5a5" }}
          >
            {error || betError}
          </div>
        )}

        <footer
          style={{
            padding: 16,
            fontSize: 11,
            color: "#94a3b8",
          }}
        >
          Unofficial virtual demo using IPL team
          abbreviations. No real-money play.
          Admin-controlled 3D virtual cricket.
        </footer>
      </div>
    </main>
  );
}
