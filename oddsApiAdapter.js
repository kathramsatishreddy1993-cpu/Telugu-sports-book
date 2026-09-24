import { BaseSportsProvider } from './baseProvider.js';
import { createCommonEvent } from './commonEvent.js';
import { config } from './env.js';

export class OddsApiAdapter extends BaseSportsProvider {
  constructor() {
    super('OddsApiAdapter');
    this.isRateLimited = false;
    this.rateLimitResetTime = 0;
  }

  async fetchEvents(sportCategory) {
    if (!config.apiKey) {
      throw new Error('SPORTS_API_KEY is missing on server.');
    }

    if (this.isRateLimited) {
      if (Date.now() < this.rateLimitResetTime) {
        throw new Error('Rate limit backoff active.');
      }
      this.isRateLimited = false;
    }

    const sportKeyMap = {
      cricket: 'cricket_ipl',
      football: 'soccer_epl',
      tennis: 'tennis_atp',
      basketball: 'basketball_nba',
      baseball: 'baseball_mlb',
      fight_events: 'mma_mixed_martial_arts'
    };

    const vendorKey = sportKeyMap[sportCategory.toLowerCase()] || 'soccer_epl';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const endpoint = `${config.baseUrl}/sports/${vendorKey}/scores/?apiKey=${config.apiKey}&daysFrom=1`;
      const response = await fetch(endpoint, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.status === 429) {
        this.isRateLimited = true;
        this.rateLimitResetTime = Date.now() + config.rateLimitBackoffMs;
        throw new Error('HTTP 429: API Rate Limit Exceeded');
      }

      if (!response.ok) {
        throw new Error(`Upstream API status: ${response.status}`);
      }

      const rawData = await response.json();
      return rawData.map(item => this.normalizeEvent(item, sportCategory));
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  normalizeEvent(item, sportCategory) {
    const isCompleted = item.completed;
    const isLive = !isCompleted && item.scores && item.scores.length > 0;
    const status = isLive ? 'LIVE' : isCompleted ? 'ENDED' : 'UPCOMING';

    let scoreStr = '0 - 0';
    if (item.scores && item.scores.length >= 2) {
      scoreStr = `${item.scores[0].name}: ${item.scores[0].score} vs ${item.scores[1].name}: ${item.scores[1].score}`;
    }

    return createCommonEvent({
      eventId: `odds_api_${item.id}`,
      sport: sportCategory,
      league: item.sport_title || 'International Event',
      homeTeam: item.home_team || 'Home Team',
      awayTeam: item.away_team || 'Away Team',
      status,
      startTime: item.commence_time || new Date().toISOString(),
      score: scoreStr,
      odds: { home: 1.90, away: 1.90 },
      source: 'REAL_API',
      lastUpdated: new Date().toISOString()
    });
  }
}
