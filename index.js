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

// ==========================================
// 📱 OTP STORAGE (In-Memory)
// ==========================================
// Structure: { mobile: { otp: '123456', expiresAt: 1234567890, verified: false } }
const otpStore = new Map();

// ప్రతి 5 నిమిషాలకు ఎక్స్‌పైర్ అయిన OTPలు క్లీన్ చేయండి
setInterval(() => {
  const now = Date.now();
  for (const [mobile, data] of otpStore.entries()) {
    if (data.expiresAt < now) {
      otpStore.delete(mobile);
    }
  }
}, 5 * 60 * 1000);

// ==========================================
// 📱 SMS SENDER (Fast2SMS)
// ==========================================
async function sendSmsOtp(mobile, otp) {
  const apiKey = process.env.FAST2SMS_API_KEY;
  
  if (!apiKey) {
    console.log(`📱 [DEV MODE] OTP for ${mobile}: ${otp}`);
    return { success: true, devMode: true };
  }

  const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
    method: 'POST',
    headers: {
      'authorization': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      route: 'q',
      message: `Your Telugu Sports Book OTP is ${otp}. Valid for 5 minutes. Do not share.`,
      language: 'english',
      flash: 0,
      numbers: mobile
    })
  });

  const data = await response.json();
  console.log('Fast2SMS Response:', data);
  return { success: data.return === true, data };
}

// ==========================================
// 📱 API: SEND OTP
// ==========================================
app.post('/api/send-otp', async (req, res) => {
  try {
    const { mobile } = req.body;

    // Validation
    if (!mobile || !/^[0-9]{10}$/.test(mobile)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid 10-digit mobile number'
      });
    }

    // Rate Limiting: ఒకే నంబర్‌కి 60 సెకన్లలో ఒకసారి మాత్రమే
    const existing = otpStore.get(mobile);
    if (existing && existing.expiresAt > Date.now() && !existing.verified) {
      const secondsLeft = Math.ceil((existing.expiresAt - Date.now()) / 1000);
      if (secondsLeft > 240) { // 5 నిమిషాల్లో 1 నిమిషం కూడా గడవకపోతే బ్లాక్
        return res.status(429).json({
          success: false,
          message: 'Please wait before requesting a new OTP'
        });
      }
    }

    // 6-అంకెల OTP జనరేట్
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store లో సేవ్ చేయండి (5 నిమిషాల ఎక్స్‌పైరీ)
    otpStore.set(mobile, {
      otp: otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
      verified: false
    });

    // SMS పంపండి
    const smsResult = await sendSmsOtp(mobile, otp);

    if (smsResult.success) {
      res.json({
        success: true,
        message: 'OTP sent successfully',
        devMode: smsResult.devMode || false
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send SMS. Please try again.'
      });
    }

  } catch (error) {
    console.error('Send OTP Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
});

// ==========================================
// 📱 API: VERIFY OTP
// ==========================================
app.post('/api/verify-otp', (req, res) => {
  try {
    const { mobile, otp } = req.body;

    if (!mobile || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Mobile and OTP are required'
      });
    }

    const record = otpStore.get(mobile);

    if (!record) {
      return res.status(400).json({
        success: false,
        message: 'OTP not found. Please request a new one.'
      });
    }

    if (record.expiresAt < Date.now()) {
      otpStore.delete(mobile);
      return res.status(400).json({
        success: false,
        message: 'OTP expired. Please request a new one.'
      });
    }

    if (record.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please try again.'
      });
    }

    // వెరిఫికేషన్ సక్సెస్
    record.verified = true;
    otpStore.set(mobile, record);

    res.json({
      success: true,
      message: 'OTP verified successfully'
    });

  } catch (error) {
    console.error('Verify OTP Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
});

// ==========================================
// 🌐 STATIC FILES & EXISTING ROUTES
// ==========================================
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Health check endpoint
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
