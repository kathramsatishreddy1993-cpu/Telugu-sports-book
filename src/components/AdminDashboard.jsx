import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import AdminPaymentSettings from "./AdminPaymentSettings";
import AdminSportsApiSettings from "./AdminSportsApiSettings";

const DEFAULT_WHATSAPP_NUMBER = "919346824432";

const money = value =>
  Number(value || 0).toLocaleString("en-IN");

const isPending = item =>
  String(item?.status || "").toUpperCase() === "PENDING";

const getPromoCode = customer =>
  customer?.promoCode || customer?.promo_code || "";

const loginOf = customer =>
  customer?.loginId || customer?.login_id || "";

const balanceOf = customer =>
  Number(
    customer?.demoCoinBalance ??
    customer?.demo_coin_balance ??
    0,
  );

const dateText = value =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      })
    : "—";

function readPending(key) {
  try {
    const saved = JSON.parse(
      sessionStorage.getItem(key) || "null",
    );

    const valid =
      saved &&
      ["ADD", "REMOVE"].includes(saved.mode) &&
      /^[1-9][0-9]*$/.test(String(saved.customerId)) &&
      typeof saved.body?.requestKey === "string" &&
      /^[A-Za-z0-9_-]{16,100}$/.test(
        saved.body.requestKey,
      ) &&
      Number.isSafeInteger(saved.body.amount) &&
      saved.body.amount > 0 &&
      saved.body.amount <= 2147483647 &&
      typeof saved.body.note === "string";

    return valid ? saved : null;
  } catch {
    return null;
  }
}

function makeKey() {
  const bytes = new Uint8Array(20);

  window.crypto.getRandomValues(bytes);

  return Array.from(
    bytes,
    value => value.toString(16).padStart(2, "0"),
  ).join("");
}

