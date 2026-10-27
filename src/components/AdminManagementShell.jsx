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
    controllerPath:
      "/game-control/roulette",
  },
];

const inputClass =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900";

const buttonClass =
  "rounded-lg bg-[#791b3e] px-4 py-2 text-sm font-bold text-white disabled:opacity-40";

async function jsonRequest(
  url,
  options = {},
) {
  const response = await fetch(url, {
    credentials: "same-origin",
    cache: "no-store",
    ...options,

    headers: {
      Accept: "application/json",

      ...(options.body
        ? {
            "Content-Type":
              "application/json",
          }
        : {}),

      ...options.headers,
    },
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
          "Request failed.",
      ),
      {
        status:
          response.status,
      },
    );
  }

  return data;
}

const request = (
  path,
  options = {},
) =>
  jsonRequest(
    `/api/playing-history${path}`,
    options,
  );

const amountText = value =>
  value == null ||
  !Number.isFinite(
    Number(value),
  )
    ? "—"
    : Number(value).toLocaleString(
        "en-IN",
        {
          maximumFractionDigits: 2,
        },
      );

const dateText = value => {
  if (!value) return "—";

  const date =
    new Date(value);

  return Number.isFinite(
    date.getTime(),
  )
    ? date.toLocaleString(
        "en-IN",
        {
          timeZone:
            "Asia/Kolkata",
        },
      ) + " IST"
    : "—";
};

