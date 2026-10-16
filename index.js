import express from 'express';
import path from 'path';
import https from 'https';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import { fileURLToPath } from 'url';
import { sportsService } from './sportsService.js';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = process.env.PORT || 10000;

const DEFAULT_ADMIN_WHATSAPP_NUMBER = '919346824432';

/* =========================================================
MIDDLEWARE
========================================================= */

app.use(
express.json({
limit: '2mb',
})
);

app.use(
express.urlencoded({
extended: true,
limit: '2mb',
})
);

/* =========================================================
POSTGRESQL
========================================================= */

const pool = new Pool({
connectionString: process.env.DATABASE_URL,

ssl:
process.env.NODE_ENV === 'production'
? {
rejectUnauthorized: false,
}
: false,
});

/* =========================================================
DATABASE INITIALIZATION
========================================================= */

async function initializeDatabase() {
if (!process.env.DATABASE_URL) {
console.warn(
'DATABASE_URL is not configured.'
);

return;

}

try {
/* =====================================================
CUSTOMERS TABLE
===================================================== */

await pool.query(`  
  CREATE TABLE IF NOT EXISTS customers (  
    id SERIAL PRIMARY KEY,  

    name VARCHAR(120)  
      NOT NULL,  

    login_id VARCHAR(60)  
      UNIQUE  
      NOT NULL,  

    password_hash TEXT  
      NOT NULL,  

    must_change_password  
      BOOLEAN  
      NOT NULL  
      DEFAULT TRUE,  

    withdrawal_password_hash  
      TEXT,  

    must_change_withdrawal_password  
      BOOLEAN  
      NOT NULL  
      DEFAULT TRUE,  

    status VARCHAR(20)  
      NOT NULL  
      DEFAULT 'ACTIVE',

demo_coin_balance INTEGER
NOT NULL
DEFAULT 0,
created_at
TIMESTAMPTZ
NOT NULL
DEFAULT NOW(),

updated_at  
      TIMESTAMPTZ  
      NOT NULL  
      DEFAULT NOW()  
  );  
`);  

await pool.query(`  
  ALTER TABLE customers  
  ADD COLUMN IF NOT EXISTS  
    withdrawal_password_hash TEXT;  
`);  

  await pool.query(`
    ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS
      must_change_withdrawal_password
      BOOLEAN
      NOT NULL
      DEFAULT TRUE;
  `);

  await pool.query(`
    ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS
      demo_coin_balance
      INTEGER
      NOT NULL
      DEFAULT 0;
  `);
/* =====================================================
SITE SETTINGS TABLE
===================================================== */

await pool.query(`  
  CREATE TABLE IF NOT EXISTS site_settings (  
    setting_key VARCHAR(100)  
      PRIMARY KEY,  

    setting_value TEXT  
      NOT NULL,  

    updated_at  
      TIMESTAMPTZ  
      NOT NULL  
      DEFAULT NOW()  
  );  
`);

/* =====================================================
DEMO COIN TRANSACTIONS TABLE
===================================================== */

await pool.query(`
CREATE TABLE IF NOT EXISTS demo_coin_transactions (
id SERIAL PRIMARY KEY,

customer_id INTEGER  
  NOT NULL  
  REFERENCES customers(id)  
  ON DELETE CASCADE,  

amount INTEGER  
  NOT NULL,  

transaction_type VARCHAR(20)  
  NOT NULL,  

note TEXT,  

created_at TIMESTAMPTZ  
  NOT NULL  
  DEFAULT NOW()

);
`);
    /* =========================================================
     DEMO WITHDRAWAL REQUESTS TABLE
     ========================================================= */

  await pool.query(`
    CREATE TABLE IF NOT EXISTS demo_withdrawal_requests (
      id SERIAL PRIMARY KEY,

      customer_id INTEGER
        NOT NULL
        REFERENCES customers(id)
        ON DELETE CASCADE,

      amount INTEGER
        NOT NULL,

      account_holder_name TEXT
        NOT NULL,

      bank_name TEXT
        NOT NULL,

      account_number TEXT
        NOT NULL,

      ifsc_code TEXT
        NOT NULL,

      status VARCHAR(20)
        NOT NULL
        DEFAULT 'PENDING',

      created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

      updated_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS
      demo_withdrawal_customer_index
    ON demo_withdrawal_requests(customer_id);
  `);
   /* =====================================================
   DEMO DEPOSIT REQUESTS TABLE
===================================================== */

await pool.query(`
  CREATE TABLE IF NOT EXISTS demo_deposit_requests (
    id SERIAL PRIMARY KEY,

    customer_id INTEGER
      NOT NULL
      REFERENCES customers(id)
      ON DELETE CASCADE,

    reference_number VARCHAR(12)
      NOT NULL
      UNIQUE,

    amount INTEGER
      NOT NULL,

    payment_method VARCHAR(30)
      NOT NULL,

    proof_name TEXT,

    status VARCHAR(20)
      NOT NULL
      DEFAULT 'PENDING',

    created_at TIMESTAMPTZ
      NOT NULL
      DEFAULT NOW(),

    updated_at TIMESTAMPTZ
      NOT NULL
      DEFAULT NOW()
  );
`);

await pool.query(`
  CREATE UNIQUE INDEX IF NOT EXISTS
    demo_deposit_reference_unique
  ON demo_deposit_requests(reference_number);
`);
/* =====================================================
DEFAULT WHATSAPP NUMBER
===================================================== */

await pool.query(  
  `  
  INSERT INTO site_settings (  
    setting_key,  
    setting_value  
  )  
  VALUES (  
    'admin_whatsapp_number',  
    $1  
  )  
  ON CONFLICT (setting_key)  
  DO NOTHING  
  `,  
  [  
    DEFAULT_ADMIN_WHATSAPP_NUMBER,  
  ]  
);  

console.log(  
  'Customers table ready.'  
);  

console.log(  
  'Withdrawal password support ready.'  
);  

console.log(  
  'Admin password reset support ready.'  
);  

console.log(  
  'Site settings table ready.'  
);  

console.log(  
  'WhatsApp settings support ready.'  
);

} catch (error) {
console.error(
'Database initialization error:',
error
);
}
}

/* =========================================================
OTP STORE
========================================================= */

const otpStore = new Map();

/* =========================================================
FAST2SMS
========================================================= */

function sendFast2SMS(
mobile,
otp
) {
return new Promise(
(resolve, reject) => {
const apiKey =
process.env.FAST2SMS_API_KEY ||
process.env.SMS_API_KEY;

if (!apiKey) {  
    return reject(  
      new Error(  
        'FAST2SMS_API_KEY environment variable is not configured on Render.'  
      )  
    );  
  }  

  const queryParams =  
    new URLSearchParams({  
      authorization: apiKey,  
      variables_values: otp,  
      route: 'otp',  
      numbers: mobile,  
    }).toString();  

  const options = {  
    hostname: 'www.fast2sms.com',  

    path:  
      `/dev/bulkV2?${queryParams}`,  

    method: 'GET',  

    headers: {  
      'cache-control': 'no-cache',  
    },  
  };  

  const req = https.request(  
    options,  
    (response) => {  
      let data = '';  

      response.on(  
        'data',  
        (chunk) => {  
          data += chunk;  
        }  
      );  

      response.on(  
        'end',  
        () => {  
          try {  
            const result =  
              JSON.parse(data);  

            const isSuccess =  
              result.return === true ||  
              result.status_code === 200;  

            if (isSuccess) {  
              resolve(result);  
              return;  
            }  

            const errorMessage =  
              Array.isArray(  
                result.message  
              )  
                ? result.message.join(  
                    ', '  
                  )  
                : result.message ||  
                  'Fast2SMS returned a failure status.';  

            reject(  
              new Error(  
                errorMessage  
              )  
            );  
          } catch {  
            reject(  
              new Error(  
                'Failed to parse response from Fast2SMS API.'  
              )  
            );  
          }  
        }  
      );  
    }  
  );  

  req.on(  
    'error',  
    (error) => {  
      reject(error);  
    }  
  );  

  req.end();  
}

);
}

/* =========================================================
CUSTOMER HELPERS
========================================================= */

function normalizeLoginId(
value
) {
return String(value || '')
.trim()
.toLowerCase();
}

