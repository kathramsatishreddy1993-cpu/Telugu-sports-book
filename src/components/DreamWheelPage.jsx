import React, { useEffect, useRef, useState } from "react";

const CHIPS = [10, 20, 50, 100, 500];
const NUMBERS = ["1", "2", "5", "10", "20", "40"];
const ALLOWED = new Set([...NUMBERS, "2x", "7x"]);

const COLORS = {
  "1": "#37b8d5",
  "2": "#e5c347",
  "5": "#35b475",
  "10": "#879be6",
  "20": "#e660a3",
  "40": "#ed6868",
  "2x": "#d8b6f2",
  "7x": "#b994ed",
};

const coins = (value) => {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return "—";
  }

  return Number(value).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
};

const money = (value) => {
  const formatted = coins(value);
  return formatted === "—" ? "—" : `₹${formatted}`;
};

function AmountBox({ label, value, signed = false }) {
  const formatted =
    signed && Number(value) > 0
      ? `+${money(value)}`
      : money(value);

  return (
    <div className="dw-money-box">
      {label && <span className="dw-money-label">{label}</span>}
      <strong>{formatted}</strong>
    </div>
  );
}

function Wheel({ segments, wheelRef, rotation }) {
  const width = 360 / segments.length;

  const point = (angle) => {
    const radians = (angle * Math.PI) / 180;

    return [
      200 + 189 * Math.cos(radians),
      200 + 189 * Math.sin(radians),
    ].join(",");
  };

  return (
    <div className="dw-wheel-box">
      <span className="dw-pointer" aria-hidden="true">▼</span>

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
          const middle = ((start + width / 2) * Math.PI) / 180;
          const x = 200 + 150 * Math.cos(middle);
          const y = 200 + 150 * Math.sin(middle);

          return (
            <g key={index}>
              <path
                d={
                  `M200,200 L${point(start)} ` +
                  `A189,189 0 0 1 ${point(end)} Z`
                }
                fill={COLORS[value]}
                stroke="#273443"
                strokeWidth="0.7"
              />
              <text
                x={x}
                y={y}
                fill="#000"
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={value.length > 1 ? 10 : 12}
                fontWeight="900"
                transform={`rotate(${index * width + width / 2},${x},${y})`}
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
        <circle cx="200" cy="157" r="8" fill="#e6c681" />
        <text
          x="200"
          y="198"
          textAnchor="middle"
          fill="#fff1be"
          fontSize="29"
          fontWeight="900"
        >
          DREAM
        </text>
        <text
          x="200"
          y="230"
          textAnchor="middle"
          fill="#fff1be"
          fontSize="25"
          fontWeight="900"
        >
          WHEEL
        </text>
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
  if (round?.phase !== "SPINNING" || !round.activeSpin) {
    return false;
  }

  const elapsed = now - Date.parse(round.activeSpin.startsAt);
  return elapsed >= 0 && elapsed < 1200;
}

function buildWheelMotion(base, segment, count, spin) {
  const desired =
    (360 - ((segment + 0.5) * 360) / count + 360) % 360;
  const current = ((base % 360) + 360) % 360;

  return {
    key: spin.key,
    base,
    end: base + 2160 + ((desired - current + 360) % 360),
    start: Date.parse(spin.startsAt),
    stop: Date.parse(spin.stopsAt),
  };
}

function wheelAngleAt(motion, time) {
  const progress = Math.max(
    0,
    Math.min(
      1,
      (time - motion.start) / (motion.stop - motion.start)
    )
  );

  return (
    motion.base +
    (motion.end - motion.base) *
      (1 - Math.pow(1 - progress, 3))
  );
}

function makeWheelAudio(ctx) {
  const master = ctx.createGain();
  master.gain.value = 0.35;
  master.connect(ctx.destination);

  const buffer = ctx.createBuffer(
    1,
    ctx.sampleRate,
    ctx.sampleRate
  );

  const samples = buffer.getChannelData(0);

  for (let i = 0; i < samples.length; i++) {
    samples[i] = Math.random() * 2 - 1;
  }

  let source = null;
  let filter = null;
  let hum = null;

  function stop() {
    if (source) {
      try {
        source.stop();
      } catch {
        // Already stopped.
      }
      source.disconnect();
    }

    filter?.disconnect();
    hum?.disconnect();
    source = null;
    filter = null;
    hum = null;
  }

  return {
    update(speed) {
      if (
        !Number.isFinite(speed) ||
        speed <= 0 ||
        ctx.state !== "running"
      ) {
        stop();
        return;
      }

      if (!source) {
        source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        filter = ctx.createBiquadFilter();
        filter.type = "lowpass";

        hum = ctx.createGain();
        hum.gain.value = 0;

        source.connect(filter);
        filter.connect(hum);
        hum.connect(master);
        source.start();
      }

      const strength = Math.min(1, speed / 800);

      filter.frequency.setTargetAtTime(
        250 + 1700 * strength,
        ctx.currentTime,
        0.04
      );

      hum.gain.setTargetAtTime(
        0.015 + 0.11 * strength,
        ctx.currentTime,
        0.04
      );
    },

    tick() {
      if (ctx.state !== "running") return;

      const node = ctx.createBufferSource();
      node.buffer = buffer;

      const high = ctx.createBiquadFilter();
      high.type = "highpass";
      high.frequency.value = 1700;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.32, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        ctx.currentTime + 0.025
      );

      node.connect(high);
      high.connect(gain);
      gain.connect(master);

      node.onended = () => {
        node.disconnect();
        high.disconnect();
        gain.disconnect();
      };

      node.start();
      node.stop(ctx.currentTime + 0.03);
    },

    stop,

    dispose() {
      stop();
      master.disconnect();
    },
  };
}

function readPending(key) {
  try {
    const value = JSON.parse(
      sessionStorage.getItem(key) || "null"
    );

    return value?.game === "dream-wheel" &&
      typeof value.body?.requestKey === "string"
      ? value.body
      : null;
  } catch {
    return null;
  }
}

function savePending(key, body) {
  try {
    sessionStorage.setItem(
      key,
      JSON.stringify({ game: "dream-wheel", body })
    );
    return true;
  } catch {
    return false;
  }
}

function clearPending(key) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Storage may be unavailable.
  }
}

