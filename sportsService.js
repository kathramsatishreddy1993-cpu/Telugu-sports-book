import { config } from './env.js';
import { OddsApiAdapter } from './oddsApiAdapter.js';
import { MockSportsProvider } from './mockProvider.js';

class SportsService {
  constructor() {
    this.primaryAdapter = new OddsApiAdapter();
    this.fallbackProvider = new MockSportsProvider();

    this.cache = new Map();
    this.clients = new Set();
    this.apiConnected = false;

    // Demo mode is enabled through Render Environment.
    this.demoMode =
      String(process.env.SPORTS_API_MODE || 'demo')
        .trim()
        .toLowerCase() === 'demo';

    this.supportedSports = [
      'cricket',
      'football',
      'tennis',
      'kabaddi',
      'basketball',
      'baseball',
      'fight_events',
    ];

    this.startPolling();
  }

  async refreshData() {
    // DEMO MODE: Never call the paid sports API.
    if (this.demoMode) {
      await this.loadDemoMatches();
      return;
    }

    const allEvents = [];
    let successfulApiSports = 0;

    if (config.apiKey) {
      for (const sport of this.supportedSports) {
        // Kabaddi is displayed using demo data.
        if (sport === 'kabaddi') continue;

        try {
          const events =
            await this.primaryAdapter.fetchEvents(sport);

          if (Array.isArray(events)) {
            allEvents.push(...events);
          }

          successfulApiSports += 1;
        } catch (error) {
          console.error(
            `Sports API error [${sport}]:`,
            error.message
          );
        }
      }
    }

    if (successfulApiSports > 0) {
      this.apiConnected = true;
      this.updateCache(allEvents);
      this.broadcast(allEvents);
      return;
    }

    this.apiConnected = false;
    await this.loadDemoMatches();
  }

  async loadDemoMatches() {
    this.apiConnected = false;

    try {
      const events =
        await this.fallbackProvider.fetchEvents('all');

      const demoEvents = Array.isArray(events)
        ? events.map((event) => ({
            ...event,
            source: 'DEMO_MOCK',
          }))
        : [];

      this.updateCache(demoEvents);
      this.broadcast(demoEvents);

    } catch (error) {
      console.error(
        'Demo provider error:',
        error.message
      );

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
            String(event?.sport || '')
              .toLowerCase() === sport
        )
      );
    }
  }

  startPolling() {
    this.refreshData();

    const pollInterval =
      Number(config.pollIntervalMs) > 0
        ? Number(config.pollIntervalMs)
        : 60000;

    setInterval(() => {
      this.refreshData();
    }, pollInterval);
  }

  addClient(res) {
    this.clients.add(res);

    const initialEvents =
      this.cache.get('all') || [];

    res.write(
      `data: ${JSON.stringify({
        type: 'INIT',
        events: initialEvents,
        source: this.apiConnected
          ? 'REAL_API'
          : 'DEMO_MOCK',
      })}\n\n`
    );
  }

  removeClient(res) {
    this.clients.delete(res);
  }

  broadcast(events) {
    const payload = `data: ${JSON.stringify({
      type: 'UPDATE',
      events: Array.isArray(events)
        ? events
        : [],
      source: this.apiConnected
        ? 'REAL_API'
        : 'DEMO_MOCK',
    })}\n\n`;

    for (const client of this.clients) {
      try {
        client.write(payload);
      } catch (error) {
        this.clients.delete(client);
      }
    }
  }

  getEvents(sport = 'all') {
    if (!sport || sport === 'all') {
      return this.cache.get('all') || [];
    }

    return (
      this.cache.get(
        String(sport).toLowerCase()
      ) || []
    );
  }

  isApiConnected() {
    return (
      !this.demoMode &&
      this.apiConnected &&
      Boolean(config.apiKey)
    );
  }
}

export const sportsService =
  new SportsService();
