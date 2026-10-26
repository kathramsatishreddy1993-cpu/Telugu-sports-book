// Node.js 18+. Run once. Do not import into index.js.
import { pathToFileURL } from 'node:url';

const BASE = 'https://therundown.io/api/v2/';
const array = value =>
  Array.isArray(value) ? value : [];

const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms));

function summarizeEvent(event) {
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

async function runDiagnostic() {
  const key = String(
    process.env.THERUNDOWN_API_KEY || '',
  ).trim();

  if (!key) {
    throw new Error('Missing key.');
  }

  const report = {
    test: 'CRICKET_FREE_SNAPSHOT',
    requestsSent: 0,
    steps: [],
    cricketCatalog: [],
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
    if (report.requestsSent >= 5) {
      throw new Error('Request limit.');
    }

    if (report.requestsSent) {
      await sleep(1200);
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
      const response = await fetch(url, {
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

      const delay = response.headers.get(
        'X-Data-Delay-Seconds',
      );

      report.steps.push({
        endpoint,
        httpStatus: response.status,
        billedDataPoints: billed,
        dataDelaySeconds: delay,
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
          new Error('Provider HTTP error.'),
          { status: response.status },
        );
      }

      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  try {
    const body = await get('sports');

    if (!Array.isArray(body?.sports)) {
      throw new Error(
        'Invalid sports response.',
      );
    }

    report.cricketCatalog = body.sports
      .filter(sport =>
        /cricket|\bipl\b|\bt20\b/i.test(
          String(sport.sport_name || ''),
        ),
      )
      .map(sport => ({
        sportId: sport.sport_id,
        name: sport.sport_name,
      }));

    if (!report.cricketCatalog.length) {
      report.result =
        'CRICKET_NOT_FOUND_IN_CATALOG';

      return finish();
    }

    const today = new Date()
      .toISOString()
      .slice(0, 10);

    for (const sport of
      report.cricketCatalog.slice(0, 2)) {
      if (
        !/^\d+$/.test(String(sport.sportId))
      ) {
        throw new Error('Invalid sport ID.');
      }

      if (
        report.reportedDataPoints >= 1000
      ) {
        break;
      }

      const datesBody = await get(
        `sports/${sport.sportId}/dates`,
      );

      if (
        !Array.isArray(datesBody?.dates)
      ) {
        throw new Error(
          'Invalid dates response.',
        );
      }

      const dates = [
        ...new Set(
          datesBody.dates
            .filter(
              date =>
                typeof date === 'string',
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

      const check = {
        ...sport,
        upcomingDates: dates.slice(0, 3),
      };

      report.checks.push(check);

      if (!dates.length) {
        check.result =
          'NO_TODAY_OR_FUTURE_DATE_RETURNED';

        continue;
      }

      if (
        report.reportedDataPoints >= 1000
      ) {
        break;
      }

      const eventsBody = await get(
        `sports/${sport.sportId}/events/${dates[0]}`,
        {
          market_ids: '1',
          affiliate_ids: '3,19,23',
          main_line: true,
          hide_closed: true,
        },
      );

      if (
        !Array.isArray(eventsBody?.events)
      ) {
        throw new Error(
          'Invalid events response.',
        );
      }

      check.dateChecked = dates[0];

      check.eventsReturned =
        eventsBody.events.length;

      const summaries =
        eventsBody.events.map(
          summarizeEvent,
        );

      check.eventsWithPrices =
        summaries.filter(
          event =>
            event.priceRowsReturned > 0,
        ).length;

      check.sample = summaries
        .filter(
          event =>
            event.priceRowsReturned > 0,
        )
        .slice(0, 3);

      if (!check.sample.length) {
        check.sample =
          summaries.slice(0, 3);
      }

      check.result =
        check.eventsWithPrices
          ? 'PREMATCH_PRICE_ROWS_RETURNED'
          : check.eventsReturned
            ? 'EVENTS_RETURNED_NO_PRICES_IN_REQUESTED_SCOPE'
            : 'NO_EVENTS_ON_CHECKED_DATE';
    }

    report.result = report.checks.some(
      check => check.eventsWithPrices > 0,
    )
      ? 'PREMATCH_ODDS_SNAPSHOT_RETURNED'
      : 'NO_PRICES_FOUND_IN_LIMITED_CHECK';

    report.note =
      'Limited check: up to two cricket catalog entries, one date each, market 1, books 3,19,23. Empty results do not prove no coverage. Closed rows filtered out. Prices are American format. Live timing, fancy, back/lay, ball-by-ball and website integration are not verified.';
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
            `RUNDOWN_TEST check: ${JSON.stringify(check)}`,
          );
        }
      } else {
        console.log(
          `RUNDOWN_TEST ${section}: ${JSON.stringify(value)}`,
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
      'RUNDOWN_TEST: THERUNDOWN_API_KEY missing. Set it privately in Environment.',
    );

    process.exitCode = 1;
  }
}