function LinkBox({
  label,
  path,
}) {
  const inputRef =
    useRef(null);

  const [message, setMessage] =
    useState("");

  const url =
    new URL(
      path,
      window.location.origin,
    ).href;

  const copy = async () => {
    setMessage("");

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
        .writeText(url);

      setMessage(
        "Link copied",
      );
    } catch {
      const input =
        inputRef.current;

      if (!input) {
        setMessage(
          "Select the link and copy it.",
        );

        return;
      }

      input.focus();
      input.select();

      input.setSelectionRange(
        0,
        url.length,
      );

      try {
        setMessage(
          document.execCommand(
            "copy",
          )
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
          onFocus={event =>
            event.target.select()
          }
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

function ControllerAccountCards({
  onOpen,
}) {
  return (
    <section className="mt-5 rounded-xl border border-teal-700 bg-[#061c1a] p-4 text-white">
      <h2 className="font-black text-amber-200">
        AVIATOR &amp; ROULETTE
        CONTROLLER ACCOUNTS
      </h2>

      <p className="mt-2 text-xs leading-6 text-cyan-100">
        Create new IDs · Block / Unblock
        old IDs · Remove IDs · Reset
        passwords
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {CONTROLLER_GAMES.map(game => (
          <article
            key={game.id}
            className="min-w-0 overflow-hidden rounded-xl border border-teal-700 bg-[#083d37]"
          >
            <div className="p-4">
              <h3 className="font-black text-amber-200">
                {game.icon} {game.name}
              </h3>

              <button
                type="button"
                onClick={() =>
                  onOpen(game.id)
                }
                className="mt-4 w-full rounded-lg bg-amber-400 px-3 py-3 text-xs font-black text-black"
              >
                CREATE / MANAGE{" "}
                {game.name} IDs ›
              </button>
            </div>

            <div className="border-t border-teal-700 p-3">
              <LinkBox
                label={`${game.name} Controller Login Link`}
                path={
                  game.controllerPath
                }
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function AdminAccounts() {
  const [accounts, setAccounts] =
    useState([]);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [busy, setBusy] =
    useState(false);

  const [form, setForm] =
    useState({
      name: "",
      loginId: "",
      temporaryPassword: "",
      canSettle: false,
    });

  const pending =
    useRef(false);

  const load =
    useCallback(async () => {
      try {
        const data =
          await request(
            "/admins",
          );

        if (
          !Array.isArray(
            data.accounts,
          )
        ) {
          throw new Error(
            "Invalid Admin account list response.",
          );
        }

        setAccounts(
          data.accounts,
        );

        setError("");
      } catch (failure) {
        setError(
          failure.message,
        );
      }
    }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create =
    async event => {
      event.preventDefault();

      if (
        pending.current
      ) {
        return;
      }

      pending.current = true;

      setBusy(true);
      setError("");
      setMessage("");

      try {
        await request(
          "/admins",
          {
            method: "POST",
            body:
              JSON.stringify(
                form,
              ),
          },
        );

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
        setError(
          failure.message,
        );
      } finally {
        pending.current =
          false;

        setBusy(false);
      }
    };

  const update = async (
    account,
    changes,
  ) => {
    if (
      pending.current
    ) {
      return;
    }

    pending.current = true;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      await request(
        `/admins/${account.id}`,
        {
          method: "PATCH",

          body:
            JSON.stringify({
              active:
                account.active,
              canView:
                account.canView,
              canSettle:
                account.canSettle,
              version:
                account.version,
              ...changes,
            }),
        },
      );

      setMessage(
        "Account saved. Previous sessions revoked; the New Admin must log in again.",
      );

      await load();
    } catch (failure) {
      setError(
        failure.message,
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  return (
    <section className="mt-5 rounded-xl border border-teal-200 bg-white p-4">
      <h2 className="font-black text-[#063f39]">
        NEW ADMIN ACCOUNTS
      </h2>

      <p className="mt-1 text-xs text-slate-600">
        These accounts access Playing
        History only. Aviator and Roulette
        Controller IDs are managed below.
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
                name ===
                "temporaryPassword"
                  ? "password"
                  : "text"
              }
              minLength={
                name ===
                "temporaryPassword"
                  ? 12
                  : undefined
              }
              required
              value={form[name]}
              autoComplete={
                name ===
                "temporaryPassword"
                  ? "new-password"
                  : "off"
              }
              disabled={busy}
              onChange={event =>
                setForm({
                  ...form,
                  [name]:
                    event.target.value,
                })
              }
            />
          </label>
        ))}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={
              form.canSettle
            }
            disabled={busy}
            onChange={event =>
              setForm({
                ...form,
                canSettle:
                  event.target.checked,
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
            <p className="break-words font-bold">
              {account.name} ·{" "}
              {account.loginId}
            </p>

            <p className="mt-1 text-xs">
              {account.active
                ? "ACTIVE"
                : "BLOCKED"}
              {" · "}
              History:{" "}
              {account.canView
                ? "YES"
                : "NO"}
              {" · "}
              Sports settlement:{" "}
              {account.canSettle
                ? "YES"
                : "NO"}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className={buttonClass}
                disabled={busy}
                onClick={() =>
                  update(
                    account,
                    {
                      active:
                        !account.active,
                    },
                  )
                }
              >
                {account.active
                  ? "BLOCK"
                  : "ACTIVATE"}
              </button>

              <button
                type="button"
                className={buttonClass}
                disabled={busy}
                onClick={() =>
                  update(
                    account,
                    {
                      canView:
                        !account.canView,
                      canSettle:
                        account.canView
                          ? false
                          : account.canSettle,
                    },
                  )
                }
              >
                {account.canView
                  ? "REMOVE HISTORY ACCESS"
                  : "ALLOW HISTORY"}
              </button>

              <button
                type="button"
                className={buttonClass}
                disabled={
                  busy ||
                  !account.canView
                }
                onClick={() =>
                  update(
                    account,
                    {
                      canSettle:
                        !account.canSettle,
                    },
                  )
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
                  const password =
                    window.prompt(
                      `New temporary password for ${account.loginId} (12+ characters):`,
                    );

                  if (password) {
                    void update(
                      account,
                      {
                        temporaryPassword:
                          password,
                      },
                    );
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

function AdminSportsSettlement({
  onBack,
  onLogout,
}) {
  const [bets, setBets] =
    useState([]);

  const [status, setStatus] =
    useState("MATCHED");

  const [
    customerInput,
    setCustomerInput,
  ] = useState("");

  const [
    customerId,
    setCustomerId,
  ] = useState("");

  const [loading, setLoading] =
    useState(false);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [
    selection,
    setSelection,
  ] = useState(null);

  const [note, setNote] =
    useState("");

  const mounted =
    useRef(false);

  const busyRef =
    useRef(false);

  const selectedRef =
    useRef(null);

  const listRequest =
    useRef(null);

  const listVersion =
    useRef(0);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
      listVersion.current++;

      listRequest.current
        ?.abort();
    };
  }, []);

  const load =
    useCallback(async () => {
      if (
        busyRef.current ||
        selectedRef.current ||
        !mounted.current
      ) {
        return;
      }

      listRequest.current
        ?.abort();

      const controller =
        new AbortController();

      listRequest.current =
        controller;

      const version =
        ++listVersion.current;

      setLoading(true);

      try {
        const params =
          new URLSearchParams();

        if (status) {
          params.set(
            "status",
            status,
          );
        }

        if (customerId) {
          params.set(
            "customerId",
            customerId,
          );
        }

        const data =
          await jsonRequest(
            `/api/admin/demo-bets?${params}`,
            {
              signal:
                controller.signal,
            },
          );

        if (
          !Array.isArray(
            data.bets,
          )
        ) {
          throw new Error(
            "Invalid bet list response. Check server deployment.",
          );
        }

        if (
          mounted.current &&
          version ===
            listVersion.current
        ) {
          setBets(data.bets);
          setError("");
        }
      } catch (failure) {
        if (
          mounted.current &&
          version ===
            listVersion.current &&
          failure.name !==
            "AbortError"
        ) {
          setBets([]);
          setError(
            failure.message,
          );
        }
      } finally {
        if (
          mounted.current &&
          version ===
            listVersion.current
        ) {
          setLoading(false);
        }
      }
    }, [
      status,
      customerId,
    ]);

  useEffect(() => {
    void load();
  }, [load]);

  const choose = (
    bet,
    outcome,
  ) => {
    if (
      busyRef.current ||
      bet.status !== "MATCHED" ||
      bet.result !== "PENDING"
    ) {
      return;
    }

    listVersion.current++;

    listRequest.current
      ?.abort();

    const next = {
      bet,
      outcome,
    };

    selectedRef.current = next;

    setSelection(next);
    setNote("");
    setError("");
    setMessage("");
    setLoading(false);
  };

  const close = () => {
    if (
      busyRef.current
    ) {
      return;
    }

    selectedRef.current = null;

    setSelection(null);
    setNote("");
    setError("");

    void load();
  };

  const settle =
    async event => {
      event.preventDefault();

      const chosen =
        selectedRef.current;

      if (
        busyRef.current ||
        !chosen ||
        !note.trim()
      ) {
        return;
      }

      busyRef.current = true;

      setBusy(true);
      setError("");

      try {
        const data =
          await jsonRequest(
            `/api/admin/demo-bets/${encodeURIComponent(chosen.bet.id)}/settle`,
            {
              method: "POST",

              body:
                JSON.stringify({
                  outcome:
                    chosen.outcome,
                  note:
                    note.trim(),
                }),
            },
          );

        if (
          !data.success ||
          !data.bet
        ) {
          throw new Error(
            "Unable to confirm settlement. Refresh the list before retrying.",
          );
        }

        if (mounted.current) {
          selectedRef.current =
            null;

          setSelection(null);
          setNote("");

          setMessage(
            `Bet #${chosen.bet.id} ${
              data.alreadySettled
                ? "was already settled"
                : "settled"
            }: ${data.bet.result}. Customer balance: ${amountText(data.balance)} demo coins.`,
          );

          window.dispatchEvent(
            new Event(
              "demo-balance-updated",
            ),
          );

          window.dispatchEvent(
            new Event(
              "demo-bets-updated",
            ),
          );
        }
      } catch (failure) {
        if (
          mounted.current
        ) {
          setError(
            failure.message,
          );
        }
      } finally {
        busyRef.current = false;

        if (
          mounted.current
        ) {
          setBusy(false);

          if (
            !selectedRef.current
          ) {
            void load();
          }
        }
      }
    };

  const pending =
    selection?.bet;

  const returnAmount =
    pending &&
    selection.outcome === "WON"
      ? Math.round(
          Number(
            pending.stake,
          ) *
          Number(
            pending.payoutRate,
          ),
        )
      : 0;

  return (
    <main className="min-h-screen bg-slate-100 p-3 text-slate-900 sm:p-5">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#08b7bc] p-4 text-white">
          <h1 className="text-lg font-black">
            SPORTS BET SETTLEMENT
          </h1>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onBack}
              className="rounded-lg border border-white/60 px-3 py-2 text-xs font-bold disabled:opacity-40"
            >
              ← ADMIN DASHBOARD
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={onLogout}
              className="rounded-lg border border-white/60 px-3 py-2 text-xs font-bold disabled:opacity-40"
            >
              LOGOUT
            </button>
          </div>
        </header>

        <p className="mt-4 text-xs leading-6 text-slate-600">
          Administrator-managed demo
          balances. WON / LOST describes
          the result of this individual
          bet. For LAY or NO, stake is
          the held liability. A winning
          return includes the held stake;
          a loss does not deduct the held
          stake a second time.
        </p>

        <form
          className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border bg-white p-3"
          onSubmit={event => {
            event.preventDefault();

            if (
              busyRef.current ||
              selectedRef.current
            ) {
              return;
            }

            const value =
              customerInput.trim();

            if (
              value &&
              (
                !/^[1-9]\d{0,9}$/.test(
                  value,
                ) ||
                Number(value) >
                  2147483647
              )
            ) {
              setError(
                "Enter a valid customer ID.",
              );

              return;
            }

            if (
              value === customerId
            ) {
              void load();
            } else {
              setCustomerId(value);
            }
          }}
        >
          <label className="text-xs font-bold">
            Status

            <select
              value={status}
              disabled={
                busy ||
                Boolean(selection)
              }
              onChange={event =>
                setStatus(
                  event.target.value,
                )
              }
              className={`${inputClass} mt-1 block w-full`}
            >
              <option value="MATCHED">
                MATCHED / PENDING
              </option>

              <option value="SETTLED">
                SETTLED
              </option>

              <option value="UNMATCHED">
                UNMATCHED
              </option>

              <option value="">
                ALL
              </option>
            </select>
          </label>

          <label className="min-w-0 text-xs font-bold">
            Customer ID (optional)

            <input
              value={customerInput}
              disabled={
                busy ||
                Boolean(selection)
              }
              onChange={event =>
                setCustomerInput(
                  event.target.value,
                )
              }
              inputMode="numeric"
              placeholder="All customers"
              className={`${inputClass} mt-1 block w-full`}
            />
          </label>

          <button
            type="submit"
            disabled={
              busy ||
              loading ||
              Boolean(selection)
            }
            className={buttonClass}
          >
            APPLY / REFRESH
          </button>
        </form>

        {message && (
          <p
            role="status"
            className="mt-3 rounded-lg border border-teal-300 bg-white p-3 text-sm text-teal-800"
          >
            {message}
          </p>
        )}

        {error &&
          !selection && (
            <p
              role="alert"
              className="mt-3 rounded-lg border border-rose-300 bg-white p-3 text-sm text-rose-800"
            >
              {error}
            </p>
          )}

        <p
          role="status"
          className="my-3 text-xs text-slate-600"
        >
          {loading
            ? "Loading bets…"
            : `${bets.length} bets shown · latest 200 per filter. Refresh for updates.`}
        </p>

        <div className="space-y-3">
          {!loading &&
            !error &&
            !bets.length && (
              <p className="rounded-xl border bg-white p-6 text-center text-sm">
                No bets found for these filters.
              </p>
            )}

          {bets.map(bet => (
            <article
              key={bet.id}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white"
            >
              <div className="flex flex-wrap items-start justify-between gap-2 bg-[#791b3e] p-3 text-white">
                <div>
                  <p className="text-sm font-black">
                    Bet #{bet.id} ·{" "}
                    {bet.customerName ||
                      "Customer"}
                  </p>

                  <p className="mt-1 text-[11px]">
                    {bet.loginId}
                    {" · "}
                    Customer ID:{" "}
                    {bet.customerId}
                  </p>
                </div>

                <span className="rounded-full border border-white/40 px-2 py-1 text-[10px] font-bold">
                  {bet.status} ·{" "}
                  {bet.result}
                </span>
              </div>

              <div className="p-3">
                <h2 className="break-words text-sm font-black">
                  {bet.matchName}
                </h2>

                <p className="mt-1 text-xs text-slate-600">
                  {bet.market}
                  {" · "}
                  {bet.selection}
                  {" · "}
                  {bet.type}
                </p>

                <dl className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                  <div>
                    <dt className="text-slate-500">
                      Odds / Line
                    </dt>

                    <dd className="mt-1 font-bold">
                      {bet.rate}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-500">
                      Stake / Risk (coins)
                    </dt>

                    <dd className="mt-1 font-bold">
                      {amountText(
                        bet.stake,
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-500">
                      Return credited (coins)
                    </dt>

                    <dd className="mt-1 font-bold">
                      {amountText(
                        bet.payout,
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-500">
                      Settled P/L (coins)
                    </dt>

                    <dd className="mt-1 font-bold">
                      {amountText(
                        bet.profitLoss,
                      )}
                    </dd>
                  </div>
                </dl>

                <p className="mt-3 text-[10px] text-slate-500">
                  Placed:{" "}
                  {dateText(
                    bet.createdAt,
                  )}
                </p>

                {bet.settledAt && (
                  <p className="mt-1 text-[10px] text-slate-500">
                    Settled:{" "}
                    {dateText(
                      bet.settledAt,
                    )}
                    {" · "}
                    Admin:{" "}
                    {bet.settledByAdmin ||
                      "Not recorded"}
                  </p>
                )}

                {bet.settlementNote && (
                  <p className="mt-2 break-words text-xs">
                    Note:{" "}
                    {bet.settlementNote}
                  </p>
                )}

                {bet.status ===
                  "MATCHED" &&
                  bet.result ===
                    "PENDING" && (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={
                          busy ||
                          loading ||
                          Boolean(
                            selection,
                          )
                        }
                        onClick={() =>
                          choose(
                            bet,
                            "WON",
                          )
                        }
                        className="rounded-lg bg-[#08b7bc] px-3 py-3 text-xs font-black text-white disabled:opacity-40"
                      >
                        BET WON
                      </button>

                      <button
                        type="button"
                        disabled={
                          busy ||
                          loading ||
                          Boolean(
                            selection,
                          )
                        }
                        onClick={() =>
                          choose(
                            bet,
                            "LOST",
                          )
                        }
                        className={
                          buttonClass
                        }
                      >
                        BET LOST
                      </button>
                    </div>
                  )}
              </div>
            </article>
          ))}
        </div>

        {selection && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3"
            onKeyDown={event => {
              if (
                event.key ===
                "Escape"
              ) {
                close();
              }
            }}
          >
            <form
              role="dialog"
              aria-modal="true"
              aria-labelledby="settlement-title"
              onSubmit={settle}
              className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5"
            >
              <h2
                id="settlement-title"
                className="text-lg font-black text-[#791b3e]"
              >
                CONFIRM BET{" "}
                {selection.outcome}
              </h2>

              <p className="mt-3 text-sm font-bold">
                #{pending.id}
                {" · "}
                {pending.customerName}
                {" · "}
                {pending.loginId}
              </p>

              <p className="mt-2 break-words text-sm">
                {pending.matchName}
              </p>

              <p className="mt-2 text-xs">
                {pending.market}
                {" · "}
                {pending.selection}
                {" · "}
                {pending.type}
              </p>

              <p className="mt-3 text-sm">
                Held stake / risk:{" "}
                {amountText(
                  pending.stake,
                )}{" "}
                demo coins
              </p>

              <p className="mt-2 text-sm font-bold">
                Return to credit:{" "}
                {amountText(
                  returnAmount,
                )}{" "}
                demo coins
              </p>

              <p className="mt-2 text-xs leading-5 text-slate-600">
                {selection.outcome ===
                "WON"
                  ? "This return includes the stake already held."
                  : "The held stake remains lost. No second debit will be made."}
                {" "}
                This action settles this bet.
                A different result cannot be
                applied afterward through
                this page.
              </p>

              <label className="mt-4 block text-xs font-bold">
                Settlement note

                <textarea
                  autoFocus
                  required
                  maxLength={500}
                  value={note}
                  disabled={busy}
                  onChange={event =>
                    setNote(
                      event.target.value,
                    )
                  }
                  placeholder="Reason / result reference"
                  className={`${inputClass} mt-2 min-h-[80px] w-full`}
                />
              </label>

              {error && (
                <p
                  role="alert"
                  className="mt-3 text-sm text-rose-800"
                >
                  {error}
                </p>
              )}

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={close}
                  className="rounded-lg border border-slate-300 px-3 py-3 text-sm font-bold disabled:opacity-40"
                >
                  CANCEL
                </button>

                <button
                  type="submit"
                  disabled={
                    busy ||
                    !note.trim()
                  }
                  className={
                    buttonClass
                  }
                >
                  {busy
                    ? "SETTLING…"
                    : `CONFIRM ${selection.outcome}`}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}

const VIEW_HASHES = {
  NEW_ADMIN_ACCOUNTS:
    "new-admin-accounts",
  PLAYING_HISTORY:
    "playing-history",
  SPORTS_SETTLEMENT:
    "sports-settlement",
  PROMO_CODES:
    "promo-codes",
  GAMES:
    "games",
  CONTROLLED_SO:
    "controlled-super-over",
  AVIATOR:
    "aviator-controllers",
  ROULETTE:
    "roulette-controllers",
};

function viewFromLocation() {
  const name =
    window.location.hash
      .slice(1);

  if (
    name ===
    "deal-or-no-deal-controllers"
  ) {
    return "NEW_ADMIN_ACCOUNTS";
  }

  return (
    Object.keys(
      VIEW_HASHES,
    ).find(
      view =>
        VIEW_HASHES[view] ===
        name,
    ) || "HOME"
  );
}

export default function AdminManagementShell({
  admin,
  onLogout,
}) {
  const [
    view,
    updateView,
  ] = useState(
    viewFromLocation,
  );

  const [
    identity,
    setIdentity,
  ] = useState(null);

  const [
    error,
    setError,
  ] = useState("");

  const setView = next => {
    updateView(next);

    const hash =
      VIEW_HASHES[next]
        ? `#${VIEW_HASHES[next]}`
        : "";

    window.history
      .replaceState(
        null,
        "",
        window.location.pathname +
          window.location.search +
          hash,
      );

    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const changed = () => {
      updateView(
        viewFromLocation(),
      );

      window.scrollTo(0, 0);
    };

    window.addEventListener(
      "hashchange",
      changed,
    );

    return () => {
      window.removeEventListener(
        "hashchange",
        changed,
      );
    };
  }, []);

  useEffect(() => {
    setIdentity(null);
    setError("");

    let active = true;

    const controller =
      new AbortController();

    jsonRequest(
      "/api/playing-history/me",
      {
        signal:
          controller.signal,
      },
    )
      .then(data => {
        if (!data.admin) {
          throw new Error(
            "Unable to verify Admin permissions.",
          );
        }

        if (active) {
          setIdentity(
            data.admin,
          );
        }
      })
      .catch(failure => {
        if (
          active &&
          failure.name !==
            "AbortError"
        ) {
          setError(
            failure.message,
          );
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
        <p role="alert">
          {error}
        </p>

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

  if (
    identity.historyOnly
  ) {
    return (
      <AdminPlayingHistory
        admin={identity}
        onLogout={onLogout}
      />
    );
  }

  if (
    view ===
    "SPORTS_SETTLEMENT"
  ) {
    return (
      <AdminSportsSettlement
        onBack={() =>
          setView("HOME")
        }
        onLogout={onLogout}
      />
    );
  }

  if (
    view ===
    "NEW_ADMIN_ACCOUNTS"
  ) {
    return (
      <main className="min-h-screen bg-slate-100 p-4 text-slate-900">
        <div className="mx-auto max-w-5xl">
          <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#063f39] p-4 text-white">
            <div>
              <p className="text-[10px] font-bold tracking-widest text-amber-200">
                ADMIN CONTROL PANEL
              </p>

              <h1 className="mt-1 text-xl font-black">
                NEW ADMIN ACCOUNTS
              </h1>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  setView("HOME")
                }
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
            Create and manage History
            Admin IDs. New Admins sign
            in at /new-admin.
          </p>

          <div className="mt-4 rounded-xl bg-[#063f39] p-3">
            <LinkBox
              label="NEW ADMIN LOGIN LINK"
              path="/new-admin"
            />
          </div>

          <AdminAccounts />

          <ControllerAccountCards
            onOpen={setView}
          />
        </div>
      </main>
    );
  }

  if (
    view ===
    "PLAYING_HISTORY"
  ) {
    return (
      <AdminPlayingHistory
        admin={identity}
        onBack={() =>
          setView("HOME")
        }
        onLogout={onLogout}
      />
    );
  }

  if (
    view === "PROMO_CODES"
  ) {
    return (
      <AdminPromoCodes
        admin={admin}
        onBack={() =>
          setView("HOME")
        }
        onLogout={onLogout}
      />
    );
  }

  if (
    view ===
    "CONTROLLED_SO"
  ) {
    return (
      <ManualSuperOverControls
        onBack={() =>
          setView("GAMES")
        }
      />
    );
  }

  if (
    CONTROLLER_GAMES.some(
      game =>
        game.id === view,
    )
  ) {
    return (
      <AdminControllerAccounts
        key={view}
        game={view}
        admin={admin}
        onBack={() =>
          setView(
            "NEW_ADMIN_ACCOUNTS",
          )
        }
        onLogout={onLogout}
      />
    );
  }

  if (
    view === "GAMES"
  ) {
    return (
      <main className="min-h-screen bg-[#061c1a] p-4 text-white">
        <div className="mx-auto max-w-5xl">
          <button
            type="button"
            onClick={() =>
              setView("HOME")
            }
            className="rounded-lg border border-white/20 px-4 py-2 text-sm"
          >
            ‹ ADMIN DASHBOARD
          </button>

          <h1 className="my-6 text-2xl font-black text-amber-300">
            GAME LINKS &amp; CONTROLS
          </h1>

          <p className="mb-5 text-sm leading-6 text-slate-300">
            Aviator and Roulette Controller
            IDs are managed under
            NEW ADMIN ACCOUNTS.
          </p>

          <button
            type="button"
            onClick={() =>
              setView(
                "NEW_ADMIN_ACCOUNTS",
              )
            }
            className="mb-5 rounded-lg bg-amber-400 px-4 py-3 text-xs font-black text-black"
          >
            OPEN NEW ADMIN ACCOUNTS ›
          </button>

          <div className="grid gap-3 sm:grid-cols-2">
            {CONTROLLER_GAMES.map(game => (
              <article
                key={game.id}
                className="min-w-0 rounded-2xl border border-teal-700 bg-[#083d37] p-4"
              >
                <h2 className="mb-3 font-black text-amber-200">
                  {game.icon}{" "}
                  {game.name}
                </h2>

                <LinkBox
                  label={`${game.name} Game Link`}
                  path={game.gamePath}
                />
              </article>
            ))}
          </div>

          <article className="mt-6 overflow-hidden rounded-2xl border border-teal-700 bg-[#083d37]">
            <button
              type="button"
              onClick={() =>
                setView(
                  "CONTROLLED_SO",
                )
              }
              className="block w-full p-6 text-left"
            >
              <span className="block text-lg font-black text-amber-200">
                🏏 SUPER OVER · ADMIN CONTROL
              </span>

              <span className="mt-2 block text-sm text-cyan-100">
                Ball queue · Live rates ·
                Publish match ›
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
                Automatic game with random
                results. This game does not
                use a result Controller ID.
              </p>
            </div>

            <div className="border-t border-teal-700/70 p-3">
              <LinkBox
                label="Color Prediction Game Link"
                path="/games/color-prediction"
              />
            </div>
          </article>

          <article className="mt-6 overflow-hidden rounded-2xl border border-teal-700 bg-[#083d37]">
            <h2 className="p-5 font-black text-amber-200">
              💼 DEAL OR NO DEAL
            </h2>

            <div className="border-t border-teal-700/70 p-3">
              <LinkBox
                label="Deal or No Deal Game Link"
                path="/games/deal-or-no-deal"
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
      <AdminDashboard
        admin={admin}
        onLogout={onLogout}
      />

      <nav
        aria-label="Additional Admin management"
        className="border-t border-teal-700 bg-[#061c1a] p-3 text-white"
      >
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <button
            type="button"
            onClick={() =>
              setView(
                "NEW_ADMIN_ACCOUNTS",
              )
            }
            className="rounded-xl border border-amber-300/40 bg-amber-400/10 p-4 text-left"
          >
            <span className="block font-black text-amber-200">
              NEW ADMIN ACCOUNTS
            </span>

            <span className="mt-1 block text-xs leading-5 text-slate-200">
              History Admins · Aviator /
              Roulette IDs · Create /
              Block / Remove ›
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setView("GAMES")
            }
            className="rounded-xl border border-teal-700 bg-[#083d37] p-4 text-left"
          >
            <span className="block font-black text-amber-300">
              GAME LINKS &amp; CONTROLS
            </span>

            <span className="mt-1 block text-xs leading-5 text-cyan-100">
              Copy Game Links ·
              PLAY / PAUSE ›
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setView(
                "PROMO_CODES",
              )
            }
            className="rounded-xl border border-violet-400/30 bg-violet-500/10 p-4 text-left"
          >
            <span className="block font-black text-violet-200">
              PROMO CODES
            </span>

            <span className="mt-1 block text-xs leading-5 text-slate-300">
              Assign / Update Customer
              Promo Codes ›
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setView(
                "PLAYING_HISTORY",
              )
            }
            className="rounded-xl border border-cyan-400/40 bg-teal-700/30 p-4 text-left"
          >
            <span className="block font-black text-cyan-100">
              📋 CUSTOMER PLAYING HISTORY
            </span>

            <span className="mt-1 block text-xs leading-5 text-slate-200">
              8 Games + Sports ·
              New Admin IDs · Settlement ›
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setView(
                "SPORTS_SETTLEMENT",
              )
            }
            className="rounded-xl border border-[#08b7bc] bg-[#791b3e] p-4 text-left"
          >
            <span className="block font-black text-white">
              SPORTS BET SETTLEMENT
            </span>

            <span className="mt-1 block text-xs leading-5 text-white">
              Customer bets · Pending /
              Settled · Admin WON / LOST ›
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
