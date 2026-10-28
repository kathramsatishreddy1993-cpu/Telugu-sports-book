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

    return ["spin", "partial", "cashout"].includes(
      saved?.action,
    ) &&
      typeof saved.body?.requestKey === "string"
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
  sectors,
  rotation,
}) {
  let angle = -90;

  const total = sectors.reduce(
    (sum, item) => sum + item.weight,
    0,
  );

  return (
    <div className="tx-wheel-box">
      <span
        className="tx-pointer"
        aria-hidden="true"
      >
        ▼
      </span>

      <svg
        viewBox="0 0 300 300"
        className="tx-wheel"
        style={{
          transform: `rotate(${rotation}deg)`,
        }}
        role="img"
        aria-label="Element wheel"
      >
        <circle
          cx="150"
          cy="150"
          r="147"
          fill="#081a24"
          stroke="#e6c886"
          strokeWidth="4"
        />

        {sectors.map(item => {
          const start = angle;
          const width = item.weight / total * 360;

          angle += width;

          const point = degrees =>
            `${
              150 +
              139 * Math.cos(degrees * Math.PI / 180)
            },${
              150 +
              139 * Math.sin(degrees * Math.PI / 180)
            }`;

          const middle =
            (start + width / 2) * Math.PI / 180;

          const x =
            150 + 111 * Math.cos(middle);

          const y =
            150 + 111 * Math.sin(middle);

          return (
            <g key={item.id}>
              <path
                d={
                  `M150,150 L${point(start)} ` +
                  `A139,139 0 ${width > 180 ? 1 : 0} ` +
                  `1 ${point(angle)} Z`
                }
                fill={
                  ELEMENTS[item.id]?.color ||
                  "#aaa"
                }
                stroke="#112a32"
                strokeWidth="2"
              />

              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={width < 20 ? 9 : 12}
                fontWeight="900"
                fill="#10222c"
                transform={
                  `rotate(${
                    start + width / 2 + 90
                  },${x},${y})`
                }
              >
                {ELEMENTS[item.id]?.name || item.id}
              </text>
            </g>
          );
        })}

        <circle
          cx="150"
          cy="150"
          r="63"
          fill="#102532"
          stroke="#edcd87"
          strokeWidth="4"
        />

        <text
          x="150"
          y="144"
          textAnchor="middle"
          fill="#ffe5a0"
          fontSize="24"
          fontWeight="900"
        >
          TWIST
        </text>

        <text
          x="150"
          y="175"
          textAnchor="middle"
          fill="#edbc67"
          fontSize="30"
          fontWeight="900"
        >
          X
        </text>
      </svg>
    </div>
  );
}

