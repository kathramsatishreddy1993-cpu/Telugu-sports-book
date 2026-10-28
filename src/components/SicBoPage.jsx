import React, { useEffect, useRef, useState } from "react";

const CHIPS = [10, 20, 50, 100, 500];

const number = value =>
  Number(value || 0).toLocaleString("en-IN");

const areaName = area => {
  if (area === "small") return "SMALL 4–10";
  if (area === "big") return "BIG 11–17";
  if (area === "any-triple") return "ANY TRIPLE";

  const [type, value] = area.split(":");

  const names = {
    sum: "TOTAL",
    single: "SINGLE",
    double: "DOUBLE",
    triple: "TRIPLE",
    pair: "PAIR",
  };

  return `${names[type]} ${value}`;
};

function DiceFace({ value }) {
  const points = {
    1: [[50, 50]],
    2: [[25, 25], [75, 75]],
    3: [[25, 25], [50, 50], [75, 75]],
    4: [[25, 25], [75, 25], [25, 75], [75, 75]],
    5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
    6: [[25, 22], [75, 22], [25, 50], [75, 50], [25, 78], [75, 78]],
  };

  return (
    <svg
      viewBox="0 0 100 100"
      aria-label={`Die ${value || "unknown"}`}
      role="img"
    >
      <rect
        x="2"
        y="2"
        width="96"
        height="96"
        rx="17"
        fill="#f9f5e5"
        stroke="#b3c8c7"
        strokeWidth="3"
      />

      {points[value] ? (
        points[value].map(([x, y], index) => (
          <circle
            key={index}
            cx={x}
            cy={y}
            r="8"
            fill={
              value === 1 || value === 4
                ? "#b93335"
                : "#183638"
            }
          />
        ))
      ) : (
        <text
          x="50"
          y="66"
          textAnchor="middle"
          fontSize="50"
          fill="#536d70"
        >
          ?
        </text>
      )}
    </svg>
  );
}

