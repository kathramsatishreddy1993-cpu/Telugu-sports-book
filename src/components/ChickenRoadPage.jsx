import React, { useEffect, useRef, useState } from "react";

const COINS = value =>
  Number(value || 0).toLocaleString("en-IN");

const FALLBACK_NAMES = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  daredevil: "DareDevil",
};

// Fast traffic from the first step.
const TRAFFIC_BASE_SPEED = 220;

function trafficVelocity(levelSpeed, step) {
  return (
    TRAFFIC_BASE_SPEED *
    Math.max(1, Number(levelSpeed) || 1) *
    (1 + Math.max(0, step - 1) * 0.12)
  );
}

function RoadCar({ lane = 1, down = false }) {
  const color = [
    "#e65353",
    "#31a6d6",
    "#edbf4c",
    "#9b77d4",
  ][lane % 4];

  return (
    <svg
      className={`cr-car-body ${
        down ? "cr-facing-down" : ""
      }`}
      viewBox="0 0 44 86"
      aria-hidden="true"
    >
      <ellipse
        cx="22"
        cy="46"
        rx="20"
        ry="37"
        fill="#15201e"
        opacity=".35"
      />

      <rect x="2" y="16" width="6" height="16" rx="2" fill="#101717" />
      <rect x="36" y="16" width="6" height="16" rx="2" fill="#101717" />
      <rect x="2" y="57" width="6" height="16" rx="2" fill="#101717" />
      <rect x="36" y="57" width="6" height="16" rx="2" fill="#101717" />

      <rect
        x="7"
        y="5"
        width="30"
        height="75"
        rx="11"
        fill={color}
        stroke="#132c33"
        strokeWidth="2"
      />

      <path
        d="M12 25 L32 25 L34 38 L10 38Z"
        fill="#a9e7ec"
        stroke="#244351"
        strokeWidth="2"
      />

      <rect
        x="12"
        y="41"
        width="20"
        height="20"
        rx="4"
        fill={color}
        stroke="#ffffff55"
        strokeWidth="2"
      />

      <path
        d="M11 64 L33 64 L31 72 L13 72Z"
        fill="#427584"
        stroke="#244351"
        strokeWidth="2"
      />

      <rect x="10" y="9" width="7" height="4" rx="1" fill="#fff2b8" />
      <rect x="27" y="9" width="7" height="4" rx="1" fill="#fff2b8" />
      <rect x="10" y="75" width="6" height="3" rx="1" fill="#aa202d" />
      <rect x="28" y="75" width="6" height="3" rx="1" fill="#aa202d" />
    </svg>
  );
}

function RoadTraffic({
  lanes,
  clearedStep,
  speed,
  collision,
}) {
  const nodes = useRef([]);
  const velocity = useRef(speed);

  velocity.current = speed;

  useEffect(() => {
    const media = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    );

    const distance = 545;

    const positions = Array.from(
      { length: lanes },
      (_, index) =>
        ((index * 0.273 + 0.18) % 1) * distance,
    );

    let frame;
    let previous = null;

    const paint = () => {
      nodes.current.forEach((node, index) => {
        if (!node) return;

        const down = index % 2 === 0;

        const y = down
          ? positions[index] - 100
          : 445 - positions[index];

        node.style.transform =
          `translate3d(0,${y}px,0)`;
      });
    };

    const animate = time => {
      const elapsed =
        previous === null
          ? 0
          : Math.min(
              50,
              Math.max(0, time - previous),
            );

      previous = time;

      for (let index = 0; index < lanes; index++) {
        positions[index] =
          (
            positions[index] +
            velocity.current * elapsed / 1000
          ) % distance;
      }

      paint();

      frame =
        window.requestAnimationFrame(animate);
    };

    const changed = () => {
      if (frame !== undefined) {
        window.cancelAnimationFrame(frame);
      }

      frame = undefined;
      previous = null;

      if (!media?.matches) {
        frame =
          window.requestAnimationFrame(animate);
      } else {
        nodes.current.forEach(node => {
          if (node) {
            node.style.transform =
              "translate3d(0,25px,0)";
          }
        });
      }
    };

    paint();
    changed();

    media?.addEventListener?.("change", changed);

    return () => {
      if (frame !== undefined) {
        window.cancelAnimationFrame(frame);
      }

      media?.removeEventListener?.(
        "change",
        changed,
      );
    };
  }, [lanes]);

  return (
    <div className="cr-traffic" aria-hidden="true">
      {Array.from({ length: lanes }, (_, index) => (
        <div
          key={index}
          ref={node => {
            nodes.current[index] = node;
          }}
          className="cr-car"
          data-lane={index + 1}
          hidden={
            index + 1 <= clearedStep ||
            collision
          }
          style={{
            left: 86 + index * 106 + 29,
          }}
        >
          <RoadCar
            lane={index + 1}
            down={index % 2 === 0}
          />
        </div>
      ))}
    </div>
  );
}

