import { createHash, randomInt } from "node:crypto";

const LEVELS = {
  easy: {
    name: "Easy",
    lanes: 30,
    first: 1.01,
    growth: 1.02,
    speed: 1,
  },
  medium: {
    name: "Medium",
    lanes: 25,
    first: 1.05,
    growth: 1.08,
    speed: 1.4,
  },
  hard: {
    name: "Hard",
    lanes: 22,
    first: 1.10,
    growth: 1.18,
    speed: 1.9,
  },
  daredevil: {
    name: "DareDevil",
    lanes: 18,
    first: 1.20,
    growth: 1.35,
    speed: 2.5,
  },
};

const MAX_BALANCE = 2147483647;

const fail = (message, status = 400) =>
  Object.assign(new Error(message), { status });

const json = value =>
  typeof value === "string"
    ? JSON.parse(value)
    : value;

export function chickenMultiplier(difficulty, step) {
  const level = LEVELS[difficulty];

  if (
    !level ||
    !Number.isInteger(step) ||
    step < 0 ||
    step > level.lanes
  ) {
    throw fail("Invalid difficulty or lane.");
  }

  if (!step) return 100;

  return Math.round(
    level.first *
      (level.growth ** (step - 1)) *
      100,
  );
}

export const CHICKEN_TRAFFIC = Object.freeze({
  version: 2,
  baseSpeed: 220,
  maxSpeed: 820,
  acceleration: 0.1,
  trackLength: 545,
  roadHeight: 345,
  laneWidth: 106,
  sidewalkWidth: 86,
  carInset: 29,
  carWidth: 44,
  carHeight: 86,
  chickenWidth: 60,
  chickenHeight: 80,
  chickenTop: 160,
  jumpMs: 600,
  leadMs: 180,
  touchPadding: 2,
});

function trafficSpeed(difficulty, step) {
  const base =
    CHICKEN_TRAFFIC.baseSpeed *
    LEVELS[difficulty].speed;

  return (
    base +
    (CHICKEN_TRAFFIC.maxSpeed - base) *
      (
        1 -
        Math.exp(
          -CHICKEN_TRAFFIC.acceleration *
            Math.max(0, step - 1),
        )
      )
  );
}

export function chickenTrafficDistance(
  traffic,
  time,
) {
  const elapsed =
    (time - Date.parse(traffic.at)) / 1000;

  const speed = elapsed < 0
    ? (traffic.previousSpeed ?? traffic.speed)
    : traffic.speed;

  return traffic.distance + elapsed * speed;
}

export function chickenCarY(
  traffic,
  lane,
  time,
) {
  const offset =
    (((lane - 1) * 0.273 + 0.18) % 1) *
    CHICKEN_TRAFFIC.trackLength;

  const position =
    (
      (
        chickenTrafficDistance(traffic, time) +
        offset
      ) % CHICKEN_TRAFFIC.trackLength +
      CHICKEN_TRAFFIC.trackLength
    ) % CHICKEN_TRAFFIC.trackLength;

  return (lane - 1) % 2 === 0
    ? position - 100
    : 445 - position;
}

function overlapInterval(start, end, low, high) {
  const delta = end - start;

  if (Math.abs(delta) < 1e-10) {
    return start >= low && start <= high
      ? [0, 1]
      : null;
  }

  const first = (low - start) / delta;
  const last = (high - start) / delta;

  const from = Math.max(
    0,
    Math.min(first, last),
  );

  const to = Math.min(
    1,
    Math.max(first, last),
  );

  return from <= to ? [from, to] : null;
}

