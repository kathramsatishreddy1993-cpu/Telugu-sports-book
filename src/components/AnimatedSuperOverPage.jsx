import React, { useEffect, useRef, useState } from "react";

export {
  default as AnimatedSuperOverLobby,
} from "./CricketMatchList";

const API = "/api/animated-cricket";

const money = n =>
  Number.isFinite(Number(n)) && n !== null
    ? `₹${Number(n).toLocaleString("en-IN", {
        maximumFractionDigits: 2,
      })}`
    : "—";

const seconds = ms =>
  Math.max(0, Math.ceil(ms / 1000));

const stamp = value =>
  new Date(value).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: false,
  });

async function api(path, body) {
  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    8000,
  );

  try {
    const response = await fetch(API + path, {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,

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

    if (!response.ok || data.success === false) {
      throw Object.assign(
        new Error(data.error || "Request failed"),
        { status: response.status },
      );
    }

    return data;
  } finally {
    clearTimeout(timer);
  }
}

const store = {
  get(key) {
    try {
      return JSON.parse(
        sessionStorage.getItem(key) || "null",
      );
    } catch {
      return null;
    }
  },

  set(key, value) {
    try {
      sessionStorage.setItem(
        key,
        JSON.stringify(value),
      );

      return true;
    } catch {
      return false;
    }
  },

  remove(key) {
    try {
      sessionStorage.removeItem(key);
    } catch {}
  },
};

function keyFor(id) {
  return `tsb_card_so_pending_v1:${id}`;
}

function newKey() {
  const bytes = new Uint8Array(24);

  globalThis.crypto.getRandomValues(bytes);

  return Array.from(
    bytes,
    b => b.toString(16).padStart(2, "0"),
  ).join("");
}

function Host({ celebrate }) {
  const videoRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const mode = celebrate ? "clap" : "idle";

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !ready || failed) return;

    const ranges = {
      idle: [0.1, 1.6],
      clap: [8.8, 9.8],
    };

    const duration = Number.isFinite(video.duration)
      ? video.duration
      : 10;

    const selectedRange =
      duration >= ranges[mode][1]
        ? ranges[mode]
        : [0, Math.max(0.1, duration - 0.1)];

    const [start, end] = selectedRange;

    let frame;
    let alive = true;

    setBlocked(false);

    try {
      video.currentTime = start;
    } catch {}

    video.play()?.catch(error => {
      if (
        alive &&
        error.name === "NotAllowedError"
      ) {
        setBlocked(true);
      }
    });

    const check = () => {
      if (!alive) return;

      if (
        !video.seeking &&
        (
          video.currentTime >= end - 0.025 ||
          video.currentTime < start - 0.08
        )
      ) {
        try {
          video.currentTime = start;
        } catch {}
      }

      if (video.ended) {
        video.play()?.catch(() => {});
      }

      frame = requestAnimationFrame(check);
    };

    frame = requestAnimationFrame(check);

    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      video.pause();
    };
  }, [mode, ready, failed]);

  return (
    <div className="cs-host">
      {!failed ? (
        <video
          ref={videoRef}
          src="/games/superover-idle.mp4"
          muted
          playsInline
          preload="auto"
          onLoadedMetadata={() => setReady(true)}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="cs-no-video">
          Host video unavailable
        </div>
      )}

      {blocked && !failed && (
        <button
          type="button"
          className="cs-quick"
          style={{
            position: "absolute",
            bottom: 8,
            left: 8,
            zIndex: 5,
          }}
          onClick={() => {
            videoRef.current
              ?.play()
              ?.then(() => setBlocked(false))
              .catch(() => {});
          }}
        >
          PLAY VIDEO
        </button>
      )}

      <small className="cs-ai">
        AI-GENERATED DEMO
      </small>
    </div>
  );
}

export function cardPose(match, card, now) {
  const x = 191 + (card.ball - 1) * 102;
  const y = card.team === 0 ? 420 : 558;

  const age =
    now -
    new Date(match.roundStartAt).getTime() -
    card.at;

  const progress = Math.min(
    1,
    Math.max(0, age / 850),
  );

  const eased =
    1 - Math.pow(1 - progress, 3);

  return {
    x: 590 + (x - 590) * eased,
    y: 294 + (y - 294) * eased,
    angle: -12 * (1 - eased),
    progress,
    age,
  };
}