function publicCustomer(
customer
) {
return {
id: customer.id,

name: customer.name,  

loginId: customer.login_id,  

mustChangePassword:  
  Boolean(  
    customer.must_change_password  
  ),  

mustChangeWithdrawalPassword:  
  Boolean(  
    customer  
      .must_change_withdrawal_password  
  ),  

withdrawalPasswordConfigured:  
  Boolean(  
    customer  
      .withdrawal_password_hash  
  ),  

status: customer.status,  

createdAt:  
  customer.created_at,

};
}

/* =========================================================
WHATSAPP HELPERS
========================================================= */

function normalizeWhatsAppNumber(
value
) {
return String(value || '')
.replace(/\D/g, '')
.trim();
}

function isValidWhatsAppNumber(
value
) {
return /^[1-9][0-9]{9,14}$/.test(
value
);
}

async function getAdminWhatsAppNumber() {
if (!process.env.DATABASE_URL) {
return DEFAULT_ADMIN_WHATSAPP_NUMBER;
}

try {
    const result =
      await pool.query(
        `
          SELECT setting_value
          FROM site_settings
          WHERE setting_key = $1
          LIMIT 1
        `,
        [
          'admin_whatsapp_number',
        ]
      );

const savedNumber =  
  normalizeWhatsAppNumber(  
    result.rows?.[0]  
      ?.setting_value  
  );  

if (  
  isValidWhatsAppNumber(  
    savedNumber  
  )  
) {  
  return savedNumber;  
}  

return DEFAULT_ADMIN_WHATSAPP_NUMBER;

} catch (error) {
console.error(
'Get WhatsApp Number Error:',
error
);

return DEFAULT_ADMIN_WHATSAPP_NUMBER;

}
}

/* =========================================================
PUBLIC SITE SETTINGS

GET /api/public/settings
========================================================= */

app.get(
'/api/public/settings',

async (req, res) => {
try {
const whatsappNumber =
await getAdminWhatsAppNumber();

return res.json({  
    success: true,  

    whatsappNumber,  
  });  
} catch (error) {  
  console.error(  
    'Public Settings Error:',  
    error  
  );  

  return res.json({  
    success: true,  

    whatsappNumber:  
      DEFAULT_ADMIN_WHATSAPP_NUMBER,  
  });  
}

}
);

/* =========================================================
ADMIN GET WHATSAPP NUMBER

GET /api/admin/settings/whatsapp
========================================================= */

app.get(
'/api/admin/settings/whatsapp',

async (req, res) => {
try {
const whatsappNumber =
await getAdminWhatsAppNumber();

return res.json({  
    success: true,  

    whatsappNumber,  
  });  
} catch (error) {  
  console.error(  
    'Admin Get WhatsApp Settings Error:',  
    error  
  );  

  return res  
    .status(500)  
    .json({  
      error:  
        'Unable to load WhatsApp number.',  
    });  
}

}
);

/* =========================================================
ADMIN UPDATE WHATSAPP NUMBER

PUT /api/admin/settings/whatsapp
========================================================= */

app.put(
'/api/admin/settings/whatsapp',

async (req, res) => {
try {
const whatsappNumber =
normalizeWhatsAppNumber(
req.body.whatsappNumber ||
req.body.number
);

if (  
    !isValidWhatsAppNumber(  
      whatsappNumber  
    )  
  ) {  
    return res  
      .status(400)  
      .json({  
        error:  
          'Please enter a valid WhatsApp number with country code. Example: 919346824432',  
      });  
  }  

  if (  
    !process.env.DATABASE_URL  
  ) {  
    return res  
      .status(500)  
      .json({  
        error:  
          'Database is not configured.',  
      });  
  }  

  const result =  
    await pool.query(  
      `  
      INSERT INTO site_settings (  
        setting_key,  
        setting_value,  
        updated_at  
      )  
      VALUES (  
        $1,  
        $2,  
        NOW()  
      )  
      ON CONFLICT (setting_key)  
      DO UPDATE SET  
        setting_value =  
          EXCLUDED.setting_value,  
        updated_at =  
          NOW()  
      RETURNING  
        setting_value,  
        updated_at  
      `,  
      [  
        'admin_whatsapp_number',  
        whatsappNumber,  
      ]  
    );  

  return res.json({  
    success: true,  

    message:  
      'WhatsApp number updated successfully.',  

    whatsappNumber:  
      result.rows[0]  
        .setting_value,  

    updatedAt:  
      result.rows[0]  
        .updated_at,  
  });  
} catch (error) {  
  console.error(  
    'Admin Update WhatsApp Settings Error:',  
    error  
  );  

  return res  
    .status(500)  
    .json({  
      error:  
        'Unable to update WhatsApp number.',  
    });  
}

}
);

/* =========================================================
CREATE CUSTOMER
ADMIN SIDE

POST /api/admin/customers
========================================================= */

app.post(
'/api/admin/customers',

async (req, res) => {
try {
const name =
String(
req.body.name || ''
).trim();

const loginId =  
    normalizeLoginId(  
      req.body.loginId  
    );  

  const temporaryPassword =  
    String(  
      req.body  
        .temporaryPassword ||  
        ''  
    );  

  const temporaryWithdrawalPassword =  
    String(  
      req.body  
        .temporaryWithdrawalPassword ||  
        ''  
    );  

  if (!name) {  
    return res  
      .status(400)  
      .json({  
        error:  
          'Customer name is required.',  
      });  
  }  

  if (!loginId) {  
    return res  
      .status(400)  
      .json({  
        error:  
          'Login ID is required.',  
      });  
  }  

  if (  
    !/^[a-z0-9._-]{4,30}$/.test(  
      loginId  
    )  
  ) {  
    return res  
      .status(400)  
      .json({  
        error:  
          'Login ID must be 4-30 characters and can contain letters, numbers, dot, underscore or hyphen.',  
      });  
  }  

  if (  
    temporaryPassword.length < 6  
  ) {  
    return res  
      .status(400)  
      .json({  
        error:  
          'Temporary Login Password must contain at least 6 characters.',  
      });  
  }  

  if (  
    temporaryWithdrawalPassword  
      .length < 6  
  ) {  
    return res  
      .status(400)  
      .json({  
        error:  
          'Temporary Withdrawal Password must contain at least 6 characters.',  
      });  
  }  

  if (  
    temporaryPassword ===  
    temporaryWithdrawalPassword  
  ) {  
    return res  
      .status(400)  
      .json({  
        error:  
          'Login Password and Withdrawal Password must be different.',  
      });  
  }  

  const existing =  
    await pool.query(  
      `  
      SELECT id  
      FROM customers  
      WHERE login_id = $1  
      LIMIT 1  
      `,  
      [loginId]  
    );  

  if (  
    existing.rows.length > 0  
  ) {  
    return res  
      .status(409)  
      .json({  
        error:  
          'This Login ID already exists. Please choose another Login ID.',  
      });  
  }  

  const [  
    passwordHash,  
    withdrawalPasswordHash,  
  ] = await Promise.all([  
    bcrypt.hash(  
      temporaryPassword,  
      12  
    ),  

    bcrypt.hash(  
      temporaryWithdrawalPassword,  
      12  
    ),  
  ]);  

  const result =  
    await pool.query(  
      `  
      INSERT INTO customers (  
        name,  
        login_id,  
        password_hash,  
        must_change_password,  
        withdrawal_password_hash,  
        must_change_withdrawal_password,  
        status  
      )  
      VALUES (  
        $1,  
        $2,  
        $3,  
        TRUE,  
        $4,  
        TRUE,  
        'ACTIVE'  
      )  
      RETURNING  
        id,  
        name,  
        login_id,  
        must_change_password,  
        withdrawal_password_hash,  
        must_change_withdrawal_password,  
        status,  
        created_at  
      `,  
      [  
        name,  
        loginId,  
        passwordHash,  
        withdrawalPasswordHash,  
      ]  
    );  

  return res  
    .status(201)  
    .json({  
      success: true,  

      message:  
        'Customer created successfully.',  

      customer:  
        publicCustomer(  
          result.rows[0]  
        ),  
    });  
} catch (error) {  
  console.error(  
    'Create Customer Error:',  
    error  
  );  

  if (  
    error?.code === '23505'  
  ) {  
    return res  
      .status(409)  
      .json({  
        error:  
          'This Login ID already exists.',  
      });  
  }  

  return res  
    .status(500)  
    .json({  
      error:  
        'Unable to create customer.',  
    });  
}

}
);

