import {
  createHash,
  randomInt,
} from "node:crypto";

const BET_MS = 30000;
const SHAKE_MS = 10000;
const RESULT_MS = 5000;
const LOCK_ID = 824062;
const MAX_BALANCE = 2147483647;

// These are PROFIT odds.
// A winning bet also receives its stake back.
const SUM_ODDS = {
  4: 50,
  5: 18,
  6: 14,
  7: 12,
  8: 8,
  9: 6,
  10: 6,
  11: 6,
  12: 6,
  13: 8,
  14: 12,
  15: 14,
  16: 18,
  17: 50,
};

const AREAS = [
  "small",
  "big",
  "any-triple",
];

for (
  let sum = 4;
  sum <= 17;
  sum += 1
) {
  AREAS.push(`sum:${sum}`);
}

for (
  let face = 1;
  face <= 6;
  face += 1
) {
  AREAS.push(
    `single:${face}`,
    `double:${face}`,
    `triple:${face}`,
  );

  for (
    let other = face + 1;
    other <= 6;
    other += 1
  ) {
    AREAS.push(
      `pair:${face}-${other}`,
    );
  }
}

const EXTRA_AREAS =
  AREAS.filter(area =>
    /^(sum|double|triple|pair):/.test(area),
  );

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

export function createSicBoResult(
  rng = randomInt,
) {
  const dice = Array.from(
    { length: 3 },
    () => rng(1, 7),
  );

  const candidates = [
    ...EXTRA_AREAS,
  ];

  const extraPay = {};

  // Original demo Extra Pay:
  // two distinct areas receive 2x or 3x
  // on their profit odds.
  for (
    let index = 0;
    index < 2;
    index += 1
  ) {
    const selected = rng(
      index,
      candidates.length,
    );

    [
      candidates[index],
      candidates[selected],
    ] = [
      candidates[selected],
      candidates[index],
    ];

    extraPay[
      candidates[index]
    ] = rng(2, 4);
  }

  return {
    dice,
    extraPay,
  };
}

export function settleSicBo(
  bets,
  result,
) {
  const {
    dice,
    extraPay,
  } = result;

  const sum = dice.reduce(
    (total, value) =>
      total + value,
    0,
  );

  const triple =
    dice[0] === dice[1] &&
    dice[1] === dice[2];

  const counts =
    Array(7).fill(0);

  for (
    const value of dice
  ) {
    counts[value] += 1;
  }

  const areas = bets.map(bet => {
    if (
      !AREAS.includes(
        bet.area,
      )
    ) {
      throw fail(
        "Unknown betting area.",
      );
    }

    const [
      type,
      selection,
    ] = bet.area.split(":");

    const face =
      Number(selection);

    let win = false;
    let profitOdds = 0;

    if (
      type === "small" ||
      type === "big"
    ) {
      win =
        !triple &&
        (
          type === "small"
            ? sum >= 4 &&
              sum <= 10
            : sum >= 11 &&
              sum <= 17
        );

      profitOdds = 1;
    } else if (
      type === "any-triple"
    ) {
      win = triple;
      profitOdds = 24;
    } else if (
      type === "sum"
    ) {
      win =
        !triple &&
        sum === face;

      profitOdds =
        SUM_ODDS[face];
    } else if (
      type === "single"
    ) {
      win =
        counts[face] > 0;

      profitOdds =
        counts[face];
    } else if (
      type === "double"
    ) {
      win =
        counts[face] >= 2;

      profitOdds = 8;
    } else if (
      type === "triple"
    ) {
      win =
        counts[face] === 3;

      profitOdds = 150;
    } else if (
      type === "pair"
    ) {
      const [
        a,
        b,
      ] = selection
        .split("-")
        .map(Number);

      win =
        counts[a] > 0 &&
        counts[b] > 0;

      profitOdds = 5;
    }

    const extraMultiplier =
      extraPay[bet.area] || 1;

    const totalMultiplier =
      win
        ? 1 +
          profitOdds *
            extraMultiplier
        : 0;

    return {
      ...bet,
      win,
      profitOdds,
      extraMultiplier,
      totalMultiplier,

      payout:
        bet.amount *
        totalMultiplier,
    };
  });

  return {
    dice,
    sum,
    triple,
    extraPay,
    areas,

    payout: areas.reduce(
      (total, bet) =>
        total + bet.payout,
      0,
    ),
  };
}

