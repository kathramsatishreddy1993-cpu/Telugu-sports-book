import { randomBytes, createHash } from 'node:crypto';

import {
  requireControllerAccount,
  verifyControllerForMutation,
} from './controllerAccounts.js';

const hash = value =>
  createHash('sha256').update(value).digest('hex');

const fail = (status, message) =>
  Object.assign(new Error(message), { status });

const wrap = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Demo games are independent of the live sports data provider.
const demoEnabled = () =>
  String(process.env.DEMO_GAMES_MODE ?? 'demo')
    .trim()
    .toLowerCase() === 'demo';

export const RED = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18,
  19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export function market(key) {
  let m;

  if ((m = /^N:(\d{1,2})$/.exec(key))) {
    const n = Number(m[1]);

    if (n <= 36) {
      return { numbers: [n], returns: 36 };
    }
  }

  if (key === 'RED' || key === 'BLACK') {
    return {
      numbers: Array.from(
        { length: 36 },
        (_, i) => i + 1,
      ).filter(n => RED.has(n) === (key === 'RED')),
      returns: 2,
    };
  }

  if (key === 'ODD' || key === 'EVEN') {
    return {
      numbers: Array.from(
        { length: 36 },
        (_, i) => i + 1,
      ).filter(n => n % 2 === (key === 'ODD' ? 1 : 0)),
      returns: 2,
    };
  }

  if (key === 'LOW' || key === 'HIGH') {
    return {
      numbers: Array.from(
        { length: 18 },
        (_, i) => i + (key === 'LOW' ? 1 : 19),
      ),
      returns: 2,
    };
  }

  if ((m = /^D:([123])$/.exec(key))) {
    return {
      numbers: Array.from(
        { length: 12 },
        (_, i) => i + 1 + (Number(m[1]) - 1) * 12,
      ),
      returns: 3,
    };
  }

  if ((m = /^C:([123])$/.exec(key))) {
    return {
      numbers: Array.from(
        { length: 12 },
        (_, i) => i * 3 + Number(m[1]),
      ),
      returns: 3,
    };
  }

  if ((m = /^S:(\d{1,2}):(\d{1,2})$/.exec(key))) {
    const a = Number(m[1]);
    const b = Number(m[2]);

    const adjacent =
      (a === 0 && b <= 3) ||
      (
        a > 0 &&
        (
          b - a === 3 ||
          (
            b - a === 1 &&
            Math.floor((a - 1) / 3) ===
              Math.floor((b - 1) / 3)
          )
        )
      );

    if (a >= 0 && b <= 36 && a < b && adjacent) {
      return {
        numbers: [a, b],
        returns: 18,
      };
    }
  }

  if ((m = /^T:(\d{1,2})$/.exec(key))) {
    const a = Number(m[1]);

    if (a >= 1 && a <= 34 && a % 3 === 1) {
      return {
        numbers: [a, a + 1, a + 2],
        returns: 12,
      };
    }
  }

  if ((m = /^K:(\d{1,2})$/.exec(key))) {
    const a = Number(m[1]);

    if (a >= 1 && a <= 32 && a % 3 !== 0) {
      return {
        numbers: [a, a + 1, a + 3, a + 4],
        returns: 9,
      };
    }
  }

  if ((m = /^L:(\d{1,2})$/.exec(key))) {
    const a = Number(m[1]);

    if (a >= 1 && a <= 31 && a % 3 === 1) {
      return {
        numbers: Array.from(
          { length: 6 },
          (_, i) => a + i,
        ),
        returns: 6,
      };
    }
  }

  throw fail(400, 'Invalid betting field.');
}

export function validateBets(value) {
  if (
    !value ||
    Array.isArray(value) ||
    typeof value !== 'object' ||
    Object.keys(value).length > 160
  ) {
    throw fail(400, 'Invalid bets.');
  }

  let total = 0;
  const bets = {};

  for (const [key, amount] of Object.entries(value)) {
    market(key);

    if (
      !Number.isSafeInteger(amount) ||
      amount < 10 ||
      amount > 25000
    ) {
      throw fail(
        400,
        'Each field must contain 10–25,000 whole demo coins.',
      );
    }

    total += amount;
    bets[key] = amount;
  }

  if (total > 100000) {
    throw fail(
      400,
      'Maximum total is 100,000 demo coins per round.',
    );
  }

  return { bets, total };
}

export function payout(bets, number) {
  return Object.entries(bets).reduce(
    (sum, [key, amount]) => {
      const selected = market(key);

      return (
        sum +
        (
          selected.numbers.includes(number)
            ? amount * selected.returns
            : 0
        )
      );
    },
    0,
  );
}