export function CardTable({ match, now }) {
  const events = (match.events || []).filter(
    card =>
      now >=
      new Date(match.roundStartAt).getTime() +
        card.at,
  );

  const latest = events.at(-1);

  const latestAge = latest
    ? now -
      new Date(match.roundStartAt).getTime() -
      latest.at
    : Infinity;

  return (
    <div className="cs-scene">
      <Host
        celebrate={
          match.phase === "RESULT" &&
          match.result?.winner !== "TIE" &&
          latestAge < 2000
        }
      />

      <svg
        className="cs-stage"
        viewBox="0 0 1000 730"
        role="img"
        aria-label="Server cards dealt in order: India top row, Australia bottom row"
      >
        <rect
          x="0"
          y="310"
          width="1000"
          height="420"
          fill="#651d3a"
        />

        <text
          x="500"
          y="353"
          textAnchor="middle"
          fill="#f2ca79"
          fontSize="27"
          fontWeight="bold"
        >
          SUPER OVER
        </text>

        <text
          x="175"
          y="400"
          fill="#fff"
          fontSize="18"
        >
          INDIA
        </text>

        <text
          x="175"
          y="548"
          fill="#fff"
          fontSize="18"
        >
          AUSTRALIA
        </text>

        <g aria-label="Card shuffler">
          <rect
            x="18"
            y="405"
            width="125"
            height="170"
            rx="5"
            fill="#171719"
          />

          <rect
            x="29"
            y="422"
            width="103"
            height="34"
            fill="#060607"
            stroke="#666"
          />

          <text
            x="80"
            y="481"
            fill="#aaa"
            textAnchor="middle"
            fontSize="12"
          >
            SHUFFLER
          </text>
        </g>

        <g aria-label="Face-down card shoe">
          <path
            d="M839 405 L966 380 L966 490 L839 515 Z"
            fill="#ffffff12"
            stroke="#ffffff88"
            strokeWidth="3"
          />

          {Array.from(
            { length: 8 },
            (_, i) => (
              <path
                key={i}
                d={
                  `M852 ${478 - i * 4} ` +
                  `L951 ${457 - i * 4}`
                }
                stroke="#eee4d9"
                strokeWidth="3"
              />
            ),
          )}
        </g>

        {[0, 1].map(team =>
          Array.from(
            { length: 6 },
            (_, i) => (
              <g key={`${team}:${i}`}>
                <rect
                  x={191 + i * 102}
                  y={team === 0 ? 420 : 558}
                  width="82"
                  height="110"
                  rx="5"
                  fill="none"
                  stroke="#ffffff40"
                />

                <text
                  x={232 + i * 102}
                  y={team === 0 ? 483 : 621}
                  textAnchor="middle"
                  fill="#ffffff45"
                  fontSize="18"
                >
                  {i + 1}
                </text>
              </g>
            ),
          ),
        )}

        {events.map(card => {
          const pose = cardPose(
            match,
            card,
            now,
          );

          const holding =
            card.index === latest?.index &&
            pose.progress < 0.45;

          const color =
            card.rank === "K"
              ? "#791b3e"
              : "#161616";

          return (
            <g
              key={`${match.id}:${card.index}`}
              data-card-index={card.index}
              data-team={card.team}
              data-ball={card.ball}
              data-rank={card.rank}
              transform={
                `translate(${pose.x} ${pose.y}) ` +
                `rotate(${pose.angle} 41 55)`
              }
            >
              <title>
                {`${match.teams[card.team]} ball ${
                  card.ball
                }: ${card.rank}, ${
                  card.value === "W"
                    ? "wicket"
                    : `${card.value} runs`
                }`}
              </title>

              <rect
                width="82"
                height="110"
                rx="5"
                fill="#fffbee"
                stroke="#c6bdaa"
              />

              <text
                x="8"
                y="25"
                fill={color}
                fontSize="23"
                fontWeight="bold"
              >
                {card.rank}
              </text>

              <text
                x="41"
                y="66"
                textAnchor="middle"
                fill={color}
                fontSize="31"
              >
                ♠
              </text>

              <text
                x="8"
                y="25"
                transform="rotate(180 41 55)"
                fill={color}
                fontSize="23"
                fontWeight="bold"
              >
                {card.rank}
              </text>

              {holding && (
                <g
                  aria-label="Animated hand holding this card"
                  data-holding-rank={card.rank}
                >
                  <path
                    d={
                      "M36 -82 L65 -82 L68 -29 " +
                      "Q81 -18 80 -5 L75 28 " +
                      "Q73 35 68 30 L66 11 L63 35 " +
                      "Q60 42 55 36 L53 11 L49 34 " +
                      "Q46 40 42 34 L42 6 L32 18 " +
                      "Q25 23 23 16 L34 -8 Z"
                    }
                    fill="#c78e73"
                    stroke="#97654e"
                    strokeWidth="2"
                  />

                  <path
                    d="M34 -82 L68 -82 L68 -60 L34 -60 Z"
                    fill="#6b2546"
                  />
                </g>
              )}
            </g>
          );
        })}

        <text
          x="500"
          y="708"
          textAnchor="middle"
          fill="#d9adb9"
          fontSize="14"
        >
          INDIA · AUSTRALIA
        </text>
      </svg>
    </div>
  );
}

