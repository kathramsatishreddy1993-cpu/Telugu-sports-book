import {
  createHash,
  randomBytes,
} from "node:crypto";

import {
  BALL_MS,
  WINDOW_MS,
  PREBET_MS,
  ALLOWED_BALLS,
  nextDelivery,
  matchWinner,
  commitment,
  payout,
  CARD_ROUND_MS,
  CARD_TRANSFER_MS,
  CARD_BET_MS,
  CARD_POINTS,
  newCardRound,
  cardEvents,
  publicCardMatch,
} from "./animatedCricketRules.js";

const fail = (status, message) =>
  Object.assign(
    new Error(message),
    { status },
  );

const wrap = fn =>
  (req, res, next) =>
    Promise.resolve(
      fn(req, res, next),
    ).catch(next);

const hash = value =>
  createHash("sha256")
    .update(value)
    .digest("hex");

const isDemo = () =>
  String(
    process.env.SPORTS_API_MODE ||
      "demo",
  )
    .trim()
    .toLowerCase() === "demo";

const clock = async c => {
  const result = await c.query(
    "SELECT clock_timestamp() AS now",
  );

  return new Date(
    result.rows[0].now,
  ).getTime();
};

const legacyBalls = async (
  c,
  id,
) => {
  const result = await c.query(
    `
      SELECT *
      FROM tsb_so_manual_balls
      WHERE match_id=$1
      ORDER BY seq
    `,
    [id],
  );

  return result.rows;
};