export function chickenTrafficCollision(
  traffic,
  fromStep,
  start,
) {
  const lane = fromStep + 1;

  const fromX = fromStep === 0
    ? 18
    : 86 + (fromStep - 1) * 106 + 23;

  const toX = 86 + (lane - 1) * 106 + 23;
  const carX = 86 + (lane - 1) * 106 + 29;

  const point = ms => ({
    x:
      fromX +
      (toX - fromX) *
        ms / CHICKEN_TRAFFIC.jumpMs -
      carX,

    y:
      CHICKEN_TRAFFIC.chickenTop -
      35 * Math.sin(
        Math.PI * ms / CHICKEN_TRAFFIC.jumpMs,
      ) -
      chickenCarY(traffic, lane, start + ms),

    carY: chickenCarY(
      traffic,
      lane,
      start + ms,
    ),
  });

  let before = point(0);

  for (
    let ms = 1;
    ms <= CHICKEN_TRAFFIC.jumpMs;
    ms++
  ) {
    const after = point(ms);

    // Cars wrap only while fully outside the visible road.
    if (
      Math.abs(after.carY - before.carY) <
      CHICKEN_TRAFFIC.trackLength / 2
    ) {
      const x = overlapInterval(
        before.x,
        after.x,
        -62,
        46,
      );

      const y = overlapInterval(
        before.y,
        after.y,
        -82,
        88,
      );

      if (
        x &&
        y &&
        Math.max(x[0], y[0]) <=
          Math.min(x[1], y[1])
      ) {
        return (
          ms - 1 +
          Math.max(x[0], y[0])
        );
      }
    }

    before = after;
  }

  return null;
}

async function databaseTime(client) {
  const value = await client.query(
    "SELECT clock_timestamp() AS now",
  );

  return new Date(value.rows[0].now).getTime();
}

async function ensureTraffic(
  client,
  session,
  now,
  rng,
) {
  if (
    !session ||
    json(session.traffic)?.version === 2
  ) {
    return session;
  }

  const traffic = {
    version: 2,
    distance: rng(0, 545000000) / 1000000,
    at: new Date(now).toISOString(),
    speed: trafficSpeed(
      session.difficulty,
      session.step,
    ),
    move: null,
  };

  const saved = await client.query(
    `UPDATE tsb_chicken_sessions
     SET traffic=$1::JSONB
     WHERE id=$2
     RETURNING *`,
    [JSON.stringify(traffic), session.id],
  );

  return saved.rows[0];
}

const payoutFor = (stake, multiplier) =>
  Math.floor(stake * multiplier / 100);

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

function sessionIdFrom(body) {
  const id = String(body?.sessionId || "");

  if (!/^[1-9][0-9]{0,18}$/.test(id)) {
    throw fail("A valid sessionId is required.");
  }

  return id;
}