export async function initializeRoulette(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tsb_roulette_rounds (
      id BIGSERIAL PRIMARY KEY,
      number INTEGER NOT NULL
        CHECK(number BETWEEN 0 AND 36),
      seed TEXT NOT NULL,
      commitment TEXT NOT NULL,
      controller_id TEXT NOT NULL,
      closes_at TIMESTAMPTZ NOT NULL,
      reveals_at TIMESTAMPTZ NOT NULL,
      status TEXT NOT NULL DEFAULT 'LOCKED'
        CHECK(status IN ('LOCKED','SETTLED')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS tsb_roulette_active
      ON tsb_roulette_rounds((1))
      WHERE status='LOCKED';

    CREATE TABLE IF NOT EXISTS tsb_roulette_bets (
      round_id BIGINT REFERENCES tsb_roulette_rounds(id),
      customer_id INTEGER REFERENCES customers(id),
      bets JSONB NOT NULL,
      total INTEGER NOT NULL,
      payout INTEGER NOT NULL DEFAULT 0,
      revision INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'PLACED',
      PRIMARY KEY(round_id,customer_id)
    );

    CREATE TABLE IF NOT EXISTS tsb_roulette_requests (
      customer_id INTEGER REFERENCES customers(id),
      request_key TEXT NOT NULL,
      payload TEXT NOT NULL,
      response JSONB NOT NULL,
      PRIMARY KEY(customer_id,request_key)
    );

    CREATE OR REPLACE FUNCTION tsb_roulette_protect()
      RETURNS trigger AS $$
    BEGIN
      IF TG_OP='DELETE' THEN
        RAISE EXCEPTION
          'Locked roulette history cannot be deleted';
      END IF;

      IF NEW.number IS DISTINCT FROM OLD.number
        OR NEW.seed IS DISTINCT FROM OLD.seed
        OR NEW.commitment IS DISTINCT FROM OLD.commitment
        OR NEW.closes_at IS DISTINCT FROM OLD.closes_at
        OR NEW.reveals_at IS DISTINCT FROM OLD.reveals_at
        OR NEW.controller_id IS DISTINCT FROM OLD.controller_id
        OR NEW.id IS DISTINCT FROM OLD.id
        OR (
          OLD.status='SETTLED'
          AND NEW.status IS DISTINCT FROM OLD.status
        )
      THEN
        RAISE EXCEPTION
          'Locked roulette result cannot be changed';
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS tsb_roulette_immutable
      ON tsb_roulette_rounds;

    CREATE TRIGGER tsb_roulette_immutable
      BEFORE UPDATE OR DELETE ON tsb_roulette_rounds
      FOR EACH ROW
      EXECUTE FUNCTION tsb_roulette_protect();
  `);
}

async function tx(pool, fn) {
  const connection = await pool.connect();

  try {
    await connection.query('BEGIN');

    await connection.query(
      'SELECT pg_advisory_xact_lock(746220)',
    );

    const result = await fn(connection);

    await connection.query('COMMIT');

    return result;
  } catch (error) {
    await connection.query('ROLLBACK');
    throw error;
  } finally {
    connection.release();
  }
}

async function now(connection) {
  const result = await connection.query(
    'SELECT clock_timestamp() AS now',
    [],
  );

  return new Date(result.rows[0].now).getTime();
}

async function settle(connection) {
  const time = await now(connection);

  const rounds = (
    await connection.query(
      `SELECT *
       FROM tsb_roulette_rounds
       WHERE status='LOCKED' AND reveals_at<=$1
       FOR UPDATE`,
      [new Date(time)],
    )
  ).rows;

  for (const round of rounds) {
    const entries = (
      await connection.query(
        `SELECT *
         FROM tsb_roulette_bets
         WHERE round_id=$1 AND status='PLACED'
         ORDER BY customer_id
         FOR UPDATE`,
        [round.id],
      )
    ).rows;

    for (const entry of entries) {
      const win = payout(entry.bets, round.number);

      if (win) {
        await connection.query(
          `UPDATE customers
           SET demo_coin_balance=demo_coin_balance+$1,
               updated_at=NOW()
           WHERE id=$2`,
          [win, entry.customer_id],
        );

        await connection.query(
          `INSERT INTO demo_coin_transactions(
            customer_id,
            amount,
            transaction_type,
            note
          )
          VALUES($1,$2,'ROULETTE_RETURN',$3)`,
          [
            entry.customer_id,
            win,
            `Roulette #${round.id}; result ${round.number}; stake included`,
          ],
        );
      }

      await connection.query(
        `UPDATE tsb_roulette_bets
         SET status='SETTLED',payout=$1
         WHERE round_id=$2 AND customer_id=$3`,
        [win, round.id, entry.customer_id],
      );
    }

    await connection.query(
      `UPDATE tsb_roulette_rounds
       SET status='SETTLED'
       WHERE id=$1`,
      [round.id],
    );
  }
}

