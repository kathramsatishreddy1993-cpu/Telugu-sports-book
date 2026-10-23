import { MockSportsProvider } from "./mockProvider.js";
import { createCommonEvent } from "./commonEvent.js";

const BASE_URL =
  "https://cricket.sportmonks.com/api/v2.0";

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
  const status = String(fixture.status || "")
    .trim()
    .toLowerCase();

  // Check completed status before the API's live flag.
  if (
    /finished|abandoned|cancelled|canceled|no result|drawn/.test(
      status,
    )
  ) {
    return "ENDED";
  }

  if (
    /not started|upcoming|scheduled|postponed/.test(
      status,
    )
  ) {
    return "UPCOMING";
  }

  if (
    fixture.live === true ||
    /innings|break|stumps|lunch|tea|delayed|interrupted/.test(
      status,
    )
  ) {
    return "LIVE";
  }

  return "UPCOMING";
}

function teamScore(runs, teamId) {
  const innings = runs.filter(
    (run) => String(run.team_id) === String(teamId),
  );

  if (!innings.length) {
    return "Yet to bat";
  }

  // Preserve multiple innings for Test matches.
  return innings
    .map((run) => {
      const score = run.score ?? "-";
      const wickets = run.wickets ?? "-";
      const overs =
        run.overs == null ? "" : ` (${run.overs} ov)`;

      return `${score}/${wickets}${overs}`;
    })
    .join(" & ");
}

function normalizeFixture(fixture) {
  const home = relation(fixture.localteam);
  const away = relation(fixture.visitorteam);
  const league = relation(fixture.league);
  const runs = asArray(fixture.runs);

  const event = createCommonEvent({
    eventId: `sportmonks_${fixture.id}`,
    sport: "cricket",

    league: league?.name || fixture.type || "Cricket",

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

    source: "REAL_API",
    lastUpdated: new Date().toISOString(),
  });

  return {
    ...event,
    provider: "sportmonks",
    providerEventId: fixture.id,
    providerStatus: fixture.status || "",
    matchType: fixture.type || "",
    note: fixture.note || "",
    oddsAvailable: false,
  };
}

// One shared, database-backed feed. Customer reads never call the provider.
export class SportsService {
  constructor({
    fetcher = (...args) => fetch(...args),
    now = () => Date.now(),
  } = {}) {
    this.fetcher = fetcher;
    this.now = now;
    this.pool = null;
    this.clients = new Set();
    this.controllers = new Set();
    this.timer = null;
    this.busy = false;
    this.enabled = false;
    this.version = 0;
    this.liveEvents = [];
    this.scheduleEvents = [];
    this.lastSuccessAt = null;
    this.scheduleUpdatedAt = null;
    this.lastError = null;
    this.scheduleError = null;
    this.retryAt = null;
    this.lastMessage = "";
    this.pollIntervalMs = 5000;
    this.scheduleIntervalMs = 300000;
    this.mode = String(
      process.env.SPORTS_API_MODE || "demo",
    )
      .trim()
      .toLowerCase();
    this.demoMode = this.mode === "demo";
    this.apiKey = String(
      process.env.SPORTMONKS_API_TOKEN || "",
    ).trim();
    this.feedKey = this.demoMode
      ? "mock:demo"
      : "sportmonks:live";
    this.timeoutMs = positiveNumber(
      process.env.SPORTMONKS_TIMEOUT_MS,
      15000,
    );
    this.fallbackProvider = new MockSportsProvider();
  }

