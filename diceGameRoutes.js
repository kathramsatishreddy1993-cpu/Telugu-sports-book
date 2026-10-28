import { createHash, randomInt } from "node:crypto";

const BET_MS = 30000;
const REVEAL_MS = 5000;
const SHAKE_MS = 5000;
const JHANDI_DICE_COUNT = 4;
const LOCK_ID = 824061;
const MAX_BALANCE = 2147483647;

const SYMBOLS = [
  "club",
  "crown",
  "spade",
  "diamond",
  "flag",
  "heart",
];

// Keep the last two entries for historical six-dice rounds.
const MULTIPLIERS = [0, 0, 3, 5, 10, 20, 100];

const CONFIG = {
  lankesh: {
    name: "LANKESH",
    areas: Array.from(
      { length: 10 },
      (_, i) => `F${i + 1}`,
    ),
  },

  "jhandi-munda": {
    name: "JHANDI MUNDA",
    areas: SYMBOLS,
  },
};

const failure = (message, status = 400) =>
  Object.assign(new Error(message), { status });

const parseJSON = value =>
  typeof value === "string"
    ? JSON.parse(value)
    : value;

const getConfig = game => {
  if (!Object.hasOwn(CONFIG, game)) {
    throw failure("Unknown dice game.", 404);
  }

  return CONFIG[game];
};

export function createDiceResult(
  game,
  rng = randomInt,
) {
  getConfig(game);

  if (game === "lankesh") {
    return {
      head: `F${rng(1, 11)}`,
    };
  }

  const dice = Array.from(
    { length: JHANDI_DICE_COUNT },
    () => SYMBOLS[rng(0, SYMBOLS.length)],
  );

  const counts = Object.fromEntries(
    SYMBOLS.map(symbol => [symbol, 0]),
  );

  for (const symbol of dice) {
    counts[symbol] += 1;
  }

  return { dice, counts };
}

export function dicePayout(game, bets, result) {
  getConfig(game);

  const areas = bets.map(bet => {
    const count =
      game === "jhandi-munda"
        ? result.counts[bet.area]
        : null;

    const multiplier =
      game === "lankesh"
        ? bet.area === result.head
          ? 9.5
          : 0
        : MULTIPLIERS[count];

    return {
      ...bet,
      count,
      multiplier,
      payout: Math.floor(
        bet.amount * multiplier,
      ),
    };
  });

  return {
    areas,
    payout: areas.reduce(
      (sum, bet) => sum + bet.payout,
      0,
    ),
  };
}

function normalizeBet(game, body) {
  const config = getConfig(game);
  const key = body?.requestKey;
  const roundId = String(body?.roundId || "");

  if (
    typeof key !== "string" ||
    !/^[A-Za-z0-9_-]{16,100}$/.test(key)
  ) {
    throw failure(
      "A unique requestKey of 16-100 characters is required.",
    );
  }

  if (!/^[1-9][0-9]{0,18}$/.test(roundId)) {
    throw failure("A valid roundId is required.");
  }

  if (
    !Array.isArray(body.bets) ||
    !body.bets.length ||
    body.bets.length > config.areas.length
  ) {
    throw failure("Select valid betting areas.");
  }

  const seen = new Set();

  const bets = body.bets
    .map(bet => {
      if (
        !bet ||
        !config.areas.includes(bet.area) ||
        seen.has(bet.area) ||
        !Number.isSafeInteger(bet.amount) ||
        bet.amount < 10 ||
        bet.amount > 25000
      ) {
        throw failure(
          "Each area must be distinct with 10-25000 whole demo coins.",
        );
      }

      seen.add(bet.area);

      return {
        area: bet.area,
        amount: bet.amount,
      };
    })
    .sort((a, b) =>
      a.area.localeCompare(b.area),
    );

  const stake = bets.reduce(
    (sum, bet) => sum + bet.amount,
    0,
  );

  if (stake > 25000) {
    throw failure(
      "Maximum stake per round is 25000 demo coins.",
    );
  }

  return { key, roundId, bets, stake };
}

