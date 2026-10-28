import React, {
  useEffect,
  useRef,
  useState,
} from "react";

const ORDER = [
  3, 11, 1, 9, 5, 4,
  10, 6, 12, 2, 8, 7,
];

const RED = new Set([
  1, 3, 5, 8, 10, 12,
]);

const CHIPS = [
  10, 20, 50, 100, 500,
];

const money = value =>
  Number(value || 0).toLocaleString(
    "en-IN",
  );

const label = area =>
  area.startsWith("n:")
    ? area.slice(2)
    : (
        {
          low: "1–6",
          high: "7–12",
        }[area] ||
        area.toUpperCase()
      );

const storage = {
  read(key) {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },

  write(key, value) {
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

async function request(
  url,
  options = {},
) {
  const controller =
    new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    15000,
  );

  try {
    const response = await fetch(
      url,
      {
        ...options,
        credentials: "same-origin",
        cache: "no-store",
        signal: controller.signal,
      },
    );

    const data =
      await response.json();

    if (
      !response.ok ||
      data.success === false
    ) {
      throw Object.assign(
        new Error(
          data.error ||
            "Request failed.",
        ),
        {
          status: response.status,
        },
      );
    }

    return data;
  } finally {
    clearTimeout(timer);
  }
}

function requestKey() {
  const bytes =
    new Uint8Array(20);

  window.crypto.getRandomValues(
    bytes,
  );

  return Array.from(
    bytes,
    byte =>
      byte
        .toString(16)
        .padStart(2, "0"),
  ).join("");
}

function Wheel({ rotation }) {
  return (
    <div className="ig-wheel-box">
      <div
        className="ig-pointer"
        aria-hidden="true"
      >
        ▼
      </div>

      <svg
        viewBox="0 0 300 300"
        role="img"
        aria-label="Twelve-number roulette wheel"
        className="ig-wheel"
        style={{
          transform:
            `rotate(${rotation}deg)`,
        }}
      >
        <circle
          cx="150"
          cy="150"
          r="147"
          fill="#062e22"
          stroke="#c7ad65"
          strokeWidth="3"
        />

        {ORDER.map(
          (number, index) => {
            const a =
              (
                index * 30 -
                105
              ) *
              Math.PI /
              180;

            const b =
              (
                index * 30 -
                75
              ) *
              Math.PI /
              180;

            const middle =
              (
                index * 30 -
                90
              ) *
              Math.PI /
              180;

            const point = angle =>
              `${
                150 +
                139 *
                  Math.cos(angle)
              },${
                150 +
                139 *
                  Math.sin(angle)
              }`;

            const textX =
              150 +
              113 *
                Math.cos(middle);

            const textY =
              150 +
              113 *
                Math.sin(middle);

            return (
              <g key={number}>
                <path
                  d={
                    `M150,150 ` +
                    `L${point(a)} ` +
                    `A139,139 0 0 1 ` +
                    `${point(b)} Z`
                  }
                  fill={
                    RED.has(number)
                      ? "#ca1538"
                      : "#10171b"
                  }
                  stroke="#ffffff22"
                />

                <text
                  x={textX}
                  y={textY}
                  fill="white"
                  fontSize="19"
                  fontWeight="800"
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={
                    `rotate(${
                      index * 30
                    },${textX},${textY})`
                  }
                >
                  {number}
                </text>
              </g>
            );
          },
        )}

        <circle
          cx="150"
          cy="150"
          r="54"
          fill="#f1e3d3"
          stroke="#ad9567"
          strokeWidth="5"
        />

        <text
          x="150"
          y="157"
          textAnchor="middle"
          fill="#263e36"
          fontSize="22"
          fontWeight="900"
        >
          TSB
        </text>
      </svg>
    </div>
  );
}

export default function InstantGamesPage({
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

  const supported = [
    "mini-roulette",
    "keno-80",
  ].includes(gameId);

  const roulette =
    gameId === "mini-roulette";

  const title = roulette
    ? "MINI ROULETTE"
    : "KENO 80";

  const customerId =
    user?.id ??
    user?.customerId ??
    user?.customer_id;

  const pendingKey =
    `tsb_instant_pending_v1:` +
    `${customerId}:${gameId}`;

  return supported && customerId ? (
    <InstantGame
      key={pendingKey}
      gameId={gameId}
      roulette={roulette}
      title={title}
      customerId={customerId}
      pendingKey={pendingKey}
      user={user}
      onBack={onBack}
      onLogout={onLogout}
    />
  ) : (
    <div className="min-h-screen bg-slate-950 p-6 text-white">
      Customer login and a valid game
      are required.

      <button
        className="ml-4 underline"
        onClick={onBack}
      >
        Back
      </button>
    </div>
  );
}

function InstantGame({
  gameId,
  roulette,
  title,
  customerId,
  pendingKey,
  user,
  onBack,
  onLogout,
}) {
  const [rules, setRules] =
    useState(null);

  const [balance, setBalance] =
    useState(null);

  const [history, setHistory] =
    useState([]);

  const [tab, setTab] =
    useState("game");

  const [error, setError] =
    useState("");

  const [notice, setNotice] =
    useState("");

  const [chip, setChip] =
    useState(10);

  const [bets, setBets] =
    useState({});

  const [undo, setUndo] =
    useState([]);

  const [lastBets, setLastBets] =
    useState({});

  const [picks, setPicks] =
    useState([]);

  const [amount, setAmount] =
    useState("10");

  const [busy, setBusy] =
    useState(false);

  const [result, setResult] =
    useState(null);

  const [drawn, setDrawn] =
    useState([]);

  const [rotation, setRotation] =
    useState(0);

  const [sound, setSound] =
    useState(false);

  const [pending, setPending] =
    useState(null);

  const mounted = useRef(false);
  const running = useRef(false);
  const recovery = useRef(null);
  const timers = useRef(new Set());
  const audio = useRef(null);
  const rotationRef = useRef(0);

  const base =
    `/api/instant-games/${gameId}`;

  const total = roulette
    ? Object.values(bets).reduce(
        (sum, value) =>
          sum + value,
        0,
      )
    : Number(amount);

  const locked =
    busy || Boolean(pending);

  const later = (fn, delay) => {
    const id = setTimeout(
      () => {
        timers.current.delete(id);

        if (mounted.current) {
          fn();
        }
      },
      delay,
    );

    timers.current.add(id);
  };

  const beep = () => {
    if (
      !audio.current ||
      !sound
    ) {
      return;
    }

    try {
      const ctx = audio.current;

      const oscillator =
        ctx.createOscillator();

      const gain =
        ctx.createGain();

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.frequency.value =
        roulette ? 660 : 820;

      gain.gain.setValueAtTime(
        0.045,
        ctx.currentTime,
      );

      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + 0.12,
      );

      oscillator.start();

      oscillator.stop(
        ctx.currentTime + 0.12,
      );
    } catch {}
  };

  const prepareAudio = () => {
    if (!sound) return;

    try {
      const AudioContext =
        window.AudioContext ||
        window.webkitAudioContext;

      if (
        !audio.current &&
        AudioContext
      ) {
        audio.current =
          new AudioContext();
      }

      audio.current
        ?.resume()
        ?.catch(() => {});
    } catch {}
  };

  const refreshHistory = async () => {
    try {
      const data = await request(
        `${base}/history`,
      );

      if (mounted.current) {
        setHistory(
          data.bets || [],
        );
      }
    } catch (err) {
      if (mounted.current) {
        setNotice(
          `History: ${err.message}`,
        );
      }
    }
  };

  const load = async () => {
    setError("");

    const results =
      await Promise.allSettled([
        request(
          `${base}/rules`,
        ),

        request(
          `/api/customers/${
            encodeURIComponent(
              customerId,
            )
          }/demo-balance`,
        ),

        request(
          `${base}/history`,
        ),
      ]);

    if (!mounted.current) return;

    if (
      results[0].status ===
      "fulfilled"
    ) {
      setRules(
        results[0].value,
      );
    } else {
      setError(
        `Rules: ${
          results[0].reason.message
        }`,
      );
    }

    if (
      results[1].status ===
      "fulfilled"
    ) {
      setBalance(
        Number(
          results[1].value.balance,
        ),
      );
    } else {
      setNotice(
        `Balance: ${
          results[1].reason.message
        }`,
      );
    }

    if (
      results[2].status ===
      "fulfilled"
    ) {
      setHistory(
        results[2].value.bets || [],
      );
    } else {
      setNotice(
        `History: ${
          results[2].reason.message
        }`,
      );
    }
  };

  useEffect(() => {
    mounted.current = true;

    try {
      const saved = JSON.parse(
        storage.read(
          pendingKey,
        ) || "null",
      );

      if (
        saved?.game === gameId &&
        typeof saved.body
          ?.requestKey === "string"
      ) {
        recovery.current =
          saved.body;

        setPending(saved.body);
      }
    } catch {
      storage.remove(
        pendingKey,
      );
    }

    void load();

    return () => {
      mounted.current = false;

      for (
        const id of timers.current
      ) {
        clearTimeout(id);
      }

      timers.current.clear();

      audio.current
        ?.close()
        ?.catch(() => {});
    };
  }, []);

  const addBet = area => {
    if (locked) return;

    if (
      total + chip > 25000
    ) {
      setError(
        "Maximum total stake is 25,000 demo coins.",
      );

      return;
    }

    setUndo(items => [
      ...items.slice(-99),
      bets,
    ]);

    setBets(current => ({
      ...current,

      [area]:
        (
          current[area] || 0
        ) + chip,
    }));

    setError("");
  };

  const togglePick = number => {
    if (locked) return;

    setPicks(current =>
      current.includes(number)
        ? current.filter(
            value =>
              value !== number,
          )
        : current.length < 10
          ? [
              ...current,
              number,
            ]
          : current,
    );
  };

  const quickPick = count => {
    if (locked) return;

    const bag = Array.from(
      { length: 80 },
      (_, index) =>
        index + 1,
    );

    const values =
      new Uint32Array(80);

    window.crypto.getRandomValues(
      values,
    );

    bag.sort(
      (a, b) =>
        values[a - 1] -
        values[b - 1],
    );

    setPicks(
      bag.slice(0, count),
    );
  };

  const complete = data => {
    setResult(
      data.bet,
    );

    setBalance(
      Number(data.balance),
    );

    setBusy(false);
    running.current = false;

    beep();

    window.dispatchEvent(
      new Event(
        "demo-balance-updated",
      ),
    );

    void refreshHistory();
  };

  const showResult = data => {
    const reduced =
      window.matchMedia?.(
        "(prefers-reduced-motion: reduce)",
      ).matches;

    const value =
      data.bet.result;

    if (roulette) {
      const index =
        ORDER.indexOf(
          value.number,
        );

      const desired =
        (
          360 -
          index * 30
        ) % 360;

      const current =
        (
          (
            rotationRef.current %
            360
          ) + 360
        ) % 360;

      const next =
        rotationRef.current +
        (
          reduced
            ? 0
            : 1800
        ) +
        (
          desired -
          current +
          360
        ) % 360;

      rotationRef.current =
        next;

      setRotation(next);

      later(
        () => complete(data),
        reduced ? 0 : 3000,
      );
    } else {
      value.drawn.forEach(
        (number, index) => {
          later(
            () => {
              setDrawn(
                current => [
                  ...current,
                  number,
                ],
              );

              beep();

              if (
                index ===
                value.drawn.length - 1
              ) {
                complete(data);
              }
            },

            reduced
              ? 0
              : (
                  index + 1
                ) * 110,
          );
        },
      );
    }
  };

  const play = async () => {
    if (
      running.current
    ) {
      return;
    }

    let body =
      recovery.current;

    if (!body) {
      if (
        !rules ||
        balance === null
      ) {
        setError(
          "Load rules and balance before playing.",
        );

        return;
      }

      if (
        !Number.isSafeInteger(
          total,
        ) ||
        total < 10 ||
        total > 25000 ||
        (
          !roulette &&
          !picks.length
        )
      ) {
        setError(
          roulette
            ? "Place a bet of 10–25,000 demo coins."
            : "Pick 1–10 numbers and stake 10–25,000 whole demo coins.",
        );

        return;
      }

      if (
        total > balance
      ) {
        setError(
          "LOW BALANCE",
        );

        return;
      }

      try {
        body = roulette
          ? {
              requestKey:
                requestKey(),

              bets:
                Object.entries(
                  bets,
                ).map(
                  ([
                    area,
                    value,
                  ]) => ({
                    area,
                    amount: value,
                  }),
                ),
            }
          : {
              requestKey:
                requestKey(),

              picks: [
                ...picks,
              ],

              amount: total,
            };
      } catch {
        setError(
          "This browser needs a secure HTTPS connection to play.",
        );

        return;
      }

      if (
        !storage.write(
          pendingKey,
          {
            game: gameId,
            body,
          },
        )
      ) {
        setError(
          "Enable browser session storage before playing so interrupted bets can be recovered.",
        );

        return;
      }

      recovery.current =
        body;

      setPending(body);
    }

    if (roulette) {
      const previous =
        Object.fromEntries(
          body.bets.map(
            bet => [
              bet.area,
              bet.amount,
            ],
          ),
        );

      setBets(previous);
      setLastBets(previous);
    } else {
      setPicks(
        body.picks,
      );

      setAmount(
        String(
          body.amount,
        ),
      );
    }

    running.current = true;

    setBusy(true);
    setError("");
    setNotice("");
    setResult(null);
    setDrawn([]);

    prepareAudio();

    try {
      const data =
        await request(
          `${base}/play`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(body),
          },
        );

      storage.remove(
        pendingKey,
      );

      recovery.current =
        null;

      if (
        !mounted.current
      ) {
        return;
      }

      setPending(null);

      showResult(data);
    } catch (err) {
      if (
        !mounted.current
      ) {
        return;
      }

      if (
        [
          400,
          401,
          403,
          404,
          409,
          422,
        ].includes(
          err.status,
        )
      ) {
        storage.remove(
          pendingKey,
        );

        recovery.current =
          null;

        setPending(null);
      }

      setError(
        err.status
          ? err.message
          : "Connection interrupted. Press RETRY SAME BET to recover the result.",
      );

      setBusy(false);

      running.current =
        false;
    }
  };

  const areaButton = area => (
    <button
      key={area}
      type="button"
      disabled={locked}
      onClick={() =>
        addBet(area)
      }
      className={
        `ig-area ${
          area.startsWith("n:")
            ? RED.has(
                Number(
                  area.slice(2),
                ),
              )
              ? "ig-red"
              : "ig-black"
            : ""
        }`
      }
    >
      <span>
        {label(area)}
      </span>

      {bets[area] ? (
        <small>
          {money(
            bets[area],
          )}
        </small>
      ) : null}
    </button>
  );

  const counts =
    Array(81).fill(0);

  for (
    const bet of history
  ) {
    for (
      const number of
      bet.result?.drawn || []
    ) {
      counts[number] += 1;
    }
  }

  const ranked =
    Array.from(
      { length: 80 },
      (_, index) =>
        index + 1,
    ).sort(
      (a, b) =>
        counts[b] -
          counts[a] ||
        a - b,
    );

  return (
    <div
      className={
        `ig-page ${
          roulette
            ? "ig-roulette"
            : "ig-keno"
        }`
      }
    >
      <style>{`
        .ig-page {
          min-height: 100vh;
          background: #101323;
          color: #f6f4ed;
          font-family: Arial, sans-serif;
          padding-bottom: 28px;
        }

        .ig-roulette {
          background:
            radial-gradient(
              ellipse at top,
              #087339,
              #053522 75%
            );
        }

        .ig-page * {
          box-sizing: border-box;
        }

        .ig-page button,
        .ig-page input {
          font: inherit;
        }

        .ig-page button {
          cursor: pointer;
        }

        .ig-page button:disabled {
          cursor: default;
          opacity: .48;
        }

        .ig-head {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: #0005;
          border-bottom:
            1px solid #ffffff20;
        }

        .ig-head h1 {
          font-size: 18px;
          margin: 0;
          font-weight: 900;
        }

        .ig-head small {
          display: block;
          color: #e8d192;
          font-size: 10px;
          margin-top: 5px;
        }

        .ig-wallet {
          margin-left: auto;
          text-align: right;
          font-size: 14px;
          font-weight: bold;
        }

        .ig-wallet small {
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ig-wrap {
          max-width: 900px;
          margin: auto;
          padding: 12px;
        }

        .ig-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }

        .ig-tab,
        .ig-btn {
          border:
            1px solid #ffffff30;
          background: #ffffff10;
          color: inherit;
          border-radius: 9px;
          padding: 10px 13px;
          font-weight: bold;
        }

        .ig-tab[aria-pressed=true] {
          background: #efd487;
          color: #19212a;
        }

        .ig-alert {
          border:
            1px solid #f1b55c;
          background: #382814;
          color: #ffe4aa;
          padding: 12px;
          border-radius: 10px;
          font-size: 13px;
          line-height: 1.6;
          margin-bottom: 12px;
        }

        .ig-alert button {
          margin-left: 8px;
        }

        .ig-hint {
          font-size: 12px;
          line-height: 1.7;
          color: #d9dee9;
          margin: 12px 0;
        }

        .ig-card {
          background: #0003;
          border:
            1px solid #ffffff20;
          border-radius: 16px;
          padding: 13px;
        }

        .ig-board {
          display: grid;
          grid-template-columns:
            repeat(6, minmax(0, 1fr));
          gap: 5px;
        }

        .ig-area {
          min-height: 56px;
          border:
            1px solid #a6d6a9;
          border-radius: 8px;
          background: #0b6b37;
          color: white;
          font-size: 17px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }

        .ig-area small {
          background: #f4d477;
          color: #19251b;
          border-radius: 20px;
          padding: 2px 6px;
          font-size: 10px;
          font-weight: bold;
        }

        .ig-red {
          background: #bf1131;
        }

        .ig-black {
          background: #111a18;
        }

        .ig-row {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
          margin-top: 12px;
        }

        .ig-chip {
          border-radius: 50%;
          width: 48px;
          height: 48px;
          border:
            3px dashed #ffffff88;
          background: #1b5273;
          color: white;
          font-weight: bold;
        }

        .ig-chip[aria-pressed=true] {
          outline:
            3px solid #f0cd6b;
          outline-offset: 2px;
        }

        .ig-play {
          border: 0;
          border-radius: 11px;
          background: #edcf72;
          color: #172a23;
          font-weight: 900;
          padding: 15px 22px;
          min-height: 52px;
        }

        .ig-full {
          width: 100%;
          margin-top: 14px;
        }

        .ig-wheel-box {
          position: relative;
          max-width: 340px;
          margin: 8px auto 20px;
        }

        .ig-wheel {
          display: block;
          width: 100%;
          transition:
            transform 3s
            cubic-bezier(.14,.62,.1,1);
        }

        .ig-pointer {
          position: absolute;
          z-index: 1;
          top: -6px;
          left: 50%;
          transform:
            translateX(-50%);
          color: #ffda72;
          font-size: 34px;
          text-shadow:
            0 3px 3px #000;
        }

        .ig-keno-board {
          display: grid;
          grid-template-columns:
            repeat(10, minmax(0, 1fr));
          gap: 5px;
        }

        .ig-number {
          aspect-ratio: 1;
          border:
            1px solid #ffffff12;
          border-radius: 50%;
          background: #342451;
          color: #eee;
          position: relative;
          font-size: 14px;
          padding: 0;
        }

        .ig-number.is-picked {
          outline:
            2px solid #f0d37c;
          outline-offset: -2px;
          background: #5b478d;
        }

        .ig-number.is-drawn {
          background: #b337b7;
          color: white;
        }

        .ig-number.is-hit {
          background: #e5cd75;
          color: #212133;
          font-weight: 900;
        }

        .ig-number.is-picked::after {
          content: '✓';
          position: absolute;
          right: 1px;
          top: -4px;
          font-size: 10px;
          color: #fff;
        }

        .ig-balls {
          display: flex;
          gap: 5px;
          flex-wrap: wrap;
          min-height: 64px;
          align-content: center;
          margin-bottom: 12px;
        }

        .ig-ball {
          display: grid;
          place-items: center;
          background: #8440b3;
          border-radius: 50%;
          width: 29px;
          height: 29px;
          font-size: 12px;
          font-weight: bold;
        }

        .ig-input {
          width: 130px;
          padding: 12px;
          border:
            1px solid #ffffff40;
          border-radius: 9px;
          background: #0004;
          color: white;
        }

        .ig-result {
          border:
            1px solid #f1d584;
          background: #0004;
          border-radius: 12px;
          padding: 15px;
          margin-top: 14px;
          text-align: center;
          line-height: 1.8;
        }

        .ig-result strong {
          font-size: 24px;
          color: #ffe39b;
        }

        .ig-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }

        .ig-table th,
        .ig-table td {
          padding: 10px 5px;
          border-bottom:
            1px solid #ffffff20;
          text-align: left;
        }

        .ig-table th {
          color: #e8d192;
        }

        .ig-table-wrap {
          overflow: auto;
        }

        .ig-page h2 {
          font-size: 18px;
        }

        .ig-page :focus-visible {
          outline:
            3px solid #fbe49a;
          outline-offset: 3px;
        }

        @media (min-width: 700px) {
          .ig-roulette-layout {
            display: grid;
            grid-template-columns:
              1fr 1fr;
            gap: 20px;
            align-items: center;
          }

          .ig-number {
            font-size: 18px;
          }

          .ig-area {
            min-height: 64px;
          }
        }

        @media (max-width: 360px) {
          .ig-wrap {
            padding: 8px;
          }

          .ig-keno-board {
            gap: 3px;
          }

          .ig-number {
            font-size: 12px;
          }

          .ig-head {
            padding: 12px 8px;
          }

          .ig-head h1 {
            font-size: 15px;
          }
        }

        @media (
          prefers-reduced-motion: reduce
        ) {
          .ig-wheel {
            transition: none;
          }
        }
      `}</style>

      <header className="ig-head">
        <button
          type="button"
          className="ig-btn"
          onClick={onBack}
          aria-label="Customer home"
        >
          ←
        </button>

        <div>
          <h1>
            {title}
          </h1>

          <small>
            DEMO COINS ONLY
          </small>
        </div>

        <div className="ig-wallet">
          {balance === null
            ? "…"
            : money(balance)}

          <small>
            {user?.name ||
              user?.loginId ||
              "Customer"}
          </small>
        </div>
      </header>

      <main className="ig-wrap">
        <nav
          className="ig-tabs"
          aria-label="Game sections"
        >
          {[
            "game",
            "rules",
            "history",
          ].map(value => (
            <button
              key={value}
              type="button"
              className="ig-tab"
              aria-pressed={
                tab === value
              }
              disabled={busy}
              onClick={() =>
                setTab(value)
              }
            >
              {value.toUpperCase()}
            </button>
          ))}

          <button
            type="button"
            className="ig-tab"
            aria-pressed={sound}
            onClick={() =>
              setSound(
                value => !value,
              )
            }
            aria-label="Toggle sound"
          >
            {sound
              ? "♪ ON"
              : "♪ OFF"}
          </button>
        </nav>

        {error && (
          <div
            role="alert"
            className="ig-alert"
          >
            {error}

            {!busy &&
              !pending && (
                <button
                  type="button"
                  className="ig-btn"
                  onClick={() =>
                    void load()
                  }
                >
                  Refresh
                </button>
              )}
          </div>
        )}

        {notice && (
          <p
            role="status"
            className="ig-hint"
          >
            {notice}
          </p>
        )}

        {pending &&
          !busy && (
            <div
              className="ig-alert"
              role="status"
            >
              A bet needs recovery.
              Retry it before starting
              another bet.

              <button
                type="button"
                className="ig-btn"
                onClick={play}
              >
                RETRY SAME BET
              </button>
            </div>
          )}

        {tab === "game" && (
          <>
            {roulette ? (
              <div className="ig-roulette-layout">
                <Wheel
                  rotation={rotation}
                />

                <section
                  className="ig-card"
                  aria-label="Roulette betting board"
                >
                  <p className="ig-hint">
                    Bet:{" "}
                    <b>
                      {money(total)}
                    </b>{" "}
                    demo coins
                  </p>

                  <div className="ig-board">
                    {[
                      2, 4, 6,
                      8, 10, 12,
                      1, 3, 5,
                      7, 9, 11,
                    ].map(number =>
                      areaButton(
                        `n:${number}`,
                      ),
                    )}

                    {[
                      "low",
                      "even",
                      "black",
                      "red",
                      "odd",
                      "high",
                    ].map(areaButton)}
                  </div>

                  <div className="ig-row">
                    <button
                      type="button"
                      className="ig-btn"
                      disabled={
                        locked ||
                        !undo.length
                      }
                      onClick={() => {
                        setBets(
                          undo[
                            undo.length - 1
                          ],
                        );

                        setUndo(
                          items =>
                            items.slice(
                              0,
                              -1,
                            ),
                        );
                      }}
                    >
                      Undo
                    </button>

                    <button
                      type="button"
                      className="ig-btn"
                      disabled={locked}
                      onClick={() => {
                        setUndo(
                          items => [
                            ...items.slice(
                              -99,
                            ),
                            bets,
                          ],
                        );

                        setBets({});
                      }}
                    >
                      Clear
                    </button>

                    <button
                      type="button"
                      className="ig-btn"
                      disabled={
                        locked ||
                        !Object.keys(
                          lastBets,
                        ).length
                      }
                      onClick={() => {
                        setUndo(
                          items => [
                            ...items.slice(
                              -99,
                            ),
                            bets,
                          ],
                        );

                        setBets({
                          ...lastBets,
                        });
                      }}
                    >
                      Rebet
                    </button>
                  </div>
                </section>
              </div>
            ) : (
              <section
                className="ig-card"
                aria-label="Keno board"
              >
                <div
                  className="ig-balls"
                  aria-label="Drawn numbers"
                >
                  {drawn.map(
                    number => (
                      <span
                        key={number}
                        className="ig-ball"
                      >
                        {number}
                      </span>
                    ),
                  )}

                  {!drawn.length && (
                    <span className="ig-hint">
                      Pick up to 10 numbers
                      · 20 balls are drawn
                    </span>
                  )}
                </div>

                <div className="ig-keno-board">
                  {Array.from(
                    { length: 80 },
                    (_, index) =>
                      index + 1,
                  ).map(number => (
                    <button
                      key={number}
                      type="button"
                      aria-label={
                        `Number ${number}`
                      }
                      aria-pressed={
                        picks.includes(
                          number,
                        )
                      }
                      disabled={locked}
                      className={
                        `ig-number ${
                          picks.includes(
                            number,
                          )
                            ? "is-picked"
                            : ""
                        } ${
                          drawn.includes(
                            number,
                          )
                            ? picks.includes(
                                number,
                              )
                              ? "is-hit"
                              : "is-drawn"
                            : ""
                        }`
                      }
                      onClick={() =>
                        togglePick(
                          number,
                        )
                      }
                    >
                      {number}
                    </button>
                  ))}
                </div>

                <div className="ig-row">
                  <span className="ig-hint">
                    Selected{" "}
                    {picks.length}/10
                  </span>

                  {[
                    4, 6, 8, 10,
                  ].map(count => (
                    <button
                      key={count}
                      type="button"
                      className="ig-btn"
                      disabled={locked}
                      onClick={() =>
                        quickPick(count)
                      }
                    >
                      Quick {count}
                    </button>
                  ))}

                  <button
                    type="button"
                    className="ig-btn"
                    disabled={locked}
                    onClick={() =>
                      setPicks([])
                    }
                  >
                    Clear
                  </button>
                </div>

                {history.length > 0 && (
                  <p className="ig-hint">
                    Your last{" "}
                    {history.length}{" "}
                    rounds · Most drawn:{" "}
                    {ranked
                      .slice(0, 5)
                      .join(", ")}
                    {" "}· Least drawn:{" "}
                    {ranked
                      .slice(-5)
                      .join(", ")}
                    . Previous draws do
                    not predict the next
                    result.
                  </p>
                )}
              </section>
            )}

            <section
              className="ig-card"
              style={{
                marginTop: 14,
              }}
              aria-label="Bet controls"
            >
              {roulette ? (
                <>
                  <p className="ig-hint">
                    Choose a chip, then
                    tap betting areas.
                  </p>

                  <div className="ig-row">
                    {CHIPS.map(
                      value => (
                        <button
                          key={value}
                          type="button"
                          className="ig-chip"
                          aria-pressed={
                            chip === value
                          }
                          disabled={locked}
                          onClick={() =>
                            setChip(value)
                          }
                        >
                          {value}
                        </button>
                      ),
                    )}
                  </div>
                </>
              ) : (
                <div className="ig-row">
                  <label htmlFor="ig-stake">
                    Demo stake
                  </label>

                  <button
                    type="button"
                    className="ig-btn"
                    disabled={locked}
                    onClick={() =>
                      setAmount(
                        String(
                          Math.max(
                            10,
                            (
                              Number(
                                amount,
                              ) || 10
                            ) - 10,
                          ),
                        ),
                      )
                    }
                  >
                    −
                  </button>

                  <input
                    id="ig-stake"
                    className="ig-input"
                    type="number"
                    inputMode="numeric"
                    min="10"
                    max="25000"
                    step="1"
                    value={amount}
                    disabled={locked}
                    onChange={event =>
                      setAmount(
                        event.target.value,
                      )
                    }
                  />

                  <button
                    type="button"
                    className="ig-btn"
                    disabled={locked}
                    onClick={() =>
                      setAmount(
                        String(
                          Math.min(
                            25000,
                            (
                              Number(
                                amount,
                              ) || 0
                            ) + 10,
                          ),
                        ),
                      )
                    }
                  >
                    +
                  </button>
                </div>
              )}

              <button
                type="button"
                className="ig-play ig-full"
                disabled={
                  busy ||
                  (
                    !pending &&
                    (
                      !rules ||
                      balance === null
                    )
                  )
                }
                onClick={play}
              >
                {busy
                  ? roulette
                    ? "SPINNING…"
                    : "DRAWING…"
                  : pending
                    ? "RETRY SAME BET"
                    : roulette
                      ? "SPIN"
                      : "BET & DRAW"}
              </button>

              <p className="ig-hint">
                Minimum 10 · Maximum
                total stake 25,000 ·
                Whole demo coins
              </p>
            </section>

            {result && (
              <section
                className="ig-result"
                role="status"
              >
                <strong>
                  {roulette
                    ? (
                        `Result: ${
                          result.result.number
                        } · ${
                          result.result.color.toUpperCase()
                        }`
                      )
                    : (
                        `${
                          result.result.hits.length
                        } HITS · ${
                          result.result.multiplier
                        }x`
                      )}
                </strong>

                <div>
                  Stake{" "}
                  {money(
                    result.stake,
                  )}
                  {" "}· Total return{" "}
                  {money(
                    result.payout,
                  )}
                </div>

                <div>
                  Net{" "}
                  {result.payout -
                    result.stake >=
                  0
                    ? "+"
                    : ""}

                  {money(
                    result.payout -
                      result.stake,
                  )}
                  {" "}demo coins
                </div>

                {!roulette && (
                  <div>
                    Matched:{" "}
                    {result.result.hits.join(
                      ", ",
                    ) || "None"}
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {tab === "rules" && (
          <section className="ig-card">
            <h2>
              Demo rules &amp; paytable
            </h2>

            <p className="ig-hint">
              Results are generated on
              the server. Every round
              is independent. All
              multipliers below are
              total returns including
              the stake, rounded down
              to whole demo coins.
            </p>

            {!rules ? (
              <button
                type="button"
                className="ig-btn"
                onClick={() =>
                  void load()
                }
              >
                Load rules
              </button>
            ) : roulette ? (
              <>
                <p className="ig-hint">
                  Each of the 12 numbers
                  has an equal chance.
                  Red:{" "}
                  {rules.rules.red.join(
                    ", ",
                  )}
                  . Remaining numbers
                  are black. You can
                  bet on multiple areas;
                  each area settles
                  separately.
                </p>

                <table className="ig-table">
                  <thead>
                    <tr>
                      <th>
                        Bet
                      </th>

                      <th>
                        Total return
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr>
                      <td>
                        One number
                      </td>

                      <td>
                        {
                          rules.rules
                            .numberReturn
                        }x
                      </td>
                    </tr>

                    <tr>
                      <td>
                        Red / Black /
                        Even / Odd /
                        1–6 / 7–12
                      </td>

                      <td>
                        {
                          rules.rules
                            .groupReturn
                        }x
                      </td>
                    </tr>
                  </tbody>
                </table>

                <p className="ig-hint">
                  Example: 10 coins on
                  one winning number
                  returns 110 total
                  coins. 10 coins on
                  a winning group
                  returns 19 total
                  coins.
                </p>
              </>
            ) : (
              <>
                <p className="ig-hint">
                  Select 1–10 distinct
                  numbers from 1–80.
                  Twenty different
                  numbers are drawn
                  per round. Your
                  selected count and
                  hit count determine
                  the return. Last-ball
                  betting is not
                  enabled in this demo.
                </p>

                <div className="ig-table-wrap">
                  <table className="ig-table">
                    <thead>
                      <tr>
                        <th>
                          Picks / Hits
                        </th>

                        {Array.from(
                          {
                            length: 11,
                          },
                          (_, index) => (
                            <th
                              key={index}
                            >
                              {index}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>

                    <tbody>
                      {Object.entries(
                        rules.rules.payouts,
                      ).map(
                        ([
                          count,
                          values,
                        ]) => (
                          <tr key={count}>
                            <th>
                              {count} picks
                            </th>

                            {Array.from(
                              {
                                length: 11,
                              },
                              (
                                _,
                                index,
                              ) => (
                                <td
                                  key={index}
                                >
                                  {index <
                                  values.length
                                    ? (
                                        `${
                                          values[
                                            index
                                          ]
                                        }x`
                                      )
                                    : "—"}
                                </td>
                              ),
                            )}
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        )}

        {tab === "history" && (
          <section className="ig-card">
            <h2>
              Your completed rounds
            </h2>

            <button
              type="button"
              className="ig-btn"
              onClick={() =>
                void refreshHistory()
              }
            >
              Refresh history
            </button>

            {!history.length ? (
              <p className="ig-hint">
                No completed rounds
                available.
              </p>
            ) : (
              <div className="ig-table-wrap">
                <table className="ig-table">
                  <thead>
                    <tr>
                      <th>
                        Round / Time
                      </th>

                      <th>
                        Result
                      </th>

                      <th>
                        Stake
                      </th>

                      <th>
                        Total return
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {history.map(
                      bet => (
                        <tr key={bet.id}>
                          <td>
                            #{bet.id}

                            <br />

                            {new Date(
                              bet.created_at,
                            ).toLocaleString(
                              "en-IN",
                              {
                                timeZone:
                                  "Asia/Kolkata",
                              },
                            )}
                          </td>

                          <td>
                            {roulette
                              ? (
                                  `${
                                    bet.result.number
                                  } ${
                                    bet.result.color
                                  }`
                                )
                              : (
                                  `${
                                    bet.result.hits.length
                                  } hits · ${
                                    bet.result.multiplier
                                  }x`
                                )}
                          </td>

                          <td>
                            {money(
                              bet.stake,
                            )}
                          </td>

                          <td>
                            {money(
                              bet.payout,
                            )}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        <footer className="ig-row">
          <button
            type="button"
            className="ig-btn"
            onClick={onBack}
          >
            ← Customer home
          </button>

          {onLogout && (
            <button
              type="button"
              className="ig-btn"
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