export async function initializeAnimatedCricket(
  pool,
) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tsb_so_card_rounds (
      id BIGSERIAL PRIMARY KEY,
      start_ms BIGINT UNIQUE NOT NULL,
      deck JSONB NOT NULL,
      seed TEXT NOT NULL,
      commitment TEXT NOT NULL,
      settled BOOLEAN NOT NULL DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS tsb_so_card_bets (
      id BIGSERIAL PRIMARY KEY,

      match_id BIGINT NOT NULL
        REFERENCES tsb_so_card_rounds(id),

      customer_id INTEGER NOT NULL
        REFERENCES customers(id),

      team INTEGER NOT NULL
        CHECK(team IN (0,1)),

      direction TEXT NOT NULL
        CHECK(direction='BACK'),

      amount INTEGER NOT NULL
        CHECK(amount BETWEEN 100 AND 25000),

      points INTEGER NOT NULL
        CHECK(points=98),

      hold INTEGER NOT NULL,
      win_return INTEGER NOT NULL,
      window_id TEXT NOT NULL,
      quote_version INTEGER NOT NULL,
      request_key TEXT NOT NULL,

      status TEXT NOT NULL DEFAULT 'PLACED',
      payout INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      UNIQUE(customer_id,request_key)
    );

    CREATE INDEX IF NOT EXISTS tsb_so_card_customer
      ON tsb_so_card_bets(customer_id,id DESC);

    CREATE OR REPLACE FUNCTION tsb_so_card_round_protect()
    RETURNS trigger AS $$
    BEGIN
      IF TG_OP='DELETE' THEN
        RAISE EXCEPTION 'Round history cannot be deleted';
      END IF;

      IF NEW.start_ms IS DISTINCT FROM OLD.start_ms
        OR NEW.deck IS DISTINCT FROM OLD.deck
        OR NEW.seed IS DISTINCT FROM OLD.seed
        OR NEW.commitment IS DISTINCT FROM OLD.commitment
        OR (OLD.settled AND NOT NEW.settled)
      THEN
        RAISE EXCEPTION 'Committed round cannot be changed';
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS tsb_so_card_round_immutable
      ON tsb_so_card_rounds;

    CREATE TRIGGER tsb_so_card_round_immutable
      BEFORE UPDATE OR DELETE
      ON tsb_so_card_rounds
      FOR EACH ROW
      EXECUTE FUNCTION tsb_so_card_round_protect();
  `);
}

async function tx(pool, fn) {
  const c = await pool.connect();

  try {
    await c.query("BEGIN");

    await c.query(
      "SELECT pg_advisory_xact_lock(746226)",
    );

    const result =
      await fn(c);

    await c.query("COMMIT");

    return result;
  } catch (error) {
    await c.query("ROLLBACK");

    throw error;
  } finally {
    c.release();
  }
}

async function credit(
  c,
  bet,
  winner,
  note,
) {
  const amount =
    payout(bet, winner);

  if (amount) {
    await c.query(
      `
        UPDATE customers
        SET
          demo_coin_balance =
            demo_coin_balance + $1,
          updated_at = NOW()
        WHERE id=$2
      `,
      [
        amount,
        bet.customer_id,
      ],
    );

    await c.query(
      `
        INSERT INTO demo_coin_transactions(
          customer_id,
          amount,
          transaction_type,
          note
        )
        VALUES($1,$2,'SO_RETURN',$3)
      `,
      [
        bet.customer_id,
        amount,
        note,
      ],
    );
  }

  return amount;
}

async function tableExists(
  c,
  name,
) {
  const result = await c.query(
    "SELECT to_regclass($1) AS name",
    [`public.${name}`],
  );

  return Boolean(
    result.rows[0]?.name,
  );
}

async function settleOld(
  c,
  now,
) {
  if (
    await tableExists(
      c,
      "tsb_so_matches",
    )
  ) {
    const result = await c.query(
      `
        SELECT *
        FROM tsb_so_matches
        WHERE
          settled=FALSE
          AND start_ms<=$1
        ORDER BY start_ms
        FOR UPDATE
      `,
      [now],
    );

    for (
      const row of result.rows
    ) {
      const finish =
        Number(row.start_ms) +
        row.outcome.events.length *
          15000;

      if (now < finish) {
        continue;
      }

      const betsResult =
        await c.query(
          `
            SELECT *
            FROM tsb_so_bets
            WHERE
              match_id=$1
              AND status='PLACED'
            ORDER BY customer_id,id
            FOR UPDATE
          `,
          [row.id],
        );

      for (
        const bet of betsResult.rows
      ) {
        const returned =
          await credit(
            c,
            bet,
            row.outcome.winner,
            `Legacy SO #${row.id}; saved outcome; stake included`,
          );

        await c.query(
          `
            UPDATE tsb_so_bets
            SET
              status='SETTLED',
              payout=$1
            WHERE id=$2
          `,
          [
            returned,
            bet.id,
          ],
        );
      }

      await c.query(
        `
          UPDATE tsb_so_matches
          SET settled=TRUE
          WHERE id=$1
        `,
        [row.id],
      );
    }
  }

  if (
    !(
      await tableExists(
        c,
        "tsb_so_manual_matches",
      )
    )
  ) {
    return;
  }

  const result = await c.query(
    `
      SELECT *
      FROM tsb_so_manual_matches
      WHERE
        ready=TRUE
        AND settled=FALSE
        AND start_ms<=$1
      ORDER BY start_ms
      FOR UPDATE
    `,
    [now + PREBET_MS],
  );

  for (
    const row of result.rows
  ) {
    const balls =
      await legacyBalls(
        c,
        row.id,
      );

    for (
      let seq = balls.length;
      seq < 12;
      seq++
    ) {
      const next =
        nextDelivery(balls);

      if (!next) {
        break;
      }

      const opens =
        Number(row.start_ms) +
        (
          seq === 0
            ? -PREBET_MS
            : seq * BALL_MS
        );

      if (now < opens) {
        break;
      }

      const value =
        row.plan[
          next.planIndex
        ];

      if (
        !ALLOWED_BALLS.includes(
          value,
        )
      ) {
        throw new Error(
          "Invalid saved legacy ball plan; settlement requires review",
        );
      }

      const seed =
        randomBytes(32)
          .toString("hex");

      const payload = {
        matchId:
          `M${row.id}`,

        seq,

        team:
          next.team,

        teamBall:
          next.teamBall,

        value,
      };

      const ballResult =
        await c.query(
          `
            INSERT INTO tsb_so_manual_balls(
              match_id,
              seq,
              team,
              team_ball,
              value,
              opens_ms,
              reveals_ms,
              seed,
              commitment
            )
            VALUES(
              $1,$2,$3,$4,$5,
              $6,$7,$8,$9
            )
            RETURNING *
          `,
          [
            row.id,
            seq,
            next.team,
            next.teamBall,
            String(value),
            opens,

            Number(
              row.start_ms,
            ) +
              seq * BALL_MS +
              WINDOW_MS,

            seed,

            commitment(
              payload,
              seed,
            ),
          ],
        );

      balls.push(
        ballResult.rows[0],
      );
    }

    if (
      !balls.length ||
      nextDelivery(balls) ||
      now <
        Number(row.start_ms) +
          balls.length *
            BALL_MS
    ) {
      continue;
    }

    const betsResult =
      await c.query(
        `
          SELECT *
          FROM tsb_so_manual_bets
          WHERE
            match_id=$1
            AND status='PLACED'
          ORDER BY customer_id,id
          FOR UPDATE
        `,
        [row.id],
      );

    for (
      const bet of betsResult.rows
    ) {
      const returned =
        await credit(
          c,
          bet,
          matchWinner(balls),
          `Legacy controlled SO M${row.id}; saved plan; stake included`,
        );

      await c.query(
        `
          UPDATE tsb_so_manual_bets
          SET
            status='SETTLED',
            payout=$1
          WHERE id=$2
        `,
        [
          returned,
          bet.id,
        ],
      );
    }

    await c.query(
      `
        UPDATE tsb_so_manual_matches
        SET settled=TRUE
        WHERE id=$1
      `,
      [row.id],
    );
  }
}