function uniqueKey() {
  const bytes = new Uint8Array(20);
  window.crypto.getRandomValues(bytes);

  return Array.from(
    bytes,
    (value) => value.toString(16).padStart(2, "0")
  ).join("");
}

async function api(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

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
        new Error(data.error || data.message || "Request failed."),
        { status: response.status }
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

  if (!customerId) {
    return (
      <main
        style={{
          background: "#120f20",
          color: "#fff",
          minHeight: "100vh",
          padding: 24,
        }}
      >
        Customer login required.
        <button
          type="button"
          onClick={onBack}
          style={{ marginLeft: 16 }}
        >
          Back
        </button>
      </main>
    );
  }

  const storageKey = `tsb_dream_pending_v1:${customerId}`;

  return (
    <DreamGame
      key={storageKey}
      user={user}
      onBack={onBack}
      onLogout={onLogout}
      storageKey={storageKey}
    />
  );
}

function DreamGame({ user, onBack, onLogout, storageKey }) {
  const base = "/api/dream-wheel";

  const [rules, setRules] = useState(null);
  const [state, setState] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [draft, setDraft] = useState({});
  const [chip, setChip] = useState(10);
  const [tab, setTab] = useState("game");
  const [history, setHistory] = useState([]);
  const [pending, setPending] = useState(
    () => readPending(storageKey)
  );
  const [busy, setBusy] = useState(false);
  const [sound, setSound] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [lastSync, setLastSync] = useState(0);
  const [verification, setVerification] = useState("");

  const active = useRef(false);
  const posting = useRef(false);
  const polling = useRef(false);
  const revision = useRef(0);
  const offset = useRef(0);
  const pendingRef = useRef(pending);
  const roundRef = useRef(null);
  const refreshRef = useRef(null);
  const balanceEventRound = useRef(null);
  const soundKey = useRef("");
  const audio = useRef(null);
  const wheelAudio = useRef(null);
  const soundRef = useRef(false);
  const lastTick = useRef(null);
  const wheelRef = useRef(null);
  const angle = useRef(0);
  const motion = useRef(null);
  const scene = useRef(null);

  const round = state?.round;

  const result = ["RESULT", "FINISHED"].includes(round?.phase)
    ? round.result
    : null;

  const endTime = round
    ? Date.parse(
        round.phase === "WAITING"
          ? round.opensAt
          : round.phase === "BETTING"
            ? round.closesAt
            : round.phase === "SPINNING"
              ? round.spinEndsAt
              : round.endsAt || ""
      )
    : 0;

  const seconds = Math.max(
    0,
    Math.ceil((endTime - now) / 1000) || 0
  );

  const stale = !lastSync || Date.now() - lastSync > 5000;

  const open = Boolean(
    rules &&
      round?.phase === "BETTING" &&
      seconds > 0 &&
      !stale
  );

  const locked = !open || busy || Boolean(pending);

  const total = Object.values(draft).reduce(
    (sum, value) => sum + Number(value),
    0
  );

  const committed = (state?.bets || []).reduce(
    (sum, bet) => sum + Number(bet.stake),
    0
  );

  const credited = (state?.bets || []).reduce(
    (sum, bet) => sum + Number(bet.payout || 0),
    0
  );

  const segments = (rules?.segments || []).filter(
    (value) => ALLOWED.has(value)
  );

  const shownSpin = round?.revealedSpins?.at(-1) || null;

  const landed = Boolean(
    shownSpin && ["RESULT", "FINISHED"].includes(round?.phase)
  );

  const finalLanded = Boolean(
    result && landed && shownSpin?.value === result.winner
  );

  const stopped = Boolean(
    round?.activeSpin &&
      now >= Date.parse(round.activeSpin.stopsAt)
  );

  const balanceAvailable =
    state?.balance !== null &&
    state?.balance !== undefined &&
    Number.isFinite(Number(state.balance));

  scene.current = {
    round,
    segments,
    source: rules?.segments || [],
    clockOffset: offset.current,
  };

  function bell() {
    const ctx = audio.current;

    if (
      !soundRef.current ||
      !ctx ||
      ctx.state !== "running"
    ) {
      return;
    }

    try {
      [440, 880, 1306, 1860].forEach((frequency, index) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();

        oscillator.frequency.value = frequency;
        oscillator.connect(gain);
        gain.connect(ctx.destination);

        gain.gain.setValueAtTime(
          0.055 / (index + 1),
          ctx.currentTime
        );

        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          ctx.currentTime + 1.8
        );

        oscillator.onended = () => {
          oscillator.disconnect();
          gain.disconnect();
        };

        oscillator.start();
        oscillator.stop(ctx.currentTime + 1.8);
      });
    } catch {
      // Audio may be unavailable.
    }
  }

  function toggleSound() {
    const enabled = !soundRef.current;
    soundRef.current = enabled;
    setSound(enabled);

    if (!enabled) {
      wheelAudio.current?.stop();
      lastTick.current = null;
      audio.current?.suspend()?.catch(() => {});
      return;
    }

    try {
      const AudioContext =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioContext) {
        soundRef.current = false;
        setSound(false);
        setError("Sound is not supported in this browser.");
        return;
      }

      if (!audio.current || audio.current.state === "closed") {
        audio.current = new AudioContext();
        wheelAudio.current = makeWheelAudio(audio.current);
      }

      audio.current
        .resume()
        .then(() => bell())
        .catch(() => {});
    } catch {
      soundRef.current = false;
      setSound(false);
    }
  }

  async function refresh() {
    if (polling.current || posting.current) return;

    polling.current = true;
    const version = revision.current;
    const started = Date.now();

    try {
      const data = await api(`${base}/state`);

      if (!active.current || version !== revision.current) return;

      const finished = Date.now();

      offset.current =
        Date.parse(data.serverTime) - (started + finished) / 2;

      setNow(finished + offset.current);
      setLastSync(finished);

      if (
        roundRef.current !== null &&
        String(roundRef.current) !== String(data.round?.id)
      ) {
        setDraft({});
        setVerification("");
        setNotice("New round. Choose your bets again.");
      }

      roundRef.current = data.round?.id ?? null;
      setState(data);

      if (
        data.round?.phase === "RESULT" &&
        balanceEventRound.current !== String(data.round.id)
      ) {
        balanceEventRound.current = String(data.round.id);

        window.dispatchEvent(
          new Event("demo-balance-updated")
        );
      }
    } catch (err) {
      if (active.current && version === revision.current) {
        setError(
          err.message || "Unable to update round. Reconnecting…"
        );
      }
    } finally {
      polling.current = false;
    }
  }

  refreshRef.current = refresh;

  useEffect(() => {
    active.current = true;
    let cancelled = false;

    api(`${base}/rules`)
      .then((data) => {
        if (!cancelled) setRules(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });

    void refreshRef.current();

    const pollTimer = setInterval(
      () => void refreshRef.current(),
      1000
    );

    const clockTimer = setInterval(() => {
      if (active.current) {
        setNow(Date.now() + offset.current);
      }
    }, 100);

    const focused = () => void refreshRef.current();

    const visibility = () => {
      if (document.hidden) {
        wheelAudio.current?.stop();
        lastTick.current = null;
      } else {
        void refreshRef.current();
      }
    };

    window.addEventListener("focus", focused);
    document.addEventListener("visibilitychange", visibility);

    return () => {
      cancelled = true;
      active.current = false;
      clearInterval(pollTimer);
      clearInterval(clockTimer);
      window.removeEventListener("focus", focused);
      document.removeEventListener("visibilitychange", visibility);
      wheelAudio.current?.dispose();
      wheelAudio.current = null;
      audio.current?.close()?.catch(() => {});
      audio.current = null;
    };
  }, []);

  useEffect(() => {
    let frame;

    const reduced = Boolean(
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
    );

    function animate() {
      const current = scene.current;
      const spin = current?.round?.activeSpin;
      let playing = false;

      if (
        spin &&
        current.segments.length &&
        ALLOWED.has(spin.value)
      ) {
        const index =
          current.source
            .slice(0, spin.segment + 1)
            .filter((value) => ALLOWED.has(value)).length - 1;

        if (current.segments[index] === spin.value) {
          if (motion.current?.key !== spin.key) {
            motion.current = buildWheelMotion(
              angle.current,
              index,
              current.segments.length,
              spin
            );
          }

          const time = Date.now() + current.clockOffset;
          const movement = motion.current;

          if (reduced) {
            if (time >= movement.stop) {
              angle.current = movement.end;
            }
          } else {
            angle.current = wheelAngleAt(movement, time);
          }

          playing =
            current.round.phase === "SPINNING" &&
            time >= movement.start &&
            time < movement.stop &&
            soundRef.current &&
            !document.hidden;

          if (playing) {
            const progress = Math.max(
              0,
              Math.min(
                1,
                (time - movement.start) /
                  (movement.stop - movement.start)
              )
            );

            const speed =
              ((3000 * (movement.end - movement.base)) /
                (movement.stop - movement.start)) *
              Math.pow(1 - progress, 2);

            wheelAudio.current?.update(speed);

            const sector = Math.floor(
              wheelAngleAt(movement, time) /
                (360 / current.segments.length)
            );

            if (
              lastTick.current?.key === movement.key &&
              lastTick.current.sector !== sector
            ) {
              wheelAudio.current?.tick();
            }

            lastTick.current = {
              key: movement.key,
              sector,
            };
          }

          if (wheelRef.current) {
            wheelRef.current.style.transition = "none";
            wheelRef.current.style.transform =
              `rotate(${angle.current}deg)`;
          }
        }
      }

      if (!playing) {
        wheelAudio.current?.stop();
        lastTick.current = null;
      }

      frame = window.requestAnimationFrame(animate);
    }

    frame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frame);
      wheelAudio.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (!landed) return;

    const key = `${round.id}:${shownSpin.segment}`;

    if (soundKey.current !== key) {
      soundKey.current = key;
      bell();
    }
  }, [landed, round?.id, shownSpin?.segment]);

  async function loadHistory() {
    try {
      const data = await api(`${base}/history`);
      if (active.current) setHistory(data.bets || []);
    } catch (err) {
      if (active.current) setError(err.message);
    }
  }

  function add(area) {
    if (locked) return;

    if (total + committed + chip > 25000) {
      setError("Maximum total stake per round is ₹25,000 in demo balance.");
      return;
    }

    setDraft((current) => ({
      ...current,
      [area]: (current[area] || 0) + chip,
    }));

    setError("");
  }

  async function submit() {
    if (posting.current) return;

    let body = pendingRef.current;

    if (!body) {
      if (!open || total < 10) {
        setError("Choose a bet while betting is open.");
        return;
      }

      if (total + committed > 25000) {
        setError("Maximum total stake per round is ₹25,000 in demo balance.");
        return;
      }

      if (!balanceAvailable) {
        setError("Wallet balance is unavailable. Please refresh.");
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
          bets: Object.entries(draft).map(([area, amount]) => ({
            area,
            amount,
          })),
        };
      } catch {
        setError("A secure HTTPS browser connection is required.");
        return;
      }

      if (!savePending(storageKey, body)) {
        setError(
          "Enable browser session storage to recover interrupted bets."
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      clearPending(storageKey);
      pendingRef.current = null;

      if (!active.current) return;

      setPending(null);
      setDraft({});

      setState((current) => {
        if (!current) return current;

        const bets = current.bets || [];
        const sameRound =
          String(current.round?.id) === String(data.bet.roundId);

        const exists = bets.some(
          (bet) => String(bet.id) === String(data.bet.id)
        );

        return {
          ...current,
          balance: data.balance,
          bets: sameRound && !exists ? [...bets, data.bet] : bets,
        };
      });

      setNotice(
        data.replayed
          ? "Previous bet recovered. No second debit."
          : "Bet accepted. Waiting for the round result."
      );

      window.dispatchEvent(new Event("demo-balance-updated"));
    } catch (err) {
      if (!active.current) return;

      if ([400, 401, 403, 404, 409, 422].includes(err.status)) {
        clearPending(storageKey);
        pendingRef.current = null;
        setPending(null);
      }

      setError(
        err.status
          ? err.message
          : "Connection interrupted. Press RETRY SAME BET to recover your bet."
      );
    } finally {
      posting.current = false;

      if (active.current) {
        setBusy(false);
        void refreshRef.current();
      }
    }
  }

  async function verifyPlan() {
    if (!round?.proof) return;

    const proofRoundId = String(round.id);

    try {
      const plan = round.proof.plan.map((step) => ({
        value: step.value,
        segment: Number(step.segment),
      }));

      const bytes = new TextEncoder().encode(
        JSON.stringify(plan) + ":" + round.proof.salt
      );

      const hash = await window.crypto.subtle.digest(
        "SHA-256",
        bytes
      );

      const hex = Array.from(
        new Uint8Array(hash),
        (value) => value.toString(16).padStart(2, "0")
      ).join("");

      if (
        active.current &&
        String(roundRef.current) === proofRoundId
      ) {
        setVerification(
          hex === round.proof.commitment
            ? "Locked plan hash matches."
            : "Plan hash does not match."
        );
      }
    } catch {
      if (
        active.current &&
        String(roundRef.current) === proofRoundId
      ) {
        setVerification(
          "Verification needs a secure HTTPS browser."
        );
      }
    }
  }

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
            ? stopped
              ? "WAITING FOR RESULT · BETTING CLOSED"
              : "SPINNING · BETTING CLOSED"
            : round.phase === "RESULT"
              ? "ROUND RESULT"
              : "WAITING FOR NEXT ROUND";

  function renderArea(area) {
    const accepted = (state?.bets || []).reduce(
      (sum, bet) =>
        sum +
        (bet.bets || [])
          .filter((item) => item.area === area)
          .reduce(
            (subtotal, item) => subtotal + Number(item.amount),
            0
          ),
      0
    );

    const win = finalLanded && result.winner === area;

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
            Draft {money(draft[area])}
          </span>
        )}

        {accepted > 0 && (
          <span className="dw-placed">
            Placed {money(accepted)}
          </span>
        )}
      </button>
    );
  }

  async function retryRefresh() {
    setError("");
    void refreshRef.current();

    if (!rules) {
      try {
        const data = await api(`${base}/rules`);
        if (active.current) setRules(data);
      } catch (err) {
        if (active.current) setError(err.message);
      }
    }
  }

  return (
    <div className="dw-page">
      <style>{`
        .dw-page {
          min-height:100vh;
          background:#120f20;
          color:#f7f1e4;
          font-family:Arial,sans-serif;
          padding-bottom:25px;
        }
        .dw-page * { box-sizing:border-box; }
        .dw-page button { font:inherit; cursor:pointer; }
        .dw-page button:disabled { opacity:.45; cursor:default; }
        .dw-header {
          display:flex; flex-wrap:wrap; gap:12px;
          align-items:center; padding:15px;
          background:#211427;
          border-bottom:1px solid #d6b66b55;
        }
        .dw-header h1 {
          font-size:19px; color:#f0d48b; margin:0;
        }
        .dw-header small {
          display:block; font-size:9px;
          color:#e2c9ad; margin-top:5px;
        }
        .dw-wallet {
          margin-left:auto; max-width:100%;
          border:2px solid #166534; border-radius:12px;
          background:#fff; padding:10px 12px;
          color:#166534; text-align:center;
        }
        .dw-wallet-title {
          display:block; font-size:9px;
          font-weight:900; letter-spacing:.5px;
        }
        .dw-wallet-value {
          display:flex; align-items:center;
          justify-content:center; gap:8px; margin-top:6px;
        }
        .dw-wallet-symbol {
          display:grid; place-items:center;
          width:32px; height:32px; flex-shrink:0;
          border-radius:8px; background:#166534;
          color:#fff; font-size:23px; font-weight:900;
        }
        .dw-wallet-number {
          font-size:20px; font-weight:900;
          font-variant-numeric:tabular-nums;
          overflow-wrap:anywhere;
        }
        .dw-wallet small { color:#722f37; font-weight:bold; }
        .dw-money-grid {
          display:grid;
          grid-template-columns:repeat(2,minmax(0,1fr));
          gap:10px; margin-top:12px;
        }
        .dw-money-box {
          display:inline-flex; flex-direction:column;
          align-items:center; justify-content:center;
          gap:6px; max-width:100%; padding:10px 12px;
          border:1px solid #166534; border-radius:10px;
          background:#fff; color:#166534;
          font-variant-numeric:tabular-nums;
        }
        .dw-money-box strong {
          color:#166534; font-size:18px;
          overflow-wrap:anywhere;
        }
        .dw-money-label {
          color:#722f37; font-size:10px;
          font-weight:bold; text-align:center;
        }
        .dw-wrap { max-width:900px; margin:auto; padding:12px; }
        .dw-tabs,.dw-row {
          display:flex; gap:8px; flex-wrap:wrap;
          align-items:center; margin-bottom:12px;
        }
        .dw-row { margin-top:12px; }
        .dw-btn {
          padding:10px 12px; border:1px solid #ffffff30;
          border-radius:8px; background:#ffffff10; color:inherit;
        }
        .dw-tabs [aria-pressed=true] {
          background:#166534; border-color:#166534; color:#fff;
        }
        .dw-alert {
          border:1px solid #722f37; background:#fff;
          color:#722f37; padding:12px; border-radius:10px;
          font-size:13px; line-height:1.7; margin:12px 0;
        }
        .dw-alert button {
          margin:6px; background:#722f37;
          color:#fff; border-color:#722f37;
        }
        .dw-hint {
          font-size:12px; line-height:1.7; color:#d5c9de;
        }
        .dw-studio {
          position:relative; border:2px solid #b99755;
          border-radius:16px; overflow:hidden; padding:9% 3% 2%;
          background:linear-gradient(
            to bottom,
            #e0ceba 0 10%,#c3ad96 10% 11%,
            #dfcdb9 11% 77%,#b8a28a 77% 78%,
            #e2c9ab 78% 100%
          );
          box-shadow:inset 0 0 35px #49321c30;
        }
        .dw-studio::before {
          content:""; position:absolute;
          left:8%; right:8%; top:3%; height:8px;
          background:radial-gradient(
            ellipse,#fffce9 0 28%,transparent 60%
          ) 0 0/25% 8px;
          filter:drop-shadow(0 1px 5px #fff);
        }
        .dw-studio::after {
          content:""; position:absolute;
          left:0; right:0; top:78%; bottom:0;
          background:
            repeating-linear-gradient(
              0deg,transparent 0 34px,#93795d30 35px 36px
            ),
            repeating-linear-gradient(
              90deg,transparent 0 85px,#93795d25 86px 87px
            );
          pointer-events:none;
        }
        .dw-stage-row {
          display:block; position:relative;
          padding-bottom:24%; z-index:1;
        }
        .dw-wheel-box { position:relative; width:70%; z-index:1; }
        .dw-wheel-box::before,.dw-wheel-box::after {
          content:""; position:absolute;
          top:83%; height:40%; width:7%;
          background:linear-gradient(90deg,#151517,#555457,#151517);
          border:1px solid #be9b51; z-index:-1;
        }
        .dw-wheel-box::before { left:22%; transform:rotate(10deg); }
        .dw-wheel-box::after { right:22%; transform:rotate(-10deg); }
        .dw-stage-row::after {
          content:"AI HOST · DEMO"; position:absolute;
          left:3%; bottom:0; width:64%; height:9%;
          display:grid; place-items:center;
          background:linear-gradient(#3a3431,#171719);
          border:1px solid #c8a758; border-radius:3px;
          box-shadow:0 5px 4px #0005; color:#edcd87;
          font-size:clamp(6px,1.4vw,12px);
          letter-spacing:1px; z-index:1;
        }
        .dw-wheel {
          display:block; width:100%; will-change:transform;
          filter:drop-shadow(0 3px 3px #0004);
        }
        .dw-pointer {
          position:absolute; z-index:3;
          top:-11px; left:50%; transform:translateX(-50%);
          font-size:31px; color:#ffe3a3;
          text-shadow:0 3px 3px #000;
        }
        .dw-host {
          position:absolute; left:68%; bottom:0;
          width:40%; aspect-ratio:3/4;
          z-index:2; pointer-events:none;
        }
        .dw-host-frame {
          position:absolute; inset:0; overflow:hidden;
          opacity:1; transition:opacity .18s ease;
        }
        .dw-host-frame img {
          display:block; position:absolute;
          top:0; left:0; width:200%; height:100%;
          max-width:none; object-fit:fill;
        }
        .dw-host-rest img { left:-11.5%; }
        .dw-host-push img { left:-100%; }
        .dw-pose-hidden { opacity:0; }
        .dw-host-missing {
          display:block; margin-top:50%;
          font-size:10px; color:#473021; text-align:center;
        }
        .dw-studio-label {
          position:relative; z-index:1; text-align:center;
          font-size:9px; color:#3f2c20; font-weight:bold;
          letter-spacing:1px; margin:12px 0 0;
        }
        .dw-status {
          display:flex; align-items:center;
          justify-content:space-between; gap:10px;
          padding:15px 4px; color:#f4d891;
          font-size:12px; font-weight:bold; line-height:1.8;
        }
        .dw-timer {
          width:58px; height:58px;
          border:3px solid #d5b76d; border-radius:50%;
          display:grid; place-items:center;
          font-size:24px; flex-shrink:0;
        }
        .dw-landing {
          min-height:40px; text-align:center; color:#ffe7a0;
          font-size:22px; font-weight:900; line-height:1.7;
        }
        .dw-bonus {
          padding:10px; background:#5e3678;
          border:1px solid #b492d9; border-radius:10px;
          text-align:center; color:#f4ddff;
          font-weight:bold; margin:10px 0;
        }
        .dw-grid {
          display:grid; grid-template-columns:repeat(2,minmax(0,1fr));
          gap:10px; margin-top:12px;
        }
        .dw-area {
          min-height:110px; padding:12px;
          border:2px solid var(--dw-color); border-radius:12px;
          background:color-mix(in srgb,var(--dw-color) 20%,#151626);
          color:#fff; display:flex; flex-direction:column;
          align-items:center; justify-content:center; gap:6px;
        }
        .dw-area strong { font-size:31px; color:var(--dw-color); }
        .dw-area small { font-size:10px; }
        .dw-area.dw-win {
          border-color:#ffe6a0; box-shadow:0 0 18px #ffe2a650;
        }
        .dw-tag,.dw-placed {
          background:#fff; color:#166534;
          border:1px solid #166534; border-radius:8px;
          padding:5px 8px; font-size:11px; font-weight:bold;
        }
        .dw-controls,.dw-card {
          padding:14px; border:1px solid #ffffff25;
          background:#ffffff06; border-radius:13px; margin-top:14px;
        }
        .dw-chip {
          min-width:48px; min-height:46px; padding:8px;
          border:2px solid #166534; border-radius:10px;
          background:#fff; color:#166534; font-weight:bold;
        }
        .dw-chip[aria-pressed=true] {
          background:#166534; color:#fff;
          outline:2px solid #fff; outline-offset:2px;
        }
        .dw-submit {
          width:100%; padding:15px; border:0;
          border-radius:10px; background:#166534;
          color:#fff; font-weight:900; margin-top:14px;
        }
        .dw-summary {
          text-align:center; line-height:1.8;
          border:1px solid #166534; border-radius:12px;
          padding:14px; margin-top:14px;
        }
        .dw-result-heading { color:#ffdfa0; font-size:21px; }
        .dw-recent { display:flex; gap:8px; overflow:auto; padding:8px 0; }
        .dw-recent span {
          flex-shrink:0; padding:8px;
          border:1px solid #ffffff20; border-radius:8px;
          font-size:12px; background:#ffffff08;
        }
        .dw-table {
          width:100%; font-size:12px; border-collapse:collapse;
        }
        .dw-table th,.dw-table td {
          text-align:left; padding:10px 5px;
          border-bottom:1px solid #ffffff20;
        }
        .dw-table th { color:#ead292; }
        .dw-overflow { overflow:auto; }
        .dw-history-table { min-width:600px; }
        .dw-proof {
          overflow-wrap:anywhere; font-size:11px;
          line-height:1.7; color:#d9ccdf; margin-top:14px;
        }
        .dw-page :focus-visible {
          outline:3px solid #fff; outline-offset:3px;
        }
        @media(max-width:360px) {
          .dw-wrap { padding:8px; }
          .dw-header { padding:12px 8px; gap:8px; }
          .dw-header h1 { font-size:16px; }
          .dw-area { min-height:100px; }
          .dw-tabs { gap:5px; }
          .dw-tabs .dw-btn { padding:10px 8px; font-size:12px; }
          .dw-wallet { padding:8px; }
          .dw-wallet-number { font-size:17px; }
        }
        @media(prefers-reduced-motion:reduce) {
          .dw-host-frame { transition:none; }
        }
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

        <div
          className="dw-wallet"
          aria-live="polite"
          aria-label="Demo wallet balance"
        >
          <span className="dw-wallet-title">WALLET BALANCE</span>

          <div className="dw-wallet-value">
            <span className="dw-wallet-symbol" aria-hidden="true">₹</span>
            <strong className="dw-wallet-number">
              {balanceAvailable
                ? coins(state.balance)
                : state || error
                  ? "—"
                  : "Loading…"}
            </strong>
          </div>

          <small>DEMO COINS</small>

          {balanceAvailable && stale && (
            <small>LAST RECEIVED BALANCE</small>
          )}

          <small>
            {user?.name || user?.loginId || "Customer"}
          </small>
        </div>
      </header>

      <main className="dw-wrap">
        <nav className="dw-tabs" aria-label="Game sections">
          {["game", "rules", "history"].map((value) => (
            <button
              key={value}
              type="button"
              className="dw-btn"
              aria-pressed={tab === value}
              onClick={() => {
                setTab(value);
                if (value === "history") void loadHistory();
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
              onClick={() => void retryRefresh()}
            >
              Refresh
            </button>
          </div>
        )}

        {notice && (
          <p className="dw-hint" role="status">{notice}</p>
        )}

        {pending && (
          <div className="dw-alert" role="status">
            An interrupted bet needs recovery.
            Retry uses the original round and request.
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
                  <p className="dw-hint">Loading wheel…</p>
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
              </span>
              <span className="dw-timer">
                {round &&
                ["WAITING", "BETTING", "SPINNING"].includes(round.phase)
                  ? seconds
                  : "—"}
              </span>
            </div>

            <div className="dw-landing" role="status">
              {landed && shownSpin
                ? `LANDED ${shownSpin.value}`
                : round?.phase === "SPINNING"
                  ? stopped
                    ? "WAITING FOR RESULT…"
                    : "WHEEL SPINNING…"
                  : ""}
            </div>

            {(round?.bonusMultiplier || 1) > 1 && (
              <div className="dw-bonus">
                Bonus multiplier {round.bonusMultiplier}x
              </div>
            )}

            <div className="dw-grid" aria-label="Betting areas">
              {NUMBERS.map(renderArea)}
            </div>

            <section className="dw-controls" aria-label="Bet controls">
              <p className="dw-hint">
                Choose a chip, select numbers, then confirm before
                betting closes.
              </p>

              <div className="dw-row">
                {CHIPS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className="dw-chip"
                    aria-pressed={chip === value}
                    disabled={locked}
                    onClick={() => setChip(value)}
                  >
                    {money(value)}
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

              <div className="dw-money-grid">
                <AmountBox label="DRAFT BET" value={total} />
                <AmountBox label="PLACED THIS ROUND" value={committed} />
              </div>

              <p className="dw-hint">
                Maximum total stake: ₹25,000 per round.
              </p>

              <button
                type="button"
                className="dw-submit"
                disabled={busy || (!pending && (!open || !total))}
                onClick={submit}
              >
                {busy
                  ? "CONFIRMING…"
                  : pending
                    ? "RETRY SAME BET"
                    : "CONFIRM BET"}
              </button>

              <p className="dw-hint">
                Demo coins only. ₹ is the display symbol for virtual
                demo balance. Betting lasts 30 seconds. No new bets
                during the 10-second lock. The plan is locked before
                betting opens.
              </p>
            </section>

            {finalLanded && (
              <section className="dw-summary" role="status">
                <strong className="dw-result-heading">
                  Winner {result.winner} · Bonus {result.bonusMultiplier}x
                </strong>

                <div>Profit odds 1:{result.profitOdds}</div>

                <div className="dw-money-grid">
                  <AmountBox label="YOUR STAKE" value={committed} />
                  <AmountBox label="TOTAL RETURN" value={credited} />
                </div>

                <div style={{ marginTop: 10 }}>
                  <AmountBox
                    label="NET RESULT"
                    value={credited - committed}
                    signed
                  />
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
                      {round.proof.plan.map((step) => step.value).join(" → ")}
                    </p>
                    <p>Salt: {round.proof.salt}</p>
                  </>
                ) : (
                  <p>
                    The plan and verification salt are revealed
                    after the result.
                  </p>
                )}

                <p>
                  This checks that the revealed plan matches the
                  original hash. Outcomes are controller-planned.
                </p>
              </details>
            )}

            <p className="dw-hint">Last results · newest first</p>

            <div className="dw-recent">
              {(state?.recentResults || []).map((item) => (
                <span key={item.id}>
                  #{item.id} · {item.result.winner} · Bonus{" "}
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
              A Dream Wheel controller locks the full round plan
              before betting. The woman is an AI image host,
              not live video.
            </p>

            <p className="dw-hint">
              Betting lasts 30 seconds. After betting closes,
              one 10-second lock begins. The host pushes once at
              the outer rim and releases. The wheel slows
              automatically, stops by second 9, and the result
              appears at second 10.
            </p>

            <p className="dw-hint">
              The wheel uses only numbers 1, 2, 5, 10, 20 and 40,
              plus bonus sectors 2x and 7x. The numbers are profit
              odds. A winning bet receives its stake back plus
              profit. Other areas return zero.
            </p>

            <p className="dw-hint">
              Controller-selected bonus factors multiply the final
              profit without adding more spins.
            </p>

            <p className="dw-hint">
              Example: ₹10 in demo balance on number 5 with bonus
              factors 2x and 7x returns
              ₹10 + (₹10 × 5 × 2 × 7) = ₹710 total demo balance.
            </p>

            <p className="dw-hint">
              Minimum ₹10 in whole demo units per selected number.
              Maximum total stake ₹25,000 per customer per round.
              The plan hash can be checked after the result.
            </p>

            <table className="dw-table">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Base profit odds</th>
                </tr>
              </thead>
              <tbody>
                {NUMBERS.map((value) => (
                  <tr key={value}>
                    <td>{value}</td>
                    <td>1:{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="dw-hint">
              Virtual demo coins only. ₹ is used for display.
            </p>
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
                <table className="dw-table dw-history-table">
                  <thead>
                    <tr>
                      <th>Round / Time (IST)</th>
                      <th>Bets / Result</th>
                      <th>Stake</th>
                      <th>Total return</th>
                    </tr>
                  </thead>

                  <tbody>
                    {history.map((bet) => (
                      <tr key={bet.id}>
                        <td>
                          #{bet.roundId}
                          <br />
                          {new Date(bet.createdAt).toLocaleString(
                            "en-IN",
                            { timeZone: "Asia/Kolkata" }
                          )}
                        </td>
                        <td>
                          {(bet.bets || [])
                            .map(
                              (item) =>
                                `${item.area}: ${money(item.amount)}`
                            )
                            .join(", ")}
                          <br />
                          Winner {bet.result?.winner ?? "—"} · Bonus{" "}
                          {bet.result?.bonusMultiplier ?? 1}x
                        </td>
                        <td>
                          <AmountBox value={bet.stake} />
                        </td>
                        <td>
                          <AmountBox value={bet.payout} />
                        </td>
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
