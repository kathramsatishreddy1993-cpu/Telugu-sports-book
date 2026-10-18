import { randomBytes, createHash } from 'node:crypto';
import {
  requireControllerAccount,
  verifyControllerForMutation,
} from './controllerAccounts.js';

const LOCK = 746219;
export const GROWTH_RATE = 0.085;
const digest = (value) =>
  createHash('sha256').update(String(value)).digest('hex');
const demoEnabled = () =>
  String(process.env.SPORTS_API_MODE || 'demo')
    .trim()
    .toLowerCase() === 'demo';
const cookieValue = (req, name) =>
  String(req.headers.cookie || '')
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${name}=`))
    ?.slice(name.length + 1) || '';
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
const fail = (status, message) =>
  Object.assign(new Error(message), { status });
const positiveId = (value) => /^\d{1,18}$/.test(String(value || ''));
const betView = (b) =>
  b
    ? {
        id: String(b.id),
        roundId: String(b.round_id),
        slot: Number(b.bet_slot || 1),
        stake: b.stake,
        status: b.status,
        payout: b.payout,
        cashoutMultiplier: b.cashout_hundredths
          ? b.cashout_hundredths / 100
          : null,
        createdAt: b.created_at,
      }
    : null;

export function flightMultiplier(startMs, nowMs) {
  return Math.max(
    100,
    Math.floor(
      Math.exp((GROWTH_RATE * Math.max(0, nowMs - startMs)) / 1000) * 100,
    ),
  );
}
export function flightCommitment(id, hundredths, seed) {
  return digest(`${id}:${hundredths}:${seed}`);
}
export function roundView(round, now) {
  if (!round) return null;
  const start = new Date(round.starts_at).getTime();
  const crash = new Date(round.crashes_at).getTime();
  const phase =
    round.status === 'CRASHED' || now >= crash
      ? 'CRASHED'
      : now < start
        ? 'COUNTDOWN'
        : 'RUNNING';
  return {
    id: String(round.id),
    phase,
    startsAt: round.starts_at,
    serverTime: new Date(now).toISOString(),
    commitment: round.commitment,
    multiplier:
      phase === 'COUNTDOWN'
        ? 1
        : phase === 'CRASHED'
          ? round.crash_hundredths / 100
          : Math.min(
              flightMultiplier(start, now),
              round.crash_hundredths,
            ) / 100,
    crashMultiplier:
      phase === 'CRASHED' ? round.crash_hundredths / 100 : null,
    seed: phase === 'CRASHED' ? round.seed : null,
    mode: 'ADMIN_CONTROLLED_DEMO',
  };
}

export async function initializeFlight(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tsb_flight_controller_sessions (
      token_hash TEXT PRIMARY KEY, controller_id TEXT NOT NULL,
      credential_fingerprint TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tsb_flight_rounds (
      id BIGSERIAL PRIMARY KEY,
      crash_hundredths INTEGER NOT NULL CHECK (crash_hundredths BETWEEN 100 AND 100000),
      seed TEXT NOT NULL, commitment TEXT NOT NULL,
      controller_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'LOCKED',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      starts_at TIMESTAMPTZ NOT NULL, crashes_at TIMESTAMPTZ NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS tsb_flight_one_active_round
      ON tsb_flight_rounds ((1)) WHERE status='LOCKED';
    CREATE TABLE IF NOT EXISTS tsb_flight_bets (
      id BIGSERIAL PRIMARY KEY,
      round_id BIGINT NOT NULL REFERENCES tsb_flight_rounds(id),
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      request_key VARCHAR(100) NOT NULL, stake INTEGER NOT NULL CHECK (stake BETWEEN 100 AND 25000),
      status TEXT NOT NULL DEFAULT 'PLACED', payout INTEGER NOT NULL DEFAULT 0,
      cashout_hundredths INTEGER, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), settled_at TIMESTAMPTZ,
      UNIQUE(customer_id, request_key), UNIQUE(round_id,customer_id)
    );
    CREATE INDEX IF NOT EXISTS tsb_flight_customer_history ON tsb_flight_bets(customer_id,id DESC);
    CREATE OR REPLACE FUNCTION tsb_flight_protect_locked_round() RETURNS trigger AS $$
    BEGIN
      IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Flight round history cannot be deleted';
      END IF;
      IF NEW.crash_hundredths IS DISTINCT FROM OLD.crash_hundredths
        OR NEW.seed IS DISTINCT FROM OLD.seed
        OR NEW.commitment IS DISTINCT FROM OLD.commitment
        OR NEW.starts_at IS DISTINCT FROM OLD.starts_at
        OR NEW.crashes_at IS DISTINCT FROM OLD.crashes_at
        OR NEW.controller_id IS DISTINCT FROM OLD.controller_id THEN
        RAISE EXCEPTION 'Flight round is locked';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    DROP TRIGGER IF EXISTS tsb_flight_lock_guard ON tsb_flight_rounds;
    CREATE TRIGGER tsb_flight_lock_guard BEFORE UPDATE OR DELETE ON tsb_flight_rounds
      FOR EACH ROW EXECUTE FUNCTION tsb_flight_protect_locked_round();
  `);
  await pool.query(`
    ALTER TABLE tsb_flight_bets ADD COLUMN IF NOT EXISTS bet_slot SMALLINT NOT NULL DEFAULT 1;
    ALTER TABLE tsb_flight_bets DROP CONSTRAINT IF EXISTS tsb_flight_bets_round_id_customer_id_key;
    ALTER TABLE tsb_flight_bets DROP CONSTRAINT IF EXISTS tsb_flight_bets_stake_check;
    ALTER TABLE tsb_flight_bets ADD CONSTRAINT tsb_flight_bets_stake_check CHECK(stake BETWEEN 10 AND 25000);
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='tsb_flight_bets'::regclass AND conname='tsb_flight_bet_slot_check') THEN
        ALTER TABLE tsb_flight_bets ADD CONSTRAINT tsb_flight_bet_slot_check CHECK(bet_slot IN (1,2));
      END IF;
    END $$;
    CREATE UNIQUE INDEX IF NOT EXISTS tsb_flight_customer_round_slot
      ON tsb_flight_bets(round_id,customer_id,bet_slot);
  `);

}

