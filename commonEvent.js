export function createCommonEvent({
  eventId,
  sport,
  league,
  homeTeam,
  awayTeam,
  status = 'UPCOMING',
  startTime = new Date().toISOString(),
  score = '0 - 0',
  odds = { home: 1.90, away: 1.90 },
  source = 'DEMO_MOCK',
  lastUpdated = new Date().toISOString()
}) {
  return {
    eventId,
    sport: String(sport).toLowerCase(),
    league,
    homeTeam,
    awayTeam,
    status,
    startTime,
    score,
    odds,
    source,
    lastUpdated
  };
}