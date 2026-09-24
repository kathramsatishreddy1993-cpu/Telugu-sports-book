import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './env.js';
import { sportsService } from './sportsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Health check endpoint (Strictly returns boolean flag, never the key)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    provider: config.provider,
    API_CONNECTED: sportsService.isApiConnected(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/sports/events', (req, res) => {
  const sport = req.query.sport;
  const events = sportsService.getEvents(sport);
  res.json({
    success: true,
    count: events.length,
    data: events
  });
});

app.get('/api/sports/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  sportsService.addClient(res);

  req.on('close', () => {
    sportsService.removeClient(res);
  });
});

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('Telugu Sports Book Proxy Server active.');
    }
  });
});

app.listen(config.port, () => {
  console.log(`Backend Server running on port ${config.port} in ${config.nodeEnv} mode.`);
});
