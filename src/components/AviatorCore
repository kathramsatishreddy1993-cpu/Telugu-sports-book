// Aviator core, ported from Super Fast Aviator (flight.js + sample-player helpers).

// Flight movement follows the server clock.
export function flightPoint(elapsedMs = 0) {
  const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const t = 1 - Math.exp(-elapsed / 7000);

  const start = { x: 10, y: 228 };
  const control = { x: 230, y: 224 };
  const end = { x: 340, y: 120 };
  const inverse = 1 - t;

  const x = inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x;
  const y = inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y;
  const dx = 2 * (inverse * (control.x - start.x) + t * (end.x - control.x));
  const dy = 2 * (inverse * (control.y - start.y) + t * (end.y - control.y));
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

  const partialX = start.x + (control.x - start.x) * t;
  const partialY = start.y + (control.y - start.y) * t;

  return {
    x,
    y,
    angle,
    path:
      `M ${start.x} ${start.y} ` +
      `Q ${partialX.toFixed(2)} ${partialY.toFixed(2)} ` +
      `${x.toFixed(2)} ${y.toFixed(2)}`,
  };
}

// Optional sound, enabled by tapping the sound button.
// Music loops during countdown/flight. On crash: music stops and rewinds and a separate
// crash sound plays once. Next round: music restarts from the beginning.
export class GameAudio {
  constructor(
    factory = () => new Audio("/game-music.mp3?v=tsb-1"),
    crashFactory = () => new Audio("/crash-sound.mp3?v=tsb-1"),
  ) {
    this.factory = factory;
    this.crashFactory = crashFactory;
    this.music = null;
    this.crash = null;
    this.enabled = false;
    this.pending = null;
    this.blocked = false;
    this.generation = 0;
    this.seen = null;
    this.crashedRound = null;
  }

  player() {
    if (!this.music) {
      this.music = this.factory();
      this.music.loop = true;
      this.music.volume = 0.55;
      this.music.preload = "none";
    }
    return this.music;
  }

  crashPlayer() {
    if (!this.crash) {
      this.crash = this.crashFactory();
      this.crash.volume = 1;
      this.crash.preload = "auto";
    }
    return this.crash;
  }

  async toggle() {
    if (this.pending) return this.pending;

    if (this.enabled) {
      this.enabled = false;
      this.reset();
      return false;
    }

    const music = this.player();
    const generation = this.generation;

    this.pending = (async () => {
      try {
        await music.play();

        if (generation !== this.generation) {
          music.pause();
          return false;
        }

        this.enabled = true;
        this.blocked = false;

        // Unlock the crash sound on mobile (silent play/pause during this tap).
        const crash = this.crashPlayer();
        crash.muted = true;
        Promise.resolve(crash.play())
          .then(() => {
            crash.pause();
            crash.currentTime = 0;
            crash.muted = false;
          })
          .catch(() => {
            crash.muted = false;
          });

        return true;
      } catch {
        this.enabled = false;
        throw new Error("Music could not start. Check game-music.mp3, then tap sound again.");
      } finally {
        this.pending = null;
      }
    })();

    return this.pending;
  }

  stopEngine() {
    this.generation++;
    this.music?.pause();
  }

  stopMusic() {
    this.stopEngine();
    if (this.music) {
      try {
        this.music.currentTime = 0;
      } catch {
        // Not seekable yet.
      }
    }
  }

  reset() {
    this.stopMusic();
    if (this.crash) {
      this.crash.pause();
      try {
        this.crash.currentTime = 0;
      } catch {
        // Not seekable yet.
      }
    }
    this.blocked = false;
  }

  sync(round) {
    if (!round) return;

    const previous = this.seen;
    this.seen = { id: round.id, phase: round.phase };

    if (!this.enabled || this.blocked || this.pending) return;

    if (round.phase === "CRASHED") {
      if (this.crashedRound !== round.id) {
        this.crashedRound = round.id;
        this.stopMusic();

        if (previous && previous.id === round.id) {
          const crash = this.crashPlayer();
          try {
            crash.currentTime = 0;
          } catch {
            // Not seekable yet.
          }
          Promise.resolve(crash.play()).catch(() => {});
        }
      }
      return;
    }

    const music = this.player();

    if (music.paused) {
      const generation = this.generation;
      try {
        this.pending = Promise.resolve(music.play())
          .then(() => {
            if (generation !== this.generation) music.pause();
          })
          .catch(error => {
            if (error?.name !== "AbortError") this.blocked = true;
          })
          .finally(() => {
            this.pending = null;
          });
      } catch {
        this.blocked = true;
      }
    }
  }
}

// ---------- Sample players (clearly labelled "Simulated" on screen) ----------

