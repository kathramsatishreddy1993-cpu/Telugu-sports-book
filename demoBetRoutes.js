import {
  randomBytes,
  createHash,
} from 'node:crypto';

import { sportsService } from './sportsService.js';

export const DEMO_MARKETS = [
  ['six-over', '6 Overs Runs', 'Demo Session', '48', '49'],
  ['current-over', 'Current Over Runs', 'Demo Over Session', '8', '9'],
  ['next-over', 'Next Over Runs', 'Demo Over Session', '7', '8'],
  ['25-run-wicket', '25 Runs Wicket', 'Demo Wicket Session', '25', '25'],
  ['batsman-runs', 'Current Batsman 30 Runs', 'Demo Player Session', '30', '30'],
  ['batsman-four', 'Current Batsman Four', 'Demo Player Session', 'NO', 'YES'],
  ['batsman-six', 'Current Batsman Six', 'Demo Player Session', 'NO', 'YES'],
  ['partnership', 'Current Partnership Runs', 'Demo Partnership', '42', '43'],
  ['fall-wicket', 'Fall Of Next Wicket', 'Demo Wicket Session', '65', '66'],
  ['total-runs', 'Team Total Runs', 'Demo Innings Session', '174', '175'],
  ['total-fours', 'Total Fours', 'Demo Match Session', '23', '24'],
  ['total-sixes', 'Total Sixes', 'Demo Match Session', '8', '9'],
].map(([id, title, subtitle, no, yes]) => ({
  id,
  title,
  subtitle,
  no,
  yes,
}));

const hash = value =>
  createHash('sha256')
    .update(value)
    .digest('hex');

const reject = (message, status = 409) =>
  Object.assign(
    new Error(message),
    { status },
  );

const demoMode = () =>
  String(process.env.SPORTS_API_MODE || 'demo')
    .trim()
    .toLowerCase() === 'demo';

const providerMode = () =>
  !demoMode() &&
  sportsService.sportbex === true;

const teamRows = event => [
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
  (row, index, all) =>
    row.name &&
    all.findIndex(
      item => item.name === row.name,
    ) === index,
);

const positive = value =>
  value != null &&
  Number.isFinite(Number(value)) &&
  Number(value) > 0;

const blocked = status =>
  !['', 'UNKNOWN', 'OPEN', 'ACTIVE'].includes(
    String(status || '')
      .trim()
      .toUpperCase(),
  );

const rounded = value =>
  Number(value.toFixed(4));