async function requestJson(url, options = {}) {
  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    15000,
  );

  try {
    const response = await fetch(url, {
      ...options,
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,

      headers: {
        Accept: "application/json",

        ...(options.body
          ? { "Content-Type": "application/json" }
          : {}),

        ...options.headers,
      },
    });

    let data;

    try {
      data = await response.json();
    } catch {
      throw new Error(
        "Unable to read the server response. Refresh or retry the same request.",
      );
    }

    if (!response.ok || data.success === false) {
      throw Object.assign(
        new Error(
          data.error ||
          data.message ||
          "Request failed. Please try again.",
        ),
        { status: response.status },
      );
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

export default function AdminDashboard({
  admin,
  onLogout,
}) {
  return (
    <Dashboard
      key={admin?.username || "admin"}
      admin={admin}
      onLogout={onLogout}
    />
  );
}

function Dashboard({ admin, onLogout }) {
  const [activeSection, setActiveSection] =
    useState("Dashboard");

  const [depositRequests, setDepositRequests] =
    useState([]);
  const [depositLoading, setDepositLoading] =
    useState(false);
  const [depositError, setDepositError] =
    useState("");

  const [withdrawalRequests, setWithdrawalRequests] =
    useState([]);
  const [withdrawalLoading, setWithdrawalLoading] =
    useState(false);
  const [withdrawalError, setWithdrawalError] =
    useState("");

  const [customers, setCustomers] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [customerLoginId, setCustomerLoginId] =
    useState("");
  const [customerPromoCode, setCustomerPromoCode] =
    useState("");
  const [loginPassword, setLoginPassword] =
    useState("");
  const [withdrawalPassword, setWithdrawalPassword] =
    useState("");

  const [customerLoading, setCustomerLoading] =
    useState(false);
  const [customerCreating, setCustomerCreating] =
    useState(false);
  const [customerMessage, setCustomerMessage] =
    useState("");
  const [customerError, setCustomerError] =
    useState("");

  const storageKey =
    `tsb_admin_coin_pending_v1:${admin?.username || "admin"}`;

  const [pending, setPending] = useState(
    () => readPending(storageKey),
  );

  const pendingRef = useRef(pending);
  const coinWorking = useRef(false);
  const customerVersion = useRef(0);
  const historyVersion = useRef(0);
  const mounted = useRef(true);

  const [coinCustomerId, setCoinCustomerId] = useState(
    () => String(pending?.customerId || ""),
  );

  const [coinAmount, setCoinAmount] = useState(
    () => pending ? String(pending.body.amount) : "",
  );

  const [coinNote, setCoinNote] = useState("");
  const [coinMessage, setCoinMessage] = useState("");
  const [coinError, setCoinError] = useState("");
  const [coinBusy, setCoinBusy] = useState(false);

  const [coinHistory, setCoinHistory] = useState([]);
  const [coinHistoryLoading, setCoinHistoryLoading] =
    useState(false);
  const [coinHistoryError, setCoinHistoryError] =
    useState("");

  const [whatsappNumber, setWhatsappNumber] =
    useState(DEFAULT_WHATSAPP_NUMBER);
  const [whatsappInput, setWhatsappInput] =
    useState(DEFAULT_WHATSAPP_NUMBER);
  const [whatsappLoading, setWhatsappLoading] =
    useState(false);
  const [whatsappMessage, setWhatsappMessage] =
    useState("");
  const [whatsappError, setWhatsappError] =
    useState("");

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  const pendingDeposits = useMemo(
    () => depositRequests.filter(isPending).length,
    [depositRequests],
  );

  const pendingWithdrawals = useMemo(
    () => withdrawalRequests.filter(isPending).length,
    [withdrawalRequests],
  );

  const selectedCustomer = customers.find(
    customer =>
      String(customer.id) === String(coinCustomerId),
  );

  const coinLocked = coinBusy || Boolean(pending);

  async function loadDepositRequests() {
    setDepositLoading(true);
    setDepositError("");

    try {
      const data = await requestJson(
        "/api/admin/demo-deposits",
      );

      if (mounted.current) {
        setDepositRequests(
          Array.isArray(data.requests)
            ? data.requests
            : [],
        );
      }
    } catch (error) {
      if (mounted.current) {
        setDepositError(error.message);
      }
    } finally {
      if (mounted.current) {
        setDepositLoading(false);
      }
    }
  }

  async function loadWithdrawalRequests() {
    setWithdrawalLoading(true);
    setWithdrawalError("");

    try {
      const data = await requestJson(
        "/api/admin/demo-withdrawals",
      );

      if (mounted.current) {
        setWithdrawalRequests(
          Array.isArray(data.requests)
            ? data.requests
            : [],
        );
      }
    } catch (error) {
      if (mounted.current) {
        setWithdrawalError(error.message);
      }
    } finally {
      if (mounted.current) {
        setWithdrawalLoading(false);
      }
    }
  }

  async function loadCustomers() {
    const version = ++customerVersion.current;

    setCustomerLoading(true);
    setCustomerError("");

    try {
      const data = await requestJson(
        "/api/admin/customers",
      );

      if (
        mounted.current &&
        version === customerVersion.current
      ) {
        setCustomers(
          Array.isArray(data.customers)
            ? data.customers
            : [],
        );
      }
    } catch (error) {
      if (
        mounted.current &&
        version === customerVersion.current
      ) {
        setCustomerError(error.message);
      }
    } finally {
      if (
        mounted.current &&
        version === customerVersion.current
      ) {
        setCustomerLoading(false);
      }
    }
  }

  async function loadCoinHistory() {
    const version = ++historyVersion.current;

    setCoinHistoryLoading(true);
    setCoinHistoryError("");

    try {
      const data = await requestJson(
        "/api/admin/demo-coin-transactions",
      );

      if (
        mounted.current &&
        version === historyVersion.current
      ) {
        setCoinHistory(
          Array.isArray(data.transactions)
            ? data.transactions
            : [],
        );
      }
    } catch (error) {
      if (
        mounted.current &&
        version === historyVersion.current
      ) {
        setCoinHistoryError(error.message);
      }
    } finally {
      if (
        mounted.current &&
        version === historyVersion.current
      ) {
        setCoinHistoryLoading(false);
      }
    }
  }

  async function loadWhatsAppNumber() {
    setWhatsappLoading(true);
    setWhatsappError("");
    setWhatsappMessage("");

    try {
      const data = await requestJson(
        "/api/admin/settings/whatsapp",
      );

      const number = String(
        data.whatsappNumber ||
        DEFAULT_WHATSAPP_NUMBER,
      ).replace(/\D/g, "");

      if (mounted.current) {
        setWhatsappNumber(number);
        setWhatsappInput(number);
      }
    } catch (error) {
      if (mounted.current) {
        setWhatsappError(error.message);
      }
    } finally {
      if (mounted.current) {
        setWhatsappLoading(false);
      }
    }
  }

  useEffect(() => {
    if (
      [
        "Dashboard",
        "Pending Deposits",
        "Transaction History",
      ].includes(activeSection)
    ) {
      void loadDepositRequests();
    }

    if (
      [
        "Dashboard",
        "Pending Withdrawals",
        "Transaction History",
      ].includes(activeSection)
    ) {
      void loadWithdrawalRequests();
    }

    if (
      ["Customers", "Coin Management"].includes(
        activeSection,
      )
    ) {
      void loadCustomers();
    }

    if (activeSection === "Coin Management") {
      void loadCoinHistory();
    }

    if (activeSection === "WhatsApp Settings") {
      void loadWhatsAppNumber();
    }
  }, [activeSection]);

  async function saveWhatsAppNumber(event) {
    event.preventDefault();

    if (whatsappLoading) return;

    setWhatsappError("");
    setWhatsappMessage("");

    const clean = String(
      whatsappInput || "",
    ).replace(/\D/g, "");

    if (!/^[1-9][0-9]{9,14}$/.test(clean)) {
      setWhatsappError(
        "Enter a valid WhatsApp number with country code. Example: 919346824432",
      );
      return;
    }

    if (
      !window.confirm(
        `Change the website WhatsApp number to +${clean}?`,
      )
    ) {
      return;
    }

    setWhatsappLoading(true);

    try {
      const data = await requestJson(
        "/api/admin/settings/whatsapp",
        {
          method: "PUT",
          body: JSON.stringify({
            whatsappNumber: clean,
          }),
        },
      );

      const saved = String(
        data.whatsappNumber || clean,
      ).replace(/\D/g, "");

      setWhatsappNumber(saved);
      setWhatsappInput(saved);

      setWhatsappMessage(
        `WhatsApp number updated successfully to +${saved}.`,
      );
    } catch (error) {
      setWhatsappError(error.message);
    } finally {
      setWhatsappLoading(false);
    }
  }

  async function createCustomer(event) {
    event.preventDefault();

    if (customerCreating) return;

    setCustomerError("");
    setCustomerMessage("");

    const name = customerName.trim();
    const loginId =
      customerLoginId.trim().toLowerCase();
    const promoCode =
      customerPromoCode.trim().toUpperCase();

    if (!name) {
      setCustomerError("Customer Name is required.");
      return;
    }

    if (!/^[a-z0-9._-]{4,30}$/.test(loginId)) {
      setCustomerError(
        "Login ID must contain 4–30 letters, numbers, dots, underscores or hyphens.",
      );
      return;
    }

    if (!/^[A-Z0-9_-]{4,30}$/.test(promoCode)) {
      setCustomerError(
        "Promo Code must contain 4–30 letters, numbers, underscores or hyphens.",
      );
      return;
    }

    if (
      customers.some(
        customer =>
          getPromoCode(customer).toUpperCase() ===
          promoCode,
      )
    ) {
      setCustomerError(
        "This Promo Code is already assigned. Enter a different code.",
      );
      return;
    }

    if (
      loginPassword.length < 6 ||
      withdrawalPassword.length < 6
    ) {
      setCustomerError(
        "Both passwords must contain at least 6 characters.",
      );
      return;
    }

    if (loginPassword === withdrawalPassword) {
      setCustomerError(
        "Login Password and Withdrawal Password must be different.",
      );
      return;
    }

    setCustomerCreating(true);

    try {
      const data = await requestJson(
        "/api/admin/customers",
        {
          method: "POST",

          body: JSON.stringify({
            name,
            loginId,
            promoCode,
            temporaryPassword: loginPassword,
            temporaryWithdrawalPassword:
              withdrawalPassword,
          }),
        },
      );

      setCustomerName("");
      setCustomerLoginId("");
      setCustomerPromoCode("");
      setLoginPassword("");
      setWithdrawalPassword("");

      await loadCustomers();

      const saved = getPromoCode(data.customer);

      if (saved.toUpperCase() === promoCode) {
        setCustomerMessage(
          `Customer ${loginId} created successfully. Promo Code: ${saved}`,
        );
      } else {
        setCustomerError(
          `Customer ${loginId} was created, but the server did not confirm the Promo Code. Complete the backend update before creating another customer.`,
        );
      }
    } catch (error) {
      setCustomerError(error.message);
    } finally {
      setCustomerCreating(false);
    }
  }

  async function resetPassword(
    customer,
    withdrawal,
  ) {
    const title =
      withdrawal ? "Withdrawal" : "Login";

    const password = window.prompt(
      `Enter NEW temporary ${title} Password for ${loginOf(customer)}`,
    );

    if (!password) return;

    if (password.length < 6) {
      window.alert(
        `Temporary ${title} Password must contain at least 6 characters.`,
      );
      return;
    }

    try {
      await requestJson(
        `/api/admin/customers/${customer.id}/reset-${
          withdrawal ? "withdrawal" : "login"
        }-password`,
        {
          method: "POST",

          body: JSON.stringify(
            withdrawal
              ? {
                  temporaryWithdrawalPassword:
                    password,
                }
              : {
                  temporaryPassword: password,
                },
          ),
        },
      );

      window.alert(
        `Temporary ${title} Password reset successfully.`,
      );

      await loadCustomers();
    } catch (error) {
      window.alert(error.message);
    }
  }

  async function reviewRequest(
    requestId,
    nextStatus,
    withdrawal,
  ) {
    const requests = withdrawal
      ? withdrawalRequests
      : depositRequests;

    const request = requests.find(
      item =>
        String(item.id) === String(requestId),
    );

    if (!request) {
      window.alert("Request not found.");
      return;
    }

    if (!isPending(request)) {
      window.alert(
        "This request has already been reviewed.",
      );
      return;
    }

    if (
      !window.confirm(
        `${
          nextStatus === "APPROVED"
            ? "Approve"
            : "Reject"
        } ${money(request.amount)} demo coins ${
          withdrawal ? "withdrawal" : "deposit"
        } request?`,
      )
    ) {
      return;
    }

    try {
      await requestJson(
        `/api/admin/demo-${
          withdrawal ? "withdrawals" : "deposits"
        }/${encodeURIComponent(requestId)}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: nextStatus,
          }),
        },
      );

      await (
        withdrawal
          ? loadWithdrawalRequests()
          : loadDepositRequests()
      );

      window.alert(
        `Request changed to ${nextStatus}.`,
      );
    } catch (error) {
      if (withdrawal) {
        setWithdrawalError(error.message);
      } else {
        setDepositError(error.message);
      }

      window.alert(error.message);
    }
  }

  async function changeDemoCoins(mode) {
    if (coinWorking.current) return;

    setCoinError("");
    setCoinMessage("");

    let job = pendingRef.current;

    if (!job) {
      if (!["ADD", "REMOVE"].includes(mode)) {
        return;
      }

      if (!selectedCustomer) {
        setCoinError("Select customer first.");
        return;
      }

      const text = coinAmount.trim();
      const amount = Number(text);

      if (
        !/^[0-9]+$/.test(text) ||
        !Number.isSafeInteger(amount) ||
        amount <= 0 ||
        amount > 2147483647
      ) {
        setCoinError(
          "Enter a positive whole-number coin amount up to 2,147,483,647.",
        );
        return;
      }

      const note =
        coinNote.trim() ||
        (
          mode === "REMOVE"
            ? "Demo Coins removed by Admin"
            : "Demo Coins added by Admin"
        );

      if (note.length > 500) {
        setCoinError(
          "Note must not exceed 500 characters.",
        );
        return;
      }

      if (
        mode === "REMOVE" &&
        !window.confirm(
          `Remove ${money(amount)} demo coins from ${
            selectedCustomer.name
          } (${loginOf(selectedCustomer)})?`,
        )
      ) {
        return;
      }

      try {
        job = {
          mode,

          customerId: String(
            selectedCustomer.id,
          ),

          customerName:
            selectedCustomer.name ||
            loginOf(selectedCustomer),

          loginId: loginOf(selectedCustomer),

          body: {
            amount,
            note,
            requestKey: makeKey(),
          },
        };

        sessionStorage.setItem(
          storageKey,
          JSON.stringify(job),
        );
      } catch {
        setCoinError(
          "Enable browser session storage and use HTTPS before changing coins.",
        );
        return;
      }

      pendingRef.current = job;
      setPending(job);
    }

    coinWorking.current = true;
    setCoinBusy(true);

    customerVersion.current += 1;
    historyVersion.current += 1;

    try {
      const data = await requestJson(
        `/api/admin/customers/${
          encodeURIComponent(job.customerId)
        }/${
          job.mode === "REMOVE"
            ? "remove"
            : "add"
        }-demo-coins`,
        {
          method: "POST",
          body: JSON.stringify(job.body),
        },
      );

      if (
        !data.customer ||
        !Number.isSafeInteger(
          balanceOf(data.customer),
        )
      ) {
        throw new Error(
          "Incomplete server response. Retry the same adjustment to recover its status.",
        );
      }

      pendingRef.current = null;

      try {
        sessionStorage.removeItem(storageKey);
      } catch {}

      if (!mounted.current) return;

      setPending(null);
      setCoinAmount("");
      setCoinNote("");
      setCoinCustomerId(
        String(job.customerId),
      );

      setCustomers(previous =>
        previous.map(customer =>
          String(customer.id) ===
          String(job.customerId)
            ? {
                ...customer,
                ...data.customer,
              }
            : customer,
        ),
      );

      setCoinMessage(
        `${
          data.replayed
            ? "Previous adjustment recovered; no second change. "
            : ""
        }${money(job.body.amount)} Coins ${
          job.mode === "REMOVE"
            ? "removed from"
            : "added to"
        } ${job.customerName} (${job.loginId}). ` +
        `Current balance: ${
          money(balanceOf(data.customer))
        }`,
      );

      window.dispatchEvent(
        new Event("demo-balance-updated"),
      );
    } catch (error) {
      if (!mounted.current) return;

      if (
        [400, 401, 403, 404, 409, 422]
          .includes(error.status)
      ) {
        pendingRef.current = null;
        setPending(null);

        try {
          sessionStorage.removeItem(storageKey);
        } catch {}

        setCoinError(error.message);
      } else {
        setCoinError(
          "The adjustment status is not confirmed. " +
          "Press RETRY SAME ADJUSTMENT; do not " +
          "create another request. " +
          error.message,
        );
      }
    } finally {
      coinWorking.current = false;

      if (mounted.current) {
        setCoinBusy(false);

        void loadCustomers();
        void loadCoinHistory();
      }
    }
  }

  const goBack = () =>
    setActiveSection("Dashboard");

  const adminBoxes = [
    { title: "Deposit Accounts", icon: "🏦" },
    { title: "Coin Management", icon: "🪙" },
    { title: "Customers", icon: "👥" },
    { title: "WhatsApp Settings", icon: "📱" },
    { title: "API Settings", icon: "🔌" },
    { title: "Transaction History", icon: "📒" },
    { title: "Admin Settings", icon: "⚙️" },
  ];

  if (activeSection === "Deposit Accounts") {
    return (
      <AdminPaymentSettings onBack={goBack} />
    );
  }

  return (
    <div className="min-h-screen bg-[#061c1a] text-white">
      <header className="sticky top-0 z-50 bg-[#9a5a00] px-4 py-4 shadow-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <p className="text-[9px] font-black tracking-widest text-amber-200">
              TELUGU SPORTS BOOK
            </p>

            <h1 className="mt-1 text-lg font-black">
              🛡️ ADMIN CONTROL PANEL
            </h1>
          </div>

          <div className="text-right">
            <p className="text-[8px] text-amber-100">
              ADMIN ID
            </p>

            <p className="text-[11px] font-black">
              {admin?.username || "admin"}
            </p>
          </div>
        </div>
      </header>

      {pending &&
        activeSection !== "Coin Management" && (
          <div className="mx-auto max-w-5xl px-3">
            <MessageBox
              text="A coin adjustment needs recovery. Open Coin Management and retry the same adjustment."
              error
            />

            <button
              type="button"
              onClick={() =>
                setActiveSection("Coin Management")
              }
              className="mt-2 rounded bg-amber-500 px-4 py-2 text-xs font-black text-black"
            >
              OPEN COIN MANAGEMENT
            </button>
          </div>
        )}

      {activeSection === "Dashboard" && (
        <main className="mx-auto max-w-5xl px-3 py-5">
          <h2 className="text-xl font-black">
            Admin Dashboard
          </h2>

          {depositError && (
            <MessageBox
              text={depositError}
              error
            />
          )}

          {withdrawalError && (
            <MessageBox
              text={withdrawalError}
              error
            />
          )}

          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                setActiveSection(
                  "Pending Deposits",
                )
              }
              className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-left"
            >
              <span className="text-2xl">
                📥
              </span>

              <p className="mt-2 text-2xl font-black text-green-300">
                {depositLoading
                  ? "..."
                  : pendingDeposits}
              </p>

              <p className="text-[9px] font-black">
                PENDING DEPOSITS
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveSection(
                  "Pending Withdrawals",
                )
              }
              className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-left"
            >
              <span className="text-2xl">
                💸
              </span>

              <p className="mt-2 text-2xl font-black text-red-300">
                {withdrawalLoading
                  ? "..."
                  : pendingWithdrawals}
              </p>

              <p className="text-[9px] font-black">
                PENDING WITHDRAWALS
              </p>
            </button>
          </div>

          <p className="mb-3 mt-6 text-xs font-black text-amber-300">
            ADMIN MANAGEMENT
          </p>

          <div className="grid grid-cols-2 gap-3">
            {adminBoxes.map(item => (
              <button
                type="button"
                key={item.title}
                onClick={() =>
                  setActiveSection(item.title)
                }
                className="min-h-[130px] rounded-xl border border-[#28655f] bg-[#083d37] p-4 text-left"
              >
                <span className="text-3xl">
                  {item.icon}
                </span>

                <p className="mt-4 text-[11px] font-black">
                  {item.title}
                </p>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="mt-6 h-[46px] w-full rounded-lg bg-red-700 text-xs font-black"
          >
            ADMIN LOGOUT
          </button>
        </main>
      )}

      {[
        "Pending Deposits",
        "Pending Withdrawals",
      ].includes(activeSection) && (() => {
        const withdrawal =
          activeSection ===
          "Pending Withdrawals";

        const requests = withdrawal
          ? withdrawalRequests
          : depositRequests;

        const loading = withdrawal
          ? withdrawalLoading
          : depositLoading;

        const error = withdrawal
          ? withdrawalError
          : depositError;

        return (
          <AdminPage
            title={activeSection}
            icon={withdrawal ? "💸" : "📥"}
            onBack={goBack}
          >
            <div className="grid grid-cols-2 gap-2">
              <InfoBox
                label="TOTAL PENDING"
                value={
                  loading
                    ? "..."
                    : requests.filter(isPending).length
                }
              />

              <RefreshButton
                loading={loading}
                onClick={
                  withdrawal
                    ? loadWithdrawalRequests
                    : loadDepositRequests
                }
              />
            </div>

            {error && (
              <MessageBox text={error} error />
            )}

            {!loading &&
              !requests.some(isPending) && (
                <EmptyState
                  text={
                    withdrawal
                      ? "No pending withdrawals"
                      : "No pending deposits"
                  }
                />
              )}

            <div className="mt-4 space-y-3">
              {requests
                .filter(isPending)
                .map(request => (
                  <div
                    key={request.id}
                    className="rounded-xl border border-[#28655f] bg-[#083d37] p-4"
                  >
                    <RequestHeading
                      request={request}
                    />

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <InfoBox
                        label="DEMO COINS"
                        value={money(request.amount)}
                      />

                      <InfoBox
                        label="CUSTOMER ID"
                        value={
                          request.customerId || "—"
                        }
                      />

                      {withdrawal ? (
                        <>
                          <InfoBox
                            label="ACCOUNT HOLDER"
                            value={
                              request.accountHolderName ||
                              "—"
                            }
                          />

                          <InfoBox
                            label="BANK NAME"
                            value={
                              request.bankName || "—"
                            }
                          />

                          <InfoBox
                            label="ACCOUNT NUMBER"
                            value={
                              request.accountNumber ||
                              "—"
                            }
                          />

                          <InfoBox
                            label="IFSC CODE"
                            value={
                              request.ifscCode || "—"
                            }
                          />
                        </>
                      ) : (
                        <>
                          <InfoBox
                            label="REFERENCE / UTR"
                            value={
                              request.referenceNumber ||
                              request.reference ||
                              "—"
                            }
                          />

                          <InfoBox
                            label="METHOD"
                            value={
                              request.paymentMethod ||
                              request.method ||
                              "—"
                            }
                          />
                        </>
                      )}
                    </div>

                    {!withdrawal &&
                      request.proofName && (
                        <InfoBox
                          label="PROOF FILE"
                          value={request.proofName}
                        />
                      )}

                    <RequestDate
                      value={request.createdAt}
                    />

                    <ReviewButtons
                      onApprove={() =>
                        reviewRequest(
                          request.id,
                          "APPROVED",
                          withdrawal,
                        )
                      }
                      onReject={() =>
                        reviewRequest(
                          request.id,
                          "REJECTED",
                          withdrawal,
                        )
                      }
                    />
                  </div>
                ))}
            </div>
          </AdminPage>
        );
      })()}

      {activeSection === "Customers" && (
        <AdminPage
          title="Customers"
          icon="👥"
          onBack={goBack}
        >
          <form
            onSubmit={createCustomer}
            className="rounded-xl border border-amber-500/30 bg-black/10 p-4"
          >
            <p className="text-xs font-black text-amber-300">
              CREATE CUSTOMER ID
            </p>

            <fieldset
              disabled={customerCreating}
              className="mt-4 space-y-3"
            >
              <CustomerInput
                label="CUSTOMER NAME"
                value={customerName}
                onChange={event =>
                  setCustomerName(
                    event.target.value,
                  )
                }
              />

              <CustomerInput
                label="LOGIN ID"
                value={customerLoginId}
                onChange={event =>
                  setCustomerLoginId(
                    event.target.value,
                  )
                }
              />

              <CustomerInput
                label="PROMO CODE"
                value={customerPromoCode}
                maxLength={30}
                placeholder="Example: SATISH05"
                onChange={event =>
                  setCustomerPromoCode(
                    event.target.value.toUpperCase(),
                  )
                }
              />

              <p className="text-[9px] leading-5 text-cyan-200">
                Assign a unique Promo Code.
                Use 4–30 letters, numbers,
                underscores or hyphens.
              </p>

              <CustomerInput
                label="LOGIN PASSWORD"
                type="password"
                value={loginPassword}
                onChange={event =>
                  setLoginPassword(
                    event.target.value,
                  )
                }
              />

              <CustomerInput
                label="WITHDRAWAL PASSWORD"
                type="password"
                value={withdrawalPassword}
                onChange={event =>
                  setWithdrawalPassword(
                    event.target.value,
                  )
                }
              />
            </fieldset>

            {customerError && (
              <MessageBox
                text={customerError}
                error
              />
            )}

            {customerMessage && (
              <MessageBox
                text={customerMessage}
              />
            )}

            <button
              type="submit"
              disabled={
                customerCreating ||
                customerLoading
              }
              className="mt-4 h-[46px] w-full rounded-lg bg-amber-500 text-[10px] font-black text-black disabled:opacity-50"
            >
              {customerCreating
                ? "PLEASE WAIT..."
                : "CREATE CUSTOMER"}
            </button>
          </form>

          <div className="mt-5">
            <RefreshButton
              loading={
                customerLoading ||
                customerCreating
              }
              onClick={loadCustomers}
            />
          </div>

          <div className="mt-5 space-y-3">
            {!customers.length &&
              !customerLoading && (
                <EmptyState
                  text="No customers found"
                />
              )}

            {customers.map(customer => (
              <div
                key={customer.id}
                className="rounded-xl border border-[#28655f] bg-[#083d37] p-4"
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="text-sm font-black">
                      {customer.name}
                    </p>

                    <p className="mt-1 text-[9px] text-amber-300">
                      {loginOf(customer)}
                    </p>
                  </div>

                  <StatusBadge
                    status={customer.status}
                  />
                </div>

                <div className="mt-3 space-y-2">
                  <InfoBox
                    label="PROMO CODE"
                    value={
                      getPromoCode(customer) ||
                      "NOT ASSIGNED"
                    }
                  />

                  <InfoBox
                    label="DEMO COIN BALANCE"
                    value={money(
                      balanceOf(customer),
                    )}
                  />

                  <InfoBox
                    label="LOGIN PASSWORD"
                    value={
                      customer.mustChangePassword
                        ? "CHANGE REQUIRED"
                        : "SET"
                    }
                  />

                  <InfoBox
                    label="WITHDRAWAL PASSWORD"
                    value={
                      !customer.withdrawalPasswordConfigured
                        ? "NOT CONFIGURED"
                        : customer.mustChangeWithdrawalPassword
                          ? "CHANGE REQUIRED"
                          : "SET"
                    }
                  />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      resetPassword(
                        customer,
                        false,
                      )
                    }
                    className="min-h-[42px] rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 text-[8px] font-black text-amber-300"
                  >
                    RESET LOGIN PASSWORD
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      resetPassword(
                        customer,
                        true,
                      )
                    }
                    className="min-h-[42px] rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2 text-[8px] font-black text-cyan-300"
                  >
                    RESET WITHDRAWAL PASSWORD
                  </button>
                </div>
              </div>
            ))}
          </div>
        </AdminPage>
      )}

      {activeSection === "WhatsApp Settings" && (
        <AdminPage
          title="WhatsApp Settings"
          icon="📱"
          onBack={goBack}
        >
          <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4">
            <p className="text-xs font-black text-green-300">
              GLOBAL WHATSAPP CONTACT
            </p>

            <p className="mt-2 text-[9px] leading-5 text-gray-400">
              Change the WhatsApp contact used
              by the website.
            </p>

            <div className="mt-4">
              <InfoBox
                label="CURRENT WHATSAPP NUMBER"
                value={
                  whatsappLoading
                    ? "Loading..."
                    : `+${whatsappNumber}`
                }
              />
            </div>

            <form
              onSubmit={saveWhatsAppNumber}
              className="mt-4"
            >
              <CustomerInput
                label="NEW WHATSAPP NUMBER"
                type="tel"
                inputMode="numeric"
                value={whatsappInput}
                disabled={whatsappLoading}
                placeholder="Example: 919346824432"
                onChange={event =>
                  setWhatsappInput(
                    event.target.value.replace(
                      /\D/g,
                      "",
                    ),
                  )
                }
              />

              <p className="mt-2 text-[8px] text-gray-500">
                Enter country code + mobile number
                without spaces.
              </p>

              {whatsappError && (
                <MessageBox
                  text={whatsappError}
                  error
                />
              )}

              {whatsappMessage && (
                <MessageBox
                  text={whatsappMessage}
                />
              )}

              <button
                type="submit"
                disabled={whatsappLoading}
                className="mt-4 h-[48px] w-full rounded-lg bg-[#20c968] text-[10px] font-black disabled:opacity-50"
              >
                {whatsappLoading
                  ? "PLEASE WAIT..."
                  : "SAVE WHATSAPP NUMBER"}
              </button>
            </form>
          </div>
        </AdminPage>
      )}

      {activeSection === "Coin Management" && (
        <AdminPage
          title="Coin Management"
          icon="🪙"
          onBack={goBack}
        >
          <div className="rounded-xl border border-[#28655f] bg-[#083d37] p-4">
            <p className="text-xs font-black text-amber-300">
              COIN CONTROL
            </p>

            <p className="mt-2 text-[9px] text-gray-400">
              Demo coins only. Choose the customer
              and amount to add or remove.
            </p>

            <label
              htmlFor="coin-customer"
              className="mt-4 block text-[8px] font-black text-gray-400"
            >
              CUSTOMER
            </label>

            <select
              id="coin-customer"
              value={coinCustomerId}
              disabled={
                coinLocked ||
                customerLoading
              }
              onChange={event => {
                setCoinCustomerId(
                  event.target.value,
                );
                setCoinError("");
                setCoinMessage("");
              }}
              className="mt-2 h-[46px] w-full rounded-lg border border-[#28655f] bg-[#061c1a] px-3 text-xs text-white"
            >
              <option value="">
                Select Customer
              </option>

              {pending &&
                !selectedCustomer && (
                  <option
                    value={pending.customerId}
                  >
                    {pending.customerName}
                    {" - "}
                    {pending.loginId}
                  </option>
                )}

              {customers.map(customer => (
                <option
                  key={customer.id}
                  value={customer.id}
                >
                  {customer.name}
                  {" - "}
                  {loginOf(customer)}
                </option>
              ))}
            </select>

            {customerError && (
              <MessageBox
                text={customerError}
                error
              />
            )}

            {selectedCustomer && (
              <div className="mt-3">
                <InfoBox
                  label="CURRENT AVAILABLE DEMO COINS"
                  value={money(
                    balanceOf(selectedCustomer),
                  )}
                />
              </div>
            )}

            <CustomerInput
              label="COINS"
              type="text"
              inputMode="numeric"
              value={coinAmount}
              disabled={coinLocked}
              onChange={event =>
                setCoinAmount(
                  event.target.value,
                )
              }
            />

            <CustomerInput
              label="NOTE (OPTIONAL)"
              value={coinNote}
              maxLength={500}
              disabled={coinLocked}
              placeholder="Example: Correcting extra coins added"
              onChange={event =>
                setCoinNote(
                  event.target.value,
                )
              }
            />

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={
                  coinLocked ||
                  customerLoading
                }
                onClick={() =>
                  void changeDemoCoins("ADD")
                }
                className="h-[46px] rounded-lg bg-green-700 text-[10px] font-black disabled:opacity-50"
              >
                {coinBusy
                  ? "PLEASE WAIT..."
                  : "+ ADD COINS"}
              </button>

              <button
                type="button"
                disabled={
                  coinLocked ||
                  customerLoading
                }
                onClick={() =>
                  void changeDemoCoins("REMOVE")
                }
                className="h-[46px] rounded-lg bg-red-700 text-[10px] font-black disabled:opacity-50"
              >
                − REMOVE COINS
              </button>
            </div>

            {pending && (
              <div className="mt-3 rounded-lg border border-amber-400/40 bg-amber-400/10 p-3">
                <p className="text-[10px] text-amber-200">
                  Pending: {pending.mode}{" "}
                  {money(pending.body.amount)}
                  {" "}coins
                  {" · "}
                  {pending.customerName}
                  {" "}({pending.loginId}).
                  Retry checks this same request.
                </p>

                <button
                  type="button"
                  disabled={coinBusy}
                  onClick={() =>
                    void changeDemoCoins(
                      pending.mode,
                    )
                  }
                  className="mt-3 w-full rounded-lg bg-amber-400 px-3 py-3 text-[10px] font-black text-black disabled:opacity-50"
                >
                  {coinBusy
                    ? "CHECKING..."
                    : "RETRY SAME ADJUSTMENT"}
                </button>
              </div>
            )}

            {coinError && (
              <MessageBox
                text={coinError}
                error
              />
            )}

            {coinMessage && (
              <MessageBox
                text={coinMessage}
              />
            )}

            <div className="mt-4">
              <RefreshButton
                loading={
                  coinBusy ||
                  customerLoading ||
                  coinHistoryLoading
                }
                onClick={() => {
                  void loadCustomers();
                  void loadCoinHistory();
                }}
                text="↻ REFRESH BALANCE & ACTIVITY"
              />
            </div>
          </div>

          <p className="mt-5 text-[10px] font-black text-amber-300">
            RECENT COIN ACTIVITY
          </p>

          <p className="mt-1 text-[8px] text-gray-400">
            Latest 100 Admin additions and removals
            {" · "}saved on the server
          </p>

          {coinHistoryError && (
            <MessageBox
              text={coinHistoryError}
              error
            />
          )}

          <div className="mt-3 space-y-2">
            {coinHistoryLoading && (
              <p className="text-xs">
                Loading activity...
              </p>
            )}

            {!coinHistoryLoading &&
              !coinHistory.length &&
              !coinHistoryError && (
                <EmptyState
                  text="No coin activity yet"
                />
              )}

            {coinHistory.map(item => (
              <div
                key={item.id}
                className="rounded-lg border border-[#28655f] bg-[#083d37] p-3"
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-black">
                      {item.customerName}
                    </p>

                    <p className="mt-1 text-[8px] text-gray-400">
                      {item.loginId}
                      {" · "}
                      ID {item.customerId}
                    </p>
                  </div>

                  <span
                    className={
                      item.type === "ADD"
                        ? "text-green-300"
                        : "text-red-300"
                    }
                  >
                    {item.type === "ADD"
                      ? "+"
                      : "−"}
                    {money(item.amount)}
                  </span>
                </div>

                {item.note && (
                  <p className="mt-2 break-words text-[8px] text-gray-400">
                    {item.note}
                  </p>
                )}

                <p className="mt-2 text-[7px] text-gray-500">
                  #{item.id}
                  {" · "}
                  {dateText(item.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </AdminPage>
      )}

      {activeSection === "Transaction History" && (
        <AdminPage
          title="Transaction History"
          icon="📒"
          onBack={goBack}
        >
          <div className="grid grid-cols-2 gap-2">
            <InfoBox
              label="DEPOSITS"
              value={
                depositLoading
                  ? "..."
                  : depositRequests.length
              }
            />

            <InfoBox
              label="WITHDRAWALS"
              value={
                withdrawalLoading
                  ? "..."
                  : withdrawalRequests.length
              }
            />

            <RefreshButton
              loading={depositLoading}
              onClick={loadDepositRequests}
              text="↻ REFRESH DEPOSITS"
            />

            <RefreshButton
              loading={withdrawalLoading}
              onClick={loadWithdrawalRequests}
              text="↻ REFRESH WITHDRAWALS"
            />
          </div>

          {depositError && (
            <MessageBox
              text={depositError}
              error
            />
          )}

          {withdrawalError && (
            <MessageBox
              text={withdrawalError}
              error
            />
          )}

          {[
            {
              title: "DEPOSIT HISTORY",
              items: depositRequests,
              withdrawal: false,
              loading: depositLoading,
            },
            {
              title: "WITHDRAWAL HISTORY",
              items: withdrawalRequests,
              withdrawal: true,
              loading: withdrawalLoading,
            },
          ].map(group => (
            <div key={group.title}>
              <p className="mt-5 text-[10px] font-black text-amber-300">
                {group.title}
              </p>

              <div className="mt-3 space-y-2">
                {!group.loading &&
                  !group.items.length && (
                    <EmptyState
                      text="No transaction history"
                    />
                  )}

                {group.items.map(item => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-[#28655f] bg-[#083d37] p-3"
                  >
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="text-[9px] font-black">
                          {money(item.amount)}
                          {" "}DEMO COINS
                        </p>

                        <p className="mt-1 text-[8px] text-gray-400">
                          {item.customerName ||
                            "Customer"}
                        </p>

                        <p className="mt-1 text-[8px] text-amber-300">
                          {item.loginId ||
                            item.customerId ||
                            "—"}
                        </p>
                      </div>

                      <StatusBadge
                        status={item.status}
                      />
                    </div>

                    {group.withdrawal ? (
                      <>
                        <p className="mt-2 text-[8px] text-gray-500">
                          {item.bankName || "—"}
                          {" • "}
                          {item.accountNumber || "—"}
                        </p>

                        <p className="mt-1 text-[8px] text-gray-500">
                          IFSC:{" "}
                          {item.ifscCode || "—"}
                        </p>
                      </>
                    ) : (
                      <p className="mt-2 break-all text-[8px] text-gray-500">
                        UTR:{" "}
                        {item.referenceNumber ||
                          item.reference ||
                          "—"}
                      </p>
                    )}

                    <p className="mt-1 text-[7px] text-gray-500">
                      {dateText(item.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </AdminPage>
      )}

      {activeSection === "API Settings" && (
        <AdminPage
          title="API Settings"
          icon="🔌"
          onBack={goBack}
        >
          <AdminSportsApiSettings />
        </AdminPage>
      )}

      {activeSection === "Admin Settings" && (
        <AdminPage
          title="Admin Settings"
          icon="⚙️"
          onBack={goBack}
        >
          <InfoBox
            label="ADMIN ID"
            value={admin?.username || "admin"}
          />
        </AdminPage>
      )}
    </div>
  );
}

function AdminPage({
  title,
  icon,
  onBack,
  children,
}) {
  return (
    <main className="mx-auto max-w-5xl px-3 py-4">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 rounded-md border border-amber-500/40 px-3 py-2 text-[9px] font-black text-amber-300"
      >
        ‹ ADMIN DASHBOARD
      </button>

      <section className="rounded-xl border border-[#28655f] bg-[#072d29] p-4">
        <div className="mb-5 flex items-center gap-3">
          <span className="text-3xl">
            {icon}
          </span>

          <div>
            <p className="text-[8px] font-black text-gray-500">
              ADMIN MANAGEMENT
            </p>

            <h2 className="text-lg font-black text-amber-300">
              {title}
            </h2>
          </div>
        </div>

        {children}
      </section>
    </main>
  );
}

function CustomerInput({
  label,
  type = "text",
  value,
  onChange,
  ...props
}) {
  return (
    <label className="mt-3 block">
      <span className="text-[8px] font-black text-gray-400">
        {label}
      </span>

      <input
        {...props}
        type={type}
        value={value}
        onChange={onChange}
        autoComplete="off"
        className="mt-2 h-[46px] w-full rounded-lg border border-[#28655f] bg-[#061c1a] px-3 text-xs text-white outline-none disabled:opacity-50"
      />
    </label>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-lg border border-[#28655f] bg-black/10 p-3">
      <p className="text-[7px] font-black text-gray-500">
        {label}
      </p>

      <p className="mt-1 break-all text-[10px] font-black">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }) {
  const value = String(
    status || "PENDING",
  ).toUpperCase();

  let style =
    "border-amber-500/30 bg-amber-500/10 text-amber-300";

  if (
    ["APPROVED", "ACTIVE", "SUCCESS"].includes(
      value,
    )
  ) {
    style =
      "border-green-500/30 bg-green-500/10 text-green-300";
  }

  if (
    ["REJECTED", "REJECT"].includes(value)
  ) {
    style =
      "border-red-500/30 bg-red-500/10 text-red-300";
  }

  return (
    <span
      className={`rounded border px-2 py-1 text-[7px] font-black ${style}`}
    >
      {value}
    </span>
  );
}

function EmptyState({ text }) {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-[#28655f] px-4 py-8 text-center">
      <p className="text-[10px] text-gray-500">
        {text}
      </p>
    </div>
  );
}

function MessageBox({
  text,
  error = false,
}) {
  return (
    <div
      role={error ? "alert" : "status"}
      className={`mt-3 rounded-lg border p-3 text-[9px] font-bold ${
        error
          ? "border-red-500/40 bg-red-500/10 text-red-300"
          : "border-green-500/40 bg-green-500/10 text-green-300"
      }`}
    >
      {text}
    </div>
  );
}

function RefreshButton({
  loading,
  onClick,
  text = "↻ REFRESH",
}) {
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className="w-full rounded-lg border border-cyan-500/40 bg-cyan-500/10 p-3 text-[9px] font-black text-cyan-300 disabled:opacity-50"
    >
      {loading ? "LOADING..." : text}
    </button>
  );
}

function RequestHeading({ request }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-black">
          {request.customerName || "Customer"}
        </p>

        <p className="mt-1 text-[9px] font-black text-amber-300">
          {request.loginId ||
            `ID: ${request.customerId}`}
        </p>
      </div>

      <StatusBadge status={request.status} />
    </div>
  );
}

function RequestDate({ value }) {
  if (!value) return null;

  return (
    <div className="mt-2">
      <InfoBox
        label="REQUEST DATE"
        value={dateText(value)}
      />
    </div>
  );
}

function ReviewButtons({
  onApprove,
  onReject,
}) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={onApprove}
        className="h-[44px] rounded-lg bg-green-700 text-[10px] font-black"
      >
        ✓ APPROVE
      </button>

      <button
        type="button"
        onClick={onReject}
        className="h-[44px] rounded-lg bg-red-700 text-[10px] font-black"
      >
        ✕ REJECT
      </button>
    </div>
  );
}
