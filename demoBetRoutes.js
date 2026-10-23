import {
  randomBytes,
  createHash,
} from 'node:crypto';

import {
  sportsService,
} from './sportsService.js';

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
].map(
  ([id, title, subtitle, no, yes]) => ({
    id,
    title,
    subtitle,
    no,
    yes,
  }),
);

const hash = token =>
  createHash('sha256')
    .update(token)
    .digest('hex');

const demoMode = () =>
  String(
    process.env.SPORTS_API_MODE || 'demo',
  )
    .trim()
    .toLowerCase() === 'demo';

const reject = (
  message,
  status = 409,
) =>
  Object.assign(
    new Error(message),
    { status },
  );

/* DEMO ODDS FOR THE SELECTED MATCH */

function teams(event) {
  return [
    {
      name: event.homeTeam,
      back: '1.85',
      lay: '1.90',
    },
    {
      name: 'Draw',
      back: '3.20',
      lay: '3.30',
    },
    {
      name: event.awayTeam,
      back: '2.10',
      lay: '2.15',
    },
  ].filter(
    (item, index, all) =>
      all.findIndex(
        other =>
          other.name === item.name,
      ) === index,
  );
}

/* DATABASE TABLES */

export async function initializeDemoBets(
  pool,
) {
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
        CHECK(stake BETWEEN 100 AND 25000),

      status VARCHAR(20) NOT NULL
        DEFAULT 'MATCHED',

      result VARCHAR(20) NOT NULL
        DEFAULT 'PENDING',

      payout INTEGER NOT NULL DEFAULT 0,
      profit_loss INTEGER NOT NULL DEFAULT 0,

      balance_before INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,

      created_at TIMESTAMPTZ NOT NULL
        DEFAULT NOW(),

      settled_at TIMESTAMPTZ,

      UNIQUE(customer_id,request_key)
    );

    CREATE INDEX IF NOT EXISTS
      demo_bets_customer_match_idx

      ON demo_bets(
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
  customerId,
) {
  const token =
    randomBytes(32).toString('hex');

  await pool.query(
    `
      INSERT INTO demo_customer_sessions(
        token_hash,
        customer_id,
        expires_at
      )
      VALUES(
        $1,
        $2,
        NOW()+INTERVAL '30 days'
      )
    `,
    [
      hash(token),
      customerId,
    ],
  );

  res.cookie(
    'tsb_demo_session',
    token,
    {
      httpOnly: true,
      sameSite: 'lax',

      secure:
        process.env.NODE_ENV ===
        'production',

      maxAge: 30 * 86400000,
      path: '/',
    },
  );
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

    payoutRate: Number(
      row.payout_rate,
    ),

    stake: Number(row.stake),
    status: row.status,
    result: row.result,

    payout: Number(row.payout),

    profitLoss: Number(
      row.profit_loss,
    ),

    balanceBefore: Number(
      row.balance_before,
    ),

    balanceAfter: Number(
      row.balance_after,
    ),

    createdAt: row.created_at,
    settledAt: row.settled_at,
  };
}

/*
  Use only a verified final market score.

  48 NO / 49 YES:
    NO wins at 48 or below.
    YES wins at 49 or above.

  Equal lines:
    NO wins below the line.
    YES wins at or above the line.
*/

export function resolveFancyResult({
  noLine,
  yesLine,
  finalScore,
  selection,
}) {
  if (
    ![
      noLine,
      yesLine,
      finalScore,
    ].every(Number.isSafeInteger) ||
    !['NO', 'YES'].includes(
      selection,
    )
  ) {
    throw new Error(
      'Invalid result input.',
    );
  }

  if (
    !(
      yesLine === noLine ||
      yesLine === noLine + 1
    )
  ) {
    throw new Error(
      'Unsupported line gap.',
    );
  }

  const yesWon =
    finalScore >= yesLine;

  return (
    selection === 'YES'
      ? yesWon
      : !yesWon
  )
    ? 'WON'
    : 'LOST';
}

/* ROUTES */

