import React, {
  useEffect,
  useRef,
  useState,
} from "react";

export function rouletteMotion(seconds) {
  const p = Math.max(
    0,
    Math.min(1, seconds / 15),
  );

  return {
    p,
    travel: 629 * (1 - Math.pow(1 - p, 3)),
  };
}

class SoundEngine {
  constructor(Context) {
    this.ctx = new Context();
    this.nodes = new Set();

    this.bus = this.ctx.createGain();

    this.compressor =
      this.ctx.createDynamicsCompressor();

    this.compressor.threshold.value = -16;
    this.compressor.knee.value = 14;
    this.compressor.ratio.value = 8;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.16;

    this.volume = this.ctx.createGain();
    this.volume.gain.value = 0.7;

    this.ceiling = this.ctx.createWaveShaper();

    const curve = new Float32Array(4097);

    for (let i = 0; i < curve.length; i += 1) {
      const x =
        (i / (curve.length - 1)) * 2 - 1;

      curve[i] = 0.92 * Math.tanh(x * 1.4);
    }

    this.ceiling.curve = curve;
    this.ceiling.oversample = "2x";

    this.bus.connect(this.compressor);
    this.compressor.connect(this.volume);
    this.volume.connect(this.ceiling);
    this.ceiling.connect(this.ctx.destination);

    this.noiseBuffer = this.ctx.createBuffer(
      1,
      this.ctx.sampleRate * 2,
      this.ctx.sampleRate,
    );

    const noise =
      this.noiseBuffer.getChannelData(0);

    for (let i = 0; i < noise.length; i += 1) {
      noise[i] = Math.random() * 2 - 1;
    }
  }

  setVolume(value) {
    this.volume.gain.setTargetAtTime(
      Math.max(0, Math.min(1, value)),
      this.ctx.currentTime,
      0.025,
    );
  }

  track(source, nodes) {
    const record = {
      source,
      nodes,
    };

    this.nodes.add(record);

    source.onended = () => {
      nodes.forEach(node => {
        try {
          node.disconnect();
        } catch {
          // Already disconnected.
        }
      });

      this.nodes.delete(record);
    };
  }

  tone(
    frequency,
    duration,
    level = 0.2,
    end = frequency,
    delay = 0,
    type = "sine",
  ) {
    if (this.ctx.state !== "running") return;

    const t = this.ctx.currentTime + delay;

    const source =
      this.ctx.createOscillator();

    const gain = this.ctx.createGain();

    source.type = type;

    source.frequency.setValueAtTime(
      Math.max(20, frequency),
      t,
    );

    source.frequency.exponentialRampToValueAtTime(
      Math.max(20, end),
      t + duration,
    );

    gain.gain.setValueAtTime(0.0001, t);

    gain.gain.linearRampToValueAtTime(
      level,
      t + Math.min(0.012, duration / 5),
    );

    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      t + duration,
    );

    source.connect(gain);
    gain.connect(this.bus);

    this.track(source, [source, gain]);