function readPending(key) {
  try {
    const saved = JSON.parse(
      sessionStorage.getItem(key) || "null",
    );

    return (
      ["play", "jump", "cashout"].includes(
        saved?.action,
      ) &&
      typeof saved.body?.requestKey === "string"
    )
      ? saved
      : null;
  } catch {
    return null;
  }
}

function writePending(key, value) {
  try {
    sessionStorage.setItem(
      key,
      JSON.stringify(value),
    );
    return true;
  } catch {
    return false;
  }
}

function removePending(key) {
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

async function api(path, options = {}) {
  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    15000,
  );

  try {
    const response = await fetch(
      `/api/chicken-road/${path}`,
      {
        ...options,
        credentials: "same-origin",
        cache: "no-store",
        signal: controller.signal,
      },
    );

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

export default function ChickenRoadPage({
  user,
  onBack,
  onLogout,
}) {
  const customerId =
    user?.id ??
    user?.customerId ??
    user?.customer_id;

  const storageKey =
    `tsb_chicken_pending_v1:${customerId}`;

  return customerId ? (
    <ChickenGame
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
        type="button"
        onClick={onBack}
        className="ml-4 underline"
      >
        Back
      </button>
    </main>
  );
}

function ChickenGame({
  user,
  onBack,
  onLogout,
  storageKey,
}) {
  const [rules, setRules] = useState(null);
  const [data, setData] = useState(null);
  const [amount, setAmount] = useState("10");
  const [difficulty, setDifficulty] = useState("easy");
  const [tab, setTab] = useState("game");
  const [history, setHistory] = useState([]);

  const [pending, setPending] = useState(() =>
    readPending(storageKey),
  );

  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [visualStep, setVisualStep] = useState(0);
  const [motion, setMotion] = useState("");
  const [sound, setSound] = useState(false);

  const alive = useRef(false);
  const running = useRef(false);
  const recovery = useRef(pending);
  const version = useRef(0);
  const timer = useRef(null);
  const scroller = useRef(null);
  const audio = useRef(null);

  const session = data?.session;
  const activeGame = session?.status === "ACTIVE";

  const selectedDifficulty = activeGame
    ? session.difficulty
    : difficulty;

  const level =
    rules?.levels?.[selectedDifficulty];

  const lanes = level?.lanes || 30;

  const trafficSpeed = trafficVelocity(
    level?.speed || 1,
    visualStep,
  );

  const locked =
    busy || Boolean(pending) || loading;

  const prepareAudio = () => {
    if (!sound) return;

    try {
      const AudioContext =
        window.AudioContext ||
        window.webkitAudioContext;

      if (!audio.current && AudioContext) {
        audio.current = new AudioContext();
      }

      audio.current?.resume()?.catch(() => {});
    } catch {}
  };

  const tone = collision => {
    if (!sound || !audio.current) return;

    try {
      const ctx = audio.current;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = collision
        ? "triangle"
        : "sine";

      oscillator.frequency.setValueAtTime(
        collision ? 180 : 700,
        ctx.currentTime,
      );

      oscillator.frequency.exponentialRampToValueAtTime(
        collision ? 45 : 1100,
        ctx.currentTime + 0.16,
      );

      gain.gain.setValueAtTime(
        0.055,
        ctx.currentTime,
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        ctx.currentTime + 0.22,
      );

      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.22);
    } catch {}
  };

  const loadState = async () => {
    const currentVersion = version.current;

    try {
      const value = await api("state");

      if (
        !alive.current ||
        currentVersion !== version.current ||
        running.current
      ) {
        return;
      }

      setData(value);
      setVisualStep(value.session?.step || 0);

      if (value.session?.status === "ACTIVE") {
        setDifficulty(value.session.difficulty);
        setAmount(String(value.session.stake));
      }
    } catch (err) {
      if (
        alive.current &&
        currentVersion === version.current
      ) {
        setError(err.message);
      }
    } finally {
      if (
        alive.current &&
        currentVersion === version.current
      ) {
        setLoading(false);
      }
    }
  };

  const loadRules = async () => {
    try {
      const value = await api("rules");
      if (alive.current) setRules(value);
    } catch (err) {
      if (alive.current) setError(err.message);
    }
  };

  const loadHistory = async () => {
    try {
      const value = await api("history");

      if (alive.current) {
        setHistory(value.sessions || []);
      }
    } catch (err) {
      if (alive.current) setError(err.message);
    }
  };

  const loadRef = useRef(null);
  loadRef.current = loadState;

  useEffect(() => {
    alive.current = true;

    void loadRules();
    void loadRef.current();

    const focus = () => {
      if (!running.current) {
        void loadRef.current();
      }
    };

    window.addEventListener("focus", focus);

    return () => {
      alive.current = false;

      if (timer.current !== null) {
        clearTimeout(timer.current);
      }

      window.removeEventListener("focus", focus);
      audio.current?.close()?.catch(() => {});
    };
  }, []);

  useEffect(() => {
    const element = scroller.current;
    if (!element) return;

    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    element.scrollTo({
      left: Math.max(
        0,
        visualStep * 106 -
          element.clientWidth / 2 +
          85,
      ),
      behavior: reduced ? "auto" : "smooth",
    });
  }, [visualStep, tab]);

  const finish = value => {
    if (!alive.current) return;

    setData(value);
    setVisualStep(value.session?.step || 0);
    setMotion("");
    setBusy(false);
    setLoading(false);
    running.current = false;

    setNotice(
      value.event === "COLLISION"
        ? "Collision. This round has ended."
        : value.event === "COMPLETED"
          ? "Final lane completed. Your demo return was credited."
          : value.event === "CASHED_OUT"
            ? "Cash out completed."
            : value.event === "SAFE"
              ? "Safe crossing. Jump again or cash out whenever you choose."
              : "Game started. Press JUMP to move.",
    );

    window.dispatchEvent(
      new Event("demo-balance-updated"),
    );

    void loadRef.current();
  };

  const perform = async requestedAction => {
    if (running.current) return;

    let job = recovery.current;

    if (!job) {
      if (!rules || loading || !data) {
        setError(
          "Wait for rules and balance to load.",
        );
        return;
      }

      if (requestedAction === "play") {
        const stake = Number(amount);

        if (activeGame) return;

        if (
          !Number.isSafeInteger(stake) ||
          stake < rules.minStake ||
          stake > rules.maxStake
        ) {
          setError(
            "Stake must be 10–25,000 whole demo coins.",
          );
          return;
        }

        if (stake > Number(data.balance)) {
          setError("LOW BALANCE");
          return;
        }

        if (
          !Object.hasOwn(rules.levels, difficulty)
        ) {
          setError("Select a valid difficulty.");
          return;
        }

        job = {
          action: "play",
          body: {
            difficulty,
            amount: stake,
          },
        };
      } else {
        if (
          !activeGame ||
          !["jump", "cashout"].includes(
            requestedAction,
          )
        ) {
          return;
        }

        job = {
          action: requestedAction,
          body: {
            sessionId: String(session.id),
          },
        };
      }

      try {
        job.body.requestKey = uniqueKey();
      } catch {
        setError(
          "A secure HTTPS browser connection is required.",
        );
        return;
      }

      if (!writePending(storageKey, job)) {
        setError(
          "Enable browser session storage to recover interrupted actions.",
        );
        return;
      }

      recovery.current = job;
      setPending(job);
    }

    running.current = true;
    version.current += 1;

    setBusy(true);
    setError("");
    setNotice("");
    prepareAudio();

    try {
      const value = await api(job.action, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(job.body),
      });

      removePending(storageKey);
      recovery.current = null;

      if (!alive.current) return;

      setPending(null);

      const reduced = window.matchMedia?.(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (
        job.action === "jump" &&
        !value.replayed &&
        !reduced
      ) {
        const collision =
          value.event === "COLLISION";

        setMotion(
          collision ? "collision" : "jump",
        );

        setVisualStep(
          value.session.step +
            (collision ? 1 : 0),
        );

        tone(collision);

        timer.current = setTimeout(() => {
          timer.current = null;
          finish(value);
        }, collision ? 850 : 600);
      } else {
        tone(value.event === "COLLISION");
        finish(value);
      }
    } catch (err) {
      if (!alive.current) return;

      if (
        [400, 401, 403, 404, 409, 422].includes(
          err.status,
        )
      ) {
        removePending(storageKey);
        recovery.current = null;
        setPending(null);
      }

      setError(
        err.status
          ? err.message
          : "Connection interrupted. Press RETRY SAME ACTION. Your request will not be charged twice.",
      );

      running.current = false;
      setBusy(false);
      setLoading(false);
      void loadRef.current();
    }
  };

  const chickenLeft =
    visualStep === 0
      ? 18
      : 86 + (visualStep - 1) * 106 + 23;

  return (
    <div className="cr-page">
      <style>{`
        .cr-page{min-height:100vh;background:#202725;color:#f8f5e8;font-family:Arial,sans-serif;padding-bottom:24px}
        .cr-page *{box-sizing:border-box}
        .cr-page button,.cr-page input,.cr-page select{font:inherit}
        .cr-page button{cursor:pointer}
        .cr-page button:disabled{opacity:.45;cursor:default}
        .cr-header{display:flex;gap:12px;align-items:center;padding:15px;background:#121c19;border-bottom:1px solid #ffffff20}
        .cr-header h1{margin:0;font-size:17px;color:#f9d875}
        .cr-header small{display:block;font-size:10px;color:#cad6cc;margin-top:5px}
        .cr-wallet{margin-left:auto;text-align:right;font-weight:bold}
        .cr-wrap{max-width:900px;margin:auto;padding:12px}
        .cr-tabs,.cr-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px}
        .cr-row{margin-top:12px}
        .cr-btn{padding:10px 12px;border:1px solid #ffffff30;border-radius:8px;background:#ffffff10;color:inherit}
        .cr-tabs [aria-pressed=true]{background:#ecd381;color:#243229}
        .cr-alert{border:1px solid #d8b266;background:#4d331e;color:#ffe8b4;padding:12px;border-radius:10px;font-size:13px;line-height:1.7;margin:12px 0}
        .cr-alert button{margin:5px}
        .cr-hint{font-size:12px;line-height:1.7;color:#d0dad4}

        .cr-road-window{position:relative;overflow:auto;border:2px solid #59635e;border-radius:15px;background:#73716a;scrollbar-color:#d9c17e #4e5550;touch-action:pan-x pan-y}
        .cr-road{position:relative;display:flex;height:345px;min-width:100%;isolation:isolate}
        .cr-sidewalk{width:86px;flex-shrink:0;background:repeating-linear-gradient(0deg,#a4a898 0 45px,#7c8475 46px 49px);border-right:5px solid #cad0bb;position:relative}
        .cr-sidewalk::before{content:'🌳';position:absolute;top:20px;font-size:70px;left:-20px}
        .cr-lane{width:106px;flex-shrink:0;position:relative;border-right:3px dashed #d2d0bc;background:#73716a}
        .cr-lane.is-safe{background:#617866}
        .cr-multiplier{position:absolute;left:10px;right:10px;top:174px;height:76px;display:flex;flex-direction:column;gap:4px;align-items:center;justify-content:center;border:4px solid #51564d;border-radius:50%;background:repeating-linear-gradient(90deg,#85877b 0 5px,#737569 6px 10px);font-weight:900;color:#e5e5d8;text-shadow:0 2px 1px #333;font-size:18px}
        .cr-multiplier small{font-size:9px;color:#d9dfd1}

        .cr-traffic{position:absolute;inset:0;z-index:2;pointer-events:none;overflow:hidden}
        .cr-car{position:absolute;top:0;width:44px;height:86px;will-change:transform;pointer-events:none}
        .cr-car[hidden]{display:none}
        .cr-car-body{display:block;width:44px;height:86px}
        .cr-facing-down{transform:rotate(180deg)}

        .cr-player{position:absolute;z-index:4;top:160px;font-size:57px;width:60px;height:80px;transition:left .55s ease;filter:drop-shadow(1px 5px 2px #0006)}
        .cr-player.cr-jump{animation:crHop .55s ease}
        .cr-player.cr-collision{animation:crHit .8s ease forwards}
        .cr-crash-car{position:absolute;z-index:5;top:0;width:44px;height:86px;animation:crCrash .8s linear forwards;pointer-events:none}

        .cr-controls,.cr-card{border:1px solid #ffffff25;border-radius:14px;padding:15px;background:#101a1680;margin-top:14px}
        .cr-input,.cr-select{padding:12px;border:1px solid #ffffff40;border-radius:8px;background:#39433d;color:white}
        .cr-input{width:140px}
        .cr-select{width:100%}
        .cr-play,.cr-jump-btn,.cr-cashout{border:0;border-radius:11px;padding:16px;font-weight:900;color:#112b1e;min-height:57px;background:#4bd37a}
        .cr-play{width:100%;margin-top:15px}
        .cr-actions{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}
        .cr-cashout{background:#f0cf74;color:#352812}
        .cr-result{margin-top:14px;border:1px solid #e0c47c;border-radius:12px;text-align:center;padding:15px;line-height:1.8}
        .cr-result strong{font-size:22px;color:#f9dc89}
        .cr-multiplier-list{display:flex;gap:7px;flex-wrap:wrap}
        .cr-multiplier-list span{border:1px solid #ffffff20;padding:7px;border-radius:7px;font-size:11px}
        .cr-table{width:100%;font-size:12px;border-collapse:collapse}
        .cr-table th,.cr-table td{text-align:left;padding:10px 5px;border-bottom:1px solid #ffffff20}
        .cr-table th{color:#e7d092}
        .cr-overflow{overflow:auto}
        .cr-page :focus-visible{outline:3px solid #ffe5a1;outline-offset:3px}

        @keyframes crHop {
          0%,100%{transform:translateY(0)}
          50%{transform:translateY(-35px)}
        }

        @keyframes crHit {
          0%{transform:rotate(0)}
          60%,100%{transform:rotate(100deg) scale(.65);opacity:.3}
        }

        @keyframes crCrash {
          from{transform:translateY(-100px)}
          to{transform:translateY(420px)}
        }

        @media(max-width:360px) {
          .cr-wrap{padding:8px}
          .cr-header{padding:12px 8px}
          .cr-header h1{font-size:14px}
        }

        @media(prefers-reduced-motion:reduce) {
          .cr-player{transition:none}
          .cr-player.cr-jump,.cr-player.cr-collision,.cr-crash-car{animation:none}
        }
      `}</style>

      <header className="cr-header">
        <button
          type="button"
          className="cr-btn"
          onClick={onBack}
          aria-label="Customer home"
        >
          ←
        </button>

        <div>
          <h1>CHICKEN ROAD CROSS</h1>
          <small>INDIVIDUAL DEMO · DEMO COINS ONLY</small>
        </div>

        <div className="cr-wallet">
          {data ? COINS(data.balance) : "…"}
          <small>
            {user?.name || user?.loginId || "Customer"}
          </small>
        </div>
      </header>

      <main className="cr-wrap">
        <nav className="cr-tabs" aria-label="Game sections">
          {["game", "rules", "history"].map(value => (
            <button
              key={value}
              type="button"
              className="cr-btn"
              aria-pressed={tab === value}
              disabled={busy}
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
            className="cr-btn"
            aria-pressed={sound}
            onClick={() => {
              if (sound) {
                audio.current?.suspend()?.catch(() => {});
              }
              setSound(value => !value);
            }}
          >
            {sound ? "SOUND ON" : "SOUND OFF"}
          </button>
        </nav>

        {error && (
          <div className="cr-alert" role="alert">
            {error}

            <button
              type="button"
              className="cr-btn"
              disabled={busy}
              onClick={() => {
                setError("");
                void loadRules();
                void loadRef.current();
              }}
            >
              Refresh
            </button>
          </div>
        )}

        {notice && (
          <p role="status" className="cr-hint">
            {notice}
          </p>
        )}

        {pending && (
          <div className="cr-alert" role="status">
            An interrupted {pending.action} needs recovery.
            Retry uses the same request.

            <button
              type="button"
              className="cr-btn"
              disabled={busy}
              onClick={() => void perform(pending.action)}
            >
              {busy ? "CHECKING…" : "RETRY SAME ACTION"}
            </button>
          </div>
        )}

        {tab === "game" && (
          <>
            <div
              className="cr-road-window"
              ref={scroller}
              role="region"
              aria-label="Road lanes. Swipe horizontally to view."
              tabIndex={0}
            >
              <div
                className="cr-road"
                style={{ width: 86 + lanes * 106 + 70 }}
              >
                <div className="cr-sidewalk" />

                {Array.from(
                  { length: lanes },
                  (_, i) => i + 1,
                ).map(step => (
                  <div
                    key={step}
                    className={`cr-lane ${
                      session && step <= session.step
                        ? "is-safe"
                        : ""
                    }`}
                  >
                    <div className="cr-multiplier">
                      {level?.multipliers?.[
                        step - 1
                      ]?.toFixed(2) || "—"}x
                      <small>LANE {step}</small>
                    </div>
                  </div>
                ))}

                <RoadTraffic
                  lanes={lanes}
                  clearedStep={session?.step || 0}
                  speed={trafficSpeed}
                  collision={motion === "collision"}
                />

                <div
                  className={`cr-player ${
                    motion ? `cr-${motion}` : ""
                  }`}
                  style={{ left: chickenLeft }}
                  role="img"
                  aria-label={`Chicken at lane ${visualStep}`}
                >
                  🐔
                </div>

                {motion === "collision" && (
                  <span
                    className="cr-crash-car"
                    aria-hidden="true"
                    style={{ left: chickenLeft + 5 }}
                  >
                    <RoadCar down />
                  </span>
                )}
              </div>
            </div>

            <section
              className="cr-controls"
              aria-label="Game controls"
            >
              {activeGame ? (
                <>
                  <p className="cr-hint">
                    {session.difficultyName} · Lane{" "}
                    {session.step}/{session.lanes} · Stake{" "}
                    {COINS(session.stake)} ·{" "}
                    {session.multiplier.toFixed(2)}x
                  </p>

                  <p className="cr-hint">
                    No time limit. The chicken stays here
                    until you press JUMP or CASH OUT.
                  </p>

                  <div className="cr-actions">
                    <button
                      type="button"
                      className="cr-jump-btn"
                      disabled={locked}
                      onClick={() => void perform("jump")}
                    >
                      JUMP →
                    </button>

                    <button
                      type="button"
                      className="cr-cashout"
                      disabled={locked}
                      onClick={() => void perform("cashout")}
                    >
                      CASH OUT
                      <br />
                      {COINS(session.cashoutValue)}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <label className="cr-hint" htmlFor="cr-stake">
                    Demo stake
                  </label>

                  <div className="cr-row">
                    <button
                      type="button"
                      className="cr-btn"
                      disabled={locked}
                      onClick={() => setAmount("10")}
                    >
                      MIN
                    </button>

                    <input
                      id="cr-stake"
                      type="number"
                      inputMode="numeric"
                      min="10"
                      max="25000"
                      step="1"
                      className="cr-input"
                      value={amount}
                      disabled={locked}
                      onChange={event =>
                        setAmount(event.target.value)
                      }
                    />

                    <button
                      type="button"
                      className="cr-btn"
                      disabled={locked}
                      onClick={() => setAmount("25000")}
                    >
                      MAX
                    </button>
                  </div>

                  <div className="cr-row">
                    {[10, 20, 100, 200, 500, 1000].map(value => (
                      <button
                        key={value}
                        type="button"
                        className="cr-btn"
                        disabled={locked}
                        onClick={() => setAmount(String(value))}
                      >
                        {COINS(value)}
                      </button>
                    ))}
                  </div>

                  <label
                    htmlFor="cr-difficulty"
                    className="cr-hint"
                  >
                    Difficulty
                  </label>

                  <select
                    id="cr-difficulty"
                    className="cr-select"
                    value={difficulty}
                    disabled={locked}
                    onChange={event =>
                      setDifficulty(event.target.value)
                    }
                  >
                    {Object.entries(FALLBACK_NAMES).map(
                      ([id, name]) => (
                        <option key={id} value={id}>
                          {name} ·{" "}
                          {rules?.levels?.[id]?.lanes || "—"}
                          {" lanes · starts "}
                          {rules?.levels?.[
                            id
                          ]?.first?.toFixed(2) || "—"}x
                        </option>
                      ),
                    )}
                  </select>

                  <button
                    type="button"
                    className="cr-play"
                    disabled={locked || !rules || !data}
                    onClick={() => void perform("play")}
                  >
                    {busy ? "STARTING…" : "PLAY"}
                  </button>
                </>
              )}

              <p className="cr-hint">
                Traffic speed{" "}
                {(trafficSpeed / TRAFFIC_BASE_SPEED).toFixed(2)}x
                {" · "}increases as you cross more lanes.
              </p>

              <p className="cr-hint">
                Vehicles are animation. Each JUMP gets a
                random server result; timing the moving
                cars does not improve your odds.
              </p>
            </section>

            {session && session.status !== "ACTIVE" && (
              <section className="cr-result" role="status">
                <strong>
                  {session.status === "LOST"
                    ? "COLLISION"
                    : "CASHED OUT"}
                </strong>

                <div>
                  Lane {session.step} · Stake{" "}
                  {COINS(session.stake)}
                </div>

                <div>
                  Total return {COINS(session.payout)} · Net{" "}
                  {session.payout - session.stake >= 0
                    ? "+"
                    : ""}
                  {COINS(session.payout - session.stake)}
                  {" demo coins"}
                </div>
              </section>
            )}
          </>
        )}

        {tab === "rules" && (
          <section className="cr-card">
            <h2>How to play</h2>

            <p className="cr-hint">
              Choose a stake and difficulty, then press
              PLAY. Your stake is deducted once. Each JUMP
              attempts one lane. A safe crossing increases
              the cashout multiplier; a collision ends the
              game with zero return. There is no automatic
              jumping or waiting timeout. Waiting does not
              change the crossing odds.
            </p>

            <p className="cr-hint">
              CASH OUT returns the shown total to your demo
              balance. Cashing out before the first jump
              returns your original stake. Completing the
              final lane cashes out automatically.
              Difficulty and stake cannot change during
              an active game.
            </p>

            <p className="cr-hint">
              Minimum 10 · Maximum 25,000 whole demo coins.
              Multipliers include the original stake;
              payouts round down to whole coins. Demo
              target return {rules?.targetReturnPercent || 97}%.
              Whole-coin rounding can reduce it. Vehicle
              animation and player timing do not determine
              outcomes.
            </p>

            {Object.entries(rules?.levels || {}).map(
              ([id, item]) => (
                <div key={id}>
                  <h3>
                    {item.name} · {item.lanes} lanes
                  </h3>

                  <div className="cr-multiplier-list">
                    {item.multipliers.map((value, index) => (
                      <span key={index}>
                        {index + 1}: {value.toFixed(2)}x
                      </span>
                    ))}
                  </div>
                </div>
              ),
            )}
          </section>
        )}

        {tab === "history" && (
          <section className="cr-card">
            <h2>Your completed games</h2>

            <button
              type="button"
              className="cr-btn"
              onClick={() => void loadHistory()}
            >
              Refresh history
            </button>

            {history.length ? (
              <div className="cr-overflow">
                <table className="cr-table">
                  <thead>
                    <tr>
                      <th>Game / Time</th>
                      <th>Difficulty / Lane</th>
                      <th>Stake</th>
                      <th>Total return</th>
                    </tr>
                  </thead>

                  <tbody>
                    {history.map(item => (
                      <tr key={item.id}>
                        <td>
                          #{item.id}
                          <br />
                          {new Date(item.updatedAt).toLocaleString(
                            "en-IN",
                            { timeZone: "Asia/Kolkata" },
                          )}
                        </td>

                        <td>
                          {item.difficultyName} · {item.step}
                          <br />
                          {item.status}
                        </td>

                        <td>{COINS(item.stake)}</td>
                        <td>{COINS(item.payout)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="cr-hint">
                No completed games available.
              </p>
            )}
          </section>
        )}

        <footer className="cr-row">
          <button
            type="button"
            className="cr-btn"
            onClick={onBack}
          >
            ← Customer home
          </button>

          {onLogout && (
            <button
              type="button"
              className="cr-btn"
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
