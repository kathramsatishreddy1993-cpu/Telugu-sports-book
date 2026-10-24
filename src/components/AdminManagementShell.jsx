import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import AdminDashboard from "./AdminDashboard";
import AdminControllerAccounts from "./AdminControllerAccounts";
import AutoGameControls from "./AutoGameControls";
import ManualSuperOverControls from "./ManualSuperOverControls";
import AdminPromoCodes from "./AdminPromoCodes";
import AdminPlayingHistory from "./AdminPlayingHistory";

const CONTROLLER_GAMES = [
  {
    id: "AVIATOR",
    name: "AVIATOR",
    icon: "✈️",
    gamePath: "/games/tsb-flight",
    controllerPath: "/game-control",
  },
  {
    id: "ROULETTE",
    name: "ROULETTE",
    icon: "🎡",
    gamePath: "/games/roulette",
    controllerPath: "/game-control/roulette",
  },
  {
    id: "DEAL_OR_NO_DEAL",
    name: "DEAL OR NO DEAL",
    icon: "💼",
    gamePath: "/games/deal-or-no-deal",
    controllerPath: "/game-control/deal-or-no-deal",
  },
];

const inputClass =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900";

const buttonClass =
  "rounded-lg bg-[#791b3e] px-4 py-2 text-sm font-bold text-white disabled:opacity-40";

async function request(path, options = {}) {
  const response = await fetch(
    `/api/playing-history${path}`,
    {
      credentials: "same-origin",
      cache: "no-store",
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body
          ? { "Content-Type": "application/json" }
          : {}),
        ...options.headers,
      },
    },
  );

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      "Server response was not JSON. Check deployment.",
    );
  }

  if (!response.ok) {
    throw Object.assign(
      new Error(data.error || "Request failed."),
      { status: response.status },
    );
  }

  return data;
}