/* =========================================================
CUSTOMER LIST
ADMIN SIDE

GET /api/admin/customers
========================================================= */

app.get(
'/api/admin/customers',

async (req, res) => {
try {
const result = await pool.query(`
  SELECT
    id,
    name,
    login_id,
    must_change_password,
    withdrawal_password_hash,
    must_change_withdrawal_password,
    status,
    demo_coin_balance,
    created_at
  FROM customers
  ORDER BY id DESC
`);

return res.json({  
    success: true,  

    customers:  
      result.rows.map(  
        publicCustomer  
      ),  
  });  
} catch (error) {  
  console.error(  
    'Customer List Error:',  
    error  
  );  

  return res  
    .status(500)  
    .json({  
      error:  
        'Unable to load customers.',  
    });  
}

}
);
/* =========================================================
ADMIN ADD DEMO COINS

POST /api/admin/customers/:id/add-demo-coins
========================================================= */

app.post(
'/api/admin/customers/:id/add-demo-coins',

async (req, res) => {
const client =
await pool.connect();

try {  
  const customerId =  
    Number(req.params.id);  

  const amount =  
    Number(req.body.amount);  

  const note =  
    String(  
      req.body.note ||  
      'Demo Coins added by Admin'  
    ).trim();  

  if (  
    !Number.isInteger(customerId) ||  
    customerId <= 0  
  ) {  
    return res  
      .status(400)  
      .json({  
        error:  
          'Invalid customer ID.',  
      });  
  }  

  if (  
    !Number.isInteger(amount) ||  
    amount <= 0  
  ) {  
    return res  
      .status(400)  
      .json({  
        error:  
          'Demo Coin amount must be a positive whole number.',  
      });  
  }  

  await client.query('BEGIN');  

  const customerResult =  
    await client.query(  
      `  
      UPDATE customers  
      SET  
        demo_coin_balance =  
          demo_coin_balance + $1,  
        updated_at = NOW()  
      WHERE id = $2  
      RETURNING  
        id,  
        name,  
        login_id,  
        demo_coin_balance,  
        status  
      `,  
      [  
        amount,  
        customerId,  
      ]  
    );  

  if (  
    customerResult.rows.length === 0  
  ) {  
    await client.query(  
      'ROLLBACK'  
    );  

    return res  
      .status(404)  
      .json({  
        error:  
          'Customer account not found.',  
      });  
  }  

  await client.query(  
    `  
    INSERT INTO demo_coin_transactions (  
      customer_id,  
      amount,  
      transaction_type,  
      note  
    )  
    VALUES (  
      $1,  
      $2,  
      'ADMIN_CREDIT',  
      $3  
    )  
    `,  
    [  
      customerId,  
      amount,  
      note,  
    ]  
  );  

  await client.query('COMMIT');  

  return res.json({  
    success: true,  

    message:  
      `${amount} Demo Coins added successfully.`,  

    customer:  
      customerResult.rows[0],  
  });  
} catch (error) {  
  try {  
    await client.query(  
      'ROLLBACK'  
    );  
  } catch {}  

  console.error(  
    'Add Demo Coins Error:',  
    error  
  );  

  return res  
    .status(500)  
    .json({  
      error:  
        'Unable to add Demo Coins.',  
    });  
} finally {  
  client.release();  
}

}
);
/* =========================================================
CUSTOMER DEMO COIN BALANCE

GET /api/customers/:id/demo-balance
========================================================= */

app.get(
'/api/customers/:id/demo-balance',

async (req, res) => {
try {
const customerId =
Number(req.params.id);

if (  
    !Number.isInteger(customerId) ||  
    customerId <= 0  
  ) {  
    return res  
      .status(400)  
      .json({  
        error:  
          'Invalid customer ID.',  
      });  
  }  

  const result =  
    await pool.query(  
      `  
      SELECT  
        id,  
        name,  
        login_id,  
        demo_coin_balance  
      FROM customers  
      WHERE id = $1  
      LIMIT 1  
      `,  
      [customerId]  
    );  

  if (result.rows.length === 0) {  
    return res  
      .status(404)  
      .json({  
        error:  
          'Customer account not found.',  
      });  
  }  

  return res.json({  
    success: true,  
    customerId:  
      result.rows[0].id,  
    loginId:  
      result.rows[0].login_id,  
    balance:  
      Number(  
        result.rows[0]  
          .demo_coin_balance || 0  
      ),  
  });  
} catch (error) {  
  console.error(  
    'Demo Balance Error:',  
    error  
  );  

  return res  
    .status(500)  
    .json({  
      error:  
        'Unable to load Demo Coin balance.',  
    });  
}

}
);
/* =========================================================
ADMIN RESET LOGIN PASSWORD

POST /api/admin/customers/:id/reset-login-password
========================================================= */

app.post(
'/api/admin/customers/:id/reset-login-password',

async (req, res) => {
try {
const customerId =
Number(req.params.id);

const newPassword =  
    String(  
      req.body.password ||  
      req.body.newPassword ||  
      req.body.temporaryPassword ||  
      ''  
    );  

  if (  
    !Number.isInteger(  
      customerId  
    ) ||  
    customerId <= 0  
  ) {  
    return res  
      .status(400)  
      .json({  
        error:  
          'Invalid customer ID.',  
      });  
  }  

  if (  
    newPassword.length < 6  
  ) {  
    return res  
      .status(400)  
      .json({  
        error:  
          'New Login Password must contain at least 6 characters.',  
      });  
  }  

  const customerResult =  
    await pool.query(  
      `  
      SELECT  
        id,  
        name,  
        login_id,  
        withdrawal_password_hash  
      FROM customers  
      WHERE id = $1  
      LIMIT 1  
      `,  
      [customerId]  
    );  

  if (  
    customerResult.rows  
      .length === 0  
  ) {  
    return res  
      .status(404)  
      .json({  
        error:  
          'Customer account not found.',  
      });  
  }  

  const customer =  
    customerResult.rows[0];  

  if (  
    customer  
      .withdrawal_password_hash  
  ) {  
    const sameAsWithdrawal =  
      await bcrypt.compare(  
        newPassword,  
        customer  
          .withdrawal_password_hash  
      );  

    if (  
      sameAsWithdrawal  
    ) {  
      return res  
        .status(400)  
        .json({  
          error:  
            'Login Password and Withdrawal Password must be different.',  
        });  
    }  
  }  

  const passwordHash =  
    await bcrypt.hash(  
      newPassword,  
      12  
    );  

  const result =  
    await pool.query(  
      `  
      UPDATE customers  
      SET  
        password_hash = $1,  
        must_change_password = TRUE,  
        updated_at = NOW()  
      WHERE id = $2  
      RETURNING  
        id,  
        name,  
        login_id,  
        must_change_password,  
        withdrawal_password_hash,  
        must_change_withdrawal_password,  
        status,  
        created_at  
      `,  
      [  
        passwordHash,  
        customerId,  
      ]  
    );  

  return res.json({  
    success: true,  

    message:  
      'Login Password reset successfully. Customer must change it after login.',  

    customer:  
      publicCustomer(  
        result.rows[0]  
      ),  
  });  
} catch (error) {  
  console.error(  
    'Admin Reset Login Password Error:',  
    error  
  );  

  return res  
    .status(500)  
    .json({  
      error:  
        'Unable to reset Login Password.',  
    });  
}

}
);

/* =========================================================
ADMIN RESET WITHDRAWAL PASSWORD

POST /api/admin/customers/:id/reset-withdrawal-password
========================================================= */