    source.start(t);
    source.stop(t + duration + 0.02);
  }

  noise(
    duration,
    level,
    frequency,
    type = "bandpass",
    delay = 0,
  ) {
    if (this.ctx.state !== "running") return;

    const t = this.ctx.currentTime + delay;

    const source =
      this.ctx.createBufferSource();

    source.buffer = this.noiseBuffer;
    source.loop = true;

    const filter =
      this.ctx.createBiquadFilter();

    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = 0.8;

    const gain = this.ctx.createGain();

    gain.gain.setValueAtTime(0.0001, t);

    gain.gain.linearRampToValueAtTime(
      level,
      t + Math.min(0.02, duration / 5),
    );

    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      t + duration,
    );

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.bus);

    this.track(source, [
      source,
      filter,
      gain,
    ]);

    source.start(t);
    source.stop(t + duration + 0.03);
  }

  cue(name) {
    if (name === "select") {
      this.tone(730, 0.09, 0.13, 450);
      this.noise(0.05, 0.13, 1700);
    } else if (name === "confirm") {
      this.tone(130, 0.3, 0.35, 58);
      this.tone(
        440,
        0.25,
        0.17,
        660,
        0.08,
      );
    } else if (name === "reveal") {
      this.noise(0.7, 0.28, 1300);
      this.tone(120, 1.1, 0.48, 40);

      this.tone(
        290,
        0.65,
        0.13,
        76,
        0.02,
        "triangle",
      );
    } else if (
      name === "win" ||
      name === "collect"
    ) {
      [
        261.63,
        329.63,
        392,
        523.25,
      ].forEach((frequency, index) => {
        this.tone(
          frequency,
          0.8,
          0.14,
          frequency,
          index * 0.11,
          "triangle",
        );
      });

      this.tone(90, 0.9, 0.4, 42);
    } else if (name === "loss") {
      this.tone(
        180,
        0.7,
        0.24,
        55,
        0,
        "triangle",
      );

      this.noise(0.4, 0.15, 650);
    } else if (name === "offer") {
      [0, 0.26, 0.52].forEach(delay => {
        this.tone(
          740,
          0.18,
          0.16,
          740,
          delay,
          "triangle",
        );

        this.tone(
          920,
          0.18,
          0.09,
          920,
          delay,
        );
      });
    } else if (name === "landing") {
      this.noise(0.065, 0.48, 2100);

      this.tone(
        1350,
        0.08,
        0.19,
        510,
        0,
        "triangle",
      );

      this.tone(
        210,
        0.15,
        0.23,
        90,
        0.015,
      );

      this.noise(
        0.035,
        0.19,
        2300,
        "bandpass",
        0.075,
      );
    }
  }

  stop() {
    this.nodes.forEach(
      ({ source, nodes }) => {
        try {
          source.stop();
        } catch {
          // Already stopped.
        }

        nodes.forEach(node => {
          try {
            node.disconnect();
          } catch {
            // Already disconnected.
          }
        });
      },
    );

    this.nodes.clear();
  }

  close() {
    this.stop();

    return this.ctx.close().catch(() => {});
  }
}

export function useGameSound() {
  const [enabled, setEnabled] =
    useState(false);

  const [volume, setVolume] =
    useState(70);

  const [visible, setVisible] =
    useState(() => !document.hidden);

  const [error, setError] =
    useState("");

  const engine = useRef(null);
  const mounted = useRef(false);
  const opening = useRef(false);
  const activeRef = useRef(false);

  activeRef.current = enabled && visible;

  useEffect(() => {
    mounted.current = true;

    const changed = () => {
      setVisible(!document.hidden);

      if (document.hidden) {
        engine.current?.stop();
      }
    };

    document.addEventListener(
      "visibilitychange",
      changed,
    );

    return () => {
      mounted.current = false;

      document.removeEventListener(
        "visibilitychange",
        changed,
      );

      engine.current?.close();
      engine.current = null;
    };
  }, []);

  const toggle = async () => {
    if (opening.current) return;

    if (enabled) {
      activeRef.current = false;
      engine.current?.stop();
      setEnabled(false);
      return;
    }

    opening.current = true;

    try {
      const Context =
        window.AudioContext ||
        window.webkitAudioContext;

      if (!Context) {
        throw new Error(
          "Audio is unavailable in this browser.",
        );
      }

      if (!engine.current) {
        engine.current =
          new SoundEngine(Context);
      }

      const current = engine.current;

      await current.ctx.resume();

      if (
        !mounted.current ||
        engine.current !== current
      ) {
        return;
      }

      if (current.ctx.state !== "running") {
        throw new Error(
          "Tap Sound ON again to enable audio.",
        );
      }

      current.setVolume(volume / 100);

      setError("");
      setEnabled(true);

      current.cue("select");
    } catch (failure) {
      if (mounted.current) {
        setError(failure.message);
        setEnabled(false);
      }
    } finally {
      opening.current = false;
    }
  };

  useEffect(() => {
    engine.current?.setVolume(volume / 100);
  }, [volume]);

  const active = enabled && visible;

  return {
    enabled,
    volume,
    setVolume,
    toggle,
    error,
    active,
    engine,

    cue: name => {
      if (
        activeRef.current &&
        !document.hidden
      ) {
        engine.current?.cue(name);
      }
    },
  };
}

