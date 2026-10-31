import React, {
  useEffect,
  useRef,
  useState,
} from "react";

export {
  default as AnimatedSuperOverLobby,
} from "./CricketMatchList";

const API = "/api/animated-cricket";

const money = value =>
  Number.isFinite(Number(value)) &&
  value !== null
    ? `₹${Number(value).toLocaleString(
        "en-IN",
        {
          maximumFractionDigits: 2,
        },
      )}`
    : "—";

const seconds = milliseconds =>
  Math.max(
    0,
    Math.ceil(milliseconds / 1000),
  );

const stamp = value =>
  new Date(value).toLocaleString(
    "en-IN",
    {
      timeZone: "Asia/Kolkata",
      hour12: false,
    },
  );

async function api(path, body) {
  const controller =
    new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    8000,
  );

  try {
    const response = await fetch(
      API + path,
      {
        credentials: "same-origin",
        cache: "no-store",
        signal: controller.signal,

        ...(body
          ? {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify(body),
            }
          : {}),
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
            "Request failed",
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

const store = {
  get(key) {
    try {
      return JSON.parse(
        sessionStorage.getItem(key) ||
          "null",
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
  return (
    "tsb_card_so_pending_v1:" +
    id
  );
}

function newKey() {
  const bytes =
    new Uint8Array(24);

  globalThis.crypto.getRandomValues(
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

function Host({ celebrate }) {
  const [failed, setFailed] =
    useState(false);

  const source = celebrate
    ? "/games/superover-clap.mp4"
    : "/games/superover-idle.mp4";

  return (
    <div className="cs-host">
      {!failed ? (
        <video
          key={source}
          src={source}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onError={() =>
            setFailed(true)
          }
        />
      ) : (
        <div className="cs-no-video">
          Host video unavailable
        </div>
      )}

      <small className="cs-ai">
        AI-GENERATED DEMO
      </small>
    </div>
  );
}

function CardTable({
  match,
  now,
}) {
  const transfer =
    match.phase === "TRANSFER";

  const events =
    match.events || [];

  const latest =
    events.at(-1);

  const age = latest
    ? now -
      new Date(
        match.roundStartAt,
      ).getTime() -
      latest.at
    : Infinity;

  const moving =
    latest &&
    age >= 0 &&
    age < 650;

  return (
    <div className="cs-scene">
      <Host
        celebrate={
          match.phase === "RESULT" &&
          match.result?.winner !==
            "TIE" &&
          age < 2000
        }
      />

      <div
        className="cs-machine"
        aria-label="Opaque card machine beside the left edge of the table"
      >
        <div className="cs-machine-top" />

        <span>
          SHUFFLER
        </span>
      </div>

      <div className="cs-table">
        <div className="cs-table-title">
          Super Over
        </div>

        <div
          className="cs-shoe"
          aria-label={
            transfer
              ? "Transparent tray receiving a small card stack"
              : "Transparent card tray"
          }
        >
          {!transfer && (
            <div className="cs-stack" />
          )}
        </div>

        {transfer && (
          <div
            key={match.id}
            className="cs-transfer-stack"
            aria-hidden="true"
          />
        )}

        <div
          className="cs-slots"
          aria-label="Two rows with six card positions each"
        >
          {[0, 1].map(team => (
            <div
              key={team}
              className="cs-card-row"
              aria-label={
                `${match.teams[team]} ` +
                "six card positions"
              }
            >
              {Array.from(
                { length: 6 },
                (_, index) => {
                  const card =
                    events.find(
                      event =>
                        event.team ===
                          team &&
                        event.ball ===
                          index + 1,
                    );

                  const arriving =
                    moving &&
                    card?.index ===
                      latest.index;

                  return (
                    <div
                      key={index}
                      className="cs-slot"
                    >
                      {card && (
                        <div
                          key={
                            `${match.id}:` +
                            card.index
                          }
                          className={
                            "cs-playing-card " +
                            (
                              arriving
                                ? "cs-arriving "
                                : ""
                            ) +
                            (
                              card.rank === "K"
                                ? "cs-wicket-card"
                                : ""
                            )
                          }
                          style={
                            arriving
                              ? {
                                  "--from-x":
                                    `${
                                      (5 - index) *
                                        115 +
                                      110
                                    }%`,

                                  "--from-y":
                                    team === 0
                                      ? "-170%"
                                      : "-300%",
                                }
                              : undefined
                          }
                          aria-label={
                            `${
                              match.teams[team]
                            } ball ${
                              index + 1
                            }: ${
                              card.rank
                            }, ${
                              card.value === "W"
                                ? "wicket"
                                : `${card.value} runs`
                            }`
                          }
                        >
                          <b>
                            {card.rank}
                          </b>

                          <span>
                            ♠
                          </span>

                          <b>
                            {card.rank}
                          </b>
                        </div>
                      )}
                    </div>
                  );
                },
              )}
            </div>
          ))}
        </div>

        <span className="cs-table-foot">
          INDIA · AUSTRALIA
        </span>
      </div>
    </div>
  );
}

export default function AnimatedSuperOverPage({
  onBack = () =>
    window.location.assign("/"),
}) {
  const [data, setData] =
    useState(null);

  const [now, setNow] =
    useState(Date.now());

  const [error, setError] =
    useState("");

  const [betError, setBetError] =
    useState("");

  const [amount, setAmount] =
    useState("100");

  const [selection, setSelection] =
    useState(null);

  const [busy, setBusy] =
    useState(false);

  const [pending, setPending] =
    useState(null);

  const [message, setMessage] =
    useState("");

  const mounted =
    useRef(false);

  const inFlight =
    useRef(false);

  const refresh =
    useRef(() => {});

  const anchor = useRef({
    server: Date.now(),
    local: performance.now(),
  });

  const received =
    useRef(0);

  const account =
    useRef(null);

  const dataRef =
    useRef(null);

  const lastBalance =
    useRef(null);

  useEffect(() => {
    mounted.current = true;

    let alive = true;
    let loading = false;

    async function load() {
      if (loading) {
        return;
      }

      loading = true;

      try {
        const value =
          await api("/state");

        if (!alive) {
          return;
        }

        if (
          account.current !==
          value.customerId
        ) {
          account.current =
            value.customerId;

          setSelection(null);
          setMessage("");
          setBetError("");

          const saved =
            store.get(
              keyFor(
                value.customerId,
              ),
            );

          setPending(
            saved?.customerId ===
              value.customerId &&
              typeof saved.body
                ?.requestKey ===
                "string"
              ? saved
              : null,
          );

          lastBalance.current =
            null;
        }

        if (
          lastBalance.current !==
            null &&
          lastBalance.current !==
            value.balance
        ) {
          window.dispatchEvent(
            new Event(
              "demo-balance-updated",
            ),
          );
        }

        lastBalance.current =
          value.balance;

        anchor.current = {
          server:
            new Date(
              value.serverTime,
            ).getTime(),

          local:
            performance.now(),
        };

        received.current =
          performance.now();

        dataRef.current =
          value;

        setData(value);

        setNow(
          anchor.current.server,
        );

        setError("");
      } catch (failure) {
        if (alive) {
          setError(
            failure.name ===
              "AbortError"
              ? "Connection timed out. Retrying…"
              : failure.message,
          );

          if (
            failure.status ===
              401 ||
            failure.status ===
              403
          ) {
            dataRef.current =
              null;

            setData(null);

            account.current =
              null;

            setPending(null);
            setSelection(null);
          }
        }
      } finally {
        loading = false;
      }
    }

    refresh.current =
      load;

    void load();

    const poll = setInterval(
      load,
      500,
    );

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

      mounted.current =
        false;

      clearInterval(poll);
      clearInterval(timer);
    };
  }, []);

  const match =
    data?.match;

  const fresh = Boolean(
    data &&
      !error &&
      performance.now() -
        received.current <
        2500,
  );

  const open = Boolean(
    fresh &&
      match?.phase ===
        "BETTING" &&
      now >=
        new Date(
          match.opensAt,
        ).getTime() &&
      now <
        new Date(
          match.closesAt,
        ).getTime(),
  );

  const validAmount =
    Number.isSafeInteger(
      Number(amount),
    ) &&
    Number(amount) >= 100 &&
    Number(amount) <= 25000;

  const selected =
    selection?.matchId ===
    match?.id;

  async function send(saved) {
    if (
      inFlight.current ||
      !saved ||
      account.current !==
        saved.customerId
    ) {
      return;
    }

    inFlight.current =
      true;

    setBusy(true);
    setBetError("");
    setMessage("");

    try {
      const result =
        await api(
          "/bets",
          saved.body,
        );

      store.remove(
        keyFor(
          saved.customerId,
        ),
      );

      window.dispatchEvent(
        new Event(
          "demo-balance-updated",
        ),
      );

      if (
        mounted.current &&
        account.current ===
          saved.customerId
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
        account.current ===
          saved.customerId
      ) {
        const definite = [
          400,
          401,
          403,
          404,
          409,
          422,
        ].includes(
          failure.status,
        );

        if (definite) {
          store.remove(
            keyFor(
              saved.customerId,
            ),
          );

          setPending(null);
        }

        setBetError(
          definite
            ? failure.message
            : "Connection interrupted. Use CHECK SAME BET to recover acceptance.",
        );
      }
    } finally {
      inFlight.current =
        false;

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

    if (
      Number(amount) >
      Number(data.balance)
    ) {
      setBetError(
        "Insufficient demo coins.",
      );

      return;
    }

    let requestKey;

    try {
      requestKey =
        newKey();
    } catch {
      setBetError(
        "A secure browser connection is required.",
      );

      return;
    }

    const saved = {
      customerId:
        data.customerId,

      body: {
        matchId:
          match.id,

        team:
          selection.team,

        direction:
          "BACK",

        amount:
          Number(amount),

        points: 98,

        quoteVersion: 1,

        windowId: "PRE",

        requestKey,
      },
    };

    if (
      !store.set(
        keyFor(
          data.customerId,
        ),
        saved,
      )
    ) {
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
      match.scores[0]
        .balls.length === 6 ||
      match.scores[0]
        .wickets === 2
    );

  const chase =
    match?.scores[1];

  return (
    <main className="cs-page">
      <style>{`
        .cs-page {
          --green: #08b7bc;
          --wine: #791b3e;

          min-height: 100vh;
          background: #151b20;
          color: #fff;
          font-family: Arial, sans-serif;
          padding-bottom: 24px;
        }

        .cs-page * {
          box-sizing: border-box;
        }

        .cs-page button,
        .cs-page input {
          font: inherit;
        }

        .cs-page button {
          cursor: pointer;
        }

        .cs-page button:disabled {
          cursor: default;
          opacity: .48;
        }

        .cs-page :focus-visible {
          outline: 3px solid #ffc96a;
          outline-offset: 2px;
        }

        .cs-wrap {
          max-width: 880px;
          margin: auto;
        }

        .cs-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 18px 14px;
          background: var(--green);
          color: white;
        }

        .cs-brand {
          font-size: clamp(14px, 3vw, 21px);
          font-weight: 900;
          text-align: left;
        }

        .cs-balance {
          font-size: 18px;
          font-weight: 800;
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
        }

        .cs-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 10px 12px;
          background: #283640;
        }

        .cs-toolbar h1 {
          font-size: 17px;
          margin: 0;
        }

        .cs-plain {
          border: 0;
          background: transparent;
          color: inherit;
          padding: 7px;
          font-weight: bold;
        }

        .cs-score {
          background:
            linear-gradient(
              110deg,
              #143b35,
              #182920
            );
          padding: 12px 14px;
        }

        .cs-team-score {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .cs-team-score strong {
          font-variant-numeric: tabular-nums;
        }

        .cs-balls {
          display: flex;
          gap: 5px;
          grid-column: 1 / -1;
          min-height: 24px;
        }

        .cs-ball {
          display: grid;
          place-items: center;
          width: 25px;
          height: 25px;
          border-radius: 50%;
          background: var(--green);
          font-size: 12px;
          font-weight: bold;
        }

        .cs-ball.w {
          background: var(--wine);
        }

        .cs-target {
          font-size: 12px;
          color: #ffde9e;
          margin: 4px 0;
        }

        .cs-bet-clock {
          padding: 9px 14px;
          background: var(--wine);
          font-weight: bold;
          text-align: center;
          font-variant-numeric: tabular-nums;
        }

        .cs-scene {
          position: relative;
          background: #100f12;
          overflow: hidden;
          padding-top: 0;
          border-top: 3px solid white;
          border-bottom: 3px solid white;
        }

        .cs-host {
          position: relative;
          aspect-ratio: 16 / 5.1;
          overflow: hidden;
          background: #141313;
        }

        .cs-host video {
          position: absolute;
          left: 0;
          top: 0;
          display: block;
          width: 100%;
          height: auto;
        }

        .cs-no-video {
          padding: 35px;
          text-align: center;
          font-size: 12px;
          color: #ccc;
        }

        .cs-ai {
          position: absolute;
          top: 8px;
          right: 8px;
          font-size: 8px;
          background: #0008;
          padding: 3px;
          color: #ddd;
        }

        .cs-table {
          position: relative;
          margin: -1px 7% 12px 12%;
          padding: 28px 12% 22px 8%;

          background:
            radial-gradient(
              ellipse at top,
              #8d254b,
              #48172a
            );

          border: 8px solid #29242a;
          border-top: 5px solid #4b4246;

          border-radius:
            12px 12px 42% 42% /
            12px 12px 16% 16%;

          box-shadow: 0 4px 12px #000;
          z-index: 2;
        }

        .cs-table-title {
          text-align: center;
          font-size: clamp(13px, 2.8vw, 25px);
          font-weight: bold;
          color: #dda453;
          margin-bottom: 12px;
        }

        .cs-slots {
          display: grid;
          gap: 10px;
        }

        .cs-card-row {
          display: grid;
          grid-template-columns:
            repeat(6, minmax(0, 1fr));
          gap: 7px;
        }

        .cs-slot {
          aspect-ratio: .69;
          border: 1px solid #d1a6b377;
          border-radius: 3px;
          position: relative;
          min-width: 0;
        }

        .cs-playing-card {
          position: absolute;
          inset: 0;
          background: #fffbee;
          color: #131313;
          border-radius: 3px;
          box-shadow: 0 2px 3px #0005;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;

          padding: 3px;
          font-size: clamp(10px, 2.5vw, 21px);
          line-height: 1;
        }

        .cs-playing-card b:first-child {
          align-self: flex-start;
        }

        .cs-playing-card b:last-child {
          align-self: flex-end;
          transform: rotate(180deg);
        }

        .cs-playing-card span {
          font-size: clamp(11px, 2.8vw, 27px);
        }

        .cs-wicket-card {
          color: var(--wine);
        }

        .cs-arriving {
          animation: csDeal .65s ease-out both;
          z-index: 8;
        }

        @keyframes csDeal {
          from {
            transform:
              translate(
                var(--from-x),
                var(--from-y)
              )
              rotate(-12deg);

            opacity: .5;
          }

          to {
            transform:
              translate(0, 0)
              rotate(0);

            opacity: 1;
          }
        }

        .cs-table-foot {
          display: block;
          text-align: center;
          color: #b27d8e;
          font-size: 8px;
          margin-top: 12px;
        }

        .cs-machine {
          position: absolute;
          z-index: 3;
          left: 1%;
          top: 48%;
          width: 11%;
          height: 22%;
          border: 2px solid #222;

          background:
            linear-gradient(
              100deg,
              #111,
              #333
            );

          transform: skewY(-3deg);
          box-shadow: 0 6px 5px #0008;
        }

        .cs-machine span {
          font-size: clamp(4px, 1vw, 8px);
          display: block;
          text-align: center;
          color: #aaa;
          margin-top: 12%;
        }

        .cs-machine-top {
          height: 20%;
          margin: 8%;
          background: #070707;
          border: 1px solid #555;
        }

        .cs-shoe {
          position: absolute;
          right: -1%;
          top: 9%;
          width: 15%;
          height: 26%;
          border: 2px solid #ffffff80;
          background: #ffffff15;
          transform: skewY(-12deg);
          box-shadow:
            inset 2px 2px 5px #fff3;
        }

        .cs-stack,
        .cs-transfer-stack {
          border: 1px solid #e7d9ce;

          background:
            repeating-linear-gradient(
              0deg,
              #f3eee8 0 2px,
              #a6948f 2px 3px
            );

          box-shadow: 0 2px 3px #0005;
        }

        .cs-stack {
          position: absolute;
          left: 12%;
          right: 12%;
          bottom: 15%;
          height: 45%;
        }

        .cs-transfer-stack {
          position: absolute;
          width: 11%;
          height: 11%;
          top: 14%;
          left: -10%;
          animation:
            csTransfer 4s ease-in-out forwards;
          z-index: 9;
        }

        @keyframes csTransfer {
          0%, 12% {
            left: -10%;
            opacity: 0;
          }

          20% {
            opacity: 1;
          }

          80%, 100% {
            left: 87%;
            opacity: 1;
          }
        }

        .cs-section {
          background: #43515b;
          padding: 10px 12px;
          font-weight: 800;
          font-size: 15px;
        }

        .cs-market-row {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr) 90px 90px;

          border-bottom: 1px solid #ccc;
          background: #fff;
          color: #27353b;
        }

        .cs-cell {
          padding: 13px 12px;
          font-size: 14px;
          display: flex;
          align-items: center;
        }

        .cs-back {
          background: var(--green);
          color: #fff;
        }

        .cs-lay {
          background: var(--wine);
          color: #fff;
        }

        .cs-price {
          border: 0;
          border-left: 1px solid #fff5;
          display: block;
          text-align: center;
          font-size: 23px;
          font-weight: 900;
          padding: 12px 3px;
        }

        .cs-price small {
          display: block;
          font-size: 9px;
          margin-top: 4px;
        }

        .cs-price[aria-pressed=true] {
          box-shadow:
            inset 0 0 0 3px #ffd36d;
        }

        .cs-lay.cs-cell {
          justify-content: center;
        }

        .cs-panel {
          padding: 14px;
          background: #fff;
          color: #253238;
          border-bottom: 1px solid #ddd;
        }

        .cs-panel p {
          font-size: 12px;
          line-height: 1.7;
        }

        .cs-stake {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin: 10px 0;
        }

        .cs-stake input {
          width: 130px;
          min-width: 0;
          border: 1px solid #a8b4b7;
          padding: 10px;
          color: #17272c;
          background: #fff;
          border-radius: 4px;
        }

        .cs-quick {
          padding: 7px 9px;
          border: 1px solid #ccd3d5;
          border-radius: 4px;
          background: #f4f8f8;
          color: #233;
        }

        .cs-confirm {
          padding: 12px 18px;
          background: var(--green);
          color: white;
          font-weight: 800;
          border: 0;
          border-radius: 5px;
        }

        .cs-alert {
          padding: 12px;
          background: #fff1d0;
          color: #6b3f13;
          font-size: 12px;
          line-height: 1.6;
        }

        .cs-result {
          text-align: center;
          background: var(--wine);
          padding: 13px;
          font-weight: 900;
          font-size: 18px;
        }

        .cs-record {
          padding: 12px 0;
          border-bottom: 1px solid #ddd;
          font-size: 12px;
          line-height: 1.8;
        }

        .cs-record small {
          display: block;
          color: #66747a;
        }

        .cs-footer {
          padding: 14px;
          font-size: 10px;
          color: #bbc4c6;
          line-height: 1.7;
        }

        .cs-proof {
          font-size: 10px;
          overflow-wrap: anywhere;
          white-space: pre-wrap;
        }

        @media(max-width: 430px) {
          .cs-market-row {
            grid-template-columns:
              minmax(0, 1fr) 76px 76px;
          }

          .cs-table {
            padding-top: 15px;
            border-width: 5px;
            padding-bottom: 12px;
          }

          .cs-table-title {
            margin-bottom: 8px;
          }

          .cs-slots {
            gap: 7px;
          }

          .cs-card-row {
            gap: 4px;
          }

          .cs-playing-card {
            padding: 2px;
          }

          .cs-header {
            padding: 14px 10px;
          }

          .cs-balance {
            font-size: 15px;
          }

          .cs-host {
            aspect-ratio: 16 / 5.4;
          }

          .cs-table-foot {
            font-size: 6px;
            margin-top: 7px;
          }
        }

        @media(
          prefers-reduced-motion: reduce
        ) {
          .cs-arriving,
          .cs-transfer-stack {
            animation: none;
          }

          .cs-transfer-stack {
            left: 87%;
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
            {data
              ? money(data.balance)
              : "…"}
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

          <h1>
            INSTANT SUPER OVER
          </h1>

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
          <div
            className="cs-alert"
            role="alert"
          >
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
              {match.teams.map(
                (team, index) => (
                  <div
                    className="cs-team-score"
                    key={team}
                  >
                    <span>
                      {team}
                    </span>

                    <strong>
                      {
                        match.scores[index]
                          .runs
                      }
                      /
                      {
                        match.scores[index]
                          .wickets
                      }{" "}

                      <small>
                        (
                        {
                          match.scores[index]
                            .overs
                        }
                        )
                      </small>
                    </strong>

                    <div className="cs-balls">
                      {match.scores[
                        index
                      ].balls.map(
                        (
                          value,
                          ballIndex,
                        ) => (
                          <span
                            key={ballIndex}
                            className={
                              "cs-ball " +
                              (
                                value === "W"
                                  ? "w"
                                  : ""
                              )
                            }
                          >
                            {value}
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                ),
              )}

              {firstDone &&
                match.phase !==
                  "RESULT" && (
                  <p className="cs-target">
                    AUSTRALIA needs{" "}
                    {Math.max(
                      0,
                      match.scores[0]
                        .runs +
                        1 -
                        chase.runs,
                    )}{" "}
                    runs from{" "}
                    {6 -
                      chase.balls.length}
                    {" "}balls · Target{" "}
                    {match.scores[0]
                      .runs + 1}
                  </p>
                )}
            </section>

            {open && (
              <div className="cs-bet-clock">
                BETTING ·{" "}
                {seconds(
                  new Date(
                    match.closesAt,
                  ).getTime() - now,
                )}
                s
              </div>
            )}

            <CardTable
              match={match}
              now={now}
            />

            {match.result && (
              <div
                className="cs-result"
                role="status"
              >
                {match.result.winner ===
                "TIE"
                  ? "TIE · STAKES REFUNDED"
                  : `${
                      match.teams[
                        match.result.winner
                      ]
                    } WON`}
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

            {match.teams.map(
              (team, index) => (
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
                      selection.team ===
                        index
                    }
                    onClick={() => {
                      setSelection({
                        matchId:
                          match.id,

                        team:
                          index,
                      });

                      setMessage("");
                      setBetError("");
                    }}
                  >
                    1.98

                    <small>
                      TOTAL RETURN
                    </small>
                  </button>

                  <div className="cs-cell cs-lay">
                    —
                  </div>
                </div>
              ),
            )}

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
                  disabled={
                    busy ||
                    Boolean(pending)
                  }
                  onChange={event =>
                    setAmount(
                      event.target.value,
                    )
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
                      busy ||
                      Boolean(pending)
                    }
                    onClick={() =>
                      setAmount(
                        String(value),
                      )
                    }
                  >
                    {value.toLocaleString(
                      "en-IN",
                    )}
                  </button>
                ))}
              </div>

              {selected && (
                <p>
                  {
                    match.teams[
                      selection.team
                    ]
                  }
                  {" "}· BACK 1.98 · Stake{" "}
                  {money(
                    Number(amount),
                  )}
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
                  Acceptance needs checking.
                  {" "}

                  <button
                    type="button"
                    className="cs-quick"
                    disabled={busy}
                    onClick={() =>
                      void send(pending)
                    }
                  >
                    CHECK SAME BET
                  </button>
                </p>
              )}

              {message && (
                <p role="status">
                  {message}
                </p>
              )}

              {betError && (
                <p
                  role="alert"
                  style={{
                    color: "#791b3e",
                  }}
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
                  new Date(
                    match.nextAt,
                  ).getTime() - now,
                )}
                s · {stamp(now)} IST
              </p>
            </section>

            <section className="cs-panel">
              <strong>
                MY BETS
              </strong>

              {!data.bets?.length ? (
                <p>
                  No bets yet.
                </p>
              ) : (
                data.bets
                  .slice(0, 20)
                  .map(bet => (
                    <div
                      className="cs-record"
                      key={bet.id}
                    >
                      <strong>
                        {bet.match_id}
                        {" "}·{" "}

                        {bet.match_id
                          .startsWith("C")
                          ? [
                              "INDIA",
                              "AUSTRALIA",
                            ][bet.team]
                          : `Team ${
                              Number(
                                bet.team,
                              ) + 1
                            }`}

                        {" "}·{" "}
                        {bet.direction}
                      </strong>

                      <div>
                        Stake{" "}
                        {money(
                          bet.amount,
                        )}
                        {" "}·{" "}
                        {bet.status}

                        {bet.status ===
                        "SETTLED"
                          ? (
                              " · Returned " +
                              money(
                                bet.payout,
                              )
                            )
                          : ""}
                      </div>

                      <small>
                        {stamp(
                          bet.created_at,
                        )}
                        {" "}IST
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
                Demo coins only. This is an
                AI host with a programmed card
                table. The server shuffles
                35 cards: five each of A, 2,
                3, 4, 6, 10 and K. Cards are
                drawn without replacement.
                A = 1 run, 10 = 0 runs,
                K = wicket. Other ranks give
                their printed runs.
              </p>

              <p>
                Each innings has at most six
                cards. Two wickets immediately
                end that innings, including two
                opening Kings for 0/2.
                Australia stops as soon as it
                passes India&apos;s score.
                Equal runs are a tie regardless
                of wickets, and stakes are
                returned.
              </p>

              <p>
                Each round lasts 41 seconds:
                4 seconds for setup, 15 seconds
                for betting, up to 12 seconds
                to reveal cards, then at least
                10 seconds for the result.
                Early finishes leave the result
                visible until the next round.
                Betting does not reopen between
                cards. Back odds are 1.98 total
                return, including stake;
                fractional demo units are
                rounded down. Lay is
                unavailable. Maximum stake is
                25,000 and maximum reserved
                per customer per round is
                100,000.
              </p>

              <p>
                Deck and seed are committed
                before betting. The deck and
                seed are disclosed only after
                the result for hash
                verification. A commitment
                verifies that a published deck
                stayed unchanged; it is not an
                independent audit of
                randomness. Old accepted bets
                settle using their original
                saved rules.
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
          Demo coins only · No real-money
          play · AI-generated host
          presentation
        </footer>
      </div>
    </main>
  );
}