  async initialize(pool) {
    this.pool = pool;
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tsb_sports_feed_control (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        enabled BOOLEAN NOT NULL DEFAULT TRUE,
        version INTEGER NOT NULL DEFAULT 0,
        updated_by TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      INSERT INTO tsb_sports_feed_control(id) VALUES (1)
        ON CONFLICT DO NOTHING;
      CREATE TABLE IF NOT EXISTS tsb_sports_feed_snapshot (
        feed_key TEXT PRIMARY KEY,
        live_events JSONB NOT NULL DEFAULT '[]'::JSONB,
        schedule_events JSONB NOT NULL DEFAULT '[]'::JSONB,
        last_success_at TIMESTAMPTZ,
        schedule_updated_at TIMESTAMPTZ,
        last_attempt_at TIMESTAMPTZ,
        retry_at TIMESTAMPTZ,
        last_error TEXT,
        schedule_error TEXT
      );
      CREATE TABLE IF NOT EXISTS tsb_sports_feed_audit (
        id BIGSERIAL PRIMARY KEY,
        admin_id TEXT NOT NULL,
        enabled BOOLEAN NOT NULL,
        version INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await pool.query(
      "INSERT INTO tsb_sports_feed_snapshot(feed_key) VALUES ($1) ON CONFLICT DO NOTHING",
      [this.feedKey],
    );
    await this.readSaved();
  }
    async readSaved(connection = this.pool) {
    const { rows } = await connection.query(
      `SELECT c.enabled, c.version, s.*
       FROM tsb_sports_feed_control c
       JOIN tsb_sports_feed_snapshot s ON s.feed_key = $1
       WHERE c.id = 1`,
      [this.feedKey],
    );

    const row = rows[0];

    if (!row) {
      throw new Error(
        "Sports feed is not initialized.",
      );
    }

    this.enabled = row.enabled;
    this.version = Number(row.version);

    this.liveEvents = Array.isArray(row.live_events)
      ? row.live_events
      : [];

    this.scheduleEvents = Array.isArray(
      row.schedule_events,
    )
      ? row.schedule_events
      : [];

    this.lastSuccessAt = row.last_success_at;
    this.scheduleUpdatedAt = row.schedule_updated_at;
    this.lastError = row.last_error;
    this.scheduleError = row.schedule_error;
    this.retryAt = row.retry_at;

    return row;
  }

  getEvents(sport = "all") {
    const merged = new Map();

    for (const event of [
      ...this.scheduleEvents,
      ...this.liveEvents,
    ]) {
      merged.set(
        String(event.eventId ?? event.id),
        event,
      );
    }

    const category = String(sport || "all")
      .trim()
      .toLowerCase();

    return [...merged.values()].filter(
      event =>
        String(event.status || "").toUpperCase() !==
          "ENDED" &&
        (
          category === "all" ||
          String(event.sport || "").toLowerCase() ===
            category
        ),
    );
  }

  isApiConnected() {
    return (
      this.enabled &&
      !this.demoMode &&
      !this.lastError &&
      Boolean(this.apiKey) &&
      Boolean(this.lastSuccessAt) &&
      this.now() -
        new Date(this.lastSuccessAt).getTime() <
        Math.max(15000, this.timeoutMs * 2)
    );
  }

  payload(type = "UPDATE", events = this.getEvents()) {
    return {
      type,
      events,

      source: this.demoMode
        ? "DEMO_MOCK"
        : this.lastSuccessAt
          ? "REAL_API"
          : "API_UNAVAILABLE",

      provider: this.demoMode
        ? "mock"
        : "sportmonks",

      enabled: this.enabled,
      paused: !this.enabled,

      stale:
        !this.enabled ||
        Boolean(this.lastError) ||
        !this.lastSuccessAt ||
        (!this.demoMode && !this.isApiConnected()),

      apiConnected: this.isApiConnected(),
      lastUpdated: this.lastSuccessAt,
      scheduleUpdatedAt: this.scheduleUpdatedAt,
      pollIntervalMs: this.pollIntervalMs,
      error: this.lastError,
      scheduleError: this.scheduleError,
    };
  }

  async getFeedState(sport = "all") {
    await this.readSaved();

    const payload = this.payload(
      "STATE",
      this.getEvents(sport),
    );

    return {
      ...payload,
      data: payload.events,
    };
  }

  async getAdminState() {
    await this.readSaved();

    return {
      ...this.payload("CONTROL"),
      events: undefined,
      version: this.version,
      configured:
        this.demoMode || Boolean(this.apiKey),
      mode: this.mode,
      supportedLiveSports: this.demoMode
        ? []
        : ["cricket"],
      savedMatches: this.getEvents().length,
      scheduleIntervalMs: this.scheduleIntervalMs,
      retryAt: this.retryAt,
    };
  }

  async setEnabled(enabled, version, adminId) {
    if (
      typeof enabled !== "boolean" ||
      !Number.isInteger(version)
    ) {
      throw Object.assign(
        new Error(
          "Choose ON or OFF with the current version.",
        ),
        { status: 400 },
      );
    }

    const connection = await this.pool.connect();

    try {
      await connection.query("BEGIN");

      const row = (
        await connection.query(
          "SELECT * FROM tsb_sports_feed_control WHERE id = 1 FOR UPDATE",
        )
      ).rows[0];

      if (Number(row.version) !== version) {
        throw Object.assign(
          new Error(
            "Settings changed on another device. Refresh and try again.",
          ),
          { status: 409 },
        );
      }

      if (row.enabled !== enabled) {
        await connection.query(
          `UPDATE tsb_sports_feed_control
           SET enabled = $1, version = version + 1,
               updated_by = $2, updated_at = NOW() WHERE id = 1`,
          [enabled, String(adminId || "admin")],
        );

        if (enabled) {
          await connection.query(
            "UPDATE tsb_sports_feed_snapshot SET last_attempt_at = NULL WHERE feed_key = $1",
            [this.feedKey],
          );
        }

        await connection.query(
          `INSERT INTO tsb_sports_feed_audit(admin_id, enabled, version)
           VALUES ($1, $2, $3)`,
          [
            String(adminId || "admin"),
            enabled,
            version + 1,
          ],
        );
      }

      await connection.query("COMMIT");
    } catch (error) {
      await connection.query("ROLLBACK");
      throw error;
    } finally {
      connection.release();
    }

    if (!enabled) {
      for (const controller of this.controllers) {
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
    async stillEnabled(connection, version) {
    const row = (
      await connection.query(
        "SELECT enabled, version FROM tsb_sports_feed_control WHERE id = 1",
      )
    ).rows[0];

    if (
      !row.enabled ||
      Number(row.version) !== version
    ) {
      throw Object.assign(
        new Error("Sports feed stopped."),
        { stopped: true },
      );
    }
  }

  async fetchFixtures(
    connection,
    version,
    schedule = false,
  ) {
    const fixtures = [];

    for (let page = 1; page <= 20; page++) {
      await this.stillEnabled(connection, version);

      const url = new URL(
        `${BASE_URL}/${schedule ? "fixtures" : "livescores"}`,
      );

      url.searchParams.set("api_token", this.apiKey);

      url.searchParams.set(
        "include",
        "localteam,visitorteam,league,runs",
      );

      url.searchParams.set("page", String(page));

      if (schedule) {
        const day = 86400000;

        const start = new Date(this.now() - 7 * day)
          .toISOString()
          .slice(0, 10);

        const end = new Date(this.now() + 2 * day)
          .toISOString()
          .slice(0, 10);

        url.searchParams.set(
          "filter[starts_between]",
          `${start},${end}`,
        );
      }

      const controller = new AbortController();
      this.controllers.add(controller);

      const timer = setTimeout(
        () => controller.abort(),
        this.timeoutMs,
      );

      try {
        const response = await this.fetcher(url, {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          let delay = 0;

          if (
            [401, 403, 429].includes(response.status)
          ) {
            const header =
              response.headers.get("retry-after");

            const seconds =
              header == null ? NaN : Number(header);

            const date = Date.parse(header || "");

            delay =
              response.status === 429 &&
              Number.isFinite(seconds)
                ? Math.max(5000, seconds * 1000)
                : response.status === 429 &&
                    Number.isFinite(date)
                  ? Math.max(5000, date - this.now())
                  : 900000;
          }

          throw Object.assign(
            new Error(
              `Sportmonks HTTP ${response.status}`,
            ),
            { delay },
          );
        }

        const body = await response.json();

        if (!Array.isArray(body?.data)) {
          throw new Error("Invalid provider data.");
        }

        fixtures.push(...body.data);

        const pages = Number(
          body.meta?.pagination?.total_pages || 1,
        );

        if (page >= pages) {
          return fixtures
            .filter(item => item?.id != null)
            .map(normalizeFixture);
        }
      } finally {
        clearTimeout(timer);
        this.controllers.delete(controller);
      }
    }

    throw new Error(
      "Provider pagination limit reached.",
    );
  }

  safeError(error) {
    if (error?.name === "AbortError") {
      return "Sports request stopped or timed out.";
    }

    if (
      /^Sportmonks HTTP \d{3}$/.test(
        error?.message || "",
      )
    ) {
      return error.message;
    }

    return "Sports feed update failed. Showing saved matches.";
  }

  async poll(connection, row) {
    const version = Number(row.version);
    const attemptedAt = new Date(this.now());

    await connection.query(
      "UPDATE tsb_sports_feed_snapshot SET last_attempt_at = $1 WHERE feed_key = $2",
      [attemptedAt, this.feedKey],
    );

    let live = this.liveEvents;
    let schedule = this.scheduleEvents;
    let successAt = this.lastSuccessAt;
    let scheduleAt = this.scheduleUpdatedAt;
    let errorMessage = null;
    let scheduleError = this.scheduleError;
    let retryAt = null;

    try {
      if (this.demoMode) {
        live =
          await this.fallbackProvider.fetchEvents(
            "all",
          );

        if (!Array.isArray(live)) {
          throw new Error("Invalid demo feed.");
        }

        live = live.map(event => ({
          ...event,
          source: "DEMO_MOCK",
        }));

        successAt = new Date(this.now());
      } else {
        if (this.mode !== "live" || !this.apiKey) {
          throw new Error(
            "Provider configuration missing.",
          );
        }

        live = await this.fetchFixtures(
          connection,
          version,
        );

        successAt = new Date(this.now());

        if (
          !scheduleAt ||
          this.now() -
            new Date(scheduleAt).getTime() >=
            this.scheduleIntervalMs
        ) {
          try {
            schedule = await this.fetchFixtures(
              connection,
              version,
              true,
            );

            scheduleAt = new Date(this.now());
            scheduleError = null;
          } catch (error) {
            if (error.stopped) throw error;

            scheduleError = this.safeError(error);

            if (error.delay) {
              retryAt = new Date(
                this.now() + error.delay,
              );
            }
          }
        }
      }
    } catch (error) {
      if (error.stopped) return;

      errorMessage =
        !this.demoMode && !this.apiKey
          ? "SPORTMONKS_API_TOKEN is missing."
          : this.safeError(error);

      if (error.delay) {
        retryAt = new Date(this.now() + error.delay);
      }
    }

    // OFF/version changes override an older response.
    await connection.query(
      `UPDATE tsb_sports_feed_snapshot
       SET live_events = $1::JSONB,
           schedule_events = $2::JSONB,
           last_success_at = $3,
           schedule_updated_at = $4,
           last_error = $5,
           schedule_error = $6,
           retry_at = $7
       WHERE feed_key = $8
         AND EXISTS (
           SELECT 1
           FROM tsb_sports_feed_control
           WHERE id = 1
             AND enabled = TRUE
             AND version = $9
         )`,
      [
        JSON.stringify(live),
        JSON.stringify(schedule),
        successAt,
        scheduleAt,
        errorMessage,
        scheduleError,
        retryAt,
        this.feedKey,
        version,
      ],
    );
  }
    async tick() {
    if (!this.pool || this.busy) return;

    this.busy = true;

    let connection;
    let locked = false;

    try {
      await this.readSaved();

      if (!this.enabled) return;

      connection = await this.pool.connect();

      const lockResult = await connection.query(
        "SELECT pg_try_advisory_lock(746249) AS locked",
      );

      locked = lockResult.rows[0].locked;

      if (!locked) return;

      const row = await this.readSaved(connection);

      if (!row.enabled) return;

      if (
        row.retry_at &&
        this.now() < new Date(row.retry_at).getTime()
      ) {
        return;
      }

      if (
        row.last_attempt_at &&
        this.now() -
          new Date(row.last_attempt_at).getTime() <
          this.pollIntervalMs
      ) {
        return;
      }

      await this.poll(connection, row);

      await this.readSaved(connection);
    } catch {
      console.error(
        "[SportsService] Feed synchronization failed; saved matches retained.",
      );
    } finally {
      if (connection) {
        let releaseError;

        if (locked) {
          try {
            await connection.query(
              "SELECT pg_advisory_unlock(746249)",
            );
          } catch (error) {
            releaseError = error;
          }
        }

        connection.release(releaseError);
      }

      this.busy = false;
      this.broadcast();
    }
  }

  start() {
    if (this.timer || !this.pool) return;

    void this.tick();

    this.timer = setInterval(() => {
      void this.tick();
    }, this.pollIntervalMs);

    this.timer.unref?.();
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;

    for (const controller of this.controllers) {
      controller.abort();
    }
  }

  addClient(res) {
    this.clients.add(res);

    try {
      res.write(
        `data: ${JSON.stringify(this.payload("INIT"))}\n\n`,
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
      `data: ${JSON.stringify(this.payload())}\n\n`;

    if (message === this.lastMessage) return;

    this.lastMessage = message;

    for (const client of this.clients) {
      if (
        client.destroyed ||
        client.writableEnded
      ) {
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
}

export const sportsService = new SportsService();
