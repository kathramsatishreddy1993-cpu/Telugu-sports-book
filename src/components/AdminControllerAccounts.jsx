import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

const GAME_CONFIG = {
  AVIATOR: {
    name: "AVIATOR",
    path: "/game-control",
    ready: true,
  },
  ROULETTE: {
    name: "ROULETTE",
    path: "/game-control/roulette",
    ready: true,
  },
  DEAL_OR_NO_DEAL: {
    name: "DEAL OR NO DEAL",
    path: "/game-control/deal-or-no-deal",
    ready: true,
  },
};

async function api(path, method = "GET", body) {
  const response = await fetch(path, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(body !== undefined
        ? { "Content-Type": "application/json" }
        : {}),
    },
    ...(body !== undefined
      ? { body: JSON.stringify(body) }
      : {}),
  });

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const error = new Error(
      data.error || "Unable to complete request.",
    );

    error.status = response.status;
    throw error;
  }

  return data;
}

export default function AdminControllerAccounts({
  admin,
  game = "AVIATOR",
  onBack,
  onLogout,
}) {
  const config = GAME_CONFIG[game];

  const [accounts, setAccounts] = useState([]);
  const [name, setName] = useState("");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");

  const [resetAccount, setResetAccount] =
    useState(null);

  const [resetPassword, setResetPassword] =
    useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const [loginRequired, setLoginRequired] =
    useState(false);

  const alive = useRef(false);
  const pending = useRef(false);
  const loadVersion = useRef(0);

  const load = useCallback(async () => {
    if (!GAME_CONFIG[game]) return;

    const version = ++loadVersion.current;

    if (alive.current) {
      setLoading(true);
    }

    try {
      const data = await api(
        `/api/admin/game-controllers?game=${encodeURIComponent(game)}`,
      );

      if (
        alive.current &&
        version === loadVersion.current
      ) {
        setAccounts(
          Array.isArray(data.accounts)
            ? data.accounts
            : [],
        );

        setLoginRequired(false);
        setError("");
      }
    } catch (requestError) {
      if (
        alive.current &&
        version === loadVersion.current
      ) {
        setError(requestError.message);

        setLoginRequired(
          requestError.status === 401,
        );
      }
    } finally {
      if (
        alive.current &&
        version === loadVersion.current
      ) {
        setLoading(false);
      }
    }
  }, [game]);

  useEffect(() => {
    alive.current = true;

    setAccounts([]);
    setName("");
    setLoginId("");
    setPassword("");
    setResetAccount(null);
    setResetPassword("");
    setMessage("");
    setError("");
    setLoginRequired(false);

    load();

    return () => {
      alive.current = false;
      loadVersion.current++;
    };
  }, [load]);

  const action = async (
    kind,
    account,
    event,
  ) => {
    event?.preventDefault();

    if (
      pending.current ||
      !config ||
      loginRequired
    ) {
      return;
    }

    setError("");
    setMessage("");

    if (kind === "create") {
      const cleanLoginId = loginId
        .trim()
        .toLowerCase();

      if (
        !name.trim() ||
        name.trim().length > 100 ||
        !/^[a-z0-9._-]{4,30}$/.test(
          cleanLoginId,
        )
      ) {
        setError(
          "Enter a name and a Login ID with 4–30 letters, numbers, dots, underscores or hyphens.",
        );

        return;
      }
    }

    if (
      kind === "create" ||
      kind === "reset"
    ) {
      const selectedPassword =
        kind === "create"
          ? password
          : resetPassword;

      if (
        selectedPassword.length < 12 ||
        new TextEncoder().encode(
          selectedPassword,
        ).length > 72
      ) {
        setError(
          "Password must have at least 12 characters and fit within 72 UTF-8 bytes.",
        );

        return;
      }
    }

    if (
      kind !== "create" &&
      (!account || account.game !== game)
    ) {
      setError(
        "Choose an account belonging to this game.",
      );

      return;
    }

    pending.current = true;
    setBusy(true);

    try {
      if (kind === "create") {
        await api(
          "/api/admin/game-controllers",
          "POST",
          {
            game,
            name: name.trim(),
            loginId: loginId
              .trim()
              .toLowerCase(),
            temporaryPassword: password,
          },
        );

        if (alive.current) {
          setName("");
          setLoginId("");
          setPassword("");

          setMessage(
            `${config.name} Controller created. Share the temporary credentials privately. First login requires a password change.`,
          );
        }
      } else if (kind === "reset") {
        await api(
          `/api/admin/game-controllers/${account.id}/reset-password`,
          "POST",
          {
            temporaryPassword:
              resetPassword,
          },
        );

        if (alive.current) {
          setResetAccount(null);
          setResetPassword("");

          setMessage(
            "Temporary password reset. All previous sessions are invalidated.",
          );
        }
      } else {
        const status =
          account.status === "ACTIVE"
            ? "BLOCKED"
            : "ACTIVE";

        await api(
          `/api/admin/game-controllers/${account.id}/status`,
          "PATCH",
          { status },
        );

        if (alive.current) {
          setMessage(
            `Account ${status}. Existing locked rounds continue unchanged.`,
          );
        }
      }

      await load();
    } catch (requestError) {
      if (alive.current) {
        setError(requestError.message);

        setLoginRequired(
          requestError.status === 401,
        );
      }
    } finally {
      pending.current = false;

      if (alive.current) {
        setBusy(false);
      }
    }
  };

  const field =
    "mt-2 w-full rounded-lg border border-[#39756f] bg-[#062f2b] px-3 py-3 text-sm text-white outline-none focus:border-cyan-400 disabled:opacity-50";

  if (!config) {
    return (
      <main className="min-h-screen bg-[#061c1a] p-5 text-white">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-white/20 px-4 py-2"
        >
          ‹ GAME IDs
        </button>

        <p className="mt-5 text-red-200">
          Invalid controller game.
        </p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#061c1a] text-white">
      <header className="bg-[#9a5a00] p-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <h1 className="text-lg font-black">
            {config.name} Controller IDs
          </h1>

          <p className="text-xs text-amber-100">
            Admin: {admin?.username}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 p-4">
        <button
          type="button"
          disabled={busy}
          onClick={onBack}
          className="rounded-lg border border-amber-400/40 px-3 py-2 text-xs text-amber-200 disabled:opacity-40"
        >
          ‹ GAME IDs
        </button>

        <div className="break-words rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-xs leading-6 text-cyan-100">
          <p>
            These IDs can control{" "}
            {config.name} only.
          </p>

          {config.ready ? (
            <p className="mt-1">
              Login link:{" "}

              <a
                className="underline"
                href={config.path}
                target="_blank"
                rel="noreferrer"
              >
                {window.location.origin}
                {config.path}
              </a>
            </p>
          ) : (
            <p className="mt-2 text-amber-200">
              Controller accounts can be
              created now. The game-control
              page is not available yet.
            </p>
          )}

          {game === "DEAL_OR_NO_DEAL" && (
            <p className="mt-3 text-amber-100">
              Admin-selected demo. Publish
              all nine levels before betting
              opens. Published results stay
              locked for the entire session.
            </p>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200"
          >
            {error}

            {loginRequired && (
              <button
                type="button"
                onClick={onLogout}
                className="ml-3 underline"
              >
                ADMIN LOGIN AGAIN
              </button>
            )}
          </div>
        )}

        {message && (
          <p
            role="status"
            className="rounded-lg border border-green-400/30 bg-green-400/10 p-3 text-sm text-green-100"
          >
            {message}
          </p>
        )}

        <form
          onSubmit={event =>
            action("create", null, event)
          }
          className="space-y-3 rounded-xl border border-[#28655f] bg-[#083d37] p-4"
        >
          <h2 className="text-sm font-black text-amber-300">
            CREATE {config.name} CONTROLLER ID
          </h2>

          <fieldset
            disabled={busy || loginRequired}
            className="space-y-3"
          >
            <label className="block text-xs">
              Controller Name

              <input
                required
                maxLength={100}
                value={name}
                onChange={event =>
                  setName(event.target.value)
                }
                className={field}
              />
            </label>

            <label className="block text-xs">
              Game Control ID

              <input
                required
                minLength={4}
                maxLength={30}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                value={loginId}
                onChange={event =>
                  setLoginId(
                    event.target.value,
                  )
                }
                className={field}
              />
            </label>

            <label className="block text-xs">
              Temporary Password
              (minimum 12 characters)

              <input
                required
                minLength={12}
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={event =>
                  setPassword(
                    event.target.value,
                  )
                }
                className={field}
              />
            </label>

            <button
              type="submit"
              className="w-full rounded-lg bg-amber-400 py-3 text-sm font-black text-black disabled:opacity-50"
            >
              {busy
                ? "PLEASE WAIT…"
                : "CREATE CONTROLLER ACCOUNT"}
            </button>
          </fieldset>
        </form>

        {resetAccount && (
          <form
            onSubmit={event =>
              action(
                "reset",
                resetAccount,
                event,
              )
            }
            className="space-y-3 rounded-xl border border-amber-400/30 bg-[#083d37] p-4"
          >
            <h2 className="text-sm font-bold">
              Reset temporary password:{" "}
              {resetAccount.loginId}
            </h2>

            <label className="block text-xs">
              New Temporary Password

              <input
                required
                minLength={12}
                disabled={
                  busy || loginRequired
                }
                type="password"
                autoComplete="new-password"
                value={resetPassword}
                onChange={event =>
                  setResetPassword(
                    event.target.value,
                  )
                }
                className={field}
              />
            </label>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={
                  busy || loginRequired
                }
                className="rounded-lg bg-amber-400 px-4 py-2 text-xs font-black text-black disabled:opacity-50"
              >
                SAVE RESET
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setResetAccount(null);
                  setResetPassword("");
                }}
                className="rounded-lg border border-white/20 px-4 py-2 text-xs disabled:opacity-50"
              >
                CANCEL
              </button>
            </div>
          </form>
        )}

        <div className="flex items-center justify-between">
          <h2 className="font-black">
            Controller accounts
          </h2>

          <button
            type="button"
            disabled={busy || loading}
            onClick={load}
            className="text-xs text-cyan-200 underline disabled:opacity-50"
          >
            {loading
              ? "LOADING…"
              : "REFRESH"}
          </button>
        </div>

        {!loading && !accounts.length && (
          <p className="text-xs text-slate-400">
            No Controller accounts created yet.
          </p>
        )}

        {accounts.map(account => (
          <section
            key={account.id}
            className="rounded-xl border border-[#28655f] bg-[#083d37] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-black">
                  {account.name}
                </h3>

                <p className="mt-1 text-xs text-amber-200">
                  {account.loginId}
                </p>
              </div>

              <span
                className={`rounded px-2 py-1 text-[10px] font-black ${
                  account.status === "ACTIVE"
                    ? "bg-green-500/10 text-green-300"
                    : "bg-red-500/10 text-red-300"
                }`}
              >
                {account.status}
              </span>
            </div>

            <p className="mt-3 text-xs text-slate-400">
              Password:{" "}
              {account.mustChangePassword
                ? "CHANGE REQUIRED ON LOGIN"
                : "SET"}
              {" · "}
              Multiple-device login allowed
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={
                  busy || loginRequired
                }
                onClick={() => {
                  setResetAccount(account);
                  setResetPassword("");
                }}
                className="rounded-lg border border-amber-400/30 px-3 py-2 text-xs text-amber-200 disabled:opacity-50"
              >
                RESET PASSWORD
              </button>

              <button
                type="button"
                disabled={
                  busy || loginRequired
                }
                onClick={() =>
                  action("status", account)
                }
                className="rounded-lg border border-cyan-400/30 px-3 py-2 text-xs text-cyan-200 disabled:opacity-50"
              >
                {account.status === "ACTIVE"
                  ? "BLOCK ACCOUNT"
                  : "UNBLOCK ACCOUNT"}
              </button>
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