export function providerQuotes(
  event,
  state,
  now = Date.now(),
) {
  const recent = date => {
    const age =
      now -
      new Date(date || 0).getTime();

    return (
      Number.isFinite(age) &&
      age >= -1000 &&
      age < Math.max(
        Number(
          state.pollIntervalMs || 15000,
        ) * 2,
        20000,
      )
    );
  };

  const ready =
    state.enabled === true &&
    !state.stale &&
    recent(state.lastUpdated) &&
    event.provider === 'sportbex' &&
    ![
      'ENDED',
      'CLOSED',
      'FINISHED',
      'CANCELLED',
      'ABANDONED',
    ].includes(event.status);

  const result = [];

  const add = (
    fields,
    rate,
    payout,
    min,
    max,
    available,
  ) => {
    const safePayout =
      positive(payout)
        ? rounded(payout)
        : null;

    const minimum =
      Math.max(
        100,
        Number(min) || 100,
      );

    const maximum =
      Math.min(
        25000,
        Number(max) || 25000,
      );

    result.push({
      ...fields,

      rate:
        rate == null
          ? null
          : String(rate),

      payoutRate: safePayout,
      min: minimum,
      max: maximum,

      allowed: Boolean(
        ready &&
          available &&
          safePayout > 1 &&
          (
            max == null ||
            positive(max)
          ) &&
          maximum >= minimum,
      ),

      riskIsStake: true,
    });
  };

  const odds = event.matchOdds;

  for (
    const row of odds?.runners || []
  ) {
    for (
      const type of ['BACK', 'LAY']
    ) {
      const quote = (
        type === 'BACK'
          ? row.back
          : row.lay
      )?.[0];

      const rate =
        Number(quote?.price);

      add(
        {
          marketId: 'match-odds',
          market: 'Match Odds',
          selection: row.name,

          selectionId:
            String(row.selectionId),

          type,
        },

        quote?.price,

        type === 'BACK'
          ? rate
          : 1 + 1 / (rate - 1),

        100,
        25000,

        recent(event.marketUpdatedAt) &&
          odds.status === 'OPEN' &&
          odds.delayed === false &&
          row.status === 'ACTIVE' &&
          rate > 1 &&
          positive(quote?.size),
      );
    }
  }

  for (
    const row of event.bookmaker || []
  ) {
    for (
      const type of ['BACK', 'LAY']
    ) {
      const rate = Number(
        type === 'BACK'
          ? row.back
          : row.lay,
      );

      add(
        {
          marketId:
            `bookmaker:${row.marketId}`,

          market: 'Bookmaker',
          selection: row.name,

          selectionId:
            String(row.selectionId),

          type,
        },

        type === 'BACK'
          ? row.back
          : row.lay,

        type === 'BACK'
          ? 1 + rate / 100
          : 1 + 100 / rate,

        100,
        25000,

        recent(event.fancyUpdatedAt) &&
          !blocked(row.status) &&
          rate > 0 &&
          positive(
            type === 'BACK'
              ? row.backSize
              : row.laySize,
          ),
      );
    }
  }

  for (
    const row of event.fancy || []
  ) {
    for (
      const selection of ['NO', 'YES']
    ) {
      const line =
        selection === 'YES'
          ? row.yes
          : row.no;

      const rate = Number(
        selection === 'YES'
          ? row.yesRate
          : row.noRate,
      );

      add(
        {
          marketId:
            `fancy:${row.id}`,

          market: row.title,
          selection,

          selectionId:
            String(row.selectionId),

          type: 'FANCY',
          sessionRate: rate,
        },

        line,

        selection === 'YES'
          ? 1 + rate / 100
          : 1 + 100 / rate,

        row.min,
        row.max,

        recent(event.fancyUpdatedAt) &&
          !blocked(row.status) &&
          line != null &&
          Number.isFinite(
            Number(line),
          ) &&
          Number(line) >= 0 &&
          rate > 0,
      );
    }
  }

  return result;
}