async function ensureRound(
  c,
  start,
) {
  const found = await c.query(
    `
      SELECT *
      FROM tsb_so_card_rounds
      WHERE start_ms=$1
    `,
    [start],
  );

  if (found.rows[0]) {
    return found.rows[0];
  }

  const plan =
    newCardRound(start);

  const result = await c.query(
    `
      INSERT INTO tsb_so_card_rounds(
        start_ms,
        deck,
        seed,
        commitment
      )
      VALUES($1,$2,$3,$4)
      RETURNING *
    `,
    [
      start,

      JSON.stringify(
        plan.deck,
      ),

      plan.seed,

      plan.commitment,
    ],
  );

  return result.rows[0];
}

async function settleCards(
  c,
  now,
) {
  const result = await c.query(
    `
      SELECT *
      FROM tsb_so_card_rounds
      WHERE
        settled=FALSE
        AND start_ms<=$1
      ORDER BY start_ms
      FOR UPDATE
    `,
    [
      now -
        CARD_TRANSFER_MS -
        CARD_BET_MS,
    ],
  );

  for (
    const row of result.rows
  ) {
    const events =
      cardEvents(row.deck);

    const finish =
      Number(row.start_ms) +
      events.at(-1).at;

    if (now < finish) {
      continue;
    }

    const betsResult =
      await c.query(
        `
          SELECT *
          FROM tsb_so_card_bets
          WHERE
            match_id=$1
            AND status='PLACED'
          ORDER BY customer_id,id
          FOR UPDATE
        `,
        [row.id],
      );

    for (
      const bet of betsResult.rows
    ) {
      const returned =
        await credit(
          c,
          bet,
          matchWinner(events),
          `Instant SO C${row.id}; total return includes stake`,
        );

      await c.query(
        `
          UPDATE tsb_so_card_bets
          SET
            status='SETTLED',
            payout=$1
          WHERE id=$2
        `,
        [
          returned,
          bet.id,
        ],
      );
    }

    await c.query(
      `
        UPDATE tsb_so_card_rounds
        SET settled=TRUE
        WHERE id=$1
      `,
      [row.id],
    );
  }
}

async function advanceAll(
  c,
  now,
) {
  await settleOld(c, now);
  await settleCards(c, now);
}

const publicBet = (
  bet,
  prefix = "C",
) => ({
  ...bet,

  id:
    `${prefix}B${bet.id}`,

  match_id:
    `${prefix}${bet.match_id}`,
});

const balanceOf = async (
  c,
  id,
) => {
  const result = await c.query(
    `
      SELECT demo_coin_balance
      FROM customers
      WHERE id=$1
    `,
    [id],
  );

  return Number(
    result.rows[0]
      ?.demo_coin_balance,
  );
};

