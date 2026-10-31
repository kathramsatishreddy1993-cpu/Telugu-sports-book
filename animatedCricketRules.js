import {
  createHash,
  randomInt,
  randomBytes,
} from "node:crypto";

// పాత accepted bets కోసం పాత timing అలాగే ఉంచాం.
export const INTERVAL_MS = 900000;
export const MATCH_MS = 120000;
export const BALL_MS = 10000;
export const WINDOW_MS = 8000;
export const PREBET_MS = 300000;

export const INITIAL_RATES = [
  { back: 95, lay: 105 },
  { back: 95, lay: 105 },
];

export const ALLOWED_BALLS = [
  0, 1, 2, 3, 4, 6, "W",
];

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
  const slot = Math.floor(
    start / INTERVAL_MS,
  );

  const cycle = Math.floor(
    slot / 45,
  );

  const position =
    ((slot % 45) + 45) % 45;

  const round =
    (
      (
        Math.floor(position / 5) +
        cycle
      ) % 9 +
      9
    ) % 9;

  const rotation = [
    0,
    ...Array.from(
      { length: 9 },
      (_, i) =>
        1 + ((i - round + 9) % 9),
    ),
  ];

  const pair = [
    rotation[position % 5],
    rotation[
      9 - (position % 5)
    ],
  ];

  if ((cycle + round) % 2) {
    pair.reverse();
  }

  return pair.map(
    i => TEAMS[i],
  );
}

export function canonicalOutcome(value) {
  if (Array.isArray(value)) {
    return (
      "[" +
      value
        .map(canonicalOutcome)
        .join(",") +
      "]"
    );
  }

  if (
    value !== null &&
    typeof value === "object"
  ) {
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map(
          key =>
            `${JSON.stringify(key)}:` +
            canonicalOutcome(
              value[key],
            ),
        )
        .join(",") +
      "}"
    );
  }

  return JSON.stringify(value);
}

export const commitment = (
  value,
  seed,
) =>
  createHash("sha256")
    .update(
      canonicalOutcome(value) +
        ":" +
        seed,
    )
    .digest("hex");

export function scoresFrom(balls) {
  return [0, 1].map(team => {
    const values = balls
      .filter(
        ball => ball.team === team,
      )
      .map(ball =>
        ball.value === "W"
          ? "W"
          : Number(ball.value),
      );

    return {
      runs: values.reduce(
        (sum, value) =>
          sum +
          (
            typeof value === "number"
              ? value
              : 0
          ),
        0,
      ),

      wickets: values.filter(
        value => value === "W",
      ).length,

      balls: values,

      overs:
        values.length === 6
          ? "1.0"
          : `0.${values.length}`,
    };
  });
}

export function nextDelivery(balls) {
  const [
    first,
    chase,
  ] = scoresFrom(balls);

  if (
    first.balls.length < 6 &&
    first.wickets < 2
  ) {
    return {
      team: 0,

      teamBall:
        first.balls.length + 1,

      planIndex:
        first.balls.length,
    };
  }

  if (
    chase.balls.length >= 6 ||
    chase.wickets >= 2 ||
    chase.runs > first.runs
  ) {
    return null;
  }

  return {
    team: 1,

    teamBall:
      chase.balls.length + 1,

    planIndex:
      6 + chase.balls.length,
  };
}

export function matchWinner(balls) {
  const [
    first,
    chase,
  ] = scoresFrom(balls);

  if (
    first.runs === chase.runs
  ) {
    return "TIE";
  }

  return first.runs > chase.runs
    ? 0
    : 1;
}

export function winnerMarketLock(
  scores,
) {
  const [
    first,
    chase,
  ] = scores;

  if (
    first.balls.length < 6 &&
    first.wickets < 2
  ) {
    return null;
  }

  if (
    chase.runs > first.runs
  ) {
    return (
      "Target passed. " +
      "Waiting for final settlement."
    );
  }

  if (
    chase.balls.length >= 6 ||
    chase.wickets >= 2
  ) {
    return (
      "Innings complete. " +
      "Waiting for final settlement."
    );
  }

  if (
    chase.runs === first.runs
  ) {
    return (
      "Scores level. Only a " +
      "chasing-team win or a tie " +
      "is possible."
    );
  }

  const ballsRemaining =
    6 - chase.balls.length;

  if (
    chase.runs +
      ballsRemaining * 6 <=
    first.runs
  ) {
    return (
      "The chasing team cannot win " +
      "with the balls remaining."
    );
  }

  return null;
}

