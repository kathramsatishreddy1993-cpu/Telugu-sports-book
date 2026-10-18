import {
  initializeRoulette,
  registerRouletteRoutes,
} from './rouletteRoutes.js';

import {
  initializeControllerAccounts,
  registerControllerAccountRoutes,
  requireOldAdmin,
} from './controllerAccounts.js';

import express from 'express';
import path from 'path';
import https from 'https';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import { fileURLToPath } from 'url';

import { sportsService } from './sportsService.js';

import {
  initializeFlight,
  registerFlightRoutes,
} from './flightRoutes.js';

import {
  initializeDemoBets,
  registerDemoBetRoutes,
  issueCustomerSession,
} from './demoBetRoutes.js';

const { Pool } = pg;

const __dirname = path.dirname(
  fileURLToPath(import.meta.url),
);

const app = express();
const PORT = process.env.PORT || 10000;
const DEFAULT_ADMIN_WHATSAPP_NUMBER = '919346824432';

app.use(express.json({ limit: '2mb' }));
app.use(
  express.urlencoded({
    extended: true,
    limit: '2mb',
  }),
);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
});

const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const normalizeLoginId = (value) =>
  String(value || '').trim().toLowerCase();

const normalizeWhatsAppNumber = (value) =>
  String(value || '').replace(/\D/g, '').trim();

const isValidWhatsAppNumber = (value) =>
  /^[1-9][0-9]{9,14}$/.test(value);

const positiveInteger = (value) =>
  Number.isSafeInteger(Number(value)) &&
  Number(value) > 0 &&
  Number(value) <= 2147483647;

const publicCustomer = (customer) => ({
  id: customer.id,
  name: customer.name,
  loginId: customer.login_id,
  mustChangePassword: Boolean(
    customer.must_change_password,
  ),
  mustChangeWithdrawalPassword: Boolean(
    customer.must_change_withdrawal_password,
  ),
  withdrawalPasswordConfigured: Boolean(
    customer.withdrawal_password_hash,
  ),
  status: customer.status,
  createdAt: customer.created_at,
  demoCoinBalance: Number(
    customer.demo_coin_balance || 0,
  ),
  demo_coin_balance: Number(
    customer.demo_coin_balance || 0,
  ),
});

