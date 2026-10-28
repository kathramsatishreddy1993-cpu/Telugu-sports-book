import React, { useEffect, useRef, useState } from "react";

const SYMBOLS = {
  club: { icon: "♣", name: "CLUB" },
  crown: { icon: "♛", name: "CROWN" },
  spade: { icon: "♠", name: "SPADE" },
  diamond: { icon: "♦", name: "DIAMOND" },
  flag: { icon: "⚑", name: "FLAG" },
  heart: { icon: "♥", name: "HEART" },
};

const CHIPS = [10, 20, 50, 100, 500];
const LANKESH_SHOT_MS = 3000;
const LANKESH_IMAGE = "/games/lankesh.jpg";

const LANKESH_HEADS = [
  [237, 300, 145],
  [335, 300, 116],
  [450, 300, 76],
  [554, 300, 98],
  [654, 295, 88],
  [793, 320, 24],
  [919, 300, 88],
  [1037, 300, 76],
  [1166, 300, 90],
  [1289, 305, 128],
];

const number = value =>
  Number(value || 0).toLocaleString("en-IN");

const areaName = area =>
  SYMBOLS[area]?.name || area;

function LankeshScene({ round, now }) {
  const [failed, setFailed] = useState(false);

  const result =
    round?.phase === "RESULT"
      ? round.result
      : null;

  const winner = result
    ? Number(String(result.head).replace(/^F/, ""))
    : 0;

  const target = LANKESH_HEADS[winner - 1];

  const age = result
    ? Math.max(
        0,
        now - new Date(round.closesAt).getTime(),
      )
    : 0;

  const entrance = useRef({
    key: null,
    age: 0,
  });

  const animationKey =
    `${round?.id}:${round?.phase}`;

  if (entrance.current.key !== animationKey) {
    entrance.current = {
      key: animationKey,
      age,
    };
  }

  const initialAge = entrance.current.age;

  const landed = Boolean(
    target && age >= LANKESH_SHOT_MS,
  );

  const dx = target ? target[0] - 768 : 0;
  const dy = target ? target[1] - 790 : -490;

  const angle = target
    ? Math.atan2(dx, -dy) * 180 / Math.PI
    : 0;

  const travel = Math.max(
    0,
    Math.hypot(dx, dy) - 240,
  );

  return (
    <div className="lk-scene-wrap">
      <div className="lk-scene">
        <img
          className="lk-photo"
          src={LANKESH_IMAGE}
          alt="Ten-headed Lankesh"
          onError={() => setFailed(true)}
          hidden={failed}
        />

        {failed && (
          <div className="lk-missing">
            Upload the supplied Lankesh photo as
            public/games/lankesh.jpg
          </div>
        )}

        <svg
          className="lk-overlay"
          viewBox="0 0 1536 864"
          role="img"
          aria-label={
            landed
              ? `Arrow hit head ${winner}`
              : result
                ? "Arrow flying to the winning head"
                : "Ten numbered heads. Bow and arrow ready during betting."
          }
        >
          {LANKESH_HEADS.map(
            ([x, y, labelY], index) => (
              <g key={index}>
                {landed && winner === index + 1 && (
                  <circle
                    cx={x}
                    cy={y}
                    r="68"
                    fill="#ffde7422"
                    stroke="#ffe89d"
                    strokeWidth="9"
                  />
                )}

                <circle
                  cx={x}
                  cy={labelY + 26}
                  r="28"
                  fill={
                    landed && winner === index + 1
                      ? "#ffe89d"
                      : "#161128"
                  }
                  stroke="#e5c276"
                  strokeWidth="4"
                />

                <text
                  x={x}
                  y={labelY + 38}
                  textAnchor="middle"
                  fontSize="35"
                  fontWeight="bold"
                  fill={
                    landed && winner === index + 1
                      ? "#251734"
                      : "#ffe7a0"
                  }
                >
                  {index + 1}
                </text>
              </g>
            ),
          )}

          <g
            transform={`translate(768 790) rotate(${angle})`}
          >
            <path
              d="M-130 -150 Q0 -18 130 -150"
              fill="none"
              stroke="#ad792f"
              strokeWidth="17"
              strokeLinecap="round"
            />

            <path
              d="M-130 -150 L0 23 L130 -150"
              fill="none"
              stroke="#fff2c4"
              strokeWidth="4"
            />

            <rect
              x="-15"
              y="-20"
              width="30"
              height="41"
              rx="9"
              fill="#714228"
              stroke="#e0b46b"
              strokeWidth="4"
            />

            <g
              key={animationKey}
              className={
                result && target
                  ? landed
                    ? "lk-arrow lk-landed"
                    : "lk-arrow lk-flying"
                  : "lk-arrow"
              }
              style={{
                "--flight": `${-travel}px`,
                "--shot-age": `${-initialAge}ms`,
              }}
            >
              <path
                d="M0 -224 L0 20"
                stroke="#dfb45d"
                strokeWidth="9"
              />

              <path
                d="M0 -240 L-20 -204 L0 -213 L20 -204Z"
                fill="#f8f4da"
                stroke="#423e42"
                strokeWidth="2"
              />

              <path
                d="M0 -8 L-20 19 L0 11 L20 19Z"
                fill="#c63935"
              />
            </g>
          </g>
        </svg>
      </div>

      <p className="dg-hint" role="status">
        {landed
          ? `Arrow hit head ${winner} · F${winner} wins`
          : result
            ? "Arrow released · betting closed"
            : "Bow and arrow ready · place your bets on heads 1–10"}
      </p>
    </div>
  );
}

