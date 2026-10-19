import { createHash, randomBytes } from "node:crypto";
import { requireOldAdmin } from "./controllerAccounts.js";

import {
  INTERVAL_MS,
  BALL_MS,
  WINDOW_MS,
  PREBET_MS,
  MATCH_MS,
  INITIAL_RATES,
  ALLOWED_BALLS,
  teamsAt,
  nextDelivery,
  matchWinner,
  publicControlledMatch,
  commitment,
  betAmounts,
  payout,
} from "./animatedCricketRules.js";

const fail = (status, message) =>
  Object.assign(new Error(message), { status });

const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const hash = (value) =>
  createHash("sha256").update(value).digest("hex");

const isDemo = () =>
  String(process.env.SPORTS_API_MODE || "demo")
    .trim()
    .toLowerCase() === "demo";

const time = async (c) =>
  new Date(
    (await c.query("SELECT clock_timestamp() AS now", [])).rows[0].now,
  ).getTime();

export async function initializeAnimatedCricket(pool) {
  await pool.query(`
  CREATE TABLE IF NOT EXISTS tsb_so_manual_matches (
   id BIGSERIAL PRIMARY KEY, start_ms BIGINT UNIQUE NOT NULL, teams JSONB NOT NULL,
   plan JSONB NOT NULL, rates JSONB NOT NULL, ready BOOLEAN NOT NULL DEFAULT FALSE,
   market_closed BOOLEAN NOT NULL DEFAULT FALSE, version INTEGER NOT NULL DEFAULT 0,
   quote_version INTEGER NOT NULL DEFAULT 0, settled BOOLEAN NOT NULL DEFAULT FALSE
  );

  CREATE TABLE IF NOT EXISTS tsb_so_manual_balls (
   match_id BIGINT NOT NULL REFERENCES tsb_so_manual_matches(id), seq INTEGER NOT NULL,
   team INTEGER NOT NULL, team_ball INTEGER NOT NULL, value TEXT NOT NULL,
   opens_ms BIGINT NOT NULL, reveals_ms BIGINT NOT NULL,
   seed TEXT NOT NULL, commitment TEXT NOT NULL, PRIMARY KEY(match_id,seq)
  );

  CREATE TABLE IF NOT EXISTS tsb_so_manual_bets (
   id BIGSERIAL PRIMARY KEY, match_id BIGINT NOT NULL REFERENCES tsb_so_manual_matches(id),
   customer_id INTEGER NOT NULL REFERENCES customers(id), team INTEGER NOT NULL,
   direction TEXT NOT NULL, amount INTEGER NOT NULL, points INTEGER NOT NULL,
   hold INTEGER NOT NULL, win_return INTEGER NOT NULL, window_id TEXT NOT NULL,
   quote_version INTEGER NOT NULL, request_key TEXT NOT NULL,
   status TEXT NOT NULL DEFAULT 'PLACED', payout INTEGER NOT NULL DEFAULT 0,
   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(customer_id,request_key)
  );

  CREATE INDEX IF NOT EXISTS tsb_so_manual_customer
   ON tsb_so_manual_bets(customer_id,id DESC);

  CREATE TABLE IF NOT EXISTS tsb_so_manual_audit (
   id BIGSERIAL PRIMARY KEY, match_id BIGINT NOT NULL, admin_id TEXT NOT NULL,
   action TEXT NOT NULL, details JSONB NOT NULL,
   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE OR REPLACE FUNCTION tsb_so_manual_ball_protect()
  RETURNS trigger AS $$
  BEGIN
   RAISE EXCEPTION 'Committed balls cannot be changed or deleted';
  END;
  $$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS tsb_so_manual_immutable_ball
   ON tsb_so_manual_balls;

  CREATE TRIGGER tsb_so_manual_immutable_ball
   BEFORE UPDATE OR DELETE ON tsb_so_manual_balls
   FOR EACH ROW EXECUTE FUNCTION tsb_so_manual_ball_protect();

  CREATE OR REPLACE FUNCTION tsb_so_manual_match_protect()
  RETURNS trigger AS $$
  BEGIN
   IF TG_OP='DELETE' THEN
    RAISE EXCEPTION 'Match history cannot be deleted';
   END IF;

   IF NEW.start_ms IS DISTINCT FROM OLD.start_ms
    OR NEW.teams IS DISTINCT FROM OLD.teams
    OR (OLD.ready AND NOT NEW.ready)
    OR (OLD.settled AND NOT NEW.settled)
   THEN
    RAISE EXCEPTION 'Published match identity cannot be changed';
   END IF;

   RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS tsb_so_manual_immutable_match
   ON tsb_so_manual_matches;

  CREATE TRIGGER tsb_so_manual_immutable_match
   BEFORE UPDATE OR DELETE ON tsb_so_manual_matches
   FOR EACH ROW EXECUTE FUNCTION tsb_so_manual_match_protect();
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
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}

const getBalls = async (c, id) =>
  (
    await c.query(
      "SELECT * FROM tsb_so_manual_balls WHERE match_id=$1 ORDER BY seq",
      [id],
    )
  ).rows;

async function ensureDraft(c, start) {
  const found = (
    await c.query(
      "SELECT * FROM tsb_so_manual_matches WHERE start_ms=$1",
      [start],
    )
  ).rows[0];

  if (found) return found;

  return (
    await c.query(
      "INSERT INTO tsb_so_manual_matches(start_ms,teams,plan,rates) VALUES($1,$2,$3,$4) RETURNING *",
      [
        start,
        JSON.stringify(teamsAt(start)),
        JSON.stringify(Array(12).fill(null)),
        JSON.stringify(INITIAL_RATES),
      ],
    )
  ).rows[0];
}

async function returnCoins(c, bet, winner, note) {
  const amount = payout(bet, winner);

  if (amount) {
    await c.query(
      "UPDATE customers SET demo_coin_balance=demo_coin_balance+$1,updated_at=NOW() WHERE id=$2",
      [amount, bet.customer_id],
    );

    await c.query(
      "INSERT INTO demo_coin_transactions(customer_id,amount,transaction_type,note) VALUES($1,$2,'SO_RETURN',$3)",
      [bet.customer_id, amount, note],
    );
  }

  return amount;
}

async function settleLegacy(c, now) {
  const exists = (
    await c.query(
      "SELECT to_regclass('public.tsb_so_matches') AS name",
      [],
    )
  ).rows[0]?.name;

  if (!exists) return;

  const rows = (
    await c.query(
      "SELECT * FROM tsb_so_matches WHERE settled=FALSE AND start_ms<=$1 ORDER BY start_ms FOR UPDATE",
      [now],
    )
  ).rows;

  for (const row of rows) {
    // Old accepted bets keep their saved outcome and old clock.
    if (
      now <
      Number(row.start_ms) + row.outcome.events.length * 15000
    ) {
      continue;
    }

    const bets = (
      await c.query(
        "SELECT * FROM tsb_so_bets WHERE match_id=$1 AND status='PLACED' ORDER BY customer_id,id FOR UPDATE",
        [row.id],
      )
    ).rows;

    for (const bet of bets) {
      const amount = await returnCoins(
        c,
        bet,
        row.outcome.winner,
        `Legacy SO #${row.id}; saved result; stake included`,
      );

      await c.query(
        "UPDATE tsb_so_bets SET status='SETTLED',payout=$1 WHERE id=$2",
        [amount, bet.id],
      );
    }

    await c.query(
      "UPDATE tsb_so_matches SET settled=TRUE WHERE id=$1",
      [row.id],
    );
  }
}

