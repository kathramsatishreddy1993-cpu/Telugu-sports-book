import {
  createHash,
  randomInt,
} from "node:crypto";

// Original demo paytable.
// Values are hundredths of the stake.
const BANKS = {
  water: [0, 25, 50, 100, 200, 300, 500, 700],
  earth: [0, 50, 100, 200, 400, 700, 1200, 2050],
  fire: [0, 25, 50, 100, 200, 300, 500, 0],
};

const SECTORS = [
  { id: "water", weight: 22 },
  { id: "earth", weight: 12 },
  { id: "fire", weight: 4 },
  { id: "wind", weight: 38 },
  { id: "skull", weight: 24 },
];

const BONUSES = [5, 10, 20, 50, 100];

const MAX_BALANCE = 2147483647;
const IDLE_MS = 40 * 60 * 1000;

const fail = (message, status = 400) =>
  Object.assign(new Error(message), {
    status,
  });

const json = value =>
  typeof value === "string"
    ? JSON.parse(value)
    : value;

const emptyRings = () => ({
  water: 0,
  earth: 0,
  fire: 0,
});

const ringBank = rings =>
  Object.keys(BANKS).reduce(
    (sum, name) =>
      sum + BANKS[name][rings[name]],
    0,
  );

const bankCoins = (amount, rings) =>
  Math.floor(
    amount * ringBank(rings) / 100,
  );

