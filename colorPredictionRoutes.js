import { createHash } from "node:crypto";

import {
  COLOR_MODES,
  COLOR_MARKETS,
  COLOR_BET_LIMITS,
  COLOR_FEE_PERCENT,
  COLOR_RULES_TEXT,
  colorModeFor,
  colorMarketFor,
  validColorStake,
  drawColorResult,
  colorResultFor,
  colorBetReturn,
  colorRoundWindow,
} from "./colorPredictionRules.js";

const LOCK_ID = 746238;
const CONTROL_GAME = "color-prediction";

const hash = value =>
  createHash("sha256").update(value).digest("hex");

const fail = (status, message) =>
  Object.assign(new Error(message), { status });

const wrap = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const validId = value =>
  /^\d{1,18}$/.test(String(value));

const validRequestKey = value =>
  typeof value === "string" &&
  /^[a-zA-Z0-9_-]{16,100}$/.test(value);

const demoMode = () =>
  String(process.env.DEMO_GAMES_MODE ?? "demo")
    .trim()
    .toLowerCase() === "demo";

async function databaseTime(connection) {
  const result = await connection.query(
    "SELECT clock_timestamp() AS now",
  );

  return new Date(result.rows[0].now).getTime();
}

async function transaction(pool, callback) {
  const connection = await pool.connect();

  try {
    await connection.query("BEGIN");

    await connection.query(
      "SELECT pg_advisory_xact_lock($1)",
      [LOCK_ID],
    );

    const result = await callback(connection);

    await connection.query("COMMIT");
    return result;
  } catch (error) {
    await connection.query("ROLLBACK");
    throw error;
  } finally {
    connection.release();
  }
}

