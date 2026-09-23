import { config } from '../config/env.js';
import { OddsApiAdapter } from '../adapters/oddsApiAdapter.js';
import { MockSportsProvider } from '../providers/mockProvider.js';

class SportsService {
  constructor() {
    this.primaryAdapter = new OddsApiAdapter();
    this.fallbackProvider = new MockSportsProvider();
    this.cache = new Map();
    this.clients = new Set();
    this.apiConnected = false;

    this.startPolling();
  }

  async refreshData() {
    try {
      if (config.apiKey) {
        const events = await this.primaryAdapter.fetchEvents('all');
        this.cache.set('all', events);
        this.apiConnected = true;
        this.broadcast(events);
        return;
      }
    } catch (err) {
      // Fall through to fallback
    }

    this.apiConnected = false;
    const mockEvents = await this.fallbackProvider.fetchEvents('all');
    this.cache.set('all', mockEvents);
    this.broadcast(mockEvents);
  }

  startPolling() {
    this.refreshData();
    setInterval(() => this.refreshData(), config.pollIntervalMs);
  }

  addClient(res) {
    this.clients.add(res);
    const initialEvents = this.cache.get('all') || [];
    res.write(`data: ${JSON.stringify({ type: 'INIT', events: initialEvents })}\n\n`);
  }

  removeClient(res) {
    this.clients.delete(res);
  }

  broadcast(events) {
    const payload = `data: ${JSON.stringify({ type: 'UPDATE', events })}\n\n`;
    for (const client of this.clients) {
      client.write(payload);
    }
  }

  getEvents(sport) {
    const all = this.cache.get('all') || [];
    if (!sport || sport === 'all') return all;
    return all.filter(e => e.sport === sport.toLowerCase());
  }

  isApiConnected() {
    return this.apiConnected && Boolean(config.apiKey);
  }
}

export const sportsService = new SportsService();