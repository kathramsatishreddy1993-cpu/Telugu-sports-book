import {
  SportsService as ExistingSportsService,
  SPORTS,
  canonicalSport,
} from './sportsService.previous.js';

export { SPORTS, canonicalSport };

const BASE = 'https://trial-api.sportbex.com/api';

const list = value => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;

  throw new Error('Sportbex invalid list response');
};

const number = value => {
  if (value == null || value === '') return null;

  const result = Number(value);

  return Number.isFinite(result) ? result : null;
};

const positive = value => {
  const result = number(value);
  return result > 0 ? result : null;
};

const text = value =>
  typeof value === 'string' ? value.slice(0, 200) : '';

const id = value =>
  /^\d+$/.test(String(value ?? '')) ? String(value) : null;

const stamp = value => value ? Date.parse(value) : NaN;

const teamName = value =>
  text(typeof value === 'object' ? value?.name : value);

const teamKey = value =>
  value.toLowerCase().replace(/[^a-z0-9]/g, '');

function matchedScore(rows, event) {
  const names = event.name
    .split(/\s+v(?:s\.?)?\s+/i)
    .map(teamKey);

  const candidates = rows.filter(row => {
    const a = teamName(
      row.homeTeam ?? row.team1 ?? row.teama,
    );

    const b = teamName(
      row.awayTeam ?? row.team2 ?? row.teamb,
    );

    const date = stamp(
      row.startTime ?? row.startDate ?? row.date_start,
    );

    return (
      a &&
      b &&
      Number.isFinite(date) &&
      Math.abs(date - stamp(event.startTime)) < 900000 &&
      [teamKey(a), teamKey(b)].sort().join('|') ===
        [...names].sort().join('|')
    );
  });

  // Statistics IDs and exchange event IDs are different.
  // Match scores only when teams and start time agree.
  if (candidates.length !== 1) return null;

  const row = candidates[0];

  return typeof row.score === 'string' && row.score.trim()
    ? text(row.score)
    : null;
}

const configurationNumber = (
  value,
  fallback,
  minimum,
  maximum,
) => {
  const parsed = Number(value);

  return (
    Number.isFinite(parsed) &&
    parsed >= minimum &&
    parsed <= maximum
  )
    ? parsed
    : fallback;
};

export class SportsService extends ExistingSportsService {
  constructor(options = {}) {
    super(options);

    this.sportbex =
      this.mode === 'live' &&
      String(process.env.SPORTS_API_PROVIDER || '')
        .toLowerCase() === 'sportbex';

    if (!this.sportbex) return;

    this.apiKey = String(
      process.env.SPORTBEX_API_KEY || '',
    ).trim();

    this.feedKey = 'sportbex:trial:v1';

    this.pollIntervalMs = configurationNumber(
      process.env.SPORTBEX_POLL_MS,
      15000,
      10000,
      60000,
    );

    this.maxEvents = configurationNumber(
      process.env.SPORTBEX_MAX_EVENTS,
      6,
      1,
      12,
    );

    this.discovery = { expires: 0, events: [] };
    this.catalog = new Map();
    this.scoreRetryAt = 0;
  }

  state(sport, row = this.rows.get(sport)) {
    const state = super.state(sport, row);

    if (!state || !this.sportbex) return state;

    const age =
      this.now() -
      new Date(row?.last_success_at || 0).getTime();

    state.pollIntervalMs = this.pollIntervalMs;

    state.stale =
      !state.enabled ||
      !state.configured ||
      !Number.isFinite(age) ||
      age < -1000 ||
      age >= Math.max(
        this.pollIntervalMs * 3,
        this.timeoutMs * 2,
      ) ||
      Boolean(row?.last_error);

    state.apiConnected =
      state.configured && !state.stale;

    if (!this.apiKey && state.supported) {
      state.error = 'SPORTBEX_API_KEY is missing.';
    }

    state.provider = 'sportbex';

    return state;
  }

  payload(...args) {
    const result = super.payload(...args);

    if (this.sportbex) {
      result.provider = 'sportbex';
      result.pollIntervalMs = this.pollIntervalMs;
    }

    return result;
  }