function requestKey(body) {
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

function sessionId(body) {
  const id = String(
    body?.sessionId || "",
  );

  if (!/^[1-9][0-9]{0,18}$/.test(id)) {
    throw fail(
      "A valid sessionId is required.",
    );
  }

  return id;
}

export function twistSpin(
  rings,
  amount,
  rng = randomInt,
) {
  const next = { ...rings };
  const value = rng(0, 100);

  let total = 0;
  let sector = "wind";

  for (const item of SECTORS) {
    total += item.weight;

    if (value < total) {
      sector = item.id;
      break;
    }
  }

  let payout = 0;
  let bonusMultiplier = null;

  if (sector === "skull") {
    for (const name of Object.keys(BANKS)) {
      next[name] = Math.max(
        0,
        next[name] - 1,
      );
    }
  } else if (sector !== "wind") {
    next[sector] += 1;

    if (next[sector] === 7) {
      if (sector === "fire") {
        bonusMultiplier =
          BONUSES[
            rng(0, BONUSES.length)
          ];

        payout =
          amount * bonusMultiplier;

        next.fire = 0;
      } else {
        payout = Math.floor(
          amount *
            BANKS[sector][7] /
            100,
        );

        next[sector] = 6;
      }
    }
  }

  return {
    rings: next,
    sector,
    payout,
    bonusMultiplier,
  };
}

export function twistPartial(
  rings,
  amount,
) {
  const next = { ...rings };
  let eligible = false;

  for (const name of Object.keys(BANKS)) {
    if (next[name] >= 2) {
      next[name] -= 1;
      eligible = true;
    }
  }

  if (!eligible) {
    throw fail(
      "At least one circle needs two filled sections for Part Payout.",
    );
  }

  const payout =
    bankCoins(amount, rings) -
    bankCoins(amount, next);

  if (payout < 1) {
    throw fail(
      "Part Payout is below one whole demo coin. Fill more sections or cash out.",
    );
  }

  return {
    rings: next,
    payout,
  };
}

function publicSession(row) {
  if (!row) return null;

  const rings = json(row.rings);
  const active =
    row.status === "ACTIVE";

  let partialValue = 0;

  if (active) {
    try {
      partialValue = twistPartial(
        rings,
        row.amount,
      ).payout;
    } catch {}
  }

  return {
    id: row.id,
    amount: row.amount,
    rings,
    status: row.status,

    bankMultiplier: active
      ? ringBank(rings) / 100
      : 0,

    cashoutValue: active
      ? bankCoins(row.amount, rings)
      : 0,

    partialValue,

    totalStaked: Number(
      row.total_staked,
    ),

    totalReturned: Number(
      row.total_returned,
    ),

    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function initializeTwistX(
  pool,
) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tsb_twist_sessions (
      id BIGSERIAL PRIMARY KEY,
      customer_id INTEGER NOT NULL
        REFERENCES customers(id),
      amount INTEGER NOT NULL
        CHECK(amount >= 10 AND amount <= 25000),
      rings JSONB NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK(status IN ('ACTIVE','CASHED_OUT')),
      total_staked BIGINT NOT NULL DEFAULT 0
        CHECK(total_staked >= 0),
      total_returned BIGINT NOT NULL DEFAULT 0
        CHECK(total_returned >= 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS
      tsb_twist_one_active
      ON tsb_twist_sessions(customer_id)
      WHERE status='ACTIVE';

    CREATE INDEX IF NOT EXISTS
      tsb_twist_history
      ON tsb_twist_sessions(customer_id,id DESC);

    CREATE TABLE IF NOT EXISTS tsb_twist_actions (
      id BIGSERIAL PRIMARY KEY,
      customer_id INTEGER NOT NULL
        REFERENCES customers(id),
      session_id BIGINT NOT NULL
        REFERENCES tsb_twist_sessions(id),
      request_key VARCHAR(100) NOT NULL,
      action VARCHAR(20) NOT NULL
        CHECK(action IN ('spin','partial','cashout')),
      input JSONB NOT NULL,
      response JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(customer_id,request_key)
    );

    CREATE INDEX IF NOT EXISTS
      tsb_twist_actions_history
      ON tsb_twist_actions(customer_id,id DESC);
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
    .map(value => value.trim())
    .find(value =>
      value.startsWith(
        "tsb_demo_session=",
      ),
    );

  const token =
    cookie?.slice(
      "tsb_demo_session=".length,
    ) || "";

  if (!/^[a-f0-9]{64}$/.test(token)) {
    throw fail(
      "Customer login required.",
      401,
    );
  }

  const hash = createHash("sha256")
    .update(token)
    .digest("hex");

  const result = await client.query(
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

  if (!result.rows.length) {
    throw fail(
      "Login again and complete password setup.",
      401,
    );
  }

  return result.rows[0].id;
}

async function transaction(
  pool,
  operation,
) {
  const client = await pool.connect();
  let committed = false;

  try {
    await client.query("BEGIN");

    const data =
      await operation(client);

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

async function expireIdleSession(
  client,
  customerId,
) {
  // Lock the wallet before locking the game session.
  const account = await client.query(
    `SELECT demo_coin_balance
     FROM customers
     WHERE id=$1
     FOR UPDATE`,
    [customerId],
  );

  if (!account.rows.length) return;

  const expired = await client.query(
    `SELECT *
     FROM tsb_twist_sessions
     WHERE customer_id=$1
       AND status='ACTIVE'
       AND updated_at <=
         clock_timestamp() - INTERVAL '40 minutes'
     FOR UPDATE`,
    [customerId],
  );

  for (const row of expired.rows) {
    const payout = bankCoins(
      row.amount,
      json(row.rings),
    );

    const balance =
      Number(
        account.rows[0]
          .demo_coin_balance,
      ) + payout;

    if (balance > MAX_BALANCE) {
      throw fail(
        "Demo balance limit prevents automatic cashout.",
        503,
      );
    }

    await client.query(
      `UPDATE customers
       SET demo_coin_balance=$1,
           updated_at=NOW()
       WHERE id=$2`,
      [balance, customerId],
    );

    const updated = await client.query(
      `UPDATE tsb_twist_sessions
       SET rings=$1::JSONB,
           status='CASHED_OUT',
           total_returned=
             total_returned+$2,
           updated_at=NOW()
       WHERE id=$3
       RETURNING *`,
      [
        JSON.stringify(emptyRings()),
        payout,
        row.id,
      ],
    );

    if (payout > 0) {
      await client.query(
        `INSERT INTO demo_coin_transactions(
           customer_id,
           amount,
           transaction_type,
           note
         )
         VALUES($1,$2,'GAME_WIN',$3)`,
        [
          customerId,
          payout,
          `twist-x session #${row.id} automatic idle cashout`,
        ],
      );
    }

    const response = {
      success: true,
      replayed: false,
      action: "cashout",
      automatic: true,
      sector: null,
      bonusMultiplier: null,
      payout,
      stake: 0,
      balance,
      session: publicSession(
        updated.rows[0],
      ),
    };

    await client.query(
      `INSERT INTO tsb_twist_actions(
         customer_id,
         session_id,
         request_key,
         action,
         input,
         response
       )
       VALUES(
         $1,$2,$3,'cashout',
         $4::JSONB,$5::JSONB
       )`,
      [
        customerId,
        row.id,
        `auto_idle_${row.id}`,

        JSON.stringify({
          sessionId: String(row.id),
        }),

        JSON.stringify(response),
      ],
    );

    account.rows[0]
      .demo_coin_balance = balance;
  }
}

export function registerTwistXRoutes(
  app,
  pool,
  { rng = randomInt } = {},
) {
  const wrap = fn => (req, res, next) =>
    Promise.resolve(
      fn(req, res),
    ).catch(next);

  const send = (res, data) => {
    res.set(
      "Cache-Control",
      "no-store",
    );

    res.json(data);
  };

  app.get(
    "/api/twist-x/rules",
    wrap(async (req, res) => {
      await customerSession(
        pool,
        req,
      );

      send(res, {
        success: true,
        demoOnly: true,
        minStake: 10,
        maxStake: 25000,
        sections: 7,

        bankMultipliers:
          Object.fromEntries(
            Object.entries(BANKS).map(
              ([name, values]) => [
                name,
                values.map(
                  value => value / 100,
                ),
              ],
            ),
          ),

        sectors: SECTORS,
        fireBonusMultipliers: BONUSES,

        rules:
          "Each SPIN costs the selected stake. Wind loses that spin stake and keeps sections. Skull removes one section from each circle. A full Water pays 7x and returns to section 6; a full Earth pays 20.5x and returns to section 6. A full Fire credits a random demo bonus and resets Fire to zero. Cash Out pays all current banks and clears the game. Part Payout pays the bank difference after moving every eligible circle back one section; at least two sections in one circle are required. Stake can change only when all circles are empty or after Cash Out. After 40 minutes without an action, the current bank is automatically credited and the game is cleared.",

        payoutMeaning:
          "Bank and bonus multipliers are total credited amounts; the spin stake is not refunded separately. Payouts round down to whole demo coins.",

        timeLimitSeconds:
          IDLE_MS / 1000,

        timeoutBasis:
          "No spin, partial payout or cashout for 40 minutes.",
      });
    }),
  );

  app.get(
    "/api/twist-x/state",
    wrap(async (req, res) => {
      const data = await transaction(
        pool,
        async client => {
          const customerId =
            await customerSession(
              client,
              req,
            );

          await expireIdleSession(
            client,
            customerId,
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
               FROM tsb_twist_sessions
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

            session: publicSession(
              latest.rows[0],
            ),
          };
        },
      );

      send(res, data);
    }),
  );

  app.get(
    "/api/twist-x/history",
    wrap(async (req, res) => {
      const customerId =
        await customerSession(
          pool,
          req,
        );

      const records = await pool.query(
        `SELECT
           id,
           action,
           response,
           created_at
         FROM tsb_twist_actions
         WHERE customer_id=$1
         ORDER BY id DESC
         LIMIT 50`,
        [customerId],
      );

      send(res, {
        success: true,

        actions: records.rows.map(
          row => ({
            id: row.id,
            action: row.action,
            result: json(row.response),
            createdAt: row.created_at,
          }),
        ),
      });
    }),
  );

  for (const action of [
    "spin",
    "partial",
    "cashout",
  ]) {
    app.post(
      `/api/twist-x/${action}`,
      wrap(async (req, res) => {
        if (req.headers.origin) {
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

        const key = requestKey(
          req.body,
        );

        let input;

        if (action === "spin") {
          const amount =
            req.body.amount;

          if (
            !Number.isSafeInteger(
              amount,
            ) ||
            amount < 10 ||
            amount > 25000
          ) {
            throw fail(
              "Stake must be 10-25000 whole demo coins.",
            );
          }

          input = { amount };
        } else {
          input = {
            sessionId: sessionId(
              req.body,
            ),
          };
        }

        const data = await transaction(
          pool,
          async client => {
            const customerId =
              await customerSession(
                client,
                req,
              );

            await expireIdleSession(
              client,
              customerId,
            );

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

            let balance = Number(
              customer.demo_coin_balance,
            );

            const old =
              await client.query(
                `SELECT *
                 FROM tsb_twist_actions
                 WHERE customer_id=$1
                   AND request_key=$2`,
                [customerId, key],
              );

            if (old.rows[0]) {
              const previous =
                old.rows[0];

              const savedInput =
                json(previous.input);

              const same =
                action === "spin"
                  ? savedInput.amount ===
                    input.amount
                  : String(
                      savedInput.sessionId,
                    ) ===
                    input.sessionId;

              if (
                previous.action !==
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
                  previous.response,
                ),
                replayed: true,
                balance,
              };
            }

            const latest =
              await client.query(
                `SELECT *
                 FROM tsb_twist_sessions
                 WHERE customer_id=$1
                   AND status='ACTIVE'
                 ORDER BY id DESC
                 LIMIT 1
                 FOR UPDATE`,
                [customerId],
              );

            let session =
              latest.rows[0];

            if (
              !session &&
              action === "spin"
            ) {
              const created =
                await client.query(
                  `INSERT INTO tsb_twist_sessions(
                     customer_id,
                     amount,
                     rings
                   )
                   VALUES(
                     $1,$2,$3::JSONB
                   )
                   RETURNING *`,
                  [
                    customerId,
                    input.amount,
                    JSON.stringify(
                      emptyRings(),
                    ),
                  ],
                );

              session =
                created.rows[0];
            }

            if (
              !session ||
              (
                action !== "spin" &&
                String(session.id) !==
                  input.sessionId
              )
            ) {
              throw fail(
                "Active game session not found.",
                409,
              );
            }

            let rings = json(
              session.rings,
            );

            let payout = 0;
            let stake = 0;
            let sector = null;
            let bonusMultiplier = null;
            let status = "ACTIVE";
            let amount = session.amount;

            if (action === "spin") {
              if (
                input.amount !== amount &&
                Object.values(
                  rings,
                ).some(
                  value => value > 0,
                )
              ) {
                throw fail(
                  "Cash out or clear all circle sections before changing the stake.",
                  409,
                );
              }

              amount = input.amount;
              stake = amount;

              if (balance < stake) {
                throw fail(
                  "LOW BALANCE",
                );
              }

              if (
                balance -
                  stake +
                  amount * 100 >
                MAX_BALANCE
              ) {
                throw fail(
                  "Demo balance limit: reduce your balance before another spin.",
                );
              }

              const spin = twistSpin(
                rings,
                amount,
                rng,
              );

              rings = spin.rings;
              payout = spin.payout;
              sector = spin.sector;

              bonusMultiplier =
                spin.bonusMultiplier;
            } else if (
              action === "partial"
            ) {
              const part =
                twistPartial(
                  rings,
                  amount,
                );

              rings = part.rings;
              payout = part.payout;
            } else {
              payout = bankCoins(
                amount,
                rings,
              );

              if (payout < 1) {
                throw fail(
                  "No whole demo coins available to cash out.",
                );
              }

              rings = emptyRings();
              status = "CASHED_OUT";
            }

            balance =
              balance - stake + payout;

            if (
              !Number.isSafeInteger(
                balance,
              ) ||
              balance > MAX_BALANCE
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
              [balance, customerId],
            );

            const updated =
              await client.query(
                `UPDATE tsb_twist_sessions
                 SET amount=$1,
                     rings=$2::JSONB,
                     status=$3,
                     total_staked=
                       total_staked+$4,
                     total_returned=
                       total_returned+$5,
                     updated_at=NOW()
                 WHERE id=$6
                 RETURNING *`,
                [
                  amount,
                  JSON.stringify(rings),
                  status,
                  stake,
                  payout,
                  session.id,
                ],
              );

            session =
              updated.rows[0];

            if (stake > 0) {
              await client.query(
                `INSERT INTO demo_coin_transactions(
                   customer_id,
                   amount,
                   transaction_type,
                   note
                 )
                 VALUES(
                   $1,$2,'GAME_BET',$3
                 )`,
                [
                  customerId,
                  -stake,
                  `twist-x session #${session.id} spin`,
                ],
              );
            }

            if (payout > 0) {
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
                  payout,
                  `twist-x session #${session.id} ${action} return`,
                ],
              );
            }

            const response = {
              success: true,
              replayed: false,
              action,
              sector,
              bonusMultiplier,
              payout,
              stake,
              balance,

              session:
                publicSession(session),
            };

            await client.query(
              `INSERT INTO tsb_twist_actions(
                 customer_id,
                 session_id,
                 request_key,
                 action,
                 input,
                 response
               )
               VALUES(
                 $1,$2,$3,$4,
                 $5::JSONB,$6::JSONB
               )`,
              [
                customerId,
                session.id,
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

  let sweeping = false;

  const sweep = async () => {
    if (sweeping) return;

    sweeping = true;

    try {
      const rows = await pool.query(
        `SELECT customer_id
         FROM tsb_twist_sessions
         WHERE status='ACTIVE'
           AND updated_at <=
             clock_timestamp() -
             INTERVAL '40 minutes'
         ORDER BY customer_id
         LIMIT 100`,
      );

      for (const row of rows.rows) {
        await transaction(
          pool,
          client =>
            expireIdleSession(
              client,
              row.customer_id,
            ),
        );
      }
    } catch (error) {
      console.error(
        "Twist X idle cashout failed:",
        error,
      );
    } finally {
      sweeping = false;
    }
  };

  const idleTimer = setInterval(
    () => void sweep(),
    10000,
  );

  idleTimer.unref?.();

  return () =>
    clearInterval(idleTimer);
}