async function serverNow(client) {
  const r = await client.query('SELECT clock_timestamp() AS now', []);
  return new Date(r.rows[0].now).getTime();
}
async function expireRound(client) {
  // Same transaction-wide lock order for placement, cashout and new rounds.
  await client.query('SELECT pg_advisory_xact_lock($1)', [LOCK]);
  const expired = await client.query(
    `UPDATE tsb_flight_rounds SET status='CRASHED'
    WHERE status='LOCKED' AND crashes_at<=clock_timestamp() RETURNING id`,
    [],
  );
  for (const round of expired.rows) {
    await client.query(
      `UPDATE tsb_flight_bets SET status='LOST',settled_at=NOW()
      WHERE round_id=$1 AND status='PLACED'`,
      [round.id],
    );
  }
}
async function transaction(pool, fn) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const result = await fn(c);
    await c.query('COMMIT');
    return result;
  } catch (error) {
    await c.query('ROLLBACK');
    throw error;
  } finally {
    c.release();
  }
}
export function registerFlightRoutes(app, pool) {
  const onlyDemo = (req, res, next) =>
    demoEnabled()
      ? next()
      : res.status(409).json({
          error:
            'TSB Flight is a demo-only game. Enable SPORTS_API_MODE=demo.',
        });
  const customer = wrap(async (req, res, next) => {
    const token = cookieValue(req, 'tsb_demo_session');
    if (!/^[a-f0-9]{64}$/.test(token))
      throw fail(
        401,
        'Please logout and login with your customer ID to play.',
      );
    const r = await pool.query(
      `SELECT c.id,c.name,c.status FROM demo_customer_sessions s
      JOIN customers c ON c.id=s.customer_id WHERE token_hash=$1 AND expires_at>NOW()`,
      [digest(token)],
    );
    if (!r.rows[0] || r.rows[0].status !== 'ACTIVE')
      throw fail(401, 'Customer session expired. Please login again.');
    req.flightCustomer = r.rows[0];
    next();
  });
  const controller = requireControllerAccount(pool, true);
  const controllerSession = requireControllerAccount(pool, false);
  app.use('/api/flight', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use('/api/game-control', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  async function state(isController, customerId) {
    return transaction(pool, async (c) => {
      await expireRound(c);
      const latest = await c.query(
        'SELECT * FROM tsb_flight_rounds ORDER BY id DESC LIMIT 1',
        [],
      );
      const now = await serverNow(c);
      const history = await c.query(
        "SELECT * FROM tsb_flight_rounds WHERE status='CRASHED' ORDER BY id DESC LIMIT 20",
        [],
      );
      const data = {
        success: true,
        serverTime: new Date(now).toISOString(),
        growthRate: GROWTH_RATE,
        round: roundView(latest.rows[0], now),
        history: history.rows.map((r) => roundView(r, now)),
      };
      if (isController) {
        // Available to authenticated controller after locking; never to customers before crash.
        data.lockedMultiplier =
          latest.rows[0]?.status === 'LOCKED'
            ? latest.rows[0].crash_hundredths / 100
            : null;
      } else {
        const balance = await c.query(
          'SELECT demo_coin_balance FROM customers WHERE id=$1',
          [customerId],
        );
        const bets = await c.query(
          'SELECT * FROM tsb_flight_bets WHERE customer_id=$1 ORDER BY id DESC LIMIT 50',
          [customerId],
        );
        data.customerId = customerId;
        data.balance = Number(balance.rows[0].demo_coin_balance);
        data.bets = bets.rows.map(betView);
      }
      return data;
    });
  }
  app.get(
    '/api/game-control/state',
    controllerSession,
    onlyDemo,
    wrap(async (req, res) => {
      const account = req.controllerAccount;
      if (account.must_change_password)
        return res.json({
          success: true,
          controllerId: account.login_id,
          controllerName: account.name,
          mustChangePassword: true,
          round: null,
          history: [],
        });
      res.json({
        ...(await state(true)),
        controllerId: account.login_id,
        controllerName: account.name,
        mustChangePassword: false,
      });
    }),
  );
  app.get(
    '/api/flight/state',
    customer,
    onlyDemo,
    wrap(async (req, res) =>
      res.json(await state(false, req.flightCustomer.id)),
    ),
  );

  app.post(
    '/api/game-control/flight/rounds',
    controller,
    onlyDemo,
    wrap(async (req, res) => {
      const text = String(req.body?.multiplier || '');
      if (
        !/^\d{1,4}(\.\d{1,2})?$/.test(text) ||
        Number(text) < 1 ||
        Number(text) > 1000
      )
        throw fail(
          400,
          'Enter a multiplier from 1.00 to 1000.00 (up to two decimals).',
        );
      const hundredths = Math.round(Number(text) * 100);
      const data = await transaction(pool, async (c) => {
        await verifyControllerForMutation(c, req.controllerAccount);
        await expireRound(c);
        const active = await c.query(
          "SELECT id FROM tsb_flight_rounds WHERE status='LOCKED'",
          [],
        );
        if (active.rows.length)
          throw fail(
            409,
            'A locked countdown or running round already exists. It cannot be changed.',
          );
        const now = await serverNow(c);
        const start = now + 10000;
        const crash =
          start +
          Math.ceil((Math.log(hundredths / 100) / GROWTH_RATE) * 1000);
        const sequence = await c.query(
          "SELECT nextval(pg_get_serial_sequence('tsb_flight_rounds','id')) AS id",
          [],
        );
        const id = String(sequence.rows[0].id),
          seed = randomBytes(32).toString('hex');
        const commitment = flightCommitment(id, hundredths, seed);
        const r = await c.query(
          `INSERT INTO tsb_flight_rounds(id,crash_hundredths,seed,commitment,controller_id,starts_at,crashes_at)
        VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
          [
            id,
            hundredths,
            seed,
            commitment,
            req.controllerId,
            new Date(start),
            new Date(crash),
          ],
        );
        return {
          success: true,
          round: roundView(r.rows[0], now),
          lockedMultiplier: hundredths / 100,
        };
      });
      res.status(201).json(data);
    }),
  );

  app.post(
    '/api/flight/bets',
    customer,
    onlyDemo,
    wrap(async (req, res) => {
      const amount = Number(req.body?.stake),
        roundId = String(req.body?.roundId || ''),
        key = String(req.body?.requestKey || ''),
        slot = req.body?.slot === undefined ? 1 : Number(req.body.slot);
      if (
        !positiveId(roundId) ||
        !Number.isSafeInteger(amount) ||
        amount < 10 ||
        ![1, 2].includes(slot) ||
        amount > 25000 ||
        !/^[a-zA-Z0-9_-]{16,100}$/.test(key)
      )
        throw fail(
          400,
          'Valid round, request key and 10–25,000 whole demo coins and slot 1 or 2 are required.',
        );
      const data = await transaction(pool, async (c) => {
        await expireRound(c);
        const r = await c.query(
          'SELECT * FROM tsb_flight_rounds WHERE id=$1 FOR UPDATE',
          [roundId],
        );
        const wallet = await c.query(
          'SELECT status,demo_coin_balance FROM customers WHERE id=$1 FOR UPDATE',
          [req.flightCustomer.id],
        );
        if (wallet.rows[0]?.status !== 'ACTIVE')
          throw fail(403, 'Customer account is inactive.');
        const old = await c.query(
          'SELECT * FROM tsb_flight_bets WHERE customer_id=$1 AND request_key=$2',
          [req.flightCustomer.id, key],
        );
        if (old.rows[0]) {
          if (
            String(old.rows[0].round_id) !== roundId ||
            old.rows[0].stake !== amount ||
            Number(old.rows[0].bet_slot) !== slot
          )
            throw fail(409, 'Request key belongs to another bet.');
          return {
            success: true,
            replayed: true,
            bet: betView(old.rows[0]),
            balance: Number(wallet.rows[0].demo_coin_balance),
          };
        }
        const now = await serverNow(c),
          round = r.rows[0];
        if (
          !round ||
          round.status !== 'LOCKED' ||
          now >= new Date(round.starts_at).getTime()
        )
          throw fail(409, 'Betting is closed for this round.');
        const existing = await c.query(
          'SELECT id FROM tsb_flight_bets WHERE round_id=$1 AND customer_id=$2 AND bet_slot=$3',
          [roundId, req.flightCustomer.id, slot],
        );
        if (existing.rows.length)
          throw fail(409, 'This bet box already has a bet for this round.');
        const balance = Number(wallet.rows[0].demo_coin_balance) - amount;
        if (balance < 0) throw fail(400, 'Insufficient demo coins.');
        const saved = await c.query(
          'INSERT INTO tsb_flight_bets(round_id,customer_id,request_key,stake,bet_slot) VALUES($1,$2,$3,$4,$5) RETURNING *',
          [roundId, req.flightCustomer.id, key, amount, slot],
        );
        await c.query(
          'UPDATE customers SET demo_coin_balance=$1,updated_at=NOW() WHERE id=$2',
          [balance, req.flightCustomer.id],
        );
        await c.query(
          `INSERT INTO demo_coin_transactions(customer_id,amount,transaction_type,note) VALUES($1,$2,'FLIGHT_STAKE',$3)`,
          [
            req.flightCustomer.id,
            -amount,
            `TSB Flight round #${roundId}, bet #${saved.rows[0].id}`,
          ],
        );
        return { success: true, bet: betView(saved.rows[0]), balance };
      });
      res.json(data);
    }),
  );
  app.post(
    '/api/flight/bets/:id/cashout',
    customer,
    onlyDemo,
    wrap(async (req, res) => {
      if (!positiveId(req.params.id)) throw fail(400, 'Invalid bet ID.');
      const data = await transaction(pool, async (c) => {
        await expireRound(c);
        const result = await c.query(
          `SELECT b.*,r.starts_at,r.crashes_at,r.crash_hundredths,r.status AS round_status
        FROM tsb_flight_bets b JOIN tsb_flight_rounds r ON r.id=b.round_id WHERE b.id=$1 AND b.customer_id=$2 FOR UPDATE OF b,r`,
          [req.params.id, req.flightCustomer.id],
        );
        const b = result.rows[0];
        if (!b) throw fail(404, 'Bet not found.');
        const wallet = await c.query(
          'SELECT status,demo_coin_balance FROM customers WHERE id=$1 FOR UPDATE',
          [req.flightCustomer.id],
        );
        if (wallet.rows[0]?.status !== 'ACTIVE')
          throw fail(403, 'Customer account is inactive.');
        if (b.status === 'CASHED_OUT')
          return {
            success: true,
            replayed: true,
            bet: betView(b),
            balance: Number(wallet.rows[0].demo_coin_balance),
          };
        const now = await serverNow(c),
          start = new Date(b.starts_at).getTime();
        if (
          b.status !== 'PLACED' ||
          b.round_status !== 'LOCKED' ||
          now >= new Date(b.crashes_at).getTime()
        )
          throw fail(409, 'Round has crashed. Cash out is closed.');
        if (now < start)
          throw fail(409, 'Cash out opens after the flight starts.');
        const hundredths = Math.min(
          flightMultiplier(start, now),
          b.crash_hundredths - 1,
        );
        const payout = Math.floor((b.stake * hundredths) / 100),
          balance = Number(wallet.rows[0].demo_coin_balance) + payout;
        if (balance > 2147483647)
          throw fail(409, 'Demo wallet balance limit reached.');
        const saved = await c.query(
          "UPDATE tsb_flight_bets SET status='CASHED_OUT',payout=$1,cashout_hundredths=$2,settled_at=NOW() WHERE id=$3 RETURNING *",
          [payout, hundredths, b.id],
        );
        await c.query(
          'UPDATE customers SET demo_coin_balance=$1,updated_at=NOW() WHERE id=$2',
          [balance, req.flightCustomer.id],
        );
        await c.query(
          `INSERT INTO demo_coin_transactions(customer_id,amount,transaction_type,note) VALUES($1,$2,'FLIGHT_PAYOUT',$3)`,
          [
            req.flightCustomer.id,
            payout,
            `TSB Flight round #${b.round_id}, bet #${b.id}, ${hundredths / 100}x (stake included)`,
          ],
        );
        return { success: true, bet: betView(saved.rows[0]), balance };
      });
      res.json(data);
    }),
  );
  let updating = false;
  const timer = setInterval(async () => {
    if (updating) return;
    updating = true;
    try {
      await transaction(pool, expireRound);
    } catch (error) {
      console.error('Flight round update failed:', error.message);
    } finally {
      updating = false;
    }
  }, 1000);
  timer.unref?.();
  return () => clearInterval(timer);
}
