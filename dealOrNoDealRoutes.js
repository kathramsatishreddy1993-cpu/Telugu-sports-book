import {
  createHash,
  randomBytes,
} from "node:crypto";

import {
  requireControllerAccount,
  verifyControllerForMutation,
} from "./controllerAccounts.js";

import {
  DEAL_GAME,
  DEAL_GAME_NAME,
  DEAL_RESULT_LABEL,
  DEAL_LIMITS,
  DEAL_TIMING,
  DEAL_MAX_LEVEL,
  DEAL_OFFER_LEVELS,
  DEAL_RULES_TEXT,
  validDealStake,
  validDealCase,
  validateDealPlan,
  dealPlanText,
  dealCollectAmount,
  dealBankerOffer,
  publicDealLevels,
} from "./dealOrNoDealRules.js";

const LOCK_ID = 746239;

const hash = value =>
  createHash("sha256").update(value).digest("hex");

const fail = (status, message) =>
  Object.assign(new Error(message), { status });

const wrap = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const validId = value =>
  /^\d{1,18}$/.test(String(value));

const validKey = value =>
  typeof value === "string" &&
  /^[a-zA-Z0-9_-]{16,100}$/.test(value);

const LEVEL_MS =
  DEAL_TIMING.bettingMs + DEAL_TIMING.revealMs;

const SESSION_MS = LEVEL_MS * DEAL_MAX_LEVEL;

async function nowAt(client) {
  const result = await client.query(
    "SELECT clock_timestamp() AS now",
  );

  return new Date(result.rows[0].now).getTime();
}