function normalizeBet(body) {
  const key =
    body?.requestKey;

  const roundId = String(
    body?.roundId || "",
  );

  if (
    typeof key !== "string" ||
    !/^[A-Za-z0-9_-]{16,100}$/.test(
      key,
    )
  ) {
    throw fail(
      "A unique requestKey of 16-100 characters is required.",
    );
  }

  if (
    !/^[1-9][0-9]{0,18}$/.test(
      roundId,
    )
  ) {
    throw fail(
      "A valid roundId is required.",
    );
  }

  if (
    !Array.isArray(body.bets) ||
    !body.bets.length ||
    body.bets.length >
      AREAS.length
  ) {
    throw fail(
      "Choose valid betting areas.",
    );
  }

  const seen = new Set();

  const bets = body.bets
    .map(bet => {
      if (
        !bet ||
        !AREAS.includes(
          bet.area,
        ) ||
        seen.has(bet.area) ||
        !Number.isSafeInteger(
          bet.amount,
        ) ||
        bet.amount < 10 ||
        bet.amount > 25000
      ) {
        throw fail(
          "Choose distinct areas with 10-25000 whole demo coins each.",
        );
      }

      seen.add(bet.area);

      return {
        area: bet.area,
        amount: bet.amount,
      };
    })
    .sort((a, b) =>
      a.area.localeCompare(
        b.area,
      ),
    );

  const stake = bets.reduce(
    (sum, bet) =>
      sum + bet.amount,
    0,
  );

  if (
    stake > 25000
  ) {
    throw fail(
      "Maximum total stake per round is 25000 demo coins.",
    );
  }

  return {
    key,
    roundId,
    bets,
    stake,
  };
}

export async function initializeSicBo(
  pool,
) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tsb_sicbo_rounds (
      id BIGSERIAL PRIMARY KEY,

      opens_at TIMESTAMPTZ NOT NULL,
      closes_at TIMESTAMPTZ NOT NULL,
      reveals_at TIMESTAMPTZ NOT NULL,
      ends_at TIMESTAMPTZ NOT NULL,

      result JSONB NOT NULL,

      settled BOOLEAN NOT NULL
        DEFAULT FALSE,

      CHECK (
        opens_at < closes_at
        AND closes_at < reveals_at
        AND reveals_at < ends_at
      )
    );

    CREATE TABLE IF NOT EXISTS tsb_sicbo_bets (
      id BIGSERIAL PRIMARY KEY,

      customer_id INTEGER NOT NULL
        REFERENCES customers(id),

      round_id BIGINT NOT NULL
        REFERENCES tsb_sicbo_rounds(id),

      request_key VARCHAR(100) NOT NULL,
      bets JSONB NOT NULL,

      stake INTEGER NOT NULL
        CHECK (
          stake > 0
          AND stake <= 25000
        ),

      payout INTEGER
        CHECK (
          payout IS NULL
          OR payout >= 0
        ),

      settlement JSONB,

      created_at TIMESTAMPTZ NOT NULL
        DEFAULT NOW(),

      UNIQUE(
        customer_id,
        request_key
      )
    );

    CREATE INDEX IF NOT EXISTS tsb_sicbo_bets_round
      ON tsb_sicbo_bets(
        round_id,
        customer_id
      );

    CREATE INDEX IF NOT EXISTS tsb_sicbo_bets_history
      ON tsb_sicbo_bets(
        customer_id,
        id DESC
      );
  `);
}

async function transaction(
  pool,
  operation,
) {
  const client =
    await pool.connect();

  let committed = false;

  try {
    await client.query(
      "BEGIN",
    );

    await client.query(
      "SELECT pg_advisory_xact_lock($1)",
      [LOCK_ID],
    );

    const data =
      await operation(client);

    await client.query(
      "COMMIT",
    );

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

async function settleRound(
  client,
  round,
) {
  const records =
    await client.query(
      `SELECT *

       FROM tsb_sicbo_bets

       WHERE round_id=$1
         AND payout IS NULL

       ORDER BY customer_id,id

       FOR UPDATE`,
      [round.id],
    );

  for (
    const bet of records.rows
  ) {
    const result =
      settleSicBo(
        json(bet.bets),
        json(round.result),
      );

    if (
      result.payout > 0
    ) {
      const credited =
        await client.query(
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

            MAX_BALANCE -
              result.payout,
          ],
        );

      if (
        !credited.rows.length
      ) {
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
         VALUES(
           $1,$2,'GAME_WIN',$3
         )`,
        [
          bet.customer_id,
          result.payout,

          `extra-sic-bo round #${round.id} bet #${bet.id} return`,
        ],
      );
    }

    await client.query(
      `UPDATE tsb_sicbo_bets

       SET payout=$1,
           settlement=$2::JSONB

       WHERE id=$3`,
      [
        result.payout,

        JSON.stringify(
          result,
        ),

        bet.id,
      ],
    );
  }

  await client.query(
    `UPDATE tsb_sicbo_rounds
     SET settled=TRUE
     WHERE id=$1`,
    [round.id],
  );

  return {
    ...round,
    settled: true,
  };
}