function LinkBox({ label, path }) {
  const inputRef = useRef(null);
  const [message, setMessage] = useState("");

  const url = new URL(
    path,
    window.location.origin,
  ).href;

  const copy = async () => {
    setMessage("");

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard unavailable");
      }

      await navigator.clipboard.writeText(url);
      setMessage("Link copied");
    } catch {
      const input = inputRef.current;

      if (!input) {
        setMessage("Select the link and copy it.");
        return;
      }

      input.focus();
      input.select();
      input.setSelectionRange(0, url.length);

      try {
        const copied = document.execCommand("copy");

        setMessage(
          copied
            ? "Link copied"
            : "Link selected. Long press and copy.",
        );
      } catch {
        setMessage(
          "Link selected. Long press and copy.",
        );
      }
    }
  };

  return (
    <div className="rounded-xl border border-teal-700/70 bg-black/20 p-3">
      <label className="block">
        <span className="mb-2 block text-[10px] font-black uppercase tracking-wide text-cyan-100">
          {label}
        </span>

        <input
          ref={inputRef}
          type="text"
          readOnly
          value={url}
          spellCheck={false}
          onFocus={event => event.target.select()}
          className="w-full min-w-0 rounded-lg border border-teal-700 bg-[#041f1c] px-2 py-2 text-[11px] text-white outline-none focus:border-cyan-300"
        />
      </label>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-label={`Copy ${label}`}
          onClick={copy}
          className="rounded-lg bg-cyan-300 px-2 py-2 text-[10px] font-black text-black"
        >
          COPY
        </button>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${label}`}
          className="rounded-lg border border-amber-300/50 bg-amber-300/10 px-2 py-2 text-center text-[10px] font-black text-amber-100"
        >
          OPEN ↗
        </a>
      </div>

      <p
        role="status"
        aria-live="polite"
        className="mt-2 min-h-[16px] text-[10px] text-emerald-200"
      >
        {message}
      </p>
    </div>
  );
}

function AdminAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    name: "",
    loginId: "",
    temporaryPassword: "",
    canSettle: false,
  });

  const load = useCallback(async () => {
    try {
      const data = await request("/admins");

      setAccounts(data.accounts);
      setError("");
    } catch (failure) {
      setError(failure.message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async event => {
    event.preventDefault();

    if (busy) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      await request("/admins", {
        method: "POST",
        body: JSON.stringify(form),
      });

      setForm({
        name: "",
        loginId: "",
        temporaryPassword: "",
        canSettle: false,
      });

      setMessage(
        "New Admin created. They sign in at /new-admin and change their temporary password.",
      );

      await load();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  };

  const update = async (account, changes) => {
    if (busy) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      await request(`/admins/${account.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          active: account.active,
          canView: account.canView,
          canSettle: account.canSettle,
          version: account.version,
          ...changes,
        }),
      });

      setMessage(
        "Account saved. Previous sessions revoked; the New Admin must log in again.",
      );

      await load();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-5 rounded-xl border border-teal-200 bg-white p-4">
      <h2 className="font-black text-[#063f39]">
        NEW ADMIN ACCOUNTS
      </h2>

      <p className="mt-1 text-xs text-slate-600">
        These accounts access Playing History only.
        Game Controller IDs remain separate.
      </p>

      <form
        onSubmit={create}
        className="mt-3 grid gap-3 sm:grid-cols-2"
      >
        {[
          ["name", "Name"],
          ["loginId", "Admin ID"],
          [
            "temporaryPassword",
            "Temporary password (12+ characters)",
          ],
        ].map(([name, label]) => (
          <label
            key={name}
            className="text-xs font-bold"
          >
            {label}

            <input
              className={`${inputClass} mt-1 w-full`}
              type={
                name === "temporaryPassword"
                  ? "password"
                  : "text"
              }
              required
              value={form[name]}
              autoComplete="off"
              disabled={busy}
              onChange={event =>
                setForm({
                  ...form,
                  [name]: event.target.value,
                })
              }
            />
          </label>
        ))}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.canSettle}
            disabled={busy}
            onChange={event =>
              setForm({
                ...form,
                canSettle: event.target.checked,
              })
            }
          />

          Allow Sports Manual Settlement
        </label>

        <button
          type="submit"
          className={buttonClass}
          disabled={busy}
        >
          CREATE NEW ADMIN
        </button>
      </form>

      {error && (
        <p
          role="alert"
          className="mt-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {message && (
        <p
          role="status"
          className="mt-3 text-sm text-teal-800"
        >
          {message}
        </p>
      )}

      <div className="mt-4 space-y-3">
        {accounts.map(account => (
          <article
            key={account.id}
            className="rounded border border-slate-200 p-3"
          >
            <p className="font-bold">
              {account.name} · {account.loginId}
            </p>

            <p className="mt-1 text-xs">
              {account.active ? "ACTIVE" : "BLOCKED"}
              {" · "}
              History: {account.canView ? "YES" : "NO"}
              {" · "}
              Sports settlement:{" "}
              {account.canSettle ? "YES" : "NO"}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className={buttonClass}
                disabled={busy}
                onClick={() =>
                  update(account, {
                    active: !account.active,
                  })
                }
              >
                {account.active ? "BLOCK" : "ACTIVATE"}
              </button>

              <button
                type="button"
                className={buttonClass}
                disabled={busy}
                onClick={() =>
                  update(account, {
                    canView: !account.canView,
                    canSettle: account.canView
                      ? false
                      : account.canSettle,
                  })
                }
              >
                {account.canView
                  ? "REMOVE HISTORY ACCESS"
                  : "ALLOW HISTORY"}
              </button>

              <button
                type="button"
                className={buttonClass}
                disabled={busy || !account.canView}
                onClick={() =>
                  update(account, {
                    canSettle: !account.canSettle,
                  })
                }
              >
                {account.canSettle
                  ? "REMOVE SETTLEMENT"
                  : "ALLOW SETTLEMENT"}
              </button>

              <button
                type="button"
                className={buttonClass}
                disabled={busy}
                onClick={() => {
                  const password = window.prompt(
                    `New temporary password for ${account.loginId} (12+ characters):`,
                  );

                  if (password) {
                    void update(account, {
                      temporaryPassword: password,
                    });
                  }
                }}
              >
                RESET PASSWORD
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function viewFromLocation() {
  const name = window.location.hash.slice(1);

  if (name === "new-admin-accounts") {
    return "NEW_ADMIN_ACCOUNTS";
  }

  if (name === "playing-history") {
    return "PLAYING_HISTORY";
  }

  return "HOME";
}

export default function AdminManagementShell({
  admin,
  onLogout,
}) {
  const [view, updateView] = useState(viewFromLocation);
  const [identity, setIdentity] = useState(null);
  const [error, setError] = useState("");

  const setView = next => {
    updateView(next);

    const hash =
      next === "NEW_ADMIN_ACCOUNTS"
        ? "#new-admin-accounts"
        : next === "PLAYING_HISTORY"
          ? "#playing-history"
          : "";

    window.history.replaceState(
      null,
      "",
      window.location.pathname +
        window.location.search +
        hash,
    );
  };

  useEffect(() => {
    const changed = () => {
      updateView(viewFromLocation());
    };

    window.addEventListener("hashchange", changed);

    return () => {
      window.removeEventListener("hashchange", changed);
    };
  }, []);

  useEffect(() => {
    setIdentity(null);
    setError("");

    let active = true;
    const controller = new AbortController();

    fetch("/api/playing-history/me", {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async response => {
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Unable to verify Admin permissions.",
          );
        }

        if (active) {
          setIdentity(data.admin);
        }
      })
      .catch(failure => {
        if (active && failure.name !== "AbortError") {
          setError(failure.message);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [admin?.username]);

  if (error) {
    return (
      <main className="min-h-screen bg-[#061c1a] p-6 text-white">
        <p role="alert">{error}</p>

        <button
          type="button"
          onClick={onLogout}
          className="mt-4 rounded bg-rose-700 px-4 py-2"
        >
          Logout and login again
        </button>
      </main>
    );
  }

  if (!identity) {
    return (
      <main className="min-h-screen bg-[#061c1a] p-6 text-white">
        Verifying Admin permissions…
      </main>
    );
  }

  if (identity.historyOnly) {
    return (
      <AdminPlayingHistory
        admin={identity}
        onLogout={onLogout}
      />
    );
  }

  if (view === "NEW_ADMIN_ACCOUNTS") {
    return (
      <main className="min-h-screen bg-slate-100 p-4 text-slate-900">
        <div className="mx-auto max-w-5xl">
          <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#063f39] p-4 text-white">
            <h1 className="text-xl font-black">
              NEW ADMIN ACCOUNTS
            </h1>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setView("HOME")}
                className="rounded border border-white/30 px-3 py-2"
              >
                ← ADMIN DASHBOARD
              </button>

              <button
                type="button"
                onClick={onLogout}
                className="rounded border border-white/30 px-3 py-2"
              >
                LOGOUT
              </button>
            </div>
          </header>

          <p className="mt-4 text-sm">
            Create and manage History Admin IDs.
            New Admins sign in at /new-admin.
          </p>

          <div className="mt-4 rounded-xl bg-[#063f39] p-3">
            <LinkBox
              label="NEW ADMIN LOGIN LINK"
              path="/new-admin"
            />
          </div>

          <AdminAccounts />
        </div>
      </main>
    );
  }

  if (view === "PLAYING_HISTORY") {
    return (
      <AdminPlayingHistory
        admin={identity}
        onBack={() => setView("HOME")}
        onLogout={onLogout}
      />
    );
  }

  if (view === "PROMO_CODES") {
    return (
      <AdminPromoCodes
        admin={admin}
        onBack={() => setView("HOME")}
        onLogout={onLogout}
      />
    );
  }

  if (view === "CONTROLLED_SO") {
    return (
      <ManualSuperOverControls
        onBack={() => setView("GAMES")}
      />
    );
  }

  if (
    CONTROLLER_GAMES.some(
      game => game.id === view,
    )
  ) {
    return (
      <AdminControllerAccounts
        key={view}
        game={view}
        admin={admin}
        onBack={() => setView("GAMES")}
        onLogout={onLogout}
      />
    );
  }

  if (view === "GAMES") {
    return (
      <main className="min-h-screen bg-[#061c1a] p-4 text-white">
        <div className="mx-auto max-w-5xl">
          <button
            type="button"
            onClick={() => setView("HOME")}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm"
          >
            ‹ ADMIN DASHBOARD
          </button>

          <h1 className="my-6 text-2xl font-black text-amber-300">
            🔑 GAME IDs & LINKS
          </h1>

          <p className="mb-5 text-sm leading-6 text-slate-300">
            Create and manage separate Controller IDs
            for Aviator, Roulette and Deal or No Deal.
            Copy or open each game's links below.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CONTROLLER_GAMES.map(game => (
              <article
                key={game.id}
                className="min-w-0 overflow-hidden rounded-2xl border border-teal-700 bg-[#083d37]"
              >
                <button
                  type="button"
                  onClick={() => setView(game.id)}
                  className="block w-full px-4 py-6 text-left"
                >
                  <span className="text-3xl">
                    {game.icon}
                  </span>

                  <span className="mt-4 block text-sm font-black text-white">
                    {game.name}
                  </span>

                  <span className="mt-2 block text-xs leading-5 text-cyan-200">
                    Create / Manage Controller IDs ›
                  </span>
                </button>

                <div className="space-y-3 border-t border-teal-700/70 p-3">
                  <LinkBox
                    label={`${game.name} Game Link`}
                    path={game.gamePath}
                  />

                  <LinkBox
                    label={`${game.name} Controller Link`}
                    path={game.controllerPath}
                  />
                </div>
              </article>
            ))}
          </div>

          <article className="mt-6 overflow-hidden rounded-2xl border border-teal-700 bg-[#083d37]">
            <button
              type="button"
              onClick={() => setView("CONTROLLED_SO")}
              className="block w-full p-6 text-left"
            >
              <span className="block text-lg font-black text-amber-200">
                🏏 SUPER OVER · ADMIN CONTROL
              </span>

              <span className="mt-2 block text-sm text-cyan-100">
                Ball queue · Live rates · Publish match ›
              </span>
            </button>

            <div className="border-t border-teal-700/70 p-3">
              <LinkBox
                label="Published Super Over Game Link"
                path="/games/animated-super-over"
              />
            </div>
          </article>

          <article className="mt-6 overflow-hidden rounded-2xl border border-teal-700 bg-[#083d37]">
            <div className="p-5">
              <h2 className="text-lg font-black text-amber-200">
                🟢 🔴 🟣 COLOR PREDICTION
              </h2>

              <p className="mt-2 text-xs leading-6 text-cyan-100">
                Automatic game with random results.
                This game does not use a result
                Controller ID.
              </p>
            </div>

            <div className="border-t border-teal-700/70 p-3">
              <LinkBox
                label="Color Prediction Game Link"
                path="/games/color-prediction"
              />
            </div>
          </article>

          <div className="mt-6">
            <AutoGameControls />
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <div className="border-b border-teal-700 bg-[#061c1a] p-3 text-white">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => setView("GAMES")}
            className="rounded-xl border border-teal-700 bg-[#083d37] p-4 text-left"
          >
            <span className="block font-black text-amber-300">
              🔑 GAME IDs & LINKS
            </span>

            <span className="mt-1 block text-xs leading-5 text-cyan-100">
              Controller IDs · Copy Links · PLAY / PAUSE ›
            </span>
          </button>

          <button
            type="button"
            onClick={() => setView("PROMO_CODES")}
            className="rounded-xl border border-violet-400/30 bg-violet-500/10 p-4 text-left"
          >
            <span className="block font-black text-violet-200">
              PROMO CODES
            </span>

            <span className="mt-1 block text-xs leading-5 text-slate-300">
              Assign / Update Customer Promo Codes ›
            </span>
          </button>

          <button
            type="button"
            onClick={() => setView("PLAYING_HISTORY")}
            className="rounded-xl border border-cyan-400/40 bg-teal-700/30 p-4 text-left"
          >
            <span className="block font-black text-cyan-100">
              📋 CUSTOMER PLAYING HISTORY
            </span>

            <span className="mt-1 block text-xs leading-5 text-slate-200">
              8 Games + Sports · New Admin IDs · Settlement ›
            </span>
          </button>

          <button
            type="button"
            onClick={() => setView("NEW_ADMIN_ACCOUNTS")}
            className="rounded-xl border border-amber-300/40 bg-amber-400/10 p-4 text-left"
          >
            <span className="block font-black text-amber-200">
              NEW ADMIN ACCOUNTS
            </span>

            <span className="mt-1 block text-xs text-slate-200">
              Create IDs · Permissions · Reset Password ›
            </span>
          </button>
        </div>
      </div>

      <AdminDashboard
        admin={admin}
        onLogout={onLogout}
      />
    </>
  );
}
