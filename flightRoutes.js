import { randomBytes, randomInt, createHash } from 'node:crypto';

import { requireControllerAccount } from './controllerAccounts.js';

const LOCK = 746219;
export const GROWTH_RATE = 0.16;

const COUNTDOWN_MS = 10000;
const HOLD_MS = 3500;
const MAX_BALANCE = 2147483647;
const MODES = ['RANDOM', 'ADMIN', 'ADMIN2'];

const KEYS = {
  mode: 'flight_game_mode',
  plan1: 'flight_plan_01',
  plan2: 'flight_plan_02',
  cur1: 'flight_cursor_01',
  cur2: 'flight_cursor_02',
};

const digest = value =>
  createHash('sha256').update(String(value)).digest('hex');

const demoEnabled = () =>
  String(process.env.DEMO_GAMES_MODE ?? 'demo')
    .trim()
    .toLowerCase() === 'demo';

const cookieValue = (req, name) =>
  String(req.headers.cookie || '')
    .split(';')
    .map(value => value.trim())
    .find(value => value.startsWith(`${name}=`))
    ?.slice(name.length + 1) || '';

const wrap = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const fail = (status, message) =>
  Object.assign(new Error(message), { status });

const positiveId = value =>
  /^\d{1,18}$/.test(String(value || ''));

const betView = bet =>
  bet
    ? {
        id: String(bet.id),
        roundId: String(bet.round_id),
        slot: Number(bet.bet_slot || 1),
        stake: Number(bet.stake),
        status: bet.status,
        payout: Number(bet.payout),
        cashoutMultiplier: bet.cashout_hundredths
          ? bet.cashout_hundredths / 100
          : null,
        autoCashout: bet.auto_cashout_hundredths
          ? bet.auto_cashout_hundredths / 100
          : null,
        createdAt: bet.created_at,
      }
    : null;

export function flightMultiplier(startMs, nowMs) {
  return Math.max(
    100,
    Math.floor(
      Math.exp(
        GROWTH_RATE * Math.max(0, nowMs - startMs) / 1000,
      ) * 100,
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
      phase === 'CRASHED'
        ? round.crash_hundredths / 100
        : null,
    seed: phase === 'CRASHED' ? round.seed : null,
    mode: round.mode || 'ADMIN',
  };
}

// ---------- Plans (two independent banks of 50 multiplier boxes) ----------

export function normalizePlan(values, allowEmpty = false) {
  if (!Array.isArray(values) || values.length > 50) {
    throw new Error('Use up to 50 multiplier boxes.');
  }

  const slots = Array(50).fill(null);

  for (let index = 0; index < values.length; index++) {
    const value = values[index];

    if (value === null || value === undefined) continue;

    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      value < 1 ||
      value > 50 ||
      Math.abs(value * 100 - Math.round(value * 100)) > 0.00001
    ) {
      throw new Error(
        `Box ${index + 1}: enter 1.00–50.00, with at most two decimals.`,
      );
    }

    slots[index] = Math.round(value * 100) / 100;
  }

  if (!allowEmpty && !slots.some(value => value !== null)) {
    throw new Error('Fill at least one multiplier box for Admin Control.');
  }

  return slots;
}

async function loadSettings(db) {
  const result = await db.query(
    `SELECT setting_key,setting_value
     FROM site_settings
     WHERE setting_key = ANY($1)`,
    [Object.values(KEYS)],
  );

  return Object.fromEntries(
    result.rows.map(row => [row.setting_key, row.setting_value]),
  );
}

const saveSetting = (db, key, value) =>
  db.query(
    `INSERT INTO site_settings(setting_key,setting_value,updated_at)
     VALUES($1,$2,NOW())
     ON CONFLICT(setting_key)
     DO UPDATE SET
       setting_value=EXCLUDED.setting_value,
       updated_at=NOW()`,
    [key, String(value)],
  );

function savedPlan(settings, bank) {
  const key = bank === '02' ? KEYS.plan2 : KEYS.plan1;

  try {
    return normalizePlan(JSON.parse(settings[key] || '[]'), true);
  } catch {
    return Array(50).fill(null);
  }
}

function planEntries(settings, bank) {
  return savedPlan(settings, bank)
    .map((value, index) => ({ value, slot: index + 1 }))
    .filter(entry => entry.value !== null);
}

function nextSlot(settings, bank) {
  const entries = planEntries(settings, bank);
  if (!entries.length) return null;

  const stored = Number(
    settings[bank === '02' ? KEYS.cur2 : KEYS.cur1] || 0,
  );

  const cursor =
    Number.isSafeInteger(stored) && stored >= 0
      ? stored % entries.length
      : 0;

  return entries[cursor].slot;
}

async function takeTarget(client, bank, settings) {
  const entries = planEntries(settings, bank);

  // Defensive fallback for an empty plan.
  if (!entries.length) return { value: 2, slot: null };

  const cursorKey = bank === '02' ? KEYS.cur2 : KEYS.cur1;
  const stored = Number(settings[cursorKey] || 0);

  const cursor =
    Number.isSafeInteger(stored) && stored >= 0
      ? stored % entries.length
      : 0;

  await saveSetting(client, cursorKey, (cursor + 1) % entries.length);

  return entries[cursor];
}

function parseTarget(value) {
  if (value === undefined || value === null || value === 0) return 0;

  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 1.01 ||
    value > 49.99 ||
    Math.abs(value * 100 - Math.round(value * 100)) > 0.000001
  ) {
    throw fail(
      400,
      'Auto cash out must be 1.01–49.99x, with at most two decimals.',
    );
  }

  return Math.round(value * 100);
}

// ---------- Database ----------

