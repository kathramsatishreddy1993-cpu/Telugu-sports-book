import {
  createHash,
  randomBytes,
  randomInt,
} from "node:crypto";

const LOCK_ID = 824063;
const OPEN_DELAY_MS = 5000;
const BET_MS = 30000;
const SPIN_MS = 10000;
const STOP_MS = 9000;

// Result remains visible without another spin.
const RESULT_MS = 5000;
const MAX_BONUS_SPINS = 3;
const MAX_BALANCE = 2147483647;

const NUMBERS = ["1", "2", "5", "10", "20", "40"];

const HISTORICAL_NUMBERS = Array.from(
  { length: 40 },
  (_, index) => String(index + 1),
);

const BONUS = {
  "2x": 2,
  "7x": 7,
};

const COUNTS = {
  "1": 23,
  "2": 15,
  "5": 7,
  "10": 4,
  "20": 2,
  "40": 1,
};

const numbered = Object.entries(COUNTS)
  .flatMap(([value, count]) =>
    Array.from(
      { length: count },
      (_, index) => ({
        value,
        rank: (index + 0.5) / count,
      }),
    ),
  )
  .sort((a, b) => a.rank - b.rank)
  .map(item => item.value);

numbered.splice(8, 0, "2x");
numbered.splice(36, 0, "7x");

export const DREAM_SEGMENTS =
  Object.freeze(numbered);

const fail = (message, status = 400) =>
  Object.assign(new Error(message), { status });

const json = value =>
  typeof value === "string"
    ? JSON.parse(value)
    : value;

const digest = value =>
  createHash("sha256")
    .update(value)
    .digest("hex");

function cookie(req, name) {
  return (
    String(req.headers.cookie || "")
      .split(";")
      .map(value => value.trim())
      .find(value =>
        value.startsWith(`${name}=`),
      )
      ?.slice(name.length + 1) || ""
  );
}

function keyFrom(body) {
  const key = body?.requestKey;

  if (
    typeof key !== "string" ||
    !/^[A-Za-z0-9_-]{16,100}$/.test(key)
  ) {
    throw fail(
      "A unique requestKey of 16-100 characters is required.",
    );
  }

  return key;
}

function validatePlan(value, allowed) {
  if (
    !Array.isArray(value) ||
    value.length < 1 ||
    value.length > MAX_BONUS_SPINS + 1 ||
    value.some(item => typeof item !== "string")
  ) {
    throw fail(
      "Plan needs zero to three bonus factors followed by one number.",
    );
  }

  if (
    !allowed.includes(value[value.length - 1]) ||
    value
      .slice(0, -1)
      .some(item => !Object.hasOwn(BONUS, item))
  ) {
    throw fail(
      "Only 2x/7x bonuses may precede the final number.",
    );
  }

  return [...value];
}

export function validateDreamPlan(value) {
  return validatePlan(value, NUMBERS);
}

export function dreamReturn(bets, plan) {
  const values = plan.map(step =>
    typeof step === "string"
      ? step
      : step.value,
  );

  validatePlan(values, HISTORICAL_NUMBERS);

  const winner = values[values.length - 1];

  const multiplier = values
    .slice(0, -1)
    .reduce(
      (product, value) => product * BONUS[value],
      1,
    );

  const profitOdds = Number(winner) * multiplier;

  const areas = bets.map(bet => ({
    ...bet,
    win: bet.area === winner,
    payout:
      bet.area === winner
        ? bet.amount * (1 + profitOdds)
        : 0,
  }));

  return {
    winner,
    bonusMultiplier: multiplier,
    profitOdds,
    areas,
    payout: areas.reduce(
      (sum, bet) => sum + bet.payout,
      0,
    ),
  };
}

