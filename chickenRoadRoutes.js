import {
  createHash,
  randomInt,
} from "node:crypto";

// Original demo defaults.
// Multipliers are total returns including stake.
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

const SCALE = 1000000000;
const MAX_BALANCE = 2147483647;

const fail = (
  message,
  status = 400,
) =>
  Object.assign(
    new Error(message),
    { status },
  );

const json = value =>
  typeof value === "string"
    ? JSON.parse(value)
    : value;

export function chickenMultiplier(
  difficulty,
  step,
) {
  const level =
    LEVELS[difficulty];

  if (
    !level ||
    !Number.isInteger(step) ||
    step < 0 ||
    step > level.lanes
  ) {
    throw fail(
      "Invalid difficulty or lane.",
    );
  }

  if (!step) return 100;

  // Integer hundredths:
  // 101 means 1.01x.
  return Math.round(
    level.first *
      (
        level.growth **
        (step - 1)
      ) *
      100,
  );
}

export function chickenCrossing(
  difficulty,
  step,
  rng = randomInt,
) {
  const previous =
    chickenMultiplier(
      difficulty,
      step - 1,
    );

  const next =
    chickenMultiplier(
      difficulty,
      step,
    );

  // Apply the demo return factor
  // on the first crossing.
  const threshold = Math.floor(
    SCALE *
      previous /
      next *
      (
        step === 1
          ? 0.97
          : 1
      ),
  );

  return {
    safe:
      rng(0, SCALE) <
      threshold,

    multiplierHundredths:
      next,
  };
}

const payoutFor = (
  stake,
  multiplier,
) =>
  Math.floor(
    stake * multiplier / 100,
  );

function keyFrom(body) {
  const key =
    body?.requestKey;

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
  const id = String(
    body?.sessionId || "",
  );

  if (
    !/^[1-9][0-9]{0,18}$/.test(id)
  ) {
    throw fail(
      "A valid sessionId is required.",
    );
  }

  return id;
}

function sessionJSON(row) {
  if (!row) return null;

  const level =
    LEVELS[row.difficulty];

  return {
    id: row.id,

    difficulty:
      row.difficulty,

    difficultyName:
      level.name,

    lanes:
      level.lanes,

    speed:
      level.speed,

    stake:
      row.stake,

    step:
      row.step,

    status:
      row.status,

    multiplier:
      row.multiplier_hundredths /
      100,

    cashoutValue:
      row.status === "ACTIVE"
        ? payoutFor(
            row.stake,
            row.multiplier_hundredths,
          )
        : 0,

    payout:
      row.payout,

    createdAt:
      row.created_at,

    updatedAt:
      row.updated_at,
  };
}