export async function initializeFlight(pool) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(
      'SELECT pg_advisory_xact_lock($1)',
      [LOCK],
    );

    await client.query(`
      CREATE TABLE IF NOT EXISTS tsb_flight_controller_sessions (
        token_hash TEXT PRIMARY KEY,
        controller_id TEXT NOT NULL,
        credential_fingerprint TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tsb_flight_rounds (
        id BIGSERIAL PRIMARY KEY,
        crash_hundredths INTEGER NOT NULL
          CHECK(crash_hundredths BETWEEN 100 AND 100000),
        seed TEXT NOT NULL,
        commitment TEXT NOT NULL,
        controller_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'LOCKED',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        starts_at TIMESTAMPTZ NOT NULL,
        crashes_at TIMESTAMPTZ NOT NULL
      );

      CREATE UNIQUE INDEX IF NOT EXISTS tsb_flight_one_active_round
        ON tsb_flight_rounds ((1))
        WHERE status='LOCKED';

      CREATE TABLE IF NOT EXISTS tsb_flight_bets (
        id BIGSERIAL PRIMARY KEY,
        round_id BIGINT NOT NULL
          REFERENCES tsb_flight_rounds(id),
        customer_id INTEGER NOT NULL
          REFERENCES customers(id) ON DELETE CASCADE,
        request_key VARCHAR(100) NOT NULL,
        stake INTEGER NOT NULL
          CHECK(stake BETWEEN 10 AND 25000),
        status TEXT NOT NULL DEFAULT 'PLACED',
        payout INTEGER NOT NULL DEFAULT 0,
        cashout_hundredths INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        settled_at TIMESTAMPTZ,
        UNIQUE(customer_id,request_key)
      );

      CREATE INDEX IF NOT EXISTS tsb_flight_customer_history
        ON tsb_flight_bets(customer_id,id DESC);

      ALTER TABLE tsb_flight_bets
        ADD COLUMN IF NOT EXISTS bet_slot
        SMALLINT NOT NULL DEFAULT 1;

      ALTER TABLE tsb_flight_bets
        DROP CONSTRAINT IF EXISTS
        tsb_flight_bets_round_id_customer_id_key;

      ALTER TABLE tsb_flight_bets
        DROP CONSTRAINT IF EXISTS
        tsb_flight_bets_stake_check;

      ALTER TABLE tsb_flight_bets
        ADD CONSTRAINT tsb_flight_bets_stake_check
        CHECK(stake BETWEEN 10 AND 25000);

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conrelid='tsb_flight_bets'::regclass
            AND conname='tsb_flight_bet_slot_check'
        ) THEN
          ALTER TABLE tsb_flight_bets
            ADD CONSTRAINT tsb_flight_bet_slot_check
            CHECK(bet_slot IN (1,2));
        END IF;
      END $$;

      DROP INDEX IF EXISTS tsb_flight_customer_round_slot;

      CREATE UNIQUE INDEX IF NOT EXISTS tsb_flight_active_round_slot
        ON tsb_flight_bets(round_id,customer_id,bet_slot)
        WHERE status <> 'CANCELLED';

      CREATE OR REPLACE FUNCTION tsb_flight_protect_locked_round()
      RETURNS trigger AS $$
      BEGIN
        IF TG_OP='DELETE' THEN
          RAISE EXCEPTION
            'Flight round history cannot be deleted';
        END IF;

        IF NEW.id IS DISTINCT FROM OLD.id
          OR NEW.crash_hundredths IS DISTINCT FROM OLD.crash_hundredths
          OR NEW.seed IS DISTINCT FROM OLD.seed
          OR NEW.commitment IS DISTINCT FROM OLD.commitment
          OR NEW.starts_at IS DISTINCT FROM OLD.starts_at
          OR NEW.crashes_at IS DISTINCT FROM OLD.crashes_at
          OR NEW.controller_id IS DISTINCT FROM OLD.controller_id
          OR (
            OLD.status='CRASHED'
            AND NEW.status IS DISTINCT FROM OLD.status
          )
        THEN
          RAISE EXCEPTION 'Flight round is locked';
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS tsb_flight_lock_guard
        ON tsb_flight_rounds;

      CREATE TRIGGER tsb_flight_lock_guard
        BEFORE UPDATE OR DELETE ON tsb_flight_rounds
        FOR EACH ROW
        EXECUTE FUNCTION tsb_flight_protect_locked_round();

      -- Aviator (Super Fast Aviator game plan) additions.
      ALTER TABLE tsb_flight_rounds
        ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'ADMIN';

      ALTER TABLE tsb_flight_rounds
        ADD COLUMN IF NOT EXISTS plan_slot SMALLINT;

      ALTER TABLE tsb_flight_bets
        ADD COLUMN IF NOT EXISTS auto_cashout_hundredths
        INTEGER NOT NULL DEFAULT 0;

      CREATE TABLE IF NOT EXISTS tsb_flight_auto_plans (
        id BIGSERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL
          REFERENCES customers(id) ON DELETE CASCADE,
        bet_slot SMALLINT NOT NULL CHECK(bet_slot IN (1,2)),
        stake INTEGER NOT NULL CHECK(stake BETWEEN 10 AND 25000),
        auto_cashout_hundredths INTEGER NOT NULL DEFAULT 0,
        remaining INTEGER NOT NULL DEFAULT 0,
        enabled BOOLEAN NOT NULL DEFAULT FALSE,
        not_before_round BIGINT NOT NULL DEFAULT 0,
        last_round BIGINT NOT NULL DEFAULT 0,
        last_error TEXT NOT NULL DEFAULT '',
        UNIQUE(customer_id,bet_slot)
      );

      CREATE INDEX IF NOT EXISTS tsb_flight_auto_due
        ON tsb_flight_auto_plans(enabled,not_before_round,last_round);
    `);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function serverNow(client) {
  const result = await client.query(
    'SELECT clock_timestamp() AS now',
  );

  return new Date(result.rows[0].now).getTime();
}