function normalizeBet(body) {
  const key = keyFrom(body);
  const roundId = String(body?.roundId || "");

  if (
    !/^[1-9][0-9]{0,18}$/.test(roundId) ||
    !Array.isArray(body.bets) ||
    !body.bets.length ||
    body.bets.length > NUMBERS.length
  ) {
    throw fail(
      "Choose a valid round and betting areas.",
    );
  }

  const seen = new Set();

  const bets = body.bets
    .map(bet => {
      if (
        !bet ||
        !NUMBERS.includes(bet.area) ||
        seen.has(bet.area) ||
        !Number.isSafeInteger(bet.amount) ||
        bet.amount < 10 ||
        bet.amount > 25000
      ) {
        throw fail(
          "Choose distinct numbers with 10-25000 whole demo coins each.",
        );
      }

      seen.add(bet.area);

      return {
        area: bet.area,
        amount: bet.amount,
      };
    })
    .sort(
      (a, b) => Number(a.area) - Number(b.area),
    );

  const stake = bets.reduce(
    (sum, bet) => sum + bet.amount,
    0,
  );

  if (stake > 25000) {
    throw fail(
      "Maximum total stake per round is 25000 demo coins.",
    );
  }

  return { key, roundId, bets, stake };
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

    const data = await operation(client);

    await client.query("COMMIT");
    committed = true;

    return data;
  } finally {
    if (!committed) {
      await client
        .query("ROLLBACK")
        .catch(() => {});
    }

    client.release();
  }
}

async function nowAt(client) {
  const result = await client.query(
    "SELECT clock_timestamp() AS now",
  );

  return new Date(
    result.rows[0].now,
  ).getTime();
}

async function requireCustomer(client, req) {
  const token = cookie(req, "tsb_demo_session");

  if (!/^[a-f0-9]{64}$/.test(token)) {
    throw fail("Customer login required.", 401);
  }

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
    [digest(token)],
  );

  if (!result.rows.length) {
    throw fail(
      "Login again and complete password setup.",
      401,
    );
  }

  return result.rows[0].id;
}

async function requireDreamController(client, req) {
  const token = cookie(
    req,
    "tsb_game_controller",
  );

  if (!/^[a-f0-9]{64}$/.test(token)) {
    throw fail(
      "Dream Wheel controller login required.",
      401,
    );
  }

  const result = await client.query(
    `SELECT a.id,a.login_id
     FROM tsb_game_account_sessions s
     JOIN tsb_game_controller_accounts a
       ON a.id=s.account_id
     WHERE s.token_hash=$1
       AND (
         s.expires_at IS NULL
         OR s.expires_at>NOW()
       )
       AND s.auth_version=a.auth_version
       AND a.status='ACTIVE'
       AND a.deleted_at IS NULL
       AND a.must_change_password=FALSE
       AND a.game='DREAM_WHEEL'
     FOR SHARE OF a`,
    [digest(token)],
  );

  if (!result.rows.length) {
    throw fail(
      "An active Dream Wheel controller ID with password setup completed is required.",
      403,
    );
  }

  return result.rows[0];
}

