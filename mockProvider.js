import { BaseSportsProvider } from './baseProvider.js';
import { createCommonEvent } from '../types/commonEvent.js';

export class MockSportsProvider extends BaseSportsProvider {
  constructor() {
    super('MockSportsProvider');
  }

  async fetchEvents(sportCategory) {
    const timestamp = new Date().toISOString();
    const allMockEvents = [
      createCommonEvent({
        eventId: 'demo_cricket_01',
        sport: 'cricket',
        league: 'IPL Demo League',
        homeTeam: 'Hyderabad Strikers',
        awayTeam: 'Chennai Kings',
        status: 'LIVE',
        startTime: timestamp,
        score: '174/4 (18.1) vs 170/8 (20.0)',
        odds: { home: 1.75, away: 2.10 },
        source: 'DEMO_MOCK',
        lastUpdated: timestamp
      }),
      createCommonEvent({
        eventId: 'demo_football_01',
        sport: 'football',
        league: 'Telangana Super Cup',
        homeTeam: 'Warangal FC',
        awayTeam: 'Khammam United',
        status: 'LIVE',
        startTime: timestamp,
        score: "2 - 1 (72')",
        odds: { home: 1.85, away: 3.40, draw: 3.10 },
        source: 'DEMO_MOCK',
        lastUpdated: timestamp
      }),
      createCommonEvent({
        eventId: 'demo_kabaddi_01',
        sport: 'kabaddi',
        league: 'Pro Kabaddi Simulation',
        homeTeam: 'Telugu Titans Express',
        awayTeam: 'Bengaluru Bulls',
        status: 'LIVE',
        startTime: timestamp,
        score: '32 - 28',
        odds: { home: 1.60, away: 2.30 },
        source: 'DEMO_MOCK',
        lastUpdated: timestamp
      })
    ];

    if (!sportCategory || sportCategory === 'all') {
      return allMockEvents;
    }

    const filtered = allMockEvents.filter(e => e.sport === sportCategory.toLowerCase());
    return filtered.length > 0 ? filtered : allMockEvents;
  }
}