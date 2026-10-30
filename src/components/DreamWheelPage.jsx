import React, {
  useEffect,
  useRef,
  useState,
} from "react";

const CHIPS = [10, 20, 50, 100, 500];

const NUMBERS = [
  "1",
  "2",
  "5",
  "10",
  "20",
  "40",
];

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

const VIDEO =
  "/games/dream-wheel-host.mp4";

/*
 * Coordinates for the supplied, trimmed
 * 1280 × 720 video.
 */
const WHEEL_POSITION = {
  left: "24.45%",
  top: "10.9%",
  width: "32.8%",
  height: "58.3%",
};

const RELEASE_SECONDS = 1.65;
const VIDEO_SECONDS = 4.4;

const clamp = (value, min, max) =>
  Math.max(min, Math.min(max, value));

function money(value) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return "—";
  }

  return `₹${Number(value).toLocaleString(
    "en-IN",
    {
      maximumFractionDigits: 2,
    },
  )}`;
}

function readPending(key) {
  try {
    const value = JSON.parse(
      sessionStorage.getItem(key) ||
        "null",
    );

    return value?.game === "dream-wheel" &&
      typeof value.body?.requestKey ===
        "string"
      ? value.body
      : null;
  } catch {
    return null;
  }
}

function clearPending(key) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // The server request remains idempotent.
  }
}