export async function initializeDreamWheel(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tsb_dream_rounds (
      id BIGSERIAL PRIMARY KEY,
      controller_id INTEGER NOT NULL
        REFERENCES tsb_game_controller_accounts(id),
      request_key VARCHAR(100) NOT NULL,
      plan JSONB NOT NULL,
      salt TEXT NOT NULL,
      commitment TEXT NOT NULL,
      opens_at TIMESTAMPTZ NOT NULL,
      closes_at TIMESTAMPTZ NOT NULL,
      reveals_at TIMESTAMPTZ NOT NULL,
      ends_at TIMESTAMPTZ NOT NULL,
      settled BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(controller_id,request_key),
      CHECK(
        opens_at < closes_at
        AND closes_at < reveals_at
        AND reveals_at < ends_at
      )
    );

    CREATE UNIQUE INDEX IF NOT EXISTS
      tsb_dream_one_unsettled
      ON tsb_dream_rounds((TRUE))
      WHERE settled=FALSE;

    CREATE TABLE IF NOT EXISTS tsb_dream_bets (
      id BIGSERIAL PRIMARY KEY,
      customer_id INTEGER NOT NULL
        REFERENCES customers(id),
      round_id BIGINT NOT NULL
        REFERENCES tsb_dream_rounds(id),
      request_key VARCHAR(100) NOT NULL,
      bets JSONB NOT NULL,
      stake INTEGER NOT NULL
        CHECK(stake > 0 AND stake <= 25000),
      payout INTEGER
        CHECK(payout IS NULL OR payout >= 0),
      settlement JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(customer_id,request_key)
    );

    CREATE INDEX IF NOT EXISTS
      tsb_dream_bets_round
      ON tsb_dream_bets(round_id,customer_id);

    CREATE INDEX IF NOT EXISTS
      tsb_dream_bets_history
      ON tsb_dream_bets(customer_id,id DESC);

    CREATE OR REPLACE FUNCTION
      tsb_dream_plan_locked()
      RETURNS trigger
      LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.controller_id
           IS DISTINCT FROM OLD.controller_id
        OR NEW.request_key
           IS DISTINCT FROM OLD.request_key
        OR NEW.plan IS DISTINCT FROM OLD.plan
        OR NEW.salt IS DISTINCT FROM OLD.salt
        OR NEW.commitment
           IS DISTINCT FROM OLD.commitment
        OR NEW.opens_at
           IS DISTINCT FROM OLD.opens_at
        OR NEW.closes_at
           IS DISTINCT FROM OLD.closes_at
        OR NEW.reveals_at
           IS DISTINCT FROM OLD.reveals_at
        OR NEW.ends_at
           IS DISTINCT FROM OLD.ends_at
        OR (
          OLD.settled=TRUE
          AND NEW.settled=FALSE
        )
      THEN
        RAISE EXCEPTION
          'Dream Wheel plan and timing are locked';
      END IF;

      RETURN NEW;
    END;
    $$;

    DROP TRIGGER IF EXISTS
      tsb_dream_lock_plan
      ON tsb_dream_rounds;

    CREATE TRIGGER tsb_dream_lock_plan
      BEFORE UPDATE ON tsb_dream_rounds
      FOR EACH ROW
      EXECUTE FUNCTION tsb_dream_plan_locked();
  `);
}

async function advanceRound(client) {
  const latest = await client.query(
    `SELECT *
     FROM tsb_dream_rounds
     ORDER BY id DESC
     LIMIT 1
     FOR UPDATE`,
  );

  let round = latest.rows[0];
  const now = await nowAt(client);

  if (
    round &&
    !round.settled &&
    now >= new Date(round.reveals_at).getTime()
  ) {
    const records = await client.query(
      `SELECT *
       FROM tsb_dream_bets
       WHERE round_id=$1
         AND payout IS NULL
       ORDER BY customer_id,id
       FOR UPDATE`,
      [round.id],
    );

    for (const bet of records.rows) {
      const result = dreamReturn(
        json(bet.bets),
        json(round.plan),
      );

      if (result.payout > 0) {
        const credited = await client.query(
          `UPDATE customers
           SET demo_coin_balance=
                 demo_coin_balance+$1,
               updated_at=NOW()
           WHERE id=$2
             AND demo_coin_balance <= $3
           RETURNING id`,
          [
            result.payout,
            bet.customer_id,
            MAX_BALANCE - result.payout,
          ],
        );

        if (!credited.rows.length) {
          throw fail(
            "Demo balance limit prevents settlement.",
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
            result.payout,
            `dream-wheel round #${round.id} bet #${bet.id} return`,
          ],
        );
      }

      await client.query(
        `UPDATE tsb_dream_bets
         SET payout=$1,
             settlement=$2::JSONB
         WHERE id=$3`,
        [
          result.payout,
          JSON.stringify(result),
          bet.id,
        ],
      );
    }

    await client.query(
      `UPDATE tsb_dream_rounds
       SET settled=TRUE
       WHERE id=$1`,
      [round.id],
    );

    round = {
      ...round,
      settled: true,
    };
  }

  return { round, now };
}

