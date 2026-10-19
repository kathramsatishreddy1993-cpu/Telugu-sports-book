import { createHash } from "node:crypto";

export const INTERVAL_MS = 15 * 60 * 1000;
export const MATCH_MS = 120000;
export const BALL_MS = 10000;
export const WINDOW_MS = 8000;
export const PREBET_MS = 300000;

export const INITIAL_RATES = [
  { back: 95, lay: 105 },
  { back: 95, lay: 105 },
];

export const ALLOWED_BALLS = [0, 1, 2, 3, 4, 6, "W"];

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

export function teamsAt(start) {
  // 9 rounds × 5 pairings = 45 unique matches.
  // Next cycle changes batting order and round order.
  const slot = Math.floor(start / INTERVAL_MS);

  const cycle = Math.floor(slot / 45),
    position = ((slot % 45) + 45) % 45;

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

export function winnerMarketLock(scores) {
  const first = scores[0],
    chase = scores[1];

  const firstFinished =
    first.balls.length === 6 || first.wickets === 2;

  if (!firstFinished) return null;

  const chaseFinished =
    chase.balls.length === 6 || chase.wickets === 2;

  if (chase.runs > first.runs) {
    return "Target passed. Waiting for final settlement.";
  }

  if (chaseFinished) {
    return "Innings complete. Waiting for final settlement.";
  }

  // A tie refunds the held coins.
  // Close selections that can only win or refund.
  if (chase.runs === first.runs) {
    return "Scores level. Only a chasing-team win or a tie is possible.";
  }

  const remaining = 6 - chase.balls.length;

  if (chase.runs + remaining * 6 <= first.runs) {
    return "The chasing team cannot win with the balls remaining.";
  }

  return null;
}

export function scoresFrom(balls) {
  return [0, 1].map((team) => {
    const rows = balls.filter((b) => b.team === team);

    const values = rows.map((b) =>
      b.value === "W" ? "W" : Number(b.value),
    );

    return {
      runs: values.reduce(
        (s, v) => s + (typeof v === "number" ? v : 0),
        0,
      ),
      wickets: values.filter((v) => v === "W").length,
      balls: values,
      overs:
        values.length === 6
          ? "1.0"
          : `0.${values.length}`,
    };
  });
}

export function nextDelivery(balls) {
  const s = scoresFrom(balls),
    first = s[0],
    chase = s[1];

  const firstDone =
    first.balls.length === 6 || first.wickets === 2;

  if (!firstDone) {
    return {
      team: 0,
      teamBall: first.balls.length + 1,
      planIndex: first.balls.length,
    };
  }

  if (
    chase.balls.length === 6 ||
    chase.wickets === 2 ||
    chase.runs > first.runs
  ) {
    return null;
  }

  return {
    team: 1,
    teamBall: chase.balls.length + 1,
    planIndex: 6 + chase.balls.length,
  };
}

export function matchWinner(balls) {
  const s = scoresFrom(balls);

  return s[0].runs === s[1].runs
    ? "TIE"
    : s[0].runs > s[1].runs
      ? 0
      : 1;
}

export function publicControlledMatch(row, balls, now) {
  const start = Number(row.start_ms),
    delta = now - start;

  const visible = balls.filter(
    (b) => now >= Number(b.reveals_ms),
  );

  const terminal =
    balls.length > 0 && !nextDelivery(balls);

  const end = terminal
    ? Number(balls.at(-1).opens_ms) + BALL_MS
    : start + MATCH_MS;

  const complete = terminal && now >= end;

  const scores = scoresFrom(visible),
    automatic = complete
      ? "Match complete."
      : winnerMarketLock(scores);

  const manual = row.market_closed
    ? "Market closed by Admin."
    : null;

  let phase = "WAITING",
    windowId = null,
    closesAt = null;

  if (
    now >= start - PREBET_MS &&
    now < start
  ) {
    phase = "BETTING";
    windowId = "PRE";
    closesAt = start;
  } else if (delta >= 0 && !complete) {
    const seq = Math.floor(delta / BALL_MS),
      within = delta % BALL_MS;

    phase = within < WINDOW_MS
      ? "BETTING"
      : "LOCKED";

    windowId = String(seq);
    closesAt = start + seq * BALL_MS + WINDOW_MS;
  }

  const lockReason = automatic || manual;

  if (lockReason && !complete) {
    phase = "SUSPENDED";
    windowId = null;
    closesAt = null;
  }

  if (complete) phase = "RESULT";

  const events = visible.map((b) => ({
    index: b.seq,
    team: b.team,
    ball: b.team_ball,
    value:
      b.value === "W" ? "W" : Number(b.value),
    at: Number(b.reveals_ms) - start,
  }));

  return {
    id: `M${row.id}`,
    mode: "ADMIN_CONTROLLED",
    teams: row.teams,
    startAt: new Date(start).toISOString(),
    latestEndAt: new Date(
      start + MATCH_MS,
    ).toISOString(),
    nextAt: new Date(
      start + INTERVAL_MS,
    ).toISOString(),
    phase,
    windowId,
    closesAt: closesAt
      ? new Date(closesAt).toISOString()
      : null,
    scores,
    events,

    rates: lockReason
      ? [
          { back: 0, lay: 0 },
          { back: 0, lay: 0 },
        ]
      : row.rates,

    quoteVersion: row.quote_version,
    lockReason,

    result: complete
      ? { winner: matchWinner(balls) }
      : null,

    verification: balls.map((b) => ({
      index: b.seq,
      matchId: `M${row.id}`,
      seq: b.seq,
      team: b.team,
      teamBall: b.team_ball,
      commitment: b.commitment,

      value:
        now >= Number(b.reveals_ms)
          ? b.value === "W"
            ? "W"
            : Number(b.value)
          : null,

      seed:
        now >= Number(b.reveals_ms)
          ? b.seed
          : null,
    })),
  };
}

export function betAmounts(amount, direction, points) {
  const liability = Math.ceil(
    (amount * points) / 100,
  );

  return {
    hold: direction === "BACK"
      ? amount
      : liability,

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
