// Requires Node.js 18 or newer.
// Run once: node oddspapi-test.mjs
// Reads ODDSPAPI_API_KEY from environment or local .env.
// Do not import this file into index.js.

import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const BASE = 'https://api.oddspapi.io/v4/';

const isRecord = value =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value);

const flag = value =>
  typeof value === 'boolean' ? value : null;

const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms));

export function summarizeOdds(body) {
  if (
    !isRecord(body) ||
    !isRecord(body.bookmakerOdds)
  ) {
    throw new Error(
      'Odds response has no bookmakerOdds object.',
    );
  }

  const rows = [];
  let marketCount = 0;

  const books = Object.entries(
    body.bookmakerOdds,
  ).map(([bookmaker, book]) => {
    if (!isRecord(book)) {
      return {
        bookmaker,
        invalid: true,
      };
    }

    const markets = isRecord(book.markets)
      ? Object.entries(book.markets)
      : [];

    marketCount += markets.length;

    for (const [marketId, market] of markets) {
      if (!isRecord(market)) continue;

      for (
        const [outcomeId, outcome] of
        Object.entries(market.outcomes || {})
      ) {
        for (
          const [playerId, price] of
          Object.entries(outcome?.players || {})
        ) {
          if (!isRecord(price)) continue;

          const p = price.price;
          const active = flag(price.active);
          const marketActive = flag(
            market.marketActive,
          );
          const suspended = flag(
            book.suspended,
          );

          // Missing fields remain UNKNOWN.
          const observableState =
            suspended === true
              ? 'BOOK_SUSPENDED'
              : marketActive === false
                ? 'MARKET_INACTIVE'
                : active === false
                  ? 'SELECTION_INACTIVE'
                  : suspended === false &&
                      marketActive === true &&
                      active === true
                    ? 'ACTIVE_SNAPSHOT'
                    : 'UNKNOWN';

          rows.push({
            bookmaker,
            marketId,
            outcomeId,
            playerId,

            bookmakerOutcomeId:
              price.bookmakerOutcomeId ?? null,

            playerName:
              price.playerName ?? null,

            price:
              typeof p === 'number' &&
              Number.isFinite(p)
                ? p
                : null,

            suspended,
            marketActive,
            active,
            observableState,

            changedAt:
              price.changedAt ?? null,

            bookmakerChangedAt:
              price.bookmakerChangedAt ?? null,

            exchangeMetadataPresent:
              isRecord(price.exchangeMeta) &&
              Object.keys(price.exchangeMeta)
                .length > 0,
          });
        }
      }
    }

    return {
      bookmaker,
      suspended: flag(book.suspended),
      marketCount: markets.length,
    };
  });

  return {
    fixtureId: body.fixtureId ?? null,
    statusId: body.statusId ?? null,
    statusName: body.statusName ?? null,
    providerUpdatedAt: body.updatedAt ?? null,

    books,
    marketCount,
    selectionCount: rows.length,

    selections: rows.slice(0, 40),
    selectionsTruncated: rows.length > 40,

    note:
      'One snapshot only. No suspension timing, fancy format or betting permission inferred. Market/outcome IDs need the provider market dictionary.',
  };
}

