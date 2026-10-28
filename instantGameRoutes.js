import {
  createHash,
  randomInt,
} from "node:crypto";

// Original demo paytable.
// Each multiplier is TOTAL return, including stake.
// Array index = matched numbers.
export const KENO_PAYOUTS = {
  1: [0, 3],
  2: [0, 1, 8],
  3: [0, 0, 2, 20],
  4: [0, 0, 1, 5, 50],
  5: [0, 0, 0, 2, 15, 100],
  6: [0, 0, 0, 1, 5, 30, 200],
  7: [0, 0, 0, 0, 3, 15, 70, 400],
  8: [0, 0, 0, 0, 2, 8, 30, 150, 800],
  9: [
    0, 0, 0, 0, 1,
    5, 20, 80, 400, 1500,
  ],
  10: [
    0, 0, 0, 0, 1, 3,
    10, 40, 150, 800, 3000,
  ],
};

const RED_NUMBERS = [
  1, 3, 5, 8, 10, 12,
];

const GAMES = [
  "mini-roulette",
  "keno-80",
];

const MAX_BALANCE = 2147483647;

function fail(message, status = 400) {
  return Object.assign(
    new Error(message),
    { status },
  );
}

export function prepareInstantBet(
  game,
  body,
) {
  const key = body?.requestKey;

  if (
    typeof key !== "string" ||
    !/^[A-Za-z0-9_-]{16,100}$/.test(key)
  ) {
    throw fail(
      "A unique requestKey of 16-100 characters is required.",
    );
  }

  if (game === "mini-roulette") {
    const bets = body.bets;

    if (
      !Array.isArray(bets) ||
      bets.length < 1 ||
      bets.length > 18
    ) {
      throw fail(
        "Select 1-18 distinct betting areas.",
      );
    }

    const seen = new Set();

    const normalized = bets
      .map(bet => {
        const area = bet?.area;
        const amount = bet?.amount;

        const validArea =
          typeof area === "string" &&
          (
            /^n:([1-9]|1[0-2])$/.test(area) ||
            [
              "red",
              "black",
              "even",
              "odd",
              "low",
              "high",
            ].includes(area)
          );

        if (
          !validArea ||
          seen.has(area) ||
          !Number.isSafeInteger(amount) ||
          amount < 10
        ) {
          throw fail(
            "Bet areas must be distinct; each stake must be at least 10 whole demo coins.",
          );
        }

        seen.add(area);

        return { area, amount };
      })
      .sort((a, b) =>
        a.area.localeCompare(b.area),
      );

    const stake = normalized.reduce(
      (sum, bet) => sum + bet.amount,
      0,
    );

    if (
      !Number.isSafeInteger(stake) ||
      stake > 25000
    ) {
      throw fail(
        "Maximum total stake is 25000 demo coins.",
      );
    }

    return {
      key,
      stake,
      input: {
        bets: normalized,
      },
    };
  }

  if (game === "keno-80") {
    const { picks, amount } = body;

    if (
      !Array.isArray(picks) ||
      picks.length < 1 ||
      picks.length > 10 ||
      picks.some(
        number =>
          !Number.isInteger(number) ||
          number < 1 ||
          number > 80,
      ) ||
      new Set(picks).size !== picks.length
    ) {
      throw fail(
        "Select 1-10 distinct numbers from 1 to 80.",
      );
    }

    if (
      !Number.isSafeInteger(amount) ||
      amount < 10 ||
      amount > 25000
    ) {
      throw fail(
        "Stake must be 10-25000 whole demo coins.",
      );
    }

    return {
      key,
      stake: amount,
      input: {
        picks: [...picks].sort(
          (a, b) => a - b,
        ),
        amount,
      },
    };
  }

  throw fail(
    "Unknown instant game.",
    404,
  );
}