async function advance(c, row, now) {
  let balls = await getBalls(c, row.id);

  if (
    !row.ready ||
    row.settled ||
    now < Number(row.start_ms) - PREBET_MS
  ) {
    return { row, balls };
  }

  for (let seq = balls.length; seq < 12; seq++) {
    const next = nextDelivery(balls);

    if (!next) break;

    const opens =
      Number(row.start_ms) +
      (seq === 0 ? -PREBET_MS : seq * BALL_MS);

    if (now < opens) break;

    const value = row.plan[next.planIndex];

    if (!ALLOWED_BALLS.includes(value)) {
      throw Error("Published plan contains an invalid ball");
    }

    const seed = randomBytes(32).toString("hex");

    const payload = {
      matchId: `M${row.id}`,
      seq,
      team: next.team,
      teamBall: next.teamBall,
      value,
    };

    const ball = (
      await c.query(
        `INSERT INTO tsb_so_manual_balls(
          match_id,seq,team,team_ball,value,
          opens_ms,reveals_ms,seed,commitment
        )
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
        RETURNING *`,
        [
          row.id,
          seq,
          next.team,
          next.teamBall,
          String(value),
          opens,
          Number(row.start_ms) + seq * BALL_MS + WINDOW_MS,
          seed,
          commitment(payload, seed),
        ],
      )
    ).rows[0];

    balls.push(ball);
  }

  if (balls.length && !nextDelivery(balls)) {
    const end =
      Number(row.start_ms) + balls.length * BALL_MS;

    if (now >= end) {
      const bets = (
        await c.query(
          "SELECT * FROM tsb_so_manual_bets WHERE match_id=$1 AND status='PLACED' ORDER BY customer_id,id FOR UPDATE",
          [row.id],
        )
      ).rows;

      for (const bet of bets) {
        const amount = await returnCoins(
          c,
          bet,
          matchWinner(balls),
          `Controlled SO M${row.id}; stake included`,
        );

        await c.query(
          "UPDATE tsb_so_manual_bets SET status='SETTLED',payout=$1 WHERE id=$2",
          [amount, bet.id],
        );
      }

      await c.query(
        "UPDATE tsb_so_manual_matches SET settled=TRUE WHERE id=$1",
        [row.id],
      );

      row = { ...row, settled: true };
    }
  }

  return { row, balls };
}

