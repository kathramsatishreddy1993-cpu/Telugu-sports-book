import React, { useEffect, useRef, useState } from "react";

const CHIPS = [10, 20, 50, 100, 500];
const NUMBERS = ["1", "2", "5", "10", "20", "40"];

const ALLOWED_SEGMENTS = new Set([
  ...NUMBERS,
  "2x",
  "7x",
]);

const COINS = value =>
  Number(value || 0).toLocaleString("en-IN");

const COLORS = {
  "1": "#37b8d5",
  "2": "#d7b733",
  "5": "#35a66b",
  "10": "#6583d8",
  "20": "#cf4388",
  "40": "#c44d42",
  "2x": "#f1d58c",
  "7x": "#b67bea",
};

function Wheel({ segments, wheelRef, rotation }) {
  const width = 360 / segments.length;

  const point = angle =>
    `${200 + 189 * Math.cos(angle * Math.PI / 180)},${
      200 + 189 * Math.sin(angle * Math.PI / 180)
    }`;

  return (
    <div className="dw-wheel-box">
      <span className="dw-pointer" aria-hidden="true">
        ▼
      </span>

      <svg
        ref={wheelRef}
        viewBox="0 0 400 400"
        className="dw-wheel"
        style={{ transform: `rotate(${rotation}deg)` }}
        role="img"
        aria-label={`${segments.length}-segment Dream Wheel`}
      >
        <circle
          cx="200"
          cy="200"
          r="197"
          fill="#142332"
          stroke="#e6c681"
          strokeWidth="6"
        />

        {segments.map((value, index) => {
          const start = index * width - 90;
          const end = start + width;

          const middle =
            (start + width / 2) * Math.PI / 180;

          const x = 200 + 150 * Math.cos(middle);
          const y = 200 + 150 * Math.sin(middle);

          return (
            <g key={index}>
              <path
                d={`M200,200 L${point(start)} A189,189 0 0 1 ${point(end)} Z`}
                fill={COLORS[value]}
                stroke="#102233"
                strokeWidth="1"
              />

              <text
                x={x}
                y={y}
                fill="#fff"
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={value.length > 1 ? 9 : 12}
                fontWeight="900"
                transform={`rotate(${
                  index * width + width / 2
                },${x},${y})`}
              >
                {value}
              </text>
            </g>
          );
        })}

        <circle
          cx="200"
          cy="200"
          r="118"
          fill="#162b4a"
          stroke="#eed795"
          strokeWidth="6"
        />

        <circle
          cx="200"
          cy="200"
          r="99"
          fill="#702a4a"
          stroke="#e5b46a"
          strokeWidth="2"
        />

        <text
          x="200"
          y="193"
          textAnchor="middle"
          fill="#fff1be"
          fontSize="29"
          fontWeight="900"
        >
          DREAM
        </text>

        <text
          x="200"
          y="225"
          textAnchor="middle"
          fill="#fff1be"
          fontSize="25"
          fontWeight="900"
        >
          WHEEL
        </text>

        <circle
          cx="200"
          cy="253"
          r="9"
          fill="#e6c681"
        />
      </svg>
    </div>
  );
}

function AIHost({ pushing }) {
  const [missing, setMissing] = useState(false);

  return (
    <div
      className="dw-host"
      role="img"
      aria-label="AI woman host"
      data-host-pose={pushing ? "push" : "released"}
    >
      {missing ? (
        <span className="dw-host-missing">
          Upload dream-host.png
        </span>
      ) : (
        <>
          <div
            className={`dw-host-frame dw-host-rest ${
              pushing ? "dw-pose-hidden" : ""
            }`}
          >
            <img
              src="/games/dream-host.png"
              alt=""
              onError={() => setMissing(true)}
            />
          </div>

          <div
            className={`dw-host-frame dw-host-push ${
              pushing ? "" : "dw-pose-hidden"
            }`}
          >
            <img
              src="/games/dream-host.png"
              alt=""
              onError={() => setMissing(true)}
            />
          </div>
        </>
      )}
    </div>
  );
}

