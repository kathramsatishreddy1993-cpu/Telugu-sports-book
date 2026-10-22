import {
  randomBytes,
  createHash,
  timingSafeEqual,
} from "node:crypto";

import bcrypt from "bcryptjs";

export const CONTROLLER_GAMES = Object.freeze([
  "AVIATOR",
  "ROULETTE",
  "DEAL_OR_NO_DEAL",
]);

const validGame = game =>
  CONTROLLER_GAMES.includes(game);

const digest = value =>
  createHash("sha256")
    .update(String(value))
    .digest("hex");

const equal = (a, b) =>
  timingSafeEqual(
    Buffer.from(digest(a), "hex"),
    Buffer.from(digest(b), "hex"),
  );

const cookie = (req, name) =>
  String(req.headers.cookie || "")
    .split(";")
    .map(value => value.trim())
    .find(value => value.startsWith(`${name}=`))
    ?.slice(name.length + 1) || "";

const wrap = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const fail = (status, message) =>
  Object.assign(new Error(message), { status });

const normalized = value =>
  String(value || "").trim().toLowerCase();

const sessionCookie = (res, name, value) =>
  res.cookie(name, value, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge:
      name === "tsb_game_controller"
        ? 365 * 24 * 60 * 60 * 1000
        : 8 * 60 * 60 * 1000,
  });

const validPassword = password =>
  typeof password === "string" &&
  password.length >= 12 &&
  Buffer.byteLength(password, "utf8") <= 72;