export async function runDiagnostic({
  apiKey,
  fetcher = fetch,
  now = () => Date.now(),
  wait = sleep,
  scores = false,
} = {}) {
  if (!apiKey?.trim()) {
    throw new Error(
      'ODDSPAPI_API_KEY is missing. Set it in the server environment or in .env.',
    );
  }

  const key = apiKey.trim();

  const report = {
    provider: 'oddspapi',
    test: 'ONE_SHOT',
    requestsSent: 0,
    steps: [],
  };

  const redact = text =>
    String(text)
      .split(key)
      .join('[REDACTED]')
      .split(encodeURIComponent(key))
      .join('[REDACTED]');

  const finish = () =>
    JSON.parse(
      redact(JSON.stringify(report)),
    );

  const get = async (
    endpoint,
    params = {},
  ) => {
    if (report.requestsSent >= 4) {
      throw new Error(
        'Diagnostic request limit reached.',
      );
    }

    if (report.requestsSent) {
      await wait(2100);
    }

    const url = new URL(endpoint, BASE);

    url.searchParams.set('apiKey', key);
    url.searchParams.set('language', 'en');

    for (
      const [name, value] of
      Object.entries(params)
    ) {
      url.searchParams.set(
        name,
        String(value),
      );
    }

    const controller =
      new AbortController();

    const timer = setTimeout(
      () => controller.abort(),
      15000,
    );

    const started = now();

    report.requestsSent++;

    try {
      const response = await fetcher(url, {
        signal: controller.signal,
        redirect: 'error',
        headers: {
          Accept: 'application/json',
        },
      });

      report.steps.push({
        endpoint,
        httpStatus: response.status,
        roundTripMs: now() - started,
      });

      if (!response.ok) {
        // Provider bodies may echo the API key.
        // Therefore they are not printed.
        const explanation =
          {
            400:
              'Request rejected; check endpoint parameters.',
            401:
              'Authentication rejected.',
            403:
              'Access denied; this key or plan may lack this resource.',
            429:
              'Quota or rate limit reached. No automatic retry.',
          }[response.status] ||
          'Provider returned an error. No automatic retry.';

        throw new Error(
          `HTTP ${response.status}: ${explanation}`,
        );
      }

      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    const sports = await get('sports');

    if (!Array.isArray(sports)) {
      throw new Error(
        'Unexpected sports response shape; expected an array.',
      );
    }

    report.sportsReturned = sports.map(
      sport => ({
        sportId: sport.sportId,
        name: sport.sportName,
        slug: sport.slug,
      }),
    );

    const cricket = sports.find(
      sport =>
        String(sport.slug).toLowerCase() ===
          'cricket' ||
        String(
          sport.sportName,
        ).toLowerCase() === 'cricket',
    );

    if (cricket?.sportId == null) {
      report.result =
        'CRICKET_NOT_RETURNED';

      report.nextStep =
        'Ask provider whether Cricket is included for this key. No other sport is substituted.';

      return finish();
    }

    report.cricketSportId =
      cricket.sportId;

    // Test upcoming fixtures first.
    // The account screenshot showed no live access.
    const fixtures = await get(
      'fixtures',
      {
        sportId: cricket.sportId,
        statusId: 0,

        from: new Date(
          now(),
        ).toISOString(),

        to: new Date(
          now() + 7 * 86400000,
        ).toISOString(),
      },
    );

    if (!Array.isArray(fixtures)) {
      throw new Error(
        'Unexpected fixtures response shape; expected an array.',
      );
    }

    report.fixturesReturned =
      fixtures.length;

    report.fixturesSample = fixtures
      .slice(0, 10)
      .map(fixture => ({
        fixtureId: fixture.fixtureId,
        homeTeam: fixture.participant1Name,
        awayTeam: fixture.participant2Name,
        tournament: fixture.tournamentName,
        startTime: fixture.startTime,
        statusId: fixture.statusId,
        statusName: fixture.statusName,
        hasOdds: fixture.hasOdds,
      }));

    const fixture = fixtures.find(
      item =>
        item.fixtureId &&
        item.hasOdds === true,
    );

    if (!fixture) {
      report.result = fixtures.length
        ? 'FIXTURES_FOUND_NO_ODDS_FLAG'
        : 'NO_UPCOMING_FIXTURES_IN_WINDOW';

      report.nextStep =
        'This does not prove no coverage. Ask provider which cricket fixture has odds accessible to this Free key.';

      return finish();
    }

    const odds = await get('odds', {
      fixtureId: fixture.fixtureId,
      oddsFormat: 'decimal',
      verbosity: 3,
    });

    if (
      odds?.fixtureId !== fixture.fixtureId
    ) {
      throw new Error(
        'Returned odds fixture ID does not match requested fixture.',
      );
    }

    report.odds = summarizeOdds(odds);

    report.result =
      report.odds.selectionCount
        ? 'PREMATCH_ODDS_RETURNED'
        : 'ODDS_EMPTY_FOR_THIS_KEY_AND_FIXTURE';

    if (scores) {
      const data = await get('scores', {
        fixtureId: fixture.fixtureId,
      });

      if (
        !isRecord(data) ||
        data.fixtureId !==
          fixture.fixtureId ||
        !isRecord(data.scores)
      ) {
        throw new Error(
          'Unexpected scores response shape.',
        );
      }

      report.scores = {
        fixtureId: data.fixtureId,

        periods: Object.entries(
          data.scores,
        )
          .slice(0, 12)
          .map(([period, score]) => ({
            period,

            participant1Score:
              score?.participant1Score ??
              null,

            participant2Score:
              score?.participant2Score ??
              null,

            updatedAt:
              score?.updatedAt ?? null,
          })),
      };

      report.scoreNote =
        'An upcoming fixture may have empty scores. This does not verify cricket ball-by-ball coverage.';
    }

    report.nextStep =
      'Share this report. Live/WebSocket access, market names and suspension timing still require verification. This test does not connect the website.';
  } catch (error) {
    report.result = 'TEST_STOPPED';

    report.error =
      error?.name === 'AbortError'
        ? 'Request timed out; no retry.'
        : error instanceof SyntaxError
          ? 'Provider response was not valid JSON.'
          : /^HTTP |^Unexpected |^Returned |^Odds response |^Diagnostic /.test(
                error?.message || '',
              )
            ? redact(error.message)
            : 'Request failed; no automatic retry. Check network and provider availability.';
  }

  return finish();
}

async function loadKey() {
  if (
    process.env.ODDSPAPI_API_KEY?.trim()
  ) {
    return process.env
      .ODDSPAPI_API_KEY
      .trim();
  }

  try {
    const content = await readFile(
      new URL(
        '.env',
        pathToFileURL(
          process.cwd() + '/',
        ),
      ),
      'utf8',
    );

    const match = content.match(
      /^\s*(?:export\s+)?ODDSPAPI_API_KEY\s*=\s*(.*?)\s*$/m,
    );

    if (!match) return '';

    const value = match[1];

    if (
      (value.startsWith('"') &&
        value.endsWith('"')) ||
      (value.startsWith("'") &&
        value.endsWith("'"))
    ) {
      return value.slice(1, -1);
    }

    return value
      .replace(/\s+#.*$/, '')
      .trim();
  } catch (error) {
    if (error.code === 'ENOENT') {
      return '';
    }

    throw new Error(
      'Unable to read .env.',
    );
  }
}

async function selfTest() {
  const { strict: assert } =
    await import('node:assert');

  const body = {
    fixtureId: 'match1',

    bookmakerOdds: {
      sample: {
        suspended: false,

        markets: {
          '101': {
            marketActive: true,

            outcomes: {
              home: {
                players: {
                  '0': {
                    active: true,
                    price: 1.9,
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  assert.equal(
    summarizeOdds(body)
      .selections[0]
      .observableState,
    'ACTIVE_SNAPSHOT',
  );

  body.bookmakerOdds
    .sample.suspended = true;

  assert.equal(
    summarizeOdds(body)
      .selections[0]
      .observableState,
    'BOOK_SUSPENDED',
  );

  delete body.bookmakerOdds
    .sample.suspended;

  assert.equal(
    summarizeOdds(body)
      .selections[0]
      .observableState,
    'UNKNOWN',
  );

  body.bookmakerOdds.sample
    .markets['101']
    .marketActive = false;

  assert.equal(
    summarizeOdds(body)
      .selections[0]
      .observableState,
    'MARKET_INACTIVE',
  );

  const queue = [
    [
      {
        sportId: 77,
        slug: 'cricket',
      },
    ],
    [
      {
        fixtureId: 'match1',
        hasOdds: true,
      },
    ],
    body,
  ];

  let calls = 0;

  const result = await runDiagnostic({
    apiKey: 'test-secret',
    wait: async () => {},
    now: () => 1800000000000,

    fetcher: async url => {
      assert.equal(
        url.origin,
        'https://api.oddspapi.io',
      );

      assert.equal(
        url.searchParams.get('apiKey'),
        'test-secret',
      );

      if (calls === 1) {
        assert.equal(
          url.searchParams.get('sportId'),
          '77',
        );

        assert.equal(
          url.searchParams.get('statusId'),
          '0',
        );
      }

      const data = queue[calls++];

      return {
        ok: true,
        status: 200,
        json: async () => data,
      };
    },
  });

  assert.equal(
    result.requestsSent,
    3,
  );

  assert.equal(
    result.result,
    'PREMATCH_ODDS_RETURNED',
  );

  const empty = await runDiagnostic({
    apiKey: 'x',

    fetcher: async () => ({
      ok: true,
      status: 200,
      json: async () => [],
    }),
  });

  assert.equal(
    empty.requestsSent,
    1,
  );

  assert.equal(
    empty.result,
    'CRICKET_NOT_RETURNED',
  );

  for (
    const status of
    [401, 403, 429, 500]
  ) {
    const failed = await runDiagnostic({
      apiKey: 'secret',

      fetcher: async () => ({
        ok: false,
        status,
      }),
    });

    assert.equal(
      failed.requestsSent,
      1,
    );

    assert.equal(
      failed.result,
      'TEST_STOPPED',
    );
  }

  const leaked = await runDiagnostic({
    apiKey: 'hide-me',

    fetcher: async () => ({
      ok: true,
      status: 200,

      json: async () => [
        {
          sportName: 'hide-me',
        },
      ],
    }),
  });

  assert.ok(
    !JSON.stringify(leaked)
      .includes('hide-me'),
  );

  await assert.rejects(
    runDiagnostic({
      apiKey: '',
    }),
    /missing/,
  );

  console.log(
    'Offline tests passed. No real API requests were made.',
  );
}

if (
  process.argv[1] &&
  pathToFileURL(
    process.argv[1],
  ).href === import.meta.url
) {
  try {
    if (
      process.argv.includes(
        '--self-test',
      )
    ) {
      await selfTest();
    } else {
      const report =
        await runDiagnostic({
          apiKey: await loadKey(),

          scores:
            process.argv.includes(
              '--scores',
            ),
        });

      console.log(
        JSON.stringify(
          report,
          null,
          2,
        ),
      );

      if (
        report.result ===
        'TEST_STOPPED'
      ) {
        process.exitCode = 1;
      }
    }
  } catch {
    console.error(
      'Set ODDSPAPI_API_KEY in your environment or local .env file, then run again. Do not paste your key into chat.',
    );

    process.exitCode = 1;
  }
}
