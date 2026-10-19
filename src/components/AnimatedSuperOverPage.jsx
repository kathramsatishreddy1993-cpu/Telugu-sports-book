import React, { useEffect, useRef, useState } from "react";

const API = "/api/animated-cricket";

const KITS = {
  RCB: ["#d71932", "#172554"],
  CSK: ["#facc15", "#166534"],
  MI: ["#2563eb", "#eab308"],
  KKR: ["#6b21a8", "#eab308"],
  SRH: ["#f97316", "#171717"],
  RR: ["#ec4899", "#1d4ed8"],
  DC: ["#2563eb", "#dc2626"],
  PBKS: ["#dc2626", "#d1d5db"],
  GT: ["#172554", "#d4af37"],
  LSG: ["#38bdf8", "#f97316"],
};

const kit = (team) =>
  KITS[team.split(" ")[0]] || ["#0d9488", "#fcd34d"];

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
  const seconds = Math.max(0, Math.ceil(ms / 1000));

  return `${String(Math.floor(seconds / 60)).padStart(
    2,
    "0",
  )}:${String(seconds % 60).padStart(2, "0")}`;
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
      { status: response.status },
    );
  }

  return data;
}

export function AnimatedSuperOverLobby() {
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;

    const load = () =>
      api("/schedule")
        .then((value) => {
          if (alive) setData(value);
        })
        .catch(() => {});

    load();

    const timer = setInterval(load, 15000);

    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <article
      style={{
        margin: "12px 0",
        padding: 16,
        background: "#102522",
        border: "1px solid #2e6d62",
        borderRadius: 16,
        color: "white",
      }}
    >
      <div style={{ color: "#5eead4", fontWeight: 900 }}>
        🏏 ANIMATED SUPER OVER · IPL TEAM ROTATION
      </div>

      <p
        style={{
          fontSize: 12,
          color: "#cbd5e1",
          margin: "8px 0",
        }}
      >
        Virtual demo · New match every 15 minutes · Up to 3 minutes
      </p>

      {data?.matches.slice(0, 3).map((match) => (
        <div
          key={match.startAt}
          style={{
            display: "block",
            borderTop: "1px solid #36504b",
            padding: "10px 0",
            color: "white",
          }}
        >
          <strong>{match.teams.join(" vs ")}</strong>
          <br />
          <small style={{ color: "#99f6e4" }}>
            {ist(match.startAt)} IST
          </small>
        </div>
      ))}

      <a
        href="/games/animated-super-over"
        style={{
          display: "inline-block",
          padding: "10px 18px",
          background: "#5eead4",
          color: "#082f29",
          fontWeight: 900,
          borderRadius: 9,
        }}
      >
        OPEN MATCH →
      </a>
    </article>
  );
}

function Player({
  x,
  y,
  color,
  trim = "#fff",
  role,
  value,
  active,
  delay,
}) {
  const umpire = role === "umpire";
  const six = umpire && value === 6 && active;
  const out = umpire && value === "W" && active;
  const four = umpire && value === 4 && active;

  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse
        cy="45"
        rx="19"
        ry="5"
        fill="#000"
        opacity=".2"
      />

      <g
        className={
          role === "bowler" && active ? "so-bowler" : ""
        }
        style={{ animationDelay: delay }}
      >
        <path
          d="M-5 18 L-9 44 M5 18 L11 44"
          stroke={umpire ? "#151b26" : color}
          strokeWidth="8"
          strokeLinecap="round"
        />

        <path
          d="M0 -5 L0 23"
          stroke={color}
          strokeWidth="20"
          strokeLinecap="round"
        />

        {!umpire && (
          <path
            d="M-8 1L0 6L8 1 M-8 15H8"
            fill="none"
            stroke={trim}
            strokeWidth="3"
          />
        )}

        <circle cy="-20" r="9" fill="#dba77c" />

        <path
          d="M-10 -23 Q0 -33 11 -23"
          fill={umpire ? "#f8fafc" : color}
          stroke={color}
          strokeWidth="4"
        />

        {role === "batter" && (
          <>
            <path
              d="M-10 -17V-24Q0 -38 11 -24V-16L5 -11H-4Z"
              fill={color}
              stroke={trim}
              strokeWidth="2"
            />

            <path
              d="M2 -22L14 -19L12 -11H1 M2 -16H13 M6 -21V-11"
              fill="none"
              stroke="#b9c4cd"
              strokeWidth="1.5"
            />

            <path
              d="M-7 26L-9 41 M8 26L10 41"
              stroke="#f1f5f9"
              strokeWidth="10"
              strokeLinecap="round"
            />

            <path
              d="M-7 26L-9 41 M8 26L10 41"
              stroke="#9aa8b9"
              strokeWidth="1.5"
            />

            <path
              d="M-12 30H-3 M3 30H13 M-13 36H-3 M4 36H14"
              stroke="#aab7c6"
              strokeWidth="1"
            />

            <circle
              cx="15"
              cy="12"
              r="5"
              fill="#fff"
              stroke={trim}
              strokeWidth="1.5"
            />

            <circle
              cx="11"
              cy="9"
              r="4"
              fill="#fff"
              stroke={trim}
              strokeWidth="1.5"
            />
          </>
        )}

        <path
          d="M-10 44H-17 M11 44H18"
          stroke="#f8fafc"
          strokeWidth="5"
          strokeLinecap="round"
        />

        <path
          d={
            six
              ? "M-8 -3 L-13 -30 M8 -3 L13 -30"
              : out
                ? "M-8 -3 L-18 12 M8 -3 L9 -35"
                : four
                  ? "M-8 -3 L-22 9 M8 -3 L31 -4"
                  : "M-8 -3 L-17 15 M8 -3 L17 14"
          }
          stroke={umpire ? "#f8fafc" : color}
          strokeWidth="7"
          strokeLinecap="round"
        />

        {role === "batter" && (
          <g
            className={active ? "so-bat" : ""}
            style={{ animationDelay: delay }}
          >
            <path
              d="M15 9 L30 39"
              stroke="#e5bf82"
              strokeWidth="8"
              strokeLinecap="round"
            />
          </g>
        )}
      </g>
    </g>
  );
}