export function seedOf(value) {
  let h = 2166136261;
  for (const c of String(value)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

function randomFor(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

const avatarCache = new Map();

export function avatar(index) {
  const id = (((Number(index) || 0) % 300) + 300) % 300;
  if (avatarCache.has(id)) return avatarCache.get(id);

  const backgrounds = ["#07383a", "#781a40", "#152e27", "#38202c", "#20292b"];
  const skin = ["#ffffff", "#e3ded8", "#beb5ab", "#95877c", "#71675e"][id % 5];

  const hair =
    id % 3 === 0
      ? '<path d="M17 30V18Q32 2 47 18v12l-8-10-9 6-7-3z" fill="#111"/>'
      : id % 3 === 1
        ? '<path d="M15 35V21Q32 1 49 21v14l-7-12-20 3z" fill="#781a40"/>'
        : '<path d="M14 23Q32 5 50 23v5H14z" fill="#0cb2b7"/><path d="M13 27h41" stroke="#fff" stroke-width="3"/>';

  const glasses =
    Math.floor(id / 15) % 2
      ? '<path d="M21 32h9v6h-9zm13 0h9v6h-9zM30 34h4" fill="none" stroke="#111" stroke-width="2"/>'
      : '<circle cx="25" cy="34" r="2" fill="#111"/><circle cx="39" cy="34" r="2" fill="#111"/>';

  const mouth =
    Math.floor(id / 30) % 2
      ? '<path d="M26 43q6 6 12 0" fill="none" stroke="#111" stroke-width="2"/>'
      : '<path d="M27 44h10" stroke="#781a40" stroke-width="2"/>';

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${backgrounds[Math.floor(id / 3) % 5]}"/>` +
    `<path d="M8 64v-6q24-21 48 0v6" fill="${Math.floor(id / 60) % 2 ? "#781a40" : "#0cb2b7"}"/>` +
    `<ellipse cx="32" cy="33" rx="16" ry="21" fill="${skin}"/>${hair}${glasses}${mouth}` +
    `<circle cx="${7 + (id % 50)}" cy="7" r="2" fill="#fff"/></svg>`;

  const uri = "data:image/svg+xml," + encodeURIComponent(svg);
  avatarCache.set(id, uri);
  return uri;
}

export function maskName(value) {
  const s = String(value || "S");
  return (/^\d/.test(s) ? s.slice(0, 2) : s.slice(0, 1).toUpperCase()) + "****";
}

function sampleRoundCap(roundId) {
  const slot = ((roundId % 150) + 150) % 150;
  const special = { 0: 15000, 1: 10000, 29: 55000, 59: 57000, 89: 56000, 119: 54000, 149: 60000 };
  if (Object.hasOwn(special, slot)) return special[slot];
  const caps = [5000, 15000, 10000, 30000, 20000, 25000, 8000, 35000, 12000, 40000, 18000, 45000, 6000, 48000];
  return caps[(slot * 5 + Math.floor(roundId / 150) * 3) % caps.length];
}

export function sampleIdentityGroup(roundId) {
  return Math.floor((Number(roundId) - 1) / 3);
}

export function sampleIdentity(index, roundId) {
  const group = sampleIdentityGroup(roundId);
  const names = ["S", "T", "L", "96", "98", "97", "K", "R", "P", "M"];
  return {
    username: names[(((index * 7 + group) % names.length) + names.length) % names.length] + "****",
    avatarId: (((index * 47 + group * 31) % 300) + 300) % 300,
  };
}

export function buildSamples(roundId) {
  const rng = randomFor(seedOf("rotating-samples-v2-" + roundId));
  const total = 1200 + ((roundId * 137) % 601);
  const cap = sampleRoundCap(roundId);
  const step = cap <= 15000 ? 50 : 100;
  const minimum = Math.max(3050, Math.round((cap * 0.3) / step) * step);

  const candidates = [];
  for (let value = minimum; value < cap; value += step) candidates.push(value);

  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  const high = [cap, ...candidates.slice(0, 14)].sort((a, b) => b - a);
  const usual = [500, 1000, 3000, 500, 1000, 3000, 100, 500, 1000, 3000, 200, 1000, 500, 3000, 1500, 500, 1000, 2000];

  return Array.from({ length: total }, (_, i) => ({
    key: "sample-" + i,
    simulated: true,
    ...sampleIdentity(i, roundId),
    stake: i < high.length ? high[i] : usual[(seedOf("small-" + i) + roundId) % usual.length],
    target: (112 + Math.floor(rng() * 183)) / 100,
    willCash: rng() < 0.72,
    join: i < high.length ? 0 : rng(),
  }));
}

// Real bets (from the server) plus simulated samples, biggest stake first.
export function activityRows({ samples, real, phase, countdown, mult }) {
  const waiting = phase === "COUNTDOWN" || phase === "WAITING";
  const progress = waiting ? Math.max(0, Math.min(1, 1 - countdown / 10)) : 1;

  const fake = samples
    .filter(b => b.join <= progress)
    .map(b => {
      const won =
        b.willCash && !waiting && (phase === "CRASHED" ? b.target < mult : b.target <= mult);

      return {
        ...b,
        status: won ? "WON" : phase === "CRASHED" ? "LOST" : "ACTIVE",
        mult: won ? b.target : 0,
        payout: won ? Math.floor((b.stake * Math.round(b.target * 100)) / 100) : 0,
      };
    });

  const actual = real.map((b, i) => ({
    ...b,
    simulated: false,
    key: "user-" + (b.id ?? i),
    avatarId: b.avatarId ?? seedOf(b.username),
  }));

  return [...actual, ...fake].sort(
    (a, b) =>
      b.stake - a.stake ||
      Number(a.simulated) - Number(b.simulated) ||
      String(a.key).localeCompare(String(b.key)),
  );
}