export default function AnimatedSuperOverPage({
  onBack = () => window.location.assign("/"),
}) {
  const [data, setData] = useState(null);
  const [now, setNow] = useState(Date.now());

  const [error, setError] = useState("");
  const [betError, setBetError] = useState("");

  const [amount, setAmount] = useState("100");
  const [selection, setSelection] = useState(null);

  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null);
  const [message, setMessage] = useState("");

  const mounted = useRef(false);
  const inFlight = useRef(false);
  const refresh = useRef(() => {});

  const anchor = useRef({
    server: Date.now(),
    local: performance.now(),
  });

  const received = useRef(0);
  const account = useRef(null);
  const dataRef = useRef(null);
  const lastBalance = useRef(null);

  useEffect(() => {
    mounted.current = true;

    let alive = true;
    let loading = false;

    async function load() {
      if (loading) return;

      loading = true;

      try {
        const value = await api("/state");

        if (!alive) return;

        if (
          account.current !== value.customerId
        ) {
          account.current = value.customerId;

          setSelection(null);
          setMessage("");
          setBetError("");

          const saved = store.get(
            keyFor(value.customerId),
          );

          setPending(
            saved?.customerId ===
              value.customerId &&
              typeof saved.body?.requestKey ===
                "string"
              ? saved
              : null,
          );

          lastBalance.current = null;
        }

        if (
          lastBalance.current !== null &&
          lastBalance.current !== value.balance
        ) {
          window.dispatchEvent(
            new Event("demo-balance-updated"),
          );
        }

        lastBalance.current = value.balance;

        anchor.current = {
          server: new Date(
            value.serverTime,
          ).getTime(),
          local: performance.now(),
        };

        received.current = performance.now();
        dataRef.current = value;

        setData(value);
        setNow(anchor.current.server);
        setError("");
      } catch (e) {
        if (alive) {
          setError(
            e.name === "AbortError"
              ? "Connection timed out. Retrying…"
              : e.message,
          );

          if (
            e.status === 401 ||
            e.status === 403
          ) {
            dataRef.current = null;
            account.current = null;

            setData(null);
            setPending(null);
            setSelection(null);
          }
        }
      } finally {
        loading = false;
      }
    }

    refresh.current = load;
    void load();

    const poll = setInterval(load, 500);

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
      mounted.current = false;

      clearInterval(poll);
      clearInterval(timer);
    };
  }, []);

  const match = data?.match;

  const fresh = Boolean(
    data &&
      !error &&
      performance.now() -
        received.current <
        2500,
  );

  const open = Boolean(
    fresh &&
      match?.phase === "BETTING" &&
      now >=
        new Date(match.opensAt).getTime() &&
      now <
        new Date(match.closesAt).getTime(),
  );

  const validAmount =
    Number.isSafeInteger(Number(amount)) &&
    Number(amount) >= 100 &&
    Number(amount) <= 25000;

  const selected =
    selection?.matchId === match?.id;

  async function send(saved) {
    if (
      inFlight.current ||
      !saved ||
      account.current !== saved.customerId
    ) {
      return;
    }

    inFlight.current = true;

    setBusy(true);
    setBetError("");
    setMessage("");

    try {
      const result = await api(
        "/bets",
        saved.body,
      );

      store.remove(
        keyFor(saved.customerId),
      );

      window.dispatchEvent(
        new Event("demo-balance-updated"),
      );

      if (
        mounted.current &&
        account.current === saved.customerId
      ) {
        setPending(null);
        setSelection(null);

        setMessage(
          result.duplicate
            ? "Previously accepted bet recovered."
            : "Demo bet accepted.",
        );

        void refresh.current();
      }
    } catch (e) {
      if (
        mounted.current &&
        account.current === saved.customerId
      ) {
        const definite = [
          400,
          401,
          403,
          404,
          409,
          422,
        ].includes(e.status);

        if (definite) {
          store.remove(
            keyFor(saved.customerId),
          );

          setPending(null);
        }

        setBetError(
          definite
            ? e.message
            : "Connection interrupted. Use CHECK SAME BET to recover acceptance.",
        );
      }
    } finally {
      inFlight.current = false;

      if (mounted.current) {
        setBusy(false);
      }
    }
  }

  function confirm() {
    if (
      !open ||
      !selected ||
      !validAmount ||
      busy ||
      pending ||
      inFlight.current ||
      !dataRef.current
    ) {
      return;
    }

    if (
      Number(amount) >
      Number(data.balance)
    ) {
      setBetError(
        "Insufficient demo coins.",
      );

      return;
    }

    let requestKey;

    try {
      requestKey = newKey();
    } catch {
      setBetError(
        "A secure browser connection is required.",
      );

      return;
    }

    const saved = {
      customerId: data.customerId,

      body: {
        matchId: match.id,
        team: selection.team,
        direction: "BACK",
        amount: Number(amount),
        points: 98,
        quoteVersion: 1,
        windowId: "PRE",
        requestKey,
      },
    };

    if (
      !store.set(
        keyFor(data.customerId),
        saved,
      )
    ) {
      setBetError(
        "Enable browser session storage to recover interrupted bets.",
      );

      return;
    }

    setPending(saved);
    void send(saved);
  }

  const firstDone =
    match &&
    (
      match.scores[0].balls.length === 6 ||
      match.scores[0].wickets === 2
    );

  const chase = match?.scores[1];

  return (
    <main className="cs-page">
      <style>{`
        .cs-page {
          --green:#08b7bc;
          --wine:#791b3e;
          min-height:100vh;
          background:#151b20;
          color:#fff;
          font-family:Arial,sans-serif;
          padding-bottom:24px;
        }

        .cs-page * {
          box-sizing:border-box;
        }

        .cs-page button,
        .cs-page input {
          font:inherit;
        }

        .cs-page button {
          cursor:pointer;
        }

        .cs-page button:disabled {
          cursor:default;
          opacity:.48;
        }

        .cs-page :focus-visible {
          outline:3px solid #ffc96a;
          outline-offset:2px;
        }

        .cs-wrap {
          max-width:880px;
          margin:auto;
        }

        .cs-header {
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:12px;
          padding:18px 14px;
          background:var(--green);
          color:white;
        }

        .cs-brand {
          font-size:clamp(14px,3vw,21px);
          font-weight:900;
          text-align:left;
        }

        .cs-balance {
          font-size:18px;
          font-weight:800;
          white-space:nowrap;
          font-variant-numeric:tabular-nums;
        }

        .cs-toolbar {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:8px;
          padding:10px 12px;
          background:#283640;
        }

        .cs-toolbar h1 {
          font-size:17px;
          margin:0;
        }

        .cs-plain {
          border:0;
          background:transparent;
          color:inherit;
          padding:7px;
          font-weight:bold;
        }

        .cs-score {
          background:linear-gradient(
            110deg,
            #143b35,
            #182920
          );
          padding:12px 14px;
        }

        .cs-team-score {
          display:grid;
          grid-template-columns:1fr auto;
          gap:8px;
          margin-bottom:8px;
          font-size:14px;
        }

        .cs-team-score strong {
          font-variant-numeric:tabular-nums;
        }

        .cs-balls {
          display:flex;
          gap:5px;
          grid-column:1/-1;
          min-height:24px;
        }

        .cs-ball {
          display:grid;
          place-items:center;
          width:25px;
          height:25px;
          border-radius:50%;
          background:var(--green);
          font-size:12px;
          font-weight:bold;
        }

        .cs-ball.w {
          background:var(--wine);
        }

        .cs-target {
          font-size:12px;
          color:#ffde9e;
          margin:4px 0;
        }

        .cs-bet-clock {
          padding:9px 14px;
          background:var(--wine);
          font-weight:bold;
          text-align:center;
          font-variant-numeric:tabular-nums;
        }

        .cs-scene {
          position:relative;
          width:100%;
          aspect-ratio:1000/730;
          background:#141313;
          overflow:hidden;
          border-top:3px solid white;
          border-bottom:3px solid white;
        }

        .cs-host {
          position:absolute;
          inset:0 0 auto;
          height:42.466%;
          overflow:hidden;
          background:#141313;
        }

        .cs-host video {
          position:absolute;
          left:0;
          top:0;
          display:block;
          width:100%;
          height:auto;
        }

        .cs-stage {
          position:absolute;
          inset:0;
          display:block;
          width:100%;
          height:100%;
          pointer-events:none;
        }

        .cs-no-video {
          padding:35px;
          text-align:center;
          font-size:12px;
          color:#ccc;
        }

        .cs-ai {
          position:absolute;
          top:8px;
          right:8px;
          font-size:8px;
          background:#0008;
          padding:3px;
          color:#ddd;
        }

        .cs-section {
          background:#43515b;
          padding:10px 12px;
          font-weight:800;
          font-size:15px;
        }

        .cs-market-row {
          display:grid;
          grid-template-columns:
            minmax(0,1fr) 90px 90px;
          border-bottom:1px solid #ccc;
          background:#fff;
          color:#27353b;
        }

        .cs-cell {
          padding:13px 12px;
          font-size:14px;
          display:flex;
          align-items:center;
        }

        .cs-back {
          background:var(--green);
          color:#fff;
        }

        .cs-lay {
          background:var(--wine);
          color:#fff;
        }

        .cs-price {
          border:0;
          border-left:1px solid #fff5;
          display:block;
          text-align:center;
          font-size:23px;
          font-weight:900;
          padding:12px 3px;
        }

        .cs-price small {
          display:block;
          font-size:9px;
          margin-top:4px;
        }

        .cs-price[aria-pressed=true] {
          box-shadow:
            inset 0 0 0 3px #ffd36d;
        }

        .cs-lay.cs-cell {
          justify-content:center;
        }

        .cs-panel {
          padding:14px;
          background:#fff;
          color:#253238;
          border-bottom:1px solid #ddd;
        }

        .cs-panel p {
          font-size:12px;
          line-height:1.7;
        }

        .cs-stake {
          display:flex;
          align-items:center;
          gap:8px;
          flex-wrap:wrap;
          margin:10px 0;
        }

        .cs-stake input {
          width:130px;
          min-width:0;
          border:1px solid #a8b4b7;
          padding:10px;
          color:#17272c;
          background:#fff;
          border-radius:4px;
        }

        .cs-quick {
          padding:7px 9px;
          border:1px solid #ccd3d5;
          border-radius:4px;
          background:#f4f8f8;
          color:#233;
        }

        .cs-confirm {
          padding:12px 18px;
          background:var(--green);
          color:white;
          font-weight:800;
          border:0;
          border-radius:5px;
        }

        .cs-alert {
          padding:12px;
          background:#fff1d0;
          color:#6b3f13;
          font-size:12px;
          line-height:1.6;
        }

        .cs-result {
          text-align:center;
          background:var(--wine);
          padding:13px;
          font-weight:900;
          font-size:18px;
        }

        .cs-record {
          padding:12px 0;
          border-bottom:1px solid #ddd;
          font-size:12px;
          line-height:1.8;
        }

        .cs-record small {
          display:block;
          color:#66747a;
        }

        .cs-footer {
          padding:14px;
          font-size:10px;
          color:#bbc4c6;
          line-height:1.7;
        }

        .cs-proof {
          font-size:10px;
          overflow-wrap:anywhere;
          white-space:pre-wrap;
        }

        @media(max-width:430px) {
          .cs-market-row {
            grid-template-columns:
              minmax(0,1fr) 76px 76px;
          }

          .cs-header {
            padding:14px 10px;
          }

          .cs-balance {
            font-size:15px;
          }
        }
      `}</style>

      <div className="cs-wrap">
        <header className="cs-header">
          <div className="cs-brand">
            TELUGU SPORTS BOOK
          </div>

          <div
            className="cs-balance"
            aria-label="Demo balance"
          >
            {data ? money(data.balance) : "…"}
          </div>
        </header>

        <div className="cs-toolbar">
          <button
            className="cs-plain"
            onClick={onBack}
            aria-label="Customer home"
          >
            ←
          </button>

          <h1>INSTANT SUPER OVER</h1>

          <a
            href="#so-rules"
            style={{
              color: "inherit",
              fontSize: 12,
            }}
          >
            Rules
          </a>
        </div>

        {error && (
          <div
            className="cs-alert"
            role="alert"
          >
            {error}
          </div>
        )}

        {!match ? (
          <div className="cs-panel">
            {error
              ? "Waiting for a valid customer session and match server."
              : "Connecting to match server…"}
          </div>
        ) : (
          <>
            <section
              className="cs-score"
              aria-label="Match scoreboard"
            >
              {match.teams.map(
                (team, i) => (
                  <div
                    className="cs-team-score"
                    key={team}
                  >
                    <span>{team}</span>

                    <strong>
                      {match.scores[i].runs}/
                      {match.scores[i].wickets}{" "}
                      <small>
                        ({match.scores[i].overs})
                      </small>
                    </strong>

                    <div className="cs-balls">
                      {match.scores[i].balls.map(
                        (v, index) => (
                          <span
                            key={index}
                            className={
                              `cs-ball ${
                                v === "W"
                                  ? "w"
                                  : ""
                              }`
                            }
                          >
                            {v}
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                ),
              )}

              {firstDone &&
                match.phase !== "RESULT" && (
                  <p className="cs-target">
                    AUSTRALIA needs{" "}
                    {Math.max(
                      0,
                      match.scores[0].runs +
                        1 -
                        chase.runs,
                    )}{" "}
                    runs from{" "}
                    {6 - chase.balls.length}
                    {" "}balls · Target{" "}
                    {match.scores[0].runs + 1}
                  </p>
                )}
            </section>

            {open && (
              <div className="cs-bet-clock">
                BETTING ·{" "}
                {seconds(
                  new Date(
                    match.closesAt,
                  ).getTime() - now,
                )}
                s
              </div>
            )}

            <CardTable
              match={match}
              now={now}
            />

            {match.result && (
              <div
                className="cs-result"
                role="status"
              >
                {match.result.winner === "TIE"
                  ? "TIE · STAKES REFUNDED"
                  : `${
                      match.teams[
                        match.result.winner
                      ]
                    } WON`}
              </div>
            )}

            <div className="cs-section">
              Bookmaker
            </div>

            <div className="cs-market-row">
              <div className="cs-cell">
                Min: 100 · Max: 25,000
              </div>

              <div className="cs-cell cs-back">
                Back
              </div>

              <div className="cs-cell cs-lay">
                Lay
              </div>
            </div>

            {match.teams.map(
              (team, i) => (
                <div
                  key={team}
                  className="cs-market-row"
                >
                  <div className="cs-cell">
                    {team}
                  </div>

                  <button
                    type="button"
                    className="cs-price cs-back"
                    disabled={
                      !open ||
                      busy ||
                      Boolean(pending)
                    }
                    aria-pressed={
                      selected &&
                      selection.team === i
                    }
                    onClick={() => {
                      setSelection({
                        matchId: match.id,
                        team: i,
                      });

                      setMessage("");
                      setBetError("");
                    }}
                  >
                    1.98
                    <small>
                      TOTAL RETURN
                    </small>
                  </button>

                  <div className="cs-cell cs-lay">
                    —
                  </div>
                </div>
              ),
            )}

            <section className="cs-panel">
              <label htmlFor="cs-stake">
                Stake
              </label>

              <div className="cs-stake">
                <input
                  id="cs-stake"
                  inputMode="numeric"
                  type="number"
                  step="1"
                  min="100"
                  max="25000"
                  value={amount}
                  disabled={
                    busy ||
                    Boolean(pending)
                  }
                  onChange={e =>
                    setAmount(e.target.value)
                  }
                />

                {[
                  100,
                  200,
                  500,
                  1000,
                  2000,
                  5000,
                  10000,
                  25000,
                ].map(n => (
                  <button
                    type="button"
                    className="cs-quick"
                    key={n}
                    disabled={
                      busy ||
                      Boolean(pending)
                    }
                    onClick={() =>
                      setAmount(String(n))
                    }
                  >
                    {n.toLocaleString("en-IN")}
                  </button>
                ))}
              </div>

              {selected && (
                <p>
                  {
                    match.teams[
                      selection.team
                    ]
                  }
                  {" · "}BACK 1.98
                  {" · "}Stake{" "}
                  {money(Number(amount))}
                </p>
              )}

              <button
                type="button"
                className="cs-confirm"
                disabled={
                  !open ||
                  !selected ||
                  !validAmount ||
                  busy ||
                  Boolean(pending)
                }
                onClick={confirm}
              >
                {busy
                  ? "CHECKING…"
                  : "CONFIRM DEMO BET"}
              </button>

              {pending && (
                <p>
                  Acceptance needs checking.{" "}
                  <button
                    type="button"
                    className="cs-quick"
                    disabled={busy}
                    onClick={() =>
                      void send(pending)
                    }
                  >
                    CHECK SAME BET
                  </button>
                </p>
              )}

              {message && (
                <p role="status">
                  {message}
                </p>
              )}

              {betError && (
                <p
                  role="alert"
                  style={{
                    color: "#791b3e",
                  }}
                >
                  {betError}
                </p>
              )}

              {!fresh && (
                <p>
                  Connection unavailable.
                  Betting is paused.
                </p>
              )}

              <p>
                Next round in{" "}
                {seconds(
                  new Date(
                    match.nextAt,
                  ).getTime() - now,
                )}
                s · {stamp(now)} IST
              </p>
            </section>

            <section className="cs-panel">
              <strong>MY BETS</strong>

              {!data.bets?.length ? (
                <p>No bets yet.</p>
              ) : (
                data.bets.slice(0, 20).map(
                  b => (
                    <div
                      className="cs-record"
                      key={b.id}
                    >
                      <strong>
                        {b.match_id}
                        {" · "}
                        {b.match_id.startsWith("C")
                          ? [
                              "INDIA",
                              "AUSTRALIA",
                            ][b.team]
                          : `Team ${
                              Number(b.team) + 1
                            }`}
                        {" · "}
                        {b.direction}
                      </strong>

                      <div>
                        Stake {money(b.amount)}
                        {" · "}
                        {b.status}

                        {b.status === "SETTLED"
                          ? ` · Returned ${
                              money(b.payout)
                            }`
                          : ""}
                      </div>

                      <small>
                        {stamp(b.created_at)} IST
                      </small>
                    </div>
                  ),
                )
              )}
            </section>

            <details
              className="cs-panel"
              id="so-rules"
            >
              <summary>
                RULES &amp; VERIFICATION
              </summary>

              <p>
                Demo coins only. This is an AI
                host video with a programmed hand
                and card animation. The card shown
                in the animated hand and its table
                slot use the same server event.
                The server shuffles 35 cards:
                five each of A, 2, 3, 4, 6, 10
                and K. Cards are drawn without
                replacement. A = 1 run,
                10 = 0 runs, K = wicket.
                Other ranks give their printed runs.
              </p>

              <p>
                Each innings has at most six cards.
                Two wickets immediately end that
                innings, including two opening Kings
                for 0/2. Australia stops as soon as
                it passes India's score. Equal runs
                are a tie regardless of wickets,
                and stakes are returned.
              </p>

              <p>
                Each round lasts 41 seconds:
                4 seconds for setup, 15 seconds
                for betting, up to 12 seconds to
                reveal cards, then at least
                10 seconds for the result.
                Early finishes leave the result
                visible until the next round.
                Betting does not reopen between
                cards. Back odds are 1.98 total
                return, including stake; fractional
                demo units are rounded down.
                Lay is unavailable. Maximum stake
                is 25,000 and maximum reserved
                per customer per round is 100,000.
              </p>

              <p>
                Deck and seed are committed before
                betting. The deck and seed are
                disclosed only after the result
                for hash verification. A commitment
                verifies that a published deck
                stayed unchanged; it is not an
                independent audit of randomness.
                Old accepted bets settle using
                their original saved rules.
              </p>

              <pre className="cs-proof">
                {JSON.stringify(
                  match.verification,
                  null,
                  2,
                )}
              </pre>
            </details>
          </>
        )}

        <footer className="cs-footer">
          Demo coins only · No real-money play ·
          AI-generated host presentation
        </footer>
      </div>
    </main>
  );
}