function MixerDice({ shaking, values }) {
  return (
    <div className={`sb-machine ${shaking ? "sb-shaking" : ""}`}>
      <div className="sb-platform" />

      {shaking ? (
        <>
          <div className="sb-rotor" aria-hidden="true">
            <div className="sb-rotor-disc" />
          </div>

          <div
            className="sb-mixer"
            role="img"
            aria-label="Three dice rolling in circles on the glass bowl floor. Result hidden."
          >
            {[0, 1, 2].map(index => (
              <div
                key={index}
                className="sb-orbit"
                style={{
                  "--orbit-delay": `${-index * 0.44}s`,
                  "--roll-delay": `${-index * 0.21}s`,
                }}
              >
                <div className="sb-cube">
                  {[1, 2, 3, 4, 5, 6].map(face => (
                    <div
                      key={face}
                      className={`sb-cube-face sb-face-${face}`}
                      aria-hidden="true"
                    >
                      <DiceFace value={face} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="sb-dice">
          {values.map((value, index) => (
            <div className="sb-die" key={index}>
              <DiceFace value={value} />
            </div>
          ))}
        </div>
      )}

      <div className="sb-dome" />

      <div className="sb-machine-label">
        {shaking
          ? "ROTATING DICE MIXER"
          : "AUTOMATIC DICE SHAKER"}
      </div>
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

export default function SicBoPage({
  user,
  onBack,
  onLogout,
}) {
  const customerId =
    user?.id ??
    user?.customerId ??
    user?.customer_id;

  const storageKey =
    `tsb_sicbo_pending_v1:${customerId}`;

  return customerId ? (
    <SicBoGame
      key={storageKey}
      user={user}
      onBack={onBack}
      onLogout={onLogout}
      storageKey={storageKey}
    />
  ) : (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      Customer login required.

      <button
        onClick={onBack}
        className="ml-4 underline"
      >
        Back
      </button>
    </main>
  );
}

function SicBoGame({
  user,
  onBack,
  onLogout,
  storageKey,
}) {
  const gameId = "extra-sic-bo";
  const base = "/api/sicbo";

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

  const result =
    round?.phase === "RESULT"
      ? round.result
      : null;

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
    !open ||
    busy ||
    Boolean(pending);

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
        setNotice("New round. Choose your bets again.");
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
      if (active.current) {
        setError(err.message);
      }
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
            ([area, amount]) => ({
              area,
              amount,
            }),
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

  const shaking = round?.phase === "SHAKING";

  const previousDice =
    state?.recentResults?.[0]?.result?.dice;

  const visibleDice =
    result?.dice ||
    previousDice ||
    [null, null, null];

  const profitOdds = area => {
    if (!rules) return "…";

    const [type, value] = area.split(":");

    if (type === "sum") {
      return `1:${rules.profitOdds.sum[value]}`;
    }

    if (type === "single") {
      return "1:1 / 1:2 / 1:3";
    }

    return `1:${rules.profitOdds[type]}`;
  };

  const winningAreas = new Set(
    (state?.bets || []).flatMap(bet =>
      (bet.settlement?.areas || [])
        .filter(item => item.win)
        .map(item => item.area),
    ),
  );

  const renderArea = area => {
    const accepted = (state?.bets || []).reduce(
      (sum, bet) =>
        sum +
        bet.bets
          .filter(item => item.area === area)
          .reduce((n, item) => n + item.amount, 0),
      0,
    );

    const extra = round?.extraPay?.[area];

    return (
      <button
        key={area}
        type="button"
        className={`sb-area ${
          winningAreas.has(area) ? "sb-win" : ""
        }`}
        disabled={locked}
        aria-label={`Bet on ${areaName(area)}`}
        onClick={() => add(area)}
      >
        {extra && (
          <span className="sb-extra">
            EXTRA PROFIT ×{extra}
          </span>
        )}

        <strong>{areaName(area)}</strong>
        <small>{profitOdds(area)}</small>

        {draft[area] > 0 && (
          <span className="sb-tag">
            Draft {number(draft[area])}
          </span>
        )}

        {accepted > 0 && (
          <span className="sb-placed">
            Placed {number(accepted)}
          </span>
        )}
      </button>
    );
  };

  const groups = [
    {
      title: "BIG / SMALL / TRIPLE",
      areas: ["small", "any-triple", "big"],
      columns: "sb-three",
    },
    {
      title: "SUM OF POINTS",
      areas: Array.from(
        { length: 14 },
        (_, i) => `sum:${i + 4}`,
      ),
      columns: "sb-seven",
    },
    {
      title: "SINGLE DICE",
      areas: Array.from(
        { length: 6 },
        (_, i) => `single:${i + 1}`,
      ),
      columns: "sb-six",
    },
    {
      title: "SPECIFIC DOUBLE",
      areas: Array.from(
        { length: 6 },
        (_, i) => `double:${i + 1}`,
      ),
      columns: "sb-six",
    },
    {
      title: "SPECIFIC TRIPLE",
      areas: Array.from(
        { length: 6 },
        (_, i) => `triple:${i + 1}`,
      ),
      columns: "sb-six",
    },
    {
      title: "TWO-NUMBER COMBINATIONS",
      areas: (rules?.areas || []).filter(
        area => area.startsWith("pair:"),
      ),
      columns: "sb-five",
    },
  ];

  return (
    <div className="sb-page">
      <style>{`
        .sb-page {
          min-height:100vh;
          background:radial-gradient(ellipse at top,#146d51,#05291f 70%);
          color:#f5f2e9;
          font-family:Arial,sans-serif;
          padding-bottom:25px;
        }

        .sb-page *{box-sizing:border-box}
        .sb-page button{font:inherit;cursor:pointer}
        .sb-page button:disabled{opacity:.48;cursor:default}

        .sb-header {
          display:flex;
          align-items:center;
          gap:12px;
          padding:15px;
          background:#0005;
          border-bottom:1px solid #ffffff20;
        }

        .sb-header h1{font-size:18px;margin:0}
        .sb-header small{display:block;margin-top:5px;font-size:10px;color:#ead69b}
        .sb-wallet{margin-left:auto;text-align:right;font-weight:bold}
        .sb-wrap{max-width:900px;margin:auto;padding:12px}

        .sb-tabs,.sb-row {
          display:flex;
          gap:8px;
          flex-wrap:wrap;
          align-items:center;
          margin-bottom:12px;
        }

        .sb-row{margin-top:12px}
        .sb-btn{border:1px solid #ffffff30;background:#ffffff10;color:inherit;border-radius:8px;padding:10px 12px}
        .sb-tabs [aria-pressed=true]{background:#ecd083;color:#18382c}
        .sb-alert{background:#50301a;border:1px solid #d6ac57;color:#ffe2ac;border-radius:10px;padding:12px;font-size:13px;line-height:1.7;margin:12px 0}
        .sb-alert button{margin:6px}
        .sb-hint{font-size:12px;color:#d2e5de;line-height:1.7}

        .sb-stage {
          border:1px solid #ffffff25;
          background:linear-gradient(#184f43,#0c3129);
          border-radius:16px;
          padding:14px;
          text-align:center;
          overflow:hidden;
        }

        .sb-round-top{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:12px;color:#f4df9f}
        .sb-timer{border:3px solid #d6bc74;border-radius:50%;width:62px;height:62px;display:grid;place-items:center;font-size:24px;font-weight:bold}

        .sb-machine {
          --cube-size:44px;
          --orbit-radius:clamp(54px,21vw,96px);
          position:relative;
          height:225px;
          max-width:420px;
          margin:8px auto 0;
          isolation:isolate;
        }

        .sb-platform {
          position:absolute;
          bottom:15px;
          left:5%;
          width:90%;
          height:88px;
          background:radial-gradient(ellipse,#7caa9e 0%,#3d8174 48%,#162f2b 50%,#0a1716 70%);
          border-radius:50%;
          box-shadow:0 12px 0 #081c18,0 18px 20px #0008;
        }

        .sb-dice {
          position:absolute;
          z-index:2;
          left:19%;
          right:19%;
          bottom:60px;
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:15px;
          perspective:500px;
        }

        .sb-die {
          width:60px;
          max-width:30%;
          filter:drop-shadow(5px 8px 3px #0005);
          transform:rotate(-8deg);
        }

        .sb-die:nth-child(2){transform:rotate(9deg)}
        .sb-die svg{display:block;width:100%}

        .sb-dome {
          position:absolute;
          z-index:3;
          pointer-events:none;
          left:10%;
          bottom:40px;
          width:80%;
          height:170px;
          border-radius:49% 49% 25% 25%;
          border:2px solid #ccfff063;
          background:linear-gradient(110deg,#ffffff22 0%,transparent 25%,#ffffff08 60%,#ffffff28 85%,transparent);
          box-shadow:inset 7px 2px 15px #ffffff12,inset -5px 0 8px #dbfff012;
        }

        .sb-dome::after {
          content:'';
          position:absolute;
          left:8%;
          top:18%;
          width:13%;
          height:45%;
          border-radius:50%;
          background:linear-gradient(#ffffff45,#ffffff08);
          transform:rotate(20deg);
        }

        .sb-rotor {
          position:absolute;
          z-index:1;
          left:17%;
          bottom:20px;
          width:66%;
          height:78px;
          border-radius:50%;
          overflow:hidden;
          background:radial-gradient(ellipse,#478f7d,#183b32);
          box-shadow:inset 0 0 15px #071d17;
        }

        .sb-rotor-disc {
          position:absolute;
          left:0;
          top:-85%;
          width:100%;
          height:270%;
          border-radius:50%;
          border:3px dashed #c6dac466;
          background:repeating-conic-gradient(#cde2c533 0deg 16deg,transparent 16deg 60deg);
          animation:sbRotor .62s linear infinite;
        }

        .sb-mixer {
          position:absolute;
          inset:0;
          z-index:2;
          perspective:650px;
          pointer-events:none;
        }

        .sb-orbit {
          position:absolute;
          left:50%;
          bottom:59px;
          width:var(--cube-size);
          height:var(--cube-size);
          animation:sbOrbit 1.32s linear infinite;
          animation-delay:var(--orbit-delay);
          filter:drop-shadow(0 8px 3px #0006);
        }

        .sb-cube {
          position:relative;
          width:100%;
          height:100%;
          transform-style:preserve-3d;
          animation:sbTumble .84s linear infinite;
          animation-delay:var(--roll-delay);
        }

        .sb-cube-face {
          position:absolute;
          inset:0;
          backface-visibility:hidden;
          border-radius:8px;
          background:#f9f5e5;
        }

        .sb-cube-face svg{display:block;width:100%;height:100%}

        .sb-face-1{transform:translateZ(calc(var(--cube-size) / 2))}
        .sb-face-2{transform:rotateY(90deg) translateZ(calc(var(--cube-size) / 2))}
        .sb-face-3{transform:rotateX(90deg) translateZ(calc(var(--cube-size) / 2))}
        .sb-face-4{transform:rotateX(-90deg) translateZ(calc(var(--cube-size) / 2))}
        .sb-face-5{transform:rotateY(-90deg) translateZ(calc(var(--cube-size) / 2))}
        .sb-face-6{transform:rotateY(180deg) translateZ(calc(var(--cube-size) / 2))}

        @keyframes sbRotor {
          to{transform:rotate(360deg)}
        }

        @keyframes sbOrbit {
          0%{transform:translate(calc(-50% + var(--orbit-radius)),0) scale(.94);z-index:2}
          12.5%{transform:translate(calc(-50% + var(--orbit-radius) * .707),10px) scale(1.02);z-index:4}
          25%{transform:translate(-50%,14px) scale(1.08);z-index:5}
          37.5%{transform:translate(calc(-50% - var(--orbit-radius) * .707),10px) scale(1.02);z-index:4}
          50%{transform:translate(calc(-50% - var(--orbit-radius)),0) scale(.94);z-index:2}
          62.5%{transform:translate(calc(-50% - var(--orbit-radius) * .707),-10px) scale(.86);z-index:1}
          75%{transform:translate(-50%,-14px) scale(.82);z-index:1}
          87.5%{transform:translate(calc(-50% + var(--orbit-radius) * .707),-10px) scale(.86);z-index:1}
          100%{transform:translate(calc(-50% + var(--orbit-radius)),0) scale(.94);z-index:2}
        }

        @keyframes sbTumble {
          from{transform:rotateX(-18deg) rotateY(0deg) rotateZ(0deg)}
          to{transform:rotateX(342deg) rotateY(360deg) rotateZ(360deg)}
        }

        .sb-machine-label{position:absolute;bottom:-7px;width:100%;font-size:9px;letter-spacing:2px;color:#a6c8bc}
        .sb-section{margin-top:16px}
        .sb-section h2{font-size:11px;letter-spacing:1px;color:#ebd490;margin:0 0 8px}
        .sb-grid{display:grid;gap:5px}
        .sb-three{grid-template-columns:repeat(3,minmax(0,1fr))}
        .sb-seven{grid-template-columns:repeat(7,minmax(0,1fr))}
        .sb-six{grid-template-columns:repeat(6,minmax(0,1fr))}
        .sb-five{grid-template-columns:repeat(5,minmax(0,1fr))}

        .sb-area {
          position:relative;
          min-height:82px;
          padding:9px 3px;
          border:1px solid #72ad8e;
          border-radius:8px;
          background:#083e2d;
          color:#f5f2e9;
          display:flex;
          flex-direction:column;
          justify-content:center;
          align-items:center;
          gap:6px;
        }

        .sb-area strong{font-size:11px;overflow-wrap:anywhere}
        .sb-area small{font-size:10px;color:#c9dcbd}
        .sb-area.sb-win{border:2px solid #f3d57b;background:#4b592c}
        .sb-tag{background:#e8ce7f;color:#1c3026;padding:3px 5px;border-radius:20px;font-size:9px;font-weight:bold}
        .sb-placed{color:#f5d78c;font-size:9px}
        .sb-extra{font-size:8px;line-height:1.5;background:#9c2740;color:#fff;padding:3px;border-radius:5px}
        .sb-controls,.sb-card{padding:14px;border:1px solid #ffffff25;border-radius:13px;background:#0003;margin-top:14px}
        .sb-chip{width:46px;height:46px;border:3px dashed #ffffffaa;background:#225e76;color:#fff;border-radius:50%;font-weight:bold}
        .sb-chip[aria-pressed=true]{outline:3px solid #efd58b;outline-offset:2px}
        .sb-submit{width:100%;padding:15px;background:#ebd07f;border:0;color:#1b3b2e;border-radius:9px;font-weight:900}
        .sb-summary{margin-top:14px;border:1px solid #dfc579;border-radius:12px;padding:14px;text-align:center;line-height:1.8;background:#0003}
        .sb-summary strong{color:#ffdf93;font-size:20px}
        .sb-recent{display:flex;gap:7px;overflow:auto;padding:8px 0}
        .sb-recent span{flex-shrink:0;background:#ffffff10;border-radius:8px;padding:8px;font-size:12px}
        .sb-table{width:100%;font-size:12px;border-collapse:collapse}
        .sb-table td,.sb-table th{text-align:left;padding:10px 6px;border-bottom:1px solid #ffffff20}
        .sb-table th{color:#ecd58d}
        .sb-overflow{overflow:auto}
        .sb-page :focus-visible{outline:3px solid #ffe3a0;outline-offset:3px}

        @media(max-width:400px) {
          .sb-wrap{padding:8px}
          .sb-seven{grid-template-columns:repeat(4,minmax(0,1fr))}
          .sb-six{grid-template-columns:repeat(3,minmax(0,1fr))}
          .sb-five{grid-template-columns:repeat(3,minmax(0,1fr))}
          .sb-header h1{font-size:16px}
          .sb-machine{height:200px;--cube-size:38px;--orbit-radius:clamp(45px,20vw,76px)}
          .sb-dome{height:150px}
          .sb-area strong{font-size:10px}
          .sb-rotor{height:66px;bottom:24px}
        }

        @media(prefers-reduced-motion:reduce) {
          .sb-orbit,.sb-cube,.sb-rotor-disc{animation:none}
          .sb-orbit:nth-child(1){transform:translate(calc(-50% - var(--orbit-radius)),0)}
          .sb-orbit:nth-child(2){transform:translate(-50%,-8px)}
          .sb-orbit:nth-child(3){transform:translate(calc(-50% + var(--orbit-radius)),0)}
          .sb-cube{transform:rotateX(-18deg) rotateY(22deg)}
        }
      `}</style>

      <header className="sb-header">
        <button
          type="button"
          className="sb-btn"
          onClick={onBack}
          aria-label="Customer home"
        >
          ←
        </button>

        <div>
          <h1>EXTRA SIC BO</h1>
          <small>ANIMATED DEMO · DEMO COINS ONLY</small>
        </div>

        <div className="sb-wallet">
          {state ? number(state.balance) : "…"}
          <small>
            {user?.name || user?.loginId || "Customer"}
          </small>
        </div>
      </header>

      <main className="sb-wrap">
        <nav
          className="sb-tabs"
          aria-label="Game sections"
        >
          {["game", "rules", "history"].map(value => (
            <button
              key={value}
              type="button"
              className="sb-btn"
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
            className="sb-btn"
            aria-pressed={sound}
            onClick={toggleSound}
          >
            {sound ? "SOUND ON" : "SOUND OFF"}
          </button>
        </nav>

        {error && (
          <div className="sb-alert" role="alert">
            {error}

            <button
              type="button"
              className="sb-btn"
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
          <p role="status" className="sb-hint">
            {notice}
          </p>
        )}

        {pending && (
          <div className="sb-alert" role="status">
            An interrupted bet needs recovery. Retry uses
            the original round and request.

            <button
              type="button"
              className="sb-btn"
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
              className="sb-stage"
              aria-label="Dice machine"
            >
              <div className="sb-round-top">
                <span>
                  Round #{round?.id || "—"}
                  <br />

                  {!round
                    ? "CONNECTING…"
                    : stale
                      ? "RECONNECTING…"
                      : result
                        ? "ROUND RESULT"
                        : shaking
                          ? "SHAKING · BETTING CLOSED"
                          : seconds > 0
                            ? "BETTING OPEN"
                            : "BETTING CLOSED"}
                </span>

                <span className="sb-timer">
                  {round ? seconds : "…"}
                </span>
              </div>

              <MixerDice
                shaking={shaking}
                values={visibleDice}
              />

              <p className="sb-hint">
                {result
                  ? `Dice ${result.dice.join(" + ")} = ${result.sum}${result.triple ? " · TRIPLE" : ""}`
                  : shaking
                    ? "Dice are mixing around the bowl floor. The result appears after mixing stops."
                    : previousDice
                      ? "Previous round dice shown. New result is hidden until reveal."
                      : "Waiting for the first result. New dice remain hidden until reveal."}
              </p>
            </section>

            {rules && groups.map(group => (
              <section
                key={group.title}
                className="sb-section"
              >
                <h2>{group.title}</h2>

                <div className={`sb-grid ${group.columns}`}>
                  {group.areas
                    .filter(area =>
                      rules.areas.includes(area),
                    )
                    .map(renderArea)}
                </div>
              </section>
            ))}

            <section
              className="sb-controls"
              aria-label="Bet controls"
            >
              <p className="sb-hint">
                Choose a chip, tap betting areas, then confirm.
              </p>

              <div className="sb-row">
                {CHIPS.map(value => (
                  <button
                    key={value}
                    type="button"
                    className="sb-chip"
                    aria-pressed={chip === value}
                    disabled={locked}
                    onClick={() => setChip(value)}
                  >
                    {value}
                  </button>
                ))}

                <button
                  type="button"
                  className="sb-btn"
                  disabled={locked || !total}
                  onClick={() => setDraft({})}
                >
                  Clear draft
                </button>
              </div>

              <p className="sb-hint">
                Draft {number(total)} · Placed this round{" "}
                {number(committed)} · Maximum round stake 25,000
              </p>

              <button
                type="button"
                className="sb-submit"
                disabled={
                  busy ||
                  (!pending && (!open || !total))
                }
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
              <section
                className="sb-summary"
                role="status"
              >
                <strong>
                  Total {result.sum}
                  {result.triple
                    ? " · TRIPLE"
                    : result.sum <= 10
                      ? " · SMALL"
                      : " · BIG"}
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

            <p className="sb-hint">
              Last results · newest first
            </p>

            <div className="sb-recent">
              {(state?.recentResults || []).map(item => (
                <span key={item.id}>
                  #{item.id} · {item.result.dice.join(" / ")}
                  {" = "}{item.result.sum}
                  {item.result.triple ? " TRIPLE" : ""}
                </span>
              ))}
            </div>
          </>
        )}

        {tab === "rules" && (
          <section className="sb-card">
            <h2>Rules &amp; paytable</h2>

            <p className="sb-hint">
              All players share one round. Betting lasts
              30 seconds, followed by 10 seconds of shaking
              and 5 seconds of results. Bets are locked
              during shaking. The display is an animation;
              outcomes are generated and settled by the server.
            </p>

            <p className="sb-hint">
              Profit odds are shown as 1:X. A winning bet
              returns its stake plus profit. Losing areas
              return zero. Minimum 10 whole demo coins per
              selected area; maximum total 25,000 per customer
              per round.
            </p>

            <p className="sb-hint">
              Small is 4–10; Big is 11–17. All triples lose
              on Small, Big and Sum bets. A specific double
              also wins when all three dice show that face.
              A two-number pair wins when both distinct
              numbers appear.
            </p>

            {rules && (
              <>
                <table className="sb-table">
                  <thead>
                    <tr>
                      <th>Bet</th>
                      <th>Profit odds</th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr>
                      <td>Small / Big</td>
                      <td>1:1</td>
                    </tr>
                    <tr>
                      <td>Any triple</td>
                      <td>1:{rules.profitOdds["any-triple"]}</td>
                    </tr>
                    <tr>
                      <td>Specific triple</td>
                      <td>1:{rules.profitOdds.triple}</td>
                    </tr>
                    <tr>
                      <td>Specific double</td>
                      <td>1:{rules.profitOdds.double}</td>
                    </tr>
                    <tr>
                      <td>Two-number pair</td>
                      <td>1:{rules.profitOdds.pair}</td>
                    </tr>
                    <tr>
                      <td>Single face on 1 / 2 / 3 dice</td>
                      <td>1:1 / 1:2 / 1:3</td>
                    </tr>

                    {Object.entries(rules.profitOdds.sum).map(
                      ([sum, odds]) => (
                        <tr key={sum}>
                          <td>Total {sum}</td>
                          <td>1:{odds}</td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>

                <h3>Demo Extra Pay</h3>

                <p className="sb-hint">
                  Two eligible areas receive 2x or 3x profit
                  odds. These signs appear only after betting
                  closes. Extra Pay multiplies the profit,
                  while the stake is returned once. Example:
                  10 coins at profit odds 1:5 with Extra Pay
                  2x returns 10 + (10 × 5 × 2) = 110 total coins.
                </p>
              </>
            )}
          </section>
        )}

        {tab === "history" && (
          <section className="sb-card">
            <h2>Your settled bets</h2>

            <button
              type="button"
              className="sb-btn"
              onClick={() => void loadHistory()}
            >
              Refresh history
            </button>

            {history.length ? (
              <div className="sb-overflow">
                <table className="sb-table">
                  <thead>
                    <tr>
                      <th>Round / Time</th>
                      <th>Bets / Result</th>
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
                          {bet.result.dice.join(" + ")}
                          {" = "}{bet.result.sum}
                        </td>

                        <td>{number(bet.stake)}</td>
                        <td>{number(bet.payout)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="sb-hint">
                No settled bets available.
              </p>
            )}
          </section>
        )}

        <footer className="sb-row">
          <button
            type="button"
            className="sb-btn"
            onClick={onBack}
          >
            ← Customer home
          </button>

          {onLogout && (
            <button
              type="button"
              className="sb-btn"
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
