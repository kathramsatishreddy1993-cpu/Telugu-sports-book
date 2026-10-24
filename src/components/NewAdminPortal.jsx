import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import AdminPlayingHistory from "./AdminPlayingHistory";

async function portalRequest(path, options = {}) {
  const response = await fetch(
    `/api/new-admin${path}`,
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

function verifiedIdentity(data) {
  if (
    !data.admin?.isAuthenticated ||
    data.admin.historyOnly !== true
  ) {
    throw new Error(
      "A separate New Admin session is required.",
    );
  }

  return data.admin;
}

export default function NewAdminPortal() {
  const [admin, setAdmin] = useState(null);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [logoutError, setLogoutError] = useState("");
  const [retry, setRetry] = useState(0);

  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const pending = useRef(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    setChecking(true);
    setError("");

    portalRequest("/session", {
      signal: controller.signal,
    })
      .then(data => {
        const identity = verifiedIdentity(data);

        if (active) {
          setAdmin(identity);
        }
      })
      .catch(failure => {
        if (
          !active ||
          failure.name === "AbortError"
        ) {
          return;
        }

        setAdmin(null);

        if (failure.status !== 401) {
          setError(failure.message);
        }
      })
      .finally(() => {
        if (active) {
          setChecking(false);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [retry]);

  const login = async event => {
    event.preventDefault();

    if (pending.current) return;

    pending.current = true;
    setBusy(true);
    setError("");

    try {
      const data = await portalRequest("/login", {
        method: "POST",
        body: JSON.stringify(form),
      });

      setAdmin(verifiedIdentity(data));

      setForm({
        username: "",
        password: "",
      });
    } catch (failure) {
      setError(failure.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  const logout = async () => {
    if (pending.current) return;

    pending.current = true;
    setBusy(true);
    setLogoutError("");

    try {
      await portalRequest("/logout", {
        method: "POST",
      });

      setAdmin(null);

      setForm({
        username: "",
        password: "",
      });

      setError("");
    } catch (failure) {
      setLogoutError(failure.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#061c1a] p-5 text-white">
        Checking New Admin session…
      </main>
    );
  }

  if (admin) {
    return (
      <>
        {logoutError && (
          <p
            role="alert"
            className="bg-red-100 p-3 text-sm text-red-800"
          >
            Logout failed: {logoutError}.
            Press LOGOUT to retry.
          </p>
        )}

        {busy && (
          <p
            role="status"
            className="bg-teal-100 p-3 text-sm text-teal-900"
          >
            Signing out New Admin…
          </p>
        )}

        <AdminPlayingHistory
          admin={admin}
          onLogout={logout}
        />
      </>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#061c1a] p-5 text-white">
      <form
        onSubmit={login}
        className="w-full max-w-md space-y-5 rounded-2xl border border-teal-700 bg-[#083d37] p-6 shadow-xl"
      >
        <div>
          <p className="text-xs font-bold tracking-widest text-amber-300">
            TELUGU SPORTS BOOK
          </p>

          <h1 className="mt-3 text-2xl font-black">
            NEW ADMIN LOGIN
          </h1>

          <p className="mt-2 text-sm leading-6 text-cyan-100">
            Customer Playing History · Sports Settlement
          </p>
        </div>

        <label className="block text-sm font-bold">
          New Admin ID

          <input
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            disabled={busy}
            value={form.username}
            onChange={event =>
              setForm({
                ...form,
                username: event.target.value,
              })
            }
            className="mt-2 w-full rounded-lg border border-teal-600 bg-[#041f1c] px-3 py-3 text-white outline-none focus:border-cyan-300"
          />
        </label>

        <label className="block text-sm font-bold">
          Password

          <input
            type="password"
            autoComplete="current-password"
            required
            disabled={busy}
            value={form.password}
            onChange={event =>
              setForm({
                ...form,
                password: event.target.value,
              })
            }
            className="mt-2 w-full rounded-lg border border-teal-600 bg-[#041f1c] px-3 py-3 text-white outline-none focus:border-cyan-300"
          />
        </label>

        {error && (
          <p
            role="alert"
            className="text-sm text-rose-200"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-cyan-300 px-4 py-3 font-black text-black disabled:opacity-50"
        >
          {busy
            ? "LOGGING IN…"
            : "NEW ADMIN LOGIN"}
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() =>
            setRetry(value => value + 1)
          }
          className="w-full text-sm text-cyan-100 underline disabled:opacity-50"
        >
          Check New Admin session again
        </button>
      </form>
    </main>
  );
}