export async function initializeDemoBets(
  pool,
) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS demo_customer_sessions (
      token_hash TEXT PRIMARY KEY,
      customer_id INTEGER NOT NULL
        REFERENCES customers(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS demo_bets (
      id BIGSERIAL PRIMARY KEY,
      customer_id INTEGER NOT NULL
        REFERENCES customers(id) ON DELETE CASCADE,
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
      status VARCHAR(20) NOT NULL DEFAULT 'MATCHED',
      result VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      payout INTEGER NOT NULL DEFAULT 0,
      profit_loss INTEGER NOT NULL DEFAULT 0,
      balance_before INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      settled_at TIMESTAMPTZ,
      UNIQUE(customer_id,request_key)
    );

    ALTER TABLE demo_bets
      ADD COLUMN IF NOT EXISTS provider
      TEXT NOT NULL DEFAULT 'DEMO_MOCK';

    ALTER TABLE demo_bets
      ADD COLUMN IF NOT EXISTS selection_id TEXT;

    ALTER TABLE demo_bets
      ADD COLUMN IF NOT EXISTS quote_hash TEXT;

    CREATE INDEX IF NOT EXISTS
      demo_bets_customer_match_idx
      ON demo_bets(
        customer_id,
        match_id,
        created_at DESC
      );
  `);
}

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
    [hash(token), customerId],
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

export function publicBet(row) {
  return {
    id: String(row.id),

    customerId:
      row.customer_id,

    matchId:
      row.match_id,

    matchName:
      row.match_name,

    matchDate:
      row.match_date,

    marketId:
      row.market_id,

    market:
      row.market,

    selection:
      row.selection,

    selectionId:
      row.selection_id,

    type:
      row.bet_type,

    rate:
      row.rate,

    payoutRate:
      Number(row.payout_rate),

    stake:
      Number(row.stake),

    status:
      row.status,

    result:
      row.result,

    payout:
      Number(row.payout),

    profitLoss:
      Number(row.profit_loss),

    balanceBefore:
      Number(row.balance_before),

    balanceAfter:
      Number(row.balance_after),

    createdAt:
      row.created_at,

    settledAt:
      row.settled_at,

    provider:
      row.provider || 'DEMO_MOCK',

    simulationOnly: true,
  };
}

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
    !['NO', 'YES'].includes(selection)
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

export function registerDemoBetRoutes(
  app,
  pool,
) {
  const wrap = fn =>
    (req, res, next) =>
      Promise.resolve(
        fn(req, res, next),
      ).catch(error => {
        if (
          error.status &&
          !res.headersSent
        ) {
          return res
            .status(error.status)
            .json({
              error: error.message,

              ...(
                Number.isFinite(
                  error.balance,
                )
                  ? {
                      balance:
                        error.balance,
                    }
                  : {}
              ),
            });
        }

        next(error);
      });

  // Customer settlement is permanently disabled here.
  // This also blocks older cached customer pages.
  // Admin settlement must use a separate authenticated
  // admin route, never customer cookies or client role flags.
  app.post(
    '/api/demo-bets/:id/simulate-settlement',

    (req, res) => {
      res.set(
        'Cache-Control',
        'no-store',
      );

      return res.status(403).json({
        success: false,

        code:
          'CUSTOMER_SETTLEMENT_DISABLED',

        error:
          'Customer settlement is disabled. Results must be managed through the administrator panel.',
      });
    },
  );

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
        throw reject(
          'Please logout and login again.',
          401,
        );
      }

      const row = (
        await pool.query(
          `
            SELECT c.id,c.status
            FROM demo_customer_sessions s
            JOIN customers c
              ON c.id=s.customer_id
            WHERE s.token_hash=$1
              AND s.expires_at>NOW()
          `,
          [hash(token)],
        )
      ).rows[0];

      if (
        !row ||
        row.status !== 'ACTIVE'
      ) {
        throw reject(
          'Session expired. Please login again.',
          401,
        );
      }

      req.demoCustomerId = row.id;

      next();
    },
  );

  const sameOrigin = (
    req,
    res,
    next,
  ) => {
    if (req.headers.origin) {
      try {
        if (
          new URL(
            req.headers.origin,
          ).host !== req.headers.host
        ) {
          return res
            .status(403)
            .json({
              error:
                'Invalid request origin.',
            });
        }
      } catch {
        return res
          .status(403)
          .json({
            error:
              'Invalid request origin.',
          });
      }
    }

    next();
  };

  async function savedProviderEvent(
    client,
    matchId,
  ) {
    const control = (
      await client.query(`
        SELECT *
        FROM tsb_sports_control_v2
        WHERE sport='cricket'
        FOR SHARE
      `)
    ).rows[0];

    const snapshot = (
      await client.query(
        `
          SELECT *
          FROM tsb_sports_snapshot_v2
          WHERE feed_key=$1
            AND sport='cricket'
          FOR SHARE
        `,
        [sportsService.feedKey],
      )
    ).rows[0];

    const row = {
      ...snapshot,
      ...control,
    };

    const event = sportsService
      .rawEvents(
        'cricket',
        row,
      )
      .find(
        item =>
          String(
            item.eventId ?? item.id,
          ) === matchId,
      );

    if (
      !event ||
      event.provider !== 'sportbex'
    ) {
      throw reject(
        'Match unavailable. Refresh the match list.',
      );
    }

    return {
      event,

      state:
        sportsService.state(
          'cricket',
          row,
        ),
    };
  }

  const requestHash = body =>
    hash(
      JSON.stringify([
        String(
          body.matchId || '',
        ),

        String(
          body.marketId || '',
        ),

        String(
          body.selection || '',
        ),

        String(
          body.selectionId || '',
        ),

        String(
          body.type || '',
        ),

        Number(body.stake),

        body.expectedRate == null
          ? null
          : String(
              body.expectedRate,
            ),

        body.expectedPayoutRate == null
          ? null
          : Number(
              body.expectedPayoutRate,
            ),
      ]),
    );

  app.get(
    '/api/demo-bets/markets',
    requireCustomer,

    wrap(async (req, res) => {
      const matchId = String(
        req.query.matchId || '',
      );

      res.set(
        'Cache-Control',
        'no-store',
      );

      if (
        providerMode() &&
        matchId.startsWith(
          'sportbex_',
        )
      ) {
        const client =
          await pool.connect();

        try {
          await client.query('BEGIN');

          const {
            event,
            state,
          } = await savedProviderEvent(
            client,
            matchId,
          );

          const quotes = providerQuotes(
            event,
            state,
            sportsService.now(),
          );

          await client.query('COMMIT');

          return res.json({
            success: true,
            provider: 'sportbex',
            quotes,
            event,

            bettingAllowed:
              quotes.some(
                quote =>
                  quote.allowed,
              ),

            simulationOnly: true,
          });
        } catch (error) {
          await client.query(
            'ROLLBACK',
          );

          throw error;
        } finally {
          client.release();
        }
      }

      if (!demoMode()) {
        throw reject(
          'This match is not available for demo selections.',
        );
      }

      await sportsService.readSaved();

      const event = sportsService
        .getEvents()
        .find(
          item =>
            String(
              item.eventId ?? item.id,
            ) === matchId,
        );

      if (!event) {
        throw reject(
          'Match unavailable. Open a current match from the list.',
          404,
        );
      }

      res.json({
        success: true,

        markets:
          event.sport === 'cricket'
            ? DEMO_MARKETS
            : [],

        teams:
          teamRows(event),

        event,

        bettingAllowed:
          event.bettingAllowed,

        bettingReason:
          event.bettingReason,

        source: 'DEMO_MOCK',
      });
    }),
  );

  app.get(
    '/api/demo-bets',
    requireCustomer,

    wrap(async (req, res) => {
      const matchId = String(
        req.query.matchId || '',
      ).slice(0, 200);

      const row = (
        await pool.query(
          `
            SELECT
              c.demo_coin_balance,

              COALESCE(
                (
                  SELECT json_agg(
                    b ORDER BY
                      b.created_at DESC,
                      b.id DESC
                  )
                  FROM demo_bets b
                  WHERE b.customer_id=c.id
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
        )
      ).rows[0];

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

        balance:
          Number(
            row.demo_coin_balance,
          ),

        bets:
          row.bets.map(publicBet),
      });
    }),
  );

  app.post(
    '/api/demo-bets',
    sameOrigin,
    requireCustomer,

    wrap(async (req, res) => {
      const body = req.body || {};

      const amount =
        Number(body.stake);

      const requestKey = String(
        body.requestKey || '',
      );

      const matchId = String(
        body.matchId || '',
      );

      if (
        !Number.isSafeInteger(amount) ||
        amount < 100 ||
        amount > 25000
      ) {
        throw reject(
          'Demo risk must be 100–25,000 whole coins.',
          400,
        );
      }

      if (
        !/^[a-zA-Z0-9_-]{16,100}$/.test(
          requestKey,
        ) ||
        !matchId ||
        matchId.length > 200 ||
        typeof body.marketId !== 'string' ||
        body.marketId.length > 100 ||
        typeof body.selection !== 'string' ||
        body.selection.length > 100
      ) {
        throw reject(
          'Invalid request key or market selection.',
          400,
        );
      }

      const fingerprint =
        requestHash(body);

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
          customer.status !== 'ACTIVE'
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
              WHERE customer_id=$1
                AND request_key=$2
            `,
            [
              req.demoCustomerId,
              requestKey,
            ],
          )
        ).rows[0];

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
            Number(previous.stake) !==
              amount ||
            (
              previous.quote_hash &&
              previous.quote_hash !==
                fingerprint
            )
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

            balance:
              Number(
                customer.demo_coin_balance,
              ),

            bet:
              publicBet(previous),
          });
        }

        let event;
        let quote;

        let provider =
          'DEMO_MOCK';

        if (
          providerMode() &&
          matchId.startsWith(
            'sportbex_',
          )
        ) {
          const saved =
            await savedProviderEvent(
              client,
              matchId,
            );

          event = saved.event;

          quote = providerQuotes(
            event,
            saved.state,
            sportsService.now(),
          ).find(
            item =>
              item.marketId ===
                body.marketId &&
              item.selectionId ===
                String(
                  body.selectionId,
                ) &&
              item.selection ===
                body.selection &&
              item.type ===
                body.type,
          );

          if (!quote?.allowed) {
            throw reject(
              'Market suspended, unavailable or stale. Refresh prices.',
            );
          }

          if (
            body.expectedRate == null ||
            Number(
              body.expectedRate,
            ) !== Number(quote.rate) ||
            Number(
              body.expectedPayoutRate,
            ) !== quote.payoutRate
          ) {
            throw reject(
              'Price changed. Close the slip and select the latest price.',
            );
          }

          if (
            amount < quote.min ||
            amount > quote.max
          ) {
            throw reject(
              `Demo risk must be ${quote.min}–${quote.max} coins.`,
              400,
            );
          }

          provider =
            'SPORTBEX_DEMO';
        } else {
          if (!demoMode()) {
            throw reject(
              'This match is not available for demo selections.',
            );
          }

          event =
            await sportsService.lockBetEvent(
              client,
              matchId,
            );

          if (
            body.type === 'FANCY'
          ) {
            const item =
              event.sport === 'cricket' &&
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

            quote = {
              market:
                item.title,

              selection:
                body.selection,

              type:
                'FANCY',

              rate:
                body.selection === 'YES'
                  ? item.yes
                  : item.no,

              payoutRate: 2,
            };
          } else {
            const team =
              teamRows(event).find(
                item =>
                  item.name ===
                  body.selection,
              );

            if (
              body.marketId !==
                'match-odds' ||
              !team ||
              !['BACK', 'LAY'].includes(
                body.type,
              )
            ) {
              throw reject(
                'Invalid demo odds selection.',
                400,
              );
            }

            const rate =
              body.type === 'BACK'
                ? team.back
                : team.lay;

            quote = {
              market:
                'Match Odds',

              selection:
                body.selection,

              type:
                body.type,

              rate,

              payoutRate:
                body.type === 'BACK'
                  ? Number(rate)
                  : 1 + 1 / (
                      Number(rate) - 1
                    ),
            };
          }
        }

        const before =
          Number(
            customer.demo_coin_balance,
          );

        const after =
          before - amount;

        if (after < 0) {
          throw Object.assign(
            reject(
              'Insufficient demo balance.',
              400,
            ),
            { balance: before },
          );
        }

        const payoutRate =
          rounded(
            quote.payoutRate,
          );

        if (
          !Number.isFinite(
            payoutRate,
          ) ||
          payoutRate <= 1 ||
          payoutRate >= 100000000 ||
          !Number.isSafeInteger(
            Math.round(
              amount * payoutRate,
            ),
          ) ||
          Math.round(
            amount * payoutRate,
          ) > 2147483647
        ) {
          throw reject(
            'This quote exceeds demo payout limits.',
          );
        }

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
                balance_after,
                provider,
                selection_id,
                quote_hash
              )
              VALUES(
                $1,$2,$3,$4,$5,$6,$7,$8,$9,
                $10,$11,$12,$13,$14,$15,$16,$17
              )
              RETURNING *
            `,
            [
              req.demoCustomerId,
              requestKey,
              matchId,

              `${event.homeTeam} vs ${event.awayTeam}`
                .slice(0, 300),

              String(
                event.startTime || '',
              ).slice(0, 200),

              body.marketId,
              quote.market,
              quote.selection,
              quote.type,
              quote.rate,
              payoutRate,
              amount,
              before,
              after,
              provider,

              quote.selectionId ||
                null,

              fingerprint,
            ],
          )
        ).rows[0];

        await client.query(
          `
            UPDATE customers
            SET demo_coin_balance=$1,
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

          bet:
            publicBet(inserted),
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