async function advanceAll(c, now) {
  await settleLegacy(c, now);

  const rows = (
    await c.query(
      "SELECT * FROM tsb_so_manual_matches WHERE ready=TRUE AND settled=FALSE AND start_ms<=$1 ORDER BY start_ms FOR UPDATE",
      [now + PREBET_MS],
    )
  ).rows;

  for (const row of rows) {
    await advance(c, row, now);
  }
}

const publicBet = (b) => ({
  ...b,
  match_id: `M${b.match_id}`,
});

const publicFixture = (row, balls, now) => {
  const view = publicControlledMatch(row, balls, now);

  return {
    startAt: view.startAt,
    endsAt: view.latestEndAt,
    teams: view.teams,
    id: view.id,
    phase: view.phase,
  };
};

export function registerAnimatedCricketRoutes(app, pool) {
  const prefix = "/api/animated-cricket",
    adminPrefix = "/api/admin/so-control";

  const guard = (req, res, next) => {
    res.set("Cache-Control", "no-store");

    if (!isDemo()) {
      return res.status(409).json({
        error: "Demo mode only.",
      });
    }

    if (req.method !== "GET" && req.headers.origin) {
      try {
        if (
          new URL(req.headers.origin).host !== req.headers.host
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
  };

  app.use(prefix, guard);
  app.use(adminPrefix, guard, requireOldAdmin(pool));

  const customer = wrap(async (req, res, next) => {
    const token =
      String(req.headers.cookie || "")
        .split(";")
        .map((s) => s.trim())
        .find((s) => s.startsWith("tsb_demo_session="))
        ?.slice(17) || "";

    if (!/^[a-f0-9]{64}$/.test(token)) {
      throw fail(401, "Customer login required.");
    }

    const found = (
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

    if (!found) {
      throw fail(
        401,
        "Customer session expired. Login again.",
      );
    }

    req.customerId = found.id;
    next();
  });

  app.get(
    prefix + "/schedule",
    wrap(async (req, res) =>
      res.json(
        await tx(pool, async (c) => {
          const now = await time(c);

          await advanceAll(c, now);

          const rows = (
            await c.query(
              "SELECT * FROM tsb_so_manual_matches WHERE ready=TRUE AND settled=FALSE AND start_ms BETWEEN $1 AND $2 ORDER BY start_ms",
              [now - MATCH_MS, now + PREBET_MS],
            )
          ).rows;

          const matches = [];

          for (const row of rows) {
            const balls = await getBalls(c, row.id),
              v = publicControlledMatch(row, balls, now);

            if (v.phase !== "RESULT") {
              matches.push(publicFixture(row, balls, now));
            }
          }

          return {
            serverTime: new Date(now).toISOString(),
            matches,
          };
        }),
      ),
    ),
  );

  app.get(
    prefix + "/state",
    customer,
    wrap(async (req, res) =>
      res.json(
        await tx(pool, async (c) => {
          const now = await time(c);

          await advanceAll(c, now);

          let row;

          if (req.query.start !== undefined) {
            const raw = String(req.query.start),
              start = /^\d{10,16}$/.test(raw)
                ? Number(raw)
                : NaN;

            const slot =
              Math.floor(now / INTERVAL_MS) * INTERVAL_MS;

            if (
              !Number.isSafeInteger(start) ||
              start % INTERVAL_MS ||
              start < slot - 8 * INTERVAL_MS ||
              start > slot + INTERVAL_MS
            ) {
              throw fail(400, "Invalid scheduled match.");
            }

            if (start > now + PREBET_MS) {
              throw fail(
                409,
                "This match releases five minutes before start.",
              );
            }

            row = (
              await c.query(
                "SELECT * FROM tsb_so_manual_matches WHERE start_ms=$1 AND ready=TRUE",
                [start],
              )
            ).rows[0];

            if (!row) {
              throw fail(
                404,
                "This match has not been prepared and released by Admin.",
              );
            }
          } else {
            row = (
              await c.query(
                "SELECT * FROM tsb_so_manual_matches WHERE ready=TRUE AND start_ms<=$1 ORDER BY start_ms DESC LIMIT 1",
                [now + PREBET_MS],
              )
            ).rows[0];
          }

          const balance = Number(
            (
              await c.query(
                "SELECT demo_coin_balance FROM customers WHERE id=$1",
                [req.customerId],
              )
            ).rows[0].demo_coin_balance,
          );

          const bets = (
            await c.query(
              "SELECT * FROM tsb_so_manual_bets WHERE customer_id=$1 ORDER BY id DESC LIMIT 100",
              [req.customerId],
            )
          ).rows.map(publicBet);

          const balls = row
            ? await getBalls(c, row.id)
            : [];

          return {
            serverTime: new Date(now).toISOString(),
            balance,
            bets,
            match: row
              ? publicControlledMatch(row, balls, now)
              : null,
            message: row
              ? null
              : "No prepared match has been released yet. Return to the cricket list.",
          };
        }),
      ),
    ),
  );

  app.post(
    prefix + "/bets",
    customer,
    wrap(async (req, res) => {
      const b = req.body || {},
        {
          matchId,
          team,
          direction,
          amount,
          points,
          windowId,
          quoteVersion,
          requestKey,
        } = b;

      if (
        !/^M\d{1,18}$/.test(String(matchId)) ||
        ![0, 1].includes(team) ||
        !["BACK", "LAY"].includes(direction) ||
        !Number.isSafeInteger(amount) ||
        amount < 100 ||
        amount > 25000 ||
        !Number.isInteger(points) ||
        points <= 0 ||
        !Number.isInteger(quoteVersion) ||
        !/^(PRE|\d{1,2})$/.test(String(windowId)) ||
        !/^[a-zA-Z0-9_-]{16,100}$/.test(String(requestKey))
      ) {
        throw fail(
          400,
          "Choose a valid selection and 100–25,000 whole demo coins.",
        );
      }

      res.json(
        await tx(pool, async (c) => {
          const id = String(matchId).slice(1),
            prior = (
              await c.query(
                "SELECT * FROM tsb_so_manual_bets WHERE customer_id=$1 AND request_key=$2",
                [req.customerId, requestKey],
              )
            ).rows[0];

          if (prior) {
            if (
              String(prior.match_id) !== id ||
              prior.team !== team ||
              prior.direction !== direction ||
              prior.amount !== amount ||
              prior.points !== points ||
              prior.window_id !== windowId ||
              prior.quote_version !== quoteVersion
            ) {
              throw fail(409, "Request key already used.");
            }

            return {
              success: true,
              duplicate: true,
              bet: publicBet(prior),
            };
          }

          let now = await time(c);

          await advanceAll(c, now);

          let row = (
            await c.query(
              "SELECT * FROM tsb_so_manual_matches WHERE id=$1 AND ready=TRUE",
              [id],
            )
          ).rows[0];

          if (!row) {
            throw fail(404, "Released match not found.");
          }

          let balls = await getBalls(c, id),
            view = publicControlledMatch(row, balls, now);

          const valid = () =>
            view.phase === "BETTING" &&
            view.windowId === windowId &&
            view.quoteVersion === quoteVersion &&
            view.rates[team][direction.toLowerCase()] === points;

          if (!valid()) {
            throw fail(
              409,
              "Market closed or rate changed. Select the current rate again.",
            );
          }

          const wallet = (
            await c.query(
              "SELECT demo_coin_balance,status FROM customers WHERE id=$1 FOR UPDATE",
              [req.customerId],
            )
          ).rows[0];

          if (wallet?.status !== "ACTIVE") {
            throw fail(403, "Customer is inactive.");
          }

          const totals = (
            await c.query(
              "SELECT COUNT(*) AS count,COALESCE(SUM(hold),0) AS held FROM tsb_so_manual_bets WHERE match_id=$1 AND customer_id=$2",
              [id, req.customerId],
            )
          ).rows[0];

          const { hold, winReturn } = betAmounts(
            amount,
            direction,
            points,
          );

          if (
            Number(totals.count) >= 100 ||
            Number(totals.held) + hold > 100000
          ) {
            throw fail(400, "Match limit reached.");
          }

          if (Number(wallet.demo_coin_balance) < hold) {
            throw fail(400, "Insufficient demo coins.");
          }

          now = await time(c);

          ({ row, balls } = await advance(c, row, now));

          view = publicControlledMatch(row, balls, now);

          if (!valid()) {
            throw fail(
              409,
              "Betting locked. Wait for the next window.",
            );
          }

          await c.query(
            "UPDATE customers SET demo_coin_balance=demo_coin_balance-$1,updated_at=NOW() WHERE id=$2",
            [hold, req.customerId],
          );

          await c.query(
            "INSERT INTO demo_coin_transactions(customer_id,amount,transaction_type,note) VALUES($1,$2,'SO_BET',$3)",
            [
              req.customerId,
              -hold,
              `Controlled SO ${matchId}; ${direction} ${row.teams[team]}`,
            ],
          );

          const bet = (
            await c.query(
              `INSERT INTO tsb_so_manual_bets(
                match_id,customer_id,team,direction,amount,
                points,hold,win_return,window_id,
                quote_version,request_key
              )
              VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
              RETURNING *`,
              [
                id,
                req.customerId,
                team,
                direction,
                amount,
                points,
                hold,
                winReturn,
                windowId,
                quoteVersion,
                requestKey,
              ],
            )
          ).rows[0];

          return {
            success: true,
            bet: publicBet(bet),
          };
        }),
      );
    }),
  );

  app.get(
    adminPrefix,
    wrap(async (req, res) =>
      res.json(
        await tx(pool, async (c) => {
          const now = await time(c);

          await advanceAll(c, now);

          const slot =
            Math.floor(now / INTERVAL_MS) * INTERVAL_MS;

          for (let i = 1; i <= 8; i++) {
            await ensureDraft(
              c,
              slot + i * INTERVAL_MS,
            );
          }

          const rows = (
            await c.query(
              "SELECT * FROM tsb_so_manual_matches WHERE start_ms BETWEEN $1 AND $2 ORDER BY start_ms",
              [
                slot - INTERVAL_MS,
                slot + 8 * INTERVAL_MS,
              ],
            )
          ).rows;

          const matches = [];

          for (const row of rows) {
            const balls = await getBalls(c, row.id);

            matches.push({
              ...row,
              id: String(row.id),
              startAt: new Date(
                Number(row.start_ms),
              ).toISOString(),
              releaseAt: new Date(
                Number(row.start_ms) - PREBET_MS,
              ).toISOString(),

              committed: balls.map((b) => ({
                seq: b.seq,
                team: b.team,
                teamBall: b.team_ball,
                value:
                  b.value === "W"
                    ? "W"
                    : Number(b.value),
                opensAt: new Date(
                  Number(b.opens_ms),
                ).toISOString(),
              })),

              public: row.ready
                ? publicControlledMatch(row, balls, now)
                : null,
            });
          }

          return {
            serverTime: new Date(now).toISOString(),
            matches,
          };
        }),
      ),
    ),
  );

  app.post(
    adminPrefix + "/:id",
    wrap(async (req, res) => {
      if (!/^\d{1,18}$/.test(req.params.id)) {
        throw fail(400, "Invalid match ID.");
      }

      res.json(
        await tx(pool, async (c) => {
          let now = await time(c);

          await advanceAll(c, now);

          let row = (
            await c.query(
              "SELECT * FROM tsb_so_manual_matches WHERE id=$1 FOR UPDATE",
              [req.params.id],
            )
          ).rows[0];

          if (!row) {
            throw fail(404, "Match not found.");
          }

          const b = req.body || {};

          if (
            !Number.isInteger(b.version) ||
            b.version !== row.version
          ) {
            throw fail(
              409,
              "Another Admin changed this match. Refresh before saving.",
            );
          }

          if (
            row.settled ||
            now >= Number(row.start_ms) + MATCH_MS
          ) {
            throw fail(
              409,
              "This match is complete or its preparation deadline has passed.",
            );
          }

          const before = {
            plan: row.plan,
            rates: row.rates,
            ready: row.ready,
            marketClosed: row.market_closed,
          };

          let plan = row.plan,
            rates = row.rates,
            ready = row.ready,
            closed = row.market_closed,
            quote = row.quote_version;

          if (b.action === "SAVE_PLAN") {
            if (
              !Array.isArray(b.plan) ||
              b.plan.length !== 12 ||
              b.plan.some(
                (v) =>
                  v !== null &&
                  !ALLOWED_BALLS.includes(v),
              )
            ) {
              throw fail(
                400,
                "Enter six valid ball results per team.",
              );
            }

            if (
              row.ready &&
              b.plan.some((v) => v === null)
            ) {
              throw fail(
                400,
                "Published plans cannot contain blank balls.",
              );
            }

            const committed = await getBalls(c, row.id);

            for (const ball of committed) {
              const index =
                  ball.team * 6 + ball.team_ball - 1,
                value =
                  ball.value === "W"
                    ? "W"
                    : Number(ball.value);

              if (b.plan[index] !== value) {
                throw fail(
                  409,
                  "That ball is already committed. Only unopened balls can change.",
                );
              }
            }

            plan = b.plan;
          } else if (b.action === "PUBLISH") {
            if (
              now >=
              Number(row.start_ms) - PREBET_MS
            ) {
              throw fail(
                409,
                "Prepare and publish at least five minutes before start. Choose the next slot.",
              );
            }

            if (
              plan.some(
                (v) => !ALLOWED_BALLS.includes(v),
              )
            ) {
              throw fail(
                400,
                "Fill all twelve ball results before publishing.",
              );
            }

            ready = true;
          } else if (b.action === "SET_RATES") {
            if (
              !Array.isArray(b.rates) ||
              b.rates.length !== 2 ||
              b.rates.some(
                (r) =>
                  !Number.isInteger(r.back) ||
                  !Number.isInteger(r.lay) ||
                  r.back < 1 ||
                  r.lay < r.back ||
                  r.lay > 999,
              )
            ) {
              throw fail(
                400,
                "Enter whole points: Back >= 1, Lay >= Back, maximum 999.",
              );
            }

            rates = b.rates;
            quote++;
          } else if (b.action === "CLOSE_MARKET") {
            closed = true;
            quote++;
          } else if (b.action === "OPEN_MARKET") {
            closed = false;
            quote++;
          } else {
            throw fail(
              400,
              "Choose a valid Admin action.",
            );
          }

          // Re-check timing before applying a change.
          now = await time(c);

          const latest = await advance(c, row, now);

          if (latest.row.settled) {
            throw fail(
              409,
              "This match completed while saving. Refresh the panel.",
            );
          }

          if (b.action === "SAVE_PLAN") {
            for (const ball of latest.balls) {
              const i =
                  ball.team * 6 + ball.team_ball - 1,
                v =
                  ball.value === "W"
                    ? "W"
                    : Number(ball.value);

              if (plan[i] !== v) {
                throw fail(
                  409,
                  "Ball opened while saving; refresh the queue.",
                );
              }
            }
          }

          if (
            b.action === "PUBLISH" &&
            now >= Number(row.start_ms) - PREBET_MS
          ) {
            throw fail(
              409,
              "Five-minute release deadline reached. Prepare the next slot.",
            );
          }

          row = (
            await c.query(
              "UPDATE tsb_so_manual_matches SET plan=$1,rates=$2,ready=$3,market_closed=$4,quote_version=$5,version=version+1 WHERE id=$6 RETURNING *",
              [
                JSON.stringify(plan),
                JSON.stringify(rates),
                ready,
                closed,
                quote,
                row.id,
              ],
            )
          ).rows[0];

          await c.query(
            "INSERT INTO tsb_so_manual_audit(match_id,admin_id,action,details) VALUES($1,$2,$3,$4)",
            [
              row.id,
              String(req.verifiedAdminId),
              b.action,
              JSON.stringify({
                before,
                after: {
                  plan,
                  rates,
                  ready,
                  marketClosed: closed,
                },
                version: row.version,
              }),
            ],
          );

          return {
            success: true,
            version: row.version,
          };
        }),
      );
    }),
  );

  let timer,
    busy = false;

  const tick = async () => {
    if (busy || !isDemo()) return;

    busy = true;

    try {
      await tx(pool, async (c) =>
        advanceAll(c, await time(c)),
      );
    } catch (e) {
      console.error(
        "Controlled SO tick failed",
        e.message,
      );
    } finally {
      busy = false;
    }
  };

  return {
    start() {
      if (!timer) {
        void tick();

        timer = setInterval(tick, 250);
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