app.post(
'/api/admin/customers/:id/reset-withdrawal-password',

async (req, res) => {
try {
const customerId =
Number(req.params.id);

const newPassword =  
    String(  
      req.body.password ||  
      req.body.newPassword ||  
      req.body.temporaryPassword ||  
      req.body  
        .temporaryWithdrawalPassword ||  
      ''  
    );  

  if (  
    !Number.isInteger(  
      customerId  
    ) ||  
    customerId <= 0  
  ) {  
    return res  
      .status(400)  
      .json({  
        error:  
          'Invalid customer ID.',  
      });  
  }  

  if (  
    newPassword.length < 6  
  ) {  
    return res  
      .status(400)  
      .json({  
        error:  
          'New Withdrawal Password must contain at least 6 characters.',  
      });  
  }  

  const customerResult =  
    await pool.query(  
      `  
      SELECT  
        id,  
        name,  
        login_id,  
        password_hash  
      FROM customers  
      WHERE id = $1  
      LIMIT 1  
      `,  
      [customerId]  
    );  

  if (  
    customerResult.rows  
      .length === 0  
  ) {  
    return res  
      .status(404)  
      .json({  
        error:  
          'Customer account not found.',  
      });  
  }  

  const customer =  
    customerResult.rows[0];  

  const sameAsLogin =  
    await bcrypt.compare(  
      newPassword,  
      customer.password_hash  
    );  

  if (sameAsLogin) {  
    return res  
      .status(400)  
      .json({  
        error:  
          'Login Password and Withdrawal Password must be different.',  
      });  
  }  

  const passwordHash =  
    await bcrypt.hash(  
      newPassword,  
      12  
    );  

  const result =  
    await pool.query(  
      `  
      UPDATE customers  
      SET  
        withdrawal_password_hash = $1,  
        must_change_withdrawal_password = TRUE,  
        updated_at = NOW()  
      WHERE id = $2  
      RETURNING  
        id,  
        name,  
        login_id,  
        must_change_password,  
        withdrawal_password_hash,  
        must_change_withdrawal_password,  
        status,  
        created_at  
      `,  
      [  
        passwordHash,  
        customerId,  
      ]  
    );  

  return res.json({  
    success: true,  

    message:  
      'Withdrawal Password reset successfully. Customer must change it before use.',  

    customer:  
      publicCustomer(  
        result.rows[0]  
      ),  
  });  
} catch (error) {  
  console.error(  
    'Admin Reset Withdrawal Password Error:',  
    error  
  );  

  return res  
    .status(500)  
    .json({  
      error:  
        'Unable to reset Withdrawal Password.',  
    });  
}

}
);

/* =========================================================
CUSTOMER LOGIN

POST /api/auth/customer-login
========================================================= */

app.post(
'/api/auth/customer-login',

async (req, res) => {
try {
const loginId =
normalizeLoginId(
req.body.loginId ||
req.body.identifier
);

const password =  
    String(  
      req.body.password ||  
      ''  
    );  

  if (  
    !loginId ||  
    !password  
  ) {  
    return res  
      .status(400)  
      .json({  
        error:  
          'Login ID and Password are required.',  
      });  
  }  

  const result =  
    await pool.query(  
      `  
      SELECT *  
      FROM customers  
      WHERE login_id = $1  
      LIMIT 1  
      `,  
      [loginId]  
    );  

  if (  
    result.rows.length === 0  
  ) {  
    return res  
      .status(401)  
      .json({  
        error:  
          'Invalid Login ID or Password.',  
      });  
  }  

  const customer =  
    result.rows[0];  

  if (  
    String(  
      customer.status  
    ).toUpperCase() !==  
    'ACTIVE'  
  ) {  
    return res  
      .status(403)  
      .json({  
        error:  
          'This customer account is not active.',  
      });  
  }  

  const passwordMatches =  
    await bcrypt.compare(  
      password,  
      customer.password_hash  
    );  

  if (!passwordMatches) {  
    return res  
      .status(401)  
      .json({  
        error:  
          'Invalid Login ID or Password.',  
      });  
  }  

  return res.json({  
    success: true,  

    mustChangePassword:  
      Boolean(  
        customer  
          .must_change_password  
      ),  

    mustChangeWithdrawalPassword:  
      Boolean(  
        customer  
          .must_change_withdrawal_password  
      ),  

    withdrawalPasswordConfigured:  
      Boolean(  
        customer  
          .withdrawal_password_hash  
      ),  

    customer:  
      publicCustomer(  
        customer  
      ),  
  });  
} catch (error) {  
  console.error(  
    'Customer Login Error:',  
    error  
  );  

  return res  
    .status(500)  
    .json({  
      error:  
        'Unable to login. Please try again.',  
    });  
}

}
);

/* =========================================================
CHANGE CUSTOMER LOGIN PASSWORD

POST /api/auth/change-customer-password
========================================================= */

app.post(
'/api/auth/change-customer-password',

async (req, res) => {
try {
const loginId =
normalizeLoginId(
req.body.loginId
);

const currentPassword =  
    String(  
      req.body  
        .currentPassword ||  
      ''  
    );  

  const newPassword =  
    String(  
      req.body.newPassword ||  
      ''  
    );  

  const confirmPassword =  
    String(  
      req.body  
        .confirmPassword ||  
      ''  
    );  

  if (  
    !loginId ||  
    !currentPassword ||  
    !newPassword ||  
    !confirmPassword  
  ) {  
    return res  
      .status(400)  
      .json({  
        error:  
          'Please complete all Login Password fields.',  
      });  
  }  

  if (  
    newPassword.length < 6  
  ) {  
    return res  
      .status(400)  
      .json({  
        error:  
          'New Login Password must contain at least 6 characters.',  
      });  
  }  

  if (  
    newPassword !==  
    confirmPassword  
  ) {  
    return res  
      .status(400)  
      .json({  
        error:  
          'New Login Password and Confirm Login Password do not match.',  
      });  
  }  

  if (  
    currentPassword ===  
    newPassword  
  ) {  
    return res  
      .status(400)  
      .json({  
        error:  
          'New Login Password must be different from the current password.',  
      });  
  }  

  const result =  
    await pool.query(  
      `  
      SELECT *  
      FROM customers  
      WHERE login_id = $1  
      LIMIT 1  
      `,  
      [loginId]  
    );  

  if (  
    result.rows.length === 0  
  ) {  
    return res  
      .status(404)  
      .json({  
        error:  
          'Customer account not found.',  
      });  
  }  

  const customer =  
    result.rows[0];  

  const passwordMatches =  
    await bcrypt.compare(  
      currentPassword,  
      customer.password_hash  
    );  

  if (!passwordMatches) {  
    return res  
      .status(401)  
      .json({  
        error:  
          'Current Login Password is incorrect.',  
      });  
  }  

  if (  
    customer  
      .withdrawal_password_hash  
  ) {  
    const sameAsWithdrawal =  
      await bcrypt.compare(  
        newPassword,  
        customer  
          .withdrawal_password_hash  
      );  

    if (  
      sameAsWithdrawal  
    ) {  
      return res  
        .status(400)  
        .json({  
          error:  
            'Login Password and Withdrawal Password must be different.',  
        });  
    }  
  }  

  const newPasswordHash =  
    await bcrypt.hash(  
      newPassword,  
      12  
    );  

  await pool.query(  
    `  
    UPDATE customers  
    SET  
      password_hash = $1,  
      must_change_password = FALSE,  
      updated_at = NOW()  
    WHERE id = $2  
    `,  
    [  
      newPasswordHash,  
      customer.id,  
    ]  
  );  

  return res.json({  
    success: true,  

    message:  
      'Login Password changed successfully.',  

    customer: {  
      id: customer.id,  

      name: customer.name,  

      loginId:  
        customer.login_id,  

      mustChangePassword:  
        false,  

      mustChangeWithdrawalPassword:  
        Boolean(  
          customer  
            .must_change_withdrawal_password  
        ),  

      withdrawalPasswordConfigured:  
        Boolean(  
          customer  
            .withdrawal_password_hash  
        ),  

      status:  
        customer.status,  
    },  
  });  
} catch (error) {  
  console.error(  
    'Change Customer Login Password Error:',  
    error  
  );  

  return res  
    .status(500)  
    .json({  
      error:  
        'Unable to change Login Password.',  
    });  
}

}
);

/* =========================================================
CHANGE WITHDRAWAL PASSWORD

POST /api/auth/change-withdrawal-password
========================================================= */

