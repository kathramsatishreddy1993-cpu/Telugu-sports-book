import React, {
  useEffect,
  useRef,
  useState,
} from "react";

const SYMBOLS = {
  club: {
    icon: "♣",
    name: "CLUB",
  },
  crown: {
    icon: "♛",
    name: "CROWN",
  },
  spade: {
    icon: "♠",
    name: "SPADE",
  },
  diamond: {
    icon: "♦",
    name: "DIAMOND",
  },
  flag: {
    icon: "⚑",
    name: "FLAG",
  },
  heart: {
    icon: "♥",
    name: "HEART",
  },
};

const CHIPS = [
  10, 20, 50, 100, 500,
];

const number = value =>
  Number(value || 0).toLocaleString(
    "en-IN",
  );

const areaName = area =>
  SYMBOLS[area]?.name || area;

function readPending(key, game) {
  try {
    const value = JSON.parse(
      sessionStorage.getItem(key) ||
        "null",
    );

    return value?.game === game &&
      typeof value.body?.requestKey ===
        "string"
      ? value.body
      : null;
  } catch {
    return null;
  }
}

function savePending(
  key,
  game,
  body,
) {
  try {
    sessionStorage.setItem(
      key,
      JSON.stringify({
        game,
        body,
      }),
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
  const bytes =
    new Uint8Array(20);

  window.crypto.getRandomValues(
    bytes,
  );

  return Array.from(
    bytes,
    value =>
      value
        .toString(16)
        .padStart(2, "0"),
  ).join("");
}

async function api(
  url,
  options = {},
) {
  const controller =
    new AbortController();

  const timeout = setTimeout(
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
    [
      "lankesh",
      "jhandi-munda",
    ].includes(gameId) &&
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
      Customer login and a valid
      game are required.

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
  const lankesh =
    gameId === "lankesh";

  const title = lankesh
    ? "LANKESH"
    : "JHANDI MUNDA";

  const base =
    `/api/dice-games/${gameId}`;

  const [rules, setRules] =
    useState(null);

  const [state, setState] =
    useState(null);

  const [now, setNow] =
    useState(Date.now());

  const [draft, setDraft] =
    useState({});

  const [chip, setChip] =
    useState(10);

  const [tab, setTab] =
    useState("game");

  const [history, setHistory] =
    useState([]);

  const [pending, setPending] =
    useState(() =>
      readPending(
        storageKey,
        gameId,
      ),
    );

  const [busy, setBusy] =
    useState(false);

  const [sound, setSound] =
    useState(false);

  const [error, setError] =
    useState("");

  const [notice, setNotice] =
    useState("");

  const [lastSync, setLastSync] =
    useState(0);

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
          : round.endsAt,
      ).getTime()
    : 0;

  const seconds = Math.max(
    0,
    Math.ceil(
      (endTime - now) / 1000,
    ),
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

  const total =
    Object.values(draft).reduce(
      (sum, value) => sum + value,
      0,
    );

  const committed = (
    state?.bets || []
  ).reduce(
    (sum, bet) =>
      sum + Number(bet.stake),
    0,
  );

  const credited = (
    state?.bets || []
  ).reduce(
    (sum, bet) =>
      sum +
      Number(bet.payout || 0),
    0,
  );

  const bell = () => {
    if (
      !soundRef.current ||
      !audio.current
    ) {
      return;
    }

    try {
      const ctx = audio.current;

      [
        440,
        880,
        1306,
        1860,
      ].forEach(
        (frequency, index) => {
          const oscillator =
            ctx.createOscillator();

          const gain =
            ctx.createGain();

          oscillator.frequency.value =
            frequency;

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

          oscillator.stop(
            ctx.currentTime + 1.8,
          );
        },
      );
    } catch {}
  };

  const toggleSound = () => {
    const enabled =
      !soundRef.current;

    soundRef.current =
      enabled;

    setSound(enabled);

    if (!enabled) {
      audio.current
        ?.suspend()
        ?.catch(() => {});

      return;
    }

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
        ?.then(() => bell())
        .catch(() => {});
    } catch {}
  };

  const refresh = async () => {
    if (
      polling.current ||
      posting.current
    ) {
      return;
    }

    polling.current = true;

    const version =
      revision.current;

    const started =
      Date.now();

    try {
      const data = await api(
        `${base}/state`,
      );

      if (
        !active.current ||
        version !== revision.current
      ) {
        return;
      }

      const finished =
        Date.now();

      offset.current =
        new Date(
          data.serverTime,
        ).getTime() -
        (started + finished) / 2;

      setNow(
        finished + offset.current,
      );

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

      roundRef.current =
        data.round.id;

      setState(data);

      if (
        data.round.phase ===
          "RESULT" &&
        sounded.current !==
          String(data.round.id)
      ) {
        sounded.current =
          String(data.round.id);

        bell();

        window.dispatchEvent(
          new Event(
            "demo-balance-updated",
          ),
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

  refreshRef.current =
    refresh;

  useEffect(() => {
    active.current = true;

    let cancelled = false;

    api(`${base}/rules`)
      .then(data => {
        if (!cancelled) {
          setRules(data);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err.message);
        }
      });

    void refreshRef.current();

    const pollTimer =
      setInterval(
        () =>
          void refreshRef.current(),
        1000,
      );

    const clockTimer =
      setInterval(() => {
        if (active.current) {
          setNow(
            Date.now() +
              offset.current,
          );
        }
      }, 250);

    const focused = () =>
      void refreshRef.current();

    window.addEventListener(
      "focus",
      focused,
    );

    return () => {
      cancelled = true;
      active.current = false;

      clearInterval(pollTimer);
      clearInterval(clockTimer);

      window.removeEventListener(
        "focus",
        focused,
      );

      audio.current
        ?.close()
        ?.catch(() => {});
    };
  }, []);

  const loadHistory = async () => {
    try {
      const data = await api(
        `${base}/history`,
      );

      if (active.current) {
        setHistory(
          data.bets || [],
        );
      }
    } catch (err) {
      if (active.current) {
        setError(err.message);
      }
    }
  };

  const add = area => {
    if (locked) return;

    if (
      total +
        committed +
        chip >
      25000
    ) {
      setError(
        "Maximum total stake per round is 25,000 demo coins.",
      );

      return;
    }

    setDraft(current => ({
      ...current,

      [area]:
        (current[area] || 0) +
        chip,
    }));

    setError("");
  };

  const submit = async () => {
    if (
      posting.current
    ) {
      return;
    }

    let body =
      pendingRef.current;

    if (!body) {
      if (
        !open ||
        total < 10
      ) {
        setError(
          "Choose a bet while betting is open.",
        );

        return;
      }

      if (
        total + committed >
        25000
      ) {
        setError(
          "Maximum total stake per round is 25,000 demo coins.",
        );

        return;
      }

      if (
        total >
        Number(state.balance)
      ) {
        setError(
          "LOW BALANCE",
        );

        return;
      }

      try {
        body = {
          requestKey:
            uniqueKey(),

          roundId:
            String(round.id),

          bets:
            Object.entries(
              draft,
            ).map(
              ([
                area,
                amount,
              ]) => ({
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

      if (
        !savePending(
          storageKey,
          gameId,
          body,
        )
      ) {
        setError(
          "Enable browser session storage to recover interrupted bets.",
        );

        return;
      }

      pendingRef.current =
        body;

      setPending(body);
    }

    posting.current =
      true;

    revision.current += 1;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const data = await api(
        `${base}/bets`,
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

      clearPending(
        storageKey,
      );

      pendingRef.current =
        null;

      if (
        !active.current
      ) {
        return;
      }

      setPending(null);
      setDraft({});

      setState(current => {
        if (!current) {
          return current;
        }

        const sameRound =
          String(
            current.round.id,
          ) ===
          String(
            data.bet.roundId,
          );

        const exists =
          current.bets.some(
            bet =>
              String(bet.id) ===
              String(data.bet.id),
          );

        return {
          ...current,

          balance:
            data.balance,

          bets:
            sameRound &&
            !exists
              ? [
                  ...current.bets,
                  data.bet,
                ]
              : current.bets,
        };
      });

      setNotice(
        data.replayed
          ? "Previous bet recovered. No second debit."
          : "Bet accepted. Waiting for the round result.",
      );

      window.dispatchEvent(
        new Event(
          "demo-balance-updated",
        ),
      );
    } catch (err) {
      if (
        !active.current
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
        clearPending(
          storageKey,
        );

        pendingRef.current =
          null;

        setPending(null);
      }

      setError(
        err.status
          ? err.message
          : "Connection interrupted. Press RETRY SAME BET to recover your bet.",
      );
    } finally {
      posting.current =
        false;

      if (
        active.current
      ) {
        setBusy(false);

        void refreshRef.current();
      }
    }
  };

  return (
    <div
      className={
        `dg-page ${
          lankesh
            ? "dg-lankesh"
            : ""
        }`
      }
    >
      <style>{`
        .dg-page {
          min-height: 100vh;
          background:
            radial-gradient(
              ellipse at top,
              #243c65,
              #080f22 75%
            );
          color: #f5f2e9;
          font-family:
            Arial, sans-serif;
          padding-bottom: 24px;
        }

        .dg-lankesh {
          background:
            radial-gradient(
              ellipse at top,
              #3c244b,
              #100f22 75%
            );
        }

        .dg-page * {
          box-sizing: border-box;
        }

        .dg-page button {
          font: inherit;
          cursor: pointer;
        }

        .dg-page button:disabled {
          opacity: .45;
          cursor: default;
        }

        .dg-header {
          padding: 15px;
          display: flex;
          align-items: center;
          gap: 12px;
          background: #0005;
          border-bottom:
            1px solid #ffffff20;
        }

        .dg-header h1 {
          font-size: 18px;
          margin: 0;
        }

        .dg-header small {
          display: block;
          font-size: 10px;
          color: #e9cc82;
          margin-top: 5px;
        }

        .dg-balance {
          margin-left: auto;
          text-align: right;
          font-weight: bold;
        }

        .dg-wrap {
          max-width: 850px;
          padding: 12px;
          margin: auto;
        }

        .dg-btn {
          border:
            1px solid #ffffff30;
          border-radius: 9px;
          background: #ffffff10;
          color: inherit;
          padding: 10px 12px;
        }

        .dg-tabs {
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }

        .dg-tabs [aria-pressed=true] {
          background: #ebce7a;
          color: #19243d;
        }

        .dg-alert {
          background: #4a2c17;
          border:
            1px solid #dba951;
          color: #ffe4ab;
          padding: 12px;
          border-radius: 10px;
          font-size: 13px;
          line-height: 1.7;
          margin: 12px 0;
        }

        .dg-alert button {
          margin: 6px;
        }

        .dg-hint {
          color: #d0d8e8;
          font-size: 12px;
          line-height: 1.7;
        }

        .dg-stage {
          position: relative;
          padding: 20px 12px;
          background: #0004;
          border:
            1px solid #ffffff25;
          border-radius: 16px;
          text-align: center;
          min-height: 175px;
        }

        .dg-timer {
          width: 74px;
          height: 74px;
          border-radius: 50%;
          border:
            4px solid #e4c779;
          display: grid;
          place-items: center;
          margin: 0 auto 10px;
          font-size: 28px;
          font-weight: bold;
        }

        .dg-phase {
          color: #ffe392;
          font-weight: bold;
          font-size: 14px;
        }

        .dg-dice {
          display: flex;
          gap: 9px;
          justify-content: center;
          flex-wrap: wrap;
          margin-top: 17px;
        }

        .dg-die {
          width: 45px;
          height: 45px;
          display: grid;
          place-items: center;
          background: #f9f1d9;
          border-radius: 9px;
          color: #225c61;
          font-size: 31px;
          box-shadow:
            3px 4px 0 #809497;
        }

        .dg-arrow {
          font-size: 29px;
          margin-top: 15px;
          color: #f6d570;
          animation:
            dgReveal .7s ease-out;
        }

        .dg-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 9px;
          margin-top: 14px;
        }

        .dg-heads {
          grid-template-columns:
            repeat(5, minmax(0, 1fr));
        }

        .dg-area {
          position: relative;
          min-height: 130px;
          padding: 12px 5px;
          border:
            1px solid #4c90b2;
          border-radius: 13px;
          background:
            linear-gradient(
              #174f68,
              #0c1729
            );
          color: #fff;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .dg-heads .dg-area {
          min-height: 105px;
        }

        .dg-area.dg-win {
          border:
            2px solid #ffdf73;
          box-shadow:
            0 0 16px #edcb6550;
        }

        .dg-icon {
          font-size: 46px;
          line-height: 1.1;
        }

        .dg-heads .dg-icon {
          font-size: 34px;
        }

        .dg-area strong {
          font-size: 11px;
        }

        .dg-chip-tag {
          border-radius: 20px;
          background: #e6c36b;
          color: #1c2431;
          padding: 3px 7px;
          font-size: 11px;
          font-weight: bold;
        }

        .dg-result-tag {
          color: #ffe395;
          font-weight: bold;
          font-size: 12px;
        }

        .dg-controls {
          border:
            1px solid #ffffff25;
          background: #0003;
          padding: 14px;
          border-radius: 13px;
          margin-top: 14px;
        }

        .dg-row {
          display: flex;
          gap: 9px;
          align-items: center;
          flex-wrap: wrap;
          margin-top: 10px;
        }

        .dg-chip {
          width: 46px;
          height: 46px;
          border:
            3px dashed #ffffffaa;
          border-radius: 50%;
          color: #fff;
          background: #22536e;
          font-weight: bold;
        }

        .dg-chip[aria-pressed=true] {
          outline:
            3px solid #e6c36b;
          outline-offset: 2px;
        }

        .dg-submit {
          width: 100%;
          padding: 15px;
          border: 0;
          background: #e7ca76;
          color: #18273b;
          border-radius: 10px;
          font-weight: 900;
          margin-top: 15px;
        }

        .dg-summary {
          border:
            1px solid #d5b867;
          padding: 12px;
          border-radius: 11px;
          margin-top: 14px;
          text-align: center;
          line-height: 1.8;
        }

        .dg-recent {
          display: flex;
          gap: 7px;
          overflow: auto;
          padding: 9px 0;
        }

        .dg-recent span {
          flex-shrink: 0;
          background: #ffffff10;
          border:
            1px solid #ffffff25;
          border-radius: 8px;
          padding: 8px;
          font-size: 12px;
        }

        .dg-card {
          padding: 14px;
          border:
            1px solid #ffffff25;
          border-radius: 12px;
          background: #0003;
        }

        .dg-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }

        .dg-table th,
        .dg-table td {
          text-align: left;
          border-bottom:
            1px solid #ffffff20;
          padding: 10px 6px;
        }

        .dg-table th {
          color: #e6cc8c;
        }

        .dg-overflow {
          overflow: auto;
        }

        .dg-page :focus-visible {
          outline:
            3px solid #ffe09a;
          outline-offset: 3px;
        }

        @keyframes dgReveal {
          from {
            opacity: 0;
            transform:
              translateX(-20px);
          }

          to {
            opacity: 1;
            transform:
              translateX(0);
          }
        }

        @media (max-width: 360px) {
          .dg-wrap {
            padding: 8px;
          }

          .dg-grid {
            gap: 5px;
          }

          .dg-heads .dg-icon {
            font-size: 28px;
          }

          .dg-header {
            padding: 12px 8px;
          }

          .dg-header h1 {
            font-size: 15px;
          }

          .dg-heads .dg-area {
            padding: 9px 2px;
          }
        }

        @media (
          prefers-reduced-motion: reduce
        ) {
          .dg-arrow {
            animation: none;
          }
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

          <small>
            DEMO COINS ONLY
          </small>
        </div>

        <div className="dg-balance">
          {state
            ? number(state.balance)
            : "…"}

          <small>
            {user?.name ||
              user?.loginId ||
              "Customer"}
          </small>
        </div>
      </header>

      <main className="dg-wrap">
        <nav
          className="dg-tabs"
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
              className="dg-btn"
              aria-pressed={
                tab === value
              }
              onClick={() => {
                setTab(value);

                if (
                  value === "history"
                ) {
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
            {sound
              ? "SOUND ON"
              : "SOUND OFF"}
          </button>
        </nav>

        {error && (
          <div
            className="dg-alert"
            role="alert"
          >
            {error}

            <button
              type="button"
              className="dg-btn"
              onClick={() => {
                setError("");

                void refreshRef.current();

                if (!rules) {
                  api(
                    `${base}/rules`,
                  )
                    .then(data => {
                      if (
                        active.current
                      ) {
                        setRules(data);
                      }
                    })
                    .catch(err => {
                      if (
                        active.current
                      ) {
                        setError(
                          err.message,
                        );
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
          <p
            role="status"
            className="dg-hint"
          >
            {notice}
          </p>
        )}

        {pending && (
          <div
            className="dg-alert"
            role="status"
          >
            An interrupted bet needs
            recovery. The original
            round and request will
            be used.

            <button
              type="button"
              className="dg-btn"
              disabled={busy}
              onClick={submit}
            >
              {busy
                ? "CHECKING…"
                : "RETRY SAME BET"}
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
                {round
                  ? seconds
                  : "…"}
              </div>

              <div className="dg-phase">
                {!round
                  ? "CONNECTING…"
                  : stale
                    ? "RECONNECTING…"
                    : result
                      ? "ROUND RESULT"
                      : seconds > 0
                        ? "BETTING OPEN"
                        : "BETTING CLOSED"}
              </div>

              <p className="dg-hint">
                Round #
                {round?.id || "—"}
                {" "}· 30 seconds betting
                · 5 seconds result
              </p>

              {lankesh ? (
                <div
                  className="dg-arrow"
                  key={
                    result?.head ||
                    "waiting"
                  }
                >
                  {result
                    ? `🏹 ➶ ${result.head}`
                    : "🏹 Choose a head below"}
                </div>
              ) : (
                <div
                  className="dg-dice"
                  aria-label="Six dice"
                >
                  {Array.from(
                    { length: 6 },
                    (_, index) => (
                      <span
                        key={index}
                        className="dg-die"
                      >
                        {result
                          ? SYMBOLS[
                              result.dice[
                                index
                              ]
                            ]?.icon
                          : "?"}
                      </span>
                    ),
                  )}
                </div>
              )}
            </section>

            <section
              className={
                `dg-grid ${
                  lankesh
                    ? "dg-heads"
                    : ""
                }`
              }
              aria-label="Betting areas"
            >
              {(
                rules?.areas || []
              ).map(area => {
                const accepted = (
                  state?.bets || []
                ).reduce(
                  (sum, bet) =>
                    sum +
                    bet.bets
                      .filter(
                        item =>
                          item.area ===
                          area,
                      )
                      .reduce(
                        (
                          subtotal,
                          item,
                        ) =>
                          subtotal +
                          item.amount,
                        0,
                      ),
                  0,
                );

                const count =
                  result &&
                  !lankesh
                    ? result.counts[
                        area
                      ]
                    : null;

                const multiplier =
                  result
                    ? lankesh
                      ? result.head ===
                        area
                        ? rules.payouts
                            .winningHead
                        : 0
                      : rules.payouts[
                          count
                        ]
                    : 0;

                return (
                  <button
                    key={area}
                    type="button"
                    className={
                      `dg-area ${
                        multiplier > 0
                          ? "dg-win"
                          : ""
                      }`
                    }
                    disabled={locked}
                    onClick={() =>
                      add(area)
                    }
                    aria-label={
                      `Bet on ${
                        areaName(area)
                      }`
                    }
                  >
                    <span
                      className="dg-icon"
                      aria-hidden="true"
                    >
                      {lankesh
                        ? "🧔"
                        : SYMBOLS[
                            area
                          ]?.icon}
                    </span>

                    <strong>
                      {areaName(area)}
                    </strong>

                    {draft[area] >
                      0 && (
                      <span className="dg-chip-tag">
                        Draft{" "}
                        {number(
                          draft[area],
                        )}
                      </span>
                    )}

                    {accepted >
                      0 && (
                      <small>
                        Placed{" "}
                        {number(
                          accepted,
                        )}
                      </small>
                    )}

                    {result && (
                      <span className="dg-result-tag">
                        {!lankesh
                          ? `${count} dice · `
                          : ""}
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
                Choose a chip, tap
                areas, then confirm
                your bet.
              </p>

              <div className="dg-row">
                {CHIPS.map(
                  value => (
                    <button
                      key={value}
                      type="button"
                      className="dg-chip"
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

                <button
                  type="button"
                  className="dg-btn"
                  disabled={
                    locked ||
                    !total
                  }
                  onClick={() =>
                    setDraft({})
                  }
                >
                  Clear draft
                </button>
              </div>

              <p className="dg-hint">
                Draft{" "}
                {number(total)}
                {" "}· Placed this round{" "}
                {number(committed)}
                {" "}· Maximum round
                stake 25,000
              </p>

              <button
                type="button"
                className="dg-submit"
                disabled={
                  busy ||
                  (
                    !pending &&
                    (
                      !open ||
                      !total
                    )
                  )
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
                className="dg-summary"
                role="status"
              >
                <strong>
                  {lankesh
                    ? `Winning head: ${result.head}`
                    : "Dice result confirmed"}
                </strong>

                <div>
                  Your stake{" "}
                  {number(committed)}
                  {" "}· Total return{" "}
                  {number(credited)}
                </div>

                <div>
                  Net{" "}
                  {credited -
                    committed >=
                  0
                    ? "+"
                    : ""}
                  {number(
                    credited -
                      committed,
                  )}
                  {" "}demo coins
                </div>
              </section>
            )}

            <p className="dg-hint">
              Last results · newest
              first
            </p>

            <div className="dg-recent">
              {(
                state?.recentResults ||
                []
              ).map(item => (
                <span
                  key={item.id}
                >
                  #{item.id}{" "}

                  {lankesh
                    ? item.result.head
                    : item.result.dice
                        .map(
                          area =>
                            SYMBOLS[
                              area
                            ]?.icon,
                        )
                        .join(" ")}
                </span>
              ))}
            </div>
          </>
        )}

        {tab === "rules" && (
          <section className="dg-card">
            <h2>
              Rules &amp; payouts
            </h2>

            <p className="dg-hint">
              All players share the
              same round. Betting
              lasts 30 seconds. The
              random result is stored
              before betting opens
              and shown after betting
              closes. Results remain
              visible for 5 seconds.
              Bets are accepted only
              by the server while
              betting is open.
            </p>

            <p className="dg-hint">
              Minimum 10 whole demo
              coins per selected area.
              Maximum total 25,000
              per customer per round.
              Multipliers are total
              returns including the
              stake, rounded down to
              whole coins.
            </p>

            {!rules ? (
              <p className="dg-hint">
                Waiting for server
                rules…
              </p>
            ) : lankesh ? (
              <>
                <p className="dg-hint">
                  Select F1–F10.
                  Each head has an
                  equal chance. The
                  winning head returns{" "}
                  {
                    rules.payouts
                      .winningHead
                  }x. Other heads
                  return zero.
                </p>

                <p className="dg-hint">
                  Example: a winning
                  10-coin bet returns
                  95 coins in total.
                </p>
              </>
            ) : (
              <>
                <p className="dg-hint">
                  Six independent dice
                  are rolled. Each die
                  has six equally
                  likely symbols. Two
                  or more matches are
                  needed for a return.
                </p>

                <table className="dg-table">
                  <thead>
                    <tr>
                      <th>
                        Matching dice
                      </th>

                      <th>
                        Total return
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {rules.payouts.map(
                      (
                        value,
                        index,
                      ) => (
                        <tr
                          key={index}
                        >
                          <td>
                            {index}
                          </td>

                          <td>
                            {value}x
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>

                <p className="dg-hint">
                  Turn Sound on to
                  hear the synthesized
                  temple bell when
                  results appear.
                </p>
              </>
            )}
          </section>
        )}

        {tab === "history" && (
          <section className="dg-card">
            <h2>
              Your settled bets
            </h2>

            <button
              type="button"
              className="dg-btn"
              onClick={() =>
                void loadHistory()
              }
            >
              Refresh history
            </button>

            {history.length ? (
              <div className="dg-overflow">
                <table className="dg-table">
                  <thead>
                    <tr>
                      <th>
                        Round / Time
                      </th>

                      <th>
                        Your areas
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
                        <tr
                          key={bet.id}
                        >
                          <td>
                            #{bet.roundId}

                            <br />

                            {new Date(
                              bet.createdAt,
                            ).toLocaleString(
                              "en-IN",
                              {
                                timeZone:
                                  "Asia/Kolkata",
                              },
                            )}
                          </td>

                          <td>
                            {bet.bets
                              .map(
                                item =>
                                  `${
                                    areaName(
                                      item.area,
                                    )
                                  }: ${
                                    number(
                                      item.amount,
                                    )
                                  }`,
                              )
                              .join(", ")}

                            <br />

                            {lankesh
                              ? `Result ${bet.result.head}`
                              : bet.result.dice
                                  .map(
                                    area =>
                                      SYMBOLS[
                                        area
                                      ]?.icon,
                                  )
                                  .join(
                                    " ",
                                  )}
                          </td>

                          <td>
                            {number(
                              bet.stake,
                            )}
                          </td>

                          <td>
                            {number(
                              bet.payout,
                            )}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="dg-hint">
                No settled bets
                available.
              </p>
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
