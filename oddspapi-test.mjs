// Node.js 18+. Run once; do not import into index.js.
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
    throw new Error('Invalid odds response.');
  }

  const rows = [];
  let marketCount = 0;

  const books = Object.entries(
    body.bookmakerOdds,
  ).map(([bookmaker, book]) => {
    if (!isRecord(book)) {
      return { bookmaker, invalid: true };
    }

    const markets = isRecord(book.markets)
      ? Object.entries(book.markets)
      : [];

    marketCount += markets.length;

    for (const [marketId, market] of markets) {
      if (!isRecord(market)) continue;

      for (const [outcomeId, outcome] of
        Object.entries(market.outcomes || {})) {
        for (const [playerId, price] of
          Object.entries(outcome?.players || {})) {
          if (!isRecord(price)) continue;

          const suspended = flag(book.suspended);
          const marketActive = flag(
            market.marketActive,
          );
          const active = flag(price.active);

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
            price:
              typeof price.price === 'number' &&
              Number.isFinite(price.price)
                ? price.price
                : null,
            suspended,
            marketActive,
            active,
            observableState,
            changedAt: price.changedAt ?? null,
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
    selections: rows.slice(0, 6),
    selectionsTruncated: rows.length > 6,
    note:
      'Snapshot only. Market counts include bookmaker duplicates. Market IDs need the provider dictionary.',
  };
}

// This checks names only, not whether a match is real.
export function simulated(fixture) {
  return /\bsrl\b|simulated|virtual|\be-?cricket\b/i.test(
    [
      fixture.participant1Name,
      fixture.participant2Name,
      fixture.tournamentName,
      fixture.tournamentSlug,
      fixture.categoryName,
      fixture.categorySlug,
    ].join(' '),
  );
}

function fixtureSummary(fixture) {
  return {
    fixtureId: fixture.fixtureId,
    homeTeam: fixture.participant1Name,
    awayTeam: fixture.participant2Name,
    tournament: fixture.tournamentName,
    startTime: fixture.startTime,
    statusId: fixture.statusId,
    statusName: fixture.statusName,
    hasOdds: fixture.hasOdds,
    classification:
      'NO_SIMULATION_LABEL_FOUND_UNVERIFIED',
  };
}

export async function runDiagnostic({
  apiKey,
  fetcher = fetch,
  now = () => Date.now(),
  wait = sleep,
} = {}) {
  if (!apiKey?.trim()) {
    throw new Error('Missing API key.');
  }

  const key = apiKey.trim();

  const report = {
    test: 'LIVE_AND_NON_SRL_V2',
    requestsSent: 0,
    steps: [],
  };

  const clean = () =>
    JSON.parse(
      JSON.stringify(report)
        .split(key)
        .join('[REDACTED]')
        .split(encodeURIComponent(key))
        .join('[REDACTED]'),
    );

  async function get(endpoint, params = {}) {
    if (report.requestsSent >= 4) {
      throw new Error('Request limit reached.');
    }

    if (report.requestsSent) {
      await wait(2100);
    }

    const url = new URL(endpoint, BASE);
    url.searchParams.set('apiKey', key);
    url.searchParams.set('language', 'en');

    for (const [name, value] of
      Object.entries(params)) {
      url.searchParams.set(name, String(value));
    }

    const controller = new AbortController();

    const timer = setTimeout(
      () => controller.abort(),
      15000,
    );

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
        statusId: params.statusId ?? null,
        httpStatus: response.status,
      });

      if (!response.ok) {
        throw Object.assign(
          new Error(`HTTP ${response.status}`),
          { httpStatus: response.status },
        );
      }

      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  try {
    const sports = await get('sports');

    if (!Array.isArray(sports)) {
      throw new Error('Unexpected sports data.');
    }

    const cricket = sports.find(
      sport =>
        String(sport.slug).toLowerCase() ===
          'cricket' ||
        String(sport.sportName).toLowerCase() ===
          'cricket',
    );

    if (cricket?.sportId == null) {
      report.result = 'CRICKET_NOT_RETURNED';
      return clean();
    }

    const params = {
      sportId: cricket.sportId,
      from: new Date(
        now() - 2 * 86400000,
      ).toISOString(),
      to: new Date(
        now() + 7 * 86400000,
      ).toISOString(),
    };

    let chosen;
    let chosenLive = false;

    // First live, then upcoming if needed.
    for (const statusId of [1, 0]) {
      const label =
        statusId === 1 ? 'live' : 'upcoming';

      let fixtures;

      try {
        fixtures = await get('fixtures', {
          ...params,
          statusId,
        });
      } catch (error) {
        if (
          statusId === 1 &&
          error.httpStatus === 403
        ) {
          report.live = {
            result: 'HTTP_403_LIVE_LIST_DENIED',
          };
          continue;
        }

        throw error;
      }

      if (!Array.isArray(fixtures)) {
        throw new Error(
          'Unexpected fixtures data.',
        );
      }

      const candidates = fixtures.filter(
        fixture =>
          isRecord(fixture) &&
          !simulated(fixture),
      );

      report[label] = {
        returned: fixtures.length,
        excludedSimulationLabels:
          fixtures.length - candidates.length,
        unverifiedNonSRL: candidates.length,
        sample: candidates
          .slice(0, 3)
          .map(fixtureSummary),
      };

      chosen = candidates.find(
        fixture =>
          fixture.fixtureId &&
          fixture.hasOdds === true &&
          Number(fixture.statusId) === statusId,
      );

      if (chosen) {
        chosenLive = statusId === 1;
        break;
      }
    }

    if (!chosen) {
      report.result =
        'NO_NON_SRL_FIXTURE_WITH_ODDS_FOUND';

      report.note =
        'Only this response/window was checked; not proof of no real cricket coverage.';

      return clean();
    }

    report.selectedMatch =
      fixtureSummary(chosen);

    const body = await get('odds', {
      fixtureId: chosen.fixtureId,
      oddsFormat: 'decimal',
      verbosity: 3,
    });

    if (
      String(body?.fixtureId) !==
      String(chosen.fixtureId)
    ) {
      throw new Error('Fixture ID mismatch.');
    }

    report.odds = summarizeOdds(body);

    report.result =
      !report.odds.selectionCount
        ? 'ODDS_EMPTY'
        : chosenLive &&
            Number(body.statusId) === 1
          ? 'LIVE_ODDS_SNAPSHOT_RETURNED'
          : !chosenLive &&
              Number(body.statusId) === 0
            ? 'PREMATCH_ODDS_SNAPSHOT_RETURNED'
            : 'ODDS_RETURNED_RECHECK_MATCH_STATUS';

    report.note =
      'REST snapshot only. No WebSocket, pre-ball timing, fancy/back-lay or website integration verified.';
  } catch (error) {
    report.result = 'TEST_STOPPED';

    report.error = error.httpStatus
      ? `HTTP ${error.httpStatus}; no retry.`
      : error.name === 'AbortError'
        ? 'Request timed out; no retry.'
        : 'Request or response validation failed; no retry.';
  }

  return clean();
}

async function loadKey() {
  if (
    process.env.ODDSPAPI_API_KEY?.trim()
  ) {
    return process.env.ODDSPAPI_API_KEY.trim();
  }

  try {
    const content = await readFile(
      new URL(
        '.env',
        pathToFileURL(process.cwd() + '/'),
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
    if (error.code === 'ENOENT') return '';
    throw new Error('Unable to read .env.');
  }
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href ===
    import.meta.url
) {
  try {
    const report = await runDiagnostic({
      apiKey: await loadKey(),
    });

    for (const [section, value] of
      Object.entries(report)) {
      console.log(
        `ODDSPAPI_V2 ${section}: ${JSON.stringify(value)}`,
      );
    }

    if (report.result === 'TEST_STOPPED') {
      process.exitCode = 1;
    }
  } catch {
    console.error(
      'ODDSPAPI_V2: Set ODDSPAPI_API_KEY privately in server Environment.',
    );
    process.exitCode = 1;
  }
}