function BankRing({
  name,
  step,
  values,
}) {
  const element = ELEMENTS[name];

  return (
    <section
      className="tx-ring-card"
      style={{
        "--tx-color": element.color,
      }}
      aria-label={
        `${element.name} circle, ${step} filled sections`
      }
    >
      <div className="tx-ring">
        <div className="tx-ring-center">
          <span>{element.icon}</span>
          <strong>{step}/7</strong>
        </div>

        {Array.from(
          { length: 7 },
          (_, index) => (
            <span
              key={index}
              className={
                `tx-section ${
                  index < step ? "filled" : ""
                }`
              }
              style={{
                transform:
                  `translate(-50%,-50%) ` +
                  `rotate(${index * 360 / 7}deg) ` +
                  `translateY(var(--tx-ring-offset)) ` +
                  `rotate(${-index * 360 / 7}deg)`,
              }}
            >
              {index + 1}
            </span>
          ),
        )}
      </div>

      <h2>{element.name}</h2>

      <p>
        {values?.[step]?.toFixed(2) || "0.00"}x bank
      </p>

      <small>
        {name === "fire"
          ? "Full circle → bonus"
          : name === "water"
            ? "Full circle → 7x"
            : "Full circle → 20.5x"}
      </small>
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

  const [pending, setPending] = useState(() =>
    readPending(storageKey),
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
    : {
        water: 0,
        earth: 0,
        fire: 0,
      };

  const filled =
    Object.values(rings).some(
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

      audio.current?.resume()?.catch(() => {});
    } catch {}
  };

  const tone = skull => {
    if (!sound || !audio.current) return;

    try {
      const ctx = audio.current;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = "sine";

      oscillator.frequency.setValueAtTime(
        skull ? 180 : 660,
        ctx.currentTime,
      );

      oscillator.frequency.exponentialRampToValueAtTime(
        skull ? 80 : 990,
        ctx.currentTime + 0.2,
      );

      gain.gain.setValueAtTime(
        0.05,
        ctx.currentTime,
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        ctx.currentTime + 0.25,
      );

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.25);
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

      if (value.session?.status === "ACTIVE") {
        setAmount(String(value.session.amount));
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

      if (alive.current) setRules(value);
    } catch (err) {
      if (alive.current) setError(err.message);
    }
  };

  const loadHistory = async () => {
    try {
      const value = await api("history");

      if (alive.current) {
        setHistory(value.actions || []);
      }
    } catch (err) {
      if (alive.current) setError(err.message);
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
      const value = await api(
        job.action,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(job.body),
        },
      );

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
          (sum, item) => sum + item.weight,
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
            (
              rotationRef.current % 360
            ) + 360
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
          background:
            radial-gradient(
              ellipse at top,
              #254555,
              #081620 75%
            );
          color: #f4f2e7;
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
          background: #0005;
          border-bottom: 1px solid #ffffff20;
        }

        .tx-header h1 {
          font-size: 23px;
          color: #f3d384;
          margin: 0;
        }

        .tx-header small {
          display: block;
          font-size: 10px;
          color: #cbdfe8;
          margin-top: 5px;
        }

        .tx-wallet {
          margin-left: auto;
          text-align: right;
          font-weight: bold;
        }

        .tx-wrap {
          max-width: 850px;
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
          border: 1px solid #ffffff30;
          background: #ffffff10;
          color: inherit;
          border-radius: 8px;
          padding: 10px 12px;
        }

        .tx-tabs [aria-pressed=true] {
          background: #ecd38b;
          color: #173342;
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
          color: #cbdde6;
          line-height: 1.7;
        }

        .tx-wheel-box {
          position: relative;
          max-width: 330px;
          margin: 14px auto 20px;
        }

        .tx-pointer {
          position: absolute;
          z-index: 2;
          top: -8px;
          left: 50%;
          transform: translateX(-50%);
          color: #ffdf8c;
          font-size: 32px;
          text-shadow: 0 3px 3px #000;
        }

        .tx-wheel {
          display: block;
          width: 100%;
          transition:
            transform 2.6s
            cubic-bezier(.12,.65,.1,1);
        }

        .tx-rings {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .tx-ring-card {
          text-align: center;
          border:
            1px solid var(--tx-color);
          border-radius: 14px;
          padding: 12px 3px;
          background: #0003;
        }

        .tx-ring {
          --tx-ring-offset: -47px;
          position: relative;
          width: 120px;
          height: 120px;
          max-width: 100%;
          margin: auto;
        }

        .tx-ring-center {
          position: absolute;
          inset: 29px;
          border:
            2px solid var(--tx-color);
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 4px;
          background: #0c202c;
        }

        .tx-ring-center span {
          font-size: 21px;
        }

        .tx-ring-center strong {
          font-size: 12px;
        }

        .tx-section {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 24px;
          height: 24px;
          display: grid;
          place-items: center;
          background: #203c4a;
          border:
            1px solid var(--tx-color);
          border-radius: 50%;
          font-size: 11px;
          color: #d8e1e3;
        }

        .tx-section.filled {
          background: var(--tx-color);
          color: #102936;
          font-weight: bold;
          box-shadow:
            0 0 8px var(--tx-color);
        }

        .tx-ring-card h2 {
          font-size: 11px;
          color: var(--tx-color);
          margin: 10px 0 5px;
        }

        .tx-ring-card p {
          font-size: 12px;
          font-weight: bold;
          margin: 6px 0;
        }

        .tx-ring-card small {
          font-size: 9px;
          color: #d7dfdf;
        }

        .tx-card {
          border: 1px solid #ffffff25;
          border-radius: 14px;
          background: #0003;
          padding: 14px;
          margin-top: 14px;
        }

        .tx-input {
          width: 130px;
          padding: 12px;
          background: #0b2230;
          color: #fff;
          border: 1px solid #ffffff40;
          border-radius: 8px;
        }

        .tx-spin {
          width: 100%;
          padding: 16px;
          border: 0;
          border-radius: 11px;
          background: #e8ca79;
          color: #19333e;
          font-weight: 900;
          margin-top: 12px;
        }

        .tx-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 12px;
        }

        .tx-cashout,
        .tx-partial {
          border: 0;
          border-radius: 10px;
          padding: 14px;
          font-weight: bold;
          background: #55bd99;
          color: #102a29;
          min-height: 60px;
        }

        .tx-partial {
          background: #70b6d1;
        }

        .tx-result {
          text-align: center;
          border: 1px solid #e5c980;
          border-radius: 12px;
          padding: 14px;
          margin-top: 14px;
          line-height: 1.8;
        }

        .tx-result strong {
          font-size: 24px;
          color: #f9df94;
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
            1px solid #ffffff20;
        }

        .tx-table th {
          color: #e9d397;
        }

        .tx-overflow {
          overflow: auto;
        }

        .tx-page :focus-visible {
          outline: 3px solid #ffe3a0;
          outline-offset: 3px;
        }

        @media (max-width: 400px) {
          .tx-wrap {
            padding: 8px;
          }

          .tx-rings {
            gap: 5px;
          }

          .tx-ring {
            --tx-ring-offset: -37px;
            width: 98px;
            height: 98px;
          }

          .tx-section {
            width: 21px;
            height: 21px;
            font-size: 10px;
          }

          .tx-ring-center {
            inset: 25px;
          }

          .tx-ring-center span {
            font-size: 17px;
          }

          .tx-ring-card {
            overflow: hidden;
            padding: 9px 2px;
          }

          .tx-ring-card h2 {
            font-size: 10px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .tx-wheel {
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
          {data ? COINS(data.balance) : "…"}

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
          {["game", "rules", "history"].map(value => (
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
          ))}

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
            {sound ? "SOUND ON" : "SOUND OFF"}
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
            An interrupted {pending.action}
            {" "}needs recovery. Retry uses
            the same request.

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
                sectors={sectors}
                rotation={rotation}
              />
            ) : (
              <p className="tx-hint">
                Loading wheel…
              </p>
            )}

            <div className="tx-rings">
              {["water", "earth", "fire"].map(name => (
                <BankRing
                  key={name}
                  name={name}
                  step={rings[name]}
                  values={
                    rules?.bankMultipliers?.[name]
                  }
                />
              ))}
            </div>

            <section
              className="tx-card"
              aria-label="Game controls"
            >
              <p className="tx-hint">
                Every SPIN costs the selected
                stake. Circle banks remain until
                you collect them or a Skull
                reduces them.
              </p>

              <label
                htmlFor="tx-stake"
                className="tx-hint"
              >
                Demo stake per spin
              </label>

              <div className="tx-row">
                <button
                  type="button"
                  className="tx-btn"
                  disabled={locked || filled}
                  onClick={() => setAmount("10")}
                >
                  MIN
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
                    setAmount(event.target.value)
                  }
                />

                <button
                  type="button"
                  className="tx-btn"
                  disabled={locked || filled}
                  onClick={() =>
                    setAmount("25000")
                  }
                >
                  MAX
                </button>
              </div>

              <div className="tx-row">
                {[10, 20, 50, 100, 500].map(value => (
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

              <button
                type="button"
                className="tx-spin"
                disabled={
                  locked || !rules || !data
                }
                onClick={() =>
                  void perform("spin")
                }
              >
                {busy ? "PROCESSING…" : "SPIN"}
              </button>

              <div className="tx-actions">
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

                  {COINS(
                    activeGame
                      ? session.cashoutValue
                      : 0,
                  )}
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

                  {COINS(
                    activeGame
                      ? session.partialValue
                      : 0,
                  )}
                </button>
              </div>

              <p className="tx-hint">
                Cash Out and Part Payout do
                not charge another spin stake.
                Stake changes are allowed only
                when all circles are empty or
                after Cash Out.
              </p>

              {session && (
                <p className="tx-hint">
                  Session #{session.id}
                  {" "}· Total spent{" "}
                  {COINS(session.totalStaked)}
                  {" "}· Total credited{" "}
                  {COINS(session.totalReturned)}
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
                      ? (
                          `${
                            ELEMENTS[
                              result.sector
                            ]?.icon || ""
                          } ${
                            ELEMENTS[
                              result.sector
                            ]?.name ||
                            result.sector
                          }`
                        )
                      : result.action === "partial"
                        ? "PART PAYOUT"
                        : "CASH OUT"}
                </strong>

                <div>
                  Action stake{" "}
                  {COINS(result.stake)}
                  {" "}· Credited{" "}
                  {COINS(result.payout)}
                  {" "}demo coins
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
              weights. Each spin deducts
              the chosen stake. Water, Earth
              and Fire add one section to
              their circle. Wind spends the
              spin stake without changing
              sections. Skull removes one
              section from every nonempty
              circle.
            </p>

            <p className="tx-hint">
              Full Water automatically
              credits 7x and goes back to
              section 6. Full Earth credits
              20.5x and goes back to section
              6. Full Fire awards a random
              bonus from the list below and
              resets only Fire to zero.
            </p>

            <p className="tx-hint">
              Cash Out credits all current
              circle banks and clears the
              game. Part Payout moves every
              circle with at least two
              sections back one section,
              paying the bank difference.
              Neither collection action
              charges another stake.
              Payouts round down to whole
              demo coins. There is no time
              limit or automatic spinning.
            </p>

            <p className="tx-hint">
              Minimum 10 · Maximum 25,000
              per spin. The stake stays
              fixed while any circle is
              filled. Bank and bonus amounts
              are credited amounts; the spin
              stake is not refunded separately.
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
                                rules.bankMultipliers
                                  .water[step]
                              }x
                            </td>

                            <td>
                              {
                                rules.bankMultipliers
                                  .earth[step]
                              }x
                            </td>

                            <td>
                              {step === 7
                                ? "BONUS"
                                : `${
                                    rules.bankMultipliers
                                      .fire[step]
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
                  {" "}· Each bonus has
                  equal probability.
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
                          {ELEMENTS[item.id]?.name}
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
                          {item.result.bonusMultiplier
                            ? (
                                `FIRE ${
                                  item.result
                                    .bonusMultiplier
                                }x`
                              )
                            : item.result.sector
                                ?.toUpperCase() ||
                              item.action
                                .toUpperCase()}
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