export async function initializeDiceGames(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tsb_dice_rounds (
      id BIGSERIAL PRIMARY KEY,
      game VARCHAR(30) NOT NULL
        CHECK(game IN ('lankesh','jhandi-munda')),
      opens_at TIMESTAMPTZ NOT NULL,
      closes_at TIMESTAMPTZ NOT NULL,
      ends_at TIMESTAMPTZ NOT NULL,
      result JSONB NOT NULL,
      settled BOOLEAN NOT NULL DEFAULT FALSE,
      CHECK(
        opens_at < closes_at
        AND closes_at < ends_at
      )
    );

    CREATE INDEX IF NOT EXISTS tsb_dice_latest
      ON tsb_dice_rounds(game,id DESC);

    CREATE TABLE IF NOT EXISTS tsb_dice_bets (
      id BIGSERIAL PRIMARY KEY,
      customer_id INTEGER NOT NULL
        REFERENCES customers(id),
      round_id BIGINT NOT NULL
        REFERENCES tsb_dice_rounds(id),
      request_key VARCHAR(100) NOT NULL,
      bets JSONB NOT NULL,
      stake INTEGER NOT NULL
        CHECK(stake > 0 AND stake <= 25000),
      payout INTEGER,
      settlement JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(customer_id,request_key),
      CHECK(payout IS NULL OR payout >= 0)
    );

    CREATE INDEX IF NOT EXISTS tsb_dice_bets_round
      ON tsb_dice_bets(round_id,customer_id);

    CREATE INDEX IF NOT EXISTS tsb_dice_bets_history
      ON tsb_dice_bets(customer_id,id DESC);
  `);
}

async function transaction(pool, operation) {
  const client = await pool.connect();
  let committed = false;

  try {
    await client.query("BEGIN");

    await client.query(
      "SELECT pg_advisory_xact_lock($1)",
      [LOCK_ID],
    );

    const result = await operation(client);

    await client.query("COMMIT");
    committed = true;

    return result;
  } finally {
    if (!committed) {
      await client.query("ROLLBACK").catch(() => {});
    }

    client.release();
  }
}

async function requireCustomer(client, req) {
  const cookie = String(req.headers.cookie || "")
    .split(";")
    .map(value => value.trim())
    .find(value =>
      value.startsWith("tsb_demo_session="),
    );

  const token =
    cookie?.slice("tsb_demo_session=".length) || "";

  if (!/^[a-f0-9]{64}$/.test(token)) {
    throw failure("Customer login required.", 401);
  }

  const hash = createHash("sha256")
    .update(token)
    .digest("hex");

  const result = await client.query(
    `SELECT c.id
     FROM demo_customer_sessions s
     JOIN customers c ON c.id=s.customer_id
     WHERE s.token_hash=$1
       AND s.expires_at>NOW()
       AND c.status='ACTIVE'
       AND c.must_change_password=FALSE
       AND c.must_change_withdrawal_password=FALSE
     LIMIT 1`,
    [hash],
  );

  if (!result.rows.length) {
    throw failure(
      "Login again and complete password setup.",
      401,
    );
  }

  return result.rows[0].id;
}

async function settleRound(client, round) {
  const result = parseJSON(round.result);

  const records = await client.query(
    `SELECT *
     FROM tsb_dice_bets
     WHERE round_id=$1
       AND payout IS NULL
     ORDER BY customer_id,id
     FOR UPDATE`,
    [round.id],
  );

  for (const bet of records.rows) {
    const settlement = dicePayout(
      round.game,
      parseJSON(bet.bets),
      result,
    );

    if (settlement.payout > 0) {
      const credited = await client.query(
        `UPDATE customers
         SET demo_coin_balance=
               demo_coin_balance+$1,
             updated_at=NOW()
         WHERE id=$2
           AND demo_coin_balance <= $3
         RETURNING id`,
        [
          settlement.payout,
          bet.customer_id,
          MAX_BALANCE - settlement.payout,
        ],
      );

      if (!credited.rows.length) {
        throw failure(
          "Demo balance limit prevents round settlement.",
          503,
        );
      }

      await client.query(
        `INSERT INTO demo_coin_transactions(
           customer_id,
           amount,
           transaction_type,
           note
         )
         VALUES($1,$2,'GAME_WIN',$3)`,
        [
          bet.customer_id,
          settlement.payout,
          `${round.game} round #${round.id} bet #${bet.id} return`,
        ],
      );
    }

    await client.query(
      `UPDATE tsb_dice_bets
       SET payout=$1,
           settlement=$2::JSONB
       WHERE id=$3`,
      [
        settlement.payout,
        JSON.stringify(settlement),
        bet.id,
      ],
    );
  }

  await client.query(
    `UPDATE tsb_dice_rounds
     SET settled=TRUE
     WHERE id=$1`,
    [round.id],
  );

  return {
    ...round,
    settled: true,
  };
}