  async tickSport(config) {
    return super.tickSport(
      this.sportbex
        ? {
            ...config,
            pollIntervalMs: this.pollIntervalMs,
          }
        : config,
    );
  }

  safeError(error) {
    if (!this.sportbex) return super.safeError(error);

    if (
      /^Sportbex HTTP \d{3}$/.test(error?.message || '')
    ) {
      return error.message;
    }

    return error?.name === 'AbortError'
      ? 'Sportbex request stopped or timed out.'
      : 'Sportbex update failed. Saved data retained; selections paused.';
  }

  eventState(event, state) {
    const result = super.eventState(event, state);

    if (event.provider !== 'sportbex') return result;

    const age =
      this.now() - stamp(event.marketUpdatedAt);

    const marketStale =
      !Number.isFinite(age) ||
      age < -1000 ||
      age > Math.max(this.pollIntervalMs * 3, 30000);

    return {
      ...result,
      marketStale,

      // Existing demo bet routes use simulated markets.
      bettingAllowed: false,

      bettingReason: !state.enabled
        ? 'API OFF — Saved prices'
        : state.stale || marketStale
          ? 'Waiting for fresh market data'
          : 'Provider prices · Demo selection integration pending',
    };
  }

  async requestSportbex(
    connection,
    generation,
    endpoint,
  ) {
    await this.stillEnabled(
      connection,
      'cricket',
      generation,
    );

    const controller = new AbortController();

    if (!this.controllers.has('cricket')) {
      this.controllers.set('cricket', new Set());
    }

    this.controllers.get('cricket').add(controller);

    const timer = setTimeout(
      () => controller.abort(),
      this.timeoutMs,
    );

    try {
      const response = await this.fetcher(
        `${BASE}${endpoint}`,
        {
          signal: controller.signal,
          redirect: 'error',

          headers: {
            Accept: 'application/json',
            'sportbex-api-key': this.apiKey,
          },
        },
      );

      if (!response.ok) {
        const retry =
          response.headers?.get('retry-after');

        const seconds =
          retry == null ? NaN : Number(retry);

        const date = Date.parse(retry || '');

        const delay = response.status === 429
          ? Number.isFinite(seconds)
            ? Math.max(15000, seconds * 1000)
            : Number.isFinite(date)
              ? Math.max(15000, date - this.now())
              : 900000
          : [401, 403].includes(response.status)
            ? 900000
            : 30000;

        throw Object.assign(
          new Error(`Sportbex HTTP ${response.status}`),
          { delay },
        );
      }

      const body = await response.json();

      if (
        body?.status === false ||
        body?.error === true ||
        body?.success === false
      ) {
        throw Object.assign(
          new Error('Sportbex rejected request'),
          { delay: 900000 },
        );
      }

      return body;
    } finally {
      clearTimeout(timer);

      this.controllers
        .get('cricket')
        .delete(controller);
    }
  }

  async discover(connection, generation) {
    if (this.discovery.expires > this.now()) {
      return this.discovery.events;
    }

    const competitions = list(
      await this.requestSportbex(
        connection,
        generation,
        '/betfair/competition-list/4',
      ),
    );

    const found = new Map();

    for (const item of competitions.slice(0, 30)) {
      const competitionId = id(item.competition?.id);

      if (!competitionId) continue;

      const rows = list(
        await this.requestSportbex(
          connection,
          generation,
          `/betfair/event-list/4/${competitionId}`,
        ),
      );

      for (const row of rows) {
        const event = row?.event;
        const eventId = id(event?.id);
        const start = stamp(event?.openDate);

        if (
          !eventId ||
          !/\s+v(?:s\.?)?\s+/i.test(event?.name || '') ||
          !Number.isFinite(start)
        ) {
          continue;
        }

        if (
          start < this.now() - 24 * 3600000 ||
          start > this.now() + 7 * 86400000
        ) {
          continue;
        }

        found.set(eventId, {
          eventId,
          name: text(event.name),
          startTime: new Date(start).toISOString(),
          league:
            text(item.competition?.name) || 'Cricket',
        });
      }
    }

    const events = [...found.values()].sort(
      (a, b) => stamp(a.startTime) - stamp(b.startTime),
    );

    this.discovery = {
      expires: this.now() + this.scheduleIntervalMs,
      events,
    };

    return events;
  }