export function Stadium({ match, now }) {
  const last = match.events.at(-1);

  const elapsed = last
    ? now - new Date(match.startAt).getTime() - last.at
    : 100000;

  const active =
    last && elapsed >= 0 && elapsed < 10000;

  const delay = `${-Math.max(0, elapsed) / 1000}s`;

  const label = !active
    ? match.phase === "BETTING"
      ? "PLACE YOUR DEMO BET"
      : match.phase === "RESULT"
        ? "MATCH COMPLETE"
        : "WAITING FOR NEXT MATCH"
    : last.value === "W"
      ? "WICKET"
      : last.value === 4
        ? "FOUR"
        : last.value === 6
          ? "SIX"
          : last.value === 0
            ? "DOT BALL"
            : `${last.value} RUN${last.value === 1 ? "" : "S"}`;

  const team = last?.team || 0;
  const batting = kit(match.teams[team]);
  const bowling = kit(match.teams[1 - team]);

  return (
    <div
      style={{
        position: "relative",
        background: "#071c27",
      }}
    >
      <svg
        viewBox="0 0 800 450"
        role="img"
        aria-label={`Animated cricket stadium. ${label}`}
        style={{
          width: "100%",
          display: "block",
        }}
      >
        <defs>
          <linearGradient id="soSky" x2="0" y2="1">
            <stop stopColor="#081425" />
            <stop offset="1" stopColor="#344259" />
          </linearGradient>

          <radialGradient id="soGrass">
            <stop stopColor="#65a354" />
            <stop offset="1" stopColor="#245b38" />
          </radialGradient>
        </defs>

        <rect
          width="800"
          height="450"
          fill="url(#soSky)"
        />

        <path
          d="M0 110 Q400 210 800 110 L800 240 L0 240Z"
          fill="#48576b"
        />

        {[0, 1, 2].map((row) => (
          <path
            key={row}
            d={`M0 ${125 + row * 27} Q400 ${
              225 + row * 18
            } 800 ${125 + row * 27}`}
            fill="none"
            stroke="#1a293a"
            strokeWidth="16"
          />
        ))}

        {Array.from({ length: 160 }, (_, i) => (
          <g
            key={i}
            fill={
              [
                "#e7c7a5",
                "#b3d8ed",
                "#f3a1a8",
                "#e7db97",
              ][i % 4]
            }
          >
            <circle
              cx={(i % 40) * 21 + 4}
              cy={
                145 +
                Math.floor(i / 40) * 17 +
                18 *
                  Math.sin(
                    ((i % 40) / 40) * Math.PI,
                  )
              }
              r="3"
            />

            <path
              d={`M${(i % 40) * 21 + 4} ${
                150 +
                Math.floor(i / 40) * 17 +
                18 *
                  Math.sin(
                    ((i % 40) / 40) * Math.PI,
                  )
              }v5`}
              stroke="currentColor"
              strokeWidth="3"
            />
          </g>
        ))}

        {[60, 740].map((x) => (
          <g key={x}>
            <path
              d={`M${x} 30V150`}
              stroke="#9aa9ba"
              strokeWidth="5"
            />

            <rect
              x={x - 25}
              y="24"
              width="50"
              height="17"
              rx="3"
              fill="#fefce8"
            />
          </g>
        ))}

        <ellipse
          cx="400"
          cy="389"
          rx="490"
          ry="185"
          fill="url(#soGrass)"
        />

        <ellipse
          cx="400"
          cy="389"
          rx="365"
          ry="142"
          fill="none"
          stroke="#f7faf5"
          strokeWidth="2"
        />

        <path
          d="M353 436 L378 254 L421 254 L450 436Z"
          fill="#ccb383"
        />

        <path
          d="M364 389H438 M378 288H425"
          stroke="white"
          strokeWidth="3"
        />

        {[391, 400, 409].map((x) => (
          <path
            key={x}
            d={`M${x} 298V274 M${x - 4} 274H${x + 4}`}
            stroke="#eee"
            strokeWidth="3"
          />
        ))}

        {[0, 1, 2, 3, 4, 5].map((v) => (
          <Player
            key={v}
            x={[120, 220, 610, 680, 300, 540][v]}
            y={[300, 240, 250, 345, 230, 385][v]}
            color={bowling[0]}
            trim={bowling[1]}
            role="fielder"
          />
        ))}

        <g key={`${match.id}-${last?.index ?? "wait"}`}>
          <Player
            x="405"
            y="264"
            color={batting[0]}
            trim={batting[1]}
            role="batter"
            value={last?.value}
            active={active}
            delay={delay}
          />

          <Player
            x="455"
            y="399"
            color={batting[0]}
            trim={batting[1]}
            role="batter"
          />

          <Player
            x="370"
            y="365"
            color={bowling[0]}
            trim={bowling[1]}
            role="bowler"
            active={active}
            delay={delay}
          />

          <Player
            x="445"
            y="353"
            color="#f8fafc"
            role="umpire"
            value={last?.value}
            active={active && elapsed > 2000}
            delay={delay}
          />

          {active && (
            <circle
              className={`so-ball ${
                last.value === 6
                  ? "so-six"
                  : last.value === 4
                    ? "so-four"
                    : ""
              }`}
              cx="380"
              cy="352"
              r="4"
              fill="white"
              style={{ animationDelay: delay }}
            />
          )}
        </g>

        <rect
          x="225"
          y="15"
          width="350"
          height="42"
          rx="12"
          fill="#06121c"
          opacity=".9"
        />

        <text
          x="400"
          y="43"
          textAnchor="middle"
          fill="#fcd34d"
          fontSize="22"
          fontWeight="900"
        >
          {label}
        </text>

        <rect
          x="0"
          y="420"
          width="800"
          height="30"
          fill="#0a2026"
        />

        <text
          x="20"
          y="441"
          fill="white"
          fontSize="16"
        >
          {match.teams[0]} {match.scores[0].runs}/
          {match.scores[0].wickets}
        </text>

        <text
          x="780"
          y="441"
          textAnchor="end"
          fill="white"
          fontSize="16"
        >
          {match.teams[1]} {match.scores[1].runs}/
          {match.scores[1].wickets}
        </text>
      </svg>

      <div
        style={{
          position: "absolute",
          top: 8,
          left: 8,
          fontSize: 10,
          fontWeight: 900,
          color: "#99f6e4",
        }}
      >
        ● VIRTUAL ANIMATION
      </div>
    </div>
  );
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

  const anchor = useRef({
    server: Date.now(),
    local: performance.now(),
  });

  const received = useRef(0);
  const refresh = useRef(() => {});

  useEffect(() => {
    let alive = true;
    let loading = false;

    async function load() {
      if (loading) return;
      loading = true;

      try {
        const value = await api("/state");

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
    selection.points ===
      match.rates[selection.team][
        selection.direction.toLowerCase()
      ];

  async function send(payload) {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      await api("/bets", payload);

      setPending(null);
      setSelection(null);
      setMessage("Demo bet accepted.");
      refresh.current();
    } catch (e) {
      setError(e.message);

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
        `${Date.now()}_${Math.random()
          .toString(36)
          .slice(2)}`,
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
          grid-template-columns: minmax(0,1fr) 88px 88px;
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
            transform: translate(0,0);
          }
          12% {
            transform: translate(22px,-75px);
          }
          22%,100% {
            transform: translate(30px,-80px);
            opacity: 0;
          }
        }

        @keyframes soFour {
          0% {
            transform: translate(0,0);
          }
          12% {
            transform: translate(22px,-75px);
          }
          40%,100% {
            transform: translate(330px,-50px);
            opacity: 0;
          }
        }

        @keyframes soSix {
          0% {
            transform: translate(0,0);
          }
          12% {
            transform: translate(22px,-75px);
          }
          30% {
            transform: translate(130px,-260px);
          }
          45%,100% {
            transform: translate(290px,-180px);
            opacity: 0;
          }
        }

        @keyframes soBat {
          0%,10% {
            transform: rotate(0);
          }
          18% {
            transform: rotate(-110deg);
          }
          30%,100% {
            transform: rotate(0);
          }
        }

        @keyframes soBowler {
          0% {
            transform: translateY(18px);
          }
          12%,100% {
            transform: translateY(0);
          }
        }

        @media(max-width:430px) {
          .so-page .so-row {
            grid-template-columns: minmax(0,1fr) 76px 76px;
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
            {error || "Connecting to match server…"}
          </div>
        ) : (
          <>
            <div className="so-strip">
              {match.teams.join(" vs ")}

              <div style={{ fontSize: 11, marginTop: 6 }}>
                START: {ist(match.startAt)} IST · Random virtual demo
              </div>
            </div>

            <Stadium match={match} now={now} />

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
                      color: i === 0 ? "#fca5a5" : "#93c5fd",
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
                    {match.scores[i].balls.map((ball, index) => (
                      <span
                        key={index}
                        className="so-pill"
                        style={{
                          background:
                            ball === "W"
                              ? "#be123c"
                              : ball === 4 || ball === 6
                                ? "#047857"
                                : undefined,
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
                    : "BETTING LOCKED · BALL IN PLAY"}

              {match.phase === "RESULT" && (
                <div style={{ marginTop: 8, fontSize: 12 }}>
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
              <div className="so-cell so-back">BACK</div>
              <div className="so-cell so-lay">LAY</div>
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
                    disabled={!open || busy || Boolean(pending)}
                    onClick={() => {
                      setSelection({
                        matchId: match.id,
                        windowId: match.windowId,
                        team: i,
                        direction,
                        points:
                          match.rates[i][
                            direction.toLowerCase()
                          ],
                      });

                      setMessage("");
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
                  {busy ? "SENDING…" : "CONFIRM DEMO BET"}
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
                data.bets.slice(0, 20).map((bet) => (
                  <div
                    key={bet.id}
                    style={{
                      borderBottom: "1px solid #334155",
                      padding: "10px 0",
                      fontSize: 12,
                    }}
                  >
                    Match #{bet.match_id} · Team{" "}
                    {bet.team + 1} · {bet.direction}{" "}
                    {bet.points} · Stake {bet.amount}
                    <br />
                    Reserved {bet.hold} · {bet.status}{" "}
                    {bet.status === "SETTLED"
                      ? `· Returned ${bet.payout}`
                      : ""}
                  </div>
                ))
              )}
            </section>

            <details className="so-panel">
              <summary>RULES & RESULT VERIFICATION</summary>

              <p>
                Two innings; up to six legal balls and two
                wickets each. The chase stops when the target
                is passed. A tie refunds reserved coins.
                One new match starts every quarter-hour IST.
                Maximum play time: 3 minutes. Each ball:
                5 seconds to bet, then 10 seconds locked.
                Pre-match betting opens 60 seconds before
                the scheduled start.
              </p>

              <p>
                Ball probabilities: dot 25%, one 28%,
                two 12%, three 2%, four 15%, six 10%,
                wicket 8%. Results use server cryptographic
                randomness, independently of bets.
                All customers share the same result.
              </p>

              <p>
                Rates are profit points per 100 stake,
                not decimal odds. Back reserves stake;
                Lay reserves rounded-up liability.
                A winning Back returns stake plus profit;
                a winning Lay returns its reserved
                liability plus stake. Back 80 with 100
                stake returns 180 if it wins; Lay 90
                with 100 stake reserves 90 and returns
                190 if it wins. No cancellation after
                confirmation.
              </p>

              <p>
                Each selection keeps a 10-point Back/Lay
                spread. Six lowers the batting team's points
                by 10, four by 5, wicket raises them by 20.
                Singles, twos, threes and dots leave rates
                unchanged. The opposing selection moves in
                the opposite direction. Back points are
                bounded at 10–190. The final ball closes
                the market rather than leaving a guaranteed
                winning selection open.
              </p>

              <p style={{ overflowWrap: "anywhere" }}>
                Commitment: {match.commitment}
              </p>

              {match.seed && (
                <>
                  <p style={{ overflowWrap: "anywhere" }}>
                    Seed: {match.seed}
                  </p>

                  <p>
                    Verify SHA-256(canonicalOutcome(outcome)
                    + ':' + seed), sorting all object keys
                    recursively and preserving array order.
                  </p>

                  <pre
                    style={{
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere",
                      fontSize: 11,
                    }}
                  >
                    {JSON.stringify(match.outcome)}
                  </pre>
                </>
              )}
            </details>
          </>
        )}

        {error && (
          <div
            role="alert"
            className="so-panel"
            style={{ color: "#fca5a5" }}
          >
            {error}
          </div>
        )}

        <footer
          style={{
            padding: 16,
            fontSize: 11,
            color: "#94a3b8",
          }}
        >
          Unofficial virtual demo using IPL team abbreviations.
          No real-money play. 2D vector animation.
        </footer>
      </div>
    </main>
  );
}