async function api(path, body, signal) {
  const controller =
    new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    15000,
  );

  const abort = () =>
    controller.abort();

  signal?.addEventListener(
    "abort",
    abort,
  );

  try {
    const response = await fetch(
      "/api/dream-wheel" + path,
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
              body: JSON.stringify(body),
            }
          : {}),
      },
    );

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        "Invalid server response. If a bet was interrupted, retry the same request.",
      );
    }

    if (
      !response.ok ||
      data.success === false
    ) {
      throw Object.assign(
        new Error(
          data.error ||
            data.message ||
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

    signal?.removeEventListener(
      "abort",
      abort,
    );
  }
}

function WheelFace({
  segments,
  rotation,
}) {
  const width =
    360 / segments.length;

  const point = angle => {
    const radians =
      angle * Math.PI / 180;

    return [
      200 +
        191 * Math.cos(radians),
      200 +
        191 * Math.sin(radians),
    ].join(",");
  };

  return (
    <svg
      viewBox="0 0 400 400"
      className="dw-face"
      style={{
        ...WHEEL_POSITION,
        transform:
          `rotate(${rotation}deg)`,
      }}
      role="img"
      aria-label="Server-controlled Dream Wheel"
    >
      <circle
        cx="200"
        cy="200"
        r="198"
        fill="#182c39"
        stroke="#dfc47a"
        strokeWidth="4"
      />

      {segments.map(
        (value, index) => {
          const start =
            index * width - 90;

          const end =
            start + width;

          const middle =
            (
              start +
              width / 2
            ) * Math.PI / 180;

          const x =
            200 +
            157 * Math.cos(middle);

          const y =
            200 +
            157 * Math.sin(middle);

          return (
            <g key={index}>
              <path
                d={
                  `M200,200 ` +
                  `L${point(start)} ` +
                  `A191,191 0 ` +
                  `${width > 180 ? 1 : 0} ` +
                  `1 ${point(end)} Z`
                }
                fill={
                  COLORS[value] ||
                  "#d3ba76"
                }
                stroke="#294551"
                strokeWidth="1"
              />

              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="11"
                fontWeight="900"
                transform={
                  `rotate(` +
                  `${
                    index * width +
                    width / 2
                  },${x},${y})`
                }
              >
                {value}
              </text>
            </g>
          );
        },
      )}

      <circle
        cx="200"
        cy="200"
        r="117"
        fill="#152d46"
        stroke="#ead08d"
        strokeWidth="5"
      />

      <circle
        cx="200"
        cy="200"
        r="98"
        fill="#702a4a"
        stroke="#d9b973"
        strokeWidth="2"
      />

      <circle
        cx="200"
        cy="153"
        r="7"
        fill="#e7cb81"
      />

      <text
        x="200"
        y="193"
        textAnchor="middle"
        fill="#fff0bd"
        fontSize="27"
        fontWeight="900"
      >
        DREAM
      </text>

      <text
        x="200"
        y="226"
        textAnchor="middle"
        fill="#fff0bd"
        fontSize="25"
        fontWeight="900"
      >
        WHEEL
      </text>
    </svg>
  );
}

function VideoStudio({
  round,
  segments,
  now,
  sound,
}) {
  const video = useRef(null);
  const latest = useRef(null);
  const motion = useRef(null);
  const angle = useRef(0);
  const soundRef = useRef(sound);
  const audio = useRef(null);
  const sector = useRef(null);

  const [rotation, setRotation] =
    useState(0);

  const [ready, setReady] =
    useState(false);

  const [failure, setFailure] =
    useState("");

  const [blocked, setBlocked] =
    useState(false);

  latest.current = {
    round,
    segments,
    offset: now - Date.now(),
  };

  soundRef.current = sound;

  useEffect(() => {
    if (!sound) return;

    try {
      const AudioContext =
        window.AudioContext ||
        window.webkitAudioContext;

      if (
        AudioContext &&
        !audio.current
      ) {
        audio.current =
          new AudioContext();
      }

      audio.current
        ?.resume()
        .catch(() => {});
    } catch {
      // Audio is optional.
    }
  }, [sound]);

  useEffect(() => {
    let frame;
    let lastPaint = 0;
    let disposed = false;
    let playRequested = false;

    function playOnce(element) {
      if (
        playRequested ||
        !element.paused
      ) {
        return;
      }

      playRequested = true;

      element.play()
        .then(() => {
          if (!disposed) {
            setBlocked(false);
          }
        })
        .catch(() => {
          if (!disposed) {
            setBlocked(true);
          }
        })
        .finally(() => {
          playRequested = false;
        });
    }

    function tick(timestamp) {
      const current =
        latest.current;

      const spin =
        current.round?.activeSpin;

      const element =
        video.current;

      const time =
        Date.now() +
        current.offset;

      const index =
        Number(spin?.segment);

      const valid = Boolean(
        spin &&
        Number.isInteger(index) &&
        index >= 0 &&
        index <
          current.segments.length &&
        current.segments[index] ===
          spin.value,
      );

      if (valid) {
        const key =
          `${current.round.id}:` +
          (
            spin.key ??
            `${spin.startsAt}:${index}`
          );

        if (
          motion.current?.key !== key
        ) {
          const start =
            Date.parse(spin.startsAt);

          const stop =
            Date.parse(spin.stopsAt);

          const duration =
            stop - start;

          if (
            Number.isFinite(start) &&
            duration > 0
          ) {
            const desired =
              (
                360 -
                (
                  index + 0.5
                ) *
                  360 /
                  current.segments.length +
                360
              ) % 360;

            const currentAngle =
              (
                angle.current % 360 +
                360
              ) % 360;

            motion.current = {
              key,
              base: angle.current,

              end:
                angle.current +
                1800 +
                (
                  desired -
                  currentAngle +
                  360
                ) % 360,

              start,
              stop,

              release:
                start +
                Math.min(
                  RELEASE_SECONDS *
                    1000,
                  duration * 0.25,
                ),
            };

            if (element) {
              element.pause();

              try {
                element.currentTime = 0;
              } catch {
                // Metadata may still load.
              }
            }

            sector.current = null;
          }
        }

        const movement =
          motion.current;

        if (movement) {
          const progress = clamp(
            (
              time -
              movement.release
            ) /
            (
              movement.stop -
              movement.release
            ),
            0,
            1,
          );

          angle.current =
            movement.base +
            (
              movement.end -
              movement.base
            ) *
              (
                1 -
                Math.pow(
                  1 - progress,
                  3,
                )
              );

          const elapsed =
            (
              time -
              movement.start
            ) / 1000;

          const targetTime = clamp(
            elapsed,
            0,
            VIDEO_SECONDS - 0.08,
          );

          if (
            element &&
            element.readyState >= 2
          ) {
            if (document.hidden) {
              element.pause();
            } else {
              if (
                Math.abs(
                  element.currentTime -
                  targetTime,
                ) > 0.3
              ) {
                try {
                  element.currentTime =
                    targetTime;
                } catch {
                  // Retry after metadata loads.
                }
              }

              if (
                elapsed >= 0 &&
                elapsed <
                  VIDEO_SECONDS - 0.08
              ) {
                playOnce(element);
              } else {
                element.pause();
              }
            }
          }

          const nextSector =
            Math.floor(
              angle.current /
              (
                360 /
                current.segments.length
              ),
            );

          const context =
            audio.current;

          if (
            time >=
              movement.release &&
            time < movement.stop &&
            soundRef.current &&
            context?.state ===
              "running" &&
            !document.hidden &&
            sector.current !==
              nextSector
          ) {
            const oscillator =
              context.createOscillator();

            const gain =
              context.createGain();

            oscillator.frequency.value =
              1500;

            gain.gain.setValueAtTime(
              0.04,
              context.currentTime,
            );

            gain.gain
              .exponentialRampToValueAtTime(
                0.0001,
                context.currentTime +
                  0.02,
              );

            oscillator.connect(gain);
            gain.connect(
              context.destination,
            );

            oscillator.onended =
              () => {
                oscillator.disconnect();
                gain.disconnect();
              };

            oscillator.start();

            oscillator.stop(
              context.currentTime +
                0.025,
            );
          }

          sector.current =
            nextSector;
        }
      } else if (element) {
        element.pause();

        if (
          current.round?.phase ===
            "BETTING" ||
          current.round?.phase ===
            "WAITING"
        ) {
          if (
            element.currentTime > 0.1
          ) {
            try {
              element.currentTime = 0;
            } catch {
              // Wait for metadata.
            }
          }
        }
      }

      if (
        timestamp - lastPaint > 30
      ) {
        setRotation(
          angle.current,
        );

        lastPaint = timestamp;
      }

      frame =
        requestAnimationFrame(tick);
    }

    frame =
      requestAnimationFrame(tick);

    return () => {
      disposed = true;

      cancelAnimationFrame(frame);

      video.current?.pause();

      audio.current
        ?.close()
        .catch(() => {});

      audio.current = null;
    };
  }, []);

  return (
    <>
      <section
        className="dw-studio"
        aria-label="AI-generated video studio"
      >
        <video
          ref={video}
          src={VIDEO}
          muted
          playsInline
          preload="auto"
          onLoadedData={() =>
            setReady(true)
          }
          onError={() =>
            setFailure(
              "Upload dream-wheel-host.mp4 into public/games.",
            )
          }
        />

        {ready &&
          segments.length > 0 && (
            <>
              <WheelFace
                segments={segments}
                rotation={rotation}
              />

              <span
                className="dw-pointer"
                aria-hidden="true"
              >
                ▼
              </span>
            </>
          )}

        {!ready && (
          <div className="dw-video-message">
            {failure ||
              "Loading video studio…"}
          </div>
        )}

        {blocked && (
          <button
            type="button"
            className="dw-play"
            onClick={() => {
              video.current
                ?.play()
                .then(() =>
                  setBlocked(false),
                )
                .catch(() => {});
            }}
          >
            Tap to enable video
          </button>
        )}
      </section>

      <p className="dw-hint">
        AI-generated video with a
        server-controlled wheel ·
        Virtual demo
      </p>
    </>
  );
}

export default function DreamWheelPage({
  user,

  onBack = () =>
    window.location.assign("/"),

  onLogout,
}) {
  const customerId =
    user?.id ??
    user?.customerId ??
    user?.customer_id;

  if (!customerId) {
    return (
      <main className="dw-login-required">
        Customer login required.

        <button
          type="button"
          onClick={onBack}
        >
          Back
        </button>
      </main>
    );
  }

  return (
    <DreamGame
      key={String(customerId)}
      user={user}
      onBack={onBack}
      onLogout={onLogout}
      storageKey={
        `tsb_dream_pending_v1:` +
        customerId
      }
    />
  );
}

function DreamGame({
  user,
  onBack,
  onLogout,
  storageKey,
}) {
  const [rules, setRules] =
    useState(null);

  const [state, setState] =
    useState(null);

  const [now, setNow] =
    useState(Date.now());

  const [lastSync, setLastSync] =
    useState(0);

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
      readPending(storageKey),
    );

  const [busy, setBusy] =
    useState(false);

  const [sound, setSound] =
    useState(false);

  const [error, setError] =
    useState("");

  const [notice, setNotice] =
    useState("");

  const [
    verification,
    setVerification,
  ] = useState("");

  const active = useRef(false);
  const posting = useRef(false);
  const polling = useRef(false);
  const revision = useRef(0);
  const offset = useRef(0);
  const roundId = useRef(null);
  const pendingRef = useRef(pending);
  const refreshRef = useRef(null);
  const eventRound = useRef(null);

  const round = state?.round;

  const stale =
    !lastSync ||
    Date.now() - lastSync > 5000;

  const endTime = Date.parse(
    round?.phase === "WAITING"
      ? round.opensAt
      : round?.phase === "BETTING"
        ? round.closesAt
        : round?.phase ===
            "SPINNING"
          ? round.spinEndsAt
          : round?.endsAt,
  );

  const seconds = Math.max(
    0,
    Math.ceil(
      (endTime - now) / 1000,
    ) || 0,
  );

  const open = Boolean(
    rules &&
    round?.phase === "BETTING" &&
    now <
      Date.parse(round.closesAt) &&
    !stale,
  );

  const locked =
    !open ||
    busy ||
    Boolean(pending);

  const bets =
    state?.bets || [];

  const total = Object.values(
    draft,
  ).reduce(
    (sum, value) =>
      sum + Number(value),
    0,
  );

  const committed = bets.reduce(
    (sum, bet) =>
      sum + Number(bet.stake),
    0,
  );

  const credited = bets.reduce(
    (sum, bet) =>
      sum +
      Number(bet.payout || 0),
    0,
  );

  const segments =
    rules?.segments || [];

  const shownSpin =
    round?.revealedSpins?.at(-1);

  const result =
    [
      "RESULT",
      "FINISHED",
    ].includes(round?.phase)
      ? round.result
      : null;

  const finalLanded = Boolean(
    result &&
    shownSpin?.value ===
      result.winner,
  );

  async function refresh() {
    if (
      polling.current ||
      posting.current
    ) {
      return;
    }

    polling.current = true;

    const version =
      revision.current;

    const started = Date.now();

    try {
      const data =
        await api("/state");

      if (
        !active.current ||
        version !==
          revision.current
      ) {
        return;
      }

      const finished = Date.now();

      const serverTime =
        Date.parse(data.serverTime);

      if (
        !Number.isFinite(
          serverTime,
        )
      ) {
        throw new Error(
          "Invalid server time.",
        );
      }

      offset.current =
        serverTime -
        (
          started + finished
        ) / 2;

      setNow(
        finished +
        offset.current,
      );

      setLastSync(finished);

      if (
        roundId.current !== null &&
        String(roundId.current) !==
          String(data.round?.id)
      ) {
        setDraft({});
        setVerification("");

        setNotice(
          "New round. Choose your bets again.",
        );
      }

      roundId.current =
        data.round?.id ?? null;

      setState(data);

      if (
        data.round?.phase ===
          "RESULT" &&
        eventRound.current !==
          String(data.round.id)
      ) {
        eventRound.current =
          String(data.round.id);

        window.dispatchEvent(
          new Event(
            "demo-balance-updated",
          ),
        );
      }
    } catch (requestError) {
      if (
        active.current &&
        version ===
          revision.current
      ) {
        setError(
          requestError.message ||
          "Unable to update round.",
        );
      }
    } finally {
      polling.current = false;
    }
  }

  refreshRef.current = refresh;

  useEffect(() => {
    active.current = true;

    const controller =
      new AbortController();

    api(
      "/rules",
      null,
      controller.signal,
    )
      .then(data => {
        if (active.current) {
          setRules(data);
        }
      })
      .catch(requestError => {
        if (active.current) {
          setError(
            requestError.message,
          );
        }
      });

    void refreshRef.current();

    const pollTimer = setInterval(
      () =>
        void refreshRef.current(),
      1000,
    );

    const clockTimer = setInterval(
      () => {
        setNow(
          Date.now() +
          offset.current,
        );
      },
      100,
    );

    const focused = () =>
      void refreshRef.current();

    window.addEventListener(
      "focus",
      focused,
    );

    return () => {
      active.current = false;

      controller.abort();

      clearInterval(pollTimer);
      clearInterval(clockTimer);

      window.removeEventListener(
        "focus",
        focused,
      );
    };
  }, []);

  async function loadHistory() {
    try {
      const data =
        await api("/history");

      if (active.current) {
        setHistory(
          data.bets || [],
        );
      }
    } catch (requestError) {
      if (active.current) {
        setError(
          requestError.message,
        );
      }
    }
  }

  function add(area) {
    if (locked) return;

    setDraft(current => {
      const nextTotal =
        Object.values(current)
          .reduce(
            (sum, value) =>
              sum + Number(value),
            0,
          ) + chip;

      if (
        nextTotal +
          committed >
        25000
      ) {
        setError(
          "Maximum total stake per round is ₹25,000.",
        );

        return current;
      }

      return {
        ...current,

        [area]:
          (
            current[area] || 0
          ) + chip,
      };
    });
  }

  async function submit() {
    if (posting.current) return;

    let body =
      pendingRef.current;

    if (!body) {
      if (
        !open ||
        total < 10
      ) {
        return;
      }

      if (
        total + committed >
        25000
      ) {
        setError(
          "Maximum total stake per round is ₹25,000.",
        );

        return;
      }

      if (
        state?.balance == null ||
        !Number.isFinite(
          Number(state.balance),
        )
      ) {
        setError(
          "Wallet balance unavailable.",
        );

        return;
      }

      if (
        total >
        Number(state.balance)
      ) {
        setError("LOW BALANCE");
        return;
      }

      try {
        const bytes =
          crypto.getRandomValues(
            new Uint8Array(20),
          );

        body = {
          requestKey:
            Array.from(
              bytes,
              value =>
                value
                  .toString(16)
                  .padStart(
                    2,
                    "0",
                  ),
            ).join(""),

          roundId:
            String(round.id),

          bets:
            Object.entries(draft)
              .map(
                ([
                  area,
                  amount,
                ]) => ({
                  area,
                  amount,
                }),
              ),
        };

        sessionStorage.setItem(
          storageKey,

          JSON.stringify({
            game: "dream-wheel",
            body,
          }),
        );
      } catch {
        setError(
          "Secure browser storage is required to recover interrupted bets.",
        );

        return;
      }

      pendingRef.current =
        body;

      setPending(body);
    }

    posting.current = true;
    revision.current += 1;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const data =
        await api("/bets", body);

      clearPending(storageKey);

      pendingRef.current =
        null;

      if (!active.current) return;

      setPending(null);
      setDraft({});

      setState(current => {
        if (!current) {
          return current;
        }

        const currentBets =
          current.bets || [];

        const sameRound =
          String(
            current.round?.id,
          ) ===
          String(
            data.bet.roundId,
          );

        const exists =
          currentBets.some(
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
                  ...currentBets,
                  data.bet,
                ]
              : currentBets,
        };
      });

      setNotice(
        data.replayed
          ? "Previous bet recovered. No second debit."
          : "Bet accepted.",
      );

      window.dispatchEvent(
        new Event(
          "demo-balance-updated",
        ),
      );
    } catch (requestError) {
      if (!active.current) return;

      if (
        [
          400,
          401,
          403,
          404,
          409,
          422,
        ].includes(
          requestError.status,
        )
      ) {
        clearPending(storageKey);

        pendingRef.current =
          null;

        setPending(null);
      }

      setError(
        requestError.message ||
        "Connection interrupted. Retry the same bet.",
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

    const proofRoundId =
      String(round.id);

    try {
      const plan =
        round.proof.plan.map(
          step => ({
            value: step.value,

            segment:
              Number(
                step.segment,
              ),
          }),
        );

      const bytes =
        new TextEncoder().encode(
          JSON.stringify(plan) +
          ":" +
          round.proof.salt,
        );

      const hash =
        await crypto.subtle.digest(
          "SHA-256",
          bytes,
        );

      const hex =
        Array.from(
          new Uint8Array(hash),

          value =>
            value
              .toString(16)
              .padStart(2, "0"),
        ).join("");

      if (
        active.current &&
        String(roundId.current) ===
          proofRoundId
      ) {
        setVerification(
          hex ===
            round.proof.commitment
            ? "Locked plan hash matches."
            : "Plan hash does not match.",
        );
      }
    } catch {
      if (
        active.current &&
        String(roundId.current) ===
          proofRoundId
      ) {
        setVerification(
          "Verification requires HTTPS.",
        );
      }
    }
  }

  async function retryRefresh() {
    setError("");

    void refreshRef.current();

    if (!rules) {
      try {
        const data =
          await api("/rules");

        if (active.current) {
          setRules(data);
        }
      } catch (requestError) {
        if (active.current) {
          setError(
            requestError.message,
          );
        }
      }
    }
  }

  const displayPhase =
    !round
      ? "WAITING FOR A CONTROLLER ROUND"
      : stale
        ? "RECONNECTING…"
        : round.phase ===
            "BETTING"
          ? open
            ? "BETTING OPEN"
            : "BETTING CLOSED"
          : round.phase ===
              "SPINNING"
            ? now >=
              Date.parse(
                round.activeSpin
                  ?.stopsAt,
              )
              ? "WAITING FOR RESULT"
              : "SPINNING · BETTING CLOSED"
            : round.phase ===
                "WAITING"
              ? "BETTING STARTS SOON"
              : result
                ? "ROUND RESULT"
                : "WAITING FOR NEXT ROUND";

  function renderArea(area) {
    const accepted =
      bets.reduce(
        (sum, bet) =>
          sum +
          (
            bet.bets || []
          )
            .filter(
              item =>
                item.area === area,
            )
            .reduce(
              (subtotal, item) =>
                subtotal +
                Number(item.amount),
              0,
            ),
        0,
      );

    const win =
      finalLanded &&
      result.winner === area;

    return (
      <button
        key={area}
        type="button"
        disabled={locked}
        className={
          `dw-area ` +
          (
            win
              ? "dw-win"
              : ""
          )
        }
        style={{
          "--color":
            COLORS[area],
        }}
        onClick={() =>
          add(area)
        }
      >
        <strong>
          {area}
        </strong>

        <small>
          PROFIT 1:{area}
        </small>

        {draft[area] > 0 && (
          <span>
            Draft{" "}
            {money(draft[area])}
          </span>
        )}

        {accepted > 0 && (
          <span>
            Placed{" "}
            {money(accepted)}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="dw-page">
      <style>{CSS}</style>

      <header className="dw-header">
        <button
          type="button"
          onClick={onBack}
          className="dw-btn"
        >
          ← HOME
        </button>

        <h1>
          DREAM WHEEL
        </h1>

        <div
          className="dw-wallet"
          aria-live="polite"
        >
          <strong>
            {money(state?.balance)}
          </strong>

          <small>
            {user?.name ||
              user?.loginId ||
              "Customer"}
          </small>

          {stale && state && (
            <small>
              Last received balance
            </small>
          )}
        </div>
      </header>

      <main className="dw-wrap">
        <nav
          className="dw-row"
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
              className="dw-btn"
              aria-pressed={
                tab === value
              }
              onClick={() => {
                setTab(value);

                if (
                  value ===
                  "history"
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
            className="dw-btn"
            aria-pressed={sound}
            onClick={() =>
              setSound(
                value => !value,
              )
            }
          >
            SOUND{" "}
            {sound ? "ON" : "OFF"}
          </button>
        </nav>

        {error && (
          <div
            className="dw-alert"
            role="alert"
          >
            {error}

            <button
              type="button"
              className="dw-btn"
              onClick={() =>
                void retryRefresh()
              }
            >
              Refresh
            </button>
          </div>
        )}

        {notice && (
          <p role="status">
            {notice}
          </p>
        )}

        {pending && (
          <div className="dw-alert">
            Interrupted bet.
            Retry uses the original
            request and round.

            <button
              type="button"
              disabled={busy}
              onClick={submit}
              className="dw-btn"
            >
              RETRY SAME BET
            </button>
          </div>
        )}

        <div
          hidden={
            tab !== "game"
          }
        >
          <VideoStudio
            round={round}
            segments={segments}
            now={now}
            sound={sound}
          />

          <div className="dw-status">
            <span>
              {displayPhase}

              <br />

              Round #
              {round?.id || "—"}
            </span>

            <strong>
              {[
                "WAITING",
                "BETTING",
                "SPINNING",
              ].includes(
                round?.phase,
              )
                ? seconds
                : "—"}
            </strong>
          </div>

          <div
            className="dw-landing"
            role="status"
          >
            {result && shownSpin
              ? `LANDED ${shownSpin.value}`
              : round?.phase ===
                  "SPINNING"
                ? now >=
                  Date.parse(
                    round.activeSpin
                      ?.stopsAt,
                  )
                  ? "WAITING FOR RESULT…"
                  : "WHEEL SPINNING…"
                : ""}
          </div>

          {round?.bonusMultiplier >
            1 && (
            <p>
              Bonus multiplier{" "}
              {round.bonusMultiplier}x
            </p>
          )}

          <div
            className="dw-grid"
            aria-label="Betting areas"
          >
            {NUMBERS.map(
              renderArea,
            )}
          </div>

          <section className="dw-card">
            <p>
              Choose a chip, select
              numbers, then confirm.
            </p>

            <div className="dw-row">
              {CHIPS.map(value => (
                <button
                  key={value}
                  type="button"
                  disabled={locked}
                  aria-pressed={
                    chip === value
                  }
                  className="dw-chip"
                  onClick={() =>
                    setChip(value)
                  }
                >
                  {money(value)}
                </button>
              ))}

              <button
                type="button"
                className="dw-btn"
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

            <p>
              Draft{" "}
              <strong>
                {money(total)}
              </strong>

              {" · "}

              Placed this round{" "}
              <strong>
                {money(committed)}
              </strong>
            </p>

            <p className="dw-hint">
              Maximum total stake
              ₹25,000 per round.
            </p>

            <button
              type="button"
              className="dw-submit"
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

            <p className="dw-hint">
              Virtual demo balance
              only. ₹ is a display
              symbol. No new bets
              during spinning. The
              controller locks the
              plan before betting
              opens.
            </p>
          </section>

          {finalLanded && (
            <section
              className="dw-card"
              role="status"
            >
              <h2>
                Winner{" "}
                {result.winner}

                {" · "}

                Bonus{" "}
                {result.bonusMultiplier}x
              </h2>

              <p>
                Profit odds{" "}
                1:{result.profitOdds}
              </p>

              <p>
                Your stake{" "}
                {money(committed)}

                {" · "}

                Total return{" "}
                {money(credited)}
              </p>

              <p>
                Net{" "}
                {credited -
                  committed >
                0
                  ? "+"
                  : ""}

                {money(
                  credited -
                  committed,
                )}
              </p>
            </section>
          )}

          {round?.commitment && (
            <details className="dw-proof">
              <summary>
                Locked plan check
              </summary>

              <p>
                {round.commitment}
              </p>

              {round.proof ? (
                <>
                  <button
                    type="button"
                    className="dw-btn"
                    onClick={() =>
                      void verifyPlan()
                    }
                  >
                    VERIFY LOCKED PLAN
                  </button>

                  <p role="status">
                    {verification}
                  </p>

                  <p>
                    Plan:{" "}
                    {round.proof.plan
                      .map(
                        step =>
                          step.value,
                      )
                      .join(" → ")}
                  </p>

                  <p>
                    Salt:{" "}
                    {round.proof.salt}
                  </p>
                </>
              ) : (
                <p>
                  Plan and salt are
                  revealed after the
                  result.
                </p>
              )}
            </details>
          )}

          <p className="dw-hint">
            Last results · newest
            first
          </p>

          <div className="dw-row">
            {(
              state?.recentResults ||
              []
            ).map(item => (
              <span key={item.id}>
                #{item.id}

                {" · "}

                {item.result.winner}

                {" · "}

                Bonus{" "}
                {
                  item.result
                    .bonusMultiplier
                }x
              </span>
            ))}
          </div>
        </div>

        {tab === "rules" && (
          <section className="dw-card">
            <h2>
              Demo rules
            </h2>

            <p>
              The studio uses
              prerecorded AI-generated
              footage. The wheel
              overlay follows the
              server’s controller-planned
              result. It is not live
              video.
            </p>

            <p>
              Betting lasts 30
              seconds. During the
              lock, the host makes one
              push and releases. The
              wheel slows to the
              server-selected segment.
              Bonus factors multiply
              profit.
            </p>

            <p>
              Minimum ₹10 per selected
              number. Maximum ₹25,000
              per customer per round.
              A winning bet returns
              the stake plus profit.
              Losing bets return zero.
            </p>

            <p>
              Example: ₹10 on 5 with
              bonuses 2x and 7x returns
              ₹10 + (₹10 × 5 × 2 × 7)
              = ₹710 virtual balance.
            </p>

            <table>
              <thead>
                <tr>
                  <th>
                    Number
                  </th>

                  <th>
                    Profit odds
                  </th>
                </tr>
              </thead>

              <tbody>
                {NUMBERS.map(
                  value => (
                    <tr key={value}>
                      <td>
                        {value}
                      </td>

                      <td>
                        1:{value}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </section>
        )}

        {tab === "history" && (
          <section className="dw-card">
            <h2>
              Your settled bets
            </h2>

            <button
              type="button"
              className="dw-btn"
              onClick={() =>
                void loadHistory()
              }
            >
              Refresh history
            </button>

            <div className="dw-overflow">
              <table>
                <thead>
                  <tr>
                    <th>
                      Round / IST
                    </th>

                    <th>
                      Bets / Result
                    </th>

                    <th>
                      Stake
                    </th>

                    <th>
                      Return
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {history.map(
                    bet => (
                      <tr key={bet.id}>
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
                          {(
                            bet.bets ||
                            []
                          )
                            .map(
                              item =>
                                `${
                                  item.area
                                }: ${
                                  money(
                                    item.amount,
                                  )
                                }`,
                            )
                            .join(", ")}

                          <br />

                          Winner{" "}
                          {bet.result
                            ?.winner ??
                            "—"}

                          {" · "}

                          Bonus{" "}
                          {bet.result
                            ?.bonusMultiplier ??
                            1}x
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

            {!history.length && (
              <p>
                No settled bets
                available.
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

const CSS = `
  .dw-page {
    min-height: 100vh;
    background: #120f20;
    color: #f7f1e4;
    font: 14px Arial, sans-serif;
    padding-bottom: 24px;
  }

  .dw-page * {
    box-sizing: border-box;
  }

  .dw-page button {
    font: inherit;
    cursor: pointer;
  }

  .dw-page button:disabled {
    opacity: .45;
    cursor: default;
  }

  .dw-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 15px;
    background: #211427;
    flex-wrap: wrap;
  }

  .dw-header h1 {
    font-size: 18px;
    color: #f0d48b;
  }

  .dw-wallet {
    margin-left: auto;
    text-align: right;
    background: none;
    border: 0;
    padding: 0;
  }

  .dw-wallet strong {
    font-size: 25px;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .dw-wallet small {
    display: block;
    font-size: 10px;
    margin-top: 5px;
    color: #ddd;
  }

  .dw-wrap {
    max-width: 1100px;
    margin: auto;
    padding: 12px;
  }

  .dw-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin: 14px 0;
  }

  .dw-btn {
    padding: 10px 12px;
    background: #ffffff10;
    border: 1px solid #ffffff30;
    border-radius: 8px;
    color: inherit;
  }

  .dw-btn[aria-pressed=true] {
    background: #791b3e;
  }

  .dw-studio {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    background: #decdb9;
    border: 1px solid #b99755;
    border-radius: 12px;
  }

  .dw-studio video {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .dw-face {
    position: absolute;
    transform-origin: center;
    filter: drop-shadow(
      0 2px 1px #0003
    );
    pointer-events: none;
  }

  .dw-pointer {
    position: absolute;
    left: 40.1%;
    top: 10%;
    font-size: clamp(
      12px,
      3vw,
      29px
    );
    line-height: 1;
    color: #e4ca86;
    text-shadow:
      0 1px 2px #473222;
    pointer-events: none;
  }

  .dw-video-message {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    color: #342b24;
    text-align: center;
    padding: 20px;
  }

  .dw-play {
    position: absolute;
    bottom: 5%;
    right: 3%;
    background: #791b3e;
    color: white;
    padding: 10px;
    border: 0;
    border-radius: 8px;
  }

  .dw-hint {
    color: #d5c9de;
    font-size: 12px;
    line-height: 1.7;
  }

  .dw-status {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 0;
    line-height: 1.7;
    color: #f0d48b;
  }

  .dw-status > strong {
    font-size: 26px;
  }

  .dw-landing {
    text-align: center;
    font-size: 22px;
    color: #ffe7a0;
    min-height: 35px;
  }

  .dw-grid {
    display: grid;
    grid-template-columns:
      repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .dw-area {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
    justify-content: center;
    min-height: 115px;
    border:
      2px solid var(--color);
    background: #202033;
    color: white;
    border-radius: 10px;
    padding: 10px;
  }

  .dw-area strong {
    font-size: 30px;
    color: var(--color);
  }

  .dw-area small,
  .dw-area span {
    font-size: 11px;
  }

  .dw-area.dw-win {
    box-shadow:
      0 0 15px #ffe2a650;
    border-color: #ffe6a0;
  }

  .dw-card {
    padding: 14px;
    background: #ffffff06;
    border:
      1px solid #ffffff25;
    border-radius: 12px;
    margin: 14px 0;
    line-height: 1.7;
  }

  .dw-chip {
    padding: 10px 5px;
    min-width: 46px;
    background: transparent;
    border: 0;
    color: white;
    border-bottom:
      2px solid transparent;
  }

  .dw-chip[aria-pressed=true] {
    color: #08b7bc;
    border-bottom-color:
      #08b7bc;
  }

  .dw-submit {
    width: 100%;
    background: #08b7bc;
    color: #082329;
    font-weight: bold !important;
    border: 0;
    border-radius: 8px;
    padding: 15px;
  }

  .dw-alert {
    padding: 12px;
    background: #791b3e;
    color: white;
    line-height: 1.7;
    border-radius: 8px;
    margin: 12px 0;
  }

  .dw-alert button {
    margin: 6px;
  }

  .dw-proof {
    overflow-wrap: anywhere;
    font-size: 11px;
    line-height: 1.7;
    margin-top: 15px;
  }

  .dw-overflow {
    overflow: auto;
  }

  .dw-page table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }

  .dw-page th,
  .dw-page td {
    padding: 10px 5px;
    border-bottom:
      1px solid #ffffff20;
    text-align: left;
  }

  .dw-page :focus-visible {
    outline:
      3px solid #08b7bc;
    outline-offset: 3px;
  }

  .dw-page [hidden] {
    display: none !important;
  }

  .dw-login-required {
    min-height: 100vh;
    background: #120f20;
    color: white;
    padding: 24px;
  }

  .dw-login-required button {
    margin-left: 12px;
  }

  @media (max-width: 420px) {
    .dw-wrap {
      padding: 8px;
    }

    .dw-header {
      padding: 10px;
      gap: 8px;
    }

    .dw-header h1 {
      font-size: 15px;
    }

    .dw-wallet strong {
      font-size: 21px;
    }

    .dw-grid {
      grid-template-columns:
        repeat(
          2,
          minmax(0, 1fr)
        );
    }

    .dw-area {
      min-height: 100px;
    }
  }
`;
