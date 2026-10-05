import { BaseSportsProvider } from './baseProvider.js';
import { createCommonEvent } from './commonEvent.js';
import { config } from './env.js';

export class OddsApiAdapter extends BaseSportsProvider {
  constructor() {
    super('OddsApiAdapter');

    this.isRateLimited = false;
    this.rateLimitResetTime = 0;

    this.sportKeyMap = {
      cricket: 'cricket_ipl',
      football: 'soccer_epl',
      tennis: 'tennis_atp',
      basketball: 'basketball_nba',
      baseball: 'baseball_mlb',
      fight_events: 'mma_mixed_martial_arts',
    };
  }

  async fetchEvents(sportCategory) {
    if (!config.apiKey) {
      throw new Error(
        'SPORTS_API_KEY is missing on server.'
      );
    }

    if (this.isRateLimited) {
      if (Date.now() < this.rateLimitResetTime) {
        throw new Error(
          'Rate limit backoff active.'
        );
      }

      this.isRateLimited = false;
    }

    const category =
      String(sportCategory || 'football')
        .toLowerCase();

    const vendorKey = this.sportKeyMap[category];

    if (!vendorKey) {
      throw new Error(
        `Unsupported sport category: ${category}`
      );
    }

    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, Number(config.timeoutMs) || 10000);

    try {
      const endpoint =
        `${config.baseUrl}/sports/${vendorKey}/scores/` +
        `?apiKey=${encodeURIComponent(config.apiKey)}` +
        `&daysFrom=1`;

      const response = await fetch(endpoint, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        this.isRateLimited = true;

        this.rateLimitResetTime =
          Date.now() +
          (Number(config.rateLimitBackoffMs) || 60000);

        throw new Error(
          'HTTP 429: API Rate Limit Exceeded'
        );
      }

      if (!response.ok) {
        throw new Error(
          `Upstream API status: ${response.status}`
        );
      }

      const rawData = await response.json();

      if (!Array.isArray(rawData)) {
        throw new Error(
          'Invalid response received from sports API.'
        );
      }

      return rawData.map((item) =>
        this.normalizeEvent(item, category)
      );
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  normalizeEvent(item, sportCategory) {
    const isCompleted = Boolean(item?.completed);

    const hasScores =
      Array.isArray(item?.scores) &&
      item.scores.length >= 2;

    /*
     * The upstream /scores endpoint provides scores for
     * events that have started / have scoring data.
     */
    const isLive =
      !isCompleted &&
      hasScores;

    let status = 'UPCOMING';

    if (isCompleted) {
      status = 'ENDED';
    } else if (isLive) {
      status = 'LIVE';
    }

    let scoreStr = 'Not started';

    if (hasScores) {
      const first = item.scores[0];
      const second = item.scores[1];

      scoreStr =
        `${first?.name || 'Home'}: ` +
        `${first?.score ?? '0'} vs ` +
        `${second?.name || 'Away'}: ` +
        `${second?.score ?? '0'}`;
    }

    return createCommonEvent({
      eventId: `odds_api_${item.id}`,

      sport: sportCategory,

      league:
        item.sport_title ||
        'International Event',

      homeTeam:
        item.home_team ||
        'Home Team',

      awayTeam:
        item.away_team ||
        'Away Team',

      status,

      startTime:
        item.commence_time ||
        new Date().toISOString(),

      score: scoreStr,

      /*
       * Informational/demo odds values only.
       * No wagering/payment logic is implemented.
       */
      odds: {
        home: 1.90,
        away: 1.90,
      },

      source: 'REAL_API',

      lastUpdated:
        new Date().toISOString(),
    });
  }
}