app.post(
'/api/auth/change-withdrawal-password',

async (req, res) => {
try {
const loginId =
normalizeLoginId(
req.body.loginId
);

const currentPassword =  
    String(  
      req.body  
        .currentPassword ||  
      ''  
    );  

  const newPassword =  
    String(  
      req.body.newPassword ||  
      ''  
    );  

  const confirmPassword =  
    String(  
      req.body  
        .confirmPassword ||  
      ''  
    );  

  if (  
    !loginId ||  
    !currentPassword ||  
    !newPassword ||  
    !confirmPassword  
  ) {  
    return res  
      .status(400)  
      .json({  
        error:  
          'Please complete all Withdrawal Password fields.',  
      });  
  }  

  if (  
    newPassword.length < 6  
  ) {  
    return res  
      .status(400)  
      .json({  
        error:  
          'New Withdrawal Password must contain at least 6 characters.',  
      });  
  }  

  if (  
    newPassword !==  
    confirmPassword  
  ) {  
    return res  
      .status(400)  
      .json({  
        error:  
          'New Withdrawal Password and Confirm Withdrawal Password do not match.',  
      });  
  }  

  if (  
    currentPassword ===  
    newPassword  
  ) {  
    return res  
      .status(400)  
      .json({  
        error:  
          'New Withdrawal Password must be different from the current password.',  
      });  
  }  

  const result =  
    await pool.query(  
      `  
      SELECT *  
      FROM customers  
      WHERE login_id = $1  
      LIMIT 1  
      `,  
      [loginId]  
    );  

  if (  
    result.rows.length === 0  
  ) {  
    return res  
      .status(404)  
      .json({  
        error:  
          'Customer account not found.',  
      });  
  }  

  const customer =  
    result.rows[0];  

  if (  
    !customer  
      .withdrawal_password_hash  
  ) {  
    return res  
      .status(400)  
      .json({  
        error:  
          'Withdrawal Password has not been configured for this customer. Please contact Admin.',  
      });  
  }  

  const passwordMatches =  
    await bcrypt.compare(  
      currentPassword,  
      customer  
        .withdrawal_password_hash  
    );  

  if (!passwordMatches) {  
    return res  
      .status(401)  
      .json({  
        error:  
          'Current Withdrawal Password is incorrect.',  
      });  
  }  

  const sameAsLogin =  
    await bcrypt.compare(  
      newPassword,  
      customer.password_hash  
    );  

  if (sameAsLogin) {  
    return res  
      .status(400)  
      .json({  
        error:  
          'Login Password and Withdrawal Password must be different.',  
      });  
  }  

  const newPasswordHash =  
    await bcrypt.hash(  
      newPassword,  
      12  
    );  

  await pool.query(  
    `  
    UPDATE customers  
    SET  
      withdrawal_password_hash = $1,  
      must_change_withdrawal_password = FALSE,  
      updated_at = NOW()  
    WHERE id = $2  
    `,  
    [  
      newPasswordHash,  
      customer.id,  
    ]  
  );  

  return res.json({  
    success: true,  

    message:  
      'Withdrawal Password changed successfully.',  

    mustChangeWithdrawalPassword:  
      false,  
  });  
} catch (error) {  
  console.error(  
    'Change Withdrawal Password Error:',  
    error  
  );  

  return res  
    .status(500)  
    .json({  
      error:  
        'Unable to change Withdrawal Password.',  
    });  
}

}
);

/* =========================================================
OTP - EXISTING SUPPORT
========================================================= */

app.post(
'/api/auth/send-otp',

async (req, res) => {
try {
const cleanMobile =
req.body.mobile
? String(
req.body.mobile
).replace(
/\D/g,
''
)
: '';

if (  
    cleanMobile.length !== 10  
  ) {  
    return res  
      .status(400)  
      .json({  
        error:  
          'Please enter a valid 10-digit mobile number.',  
      });  
  }  

  const generatedOtp =  
    Math.floor(  
      100000 +  
      Math.random() *  
      900000  
    ).toString();  

  const expiresAt =  
    Date.now() +  
    10 * 60 * 1000;  

  await sendFast2SMS(  
    cleanMobile,  
    generatedOtp  
  );  

  otpStore.set(  
    cleanMobile,  
    {  
      otp: generatedOtp,  
      expiresAt,  
    }  
  );  

  return res.json({  
    success: true,  

    message:  
      'OTP sent successfully.',  
  });  
} catch (error) {  
  console.error(  
    'Fast2SMS Dispatch Error:',  
    error.message  
  );  

  return res  
    .status(500)  
    .json({  
      error:  
        error.message ||  
        'Failed to send SMS OTP.',  
    });  
}

}
);

app.post(
'/api/auth/verify-otp',

async (req, res) => {
try {
const cleanMobile =
req.body.mobile
? String(
req.body.mobile
).replace(
/\D/g,
''
)
: '';

const cleanOtp =  
    String(  
      req.body.otp || ''  
    ).trim();  

  if (  
    cleanMobile.length !== 10  
  ) {  
    return res  
      .status(400)  
      .json({  
        error:  
          'Please enter a valid 10-digit mobile number.',  
      });  
  }  

  if (  
    cleanOtp.length !== 6  
  ) {  
    return res  
      .status(400)  
      .json({  
        error:  
          'Please enter a valid 6-digit OTP code.',  
      });  
  }  

  const record =  
    otpStore.get(  
      cleanMobile  
    );  

  if (!record) {  
    return res  
      .status(400)  
      .json({  
        error:  
          'No active OTP found.',  
      });  
  }  

  if (  
    Date.now() >  
    record.expiresAt  
  ) {  
    otpStore.delete(  
      cleanMobile  
    );  

    return res  
      .status(400)  
      .json({  
        error:  
          'OTP has expired.',  
      });  
  }  

  if (  
    record.otp !== cleanOtp  
  ) {  
    return res  
      .status(400)  
      .json({  
        error:  
          'Invalid OTP code.',  
      });  
  }  

  otpStore.delete(  
    cleanMobile  
  );  

  return res.json({  
    success: true,  

    message:  
      'Mobile number verified successfully.',  
  });  
} catch (error) {  
  console.error(  
    'Verify OTP Error:',  
    error  
  );  

  return res  
    .status(500)  
    .json({  
      error:  
        'Server error during OTP verification.',  
    });  
}

}
);

/* =========================================================
HEALTH
========================================================= */

app.get(
'/api/health',

async (req, res) => {
let databaseConnected =
false;

try {  
  if (  
    process.env.DATABASE_URL  
  ) {  
    await pool.query(  
      'SELECT 1'  
    );  

    databaseConnected =  
      true;  
  }  
} catch (error) {  
  console.error(  
    'Database Health Error:',  
    error.message  
  );  
}  

let apiConnected = false;  

try {  
  apiConnected =  
    typeof sportsService  
      .isApiConnected ===  
    'function'  
      ? await sportsService  
          .isApiConnected()  
      : true;  
} catch (error) {  
  console.error(  
    'Sports Health Error:',  
    error.message  
  );  
}  

return res.json({  
  status: 'ok',  

  provider: 'odds_api',  

  apiConnected:  
    Boolean(apiConnected),  

  databaseConnected,  
});

}
);

/* =========================================================
SPORTS EVENTS
========================================================= */

app.get(
'/api/sports/events',

async (req, res) => {
try {
const sport =
req.query.sport ||
'all';

const events =  
    await sportsService  
      .getEvents(sport);  

  return res.json({  
    data: events || [],  
  });  
} catch (error) {  
  console.error(  
    'Get Sports Events Error:',  
    error  
  );  

  return res  
    .status(500)  
    .json({  
      error:  
        'Failed to retrieve sports events.',  
    });  
}

}
);

/* =========================================================
SPORTS STREAM
========================================================= */

app.get(
'/api/sports/stream',

(req, res) => {
res.setHeader(
'Content-Type',
'text/event-stream'
);

res.setHeader(  
  'Cache-Control',  
  'no-cache'  
);  

res.setHeader(  
  'Connection',  
  'keep-alive'  
);  

res.flushHeaders();  

if (  
  typeof sportsService  
    .addClient ===  
  'function'  
) {  
  sportsService.addClient(  
    res  
  );  
}  

req.on(  
  'close',  
  () => {  
    if (  
      typeof sportsService  
        .removeClient ===  
      'function'  
    ) {  
      sportsService  
        .removeClient(res);  
    }  
  }  
);

}
);
/* =========================================================
   CREATE DEMO DEPOSIT REQUEST

   POST /api/demo-deposits
========================================================= */

