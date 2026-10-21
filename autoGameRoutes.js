import { createHash, randomBytes } from "node:crypto";

import {
  GAME_NAMES,
  canonicalOutcome,
  shuffledDeck,
  createOutcome,
  timeline,
  duration,
  stageAt,
  marketsFor,
  betHold,
  betReturn,
} from "./autoGameRules.js";

const hash = value =>
  createHash("sha256").update(value).digest("hex");

const fail = (status, message) =>
  Object.assign(new Error(message), { status });

const wrap = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const validGame = game =>
  Object.hasOwn(GAME_NAMES, game);

// Game mode is independent of the sports data provider.
const demoMode = () =>
  String(process.env.DEMO_GAMES_MODE ?? "demo")
    .trim()
    .toLowerCase() === "demo";

export async function initializeAutoGames(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tsb_auto_controls (
      game TEXT PRIMARY KEY,
      paused BOOLEAN NOT NULL DEFAULT FALSE,
      paused_at TIMESTAMPTZ,
      paused_ms BIGINT NOT NULL DEFAULT 0,
      version INTEGER NOT NULL DEFAULT 0
    );

    INSERT INTO tsb_auto_controls(game)
    VALUES
      ('super-over'),
      ('dragon-tiger'),
      ('andar-bahar'),
      ('lucky-seven')
    ON CONFLICT DO NOTHING;

    CREATE TABLE IF NOT EXISTS tsb_auto_control_audit (
      id BIGSERIAL PRIMARY KEY,
      game TEXT NOT NULL,
      admin_id TEXT NOT NULL,
      action TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tsb_auto_shoes (
      game TEXT PRIMARY KEY,
      cards JSONB NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tsb_auto_rounds (
      id BIGSERIAL PRIMARY KEY,
      game TEXT NOT NULL,
      outcome JSONB NOT NULL,
      seed TEXT NOT NULL,
      commitment TEXT NOT NULL,
      opens_at TIMESTAMPTZ NOT NULL,
      closes_at TIMESTAMPTZ NOT NULL,
      ends_at TIMESTAMPTZ NOT NULL,
      settled BOOLEAN NOT NULL DEFAULT FALSE
    );

    CREATE INDEX IF NOT EXISTS tsb_auto_game_rounds
      ON tsb_auto_rounds(game,id DESC);

    CREATE UNIQUE INDEX IF NOT EXISTS tsb_auto_one_active
      ON tsb_auto_rounds(game)
      WHERE settled=FALSE;

    CREATE TABLE IF NOT EXISTS tsb_auto_bets (
      id BIGSERIAL PRIMARY KEY,
      round_id BIGINT NOT NULL
        REFERENCES tsb_auto_rounds(id),
      customer_id INTEGER NOT NULL
        REFERENCES customers(id),
      market TEXT NOT NULL,
      amount INTEGER NOT NULL,
      direction TEXT NOT NULL,
      hold INTEGER NOT NULL,
      stage INTEGER NOT NULL,
      request_key TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PLACED',
      payout INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(customer_id,request_key)
    );

    CREATE INDEX IF NOT EXISTS tsb_auto_customer_bets
      ON tsb_auto_bets(customer_id,id DESC);

    CREATE OR REPLACE FUNCTION tsb_auto_protect()
      RETURNS trigger AS $$
    BEGIN
      IF TG_OP='DELETE' THEN
        RAISE EXCEPTION 'Game history cannot be deleted';
      END IF;

      IF NEW.id IS DISTINCT FROM OLD.id
        OR NEW.game IS DISTINCT FROM OLD.game
        OR NEW.outcome IS DISTINCT FROM OLD.outcome
        OR NEW.seed IS DISTINCT FROM OLD.seed
        OR NEW.commitment IS DISTINCT FROM OLD.commitment
        OR NEW.opens_at IS DISTINCT FROM OLD.opens_at
        OR NEW.closes_at IS DISTINCT FROM OLD.closes_at
        OR NEW.ends_at IS DISTINCT FROM OLD.ends_at
        OR (OLD.settled AND NOT NEW.settled)
      THEN
        RAISE EXCEPTION
          'Round result and timing are immutable';
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS tsb_auto_immutable
      ON tsb_auto_rounds;

    CREATE TRIGGER tsb_auto_immutable
      BEFORE UPDATE OR DELETE ON tsb_auto_rounds
      FOR EACH ROW
      EXECUTE FUNCTION tsb_auto_protect();
  `);
}

async function transaction(pool, fn) {
  const connection = await pool.connect();

  try {
    await connection.query("BEGIN");

    await connection.query(
      "SELECT pg_advisory_xact_lock(746225)",
    );

    const result = await fn(connection);

    await connection.query("COMMIT");

    return result;
  } catch (error) {
    await connection.query("ROLLBACK");
    throw error;
  } finally {
    connection.release();
  }
}

const clock = async connection => {
  const result = await connection.query(
    "SELECT clock_timestamp() AS now",
    [],
  );

  return new Date(result.rows[0].now).getTime();
};

async function gameClock(connection, game, wall) {
  const control = (
    await connection.query(
      `SELECT *
       FROM tsb_auto_controls
       WHERE game=$1
       FOR UPDATE`,
      [game],
    )
  ).rows[0];

  const time =
    (
      control.paused
        ? new Date(control.paused_at).getTime()
        : wall
    ) - Number(control.paused_ms);

  return { control, time };
}

const publicControl = row => ({
  game: row.game,
  name: GAME_NAMES[row.game],
  paused: row.paused,
  version: row.version,
});

async function startRound(connection, game, time) {
  let card;

  if (game === "lucky-seven") {
    let cards = (
      await connection.query(
        `SELECT cards
         FROM tsb_auto_shoes
         WHERE game=$1
         FOR UPDATE`,
        [game],
      )
    ).rows[0]?.cards;

    if (!cards?.length) {
      cards = shuffledDeck(8);
    }

    card = cards.pop();

    await connection.query(
      `INSERT INTO tsb_auto_shoes(game,cards)
       VALUES($1,$2)
       ON CONFLICT(game)
       DO UPDATE SET cards=$2`,
      [game, JSON.stringify(cards)],
    );
  }

  const outcome = createOutcome(game, card);
  const seed = randomBytes(32).toString("hex");

  const commitment = hash(
    `${game}:${canonicalOutcome(outcome)}:${seed}`,
  );

  return (
    await connection.query(
      `INSERT INTO tsb_auto_rounds(
        game,
        outcome,
        seed,
        commitment,
        opens_at,
        closes_at,
        ends_at
      )
      VALUES($1,$2,$3,$4,$5,$6,$7)
      RETURNING *`,
      [
        game,
        JSON.stringify(outcome),
        seed,
        commitment,
        new Date(time),
        new Date(time + 30000),
        new Date(
          time + 30000 + duration(game, outcome),
        ),
      ],
    )
  ).rows[0];
}

async function advance(connection, game, time) {
  let round = (
    await connection.query(
      `SELECT *
       FROM tsb_auto_rounds
       WHERE game=$1
       ORDER BY id DESC
       LIMIT 1
       FOR UPDATE`,
      [game],
    )
  ).rows[0];

  if (!round) {
    return startRound(connection, game, time);
  }

  if (
    !round.settled &&
    time >= new Date(round.ends_at).getTime()
  ) {
    const bets = (
      await connection.query(
        `SELECT *
         FROM tsb_auto_bets
         WHERE round_id=$1 AND status='PLACED'
         ORDER BY customer_id,id
         FOR UPDATE`,
        [round.id],
      )
    ).rows;

    for (const bet of bets) {
      const returned = betReturn(
        game,
        round.outcome,
        {
          ...bet,
          key: bet.market,
        },
      );

      if (returned) {
        await connection.query(
          `UPDATE customers
           SET demo_coin_balance=demo_coin_balance+$1,
               updated_at=NOW()
           WHERE id=$2`,
          [returned, bet.customer_id],
        );

        await connection.query(
          `INSERT INTO demo_coin_transactions(
            customer_id,
            amount,
            transaction_type,
            note
          )
          VALUES($1,$2,'CARD_GAME_RETURN',$3)`,
          [
            bet.customer_id,
            returned,
            `${GAME_NAMES[game]} #${round.id}; ${bet.market}; stake included`,
          ],
        );
      }

      await connection.query(
        `UPDATE tsb_auto_bets
         SET status='SETTLED',payout=$1
         WHERE id=$2`,
        [returned, bet.id],
      );
    }

    await connection.query(
      `UPDATE tsb_auto_rounds
       SET settled=TRUE
       WHERE id=$1`,
      [round.id],
    );

    round = {
      ...round,
      settled: true,
    };
  }

  if (
    round.settled &&
    time >= new Date(round.ends_at).getTime() + 3000
  ) {
    return startRound(connection, game, time);
  }

  return round;
}