export function settleInstantBet(
  game,
  input,
  rng = randomInt,
) {
  if (game === "mini-roulette") {
    const number = rng(1, 13);

    const red =
      RED_NUMBERS.includes(number);

    const bets = input.bets.map(bet => {
      const win = bet.area.startsWith("n:")
        ? Number(bet.area.slice(2)) === number
        : {
            red,
            black: !red,
            even: number % 2 === 0,
            odd: number % 2 === 1,
            low: number <= 6,
            high: number >= 7,
          }[bet.area];

      // One number: 11x total return.
      // Six-number groups: 1.9x total return.
      const payout = win
        ? Math.floor(
            (
              bet.amount *
              (
                bet.area.startsWith("n:")
                  ? 110
                  : 19
              )
            ) / 10,
          )
        : 0;

      return {
        ...bet,
        win: Boolean(win),
        payout,
      };
    });

    return {
      number,
      color: red ? "red" : "black",
      bets,
      payout: bets.reduce(
        (sum, bet) => sum + bet.payout,
        0,
      ),
    };
  }

  if (game !== "keno-80") {
    throw fail(
      "Unknown instant game.",
      404,
    );
  }

  const bag = Array.from(
    { length: 80 },
    (_, index) => index + 1,
  );

  // Partial Fisher-Yates shuffle.
  // Twenty distinct numbers, in draw order.
  for (let index = 0; index < 20; index += 1) {
    const other = rng(index, 80);

    [bag[index], bag[other]] = [
      bag[other],
      bag[index],
    ];
  }

  const drawn = bag.slice(0, 20);

  const hits = input.picks.filter(
    number => drawn.includes(number),
  );

  const multiplier =
    KENO_PAYOUTS[input.picks.length][
      hits.length
    ];

  return {
    drawn,
    lastBall: drawn[19],
    picks: input.picks,
    hits,
    multiplier,
    payout: input.amount * multiplier,
  };
}