async function transaction(pool, fn) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      'SELECT pg_advisory_xact_lock($1)',
      [LOCK],
    );

    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Capped at the wallet limit so one huge balance can never block the game loop.
async function creditWallet(client, customerId, amount, type, note) {
  await client.query(
    `UPDATE customers
     SET demo_coin_balance=LEAST(
           $3::BIGINT,
           demo_coin_balance::BIGINT+$1::BIGINT
         ),
         updated_at=NOW()
     WHERE id=$2`,
    [amount, customerId, MAX_BALANCE],
  );

  await client.query(
    `INSERT INTO demo_coin_transactions(
      customer_id,amount,transaction_type,note
    )
    VALUES($1,$2,$3,$4)`,
    [customerId, amount, type, note],
  );
}

// Auto cash out uses the locked target, even if a server tick is a little late.
// A target equal to the crash multiplier loses (cash out before crash).
async function autoCashouts(client, roundId, limitHundredths, crashHundredths) {
  const bets = await client.query(
    `SELECT *
     FROM tsb_flight_bets
     WHERE round_id=$1
       AND status='PLACED'
       AND auto_cashout_hundredths>=101
       AND auto_cashout_hundredths<=$2
       AND auto_cashout_hundredths<$3
     ORDER BY id
     FOR UPDATE`,
    [roundId, limitHundredths, crashHundredths],
  );

  for (const bet of bets.rows) {
    const payout = Math.floor(
      Number(bet.stake) * bet.auto_cashout_hundredths / 100,
    );

    const saved = await client.query(
      `UPDATE tsb_flight_bets
       SET status='CASHED_OUT',
           payout=$1,
           cashout_hundredths=$2,
           settled_at=NOW()
       WHERE id=$3 AND status='PLACED'
       RETURNING id`,
      [payout, bet.auto_cashout_hundredths, bet.id],
    );

    if (saved.rows[0]) {
      await creditWallet(
        client,
        bet.customer_id,
        payout,
        'FLIGHT_PAYOUT',
        `TSB Aviator round #${bet.round_id}, bet #${bet.id}, ${bet.auto_cashout_hundredths / 100}x auto cash out (stake included)`,
      );
    }
  }
}

async function expireRound(client) {
  const expired = await client.query(
    `UPDATE tsb_flight_rounds
     SET status='CRASHED'
     WHERE status='LOCKED'
       AND crashes_at<=clock_timestamp()
     RETURNING id,crash_hundredths`,
  );

  for (const round of expired.rows) {
    await autoCashouts(
      client,
      round.id,
      round.crash_hundredths,
      round.crash_hundredths,
    );

    await client.query(
      `UPDATE tsb_flight_bets
       SET status='LOST',settled_at=NOW()
       WHERE round_id=$1 AND status='PLACED'`,
      [round.id],
    );
  }
}

async function createRound(client, now) {
  const settings = await loadSettings(client);

  const mode = MODES.includes(settings[KEYS.mode])
    ? settings[KEYS.mode]
    : 'RANDOM';

  let hundredths;
  let slot = null;

  if (mode === 'RANDOM') {
    const r = randomInt(0, 1000000) / 1000000;

    const multiplier = Math.min(
      50,
      Math.max(1, Math.floor(0.97 / (1 - r) * 100) / 100),
    );

    hundredths = Math.round(multiplier * 100);
  } else {
    const target = await takeTarget(
      client,
      mode === 'ADMIN2' ? '02' : '01',
      settings,
    );

    hundredths = Math.round(target.value * 100);
    slot = target.slot;
  }

  const start = now + COUNTDOWN_MS;

  const crash =
    start +
    Math.ceil(Math.log(hundredths / 100) / GROWTH_RATE * 1000);

  const sequence = await client.query(
    `SELECT nextval(
      pg_get_serial_sequence('tsb_flight_rounds','id')
    ) AS id`,
  );

  const id = String(sequence.rows[0].id);
  const seed = randomBytes(32).toString('hex');

  const saved = await client.query(
    `INSERT INTO tsb_flight_rounds(
      id,
      crash_hundredths,
      seed,
      commitment,
      controller_id,
      starts_at,
      crashes_at,
      mode,
      plan_slot
    )
    VALUES($1,$2,$3,$4,'AUTO',$5,$6,$7,$8)
    RETURNING *`,
    [
      id,
      hundredths,
      seed,
      flightCommitment(id, hundredths, seed),
      new Date(start),
      new Date(crash),
      mode,
      slot,
    ],
  );

  return saved.rows[0];
}

async function insertBet(client, input) {
  const saved = await client.query(
    `INSERT INTO tsb_flight_bets(
      round_id,
      customer_id,
      request_key,
      stake,
      bet_slot,
      auto_cashout_hundredths
    )
    VALUES($1,$2,$3,$4,$5,$6)
    RETURNING *`,
    [
      input.roundId,
      input.customerId,
      input.requestKey,
      input.stake,
      input.slot,
      input.autoHundredths,
    ],
  );

  await client.query(
    `UPDATE customers
     SET demo_coin_balance=demo_coin_balance-$1,
         updated_at=NOW()
     WHERE id=$2`,
    [input.stake, input.customerId],
  );

  await client.query(
    `INSERT INTO demo_coin_transactions(
      customer_id,amount,transaction_type,note
    )
    VALUES($1,$2,'FLIGHT_STAKE',$3)`,
    [
      input.customerId,
      -input.stake,
      `TSB Aviator round #${input.roundId}, bet #${saved.rows[0].id}`,
    ],
  );

  return saved.rows[0];
}