async function history(
  c,
  id,
) {
  const result = await c.query(
    `
      SELECT *
      FROM tsb_so_card_bets
      WHERE customer_id=$1
      ORDER BY id DESC
      LIMIT 100
    `,
    [id],
  );

  const rows =
    result.rows.map(
      bet =>
        publicBet(bet),
    );

  if (
    await tableExists(
      c,
      "tsb_so_manual_bets",
    )
  ) {
    const old = await c.query(
      `
        SELECT *
        FROM tsb_so_manual_bets
        WHERE customer_id=$1
        ORDER BY id DESC
        LIMIT 100
      `,
      [id],
    );

    rows.push(
      ...old.rows.map(
        bet =>
          publicBet(
            bet,
            "M",
          ),
      ),
    );
  }

  if (
    await tableExists(
      c,
      "tsb_so_bets",
    )
  ) {
    const old = await c.query(
      `
        SELECT *
        FROM tsb_so_bets
        WHERE customer_id=$1
        ORDER BY id DESC
        LIMIT 100
      `,
      [id],
    );

    rows.push(
      ...old.rows.map(
        bet =>
          publicBet(
            bet,
            "L",
          ),
      ),
    );
  }

  return rows
    .sort(
      (a, b) =>
        new Date(
          b.created_at,
        ) -
        new Date(
          a.created_at,
        ),
    )
    .slice(0, 100);
}