export async function initializeInstantGames(
  pool,
) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tsb_instant_bets (
      id BIGSERIAL PRIMARY KEY,

      customer_id INTEGER NOT NULL
        REFERENCES customers(id),

      game VARCHAR(30) NOT NULL
        CHECK (
          game IN (
            'mini-roulette',
            'keno-80'
          )
        ),

      request_key VARCHAR(100) NOT NULL,
      input JSONB NOT NULL,
      result JSONB NOT NULL,

      stake INTEGER NOT NULL
        CHECK (stake > 0),

      payout INTEGER NOT NULL
        CHECK (payout >= 0),

      created_at TIMESTAMPTZ NOT NULL
        DEFAULT NOW(),

      UNIQUE(customer_id, request_key)
    );

    CREATE INDEX IF NOT EXISTS tsb_instant_history
      ON tsb_instant_bets(
        customer_id,
        game,
        id DESC
      );
  `);
}

async function customerSession(
  pool,
  req,
) {
  const cookie = String(
    req.headers.cookie || "",
  )
    .split(";")
    .map(value => value.trim())
    .find(value =>
      value.startsWith(
        "tsb_demo_session=",
      ),
    );

  const token = cookie?.slice(
    "tsb_demo_session=".length,
  );

  if (
    !token ||
    !/^[a-f0-9]{64}$/.test(token)
  ) {
    throw fail(
      "Customer login required.",
      401,
    );
  }

  const hash = createHash("sha256")
    .update(token)
    .digest("hex");

  const result = await pool.query(
    `SELECT c.id
     FROM demo_customer_sessions s
     JOIN customers c
       ON c.id=s.customer_id
     WHERE s.token_hash=$1
       AND s.expires_at>NOW()
       AND c.status='ACTIVE'
       AND c.must_change_password=FALSE
       AND c.must_change_withdrawal_password=FALSE
     LIMIT 1`,
    [hash],
  );

  if (!result.rows[0]) {
    throw fail(
      "Login again and complete password setup.",
      401,
    );
  }

  return result.rows[0].id;
}

export function registerInstantGameRoutes(
  app,
  pool,
) {
  const wrap = handler =>
    (req, res, next) =>
      Promise.resolve(
        handler(req, res),
      ).catch(next);

  app.get(
    "/api/instant-games/:game/rules",
    wrap(async (req, res) => {
      await customerSession(pool, req);

      const game = req.params.game;

      if (!GAMES.includes(game)) {
        throw fail(
          "Unknown instant game.",
          404,
        );
      }

      res.set(
        "Cache-Control",
        "no-store",
      );

      res.json({
        success: true,
        game,
        demoOnly: true,
        minStake: 10,
        maxStake: 25000,

        payoutMeaning:
          "Total return including stake; rounded down to whole demo coins.",

        rules:
          game === "keno-80"
            ? {
                board: 80,
                drawCount: 20,
                maxPicks: 10,
                payouts: KENO_PAYOUTS,
                lastBallBetEnabled: false,
              }
            : {
                red: RED_NUMBERS,
                numberReturn: 11,
                groupReturn: 1.9,
                areas: [
                  "n:1 through n:12",
                  "red",
                  "black",
                  "even",
                  "odd",
                  "low",
                  "high",
                ],
              },
      });
    }),
  );

  app.get(
    "/api/instant-games/:game/history",
    wrap(async (req, res) => {
      const customerId =
        await customerSession(
          pool,
          req,
        );

      if (
        !GAMES.includes(req.params.game)
      ) {
        throw fail(
          "Unknown instant game.",
          404,
        );
      }

      const result = await pool.query(
        `SELECT
           id,
           game,
           input,
           result,
           stake,
           payout,
           created_at
         FROM tsb_instant_bets
         WHERE customer_id=$1
           AND game=$2
         ORDER BY id DESC
         LIMIT 50`,
        [
          customerId,
          req.params.game,
        ],
      );

      res.set(
        "Cache-Control",
        "no-store",
      );

      res.json({
        success: true,
        bets: result.rows,
      });
    }),
  );

  app.post(
    "/api/instant-games/:game/play",
    wrap(async (req, res) => {
      if (req.headers.origin) {
        let sameOrigin = false;

        try {
          sameOrigin =
            new URL(
              req.headers.origin,
            ).host === req.headers.host;
        } catch {
          sameOrigin = false;
        }

        if (!sameOrigin) {
          throw fail(
            "Invalid request origin.",
            403,
          );
        }
      }

      const game = req.params.game;

      const bet = prepareInstantBet(
        game,
        req.body,
      );

      const client =
        await pool.connect();

      let committed = false;

      try {
        await client.query("BEGIN");

        const customerId =
          await customerSession(
            client,
            req,
          );

        const locked =
          await client.query(
            `SELECT
               demo_coin_balance,
               status,
               must_change_password,
               must_change_withdrawal_password
             FROM customers
             WHERE id=$1
             FOR UPDATE`,
            [customerId],
          );

        const customer =
          locked.rows[0];

        if (
          !customer ||
          customer.status !== "ACTIVE" ||
          customer.must_change_password ||
          customer.must_change_withdrawal_password
        ) {
          throw fail(
            "Customer account cannot play.",
            403,
          );
        }

        const old = await client.query(
          `SELECT *
           FROM tsb_instant_bets
           WHERE customer_id=$1
             AND request_key=$2`,
          [
            customerId,
            bet.key,
          ],
        );

        let saved = old.rows[0];

        let balance = Number(
          customer.demo_coin_balance,
        );

        if (saved) {
          const canonical =
            saved.game === game
              ? prepareInstantBet(
                  game,
                  {
                    ...saved.input,
                    requestKey: bet.key,
                  },
                )
              : null;

          if (
            !canonical ||
            JSON.stringify(
              canonical.input,
            ) !==
              JSON.stringify(bet.input)
          ) {
            throw fail(
              "This requestKey was already used for a different bet.",
              409,
            );
          }
        } else {
          if (balance < bet.stake) {
            throw fail("LOW BALANCE");
          }

          const result =
            settleInstantBet(
              game,
              bet.input,
            );

          balance =
            balance -
            bet.stake +
            result.payout;

          if (
            !Number.isSafeInteger(
              balance,
            ) ||
            balance > MAX_BALANCE
          ) {
            throw fail(
              "Demo balance limit reached.",
            );
          }

          const inserted =
            await client.query(
              `INSERT INTO tsb_instant_bets(
                 customer_id,
                 game,
                 request_key,
                 input,
                 result,
                 stake,
                 payout
               )
               VALUES(
                 $1,$2,$3,
                 $4::JSONB,
                 $5::JSONB,
                 $6,$7
               )
               RETURNING *`,
              [
                customerId,
                game,
                bet.key,
                JSON.stringify(
                  bet.input,
                ),
                JSON.stringify(
                  result,
                ),
                bet.stake,
                result.payout,
              ],
            );

          saved =
            inserted.rows[0];

          await client.query(
            `UPDATE customers
             SET demo_coin_balance=$1,
                 updated_at=NOW()
             WHERE id=$2`,
            [
              balance,
              customerId,
            ],
          );

          await client.query(
            `INSERT INTO demo_coin_transactions(
               customer_id,
               amount,
               transaction_type,
               note
             )
             VALUES(
               $1,$2,'GAME_BET',$3
             )`,
            [
              customerId,
              -bet.stake,
              `${game} bet #${saved.id}`,
            ],
          );

          if (result.payout > 0) {
            await client.query(
              `INSERT INTO demo_coin_transactions(
                 customer_id,
                 amount,
                 transaction_type,
                 note
               )
               VALUES(
                 $1,$2,'GAME_WIN',$3
               )`,
              [
                customerId,
                result.payout,
                `${game} return #${saved.id}`,
              ],
            );
          }
        }

        await client.query("COMMIT");
        committed = true;

        res.set(
          "Cache-Control",
          "no-store",
        );

        res.json({
          success: true,

          replayed: Boolean(
            old.rows[0],
          ),

          balance,

          bet: {
            id: saved.id,
            game: saved.game,
            input: saved.input,
            result: saved.result,
            stake: saved.stake,
            payout: saved.payout,
            createdAt:
              saved.created_at,
          },
        });
      } finally {
        if (!committed) {
          await client
            .query("ROLLBACK")
            .catch(() => {});
        }

        client.release();
      }
    }),
  );
}