// Auto bets continue for the chosen rounds. They stop when the account is
// unavailable, the balance is too low, or the customer has logged out.
async function placeAutoBets(client, round, now) {
  if (now >= new Date(round.starts_at).getTime()) return;

  const due = await client.query(
    `SELECT
       p.*,
       c.status AS customer_status,
       EXISTS(
         SELECT 1
         FROM demo_customer_sessions s
         WHERE s.customer_id=p.customer_id
           AND s.expires_at>NOW()
       ) AS has_session
     FROM tsb_flight_auto_plans p
     JOIN customers c ON c.id=p.customer_id
     WHERE p.enabled=TRUE
       AND p.not_before_round<=$1
       AND p.last_round<>$1
     ORDER BY p.id`,
    [round.id],
  );

  const stop = (plan, reason) =>
    client.query(
      `UPDATE tsb_flight_auto_plans
       SET enabled=FALSE,last_error=$1
       WHERE id=$2`,
      [reason, plan.id],
    );

  for (const plan of due.rows) {
    if (plan.remaining <= 0) {
      await stop(plan, '');
      continue;
    }

    if (!plan.has_session) {
      await stop(plan, 'Logged out');
      continue;
    }

    if (plan.customer_status !== 'ACTIVE') {
      await stop(plan, 'Account unavailable');
      continue;
    }

    const duplicate = await client.query(
      `SELECT id
       FROM tsb_flight_bets
       WHERE round_id=$1
         AND customer_id=$2
         AND bet_slot=$3
         AND status<>'CANCELLED'`,
      [round.id, plan.customer_id, plan.bet_slot],
    );

    if (duplicate.rows.length) {
      await client.query(
        'UPDATE tsb_flight_auto_plans SET last_round=$1 WHERE id=$2',
        [round.id, plan.id],
      );
      continue;
    }

    const wallet = await client.query(
      `SELECT demo_coin_balance
       FROM customers
       WHERE id=$1
       FOR UPDATE`,
      [plan.customer_id],
    );

    if (Number(wallet.rows[0].demo_coin_balance) < plan.stake) {
      await stop(plan, 'Insufficient balance');
      continue;
    }

    await insertBet(client, {
      roundId: round.id,
      customerId: plan.customer_id,
      requestKey: `auto_${round.id}_${plan.bet_slot}`,
      stake: plan.stake,
      slot: plan.bet_slot,
      autoHundredths: plan.auto_cashout_hundredths,
    });

    const left = plan.remaining - 1;

    await client.query(
      `UPDATE tsb_flight_auto_plans
       SET remaining=$1,
           enabled=$2,
           last_round=$3,
           last_error=''
       WHERE id=$4`,
      [left, left > 0, round.id, plan.id],
    );
  }
}

// One step of the game loop: settle crashes, start the next round, auto bets and auto cash outs.
async function advance(client) {
  await expireRound(client);

  const now = await serverNow(client);

  const latest = (
    await client.query(
      `SELECT *
       FROM tsb_flight_rounds
       ORDER BY id DESC
       LIMIT 1`,
    )
  ).rows[0];

  let round = latest;

  if (
    !latest ||
    (
      latest.status === 'CRASHED' &&
      now >= new Date(latest.crashes_at).getTime() + HOLD_MS
    )
  ) {
    round = await createRound(client, now);
  }

  if (round && round.status === 'LOCKED') {
    const start = new Date(round.starts_at).getTime();

    if (now < start) {
      await placeAutoBets(client, round, now);
    } else {
      await autoCashouts(
        client,
        round.id,
        flightMultiplier(start, now),
        round.crash_hundredths,
      );
    }
  }

  return round;
}

// ---------- Admin plan page (plain HTML, no build step) ----------

