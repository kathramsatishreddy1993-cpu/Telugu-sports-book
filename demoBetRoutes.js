import {
  randomBytes,
  createHash,
} from 'node:crypto';

/* SERVER-CONTROLLED DEMO MARKETS */

export const DEMO_MARKETS = [
  [
    'six-over',
    '6 Overs Runs',
    'Demo Session',
    '48',
    '49',
  ],
  [
    'current-over',
    'Current Over Runs',
    'Demo Over Session',
    '8',
    '9',
  ],
  [
    'next-over',
    'Next Over Runs',
    'Demo Over Session',
    '7',
    '8',
  ],
  [
    '25-run-wicket',
    '25 Runs Wicket',
    'Demo Wicket Session',
    '25',
    '25',
  ],
  [
    'batsman-runs',
    'Current Batsman 30 Runs',
    'Demo Player Session',
    '30',
    '30',
  ],
  [
    'batsman-four',
    'Current Batsman Four',
    'Demo Player Session',
    'NO',
    'YES',
  ],
  [
    'batsman-six',
    'Current Batsman Six',
    'Demo Player Session',
    'NO',
    'YES',
  ],
  [
    'partnership',
    'Current Partnership Runs',
    'Demo Partnership',
    '42',
    '43',
  ],
  [
    'fall-wicket',
    'Fall Of Next Wicket',
    'Demo Wicket Session',
    '65',
    '66',
  ],
  [
    'total-runs',
    'Team Total Runs',
    'Demo Innings Session',
    '174',
    '175',
  ],
  [
    'total-fours',
    'Total Fours',
    'Demo Match Session',
    '23',
    '24',
  ],
  [
    'total-sixes',
    'Total Sixes',
    'Demo Match Session',
    '8',
    '9',
  ],
].map(([id, title, subtitle, no, yes]) => ({
  id,
  title,
  subtitle,
  no,
  yes,
}));

const hash = (token) =>
  createHash('sha256')
    .update(token)
    .digest('hex');

const demoMode = () =>
  String(process.env.SPORTS_API_MODE || 'demo')
    .trim()
    .toLowerCase() === 'demo';

/* DATABASE TABLES */