export function publicRound(round, time) {
  const game = round.game;

  const delta =
    time - new Date(round.closes_at).getTime();

  const stage = round.settled
    ? 0
    : stageAt(game, round.outcome, delta);

  const events = timeline(
    game,
    round.outcome,
      ).filter(event => event.at <= delta);

  return {
    id: String(round.id),
    game,
    opensAt: round.opens_at,
    closesAt: round.closes_at,
    endsAt: round.ends_at,

    nextAt: new Date(
      new Date(round.ends_at).getTime() + 3000,
    ).toISOString(),

    phase: round.settled
      ? "RESULT"
      : stage
        ? "BETTING"
        : "REVEAL",

    stage,

    bettingClosesAt:
      stage === 2
        ? new Date(
            new Date(round.closes_at).getTime() + 7000,
          ).toISOString()
        : round.closes_at,

    events,
    commitment: round.commitment,

    result: round.settled
      ? round.outcome
      : null,

    seed: round.settled
      ? round.seed
      : null,
  };
}

export function registerAutoGameRoutes(
  app,
  pool,
  adminGuard = (req, res) =>
    res.status(401).json({
      error: "Admin login required.",
    }),
) {
  app.use("/api/card-games", (req, res, next) => {
    res.set("Cache-Control", "no-store");

    if (!demoMode()) {
      return res.status(409).json({
        error: "Games are currently unavailable.",
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

  app.get(
    "/api/admin/automatic-games",
    adminGuard,
    wrap(async (req, res) => {
      res.set("Cache-Control", "no-store");

      const controls = (
        await pool.query(
          `SELECT *
           FROM tsb_auto_controls
           ORDER BY game`,
          [],
        )
      ).rows.map(publicControl);

      res.json({ controls });
    }),
  );

  app.post(
    "/api/admin/automatic-games/:game/status",
    adminGuard,
    wrap(async (req, res) => {
      res.set("Cache-Control", "no-store");

      const game = req.params.game;
      const action = req.body?.action;
      const version = req.body?.version;

      if (
        !validGame(game) ||
        !["PLAY", "PAUSE"].includes(action) ||
        !Number.isInteger(version)
      ) {
        throw fail(
          400,
          "Choose PLAY or PAUSE for a valid game.",
        );
      }

      if (
        req.headers.origin &&
        new URL(req.headers.origin).host !==
          req.headers.host
      ) {
        throw fail(
          403,
          "Invalid request origin.",
        );
      }

      const result = await transaction(
        pool,
        async connection => {
          const wall = await clock(connection);

          const { control, time } =
            await gameClock(
              connection,
              game,
              wall,
            );

          if (control.version !== version) {
            throw fail(
              409,
              "Control changed on another device. Refresh and try again.",
            );
          }

          if (
            control.paused ===
            (action === "PAUSE")
          ) {
            return {
              control: publicControl(control),
            };
          }

          if (action === "PAUSE") {
            await advance(
              connection,
              game,
              time,
            );

            await connection.query(
              `UPDATE tsb_auto_controls
               SET paused=TRUE,
                   paused_at=$1,
                   version=version+1
               WHERE game=$2`,
              [new Date(wall), game],
            );
          } else {
            const extra = Math.max(
              0,
              wall -
                new Date(control.paused_at).getTime(),
            );

            await connection.query(
              `UPDATE tsb_auto_controls
               SET paused=FALSE,
                   paused_at=NULL,
                   paused_ms=paused_ms+$1,
                   version=version+1
               WHERE game=$2`,
              [extra, game],
            );
          }

          await connection.query(
            `INSERT INTO tsb_auto_control_audit(
              game,
              admin_id,
              action
            )
            VALUES($1,$2,$3)`,
            [
              game,
              req.verifiedAdminId || "admin",
              action,
            ],
          );

          const updated = (
            await connection.query(
              `SELECT *
               FROM tsb_auto_controls
               WHERE game=$1`,
              [game],
            )
          ).rows[0];

          return {
            control: publicControl(updated),
          };
        },
      );

      res.json(result);
    }),
  );

  const customer = wrap(
    async (req, res, next) => {
      const token =
        String(req.headers.cookie || "")
          .split(";")
          .map(value => value.trim())
          .find(value =>
            value.startsWith("tsb_demo_session="),
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
           JOIN customers c ON c.id=s.customer_id
           WHERE s.token_hash=$1
             AND s.expires_at>NOW()
             AND c.status='ACTIVE'`,
          [hash(token)],
        )
      ).rows[0];

      if (!row) {
        throw fail(
          401,
          "Customer session expired. Please login again.",
        );
      }

      req.customerId = row.id;
      next();
    },
  );

  const gameGuard = (req, res, next) =>
    validGame(req.params.game)
      ? next()
      : res.status(404).json({
          error: "Game not found.",
        });

  app.get(
    "/api/card-games/:game/state",
    customer,
    gameGuard,
    wrap(async (req, res) => {
      const result = await transaction(
        pool,
        async connection => {
          const { control, time } =
            await gameClock(
              connection,
              req.params.game,
              await clock(connection),
            );

          const round = await advance(
            connection,
            req.params.game,
            time,
          );

          const balance = Number(
            (
              await connection.query(
                `SELECT demo_coin_balance
                 FROM customers
                 WHERE id=$1`,
                [req.customerId],
              )
            ).rows[0].demo_coin_balance,
          );

          const history = (
            await connection.query(
              `SELECT id,outcome
               FROM tsb_auto_rounds
               WHERE game=$1 AND settled=TRUE
               ORDER BY id DESC
               LIMIT 20`,
              [req.params.game],
            )
          ).rows.map(item => ({
            id: String(item.id),
            winner: item.outcome.winner,
          }));

          const bets = (
            await connection.query(
              `SELECT b.*,r.game,r.outcome,r.settled
               FROM tsb_auto_bets b
               JOIN tsb_auto_rounds r
                 ON r.id=b.round_id
               WHERE b.customer_id=$1
                 AND r.game=$2
               ORDER BY b.id DESC
               LIMIT 100`,
              [
                req.customerId,
                req.params.game,
              ],
            )
          ).rows.map(
            ({ outcome, settled, ...bet }) => ({
              ...bet,
              winner: settled
                ? outcome.winner
                : null,
            }),
          );

          return {
            paused: control.paused,
            serverTime:
              new Date(time).toISOString(),
            round: publicRound(round, time),
            balance,
            history,
            bets,
            markets: marketsFor(req.params.game),
          };
        },
      );

      res.json(result);
    }),
  );

  app.post(
    "/api/card-games/:game/bets",
    customer,
    gameGuard,
    wrap(async (req, res) => {
      const game = req.params.game;

      const {
        roundId,
        market: key,
        amount,
        direction = "BACK",
        requestKey,
      } = req.body || {};

      const selected = marketsFor(game).find(
        item => item.key === key,
      );

      if (
        !selected ||
        !Number.isSafeInteger(amount) ||
        amount < 100 ||
        amount > 25000 ||
        !["BACK", "LAY"].includes(direction) ||
        (
          direction === "LAY" &&
          !selected.lay
        ) ||
        !/^\d{1,18}$/.test(String(roundId)) ||
        !/^[a-zA-Z0-9_-]{16,100}$/.test(
          String(requestKey),
        )
      ) {
        throw fail(
          400,
          "Enter 100–25,000 whole demo coins and choose a valid market.",
        );
      }

      const result = await transaction(
        pool,
        async connection => {
          const { control, time } =
            await gameClock(
              connection,
              game,
              await clock(connection),
            );

          const round = await advance(
            connection,
            game,
            time,
          );

          const prior = (
            await connection.query(
              `SELECT *
               FROM tsb_auto_bets
               WHERE customer_id=$1
                 AND request_key=$2`,
              [
                req.customerId,
                requestKey,
              ],
            )
          ).rows[0];

          if (prior) {
            if (
              String(prior.round_id) !==
                String(roundId) ||
              prior.market !== key ||
              prior.amount !== amount ||
              prior.direction !== direction
            ) {
              throw fail(
                409,
                "Request key already used.",
              );
            }

            return {
              success: true,
              bet: prior,
              duplicate: true,
            };
          }

          if (control.paused) {
            throw fail(
              409,
              "This game is paused by Admin.",
            );
          }

          const stage = stageAt(
            game,
            round.outcome,
            time -
              new Date(round.closes_at).getTime(),
          );

          if (
            String(round.id) !== String(roundId) ||
            round.settled ||
            !stage ||
            selected.stage !== stage
          ) {
            throw fail(
              409,
              "Betting is closed for this market. Wait for its next betting window.",
            );
          }

          const wallet = (
            await connection.query(
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

          const existing = Number(
            (
              await connection.query(
                `SELECT
                   COALESCE(
                     SUM(
                       CASE
                         WHEN status<>'CANCELLED'
                         THEN hold
                         ELSE 0
                       END
                     ),
                     0
                   ) AS total,
                   COUNT(*) AS count
                 FROM tsb_auto_bets
                 WHERE round_id=$1
                   AND customer_id=$2`,
                [
                  roundId,
                  req.customerId,
                ],
              )
            ).rows[0].total,
          );

          const count = Number(
            (
              await connection.query(
                `SELECT COUNT(*) AS count
                 FROM tsb_auto_bets
                 WHERE round_id=$1
                   AND customer_id=$2`,
                [
                  roundId,
                  req.customerId,
                ],
              )
            ).rows[0].count,
          );

          if (count >= 100) {
            throw fail(
              400,
              "Maximum 100 bet requests per round.",
            );
          }

          const hold = betHold(
            selected,
            amount,
            direction,
          );

          if (existing + hold > 100000) {
            throw fail(
              400,
              "Maximum reserved amount is 100,000 demo coins per round.",
            );
          }

          if (
            Number(wallet.demo_coin_balance) < hold
          ) {
            throw fail(
              400,
              "Insufficient available demo coins.",
            );
          }

          const latestTime = (
            await gameClock(
              connection,
              game,
              await clock(connection),
            )
          ).time;

          if (
            stageAt(
              game,
              round.outcome,
              latestTime -
                new Date(round.closes_at).getTime(),
            ) !== stage
          ) {
            throw fail(
              409,
              "Betting closed while processing. No coins were deducted.",
            );
          }

          await connection.query(
            `UPDATE customers
             SET demo_coin_balance=demo_coin_balance-$1,
                 updated_at=NOW()
             WHERE id=$2`,
            [hold, req.customerId],
          );

          await connection.query(
            `INSERT INTO demo_coin_transactions(
              customer_id,
              amount,
              transaction_type,
              note
            )
            VALUES($1,$2,'CARD_GAME_STAKE',$3)`,
            [
              req.customerId,
              -hold,
              `${GAME_NAMES[game]} #${roundId}; ${direction} ${key}`,
            ],
          );

          const bet = (
            await connection.query(
              `INSERT INTO tsb_auto_bets(
                round_id,
                customer_id,
                market,
                amount,
                direction,
                hold,
                stage,
                request_key
              )
              VALUES($1,$2,$3,$4,$5,$6,$7,$8)
              RETURNING *`,
              [
                roundId,
                req.customerId,
                key,
                amount,
                direction,
                hold,
                stage,
                requestKey,
              ],
            )
          ).rows[0];

          return {
            success: true,
            bet,
          };
        },
      );

      res.json(result);
    }),
  );

  app.post(
    "/api/card-games/:game/cancel",
    customer,
    gameGuard,
    wrap(async (req, res) => {
      if (
        !/^\d{1,18}$/.test(
          String(req.body?.betId),
        )
      ) {
        throw fail(400, "Invalid bet.");
      }

      const result = await transaction(
        pool,
        async connection => {
          const game = req.params.game;

          const { control, time } =
            await gameClock(
              connection,
              game,
              await clock(connection),
            );

          const round = await advance(
            connection,
            game,
            time,
          );

          const bet = (
            await connection.query(
              `SELECT *
               FROM tsb_auto_bets
               WHERE id=$1
                 AND customer_id=$2
               FOR UPDATE`,
              [
                req.body.betId,
                req.customerId,
              ],
            )
          ).rows[0];

          if (
            !bet ||
            String(bet.round_id) !==
              String(round.id)
          ) {
            throw fail(
              409,
              "Bet is from a closed round.",
            );
          }

          if (bet.status === "CANCELLED") {
            return { success: true };
          }

          if (control.paused) {
            throw fail(
              409,
              "This game is paused by Admin.",
            );
          }

          if (
            round.settled ||
            bet.status !== "PLACED" ||
            stageAt(
              game,
              round.outcome,
              time -
                new Date(round.closes_at).getTime(),
            ) !== bet.stage
          ) {
            throw fail(
              409,
              "Bet is locked and cannot be cancelled.",
            );
          }

          await connection.query(
            `SELECT id
             FROM customers
             WHERE id=$1
             FOR UPDATE`,
            [req.customerId],
          );

          const latestTime = (
            await gameClock(
              connection,
              game,
              await clock(connection),
            )
          ).time;

          if (
            stageAt(
              game,
              round.outcome,
              latestTime -
                new Date(round.closes_at).getTime(),
            ) !== bet.stage
          ) {
            throw fail(
              409,
              "Bet is now locked.",
            );
          }

          await connection.query(
            `UPDATE customers
             SET demo_coin_balance=demo_coin_balance+$1,
                 updated_at=NOW()
             WHERE id=$2`,
            [
              bet.hold,
              req.customerId,
            ],
          );

          await connection.query(
            `UPDATE tsb_auto_bets
             SET status='CANCELLED'
             WHERE id=$1`,
            [bet.id],
          );

          await connection.query(
            `INSERT INTO demo_coin_transactions(
              customer_id,
              amount,
              transaction_type,
              note
            )
            VALUES($1,$2,'CARD_GAME_REFUND',$3)`,
            [
              req.customerId,
              bet.hold,
              `${GAME_NAMES[game]} #${round.id}; bet cancelled`,
            ],
          );

          return { success: true };
        },
      );

      res.json(result);
    }),
  );

  return function startAutoGames() {
    let busy = false;

    const tick = async () => {
      if (busy || !demoMode()) return;

      busy = true;

      try {
        await transaction(
          pool,
          async connection => {
            const wall = await clock(connection);

            for (
              const game of Object.keys(GAME_NAMES)
            ) {
              const { control, time } =
                await gameClock(
                  connection,
                  game,
                  wall,
                );

              if (!control.paused) {
                await advance(
                  connection,
                  game,
                  time,
                );
              }
            }
          },
        );
      } catch (error) {
        console.error(
          "Automatic demo game update failed:",
          error.message,
        );
      } finally {
        busy = false;
      }
    };

    tick();

    const timer = setInterval(tick, 500);
    timer.unref?.();

    return () => clearInterval(timer);
  };
}