async function initializeDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured.');
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      login_id VARCHAR(60) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
      withdrawal_password_hash TEXT,
      must_change_withdrawal_password BOOLEAN NOT NULL DEFAULT TRUE,
      status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
      demo_coin_balance INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE customers
      ADD COLUMN IF NOT EXISTS withdrawal_password_hash TEXT;

    ALTER TABLE customers
      ADD COLUMN IF NOT EXISTS must_change_withdrawal_password
      BOOLEAN NOT NULL DEFAULT TRUE;

    ALTER TABLE customers
      ADD COLUMN IF NOT EXISTS demo_coin_balance
      INTEGER NOT NULL DEFAULT 0;

    CREATE TABLE IF NOT EXISTS site_settings (
      setting_key VARCHAR(100) PRIMARY KEY,
      setting_value TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS demo_coin_transactions (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER NOT NULL
        REFERENCES customers(id) ON DELETE CASCADE,
      amount INTEGER NOT NULL,
      transaction_type VARCHAR(20) NOT NULL,
      note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS demo_withdrawal_requests (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER NOT NULL
        REFERENCES customers(id) ON DELETE CASCADE,
      amount INTEGER NOT NULL,
      account_holder_name TEXT NOT NULL,
      bank_name TEXT NOT NULL,
      account_number TEXT NOT NULL,
      ifsc_code TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS demo_withdrawal_customer_index
      ON demo_withdrawal_requests(customer_id);

    ALTER TABLE demo_withdrawal_requests
      ADD COLUMN IF NOT EXISTS coins_held
      BOOLEAN NOT NULL DEFAULT FALSE;

    ALTER TABLE demo_withdrawal_requests
      ADD COLUMN IF NOT EXISTS coins_restored
      BOOLEAN NOT NULL DEFAULT FALSE;

    CREATE TABLE IF NOT EXISTS demo_deposit_requests (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER NOT NULL
        REFERENCES customers(id) ON DELETE CASCADE,
      reference_number VARCHAR(12) NOT NULL UNIQUE,
      amount INTEGER NOT NULL,
      payment_method VARCHAR(30) NOT NULL,
      proof_name TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS demo_deposit_reference_unique
      ON demo_deposit_requests(reference_number);
  `);

  await pool.query(
    `INSERT INTO site_settings(setting_key,setting_value)
     VALUES('admin_whatsapp_number',$1)
     ON CONFLICT(setting_key) DO NOTHING`,
    [DEFAULT_ADMIN_WHATSAPP_NUMBER],
  );

  await initializeDemoBets(pool);
  await initializeControllerAccounts(pool);
  await initializeFlight(pool);
  await initializeRoulette(pool);

  console.log(
    'Database ready; persistent demo bets and wallet transactions enabled.',
  );
}

registerControllerAccountRoutes(app, pool);
app.use('/api/admin', requireOldAdmin(pool));

async function getAdminWhatsAppNumber() {
  try {
    const result = await pool.query(
      `SELECT setting_value
       FROM site_settings
       WHERE setting_key=$1
       LIMIT 1`,
      ['admin_whatsapp_number'],
    );

    const number = normalizeWhatsAppNumber(
      result.rows[0]?.setting_value,
    );

    return isValidWhatsAppNumber(number)
      ? number
      : DEFAULT_ADMIN_WHATSAPP_NUMBER;
  } catch {
    return DEFAULT_ADMIN_WHATSAPP_NUMBER;
  }
}

for (const route of [
  '/api/public/settings',
  '/api/admin/settings/whatsapp',
]) {
  app.get(
    route,
    wrap(async (req, res) => {
      res.json({
        success: true,
        whatsappNumber: await getAdminWhatsAppNumber(),
      });
    }),
  );
}

app.put(
  '/api/admin/settings/whatsapp',
  wrap(async (req, res) => {
    const number = normalizeWhatsAppNumber(
      req.body.whatsappNumber || req.body.number,
    );

    if (!isValidWhatsAppNumber(number)) {
      return res.status(400).json({
        error:
          'Please enter a valid WhatsApp number with country code.',
      });
    }

    const result = await pool.query(
      `INSERT INTO site_settings(
        setting_key,setting_value,updated_at
      )
      VALUES('admin_whatsapp_number',$1,NOW())
      ON CONFLICT(setting_key)
      DO UPDATE SET
        setting_value=EXCLUDED.setting_value,
        updated_at=NOW()
      RETURNING *`,
      [number],
    );

    res.json({
      success: true,
      message: 'WhatsApp number updated successfully.',
      whatsappNumber: number,
      updatedAt: result.rows[0].updated_at,
    });
  }),
);

app.post(
  '/api/admin/customers',
  wrap(async (req, res) => {
    const name = String(req.body.name || '').trim();
    const loginId = normalizeLoginId(req.body.loginId);

    const password = String(
      req.body.temporaryPassword || '',
    );

    const withdrawal = String(
      req.body.temporaryWithdrawalPassword || '',
    );

    if (!name || name.length > 120) {
      return res.status(400).json({
        error:
          'Customer name is required (maximum 120 characters).',
      });
    }

    if (!/^[a-z0-9._-]{4,30}$/.test(loginId)) {
      return res.status(400).json({
        error:
          'Login ID must be 4-30 characters: letters, numbers, dot, underscore or hyphen.',
      });
    }

    if (password.length < 6 || withdrawal.length < 6) {
      return res.status(400).json({
        error:
          'Both temporary passwords must contain at least 6 characters.',
      });
    }

    if (password === withdrawal) {
      return res.status(400).json({
        error:
          'Login Password and Withdrawal Password must be different.',
      });
    }

    const hashes = await Promise.all([
      bcrypt.hash(password, 12),
      bcrypt.hash(withdrawal, 12),
    ]);

    const result = await pool.query(
      `INSERT INTO customers(
        name,login_id,password_hash,withdrawal_password_hash
      )
      VALUES($1,$2,$3,$4)
      RETURNING *`,
      [name, loginId, ...hashes],
    );

    res.status(201).json({
      success: true,
      message: 'Customer created successfully.',
      customer: publicCustomer(result.rows[0]),
    });
  }),
);

app.get(
  '/api/admin/customers',
  wrap(async (req, res) => {
    const result = await pool.query(
      'SELECT * FROM customers ORDER BY id DESC',
    );

    res.json({
      success: true,
      customers: result.rows.map(publicCustomer),
    });
  }),
);

app.post(
  '/api/admin/customers/:id/add-demo-coins',
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    const amount = Number(req.body.amount);

    if (!positiveInteger(id) || !positiveInteger(amount)) {
      return res.status(400).json({
        error:
          'Valid customer ID and positive whole coin amount are required.',
      });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE customers
         SET demo_coin_balance=demo_coin_balance+$1,
             updated_at=NOW()
         WHERE id=$2
         RETURNING id,name,login_id,demo_coin_balance,status`,
        [amount, id],
      );

      if (!result.rows.length) {
        await client.query('ROLLBACK');

        return res.status(404).json({
          error: 'Customer account not found.',
        });
      }

      await client.query(
        `INSERT INTO demo_coin_transactions(
          customer_id,amount,transaction_type,note
        )
        VALUES($1,$2,'ADMIN_CREDIT',$3)`,
        [
          id,
          amount,
          String(
            req.body.note || 'Demo Coins added by Admin',
          ).trim(),
        ],
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: `${amount} Demo Coins added successfully.`,
        customer: result.rows[0],
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }),
);

app.get(
  '/api/customers/:id/demo-balance',
  wrap(async (req, res) => {
    if (!positiveInteger(req.params.id)) {
      return res.status(400).json({
        error: 'Invalid customer ID.',
      });
    }

    const result = await pool.query(
      `SELECT id,login_id,demo_coin_balance
       FROM customers WHERE id=$1`,
      [Number(req.params.id)],
    );

    if (!result.rows.length) {
      return res.status(404).json({
        error: 'Customer account not found.',
      });
    }

    res.set('Cache-Control', 'no-store');

    res.json({
      success: true,
      customerId: result.rows[0].id,
      loginId: result.rows[0].login_id,
      balance: Number(result.rows[0].demo_coin_balance),
    });
  }),
);

for (const kind of ['login', 'withdrawal']) {
  const withdrawal = kind === 'withdrawal';

  app.post(
    `/api/admin/customers/:id/reset-${kind}-password`,
    wrap(async (req, res) => {
      if (!positiveInteger(req.params.id)) {
        return res.status(400).json({
          error: 'Invalid customer ID.',
        });
      }

      const password = String(
        req.body.password ||
        req.body.newPassword ||
        req.body.temporaryPassword ||
        (
          withdrawal
            ? req.body.temporaryWithdrawalPassword
            : ''
        ) ||
        '',
      );

      if (password.length < 6) {
        return res.status(400).json({
          error:
            'New password must contain at least 6 characters.',
        });
      }

      const result = await pool.query(
        'SELECT * FROM customers WHERE id=$1',
        [Number(req.params.id)],
      );

      const customer = result.rows[0];

      if (!customer) {
        return res.status(404).json({
          error: 'Customer account not found.',
        });
      }

      const otherHash = withdrawal
        ? customer.password_hash
        : customer.withdrawal_password_hash;

      if (
        otherHash &&
        await bcrypt.compare(password, otherHash)
      ) {
        return res.status(400).json({
          error:
            'Login Password and Withdrawal Password must be different.',
        });
      }

      const newHash = await bcrypt.hash(password, 12);

      const query = withdrawal
        ? `UPDATE customers
           SET withdrawal_password_hash=$1,
               must_change_withdrawal_password=TRUE,
               updated_at=NOW()
           WHERE id=$2 RETURNING *`
        : `UPDATE customers
           SET password_hash=$1,
               must_change_password=TRUE,
               updated_at=NOW()
           WHERE id=$2 RETURNING *`;

      const updated = await pool.query(query, [
        newHash,
        customer.id,
      ]);

      if (!withdrawal) {
        await pool.query(
          `DELETE FROM demo_customer_sessions
           WHERE customer_id=$1`,
          [customer.id],
        );
      }

      res.json({
        success: true,
        message:
          'Password reset successfully. Customer must change it before use.',
        customer: publicCustomer(updated.rows[0]),
      });
    }),
  );
}

app.post(
  '/api/auth/customer-login',
  wrap(async (req, res) => {
    const loginId = normalizeLoginId(
      req.body.loginId || req.body.identifier,
    );

    const password = String(req.body.password || '');

    if (!loginId || !password) {
      return res.status(400).json({
        error: 'Login ID and Password are required.',
      });
    }

    const result = await pool.query(
      `SELECT * FROM customers
       WHERE login_id=$1 LIMIT 1`,
      [loginId],
    );

    const customer = result.rows[0];

    if (
      !customer ||
      !(await bcrypt.compare(
        password,
        customer.password_hash,
      ))
    ) {
      return res.status(401).json({
        error: 'Invalid Login ID or Password.',
      });
    }

    if (String(customer.status).toUpperCase() !== 'ACTIVE') {
      return res.status(403).json({
        error: 'This customer account is not active.',
      });
    }

    await issueCustomerSession(pool, res, customer.id);

    const output = publicCustomer(customer);

    res.json({
      success: true,
      mustChangePassword: output.mustChangePassword,
      mustChangeWithdrawalPassword:
        output.mustChangeWithdrawalPassword,
      withdrawalPasswordConfigured:
        output.withdrawalPasswordConfigured,
      customer: output,
    });
  }),
);

for (const kind of ['customer', 'withdrawal']) {
  const withdrawal = kind === 'withdrawal';

  app.post(
    `/api/auth/change-${kind}-password`,
    wrap(async (req, res) => {
      const loginId = normalizeLoginId(req.body.loginId);
      const current = String(req.body.currentPassword || '');
      const password = String(req.body.newPassword || '');
      const confirm = String(req.body.confirmPassword || '');

      if (!loginId || !current || !password || !confirm) {
        return res.status(400).json({
          error: 'Please complete all password fields.',
        });
      }

      if (
        password.length < 6 ||
        password !== confirm ||
        password === current
      ) {
        return res.status(400).json({
          error:
            'New password must be different, at least 6 characters, and match confirmation.',
        });
      }

      const result = await pool.query(
        `SELECT * FROM customers
         WHERE login_id=$1 LIMIT 1`,
        [loginId],
      );

      const customer = result.rows[0];

      if (!customer) {
        return res.status(404).json({
          error: 'Customer account not found.',
        });
      }

      const currentHash = withdrawal
        ? customer.withdrawal_password_hash
        : customer.password_hash;

      if (
        !currentHash ||
        !(await bcrypt.compare(current, currentHash))
      ) {
        return res.status(401).json({
          error:
            'Current password is incorrect or not configured.',
        });
      }

      const otherHash = withdrawal
        ? customer.password_hash
        : customer.withdrawal_password_hash;

      if (
        otherHash &&
        await bcrypt.compare(password, otherHash)
      ) {
        return res.status(400).json({
          error:
            'Login Password and Withdrawal Password must be different.',
        });
      }

      const newHash = await bcrypt.hash(password, 12);

      const query = withdrawal
        ? `UPDATE customers
           SET withdrawal_password_hash=$1,
               must_change_withdrawal_password=FALSE,
               updated_at=NOW()
           WHERE id=$2 RETURNING *`
        : `UPDATE customers
           SET password_hash=$1,
               must_change_password=FALSE,
               updated_at=NOW()
           WHERE id=$2 RETURNING *`;

      const updated = await pool.query(query, [
        newHash,
        customer.id,
      ]);

      if (!withdrawal) {
        await pool.query(
          `DELETE FROM demo_customer_sessions
           WHERE customer_id=$1`,
          [customer.id],
        );

        await issueCustomerSession(
          pool,
          res,
          customer.id,
        );
      }

      res.json({
        success: true,
        message: 'Password changed successfully.',
        customer: publicCustomer(updated.rows[0]),
        mustChangeWithdrawalPassword: withdrawal
          ? false
          : Boolean(
              customer.must_change_withdrawal_password,
            ),
      });
    }),
  );
}

const otpStore = new Map();

function sendFast2SMS(mobile, otp) {
  return new Promise((resolve, reject) => {
    const key =
      process.env.FAST2SMS_API_KEY ||
      process.env.SMS_API_KEY;

    if (!key) {
      return reject(
        new Error(
          'FAST2SMS_API_KEY environment variable is not configured on Render.',
        ),
      );
    }

    const params = new URLSearchParams({
      authorization: key,
      variables_values: otp,
      route: 'otp',
      numbers: mobile,
    });

    const request = https.request(
      {
        hostname: 'www.fast2sms.com',
        path: `/dev/bulkV2?${params}`,
        method: 'GET',
        headers: {
          'cache-control': 'no-cache',
        },
      },
      (response) => {
        let data = '';

        response.on('data', (chunk) => {
          data += chunk;
        });

        response.on('error', reject);

        response.on('end', () => {
          try {
            const result = JSON.parse(data);

            if (
              result.return === true ||
              result.status_code === 200
            ) {
              resolve(result);
            } else {
              reject(
                new Error(
                  Array.isArray(result.message)
                    ? result.message.join(', ')
                    : result.message ||
                      'SMS delivery failed.',
                ),
              );
            }
          } catch {
            reject(
              new Error(
                'Failed to parse Fast2SMS response.',
              ),
            );
          }
        });
      },
    );

    request.setTimeout(15000, () => {
      request.destroy(
        new Error('SMS request timed out.'),
      );
    });

    request.on('error', reject);
    request.end();
  });
}

app.post(
  '/api/auth/send-otp',
  wrap(async (req, res) => {
    const mobile = String(
      req.body.mobile || '',
    ).replace(/\D/g, '');

    if (!/^\d{10}$/.test(mobile)) {
      return res.status(400).json({
        error:
          'Please enter a valid 10-digit mobile number.',
      });
    }

    const otp = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();

    await sendFast2SMS(mobile, otp);

    otpStore.set(mobile, {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    res.json({
      success: true,
      message: 'OTP sent successfully.',
    });
  }),
);

app.post(
  '/api/auth/verify-otp',
  wrap(async (req, res) => {
    const mobile = String(
      req.body.mobile || '',
    ).replace(/\D/g, '');

    const otp = String(req.body.otp || '').trim();

    if (
      !/^\d{10}$/.test(mobile) ||
      !/^\d{6}$/.test(otp)
    ) {
      return res.status(400).json({
        error:
          'Valid mobile number and 6-digit OTP are required.',
      });
    }

    const record = otpStore.get(mobile);

    if (!record) {
      return res.status(400).json({
        error: 'No active OTP found.',
      });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(mobile);

      return res.status(400).json({
        error: 'OTP has expired.',
      });
    }

    if (record.otp !== otp) {
      return res.status(400).json({
        error: 'Invalid OTP code.',
      });
    }

    otpStore.delete(mobile);

    res.json({
      success: true,
      message: 'Mobile number verified successfully.',
    });
  }),
);

app.get(
  '/api/health',
  wrap(async (req, res) => {
    let databaseConnected = false;
    let apiConnected = false;

    try {
      await pool.query('SELECT 1');
      databaseConnected = true;
    } catch {}

    try {
      apiConnected =
        typeof sportsService.isApiConnected === 'function'
          ? Boolean(
              await sportsService.isApiConnected(),
            )
          : false;
    } catch {}

    res.json({
      status: 'ok',
      provider: 'odds_api',
      apiConnected,
      databaseConnected,
    });
  }),
);

app.get(
  '/api/sports/events',
  wrap(async (req, res) => {
    res.json({
      data:
        await sportsService.getEvents(
          req.query.sport || 'all',
        ) || [],
    });
  }),
);

app.get('/api/sports/stream', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

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

const depositJSON = (request) => ({
  id: request.id,
  customerId: request.customer_id,
  customerName: request.customer_name,
  loginId: request.login_id,
  referenceNumber: request.reference_number,
  reference: request.reference_number,
  amount: Number(request.amount),
  paymentMethod: request.payment_method,
  method: request.payment_method,
  proofName: request.proof_name,
  status: request.status,
  createdAt: request.created_at,
  updatedAt: request.updated_at,
});

const withdrawalJSON = (request) => ({
  id: request.id,
  customerId: request.customer_id,
  customerName: request.customer_name,
  loginId: request.login_id,
  amount: Number(request.amount),
  accountHolderName: request.account_holder_name,
  bankName: request.bank_name,
  accountNumber: request.account_number,
  ifscCode: request.ifsc_code,
  status: request.status,
  coinsHeld: request.coins_held,
  coinsRestored: request.coins_restored,
  createdAt: request.created_at,
  updatedAt: request.updated_at,
});

app.post(
  '/api/demo-deposits',
  wrap(async (req, res) => {
    const id = Number(req.body.customerId);
    const amount = Number(req.body.amount);

    const reference = String(
      req.body.referenceNumber ||
      req.body.reference ||
      '',
    ).trim();

    const method = String(
      req.body.paymentMethod ||
      req.body.method ||
      'ACCOUNT',
    ).trim().toUpperCase();

    if (!positiveInteger(id) || !positiveInteger(amount)) {
      return res.status(400).json({
        error:
          'Valid customer ID and whole-number amount are required.',
      });
    }

    if (!/^\d{12}$/.test(reference)) {
      return res.status(400).json({
        error:
          'Reference number must contain exactly 12 digits.',
      });
    }

    if (method.length > 30) {
      return res.status(400).json({
        error: 'Invalid payment method.',
      });
    }

    const result = await pool.query(
      'SELECT * FROM customers WHERE id=$1',
      [id],
    );

    const customer = result.rows[0];

    if (!customer) {
      return res.status(404).json({
        error: 'Customer account not found.',
      });
    }

    if (customer.status !== 'ACTIVE') {
      return res.status(403).json({
        error: 'Customer account is not active.',
      });
    }

    try {
      const saved = await pool.query(
        `INSERT INTO demo_deposit_requests(
          customer_id,reference_number,amount,
          payment_method,proof_name
        )
        VALUES($1,$2,$3,$4,$5)
        RETURNING *`,
        [
          id,
          reference,
          amount,
          method,
          String(req.body.proofName || '').trim() || null,
        ],
      );

      res.status(201).json({
        success: true,
        message: 'Demo request submitted successfully.',
        request: depositJSON({
          ...saved.rows[0],
          customer_name: customer.name,
          login_id: customer.login_id,
        }),
      });
    } catch (error) {
      if (error.code === '23505') {
        return res.status(409).json({
          success: false,
          code: 'REPEATED_REFERENCE',
          error:
            'REPEATED REFERENCE — This reference number has already been submitted.',
        });
      }

      throw error;
    }
  }),
);

for (const kind of ['deposits', 'withdrawals']) {
  const table =
    kind === 'deposits'
      ? 'demo_deposit_requests'
      : 'demo_withdrawal_requests';

  const serialize =
    kind === 'deposits'
      ? depositJSON
      : withdrawalJSON;

  app.get(
    `/api/customers/:id/demo-${kind}`,
    wrap(async (req, res) => {
      if (!positiveInteger(req.params.id)) {
        return res.status(400).json({
          error: 'Invalid customer ID.',
        });
      }

      const customer = await pool.query(
        `SELECT id,name,login_id
         FROM customers WHERE id=$1`,
        [Number(req.params.id)],
      );

      if (!customer.rows.length) {
        return res.status(404).json({
          error: 'Customer not found.',
        });
      }

      const result = await pool.query(
        `SELECT *
         FROM ${table}
         WHERE customer_id=$1
         ORDER BY id DESC
         LIMIT 100`,
        [Number(req.params.id)],
      );

      res.json({
        success: true,
        customer: {
          id: customer.rows[0].id,
          name: customer.rows[0].name,
          loginId: customer.rows[0].login_id,
        },
        requests: result.rows.map(serialize),
      });
    }),
  );

  app.get(
    `/api/admin/demo-${kind}`,
    wrap(async (req, res) => {
      const status = String(
        req.query.status || '',
      ).trim().toUpperCase();

      const filter = [
        'PENDING',
        'APPROVED',
        'REJECTED',
      ].includes(status);

      const result = await pool.query(
        `SELECT d.*,c.name AS customer_name,c.login_id
         FROM ${table} d
         JOIN customers c ON c.id=d.customer_id
         ${filter ? 'WHERE d.status=$1' : ''}
         ORDER BY d.id DESC
         LIMIT 200`,
        filter ? [status] : [],
      );

      res.json({
        success: true,
        requests: result.rows.map(serialize),
      });
    }),
  );

  app.get(
    `/api/admin/demo-${kind}/:id`,
    wrap(async (req, res) => {
      if (!positiveInteger(req.params.id)) {
        return res.status(400).json({
          error: 'Invalid request ID.',
        });
      }

      const result = await pool.query(
        `SELECT d.*,c.name AS customer_name,c.login_id
         FROM ${table} d
         JOIN customers c ON c.id=d.customer_id
         WHERE d.id=$1
         LIMIT 1`,
        [Number(req.params.id)],
      );

      if (!result.rows.length) {
        return res.status(404).json({
          error: 'Request not found.',
        });
      }

      res.json({
        success: true,
        request: serialize(result.rows[0]),
      });
    }),
  );
}

app.patch(
  '/api/admin/demo-deposits/:id/status',
  wrap(async (req, res) => {
    const id = Number(req.params.id);

    const status = String(
      req.body.status || '',
    ).trim().toUpperCase();

    if (
      !positiveInteger(id) ||
      !['PENDING', 'APPROVED', 'REJECTED'].includes(status)
    ) {
      return res.status(400).json({
        error: 'Invalid request ID or status.',
      });
    }

    const result = await pool.query(
      `UPDATE demo_deposit_requests
       SET status=$1,updated_at=NOW()
       WHERE id=$2 RETURNING *`,
      [status, id],
    );

    if (!result.rows.length) {
      return res.status(404).json({
        error: 'Request not found.',
      });
    }

    res.json({
      success: true,
      message: 'Request status updated successfully.',
      request: depositJSON(result.rows[0]),
    });
  }),
);

app.post(
  '/api/demo-withdrawals',
  wrap(async (req, res) => {
    const body = req.body || {};
    const id = Number(body.customerId);
    const amount = Number(body.amount);

    if (!positiveInteger(id) || !positiveInteger(amount)) {
      return res.status(400).json({
        success: false,
        error:
          'Valid customer ID and withdrawal amount are required.',
      });
    }

    const details = [
      body.accountHolderName,
      body.bankName,
      body.accountNumber,
      body.ifscCode,
    ].map((value) => String(value || '').trim());

    if (details.some((value) => !value)) {
      return res.status(400).json({
        success: false,
        error: 'Complete bank account details are required.',
      });
    }

    details[3] = details[3].toUpperCase();

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `SELECT * FROM customers
         WHERE id=$1 FOR UPDATE`,
        [id],
      );

      const customer = result.rows[0];

      if (!customer || customer.status !== 'ACTIVE') {
        await client.query('ROLLBACK');

        return res.status(customer ? 403 : 404).json({
          success: false,
          error: 'Customer not found or inactive.',
        });
      }

      if (amount > Number(customer.demo_coin_balance)) {
        await client.query('ROLLBACK');

        return res.status(400).json({
          success: false,
          code: 'LOW_BALANCE',
          error: 'LOW BALANCE',
          balance: Number(customer.demo_coin_balance),
        });
      }

      const saved = await client.query(
        `INSERT INTO demo_withdrawal_requests(
          customer_id,amount,account_holder_name,
          bank_name,account_number,ifsc_code,
          status,coins_held,coins_restored
        )
        VALUES($1,$2,$3,$4,$5,$6,'PENDING',TRUE,FALSE)
        RETURNING *`,
        [id, amount, ...details],
      );

      const balance =
        Number(customer.demo_coin_balance) - amount;

      await client.query(
        `UPDATE customers
         SET demo_coin_balance=$1,updated_at=NOW()
         WHERE id=$2`,
        [balance, id],
      );

      await client.query(
        `INSERT INTO demo_coin_transactions(
          customer_id,amount,transaction_type,note
        )
        VALUES($1,$2,'WITHDRAWAL_HOLD',$3)`,
        [
          id,
          -amount,
          'Demo withdrawal request submitted',
        ],
      );

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        message:
          'Demo withdrawal request submitted successfully.',
        balance,
        request: withdrawalJSON({
          ...saved.rows[0],
          customer_name: customer.name,
          login_id: customer.login_id,
        }),
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }),
);

app.patch(
  '/api/admin/demo-withdrawals/:id/status',
  wrap(async (req, res) => {
    const id = Number(req.params.id);

    const status = String(
      req.body.status || '',
    ).trim().toUpperCase();

    if (
      !positiveInteger(id) ||
      !['APPROVED', 'REJECTED'].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        error:
          'Valid ID and APPROVED or REJECTED status are required.',
      });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `SELECT * FROM demo_withdrawal_requests
         WHERE id=$1 FOR UPDATE`,
        [id],
      );

      const request = result.rows[0];

      if (!request) {
        await client.query('ROLLBACK');

        return res.status(404).json({
          success: false,
          error: 'Withdrawal request not found.',
        });
      }

      if (request.status !== 'PENDING') {
        await client.query('ROLLBACK');

        return res.status(409).json({
          success: false,
          error:
            `Withdrawal request is already ${request.status}.`,
        });
      }

      if (
        status === 'REJECTED' &&
        request.coins_held &&
        !request.coins_restored
      ) {
        await client.query(
          `UPDATE customers
           SET demo_coin_balance=
             demo_coin_balance+$1::INTEGER,
             updated_at=NOW()
           WHERE id=$2::INTEGER`,
          [
            Number(request.amount),
            request.customer_id,
          ],
        );

        await client.query(
          `INSERT INTO demo_coin_transactions(
            customer_id,amount,transaction_type,note
          )
          VALUES($1,$2,'WITHDRAWAL_RESTORE',$3)`,
          [
            request.customer_id,
            Number(request.amount),
            `Withdrawal request #${id} rejected - demo coins restored`,
          ],
        );
      }

      const updated = await client.query(
        `UPDATE demo_withdrawal_requests
         SET status=$1::VARCHAR(20),
             coins_restored=CASE
               WHEN $1::VARCHAR(20)='REJECTED'
                 AND coins_held=TRUE
               THEN TRUE
               ELSE coins_restored
             END,
             updated_at=NOW()
         WHERE id=$2::INTEGER
         RETURNING *`,
        [status, id],
      );

      const balance = await client.query(
        `SELECT demo_coin_balance
         FROM customers WHERE id=$1`,
        [request.customer_id],
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        request: withdrawalJSON(updated.rows[0]),
        demoCoinBalance: Number(
          balance.rows[0]?.demo_coin_balance || 0,
        ),
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }),
);

registerDemoBetRoutes(app, pool);
registerFlightRoutes(app, pool);
registerRouletteRoutes(app, pool);

app.all('/api/*', (req, res) =>
  res.status(404).json({
    error: `API endpoint ${req.originalUrl} not found.`,
  }),
);

app.use((error, req, res, next) => {
  console.error('API error:', error);

  if (res.headersSent) {
    return next(error);
  }

  if (error.code === '23505') {
    return res.status(409).json({
      success: false,
      error: 'This record already exists.',
    });
  }

  res.status(error.status || 500).json({
    success: false,
    error: error.status
      ? error.message
      : 'Unable to complete request. Please try again.',
  });
});

app.use(
  express.static(path.join(__dirname, 'dist')),
);

app.get('*', (req, res) =>
  res.sendFile(
    path.join(__dirname, 'dist', 'index.html'),
  ),
);

async function startServer() {
  await initializeDatabase();

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Server startup failed:', error);
  process.exitCode = 1;
  pool.end();
});
