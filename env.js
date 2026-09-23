import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'production',
  provider: process.env.SPORTS_API_PROVIDER || 'odds_api',
  apiKey: process.env.SPORTS_API_KEY || '',
  baseUrl: process.env.SPORTS_API_BASE_URL || 'https://api.the-odds-api.com/v4',
  timeoutMs: parseInt(process.env.SPORTS_API_TIMEOUT_MS || '5000', 10),
  rateLimitBackoffMs: parseInt(process.env.SPORTS_API_RATE_LIMIT_BACKOFF_MS || '60000', 10),
  pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '10000', 10)
};