// mockProvider.js
// Generates realistic mock sports events for demo mode

export class MockSportsProvider {
  constructor() {
    this.teams = {
      cricket: [
        { name: 'India', code: 'IND' },
        { name: 'Australia', code: 'AUS' },
        { name: 'England', code: 'ENG' },
        { name: 'Pakistan', code: 'PAK' },
        { name: 'South Africa', code: 'SA' },
        { name: 'New Zealand', code: 'NZ' },
        { name: 'Sri Lanka', code: 'SL' },
        { name: 'West Indies', code: 'WI' },
      ],
      football: [
        { name: 'Manchester United', code: 'MUN' },
        { name: 'Liverpool', code: 'LIV' },
        { name: 'Arsenal', code: 'ARS' },
        { name: 'Chelsea', code: 'CHE' },
      ],
    };

    this.leagues = {
      cricket: [
        'ICC Cricket World Cup',
        'Indian Premier League',
        'Big Bash League',
        'The Ashes',
      ],
      football: ['Premier League', 'Champions League'],
    };
  }

  async fetchEvents(sport = 'all') {
    const now = Date.now();
    const events = [];
    const sports = sport === 'all' ? ['cricket'] : [sport];

    for (const s of sports) {
      const teamList = this.teams[s] || [];
      const leagueList = this.leagues[s] || [];

      // Generate 6 mock events per sport
      for (let i = 0; i < 6; i++) {
        const home = teamList[i % teamList.length];
        const away = teamList[(i + 1) % teamList.length];
        const league = leagueList[i % leagueList.length];

        // Mix of live, upcoming, and ended statuses
        const statuses = ['LIVE', 'UPCOMING', 'UPCOMING', 'LIVE', 'ENDED', 'UPCOMING'];
        const status = statuses[i % statuses.length];

        const startOffset = status === 'LIVE'
          ? -30 * 60 * 1000  // started 30 min ago
          : status === 'ENDED'
            ? -3 * 60 * 60 * 1000  // started 3h ago
            : (i + 1) * 60 * 60 * 1000;  // starts in future

        const startTime = new Date(now + startOffset).toISOString();

        let score = '0/0 (0 ov) vs 0/0 (0 ov)';
        if (status === 'LIVE') {
          const homeRuns = 80 + i * 12;
          const awayRuns = 45 + i * 8;
          score = `${homeRuns}/3 (12.4 ov) vs ${awayRuns}/2 (9.1 ov)`;
        } else if (status === 'ENDED') {
          score = `${150 + i * 10}/8 (20 ov) vs ${140 + i * 5}/9 (20 ov)`;
        }

        events.push({
          eventId: `mock_${s}_${i}`,
          sport: s,
          league,
          homeTeam: home.name,
          awayTeam: away.name,
          status,
          startTime,
          score,
          odds: {
            home: Number((1.5 + Math.random()).toFixed(2)),
            away: Number((2.0 + Math.random()).toFixed(2)),
          },
          source: 'DEMO_MOCK',
          lastUpdated: new Date().toISOString(),
          provider: 'mock',
          providerEventId: `mock_${s}_${i}`,
          providerStatus: status,
          matchType: s === 'cricket' ? 'T20' : 'League',
          note: 'Demo data — not real',
          oddsAvailable: true,
        });
      }
    }

    return events;
  }
}