app.post(
  '/api/demo-deposits',

  async (req, res) => {
    try {
      const customerId =
        Number(req.body.customerId);

      const amount =
        Number(req.body.amount);

      const referenceNumber =
        String(
          req.body.referenceNumber ||
          req.body.reference ||
          ''
        ).trim();

      const paymentMethod =
        String(
          req.body.paymentMethod ||
          req.body.method ||
          'ACCOUNT'
        )
          .trim()
          .toUpperCase();

      const proofName =
        String(
          req.body.proofName ||
          ''
        ).trim();

      /* -----------------------------------------
         CUSTOMER ID VALIDATION
      ----------------------------------------- */

      if (
        !Number.isInteger(customerId) ||
        customerId <= 0
      ) {
        return res
          .status(400)
          .json({
            error:
              'Invalid customer ID.',
          });
      }

      /* -----------------------------------------
         AMOUNT VALIDATION
      ----------------------------------------- */

      if (
        !Number.isInteger(amount) ||
        amount <= 0
      ) {
        return res
          .status(400)
          .json({
            error:
              'Please enter a valid whole-number amount.',
          });
      }

      /* -----------------------------------------
         REFERENCE VALIDATION
         EXACTLY 12 DIGITS
      ----------------------------------------- */

      if (
        !/^\d{12}$/.test(
          referenceNumber
        )
      ) {
        return res
          .status(400)
          .json({
            error:
              'Reference number must contain exactly 12 digits.',
          });
      }

      /* -----------------------------------------
         CHECK CUSTOMER
      ----------------------------------------- */

      const customerResult =
        await pool.query(
          `
          SELECT
            id,
            name,
            login_id,
            status
          FROM customers
          WHERE id = $1
          LIMIT 1
          `,
          [customerId]
        );

      if (
        customerResult.rows.length ===
        0
      ) {
        return res
          .status(404)
          .json({
            error:
              'Customer account not found.',
          });
      }

      const customer =
        customerResult.rows[0];

      if (
        String(
          customer.status
        ).toUpperCase() !==
        'ACTIVE'
      ) {
        return res
          .status(403)
          .json({
            error:
              'Customer account is not active.',
          });
      }

      /* -----------------------------------------
         DUPLICATE REFERENCE PRE-CHECK
      ----------------------------------------- */

      const duplicateResult =
        await pool.query(
          `
          SELECT
            id
          FROM demo_deposit_requests
          WHERE reference_number = $1
          LIMIT 1
          `,
          [referenceNumber]
        );

      if (
        duplicateResult.rows.length >
        0
      ) {
        return res
          .status(409)
          .json({
            success: false,

            code:
              'REPEATED_REFERENCE',

            error:
              'REPEATED REFERENCE — This reference number has already been submitted.',
          });
      }

      /* -----------------------------------------
         SAVE REQUEST TO POSTGRESQL
      ----------------------------------------- */

      const result =
        await pool.query(
          `
          INSERT INTO demo_deposit_requests (
            customer_id,
            reference_number,
            amount,
            payment_method,
            proof_name,
            status
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            'PENDING'
          )
          RETURNING
            id,
            customer_id,
            reference_number,
            amount,
            payment_method,
            proof_name,
            status,
            created_at,
            updated_at
          `,
          [
            customerId,
            referenceNumber,
            amount,
            paymentMethod,
            proofName || null,
          ]
        );

      const savedRequest =
        result.rows[0];

      return res
        .status(201)
        .json({
          success: true,

          message:
            'Demo request submitted successfully.',

          request: {
            id:
              savedRequest.id,

            customerId:
              savedRequest.customer_id,

            customerName:
              customer.name,

            loginId:
              customer.login_id,

            referenceNumber:
              savedRequest.reference_number,

            reference:
              savedRequest.reference_number,

            amount:
              Number(
                savedRequest.amount
              ),

            paymentMethod:
              savedRequest.payment_method,

            method:
              savedRequest.payment_method,

            proofName:
              savedRequest.proof_name,

            status:
              savedRequest.status,

            createdAt:
              savedRequest.created_at,

            updatedAt:
              savedRequest.updated_at,
          },
        });
    } catch (error) {
      console.error(
        'Create Demo Deposit Request Error:',
        error
      );

      /*
        PostgreSQL UNIQUE violation.

        Even if two devices submit the
        same reference at nearly the same
        time, database UNIQUE protection
        prevents the duplicate.
      */

      if (
        error?.code === '23505'
      ) {
        return res
          .status(409)
          .json({
            success: false,

            code:
              'REPEATED_REFERENCE',

            error:
              'REPEATED REFERENCE — This reference number has already been submitted.',
          });
      }

      return res
        .status(500)
        .json({
          success: false,

          error:
            'Unable to submit request.',
        });
    }
  }
);

/* =========================================================
   CUSTOMER DEMO DEPOSIT HISTORY

   GET /api/customers/:id/demo-deposits
========================================================= */

app.get(
  '/api/customers/:id/demo-deposits',

  async (req, res) => {
    try {
      const customerId =
        Number(req.params.id);

      if (
        !Number.isInteger(customerId) ||
        customerId <= 0
      ) {
        return res
          .status(400)
          .json({
            error:
              'Invalid customer ID.',
          });
      }

      /* -----------------------------------------
         CHECK CUSTOMER EXISTS
      ----------------------------------------- */

      const customerResult =
        await pool.query(
          `
          SELECT
            id,
            name,
            login_id
          FROM customers
          WHERE id = $1
          LIMIT 1
          `,
          [customerId]
        );

      if (
        customerResult.rows.length ===
        0
      ) {
        return res
          .status(404)
          .json({
            error:
              'Customer account not found.',
          });
      }

      /* -----------------------------------------
         LOAD ONLY THIS CUSTOMER'S REQUESTS
      ----------------------------------------- */

      const result =
        await pool.query(
          `
          SELECT
            id,
            customer_id,
            reference_number,
            amount,
            payment_method,
            proof_name,
            status,
            created_at,
            updated_at
          FROM demo_deposit_requests
          WHERE customer_id = $1
          ORDER BY id DESC
          LIMIT 100
          `,
          [customerId]
        );

      return res.json({
        success: true,

        customer: {
          id:
            customerResult.rows[0].id,

          name:
            customerResult.rows[0].name,

          loginId:
            customerResult.rows[0]
              .login_id,
        },

        requests:
          result.rows.map(
            (row) => ({
              id:
                row.id,

              customerId:
                row.customer_id,

              referenceNumber:
                row.reference_number,

              reference:
                row.reference_number,

              amount:
                Number(
                  row.amount
                ),

              paymentMethod:
                row.payment_method,

              method:
                row.payment_method,

              proofName:
                row.proof_name,

              status:
                row.status,

              createdAt:
                row.created_at,

              updatedAt:
                row.updated_at,
            })
          ),
      });
    } catch (error) {
      console.error(
        'Customer Demo Deposit History Error:',
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          error:
            'Unable to load request history.',
        });
    }
  }
);

/* =========================================================
   ADMIN - ALL DEMO DEPOSIT REQUESTS

   GET /api/admin/demo-deposits
========================================================= */

app.get(
  '/api/admin/demo-deposits',

  async (req, res) => {
    try {
      const status =
        String(
          req.query.status ||
          ''
        )
          .trim()
          .toUpperCase();

      let result;

      /* -----------------------------------------
         OPTIONAL STATUS FILTER
      ----------------------------------------- */

      if (
        status &&
        [
          'PENDING',
          'APPROVED',
          'REJECTED',
        ].includes(status)
      ) {
        result =
          await pool.query(
            `
            SELECT
              d.id,
              d.customer_id,
              d.reference_number,
              d.amount,
              d.payment_method,
              d.proof_name,
              d.status,
              d.created_at,
              d.updated_at,

              c.name
                AS customer_name,

              c.login_id

            FROM demo_deposit_requests d

            INNER JOIN customers c
              ON c.id =
                d.customer_id

            WHERE d.status = $1

            ORDER BY d.id DESC

            LIMIT 200
            `,
            [status]
          );
      } else {
        result =
          await pool.query(
            `
            SELECT
              d.id,
              d.customer_id,
              d.reference_number,
              d.amount,
              d.payment_method,
              d.proof_name,
              d.status,
              d.created_at,
              d.updated_at,

              c.name
                AS customer_name,

              c.login_id

            FROM demo_deposit_requests d

            INNER JOIN customers c
              ON c.id =
                d.customer_id

            ORDER BY d.id DESC

            LIMIT 200
            `
          );
      }

      return res.json({
        success: true,

        requests:
          result.rows.map(
            (row) => ({
              id:
                row.id,

              customerId:
                row.customer_id,

              customerName:
                row.customer_name,

              loginId:
                row.login_id,

              referenceNumber:
                row.reference_number,

              reference:
                row.reference_number,

              amount:
                Number(
                  row.amount
                ),

              paymentMethod:
                row.payment_method,

              method:
                row.payment_method,

              proofName:
                row.proof_name,

              status:
                row.status,

              createdAt:
                row.created_at,

              updatedAt:
                row.updated_at,
            })
          ),
      });
    } catch (error) {
      console.error(
        'Admin Demo Deposit List Error:',
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          error:
            'Unable to load requests.',
        });
    }
  }
);

