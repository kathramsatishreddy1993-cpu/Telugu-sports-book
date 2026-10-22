import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

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
    throw new Error(
      "Server returned an invalid response.",
    );
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

const normalizeCode = value =>
  String(value || "").trim().toUpperCase();

export default function AdminPromoCodes({
  admin,
  onBack,
  onLogout,
}) {
  const [customers, setCustomers] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loginRequired, setLoginRequired] =
    useState(false);

  const alive = useRef(false);
  const pending = useRef(false);
  const loadVersion = useRef(0);

  const load = useCallback(async () => {
    const version = ++loadVersion.current;

    if (alive.current) {
      setLoading(true);
      setError("");
    }

    try {
      const data = await api(
        "/api/admin/customers",
      );

      if (
        !alive.current ||
        version !== loadVersion.current
      ) {
        return;
      }

      const rows = Array.isArray(data.customers)
        ? data.customers
        : [];

      setCustomers(rows);

      setDrafts(
        Object.fromEntries(
          rows.map(customer => [
            customer.id,
            customer.promoCode ||
              customer.promo_code ||
              "",
          ]),
        ),
      );

      setLoginRequired(false);
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
  }, []);

  useEffect(() => {
    alive.current = true;
    load();

    return () => {
      alive.current = false;
      loadVersion.current++;
    };
  }, [load]);

  const save = async (event, customer) => {
    event.preventDefault();

    if (
      pending.current ||
      loading ||
      loginRequired
    ) {
      return;
    }

    const promoCode = normalizeCode(
      drafts[customer.id],
    );

    setError("");
    setMessage("");

    if (!/^[A-Z0-9_-]{4,30}$/.test(promoCode)) {
      setError(
        "Promo Code must contain 4–30 letters, numbers, underscores or hyphens.",
      );

      return;
    }

    const duplicate = customers.some(
      item =>
        String(item.id) !== String(customer.id) &&
        normalizeCode(
          item.promoCode || item.promo_code,
        ) === promoCode,
    );

    if (duplicate) {
      setError(
        "This Promo Code is already assigned to another customer.",
      );

      return;
    }

    pending.current = true;
    setSavingId(customer.id);

    try {
      const data = await api(
        `/api/admin/customers/${customer.id}/promo-code`,
        "PUT",
        { promoCode },
      );

      if (!alive.current) return;

      const savedCode =
        data.customer?.promoCode || promoCode;

      setCustomers(current =>
        current.map(item =>
          String(item.id) === String(customer.id)
            ? {
                ...item,
                ...data.customer,
                promoCode: savedCode,
              }
            : item,
        ),
      );

      setDrafts(current => ({
        ...current,
        [customer.id]: savedCode,
      }));

      setMessage(
        `Promo Code saved for ${
          customer.loginId ||
          customer.login_id ||
          customer.name
        }.`,
      );
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
        setSavingId(null);
      }
    }
  };

  const query = search.trim().toLowerCase();

  const filtered = customers.filter(customer =>
    [
      customer.name,
      customer.loginId || customer.login_id,
      customer.promoCode || customer.promo_code,
    ].some(value =>
      String(value || "")
        .toLowerCase()
        .includes(query),
    ),
  );

  const busy = savingId !== null;

  return (
    <main className="min-h-screen bg-[#061c1a] text-white">
      <header className="bg-[#9a5a00] p-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <h1 className="text-lg font-black">
            CUSTOMER PROMO CODES
          </h1>

          <p className="text-xs text-amber-100">
            Admin: {admin?.username}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onBack}
            className="rounded-lg border border-amber-400/40 px-4 py-2 text-xs text-amber-200 disabled:opacity-40"
          >
            ‹ ADMIN HOME
          </button>

          <button
            type="button"
            disabled={busy || loading}
            onClick={load}
            className="text-xs text-cyan-200 underline disabled:opacity-40"
          >
            {loading ? "LOADING…" : "REFRESH"}
          </button>
        </div>

        <p className="rounded-xl border border-cyan-300/20 bg-cyan-300/5 p-4 text-xs leading-6 text-cyan-100">
          Assign a unique Promo Code to each customer.
          Use 4–30 letters, numbers, underscores or
          hyphens. Codes are saved in uppercase.
        </p>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200"
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
            className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100"
          >
            {message}
          </p>
        )}

        <input
          type="search"
          aria-label="Search customers"
          placeholder="Search name, Login ID or Promo Code"
          value={search}
          onChange={event =>
            setSearch(event.target.value)
          }
          className="w-full rounded-xl border border-[#39756f] bg-[#062f2b] p-3 text-sm text-white outline-none focus:border-cyan-400"
        />

        <p className="text-xs text-slate-400">
          {loading
            ? "Loading customers…"
            : `${filtered.length} customers`}
        </p>

        {!loading && !filtered.length && (
          <p className="rounded-xl border border-white/10 p-4 text-sm text-slate-400">
            No customers found.
          </p>
        )}

        {filtered.map(customer => (
          <form
            key={customer.id}
            onSubmit={event =>
              save(event, customer)
            }
            className="space-y-3 rounded-xl border border-[#28655f] bg-[#083d37] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-black">
                  {customer.name}
                </h2>

                <p className="mt-1 text-xs text-amber-200">
                  {customer.loginId ||
                    customer.login_id}
                </p>
              </div>

              <span className="text-[10px] text-slate-400">
                #{customer.id}
              </span>
            </div>

            <label className="block text-xs text-slate-300">
              Promo Code

              <input
                required
                minLength={4}
                maxLength={30}
                pattern="[A-Za-z0-9_-]{4,30}"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                disabled={
                  busy || loading || loginRequired
                }
                value={drafts[customer.id] || ""}
                onChange={event =>
                  setDrafts(current => ({
                    ...current,
                    [customer.id]:
                      event.target.value.toUpperCase(),
                  }))
                }
                className="mt-2 w-full rounded-lg border border-[#39756f] bg-[#062f2b] p-3 text-sm text-white outline-none focus:border-cyan-400 disabled:opacity-40"
              />
            </label>

            <button
              type="submit"
              disabled={
                busy || loading || loginRequired
              }
              className="w-full rounded-lg bg-amber-400 p-3 text-xs font-black text-black disabled:opacity-40"
            >
              {savingId === customer.id
                ? "SAVING…"
                : "SAVE PROMO CODE"}
            </button>
          </form>
        ))}
      </div>
    </main>
  );
}