function hostIsPushing(round, now) {
  if (
    round?.phase !== "SPINNING" ||
    !round.spinEndsAt
  ) {
    return false;
  }

  const elapsed =
    now - (Date.parse(round.spinEndsAt) - 10000);

  return elapsed >= 0 && elapsed < 1200;
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

export default function DreamWheelPage({
  user,
  onBack,
  onLogout,
}) {
  const customerId =
    user?.id ?? user?.customerId ?? user?.customer_id;

  const storageKey =
    `tsb_dream_pending_v1:${customerId}`;

  return customerId ? (
    <DreamGame
      key={storageKey}
      {...{ user, onBack, onLogout, storageKey }}
    />
  ) : (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      Customer login required.

      <button
        type="button"
        className="ml-4 underline"
        onClick={onBack}
      >
        Back
      </button>
    </main>
  );
}

function DreamGame({
  user,
  onBack,
  onLogout,
  storageKey,
}) {
  const gameId = "dream-wheel";
  const base = "/api/dream-wheel";

  const [rules, setRules] = useState(null);
  const [state, setState] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [draft, setDraft] = useState({});
  const [chip, setChip] = useState(10);
  const [tab, setTab] = useState("game");
  const [history, setHistory] = useState([]);

  const [pending, setPending] = useState(
    () => readPending(storageKey, gameId),
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

  const result = ["RESULT", "FINISHED"].includes(
    round?.phase,
  )
    ? round.result
    : null;

  const endTime = round
    ? new Date(
        round.phase === "WAITING"
          ? round.opensAt
          : round.phase === "BETTING"
            ? round.closesAt
            : round.phase === "SPINNING"
              ? round.spinEndsAt
              : round.endsAt || 0,
      ).getTime()
    : 0;

  const seconds = Math.max(
    0,
    Math.ceil((endTime - now) / 1000),
  );

  const stale =
    !lastSync || Date.now() - lastSync > 5000;

  const open = Boolean(
    rules &&
      round?.phase === "BETTING" &&
      seconds > 0 &&
      !stale,
  );

  const locked = !open || busy || Boolean(pending);

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
        window.AudioContext || window.webkitAudioContext;

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
          String(data.round?.id)
      ) {
        setDraft({});
        setNotice("New round. Choose your bets again.");
      }

      roundRef.current = data.round?.id ?? null;
      setState(data);

      if (
        data.round?.phase === "RESULT" &&
        sounded.current !== String(data.round?.id)
      ) {
        sounded.current = String(data.round?.id);

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

    const focused = () => void refreshRef.current();

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
        setError("Choose a bet while betting is open.");
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
          String(current.round?.id) ===
          String(data.bet.roundId);

        const exists = current.bets.some(
          bet => String(bet.id) === String(data.bet.id),
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

  const wheelRef = useRef(null);
  const angle = useRef(0);
  const pauseUntil = useRef(0);
  const phaseRef = useRef(null);
  const spinEndRef = useRef(0);

  spinEndRef.current =
    Date.parse(round?.spinEndsAt || "") || 0;

  phaseRef.current = round?.phase;

  const lastLanding = useRef("");

  const [shownSpin, setShownSpin] = useState(null);
  const [landed, setLanded] = useState(false);

  const [verification, setVerification] =
    useState("");

  const revealedCount =
    round?.revealedSpins?.length || 0;

  const roundId = round?.id;

  const segments = (rules?.segments || []).filter(
    value => ALLOWED_SEGMENTS.has(value),
  );

  useEffect(() => {
    let frame;
    let previous = 0;

    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const animate = time => {
      const elapsed = previous
        ? Math.min(time - previous, 50)
        : 0;

      previous = time;

      if (
        !reduced &&
        phaseRef.current === "SPINNING" &&
        time >= pauseUntil.current &&
        wheelRef.current
      ) {
        const remaining =
          spinEndRef.current -
          (Date.now() + offset.current);

        const speed =
          remaining > 3000
            ? 0.3
            : 0.015 +
              0.285 *
                Math.pow(
                  Math.max(0, remaining) / 3000,
                  2,
                );

        angle.current += elapsed * speed;

        wheelRef.current.style.transition = "none";
        wheelRef.current.style.transform =
          `rotate(${angle.current}deg)`;
      }

      frame = window.requestAnimationFrame(animate);
    };

    frame = window.requestAnimationFrame(animate);

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!roundId || !segments.length) {
      return undefined;
    }

    const key = `${roundId}:${revealedCount}`;

    if (key === lastLanding.current) {
      return undefined;
    }

    lastLanding.current = key;

    if (!revealedCount) {
      setShownSpin(null);
      setLanded(false);
      setVerification("");

      return undefined;
    }

    const spin =
      round.revealedSpins[revealedCount - 1];

    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    setLanded(false);

    const source = rules.segments;

    const landedSegment = source
      .slice(0, spin.segment + 1)
      .filter(value =>
        ALLOWED_SEGMENTS.has(value),
      ).length - 1;

    if (
      !ALLOWED_SEGMENTS.has(spin.value) ||
      segments[landedSegment] !== spin.value
    ) {
      setShownSpin(spin);
      setLanded(false);

      setError(
        "This round uses the earlier 1–40 setup. Finish it, then choose only 1, 2, 5, 10, 20 or 40 in the controller.",
      );

      return undefined;
    }

    const desired =
      (
        360 -
        (landedSegment + 0.5) *
          360 / segments.length
      ) % 360;

    const current =
      ((angle.current % 360) + 360) % 360;

    angle.current +=
      (desired - current + 360) % 360;

    pauseUntil.current =
      performance.now() + (reduced ? 0 : 1350);

    if (wheelRef.current) {
      wheelRef.current.style.transition =
        reduced
          ? "none"
          : "transform .7s cubic-bezier(.1,.7,.2,1)";

      wheelRef.current.style.transform =
        `rotate(${angle.current}deg)`;
    }

    if (reduced) {
      setShownSpin(spin);
      setLanded(true);
      bell();

      return undefined;
    }

    const timer = setTimeout(() => {
      if (active.current) {
        setShownSpin(spin);
        setLanded(true);
        bell();
      }
    }, 720);

    return () => {
      clearTimeout(timer);

      if (lastLanding.current === key) {
        lastLanding.current = "";
      }
    };
  }, [roundId, revealedCount, segments.length]);

  const verifyPlan = async () => {
    if (!round?.proof) return;

    const proofRoundId = String(round.id);

    try {
      const plan = round.proof.plan.map(step => ({
        value: step.value,
        segment: Number(step.segment),
      }));

      const bytes = new TextEncoder().encode(
        JSON.stringify(plan) +
          ":" +
          round.proof.salt,
      );

      const hash = await window.crypto.subtle.digest(
        "SHA-256",
        bytes,
      );

      const hex = Array.from(
        new Uint8Array(hash),
        value =>
          value.toString(16).padStart(2, "0"),
      ).join("");

      if (
        active.current &&
        String(roundRef.current) === proofRoundId
      ) {
        setVerification(
          hex === round.proof.commitment
            ? "Locked plan hash matches."
            : "Plan hash does not match.",
        );
      }
    } catch {
      if (
        active.current &&
        String(roundRef.current) === proofRoundId
      ) {
        setVerification(
          "Verification needs a secure HTTPS browser.",
        );
      }
    }
  };

  const displayPhase = !round
    ? "WAITING FOR A CONTROLLER ROUND"
    : stale
      ? "RECONNECTING…"
      : round.phase === "WAITING"
        ? "BETTING STARTS SOON"
        : round.phase === "BETTING"
          ? seconds > 0
            ? "BETTING OPEN"
            : "BETTING CLOSED"
          : round.phase === "SPINNING"
            ? "SPINNING · BETTING CLOSED"
            : round.phase === "RESULT"
              ? "ROUND RESULT"
              : "WAITING FOR NEXT ROUND";

  const finalLanded = Boolean(
    result &&
      landed &&
      shownSpin?.value === result.winner,
  );

  const renderArea = area => {
    const accepted = (state?.bets || []).reduce(
      (sum, bet) =>
        sum +
        bet.bets
          .filter(item => item.area === area)
          .reduce(
            (subtotal, item) =>
              subtotal + item.amount,
            0,
          ),
      0,
    );

    const win =
      finalLanded && result.winner === area;

    return (
      <button
        key={area}
        type="button"
        className={`dw-area ${win ? "dw-win" : ""}`}
        style={{ "--dw-color": COLORS[area] }}
        disabled={locked}
        aria-label={`Bet on ${area}`}
        onClick={() => add(area)}
      >
        <strong>{area}</strong>
        <small>PROFIT 1:{area}</small>

        {draft[area] > 0 && (
          <span className="dw-tag">
            Draft {COINS(draft[area])}
          </span>
        )}

        {accepted > 0 && (
          <span className="dw-placed">
            Placed {COINS(accepted)}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="dw-page">
      <style>{`
        .dw-page{min-height:100vh;background:#120f20;color:#f7f1e4;font-family:Arial,sans-serif;padding-bottom:25px}
        .dw-page *{box-sizing:border-box}
        .dw-page button{font:inherit;cursor:pointer}
        .dw-page button:disabled{opacity:.45;cursor:default}
        .dw-header{display:flex;gap:12px;align-items:center;padding:15px;background:#211427;border-bottom:1px solid #d6b66b55}
        .dw-header h1{font-size:19px;color:#f0d48b;margin:0}
        .dw-header small{display:block;font-size:9px;color:#e2c9ad;margin-top:5px}
        .dw-wallet{margin-left:auto;text-align:right;font-weight:bold}
        .dw-wrap{max-width:900px;margin:auto;padding:12px}
        .dw-tabs,.dw-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px}
        .dw-row{margin-top:12px}
        .dw-btn{padding:10px 12px;border:1px solid #ffffff30;border-radius:8px;background:#ffffff10;color:inherit}
        .dw-tabs [aria-pressed=true]{background:#e8ca7c;color:#302233}
        .dw-alert{border:1px solid #d6ae60;background:#50321e;color:#ffe5ad;padding:12px;border-radius:10px;font-size:13px;line-height:1.7;margin:12px 0}
        .dw-alert button{margin:6px}
        .dw-hint{font-size:12px;line-height:1.7;color:#d5c9de}
        .dw-studio{position:relative;border:2px solid #b99755;border-radius:16px;overflow:hidden;padding:17px 10px 10px;background:radial-gradient(ellipse at center,#ac3159,#54172c 55%,#291528);box-shadow:inset 0 0 50px #0008}
        .dw-studio::before,.dw-studio::after{content:'';position:absolute;top:15px;bottom:15px;width:7px;background:radial-gradient(circle,#ffeab4 0 3px,transparent 4px) 0 0/7px 24px;filter:drop-shadow(0 0 5px #ffd885)}
        .dw-studio::before{left:5px}
        .dw-studio::after{right:5px}
        .dw-stage-row{display:flex;align-items:flex-end;justify-content:center;gap:0;min-height:210px;position:relative}
        .dw-wheel-box{position:relative;width:70%;max-width:460px;align-self:center;z-index:1;flex-shrink:0}
        .dw-wheel{display:block;width:100%;will-change:transform}
        .dw-pointer{position:absolute;z-index:3;top:-11px;left:50%;transform:translateX(-50%);font-size:31px;color:#ffe3a3;text-shadow:0 3px 3px #000}
        .dw-host{position:relative;width:38%;flex-shrink:0;margin-left:-8%;aspect-ratio:3/4;align-self:flex-end;z-index:2;pointer-events:none}
        .dw-host-frame{position:absolute;inset:0;overflow:hidden;opacity:1;transition:opacity .18s ease}
        .dw-host-frame img{display:block;position:absolute;top:0;left:0;width:200%;height:100%;max-width:none;object-fit:fill}
        .dw-host-push img{left:-100%}
        .dw-pose-hidden{opacity:0}
        .dw-host-missing{display:block;margin-top:50%;font-size:10px;color:#ffe1a7;text-align:center}
        .dw-studio-label{text-align:center;font-size:9px;color:#f1d5a3;letter-spacing:1px;margin:10px 0 0}
        .dw-status{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:15px 4px;color:#f4d891;font-size:12px;font-weight:bold}
        .dw-timer{width:58px;height:58px;border:3px solid #d5b76d;border-radius:50%;display:grid;place-items:center;font-size:24px;flex-shrink:0}
        .dw-landing{min-height:40px;text-align:center;color:#ffe7a0;font-size:22px;font-weight:900;line-height:1.7}
        .dw-bonus{padding:10px;background:#5e3678;border:1px solid #b492d9;border-radius:10px;text-align:center;color:#f4ddff;font-weight:bold;margin:10px 0}
        .dw-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}
        .dw-area{min-height:110px;padding:12px;border:2px solid var(--dw-color);border-radius:12px;background:color-mix(in srgb,var(--dw-color) 20%,#151626);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px}
        .dw-area strong{font-size:31px;color:var(--dw-color)}
        .dw-area small{font-size:10px}
        .dw-area.dw-win{border-color:#ffe6a0;box-shadow:0 0 18px #ffe2a650}
        .dw-tag{background:#e9ce81;color:#242035;border-radius:20px;padding:3px 7px;font-size:11px;font-weight:bold}
        .dw-placed{font-size:11px;color:#ffe7ad}
        .dw-controls,.dw-card{padding:14px;border:1px solid #ffffff25;background:#ffffff06;border-radius:13px;margin-top:14px}
        .dw-chip{width:46px;height:46px;border:3px dashed #ffffffaa;border-radius:50%;background:#435477;color:#fff;font-weight:bold}
        .dw-chip[aria-pressed=true]{outline:3px solid #e9cf87;outline-offset:2px}
        .dw-submit{width:100%;padding:15px;border:0;border-radius:10px;background:#e8cc7f;color:#2d2337;font-weight:900;margin-top:14px}
        .dw-summary{text-align:center;line-height:1.8;border:1px solid #d9bd74;border-radius:12px;padding:14px;margin-top:14px}
        .dw-summary strong{color:#ffdfa0;font-size:21px}
        .dw-recent{display:flex;gap:8px;overflow:auto;padding:8px 0}
        .dw-recent span{flex-shrink:0;padding:8px;border:1px solid #ffffff20;border-radius:8px;font-size:12px;background:#ffffff08}
        .dw-table{width:100%;font-size:12px;border-collapse:collapse}
        .dw-table th,.dw-table td{text-align:left;padding:10px 5px;border-bottom:1px solid #ffffff20}
        .dw-table th{color:#ead292}
        .dw-overflow{overflow:auto}
        .dw-proof{overflow-wrap:anywhere;font-size:11px;line-height:1.7;color:#d9ccdf;margin-top:14px}
        .dw-page :focus-visible{outline:3px solid #ffe3a0;outline-offset:3px}
        @media(max-width:360px){.dw-wrap{padding:8px}.dw-header{padding:12px 8px}.dw-header h1{font-size:16px}.dw-stage-row{min-height:180px}.dw-area{min-height:100px}}
        @media(prefers-reduced-motion:reduce){.dw-host-frame{transition:none}}
      `}</style>

      <header className="dw-header">
        <button
          type="button"
          className="dw-btn"
          onClick={onBack}
          aria-label="Customer home"
        >
          ←
        </button>

        <div>
          <h1>DREAM WHEEL</h1>
          <small>CONTROLLER-PLANNED DEMO</small>
        </div>

        <div className="dw-wallet">
          {state ? COINS(state.balance) : "…"}

          <small>
            {user?.name || user?.loginId || "Customer"}
          </small>
        </div>
      </header>

      <main className="dw-wrap">
        <nav className="dw-tabs" aria-label="Game sections">
          {["game", "rules", "history"].map(value => (
            <button
              key={value}
              type="button"
              className="dw-btn"
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
            className="dw-btn"
            aria-pressed={sound}
            onClick={toggleSound}
          >
            {sound ? "SOUND ON" : "SOUND OFF"}
          </button>
        </nav>

        {error && (
          <div className="dw-alert" role="alert">
            {error}

            <button
              type="button"
              className="dw-btn"
              onClick={() => {
                setError("");
                void refreshRef.current();

                if (!rules) {
                  api(`${base}/rules`)
                    .then(value => {
                      if (active.current) setRules(value);
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
          <p className="dw-hint" role="status">
            {notice}
          </p>
        )}

        {pending && (
          <div className="dw-alert" role="status">
            An interrupted bet needs recovery. Retry uses
            the original round and request.

            <button
              type="button"
              className="dw-btn"
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
              className="dw-studio"
              aria-label="Animated Dream Wheel studio"
            >
              <div className="dw-stage-row">
                {segments.length ? (
                  <Wheel
                    segments={segments}
                    wheelRef={wheelRef}
                    rotation={angle.current}
                  />
                ) : (
                  <p className="dw-hint">
                    Loading wheel…
                  </p>
                )}

                <AIHost pushing={hostIsPushing(round, now)} />
              </div>

              <p className="dw-studio-label">
                AI HOST · NOT LIVE VIDEO
              </p>
            </section>

            <div className="dw-status">
              <span>
                {displayPhase}
                <br />
                Round #{round?.id || "—"}
                {round?.spinNumber
                  ? ` · Spin ${round.spinNumber}`
                  : ""}
              </span>

              <span className="dw-timer">
                {round && round.phase !== "FINISHED"
                  ? seconds
                  : "—"}
              </span>
            </div>

            <div className="dw-landing" role="status">
              {landed && shownSpin
                ? `LANDED ${shownSpin.value}`
                : round?.phase === "SPINNING"
                  ? "WHEEL SPINNING…"
                  : ""}
            </div>

            {(round?.bonusMultiplier || 1) > 1 && (
              <div className="dw-bonus">
                Bonus multiplier {round.bonusMultiplier}x ·
                Existing bets stay in place
              </div>
            )}

            <div
              className="dw-grid"
              aria-label="Betting areas"
            >
              {NUMBERS.map(renderArea)}
            </div>

            <section
              className="dw-controls"
              aria-label="Bet controls"
            >
              <p className="dw-hint">
                Choose a chip, select numbers, then confirm
                before betting closes.
              </p>

              <div className="dw-row">
                {CHIPS.map(value => (
                  <button
                    key={value}
                    type="button"
                    className="dw-chip"
                    aria-pressed={chip === value}
                    disabled={locked}
                    onClick={() => setChip(value)}
                  >
                    {value}
                  </button>
                ))}

                <button
                  type="button"
                  className="dw-btn"
                  disabled={locked || !total}
                  onClick={() => setDraft({})}
                >
                  Clear draft
                </button>
              </div>

              <p className="dw-hint">
                Draft {COINS(total)}
                {" · Placed this round "}
                {COINS(committed)}
                {" · Maximum 25,000"}
              </p>

              <button
                type="button"
                className="dw-submit"
                disabled={
                  busy || (!pending && (!open || !total))
                }
                onClick={submit}
              >
                {busy
                  ? "CONFIRMING…"
                  : pending
                    ? "RETRY SAME BET"
                    : "CONFIRM BET"}
              </button>

              <p className="dw-hint">
                No new bets during spins or bonus spins.
                This is a controller-planned demo; the plan
                is locked before betting opens.
              </p>
            </section>

            {finalLanded && (
              <section className="dw-summary" role="status">
                <strong>
                  Winner {result.winner}
                  {" · Bonus "}
                  {result.bonusMultiplier}x
                </strong>

                <div>
                  Profit odds 1:{result.profitOdds}
                </div>

                <div>
                  Your stake {COINS(committed)}
                  {" · Total return "}
                  {COINS(credited)}
                </div>

                <div>
                  Net {credited - committed >= 0 ? "+" : ""}
                  {COINS(credited - committed)} demo coins
                </div>
              </section>
            )}

            {round?.commitment && (
              <details className="dw-proof">
                <summary>Locked plan check</summary>

                <p>Commitment: {round.commitment}</p>

                {round.proof ? (
                  <>
                    <button
                      type="button"
                      className="dw-btn"
                      onClick={() => void verifyPlan()}
                    >
                      VERIFY LOCKED PLAN
                    </button>

                    <p role="status">{verification}</p>

                    <p>
                      Revealed plan:{" "}
                      {round.proof.plan
                        .map(step => step.value)
                        .join(" → ")}
                    </p>

                    <p>Salt: {round.proof.salt}</p>
                  </>
                ) : (
                  <p>
                    The plan and verification salt are
                    revealed after the final result.
                  </p>
                )}

                <p>
                  This checks that the revealed plan matches
                  the original hash. Outcomes are
                  controller-planned.
                </p>
              </details>
            )}

            <p className="dw-hint">
              Last results · newest first
            </p>

            <div className="dw-recent">
              {(state?.recentResults || []).map(item => (
                <span key={item.id}>
                  #{item.id}
                  {" · "}
                  {item.result.winner}
                  {" · Bonus "}
                  {item.result.bonusMultiplier}x
                </span>
              ))}
            </div>
          </>
        )}

        {tab === "rules" && (
          <section className="dw-card">
            <h2>Demo rules</h2>

            <p className="dw-hint">
              A Dream Wheel controller locks the full round
              plan before betting. The woman is an AI image
              host, not live video. She gives one push,
              withdraws her hand, and the wheel slows to a
              stop automatically. A new round waits until a
              controller publishes its plan.
            </p>

            <p className="dw-hint">
              The wheel uses only numbers 1, 2, 5, 10, 20
              and 40, plus bonus sectors 2x and 7x.
              Number 1 appears 23 times, number 2 appears
              15 times, number 5 appears 7 times,
              number 10 appears 4 times, number 20 appears
              twice and number 40 appears once.
            </p>

            <p className="dw-hint">
              The number is profit odds. A winning bet
              receives its stake back plus profit; other
              areas return zero.
            </p>

            <p className="dw-hint">
              Betting lasts 30 seconds. Each spin lasts
              10 seconds. Bonus 2x/7x spins keep all existing
              bets and multiply the next winning profit.
              Bonuses stack. No new bets are accepted during
              spins. This demo permits at most three bonus
              spins, followed by a number.
            </p>

            <p className="dw-hint">
              Example: 10 coins on number 5 with bonuses 2x
              then 7x has profit odds 1:70 and returns
              10 + (10 × 5 × 2 × 7) = 710 total coins.
            </p>

            <p className="dw-hint">
              Minimum 10 whole demo coins per selected
              number. Maximum total stake 25,000 per
              customer per round. The plan hash is published
              before betting and can be checked after the
              final result.
            </p>

            <table className="dw-table">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Base profit odds</th>
                </tr>
              </thead>

              <tbody>
                {NUMBERS.map(value => (
                  <tr key={value}>
                    <td>{value}</td>
                    <td>1:{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {tab === "history" && (
          <section className="dw-card">
            <h2>Your settled bets</h2>

            <button
              type="button"
              className="dw-btn"
              onClick={() => void loadHistory()}
            >
              Refresh history
            </button>

            {history.length ? (
              <div className="dw-overflow">
                <table className="dw-table">
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
                          {new Date(
                            bet.createdAt,
                          ).toLocaleString("en-IN", {
                            timeZone: "Asia/Kolkata",
                          })}
                        </td>

                        <td>
                          {bet.bets
                            .map(
                              item =>
                                `${item.area}: ${
                                  COINS(item.amount)
                                }`,
                            )
                            .join(", ")}

                          <br />

                          Winner {bet.result.winner}
                          {" · Bonus "}
                          {bet.result.bonusMultiplier}x
                        </td>

                        <td>{COINS(bet.stake)}</td>
                        <td>{COINS(bet.payout)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="dw-hint">
                No settled bets available.
              </p>
            )}
          </section>
        )}

        <footer className="dw-row">
          <button
            type="button"
            className="dw-btn"
            onClick={onBack}
          >
            ← Customer home
          </button>

          {onLogout && (
            <button
              type="button"
              className="dw-btn"
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