export async function initializeColorPrediction(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tsb_color_control (
      game TEXT PRIMARY KEY
        CHECK (game='color-prediction'),
      paused BOOLEAN NOT NULL DEFAULT FALSE,
      paused_at TIMESTAMPTZ,
      paused_ms BIGINT NOT NULL DEFAULT 0
        CHECK (paused_ms>=0),
      version INTEGER NOT NULL DEFAULT 0,
      CHECK (
        (paused=TRUE AND paused_at IS NOT NULL)
        OR
        (paused=FALSE AND paused_at IS NULL)
      )
    );

    INSERT INTO tsb_color_control(game)
    VALUES('color-prediction')
    ON CONFLICT DO NOTHING;

    CREATE TABLE IF NOT EXISTS tsb_color_control_audit (
      id BIGSERIAL PRIMARY KEY,
      admin_id TEXT NOT NULL,
      action TEXT NOT NULL
        CHECK (action IN ('PLAY','PAUSE')),
      version INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tsb_color_rounds (
      id BIGSERIAL PRIMARY KEY,
      mode TEXT NOT NULL
        CHECK (mode IN ('30s','1m','3m','5m')),
      period TEXT NOT NULL UNIQUE,
      result_number INTEGER NOT NULL
        CHECK (result_number BETWEEN 0 AND 9),
      opens_at TIMESTAMPTZ NOT NULL,
      closes_at TIMESTAMPTZ NOT NULL,
      ends_at TIMESTAMPTZ NOT NULL,
      settled BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS tsb_color_round_mode_index
      ON tsb_color_rounds(mode,id DESC);

    CREATE TABLE IF NOT EXISTS tsb_color_bets (
      id BIGSERIAL PRIMARY KEY,
      round_id BIGINT NOT NULL
        REFERENCES tsb_color_rounds(id),
      customer_id INTEGER NOT NULL
        REFERENCES customers(id),
      market TEXT NOT NULL,
      amount INTEGER NOT NULL
        CHECK (amount BETWEEN 100 AND 25000),
      request_key TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PLACED'
        CHECK (
          status IN (
            'PLACED','WON','LOST','CANCELLED'
          )
        ),
      payout INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      settled_at TIMESTAMPTZ,
      UNIQUE(customer_id,request_key)
    );

    CREATE INDEX IF NOT EXISTS tsb_color_bet_customer_index
      ON tsb_color_bets(customer_id,id DESC);

    CREATE INDEX IF NOT EXISTS tsb_color_bet_round_index
      ON tsb_color_bets(round_id,id);

    CREATE OR REPLACE FUNCTION tsb_color_protect_round()
      RETURNS trigger AS $$
    BEGIN
      IF TG_OP='DELETE' THEN
        RAISE EXCEPTION 'Color round history cannot be deleted';
      END IF;

      IF NEW.id IS DISTINCT FROM OLD.id
        OR NEW.mode IS DISTINCT FROM OLD.mode
        OR NEW.period IS DISTINCT FROM OLD.period
        OR NEW.result_number IS DISTINCT FROM OLD.result_number
        OR NEW.opens_at IS DISTINCT FROM OLD.opens_at
        OR NEW.closes_at IS DISTINCT FROM OLD.closes_at
        OR NEW.ends_at IS DISTINCT FROM OLD.ends_at
        OR NEW.created_at IS DISTINCT FROM OLD.created_at
        OR (OLD.settled AND NOT NEW.settled)
      THEN
        RAISE EXCEPTION 'Color round result and timing are immutable';
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS tsb_color_round_immutable
      ON tsb_color_rounds;

    CREATE TRIGGER tsb_color_round_immutable
      BEFORE UPDATE OR DELETE ON tsb_color_rounds
      FOR EACH ROW
      EXECUTE FUNCTION tsb_color_protect_round();
  `);
}

function publicControl(row) {
  return {
    game: CONTROL_GAME,
    name: "COLOR PREDICTION",
    paused: row.paused,
    version: Number(row.version),
  };
}

async function gameClock(connection) {
  const control = (
    await connection.query(
      `SELECT *
       FROM tsb_color_control
       WHERE game=$1
       FOR UPDATE`,
      [CONTROL_GAME],
    )
  ).rows[0];

  if (!control) {
    throw fail(
      503,
      "Color Prediction control is not initialized.",
    );
  }

  const wall = await databaseTime(connection);

  const time =
    (
      control.paused
        ? new Date(control.paused_at).getTime()
        : wall
    ) - Number(control.paused_ms);

  return { control, wall, time };
}

/*
  Used by the authenticated Admin automatic-games API.
  These helpers do not register public Admin endpoints.
*/

export async function readColorPredictionControl(pool) {
  const row = (
    await pool.query(
      `SELECT *
       FROM tsb_color_control
       WHERE game=$1`,
      [CONTROL_GAME],
    )
  ).rows[0];

  if (!row) {
    throw fail(
      503,
      "Color Prediction control is not initialized.",
    );
  }

  return publicControl(row);
}

export async function changeColorPredictionControl(
  pool,
  {
    action,
    version,
    adminId,
  },
) {
  if (
    !["PLAY", "PAUSE"].includes(action) ||
    !Number.isInteger(version)
  ) {
    throw fail(
      400,
      "Choose PLAY or PAUSE with a valid control version.",
    );
  }

  return transaction(pool, async connection => {
    const { control, time } =
      await gameClock(connection);

    if (Number(control.version) !== version) {
      throw fail(
        409,
        "Control changed on another device. Refresh and try again.",
      );
    }

    const shouldPause = action === "PAUSE";

    if (control.paused === shouldPause) {
      return {
        control: publicControl(control),
      };
    }

    if (shouldPause) {
      /*
        Finish only rounds already due before the pause.
        The result of every round remains unchanged.
      */
      for (const mode of COLOR_MODES) {
        await settleDueRounds(
          connection,
          mode.id,
          time,
        );
      }

      /*
        Freeze at the same logical time used above,
        even if settlement took time to process.
      */
      await connection.query(
        `UPDATE tsb_color_control
         SET paused=TRUE,
             paused_at=$1,
             version=version+1
         WHERE game=$2`,
        [
          new Date(time + Number(control.paused_ms)),
          CONTROL_GAME,
        ],
      );
    } else {
      const wall = await databaseTime(connection);

      const extra = Math.max(
        0,
        wall - new Date(control.paused_at).getTime(),
      );

      await connection.query(
        `UPDATE tsb_color_control
         SET paused=FALSE,
             paused_at=NULL,
             paused_ms=paused_ms+$1,
             version=version+1
         WHERE game=$2`,
        [extra, CONTROL_GAME],
      );
    }

    const updated = (
      await connection.query(
        `SELECT *
         FROM tsb_color_control
         WHERE game=$1`,
        [CONTROL_GAME],
      )
    ).rows[0];

    await connection.query(
      `INSERT INTO tsb_color_control_audit(
         admin_id,action,version
       )
       VALUES($1,$2,$3)`,
      [
        String(adminId || "admin"),
        action,
        updated.version,
      ],
    );

    return {
      control: publicControl(updated),
    };
  });
}

async function settleDueRounds(connection, mode, time) {
  const rounds = (
    await connection.query(
      `SELECT *
       FROM tsb_color_rounds
       WHERE mode=$1
         AND settled=FALSE
         AND ends_at<=$2
       ORDER BY id
       FOR UPDATE`,
      [mode, new Date(time)],
    )
  ).rows;

  for (const round of rounds) {
    const bets = (
      await connection.query(
        `SELECT *
         FROM tsb_color_bets
         WHERE round_id=$1
           AND status='PLACED'
         ORDER BY customer_id,id
         FOR UPDATE`,
        [round.id],
      )
    ).rows;

    for (const bet of bets) {
      const payout = colorBetReturn(
        Number(bet.amount),
        bet.market,
        round.result_number,
      );

      if (payout > 0) {
        await connection.query(
          `UPDATE customers
           SET demo_coin_balance=demo_coin_balance+$1,
               updated_at=NOW()
           WHERE id=$2`,
          [payout, bet.customer_id],
        );

        await connection.query(
          `INSERT INTO demo_coin_transactions(
             customer_id,
             amount,
             transaction_type,
             note
           )
           VALUES($1,$2,'COLOR_RETURN',$3)`,
          [
            bet.customer_id,
            payout,
            `Color ${round.period}; ${bet.market}; return includes stake`,
          ],
        );
      }

      await connection.query(
        `UPDATE tsb_color_bets
         SET status=$1,
             payout=$2,
             settled_at=NOW()
         WHERE id=$3`,
        [
          payout > 0 ? "WON" : "LOST",
          payout,
          bet.id,
        ],
      );
    }

    await connection.query(
      `UPDATE tsb_color_rounds
       SET settled=TRUE
       WHERE id=$1`,
      [round.id],
    );
  }
}

async function currentRound(connection, mode, time) {
  await settleDueRounds(connection, mode, time);

  const window = colorRoundWindow(mode, time);

  let round = (
    await connection.query(
      `SELECT *
       FROM tsb_color_rounds
       WHERE period=$1
       FOR UPDATE`,
      [window.period],
    )
  ).rows[0];

  if (!round) {
    const result = drawColorResult();

    round = (
      await connection.query(
        `INSERT INTO tsb_color_rounds(
           mode,
           period,
           result_number,
           opens_at,
           closes_at,
           ends_at
         )
         VALUES($1,$2,$3,$4,$5,$6)
         RETURNING *`,
        [
          mode,
          window.period,
          result.number,
          new Date(window.opensAt),
          new Date(window.closesAt),
          new Date(window.endsAt),
        ],
      )
    ).rows[0];
  }

  return round;
}

function publicRound(round, now) {
  return {
    id: String(round.id),
    mode: round.mode,
    period: round.period,
    opensAt: round.opens_at,
    closesAt: round.closes_at,
    endsAt: round.ends_at,
    phase: round.settled
      ? "RESULT"
      : now < new Date(round.closes_at).getTime()
        ? "BETTING"
        : "DRAWING",
    result: round.settled
      ? colorResultFor(round.result_number)
      : null,
  };
}

function publicBet(row) {
  return {
    id: String(row.id),
    roundId: String(row.round_id),
    mode: row.mode,
    period: row.period,
    market: row.market,
    amount: Number(row.amount),
    status: row.status,
    payout: Number(row.payout),
    createdAt: row.created_at,
    settledAt: row.settled_at,
    result:
      row.settled === true
        ? colorResultFor(row.result_number)
        : null,
  };
}

async function loadPublicBet(connection, id) {
  const result = await connection.query(
    `SELECT b.*,r.mode,r.period,r.settled,r.result_number
     FROM tsb_color_bets b
     JOIN tsb_color_rounds r ON r.id=b.round_id
     WHERE b.id=$1`,
    [id],
  );

  return publicBet(result.rows[0]);
}

export function registerColorPredictionRoutes(app, pool) {
  app.use("/api/color-prediction", (req, res, next) => {
    res.set("Cache-Control", "no-store");

    if (!demoMode()) {
      return res.status(409).json({
        error: "This game is currently unavailable.",
      });
    }

    if (req.method === "POST" && req.headers.origin) {
      try {
        if (
          new URL(req.headers.origin).host !==
          req.headers.host
        ) {
          return res.status(403).json({
            error: "Invalid request origin.",
          });
        }
      } catch {
        return res.status(403).json({
          error: "Invalid request origin.",
        });
      }
    }

    next();
  });

  const customerGuard = wrap(async (req, res, next) => {
    const cookie = String(req.headers.cookie || "")
      .split(";")
      .map(value => value.trim())
      .find(value => value.startsWith("tsb_demo_session="));

    const token = cookie
      ? cookie.slice("tsb_demo_session=".length)
      : "";

    if (!/^[a-f0-9]{64}$/.test(token)) {
      throw fail(401, "Customer login required.");
    }

    const customer = (
      await pool.query(
        `SELECT c.id
         FROM demo_customer_sessions s
         JOIN customers c ON c.id=s.customer_id
         WHERE s.token_hash=$1
           AND s.expires_at>NOW()
           AND c.status='ACTIVE'
         LIMIT 1`,
        [hash(token)],
      )
    ).rows[0];

    if (!customer) {
      throw fail(
        401,
        "Customer session expired. Please login again.",
      );
    }

    req.colorCustomerId = customer.id;
    next();
  });

  const modeGuard = (req, res, next) => {
    if (!colorModeFor(req.params.mode)) {
      return res.status(404).json({
        error: "Invalid time mode.",
      });
    }

    next();
  };

  app.get(
    "/api/color-prediction/:mode/state",
    customerGuard,
    modeGuard,
    wrap(async (req, res) => {
      const result = await transaction(
        pool,
        async connection => {
          const mode = req.params.mode;

          const { control, time } =
            await gameClock(connection);

          const round = await currentRound(
            connection,
            mode,
            time,
          );

          const wallet = (
            await connection.query(
              `SELECT demo_coin_balance
               FROM customers
               WHERE id=$1`,
              [req.colorCustomerId],
            )
          ).rows[0];

          const history = (
            await connection.query(
              `SELECT *
               FROM tsb_color_rounds
               WHERE mode=$1 AND settled=TRUE
               ORDER BY id DESC
               LIMIT 30`,
              [mode],
            )
          ).rows.map(item => ({
            id: String(item.id),
            period: item.period,
            result: colorResultFor(item.result_number),
            endsAt: item.ends_at,
          }));

          const bets = (
            await connection.query(
              `SELECT b.*,r.mode,r.period,r.settled,r.result_number
               FROM tsb_color_bets b
               JOIN tsb_color_rounds r ON r.id=b.round_id
               WHERE b.customer_id=$1
                 AND r.mode=$2
               ORDER BY b.id DESC
               LIMIT 100`,
              [req.colorCustomerId, mode],
            )
          ).rows.map(publicBet);

          const latestClock = await gameClock(connection);

          return {
            customerId: req.colorCustomerId,
            serverTime: new Date(
              latestClock.time,
            ).toISOString(),
            paused: control.paused,
            control: publicControl(control),
            balance: Number(wallet.demo_coin_balance),
            round: publicRound(round, latestClock.time),
            modes: COLOR_MODES,
            markets: COLOR_MARKETS,
            limits: COLOR_BET_LIMITS,
            feePercent: COLOR_FEE_PERCENT,
            rules: COLOR_RULES_TEXT,
            history,
            bets,
          };
        },
      );

      res.json(result);
    }),
  );

  app.post(
    "/api/color-prediction/:mode/bets",
    customerGuard,
    modeGuard,
    wrap(async (req, res) => {
      const {
        roundId,
        market,
        amount,
        requestKey,
      } = req.body || {};

      if (
        !validId(roundId) ||
        !colorMarketFor(market) ||
        !validColorStake(amount) ||
        !validRequestKey(requestKey)
      ) {
        throw fail(
          400,
          "Choose a valid market and enter 100–25,000 whole demo coins.",
        );
      }

      const result = await transaction(
        pool,
        async connection => {
          const mode = req.params.mode;

          const { control, time } =
            await gameClock(connection);

          /*
            A retry of an accepted request must still
            return its original bet while paused.
          */
          const prior = (
            await connection.query(
              `SELECT b.*,r.mode
               FROM tsb_color_bets b
               JOIN tsb_color_rounds r ON r.id=b.round_id
               WHERE b.customer_id=$1
                 AND b.request_key=$2`,
              [req.colorCustomerId, requestKey],
            )
          ).rows[0];

          if (prior) {
            if (
              String(prior.round_id) !== String(roundId) ||
              prior.mode !== mode ||
              prior.market !== market ||
              Number(prior.amount) !== amount
            ) {
              throw fail(409, "Request key already used.");
            }

            return {
              success: true,
              duplicate: true,
              bet: await loadPublicBet(connection, prior.id),
            };
          }

          if (control.paused) {
            throw fail(
              409,
              "Color Prediction is paused by Admin. No coins were deducted.",
            );
          }

          const round = await currentRound(
            connection,
            mode,
            time,
          );

          if (String(round.id) !== String(roundId)) {
            throw fail(409, "This round has closed.");
          }

          const wallet = (
            await connection.query(
              `SELECT demo_coin_balance,status
               FROM customers
               WHERE id=$1
               FOR UPDATE`,
              [req.colorCustomerId],
            )
          ).rows[0];

          if (!wallet || wallet.status !== "ACTIVE") {
            throw fail(403, "Customer is inactive.");
          }

          const total = (
            await connection.query(
              `SELECT
                 COUNT(*) AS count,
                 COALESCE(
                   SUM(
                     CASE WHEN status<>'CANCELLED'
                       THEN amount ELSE 0 END
                   ),
                   0
                 ) AS reserved
               FROM tsb_color_bets
               WHERE round_id=$1 AND customer_id=$2`,
              [round.id, req.colorCustomerId],
            )
          ).rows[0];

          if (
            Number(total.count) >= 100 ||
            Number(total.reserved) + amount > 100000
          ) {
            throw fail(
              400,
              "Maximum 100 requests and 100,000 reserved coins per round.",
            );
          }

          if (Number(wallet.demo_coin_balance) < amount) {
            throw fail(400, "Insufficient demo coins.");
          }

          const latest = await gameClock(connection);

          if (
            latest.control.paused ||
            round.settled ||
            latest.time < new Date(round.opens_at).getTime() ||
            latest.time >= new Date(round.closes_at).getTime()
          ) {
            throw fail(
              409,
              "Betting closed. No coins were deducted.",
            );
          }

          await connection.query(
            `UPDATE customers
             SET demo_coin_balance=demo_coin_balance-$1,
                 updated_at=NOW()
             WHERE id=$2`,
            [amount, req.colorCustomerId],
          );

          const saved = (
            await connection.query(
              `INSERT INTO tsb_color_bets(
                 round_id,customer_id,market,amount,request_key
               )
               VALUES($1,$2,$3,$4,$5)
               RETURNING id`,
              [
                round.id,
                req.colorCustomerId,
                market,
                amount,
                requestKey,
              ],
            )
          ).rows[0];

          await connection.query(
            `INSERT INTO demo_coin_transactions(
               customer_id,amount,transaction_type,note
             )
             VALUES($1,$2,'COLOR_STAKE',$3)`,
            [
              req.colorCustomerId,
              -amount,
              `Color ${round.period}; ${market}; 2% fee included in stake`,
            ],
          );

          return {
            success: true,
            bet: await loadPublicBet(connection, saved.id),
          };
        },
      );

      res.json(result);
    }),
  );

  app.post(
    "/api/color-prediction/:mode/cancel",
    customerGuard,
    modeGuard,
    wrap(async (req, res) => {
      const betId = req.body?.betId;

      if (!validId(betId)) {
        throw fail(400, "Invalid bet ID.");
      }

      const result = await transaction(
        pool,
        async connection => {
          const { control } = await gameClock(connection);

          const bet = (
            await connection.query(
              `SELECT b.*,r.mode,r.period,r.closes_at
               FROM tsb_color_bets b
               JOIN tsb_color_rounds r ON r.id=b.round_id
               WHERE b.id=$1 AND b.customer_id=$2
               FOR UPDATE OF b`,
              [betId, req.colorCustomerId],
            )
          ).rows[0];

          if (!bet || bet.mode !== req.params.mode) {
            throw fail(404, "Bet not found.");
          }

          if (bet.status === "CANCELLED") {
            return {
              success: true,
              duplicate: true,
              bet: await loadPublicBet(connection, bet.id),
            };
          }

          if (bet.status !== "PLACED") {
            throw fail(409, "This bet is already settled.");
          }

          if (control.paused) {
            throw fail(
              409,
              "Color Prediction is paused by Admin.",
            );
          }

          await connection.query(
            "SELECT id FROM customers WHERE id=$1 FOR UPDATE",
            [req.colorCustomerId],
          );

          const latest = await gameClock(connection);

          if (
            latest.control.paused ||
            latest.time >= new Date(bet.closes_at).getTime()
          ) {
            throw fail(
              409,
              "Betting closed. This bet cannot be cancelled.",
            );
          }

          await connection.query(
            `UPDATE customers
             SET demo_coin_balance=demo_coin_balance+$1,
                 updated_at=NOW()
             WHERE id=$2`,
            [bet.amount, req.colorCustomerId],
          );

          await connection.query(
            `UPDATE tsb_color_bets
             SET status='CANCELLED',
                 payout=amount,
                 settled_at=NOW()
             WHERE id=$1`,
            [bet.id],
          );

          await connection.query(
            `INSERT INTO demo_coin_transactions(
               customer_id,amount,transaction_type,note
             )
             VALUES($1,$2,'COLOR_REFUND',$3)`,
            [
              req.colorCustomerId,
              bet.amount,
              `Color ${bet.period}; cancelled bet #${bet.id}; full stake refunded`,
            ],
          );

          return {
            success: true,
            bet: await loadPublicBet(connection, bet.id),
          };
        },
      );

      res.json(result);
    }),
  );

  return function startColorPrediction() {
    let busy = false;
    let stopped = false;

    const tick = async () => {
      if (busy || stopped || !demoMode()) return;

      busy = true;

      try {
        for (const mode of COLOR_MODES) {
          if (stopped) break;

          await transaction(pool, async connection => {
            const { control, time } =
              await gameClock(connection);

            if (!control.paused) {
              await currentRound(
                connection,
                mode.id,
                time,
              );
            }
          });
        }
      } catch (error) {
        console.error(
          "Color Prediction update failed:",
          error.message,
        );
      } finally {
        busy = false;
      }
    };

    void tick();

    const timer = setInterval(tick, 500);
    timer.unref?.();

    return () => {
      stopped = true;
      clearInterval(timer);
    };
  };
}
