import express from 'express';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import { sportsService } from './sportsService.js';

// Recreate __filename and __dirname equivalent for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

// 1. Body Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Server-side In-memory OTP Store (Mobile Number -> { otp, expiresAt })
const otpStore = new Map();

// Helper Function: Send Real SMS via Fast2SMS using Native HTTPS
function sendFast2SMS(mobile, otp) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.FAST2SMS_API_KEY || process.env.SMS_API_KEY;

    if (!apiKey) {
      return reject(new Error('FAST2SMS_API_KEY environment variable is not configured on Render.'));
    }

    const queryParams = new URLSearchParams({
      authorization: apiKey,
      variables_values: otp,
      route: 'otp',
      numbers: mobile
    }).toString();

    const options = {
      hostname: 'www.fast2sms.com',
      path: `/dev/bulkV2?${queryParams}`,
      method: 'GET',
      headers: {
        'cache-control': 'no-cache'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);

          const isSuccess = response.return === true || response.status_code === 200;

          if (isSuccess) {
            resolve(response);
          } else {
            const errorMsg = Array.isArray(response.message)
              ? response.message.join(', ')
              : (response.message || 'Fast2SMS returned a failure status.');
            reject(new Error(errorMsg));
          }
        } catch (err) {
          reject(new Error('Failed to parse response from Fast2SMS API.'));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

// ==========================================
// 2. Authentication API Routes
// ==========================================

// POST /api/auth/send-otp
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { mobile } = req.body;
    const cleanMobile = mobile ? String(mobile).replace(/\D/g, '') : '';

    if (!cleanMobile || cleanMobile.length !== 10) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
    }

    // Generate secure 6-digit numeric OTP
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

    // Send Real SMS via Fast2SMS
    await sendFast2SMS(cleanMobile, generatedOtp);

    // Store OTP in memory server-side after verified dispatch
    otpStore.set(cleanMobile, { otp: generatedOtp, expiresAt });

    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully.'
    });
  } catch (error) {
    console.error('Fast2SMS Dispatch Error:', error.message);
    return res.status(500).json({
      error: error.message || 'Failed to send SMS OTP. Please try again.'
    });
  }
});

// POST /api/auth/verify-otp
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { mobile, otp } = req.body;
    const cleanMobile = mobile ? String(mobile).replace(/\D/g, '') : '';
    const cleanOtp = otp ? String(otp).trim() : '';

    if (!cleanMobile || cleanMobile.length !== 10) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
    }

    if (!cleanOtp || cleanOtp.length !== 6) {
      return res.status(400).json({ error: 'Please enter a valid 6-digit OTP code.' });
    }

    const record = otpStore.get(cleanMobile);

    if (!record) {
      return res.status(400).json({ error: 'No active OTP found. Please request a new code.' });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(cleanMobile);
      return res.status(400).json({ error: 'OTP has expired. Please request a new code.' });
    }

    if (record.otp !== cleanOtp) {
      return res.status(400).json({ error: 'Invalid OTP code. Please check and try again.' });
    }

    // Clear OTP record upon successful verification
    otpStore.delete(cleanMobile);

    return res.status(200).json({
      success: true,
      message: 'Mobile number verified successfully.'
    });
  } catch (error) {
    console.error('Verify OTP Error:', error);
    return res.status(500).json({ error: 'Server error during OTP verification.' });
  }
});

// ==========================================
// 3. Sports Service API Routes
// ==========================================

// GET /api/health
app.get('/api/health', async (req, res) => {
  try {
    const apiConnected = typeof sportsService.isApiConnected === 'function'
      ? await sportsService.isApiConnected()
      : true;

    return res.status(200).json({
      status: 'ok',
      provider: 'odds_api',
      apiConnected: Boolean(apiConnected)
    });
  } catch (error) {
    console.error('Health Check Error:', error);
    return res.status(500).json({
      status: 'error',
      provider: 'odds_api',
      apiConnected: false
    });
  }
});

// GET /api/sports/events?sport=...
app.get('/api/sports/events', async (req, res) => {
  try {
    const sport = req.query.sport || 'all';
    const events = await sportsService.getEvents(sport);

    return res.status(200).json({
      data: events || []
    });
  } catch (error) {
    console.error('Get Sports Events Error:', error);
    return res.status(500).json({ error: 'Failed to retrieve sports events.' });
  }
});

// GET /api/sports/stream (Server-Sent Events)
app.get('/api/sports/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  if (typeof sportsService.addClient === 'function') {
    sportsService.addClient(res);
  }

  req.on('close', () => {
    if (typeof sportsService.removeClient === 'function') {
      sportsService.removeClient(res);
    }
  });
});

// ==========================================
// 4. API 404 Guard
// ==========================================
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `API endpoint ${req.originalUrl} not found.` });
});

// ==========================================
// 5. Serve Static Frontend Assets & SPA Catch-All
// ==========================================
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

```
