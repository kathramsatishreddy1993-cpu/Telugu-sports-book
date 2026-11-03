function FlightScene({
  round,
  phase,
  multiplier,
  growthRate = 0.085,
  now,
  start,
  verified,
  fresh,
}) {
  const WINE = "#791b3e";

  const running = phase === "RUNNING";
  const crashed = phase === "CRASHED";

  const [paint, setPaint] = useState({
    roundId: null,
    value: 1,
  });

  const motion = useRef({
    roundId: null,
    value: 1,
    target: 1,
    phase: "WAITING",
    previousTargetAt: null,
    from: 1,
    beganAt: 0,
    duration: 500,
  });

  /*
   * Animate only toward a value already confirmed
   * by the server. Never predict beyond that value.
   */
  useEffect(() => {
    const current = motion.current;

    const roundId =
      round?.id == null
        ? null
        : String(round.id);

    const target =
      Number.isFinite(Number(multiplier))
        ? Math.max(1, Number(multiplier))
        : 1;

    const timestamp = performance.now();

    const newRound =
      current.roundId !== roundId;

    const enteringFlight =
      current.phase !== "RUNNING" &&
      running;

    if (
      newRound ||
      phase === "WAITING" ||
      phase === "COUNTDOWN"
    ) {
      const value =
        running || crashed
          ? target
          : 1;

      motion.current = {
        roundId,
        value,
        target: value,
        phase,
        previousTargetAt: null,
        from: value,
        beganAt: timestamp,
        duration: 500,
      };

      setPaint({
        roundId,
        value,
      });

      return;
    }

    if (crashed) {
      /*
       * Crash is authoritative.
       * Stop at the exact server result immediately.
       */
      current.value = target;
      current.target = target;
      current.from = target;
      current.phase = phase;
      current.previousTargetAt = null;

      setPaint({
        roundId,
        value: target,
      });

      return;
    }

    current.phase = phase;

    if (!running) return;

    if (enteringFlight) {
      current.previousTargetAt = null;
    }

    if (
      Math.abs(target - current.target) <
      0.000001
    ) {
      return;
    }

    const interval =
      current.previousTargetAt === null
        ? 500
        : timestamp -
          current.previousTargetAt;

    current.previousTargetAt =
      timestamp;

    /*
     * A same-round running display never moves
     * backwards if an older snapshot arrives.
     */
    if (target < current.value) {
      return;
    }

    current.from = current.value;
    current.target = target;
    current.beganAt = timestamp;

    current.duration = Math.max(
      120,
      Math.min(1200, interval),
    );
  }, [
    round?.id,
    phase,
    multiplier,
    running,
    crashed,
  ]);

  useEffect(() => {
    let frame;
    let disposed = false;

    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    );

    const animate = timestamp => {
      if (disposed) return;

      const current = motion.current;

      if (
        current.phase === "RUNNING" &&
        current.value < current.target
      ) {
        const progress =
          reduced?.matches
            ? 1
            : Math.max(
                0,
                Math.min(
                  1,
                  (
                    timestamp -
                    current.beganAt
                  ) / current.duration,
                ),
              );

        /*
         * Geometric interpolation follows the
         * flight's exponential growth curve.
         */
        const from = Math.max(
          1,
          current.from,
        );

        const target = Math.max(
          from,
          current.target,
        );

        const next =
          from *
          Math.pow(
            target / from,
            progress,
          );

        current.value = Math.min(
          target,
          Math.max(
            current.value,
            next,
          ),
        );

        setPaint({
          roundId: current.roundId,
          value: current.value,
        });
      }

      frame =
        requestAnimationFrame(animate);
    };

    frame =
      requestAnimationFrame(animate);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
    };
  }, []);

  const currentRoundId =
    round?.id == null
      ? null
      : String(round.id);

  const confirmed =
    Number.isFinite(Number(multiplier))
      ? Math.max(1, Number(multiplier))
      : 1;

  const displayedMultiplier =
    crashed
      ? confirmed
      : running
        ? paint.roundId === currentRoundId
          ? Math.min(
              confirmed,
              Math.max(1, paint.value),
            )
          : confirmed
        : 1;

  /*
   * Floor during flight so rounding cannot display
   * a multiplier that has not been reached.
   */
  const multiplierText =
    crashed
      ? confirmed.toFixed(2)
      : (
          Math.floor(
            displayedMultiplier * 100 +
              0.0000001,
          ) / 100
        ).toFixed(2);

  const rate =
    Number.isFinite(Number(growthRate)) &&
    Number(growthRate) > 0
      ? Number(growthRate)
      : 0.085;

  const duration =
    running || crashed
      ? Math.log(
          Math.max(
            1,
            displayedMultiplier,
          ),
        ) / rate
      : 0;

  const progress =
    running || crashed
      ? 1 -
        Math.exp(-duration / 15)
      : 0;

  const x =
    52 + 440 * progress;

  const y =
    265 -
    165 *
      Math.pow(progress, 1.35) +
    (
      running
        ? Math.sin(duration * 2) *
          4 *
          progress
        : 0
    );

  const curve =
    `M 52 265 Q ${
      52 + (x - 52) * 0.55
    } 265 ${x} ${y}`;

  const flightColor =
    crashed
      ? "#f87171"
      : running
        ? WINE
        : "#67e8f9";

  return (
    <section className="relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-[#07111f]">
      <style>{`
        @keyframes tsb-grid {
          to {
            background-position: -36px 36px;
          }
        }

        @keyframes tsb-depart {
          to {
            transform:
              translate(200px,-120px);
            opacity: 0;
          }
        }

        @keyframes tsb-engine {
          to {
            opacity: .4;
            transform: scaleX(.6);
          }
        }

        .tsb-flight-grid {
          position: absolute;
          inset: 0;
          opacity: .15;
          background-image:
            linear-gradient(
              #38bdf8 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              #38bdf8 1px,
              transparent 1px
            );
          background-size: 36px 36px;
        }

        .tsb-flight-grid.fly {
          animation:
            tsb-grid 2s linear infinite;
        }

        .tsb-plane-depart {
          animation:
            tsb-depart .7s ease-in forwards;
        }

        .tsb-plane-engine {
          transform-box: fill-box;
          transform-origin: right;
          animation:
            tsb-engine .18s infinite alternate;
        }

        .tsb-running-multiplier {
          color: #791b3e;
          -webkit-text-stroke:
            .7px #e7b6c9;
          text-shadow:
            0 2px 2px #0009;
        }

        @media (
          prefers-reduced-motion: reduce
        ) {
          .tsb-flight-grid.fly,
          .tsb-plane-engine {
            animation: none;
          }
        }
      `}</style>

      <div
        className={
          `tsb-flight-grid ${
            running ? "fly" : ""
          }`
        }
      />

      <div className="absolute inset-x-0 top-5 z-10 px-3 text-center">
        <p className="text-[10px] font-bold tracking-widest text-slate-400">
          {round
            ? `ROUND #${round.id}`
            : "TSB FLIGHT"}
        </p>

        <p
          className={
            `mt-4 text-5xl font-black ` +
            `tabular-nums sm:text-7xl ${
              crashed
                ? "text-red-400"
                : running
                  ? "tsb-running-multiplier"
                  : "text-cyan-300"
            }`
          }
        >
          {phase === "WAITING"
            ? "WAITING"
            : phase === "COUNTDOWN"
              ? Math.max(
                  0,
                  Math.ceil(
                    (start - now) / 1000,
                  ),
                )
              : `${multiplierText}×`}
        </p>

        <p className="mt-2 text-[10px] font-black">
          {phase === "COUNTDOWN"
            ? "BETTING OPEN · RESULT LOCKED"
            : crashed
              ? "ROUND CRASHED"
              : running
                ? "FLIGHT RUNNING"
                : "WAITING FOR NEXT ROUND"}
        </p>
      </div>

      <svg
        viewBox="0 0 600 330"
        className="relative block w-full"
        role="img"
        aria-label={
          running
            ? "Plane flying upward"
            : "Flight display"
        }
      >
        <defs>
          <linearGradient
            id="tsb-flight-fill"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor={flightColor}
              stopOpacity=".4"
            />

            <stop
              offset="100%"
              stopColor={flightColor}
              stopOpacity="0"
            />
          </linearGradient>
        </defs>

        <path
          d="M 30 35 V 285 H 570"
          fill="none"
          stroke="#334155"
        />

        {(running || crashed) && (
          <>
            <path
              d={
                `${curve} ` +
                `L ${x} 285 L 52 285 Z`
              }
              fill="url(#tsb-flight-fill)"
            />

            <path
              d={curve}
              fill="none"
              stroke={flightColor}
              strokeWidth="4"
              strokeLinecap="round"
            />
          </>
        )}

        <g
          transform={
            `translate(${x} ${y})`
          }
        >
          <g
            key={
              `${round?.id}-${crashed}`
            }
            className={
              crashed
                ? "tsb-plane-depart"
                : ""
            }
          >
            <g
              transform={
                `rotate(${
                  -8 - progress * 25
                })`
              }
            >
              {running && (
                <path
                  className="tsb-plane-engine"
                  d="M -30 -3 L -65 0 L -30 5 Z"
                  fill="#fbbf24"
                />
              )}

              <path
                d="M -36 -5 L -14 -6 L -5 -26 L 5 -26 L 4 -6 L 25 -5 Q 42 -3 44 1 Q 39 6 25 7 L 3 7 L -14 25 L -24 25 L -14 6 L -34 6 L -45 15 L -51 15 L -44 2 L -51 -11 L -44 -11 Z"
                fill={flightColor}
                stroke={
                  running
                    ? "#f5dce6"
                    : "#ecfeff"
                }
                strokeWidth="1.3"
              />

              <path
                d="M 18 -4 L 28 -3 L 32 0 L 18 0 Z"
                fill={
                  running
                    ? "#fff"
                    : "#0c4a6e"
                }
              />
            </g>
          </g>
        </g>
      </svg>

      <div className="relative min-h-[30px] px-3 pb-3 text-center text-[10px] text-slate-300">
        {!fresh && round
          ? "Connection unavailable — actions paused; showing the last confirmed multiplier."
          : verified}
      </div>
    </section>
  );
}
