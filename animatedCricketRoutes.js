import { createHash, randomBytes } from "node:crypto";
import {
  INTERVAL_MS,
  BALL_MS,
  PREBET_MS,
  createMatch,
  commitment,
  viewMatch,
  betAmounts,
  payout,
  teamsAt,
} from "./animatedCricketRules.js";

const hash = (value) =>
  createHash("sha256").update(value).digest("hex");

const fail = (status, message) =>
  Object.assign(new Error(message), { status });

const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export async function initializeAnimatedCricket(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tsb_so_matches (
      id BIGSERIAL PRIMARY KEY,
      start_ms BIGINT UNIQUE NOT NULL,
      outcome JSONB NOT NULL,
      seed TEXT NOT NULL,
      commitment TEXT NOT NULL,
      settled BOOLEAN NOT NULL DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS tsb_so_bets (
      id BIGSERIAL PRIMARY KEY,
      match_id BIGINT NOT NULL REFERENCES tsb_so_matches(id),
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      team INTEGER NOT NULL CHECK(team IN(0,1)),
      direction TEXT NOT NULL CHECK(direction IN('BACK','LAY')),
      amount INTEGER NOT NULL CHECK(amount>=100),
      points INTEGER NOT NULL,
      hold INTEGER NOT NULL,
      win_return INTEGER NOT NULL,
      window_id TEXT NOT NULL,
      request_key TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PLACED',
      payout INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(customer_id,request_key)
    );

    CREATE INDEX IF NOT EXISTS tsb_so_unsettled
      ON tsb_so_matches(start_ms)
      WHERE settled=FALSE;

    CREATE INDEX IF NOT EXISTS tsb_so_customer_bets
      ON tsb_so_bets(customer_id,id DESC);

    CREATE OR REPLACE FUNCTION tsb_so_protect()
    RETURNS trigger AS $$
    BEGIN
      IF TG_OP='DELETE' THEN
        RAISE EXCEPTION 'Match history cannot be deleted';
      END IF;

      IF NEW.id IS DISTINCT FROM OLD.id
      OR NEW.start_ms IS DISTINCT FROM OLD.start_ms
      OR NEW.outcome IS DISTINCT FROM OLD.outcome
      OR NEW.seed IS DISTINCT FROM OLD.seed
      OR NEW.commitment IS DISTINCT FROM OLD.commitment
      OR (OLD.settled AND NOT NEW.settled)
      THEN
        RAISE EXCEPTION 'Match plan is immutable';
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS tsb_so_immutable
      ON tsb_so_matches;

    CREATE TRIGGER tsb_so_immutable
      BEFORE UPDATE OR DELETE ON tsb_so_matches
      FOR EACH ROW EXECUTE FUNCTION tsb_so_protect();
  `);
}

async function tx(pool, fn) {
  const c = await pool.connect();

  try {
    await c.query("BEGIN");
    await c.query("SELECT pg_advisory_xact_lock(746226)");

    const result = await fn(c);

    await c.query("COMMIT");
    return result;
  } catch (error) {
    await c.query("ROLLBACK");
    throw error;
  } finally {
    c.release();
  }
}

const clock = async (c) =>
  new Date(
    (
      await c.query(
        "SELECT clock_timestamp() AS now",
        [],
      )
    ).rows[0].now,
  ).getTime();

async function settleDue(c, now) {
  const rows = (
    await c.query(
      `SELECT *
       FROM tsb_so_matches
       WHERE settled=FALSE AND start_ms<=$1
       ORDER BY start_ms
       FOR UPDATE`,
      [now],
    )
  ).rows;

  for (const row of rows) {
    const endsAt =
      Number(row.start_ms) +
      row.outcome.events.length * BALL_MS;

    if (now < endsAt) continue;

    const bets = (
      await c.query(
        `SELECT *
         FROM tsb_so_bets
         WHERE match_id=$1 AND status='PLACED'
         ORDER BY customer_id,id
         FOR UPDATE`,
        [row.id],
      )
    ).rows;

    for (const bet of bets) {
      const returned = payout(
        bet,
        row.outcome.winner,
      );

      if (returned) {
        await c.query(
          `UPDATE customers
           SET demo_coin_balance=demo_coin_balance+$1,
               updated_at=NOW()
           WHERE id=$2`,
          [returned, bet.customer_id],
        );

        await c.query(
          `INSERT INTO demo_coin_transactions(
             customer_id,
             amount,
             transaction_type,
             note
           )
           VALUES($1,$2,'SO_RETURN',$3)`,
          [
            bet.customer_id,
            returned,
            `Animated SO #${row.id}; stake included`,
          ],
        );
      }

      await c.query(
        `UPDATE tsb_so_bets
         SET status='SETTLED',payout=$1
         WHERE id=$2`,
        [returned, bet.id],
      );
    }

    await c.query(
      `UPDATE tsb_so_matches
       SET settled=TRUE
       WHERE id=$1`,
      [row.id],
    );
  }
}