export function betAmounts(
  amount,
  direction,
  points,
) {
  const liability = Math.ceil(
    (amount * points) / 100,
  );

  return {
    hold:
      direction === "BACK"
        ? amount
        : liability,

    winReturn:
      amount +
      (
        direction === "BACK"
          ? Math.floor(
              (amount * points) /
                100,
            )
          : liability
      ),
  };
}

export function payout(
  bet,
  winner,
) {
  if (winner === "TIE") {
    return Number(bet.hold);
  }

  const wins =
    bet.direction === "BACK"
      ? Number(bet.team) === winner
      : Number(bet.team) !== winner;

  return wins
    ? Number(bet.win_return)
    : 0;
}

// పాత controlled matches కోసం మాత్రమే.
export function publicControlledMatch(
  row,
  balls,
  now,
) {
  const start =
    Number(row.start_ms);

  const delta =
    now - start;

  const visible = balls.filter(
    ball =>
      now >=
      Number(ball.reveals_ms),
  );

  const terminal =
    balls.length > 0 &&
    !nextDelivery(balls);

  const end = terminal
    ? start +
      balls.length * BALL_MS
    : start + MATCH_MS;

  const complete =
    terminal && now >= end;

  const scores =
    scoresFrom(visible);

  const lockReason = complete
    ? "Match complete."
    : winnerMarketLock(scores) ||
      (
        row.market_closed
          ? "Market closed by Admin."
          : null
      );

  let phase = "WAITING";
  let windowId = null;
  let closesAt = null;

  if (
    now >= start - PREBET_MS &&
    now < start
  ) {
    phase = "BETTING";
    windowId = "PRE";
    closesAt = start;
  } else if (
    delta >= 0 &&
    !complete
  ) {
    const seq = Math.floor(
      delta / BALL_MS,
    );

    phase =
      delta % BALL_MS < WINDOW_MS
        ? "BETTING"
        : "LOCKED";

    windowId =
      String(seq);

    closesAt =
      start +
      seq * BALL_MS +
      WINDOW_MS;
  }

  if (
    lockReason &&
    !complete
  ) {
    phase = "SUSPENDED";
    windowId = null;
    closesAt = null;
  }

  if (complete) {
    phase = "RESULT";
  }

  return {
    id: `M${row.id}`,

    mode: "ADMIN_CONTROLLED",

    teams: row.teams,

    startAt:
      new Date(start).toISOString(),

    latestEndAt:
      new Date(
        start + MATCH_MS,
      ).toISOString(),

    nextAt:
      new Date(
        start + INTERVAL_MS,
      ).toISOString(),

    phase,
    windowId,

    closesAt: closesAt
      ? new Date(
          closesAt,
        ).toISOString()
      : null,

    scores,

    rates: lockReason
      ? [
          { back: 0, lay: 0 },
          { back: 0, lay: 0 },
        ]
      : row.rates,

    quoteVersion:
      row.quote_version,

    lockReason,

    events: visible.map(
      ball => ({
        index: ball.seq,

        team: ball.team,

        ball: ball.team_ball,

        value:
          ball.value === "W"
            ? "W"
            : Number(ball.value),

        at:
          Number(
            ball.reveals_ms,
          ) - start,
      }),
    ),

    result: complete
      ? {
          winner:
            matchWinner(balls),
        }
      : null,

    verification: balls.map(
      ball => ({
        matchId: `M${row.id}`,

        seq: ball.seq,

        team: ball.team,

        teamBall:
          ball.team_ball,

        commitment:
          ball.commitment,

        value:
          now >=
          Number(
            ball.reveals_ms,
          )
            ? ball.value === "W"
              ? "W"
              : Number(
                  ball.value,
                )
            : null,

        seed:
          now >=
          Number(
            ball.reveals_ms,
          )
            ? ball.seed
            : null,
      }),
    ),
  };
}

// కొత్త automatic card Super Over.
export const CARD_TRANSFER_MS =
  4000;