/* =========================================================
   ADMIN - SINGLE DEMO DEPOSIT REQUEST

   GET /api/admin/demo-deposits/:id
========================================================= */

app.get(
  '/api/admin/demo-deposits/:id',

  async (req, res) => {
    try {
      const requestId =
        Number(req.params.id);

      if (
        !Number.isInteger(
          requestId
        ) ||
        requestId <= 0
      ) {
        return res
          .status(400)
          .json({
            error:
              'Invalid request ID.',
          });
      }

      const result =
        await pool.query(
          `
          SELECT
            d.id,
            d.customer_id,
            d.reference_number,
            d.amount,
            d.payment_method,
            d.proof_name,
            d.status,
            d.created_at,
            d.updated_at,

            c.name
              AS customer_name,

            c.login_id

          FROM demo_deposit_requests d

          INNER JOIN customers c
            ON c.id =
              d.customer_id

          WHERE d.id = $1

          LIMIT 1
          `,
          [requestId]
        );

      if (
        result.rows.length ===
        0
      ) {
        return res
          .status(404)
          .json({
            error:
              'Request not found.',
          });
      }

      const row =
        result.rows[0];

      return res.json({
        success: true,

        request: {
          id:
            row.id,

          customerId:
            row.customer_id,

          customerName:
            row.customer_name,

          loginId:
            row.login_id,

          referenceNumber:
            row.reference_number,

          reference:
            row.reference_number,

          amount:
            Number(
              row.amount
            ),

          paymentMethod:
            row.payment_method,

          method:
            row.payment_method,

          proofName:
            row.proof_name,

          status:
            row.status,

          createdAt:
            row.created_at,

          updatedAt:
            row.updated_at,
        },
      });
    } catch (error) {
      console.error(
        'Admin Single Demo Deposit Error:',
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          error:
            'Unable to load request.',
        });
    }
  }
);

/* =========================================================
   ADMIN UPDATE DEMO REQUEST STATUS

   PATCH /api/admin/demo-deposits/:id/status

   IMPORTANT:
   This changes informational request status only.
   It does NOT add money or betting balance.
========================================================= */

app.patch(
  '/api/admin/demo-deposits/:id/status',

  async (req, res) => {
    try {
      const requestId =
        Number(req.params.id);

      const status =
        String(
          req.body.status ||
          ''
        )
          .trim()
          .toUpperCase();

      if (
        !Number.isInteger(
          requestId
        ) ||
        requestId <= 0
      ) {
        return res
          .status(400)
          .json({
            error:
              'Invalid request ID.',
          });
      }

      const allowedStatuses = [
        'PENDING',
        'APPROVED',
        'REJECTED',
      ];

      if (
        !allowedStatuses.includes(
          status
        )
      ) {
        return res
          .status(400)
          .json({
            error:
              'Invalid request status.',
          });
      }

      const existingResult =
        await pool.query(
          `
          SELECT
            id,
            status
          FROM demo_deposit_requests
          WHERE id = $1
          LIMIT 1
          `,
          [requestId]
        );

      if (
        existingResult.rows.length ===
        0
      ) {
        return res
          .status(404)
          .json({
            error:
              'Request not found.',
          });
      }

      const result =
        await pool.query(
          `
          UPDATE demo_deposit_requests
          SET
            status = $1,
            updated_at = NOW()
          WHERE id = $2
          RETURNING
            id,
            customer_id,
            reference_number,
            amount,
            payment_method,
            proof_name,
            status,
            created_at,
            updated_at
          `,
          [
            status,
            requestId,
          ]
        );

      const updatedRequest =
        result.rows[0];

      return res.json({
        success: true,

        message:
          'Request status updated successfully.',

        request: {
          id:
            updatedRequest.id,

          customerId:
            updatedRequest.customer_id,

          referenceNumber:
            updatedRequest.reference_number,

          reference:
            updatedRequest.reference_number,

          amount:
            Number(
              updatedRequest.amount
            ),

          paymentMethod:
            updatedRequest.payment_method,

          method:
            updatedRequest.payment_method,

          proofName:
            updatedRequest.proof_name,

          status:
            updatedRequest.status,

          createdAt:
            updatedRequest.created_at,

          updatedAt:
            updatedRequest.updated_at,
        },
      });
    } catch (error) {
      console.error(
        'Admin Update Demo Deposit Status Error:',
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          error:
            'Unable to update request status.',
        });
    }
  }
);
/* =========================================================
   DEMO WITHDRAWAL REQUESTS API
   ========================================================= */

// Customer creates withdrawal request
app.post('/api/demo-withdrawals', async (req, res) => {
  try {
    const {
      customerId,
      amount,
      accountHolderName,
      bankName,
      accountNumber,
      ifscCode,
    } = req.body || {};

    const cleanCustomerId = Number(customerId);
    const cleanAmount = Number(amount);

    if (!Number.isInteger(cleanCustomerId) || cleanCustomerId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid customer ID is required.',
      });
    }

    if (!Number.isInteger(cleanAmount) || cleanAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid withdrawal amount is required.',
      });
    }

    if (
      !accountHolderName ||
      !bankName ||
      !accountNumber ||
      !ifscCode
    ) {
      return res.status(400).json({
        success: false,
        error: 'Complete bank account details are required.',
      });
    }

    const customerResult = await pool.query(
      `
        SELECT id, name, login_id, status, demo_coin_balance
        FROM customers
        WHERE id = $1
        LIMIT 1
      `,
      [cleanCustomerId]
    );

    if (customerResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found.',
      });
    }

    const customer = customerResult.rows[0];

    if (customer.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        error: 'Customer account is not active.',
      });
    }

    const result = await pool.query(
      `
        INSERT INTO demo_withdrawal_requests (
          customer_id,
          amount,
          account_holder_name,
          bank_name,
          account_number,
          ifsc_code,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')
        RETURNING *
      `,
      [
        cleanCustomerId,
        cleanAmount,
        String(accountHolderName).trim(),
        String(bankName).trim(),
        String(accountNumber).trim(),
        String(ifscCode).trim().toUpperCase(),
      ]
    );

    const request = result.rows[0];

    return res.status(201).json({
      success: true,
      request: {
        id: request.id,
        customerId: request.customer_id,
        customerName: customer.name,
        loginId: customer.login_id,
        amount: request.amount,
        accountHolderName: request.account_holder_name,
        bankName: request.bank_name,
        accountNumber: request.account_number,
        ifscCode: request.ifsc_code,
        status: request.status,
        createdAt: request.created_at,
        updatedAt: request.updated_at,
      },
    });
  } catch (error) {
    console.error('Create Demo Withdrawal Error:', error);

    return res.status(500).json({
      success: false,
      error: 'Unable to create withdrawal request.',
    });
  }
});
/* =========================================================
   DEMO WITHDRAWAL REQUESTS - STEP 2B
   Customer History + Admin List + Admin Status Update
========================================================= */

