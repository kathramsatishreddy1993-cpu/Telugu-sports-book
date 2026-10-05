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

    this.supportedSports = [
      'cricket',
      'football',
      'tennis',
      'basketball',
      'baseball',
      'fight_events',
    ];

    this.startPolling();
  }

  async refreshData() {
    const allEvents = [];
    let successfulApiSports = 0;

    /*
     * Fetch each supported sport separately.
     * One failed sport must not break the others.
     */
    if (config.apiKey) {
      for (const sport of this.supportedSports) {
        try {
          const events = await this.primaryAdapter.fetchEvents(sport);

          if (Array.isArray(events) && events.length > 0) {
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

    /*
     * If at least one API sport worked, use API data.
     * Otherwise use the mock provider.
     */
    if (successfulApiSports > 0) {
      this.apiConnected = true;

      this.cache.set('all', allEvents);

      for (const sport of this.supportedSports) {
        this.cache.set(
          sport,
          allEvents.filter(
            (event) =>
              event?.sport?.toLowerCase() === sport.toLowerCase()
          )
        );
      }

      this.broadcast(allEvents);
      return;
    }

    /*
     * Complete API failure / no API key:
     * use demo/mock events.
     */
    this.apiConnected = false;

    try {
      const mockEvents = await this.fallbackProvider.fetchEvents('all');
      const safeMockEvents = Array.isArray(mockEvents)
        ? mockEvents
        : [];

      this.cache.set('all', safeMockEvents);

      for (const sport of this.supportedSports) {
        this.cache.set(
          sport,
          safeMockEvents.filter(
            (event) =>
              event?.sport?.toLowerCase() === sport.toLowerCase()
          )
        );
      }

      this.broadcast(safeMockEvents);
    } catch (error) {
      console.error('Mock sports provider error:', error.message);

      this.cache.set('all', []);
      this.broadcast([]);
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

    const initialEvents = this.cache.get('all') || [];

    res.write(
      `data: ${JSON.stringify({
        type: 'INIT',
        events: initialEvents,
        source: this.apiConnected ? 'REAL_API' : 'DEMO_MOCK',
      })}\n\n`
    );
  }

  removeClient(res) {
    this.clients.delete(res);
  }

  broadcast(events) {
    const payload = `data: ${JSON.stringify({
      type: 'UPDATE',
      events: Array.isArray(events) ? events : [],
      source: this.apiConnected ? 'REAL_API' : 'DEMO_MOCK',
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

    return this.cache.get(sport.toLowerCase()) || [];
  }

  isApiConnected() {
    return this.apiConnected && Boolean(config.apiKey);
  }
}

export const sportsService = new SportsService();
