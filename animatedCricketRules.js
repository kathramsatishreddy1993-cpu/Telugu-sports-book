import { createHash, randomInt } from "node:crypto";

export const INTERVAL_MS = 15 * 60 * 1000;
export const MATCH_MS = 180000;
export const BALL_MS = 15000;
export const WINDOW_MS = 5000;
export const PREBET_MS = 60000;

export const TEAMS = [
  "RCB SO",
  "CSK SO",
  "MI SO",
  "KKR SO",
  "SRH SO",
  "RR SO",
  "DC SO",
  "PBKS SO",
  "GT SO",
  "LSG SO",
];

// Demo probabilities, independent of bets and wallet balances.
export const WEIGHTS = [
  [0, 25],
  [1, 28],
  [2, 12],
  [3, 2],
  [4, 15],
  [6, 10],
  ["W", 8],
];

export function randomBall(draw = randomInt) {
  let value = draw(100);

  for (const [result, weight] of WEIGHTS) {
    if (value < weight) return result;
    value -= weight;
  }

  throw new Error("Invalid random draw");
}

export function teamsAt(start) {
  // 45 unique pairings per cycle.
  // Next cycle changes round order and reverses batting order.
  const slot = Math.floor(start / INTERVAL_MS);
  const cycle = Math.floor(slot / 45);
  const position = ((slot % 45) + 45) % 45;
  const round = (Math.floor(position / 5) + cycle) % 9;

  const rotation = [
    0,
    ...Array.from(
      { length: 9 },
      (_, i) => 1 + ((i - round + 9) % 9),
    ),
  ];

  const pair = [
    rotation[position % 5],
    rotation[9 - (position % 5)],
  ];

  if ((cycle + round) % 2) pair.reverse();

  return pair.map((i) => TEAMS[i]);
}

export function createMatch(start, draw = randomBall) {
  const innings = [];
  const events = [];

  for (let team = 0; team < 2; team++) {
    const score = {
      runs: 0,
      wickets: 0,
      balls: [],
    };

    for (let ball = 0; ball < 6; ball++) {
      const value = draw();

      if (![0, 1, 2, 3, 4, 6, "W"].includes(value)) {
        throw new Error("Invalid ball result");
      }

      score.balls.push(value);

      if (value === "W") {
        score.wickets++;
      } else {
        score.runs += value;
      }

      events.push({
        index: events.length,
        team,
        ball: ball + 1,
        value,
        at: events.length * BALL_MS + WINDOW_MS,
        runs: score.runs,
        wickets: score.wickets,
      });

      if (
        score.wickets === 2 ||
        (team === 1 && score.runs > innings[0].runs)
      ) {
        break;
      }
    }

    innings.push(score);
  }

  const winner =
    innings[0].runs === innings[1].runs
      ? "TIE"
      : innings[0].runs > innings[1].runs
        ? 0
        : 1;

  return {
    teams: teamsAt(start),
    innings,
    events,
    winner,
  };
}

export function canonicalOutcome(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalOutcome).join(",")}]`;
  }

  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalOutcome(value[key])}`,
      )
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

export const commitment = (outcome, seed) =>
  createHash("sha256")
    .update(canonicalOutcome(outcome) + ":" + seed)
    .digest("hex");

// Profit points per 100 stake; Back/Lay spread stays at 10.
export function ratesAt(events) {
  let first = 90;

  for (const event of events) {
    const movement =
      event.value === 6
        ? -10
        : event.value === 4
          ? -5
          : event.value === "W"
            ? 20
            : 0;

    first = Math.max(
      10,
      Math.min(
        190,
        first + (event.team === 0 ? movement : -movement),
      ),
    );
  }

  return [
    { back: first, lay: first + 10 },
    { back: 200 - first, lay: 210 - first },
  ];
}

export function viewMatch(row, now) {
  const start = Number(row.start_ms);
  const outcome = row.outcome;
  const delta = now - start;

  const events = outcome.events.filter(
    (event) => event.at <= delta,
  );

  const end = start + outcome.events.length * BALL_MS;
  const complete = now >= end;
  const index = Math.max(0, Math.floor(delta / BALL_MS));
  const within = ((delta % BALL_MS) + BALL_MS) % BALL_MS;

  let phase = "WAITING";
  let closesAt = null;
  let windowId = null;

  if (now >= start - PREBET_MS && now < start) {
    phase = "BETTING";
    closesAt = start;
    windowId = "PRE";
  } else if (delta >= 0 && !complete) {
    phase = within < WINDOW_MS ? "BETTING" : "LOCKED";
    closesAt = start + index * BALL_MS + WINDOW_MS;
    windowId = String(index);
  }

  if (complete) phase = "RESULT";

  const scores = [0, 1].map((team) => {
    const balls = events.filter(
      (event) => event.team === team,
    );

    return {
      runs: balls.at(-1)?.runs || 0,
      wickets: balls.at(-1)?.wickets || 0,
      balls: balls.map((event) => event.value),
      overs:
        balls.length === 6 ? "1.0" : `0.${balls.length}`,
    };
  });

  return {
    id: String(row.id),
    teams: outcome.teams,
    startAt: new Date(start).toISOString(),
    latestEndAt: new Date(start + MATCH_MS).toISOString(),
    nextAt: new Date(start + INTERVAL_MS).toISOString(),
    phase,
    windowId,
    closesAt: closesAt
      ? new Date(closesAt).toISOString()
      : null,
    scores,
    events,
    rates: ratesAt(events),
    commitment: row.commitment,
    result: complete ? { winner: outcome.winner } : null,
    seed: complete ? row.seed : null,
    outcome: complete ? outcome : null,
  };
}

export function betAmounts(amount, direction, points) {
  const liability = Math.ceil((amount * points) / 100);

  return {
    hold: direction === "BACK" ? amount : liability,
    winReturn:
      amount +
      (direction === "BACK"
        ? Math.floor((amount * points) / 100)
        : liability),
  };
}

export function payout(bet, winner) {
  if (winner === "TIE") return bet.hold;

  const wins =
    bet.direction === "BACK"
      ? Number(bet.team) === winner
      : Number(bet.team) !== winner;

  return wins ? bet.win_return : 0;
}