  async marketCatalog(
    connection,
    generation,
    eventId,
  ) {
    const cached = this.catalog.get(eventId);

    if (cached?.expires > this.now()) {
      return cached.value;
    }

    const markets = list(
      await this.requestSportbex(
        connection,
        generation,
        `/betfair/market-all-list/${eventId}`,
      ),
    );

    const value = markets.find(
      market =>
        String(market.event?.id) === eventId &&
        /^match odds$/i.test(market.marketName || ''),
    ) || null;

    this.catalog.set(eventId, {
      value,
      expires:
        this.now() + (value ? 300000 : 60000),
    });

    return value;
  }

  async fetchFixtures(
    connection,
    generation,
    schedule = false,
  ) {
    if (!this.sportbex) {
      return super.fetchFixtures(
        connection,
        generation,
        schedule,
      );
    }

    if (schedule) return [];

    const events = await this.discover(
      connection,
      generation,
    );

    let scoreRows = [];
    let scoreStatus = 'UNAVAILABLE';

    if (this.now() >= this.scoreRetryAt) {
      try {
        const body = await this.requestSportbex(
          connection,
          generation,
          '/live-score/match/live',
        );

        scoreRows = list(body);

        scoreStatus = scoreRows.length
          ? 'ROWS_RETURNED_MAPPING_REQUIRED'
          : 'NO_LIVE_ROWS_RETURNED';
      } catch (failure) {
        if (
          failure.stopped ||
          /^Sportbex HTTP (401|429)$/.test(
            failure.message,
          )
        ) {
          throw failure;
        }

        this.scoreRetryAt =
          this.now() + (failure.delay || 60000);

        scoreStatus = 'SCORE_ENDPOINT_UNAVAILABLE';
      }
    }

    const previous =
      this.rows.get('cricket')?.live_events || [];

    const previousLive = new Set(
      previous
        .filter(event => event.status === 'LIVE')
        .map(event => String(event.providerEventId)),
    );

    const ordered = [...events].sort(
      (a, b) =>
        Number(previousLive.has(b.eventId)) -
          Number(previousLive.has(a.eventId)) ||
        stamp(a.startTime) - stamp(b.startTime),
    );

    const output = [];

    for (const event of ordered) {
      if (output.length >= this.maxEvents) break;

      const cachedMarket =
        this.catalog.get(event.eventId)?.value;

      if (cachedMarket?.closedUntil > this.now()) {
        continue;
      }

      const catalog = await this.marketCatalog(
        connection,
        generation,
        event.eventId,
      );

      const names = event.name.split(
        /\s+v(?:s\.?)?\s+/i,
      );

      const score = matchedScore(scoreRows, event);

      const match = {
        eventId: `sportbex_${event.eventId}`,
        providerEventId: event.eventId,
        sport: 'cricket',
        provider: 'sportbex',
        source: 'REAL_API',
        league: event.league,
        homeTeam: names[0],
        awayTeam: names.slice(1).join(' vs '),
        startTime: event.startTime,
        status: 'UPCOMING',
        live: false,
        score,
        scoreAvailable: Boolean(score),
        scoreFeedStatus: scoreStatus,
        odds: { home: null, away: null },
        oddsAvailable: false,
        matchOdds: null,
        bookmaker: [],
        fancy: [],
        lastUpdated: new Date(
          this.now(),
        ).toISOString(),
        marketUpdatedAt: null,
        fancyUpdatedAt: null,

        note: score
          ? ''
          : 'No uniquely matched live score is available for this event.',
      };

      if (
        catalog &&
        /^\d+\.\d+$/.test(String(catalog.marketId))
      ) {
        const body = await this.requestSportbex(
          connection,
          generation,
          `/betfair/market-odds/${event.eventId}/${encodeURIComponent(catalog.marketId)}`,
        );

        const book = body?.data;

        if (
          !book ||
          String(book.marketId) !==
            String(catalog.marketId) ||
          !Array.isArray(book.runners)
        ) {
          throw new Error(
            'Sportbex invalid market response',
          );
        }

        match.live = book.inplay === true;

        match.status = book.status === 'CLOSED'
          ? 'ENDED'
          : match.live
            ? 'LIVE'
            : 'UPCOMING';

        match.providerStatus = text(book.status);

        match.marketUpdatedAt = new Date(
          this.now(),
        ).toISOString();

        match.matchOdds = {
          marketId: String(book.marketId),
          status: text(book.status) || 'UNKNOWN',
          inplay: book.inplay === true,
          delayed: book.isMarketDataDelayed !== false,
          lastTradeAt: text(book.lastMatchTime),

          runners: book.runners
            .slice(0, 3)
            .map(runner => {
              const metadata = (
                catalog.runners || []
              ).find(
                item =>
                  String(item.selectionId) ===
                  String(runner.selectionId),
              );

              const prices = side =>
                (Array.isArray(side) ? side : [])
                  .slice(0, 3)
                  .map(price => ({
                    price: positive(price.price),
                    size: number(price.size),
                  }))
                  .filter(
                    price =>
                      price.price > 1 &&
                      price.size > 0,
                  );

              return {
                selectionId: String(
                  runner.selectionId,
                ),

                name:
                  text(metadata?.runnerName) ||
                  'Unnamed selection',

                status:
                  text(runner.status) || 'UNKNOWN',

                back: prices(
                  runner.ex?.availableToBack,
                ),

                lay: prices(
                  runner.ex?.availableToLay,
                ),
              };
            }),
        };

        match.oddsAvailable =
          match.matchOdds.runners.some(
            runner =>
              runner.back.length ||
              runner.lay.length,
          );

        match.odds.home =
          match.matchOdds.runners[0]
            ?.back[0]?.price ?? null;

        match.odds.away =
          match.matchOdds.runners[1]
            ?.back[0]?.price ?? null;
      }

      if (match.status === 'ENDED') {
        if (catalog) {
          catalog.closedUntil =
            this.now() + 300000;
        }

        continue;
      }

      const fancy = await this.requestSportbex(
        connection,
        generation,
        `/betfair/fancy-bookmaker-odds/${event.eventId}`,
      );

      if (
        !Array.isArray(fancy?.bookmaker) ||
        !Array.isArray(fancy?.fancy)
      ) {
        throw new Error(
          'Sportbex invalid fancy response',
        );
      }

      match.fancyUpdatedAt = new Date(
        this.now(),
      ).toISOString();

      match.bookmaker = fancy.bookmaker
        .slice(0, 30)
        .map(row => ({
          marketId: String(row.mid),
          selectionId: String(row.sid),
          name: text(row.nat),
          title: text(row.mname),
          status: text(row.s) || 'UNKNOWN',
          back: positive(row.b1),
          lay: positive(row.l1),
          backSize: number(row.bs1),
          laySize: number(row.ls1),
          format: 'PROVIDER_BOOKMAKER',
        }));

      match.fancy = fancy.fancy
        .slice(0, 250)
        .map(row => ({
          id: `${event.eventId}:${String(row.SelectionId)}:${String(row.gtype)}`,
          selectionId: String(row.SelectionId),
          title: text(row.RunnerName),
          type: text(row.gtype),
          status: text(row.GameStatus) || 'UNKNOWN',
          no: number(row.LayPrice1),
          yes: number(row.BackPrice1),
          noRate: number(row.LaySize1),
          yesRate: number(row.BackSize1),
          min: number(row.min),
          max: number(row.max),
        }));

      output.push(match);
    }

    console.log(
      `[Sportbex] Shared cricket snapshot: ${output.length} matches; customer requests use saved cache.`,
    );

    return output;
  }
}

export const sportsService = new SportsService();