function publicRound(round, now) {
  if (!round) return null;

  const plan = json(round.plan).map(step => ({
    value: step.value,
    segment: Number(step.segment),
  }));

  const opens =
    new Date(round.opens_at).getTime();

  const closes =
    new Date(round.closes_at).getTime();

  const reveals =
    new Date(round.reveals_at).getTime();

  // Preserve already published historical rounds.
  const singleSpin =
    reveals - closes === SPIN_MS;

  const final =
    now >= reveals && round.settled;

  const phase =
    now < opens
      ? "WAITING"
      : now < closes
        ? "BETTING"
        : final
          ? now < new Date(round.ends_at).getTime()
            ? "RESULT"
            : "FINISHED"
          : "SPINNING";

  const revealed = final
    ? plan
    : singleSpin
      ? []
      : plan.slice(
          0,
          Math.max(
            0,
            Math.floor(
              (now - closes) / SPIN_MS,
            ),
          ),
        );

  const spinIndex = singleSpin
    ? plan.length - 1
    : Math.min(
        plan.length - 1,
        Math.max(
          0,
          Math.floor(
            (now - closes) / SPIN_MS,
          ),
        ),
      );

  const starts = singleSpin
    ? closes
    : closes + spinIndex * SPIN_MS;

  // The landing target is public only after
  // betting has closed. It never changes later.
  const activeSpin =
    now >= closes
      ? {
          key: `${round.id}:${
            singleSpin ? "single" : spinIndex
          }`,
          value: plan[spinIndex].value,
          segment: plan[spinIndex].segment,
          startsAt:
            new Date(starts).toISOString(),
          stopsAt:
            new Date(starts + STOP_MS)
              .toISOString(),
          revealsAt:
            new Date(starts + SPIN_MS)
              .toISOString(),
        }
      : null;

  return {
    id: round.id,
    mode: "CONTROLLER_PLANNED_DEMO",
    animationVersion: 2,
    singleSpin,
    commitment: round.commitment,
    opensAt: round.opens_at,
    closesAt: round.closes_at,
    phase,
    revealedSpins: revealed,
    activeSpin,

    spinNumber:
      phase === "SPINNING"
        ? singleSpin
          ? 1
          : spinIndex + 1
        : null,

    spinEndsAt:
      phase === "SPINNING"
        ? activeSpin.revealsAt
        : null,

    bonusMultiplier: final
      ? dreamReturn([], plan).bonusMultiplier
      : singleSpin
        ? 1
        : revealed.reduce(
            (product, step) =>
              product * (BONUS[step.value] || 1),
            1,
          ),

    endsAt: final ? round.ends_at : null,
    result: final ? dreamReturn([], plan) : null,

    proof: final
      ? {
          plan,
          salt: round.salt,
          commitment: round.commitment,
          algorithm:
            "SHA256(JSON.stringify(plan) + ':' + salt)",
        }
      : null,
  };
}

const betJSON = row => ({
  id: row.id,
  roundId: row.round_id,
  bets: json(row.bets),
  stake: row.stake,
  payout: row.payout,
  settlement: row.settlement
    ? json(row.settlement)
    : null,
  createdAt: row.created_at,
});

function originCheck(req) {
  if (!req.headers.origin) return;

  let valid = false;

  try {
    valid =
      new URL(req.headers.origin).host ===
      req.headers.host;
  } catch {}

  if (!valid) {
    throw fail("Invalid request origin.", 403);
  }
}