function shakeDuration(round) {
  return (
    round.game === "jhandi-munda" &&
    parseJSON(round.result)?.dice?.length ===
      JHANDI_DICE_COUNT
  )
    ? SHAKE_MS
    : 0;
}

function revealTime(round) {
  return (
    new Date(round.closes_at).getTime() +
    shakeDuration(round)
  );
}

async function advanceRound(client, game) {
  const time = await client.query(
    "SELECT clock_timestamp() AS now",
  );

  const now =
    new Date(time.rows[0].now).getTime();

  const latest = await client.query(
    `SELECT *
     FROM tsb_dice_rounds
     WHERE game=$1
     ORDER BY id DESC
     LIMIT 1
     FOR UPDATE`,
    [game],
  );

  let round = latest.rows[0];

  if (
    round &&
    !round.settled &&
    now >= revealTime(round)
  ) {
    round = await settleRound(client, round);
  }

  if (
    !round ||
    now >= new Date(round.ends_at).getTime()
  ) {
    const result = createDiceResult(game);

    const shakingTime =
      game === "jhandi-munda"
        ? SHAKE_MS
        : 0;

    const saved = await client.query(
      `INSERT INTO tsb_dice_rounds(
         game,
         opens_at,
         closes_at,
         ends_at,
         result
       )
       VALUES($1,$2,$3,$4,$5::JSONB)
       RETURNING *`,
      [
        game,
        new Date(now),
        new Date(now + BET_MS),
        new Date(
          now + BET_MS + shakingTime + REVEAL_MS,
        ),
        JSON.stringify(result),
      ],
    );

    round = saved.rows[0];
  }

  return { round, now };
}

function roundJSON(round, now) {
  const reveals = revealTime(round);

  const revealing =
    now >= reveals &&
    round.settled;

  const closed =
    now >= new Date(round.closes_at).getTime();

  return {
    id: round.id,
    game: round.game,
    opensAt: round.opens_at,
    closesAt: round.closes_at,
    revealsAt: new Date(reveals).toISOString(),
    endsAt: round.ends_at,

    diceCount:
      round.game === "jhandi-munda"
        ? parseJSON(round.result).dice.length
        : null,

    phase: revealing
      ? "RESULT"
      : closed
        ? "SHAKING"
        : "BETTING",

    result: revealing
      ? parseJSON(round.result)
      : null,
  };
}

function betJSON(bet) {
  return {
    id: bet.id,
    roundId: bet.round_id,
    bets: parseJSON(bet.bets),
    stake: bet.stake,
    payout: bet.payout,

    settlement: bet.settlement
      ? parseJSON(bet.settlement)
      : null,

    createdAt: bet.created_at,
  };
}

