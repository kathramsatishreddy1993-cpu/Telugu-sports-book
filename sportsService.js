import { MockSportsProvider } from './mockProvider.js';
import { createCommonEvent } from './commonEvent.js';

const BASE_URL =
  'https://cricket.sportmonks.com/api/v2.0';

function relation(value) {
  return value?.data ?? value;
}

function asArray(value) {
  const result = relation(value);
  return Array.isArray(result) ? result : [];
}

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0
    ? number
    : fallback;
}

function matchStatus(fixture) {
  const status = String(fixture.status || '')
    .trim()
    .toLowerCase();

  // Check completed status before the API's live flag.
  if (
    /finished|abandoned|cancelled|canceled|no result|drawn/.test(
      status
    )
  ) {
    return 'ENDED';
  }

  if (
    /not started|upcoming|scheduled|postponed/.test(status)
  ) {
    return 'UPCOMING';
  }

  if (
    fixture.live === true ||
    /innings|break|stumps|lunch|tea|delayed|interrupted/.test(
      status
    )
  ) {
    return 'LIVE';
  }

  return 'UPCOMING';
}

function teamScore(runs, teamId) {
  const innings = runs.filter(
    (run) => String(run.team_id) === String(teamId)
  );

  if (!innings.length) {
    return 'Yet to bat';
  }

  // Preserve multiple innings for Test matches.
  return innings
    .map((run) => {
      const score = run.score ?? '-';
      const wickets = run.wickets ?? '-';
      const overs =
        run.overs == null ? '' : ` (${run.overs} ov)`;

      return `${score}/${wickets}${overs}`;
    })
    .join(' & ');
}

function normalizeFixture(fixture) {
  const home = relation(fixture.localteam);
  const away = relation(fixture.visitorteam);
  const league = relation(fixture.league);
  const runs = asArray(fixture.runs);

  const event = createCommonEvent({
    eventId: `sportmonks_${fixture.id}`,
    sport: 'cricket',

    league:
      league?.name ||
      fixture.type ||
      'Cricket',

    homeTeam:
      home?.name ||
      home?.code ||
      `Team ${fixture.localteam_id}`,

    awayTeam:
      away?.name ||
      away?.code ||
      `Team ${fixture.visitorteam_id}`,

    status: matchStatus(fixture),

    startTime: fixture.starting_at || null,

    score:
      `${teamScore(runs, fixture.localteam_id)}` +
      ` vs ${teamScore(runs, fixture.visitorteam_id)}`,

    // Scores are real; this endpoint does not supply odds.
    odds: {
      home: null,
      away: null,
    },

    source: 'REAL_API',
    lastUpdated: new Date().toISOString(),
  });

  return {
    ...event,
    provider: 'sportmonks',
    providerEventId: fixture.id,
    providerStatus: fixture.status || '',
    matchType: fixture.type || '',
    note: fixture.note || '',
    oddsAvailable: false,
  };
}

class SportsService {
  constructor() {
    this.fallbackProvider = new MockSportsProvider();

    this.cache = new Map();
    this.clients = new Set();
    this.apiConnected = false;
    this.lastSuccessAt = 0;
    this.lastError = null;
    this.retryAt = 0;
    this.timer = null;

    this.mode = String(
      process.env.SPORTS_API_MODE || 'demo'
    ).trim().toLowerCase();

    this.demoMode = this.mode === 'demo';

    this.apiKey = String(
      process.env.SPORTMONKS_API_TOKEN || ''
    ).trim();

    this.pollIntervalMs = Math.max(
      30000,
      positiveNumber(
        process.env.SPORTMONKS_POLL_INTERVAL_MS,
        60000
      )
    );

    this.timeoutMs = positiveNumber(
      process.env.SPORTMONKS_TIMEOUT_MS,
      15000
    );

    this.supportedSports = [
      'cricket',
      'football',
      'tennis',
      'kabaddi',
      'basketball',
      'baseball',
      'fight_events',
    ];

    this.updateCache([]);
    this.startPolling();
  }

  async fetchFixtures() {
    const fixtures = [];
    let page = 1;

    while (page <= 20) {
      const url = new URL(`${BASE_URL}/livescores`);

      url.searchParams.set('api_token', this.apiKey);
      url.searchParams.set(
        'include',
        'localteam,visitorteam,league,runs'
      );
      url.searchParams.set('page', String(page));

      const controller = new AbortController();

      const timeout = setTimeout(
        () => controller.abort(),
        this.timeoutMs
      );

      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 429) {
            const retryHeader =
              response.headers.get('retry-after');

            const seconds = Number(retryHeader);
            const retryDate = Date.parse(retryHeader || '');

            const delay =
              retryHeader && Number.isFinite(seconds)
                ? seconds * 1000
                : Number.isFinite(retryDate)
                  ? retryDate - Date.now()
                  : 15 * 60 * 1000;

            this.retryAt =
              Date.now() + Math.max(60000, delay);
          } else if (
            response.status === 401 ||
            response.status === 403
          ) {
            this.retryAt =
              Date.now() + 15 * 60 * 1000;
          }

          // Do not log the request URL or token.
          throw new Error(
            `Sportmonks HTTP ${response.status}`
          );
        }

