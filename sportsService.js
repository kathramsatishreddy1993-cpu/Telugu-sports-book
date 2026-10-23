import { MockSportsProvider } from './mockProvider.js';
import { createCommonEvent } from './commonEvent.js';

export const SPORTS = [
  ['cricket', 'Cricket', 5000],
  ['football', 'Football', 30000],
  ['tennis', 'Tennis', 30000],
  ['fantasy_eleven', 'Fantasy Eleven', 30000],
  ['fight_events', 'Fight Events', 30000],
  ['horse_racing', 'Horse Racing', 30000],
  ['politics', 'Politics', 30000],
  ['kabaddi', 'Kabaddi', 30000],
].map(([id, name, pollIntervalMs], index) => ({
  id,
  name,
  pollIntervalMs,
  lockId: 746250 + index,
}));

export function canonicalSport(value) {
  const key = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[ -]+/g, '_');

  return (
    {
      soccer: 'football',
      fantasy11: 'fantasy_eleven',
      fantasy_11: 'fantasy_eleven',
      fantasy: 'fantasy_eleven',
      fight: 'fight_events',
      fighting: 'fight_events',
      horseracing: 'horse_racing',
    }[key] || key
  );
}

const base =
  'https://cricket.sportmonks.com/api/v2.0';

const relation = value =>
  value?.data ?? value;

const array = value =>
  Array.isArray(relation(value))
    ? relation(value)
    : [];

const timestamp = value =>
  value == null
    ? NaN
    : new Date(value).getTime();

const errorWith = (message, status = 409) =>
  Object.assign(new Error(message), { status });

function status(fixture) {
  const text = String(fixture.status || '')
    .trim()
    .toLowerCase();

  if (
    /finished|abandoned|cancelled|canceled|no result|drawn/.test(
      text,
    )
  ) {
    return 'ENDED';
  }

  if (
    /not started|upcoming|scheduled|postponed/.test(
      text,
    )
  ) {
    return 'UPCOMING';
  }

  return fixture.live === true ||
    /innings|break|stumps|lunch|tea|delayed|interrupted/.test(
      text,
    )
    ? 'LIVE'
    : 'UPCOMING';
}

function score(runs, team) {
  return (
    runs
      .filter(
        run =>
          String(run.team_id) === String(team),
      )
      .map(
        run =>
          `${run.score ?? '-'}/${run.wickets ?? '-'}${
            run.overs == null
              ? ''
              : ` (${run.overs} ov)`
          }`,
      )
      .join(' & ') || 'Yet to bat'
  );
}

function normalize(fixture) {
  const home = relation(fixture.localteam);
  const away = relation(fixture.visitorteam);

  return {
    ...createCommonEvent({
      eventId: `sportmonks_${fixture.id}`,
      sport: 'cricket',

      league:
        relation(fixture.league)?.name ||
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

      status: status(fixture),

      startTime: fixture.starting_at || null,

      score:
        `${score(
          array(fixture.runs),
          fixture.localteam_id,
        )} vs ` +
        score(
          array(fixture.runs),
          fixture.visitorteam_id,
        ),

      odds: {
        home: null,
        away: null,
      },

      source: 'REAL_API',
      lastUpdated: new Date().toISOString(),
    }),

    provider: 'sportmonks',
    providerEventId: fixture.id,
    providerStatus: fixture.status || '',
    matchType: fixture.type || '',
    note: fixture.note || '',
    oddsAvailable: false,
  };
}

// Provider requests run only in the shared worker.
// Customer GET routes read saved database data.
export class SportsService {
  constructor({
    fetcher = (...args) => fetch(...args),
    now = () => Date.now(),
  } = {}) {
    this.fetcher = fetcher;
    this.now = now;
    this.pool = null;

    this.rows = new Map();
    this.clients = new Set();
    this.controllers = new Map();
    this.running = new Set();

    this.timer = null;
    this.lastMessage = '';
    this.version = 0;
    this.enabled = false;

    this.mode = String(
      process.env.SPORTS_API_MODE || 'demo',
    )
      .trim()
      .toLowerCase();

    this.demoMode = this.mode === 'demo';

    this.apiKey = String(
      process.env.SPORTMONKS_API_TOKEN || '',
    ).trim();

    this.feedKey = this.demoMode
      ? 'mock:demo'
      : 'sportmonks:live';

    this.pollIntervalMs = 5000;
    this.scheduleIntervalMs = 300000;

    const timeout = Number(
      process.env.SPORTMONKS_TIMEOUT_MS,
    );

    this.timeoutMs =
      Number.isFinite(timeout) && timeout > 0
        ? timeout
        : 15000;

    this.fallbackProvider =
      new MockSportsProvider();
  }

