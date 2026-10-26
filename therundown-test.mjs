// Node.js 18+. One-shot only.
// Never import this file into index.js.
import { pathToFileURL } from 'node:url';

const BASE = 'https://therundown.io/api/v2/';
const array = value =>
  Array.isArray(value) ? value : [];

const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms));

export function summarizeEvent(event) {
  const markets = array(event.markets);
  const prices = [];
  let priceRowsReturned = 0;

  for (const market of markets) {
    for (const participant of
      array(market.participants)) {
      for (const line of
        array(participant.lines)) {
        for (const [affiliateId, price] of
          Object.entries(line.prices || {})) {
          if (
            !price ||
            typeof price !== 'object'
          ) {
            continue;
          }

          priceRowsReturned++;

          if (prices.length < 6) {
            prices.push({
              marketId: market.market_id,
              marketName: market.name ?? null,
              participantId: participant.id,
              affiliateId,
              lineValue: line.value ?? null,
              americanPrice: price.price ?? null,
              closedAt:
                price.closed_at ??
                line.closed_at ??
                null,
              updatedAt: price.updated_at ?? null,
            });
          }
        }
      }
    }
  }

  return {
    eventId: event.event_id,
    teams: array(event.teams).map(
      team => team.name,
    ),
    startTime: event.event_date ?? null,
    league:
      event.schedule?.league_name ?? null,
    eventStatus:
      event.score?.event_status ?? null,
    markets: markets.map(market => ({
      id: market.market_id,
      name: market.name ?? null,
    })),
    priceRowsReturned,
    prices,
  };
}

