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
  },
  ROULETTE: {
    name: "ROULETTE",
    path: "/game-control/roulette",
  },
};

async function api(
  path,
  method = "GET",
  body,
) {
  const response = await fetch(path, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(body !== undefined
        ? {
            "Content-Type":
              "application/json",
          }
        : {}),
    },
    ...(body !== undefined
      ? {
          body:
            JSON.stringify(body),
        }
      : {}),
  });

  let data;

  try {
    data =
      await response.json();
  } catch {
    throw new Error(
      "Server response was not JSON. Check deployment.",
    );
  }

  if (!response.ok) {
    throw Object.assign(
      new Error(
        data.error ||
          "Unable to complete request.",
      ),
      {
        status:
          response.status,
      },
    );
  }

  return data;
}

export default function AdminControllerAccounts({
  admin,
  game = "AVIATOR",
  onBack,
  onLogout,
}) {
  const config =
    GAME_CONFIG[game];

  const [accounts, setAccounts] =
    useState([]);

  const [name, setName] =
    useState("");

  const [loginId, setLoginId] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    resetAccount,
    setResetAccount,
  ] = useState(null);

  const [
    resetPassword,
    setResetPassword,
  ] = useState("");

  const [
    removeAccount,
    setRemoveAccount,
  ] = useState(null);

  const [removeId, setRemoveId] =
    useState("");

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [busy, setBusy] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [
    loginRequired,
    setLoginRequired,
  ] = useState(false);

  const [
    copyMessage,
    setCopyMessage,
  ] = useState("");

  const alive = useRef(false);
  const pending = useRef(false);
  const loadVersion = useRef(0);
  const linkRef = useRef(null);

  const loginUrl = config
    ? new URL(
        config.path,
        window.location.origin,
      ).href
    : "";

  const load =
    useCallback(async () => {
      if (!GAME_CONFIG[game]) {
        return;
      }

      const version =
        ++loadVersion.current;

      if (alive.current) {
        setLoading(true);
      }

      try {
        const data = await api(
          `/api/admin/game-controllers?game=${encodeURIComponent(game)}`,
        );

        if (
          !Array.isArray(
            data.accounts,
          )
        ) {
          throw new Error(
            "Invalid account list response.",
          );
        }

        if (
          alive.current &&
          version ===
            loadVersion.current
        ) {
          setAccounts(
            data.accounts.filter(
              account =>
                account.game ===
                game,
            ),
          );

          setLoginRequired(false);
          setError("");
        }
      } catch (failure) {
        if (
          alive.current &&
          version ===
            loadVersion.current
        ) {
          setError(
            failure.message,
          );

          setLoginRequired(
            failure.status ===
              401,
          );
        }
      } finally {
        if (
          alive.current &&
          version ===
            loadVersion.current
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
    setRemoveAccount(null);
    setRemoveId("");
    setMessage("");
    setError("");
    setLoginRequired(false);
    setCopyMessage("");

    void load();

    return () => {
      alive.current = false;
      loadVersion.current++;
    };
  }, [load]);

  const copyLink = async () => {
    try {
      if (
        !navigator.clipboard
          ?.writeText
      ) {
        throw new Error(
          "Clipboard unavailable",
        );
      }

      await navigator.clipboard
        .writeText(loginUrl);

      if (alive.current) {
        setCopyMessage(
          "Link copied",
        );
      }
    } catch {
      linkRef.current?.focus();
      linkRef.current?.select();

      if (alive.current) {
        setCopyMessage(
          "Link selected. Long press and copy.",
        );
      }
    }
  };

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

    if (
      kind === "create" &&
      (
        !name.trim() ||
        name.trim().length >
          100 ||
        !/^[a-z0-9._-]{4,30}$/.test(
          loginId
            .trim()
            .toLowerCase(),
        )
      )
    ) {
      setError(
        "Enter a name and a Login ID with 4–30 letters, numbers, dots, underscores or hyphens.",
      );

      return;
    }

    if (
      kind === "create" ||
      kind === "reset"
    ) {
      const value =
        kind === "create"
          ? password
          : resetPassword;

      if (
        value.length < 12 ||
        new TextEncoder()
          .encode(value)
          .length > 72
      ) {
        setError(
          "Password must have at least 12 characters and fit within 72 UTF-8 bytes.",
        );

        return;
      }
    }

    if (
      kind !== "create" &&
      (
        !account ||
        account.game !== game
      )
    ) {
      setError(
        "Choose an account belonging to this game.",
      );

      return;
    }

    if (
      kind === "remove" &&
      removeId
        .trim()
        .toLowerCase() !==
        account.loginId
    ) {
      setError(
        "Type the selected Login ID to confirm removal.",
      );

      return;
    }

    pending.current = true;

    loadVersion.current++;

    setBusy(true);

    try {
      let successMessage;

      if (
        kind === "create"
      ) {
        await api(
          "/api/admin/game-controllers",
          "POST",
          {
            game,
            name:
              name.trim(),
            loginId:
              loginId
                .trim()
                .toLowerCase(),
            temporaryPassword:
              password,
          },
        );

        if (alive.current) {
          setName("");
          setLoginId("");
          setPassword("");
        }

        successMessage =
          `${config.name} Controller created. Share credentials privately. First login requires a password change.`;
      } else if (
        kind === "reset"
      ) {
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
        }

        successMessage =
          "Temporary password reset. Previous sessions are invalidated.";
      } else if (
        kind === "remove"
      ) {
        const data = await api(
          `/api/admin/game-controllers/${account.id}`,
          "DELETE",
          {
            game,
            loginId:
              account.loginId,
          },
        );

        if (
          !data.success ||
          !data.removed
        ) {
          throw new Error(
            "Unable to confirm removal. Refresh before retrying.",
          );
        }

        if (alive.current) {
          setRemoveAccount(null);
          setRemoveId("");

          if (
            resetAccount?.id ===
            account.id
          ) {
            setResetAccount(null);
            setResetPassword("");
          }
        }

        successMessage =
          `${account.loginId} removed. Login and sessions are disabled. Previous history is retained. This Login ID cannot be reused.`;
      } else {
        const status =
          account.status ===
          "ACTIVE"
            ? "BLOCKED"
            : "ACTIVE";

        await api(
          `/api/admin/game-controllers/${account.id}/status`,
          "PATCH",
          { status },
        );

        successMessage =
          `Account ${status}. Previous sessions are invalidated. Published rounds remain unchanged.`;
      }

      if (alive.current) {
        setMessage(
          successMessage,
        );
      }

      await load();
    } catch (failure) {
      if (alive.current) {
        setError(
          failure.message,
        );

        setLoginRequired(
          failure.status === 401,
        );
      }
    } finally {
      pending.current = false;

      if (alive.current) {
        setBusy(false);
        setLoading(false);
      }
    }
  };

  const field =
    "mt-2 w-full rounded-lg border border-[#39756f] bg-[#062f2b] px-3 py-3 text-sm text-white outline-none focus:border-cyan-400 disabled:opacity-50";

  const disabled =
    busy || loginRequired;

  if (!config) {
    return (
      <main className="min-h-screen bg-[#061c1a] p-5 text-white">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-white/20 px-4 py-2"
        >
          ‹ NEW ADMIN ACCOUNTS
        </button>

        <p className="mt-5 text-red-200">
          Controller ID management is available
          for Aviator and Roulette only.
        </p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#061c1a] text-white">
      <header className="bg-[#9a5a00] p-4">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold tracking-widest text-amber-200">
              ADMIN CONTROL PANEL
            </p>

            <h1 className="mt-1 text-lg font-black">
              {config.name} Controller IDs
            </h1>
          </div>

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
          ‹ NEW ADMIN ACCOUNTS
        </button>

        <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-xs leading-6 text-cyan-100">
          <p>
            These IDs can control{" "}
            {config.name} only.
          </p>

          <label className="mt-3 block">
            CONTROLLER LOGIN LINK

            <input
              ref={linkRef}
              readOnly
              value={loginUrl}
              onFocus={event =>
                event.target.select()
              }
              className={field}
            />
          </label>

          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={copyLink}
              className="rounded-lg bg-cyan-300 px-4 py-2 font-black text-black"
            >
              COPY LINK
            </button>

            <a
              href={config.path}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-cyan-300/40 px-4 py-2"
            >
              OPEN LOGIN ↗
            </a>
          </div>

          <p
            role="status"
            className="mt-2"
          >
            {copyMessage}
          </p>
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
            action(
              "create",
              null,
              event,
            )
          }
          className="space-y-3 rounded-xl border border-[#28655f] bg-[#083d37] p-4"
        >
          <h2 className="text-sm font-black text-amber-300">
            CREATE {config.name} CONTROLLER ID
          </h2>

          <fieldset
            disabled={disabled}
            className="space-y-3"
          >
            <label className="block text-xs">
              Controller Name

              <input
                required
                maxLength={100}
                value={name}
                onChange={event =>
                  setName(
                    event.target.value,
                  )
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
                disabled={disabled}
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
                disabled={disabled}
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

        {removeAccount && (
          <form
            onSubmit={event =>
              action(
                "remove",
                removeAccount,
                event,
              )
            }
            className="space-y-3 rounded-xl border border-red-400/50 bg-red-900/20 p-4"
          >
            <h2 className="font-black text-red-200">
              REMOVE ID:{" "}
              {removeAccount.loginId}
            </h2>

            <p className="text-xs leading-6">
              This ID will be removed from the
              list. Login and all sessions will
              stop. Previous history will
              remain. A removed Login ID
              cannot be reused.
            </p>

            <label className="block text-xs">
              Type{" "}
              {removeAccount.loginId}{" "}
              to confirm

              <input
                required
                disabled={disabled}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                value={removeId}
                onChange={event =>
                  setRemoveId(
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
                  disabled ||
                  removeId
                    .trim()
                    .toLowerCase() !==
                    removeAccount.loginId
                }
                className="rounded-lg bg-red-700 px-4 py-2 text-xs font-black disabled:opacity-50"
              >
                CONFIRM REMOVE
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setRemoveAccount(null);
                  setRemoveId("");
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

        {!loading &&
          !accounts.length &&
          !error && (
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
              <div className="min-w-0 break-words">
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
                disabled={disabled}
                onClick={() => {
                  setResetAccount(account);
                  setResetPassword("");
                  setRemoveAccount(null);
                  setRemoveId("");
                }}
                className="rounded-lg border border-amber-400/30 px-3 py-2 text-xs text-amber-200 disabled:opacity-50"
              >
                RESET PASSWORD
              </button>

              <button
                type="button"
                disabled={disabled}
                onClick={() =>
                  action(
                    "status",
                    account,
                  )
                }
                className="rounded-lg border border-cyan-400/30 px-3 py-2 text-xs text-cyan-200 disabled:opacity-50"
              >
                {account.status === "ACTIVE"
                  ? "BLOCK ACCOUNT"
                  : "UNBLOCK ACCOUNT"}
              </button>

              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  setRemoveAccount(account);
                  setRemoveId("");
                  setResetAccount(null);
                  setResetPassword("");
                  setError("");
                  setMessage("");

                  window.scrollTo(0, 0);
                }}
                className="rounded-lg border border-red-400/50 bg-red-500/10 px-3 py-2 text-xs text-red-200 disabled:opacity-50"
              >
                REMOVE ID
              </button>
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