  async initialize(pool) {
    this.pool = pool;

    // Existing tables and snapshots are retained.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tsb_sports_feed_control (
        id INTEGER PRIMARY KEY CHECK(id=1),
        enabled BOOLEAN NOT NULL DEFAULT TRUE,
        version INTEGER NOT NULL DEFAULT 0,
        updated_by TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      INSERT INTO tsb_sports_feed_control(id)
      VALUES(1)
      ON CONFLICT DO NOTHING;

      CREATE TABLE IF NOT EXISTS tsb_sports_feed_snapshot (
        feed_key TEXT PRIMARY KEY,
        live_events JSONB NOT NULL DEFAULT '[]',
        schedule_events JSONB NOT NULL DEFAULT '[]',
        last_success_at TIMESTAMPTZ,
        schedule_updated_at TIMESTAMPTZ,
        last_attempt_at TIMESTAMPTZ,
        retry_at TIMESTAMPTZ,
        last_error TEXT,
        schedule_error TEXT
      );

      CREATE TABLE IF NOT EXISTS tsb_sports_control_v2 (
        sport TEXT PRIMARY KEY,
        enabled BOOLEAN NOT NULL DEFAULT FALSE,
        generation INTEGER NOT NULL DEFAULT 0,
        updated_by TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tsb_sports_snapshot_v2 (
        feed_key TEXT NOT NULL,
        sport TEXT NOT NULL,
        live_events JSONB NOT NULL DEFAULT '[]',
        schedule_events JSONB NOT NULL DEFAULT '[]',
        last_success_at TIMESTAMPTZ,
        schedule_updated_at TIMESTAMPTZ,
        last_attempt_at TIMESTAMPTZ,
        retry_at TIMESTAMPTZ,
        last_error TEXT,
        schedule_error TEXT,
        PRIMARY KEY(feed_key,sport)
      );

      CREATE TABLE IF NOT EXISTS tsb_sports_audit_v2 (
        id BIGSERIAL PRIMARY KEY,
        sport TEXT NOT NULL,
        enabled BOOLEAN NOT NULL,
        admin_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    for (const sport of SPORTS) {
      await pool.query(
        `
          INSERT INTO tsb_sports_control_v2(
            sport,
            enabled
          )
          SELECT
            $1,
            CASE
              WHEN $1='cricket' THEN enabled
              ELSE FALSE
            END
          FROM tsb_sports_feed_control
          WHERE id=1
          ON CONFLICT DO NOTHING
        `,
        [sport.id],
      );

      await pool.query(
        `
          INSERT INTO tsb_sports_snapshot_v2(
            feed_key,
            sport,
            live_events,
            schedule_events,
            last_success_at,
            schedule_updated_at,
            last_error,
            schedule_error
          )
          SELECT
            $1,
            $2,

            COALESCE(
              (
                SELECT jsonb_agg(e)
                FROM jsonb_array_elements(
                  s.live_events
                ) e
                WHERE LOWER(e->>'sport')=$2
              ),
              '[]'::JSONB
            ),

            COALESCE(
              (
                SELECT jsonb_agg(e)
                FROM jsonb_array_elements(
                  s.schedule_events
                ) e
                WHERE LOWER(e->>'sport')=$2
              ),
              '[]'::JSONB
            ),

            s.last_success_at,
            s.schedule_updated_at,
            s.last_error,
            s.schedule_error

          FROM tsb_sports_feed_snapshot s
          WHERE s.feed_key=$1

          ON CONFLICT DO NOTHING
        `,
        [this.feedKey, sport.id],
      );

      await pool.query(
        `
          INSERT INTO tsb_sports_snapshot_v2(
            feed_key,
            sport
          )
          VALUES($1,$2)
          ON CONFLICT DO NOTHING
        `,
        [this.feedKey, sport.id],
      );
    }

    await this.readSaved();
  }

  async readSaved(connection = this.pool) {
    const result = await connection.query(
      `
        SELECT c.*,s.*,c.sport
        FROM tsb_sports_control_v2 c

        JOIN tsb_sports_snapshot_v2 s
          ON s.sport=c.sport
          AND s.feed_key=$1
      `,
      [this.feedKey],
    );

    const revision = await connection.query(
      `
        SELECT version
        FROM tsb_sports_feed_control
        WHERE id=1
      `,
    );

    this.rows = new Map(
      result.rows.map(row => [row.sport, row]),
    );

    this.version = Number(
      revision.rows[0]?.version || 0,
    );

    this.enabled = [
      ...this.rows.values(),
    ].some(row => row.enabled);

    return this.rows;
  }

  supported(sport) {
    return (
      this.demoMode ||
      (this.mode === 'live' &&
        sport === 'cricket')
    );
  }

  state(sport, row = this.rows.get(sport)) {
    const config = SPORTS.find(
      item => item.id === sport,
    );

    if (!config) return null;

    const supported = this.supported(sport);

    const configured =
      supported &&
      (this.demoMode || Boolean(this.apiKey));

    const age =
      this.now() -
      timestamp(row?.last_success_at);

    const fresh =
      Number.isFinite(age) &&
      age >= -1000 &&
      age <
        Math.max(
          config.pollIntervalMs * 3,
          this.timeoutMs * 2,
        );

    // ON requires a fresh response before reopening.
    const stale =
      !row?.enabled ||
      !configured ||
      !fresh ||
      Boolean(row?.last_error);

    return {
      ...config,
      lockId: undefined,

      enabled: Boolean(row?.enabled),
      paused: !row?.enabled,
      supported,
      configured,
      stale,

      apiConnected:
        !this.demoMode && !stale,

      lastUpdated:
        row?.last_success_at || null,

      scheduleUpdatedAt:
        row?.schedule_updated_at || null,

      retryAt: row?.retry_at || null,

      error: !supported
        ? 'Provider integration pending for this category.'
        : !configured
          ? 'SPORTMONKS_API_TOKEN is missing or SPORTS_API_MODE is invalid.'
          : row?.last_error || null,

      scheduleError:
        row?.schedule_error || null,

      savedMatches: this.rawEvents(
        sport,
        row,
      ).length,
    };
  }

  rawEvents(sport, row = this.rows.get(sport)) {
    const merged = new Map();

    const events = [
      ...(Array.isArray(row?.schedule_events)
        ? row.schedule_events
        : []),

      ...(Array.isArray(row?.live_events)
        ? row.live_events
        : []),
    ];

    for (const event of events) {
      const id = event.eventId ?? event.id;

      if (
        id != null &&
        canonicalSport(event.sport) === sport
      ) {
        merged.set(String(id), event);
      }
    }

    return [...merged.values()].filter(
      event =>
        ![
          'ENDED',
          'FINISHED',
          'COMPLETED',
          'CANCELLED',
          'CANCELED',
          'ABANDONED',
        ].includes(
          String(event.status).toUpperCase(),
        ),
    );
  }

  eventState(event, state) {
    const demo =
      this.demoMode &&
      /demo|mock/i.test(
        String(event.source || ''),
      );

    const hasTeams =
      typeof event.homeTeam === 'string' &&
      typeof event.awayTeam === 'string' &&
      event.homeTeam &&
      event.awayTeam &&
      event.homeTeam !== event.awayTeam;

    // Live scores do not supply verified markets.
    const bettingAllowed = Boolean(
      state.enabled &&
        !state.stale &&
        demo &&
        hasTeams,
    );

    const bettingReason = !state.enabled
      ? 'API OFF — Betting Paused'
      : state.stale
        ? 'Waiting for fresh data — Betting Paused'
        : !demo
          ? 'Verified market integration pending — Betting Paused'
          : !hasTeams
            ? 'Market unavailable'
            : '';

    return {
      ...event,
      sport: state.id,
      feedEnabled: state.enabled,
      paused: state.paused,
      stale: state.stale,
      bettingAllowed,
      bettingReason,
      feedLastUpdated: state.lastUpdated,
    };
  }

  getEvents(sport = 'all') {
    const category = canonicalSport(sport);

    return SPORTS.filter(
      item =>
        category === 'all' ||
        category === item.id,
    ).flatMap(item => {
      const state = this.state(item.id);

      return this.rawEvents(item.id).map(
        event => this.eventState(event, state),
      );
    });
  }

  isApiConnected() {
    return SPORTS.some(
      sport =>
        this.state(sport.id)?.apiConnected,
    );
  }

  payload(
    type = 'UPDATE',
    events = this.getEvents(),
    category = 'all',
  ) {
    const sports = Object.fromEntries(
      SPORTS.map(sport => [
        sport.id,
        this.state(sport.id),
      ]),
    );

    const selected =
      sports[canonicalSport(category)];

    return {
      type,
      events,
      sports,

      source: this.demoMode
        ? 'DEMO_MOCK'
        : 'REAL_API',

      provider: this.demoMode
        ? 'mock'
        : 'sportmonks',

      mode: this.mode,

      enabled: selected
        ? selected.enabled
        : this.enabled,

      paused: selected
        ? selected.paused
        : !this.enabled,

      stale: selected
        ? selected.stale
        : !Object.values(sports).some(
            state =>
              state.enabled && !state.stale,
          ),

      apiConnected: selected
        ? selected.apiConnected
        : this.isApiConnected(),

      lastUpdated:
        selected?.lastUpdated || null,

      scheduleUpdatedAt:
        selected?.scheduleUpdatedAt || null,

      pollIntervalMs:
        selected?.pollIntervalMs || 5000,

      error: selected?.error || null,
    };
  }

  async getFeedState(sport = 'all') {
    await this.readSaved();

    const payload = this.payload(
      'STATE',
      this.getEvents(sport),
      sport,
    );

    return {
      ...payload,
      data: payload.events,
    };
  }

  async getAdminState() {
    await this.readSaved();

    return {
      ...this.payload('CONTROL', []),
      events: undefined,
      version: this.version,

      configured:
        this.demoMode ||
        Boolean(this.apiKey),

      supportedLiveSports: this.demoMode
        ? []
        : ['cricket'],

      savedMatches: this.getEvents().length,

      scheduleIntervalMs:
        this.scheduleIntervalMs,
    };
  }

  // Existing index.js passes req.body.enabled
  // unchanged, so its route can remain as it is.
  async setEnabled(change, version, adminId) {
    const sport = canonicalSport(
      change?.sport,
    );

    const enabled = change?.enabled;

    if (
      !SPORTS.some(
        item => item.id === sport,
      ) ||
      typeof enabled !== 'boolean' ||
      !Number.isInteger(version)
    ) {
      throw errorWith(
        'Refresh API Settings and choose a category ON or OFF.',
        400,
      );
    }

    const connection =
      await this.pool.connect();

    try {
      await connection.query('BEGIN');

      const revision = (
        await connection.query(
          `
            SELECT version
            FROM tsb_sports_feed_control
            WHERE id=1
            FOR UPDATE
          `,
        )
      ).rows[0];

      if (
        Number(revision.version) !== version
      ) {
        throw errorWith(
          'Settings changed on another device. Refresh and try again.',
        );
      }

      const row = (
        await connection.query(
          `
            SELECT *
            FROM tsb_sports_control_v2
            WHERE sport=$1
            FOR UPDATE
          `,
          [sport],
        )
      ).rows[0];

      if (row.enabled !== enabled) {
        await connection.query(
          `
            UPDATE tsb_sports_control_v2
            SET
              enabled=$2,
              generation=generation+1,
              updated_by=$3,
              updated_at=NOW()
            WHERE sport=$1
          `,
          [
            sport,
            enabled,
            String(adminId || 'admin'),
          ],
        );

        if (enabled) {
          // Keep matches and retry backoff.
          // Require a new successful response.
          await connection.query(
            `
              UPDATE tsb_sports_snapshot_v2
              SET
                last_success_at=NULL,
                last_attempt_at=NULL
              WHERE sport=$1
            `,
            [sport],
          );
        }

        await connection.query(
          `
            UPDATE tsb_sports_feed_control
            SET
              version=version+1,
              updated_by=$1,
              updated_at=NOW(),

              enabled=EXISTS(
                SELECT 1
                FROM tsb_sports_control_v2
                WHERE enabled
              )

            WHERE id=1
          `,
          [String(adminId || 'admin')],
        );

        await connection.query(
          `
            INSERT INTO tsb_sports_audit_v2(
              sport,
              enabled,
              admin_id,
              version
            )
            VALUES($1,$2,$3,$4)
          `,
          [
            sport,
            enabled,
            String(adminId || 'admin'),
            version + 1,
          ],
        );
      }

      await connection.query('COMMIT');
    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }

    if (!enabled) {
      for (
        const controller of
        this.controllers.get(sport) || []
      ) {
        controller.abort();
      }
    }

    await this.readSaved();
    this.broadcast();

    if (enabled) {
      void this.tick();
    }

    return this.getAdminState();
  }

  async stillEnabled(
    connection,
    sport,
    generation,
  ) {
    const row = (
      await connection.query(
        `
          SELECT enabled,generation
          FROM tsb_sports_control_v2
          WHERE sport=$1
        `,
        [sport],
      )
    ).rows[0];

    if (
      !row?.enabled ||
      Number(row.generation) !==
        Number(generation)
    ) {
      throw Object.assign(
        new Error('Feed stopped.'),
        { stopped: true },
      );
    }
  }

  async fetchFixtures(
    connection,
    generation,
    schedule = false,
  ) {
    const fixtures = [];

    for (let page = 1; page <= 20; page++) {
      await this.stillEnabled(
        connection,
        'cricket',
        generation,
      );

      const url = new URL(
        `${base}/${
          schedule ? 'fixtures' : 'livescores'
        }`,
      );

      url.searchParams.set(
        'api_token',
        this.apiKey,
      );

      url.searchParams.set(
        'include',
        'localteam,visitorteam,league,runs',
      );

      url.searchParams.set(
        'page',
        String(page),
      );

      if (schedule) {
        const start = new Date(
          this.now() - 7 * 86400000,
        )
          .toISOString()
          .slice(0, 10);

        const end = new Date(
          this.now() + 2 * 86400000,
        )
          .toISOString()
          .slice(0, 10);

        url.searchParams.set(
          'filter[starts_between]',
          `${start},${end}`,
        );
      }

      const controller =
        new AbortController();

      if (
        !this.controllers.has('cricket')
      ) {
        this.controllers.set(
          'cricket',
          new Set(),
        );
      }

      this.controllers
        .get('cricket')
        .add(controller);

      const timer = setTimeout(
        () => controller.abort(),
        this.timeoutMs,
      );

      try {
        const response =
          await this.fetcher(url, {
            signal: controller.signal,
            headers: {
              Accept: 'application/json',
            },
          });

        if (!response.ok) {
          let delay = 0;

          if (
            [401, 403, 429].includes(
              response.status,
            )
          ) {
            const header =
              response.headers.get(
                'retry-after',
              );

            const seconds =
              header == null
                ? NaN
                : Number(header);

            const date = Date.parse(
              header || '',
            );

            delay =
              response.status === 429 &&
              Number.isFinite(seconds)
                ? Math.max(
                    5000,
                    seconds * 1000,
                  )
                : response.status === 429 &&
                    Number.isFinite(date)
                  ? Math.max(
                      5000,
                      date - this.now(),
                    )
                  : 900000;
          }

          throw Object.assign(
            new Error(
              `Sportmonks HTTP ${response.status}`,
            ),
            { delay },
          );
        }

        const body =
          await response.json();

        if (
          !Array.isArray(body?.data)
        ) {
          throw new Error(
            'Invalid provider data.',
          );
        }

        fixtures.push(...body.data);

        if (
          page >=
          Number(
            body.meta?.pagination
              ?.total_pages || 1,
          )
        ) {
          return fixtures
            .filter(
              item => item?.id != null,
            )
            .map(normalize);
        }
      } finally {
        clearTimeout(timer);

        this.controllers
          .get('cricket')
          .delete(controller);
      }
    }

    throw new Error(
      'Provider pagination limit reached.',
    );
  }

  safeError(error) {
    return /^Sportmonks HTTP \d{3}$/.test(
      error?.message || '',
    )
      ? error.message
      : error?.name === 'AbortError'
        ? 'Sports request stopped or timed out.'
        : 'Feed update failed. Showing saved matches.';
  }

  async poll(connection, sport, row) {
    const generation = Number(
      row.generation,
    );

    const attempted = new Date(
      this.now(),
    );

    await connection.query(
      `
        UPDATE tsb_sports_snapshot_v2
        SET last_attempt_at=$3
        WHERE feed_key=$1 AND sport=$2
      `,
      [
        this.feedKey,
        sport,
        attempted,
      ],
    );

    let live = row.live_events;
    let schedule = row.schedule_events;
    let success = row.last_success_at;
    let scheduleAt =
      row.schedule_updated_at;

    let error = null;
    let scheduleError =
      row.schedule_error;

    let retry = null;

    try {
      if (this.demoMode) {
        const events =
          await this.fallbackProvider.fetchEvents(
            sport,
          );

        if (!Array.isArray(events)) {
          throw new Error(
            'Invalid demo feed.',
          );
        }

        live = events
          .filter(
            event =>
              canonicalSport(
                event.sport,
              ) === sport,
          )
          .map(event => ({
            ...event,
            sport,
            source: 'DEMO_MOCK',
          }));

        schedule = [];
        scheduleError = null;
        success = new Date(this.now());
      } else {
        if (!this.apiKey) {
          throw new Error(
            'Configuration missing.',
          );
        }

        live =
          await this.fetchFixtures(
            connection,
            generation,
          );

        success = new Date(this.now());

        if (
          !scheduleAt ||
          this.now() -
            timestamp(scheduleAt) >=
            this.scheduleIntervalMs
        ) {
          try {
            schedule =
              await this.fetchFixtures(
                connection,
                generation,
                true,
              );

            scheduleAt = new Date(
              this.now(),
            );

            scheduleError = null;
          } catch (failure) {
            if (failure.stopped) {
              throw failure;
            }

            scheduleError =
              this.safeError(failure);

            if (failure.delay) {
              retry = new Date(
                this.now() +
                  failure.delay,
              );
            }
          }
        }
      }
    } catch (failure) {
      if (failure.stopped) return;

      error =
        this.safeError(failure);

      if (failure.delay) {
        retry = new Date(
          this.now() + failure.delay,
        );
      }
    }

    // OFF overrides an older provider response.
    await connection.query('BEGIN');

    try {
      const control = (
        await connection.query(
          `
            SELECT enabled,generation
            FROM tsb_sports_control_v2
            WHERE sport=$1
            FOR SHARE
          `,
          [sport],
        )
      ).rows[0];

      if (
        control?.enabled &&
        Number(control.generation) ===
          generation
      ) {
        await connection.query(
          `
            UPDATE tsb_sports_snapshot_v2
            SET
              live_events=$3::JSONB,
              schedule_events=$4::JSONB,
              last_success_at=$5,
              schedule_updated_at=$6,
              last_error=$7,
              schedule_error=$8,
              retry_at=$9

            WHERE
              feed_key=$1
              AND sport=$2
          `,
          [
            this.feedKey,
            sport,
            JSON.stringify(live),
            JSON.stringify(schedule),
            success,
            scheduleAt,
            error,
            scheduleError,
            retry,
          ],
        );
      }

      await connection.query('COMMIT');
    } catch (failure) {
      await connection.query(
        'ROLLBACK',
      );

      throw failure;
    }
  }

  async tickSport(config) {
    if (
      this.running.has(config.id)
    ) {
      return;
    }

    this.running.add(config.id);

    let connection;
    let locked = false;

    try {
      connection =
        await this.pool.connect();

      locked = (
        await connection.query(
          `
            SELECT
              pg_try_advisory_lock($1)
              AS locked
          `,
          [config.lockId],
        )
      ).rows[0].locked;

      if (!locked) return;

      const row = (
        await connection.query(
          `
            SELECT c.*,s.*,c.sport
            FROM tsb_sports_control_v2 c

            JOIN tsb_sports_snapshot_v2 s
              ON s.sport=c.sport
              AND s.feed_key=$1

            WHERE c.sport=$2
          `,
          [
            this.feedKey,
            config.id,
          ],
        )
      ).rows[0];

      if (
        !row?.enabled ||
        !this.supported(config.id) ||
        (!this.demoMode &&
          !this.apiKey)
      ) {
        return;
      }

      if (
        row.retry_at &&
        this.now() <
          timestamp(row.retry_at)
      ) {
        return;
      }

      if (
        row.last_attempt_at &&
        this.now() -
          timestamp(
            row.last_attempt_at,
          ) <
          config.pollIntervalMs
      ) {
        return;
      }

      await this.poll(
        connection,
        config.id,
        row,
      );
    } catch {
      console.error(
        '[SportsService] Category synchronization failed; saved matches retained.',
      );
    } finally {
      if (connection) {
        let failure;

        if (locked) {
          try {
            await connection.query(
              `
                SELECT
                  pg_advisory_unlock($1)
              `,
              [config.lockId],
            );
          } catch (error) {
            failure = error;
          }
        }

        connection.release(failure);
      }

      this.running.delete(
        config.id,
      );
    }
  }

  async tick() {
    if (
      !this.pool ||
      this.ticking
    ) {
      return;
    }

    this.ticking = true;

    try {
      await this.readSaved();

      const activeSports =
        SPORTS.filter(
          config =>
            this.rows.get(
              config.id,
            )?.enabled &&
            this.supported(
              config.id,
            ) &&
            (this.demoMode ||
              this.apiKey),
        );

      await Promise.all(
        activeSports.map(
          config =>
            this.tickSport(config),
        ),
      );

      await this.readSaved();
      this.broadcast();
    } catch {
      console.error(
        '[SportsService] Cached feed refresh failed.',
      );
    } finally {
      this.ticking = false;
    }
  }

  start() {
    if (
      this.timer ||
      !this.pool
    ) {
      return;
    }

    void this.tick();

    this.timer = setInterval(
      () => void this.tick(),
      1000,
    );

    this.timer.unref?.();
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;

    for (
      const group of
      this.controllers.values()
    ) {
      for (
        const controller of group
      ) {
        controller.abort();
      }
    }
  }

  addClient(res) {
    this.clients.add(res);

    try {
      res.write(
        `data: ${JSON.stringify(
          this.payload('INIT'),
        )}\n\n`,
      );
    } catch {
      this.clients.delete(res);
    }
  }

  removeClient(res) {
    this.clients.delete(res);
  }

  broadcast() {
    const message =
      `data: ${JSON.stringify(
        this.payload(),
      )}\n\n`;

    if (
      message ===
      this.lastMessage
    ) {
      return;
    }

    this.lastMessage = message;

    for (
      const client of
      this.clients
    ) {
      if (
        client.destroyed ||
        client.writableEnded
      ) {
        this.clients.delete(
          client,
        );

        continue;
      }

      try {
        client.write(message);
      } catch {
        this.clients.delete(
          client,
        );
      }
    }
  }

  // Use inside the wallet transaction,
  // after checking an idempotent replay.
  async lockBetEvent(
    connection,
    matchId,
  ) {
    const controls = (
      await connection.query(
        `
          SELECT *
          FROM tsb_sports_control_v2
          ORDER BY sport
          FOR SHARE
        `,
      )
    ).rows;

    const snapshots = (
      await connection.query(
        `
          SELECT *
          FROM tsb_sports_snapshot_v2
          WHERE feed_key=$1
          ORDER BY sport
          FOR SHARE
        `,
        [this.feedKey],
      )
    ).rows;

    for (
      const snapshot of
      snapshots
    ) {
      const control =
        controls.find(
          item =>
            item.sport ===
            snapshot.sport,
        );

      const row = {
        ...snapshot,
        ...control,
      };

      const event =
        this.rawEvents(
          snapshot.sport,
          row,
        ).find(
          item =>
            String(
              item.eventId,
            ) === matchId ||
            (item.id != null &&
              String(item.id) ===
                matchId),
        );

      if (!event) continue;

      const decorated =
        this.eventState(
          event,
          this.state(
            snapshot.sport,
            row,
          ),
        );

      if (
        !decorated.bettingAllowed
      ) {
        throw errorWith(
          decorated.bettingReason,
        );
      }

      return decorated;
    }

    throw errorWith(
      'Match unavailable in the saved feed. Open a current match from the list.',
    );
  }
}

export const sportsService =
  new SportsService();