export function SoundControls({ sound }) {
  return (
    <section
      aria-label="Game sound controls"
      className="rounded-xl border border-amber-300/20 bg-black/20 p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          aria-pressed={sound.enabled}
          onClick={sound.toggle}
          className="rounded-lg border border-amber-300/40 px-3 py-2 text-xs font-black text-amber-100"
        >
          {sound.enabled
            ? "🔊 SOUND ON"
            : "🔇 SOUND OFF"}
        </button>

        <label className="flex items-center gap-2 text-[10px] font-bold text-amber-100">
          VOLUME

          <input
            aria-label="Game sound volume"
            type="range"
            min="0"
            max="100"
            value={sound.volume}
            onChange={event =>
              sound.setVolume(
                Number(event.target.value),
              )
            }
            className="w-24 accent-amber-300"
          />

          <span className="w-8 text-right">
            {sound.volume}%
          </span>
        </label>
      </div>

      {sound.error && (
        <p
          role="status"
          className="mt-2 text-xs text-amber-100"
        >
          {sound.error}
        </p>
      )}
    </section>
  );
}

export function useRouletteSound(
  sound,
  {
    roundId,
    phase,
    elapsed,
    fresh,
    controller,
  },
) {
  const latest = useRef({
    elapsed,
    phase,
    fresh,
    at: performance.now(),
  });

  if (
    latest.current.elapsed !== elapsed ||
    latest.current.phase !== phase
  ) {
    latest.current = {
      elapsed,
      phase,
      fresh,
      at: performance.now(),
    };
  } else {
    latest.current.fresh = fresh;
  }

  const landed = useRef(null);

  const active =
    sound.active &&
    fresh &&
    !controller;

  useEffect(() => {
    const engine = sound.engine.current;

    if (
      !active ||
      phase !== "SPINNING" ||
      !engine
    ) {
      return;
    }

    let frame;
    let lastBed = -Infinity;
    let previousTime = performance.now();
    let previousElapsed =
      latest.current.elapsed;

    let previousTravel =
      rouletteMotion(previousElapsed).travel;

    let heardSpin = false;

    const tick = wall => {
      const snapshot = latest.current;

      const t =
        snapshot.elapsed +
        (wall - snapshot.at) / 1000;

      const { p, travel } =
        rouletteMotion(t);

      const step = Math.floor(travel);

      const oldStep =
        Math.floor(previousTravel);

      const jumped =
        Math.abs(t - previousElapsed) > 0.8 ||
        wall - previousTime > 400;

      if (
        snapshot.fresh &&
        snapshot.phase === "SPINNING" &&
        t < 15
      ) {
        if (wall - lastBed >= 160) {
          engine.noise(
            0.24,
            0.15 * (1 - p) + 0.014,
            450 + 2200 * (1 - p),
          );

          engine.tone(
            55 + 60 * (1 - p),
            0.22,
            0.045 * (1 - p) + 0.008,
          );

          lastBed = wall;
          heardSpin = true;
        }

        if (!jumped && step > oldStep) {
          engine.noise(
            p > 0.65 ? 0.045 : 0.018,
            p > 0.65 ? 0.31 : 0.11,
            1700 + (1 - p) * 1400,
          );

          engine.tone(
            1050 - p * 450,
            0.035,
            p > 0.65 ? 0.1 : 0.035,
            400,
            0,
            "triangle",
          );
        }
      }

      if (
        !jumped &&
        t >= 15 &&
        previousElapsed < 15 &&
        heardSpin &&
        landed.current !== String(roundId)
      ) {
        engine.cue("landing");
        landed.current = String(roundId);
      }

      previousTravel = travel;
      previousElapsed = t;
      previousTime = wall;

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      engine.stop();

      const snapshot = latest.current;

      if (
        heardSpin &&
        snapshot.fresh &&
        snapshot.phase === "RESULT" &&
        landed.current !== String(roundId)
      ) {
        engine.cue("landing");
        landed.current = String(roundId);
      }
    };
  }, [active, phase, roundId]);

  useEffect(() => {
    if (!active) {
      sound.engine.current?.stop();
    }
  }, [active]);
}

