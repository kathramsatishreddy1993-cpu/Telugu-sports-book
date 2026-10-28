import React, {
  useEffect,
  useRef,
  useState,
} from "react";

const COINS = value =>
  Number(value || 0).toLocaleString("en-IN");

const ELEMENTS = {
  water: {
    name: "WATER",
    icon: "💧",
    color: "#36b7e9",
  },
  earth: {
    name: "EARTH",
    icon: "🌿",
    color: "#66c474",
  },
  fire: {
    name: "FIRE",
    icon: "🔥",
    color: "#f5a34c",
  },
  wind: {
    name: "WIND",
    icon: "〰",
    color: "#b9c7d1",
  },
  skull: {
    name: "SKULL",
    icon: "☠",
    color: "#b58ae5",
  },
};

function readPending(key) {
  try {
    const saved = JSON.parse(
      sessionStorage.getItem(key) || "null",
    );

    return (
      ["spin", "partial", "cashout"].includes(
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
    value =>
      value.toString(16).padStart(2, "0"),
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
      `/api/twist-x/${path}`,
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

function ElementWheel({
  rotation,
  rings,
  banks,
  result,
  busy,
  bonuses,
}) {
  const arc = (radius, start, end) => {
    const point = angle => [
      180 +
        radius *
          Math.cos(angle * Math.PI / 180),
      180 +
        radius *
          Math.sin(angle * Math.PI / 180),
    ];

    const from = point(start);
    const to = point(end);

    return (
      `M${from[0]},${from[1]} ` +
      `A${radius},${radius} 0 0 1 ` +
      `${to[0]},${to[1]}`
    );
  };

  const names = ["fire", "earth", "water"];
  const selected = ELEMENTS[result?.sector];

  return (
    <div className="tx-wheel-box">
      <svg
        viewBox="0 0 360 360"
        className="tx-wheel"
        role="img"
        aria-label="Element wheel"
      >
        <defs>
          <radialGradient id="tx-silver">
            <stop stopColor="#fff" />
            <stop
              offset=".55"
              stopColor="#e8ecef"
            />
            <stop
              offset=".8"
              stopColor="#b9c1c8"
            />
            <stop
              offset="1"
              stopColor="#f8fafc"
            />
          </radialGradient>

          <linearGradient id="tx-metal">
            <stop stopColor="#b4bec7" />
            <stop
              offset=".45"
              stopColor="#fff"
            />
            <stop
              offset="1"
              stopColor="#c0c8d0"
            />
          </linearGradient>
        </defs>

        <circle
          cx="180"
          cy="180"
          r="167"
          fill="url(#tx-silver)"
          stroke="#aeb8c1"
          strokeWidth="2"
        />

        <g
          className="tx-discs"
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: "180px 180px",
          }}
        >
          {names.map((name, ring) => {
            const radius = 146 - ring * 31;

            return (
              <g
                key={name}
                aria-label={
                  `${ELEMENTS[name].name} circle, ` +
                  `${rings[name]} filled sections`
                }
              >
                <circle
                  cx="180"
                  cy="180"
                  r={radius}
                  fill="none"
                  stroke="url(#tx-metal)"
                  strokeWidth="27"
                />

                {Array.from(
                  { length: 7 },
                  (_, index) => {
                    const start =
                      -90 + index * 360 / 7 + 2;

                    const end =
                      -90 +
                      (index + 1) * 360 / 7 -
                      2;

                    const angle =
                      (start + end) /
                      2 *
                      Math.PI /
                      180;

                    const x =
                      180 +
                      radius * Math.cos(angle);

                    const y =
                      180 +
                      radius * Math.sin(angle);

                    const label =
                      name === "fire" &&
                      index === 6
                        ? "BONUS"
                        : `${
                            banks?.[name]?.[
                              index + 1
                            ] ?? "—"
                          }x`;

                    const filled =
                      index < rings[name];

                    return (
                      <g key={index}>
                        <path
                          d={arc(
                            radius,
                            start,
                            end,
                          )}
                          fill="none"
                          stroke={
                            filled
                              ? ELEMENTS[name].color
                              : "#ffffff66"
                          }
                          strokeWidth="23"
                        />

                        <text
                          x={x}
                          y={y}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill={
                            filled
                              ? "#183240"
                              : "#65727e"
                          }
                          fontSize={
                            label === "BONUS"
                              ? 8
                              : 11
                          }
                          fontWeight="800"
                          transform={
                            `rotate(${
                              (start + end) /
                                2 +
                              90
                            },${x},${y})`
                          }
                        >
                          {label}
                        </text>
                      </g>
                    );
                  },
                )}
              </g>
            );
          })}
        </g>

        <circle
          cx="180"
          cy="180"
          r="63"
          fill="url(#tx-silver)"
          stroke="#fff"
          strokeWidth="4"
        />

        <circle
          cx="180"
          cy="180"
          r="52"
          fill="#f7f9fb"
          stroke="#c3cbd2"
          strokeWidth="2"
        />

        <text
          x="180"
          y="187"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="43"
        >
          {busy
            ? "🌀"
            : selected?.icon || "🔥"}
        </text>

        <text
          x="180"
          y="218"
          textAnchor="middle"
          fill="#5a6673"
          fontSize="9"
          fontWeight="800"
        >
          {busy
            ? "SPINNING"
            : selected?.name || "TWIST X"}
        </text>
      </svg>

      <div className="tx-wheel-badges">
        {["water", "earth", "fire"].map(
          name => (
            <span
              key={name}
              style={{
                "--tx-color":
                  ELEMENTS[name].color,
              }}
            >
              {ELEMENTS[name].icon}{" "}
              {name === "fire"
                ? `BONUS ${
                    Math.max(
                      ...(bonuses || [0]),
                    )
                  }x`
                : `${
                    banks?.[name]?.[7] ??
                    "—"
                  }x`}
            </span>
          ),
        )}
      </div>

      <div className="tx-neutral">
        〰 WIND · keeps progress
        <span>
          ☠ SKULL · one step back
        </span>
      </div>
    </div>
  );
}

function BankRing({ name, step, values }) {
  const element = ELEMENTS[name];

  return (
    <section
      className="tx-ring-card"
      style={{
        "--tx-color": element.color,
      }}
      aria-label={
        `${element.name} circle, ` +
        `${step} filled sections`
      }
    >
      <strong>
        {element.icon} {element.name}
      </strong>

      <div className="tx-progress-dots">
        {Array.from(
          { length: 7 },
          (_, index) => (
            <i
              key={index}
              className={
                index < step ? "filled" : ""
              }
            />
          ),
        )}
      </div>

      <span>
        {step}/7 ·{" "}
        {values?.[step]?.toFixed(2) ||
          "0.00"}
        x
      </span>
    </section>
  );
}

export default function TwistXPage({
  user,
  onBack,
  onLogout,
}) {
  const customerId =
    user?.id ??
    user?.customerId ??
    user?.customer_id;

  const storageKey =
    `tsb_twist_pending_v1:${customerId}`;

  return customerId ? (
    <TwistGame
      key={storageKey}
      {...{
        user,
        onBack,
        onLogout,
        storageKey,
      }}
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

function TwistGame({
  user,
  onBack,
  onLogout,
  storageKey,
}) {
  const [rules, setRules] = useState(null);
  const [data, setData] = useState(null);

  const [amount, setAmount] = useState("10");
  const [tab, setTab] = useState("game");
  const [history, setHistory] = useState([]);

  const [pending, setPending] = useState(
    () => readPending(storageKey),
  );

  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [sound, setSound] = useState(false);

  const alive = useRef(false);
  const running = useRef(false);
  const recovery = useRef(pending);
  const version = useRef(0);
  const timer = useRef(null);
  const rotationRef = useRef(0);
  const audio = useRef(null);
  const loadRef = useRef(null);

  const session = data?.session;
  const activeGame =
    session?.status === "ACTIVE";

  const rings = activeGame
    ? session.rings
    : { water: 0, earth: 0, fire: 0 };

  const filled = Object.values(rings).some(
    value => value > 0,
  );

  const locked =
    busy || Boolean(pending) || loading;

  const sectors = rules?.sectors || [];

  const prepareAudio = () => {
    if (!sound) return;

    try {
      const AudioContext =
        window.AudioContext ||
        window.webkitAudioContext;

      if (!audio.current && AudioContext) {
        audio.current = new AudioContext();
      }

      audio.current
        ?.resume()
        ?.catch(() => {});
    } catch {}
  };

  const tone = skull => {
    if (!sound || !audio.current) return;

    try {
      const ctx = audio.current;
      const oscillator =
        ctx.createOscillator();

      const gain = ctx.createGain();

      oscillator.type = "sine";

      oscillator.frequency.setValueAtTime(
        skull ? 180 : 660,
        ctx.currentTime,
      );

      oscillator.frequency
        .exponentialRampToValueAtTime(
          skull ? 80 : 990,
          ctx.currentTime + 0.2,
        );

      gain.gain.setValueAtTime(
        0.05,
        ctx.currentTime,
      );

      gain.gain
        .exponentialRampToValueAtTime(
          0.0001,
          ctx.currentTime + 0.25,
        );

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.start();
      oscillator.stop(
        ctx.currentTime + 0.25,
      );
    } catch {}
  };

  const loadState = async () => {
    const current = version.current;

    try {
      const value = await api("state");

      if (
        !alive.current ||
        current !== version.current ||
        running.current
      ) {
        return;
      }

      setData(value);

      if (
        value.session?.status === "ACTIVE"
      ) {
        setAmount(
          String(value.session.amount),
        );
      }
    } catch (err) {
      if (
        alive.current &&
        current === version.current
      ) {
        setError(err.message);
      }
    } finally {
      if (
        alive.current &&
        current === version.current
      ) {
        setLoading(false);
      }
    }
  };

  const loadRules = async () => {
    try {
      const value = await api("rules");

      if (alive.current) {
        setRules(value);
      }
    } catch (err) {
      if (alive.current) {
        setError(err.message);
      }
    }
  };

  const loadHistory = async () => {
    try {
      const value = await api("history");

      if (alive.current) {
        setHistory(value.actions || []);
      }
    } catch (err) {
      if (alive.current) {
        setError(err.message);
      }
    }
  };

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

    window.addEventListener(
      "focus",
      focus,
    );

    const poll = setInterval(
      focus,
      5000,
    );

    return () => {
      alive.current = false;

      clearInterval(poll);

      if (timer.current !== null) {
        clearTimeout(timer.current);
      }

      window.removeEventListener(
        "focus",
        focus,
      );

      audio.current
        ?.close()
        ?.catch(() => {});
    };
  }, []);

  const finish = value => {
    if (!alive.current) return;

    setData(value);
    setResult(value);
    setBusy(false);
    setLoading(false);

    running.current = false;

    tone(value.sector === "skull");

    setNotice(
      value.action === "cashout"
        ? "Cash out completed. Circles cleared."
        : value.action === "partial"
          ? "Part Payout credited. Eligible circles moved back one section."
          : value.sector === "wind"
            ? "Wind: this spin stake was spent; circle sections stay."
            : value.sector === "skull"
              ? "Skull: each circle moved back one section."
              : value.bonusMultiplier
                ? `Fire bonus ${value.bonusMultiplier}x credited. Fire reset to zero.`
                : value.payout > 0
                  ? "Full circle payout credited. That circle returned to section 6."
                  : "One section added to the selected circle.",
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

      if (requestedAction === "spin") {
        const stake = Number(amount);

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
          filled &&
          stake !== session.amount
        ) {
          setError(
            "Cash out before changing the stake.",
          );

          return;
        }

        job = {
          action: "spin",
          body: { amount: stake },
        };
      } else {
        if (
          !activeGame ||
          !["partial", "cashout"].includes(
            requestedAction,
          )
        ) {
          return;
        }

        if (
          requestedAction === "partial" &&
          session.partialValue < 1
        ) {
          return;
        }

        if (
          requestedAction === "cashout" &&
          session.cashoutValue < 1
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
    setResult(null);

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
        job.action === "spin" &&
        !value.replayed &&
        !reduced &&
        sectors.length
      ) {
        const total = sectors.reduce(
          (sum, item) =>
            sum + item.weight,
          0,
        );

        let preceding = 0;
        let target = 0;

        for (const item of sectors) {
          if (item.id === value.sector) {
            target =
              (
                preceding +
                item.weight / 2
              ) / total * 360;

            break;
          }

          preceding += item.weight;
        }

        const desired =
          (360 - target) % 360;

        const current =
          (
            (rotationRef.current % 360) +
            360
          ) % 360;

        const next =
          rotationRef.current +
          1800 +
          (desired - current + 360) % 360;

        rotationRef.current = next;
        setRotation(next);

        timer.current = setTimeout(() => {
          timer.current = null;
          finish(value);
        }, 2600);
      } else {
        finish(value);
      }
    } catch (err) {
      if (!alive.current) return;

      if (
        [
          400,
          401,
          403,
          404,
          409,
          422,
        ].includes(err.status)
      ) {
        removePending(storageKey);
        recovery.current = null;
        setPending(null);
      }

      setError(
        err.status
          ? err.message
          : "Connection interrupted. Press RETRY SAME ACTION. Your spin will not be charged twice.",
      );

      running.current = false;

      setBusy(false);
      setLoading(false);

      void loadRef.current();
    }
  };

  return (
    <div className="tx-page">
      <style>{`
        .tx-page {
          min-height: 100vh;
          background: radial-gradient(
            ellipse at 30% 15%,
            #fff 0%,
            #f1f3f5 35%,
            #dfe4e9 72%,
            #fafbfc 100%
          );
          color: #344452;
          font-family: Arial, sans-serif;
          padding-bottom: 25px;
        }

        .tx-page * {
          box-sizing: border-box;
        }

        .tx-page button,
        .tx-page input {
          font: inherit;
        }

        .tx-page button {
          cursor: pointer;
        }

        .tx-page button:disabled {
          opacity: .45;
          cursor: default;
        }

        .tx-header {
          display: flex;
          gap: 12px;
          align-items: center;
          padding: 15px;
          background: #ffffffb8;
          border-bottom: 1px solid #ccd4dc;
        }

        .tx-header h1 {
          font-size: 23px;
          color: #3c5365;
          margin: 0;
        }

        .tx-header small {
          display: block;
          font-size: 10px;
          color: #647787;
          margin-top: 5px;
        }

        .tx-wallet {
          margin-left: auto;
          text-align: right;
          font-weight: bold;
        }

        .tx-wrap {
          max-width: 650px;
          margin: auto;
          padding: 12px;
        }

        .tx-tabs,
        .tx-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
          margin-bottom: 12px;
        }

        .tx-row {
          margin-top: 12px;
        }

        .tx-btn {
          border: 1px solid #c0cad3;
          background: linear-gradient(
            #fff,
            #e3e8ed
          );
          color: #435563;
          border-radius: 8px;
          padding: 10px 12px;
          box-shadow: 0 2px 4px #7d8a9720;
        }

        .tx-tabs [aria-pressed=true] {
          background: #536c80;
          color: #fff;
        }

        .tx-alert {
          border: 1px solid #ddb668;
          background: #4e331d;
          color: #ffe5ad;
          padding: 12px;
          border-radius: 10px;
          line-height: 1.7;
          font-size: 13px;
          margin: 12px 0;
        }

        .tx-alert button {
          margin: 6px;
        }

        .tx-hint {
          font-size: 12px;
          color: #63717e;
          line-height: 1.7;
        }

        .tx-wheel-box {
          position: relative;
          max-width: 440px;
          margin: 4px auto 16px;
        }

        .tx-wheel {
          display: block;
          width: 100%;
          filter: drop-shadow(
            0 14px 12px #65758755
          );
        }

        .tx-discs {
          transition:
            transform 2.6s
            cubic-bezier(.12,.65,.1,1);
        }

        .tx-wheel-badges {
          display: flex;
          justify-content: center;
          gap: 7px;
          flex-wrap: wrap;
          margin-top: 8px;
        }

        .tx-wheel-badges span {
          border:
            1px solid var(--tx-color);
          border-radius: 20px;
          padding: 5px 9px;
          font-size: 11px;
          font-weight: 800;
          background: #ffffffbb;
          color: #394e5e;
        }

        .tx-neutral {
          font-size: 10px;
          display: flex;
          justify-content: center;
          gap: 18px;
          color: #6e7d8a;
          margin: 11px 0;
        }

        .tx-rings {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .tx-ring-card {
          text-align: center;
          border: 1px solid #d0d8df;
          background: #ffffffa8;
          padding: 10px 5px;
          border-radius: 12px;
          overflow: hidden;
          box-shadow:
            0 3px 8px #87929d15;
        }

        .tx-ring-card > strong {
          font-size: 10px;
          color: #4b6172;
        }

        .tx-ring-card > span {
          font-size: 11px;
          color: #61717f;
        }

        .tx-progress-dots {
          display: flex;
          justify-content: center;
          gap: 3px;
          margin: 8px 0;
        }

        .tx-progress-dots i {
          width: 9px;
          height: 9px;
          flex-shrink: 0;
          border-radius: 50%;
          background: #e1e6eb;
          border: 1px solid #c1cbd4;
        }

        .tx-progress-dots i.filled {
          background: var(--tx-color);
          border-color: var(--tx-color);
        }

        .tx-card {
          border: 1px solid #c8d1da;
          border-radius: 14px;
          background: #ffffffa6;
          padding: 14px;
          margin-top: 14px;
          box-shadow:
            0 8px 22px #68788718;
        }

        .tx-operating-panel {
          text-align: center;
          border-radius: 24px;
          margin-top: 16px;
          padding: 18px 12px;
          position: relative;
        }

        .tx-bet-label {
          display: block;
          font-size: 10px;
          font-weight: 800;
          color: #667481;
          letter-spacing: 1px;
        }

        .tx-stake-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin: 9px 0 12px;
        }

        .tx-input {
          width: 116px;
          background: #ffffffb0;
          color: #304859;
          border: 1px solid #c6d0da;
          text-align: center;
          padding: 10px;
          font-weight: bold;
          border-radius: 8px;
        }

        .tx-adjust {
          border: 1px solid #bcc8d1;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          background: linear-gradient(
            #fff,
            #dce3e9
          );
          color: #516677;
          font-size: 24px !important;
          box-shadow:
            0 3px 5px #8795a136;
        }

        .tx-console {
          display: grid;
          grid-template-columns:
            1fr 105px 1fr;
          align-items: center;
          gap: 10px;
          max-width: 410px;
          margin: auto;
        }

        .tx-spin {
          width: 105px;
          height: 105px;
          border: 5px solid #fff;
          border-radius: 50%;
          margin: 0;
          background: radial-gradient(
            circle at 35% 25%,
            #ff9297,
            #f3344c 45%,
            #ce1436
          );
          color: white;
          box-shadow:
            0 0 0 2px #f15b70,
            0 7px 15px #a6485b40;
          padding: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-weight: 900;
        }

        .tx-spin span {
          font-size: 39px;
          line-height: 1;
        }

        .tx-spin b {
          font-size: 12px;
          margin-top: 3px;
        }

        .tx-cashout,
        .tx-partial {
          background: linear-gradient(
            #fff,
            #dce3e9
          );
          border: 1px solid #c3ced8;
          color: #526575;
          padding: 12px 5px;
          min-height: 68px;
          border-radius: 35px;
          font-size: 10px !important;
          font-weight: bold;
          box-shadow:
            0 3px 6px #7c8d9e25;
        }

        .tx-cashout strong,
        .tx-partial strong {
          display: block;
          margin-top: 5px;
          font-size: 15px;
        }

        .tx-console-values {
          display: flex;
          justify-content: space-around;
          margin: 17px auto 12px;
          max-width: 350px;
          font-size: 11px;
          color: #7a8792;
        }

        .tx-console-values b {
          display: block;
          font-size: 16px;
          color: #435b6c;
          margin-top: 4px;
        }

        .tx-chip-row {
          justify-content: center;
          gap: 6px;
        }

        .tx-result {
          text-align: center;
          border: 1px solid #b9c8d4;
          border-radius: 12px;
          background: #fff9;
          padding: 14px;
          margin-top: 14px;
          line-height: 1.8;
        }

        .tx-result strong {
          font-size: 24px;
          color: #435c70;
        }

        .tx-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }

        .tx-table td,
        .tx-table th {
          text-align: left;
          padding: 10px 5px;
          border-bottom:
            1px solid #cad4dd;
        }

        .tx-table th {
          color: #415c72;
        }

        .tx-overflow {
          overflow: auto;
        }

        .tx-page :focus-visible {
          outline: 3px solid #3b94dd;
          outline-offset: 3px;
        }

        @media(max-width: 400px) {
          .tx-wrap {
            padding: 8px;
          }

          .tx-rings {
            gap: 5px;
          }
        }

        @media(max-width: 360px) {
          .tx-console {
            grid-template-columns:
              1fr 92px 1fr;
            gap: 7px;
          }

          .tx-spin {
            width: 92px;
            height: 92px;
          }

          .tx-neutral {
            gap: 9px;
            font-size: 9px;
          }

          .tx-header h1 {
            font-size: 19px;
          }
        }

        @media(prefers-reduced-motion: reduce) {
          .tx-discs {
            transition: none;
          }
        }
      `}</style>

      <header className="tx-header">
        <button
          type="button"
          className="tx-btn"
          onClick={onBack}
          aria-label="Customer home"
        >
          ←
        </button>

        <div>
          <h1>TWIST X</h1>
          <small>
            ORIGINAL DEMO · DEMO COINS ONLY
          </small>
        </div>

        <div className="tx-wallet">
          {data
            ? COINS(data.balance)
            : "…"}

          <small>
            {user?.name ||
              user?.loginId ||
              "Customer"}
          </small>
        </div>
      </header>

      <main className="tx-wrap">
        <nav
          className="tx-tabs"
          aria-label="Game sections"
        >
          {["game", "rules", "history"].map(
            value => (
              <button
                key={value}
                type="button"
                className="tx-btn"
                aria-pressed={tab === value}
                disabled={busy}
                onClick={() => {
                  setTab(value);

                  if (value === "history") {
                    void loadHistory();
                  }
                }}
              >
                {value.toUpperCase()}
              </button>
            ),
          )}

          <button
            type="button"
            className="tx-btn"
            aria-pressed={sound}
            onClick={() => {
              if (sound) {
                audio.current
                  ?.suspend()
                  ?.catch(() => {});
              }

              setSound(value => !value);
            }}
          >
            {sound
              ? "SOUND ON"
              : "SOUND OFF"}
          </button>
        </nav>

        {error && (
          <div
            className="tx-alert"
            role="alert"
          >
            {error}

            <button
              type="button"
              className="tx-btn"
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
          <p
            className="tx-hint"
            role="status"
          >
            {notice}
          </p>
        )}

        {pending && (
          <div
            className="tx-alert"
            role="status"
          >
            An interrupted {pending.action} needs
            recovery. Retry uses the same request.

            <button
              type="button"
              className="tx-btn"
              disabled={busy}
              onClick={() =>
                void perform(pending.action)
              }
            >
              {busy
                ? "CHECKING…"
                : "RETRY SAME ACTION"}
            </button>
          </div>
        )}

        {tab === "game" && (
          <>
            {sectors.length > 0 ? (
              <ElementWheel
                rotation={rotation}
                rings={rings}
                banks={rules?.bankMultipliers}
                result={result}
                busy={busy}
                bonuses={
                  rules?.fireBonusMultipliers
                }
              />
            ) : (
              <p className="tx-hint">
                Loading wheel…
              </p>
            )}

            <div className="tx-rings">
              {[
                "water",
                "earth",
                "fire",
              ].map(name => (
                <BankRing
                  key={name}
                  name={name}
                  step={rings[name]}
                  values={
                    rules?.bankMultipliers?.[
                      name
                    ]
                  }
                />
              ))}
            </div>

            <section
              className="tx-card tx-operating-panel"
              aria-label="Game controls"
            >
              <label
                htmlFor="tx-stake"
                className="tx-bet-label"
              >
                BET AMOUNT · DEMO COINS
              </label>

              <div className="tx-stake-row">
                <button
                  type="button"
                  className="tx-adjust"
                  aria-label="Decrease stake"
                  disabled={locked || filled}
                  onClick={() =>
                    setAmount(
                      String(
                        Math.max(
                          rules?.minStake || 10,
                          (Number(amount) || 10) -
                            10,
                        ),
                      ),
                    )
                  }
                >
                  −
                </button>

                <input
                  id="tx-stake"
                  type="number"
                  inputMode="numeric"
                  min="10"
                  max="25000"
                  step="1"
                  className="tx-input"
                  value={amount}
                  disabled={locked || filled}
                  onChange={event =>
                    setAmount(
                      event.target.value,
                    )
                  }
                />

                <button
                  type="button"
                  className="tx-adjust"
                  aria-label="Increase stake"
                  disabled={locked || filled}
                  onClick={() =>
                    setAmount(
                      String(
                        Math.min(
                          rules?.maxStake ||
                            25000,
                          (Number(amount) || 0) +
                            10,
                        ),
                      ),
                    )
                  }
                >
                  +
                </button>
              </div>

              <div className="tx-console">
                <button
                  type="button"
                  className="tx-cashout"
                  disabled={
                    locked ||
                    !activeGame ||
                    session.cashoutValue < 1
                  }
                  onClick={() =>
                    void perform("cashout")
                  }
                >
                  CASH OUT
                  <br />
                  <strong>
                    {COINS(
                      activeGame
                        ? session.cashoutValue
                        : 0,
                    )}
                  </strong>
                </button>

                <button
                  type="button"
                  className="tx-spin"
                  disabled={
                    locked || !rules || !data
                  }
                  onClick={() =>
                    void perform("spin")
                  }
                  aria-label="SPIN"
                >
                  <span aria-hidden="true">
                    <svg
                      viewBox="0 0 100 100"
                      width="44"
                      height="44"
                    >
                      <path
                        d="M49 49 C58 39 68 48 64 60 C59 77 31 76 24 56 C14 28 49 10 72 25 C99 44 84 87 52 89 C16 92 -2 58 8 31"
                        fill="none"
                        stroke="white"
                        strokeWidth="8"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>

                  <b>
                    {busy ? "WAIT…" : "SPIN"}
                  </b>
                </button>

                <button
                  type="button"
                  className="tx-partial"
                  disabled={
                    locked ||
                    !activeGame ||
                    session.partialValue < 1
                  }
                  onClick={() =>
                    void perform("partial")
                  }
                >
                  PART PAYOUT
                  <br />
                  <strong>
                    {COINS(
                      activeGame
                        ? session.partialValue
                        : 0,
                    )}
                  </strong>
                </button>
              </div>

              <div className="tx-console-values">
                <span>
                  Payout
                  <b>
                    {COINS(
                      result?.payout || 0,
                    )}
                  </b>
                </span>

                <span>
                  Current bank
                  <b>
                    {COINS(
                      activeGame
                        ? session.cashoutValue
                        : 0,
                    )}
                  </b>
                </span>
              </div>

              <div className="tx-row tx-chip-row">
                {[
                  10,
                  20,
                  50,
                  100,
                  500,
                ].map(value => (
                  <button
                    key={value}
                    type="button"
                    className="tx-btn"
                    disabled={locked || filled}
                    onClick={() =>
                      setAmount(String(value))
                    }
                  >
                    {COINS(value)}
                  </button>
                ))}
              </div>

              <p className="tx-hint">
                Each SPIN costs the selected
                stake. Cash Out and Part Payout
                do not charge another stake.
                Change your stake only when all
                circles are empty or after
                Cash Out.
              </p>

              {session && (
                <p className="tx-hint">
                  Session #{session.id}
                  {" · Total spent "}
                  {COINS(session.totalStaked)}
                  {" · Total credited "}
                  {COINS(
                    session.totalReturned,
                  )}
                </p>
              )}
            </section>

            {result && (
              <section
                className="tx-result"
                role="status"
              >
                <strong>
                  {result.bonusMultiplier
                    ? `FIRE BONUS ${result.bonusMultiplier}x`
                    : result.sector
                      ? `${
                          ELEMENTS[
                            result.sector
                          ]?.icon || ""
                        } ${
                          ELEMENTS[
                            result.sector
                          ]?.name ||
                          result.sector
                        }`
                      : result.action ===
                          "partial"
                        ? "PART PAYOUT"
                        : "CASH OUT"}
                </strong>

                <div>
                  Action stake{" "}
                  {COINS(result.stake)}
                  {" · Credited "}
                  {COINS(result.payout)} demo
                  coins
                </div>

                <div>
                  Current bank{" "}
                  {COINS(
                    result.session.cashoutValue,
                  )}
                </div>
              </section>
            )}
          </>
        )}

        {tab === "rules" && (
          <section className="tx-card">
            <h2>Demo rules</h2>

            <p className="tx-hint">
              This uses an original demo
              paytable and random sector
              weights. Each spin deducts the
              chosen stake. Water, Earth and
              Fire add one section to their
              circle. Wind spends the spin
              stake without changing sections.
              Skull removes one section from
              every nonempty circle.
            </p>

            <p className="tx-hint">
              Full Water automatically credits
              7x and goes back to section 6.
              Full Earth credits 20.5x and goes
              back to section 6. Full Fire
              awards a random bonus from the
              list below and resets only Fire
              to zero.
            </p>

            <p className="tx-hint">
              Cash Out credits all current
              circle banks and clears the game.
              Part Payout moves every circle
              with at least two sections back
              one section, paying the bank
              difference. Neither collection
              action charges another stake.
              Payouts round down to whole demo
              coins. Spinning is manual.
              After 40 minutes without a spin
              or collection action, the server
              automatically credits the current
              bank and clears the game.
            </p>

            <p className="tx-hint">
              Minimum 10 · Maximum 25,000 per
              spin. The stake stays fixed while
              any circle is filled. Bank and
              bonus amounts are credited
              amounts; the spin stake is not
              refunded separately.
            </p>

            {rules && (
              <>
                <div className="tx-overflow">
                  <table className="tx-table">
                    <thead>
                      <tr>
                        <th>Section</th>
                        <th>Water</th>
                        <th>Earth</th>
                        <th>Fire</th>
                      </tr>
                    </thead>

                    <tbody>
                      {Array.from(
                        { length: 8 },
                        (_, step) => (
                          <tr key={step}>
                            <td>{step}</td>

                            <td>
                              {
                                rules
                                  .bankMultipliers
                                  .water[step]
                              }
                              x
                            </td>

                            <td>
                              {
                                rules
                                  .bankMultipliers
                                  .earth[step]
                              }
                              x
                            </td>

                            <td>
                              {step === 7
                                ? "BONUS"
                                : `${
                                    rules
                                      .bankMultipliers
                                      .fire[
                                      step
                                    ]
                                  }x`}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>

                <h3>Fire bonus</h3>

                <p className="tx-hint">
                  {rules.fireBonusMultipliers
                    .map(value => `${value}x`)
                    .join(" · ")}
                  {" · "}
                  Each bonus has equal
                  probability.
                </p>

                <h3>Sector probabilities</h3>

                <table className="tx-table">
                  <thead>
                    <tr>
                      <th>Sector</th>
                      <th>Chance per spin</th>
                    </tr>
                  </thead>

                  <tbody>
                    {rules.sectors.map(item => (
                      <tr key={item.id}>
                        <td>
                          {
                            ELEMENTS[
                              item.id
                            ]?.name
                          }
                        </td>

                        <td>
                          {item.weight}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </section>
        )}

        {tab === "history" && (
          <section className="tx-card">
            <h2>Your recent actions</h2>

            <button
              type="button"
              className="tx-btn"
              onClick={() =>
                void loadHistory()
              }
            >
              Refresh history
            </button>

            {history.length ? (
              <div className="tx-overflow">
                <table className="tx-table">
                  <thead>
                    <tr>
                      <th>Action / Time</th>
                      <th>Outcome</th>
                      <th>Stake</th>
                      <th>Credited</th>
                    </tr>
                  </thead>

                  <tbody>
                    {history.map(item => (
                      <tr key={item.id}>
                        <td>
                          {item.action.toUpperCase()}
                          <br />

                          {new Date(
                            item.createdAt,
                          ).toLocaleString(
                            "en-IN",
                            {
                              timeZone:
                                "Asia/Kolkata",
                            },
                          )}
                        </td>

                        <td>
                          {item.result
                            .bonusMultiplier
                            ? `FIRE ${item.result.bonusMultiplier}x`
                            : item.result.sector?.toUpperCase() ||
                              item.action.toUpperCase()}
                        </td>

                        <td>
                          {COINS(
                            item.result.stake,
                          )}
                        </td>

                        <td>
                          {COINS(
                            item.result.payout,
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="tx-hint">
                No completed actions available.
              </p>
            )}
          </section>
        )}

        <footer className="tx-row">
          <button
            type="button"
            className="tx-btn"
            onClick={onBack}
          >
            ← Customer home
          </button>

          {onLogout && (
            <button
              type="button"
              className="tx-btn"
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