/*
  CUSTOMER WITHDRAWAL HISTORY
  GET /api/customers/:id/demo-withdrawals
*/
app.get(
  '/api/customers/:id/demo-withdrawals',
  async (req, res) => {
    try {
      const customerId = Number(req.params.id);

      if (
        !Number.isInteger(customerId) ||
        customerId <= 0
      ) {
        return res.status(400).json({
          success: false,
          error: 'Invalid customer ID.',
        });
      }

      const customerResult = await pool.query(
        `
          SELECT id
          FROM customers
          WHERE id = $1
          LIMIT 1
        `,
        [customerId]
      );

      if (customerResult.rowCount === 0) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found.',
        });
      }

      const result = await pool.query(
        `
          SELECT
            id,
            customer_id,
            amount,
            account_holder_name,
            bank_name,
            account_number,
            ifsc_code,
            status,
            created_at,
            updated_at
          FROM demo_withdrawal_requests
          WHERE customer_id = $1
          ORDER BY created_at DESC
          LIMIT 100
        `,
        [customerId]
      );

      const requests = result.rows.map((request) => ({
        id: request.id,
        customerId: request.customer_id,
        amount: request.amount,
        accountHolderName:
          request.account_holder_name,
        bankName: request.bank_name,
        accountNumber: request.account_number,
        ifscCode: request.ifsc_code,
        status: request.status,
        createdAt: request.created_at,
        updatedAt: request.updated_at,
      }));

      return res.json({
        success: true,
        requests,
      });
    } catch (error) {
      console.error(
        'Customer Demo Withdrawal History Error:',
        error
      );

      return res.status(500).json({
        success: false,
        error: 'Unable to load withdrawal history.',
      });
    }
  }
);

/*
  ADMIN - ALL WITHDRAWAL REQUESTS
  GET /api/admin/demo-withdrawals
  Optional:
  ?status=PENDING
  ?status=APPROVED
  ?status=REJECTED
*/
app.get(
  '/api/admin/demo-withdrawals',
  async (req, res) => {
    try {
      const requestedStatus = String(
        req.query.status || ''
      )
        .trim()
        .toUpperCase();

      const allowedStatuses = [
        'PENDING',
        'APPROVED',
        'REJECTED',
      ];

      let result;

      if (
        requestedStatus &&
        allowedStatuses.includes(requestedStatus)
      ) {
        result = await pool.query(
          `
            SELECT
              w.id,
              w.customer_id,
              w.amount,
              w.account_holder_name,
              w.bank_name,
              w.account_number,
              w.ifsc_code,
              w.status,
              w.created_at,
              w.updated_at,
              c.name AS customer_name,
              c.login_id
            FROM demo_withdrawal_requests w
            INNER JOIN customers c
              ON c.id = w.customer_id
            WHERE w.status = $1
            ORDER BY w.created_at DESC
            LIMIT 200
          `,
          [requestedStatus]
        );
      } else {
        result = await pool.query(
          `
            SELECT
              w.id,
              w.customer_id,
              w.amount,
              w.account_holder_name,
              w.bank_name,
              w.account_number,
              w.ifsc_code,
              w.status,
              w.created_at,
              w.updated_at,
              c.name AS customer_name,
              c.login_id
            FROM demo_withdrawal_requests w
            INNER JOIN customers c
              ON c.id = w.customer_id
            ORDER BY w.created_at DESC
            LIMIT 200
          `
        );
      }

      const requests = result.rows.map((request) => ({
        id: request.id,
        customerId: request.customer_id,
        customerName: request.customer_name,
        loginId: request.login_id,
        amount: request.amount,
        accountHolderName:
          request.account_holder_name,
        bankName: request.bank_name,
        accountNumber: request.account_number,
        ifscCode: request.ifsc_code,
        status: request.status,
        createdAt: request.created_at,
        updatedAt: request.updated_at,
      }));

      return res.json({
        success: true,
        requests,
      });
    } catch (error) {
      console.error(
        'Admin Demo Withdrawals Error:',
        error
      );

      return res.status(500).json({
        success: false,
        error: 'Unable to load withdrawal requests.',
      });
    }
  }
);

/*
  ADMIN - SINGLE WITHDRAWAL REQUEST
  GET /api/admin/demo-withdrawals/:id
*/
app.get(
  '/api/admin/demo-withdrawals/:id',
  async (req, res) => {
    try {
      const requestId = Number(req.params.id);

      if (
        !Number.isInteger(requestId) ||
        requestId <= 0
      ) {
        return res.status(400).json({
          success: false,
          error: 'Invalid withdrawal request ID.',
        });
      }

      const result = await pool.query(
        `
          SELECT
            w.id,
            w.customer_id,
            w.amount,
            w.account_holder_name,
            w.bank_name,
            w.account_number,
            w.ifsc_code,
            w.status,
            w.created_at,
            w.updated_at,
            c.name AS customer_name,
            c.login_id
          FROM demo_withdrawal_requests w
          INNER JOIN customers c
            ON c.id = w.customer_id
          WHERE w.id = $1
          LIMIT 1
        `,
        [requestId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          error: 'Withdrawal request not found.',
        });
      }

      const request = result.rows[0];

      return res.json({
        success: true,

        request: {
          id: request.id,
          customerId: request.customer_id,
          customerName: request.customer_name,
          loginId: request.login_id,
          amount: request.amount,
          accountHolderName:
            request.account_holder_name,
          bankName: request.bank_name,
          accountNumber: request.account_number,
          ifscCode: request.ifsc_code,
          status: request.status,
          createdAt: request.created_at,
          updatedAt: request.updated_at,
        },
      });
    } catch (error) {
      console.error(
        'Admin Single Demo Withdrawal Error:',
        error
      );

      return res.status(500).json({
        success: false,
        error: 'Unable to load withdrawal request.',
      });
    }
  }
);

/*
  ADMIN - UPDATE WITHDRAWAL STATUS
  PATCH /api/admin/demo-withdrawals/:id/status

  Body:
  {
    "status": "APPROVED"
  }

  Allowed:
  PENDING
  APPROVED
  REJECTED
*/
app.patch(
  '/api/admin/demo-withdrawals/:id/status',
  async (req, res) => {
    try {
      const requestId = Number(req.params.id);

      const nextStatus = String(
        req.body?.status || ''
      )
        .trim()
        .toUpperCase();

      if (
        !Number.isInteger(requestId) ||
        requestId <= 0
      ) {
        return res.status(400).json({
          success: false,
          error: 'Invalid withdrawal request ID.',
        });
      }

      const allowedStatuses = [
        'PENDING',
        'APPROVED',
        'REJECTED',
      ];

      if (!allowedStatuses.includes(nextStatus)) {
        return res.status(400).json({
          success: false,
          error:
            'Status must be PENDING, APPROVED or REJECTED.',
        });
      }

      const result = await pool.query(
        `
          UPDATE demo_withdrawal_requests
          SET
            status = $1,
            updated_at = NOW()
          WHERE id = $2
          RETURNING
            id,
            customer_id,
            amount,
            account_holder_name,
            bank_name,
            account_number,
            ifsc_code,
            status,
            created_at,
            updated_at
        `,
        [nextStatus, requestId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          error: 'Withdrawal request not found.',
        });
      }

      const updatedRequest = result.rows[0];

      return res.json({
        success: true,

        request: {
          id: updatedRequest.id,
          customerId:
            updatedRequest.customer_id,
          amount: updatedRequest.amount,
          accountHolderName:
            updatedRequest.account_holder_name,
          bankName:
            updatedRequest.bank_name,
          accountNumber:
            updatedRequest.account_number,
          ifscCode:
            updatedRequest.ifsc_code,
          status:
            updatedRequest.status,
          createdAt:
            updatedRequest.created_at,
          updatedAt:
            updatedRequest.updated_at,
        },
      });
    } catch (error) {
      console.error(
        'Admin Update Demo Withdrawal Status Error:',
        error
      );

      return res.status(500).json({
        success: false,
        error:
          'Unable to update withdrawal request status.',
      });
    }
  }
);
/* =========================================================
API 404
========================================================= */

app.all(
  '/api/*',
  (req, res) => {
    res
      .status(404)
      .json({
        error: `API endpoint ${req.originalUrl} not found.`,
      });
  }
);

/* =========================================================
FRONTEND
========================================================= */

app.use(
express.static(
path.join(
__dirname,
'dist'
)
)
);

app.get(
'*',

(req, res) => {
res.sendFile(
path.join(
__dirname,
'dist',
'index.html'
)
);
}
);

/* =========================================================
START SERVER
========================================================= */

async function startServer() {
  await initializeDatabase();

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();