const publicAccount = row => ({
  id: row.id,
  name: row.name,
  loginId: row.login_id,
  game: row.game,
  status: row.status,
  mustChangePassword: row.must_change_password,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

function adminConfig() {
  const id = String(
    process.env.ADMIN_LOGIN_ID || "",
  ).trim();

  const password = String(
    process.env.ADMIN_LOGIN_PASSWORD || "",
  );

  if (!id || !validPassword(password)) {
    throw fail(
      503,
      "Configure ADMIN_LOGIN_ID and ADMIN_LOGIN_PASSWORD (12+ characters, maximum 72 UTF-8 bytes) on Render.",
    );
  }

  return {
    id,
    password,
    fingerprint: digest(`${id}:${password}`),
  };
}

async function transaction(pool, fn) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function issueController(client, res, account) {
  const token = randomBytes(32).toString("hex");

  await client.query(
    `INSERT INTO tsb_game_account_sessions(
       token_hash,
       account_id,
       auth_version,
       expires_at
     )
     VALUES($1,$2,$3,NULL)`,
    [
      digest(token),
      account.id,
      account.auth_version,
    ],
  );

  sessionCookie(res, "tsb_game_controller", token);
}

export async function initializeControllerAccounts(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tsb_admin_sessions (
      token_hash TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL,
      credential_fingerprint TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tsb_game_controller_accounts (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      login_id VARCHAR(30) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK(status IN ('ACTIVE','BLOCKED')),
      must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
      auth_version INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tsb_game_account_sessions (
      token_hash TEXT PRIMARY KEY,
      account_id INTEGER NOT NULL
        REFERENCES tsb_game_controller_accounts(id)
        ON DELETE CASCADE,
      auth_version INTEGER NOT NULL,
      expires_at TIMESTAMPTZ
    );

    ALTER TABLE tsb_game_controller_accounts
      ADD COLUMN IF NOT EXISTS game TEXT NOT NULL
      DEFAULT 'AVIATOR';

    DO $$
    DECLARE
      game_column SMALLINT;
      old_constraint RECORD;
    BEGIN
      SELECT attnum
      INTO game_column
      FROM pg_attribute
      WHERE attrelid='tsb_game_controller_accounts'::regclass
        AND attname='game'
        AND NOT attisdropped;

      FOR old_constraint IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid='tsb_game_controller_accounts'::regclass
          AND contype='c'
          AND game_column=ANY(conkey)
      LOOP
        EXECUTE format(
          'ALTER TABLE tsb_game_controller_accounts DROP CONSTRAINT %I',
          old_constraint.conname
        );
      END LOOP;

      ALTER TABLE tsb_game_controller_accounts
        ADD CONSTRAINT tsb_controller_game_check
        CHECK (
          game IN (
            'AVIATOR',
            'ROULETTE',
            'DEAL_OR_NO_DEAL'
          )
        );
    END;
    $$;

    ALTER TABLE tsb_game_account_sessions
      ALTER COLUMN expires_at DROP NOT NULL;

    CREATE TABLE IF NOT EXISTS tsb_game_account_audit (
      id BIGSERIAL PRIMARY KEY,
      admin_id TEXT NOT NULL,
      account_id INTEGER NOT NULL
        REFERENCES tsb_game_controller_accounts(id),
      action TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export function requireOldAdmin(pool) {
  return wrap(async (req, res, next) => {
    const config = adminConfig();
    const token = cookie(req, "tsb_old_admin");

    if (!/^[a-f0-9]{64}$/.test(token)) {
      throw fail(
        401,
        "Admin login required. Please logout and login again.",
      );
    }

    const result = await pool.query(
      `SELECT admin_id
       FROM tsb_admin_sessions
       WHERE token_hash=$1
         AND expires_at>NOW()
         AND credential_fingerprint=$2`,
      [digest(token), config.fingerprint],
    );

    if (!result.rows[0]) {
      throw fail(
        401,
        "Admin session expired. Please login again.",
      );
    }

    req.verifiedAdminId = result.rows[0].admin_id;
    next();
  });
}

export function requireControllerAccount(
  pool,
  requireReady = true,
  game = "AVIATOR",
) {
  return wrap(async (req, res, next) => {
    const token = cookie(req, "tsb_game_controller");

    if (!/^[a-f0-9]{64}$/.test(token)) {
      throw fail(401, "Game Controller login required.");
    }

    const result = await pool.query(
      `SELECT a.*
       FROM tsb_game_account_sessions s
       JOIN tsb_game_controller_accounts a
         ON a.id=s.account_id
       WHERE s.token_hash=$1
         AND (
           s.expires_at IS NULL
           OR s.expires_at>NOW()
         )
         AND s.auth_version=a.auth_version
         AND a.status='ACTIVE'`,
      [digest(token)],
    );

    const account = result.rows[0];

    if (!account) {
      throw fail(
        401,
        "Controller session expired, reset or blocked. Please contact Admin.",
      );
    }

    if (game && account.game !== game) {
      throw fail(
        403,
        "This Controller ID belongs to another game.",
      );
    }

    if (requireReady && account.must_change_password) {
      throw fail(
        403,
        "Change your temporary password before using game controls.",
      );
    }

    req.controllerAccount = account;
    req.controllerId = account.login_id;
    next();
  });
}

export async function verifyControllerForMutation(
  client,
  account,
  game = "AVIATOR",
) {
  const result = await client.query(
    `SELECT
       status,
       must_change_password,
       auth_version,
       game
     FROM tsb_game_controller_accounts
     WHERE id=$1
     FOR SHARE`,
    [account.id],
  );

  const current = result.rows[0];

  if (
    !current ||
    current.game !== game ||
    current.status !== "ACTIVE" ||
    current.must_change_password ||
    current.auth_version !== account.auth_version
  ) {
    throw fail(
      403,
      "Controller permission changed. Login again.",
    );
  }
}

export function registerControllerAccountRoutes(app, pool) {
  app.use("/api/game-control", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });

  app.use("/api/auth", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });

  const admin = requireOldAdmin(pool);

  const controller = requireControllerAccount(
    pool,
    false,
    null,
  );

  const attempts = new Map();

  const rateLimit = (req, label) => {
    const now = Date.now();

    for (const [key, value] of attempts) {
      if (value.until < now) {
        attempts.delete(key);
      }
    }

    const key = `${label}:${req.ip}`;

    const value = attempts.get(key) || {
      count: 0,
      until: now + 15 * 60 * 1000,
    };

    if (value.count >= 10) {
      throw fail(
        429,
        "Too many login attempts. Try again in 15 minutes.",
      );
    }

    value.count++;
    attempts.set(key, value);

    return () => attempts.delete(key);
  };

  app.post(
    "/api/auth/admin-login",
    wrap(async (req, res) => {
      const reset = rateLimit(req, "admin");
      const config = adminConfig();

      if (
        !equal(
          String(req.body?.username || "").trim(),
          config.id,
        ) ||
        !equal(
          String(req.body?.password || ""),
          config.password,
        )
      ) {
        throw fail(401, "Invalid Admin ID or Password.");
      }

      const token = randomBytes(32).toString("hex");

      await pool.query(
        `INSERT INTO tsb_admin_sessions(
           token_hash,
           admin_id,
           credential_fingerprint,
           expires_at
         )
         VALUES($1,$2,$3,NOW()+INTERVAL '8 hours')`,
        [
          digest(token),
          config.id,
          config.fingerprint,
        ],
      );

      sessionCookie(res, "tsb_old_admin", token);
      reset();

      res.json({
        success: true,
        admin: {
          username: config.id,
          role: "ADMIN",
          isAuthenticated: true,
        },
      });
    }),
  );

  app.get(
    "/api/auth/admin-session",
    admin,
    (req, res) => res.json({
      success: true,
      admin: {
        username: req.verifiedAdminId,
        role: "ADMIN",
        isAuthenticated: true,
      },
    }),
  );

  app.post(
    "/api/auth/admin-logout",
    wrap(async (req, res) => {
      await pool.query(
        `DELETE FROM tsb_admin_sessions
         WHERE token_hash=$1`,
        [digest(cookie(req, "tsb_old_admin"))],
      );

      res.clearCookie("tsb_old_admin", { path: "/" });
      res.json({ success: true });
    }),
  );

  app.get(
    "/api/admin/game-controllers",
    admin,
    wrap(async (req, res) => {
      const game = req.query.game;

      if (game && !validGame(game)) {
        throw fail(400, "Invalid game.");
      }

      const result = await pool.query(
        `SELECT *
         FROM tsb_game_controller_accounts
         WHERE ($1::text IS NULL OR game=$1)
         ORDER BY id DESC`,
        [game || null],
      );

      res.set("Cache-Control", "no-store");

      res.json({
        success: true,
        accounts: result.rows.map(publicAccount),
      });
    }),
  );

  app.post(
    "/api/admin/game-controllers",
    admin,
    wrap(async (req, res) => {
      const game = req.body?.game || "AVIATOR";

      if (!validGame(game)) {
        throw fail(400, "Invalid game.");
      }

      const name = String(req.body?.name || "").trim();
      const loginId = normalized(req.body?.loginId);
      const password = req.body?.temporaryPassword;

      if (
        !name ||
        name.length > 100 ||
        !/^[a-z0-9._-]{4,30}$/.test(loginId)
      ) {
        throw fail(
          400,
          "Name (1–100 characters) and Login ID (4–30 letters/numbers/dot/underscore/hyphen) are required.",
        );
      }

      if (!validPassword(password)) {
        throw fail(
          400,
          "Temporary password must have 12+ characters and fit within 72 UTF-8 bytes.",
        );
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const account = await transaction(pool, async client => {
        const result = await client.query(
          `INSERT INTO tsb_game_controller_accounts(
             name,login_id,password_hash,game
           )
           VALUES($1,$2,$3,$4)
           RETURNING *`,
          [name, loginId, passwordHash, game],
        );

        await client.query(
          `INSERT INTO tsb_game_account_audit(
             admin_id,account_id,action
           )
           VALUES($1,$2,'CREATE')`,
          [req.verifiedAdminId, result.rows[0].id],
        );

        return result.rows[0];
      });

      res.status(201).json({
        success: true,
        account: publicAccount(account),
      });
    }),
  );

  app.post(
    "/api/admin/game-controllers/:id/reset-password",
    admin,
    wrap(async (req, res) => {
      const id = Number(req.params.id);
      const password = req.body?.temporaryPassword;

      if (
        !Number.isSafeInteger(id) ||
        id <= 0 ||
        !validPassword(password)
      ) {
        throw fail(
          400,
          "Valid account ID and 12+ character temporary password are required.",
        );
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const account = await transaction(pool, async client => {
        const result = await client.query(
          `UPDATE tsb_game_controller_accounts
           SET password_hash=$1,
               must_change_password=TRUE,
               auth_version=auth_version+1,
               updated_at=NOW()
           WHERE id=$2
           RETURNING *`,
          [passwordHash, id],
        );

        if (!result.rows[0]) {
          throw fail(404, "Controller account not found.");
        }

        await client.query(
          "DELETE FROM tsb_game_account_sessions WHERE account_id=$1",
          [id],
        );

        await client.query(
          `INSERT INTO tsb_game_account_audit(
             admin_id,account_id,action
           )
           VALUES($1,$2,'PASSWORD_RESET')`,
          [req.verifiedAdminId, id],
        );

        return result.rows[0];
      });

      res.json({
        success: true,
        account: publicAccount(account),
      });
    }),
  );

  app.patch(
    "/api/admin/game-controllers/:id/status",
    admin,
    wrap(async (req, res) => {
      const id = Number(req.params.id);
      const status = String(req.body?.status || "").toUpperCase();

      if (
        !Number.isSafeInteger(id) ||
        id <= 0 ||
        !["ACTIVE", "BLOCKED"].includes(status)
      ) {
        throw fail(
          400,
          "Valid account ID and ACTIVE/BLOCKED status are required.",
        );
      }

      const account = await transaction(pool, async client => {
        const result = await client.query(
          `UPDATE tsb_game_controller_accounts
           SET status=$1,
               auth_version=auth_version+1,
               updated_at=NOW()
           WHERE id=$2
           RETURNING *`,
          [status, id],
        );

        if (!result.rows[0]) {
          throw fail(404, "Controller account not found.");
        }

        await client.query(
          "DELETE FROM tsb_game_account_sessions WHERE account_id=$1",
          [id],
        );

        await client.query(
          `INSERT INTO tsb_game_account_audit(
             admin_id,account_id,action
           )
           VALUES($1,$2,$3)`,
          [req.verifiedAdminId, id, status],
        );

        return result.rows[0];
      });

      res.json({
        success: true,
        account: publicAccount(account),
      });
    }),
  );

  app.post(
    "/api/game-control/login",
    wrap(async (req, res) => {
      const game = req.body?.game || "AVIATOR";

      if (!validGame(game)) {
        throw fail(400, "Invalid game.");
      }

      const reset = rateLimit(req, "controller");
      const loginId = normalized(req.body?.id);
      const password = String(req.body?.password || "");

      const account = await transaction(pool, async client => {
        const result = await client.query(
          `SELECT *
           FROM tsb_game_controller_accounts
           WHERE login_id=$1
           FOR UPDATE`,
          [loginId],
        );

        const account = result.rows[0];

        if (
          !account ||
          account.game !== game ||
          account.status !== "ACTIVE" ||
          !(await bcrypt.compare(password, account.password_hash))
        ) {
          throw fail(
            401,
            "Invalid Game Control ID/Password or account is blocked.",
          );
        }

        await issueController(client, res, account);
        return account;
      });

      reset();

      res.json({
        success: true,
        game: account.game,
        controllerId: account.login_id,
        controllerName: account.name,
        mustChangePassword: account.must_change_password,
      });
    }),
  );

  app.post(
    "/api/game-control/logout",
    wrap(async (req, res) => {
      await pool.query(
        `DELETE FROM tsb_game_account_sessions
         WHERE token_hash=$1`,
        [digest(cookie(req, "tsb_game_controller"))],
      );

      res.clearCookie("tsb_game_controller", { path: "/" });
      res.json({ success: true });
    }),
  );

  app.post(
    "/api/game-control/change-password",
    controller,
    wrap(async (req, res) => {
      const current = String(req.body?.currentPassword || "");
      const password = req.body?.newPassword;
      const confirm = req.body?.confirmPassword;

      if (
        !validPassword(password) ||
        password !== confirm ||
        password === current
      ) {
        throw fail(
          400,
          "New password must be different, have 12+ characters, fit within 72 UTF-8 bytes and match confirmation.",
        );
      }

      const account = await transaction(pool, async client => {
        const result = await client.query(
          `SELECT *
           FROM tsb_game_controller_accounts
           WHERE id=$1
           FOR UPDATE`,
          [req.controllerAccount.id],
        );

        const account = result.rows[0];

        if (
          !account ||
          account.status !== "ACTIVE" ||
          account.auth_version !== req.controllerAccount.auth_version
        ) {
          throw fail(
            401,
            "Account permission changed. Login again.",
          );
        }

        if (!(await bcrypt.compare(current, account.password_hash))) {
          throw fail(401, "Current password is incorrect.");
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const updated = await client.query(
          `UPDATE tsb_game_controller_accounts
           SET password_hash=$1,
               must_change_password=FALSE,
               auth_version=auth_version+1,
               updated_at=NOW()
           WHERE id=$2
           RETURNING *`,
          [passwordHash, account.id],
        );

        await client.query(
          "DELETE FROM tsb_game_account_sessions WHERE account_id=$1",
          [account.id],
        );

        await issueController(client, res, updated.rows[0]);
        return updated.rows[0];
      });

      res.json({
        success: true,
        game: account.game,
        controllerId: account.login_id,
        mustChangePassword: false,
      });
    }),
  );
}