function sessionJSON(row) {
  if (!row) return null;

  const level = LEVELS[row.difficulty];

  return {
    id: row.id,
    difficulty: row.difficulty,
    difficultyName: level.name,
    lanes: level.lanes,
    speed: level.speed,
    stake: row.stake,
    step: row.step,
    status: row.status,
    multiplier:
      row.multiplier_hundredths / 100,

    cashoutValue:
      row.status === "ACTIVE"
        ? payoutFor(
            row.stake,
            row.multiplier_hundredths,
          )
        : 0,

    payout: row.payout,
    traffic: row.traffic
      ? json(row.traffic)
      : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function initializeChickenRoad(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tsb_chicken_sessions (
      id BIGSERIAL PRIMARY KEY,
      customer_id INTEGER NOT NULL
        REFERENCES customers(id),

      difficulty VARCHAR(20) NOT NULL
        CHECK(
          difficulty IN (
            'easy','medium','hard','daredevil'
          )
        ),

      stake INTEGER NOT NULL
        CHECK(stake >= 10 AND stake <= 25000),

      step INTEGER NOT NULL DEFAULT 0
        CHECK(step >= 0),

      multiplier_hundredths INTEGER NOT NULL DEFAULT 100
        CHECK(multiplier_hundredths >= 100),

      status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK(
          status IN ('ACTIVE','CASHED_OUT','LOST')
        ),

      payout INTEGER NOT NULL DEFAULT 0
        CHECK(payout >= 0),

      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE tsb_chicken_sessions
      ADD COLUMN IF NOT EXISTS traffic JSONB;

    CREATE UNIQUE INDEX IF NOT EXISTS tsb_chicken_one_active
      ON tsb_chicken_sessions(customer_id)
      WHERE status='ACTIVE';

    CREATE INDEX IF NOT EXISTS tsb_chicken_history
      ON tsb_chicken_sessions(customer_id,id DESC);

    CREATE TABLE IF NOT EXISTS tsb_chicken_actions (
      id BIGSERIAL PRIMARY KEY,

      customer_id INTEGER NOT NULL
        REFERENCES customers(id),

      request_key VARCHAR(100) NOT NULL,

      action VARCHAR(20) NOT NULL
        CHECK(action IN ('play','jump','cashout')),

      input JSONB NOT NULL,
      response JSONB NOT NULL,

      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      UNIQUE(customer_id,request_key)
    );
  `);
}

async function customerSession(client, req) {
  const cookie = String(req.headers.cookie || "")
    .split(";")
    .map(value => value.trim())
    .find(value =>
      value.startsWith("tsb_demo_session="),
    );

  const token =
    cookie?.slice("tsb_demo_session=".length) || "";

  if (!/^[a-f0-9]{64}$/.test(token)) {
    throw fail("Customer login required.", 401);
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
    throw fail(
      "Login again and complete password setup.",
      401,
    );
  }

  return result.rows[0].id;
}

async function transaction(pool, fn) {
  const client = await pool.connect();
  let committed = false;

  try {
    await client.query("BEGIN");

    const result = await fn(client);

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

async function credit(
  client,
  customerId,
  balance,
  amount,
  note,
) {
  const next = balance + amount;

  if (
    !Number.isSafeInteger(next) ||
    next > MAX_BALANCE
  ) {
    throw fail("Demo balance limit reached.");
  }

  await client.query(
    `UPDATE customers
     SET demo_coin_balance=$1,
         updated_at=NOW()
     WHERE id=$2`,
    [next, customerId],
  );

  await client.query(
    `INSERT INTO demo_coin_transactions(
       customer_id,amount,transaction_type,note
     )
     VALUES($1,$2,'GAME_WIN',$3)`,
    [customerId, amount, note],
  );

  return next;
}

export function registerChickenRoadRoutes(
  app,
  pool,
  { rng = randomInt } = {},
) {
  const wrap = fn => (req, res, next) =>
    Promise.resolve(fn(req, res)).catch(next);

  const send = (res, data) => {
    res.set("Cache-Control", "no-store");
    res.json(data);
  };

  app.get(
    "/api/chicken-road/rules",
    wrap(async (req, res) => {
      await customerSession(pool, req);

      const levels = Object.fromEntries(
        Object.entries(LEVELS).map(([id, level]) => [
          id,
          {
            ...level,

            multipliers: Array.from(
              { length: level.lanes },
              (_, i) =>
                chickenMultiplier(id, i + 1) / 100,
            ),
          },
        ]),
      );

      send(res, {
        success: true,
        demoOnly: true,
        minStake: 10,
        maxStake: 25000,
        levels,
        manualJumpOnly: true,
        timeLimitSeconds: null,
        cashoutAtStartReturnsStake: true,
        collisionMode: "SERVER_TRAFFIC_CONTACT",
        traffic: CHICKEN_TRAFFIC,

        roundingNote:
          "Payouts are rounded down to whole demo coins.",

        payoutMeaning:
          "Total return including stake, rounded down to whole demo coins.",

        rules:
          "Car and chicken contact is checked by the server during each jump. Even edge contact ends the round. Traffic starts from a random position and accelerates with progress. Completed lanes are safe while waiting. Timing your jump affects whether you avoid traffic. At the final lane, the game cashes out automatically.",
      });
    }),
  );

  app.get(
    "/api/chicken-road/state",
    wrap(async (req, res) => {
      const data = await transaction(
        pool,
        async client => {
          const customerId =
            await customerSession(client, req);

          const account = await client.query(
            `SELECT demo_coin_balance
             FROM customers
             WHERE id=$1
             FOR UPDATE`,
            [customerId],
          );

          const latest = await client.query(
            `SELECT *
             FROM tsb_chicken_sessions
             WHERE customer_id=$1
             ORDER BY id DESC
             LIMIT 1`,
            [customerId],
          );

          const now = await databaseTime(client);

          const session =
            latest.rows[0]?.status === "ACTIVE"
              ? await ensureTraffic(
                  client,
                  latest.rows[0],
                  now,
                  rng,
                )
              : latest.rows[0];

          return {
            success: true,
            serverTime: new Date(now).toISOString(),
            collisionMode: "SERVER_TRAFFIC_CONTACT",

            balance: Number(
              account.rows[0].demo_coin_balance,
            ),

            session: sessionJSON(session),
          };
        },
      );

      send(res, data);
    }),
  );

  app.get(
    "/api/chicken-road/history",
    wrap(async (req, res) => {
      const customerId =
        await customerSession(pool, req);

      const result = await pool.query(
        `SELECT *
         FROM tsb_chicken_sessions
         WHERE customer_id=$1
           AND status<>'ACTIVE'
         ORDER BY id DESC
         LIMIT 50`,
        [customerId],
      );

      send(res, {
        success: true,
        sessions: result.rows.map(sessionJSON),
      });
    }),
  );

  for (const action of ["play", "jump", "cashout"]) {
    app.post(
      `/api/chicken-road/${action}`,
      wrap(async (req, res) => {
        if (req.headers.origin) {
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

        const key = keyFrom(req.body);
        let input;

        if (action === "play") {
          const { difficulty, amount } = req.body;

          if (
            !Object.hasOwn(LEVELS, difficulty) ||
            !Number.isSafeInteger(amount) ||
            amount < 10 ||
            amount > 25000
          ) {
            throw fail(
              "Choose a valid difficulty and 10-25000 whole demo coins.",
            );
          }

          input = { difficulty, amount };
        } else {
          input = {
            sessionId: sessionIdFrom(req.body),
          };
        }

        const data = await transaction(
          pool,
          async client => {
            const customerId =
              await customerSession(client, req);

            const account = await client.query(
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

            let balance = Number(
              customer.demo_coin_balance,
            );

            const now = await databaseTime(client);

            const previous = await client.query(
              `SELECT *
               FROM tsb_chicken_actions
               WHERE customer_id=$1
                 AND request_key=$2`,
              [customerId, key],
            );

            if (previous.rows[0]) {
              const old = previous.rows[0];
              const savedInput = json(old.input);

              const same =
                action === "play"
                  ? savedInput.difficulty ===
                      input.difficulty &&
                    savedInput.amount === input.amount
                  : String(savedInput.sessionId) ===
                    input.sessionId;

              if (old.action !== action || !same) {
                throw fail(
                  "Request key belongs to a different action.",
                  409,
                );
              }

              return {
                ...json(old.response),
                replayed: true,
                balance,
                serverTime: new Date(now).toISOString(),
              };
            }

            let session;
            let event;

            if (action === "play") {
              const existing = await client.query(
                `SELECT id
                 FROM tsb_chicken_sessions
                 WHERE customer_id=$1
                   AND status='ACTIVE'
                 LIMIT 1`,
                [customerId],
              );

              if (existing.rows.length) {
                throw fail(
                  "Finish or cash out the active game first.",
                  409,
                );
              }

              if (balance < input.amount) {
                throw fail("LOW BALANCE");
              }

              const maximumReturn = payoutFor(
                input.amount,
                chickenMultiplier(
                  input.difficulty,
                  LEVELS[input.difficulty].lanes,
                ),
              );

              if (
                balance -
                  input.amount +
                  maximumReturn >
                MAX_BALANCE
              ) {
                throw fail(
                  "Demo balance limit: cash out or reduce your demo balance before starting.",
                );
              }

              const created = await client.query(
                `INSERT INTO tsb_chicken_sessions(
                   customer_id,difficulty,stake
                 )
                 VALUES($1,$2,$3)
                 RETURNING *`,
                [
                  customerId,
                  input.difficulty,
                  input.amount,
                ],
              );

              session = await ensureTraffic(
                client,
                created.rows[0],
                now,
                rng,
              );

              balance -= input.amount;

              await client.query(
                `UPDATE customers
                 SET demo_coin_balance=$1,
                     updated_at=NOW()
                 WHERE id=$2`,
                [balance, customerId],
              );

              await client.query(
                `INSERT INTO demo_coin_transactions(
                   customer_id,amount,transaction_type,note
                 )
                 VALUES($1,$2,'GAME_BET',$3)`,
                [
                  customerId,
                  -input.amount,
                  `chicken-road session #${session.id}`,
                ],
              );

              event = "STARTED";
            } else {
              const selected = await client.query(
                `SELECT *
                 FROM tsb_chicken_sessions
                 WHERE id=$1
                   AND customer_id=$2
                 FOR UPDATE`,
                [input.sessionId, customerId],
              );

              session = selected.rows[0];

              if (!session) {
                throw fail("Game session not found.", 404);
              }

              if (session.status !== "ACTIVE") {
                throw fail(
                  "This game has already finished.",
                  409,
                );
              }

              session = await ensureTraffic(
                client,
                session,
                now,
                rng,
              );

              const oldTraffic = json(session.traffic);

              if (
                oldTraffic.move &&
                now <
                  Date.parse(oldTraffic.move.startAt) +
                    CHICKEN_TRAFFIC.jumpMs
              ) {
                throw fail(
                  "The chicken is still jumping. Wait for it to land.",
                  409,
                );
              }

              if (action === "cashout") {
                const payout = payoutFor(
                  session.stake,
                  session.multiplier_hundredths,
                );

                balance = await credit(
                  client,
                  customerId,
                  balance,
                  payout,
                  `chicken-road session #${session.id} cashout`,
                );

                const updated = await client.query(
                  `UPDATE tsb_chicken_sessions
                   SET status='CASHED_OUT',
                       payout=$1,
                       updated_at=NOW()
                   WHERE id=$2
                   RETURNING *`,
                  [payout, session.id],
                );

                session = updated.rows[0];
                event = "CASHED_OUT";
              } else {
                const nextStep = session.step + 1;

                const start =
                  now + CHICKEN_TRAFFIC.leadMs;

                const traffic = {
                  ...oldTraffic,

                  distance: chickenTrafficDistance(
                    oldTraffic,
                    start,
                  ),

                  at: new Date(start).toISOString(),
                  previousSpeed: oldTraffic.speed,

                  speed: trafficSpeed(
                    session.difficulty,
                    nextStep,
                  ),

                  move: null,
                };

                const hitMs = chickenTrafficCollision(
                  traffic,
                  session.step,
                  start,
                );

                traffic.move = {
                  fromStep: session.step,
                  toStep: nextStep,
                  startAt: new Date(start).toISOString(),
                  durationMs: CHICKEN_TRAFFIC.jumpMs,
                  hitMs,
                  outcome:
                    hitMs === null
                      ? "SAFE"
                      : "COLLISION",
                };

                const savedTraffic = await client.query(
                  `UPDATE tsb_chicken_sessions
                   SET traffic=$1::JSONB
                   WHERE id=$2
                   RETURNING *`,
                  [
                    JSON.stringify(traffic),
                    session.id,
                  ],
                );

                session = savedTraffic.rows[0];

                if (hitMs !== null) {
                  const updated = await client.query(
                    `UPDATE tsb_chicken_sessions
                     SET status='LOST',
                         payout=0,
                         updated_at=NOW()
                     WHERE id=$1
                     RETURNING *`,
                    [session.id],
                  );

                  session = updated.rows[0];
                  event = "COLLISION";
                } else {
                  const finalLane =
                    nextStep ===
                    LEVELS[session.difficulty].lanes;

                  const multiplier =
                    chickenMultiplier(
                      session.difficulty,
                      nextStep,
                    );

                  const payout = finalLane
                    ? payoutFor(
                        session.stake,
                        multiplier,
                      )
                    : 0;

                  if (finalLane) {
                    balance = await credit(
                      client,
                      customerId,
                      balance,
                      payout,
                      `chicken-road session #${session.id} final lane`,
                    );
                  }

                  const updated = await client.query(
                    `UPDATE tsb_chicken_sessions
                     SET step=$1,
                         multiplier_hundredths=$2,
                         status=$3,
                         payout=$4,
                         updated_at=NOW()
                     WHERE id=$5
                     RETURNING *`,
                    [
                      nextStep,
                      multiplier,
                      finalLane
                        ? "CASHED_OUT"
                        : "ACTIVE",
                      payout,
                      session.id,
                    ],
                  );

                  session = updated.rows[0];

                  event = finalLane
                    ? "COMPLETED"
                    : "SAFE";
                }
              }
            }

            const response = {
              success: true,
              replayed: false,
              serverTime: new Date(now).toISOString(),
              collisionMode: "SERVER_TRAFFIC_CONTACT",
              event,
              balance,
              session: sessionJSON(session),
            };

            await client.query(
              `INSERT INTO tsb_chicken_actions(
                 customer_id,
                 request_key,
                 action,
                 input,
                 response
               )
               VALUES($1,$2,$3,$4::JSONB,$5::JSONB)`,
              [
                customerId,
                key,
                action,
                JSON.stringify(input),
                JSON.stringify(response),
              ],
            );

            return response;
          },
        );

        send(res, data);
      }),
    );
  }
}