async function advanceRound(
  client,
) {
  const time =
    await client.query(
      "SELECT clock_timestamp() AS now",
    );

  const now =
    new Date(
      time.rows[0].now,
    ).getTime();

  const latest =
    await client.query(
      `SELECT *

       FROM tsb_sicbo_rounds

       ORDER BY id DESC
       LIMIT 1

       FOR UPDATE`,
    );

  let round =
    latest.rows[0];

  if (
    round &&
    !round.settled &&
    now >=
      new Date(
        round.reveals_at,
      ).getTime()
  ) {
    round =
      await settleRound(
        client,
        round,
      );
  }

  if (
    !round ||
    now >=
      new Date(
        round.ends_at,
      ).getTime()
  ) {
    const result =
      createSicBoResult();

    const saved =
      await client.query(
        `INSERT INTO tsb_sicbo_rounds(
           opens_at,
           closes_at,
           reveals_at,
           ends_at,
           result
         )
         VALUES(
           $1,$2,$3,$4,
           $5::JSONB
         )
         RETURNING *`,
        [
          new Date(now),

          new Date(
            now + BET_MS,
          ),

          new Date(
            now +
              BET_MS +
              SHAKE_MS,
          ),

          new Date(
            now +
              BET_MS +
              SHAKE_MS +
              RESULT_MS,
          ),

          JSON.stringify(
            result,
          ),
        ],
      );

    round =
      saved.rows[0];
  }

  const shaking =
    now >=
    new Date(
      round.closes_at,
    ).getTime();

  const revealed =
    now >=
      new Date(
        round.reveals_at,
      ).getTime() &&
    round.settled;

  return {
    round,
    now,

    publicRound: {
      id: round.id,

      opensAt:
        round.opens_at,

      closesAt:
        round.closes_at,

      revealsAt:
        round.reveals_at,

      endsAt:
        round.ends_at,

      phase:
        revealed
          ? "RESULT"
          : shaking
            ? "SHAKING"
            : "BETTING",

      extraPay:
        shaking
          ? json(
              round.result,
            ).extraPay
          : {},

      result:
        revealed
          ? settleSicBo(
              [],
              json(
                round.result,
              ),
            )
          : null,
    },
  };
}