export async function initializeDemoBets(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS demo_customer_sessions (
      token_hash TEXT PRIMARY KEY,

      customer_id INTEGER NOT NULL
        REFERENCES customers(id)
        ON DELETE CASCADE,

      expires_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS demo_bets (
      id BIGSERIAL PRIMARY KEY,

      customer_id INTEGER NOT NULL
        REFERENCES customers(id)
        ON DELETE CASCADE,

      request_key VARCHAR(100) NOT NULL,

      match_id VARCHAR(200) NOT NULL,
      match_name TEXT NOT NULL,
      match_date TEXT,

      market_id VARCHAR(100) NOT NULL,
      market TEXT NOT NULL,
      selection VARCHAR(100) NOT NULL,
      bet_type VARCHAR(20) NOT NULL,

      rate TEXT NOT NULL,
      payout_rate NUMERIC(12,4) NOT NULL,

      stake INTEGER NOT NULL
        CHECK (stake BETWEEN 100 AND 25000),

      status VARCHAR(20) NOT NULL DEFAULT 'MATCHED',
      result VARCHAR(20) NOT NULL DEFAULT 'PENDING',

      payout INTEGER NOT NULL DEFAULT 0,
      profit_loss INTEGER NOT NULL DEFAULT 0,

      balance_before INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,

      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      settled_at TIMESTAMPTZ,

      UNIQUE(customer_id, request_key)
    );

    CREATE INDEX IF NOT EXISTS
      demo_bets_customer_match_idx

      ON demo_bets (
        customer_id,
        match_id,
        created_at DESC
      );
  `);
}

/* CUSTOMER SESSION */

export async function issueCustomerSession(
  pool,
  res,
  customerId
) {
  const token = randomBytes(32).toString('hex');

  await pool.query(
    `
      INSERT INTO demo_customer_sessions (
        token_hash,
        customer_id,
        expires_at
      )

      VALUES (
        $1,
        $2,
        NOW() + INTERVAL '30 days'
      )
    `,
    [hash(token), customerId]
  );

  res.cookie('tsb_demo_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

/* RESPONSE FORMAT */

export function publicBet(row) {
  return {
    id: String(row.id),
    customerId: row.customer_id,

    matchId: row.match_id,
    matchName: row.match_name,
    matchDate: row.match_date,

    marketId: row.market_id,
    market: row.market,
    selection: row.selection,

    type: row.bet_type,
    rate: row.rate,
    payoutRate: Number(row.payout_rate),

    stake: Number(row.stake),
    status: row.status,
    result: row.result,

    payout: Number(row.payout),
    profitLoss: Number(row.profit_loss),

    balanceBefore: Number(row.balance_before),
    balanceAfter: Number(row.balance_after),

    createdAt: row.created_at,
    settledAt: row.settled_at,
  };
}

/*
  Rule helper for a future verified final-score feed.

  48 NO / 49 YES:
    NO wins at 48 or below.
    YES wins at 49 or above.

  21 NO / 21 YES:
    NO wins below 21.
    YES wins at 21 or above.

  Do not pass an incomplete/current score
  as if it were a final market result.
*/

export function resolveFancyResult({
  noLine,
  yesLine,
  finalScore,
  selection,
}) {
  if (
    ![noLine, yesLine, finalScore].every(
      Number.isSafeInteger
    ) ||
    !['NO', 'YES'].includes(selection)
  ) {
    throw new Error('Invalid result input.');
  }

  if (
    !(
      yesLine === noLine ||
      yesLine === noLine + 1
    )
  ) {
    throw new Error('Unsupported line gap.');
  }

  const yesWon = finalScore >= yesLine;

  return (
    selection === 'YES' ? yesWon : !yesWon
  )
    ? 'WON'
    : 'LOST';
}

/* ROUTES */

export function registerDemoBetRoutes(app, pool) {
  const wrap = (fn) => (req, res, next) =>
    Promise.resolve(
      fn(req, res, next)
    ).catch(next);

  const requireCustomer = wrap(
    async (req, res, next) => {
      const cookie = String(
        req.headers.cookie || ''
      )
        .split(';')
        .map((value) => value.trim())
        .find((value) =>
          value.startsWith('tsb_demo_session=')
        );

      const token =
        cookie?.slice(
          'tsb_demo_session='.length
        ) || '';

      if (!/^[a-f0-9]{64}$/.test(token)) {
        return res.status(401).json({
          error:
            'Please logout and login again to enable server demo bets.',
        });
      }

      const result = await pool.query(
        `
          SELECT c.id, c.status

          FROM demo_customer_sessions s

          JOIN customers c
            ON c.id = s.customer_id

          WHERE
            s.token_hash = $1
            AND s.expires_at > NOW()
        `,
        [hash(token)]
      );

      const customer = result.rows[0];

      if (
        !customer ||
        customer.status !== 'ACTIVE'
      ) {
        return res.status(401).json({
          error:
            'Session expired. Please login again.',
        });
      }

      req.demoCustomerId = customer.id;
      next();
    }
  );

  const requireDemo = (req, res, next) => {
    if (!demoMode()) {
      return res.status(409).json({
        error:
          'Demo markets are disabled in live mode. Verified market integration is pending.',
      });
    }

    next();
  };

  /* MARKET LIST */

  app.get(
    '/api/demo-bets/markets',
    requireCustomer,
    requireDemo,
    (req, res) => {
      res.set('Cache-Control', 'no-store');

      res.json({
        success: true,
        markets: DEMO_MARKETS,
        source: 'DEMO_MOCK',
      });
    }
  );

  /* CUSTOMER BETS AND BALANCE */

  app.get(
    '/api/demo-bets',
    requireCustomer,
    wrap(async (req, res) => {
      const matchId = String(
        req.query.matchId || ''
      ).slice(0, 200);

      const result = await pool.query(
        `
          SELECT
            c.demo_coin_balance,

            COALESCE(
              (
                SELECT json_agg(
                  b
                  ORDER BY
                    b.created_at DESC,
                    b.id DESC
                )

                FROM demo_bets b

                WHERE
                  b.customer_id = c.id
                  AND (
                    $2::TEXT = ''
                    OR b.match_id = $2::TEXT
                  )
              ),
              '[]'::JSON
            ) AS bets

          FROM customers c
          WHERE c.id = $1
        `,
        [req.demoCustomerId, matchId]
      );

      const row = result.rows[0];

      res.set('Cache-Control', 'no-store');

      res.json({
        success: true,
        customerId: req.demoCustomerId,
        balance: Number(row.demo_coin_balance),
        bets: row.bets.map(publicBet),
      });
    })
  );

  /* CREATE BET + DEDUCT COINS ATOMICALLY */

  app.post(
    '/api/demo-bets',
    requireCustomer,
    requireDemo,
    wrap(async (req, res) => {
      const body = req.body || {};
      const amount = Number(body.stake);

      const requestKey = String(
        body.requestKey || ''
      );

      const matchId = String(
        body.matchId ?? ''
      );

      if (
        !Number.isSafeInteger(amount) ||
        amount < 100 ||
        amount > 25000
      ) {
        return res.status(400).json({
          error:
            'Demo stake must be 100–25,000 whole coins.',
        });
      }

      if (
        !/^[a-zA-Z0-9_-]{16,100}$/.test(
          requestKey
        ) ||
        !matchId ||
        matchId.length > 200
      ) {
        return res.status(400).json({
          error:
            'Invalid request key or match ID.',
        });
      }

      let market;
      let selection;
      let type;
      let rate;
      let payoutRate;

      if (body.type === 'FANCY') {
        const item = DEMO_MARKETS.find(
          (entry) => entry.id === body.marketId
        );

        if (
          !item ||
          !['NO', 'YES'].includes(body.selection)
        ) {
          return res.status(400).json({
            error:
              'Invalid demo market or selection.',
          });
        }

        market = item.title;
        selection = body.selection;
        type = 'FANCY';

        rate =
          selection === 'YES'
            ? item.yes
            : item.no;

        payoutRate = 2;
      } else {
        const selections = {
          India: ['1.85', '1.90'],
          Draw: ['3.20', '3.30'],
          Australia: ['2.10', '2.15'],
        };

        if (
          body.marketId !== 'match-odds' ||
          !Object.hasOwn(
            selections,
            body.selection
          ) ||
          !['BACK', 'LAY'].includes(body.type)
        ) {
          return res.status(400).json({
            error:
              'Invalid demo odds selection.',
          });
        }

        market = 'Match Odds';
        selection = body.selection;
        type = body.type;

        rate =
          selections[selection][
            type === 'BACK' ? 0 : 1
          ];

        /*
          Demo LAY stake represents liability.
          Return includes the held liability.
        */
        payoutRate =
          type === 'LAY'
            ? 1 + 1 / (Number(rate) - 1)
            : Number(rate);
      }

      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        const customerResult =
          await client.query(
            `
              SELECT
                status,
                demo_coin_balance

              FROM customers
              WHERE id = $1
              FOR UPDATE
            `,
            [req.demoCustomerId]
          );

        const customer =
          customerResult.rows[0];

        if (
          !customer ||
          customer.status !== 'ACTIVE'
        ) {
          await client.query('ROLLBACK');

          return res.status(403).json({
            error:
              'Customer account is not active.',
          });
        }

        const previous = await client.query(
          `
            SELECT *
            FROM demo_bets

            WHERE
              customer_id = $1
              AND request_key = $2
          `,
          [
            req.demoCustomerId,
            requestKey,
          ]
        );

        /*
          Retrying the same request does not
          deduct the stake a second time.
        */

        if (previous.rows.length) {
          const old = previous.rows[0];

          if (
            old.match_id !== matchId ||
            old.market_id !== body.marketId ||
            old.selection !== selection ||
            old.bet_type !== type ||
            Number(old.stake) !== amount
          ) {
            await client.query('ROLLBACK');

            return res.status(409).json({
              error:
                'This request key belongs to a different selection.',
            });
          }

          await client.query('COMMIT');

          return res.json({
            success: true,
            replayed: true,

            balance: Number(
              customer.demo_coin_balance
            ),

            bet: publicBet(old),
          });
        }

        const before = Number(
          customer.demo_coin_balance
        );

        if (amount > before) {
          await client.query('ROLLBACK');

          return res.status(400).json({
            error:
              'Insufficient demo balance.',
            balance: before,
          });
        }

        const after = before - amount;

        const inserted = await client.query(
          `
            INSERT INTO demo_bets (
              customer_id,
              request_key,
              match_id,
              match_name,
              match_date,
              market_id,
              market,
              selection,
              bet_type,
              rate,
              payout_rate,
              stake,
              balance_before,
              balance_after
            )

            VALUES (
              $1, $2, $3, $4, $5, $6, $7,
              $8, $9, $10, $11, $12, $13, $14
            )

            RETURNING *
          `,
          [
            req.demoCustomerId,
            requestKey,
            matchId,

            String(
              body.matchName || 'Demo Match'
            ).slice(0, 300),

            String(
              body.matchDate || ''
            ).slice(0, 200),

            body.marketId,
            market,
            selection,
            type,
            rate,
            payoutRate,
            amount,
            before,
            after,
          ]
        );

        await client.query(
          `
            UPDATE customers
            SET
              demo_coin_balance = $1,
              updated_at = NOW()
            WHERE id = $2
          `,
          [after, req.demoCustomerId]
        );

        await client.query(
          `
            INSERT INTO demo_coin_transactions (
              customer_id,
              amount,
              transaction_type,
              note
            )

            VALUES ($1, $2, 'BET_STAKE', $3)
          `,
          [
            req.demoCustomerId,
            -amount,
            `Demo bet #${inserted.rows[0].id}`,
          ]
        );

        await client.query('COMMIT');

        res.status(201).json({
          success: true,
          balance: after,
          bet: publicBet(inserted.rows[0]),
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    })
  );

  /* MANUAL DEMO SETTLEMENT */

  app.post(
    '/api/demo-bets/:id/simulate-settlement',
    requireCustomer,
    requireDemo,
    wrap(async (req, res) => {
      const betId = String(req.params.id);

      const outcome = String(
        req.body?.outcome || ''
      );

      if (
        !/^\d{1,18}$/.test(betId) ||
        !['WON', 'LOST'].includes(outcome)
      ) {
        return res.status(400).json({
          error: 'Invalid demo settlement.',
        });
      }

      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        /*
          Lock customer first for every wallet
          operation to prevent lost updates.
        */

        const customerResult =
          await client.query(
            `
              SELECT
                status,
                demo_coin_balance

              FROM customers
              WHERE id = $1
              FOR UPDATE
            `,
            [req.demoCustomerId]
          );

        const customer =
          customerResult.rows[0];

        if (
          !customer ||
          customer.status !== 'ACTIVE'
        ) {
          await client.query('ROLLBACK');

          return res.status(403).json({
            error:
              'Customer account is not active.',
          });
        }

        const result = await client.query(
          `
            SELECT *
            FROM demo_bets

            WHERE
              id = $1
              AND customer_id = $2

            FOR UPDATE
          `,
          [betId, req.demoCustomerId]
        );

        const bet = result.rows[0];

        if (!bet) {
          await client.query('ROLLBACK');

          return res.status(404).json({
            error: 'Demo bet not found.',
          });
        }

        /*
          Already settled:
          return current balance without
          crediting coins a second time.
        */

        if (bet.status === 'SETTLED') {
          await client.query('COMMIT');

          return res.json({
            success: true,
            alreadySettled: true,

            balance: Number(
              customer.demo_coin_balance
            ),

            bet: publicBet(bet),
          });
        }

        const payout =
          outcome === 'WON'
            ? Math.round(
                Number(bet.stake) *
                  Number(bet.payout_rate)
              )
            : 0;

        const after =
          Number(customer.demo_coin_balance) +
          payout;

        if (
          !Number.isSafeInteger(after) ||
          after > 2147483647
        ) {
          throw new Error(
            'Demo balance limit exceeded.'
          );
        }

        const updated = await client.query(
          `
            UPDATE demo_bets
            SET
              status = 'SETTLED',
              result = $1,
              payout = $2,
              profit_loss = $2 - stake,
              balance_after = $3,
              settled_at = NOW()

            WHERE id = $4
            RETURNING *
          `,
          [
            outcome,
            payout,
            after,
            betId,
          ]
        );

        await client.query(
          `
            UPDATE customers
            SET
              demo_coin_balance = $1,
              updated_at = NOW()
            WHERE id = $2
          `,
          [after, req.demoCustomerId]
        );

        if (payout > 0) {
          await client.query(
            `
              INSERT INTO demo_coin_transactions (
                customer_id,
                amount,
                transaction_type,
                note
              )

              VALUES (
                $1,
                $2,
                'BET_PAYOUT',
                $3
              )
            `,
            [
              req.demoCustomerId,
              payout,
              `Demo bet #${betId} WON — includes returned stake`,
            ]
          );
        }

        await client.query('COMMIT');

        res.json({
          success: true,
          balance: after,
          bet: publicBet(updated.rows[0]),
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    })
  );
}