export function registerAnimatedCricketRoutes(
  app,
  pool,
) {
  const prefix =
    "/api/animated-cricket";

  const guard = (
    req,
    res,
    next,
  ) => {
    res.set(
      "Cache-Control",
      "no-store",
    );

    if (!isDemo()) {
      return res
        .status(409)
        .json({
          error:
            "Demo mode only.",
        });
    }

    if (
      req.method !== "GET" &&
      req.headers.origin
    ) {
      try {
        const origin =
          new URL(
            req.headers.origin,
          );

        if (
          origin.host !==
          req.headers.host
        ) {
          throw new Error();
        }
      } catch {
        return res
          .status(403)
          .json({
            error:
              "Invalid request origin.",
          });
      }
    }

    next();
  };

  app.use(
    prefix,
    guard,
  );

  app.use(
    "/api/admin/so-control",
    guard,
    (req, res) =>
      res.status(410).json({
        error:
          "Instant Super Over now uses automatic random cards. Outcome control is disabled.",
      }),
  );

  const customer = wrap(
    async (
      req,
      res,
      next,
    ) => {
      const token =
        String(
          req.headers.cookie ||
            "",
        )
          .split(";")
          .map(
            value =>
              value.trim(),
          )
          .find(
            value =>
              value.startsWith(
                "tsb_demo_session=",
              ),
          )
          ?.slice(17) || "";

      if (
        !/^[a-f0-9]{64}$/.test(
          token,
        )
      ) {
        throw fail(
          401,
          "Customer login required.",
        );
      }

      const result =
        await pool.query(
          `
            SELECT c.id
            FROM demo_customer_sessions s
            JOIN customers c
              ON c.id=s.customer_id
            WHERE
              s.token_hash=$1
              AND s.expires_at>NOW()
              AND c.status='ACTIVE'
          `,
          [hash(token)],
        );

      const found =
        result.rows[0];

      if (!found) {
        throw fail(
          401,
          "Customer session expired. Login again.",
        );
      }

      req.customerId =
        found.id;

      next();
    },
  );

  app.get(
    prefix + "/schedule",

    wrap(
      async (req, res) => {
        const result =
          await tx(
            pool,
            async c => {
              const now =
                await clock(c);

              await advanceAll(
                c,
                now,
              );

              const start =
                Math.floor(
                  now /
                    CARD_ROUND_MS,
                ) *
                CARD_ROUND_MS;

              const matches = [];

              for (
                const offset of [
                  0,
                  CARD_ROUND_MS,
                ]
              ) {
                const row =
                  await ensureRound(
                    c,
                    start +
                      offset,
                  );

                const view =
                  publicCardMatch(
                    row,
                    now,
                  );

                matches.push({
                  id:
                    view.id,

                  startAt:
                    view.startAt,

                  endsAt:
                    view.latestEndAt,

                  teams:
                    view.teams,

                  phase:
                    now <
                    Number(
                      row.start_ms,
                    )
                      ? "WAITING"
                      : view.phase,
                });
              }

              return {
                serverTime:
                  new Date(
                    now,
                  ).toISOString(),

                matches,
              };
            },
          );

        res.json(result);
      },
    ),
  );

  app.get(
    prefix + "/state",

    customer,

    wrap(
      async (req, res) => {
        const result =
          await tx(
            pool,
            async c => {
              const now =
                await clock(c);

              await advanceAll(
                c,
                now,
              );

              const start =
                Math.floor(
                  now /
                    CARD_ROUND_MS,
                ) *
                CARD_ROUND_MS;

              const row =
                await ensureRound(
                  c,
                  start,
                );

              await settleCards(
                c,
                now,
              );

              return {
                serverTime:
                  new Date(
                    now,
                  ).toISOString(),

                customerId:
                  req.customerId,

                balance:
                  await balanceOf(
                    c,
                    req.customerId,
                  ),

                bets:
                  await history(
                    c,
                    req.customerId,
                  ),

                match:
                  publicCardMatch(
                    row,
                    now,
                  ),
              };
            },
          );

        res.json(result);
      },
    ),
  );

  app.post(
    prefix + "/bets",

    customer,

    wrap(
      async (req, res) => {
        const b =
          req.body || {};

        if (
          !/^[CM]\d{1,18}$/.test(
            String(b.matchId),
          ) ||
          ![0, 1].includes(
            b.team,
          ) ||
          ![
            "BACK",
            "LAY",
          ].includes(
            b.direction,
          ) ||
          !Number.isSafeInteger(
            b.amount,
          ) ||
          b.amount < 100 ||
          b.amount > 25000 ||
          !Number.isInteger(
            b.points,
          ) ||
          !Number.isInteger(
            b.quoteVersion,
          ) ||
          !/^(PRE|\d{1,2})$/.test(
            String(b.windowId),
          ) ||
          !/^[a-zA-Z0-9_-]{16,100}$/.test(
            String(b.requestKey),
          )
        ) {
          throw fail(
            400,
            "Choose a valid selection and 100–25,000 whole demo coins.",
          );
        }

        const result =
          await tx(
            pool,
            async c => {
              const old =
                b.matchId.startsWith(
                  "M",
                );

              const id =
                b.matchId.slice(1);

              const table = old
                ? "tsb_so_manual_bets"
                : "tsb_so_card_bets";

              const exists =
                !old ||
                await tableExists(
                  c,
                  table,
                );

              const prior = exists
                ? (
                    await c.query(
                      `
                        SELECT *
                        FROM ${table}
                        WHERE
                          customer_id=$1
                          AND request_key=$2
                      `,
                      [
                        req.customerId,
                        b.requestKey,
                      ],
                    )
                  ).rows[0]
                : null;

              if (prior) {
                if (
                  String(
                    prior.match_id,
                  ) !== id ||
                  Number(
                    prior.team,
                  ) !== b.team ||
                  prior.direction !==
                    b.direction ||
                  Number(
                    prior.amount,
                  ) !== b.amount ||
                  Number(
                    prior.points,
                  ) !== b.points ||
                  prior.window_id !==
                    b.windowId ||
                  Number(
                    prior.quote_version,
                  ) !==
                    b.quoteVersion
                ) {
                  throw fail(
                    409,
                    "Request key already used for another bet.",
                  );
                }

                await advanceAll(
                  c,
                  await clock(c),
                );

                const latest =
                  (
                    await c.query(
                      `
                        SELECT *
                        FROM ${table}
                        WHERE id=$1
                      `,
                      [prior.id],
                    )
                  ).rows[0];

                return {
                  success: true,
                  duplicate: true,

                  bet:
                    publicBet(
                      latest,
                      old
                        ? "M"
                        : "C",
                    ),

                  balance:
                    await balanceOf(
                      c,
                      req.customerId,
                    ),
                };
              }

              if (old) {
                throw fail(
                  409,
                  "New bets on the old game are closed. Previously accepted bets retain their original rules.",
                );
              }

              if (
                b.direction !==
                  "BACK" ||
                b.points !==
                  CARD_POINTS ||
                b.quoteVersion !==
                  1 ||
                b.windowId !==
                  "PRE"
              ) {
                throw fail(
                  409,
                  "Select the current 1.98 Back price.",
                );
              }

              let now =
                await clock(c);

              await advanceAll(
                c,
                now,
              );

              const row =
                (
                  await c.query(
                    `
                      SELECT *
                      FROM tsb_so_card_rounds
                      WHERE id=$1
                    `,
                    [id],
                  )
                ).rows[0];

              if (!row) {
                throw fail(
                  404,
                  "Round not found.",
                );
              }

              const valid = () =>
                publicCardMatch(
                  row,
                  now,
                ).phase ===
                "BETTING";

              if (!valid()) {
                throw fail(
                  409,
                  "Betting window has ended. Wait for the next round.",
                );
              }

              const wallet =
                (
                  await c.query(
                    `
                      SELECT
                        demo_coin_balance,
                        status
                      FROM customers
                      WHERE id=$1
                      FOR UPDATE
                    `,
                    [
                      req.customerId,
                    ],
                  )
                ).rows[0];

              if (
                wallet?.status !==
                "ACTIVE"
              ) {
                throw fail(
                  403,
                  "Customer is inactive.",
                );
              }

              const total =
                (
                  await c.query(
                    `
                      SELECT
                        COUNT(*) AS count,
                        COALESCE(
                          SUM(hold),
                          0
                        ) AS held
                      FROM tsb_so_card_bets
                      WHERE
                        match_id=$1
                        AND customer_id=$2
                    `,
                    [
                      id,
                      req.customerId,
                    ],
                  )
                ).rows[0];

              if (
                Number(
                  total.count,
                ) >= 100 ||
                Number(
                  total.held,
                ) +
                  b.amount >
                  100000
              ) {
                throw fail(
                  400,
                  "Match limit reached.",
                );
              }

              if (
                Number(
                  wallet.demo_coin_balance,
                ) < b.amount
              ) {
                throw fail(
                  400,
                  "Insufficient demo coins.",
                );
              }

              now =
                await clock(c);

              if (!valid()) {
                throw fail(
                  409,
                  "Betting window ended while confirming.",
                );
              }

              await c.query(
                `
                  UPDATE customers
                  SET
                    demo_coin_balance =
                      demo_coin_balance - $1,
                    updated_at=NOW()
                  WHERE id=$2
                `,
                [
                  b.amount,
                  req.customerId,
                ],
              );

              await c.query(
                `
                  INSERT INTO demo_coin_transactions(
                    customer_id,
                    amount,
                    transaction_type,
                    note
                  )
                  VALUES(
                    $1,$2,'SO_BET',$3
                  )
                `,
                [
                  req.customerId,

                  -b.amount,

                  `Instant SO ${b.matchId}; BACK ${
                    b.team === 0
                      ? "INDIA"
                      : "AUSTRALIA"
                  }; 1.98 total odds`,
                ],
              );

              const winReturn =
                b.amount +
                Math.floor(
                  (
                    b.amount *
                    CARD_POINTS
                  ) / 100,
                );

              const bet =
                (
                  await c.query(
                    `
                      INSERT INTO tsb_so_card_bets(
                        match_id,
                        customer_id,
                        team,
                        direction,
                        amount,
                        points,
                        hold,
                        win_return,
                        window_id,
                        quote_version,
                        request_key
                      )
                      VALUES(
                        $1,
                        $2,
                        $3,
                        'BACK',
                        $4,
                        98,
                        $4,
                        $5,
                        'PRE',
                        1,
                        $6
                      )
                      RETURNING *
                    `,
                    [
                      id,
                      req.customerId,
                      b.team,
                      b.amount,
                      winReturn,
                      b.requestKey,
                    ],
                  )
                ).rows[0];

              return {
                success: true,

                bet:
                  publicBet(bet),

                balance:
                  await balanceOf(
                    c,
                    req.customerId,
                  ),
              };
            },
          );

        res.json(result);
      },
    ),
  );

  let timer;
  let busy = false;

  const tick = async () => {
    if (
      busy ||
      !isDemo()
    ) {
      return;
    }

    busy = true;

    try {
      await tx(
        pool,
        async c => {
          const now =
            await clock(c);

          await advanceAll(
            c,
            now,
          );

          await ensureRound(
            c,

            Math.floor(
              now /
                CARD_ROUND_MS,
            ) *
              CARD_ROUND_MS,
          );

          await settleCards(
            c,
            now,
          );
        },
      );
    } catch (error) {
      console.error(
        "Instant Super Over tick failed:",
        error.message,
      );
    } finally {
      busy = false;
    }
  };

  return {
    start() {
      if (!timer) {
        void tick();

        timer =
          setInterval(
            tick,
            500,
          );

        timer.unref?.();
      }
    },

    stop() {
      clearInterval(timer);
      timer = null;
    },

    tick,
  };
}
