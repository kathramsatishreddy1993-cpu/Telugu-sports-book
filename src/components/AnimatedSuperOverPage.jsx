import React, { useEffect, useRef, useState } from "react";

export {
  default as AnimatedSuperOverLobby,
} from "./CricketMatchList";

const API = "/api/animated-cricket";

const money = value =>
  value !== null &&
  value !== undefined &&
  Number.isFinite(Number(value))
    ? `₹${Number(value).toLocaleString("en-IN", {
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
        new Error(data.error || "Request failed."),
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
    byte => byte.toString(16).padStart(2, "0"),
  ).join("");
}

function Host() {
  const videoRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !ready || failed) return;

    // Only use the original empty-table portion.
    const duration = Number.isFinite(video.duration)
      ? video.duration
      : 10;

    const start = duration >= 1.6 ? 0.1 : 0;

    const end =
      duration >= 1.6
        ? 1.6
        : Math.max(0.1, duration - 0.1);

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
  }, [ready, failed]);

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
          className="cs-video-play"
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

export function scoreValue(card) {
  return {
    A: 1,
    2: 2,
    3: 3,
    4: 4,
    6: 6,
    10: 0,
    K: "W",
  }[card.rank];
}

export function tableCardPose(card, age) {
  const first = card.team === 0;

  const targetX = first
    ? 440 + (card.ball - 1) * 73
    : 402 + (card.ball - 1) * 84;

  const targetY = first ? 488 : 568;

  const progress = Math.min(
    1,
    Math.max(0, age / 700),
  );

  const eased =
    1 - Math.pow(1 - progress, 3);

  return {
    x:
      925 +
      (targetX - 925) * eased,

    y:
      435 +
      (targetY - 435) * eased -
      Math.sin(progress * Math.PI) * 28,

    skew: first ? -0.23 : -0.30,
    scaleY: first ? 0.40 : 0.54,
    width: first ? 58 : 70,
  };
}

export function CardTable({ match, now }) {
  const start = new Date(
    match.roundStartAt,
  ).getTime();

  const events = (match.events || [])
    .filter(card => now >= start + card.at)
    .sort((a, b) => a.index - b.index);

  const team = events.at(-1)?.team ?? 0;

  const innings = events
    .filter(card => card.team === team)
    .slice(0, 6);

  return (
    <section
      className="cs-scene"
      aria-label="Host video and current innings scores"
    >
      <Host />

      <svg
        className="cs-table-cards"
        viewBox="0 0 1280 720"
        role="img"
        aria-label="Server cards on the original video table"
      >
        {events.map(card => {
          const pose = tableCardPose(
            card,
            now - start - card.at,
          );

          const color =
            card.rank === "K"
              ? "#791b3e"
              : "#151515";

          return (
            <g
              key={`${match.id}:${card.index}`}
              data-table-team={card.team}
              data-table-ball={card.ball}
              data-table-rank={card.rank}
              transform={
                `matrix(1 0 ${pose.skew} ` +
                `${pose.scaleY} ${pose.x} ${pose.y})`
              }
            >
              <title>
                {`${match.teams[card.team]} ball ${
                  card.ball
                }: ${card.rank}, ${
                  scoreValue(card) === "W"
                    ? "wicket"
                    : `${scoreValue(card)} runs`
                }`}
              </title>

              <rect
                width={pose.width}
                height="84"
                rx="3"
                fill="#fffbee"
                stroke="#b5aa94"
                strokeWidth="1.5"
              />

              <text
                x="5"
                y="23"
                fill={color}
                fontSize="21"
                fontWeight="bold"
              >
                {card.rank}
              </text>

              <text
                x={pose.width / 2}
                y="56"
                fill={color}
                fontSize="24"
                textAnchor="middle"
              >
                ♠
              </text>

              <text
                x="5"
                y="23"
                transform={
                  `rotate(180 ${pose.width / 2} 42)`
                }
                fill={color}
                fontSize="21"
                fontWeight="bold"
              >
                {card.rank}
              </text>
            </g>
          );
        })}
      </svg>

      {innings.length > 0 && (
        <div
          className="cs-side-scores"
          aria-label={`${match.teams[team]} ball scores`}
        >
          {innings.map(card => {
            const value = scoreValue(card);

            return (
              <span
                key={`${match.id}:${card.index}`}
                className={
                  `cs-side-ball ${
                    value === "W"
                      ? "cs-side-wicket"
                      : ""
                  }`
                }
                data-team={team}
                data-ball={card.ball}
                data-score={value}
                aria-label={
                  `${match.teams[team]} ball ${card.ball}: ` +
                  (
                    value === "W"
                      ? "wicket"
                      : `${value} runs`
                  )
                }
              >
                {value}
              </span>
            );
          })}
        </div>
      )}
    </section>
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

        if (account.current !== value.customerId) {
          account.current = value.customerId;

          setSelection(null);
          setMessage("");
          setBetError("");

          const saved = store.get(
            keyFor(value.customerId),
          );

          setPending(
            saved?.customerId === value.customerId &&
              typeof saved.body?.requestKey === "string"
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
          server: new Date(value.serverTime).getTime(),
          local: performance.now(),
        };

        received.current = performance.now();
        dataRef.current = value;

        setData(value);
        setNow(anchor.current.server);
        setError("");
      } catch (failure) {
        if (alive) {
          setError(
            failure.name === "AbortError"
              ? "Connection timed out. Retrying…"
              : failure.message,
          );

          if (
            failure.status === 401 ||
            failure.status === 403
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
      performance.now() - received.current < 2500,
  );

  const open = Boolean(
    fresh &&
      match?.phase === "BETTING" &&
      now >= new Date(match.opensAt).getTime() &&
      now < new Date(match.closesAt).getTime(),
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
      const result = await api("/bets", saved.body);

      store.remove(keyFor(saved.customerId));

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
    } catch (failure) {
      if (
        mounted.current &&
        account.current === saved.customerId
      ) {
        const definite = [
          400, 401, 403, 404, 409, 422,
        ].includes(failure.status);

        if (definite) {
          store.remove(keyFor(saved.customerId));
          setPending(null);
        }

        setBetError(
          definite
            ? failure.message
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

    if (Number(amount) > Number(data.balance)) {
      setBetError("Insufficient demo coins.");
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

    if (!store.set(keyFor(data.customerId), saved)) {
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

        .cs-page * { box-sizing:border-box; }

        .cs-page button,
        .cs-page input { font:inherit; }

        .cs-page button { cursor:pointer; }

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
          color:#fff;
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
            110deg,#143b35,#182920
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
          background:#141313;
          border-top:1px solid #ffffff33;
          border-bottom:1px solid #ffffff33;
        }

        .cs-host {
          position:relative;
          width:100%;
          aspect-ratio:16/9;
          background:#141313;
        }

        .cs-host video {
          display:block;
          width:100%;
          height:100%;
          object-fit:contain;
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

        .cs-video-play {
          position:absolute;
          bottom:8px;
          left:8px;
          z-index:5;
          padding:8px 12px;
          border:1px solid #fff;
          border-radius:4px;
          background:#fff;
          color:#253238;
          font-weight:bold;
        }

        .cs-table-cards {
          position:absolute;
          inset:0;
          display:block;
          width:100%;
          height:100%;
          pointer-events:none;
        }

        .cs-side-scores {
          position:absolute;
          left:6px;
          top:6px;
          display:flex;
          flex-direction:column;
          gap:3px;
          pointer-events:none;
        }

        .cs-side-ball {
          display:grid;
          place-items:center;
          width:clamp(20px,4.5vw,32px);
          height:clamp(20px,4.5vw,32px);
          border:1px solid #f1b0bd;
          border-radius:50%;
          background:radial-gradient(
            circle at 35% 25%,
            #bd496c,
            #791b3e 70%
          );
          box-shadow:0 2px 2px #0008;
          color:#fff;
          font-size:clamp(11px,2.6vw,18px);
          font-weight:900;
          line-height:1;
        }

        .cs-side-wicket {
          background:radial-gradient(
            circle at 35% 25%,
            #ed6f76,
            #a41e2d 70%
          );
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
          border-left:1px solid #ffffff55;
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
          box-shadow:inset 0 0 0 3px #ffd36d;
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
          color:#fff;
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
            type="button"
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
          <div className="cs-alert" role="alert">
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
              {match.teams.map((team, index) => (
                <div
                  className="cs-team-score"
                  key={team}
                >
                  <span>{team}</span>

                  <strong>
                    {match.scores[index].runs}/
                    {match.scores[index].wickets}{" "}
                    <small>
                      ({match.scores[index].overs})
                    </small>
                  </strong>

                  <div className="cs-balls">
                    {match.scores[index].balls.map(
                      (value, ballIndex) => (
                        <span
                          key={ballIndex}
                          className={
                            `cs-ball ${
                              value === "W" ? "w" : ""
                            }`
                          }
                        >
                          {value}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              ))}

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
                    {6 - chase.balls.length} balls
                    {" · "}Target{" "}
                    {match.scores[0].runs + 1}
                  </p>
                )}
            </section>

            {open && (
              <div className="cs-bet-clock">
                BETTING ·{" "}
                {seconds(
                  new Date(match.closesAt).getTime() -
                    now,
                )}
                s
              </div>
            )}

            <CardTable match={match} now={now} />

            {match.result && (
              <div className="cs-result" role="status">
                {match.result.winner === "TIE"
                  ? "TIE · STAKES REFUNDED"
                  : `${match.teams[match.result.winner]} WON`}
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

            {match.teams.map((team, index) => (
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
                    selection.team === index
                  }
                  onClick={() => {
                    setSelection({
                      matchId: match.id,
                      team: index,
                    });

                    setMessage("");
                    setBetError("");
                  }}
                >
                  1.98
                  <small>TOTAL RETURN</small>
                </button>

                <div className="cs-cell cs-lay">
                  —
                </div>
              </div>
            ))}

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
                  disabled={busy || Boolean(pending)}
                  onChange={event =>
                    setAmount(event.target.value)
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
                ].map(value => (
                  <button
                    type="button"
                    className="cs-quick"
                    key={value}
                    disabled={
                      busy || Boolean(pending)
                    }
                    onClick={() =>
                      setAmount(String(value))
                    }
                  >
                    {value.toLocaleString("en-IN")}
                  </button>
                ))}
              </div>

              {selected && (
                <p>
                  {match.teams[selection.team]}
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
                    onClick={() => void send(pending)}
                  >
                    CHECK SAME BET
                  </button>
                </p>
              )}

              {message && (
                <p role="status">{message}</p>
              )}

              {betError && (
                <p
                  role="alert"
                  style={{ color: "#791b3e" }}
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
                  new Date(match.nextAt).getTime() -
                    now,
                )}
                s · {stamp(now)} IST
              </p>
            </section>

            <section className="cs-panel">
              <strong>MY BETS</strong>

              {!data.bets?.length ? (
                <p>No bets yet.</p>
              ) : (
                data.bets.slice(0, 20).map(bet => (
                  <div
                    className="cs-record"
                    key={bet.id}
                  >
                    <strong>
                      {bet.match_id}
                      {" · "}
                      {bet.match_id.startsWith("C")
                        ? ["INDIA", "AUSTRALIA"][bet.team]
                        : `Team ${Number(bet.team) + 1}`}
                      {" · "}
                      {bet.direction}
                    </strong>

                    <div>
                      Stake {money(bet.amount)}
                      {" · "}
                      {bet.status}
                      {bet.status === "SETTLED"
                        ? ` · Returned ${money(bet.payout)}`
                        : ""}
                    </div>

                    <small>
                      {stamp(bet.created_at)} IST
                    </small>
                  </div>
                ))
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
                Demo coins only. The host video is
                a presentation only. Cards placed on
                the table and the vertical score circles
                use the same server events.
                A = 1, 2 = 2, 3 = 3, 4 = 4,
                6 = 6, 10 = 0, K = W.
                Recorded hand movements do not
                determine the result.
              </p>

              <p>
                The server shuffles 35 cards:
                five each of A, 2, 3, 4, 6, 10
                and K. Cards are drawn without
                replacement.
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