async function transaction(pool, fn) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      "SELECT pg_advisory_xact_lock($1)",
      [LOCK_ID],
    );

    const result = await fn(client);

    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function initializeDealOrNoDeal(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tsb_deal_sessions (
      id BIGSERIAL PRIMARY KEY,
      controller_id INTEGER NOT NULL
        REFERENCES tsb_game_controller_accounts(id),
      plan JSONB NOT NULL,
      offers JSONB NOT NULL,
      seed TEXT NOT NULL,
      commitment TEXT NOT NULL,
      opens_at TIMESTAMPTZ NOT NULL,
      ends_at TIMESTAMPTZ NOT NULL,
      settled BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS tsb_deal_one_active
      ON tsb_deal_sessions ((TRUE))
      WHERE settled=FALSE;

    CREATE TABLE IF NOT EXISTS tsb_deal_entries (
      id BIGSERIAL PRIMARY KEY,
      session_id BIGINT NOT NULL
        REFERENCES tsb_deal_sessions(id),
      customer_id INTEGER NOT NULL
        REFERENCES customers(id),
      stake INTEGER NOT NULL
        CHECK (stake BETWEEN 100 AND 25000),
      status TEXT NOT NULL DEFAULT 'PLAYING'
        CHECK (
          status IN (
            'PLAYING','WON','LOST','COLLECTED','CANCELLED'
          )
        ),
      completed_level INTEGER NOT NULL DEFAULT 0,
      payout INTEGER NOT NULL DEFAULT 0,
      request_key TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(customer_id,request_key)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS tsb_deal_customer_entry
      ON tsb_deal_entries(session_id,customer_id)
      WHERE status<>'CANCELLED';

    CREATE TABLE IF NOT EXISTS tsb_deal_choices (
      id BIGSERIAL PRIMARY KEY,
      entry_id BIGINT NOT NULL
        REFERENCES tsb_deal_entries(id),
      level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 9),
      case_number INTEGER NOT NULL
        CHECK (case_number BETWEEN 1 AND 9),
      won BOOLEAN,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(entry_id,level)
    );

    CREATE INDEX IF NOT EXISTS tsb_deal_entry_customer
      ON tsb_deal_entries(customer_id,id DESC);

    CREATE TABLE IF NOT EXISTS tsb_deal_audit (
      id BIGSERIAL PRIMARY KEY,
      controller_id INTEGER NOT NULL
        REFERENCES tsb_game_controller_accounts(id),
      session_id BIGINT NOT NULL
        REFERENCES tsb_deal_sessions(id),
      action TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE OR REPLACE FUNCTION tsb_deal_protect_session()
      RETURNS trigger AS $$
    BEGIN
      IF TG_OP='DELETE' THEN
        RAISE EXCEPTION 'Deal history cannot be deleted';
      END IF;

      IF NEW.id IS DISTINCT FROM OLD.id
        OR NEW.controller_id IS DISTINCT FROM OLD.controller_id
        OR NEW.plan IS DISTINCT FROM OLD.plan
        OR NEW.offers IS DISTINCT FROM OLD.offers
        OR NEW.seed IS DISTINCT FROM OLD.seed
        OR NEW.commitment IS DISTINCT FROM OLD.commitment
        OR NEW.opens_at IS DISTINCT FROM OLD.opens_at
        OR NEW.ends_at IS DISTINCT FROM OLD.ends_at
        OR NEW.created_at IS DISTINCT FROM OLD.created_at
        OR (OLD.settled AND NOT NEW.settled)
      THEN
        RAISE EXCEPTION 'Locked Deal results cannot be changed';
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS tsb_deal_session_immutable
      ON tsb_deal_sessions;

    CREATE TRIGGER tsb_deal_session_immutable
      BEFORE UPDATE OR DELETE ON tsb_deal_sessions
      FOR EACH ROW
      EXECUTE FUNCTION tsb_deal_protect_session();
  `);
}

function levelTimes(session, level) {
  const opensAt =
    new Date(session.opens_at).getTime() +
    (level - 1) * LEVEL_MS;

  return {
    opensAt,
    closesAt: opensAt + DEAL_TIMING.bettingMs,
    revealsAt: opensAt + LEVEL_MS,
  };
}

function phaseAt(session, now) {
  if (!session) {
    return {
      phase: "WAITING",
      level: 0,
    };
  }

  const opens = new Date(session.opens_at).getTime();
  const ends = new Date(session.ends_at).getTime();

  if (session.settled || now >= ends) {
    return {
      phase: "FINISHED",
      level: DEAL_MAX_LEVEL,
      ...levelTimes(session, DEAL_MAX_LEVEL),
    };
  }

  if (now < opens) {
    return {
      phase: "WAITING",
      level: 1,
      ...levelTimes(session, 1),
    };
  }

  const level = Math.min(
    DEAL_MAX_LEVEL,
    Math.floor((now - opens) / LEVEL_MS) + 1,
  );

  const times = levelTimes(session, level);

  return {
    level,
    phase: now < times.closesAt ? "BETTING" : "DRAWING",
    ...times,
  };
}

function offerPercent(session, completedLevel) {
  return Number(session.offers[String(completedLevel)]);
}

function offerFor(entry, session) {
  if (
    entry.status !== "WON" ||
    !DEAL_OFFER_LEVELS.includes(entry.completed_level)
  ) {
    return null;
  }

  return dealBankerOffer({
    originalStake: entry.stake,
    completedLevel: entry.completed_level,
    percent: offerPercent(session, entry.completed_level),
  });
}

function normalizeOffers(value = {}) {
  const offers = {};

  for (const level of DEAL_OFFER_LEVELS) {
    const percent = value[String(level)] ?? 100;

    if (
      !Number.isInteger(percent) ||
      percent < 90 ||
      percent > 110
    ) {
      throw fail(
        400,
        "Offer percentages must be whole numbers from 90 to 110.",
      );
    }

    offers[String(level)] = percent;
  }

  return offers;
}

async function credit(client, entry, amount, type, note) {
  await client.query(
    `UPDATE customers
     SET demo_coin_balance=demo_coin_balance+$1,
         updated_at=NOW()
     WHERE id=$2`,
    [amount, entry.customer_id],
  );

  await client.query(
    `INSERT INTO demo_coin_transactions(
       customer_id,amount,transaction_type,note
     )
     VALUES($1,$2,$3,$4)`,
    [entry.customer_id, amount, type, note],
  );
}

async function collectEntry(client, entry, amount, reason) {
  await credit(
    client,
    entry,
    amount,
    "DEAL_RETURN",
    `Deal #${entry.session_id}; ${reason}; stake included`,
  );

  await client.query(
    `UPDATE tsb_deal_entries
     SET status='COLLECTED',
         payout=$1,
         updated_at=NOW()
     WHERE id=$2`,
    [amount, entry.id],
  );
}

async function advance(client) {
  const session = (
    await client.query(
      `SELECT *
       FROM tsb_deal_sessions
       WHERE settled=FALSE
       ORDER BY id
       LIMIT 1
       FOR UPDATE`,
    )
  ).rows[0];

  if (!session) return;

  const now = await nowAt(client);

  const entries = (
    await client.query(
      `SELECT *
       FROM tsb_deal_entries
       WHERE session_id=$1
         AND status IN ('PLAYING','WON')
       ORDER BY customer_id,id
       FOR UPDATE`,
      [session.id],
    )
  ).rows;

  for (const original of entries) {
    const entry = { ...original };

    const choices = (
      await client.query(
        `SELECT *
         FROM tsb_deal_choices
         WHERE entry_id=$1
         ORDER BY level
         FOR UPDATE`,
        [entry.id],
      )
    ).rows;

    for (const choice of choices) {
      if (choice.won !== null) continue;

      const times = levelTimes(session, choice.level);

      if (now < times.revealsAt) continue;

      const selected = session.plan.find(
        item => item.level === choice.level,
      );

      const won = selected.winners.includes(choice.case_number);

      await client.query(
        `UPDATE tsb_deal_choices
         SET won=$1
         WHERE id=$2`,
        [won, choice.id],
      );

      entry.completed_level = choice.level;
      entry.status = won ? "WON" : "LOST";

      await client.query(
        `UPDATE tsb_deal_entries
         SET status=$1,
             completed_level=$2,
             updated_at=NOW()
         WHERE id=$3`,
        [entry.status, choice.level, entry.id],
      );

      if (!won) break;

      if (choice.level === DEAL_MAX_LEVEL) {
        await collectEntry(
          client,
          entry,
          dealCollectAmount(entry.stake, choice.level),
          "Final level auto collect",
        );

        entry.status = "COLLECTED";
        break;
      }
    }

    if (entry.status !== "WON") continue;

    const nextLevel = entry.completed_level + 1;

    const continued = choices.some(
      choice => choice.level === nextLevel,
    );

    const deadline = levelTimes(session, nextLevel).closesAt;

    if (!continued && now >= deadline) {
      await collectEntry(
        client,
        entry,
        dealCollectAmount(entry.stake, entry.completed_level),
        "No continuation; auto collect",
      );
    }
  }

  if (now >= new Date(session.ends_at).getTime()) {
    await client.query(
      "UPDATE tsb_deal_sessions SET settled=TRUE WHERE id=$1",
      [session.id],
    );
  }
}

async function getSession(client, id) {
  return (
    await client.query(
      "SELECT * FROM tsb_deal_sessions WHERE id=$1",
      [id],
    )
  ).rows[0];
}

async function latestSession(client) {
  return (
    await client.query(
      "SELECT * FROM tsb_deal_sessions ORDER BY id DESC LIMIT 1",
    )
  ).rows[0];
}

function publicSession(session, now) {
  if (!session) return null;

  const stage = phaseAt(session, now);

  const revealed = session.plan.filter(item =>
    now >= levelTimes(session, item.level).revealsAt,
  );

  return {
    id: String(session.id),
    resultMode: "ADMIN_SELECTED",
    resultLabel: DEAL_RESULT_LABEL,
    opensAt: session.opens_at,
    endsAt: session.ends_at,
    phase: stage.phase,
    level: stage.level,
    bettingClosesAt: stage.closesAt
      ? new Date(stage.closesAt).toISOString()
      : null,
    revealsAt: stage.revealsAt
      ? new Date(stage.revealsAt).toISOString()
      : null,
    levelOpensAt: stage.opensAt
      ? new Date(stage.opensAt).toISOString()
      : null,
    commitment: session.commitment,
    revealed,
    seed: session.settled ? session.seed : null,
    plan: session.settled ? session.plan : null,
    offers: session.settled ? session.offers : null,
  };
}

async function publicEntry(client, entry, session, now) {
  const choices = (
    await client.query(
      `SELECT level,case_number,won
       FROM tsb_deal_choices
       WHERE entry_id=$1
       ORDER BY level`,
      [entry.id],
    )
  ).rows.map(choice => ({
    level: choice.level,
    caseNumber: choice.case_number,
    won: choice.won,
  }));

  const nextTimes =
    entry.status === "WON" &&
    entry.completed_level < DEAL_MAX_LEVEL
      ? levelTimes(session, entry.completed_level + 1)
      : null;

  const offerDeadline = nextTimes
    ? nextTimes.closesAt - DEAL_TIMING.offerCutoffMs
    : null;

  const offerAmount = offerFor(entry, session);

  return {
    id: String(entry.id),
    sessionId: String(entry.session_id),
    stake: Number(entry.stake),
    status: entry.status,
    completedLevel: entry.completed_level,
    payout: Number(entry.payout),
    collectAmount:
      entry.status === "WON"
        ? dealCollectAmount(entry.stake, entry.completed_level)
        : 0,
    offer:
      offerAmount !== null &&
      offerDeadline !== null &&
      now < offerDeadline
        ? {
            amount: offerAmount,
            deadline: new Date(offerDeadline).toISOString(),
          }
        : null,
    choices,
  };
}

export function registerDealOrNoDealRoutes(app, pool) {
  app.use("/api/deal-or-no-deal", (req, res, next) => {
    res.set("Cache-Control", "no-store");

    if (
      String(process.env.DEMO_GAMES_MODE ?? "demo")
        .trim()
        .toLowerCase() !== "demo"
    ) {
      return res.status(409).json({
        error: "This game is currently unavailable.",
      });
    }

    if (req.method === "POST" && req.headers.origin) {
      try {
        if (
          new URL(req.headers.origin).host !== req.headers.host
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

  const controller = requireControllerAccount(
    pool,
    true,
    DEAL_GAME,
  );

  const controllerSession = requireControllerAccount(
    pool,
    false,
    DEAL_GAME,
  );

  const customer = wrap(async (req, res, next) => {
    const item = String(req.headers.cookie || "")
      .split(";")
      .map(value => value.trim())
      .find(value => value.startsWith("tsb_demo_session="));

    const token = item
      ? item.slice("tsb_demo_session=".length)
      : "";

    if (!/^[a-f0-9]{64}$/.test(token)) {
      throw fail(401, "Customer login required.");
    }

    const account = (
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

    if (!account) {
      throw fail(401, "Customer session expired. Login again.");
    }

    req.dealCustomerId = account.id;
    next();
  });

  app.get(
    "/api/deal-or-no-deal/controller/session",
    controllerSession,
    (req, res) => res.json({
      success: true,
      game: DEAL_GAME,
      controllerId: req.controllerAccount.login_id,
      controllerName: req.controllerAccount.name,
      mustChangePassword:
        req.controllerAccount.must_change_password,
    }),
  );

  app.get(
    "/api/deal-or-no-deal/controller/state",
    controller,
    wrap(async (req, res) => {
      const result = await transaction(pool, async client => {
        await advance(client);

        const session = await latestSession(client);
        const now = await nowAt(client);

        return {
          success: true,
          serverTime: new Date(now).toISOString(),
          resultLabel: DEAL_RESULT_LABEL,
          levels: publicDealLevels(),
          limits: DEAL_LIMITS,
          timing: DEAL_TIMING,
          session: session
            ? {
                ...publicSession(session, now),
                lockedPlan: session.plan,
                lockedOffers: session.offers,
              }
            : null,
        };
      });

      res.json(result);
    }),
  );

  app.post(
    "/api/deal-or-no-deal/controller/publish",
    controller,
    wrap(async (req, res) => {
      let plan;

      try {
        plan = validateDealPlan(req.body?.plan);
      } catch (error) {
        throw fail(400, error.message);
      }

      const offers = normalizeOffers(req.body?.offers);

      const result = await transaction(pool, async client => {
        await advance(client);

        await verifyControllerForMutation(
          client,
          req.controllerAccount,
          DEAL_GAME,
        );

        const active = (
          await client.query(
            "SELECT id FROM tsb_deal_sessions WHERE settled=FALSE",
          )
        ).rows[0];

        if (active) {
          throw fail(
            409,
            "A locked game is already running. Wait for it to finish.",
          );
        }

        const now = await nowAt(client);
        const opensAt = now + 5000;
        const seed = randomBytes(32).toString("hex");

        const commitment = hash(
          `${dealPlanText(plan)}:${JSON.stringify(offers)}:${seed}`,
        );

        const session = (
          await client.query(
            `INSERT INTO tsb_deal_sessions(
               controller_id,plan,offers,seed,commitment,
               opens_at,ends_at
             )
             VALUES($1,$2,$3,$4,$5,$6,$7)
             RETURNING *`,
            [
              req.controllerAccount.id,
              JSON.stringify(plan),
              JSON.stringify(offers),
              seed,
              commitment,
              new Date(opensAt),
              new Date(opensAt + SESSION_MS),
            ],
          )
        ).rows[0];

        await client.query(
          `INSERT INTO tsb_deal_audit(
             controller_id,session_id,action
           )
           VALUES($1,$2,'PUBLISH_LOCKED_PLAN')`,
          [req.controllerAccount.id, session.id],
        );

        return {
          success: true,
          session: publicSession(session, now),
        };
      });

      res.status(201).json(result);
    }),
  );

  app.get(
    "/api/deal-or-no-deal/state",
    customer,
    wrap(async (req, res) => {
      const result = await transaction(pool, async client => {
        await advance(client);

        const session = await latestSession(client);

        const wallet = (
          await client.query(
            "SELECT demo_coin_balance FROM customers WHERE id=$1",
            [req.dealCustomerId],
          )
        ).rows[0];

        const rows = (
          await client.query(
            `SELECT *
             FROM tsb_deal_entries
             WHERE customer_id=$1
             ORDER BY id DESC
             LIMIT 30`,
            [req.dealCustomerId],
          )
        ).rows;

        const now = await nowAt(client);
        const entries = [];

        for (const row of rows) {
          const entrySession =
            session && String(session.id) === String(row.session_id)
              ? session
              : await getSession(client, row.session_id);

          entries.push(
            await publicEntry(client, row, entrySession, now),
          );
        }

        return {
          customerId: req.dealCustomerId,
          name: DEAL_GAME_NAME,
          resultLabel: DEAL_RESULT_LABEL,
          serverTime: new Date(now).toISOString(),
          balance: Number(wallet.demo_coin_balance),
          session: publicSession(session, now),
          entries,
          levels: publicDealLevels(),
          limits: DEAL_LIMITS,
          timing: DEAL_TIMING,
          rules: DEAL_RULES_TEXT,
        };
      });

      res.json(result);
    }),
  );

  app.post(
    "/api/deal-or-no-deal/bets",
    customer,
    wrap(async (req, res) => {
      const {
        sessionId,
        amount,
        caseNumber,
        requestKey,
      } = req.body || {};

      if (
        !validId(sessionId) ||
        !validDealStake(amount) ||
        !validDealCase(caseNumber) ||
        !validKey(requestKey)
      ) {
        throw fail(
          400,
          "Choose a case from 1 to 9 and enter 100–25,000 whole coins.",
        );
      }

      const result = await transaction(pool, async client => {
        await advance(client);

        const prior = (
          await client.query(
            `SELECT e.*,c.case_number
             FROM tsb_deal_entries e
             JOIN tsb_deal_choices c
               ON c.entry_id=e.id AND c.level=1
             WHERE e.customer_id=$1 AND e.request_key=$2`,
            [req.dealCustomerId, requestKey],
          )
        ).rows[0];

        if (prior) {
          if (
            String(prior.session_id) !== String(sessionId) ||
            prior.stake !== amount ||
            prior.case_number !== caseNumber
          ) {
            throw fail(409, "Request key already used.");
          }

          return {
            success: true,
            duplicate: true,
            entryId: String(prior.id),
          };
        }

        const session = await getSession(client, sessionId);

        if (!session || session.settled) {
          throw fail(409, "This game has finished.");
        }

        const wallet = (
          await client.query(
            `SELECT status,demo_coin_balance
             FROM customers
             WHERE id=$1
             FOR UPDATE`,
            [req.dealCustomerId],
          )
        ).rows[0];

        if (!wallet || wallet.status !== "ACTIVE") {
          throw fail(403, "Customer is inactive.");
        }

        const existing = (
          await client.query(
            `SELECT id
             FROM tsb_deal_entries
             WHERE session_id=$1
               AND customer_id=$2
               AND status<>'CANCELLED'`,
            [session.id, req.dealCustomerId],
          )
        ).rows[0];

        if (existing) {
          throw fail(409, "You already joined this game.");
        }

        const count = Number((
          await client.query(
            `SELECT COUNT(*) AS count
             FROM tsb_deal_entries
             WHERE session_id=$1 AND customer_id=$2`,
            [session.id, req.dealCustomerId],
          )
        ).rows[0].count);

        if (count >= 100) {
          throw fail(400, "Maximum 100 entry requests per game.");
        }

        const now = await nowAt(client);
        const stage = phaseAt(session, now);

        if (stage.level !== 1 || stage.phase !== "BETTING") {
          throw fail(409, "Join during level 1 betting.");
        }

        if (Number(wallet.demo_coin_balance) < amount) {
          throw fail(400, "Insufficient demo coins.");
        }

        const entry = (
          await client.query(
            `INSERT INTO tsb_deal_entries(
               session_id,customer_id,stake,request_key
             )
             VALUES($1,$2,$3,$4)
             RETURNING *`,
            [session.id, req.dealCustomerId, amount, requestKey],
          )
        ).rows[0];

        await client.query(
          `INSERT INTO tsb_deal_choices(
             entry_id,level,case_number
           )
           VALUES($1,1,$2)`,
          [entry.id, caseNumber],
        );

        await client.query(
          `UPDATE customers
           SET demo_coin_balance=demo_coin_balance-$1,
               updated_at=NOW()
           WHERE id=$2`,
          [amount, req.dealCustomerId],
        );

        await client.query(
          `INSERT INTO demo_coin_transactions(
             customer_id,amount,transaction_type,note
           )
           VALUES($1,$2,'DEAL_STAKE',$3)`,
          [
            req.dealCustomerId,
            -amount,
            `Deal #${session.id}; case ${caseNumber}`,
          ],
        );

        return {
          success: true,
          entryId: String(entry.id),
        };
      });

      res.json(result);
    }),
  );

  app.post(
    "/api/deal-or-no-deal/entries/:id/action",
    customer,
    wrap(async (req, res) => {
      const entryId = req.params.id;
      const { action, level, caseNumber } = req.body || {};

      if (
        !validId(entryId) ||
        !["CANCEL", "COLLECT", "DEAL", "CONTINUE"].includes(action) ||
        !Number.isInteger(level) ||
        level < 1 ||
        level > DEAL_MAX_LEVEL
      ) {
        throw fail(400, "Invalid entry action.");
      }

      if (action === "CONTINUE" && !validDealCase(caseNumber)) {
        throw fail(400, "Choose a case from 1 to 9.");
      }

      const result = await transaction(pool, async client => {
        await advance(client);

        const entry = (
          await client.query(
            `SELECT *
             FROM tsb_deal_entries
             WHERE id=$1 AND customer_id=$2
             FOR UPDATE`,
            [entryId, req.dealCustomerId],
          )
        ).rows[0];

        if (!entry) {
          throw fail(404, "Entry not found.");
        }

        const session = await getSession(client, entry.session_id);

        const wallet = (
          await client.query(
            "SELECT status FROM customers WHERE id=$1 FOR UPDATE",
            [req.dealCustomerId],
          )
        ).rows[0];

        if (!wallet || wallet.status !== "ACTIVE") {
          throw fail(403, "Customer is inactive.");
        }

        const now = await nowAt(client);

        if (action === "CANCEL") {
          if (level !== 1) {
            throw fail(400, "Only the initial stake can be cancelled.");
          }

          if (entry.status === "CANCELLED") {
            return { success: true, duplicate: true };
          }

          if (
            entry.status !== "PLAYING" ||
            entry.completed_level !== 0 ||
            now >= levelTimes(session, 1).closesAt
          ) {
            throw fail(409, "This entry can no longer be cancelled.");
          }

          await credit(
            client,
            entry,
            entry.stake,
            "DEAL_REFUND",
            `Deal #${session.id}; cancelled entry #${entry.id}`,
          );

          await client.query(
            `UPDATE tsb_deal_entries
             SET status='CANCELLED',
                 payout=stake,
                 updated_at=NOW()
             WHERE id=$1`,
            [entry.id],
          );

          return { success: true };
        }

        if (action === "CONTINUE") {
          const prior = (
            await client.query(
              `SELECT case_number
               FROM tsb_deal_choices
               WHERE entry_id=$1 AND level=$2`,
              [entry.id, level],
            )
          ).rows[0];

          if (prior) {
            if (prior.case_number !== caseNumber) {
              throw fail(
                409,
                "This level already has a different selected case.",
              );
            }

            return { success: true, duplicate: true };
          }

          const stage = phaseAt(session, now);

          if (
            entry.status !== "WON" ||
            level !== entry.completed_level + 1 ||
            stage.level !== level ||
            stage.phase !== "BETTING"
          ) {
            throw fail(409, "Continuation is not available now.");
          }

          await client.query(
            `INSERT INTO tsb_deal_choices(
               entry_id,level,case_number
             )
             VALUES($1,$2,$3)`,
            [entry.id, level, caseNumber],
          );

          await client.query(
            `UPDATE tsb_deal_entries
             SET status='PLAYING',updated_at=NOW()
             WHERE id=$1`,
            [entry.id],
          );

          return { success: true };
        }

        if (entry.status === "COLLECTED") {
          return {
            success: true,
            duplicate: true,
            payout: Number(entry.payout),
          };
        }

        if (
          entry.status !== "WON" ||
          level !== entry.completed_level
        ) {
          throw fail(409, "There are no available winnings to collect.");
        }

        let amount = dealCollectAmount(entry.stake, level);

        if (action === "DEAL") {
          const offer = offerFor(entry, session);
          const deadline =
            levelTimes(session, level + 1).closesAt -
            DEAL_TIMING.offerCutoffMs;

          if (offer === null || now >= deadline) {
            throw fail(409, "Banker's Offer has expired.");
          }

          amount = offer;
        }

        await collectEntry(
          client,
          entry,
          amount,
          action === "DEAL" ? "Banker's Offer accepted" : "Collect",
        );

        return {
          success: true,
          payout: amount,
        };
      });

      res.json(result);
    }),
  );

  return function startDealOrNoDeal() {
    let busy = false;

    const tick = async () => {
      if (busy) return;
      busy = true;

      try {
        await transaction(pool, advance);
      } catch (error) {
        console.error(
          "Deal or No Deal update failed:",
          error.message,
        );
      } finally {
        busy = false;
      }
    };

    void tick();

    const timer = setInterval(tick, 500);
    timer.unref?.();

    return () => clearInterval(timer);
  };
}