export const CARD_BET_MS =
  15000;

export const CARD_DEAL_MS =
  1000;

export const CARD_RESULT_MS =
  10000;

export const CARD_ROUND_MS =
  CARD_TRANSFER_MS +
  CARD_BET_MS +
  12 * CARD_DEAL_MS +
  CARD_RESULT_MS;

// 98 profit points = 1.98 total return.
export const CARD_POINTS = 98;

export const CARD_TEAMS = [
  "INDIA",
  "AUSTRALIA",
];

export const CARD_RANKS = [
  "A",
  "2",
  "3",
  "4",
  "6",
  "10",
  "K",
];

export const cardValue = rank =>
  rank === "K"
    ? "W"
    : rank === "A"
      ? 1
      : rank === "10"
        ? 0
        : Number(rank);

export function shuffledDeck() {
  const deck =
    CARD_RANKS.flatMap(
      rank =>
        Array(5).fill(rank),
    );

  for (
    let i = deck.length - 1;
    i > 0;
    i--
  ) {
    const j =
      randomInt(i + 1);

    [
      deck[i],
      deck[j],
    ] = [
      deck[j],
      deck[i],
    ];
  }

  return deck;
}

export function cardEvents(deck) {
  if (
    !Array.isArray(deck) ||
    deck.length !== 35 ||
    CARD_RANKS.some(
      rank =>
        deck.filter(
          value =>
            value === rank,
        ).length !== 5,
    )
  ) {
    throw new Error(
      "Invalid 35-card deck",
    );
  }

  const events = [];

  for (const rank of deck) {
    const next =
      nextDelivery(events);

    if (!next) {
      break;
    }

    events.push({
      index:
        events.length,

      team:
        next.team,

      ball:
        next.teamBall,

      rank,

      value:
        cardValue(rank),

      at:
        CARD_TRANSFER_MS +
        CARD_BET_MS +
        (
          events.length + 1
        ) * CARD_DEAL_MS,
    });
  }

  return events;
}

export function newCardRound(
  start,
) {
  const deck =
    shuffledDeck();

  const seed =
    randomBytes(32)
      .toString("hex");

  return {
    deck,
    seed,

    commitment:
      commitment(
        {
          start,
          deck,
        },
        seed,
      ),
  };
}

export function publicCardMatch(
  row,
  now,
) {
  const start =
    Number(row.start_ms);

  const all =
    cardEvents(row.deck);

  const resultAt =
    start +
    all.at(-1).at;

  const opens =
    start +
    CARD_TRANSFER_MS;

  const closes =
    opens +
    CARD_BET_MS;

  const phase =
    now < opens
      ? "TRANSFER"
      : now < closes
        ? "BETTING"
        : now < resultAt
          ? "DEALING"
          : "RESULT";

  const events =
    all.filter(
      event =>
        start + event.at <= now,
    );

  const scores =
    scoresFrom(events);

  return {
    id: `C${row.id}`,

    mode: "RANDOM_CARDS",

    teams:
      CARD_TEAMS,

    roundStartAt:
      new Date(
        start,
      ).toISOString(),

    startAt:
      new Date(
        start,
      ).toISOString(),

    opensAt:
      new Date(
        opens,
      ).toISOString(),

    closesAt:
      new Date(
        closes,
      ).toISOString(),

    nextAt:
      new Date(
        start +
          CARD_ROUND_MS,
      ).toISOString(),

    latestEndAt:
      new Date(
        start +
          CARD_ROUND_MS,
      ).toISOString(),

    phase,

    windowId: "PRE",

    quoteVersion: 1,

    rates: [
      {
        back: CARD_POINTS,
        lay: 0,
      },
      {
        back: CARD_POINTS,
        lay: 0,
      },
    ],

    odds: 1.98,

    scores,
    events,

    result:
      phase === "RESULT"
        ? {
            winner:
              matchWinner(all),
          }
        : null,

    verification: {
      commitment:
        row.commitment,

      algorithm:
        "SHA-256(canonicalOutcome({start,deck}) + ':' + seed)",

      ...(
        phase === "RESULT"
          ? {
              start,
              deck: row.deck,
              seed: row.seed,
            }
          : {}
      ),
    },
  };
}
