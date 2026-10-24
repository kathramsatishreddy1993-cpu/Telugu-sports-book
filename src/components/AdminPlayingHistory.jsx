import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

const GAMES = [
  ["AVIATOR", "Aviator"],
  ["ROULETTE", "Roulette"],
  ["SUPER_OVER", "Super Over"],
  ["COLOR_PREDICTION", "Color Prediction"],
  ["DRAGON_TIGER", "Dragon Tiger"],
  ["ANDAR_BAHAR", "Andar Bahar"],
  ["LUCKY_SEVEN", "Lucky Seven"],
  ["DEAL_OR_NO_DEAL", "Deal or No Deal"],
  ["SPORTS_API", "Sports API"],
];

const money = value =>
  value == null
    ? ""
    : Number(value).toLocaleString("en-IN");

const time = value =>
  value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }) + " IST"
    : "Unavailable (legacy)";

const newKey = () =>
  globalThis.crypto?.randomUUID?.() ||
  `history-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;

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
          ? {
              "Content-Type": "application/json",
            }
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

const inputClass =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900";

const buttonClass =
  "rounded-lg bg-[#791b3e] px-4 py-2 text-sm font-bold text-white disabled:opacity-40";

function PasswordChange({ onDone, onLogout }) {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async event => {
    event.preventDefault();

    if (busy) return;

    setBusy(true);
    setError("");

    try {
      const data = await request("/change-password", {
        method: "POST",
        body: JSON.stringify(form),
      });

      onDone(data.admin);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 p-5 text-slate-900">
      <form
        onSubmit={submit}
        className="mx-auto max-w-md space-y-4 rounded-2xl bg-white p-6 shadow"
      >
        <h1 className="text-xl font-black">
          Change Temporary Admin Password
        </h1>

        <p className="text-sm">
          Use a new password with at least 12 characters
          and at most 72 UTF-8 bytes.
        </p>

        {Object.keys(form).map(name => (
          <label
            key={name}
            className="block text-sm"
          >
            {name === "currentPassword"
              ? "Current password"
              : name === "newPassword"
                ? "New password"
                : "Confirm new password"}

            <input
              className={`${inputClass} mt-1 w-full`}
              type="password"
              autoComplete={
                name === "currentPassword"
                  ? "current-password"
                  : "new-password"
              }
              required
              value={form[name]}
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

        {error && (
          <p role="alert" className="text-red-700">
            {error}
          </p>
        )}

        <button
          className={buttonClass}
          disabled={busy}
        >
          {busy ? "SAVING…" : "SAVE PASSWORD"}
        </button>

        <button
          className="ml-4 underline"
          type="button"
          disabled={busy}
          onClick={onLogout}
        >
          Logout
        </button>
      </form>
    </main>
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
        "New Admin created. They sign in at /admin and change their temporary password.",
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

function Settlement({
  bet,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState({
    outcome: "",
    reason: "",
    evidence: "",
    confirmed: false,
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const frozen = useRef(null);
  const requestKey = useRef(newKey());
  const pending = useRef(false);

  const expected =
    form.outcome === "VOID"
      ? bet.stake
      : form.outcome === "WON"
        ? Math.round(
            bet.stake *
              Number(bet.extra?.payoutRate),
          )
        : form.outcome === "LOST"
          ? 0
          : null;

  const submit = async event => {
    event.preventDefault();

    if (pending.current) return;

    if (!form.confirmed || !form.outcome) {
      setError(
        "Choose and confirm the verified result.",
      );
      return;
    }

    const payload =
      frozen.current || {
        ...form,
        version: bet.version,
        requestKey: requestKey.current,
      };

    frozen.current = payload;
    pending.current = true;

    setBusy(true);
    setError("");

    try {
      await request(`/${bet.betNo}/settle`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      onSaved();
    } catch (failure) {
      setError(failure.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  const locked =
    busy || Boolean(frozen.current);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/60 p-3">
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-label="Sports manual settlement"
        className="max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-2xl bg-white p-5 text-slate-900"
      >
        <h2 className="text-xl font-black">
          Sports Manual Settlement · #{bet.betNo}
        </h2>

        <p className="text-sm">
          {bet.loginId} · {bet.matchName}
          <br />
          {bet.selection}
          <br />
          Held: {money(bet.held)} demo coins ·
          Rate: {bet.rate}
        </p>

        <label className="block text-sm font-bold">
          Verified result

          <select
            required
            className={`${inputClass} mt-1 w-full`}
            disabled={locked}
            value={form.outcome}
            onChange={event =>
              setForm({
                ...form,
                outcome: event.target.value,
              })
            }
          >
            <option value="">Choose result</option>
            <option value="WON">WIN</option>
            <option value="LOST">LOSS</option>
            <option value="VOID">
              VOID — Return stake
            </option>
          </select>
        </label>

        <label className="block text-sm font-bold">
          Reason

          <textarea
            required
            minLength={5}
            maxLength={1000}
            className={`${inputClass} mt-1 w-full`}
            disabled={locked}
            value={form.reason}
            onChange={event =>
              setForm({
                ...form,
                reason: event.target.value,
              })
            }
          />
        </label>

        <label className="block text-sm font-bold">
          Verified result reference / evidence

          <textarea
            required
            minLength={5}
            maxLength={2000}
            className={`${inputClass} mt-1 w-full`}
            disabled={locked}
            value={form.evidence}
            onChange={event =>
              setForm({
                ...form,
                evidence: event.target.value,
              })
            }
          />
        </label>

        <p className="rounded bg-amber-50 p-3 text-sm">
          Payout including returned stake:{" "}
          <strong>{money(expected)}</strong> demo coins.
          {" "}
          Net profit / loss:{" "}
          <strong>
            {expected == null
              ? ""
              : money(expected - bet.held)}
          </strong>
          . This settles the bet and credits any
          return once.
        </p>

        <label className="flex gap-2 text-sm">
          <input
            type="checkbox"
            required
            disabled={locked}
            checked={form.confirmed}
            onChange={event =>
              setForm({
                ...form,
                confirmed: event.target.checked,
              })
            }
          />
          I verified this market result and the
          payout above.
        </label>

        {error && (
          <p
            role="alert"
            className="text-sm text-red-700"
          >
            {error}
            {frozen.current
              ? " Retry uses the same request to prevent a second credit."
              : ""}
          </p>
        )}

        <div className="flex gap-3">
          <button
            className={buttonClass}
            disabled={busy}
          >
            {busy
              ? "SETTLING…"
              : frozen.current
                ? "RETRY SAME SETTLEMENT"
                : "CONFIRM SETTLEMENT"}
          </button>

          <button
            type="button"
            disabled={busy}
            className="underline"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AdminPlayingHistory({
  admin,
  onBack,
  onLogout,
}) {
  const [identity, setIdentity] = useState(null);
  const [game, setGame] = useState("ALL");
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [result, setResult] = useState("ALL");

  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [next, setNext] = useState(null);
  const [pages, setPages] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accounts, setAccounts] = useState(false);
  const [selected, setSelected] = useState(null);
  const [changes, setChanges] = useState(null);

  const alive = useRef(true);
  const inflight = useRef(null);
  const generation = useRef(0);

  useEffect(() => {
    alive.current = true;

    return () => {
      alive.current = false;
      generation.current += 1;
    };
  }, []);

  useEffect(() => {
    let active = true;

    request("/me")
      .then(data => {
        if (active) {
          setIdentity(data.admin);
        }
      })
      .catch(failure => {
        if (active) {
          setError(failure.message);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    const current = generation.current;

    if (inflight.current === current) {
      return;
    }

    inflight.current = current;

    const params = new URLSearchParams({
      game,
      search,
      date,
      result,

      ...(cursor
        ? { before: cursor }
        : {}),
    });

    try {
      const data = await request(`?${params}`);

      if (
        alive.current &&
        current === generation.current
      ) {
        setItems(data.items);
        setNext(data.nextBefore);
        setIdentity(data.admin);
        setError("");
      }
    } catch (failure) {
      if (
        alive.current &&
        current === generation.current
      ) {
        setError(failure.message);

        if (
          [401, 403].includes(failure.status)
        ) {
          setItems([]);
          setSelected(null);
        }
      }
    } finally {
      if (inflight.current === current) {
        inflight.current = null;
      }

      if (
        alive.current &&
        current === generation.current
      ) {
        setLoading(false);
      }
    }
  }, [
    game,
    search,
    date,
    result,
    cursor,
  ]);

  const hasIdentity = Boolean(identity);
  const mustChangePassword =
    identity?.mustChangePassword;

  useEffect(() => {
    if (
      !hasIdentity ||
      mustChangePassword
    ) {
      return;
    }

    let active = true;
    let stream;

    generation.current += 1;

    setLoading(true);
    setItems([]);

    void refresh();

    if (
      typeof EventSource !== "undefined"
    ) {
      stream = new EventSource(
        "/api/playing-history/stream",
      );

      stream.onmessage = () => {
        if (active) {
          void refresh();
        }
      };

      stream.onerror = () => {
        if (active) {
          void refresh();
        }
      };
    }

    const timer = setInterval(() => {
      if (active) {
        void refresh();
      }
    }, 2000);

    const focus = () => {
      void refresh();
    };

    window.addEventListener("focus", focus);

    return () => {
      active = false;
      generation.current += 1;

      clearInterval(timer);
      stream?.close();

      window.removeEventListener(
        "focus",
        focus,
      );
    };
  }, [
    refresh,
    mustChangePassword,
    hasIdentity,
  ]);

  const filter = (setter, value) => {
    generation.current += 1;

    setter(value);
    setCursor(null);
    setPages([]);
    setNext(null);
  };

  const inspect = async bet => {
    try {
      const data = await request(
        `/${bet.betNo}/changes`,
      );

      setChanges({
        betNo: bet.betNo,
        ...data,
      });
    } catch (failure) {
      setError(failure.message);
    }
  };

  if (identity?.mustChangePassword) {
    return (
      <PasswordChange
        onDone={setIdentity}
        onLogout={onLogout}
      />
    );
  }

  const canManage =
    identity?.permissions
      ?.manageHistoryAdmins === true;

  void admin;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-[#063f39] px-4 py-4 text-white">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
          <p className="font-black">
            <span className="text-amber-300">
              TSB
            </span>{" "}
            · TELUGU SPORTS BOOK
          </p>

          <div className="flex items-center gap-3">
            <span className="text-sm">
              {identity?.name || "Admin"}
            </span>

            {onBack && (
              <button
                type="button"
                className="rounded border border-white/30 px-3 py-2 text-xs font-bold"
                onClick={onBack}
              >
                ← ADMIN DASHBOARD
              </button>
            )}

            <button
              type="button"
              className="rounded border border-white/30 px-3 py-2 text-xs font-bold"
              onClick={onLogout}
            >
              LOGOUT
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] p-3 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black sm:text-3xl">
              Customer Playing History
            </h1>

            <p className="mt-1 text-sm text-slate-600">
              Demo coins · All times IST ·
              Win / Loss stays blank until final
              settlement.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              className={buttonClass}
              onClick={() =>
                filter(setGame, "ALL")
              }
            >
              ALL GAMES
            </button>

            {canManage && (
              <button
                type="button"
                className={buttonClass}
                onClick={() =>
                  setAccounts(value => !value)
                }
              >
                NEW ADMIN ACCOUNTS
              </button>
            )}
          </div>
        </div>

        {accounts && canManage && (
          <AdminAccounts />
        )}

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {GAMES.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() =>
                filter(setGame, id)
              }
              className={`rounded-lg border px-3 py-3 text-sm font-black ${
                game === id
                  ? "border-teal-600 bg-[#08b7bc] text-black"
                  : "border-rose-200 bg-white text-[#791b3e]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-3">
          <label className="text-xs font-bold">
            Customer / Bet No.

            <input
              className={`${inputClass} ml-2`}
              value={search}
              placeholder="Name, ID or number"
              onChange={event =>
                filter(
                  setSearch,
                  event.target.value,
                )
              }
            />
          </label>

          <label className="text-xs font-bold">
            Date (IST)

            <input
              type="date"
              className={`${inputClass} ml-2`}
              value={date}
              onChange={event =>
                filter(
                  setDate,
                  event.target.value,
                )
              }
            />
          </label>

          <label className="text-xs font-bold">
            Result

            <select
              className={`${inputClass} ml-2`}
              value={result}
              onChange={event =>
                filter(
                  setResult,
                  event.target.value,
                )
              }
            >
              {[
                "ALL",
                "WAITING",
                "WIN",
                "LOSS",
                "REFUND",
                "VOID",
              ].map(value => (
                <option key={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className={buttonClass}
            onClick={() => void refresh()}
          >
            REFRESH
          </button>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-3 rounded bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        {loading && (
          <p
            role="status"
            className="p-4 text-sm"
          >
            Loading history…
          </p>
        )}

        {!loading &&
          items.length === 0 &&
          !error && (
            <p className="mt-4 rounded-xl bg-white p-6 text-sm">
              No bets match these filters.
            </p>
          )}

        {GAMES.filter(
          ([id]) =>
            game === "ALL" || id === game,
        ).map(([id, label]) => {
          const rows = items.filter(
            item => item.game === id,
          );

          if (!rows.length) return null;

          return (
            <section
              key={id}
              className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white"
            >
              <h2 className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-lg font-black text-[#791b3e]">
                {label.toUpperCase()}
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] border-collapse text-left text-xs">
                  <thead className="bg-slate-100">
                    <tr>
                      {[
                        "Bet No.",
                        "Customer",
                        "Match / Round",
                        "Selection",
                        "Coins / Held",
                        "Rate",
                        "Date / Time (IST)",
                        "Win / Loss",
                        "Payout",
                        "Net P/L",
                        "Actions",
                      ].map(title => (
                        <th
                          key={title}
                          className="border-b border-r border-slate-200 px-3 py-3"
                        >
                          {title}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map(bet => (
                      <tr
                        key={bet.betNo}
                        className="border-b border-slate-100"
                      >
                        <td className="px-3 py-3 font-bold">
                          {bet.betNo}
                        </td>

                        <td className="px-3 py-3">
                          {bet.loginId}

                          <span className="block text-slate-500">
                            {bet.customerName}
                          </span>
                        </td>

                        <td className="max-w-[220px] px-3 py-3">
                          {bet.matchName}
                        </td>

                        <td className="max-w-[240px] break-words px-3 py-3">
                          {bet.selection}
                        </td>

                        <td className="px-3 py-3">
                          {money(bet.stake)}

                          <span className="block text-slate-500">
                            Held: {money(bet.held)}
                          </span>
                        </td>

                        <td className="px-3 py-3">
                          {bet.rate}
                        </td>

                        <td className="whitespace-nowrap px-3 py-3">
                          {time(bet.createdAt)}
                        </td>

                        <td className="px-3 py-3">
                          <div
                            className={`min-h-[28px] min-w-[80px] rounded border px-2 py-1 text-center font-black ${
                              bet.result === "WIN"
                                ? "border-green-200 bg-green-100 text-green-800"
                                : bet.result === "LOSS"
                                  ? "border-red-200 bg-red-100 text-red-700"
                                  : "border-slate-200 text-slate-700"
                            }`}
                            aria-label={
                              bet.result ||
                              "Result awaiting settlement"
                            }
                          >
                            {bet.result || ""}
                          </div>

                          {!bet.result && (
                            <span className="mt-1 block text-[10px] text-slate-500">
                              Waiting for settlement
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-3">
                          {money(bet.payout)}
                        </td>

                        <td
                          className={`px-3 py-3 font-bold ${
                            bet.profitLoss > 0
                              ? "text-green-700"
                              : bet.profitLoss < 0
                                ? "text-red-700"
                                : ""
                          }`}
                        >
                          {money(bet.profitLoss)}
                        </td>

                        <td className="px-3 py-3">
                          <div className="flex flex-col gap-2">
                            {bet.canSettle && (
                              <button
                                type="button"
                                className="rounded bg-[#791b3e] px-2 py-2 font-bold text-white"
                                onClick={() =>
                                  setSelected(bet)
                                }
                              >
                                MANUAL SETTLEMENT
                              </button>
                            )}

                            <button
                              type="button"
                              className="underline"
                              onClick={() =>
                                void inspect(bet)
                              }
                            >
                              Audit / changes
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            className={buttonClass}
            disabled={!pages.length || loading}
            onClick={() => {
              generation.current += 1;

              const history = [...pages];

              setCursor(
                history.pop() || null,
              );

              setPages(history);
            }}
          >
            ← NEWER
          </button>

          <p className="text-xs text-slate-500">
            Global bet numbers start at 1000.
            Newest 100 matching bets per page.
          </p>

          <button
            type="button"
            className={buttonClass}
            disabled={!next || loading}
            onClick={() => {
              generation.current += 1;

              setPages(previous => [
                ...previous,
                cursor,
              ]);

              setCursor(next);
            }}
          >
            OLDER →
          </button>
        </div>
      </div>

      {selected && (
        <Settlement
          bet={selected}
          onClose={() =>
            setSelected(null)
          }
          onSaved={() => {
            setSelected(null);
            void refresh();
          }}
        />
      )}

      {changes && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-3">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Bet audit"
            className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-5"
          >
            <div className="flex justify-between gap-3">
              <h2 className="font-black">
                Audit · Bet #{changes.betNo}
              </h2>

              <button
                type="button"
                className="underline"
                onClick={() =>
                  setChanges(null)
                }
              >
                Close
              </button>
            </div>

            <pre className="mt-4 whitespace-pre-wrap break-words text-xs">
              {JSON.stringify(changes, null, 2)}
            </pre>
          </section>
        </div>
      )}
    </main>
  );
}