function view(round, time, controller = false) {
  if (!round) return null;

  const done = round.status === 'SETTLED';

  const bettingClosed =
    time >= new Date(round.closes_at).getTime();

  return {
    id: String(round.id),

    phase: done
      ? 'RESULT'
      : bettingClosed
        ? 'SPINNING'
        : 'BETTING',

    closesAt: round.closes_at,
    revealsAt: round.reveals_at,
    commitment: round.commitment,

    // Animation target is available only after betting closes.
    landingNumber: bettingClosed ? round.number : null,

    number: done || controller ? round.number : null,
    seed: done ? round.seed : null,
  };
}

export function registerRouletteRoutes(app, pool) {
  const controller = requireControllerAccount(
    pool,
    false,
    'ROULETTE',
  );

  const ready = requireControllerAccount(
    pool,
    true,
    'ROULETTE',
  );

  app.use(
    ['/api/roulette', '/api/game-control/roulette'],
    (req, res, next) => {
      res.set('Cache-Control', 'no-store');

      if (!demoEnabled()) {
        return res.status(409).json({
          error:
            'Roulette is a demo-only game. Enable DEMO_GAMES_MODE=demo.',
        });
      }

      next();
    },
  );

  const customer = wrap(async (req, res, next) => {
    const token =
      String(req.headers.cookie || '')
        .split(';')
        .map(value => value.trim())
        .find(value =>
          value.startsWith('tsb_demo_session='),
        )
        ?.slice(17) || '';

    if (!/^[a-f0-9]{64}$/.test(token)) {
      throw fail(401, 'Customer login required.');
    }

    const result = await pool.query(
      `SELECT c.id
       FROM demo_customer_sessions s
       JOIN customers c ON c.id=s.customer_id
       WHERE s.token_hash=$1
         AND s.expires_at>NOW()
         AND c.status='ACTIVE'`,
      [hash(token)],
    );

    if (!result.rows[0]) {
      throw fail(401, 'Customer session expired.');
    }

    req.customerId = result.rows[0].id;
    next();
  });

  async function state(customerId, account) {
    return tx(pool, async connection => {
      await settle(connection);

      const time = await now(connection);

      const round = (
        await connection.query(
          `SELECT *
           FROM tsb_roulette_rounds
           ORDER BY id DESC
           LIMIT 1`,
          [],
        )
      ).rows[0];

      const history = (
        await connection.query(
          `SELECT id,number
           FROM tsb_roulette_rounds
           WHERE status='SETTLED'
           ORDER BY id DESC
           LIMIT 20`,
          [],
        )
      ).rows;

      const result = {
        serverTime: new Date(time).toISOString(),
        round: view(round, time, Boolean(account)),
        history,
      };

      if (account) {
        Object.assign(result, {
          controllerId: account.login_id,
          controllerName: account.name,
          mustChangePassword: account.must_change_password,
        });
      }

      if (customerId) {
        result.customerId = customerId;

        const wallet = await connection.query(
          `SELECT demo_coin_balance
           FROM customers
           WHERE id=$1`,
          [customerId],
        );

        result.balance = Number(
          wallet.rows[0].demo_coin_balance,
        );

        result.entries = (
          await connection.query(
            `SELECT b.*,r.number
             FROM tsb_roulette_bets b
             JOIN tsb_roulette_rounds r
               ON r.id=b.round_id
             WHERE b.customer_id=$1
             ORDER BY b.round_id DESC
             LIMIT 30`,
            [customerId],
          )
        ).rows.map(entry => ({
          ...entry,
          number:
            entry.status === 'SETTLED'
              ? entry.number
              : null,
        }));
      }

      return result;
    });
  }

  app.get(
    '/api/game-control/roulette/state',
    controller,
    wrap(async (req, res) => {
      res.json(
        await state(null, req.controllerAccount),
      );
    }),
  );

  app.post(
    '/api/game-control/roulette/rounds',
    ready,
    wrap(async (req, res) => {
      const number = req.body?.number;

      if (
        !Number.isInteger(number) ||
        number < 0 ||
        number > 36 ||
        req.body?.confirmed !== true
      ) {
        throw fail(
          400,
          'Choose 0–36 and confirm locking before betting opens.',
        );
      }

      const result = await tx(
        pool,
        async connection => {
          await verifyControllerForMutation(
            connection,
            req.controllerAccount,
            'ROULETTE',
          );

          await settle(connection);

          const active = await connection.query(
            `SELECT id
             FROM tsb_roulette_rounds
             WHERE status='LOCKED'`,
            [],
          );

          if (active.rows.length) {
            throw fail(
              409,
              'An existing round is still active.',
            );
          }

          const time = await now(connection);
          const seed = randomBytes(32).toString('hex');
          const commitment = hash(`${number}:${seed}`);

          const round = (
            await connection.query(
              `INSERT INTO tsb_roulette_rounds(
                number,
                seed,
                commitment,
                controller_id,
                closes_at,
                reveals_at
              )
              VALUES($1,$2,$3,$4,$5,$6)
              RETURNING *`,
              [
                number,
                seed,
                commitment,
                req.controllerId,
                new Date(time + 30000),
                new Date(time + 45000),
              ],
            )
          ).rows[0];

          return {
            round: view(round, time, true),
            serverTime: new Date(time).toISOString(),
          };
        },
      );

      res.status(201).json(result);
    }),
  );

  app.get(
    '/api/roulette/state',
    customer,
    wrap(async (req, res) => {
      res.json(await state(req.customerId));
    }),
  );

  app.post(
    '/api/roulette/bets',
    customer,
    wrap(async (req, res) => {
      const { bets, total } = validateBets(
        req.body?.bets,
      );

      const id = String(req.body?.roundId || '');
      const key = String(req.body?.requestKey || '');
      const revision = req.body?.revision;

      if (
        !/^\d{1,18}$/.test(id) ||
        !/^[a-zA-Z0-9_-]{16,100}$/.test(key) ||
        !Number.isInteger(revision) ||
        revision < 0
      ) {
        throw fail(
          400,
          'Invalid round, revision or request key.',
        );
      }

      const payload = JSON.stringify({
        id,
        revision,
        bets: Object.fromEntries(
          Object.entries(bets).sort(),
        ),
      });

      const result = await tx(
        pool,
        async connection => {
          await settle(connection);

          const wallet = (
            await connection.query(
              `SELECT demo_coin_balance,status
               FROM customers
               WHERE id=$1
               FOR UPDATE`,
              [req.customerId],
            )
          ).rows[0];

          if (wallet?.status !== 'ACTIVE') {
            throw fail(403, 'Customer is inactive.');
          }

          const prior = (
            await connection.query(
              `SELECT *
               FROM tsb_roulette_requests
               WHERE customer_id=$1 AND request_key=$2`,
              [req.customerId, key],
            )
          ).rows[0];

          if (prior) {
            if (prior.payload !== payload) {
              throw fail(
                409,
                'Request key already used.',
              );
            }

            return prior.response;
          }

          const round = (
            await connection.query(
              `SELECT *
               FROM tsb_roulette_rounds
               WHERE id=$1
               FOR UPDATE`,
              [id],
            )
          ).rows[0];

          if (
            !round ||
            round.status !== 'LOCKED' ||
            (await now(connection)) >=
              new Date(round.closes_at).getTime()
          ) {
            throw fail(
              409,
              'Betting closed. Wait for next round.',
            );
          }

          const old = (
            await connection.query(
              `SELECT *
               FROM tsb_roulette_bets
               WHERE round_id=$1 AND customer_id=$2
               FOR UPDATE`,
              [id, req.customerId],
            )
          ).rows[0];

          if ((old?.revision || 0) !== revision) {
            throw fail(
              409,
              'Bets changed on another device. Refresh and try again.',
            );
          }

          const difference =
            total - (old?.total || 0);

          const balance =
            Number(wallet.demo_coin_balance) -
            difference;

          if (balance < 0) {
            throw fail(
              400,
              'Insufficient available demo coins.',
            );
          }

          await connection.query(
            `UPDATE customers
             SET demo_coin_balance=$1,
                 updated_at=NOW()
             WHERE id=$2`,
            [balance, req.customerId],
          );

          if (difference) {
            await connection.query(
              `INSERT INTO demo_coin_transactions(
                customer_id,
                amount,
                transaction_type,
                note
              )
              VALUES($1,$2,'ROULETTE_STAKE',$3)`,
              [
                req.customerId,
                -difference,
                `Roulette #${id}; stake reservation adjusted`,
              ],
            );
          }

          await connection.query(
            `INSERT INTO tsb_roulette_bets(
              round_id,
              customer_id,
              bets,
              total,
              revision
            )
            VALUES($1,$2,$3,$4,1)
            ON CONFLICT(round_id,customer_id)
            DO UPDATE SET
              bets=$3,
              total=$4,
              revision=tsb_roulette_bets.revision+1`,
            [
              id,
              req.customerId,
              JSON.stringify(bets),
              total,
            ],
          );

          const response = {
            success: true,
            bets,
            total,
            revision: revision + 1,
            balance,
          };

          await connection.query(
            `INSERT INTO tsb_roulette_requests(
              customer_id,
              request_key,
              payload,
              response
            )
            VALUES($1,$2,$3,$4)`,
            [
              req.customerId,
              key,
              payload,
              JSON.stringify(response),
            ],
          );

          return response;
        },
      );

      res.json(result);
    }),
  );
}