export async function runDiagnostic({
  apiKey = process.env.THERUNDOWN_API_KEY,
  fetcher = fetch,
  now = () => Date.now(),
  wait = sleep,
} = {}) {
  const key = String(apiKey || '').trim();

  if (!key) {
    throw new Error('Missing key.');
  }

  const report = {
    test: 'T20_MARKET_DISCOVERY_V2',
    requestsSent: 0,
    steps: [],
    checks: [],
    reportedDataPoints: 0,
  };

  const finish = () =>
    JSON.parse(
      JSON.stringify(report)
        .split(key)
        .join('[REDACTED]')
        .split(encodeURIComponent(key))
        .join('[REDACTED]'),
    );

  async function get(endpoint, params = {}) {
    if (report.requestsSent >= 6) {
      throw new Error('Request limit.');
    }

    if (report.requestsSent) {
      await wait(1200);
    }

    const url = new URL(endpoint, BASE);

    for (const [name, value] of
      Object.entries(params)) {
      url.searchParams.set(
        name,
        String(value),
      );
    }

    const controller = new AbortController();

    const timer = setTimeout(
      () => controller.abort(),
      20000,
    );

    report.requestsSent++;

    try {
      const response = await fetcher(url, {
        signal: controller.signal,
        redirect: 'error',
        headers: {
          'X-TheRundown-Key': key,
          Accept: 'application/json',
        },
      });

      const billed = response.headers.get(
        'X-Datapoints',
      );

      report.steps.push({
        endpoint,
        httpStatus: response.status,
        billedDataPoints: billed,
        dataDelaySeconds:
          response.headers.get(
            'X-Data-Delay-Seconds',
          ),
      });

      if (
        billed !== null &&
        Number.isFinite(Number(billed))
      ) {
        report.reportedDataPoints +=
          Math.max(0, Number(billed));
      }

      if (!response.ok) {
        throw Object.assign(
          new Error('HTTP error.'),
          { status: response.status },
        );
      }

      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  try {
    // ID 21 came from the previous catalog test.
    report.sport = {
      sportId: 21,
      name: 'T20',
    };

    const today = new Date(now())
      .toISOString()
      .slice(0, 10);

    const datesBody = await get(
      'sports/21/dates',
    );

    if (!Array.isArray(datesBody?.dates)) {
      throw new Error('Invalid dates.');
    }

    const dates = [
      ...new Set(
        datesBody.dates
          .filter(
            date => typeof date === 'string',
          )
          .map(date => date.slice(0, 10))
          .filter(
            date =>
              /^\d{4}-\d{2}-\d{2}$/.test(
                date,
              ) && date >= today,
          ),
      ),
    ].sort();

    report.dateChecked = dates[0] ?? null;

    if (!dates.length) {
      report.result =
        'NO_TODAY_OR_FUTURE_DATE_RETURNED';

      return finish();
    }

    const listing = await get(
      `sports/21/events/${dates[0]}`,
      {
        // Schedule/scores only at this step.
        affiliate_ids: '0',
      },
    );

    if (!Array.isArray(listing?.events)) {
      throw new Error('Invalid events.');
    }

    report.eventsReturned =
      listing.events.length;

    const candidates = listing.events
      .filter(
        event =>
          typeof event.event_id ===
            'string' &&
          Number(event.sport_id) === 21 &&
          event.score?.event_status ===
            'STATUS_SCHEDULED' &&
          Date.parse(event.event_date) >
            now() &&
          !/\bsrl\b|simulated|virtual/i.test(
            JSON.stringify([
              array(event.teams).map(
                team => team.name,
              ),
              event.schedule,
            ]),
          ),
      )
      .sort(
        (a, b) =>
          Date.parse(a.event_date) -
          Date.parse(b.event_date),
      );

    report.upcomingCandidates =
      candidates.length;

    for (const event of
      candidates.slice(0, 2)) {
      if (
        report.reportedDataPoints >= 1000
      ) {
        break;
      }

      const check = {
        eventId: event.event_id,
        teams: array(event.teams).map(
          team => team.name,
        ),
        startTime: event.event_date,
        league:
          event.schedule?.league_name ??
          null,
      };

      report.checks.push(check);

      const path =
        `events/${encodeURIComponent(
          event.event_id,
        )}`;

      const catalog = await get(
        `${path}/markets`,
      );

      if (!Array.isArray(catalog)) {
        throw new Error(
          'Invalid market catalog.',
        );
      }

      check.marketsReturned =
        catalog.length;

      check.marketSample = catalog
        .slice(0, 25)
        .map(market => ({
          id: market.id,
          name: market.name,
          periodId:
            market.period_id ?? null,
        }));

      // Only main prematch markets.
      // Catalog presence is not proof of access.
      const ids = [
        ...new Set(
          catalog
            .map(market => Number(market.id))
            .filter(id =>
              [1, 2, 3].includes(id),
            ),
        ),
      ];

      check.requestedMarketIds = ids;

      if (!ids.length) {
        check.result =
          'NO_CORE_PREMATCH_MARKETS_LISTED';

        continue;
      }

      if (
        report.reportedDataPoints >= 1000
      ) {
        break;
      }

      const odds = await get(path, {
        market_ids: ids.join(','),
        affiliate_ids: '3,19,23',
        main_line: true,
        hide_closed: true,
      });

      if (!Array.isArray(odds?.events)) {
        throw new Error('Invalid odds.');
      }

      const matched = odds.events.find(
        item =>
          item.event_id === event.event_id,
      );

      if (!matched) {
        check.result =
          'REQUESTED_EVENT_NOT_RETURNED';

        continue;
      }

      if (
        Number(matched.sport_id) !== 21
      ) {
        throw new Error('Sport mismatch.');
      }

      check.odds =
        summarizeEvent(matched);

      check.result =
        check.odds.priceRowsReturned > 0
          ? 'PRICE_ROWS_RETURNED'
          : 'NO_OPEN_MAIN_PRICES_FOR_FREE_BOOKS';

      if (
        check.odds.priceRowsReturned > 0
      ) {
        break;
      }
    }

    report.result = report.checks.some(
      check =>
        check.odds?.priceRowsReturned > 0,
    )
      ? 'PREMATCH_PRICE_ROWS_RETURNED'
      : candidates.length
        ? 'NO_PRICES_IN_CHECKED_SCOPE'
        : 'NO_FUTURE_SCHEDULED_T20_EVENTS_ON_DATE';

    report.note =
      'At most two future matches on one T20 date. Catalog entries do not prove Free-plan price entitlement. Only main prematch IDs 1,2,3 and books 3,19,23 were eligible. No real-time, fancy, back/lay, suspension timing or website connection verified. Prices are American. Missing closedAt does not prove an active market.';
  } catch (error) {
    report.result = 'TEST_STOPPED';

    report.error = error.status
      ? `HTTP ${error.status}; no retry.`
      : error.name === 'AbortError'
        ? 'Timeout; no retry.'
        : 'Request or response validation failed; no retry.';
  }

  return finish();
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href ===
    import.meta.url
) {
  try {
    const report = await runDiagnostic();

    for (const [section, value] of
      Object.entries(report)) {
      if (section === 'checks') {
        for (const check of value) {
          console.log(
            `RUNDOWN_V2 check: ${JSON.stringify(check)}`,
          );
        }
      } else {
        console.log(
          `RUNDOWN_V2 ${section}: ${JSON.stringify(value)}`,
        );
      }
    }

    if (
      report.result === 'TEST_STOPPED'
    ) {
      process.exitCode = 1;
    }
  } catch {
    console.error(
      'RUNDOWN_V2: THERUNDOWN_API_KEY missing. Set it privately in Environment.',
    );

    process.exitCode = 1;
  }
}