export function useDealSound(
  sound,
  {
    session,
    entry,
    fresh,
    now,
  },
) {
  const snapshot = useRef(null);

  const sessionId = session?.id;
  const phase = session?.phase;
  const level = session?.level;
  const active = sound.active && fresh;

  const clock = useRef(now);
  clock.current = now;

  useEffect(() => {
    const next = {
      id: sessionId,
      phase,
      level,

      reveal:
        session?.revealed?.length || 0,

      entryId: entry?.id,
      status: entry?.status,
      completed: entry?.completedLevel,

      offer: entry?.offer
        ? `${entry.id}:${entry.completedLevel}:${entry.offer.deadline}`
        : "",
    };

    const previous = snapshot.current;

    snapshot.current = next;

    if (
      !active ||
      !previous ||
      previous.id !== next.id
    ) {
      return;
    }

    const engine = sound.engine.current;

    if (!engine) return;

    const sameEntry =
      previous.entryId === next.entryId;

    if (
      next.status === "COLLECTED" &&
      sameEntry &&
      previous.status !== "COLLECTED"
    ) {
      engine.cue("collect");
    } else if (
      next.status === "LOST" &&
      sameEntry &&
      previous.status !== "LOST"
    ) {
      engine.cue("loss");
    } else if (
      next.status === "WON" &&
      sameEntry &&
      (
        previous.status !== "WON" ||
        previous.completed !== next.completed
      )
    ) {
      engine.cue("win");
    } else if (
      next.reveal > previous.reveal
    ) {
      engine.cue("reveal");
    }

    if (
      next.offer &&
      next.offer !== previous.offer &&
      Date.parse(entry.offer.deadline) > now
    ) {
      engine.cue("offer");
    }
  }, [
    active,
    sessionId,
    phase,
    level,
    session?.revealed?.length,
    entry?.id,
    entry?.status,
    entry?.completedLevel,
    entry?.offer?.deadline,
  ]);

  useEffect(() => {
    const engine = sound.engine.current;

    if (
      !active ||
      !engine ||
      !session ||
      ["WAITING", "FINISHED"].includes(phase)
    ) {
      return;
    }

    let lastBeat = -Infinity;
    let lastAtmosphere = -Infinity;

    const tick = () => {
      const t = clock.current;

      const deadline = Date.parse(
        phase === "BETTING"
          ? session.bettingClosesAt
          : session.revealsAt,
      );

      const remaining = Math.max(
        0,
        (deadline - t) / 1000,
      );

      if (
        !Number.isFinite(remaining) ||
        remaining <= 0
      ) {
        return;
      }

      const tension =
        phase !== "BETTING" ||
        remaining <= 5;

      if (
        t - lastBeat >=
        (tension ? 340 : 780)
      ) {
        engine.tone(
          tension ? 110 : 85,
          0.32,
          0.42,
          40,
        );

        engine.noise(
          0.07,
          tension ? 0.15 : 0.07,
          1000,
        );

        lastBeat = t;
      }

      if (t - lastAtmosphere >= 1800) {
        engine.tone(
          55,
          2,
          0.08,
          57,
          0,
          "triangle",
        );

        engine.tone(
          82.4,
          1.8,
          0.055,
          84,
          0.04,
          "triangle",
        );

        if (tension) {
          engine.noise(
            1.2,
            0.17,
            1900,
          );
        }

        lastAtmosphere = t;
      }
    };

    tick();

    const timer = setInterval(tick, 80);

    return () => {
      clearInterval(timer);
      engine.stop();
    };
  }, [
    active,
    sessionId,
    phase,
    level,
  ]);

  useEffect(() => {
    if (!active) {
      sound.engine.current?.stop();
    }
  }, [active]);
}