async function ensure(c, start) {
  let row = (
    await c.query(
      `SELECT *
       FROM tsb_so_matches
       WHERE start_ms=$1`,
      [start],
    )
  ).rows[0];

  if (!row) {
    const outcome = createMatch(start);
    const seed = randomBytes(32).toString("hex");

    row = (
      await c.query(
        `INSERT INTO tsb_so_matches(
           start_ms,
           outcome,
           seed,
           commitment
         )
         VALUES($1,$2,$3,$4)
         RETURNING *`,
        [
          start,
          JSON.stringify(outcome),
          seed,
          commitment(outcome, seed),
        ],
      )
    ).rows[0];
  }

  return row;
}

async function current(c, now) {
  const slot =
    Math.floor(now / INTERVAL_MS) * INTERVAL_MS;

  const start =
    now >= slot + INTERVAL_MS - PREBET_MS
      ? slot + INTERVAL_MS
      : slot;

  return ensure(c, start);
}

export function registerAnimatedCricketRoutes(
  app,
  pool,
) {
  const prefix = "/api/animated-cricket";

  app.use(prefix, (req, res, next) => {
    res.set("Cache-Control", "no-store");

    if (
      String(
        process.env.SPORTS_API_MODE || "demo",
      ).toLowerCase() !== "demo"
    ) {
      return res.status(409).json({
        error: "Demo mode only.",
      });
    }

    if (
      req.method === "POST" &&
      req.headers.origin
    ) {
      try {
        if (
          new URL(req.headers.origin).host !==
          req.headers.host
        ) {
          throw Error();
        }
      } catch {
        return res.status(403).json({
          error: "Invalid request origin.",
        });
      }
    }

    next();
  });

  const customer = wrap(
    async (req, res, next) => {
      const token =
        String(req.headers.cookie || "")
          .split(";")
          .map((x) => x.trim())
          .find((x) =>
            x.startsWith("tsb_demo_session="),
          )
          ?.slice(17) || "";

      if (!/^[a-f0-9]{64}$/.test(token)) {
        throw fail(
          401,
          "Customer login required.",
        );
      }

      const row = (
        await pool.query(
          `SELECT c.id
           FROM demo_customer_sessions s
           JOIN customers c
             ON c.id=s.customer_id
           WHERE s.token_hash=$1
             AND s.expires_at>NOW()
             AND c.status='ACTIVE'`,
          [hash(token)],
        )
      ).rows[0];

      if (!row) {
        throw fail(
          401,
          "Customer session expired. Login again.",
        );
      }

      req.customerId = row.id;
      next();
    },
  );

  app.get(
    prefix + "/schedule",
    wrap(async (req, res) => {
      const now = await clock(pool);
      const slot =
        Math.floor(now / INTERVAL_MS) *
        INTERVAL_MS;

      res.json({
        serverTime: new Date(now).toISOString(),
        matches: Array.from(
          { length: 8 },
          (_, i) => ({
            startAt: new Date(
              slot + i * INTERVAL_MS,
            ).toISOString(),
            teams: teamsAt(
              slot + i * INTERVAL_MS,
            ),
          }),
        ),
      });
    }),
  );

  app.get(
    prefix + "/state",
    customer,
    wrap(async (req, res) => {
      res.json(
        await tx(pool, async (c) => {
          const now = await clock(c);

          await settleDue(c, now);

          const row = await current(c, now);

          await settleDue(c, now);

          const balance = Number(
            (
              await c.query(
                `SELECT demo_coin_balance
                 FROM customers
                 WHERE id=$1`,
                [req.customerId],
              )
            ).rows[0].demo_coin_balance,
          );

          const bets = (
            await c.query(
              `SELECT *
               FROM tsb_so_bets
               WHERE customer_id=$1
               ORDER BY id DESC
               LIMIT 100`,
              [req.customerId],
            )
          ).rows;

          return {
            serverTime:
              new Date(now).toISOString(),
            match: viewMatch(row, now),
            balance,
            bets,
          };
        }),
      );
    }),
  );

  app.post(
    prefix + "/bets",
    customer,
    wrap(async (req, res) => {
      const {
        matchId,
        windowId,
        team,
        direction,
        amount,
        points,
        requestKey,
      } = req.body || {};

      if (
        !/^\d{1,18}$/.test(String(matchId)) ||
        ![0, 1].includes(team) ||
        !["BACK", "LAY"].includes(direction) ||
        !Number.isSafeInteger(amount) ||
        amount < 100 ||
        amount > 25000 ||
        !Number.isInteger(points) ||
        !/^[a-zA-Z0-9_-]{16,100}$/.test(
          String(requestKey),
        ) ||
        !/^(PRE|\d{1,2})$/.test(
          String(windowId),
        )
      ) {
        throw fail(
          400,
          "Choose a valid selection and 100–25,000 whole demo coins.",
        );
      }

      res.json(
        await tx(pool, async (c) => {
          const prior = (
            await c.query(
              `SELECT *
               FROM tsb_so_bets
               WHERE customer_id=$1
                 AND request_key=$2`,
              [req.customerId, requestKey],
            )
          ).rows[0];

          if (prior) {
            if (
              String(prior.match_id) !==
                String(matchId) ||
              prior.team !== team ||
              prior.direction !== direction ||
              prior.amount !== amount ||
              prior.points !== points ||
              prior.window_id !== windowId
            ) {
              throw fail(
                409,
                "Request key already used.",
              );
            }

            return {
              success: true,
              duplicate: true,
              bet: prior,
            };
          }

          let now = await clock(c);

          await settleDue(c, now);

          const row = await current(c, now);
          const view = viewMatch(row, now);

          if (
            view.id !== String(matchId) ||
            view.phase !== "BETTING" ||
            view.windowId !== windowId
          ) {
            throw fail(
              409,
              "This betting window is closed.",
            );
          }

          if (
            view.rates[team][
              direction.toLowerCase()
            ] !== points
          ) {
            throw fail(
              409,
              "Rate changed. Review the new rate.",
            );
          }

          const wallet = (
            await c.query(
              `SELECT demo_coin_balance,status
               FROM customers
               WHERE id=$1
               FOR UPDATE`,
              [req.customerId],
            )
          ).rows[0];

          if (wallet?.status !== "ACTIVE") {
            throw fail(
              403,
              "Customer is inactive.",
            );
          }

          const totals = (
            await c.query(
              `SELECT
                 COUNT(*) AS count,
                 COALESCE(SUM(hold),0) AS held
               FROM tsb_so_bets
               WHERE customer_id=$1
                 AND match_id=$2`,
              [req.customerId, matchId],
            )
          ).rows[0];

          const { hold, winReturn } =
            betAmounts(
              amount,
              direction,
              points,
            );

          if (
            Number(totals.count) >= 100 ||
            Number(totals.held) + hold > 100000
          ) {
            throw fail(
              400,
              "Match limit reached: 100 requests or 100,000 reserved coins.",
            );
          }

          if (
            Number(wallet.demo_coin_balance) <
            hold
          ) {
            throw fail(
              400,
              "Insufficient demo coins.",
            );
          }

          now = await clock(c);

          const latest = viewMatch(row, now);

          if (
            latest.phase !== "BETTING" ||
            latest.windowId !== windowId ||
            latest.rates[team][
              direction.toLowerCase()
            ] !== points
          ) {
            throw fail(
              409,
              "Betting locked. Wait for the next window.",
            );
          }

          await c.query(
            `UPDATE customers
             SET demo_coin_balance=demo_coin_balance-$1,
                 updated_at=NOW()
             WHERE id=$2`,
            [hold, req.customerId],
          );

          await c.query(
            `INSERT INTO demo_coin_transactions(
               customer_id,
               amount,
               transaction_type,
               note
             )
             VALUES($1,$2,'SO_BET',$3)`,
            [
              req.customerId,
              -hold,
              `Animated SO #${matchId}; ${direction} ${row.outcome.teams[team]}`,
            ],
          );

          const bet = (
            await c.query(
              `INSERT INTO tsb_so_bets(
                 match_id,
                 customer_id,
                 team,
                 direction,
                 amount,
                 points,
                 hold,
                 win_return,
                 window_id,
                 request_key
               )
               VALUES(
                 $1,$2,$3,$4,$5,
                 $6,$7,$8,$9,$10
               )
               RETURNING *`,
              [
                matchId,
                req.customerId,
                team,
                direction,
                amount,
                points,
                hold,
                winReturn,
                windowId,
                requestKey,
              ],
            )
          ).rows[0];

          return {
            success: true,
            bet,
          };
        }),
      );
    }),
  );

  let timer;
  let busy = false;

  const tick = async () => {
    if (
      busy ||
      String(
        process.env.SPORTS_API_MODE || "demo",
      ).toLowerCase() !== "demo"
    ) {
      return;
    }

    busy = true;

    try {
      await tx(pool, async (c) => {
        const now = await clock(c);

        await settleDue(c, now);
        await current(c, now);
        await settleDue(c, now);
      });
    } catch (error) {
      console.error(
        "Animated cricket tick failed",
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
        timer = setInterval(tick, 500);
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