export function registerDreamWheelRoutes(app, pool) {
  const wrap = fn => (req, res, next) =>
    Promise.resolve(fn(req, res)).catch(next);

  const send = (res, value) => {
    res.set("Cache-Control", "no-store");
    res.json(value);
  };

  app.get(
    "/api/dream-wheel/rules",
    wrap(async (req, res) => {
      await requireCustomer(pool, req);

      send(res, {
        success: true,
        demoOnly: true,
        resultMode: "CONTROLLER_PLANNED_DEMO",
        segments: DREAM_SEGMENTS,
        areas: NUMBERS,
        bettingSeconds: 30,
        spinSeconds: 10,
        stopSeconds: 9,
        resultSeconds: 5,
        maxBonusSpins: MAX_BONUS_SPINS,
        singleSpin: true,
        animationVersion: 2,
        minAreaStake: 10,
        maxRoundStake: 25000,

        payoutMeaning:
          "Number labels are profit odds. Winning total return = stake + stake × number × accumulated bonus multiplier. Other areas return zero.",

        rules:
          "A controller locks the entire round plan before betting. Selected 2x/7x bonus factors multiply the final payout without adding more spins. New rounds have one 10-second lock: the wheel stops by second 9 and the result appears at second 10. The AI host gives one push at the outer rim, then releases the wheel. This is animation, not live video. No round opens until a controller publishes a plan.",
      });
    }),
  );

  app.get(
    "/api/dream-wheel/state",
    wrap(async (req, res) => {
      const value = await transaction(
        pool,
        async client => {
          const customerId =
            await requireCustomer(client, req);

          const { round, now } =
            await advanceRound(client);

          const balance = await client.query(
            `SELECT demo_coin_balance
             FROM customers
             WHERE id=$1`,
            [customerId],
          );

          const bets = round
            ? await client.query(
                `SELECT *
                 FROM tsb_dream_bets
                 WHERE customer_id=$1
                   AND round_id=$2
                 ORDER BY id`,
                [customerId, round.id],
              )
            : { rows: [] };

          const recent = await client.query(
            `SELECT *
             FROM tsb_dream_rounds
             WHERE settled=TRUE
             ORDER BY id DESC
             LIMIT 10`,
          );

          return {
            success: true,
            serverTime:
              new Date(now).toISOString(),
            balance: Number(
              balance.rows[0].demo_coin_balance,
            ),
            round: publicRound(round, now),
            bets: bets.rows.map(betJSON),

            recentResults: recent.rows.map(row => ({
              id: row.id,
              result: dreamReturn(
                [],
                json(row.plan),
              ),
            })),
          };
        },
      );

      send(res, value);
    }),
  );

  app.get(
    "/api/dream-wheel/history",
    wrap(async (req, res) => {
      const customerId =
        await requireCustomer(pool, req);

      const records = await pool.query(
        `SELECT b.*,r.plan
         FROM tsb_dream_bets b
         JOIN tsb_dream_rounds r
           ON r.id=b.round_id
         WHERE b.customer_id=$1
           AND r.settled=TRUE
         ORDER BY b.id DESC
         LIMIT 50`,
        [customerId],
      );

      send(res, {
        success: true,

        bets: records.rows.map(row => ({
          ...betJSON(row),
          result: dreamReturn([], json(row.plan)),
        })),
      });
    }),
  );

  app.post(
    "/api/dream-wheel/bets",
    wrap(async (req, res) => {
      originCheck(req);

      const input = normalizeBet(req.body);

      const value = await transaction(
        pool,
        async client => {
          const customerId =
            await requireCustomer(client, req);

          const old = await client.query(
            `SELECT *
             FROM tsb_dream_bets
             WHERE customer_id=$1
               AND request_key=$2`,
            [customerId, input.key],
          );

          if (old.rows[0]) {
            const previous = old.rows[0];

            const canonical = normalizeBet({
              requestKey: input.key,
              roundId: previous.round_id,
              bets: json(previous.bets),
            });

            if (
              String(previous.round_id) !==
                input.roundId ||
              JSON.stringify(canonical.bets) !==
                JSON.stringify(input.bets)
            ) {
              throw fail(
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
            await advanceRound(client);

          const account = await client.query(
            `SELECT *
             FROM customers
             WHERE id=$1
             FOR UPDATE`,
            [customerId],
          );

          const customer = account.rows[0];

          if (
            !customer ||
            customer.status !== "ACTIVE" ||
            customer.must_change_password ||
            customer.must_change_withdrawal_password
          ) {
            throw fail(
              "Customer account cannot play.",
              403,
            );
          }

          const now = await nowAt(client);

          if (
            !round ||
            String(round.id) !== input.roundId ||
            round.settled ||
            now <
              new Date(round.opens_at).getTime() ||
            now >=
              new Date(round.closes_at).getTime()
          ) {
            throw fail(
              "Betting is not open for this round.",
              409,
            );
          }

          const total = await client.query(
            `SELECT COALESCE(SUM(stake),0) AS stake
             FROM tsb_dream_bets
             WHERE customer_id=$1
               AND round_id=$2`,
            [customerId, round.id],
          );

          if (
            Number(total.rows[0].stake) +
              input.stake >
            25000
          ) {
            throw fail(
              "Maximum total stake per round is 25000 demo coins.",
            );
          }

          const balance =
            Number(customer.demo_coin_balance) -
            input.stake;

          if (balance < 0) {
            throw fail("LOW BALANCE");
          }

          const saved = await client.query(
            `INSERT INTO tsb_dream_bets(
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
              `dream-wheel round #${round.id} bet #${saved.rows[0].id}`,
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

      send(res, value);
    }),
  );

  app.get(
    "/api/dream-wheel/controller/state",
    wrap(async (req, res) => {
      const value = await transaction(
        pool,
        async client => {
          const controller =
            await requireDreamController(
              client,
              req,
            );

          const { round, now } =
            await advanceRound(client);

          return {
            success: true,
            controllerId: controller.login_id,
            serverTime:
              new Date(now).toISOString(),

            round: round
              ? {
                  ...publicRound(round, now),
                  lockedPlan: json(round.plan),
                }
              : null,
          };
        },
      );

      send(res, value);
    }),
  );

  app.post(
    "/api/dream-wheel/controller/rounds",
    wrap(async (req, res) => {
      originCheck(req);

      const key = keyFrom(req.body);
      const outcomes = validateDreamPlan(
        req.body.outcomes,
      );

      const value = await transaction(
        pool,
        async client => {
          const controller =
            await requireDreamController(
              client,
              req,
            );

          const old = await client.query(
            `SELECT *
             FROM tsb_dream_rounds
             WHERE controller_id=$1
               AND request_key=$2`,
            [controller.id, key],
          );

          if (old.rows[0]) {
            const previous = json(
              old.rows[0].plan,
            ).map(step => step.value);

            if (
              JSON.stringify(previous) !==
              JSON.stringify(outcomes)
            ) {
              throw fail(
                "Request key belongs to a different plan.",
                409,
              );
            }

            return {
              success: true,
              replayed: true,
              roundId: old.rows[0].id,
              commitment:
                old.rows[0].commitment,
            };
          }

          const { round, now } =
            await advanceRound(client);

          if (
            round &&
            (
              !round.settled ||
              now <
                new Date(round.ends_at).getTime()
            )
          ) {
            throw fail(
              "Wait until the current round finishes.",
              409,
            );
          }

          const plan = outcomes.map(value => {
            const matching = DREAM_SEGMENTS
              .map((segment, index) =>
                segment === value
                  ? index
                  : -1,
              )
              .filter(index => index >= 0);

            return {
              value,
              segment:
                matching[
                  randomInt(0, matching.length)
                ],
            };
          });

          const salt = randomBytes(32)
            .toString("hex");

          const commitment = digest(
            JSON.stringify(plan) + ":" + salt,
          );

          const opens = now + OPEN_DELAY_MS;
          const closes = opens + BET_MS;

          // Always one 10-second lock window.
          const reveals = closes + SPIN_MS;

          const saved = await client.query(
            `INSERT INTO tsb_dream_rounds(
               controller_id,
               request_key,
               plan,
               salt,
               commitment,
               opens_at,
               closes_at,
               reveals_at,
               ends_at
             )
             VALUES(
               $1,$2,$3::JSONB,$4,$5,
               $6,$7,$8,$9
             )
             RETURNING *`,
            [
              controller.id,
              key,
              JSON.stringify(plan),
              salt,
              commitment,
              new Date(opens),
              new Date(closes),
              new Date(reveals),
              new Date(reveals + RESULT_MS),
            ],
          );

          return {
            success: true,
            replayed: false,
            roundId: saved.rows[0].id,
            commitment,
          };
        },
      );

      send(res, value);
    }),
  );

  let timer = null;
  let running = false;

  const tick = async () => {
    if (running) return;

    running = true;

    try {
      await transaction(
        pool,
        client => advanceRound(client),
      );
    } catch (error) {
      console.error(
        "Dream Wheel round update failed:",
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