const PLAN_PAGE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Aviator Game Control</title>
<style>
body{margin:0;background:#f3f5f7;color:#1b252a;font-family:Arial,Helvetica,sans-serif;padding:16px}
h1{color:#781a40;font-size:22px;margin:0 0 12px}
.card{background:#fff;border:1px solid #e3e8ea;border-radius:12px;padding:16px;max-width:900px;margin:0 auto 16px}
.banner{padding:10px 14px;border:1px solid #0cb2b7;border-radius:8px;background:#e0f7f7;color:#134145;font-size:13px;line-height:1.5;margin-bottom:12px}
select,input{font:inherit;padding:10px;border:1px solid #b7c7cc;border-radius:8px;background:#fff;color:#1b252a}
select{width:100%;margin:6px 0 16px}
fieldset{border:0;padding:0;margin:16px 0}
legend{font-weight:700;margin-bottom:8px}
.grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}
.grid label{font-size:11px;color:#781a40;min-width:0}
.grid input{width:100%;box-sizing:border-box;padding:9px 3px;text-align:center;font-weight:700}
button{background:#781a40;color:#fff;border:0;border-radius:10px;padding:13px 18px;font:inherit;font-weight:700;cursor:pointer;width:100%}
.muted{color:#65747a;font-size:12px;line-height:1.5}
.err{color:#9d1648;font-size:14px;margin-top:10px}
.ok{color:#0a6f73;font-size:14px;margin-top:10px}
</style></head><body>
<div class="card">
<h1>Aviator Game Control</h1>
<div id="banner" class="banner">Loading...</div>
<p class="muted">Changes apply from the next betting countdown. The current round stays locked.</p>
<form id="f">
<label>Next Round Mode
<select id="mode">
<option value="RANDOM">Random - automatic server outcome</option>
<option value="ADMIN">Admin Control 01 - fixed multipliers</option>
<option value="ADMIN2">Admin Control 02 - fixed multipliers</option>
</select></label>
<div id="banks"></div>
<p class="muted">Save starts the selected plan at its first filled box on the next countdown. It runs in numbered order, then repeats from its first filled box. Plans 01 and 02 never switch automatically; choose another mode and Save to switch. Both plans are saved separately. Simulation balance only.</p>
<button type="submit">SAVE NEXT ROUND MODE</button>
<p id="msg"></p>
</form></div>
<script>
var NAMES={RANDOM:'Random - automatic server outcome',ADMIN:'Admin Control 01 - fixed multipliers',ADMIN2:'Admin Control 02 - fixed multipliers'};
function el(id){return document.getElementById(id);}
function api(method,body){
  return fetch('/api/admin/flight-plan',{method:method,cache:'no-store',headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined})
    .then(function(r){return r.json().then(function(j){if(!r.ok)throw new Error(j.error||'Request failed');return j;});});
}
function bankHtml(bank,plan){
  var h='<fieldset data-bank="'+bank+'"><legend>Admin Control '+bank+' - 50 multipliers (1.00-50.00x)</legend><p class="muted">Fill any boxes. Empty boxes are skipped. This plan repeats only its own filled boxes.</p><div class="grid">';
  for(var i=0;i<50;i++){
    var v=plan[i]==null?'':Number(plan[i]).toFixed(2);
    h+='<label><span>#'+(i+1)+'</span><input type="number" min="1" max="50" step="0.01" inputmode="decimal" data-bank="'+bank+'" data-i="'+i+'" value="'+v+'" placeholder="-"></label>';
  }
  return h+'</div><p class="muted" id="next'+bank+'"></p></fieldset>';
}
function showBanks(){
  var mode=el('mode').value;
  var items=document.querySelectorAll('fieldset[data-bank]');
  for(var i=0;i<items.length;i++){
    var bank=items[i].getAttribute('data-bank');
    items[i].hidden=!((bank==='01'&&mode==='ADMIN')||(bank==='02'&&mode==='ADMIN2'));
  }
}
function status(d){
  var c=d.current;
  el('banner').textContent=c?('Current round #'+c.id+': '+NAMES[c.mode]+' | '+c.phase+' | Current box: '+(c.mode!=='RANDOM'&&c.planSlot?'#'+c.planSlot:'-')):'No round yet. The first round starts automatically.';
  el('next01').textContent='Next saved box for plan 01: '+(d.next['01']?'#'+d.next['01']:'-');
  el('next02').textContent='Next saved box for plan 02: '+(d.next['02']?'#'+d.next['02']:'-');
}
function load(full){
  return api('GET').then(function(d){
    if(full){
      el('mode').value=d.configuredMode;
      el('banks').innerHTML=bankHtml('01',d.plans['01'])+bankHtml('02',d.plans['02']);
      showBanks();
    }
    status(d);
  }).catch(function(e){el('banner').textContent=e.message;});
}
el('mode').onchange=showBanks;
el('f').onsubmit=function(ev){
  ev.preventDefault();
  var plans={'01':[],'02':[]};
  var inputs=document.querySelectorAll('input[data-bank]');
  for(var i=0;i<inputs.length;i++){
    var v=inputs[i].value.trim();
    plans[inputs[i].getAttribute('data-bank')][Number(inputs[i].getAttribute('data-i'))]=v===''?null:Number(v);
  }
  el('msg').className='';el('msg').textContent='';
  api('POST',{mode:el('mode').value,plans:plans}).then(function(){
    el('msg').className='ok';el('msg').textContent='Saved. Starts from the next countdown.';
    return load(true);
  }).catch(function(e){el('msg').className='err';el('msg').textContent=e.message;});
};
load(true);
setInterval(function(){load(false);},1000);
</script></body></html>`;

// ---------- Routes ----------

export function registerFlightRoutes(app, pool) {
  const onlyDemo = (req, res, next) =>
    demoEnabled()
      ? next()
      : res.status(409).json({
          error:
            'Aviator is a demo-only game. Enable DEMO_GAMES_MODE=demo.',
        });

  const customer = wrap(async (req, res, next) => {
    const token = cookieValue(req, 'tsb_demo_session');

    if (!/^[a-f0-9]{64}$/.test(token)) {
      throw fail(
        401,
        'Please logout and login with your customer ID to play.',
      );
    }

    const result = await pool.query(
      `SELECT c.id,c.name,c.status
       FROM demo_customer_sessions s
       JOIN customers c ON c.id=s.customer_id
       WHERE s.token_hash=$1 AND s.expires_at>NOW()`,
      [digest(token)],
    );

    if (
      !result.rows[0] ||
      result.rows[0].status !== 'ACTIVE'
    ) {
      throw fail(
        401,
        'Customer session expired. Please login again.',
      );
    }

    req.flightCustomer = result.rows[0];
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

  // Read-only snapshot for customers. The game loop below does all the writing.
  async function snapshot(customerId) {
    const now = new Date(
      (await pool.query('SELECT clock_timestamp() AS now')).rows[0].now,
    ).getTime();

    const latest = (
      await pool.query(
        `SELECT *
         FROM tsb_flight_rounds
         ORDER BY id DESC
         LIMIT 1`,
      )
    ).rows[0];

    const history = await pool.query(
      `SELECT *
       FROM tsb_flight_rounds
       WHERE status='CRASHED'
       ORDER BY id DESC
       LIMIT 12`,
    );

    const wallet = await pool.query(
      `SELECT demo_coin_balance
       FROM customers
       WHERE id=$1`,
      [customerId],
    );

    if (!wallet.rows[0]) {
      throw fail(401, 'Customer account not found.');
    }

    const bets = await pool.query(
      `SELECT *
       FROM tsb_flight_bets
       WHERE customer_id=$1
       ORDER BY id DESC
       LIMIT 50`,
      [customerId],
    );

    const everyone = latest
      ? await pool.query(
          `SELECT
             b.id,
             b.customer_id,
             b.stake,
             b.status,
             b.payout,
             b.cashout_hundredths,
             c.login_id
           FROM tsb_flight_bets b
           JOIN customers c ON c.id=b.customer_id
           WHERE b.round_id=$1 AND b.status<>'CANCELLED'
           ORDER BY b.stake DESC,b.id DESC
           LIMIT 500`,
          [latest.id],
        )
      : { rows: [] };

    const plans = await pool.query(
      `SELECT
         bet_slot,
         stake,
         auto_cashout_hundredths,
         remaining,
         enabled,
         last_error
       FROM tsb_flight_auto_plans
       WHERE customer_id=$1
       ORDER BY bet_slot`,
      [customerId],
    );

    return {
      success: true,
      serverTime: new Date(now).toISOString(),
      growthRate: GROWTH_RATE,
      round: roundView(latest, now),
      history: history.rows.map(round => roundView(round, now)),
      customerId,
      balance: Number(wallet.rows[0].demo_coin_balance),
      bets: bets.rows.map(betView),

      allBets: everyone.rows.map(row => {
        const name = String(row.login_id || 'S');

        return {
          id: String(row.id),
          stake: Number(row.stake),

          status:
            row.status === 'CASHED_OUT'
              ? 'WON'
              : row.status === 'LOST'
                ? 'LOST'
                : 'ACTIVE',

          mult: row.cashout_hundredths
            ? row.cashout_hundredths / 100
            : 0,

          payout: Number(row.payout),

          username:
            (/^\d/.test(name)
              ? name.slice(0, 2)
              : name.slice(0, 1).toUpperCase()) + '****',

          avatarId:
            digest(`aviator-avatar:${row.customer_id}`)
              .slice(0, 8)
              .split('')
              .reduce((sum, ch) => sum * 16 + parseInt(ch, 16), 0) % 300,
        };
      }),

      autoPlans: plans.rows.map(plan => ({
        panel: Number(plan.bet_slot),
        stake: Number(plan.stake),
        autoCashout: plan.auto_cashout_hundredths / 100,
        remaining: Number(plan.remaining),
        enabled: Boolean(plan.enabled),
        lastError: plan.last_error || '',
      })),
    };
  }

  app.get(
    '/api/flight/state',
    customer,
    onlyDemo,
    wrap(async (req, res) => {
      res.json(await snapshot(req.flightCustomer.id));
    }),
  );

  // Game controller screen: rounds are now automatic, so it only shows status.
  app.get(
    '/api/game-control/state',
    controllerSession,
    onlyDemo,
    wrap(async (req, res) => {
      const account = req.controllerAccount;

      if (account.must_change_password) {
        return res.json({
          success: true,
          controllerId: account.login_id,
          controllerName: account.name,
          mustChangePassword: true,
          round: null,
          history: [],
        });
      }

      const data = await transaction(pool, async client => {
        await expireRound(client);

        const now = await serverNow(client);

        const latest = await client.query(
          `SELECT *
           FROM tsb_flight_rounds
           ORDER BY id DESC
           LIMIT 1`,
        );

        const history = await client.query(
          `SELECT *
           FROM tsb_flight_rounds
           WHERE status='CRASHED'
           ORDER BY id DESC
           LIMIT 20`,
        );

        return {
          success: true,
          serverTime: new Date(now).toISOString(),
          growthRate: GROWTH_RATE,
          round: roundView(latest.rows[0], now),
          history: history.rows.map(round => roundView(round, now)),
          lockedMultiplier: null,
        };
      });

      res.json({
        ...data,
        controllerId: account.login_id,
        controllerName: account.name,
        mustChangePassword: false,
      });
    }),
  );

  app.post(
    '/api/game-control/flight/rounds',
    controller,
    onlyDemo,
    wrap(async () => {
      throw fail(
        409,
        'Aviator rounds now run automatically. Choose Random / Admin Control 01 / 02 in the Admin panel (Aviator Game Control).',
      );
    }),
  );

  // Main Admin only: /api/admin is already protected by requireOldAdmin in index.js.
  app.get(
    '/api/admin/flight-plan/page',
    (req, res) => {
      res.set({
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      });

      res.send(PLAN_PAGE);
    },
  );

  app.get(
    '/api/admin/flight-plan',
    wrap(async (req, res) => {
      const settings = await loadSettings(pool);

      const now = new Date(
        (await pool.query('SELECT clock_timestamp() AS now')).rows[0].now,
      ).getTime();

      const latest = (
        await pool.query(
          `SELECT *
           FROM tsb_flight_rounds
           ORDER BY id DESC
           LIMIT 1`,
        )
      ).rows[0];

      const view = roundView(latest, now);

      res.json({
        success: true,

        configuredMode: MODES.includes(settings[KEYS.mode])
          ? settings[KEYS.mode]
          : 'RANDOM',

        plans: {
          '01': savedPlan(settings, '01'),
          '02': savedPlan(settings, '02'),
        },

        next: {
          '01': nextSlot(settings, '01'),
          '02': nextSlot(settings, '02'),
        },

        current: latest
          ? {
              id: view.id,
              phase: view.phase,
              mode: view.mode,
              planSlot: latest.plan_slot,
              multiplier: view.multiplier,
            }
          : null,
      });
    }),
  );

  app.post(
    '/api/admin/flight-plan',
    wrap(async (req, res) => {
      const data = req.body || {};

      if (!MODES.includes(data.mode)) {
        throw fail(
          400,
          'Choose Random, Admin Control 01 or Admin Control 02.',
        );
      }

      if (
        !data.plans ||
        typeof data.plans !== 'object' ||
        Array.isArray(data.plans)
      ) {
        throw fail(400, 'Provide both admin plans.');
      }

      let plans;

      try {
        plans = {
          '01': normalizePlan(data.plans['01'], data.mode !== 'ADMIN'),
          '02': normalizePlan(data.plans['02'], data.mode !== 'ADMIN2'),
        };
      } catch (error) {
        throw fail(400, error.message);
      }

      await transaction(pool, async client => {
        const settings = await loadSettings(client);

        const activeBank =
          data.mode === 'ADMIN2'
            ? '02'
            : data.mode === 'ADMIN'
              ? '01'
              : null;

        for (const bank of ['01', '02']) {
          const planKey = bank === '01' ? KEYS.plan1 : KEYS.plan2;
          const cursorKey = bank === '01' ? KEYS.cur1 : KEYS.cur2;

          const changed =
            JSON.stringify(plans[bank]) !==
            JSON.stringify(savedPlan(settings, bank));

          await saveSetting(client, planKey, JSON.stringify(plans[bank]));

          // The selected plan restarts at its first filled box;
          // the other plan keeps its own position unless its boxes changed.
          if (changed || bank === activeBank) {
            await saveSetting(client, cursorKey, '0');
          }
        }

        await saveSetting(client, KEYS.mode, data.mode);
      });

      res.json({ success: true, appliesFromNextCountdown: true });
    }),
  );

  // ---------- Customer actions ----------

  app.post(
    '/api/flight/bets',
    customer,
    onlyDemo,
    wrap(async (req, res) => {
      const amount = Number(req.body?.stake);
      const roundId = String(req.body?.roundId || '');
      const requestKey = String(req.body?.requestKey || '');

      const slot =
        req.body?.slot === undefined
          ? 1
          : Number(req.body.slot);

      const target = parseTarget(req.body?.autoCashout);

      if (
        !positiveId(roundId) ||
        !Number.isSafeInteger(amount) ||
        amount < 10 ||
        amount > 25000 ||
        ![1, 2].includes(slot) ||
        !/^[a-zA-Z0-9_-]{16,100}$/.test(requestKey)
      ) {
        throw fail(
          400,
          'Valid round, request key, 10–25,000 whole demo coins and bet box 1 or 2 are required.',
        );
      }

      const data = await transaction(pool, async client => {
        await expireRound(client);

        const selected = await client.query(
          `SELECT *
           FROM tsb_flight_rounds
           WHERE id=$1
           FOR UPDATE`,
          [roundId],
        );

        const wallet = await client.query(
          `SELECT status,demo_coin_balance
           FROM customers
           WHERE id=$1
           FOR UPDATE`,
          [req.flightCustomer.id],
        );

        if (wallet.rows[0]?.status !== 'ACTIVE') {
          throw fail(403, 'Customer account is inactive.');
        }

        const old = await client.query(
          `SELECT *
           FROM tsb_flight_bets
           WHERE customer_id=$1 AND request_key=$2`,
          [req.flightCustomer.id, requestKey],
        );

        if (old.rows[0]) {
          if (
            String(old.rows[0].round_id) !== roundId ||
            Number(old.rows[0].stake) !== amount ||
            Number(old.rows[0].bet_slot) !== slot
          ) {
            throw fail(
              409,
              'Request key belongs to another bet.',
            );
          }

          return {
            success: true,
            replayed: true,
            bet: betView(old.rows[0]),
            balance: Number(wallet.rows[0].demo_coin_balance),
          };
        }

        const round = selected.rows[0];

        const existing = await client.query(
          `SELECT id
           FROM tsb_flight_bets
           WHERE round_id=$1
             AND customer_id=$2
             AND bet_slot=$3
             AND status <> 'CANCELLED'`,
          [roundId, req.flightCustomer.id, slot],
        );

        if (existing.rows.length) {
          throw fail(
            409,
            'Only one bet per panel per round.',
          );
        }

        const balance =
          Number(wallet.rows[0].demo_coin_balance) - amount;

        if (balance < 0) {
          throw fail(400, 'Insufficient demo coins.');
        }

        const now = await serverNow(client);

        if (
          !round ||
          round.status !== 'LOCKED' ||
          now >= new Date(round.starts_at).getTime()
        ) {
          throw fail(
            409,
            'Betting closed. Wait for the next round.',
          );
        }

        const saved = await insertBet(client, {
          roundId,
          customerId: req.flightCustomer.id,
          requestKey,
          stake: amount,
          slot,
          autoHundredths: target,
        });

        return {
          success: true,
          bet: betView(saved),
          balance,
        };
      });

      res.json(data);
    }),
  );

  app.post(
    '/api/flight/bets/:id/cashout',
    customer,
    onlyDemo,
    wrap(async (req, res) => {
      if (!positiveId(req.params.id)) {
        throw fail(400, 'Invalid bet ID.');
      }

      const data = await transaction(pool, async client => {
        await expireRound(client);

        const result = await client.query(
          `SELECT
            b.*,
            r.starts_at,
            r.crashes_at,
            r.crash_hundredths,
            r.status AS round_status
           FROM tsb_flight_bets b
           JOIN tsb_flight_rounds r ON r.id=b.round_id
           WHERE b.id=$1 AND b.customer_id=$2
           FOR UPDATE OF b,r`,
          [req.params.id, req.flightCustomer.id],
        );

        const bet = result.rows[0];

        if (!bet) {
          throw fail(404, 'Bet not found.');
        }

        const wallet = await client.query(
          `SELECT status,demo_coin_balance
           FROM customers
           WHERE id=$1
           FOR UPDATE`,
          [req.flightCustomer.id],
        );

        if (wallet.rows[0]?.status !== 'ACTIVE') {
          throw fail(403, 'Customer account is inactive.');
        }

        if (bet.status === 'CASHED_OUT') {
          return {
            success: true,
            replayed: true,
            bet: betView(bet),
            balance: Number(wallet.rows[0].demo_coin_balance),
          };
        }

        const now = await serverNow(client);
        const start = new Date(bet.starts_at).getTime();

        if (
          bet.status !== 'PLACED' ||
          bet.round_status !== 'LOCKED' ||
          now >= new Date(bet.crashes_at).getTime()
        ) {
          throw fail(
            409,
            'Round has ended. Cash out is closed.',
          );
        }

        if (now < start) {
          throw fail(
            409,
            'Cash out opens after the flight starts.',
          );
        }

        const hundredths = Math.min(
          flightMultiplier(start, now),
          bet.crash_hundredths - 1,
        );

        const payout = Math.floor(
          Number(bet.stake) * hundredths / 100,
        );

        const balance =
          Number(wallet.rows[0].demo_coin_balance) + payout;

        if (balance > MAX_BALANCE) {
          throw fail(409, 'Demo wallet balance limit reached.');
        }

        const saved = await client.query(
          `UPDATE tsb_flight_bets
           SET status='CASHED_OUT',
               payout=$1,
               cashout_hundredths=$2,
               settled_at=NOW()
           WHERE id=$3
           RETURNING *`,
          [payout, hundredths, bet.id],
        );

        await client.query(
          `UPDATE customers
           SET demo_coin_balance=$1,updated_at=NOW()
           WHERE id=$2`,
          [balance, req.flightCustomer.id],
        );

        await client.query(
          `INSERT INTO demo_coin_transactions(
            customer_id,amount,transaction_type,note
          )
          VALUES($1,$2,'FLIGHT_PAYOUT',$3)`,
          [
            req.flightCustomer.id,
            payout,
            `TSB Aviator round #${bet.round_id}, bet #${bet.id}, ${hundredths / 100}x (stake included)`,
          ],
        );

        return {
          success: true,
          bet: betView(saved.rows[0]),
          balance,
        };
      });

      res.json(data);
    }),
  );

  app.post(
    '/api/flight/auto/start',
    customer,
    onlyDemo,
    wrap(async (req, res) => {
      const slot = Number(req.body?.slot);
      const stake = Number(req.body?.stake);
      const rounds = Number(req.body?.rounds);
      const target = parseTarget(req.body?.autoCashout);

      if (
        ![1, 2].includes(slot) ||
        !Number.isSafeInteger(stake) ||
        stake < 10 ||
        stake > 25000
      ) {
        throw fail(
          400,
          'Choose bet box 1 or 2 and a whole amount from ₹10 to ₹25,000.',
        );
      }

      if (
        !Number.isSafeInteger(rounds) ||
        rounds < 1 ||
        rounds > 100
      ) {
        throw fail(400, 'Choose 1–100 auto rounds.');
      }

      const data = await transaction(pool, async client => {
        await advance(client);

        const wallet = await client.query(
          `SELECT status,demo_coin_balance
           FROM customers
           WHERE id=$1
           FOR UPDATE`,
          [req.flightCustomer.id],
        );

        if (wallet.rows[0]?.status !== 'ACTIVE') {
          throw fail(403, 'Customer account is inactive.');
        }

        if (Number(wallet.rows[0].demo_coin_balance) < stake) {
          throw fail(400, 'Insufficient balance.');
        }

        const running = await client.query(
          `SELECT id
           FROM tsb_flight_auto_plans
           WHERE customer_id=$1
             AND bet_slot=$2
             AND enabled=TRUE`,
          [req.flightCustomer.id, slot],
        );

        if (running.rows.length) {
          throw fail(
            409,
            'Auto is already running. Stop it before changing its settings.',
          );
        }

        const round = (
          await client.query(
            `SELECT *
             FROM tsb_flight_rounds
             ORDER BY id DESC
             LIMIT 1`,
          )
        ).rows[0];

        const now = await serverNow(client);

        const open =
          Boolean(round) &&
          round.status === 'LOCKED' &&
          now < new Date(round.starts_at).getTime();

        const existing = open
          ? (
              await client.query(
                `SELECT id
                 FROM tsb_flight_bets
                 WHERE round_id=$1
                   AND customer_id=$2
                   AND bet_slot=$3
                   AND status<>'CANCELLED'`,
                [round.id, req.flightCustomer.id, slot],
              )
            ).rows[0]
          : null;

        const first =
          BigInt(round ? round.id : 0) +
          BigInt(open && !existing ? 0 : 1);

        await client.query(
          `INSERT INTO tsb_flight_auto_plans(
            customer_id,
            bet_slot,
            stake,
            auto_cashout_hundredths,
            remaining,
            enabled,
            not_before_round,
            last_round,
            last_error
          )
          VALUES($1,$2,$3,$4,$5,TRUE,$6,0,'')
          ON CONFLICT(customer_id,bet_slot)
          DO UPDATE SET
            stake=EXCLUDED.stake,
            auto_cashout_hundredths=EXCLUDED.auto_cashout_hundredths,
            remaining=EXCLUDED.remaining,
            enabled=TRUE,
            not_before_round=EXCLUDED.not_before_round,
            last_round=0,
            last_error=''`,
          [
            req.flightCustomer.id,
            slot,
            stake,
            target,
            rounds,
            String(first),
          ],
        );

        if (open) {
          await placeAutoBets(client, round, now);
        }

        return { success: true, started: true, firstRound: String(first) };
      });

      res.json(data);
    }),
  );

  app.post(
    '/api/flight/auto/stop',
    customer,
    onlyDemo,
    wrap(async (req, res) => {
      const slot = Number(req.body?.slot);

      if (![1, 2].includes(slot)) {
        throw fail(400, 'Invalid bet panel.');
      }

      await pool.query(
        `UPDATE tsb_flight_auto_plans
         SET enabled=FALSE,last_error=''
         WHERE customer_id=$1 AND bet_slot=$2`,
        [req.flightCustomer.id, slot],
      );

      res.json({ success: true, stopped: true });
    }),
  );

  // ---------- Game loop ----------

  let updating = false;
  let lastLogged = 0;

  const timer = setInterval(async () => {
    if (updating || !demoEnabled()) return;
    updating = true;

    try {
      await transaction(pool, advance);
    } catch (error) {
      if (Date.now() - lastLogged > 10000) {
        lastLogged = Date.now();

        console.error(
          'Aviator round update failed:',
          error.message,
        );
      }
    } finally {
      updating = false;
    }
  }, 250);

  timer.unref?.();
  return () => clearInterval(timer);
}