export function registerDiceGameRoutes(app, pool) {
  const wrap = fn => (req, res, next) =>
    Promise.resolve(fn(req, res)).catch(next);

  const noCache = res =>
    res.set("Cache-Control", "no-store");

  app.get(
    "/api/dice-games/:game/rules",
    wrap(async (req, res) => {
      const config = getConfig(req.params.game);

      await requireCustomer(pool, req);
      noCache(res);

      res.json({
        success: true,
        game: req.params.game,
        name: config.name,
        demoOnly: true,
        areas: config.areas,
        bettingSeconds: BET_MS / 1000,
        revealSeconds: REVEAL_MS / 1000,
        minAreaStake: 10,
        maxRoundStake: 25000,

        diceCount:
          req.params.game === "jhandi-munda"
            ? JHANDI_DICE_COUNT
            : null,

        shakingSeconds:
          req.params.game === "jhandi-munda"
            ? SHAKE_MS / 1000
            : 0,

        payoutMeaning:
          "Total return including stake; rounded down to whole demo coins.",

        payouts:
          req.params.game === "lankesh"
            ? { winningHead: 9.5 }
            : MULTIPLIERS.slice(
                0,
                JHANDI_DICE_COUNT + 1,
              ),
      });
    }),
  );

  app.get(
    "/api/dice-games/:game/state",
    wrap(async (req, res) => {
      const game = req.params.game;
      getConfig(game);

      const data = await transaction(
        pool,
        async client => {
          const customerId =
            await requireCustomer(client, req);

          const { round, now } =
            await advanceRound(client, game);

          const balance = await client.query(
            `SELECT demo_coin_balance
             FROM customers
             WHERE id=$1`,
            [customerId],
          );

          const bets = await client.query(
            `SELECT *
             FROM tsb_dice_bets
             WHERE customer_id=$1
               AND round_id=$2
             ORDER BY id`,
            [customerId, round.id],
          );

          const recent = await client.query(
            `SELECT *
             FROM tsb_dice_rounds
             WHERE game=$1
               AND settled=TRUE
             ORDER BY id DESC
             LIMIT 10`,
            [game],
          );

          return {
            success: true,
            serverTime:
              new Date(now).toISOString(),

            balance: Number(
              balance.rows[0].demo_coin_balance,
            ),

            round: roundJSON(round, now),
            bets: bets.rows.map(betJSON),

            recentResults: recent.rows.map(row => ({
              id: row.id,
              result: parseJSON(row.result),
              closedAt: row.closes_at,
            })),
          };
        },
      );

      noCache(res);
      res.json(data);
    }),
  );

  app.get(
    "/api/dice-games/:game/history",
    wrap(async (req, res) => {
      const game = req.params.game;
      getConfig(game);

      const customerId =
        await requireCustomer(pool, req);

      const result = await pool.query(
        `SELECT b.*,r.result AS round_result
         FROM tsb_dice_bets b
         JOIN tsb_dice_rounds r
           ON r.id=b.round_id
         WHERE b.customer_id=$1
           AND r.game=$2
           AND r.settled=TRUE
         ORDER BY b.id DESC
         LIMIT 50`,
        [customerId, game],
      );

      noCache(res);

      res.json({
        success: true,

        bets: result.rows.map(row => ({
          ...betJSON(row),
          result: parseJSON(row.round_result),
        })),
      });
    }),
  );

  app.post(
    "/api/dice-games/:game/bets",
    wrap(async (req, res) => {
      if (req.headers.origin) {
        let valid = false;

        try {
          valid =
            new URL(req.headers.origin).host ===
            req.headers.host;
        } catch {}

        if (!valid) {
          throw failure(
            "Invalid request origin.",
            403,
          );
        }
      }

      const game = req.params.game;
      const input = normalizeBet(game, req.body);

      const data = await transaction(
        pool,
        async client => {
          const customerId =
            await requireCustomer(client, req);

          const old = await client.query(
            `SELECT b.*,r.game
             FROM tsb_dice_bets b
             JOIN tsb_dice_rounds r
               ON r.id=b.round_id
             WHERE b.customer_id=$1
               AND b.request_key=$2`,
            [customerId, input.key],
          );

          if (old.rows[0]) {
            const previous = old.rows[0];

            const canonical = normalizeBet(
              previous.game,
              {
                requestKey: input.key,
                roundId: previous.round_id,
                bets: parseJSON(previous.bets),
              },
            );

            if (
              previous.game !== game ||
              String(previous.round_id) !==
                input.roundId ||
              JSON.stringify(canonical.bets) !==
                JSON.stringify(input.bets)
            ) {
              throw failure(
                "Request key belongs to a different bet.",
                409,
              );
            }

            const balance = await client.query(
              `SELECT demo_coin_balance
               FROM customers
               WHERE id=$1`,
              [customerId],
            );

            return {
              success: true,
              replayed: true,

              balance: Number(
                balance.rows[0].demo_coin_balance,
              ),

              bet: betJSON(previous),
            };
          }

          const { round } =
            await advanceRound(client, game);

          const customer = await client.query(
            `SELECT
               demo_coin_balance,
               status,
               must_change_password,
               must_change_withdrawal_password
             FROM customers
             WHERE id=$1
             FOR UPDATE`,
            [customerId],
          );

          const account = customer.rows[0];

          if (
            !account ||
            account.status !== "ACTIVE" ||
            account.must_change_password ||
            account.must_change_withdrawal_password
          ) {
            throw failure(
              "Customer account cannot play.",
              403,
            );
          }

          const time = await client.query(
            "SELECT clock_timestamp() AS now",
          );

          if (
            String(round.id) !== input.roundId ||
            round.settled ||
            new Date(time.rows[0].now).getTime() >=
              new Date(round.closes_at).getTime()
          ) {
            throw failure(
              "Betting closed. Wait for the next round.",
              409,
            );
          }

          const total = await client.query(
            `SELECT COALESCE(SUM(stake),0) AS stake
             FROM tsb_dice_bets
             WHERE customer_id=$1
               AND round_id=$2`,
            [customerId, round.id],
          );

          if (
            Number(total.rows[0].stake) +
              input.stake >
            25000
          ) {
            throw failure(
              "Maximum total stake per round is 25000 demo coins.",
            );
          }

          const balance =
            Number(account.demo_coin_balance) -
            input.stake;

          if (balance < 0) {
            throw failure("LOW BALANCE");
          }

          const saved = await client.query(
            `INSERT INTO tsb_dice_bets(
               customer_id,
               round_id,
               request_key,
               bets,
               stake
             )
             VALUES($1,$2,$3,$4::JSONB,$5)
             RETURNING *`,
            [
              customerId,
              round.id,
              input.key,
              JSON.stringify(input.bets),
              input.stake,
            ],
          );

          await client.query(
            `UPDATE customers
             SET demo_coin_balance=$1,
                 updated_at=NOW()
             WHERE id=$2`,
            [balance, customerId],
          );

          await client.query(
            `INSERT INTO demo_coin_transactions(
               customer_id,
               amount,
               transaction_type,
               note
             )
             VALUES($1,$2,'GAME_BET',$3)`,
            [
              customerId,
              -input.stake,
              `${game} round #${round.id} bet #${saved.rows[0].id}`,
            ],
          );

          return {
            success: true,
            replayed: false,
            balance,
            bet: betJSON(saved.rows[0]),
          };
        },
      );

      noCache(res);
      res.json(data);
    }),
  );

  let timer = null;
  let running = false;

  const tick = async () => {
    if (running) return;

    running = true;

    try {
      for (const game of Object.keys(CONFIG)) {
        await transaction(
          pool,
          client => advanceRound(client, game),
        );
      }
    } catch (error) {
      console.error(
        "Dice game round update failed:",
        error,
      );
    } finally {
      running = false;
    }
  };

  const start = () => {
    if (timer !== null) return;

    void tick();

    timer = setInterval(
      () => void tick(),
      1000,
    );

    timer.unref?.();
  };

  start.stop = () => {
    if (timer !== null) {
      clearInterval(timer);
    }

    timer = null;
  };

  return start;
}