        const body = await response.json();

        if (!Array.isArray(body?.data)) {
          throw new Error(
            'Sportmonks returned an invalid data format.'
          );
        }

        fixtures.push(...body.data);

        const pagination = body.meta?.pagination;
        const totalPages = Number(
          pagination?.total_pages || 1
        );

        if (page >= totalPages) {
          return fixtures;
        }

        page += 1;
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new Error(
      'Sportmonks pagination limit reached.'
    );
  }

  async refreshData() {
    if (this.demoMode) {
      await this.loadDemoMatches();
      return;
    }

    if (Date.now() < this.retryAt) {
      return;
    }

    try {
      if (this.mode !== 'live') {
        throw new Error(
          'SPORTS_API_MODE must be demo or live.'
        );
      }

      if (!this.apiKey) {
        throw new Error(
          'SPORTMONKS_API_TOKEN is missing.'
        );
      }

      const fixtures = await this.fetchFixtures();

      const events = fixtures
        .filter((fixture) => fixture?.id != null)
        .map(normalizeFixture);

      this.apiConnected = true;
      this.lastSuccessAt = Date.now();
      this.lastError = null;
      this.retryAt = 0;

      this.updateCache(events);
      this.broadcast(events);
    } catch (error) {
      this.apiConnected = false;

      this.lastError =
        error?.name === 'AbortError'
          ? 'Sportmonks request timed out.'
          : error instanceof SyntaxError
            ? 'Sportmonks returned invalid JSON.'
            : error?.message === 'fetch failed'
              ? 'Sportmonks network request failed.'
              : String(error?.message || 'Sports API error');

      console.error(
        '[SportsService]',
        this.lastError
      );

      // In live mode, do not replace failed live scores
      // with fictional matches.
      this.updateCache([]);
      this.broadcast([]);
    }
  }

  async loadDemoMatches() {
    this.apiConnected = false;

    try {
      const result =
        await this.fallbackProvider.fetchEvents('all');

      const events = Array.isArray(result)
        ? result.map((event) => ({
            ...event,
            source: 'DEMO_MOCK',
          }))
        : [];

      this.lastError = null;
      this.updateCache(events);
      this.broadcast(events);
    } catch {
      this.lastError = 'Demo provider failed.';
      console.error('[SportsService]', this.lastError);
      this.updateCache([]);
      this.broadcast([]);
    }
  }

  updateCache(events) {
    const safeEvents = Array.isArray(events)
      ? events
      : [];

    this.cache.set('all', safeEvents);

    for (const sport of this.supportedSports) {
      this.cache.set(
        sport,
        safeEvents.filter(
          (event) =>
            String(event.sport || '').toLowerCase() ===
            sport
        )
      );
    }
  }

  async startPolling() {
    // Schedule only after completion to avoid
    // overlapping API requests.
    try {
      await this.refreshData();
    } catch {
      this.apiConnected = false;
      console.error(
        '[SportsService] Unexpected refresh failure.'
      );
    } finally {
      this.timer = setTimeout(
        () => this.startPolling(),
        this.pollIntervalMs
      );

      this.timer.unref?.();
    }
  }

  payload(type, events) {
    return {
      type,
      events,
      source: this.demoMode
        ? 'DEMO_MOCK'
        : this.isApiConnected()
          ? 'REAL_API'
          : 'API_UNAVAILABLE',
      provider: this.demoMode
        ? 'mock'
        : 'sportmonks',
      apiConnected: this.isApiConnected(),
      lastUpdated: this.lastSuccessAt
        ? new Date(this.lastSuccessAt).toISOString()
        : null,
      error: this.lastError,
    };
  }

  addClient(res) {
    this.clients.add(res);

    try {
      res.write(
        `data: ${JSON.stringify(
          this.payload('INIT', this.getEvents('all'))
        )}\n\n`
      );
    } catch {
      this.clients.delete(res);
    }
  }

  removeClient(res) {
    this.clients.delete(res);
  }

  broadcast(events) {
    const message =
      `data: ${JSON.stringify(
        this.payload('UPDATE', events)
      )}\n\n`;

    for (const client of this.clients) {
      if (client.destroyed || client.writableEnded) {
        this.clients.delete(client);
        continue;
      }

      try {
        client.write(message);
      } catch {
        this.clients.delete(client);
      }
    }
  }

  getEvents(sport = 'all') {
    const category = String(sport || 'all')
      .trim()
      .toLowerCase();

    return this.cache.get(category) || [];
  }

  isApiConnected() {
    return (
      !this.demoMode &&
      this.apiConnected &&
      Boolean(this.apiKey) &&
      Date.now() - this.lastSuccessAt <
        Math.max(
          this.pollIntervalMs * 3,
          this.timeoutMs * 2
        )
    );
  }
}

export const sportsService = new SportsService();