function betJSON(row) {
  return {
    id: row.id,
    roundId: row.round_id,

    bets:
      json(row.bets),

    stake: row.stake,
    payout: row.payout,

    settlement:
      row.settlement
        ? json(
            row.settlement,
          )
        : null,

    createdAt:
      row.created_at,
  };
}

export function registerSicBoRoutes(
  app,
  pool,
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
    "/api/sicbo/rules",

    wrap(async (req, res) => {
      await customerSession(
        pool,
        req,
      );

      send(res, {
        success: true,
        name: "EXTRA SIC BO",
        demoOnly: true,

        areas: AREAS,

        bettingSeconds: 30,
        shakingSeconds: 10,
        resultSeconds: 5,

        minAreaStake: 10,
        maxRoundStake: 25000,

        profitOdds: {
          small: 1,
          big: 1,
          "any-triple": 24,

          sum:
            SUM_ODDS,

          single: [
            0, 1, 2, 3,
          ],

          double: 8,
          triple: 150,
          pair: 5,
        },

        payoutMeaning:
          "Odds are profit odds. Winning total return = stake + stake × profit odds × Extra Pay multiplier. Losing areas return zero.",

        extraPay: {
          areasPerRound: 2,

          multipliers: [
            2, 3,
          ],

          eligibleAreas:
            EXTRA_AREAS,

          appliesTo:
            "profit only",

          displayedAfterBettingCloses:
            true,
        },

        triplesLoseOn: [
          "small",
          "big",
          "sum",
        ],

        specificDoubleIncludesTriples:
          true,
      });
    }),
  );

  app.get(
    "/api/sicbo/state",

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

            const {
              round,
              now,
              publicRound,
            } =
              await advanceRound(
                client,
              );

            const balance =
              await client.query(
                `SELECT demo_coin_balance
                 FROM customers
                 WHERE id=$1`,
                [customerId],
              );

            const bets =
              await client.query(
                `SELECT *

                 FROM tsb_sicbo_bets

                 WHERE customer_id=$1
                   AND round_id=$2

                 ORDER BY id`,
                [
                  customerId,
                  round.id,
                ],
              );

            const recent =
              await client.query(
                `SELECT *

                 FROM tsb_sicbo_rounds

                 WHERE settled=TRUE

                 ORDER BY id DESC
                 LIMIT 10`,
              );

            return {
              success: true,

              serverTime:
                new Date(
                  now,
                ).toISOString(),

              balance: Number(
                balance.rows[0]
                  .demo_coin_balance,
              ),

              round:
                publicRound,

              bets:
                bets.rows.map(
                  betJSON,
                ),

              recentResults:
                recent.rows.map(
                  row => ({
                    id: row.id,

                    result:
                      settleSicBo(
                        [],
                        json(
                          row.result,
                        ),
                      ),
                  }),
                ),
            };
          },
        );

      send(res, data);
    }),
  );

  app.get(
    "/api/sicbo/history",

    wrap(async (req, res) => {
      const customerId =
        await customerSession(
          pool,
          req,
        );

      const result =
        await pool.query(
          `SELECT
             b.*,
             r.result AS round_result

           FROM tsb_sicbo_bets b

           JOIN tsb_sicbo_rounds r
             ON r.id=b.round_id

           WHERE b.customer_id=$1
             AND r.settled=TRUE

           ORDER BY b.id DESC
           LIMIT 50`,
          [customerId],
        );

      send(res, {
        success: true,

        bets:
          result.rows.map(
            row => ({
              ...betJSON(row),

              result:
                settleSicBo(
                  [],
                  json(
                    row.round_result,
                  ),
                ),
            }),
          ),
      });
    }),
  );

  app.post(
    "/api/sicbo/bets",

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

      const input =
        normalizeBet(
          req.body,
        );

      const data =
        await transaction(
          pool,

          async client => {
            const customerId =
              await customerSession(
                client,
                req,
              );

            const old =
              await client.query(
                `SELECT *

                 FROM tsb_sicbo_bets

                 WHERE customer_id=$1
                   AND request_key=$2`,
                [
                  customerId,
                  input.key,
                ],
              );

            if (
              old.rows[0]
            ) {
              const previous =
                old.rows[0];

              const canonical =
                normalizeBet({
                  requestKey:
                    input.key,

                  roundId:
                    previous.round_id,

                  bets:
                    json(
                      previous.bets,
                    ),
                });

              if (
                String(
                  previous.round_id,
                ) !==
                  input.roundId ||
                JSON.stringify(
                  canonical.bets,
                ) !==
                  JSON.stringify(
                    input.bets,
                  )
              ) {
                throw fail(
                  "Request key belongs to a different bet.",
                  409,
                );
              }

              const balance =
                await client.query(
                  `SELECT demo_coin_balance
                   FROM customers
                   WHERE id=$1`,
                  [customerId],
                );

              return {
                success: true,
                replayed: true,

                balance: Number(
                  balance.rows[0]
                    .demo_coin_balance,
                ),

                bet:
                  betJSON(
                    previous,
                  ),
              };
            }

            const { round } =
              await advanceRound(
                client,
              );

            const customer =
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

            const account =
              customer.rows[0];

            if (
              !account ||
              account.status !==
                "ACTIVE" ||
              account.must_change_password ||
              account.must_change_withdrawal_password
            ) {
              throw fail(
                "Customer account cannot play.",
                403,
              );
            }

            const time =
              await client.query(
                "SELECT clock_timestamp() AS now",
              );

            if (
              String(
                round.id,
              ) !==
                input.roundId ||
              round.settled ||
              new Date(
                time.rows[0].now,
              ).getTime() >=
                new Date(
                  round.closes_at,
                ).getTime()
            ) {
              throw fail(
                "Betting closed. Wait for the next round.",
                409,
              );
            }

            const total =
              await client.query(
                `SELECT
                   COALESCE(
                     SUM(stake),
                     0
                   ) AS stake

                 FROM tsb_sicbo_bets

                 WHERE customer_id=$1
                   AND round_id=$2`,
                [
                  customerId,
                  round.id,
                ],
              );

            if (
              Number(
                total.rows[0].stake,
              ) +
                input.stake >
              25000
            ) {
              throw fail(
                "Maximum total stake per round is 25000 demo coins.",
              );
            }

            const balance =
              Number(
                account.demo_coin_balance,
              ) -
              input.stake;

            if (
              balance < 0
            ) {
              throw fail(
                "LOW BALANCE",
              );
            }

            const saved =
              await client.query(
                `INSERT INTO tsb_sicbo_bets(
                   customer_id,
                   round_id,
                   request_key,
                   bets,
                   stake
                 )
                 VALUES(
                   $1,$2,$3,
                   $4::JSONB,
                   $5
                 )
                 RETURNING *`,
                [
                  customerId,
                  round.id,
                  input.key,

                  JSON.stringify(
                    input.bets,
                  ),

                  input.stake,
                ],
              );

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
                -input.stake,

                `extra-sic-bo round #${round.id} bet #${saved.rows[0].id}`,
              ],
            );

            return {
              success: true,
              replayed: false,
              balance,

              bet:
                betJSON(
                  saved.rows[0],
                ),
            };
          },
        );

      send(res, data);
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

        client =>
          advanceRound(
            client,
          ),
      );
    } catch (error) {
      console.error(
        "Sic Bo round update failed:",
        error,
      );
    } finally {
      running = false;
    }
  };

  const start = () => {
    if (
      timer !== null
    ) {
      return;
    }

    void tick();

    timer = setInterval(
      () => void tick(),
      1000,
    );

    timer.unref?.();
  };

  start.stop = () => {
    if (
      timer !== null
    ) {
      clearInterval(timer);
    }

    timer = null;
  };

  return start;
}