export function registerDemoBetRoutes(
  app,
  pool,
) {
  const wrap = fn =>
    (req, res, next) =>
      Promise.resolve(
        fn(req, res, next),
      ).catch(next);

  const requireCustomer = wrap(
    async (req, res, next) => {
      const cookie = String(
        req.headers.cookie || '',
      )
        .split(';')
        .map(value => value.trim())
        .find(value =>
          value.startsWith(
            'tsb_demo_session=',
          ),
        );

      const token =
        cookie?.slice(
          'tsb_demo_session='.length,
        ) || '';

      if (
        !/^[a-f0-9]{64}$/.test(token)
      ) {
        return res.status(401).json({
          error:
            'Please logout and login again to enable server demo bets.',
        });
      }

      const result = await pool.query(
        `
          SELECT c.id,c.status

          FROM demo_customer_sessions s

          JOIN customers c
            ON c.id=s.customer_id

          WHERE
            s.token_hash=$1
            AND s.expires_at>NOW()
        `,
        [hash(token)],
      );

      const customer =
        result.rows[0];

      if (
        !customer ||
        customer.status !== 'ACTIVE'
      ) {
        return res.status(401).json({
          error:
            'Session expired. Please login again.',
        });
      }

      req.demoCustomerId =
        customer.id;

      next();
    },
  );

  const requireDemo = (
    req,
    res,
    next,
  ) => {
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

    wrap(async (req, res) => {
      const id = String(
        req.query.matchId || '',
      );

      await sportsService.readSaved();

      const event =
        sportsService
          .getEvents()
          .find(
            item =>
              String(
                item.eventId,
              ) === id ||
              (item.id != null &&
                String(item.id) ===
                  id),
          );

      res.set(
        'Cache-Control',
        'no-store',
      );

      if (!event) {
        return res.status(404).json({
          error:
            'Match unavailable. Open a current match from the list.',
        });
      }

      res.json({
        success: true,

        markets:
          event.sport === 'cricket'
            ? DEMO_MARKETS
            : [],

        teams: teams(event),
        event,

        bettingAllowed:
          event.bettingAllowed,

        bettingReason:
          event.bettingReason,

        source: 'DEMO_MOCK',
      });
    }),
  );

  /* CUSTOMER BETS AND BALANCE */

  app.get(
    '/api/demo-bets',
    requireCustomer,

    wrap(async (req, res) => {
      const matchId = String(
        req.query.matchId || '',
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
                  b.customer_id=c.id

                  AND (
                    $2::TEXT=''
                    OR b.match_id=$2::TEXT
                  )
              ),
              '[]'::JSON
            ) AS bets

          FROM customers c
          WHERE c.id=$1
        `,
        [
          req.demoCustomerId,
          matchId,
        ],
      );

      const row = result.rows[0];

      if (!row) {
        throw reject(
          'Customer account unavailable.',
          401,
        );
      }

      res.set(
        'Cache-Control',
        'no-store',
      );

      res.json({
        success: true,

        customerId:
          req.demoCustomerId,

        balance: Number(
          row.demo_coin_balance,
        ),

        bets:
          row.bets.map(publicBet),
      });
    }),
  );

  /* CREATE BET AND DEDUCT COINS */

  app.post(
    '/api/demo-bets',
    requireCustomer,
    requireDemo,

    wrap(async (req, res) => {
      const body = req.body || {};

      const amount = Number(
        body.stake,
      );

      const requestKey = String(
        body.requestKey || '',
      );

      const matchId = String(
        body.matchId ?? '',
      );

      if (
        !Number.isSafeInteger(
          amount,
        ) ||
        amount < 100 ||
        amount > 25000
      ) {
        throw reject(
          'Demo stake must be 100–25,000 whole coins.',
          400,
        );
      }

      if (
        !/^[a-zA-Z0-9_-]{16,100}$/.test(
          requestKey,
        ) ||
        !matchId ||
        matchId.length > 200
      ) {
        throw reject(
          'Invalid request key or match ID.',
          400,
        );
      }

      const client =
        await pool.connect();

      try {
        await client.query('BEGIN');

        const customer = (
          await client.query(
            `
              SELECT
                status,
                demo_coin_balance

              FROM customers
              WHERE id=$1

              FOR UPDATE
            `,
            [req.demoCustomerId],
          )
        ).rows[0];

        if (
          !customer ||
          customer.status !==
            'ACTIVE'
        ) {
          throw reject(
            'Customer account is not active.',
            403,
          );
        }

        const previous = (
          await client.query(
            `
              SELECT *
              FROM demo_bets

              WHERE
                customer_id=$1
                AND request_key=$2
            `,
            [
              req.demoCustomerId,
              requestKey,
            ],
          )
        ).rows[0];

        /*
          A previously accepted request can
          be replayed after API OFF.

          It returns the existing bet only.
          No second deduction is performed.
        */

        if (previous) {
          if (
            previous.match_id !==
              matchId ||
            previous.market_id !==
              body.marketId ||
            previous.selection !==
              body.selection ||
            previous.bet_type !==
              body.type ||
            Number(
              previous.stake,
            ) !== amount
          ) {
            throw reject(
              'This request key belongs to a different selection.',
            );
          }

          await client.query(
            'COMMIT',
          );

          return res.json({
            success: true,
            replayed: true,

            balance: Number(
              customer.demo_coin_balance,
            ),

            bet: publicBet(
              previous,
            ),
          });
        }

        /*
          Resolve the match from server data.

          This checks the category API switch,
          feed freshness and demo eligibility.

          The database locks remain held until
          this wallet transaction completes.
        */

        const event =
          await sportsService.lockBetEvent(
            client,
            matchId,
          );

        let market;
        let selection;
        let type;
        let rate;
        let payoutRate;

        if (
          body.type === 'FANCY'
        ) {
          const item =
            event.sport ===
              'cricket' &&
            DEMO_MARKETS.find(
              entry =>
                entry.id ===
                body.marketId,
            );

          if (
            !item ||
            !['NO', 'YES'].includes(
              body.selection,
            )
          ) {
            throw reject(
              'Invalid demo market or selection.',
              400,
            );
          }

          market = item.title;
          selection =
            body.selection;

          type = 'FANCY';

          rate =
            selection === 'YES'
              ? item.yes
              : item.no;

          payoutRate = 2;
        } else {
          const team =
            teams(event).find(
              item =>
                item.name ===
                body.selection,
            );

          if (
            body.marketId !==
              'match-odds' ||
            !team ||
            ![
              'BACK',
              'LAY',
            ].includes(body.type) ||
            String(
              body.selection,
            ).length > 100
          ) {
            throw reject(
              'Invalid demo odds selection.',
              400,
            );
          }

          market = 'Match Odds';
          selection =
            body.selection;

          type = body.type;

          rate =
            type === 'BACK'
              ? team.back
              : team.lay;

          // LAY stake represents liability.
          payoutRate =
            type === 'LAY'
              ? 1 +
                1 /
                  (Number(rate) -
                    1)
              : Number(rate);
        }

        const before = Number(
          customer.demo_coin_balance,
        );

        if (amount > before) {
          throw Object.assign(
            reject(
              'Insufficient demo balance.',
              400,
            ),
            {
              balance: before,
            },
          );
        }

        const after =
          before - amount;

        const inserted = (
          await client.query(
            `
              INSERT INTO demo_bets(
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

              VALUES(
                $1,$2,$3,$4,$5,$6,$7,
                $8,$9,$10,$11,$12,$13,$14
              )

              RETURNING *
            `,
            [
              req.demoCustomerId,
              requestKey,
              matchId,

              `${event.homeTeam} vs ${event.awayTeam}`.slice(
                0,
                300,
              ),

              String(
                event.startTime ||
                  '',
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
            ],
          )
        ).rows[0];

        await client.query(
          `
            UPDATE customers
            SET
              demo_coin_balance=$1,
              updated_at=NOW()

            WHERE id=$2
          `,
          [
            after,
            req.demoCustomerId,
          ],
        );

        await client.query(
          `
            INSERT INTO demo_coin_transactions(
              customer_id,
              amount,
              transaction_type,
              note
            )

            VALUES(
              $1,
              $2,
              'BET_STAKE',
              $3
            )
          `,
          [
            req.demoCustomerId,
            -amount,
            `Demo bet #${inserted.id}`,
          ],
        );

        await client.query(
          'COMMIT',
        );

        res.status(201).json({
          success: true,
          balance: after,
          bet: publicBet(inserted),
        });
      } catch (error) {
        await client.query(
          'ROLLBACK',
        );

        throw error;
      } finally {
        client.release();
      }
    }),
  );

  /* MANUAL DEMO SETTLEMENT */

  app.post(
    '/api/demo-bets/:id/simulate-settlement',
    requireCustomer,
    requireDemo,

    wrap(async (req, res) => {
      const betId = String(
        req.params.id,
      );

      const outcome = String(
        req.body?.outcome || '',
      );

      if (
        !/^\d{1,18}$/.test(
          betId,
        ) ||
        ![
          'WON',
          'LOST',
        ].includes(outcome)
      ) {
        throw reject(
          'Invalid demo settlement.',
          400,
        );
      }

      const client =
        await pool.connect();

      try {
        await client.query(
          'BEGIN',
        );

        const customer = (
          await client.query(
            `
              SELECT
                status,
                demo_coin_balance

              FROM customers
              WHERE id=$1

              FOR UPDATE
            `,
            [req.demoCustomerId],
          )
        ).rows[0];

        if (
          !customer ||
          customer.status !==
            'ACTIVE'
        ) {
          throw reject(
            'Customer account is not active.',
            403,
          );
        }

        const bet = (
          await client.query(
            `
              SELECT *
              FROM demo_bets

              WHERE
                id=$1
                AND customer_id=$2

              FOR UPDATE
            `,
            [
              betId,
              req.demoCustomerId,
            ],
          )
        ).rows[0];

        if (!bet) {
          throw reject(
            'Demo bet not found.',
            404,
          );
        }

        /*
          Already settled:
          return the result without
          crediting coins again.
        */

        if (
          bet.status ===
          'SETTLED'
        ) {
          await client.query(
            'COMMIT',
          );

          return res.json({
            success: true,
            alreadySettled: true,

            balance: Number(
              customer.demo_coin_balance,
            ),

            bet: publicBet(bet),
          });
        }

        const payout =
          outcome === 'WON'
            ? Math.round(
                Number(
                  bet.stake,
                ) *
                  Number(
                    bet.payout_rate,
                  ),
              )
            : 0;

        const after =
          Number(
            customer.demo_coin_balance,
          ) + payout;

        if (
          !Number.isSafeInteger(
            after,
          ) ||
          after > 2147483647
        ) {
          throw new Error(
            'Demo balance limit exceeded.',
          );
        }

        const updated = (
          await client.query(
            `
              UPDATE demo_bets
              SET
                status='SETTLED',
                result=$1,
                payout=$2,
                profit_loss=$2-stake,
                balance_after=$3,
                settled_at=NOW()

              WHERE id=$4

              RETURNING *
            `,
            [
              outcome,
              payout,
              after,
              betId,
            ],
          )
        ).rows[0];

        await client.query(
          `
            UPDATE customers
            SET
              demo_coin_balance=$1,
              updated_at=NOW()

            WHERE id=$2
          `,
          [
            after,
            req.demoCustomerId,
          ],
        );

        if (payout > 0) {
          await client.query(
            `
              INSERT INTO demo_coin_transactions(
                customer_id,
                amount,
                transaction_type,
                note
              )

              VALUES(
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
            ],
          );
        }

        await client.query(
          'COMMIT',
        );

        res.json({
          success: true,
          balance: after,
          bet: publicBet(updated),
        });
      } catch (error) {
        await client.query(
          'ROLLBACK',
        );

        throw error;
      } finally {
        client.release();
      }
    }),
  );
}