function JhandiBowl({ round, now }) {
  const result =
    round?.phase === "RESULT"
      ? round.result
      : null;

  const legacy =
    result && result.dice?.length !== 4;

  const revealedAt = new Date(
    round?.revealsAt || round?.closesAt || 0,
  ).getTime();

  const age = result
    ? Math.max(0, now - revealedAt)
    : 0;

  const entrance = useRef({
    key: null,
    age: 0,
  });

  const animationKey =
    `${round?.id}:${round?.phase}`;

  if (entrance.current.key !== animationKey) {
    entrance.current = {
      key: animationKey,
      age,
    };
  }

  const initialAge = entrance.current.age;
  const settled = Boolean(result && age >= 1400);

  const mode =
    result && !legacy
      ? settled
        ? "jm-settled"
        : "jm-pouring"
      : round?.phase === "SHAKING"
        ? "jm-shaking"
        : "jm-covered";

  return (
    <div
      className={`jm-machine ${mode}`}
      aria-label="Four-dice bowl shaker"
    >
      <div className="jm-tray" />

      <div
        className="jm-bowl"
        style={{
          "--pour-age": `${-initialAge}ms`,
        }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 240 170">
          <defs>
            <linearGradient
              id="jm-bowl-metal"
              x1="0"
              x2="1"
            >
              <stop stopColor="#664317" />
              <stop offset=".35" stopColor="#e4c582" />
              <stop offset=".6" stopColor="#b38b47" />
              <stop offset="1" stopColor="#59401d" />
            </linearGradient>
          </defs>

          <ellipse
            cx="120"
            cy="150"
            rx="91"
            ry="12"
            fill="#090d16"
            opacity=".6"
          />

          <path
            d="M14 56 Q22 143 103 150 L137 150 Q219 143 226 56 Z"
            fill="url(#jm-bowl-metal)"
            stroke="#f3dba5"
            strokeWidth="3"
          />

          <path
            d="M40 79 Q47 120 84 134"
            fill="none"
            stroke="#fff0bd"
            strokeWidth="8"
            strokeLinecap="round"
            opacity=".35"
          />

          <ellipse
            cx="120"
            cy="56"
            rx="106"
            ry="32"
            fill="#9a7438"
            stroke="#f4dba1"
            strokeWidth="4"
          />

          <ellipse
            cx="120"
            cy="57"
            rx="96"
            ry="24"
            fill="#382b1d"
          />

          <ellipse
            cx="120"
            cy="61"
            rx="80"
            ry="15"
            fill="#171c1b"
            opacity=".75"
          />

          {(!result || legacy) &&
            [0, 1, 2, 3].map(index => (
              <g key={index} aria-hidden="true">
                <ellipse
                  cx={76 + index * 29}
                  cy={index % 2 ? 61 : 53}
                  rx="12"
                  ry="7"
                  fill="#bd9b58"
                  stroke="#efd79b"
                  strokeWidth="2"
                />

                <path
                  d={`M${71 + index * 29} ${index % 2 ? 61 : 53}h10`}
                  stroke="#795c2f"
                  strokeWidth="2"
                />
              </g>
            ))}

          <path
            d="M14 56 Q120 111 226 56"
            fill="none"
            stroke="#f4dba1"
            strokeWidth="5"
          />

          <text
            x="120"
            y="123"
            textAnchor="middle"
            fill="#4a3018"
            fontSize="16"
            fontWeight="bold"
          >
            JHANDI
          </text>
        </svg>
      </div>

      {result && !legacy && (
        <div
          className="jm-coins"
          key={String(round.id)}
          role="group"
          aria-label="Four dice result"
        >
          {result.dice.map((symbol, index) => (
            <div
              key={index}
              className="jm-coin"
              style={{
                "--slot": index,
                "--pour-age": `${-initialAge}ms`,
              }}
            >
              <span
                className="jm-coin-face"
                role="img"
                aria-label={`Die ${index + 1}: ${areaName(symbol)}`}
              >
                {SYMBOLS[symbol]?.icon}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="jm-caption">
        {legacy
          ? "Previous six-dice round finishing. New rounds use four dice."
          : settled
            ? "Four dice on the tray · server result"
            : result
              ? "Pouring four dice onto the tray…"
              : round?.phase === "SHAKING"
                ? "Shaking four dice inside the bowl…"
                : "Four dice inside the open bowl · symbols hidden"}
      </p>
    </div>
  );
}

function readPending(key, game) {
  try {
    const value = JSON.parse(
      sessionStorage.getItem(key) || "null",
    );

    return (
      value?.game === game &&
      typeof value.body?.requestKey === "string"
    )
      ? value.body
      : null;
  } catch {
    return null;
  }
}

function savePending(key, game, body) {
  try {
    sessionStorage.setItem(
      key,
      JSON.stringify({ game, body }),
    );

    return true;
  } catch {
    return false;
  }
}

function clearPending(key) {
  try {
    sessionStorage.removeItem(key);
  } catch {}
}

function uniqueKey() {
  const bytes = new Uint8Array(20);
  window.crypto.getRandomValues(bytes);

  return Array.from(
    bytes,
    value => value.toString(16).padStart(2, "0"),
  ).join("");
}

async function api(url, options = {}) {
  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    15000,
  );

  try {
    const response = await fetch(url, {
      ...options,
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
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
    clearTimeout(timeout);
  }
}

export default function DiceGamesPage({
  game,
  user,
  onBack,
  onLogout,
}) {
  const gameId =
    game ||
    window.location.pathname
      .split("/")
      .filter(Boolean)
      .pop();

  const customerId =
    user?.id ??
    user?.customerId ??
    user?.customer_id;

  const valid =
    ["lankesh", "jhandi-munda"].includes(gameId) &&
    customerId;

  const storageKey =
    `tsb_dice_pending_v1:${customerId}:${gameId}`;

  return valid ? (
    <DiceGame
      key={storageKey}
      gameId={gameId}
      user={user}
      onBack={onBack}
      onLogout={onLogout}
      storageKey={storageKey}
    />
  ) : (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      Customer login and a valid game are required.

      <button
        type="button"
        onClick={onBack}
        className="ml-4 underline"
      >
        Back
      </button>
    </main>
  );
}

function DiceGame({
  gameId,
  user,
  onBack,
  onLogout,
  storageKey,
}) {
  const lankesh = gameId === "lankesh";
  const title = lankesh ? "LANKESH" : "JHANDI MUNDA";
  const base = `/api/dice-games/${gameId}`;

  const [rules, setRules] = useState(null);
  const [state, setState] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [draft, setDraft] = useState({});
  const [chip, setChip] = useState(10);
  const [tab, setTab] = useState("game");
  const [history, setHistory] = useState([]);

  const [pending, setPending] = useState(() =>
    readPending(storageKey, gameId),
  );

  const [busy, setBusy] = useState(false);
  const [sound, setSound] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [lastSync, setLastSync] = useState(0);

  const active = useRef(false);
  const posting = useRef(false);
  const polling = useRef(false);
  const revision = useRef(0);
  const offset = useRef(0);
  const pendingRef = useRef(pending);
  const roundRef = useRef(null);
  const sounded = useRef(null);
  const audio = useRef(null);
  const soundRef = useRef(false);
  const refreshRef = useRef(null);

  const round = state?.round;

  const rawResult =
    round?.phase === "RESULT"
      ? round.result
      : null;

  const pouring =
    !lankesh &&
    Boolean(rawResult) &&
    now <
      new Date(
        round.revealsAt || round.closesAt,
      ).getTime() + 1400;

  const shooting =
    lankesh &&
    Boolean(rawResult) &&
    now <
      new Date(round.closesAt).getTime() +
        LANKESH_SHOT_MS;

  const result =
    pouring || shooting ? null : rawResult;

  const endTime = round
    ? new Date(
        round.phase === "BETTING"
          ? round.closesAt
          : round.phase === "SHAKING"
            ? round.revealsAt
            : round.endsAt,
      ).getTime()
    : 0;

  const seconds = Math.max(
    0,
    Math.ceil((endTime - now) / 1000),
  );

  const stale =
    !lastSync ||
    Date.now() - lastSync > 5000;

  const open = Boolean(
    rules &&
    round?.phase === "BETTING" &&
    seconds > 0 &&
    !stale,
  );

  const locked =
    !open || busy || Boolean(pending);

  const total = Object.values(draft).reduce(
    (sum, value) => sum + value,
    0,
  );

  const committed = (state?.bets || []).reduce(
    (sum, bet) => sum + Number(bet.stake),
    0,
  );

  const credited = (state?.bets || []).reduce(
    (sum, bet) => sum + Number(bet.payout || 0),
    0,
  );

  const bell = () => {
    if (!soundRef.current || !audio.current) return;

    try {
      const ctx = audio.current;

      [440, 880, 1306, 1860].forEach(
        (frequency, index) => {
          const oscillator = ctx.createOscillator();
          const gain = ctx.createGain();

          oscillator.frequency.value = frequency;
          oscillator.connect(gain);
          gain.connect(ctx.destination);

          gain.gain.setValueAtTime(
            0.055 / (index + 1),
            ctx.currentTime,
          );

          gain.gain.exponentialRampToValueAtTime(
            0.0001,
            ctx.currentTime + 1.8,
          );

          oscillator.start();
          oscillator.stop(ctx.currentTime + 1.8);
        },
      );
    } catch {}
  };

  const toggleSound = () => {
    const enabled = !soundRef.current;

    soundRef.current = enabled;
    setSound(enabled);

    if (!enabled) {
      audio.current?.suspend()?.catch(() => {});
      return;
    }

    try {
      const AudioContext =
        window.AudioContext ||
        window.webkitAudioContext;

      if (!audio.current && AudioContext) {
        audio.current = new AudioContext();
      }

      audio.current
        ?.resume()
        ?.then(() => bell())
        .catch(() => {});
    } catch {}
  };

  const refresh = async () => {
    if (polling.current || posting.current) return;

    polling.current = true;

    const version = revision.current;
    const started = Date.now();

    try {
      const data = await api(`${base}/state`);

      if (
        !active.current ||
        version !== revision.current
      ) {
        return;
      }

      const finished = Date.now();

      offset.current =
        new Date(data.serverTime).getTime() -
        (started + finished) / 2;

      setNow(finished + offset.current);
      setLastSync(finished);

      if (
        roundRef.current !== null &&
        String(roundRef.current) !==
          String(data.round.id)
      ) {
        setDraft({});
        setNotice(
          "New round. Choose your bets again.",
        );
      }

      roundRef.current = data.round.id;
      setState(data);

      if (
        data.round.phase === "RESULT" &&
        sounded.current !== String(data.round.id)
      ) {
        sounded.current = String(data.round.id);
        bell();

        window.dispatchEvent(
          new Event("demo-balance-updated"),
        );
      }
    } catch (err) {
      if (
        active.current &&
        version === revision.current
      ) {
        setError(
          err.message ||
            "Unable to update round. Reconnecting…",
        );
      }
    } finally {
      polling.current = false;
    }
  };

  refreshRef.current = refresh;

  useEffect(() => {
    active.current = true;
    let cancelled = false;

    api(`${base}/rules`)
      .then(data => {
        if (!cancelled) setRules(data);
      })
      .catch(err => {
        if (!cancelled) setError(err.message);
      });

    void refreshRef.current();

    const pollTimer = setInterval(
      () => void refreshRef.current(),
      1000,
    );

    const clockTimer = setInterval(() => {
      if (active.current) {
        setNow(Date.now() + offset.current);
      }
    }, 250);

    const focused = () =>
      void refreshRef.current();

    window.addEventListener("focus", focused);

    return () => {
      cancelled = true;
      active.current = false;

      clearInterval(pollTimer);
      clearInterval(clockTimer);

      window.removeEventListener("focus", focused);
      audio.current?.close()?.catch(() => {});
    };
  }, []);

  const loadHistory = async () => {
    try {
      const data = await api(`${base}/history`);

      if (active.current) {
        setHistory(data.bets || []);
      }
    } catch (err) {
      if (active.current) setError(err.message);
    }
  };

  const add = area => {
    if (locked) return;

    if (total + committed + chip > 25000) {
      setError(
        "Maximum total stake per round is 25,000 demo coins.",
      );
      return;
    }

    setDraft(current => ({
      ...current,
      [area]: (current[area] || 0) + chip,
    }));

    setError("");
  };

  const submit = async () => {
    if (posting.current) return;

    let body = pendingRef.current;

    if (!body) {
      if (!open || total < 10) {
        setError(
          "Choose a bet while betting is open.",
        );
        return;
      }

      if (total + committed > 25000) {
        setError(
          "Maximum total stake per round is 25,000 demo coins.",
        );
        return;
      }

      if (total > Number(state.balance)) {
        setError("LOW BALANCE");
        return;
      }

      try {
        body = {
          requestKey: uniqueKey(),
          roundId: String(round.id),
          bets: Object.entries(draft).map(
            ([area, amount]) => ({ area, amount }),
          ),
        };
      } catch {
        setError(
          "A secure HTTPS browser connection is required.",
        );
        return;
      }

      if (!savePending(storageKey, gameId, body)) {
        setError(
          "Enable browser session storage to recover interrupted bets.",
        );
        return;
      }

      pendingRef.current = body;
      setPending(body);
    }

    posting.current = true;
    revision.current += 1;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const data = await api(`${base}/bets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      clearPending(storageKey);
      pendingRef.current = null;

      if (!active.current) return;

      setPending(null);
      setDraft({});

      setState(current => {
        if (!current) return current;

        const sameRound =
          String(current.round.id) ===
          String(data.bet.roundId);

        const exists = current.bets.some(
          bet =>
            String(bet.id) ===
            String(data.bet.id),
        );

        return {
          ...current,
          balance: data.balance,
          bets:
            sameRound && !exists
              ? [...current.bets, data.bet]
              : current.bets,
        };
      });

      setNotice(
        data.replayed
          ? "Previous bet recovered. No second debit."
          : "Bet accepted. Waiting for the round result.",
      );

      window.dispatchEvent(
        new Event("demo-balance-updated"),
      );
    } catch (err) {
      if (!active.current) return;

      if (
        [400, 401, 403, 404, 409, 422].includes(
          err.status,
        )
      ) {
        clearPending(storageKey);
        pendingRef.current = null;
        setPending(null);
      }

      setError(
        err.status
          ? err.message
          : "Connection interrupted. Press RETRY SAME BET to recover your bet.",
      );
    } finally {
      posting.current = false;

      if (active.current) {
        setBusy(false);
        void refreshRef.current();
      }
    }
  };

  return (
    <div className={`dg-page ${lankesh ? "dg-lankesh" : ""}`}>
      <style>{`
        .dg-page{min-height:100vh;background:radial-gradient(ellipse at top,#243c65,#080f22 75%);color:#f5f2e9;font-family:Arial,sans-serif;padding-bottom:24px}
        .dg-lankesh{background:radial-gradient(ellipse at top,#3c244b,#100f22 75%)}
        .dg-page *{box-sizing:border-box}
        .dg-page button{font:inherit;cursor:pointer}
        .dg-page button:disabled{opacity:.45;cursor:default}
        .dg-header{padding:15px;display:flex;align-items:center;gap:12px;background:#0005;border-bottom:1px solid #ffffff20}
        .dg-header h1{font-size:18px;margin:0}
        .dg-header small{display:block;font-size:10px;color:#e9cc82;margin-top:5px}
        .dg-balance{margin-left:auto;text-align:right;font-weight:bold}
        .dg-wrap{max-width:850px;padding:12px;margin:auto}
        .dg-btn{border:1px solid #ffffff30;border-radius:9px;background:#ffffff10;color:inherit;padding:10px 12px}
        .dg-tabs{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px}
        .dg-tabs [aria-pressed=true]{background:#ebce7a;color:#19243d}
        .dg-alert{background:#4a2c17;border:1px solid #dba951;color:#ffe4ab;padding:12px;border-radius:10px;font-size:13px;line-height:1.7;margin:12px 0}
        .dg-alert button{margin:6px}
        .dg-hint{color:#d0d8e8;font-size:12px;line-height:1.7}
        .dg-stage{position:relative;padding:20px 12px;background:#0004;border:1px solid #ffffff25;border-radius:16px;text-align:center;min-height:175px}
        .dg-timer{width:74px;height:74px;border-radius:50%;border:4px solid #e4c779;display:grid;place-items:center;margin:0 auto 10px;font-size:28px;font-weight:bold}
        .dg-phase{color:#ffe392;font-weight:bold;font-size:14px}
        .dg-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:14px}
        .dg-heads{grid-template-columns:repeat(5,minmax(0,1fr))}
        .dg-area{position:relative;min-height:130px;padding:12px 5px;border:1px solid #4c90b2;border-radius:13px;background:linear-gradient(#174f68,#0c1729);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px}
        .dg-heads .dg-area{min-height:105px}
        .dg-area.dg-win{border:2px solid #ffdf73;box-shadow:0 0 16px #edcb6550}
        .dg-icon{font-size:46px;line-height:1.1}
        .dg-heads .dg-icon{font-size:34px}
        .dg-area strong{font-size:11px}
        .dg-chip-tag{border-radius:20px;background:#e6c36b;color:#1c2431;padding:3px 7px;font-size:11px;font-weight:bold}
        .dg-result-tag{color:#ffe395;font-weight:bold;font-size:12px}
        .dg-controls{border:1px solid #ffffff25;background:#0003;padding:14px;border-radius:13px;margin-top:14px}
        .dg-row{display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin-top:10px}
        .dg-chip{width:46px;height:46px;border:3px dashed #ffffffaa;border-radius:50%;color:#fff;background:#22536e;font-weight:bold}
        .dg-chip[aria-pressed=true]{outline:3px solid #e6c36b;outline-offset:2px}
        .dg-submit{width:100%;padding:15px;border:0;background:#e7ca76;color:#18273b;border-radius:10px;font-weight:900;margin-top:15px}
        .dg-summary{border:1px solid #d5b867;padding:12px;border-radius:11px;margin-top:14px;text-align:center;line-height:1.8}
        .dg-recent{display:flex;gap:7px;overflow:auto;padding:9px 0}
        .dg-recent span{flex-shrink:0;background:#ffffff10;border:1px solid #ffffff25;border-radius:8px;padding:8px;font-size:12px}
        .dg-card{padding:14px;border:1px solid #ffffff25;border-radius:12px;background:#0003}
        .dg-table{width:100%;border-collapse:collapse;font-size:12px}
        .dg-table th,.dg-table td{text-align:left;border-bottom:1px solid #ffffff20;padding:10px 6px}
        .dg-table th{color:#e6cc8c}
        .dg-overflow{overflow:auto}
        .dg-page :focus-visible{outline:3px solid #ffe09a;outline-offset:3px}

        .lk-scene-wrap{margin-top:14px}
        .lk-scene{position:relative;aspect-ratio:16/9;width:100%;overflow:hidden;border-radius:12px;background:#111b21;border:1px solid #d4b37255}
        .lk-photo{display:block;width:100%;height:100%;object-fit:contain}
        .lk-photo[hidden]{display:none}
        .lk-overlay{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
        .lk-missing{position:absolute;inset:0;display:grid;place-items:center;padding:25% 12px 5%;font-size:12px;color:#f2d68a}
        .lk-flying{animation:lkShoot 3s cubic-bezier(.35,0,.8,.75) both;animation-delay:var(--shot-age)}
        .lk-landed{transform:translateY(var(--flight))}

        .jm-machine{position:relative;width:100%;max-width:420px;height:245px;margin:0 auto;overflow:hidden;isolation:isolate}
        .jm-tray{position:absolute;left:3%;bottom:42px;width:94%;height:103px;border-radius:50%;background:radial-gradient(ellipse,#266452 0%,#17483d 56%,#af8d4b 58%,#e6c57a 63%,#604821 69%,#0c1720 72%);box-shadow:0 9px 0 #0a111c,0 17px 18px #0007}
        .jm-bowl{position:absolute;z-index:4;left:50%;bottom:64px;width:210px;transform:translateX(-50%);transform-origin:14% 83%;filter:drop-shadow(0 9px 5px #0008)}
        .jm-bowl svg{display:block;width:100%;height:auto}
        .jm-shaking .jm-bowl{animation:jmShake .3s ease-in-out infinite}
        .jm-pouring .jm-bowl{animation:jmPour 1.4s ease-in-out both;animation-delay:var(--pour-age)}
        .jm-settled .jm-bowl{transform:translate(-15%,-52px) rotate(-108deg);opacity:.48}
        .jm-coins{position:absolute;inset:0;z-index:3;perspective:650px}
        .jm-coin{position:absolute;left:calc(50% - 98px + var(--slot) * 50px);bottom:70px;width:46px;height:46px;transform:rotate(calc(-12deg + var(--slot) * 8deg));filter:drop-shadow(2px 6px 3px #0008)}
        .jm-coin-face{display:grid;place-items:center;width:100%;height:100%;border-radius:11px;background:linear-gradient(135deg,#fffbe9,#e8dab1);color:#22595a;border:2px solid #c8b77f;box-shadow:3px 4px 0 #8d815d;font-size:32px;line-height:1}
        .jm-pouring .jm-coin{animation:jmDrop 1.4s ease-out both;animation-delay:var(--pour-age)}
        .jm-caption{position:absolute;left:0;right:0;bottom:0;margin:0;font-size:11px;line-height:1.6;color:#e6d7ae}

        @keyframes lkShoot {
          from{transform:translateY(0)}
          to{transform:translateY(var(--flight))}
        }

        @keyframes jmShake {
          0%,100%{transform:translate(-50%,0) rotate(-7deg)}
          25%{transform:translate(calc(-50% - 17px),-5px) rotate(9deg)}
          50%{transform:translate(calc(-50% + 14px),-8px) rotate(-8deg)}
          75%{transform:translate(calc(-50% - 9px),-2px) rotate(6deg)}
        }

        @keyframes jmPour {
          0%{transform:translateX(-50%) rotate(0);opacity:1}
          32%{transform:translate(-29%,-38px) rotate(-50deg);opacity:1}
          65%,100%{transform:translate(-15%,-52px) rotate(-108deg);opacity:.48}
        }

        @keyframes jmDrop {
          0%,30%{opacity:0;transform:translate(calc(98px - var(--slot) * 50px),-85px) rotateX(80deg) rotateZ(-90deg) scale(.6)}
          42%{opacity:1;transform:translate(calc(54px - var(--slot) * 22px),-62px) rotateX(55deg) rotateZ(80deg) scale(.8)}
          65%{opacity:1;transform:translate(0,0) rotateX(0deg) rotateZ(calc(-25deg + var(--slot) * 8deg)) scale(1)}
          78%{opacity:1;transform:translate(0,-9px) rotateX(12deg) rotateZ(calc(-12deg + var(--slot) * 8deg))}
          100%{opacity:1;transform:translate(0,0) rotateX(0deg) rotateZ(calc(-12deg + var(--slot) * 8deg))}
        }

        @media(max-width:360px) {
          .dg-wrap{padding:8px}
          .dg-grid{gap:5px}
          .dg-heads .dg-icon{font-size:28px}
          .dg-header{padding:12px 8px}
          .dg-header h1{font-size:15px}
          .dg-heads .dg-area{padding:9px 2px}
          .jm-machine{height:225px}
          .jm-bowl{width:185px}
          .jm-coin{width:40px;height:40px;left:calc(50% - 86px + var(--slot) * 44px)}
          .jm-coin-face{font-size:28px}
        }

        @media(prefers-reduced-motion:reduce) {
          .lk-flying{animation:none;transform:translateY(var(--flight))}
          .jm-shaking .jm-bowl,.jm-pouring .jm-bowl,.jm-pouring .jm-coin{animation:none}
          .jm-pouring .jm-bowl{transform:translate(-15%,-52px) rotate(-108deg);opacity:.48}
        }
      `}</style>

      <header className="dg-header">
        <button
          type="button"
          className="dg-btn"
          onClick={onBack}
          aria-label="Customer home"
        >
          ←
        </button>

        <div>
          <h1>{title}</h1>
          <small>DEMO COINS ONLY</small>
        </div>

        <div className="dg-balance">
          {state ? number(state.balance) : "…"}
          <small>
            {user?.name || user?.loginId || "Customer"}
          </small>
        </div>
      </header>

      <main className="dg-wrap">
        <nav className="dg-tabs" aria-label="Game sections">
          {["game", "rules", "history"].map(value => (
            <button
              key={value}
              type="button"
              className="dg-btn"
              aria-pressed={tab === value}
              onClick={() => {
                setTab(value);

                if (value === "history") {
                  void loadHistory();
                }
              }}
            >
              {value.toUpperCase()}
            </button>
          ))}

          <button
            type="button"
            className="dg-btn"
            aria-pressed={sound}
            onClick={toggleSound}
          >
            {sound ? "SOUND ON" : "SOUND OFF"}
          </button>
        </nav>

        {error && (
          <div className="dg-alert" role="alert">
            {error}

            <button
              type="button"
              className="dg-btn"
              onClick={() => {
                setError("");
                void refreshRef.current();

                if (!rules) {
                  api(`${base}/rules`)
                    .then(data => {
                      if (active.current) setRules(data);
                    })
                    .catch(err => {
                      if (active.current) {
                        setError(err.message);
                      }
                    });
                }
              }}
            >
              Refresh
            </button>
          </div>
        )}

        {notice && (
          <p role="status" className="dg-hint">
            {notice}
          </p>
        )}

        {pending && (
          <div className="dg-alert" role="status">
            An interrupted bet needs recovery.
            The original round and request will be used.

            <button
              type="button"
              className="dg-btn"
              disabled={busy}
              onClick={submit}
            >
              {busy ? "CHECKING…" : "RETRY SAME BET"}
            </button>
          </div>
        )}

        {tab === "game" && (
          <>
            <section
              className="dg-stage"
              aria-label="Round status"
            >
              <div className="dg-timer">
                {round ? seconds : "…"}
              </div>

              <div className="dg-phase">
                {!round
                  ? "CONNECTING…"
                  : stale
                    ? "RECONNECTING…"
                    : pouring
                      ? "POURING FOUR DICE"
                      : shooting
                        ? "ARROW RELEASED"
                        : result
                          ? "ROUND RESULT"
                          : round.phase === "SHAKING"
                            ? "SHAKING · BETTING CLOSED"
                            : seconds > 0
                              ? "BETTING OPEN"
                              : "BETTING CLOSED"}
              </div>

              <p className="dg-hint">
                Round #{round?.id || "—"} · 30 seconds betting
                {!lankesh ? " · 5 seconds shaking" : ""}
                {" · "}5 seconds result
              </p>

              {lankesh ? (
                <LankeshScene round={round} now={now} />
              ) : (
                <JhandiBowl round={round} now={now} />
              )}
            </section>

            <section
              className={`dg-grid ${lankesh ? "dg-heads" : ""}`}
              aria-label="Betting areas"
            >
              {(rules?.areas || []).map(area => {
                const accepted = (state?.bets || []).reduce(
                  (sum, bet) =>
                    sum +
                    bet.bets
                      .filter(item => item.area === area)
                      .reduce(
                        (n, item) => n + item.amount,
                        0,
                      ),
                  0,
                );

                const count =
                  result && !lankesh
                    ? result.counts[area]
                    : null;

                const multiplier = result
                  ? lankesh
                    ? result.head === area
                      ? rules.payouts.winningHead
                      : 0
                    : (
                        rules.payouts[count] ??
                        [0, 0, 3, 5, 10, 20, 100][count] ??
                        0
                      )
                  : 0;

                return (
                  <button
                    key={area}
                    type="button"
                    className={`dg-area ${multiplier > 0 ? "dg-win" : ""}`}
                    disabled={locked}
                    onClick={() => add(area)}
                    aria-label={`Bet on ${areaName(area)}`}
                  >
                    <span className="dg-icon" aria-hidden="true">
                      {lankesh ? "🧔" : SYMBOLS[area]?.icon}
                    </span>

                    <strong>{areaName(area)}</strong>

                    {draft[area] > 0 && (
                      <span className="dg-chip-tag">
                        Draft {number(draft[area])}
                      </span>
                    )}

                    {accepted > 0 && (
                      <small>Placed {number(accepted)}</small>
                    )}

                    {result && (
                      <span className="dg-result-tag">
                        {!lankesh ? `${count} dice · ` : ""}
                        {multiplier}x
                      </span>
                    )}
                  </button>
                );
              })}
            </section>

            <section
              className="dg-controls"
              aria-label="Bet controls"
            >
              <p className="dg-hint">
                Choose a chip, tap areas, then confirm your bet.
              </p>

              <div className="dg-row">
                {CHIPS.map(value => (
                  <button
                    key={value}
                    type="button"
                    className="dg-chip"
                    aria-pressed={chip === value}
                    disabled={locked}
                    onClick={() => setChip(value)}
                  >
                    {value}
                  </button>
                ))}

                <button
                  type="button"
                  className="dg-btn"
                  disabled={locked || !total}
                  onClick={() => setDraft({})}
                >
                  Clear draft
                </button>
              </div>

              <p className="dg-hint">
                Draft {number(total)} · Placed this round{" "}
                {number(committed)} · Maximum round stake 25,000
              </p>

              <button
                type="button"
                className="dg-submit"
                disabled={busy || (!pending && (!open || !total))}
                onClick={submit}
              >
                {busy
                  ? "CONFIRMING…"
                  : pending
                    ? "RETRY SAME BET"
                    : "CONFIRM BET"}
              </button>
            </section>

            {result && (
              <section className="dg-summary" role="status">
                <strong>
                  {lankesh
                    ? `Winning head: ${result.head}`
                    : "Dice result confirmed"}
                </strong>

                <div>
                  Your stake {number(committed)} · Total return{" "}
                  {number(credited)}
                </div>

                <div>
                  Net {credited - committed >= 0 ? "+" : ""}
                  {number(credited - committed)} demo coins
                </div>
              </section>
            )}

            <p className="dg-hint">
              Last results · newest first
            </p>

            <div className="dg-recent">
              {(state?.recentResults || [])
                .filter(
                  item =>
                    (!pouring && !shooting) ||
                    String(item.id) !== String(round?.id),
                )
                .map(item => (
                  <span key={item.id}>
                    #{item.id}{" "}
                    {lankesh
                      ? item.result.head
                      : item.result.dice
                          .map(area => SYMBOLS[area]?.icon)
                          .join(" ")}
                  </span>
                ))}
            </div>
          </>
        )}

        {tab === "rules" && (
          <section className="dg-card">
            <h2>Rules &amp; payouts</h2>

            <p className="dg-hint">
              All players share the same round. Betting lasts
              30 seconds. The random result is stored before
              betting opens. Jhandi Munda then has 5 seconds
              of bowl shaking with betting closed, followed
              by a 5-second result phase including the pour
              animation. Lankesh has a 5-second result phase:
              a 3-second arrow flight followed by the winning
              head highlight. Bets are accepted only by the
              server while betting is open.
            </p>

            <p className="dg-hint">
              Minimum 10 whole demo coins per selected area.
              Maximum total 25,000 per customer per round.
              Multipliers are total returns including the
              stake, rounded down to whole coins.
            </p>

            {!rules ? (
              <p className="dg-hint">Waiting for server rules…</p>
            ) : lankesh ? (
              <>
                <p className="dg-hint">
                  Select F1–F10. Each head has an equal chance.
                  The winning head returns{" "}
                  {rules.payouts.winningHead}x.
                  Other heads return zero.
                </p>

                <p className="dg-hint">
                  Example: a winning 10-coin bet returns
                  95 coins in total.
                </p>
              </>
            ) : (
              <>
                <p className="dg-hint">
                  Four independent dice are rolled from the
                  bowl onto the tray. Each die has six equally
                  likely symbols. The same symbol may appear
                  on one, two, three or all four dice. Two or
                  more matches are needed for a return.
                </p>

                <table className="dg-table">
                  <thead>
                    <tr>
                      <th>Matching dice</th>
                      <th>Total return</th>
                    </tr>
                  </thead>

                  <tbody>
                    {rules.payouts.map((value, index) => (
                      <tr key={index}>
                        <td>{index}</td>
                        <td>{value}x</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <p className="dg-hint">
                  Turn Sound on to hear the synthesized temple
                  bell when results appear.
                </p>
              </>
            )}
          </section>
        )}

        {tab === "history" && (
          <section className="dg-card">
            <h2>Your settled bets</h2>

            <button
              type="button"
              className="dg-btn"
              onClick={() => void loadHistory()}
            >
              Refresh history
            </button>

            {history.length ? (
              <div className="dg-overflow">
                <table className="dg-table">
                  <thead>
                    <tr>
                      <th>Round / Time</th>
                      <th>Your areas</th>
                      <th>Stake</th>
                      <th>Total return</th>
                    </tr>
                  </thead>

                  <tbody>
                    {history.map(bet => (
                      <tr key={bet.id}>
                        <td>
                          #{bet.roundId}
                          <br />
                          {new Date(bet.createdAt).toLocaleString(
                            "en-IN",
                            { timeZone: "Asia/Kolkata" },
                          )}
                        </td>

                        <td>
                          {bet.bets
                            .map(
                              item =>
                                `${areaName(item.area)}: ${number(item.amount)}`,
                            )
                            .join(", ")}
                          <br />

                          {lankesh
                            ? `Result ${bet.result.head}`
                            : bet.result.dice
                                .map(area => SYMBOLS[area]?.icon)
                                .join(" ")}
                        </td>

                        <td>{number(bet.stake)}</td>
                        <td>{number(bet.payout)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="dg-hint">No settled bets available.</p>
            )}
          </section>
        )}

        <footer className="dg-row">
          <button
            type="button"
            className="dg-btn"
            onClick={onBack}
          >
            ← Customer home
          </button>

          {onLogout && (
            <button
              type="button"
              className="dg-btn"
              onClick={onLogout}
            >
              Logout
            </button>
          )}
        </footer>
      </main>
    </div>
  );
}