export async function initializeChickenRoad(
  pool,
) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tsb_chicken_sessions (
      id BIGSERIAL PRIMARY KEY,

      customer_id INTEGER NOT NULL
        REFERENCES customers(id),

      difficulty VARCHAR(20) NOT NULL
        CHECK (
          difficulty IN (
            'easy',
            'medium',
            'hard',
            'daredevil'
          )
        ),

      stake INTEGER NOT NULL
        CHECK (
          stake >= 10
          AND stake <= 25000
        ),

      step INTEGER NOT NULL
        DEFAULT 0
        CHECK(step >= 0),

      multiplier_hundredths INTEGER NOT NULL
        DEFAULT 100
        CHECK(multiplier_hundredths >= 100),

      status VARCHAR(20) NOT NULL
        DEFAULT 'ACTIVE'
        CHECK (
          status IN (
            'ACTIVE',
            'CASHED_OUT',
            'LOST'
          )
        ),

      payout INTEGER NOT NULL
        DEFAULT 0
        CHECK(payout >= 0),

      created_at TIMESTAMPTZ NOT NULL
        DEFAULT NOW(),

      updated_at TIMESTAMPTZ NOT NULL
        DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS tsb_chicken_one_active
      ON tsb_chicken_sessions(customer_id)
      WHERE status='ACTIVE';

    CREATE INDEX IF NOT EXISTS tsb_chicken_history
      ON tsb_chicken_sessions(
        customer_id,
        id DESC
      );

    CREATE TABLE IF NOT EXISTS tsb_chicken_actions (
      id BIGSERIAL PRIMARY KEY,

      customer_id INTEGER NOT NULL
        REFERENCES customers(id),

      request_key VARCHAR(100) NOT NULL,

      action VARCHAR(20) NOT NULL
        CHECK (
          action IN (
            'play',
            'jump',
            'cashout'
          )
        ),

      input JSONB NOT NULL,
      response JSONB NOT NULL,

      created_at TIMESTAMPTZ NOT NULL
        DEFAULT NOW(),

      UNIQUE(
        customer_id,
        request_key
      )
    );
  `);
}

async function customerSession(
  client,
  req,
) {
  const cookie = String(
    req.headers.cookie || "",
  )
    .split(";")
    .map(value =>
      value.trim(),
    )
    .find(value =>
      value.startsWith(
        "tsb_demo_session=",
      ),
    );

  const token =
    cookie?.slice(
      "tsb_demo_session=".length,
    ) || "";

  if (
    !/^[a-f0-9]{64}$/.test(token)
  ) {
    throw fail(
      "Customer login required.",
      401,
    );
  }

  const hash =
    createHash("sha256")
      .update(token)
      .digest("hex");

  const result =
    await client.query(
      `SELECT c.id

       FROM demo_customer_sessions s

       JOIN customers c
         ON c.id=s.customer_id

       WHERE s.token_hash=$1
         AND s.expires_at>NOW()
         AND c.status='ACTIVE'
         AND c.must_change_password=FALSE
         AND c.must_change_withdrawal_password=FALSE

       LIMIT 1`,
      [hash],
    );

  if (
    !result.rows.length
  ) {
    throw fail(
      "Login again and complete password setup.",
      401,
    );
  }

  return result.rows[0].id;
}

async function transaction(
  pool,
  fn,
) {
  const client =
    await pool.connect();

  let committed = false;

  try {
    await client.query(
      "BEGIN",
    );

    const result =
      await fn(client);

    await client.query(
      "COMMIT",
    );

    committed = true;

    return result;
  } finally {
    if (!committed) {
      await client
        .query("ROLLBACK")
        .catch(() => {});
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
  const next =
    balance + amount;

  if (
    !Number.isSafeInteger(next) ||
    next > MAX_BALANCE
  ) {
    throw fail(
      "Demo balance limit reached.",
    );
  }

  await client.query(
    `UPDATE customers

     SET demo_coin_balance=$1,
         updated_at=NOW()

     WHERE id=$2`,
    [
      next,
      customerId,
    ],
  );

  await client.query(
    `INSERT INTO demo_coin_transactions(
       customer_id,
       amount,
       transaction_type,
       note
     )
     VALUES(
       $1,$2,'GAME_WIN',$3
     )`,
    [
      customerId,
      amount,
      note,
    ],
  );

  return next;
}

export function registerChickenRoadRoutes(
  app,
  pool,
  { rng = randomInt } = {},
) {
  const wrap = fn =>
    (req, res, next) =>
      Promise.resolve(
        fn(req, res),
      ).catch(next);

  const send = (
    res,
    data,
  ) => {
    res.set(
      "Cache-Control",
      "no-store",
    );

    res.json(data);
  };

  app.get(
    "/api/chicken-road/rules",

    wrap(async (req, res) => {
      await customerSession(
        pool,
        req,
      );

      const levels =
        Object.fromEntries(
          Object.entries(
            LEVELS,
          ).map(
            ([
              id,
              level,
            ]) => [
              id,

              {
                ...level,

                multipliers:
                  Array.from(
                    {
                      length:
                        level.lanes,
                    },

                    (_, index) =>
                      chickenMultiplier(
                        id,
                        index + 1,
                      ) / 100,
                  ),
              },
            ],
          ),
        );

      send(res, {
        success: true,
        demoOnly: true,

        minStake: 10,
        maxStake: 25000,

        levels,

        manualJumpOnly:
          true,

        timeLimitSeconds:
          null,

        cashoutAtStartReturnsStake:
          true,

        targetReturnPercent:
          97,

        roundingNote:
          "Whole-coin payout rounding can reduce the theoretical return below the target.",

        payoutMeaning:
          "Total return including stake, rounded down to whole demo coins.",

        rules:
          "Each jump has a server-generated random safe/collision result. Waiting does not change the odds. Vehicle animation and player timing do not predict the result. At the final lane, the game cashes out automatically.",
      });
    }),
  );

  app.get(
    "/api/chicken-road/state",

    wrap(async (req, res) => {
      const data =
        await transaction(
          pool,

          async client => {
            const customerId =
              await customerSession(
                client,
                req,
              );

            const account =
              await client.query(
                `SELECT demo_coin_balance

                 FROM customers

                 WHERE id=$1

                 FOR SHARE`,
                [customerId],
              );

            const latest =
              await client.query(
                `SELECT *

                 FROM tsb_chicken_sessions

                 WHERE customer_id=$1

                 ORDER BY id DESC
                 LIMIT 1`,
                [customerId],
              );

            return {
              success: true,

              balance: Number(
                account.rows[0]
                  .demo_coin_balance,
              ),

              session:
                sessionJSON(
                  latest.rows[0],
                ),
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
        await customerSession(
          pool,
          req,
        );

      const result =
        await pool.query(
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

        sessions:
          result.rows.map(
            sessionJSON,
          ),
      });
    }),
  );

  for (
    const action of [
      "play",
      "jump",
      "cashout",
    ]
  ) {
    app.post(
      `/api/chicken-road/${action}`,

      wrap(async (req, res) => {
        if (
          req.headers.origin
        ) {
          let valid = false;

          try {
            valid =
              new URL(
                req.headers.origin,
              ).host ===
              req.headers.host;
          } catch {}

          if (!valid) {
            throw fail(
              "Invalid request origin.",
              403,
            );
          }
        }

        const key =
          keyFrom(req.body);

        let input;

        if (
          action === "play"
        ) {
          const {
            difficulty,
            amount,
          } = req.body;

          if (
            !Object.hasOwn(
              LEVELS,
              difficulty,
            ) ||
            !Number.isSafeInteger(
              amount,
            ) ||
            amount < 10 ||
            amount > 25000
          ) {
            throw fail(
              "Choose a valid difficulty and 10-25000 whole demo coins.",
            );
          }

          input = {
            difficulty,
            amount,
          };
        } else {
          input = {
            sessionId:
              sessionIdFrom(
                req.body,
              ),
          };
        }

        const data =
          await transaction(
            pool,

            async client => {
              const customerId =
                await customerSession(
                  client,
                  req,
                );

              // Every action locks the same
              // customer wallet first.
              const account =
                await client.query(
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

              const customer =
                account.rows[0];

              if (
                !customer ||
                customer.status !==
                  "ACTIVE" ||
                customer.must_change_password ||
                customer.must_change_withdrawal_password
              ) {
                throw fail(
                  "Customer account cannot play.",
                  403,
                );
              }

              let balance =
                Number(
                  customer.demo_coin_balance,
                );

              const previous =
                await client.query(
                  `SELECT *

                   FROM tsb_chicken_actions

                   WHERE customer_id=$1
                     AND request_key=$2`,
                  [
                    customerId,
                    key,
                  ],
                );

              if (
                previous.rows[0]
              ) {
                const old =
                  previous.rows[0];

                const savedInput =
                  json(old.input);

                const same =
                  action === "play"
                    ? (
                        savedInput.difficulty ===
                          input.difficulty &&
                        savedInput.amount ===
                          input.amount
                      )
                    : (
                        String(
                          savedInput.sessionId,
                        ) ===
                        input.sessionId
                      );

                if (
                  old.action !==
                    action ||
                  !same
                ) {
                  throw fail(
                    "Request key belongs to a different action.",
                    409,
                  );
                }

                return {
                  ...json(
                    old.response,
                  ),

                  replayed: true,

                  balance,
                };
              }

              let session;
              let event;

              if (
                action === "play"
              ) {
                const existing =
                  await client.query(
                    `SELECT id

                     FROM tsb_chicken_sessions

                     WHERE customer_id=$1
                       AND status='ACTIVE'

                     LIMIT 1`,
                    [customerId],
                  );

                if (
                  existing.rows.length
                ) {
                  throw fail(
                    "Finish or cash out the active game first.",
                    409,
                  );
                }

                if (
                  balance <
                  input.amount
                ) {
                  throw fail(
                    "LOW BALANCE",
                  );
                }

                const maximumReturn =
                  payoutFor(
                    input.amount,

                    chickenMultiplier(
                      input.difficulty,

                      LEVELS[
                        input.difficulty
                      ].lanes,
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

                const created =
                  await client.query(
                    `INSERT INTO tsb_chicken_sessions(
                       customer_id,
                       difficulty,
                       stake
                     )
                     VALUES($1,$2,$3)

                     RETURNING *`,
                    [
                      customerId,
                      input.difficulty,
                      input.amount,
                    ],
                  );

                session =
                  created.rows[0];

                balance -=
                  input.amount;

                await client.query(
                  `UPDATE customers

                   SET demo_coin_balance=$1,
                       updated_at=NOW()

                   WHERE id=$2`,
                  [
                    balance,
                    customerId,
                  ],
                );

                await client.query(
                  `INSERT INTO demo_coin_transactions(
                     customer_id,
                     amount,
                     transaction_type,
                     note
                   )
                   VALUES(
                     $1,$2,
                     'GAME_BET',
                     $3
                   )`,
                  [
                    customerId,

                    -input.amount,

                    `chicken-road session #${session.id}`,
                  ],
                );

                event =
                  "STARTED";
              } else {
                const selected =
                  await client.query(
                    `SELECT *

                     FROM tsb_chicken_sessions

                     WHERE id=$1
                       AND customer_id=$2

                     FOR UPDATE`,
                    [
                      input.sessionId,
                      customerId,
                    ],
                  );

                session =
                  selected.rows[0];

                if (!session) {
                  throw fail(
                    "Game session not found.",
                    404,
                  );
                }

                if (
                  session.status !==
                  "ACTIVE"
                ) {
                  throw fail(
                    "This game has already finished.",
                    409,
                  );
                }

                if (
                  action === "cashout"
                ) {
                  const payout =
                    payoutFor(
                      session.stake,
                      session.multiplier_hundredths,
                    );

                  balance =
                    await credit(
                      client,
                      customerId,
                      balance,
                      payout,

                      `chicken-road session #${session.id} cashout`,
                    );

                  const updated =
                    await client.query(
                      `UPDATE tsb_chicken_sessions

                       SET status='CASHED_OUT',
                           payout=$1,
                           updated_at=NOW()

                       WHERE id=$2

                       RETURNING *`,
                      [
                        payout,
                        session.id,
                      ],
                    );

                  session =
                    updated.rows[0];

                  event =
                    "CASHED_OUT";
                } else {
                  const nextStep =
                    session.step + 1;

                  const crossing =
                    chickenCrossing(
                      session.difficulty,
                      nextStep,
                      rng,
                    );

                  if (
                    !crossing.safe
                  ) {
                    const updated =
                      await client.query(
                        `UPDATE tsb_chicken_sessions

                         SET status='LOST',
                             payout=0,
                             updated_at=NOW()

                         WHERE id=$1

                         RETURNING *`,
                        [session.id],
                      );

                    session =
                      updated.rows[0];

                    event =
                      "COLLISION";
                  } else {
                    const finalLane =
                      nextStep ===
                      LEVELS[
                        session.difficulty
                      ].lanes;

                    const payout =
                      finalLane
                        ? payoutFor(
                            session.stake,
                            crossing.multiplierHundredths,
                          )
                        : 0;

                    if (
                      finalLane
                    ) {
                      balance =
                        await credit(
                          client,
                          customerId,
                          balance,
                          payout,

                          `chicken-road session #${session.id} final lane`,
                        );
                    }

                    const updated =
                      await client.query(
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

                          crossing.multiplierHundredths,

                          finalLane
                            ? "CASHED_OUT"
                            : "ACTIVE",

                          payout,

                          session.id,
                        ],
                      );

                    session =
                      updated.rows[0];

                    event =
                      finalLane
                        ? "COMPLETED"
                        : "SAFE";
                  }
                }
              }

              const response = {
                success: true,
                replayed: false,
                event,
                balance,

                session:
                  sessionJSON(
                    session,
                  ),
              };

              await client.query(
                `INSERT INTO tsb_chicken_actions(
                   customer_id,
                   request_key,
                   action,
                   input,
                   response
                 )
                 VALUES(
                   $1,$2,$3,
                   $4::JSONB,
                   $5::JSONB
                 )`,
                [
                  customerId,
                  key,
                  action,

                  JSON.stringify(
                    input,
                  ),

                  JSON.stringify(
                    response,
                  ),
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
