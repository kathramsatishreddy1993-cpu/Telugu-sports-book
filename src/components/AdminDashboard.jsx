import React, { useEffect, useMemo, useState } from "react";
import AdminPaymentSettings from "./AdminPaymentSettings";
import AdminSportsApiSettings from "./AdminSportsApiSettings";

const COIN_HISTORY_KEY = "telugu_sports_demo_coin_history";
const DEFAULT_WHATSAPP_NUMBER = "919346824432";

const money = value =>
  Number(value || 0).toLocaleString("en-IN");

const isPending = item =>
  String(item?.status || "").toUpperCase() === "PENDING";

const getPromoCode = customer =>
  customer?.promoCode || customer?.promo_code || "";

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
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
  });

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data?.error || "Request failed. Please try again.",
    );
  }

  return data;
}

export default function AdminDashboard({ admin, onLogout }) {
  const [activeSection, setActiveSection] = useState("Dashboard");

  const [depositRequests, setDepositRequests] = useState([]);
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositError, setDepositError] = useState("");

  const [withdrawalRequests, setWithdrawalRequests] = useState([]);
  const [withdrawalLoading, setWithdrawalLoading] = useState(false);
  const [withdrawalError, setWithdrawalError] = useState("");

  const [customers, setCustomers] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [customerLoginId, setCustomerLoginId] = useState("");
  const [customerPromoCode, setCustomerPromoCode] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [withdrawalPassword, setWithdrawalPassword] = useState("");
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerCreating, setCustomerCreating] = useState(false);
  const [customerMessage, setCustomerMessage] = useState("");
  const [customerError, setCustomerError] = useState("");

  const [coinCustomerId, setCoinCustomerId] = useState("");
  const [coinAmount, setCoinAmount] = useState("");
  const [coinMessage, setCoinMessage] = useState("");
  const [coinBusy, setCoinBusy] = useState(false);

  const [coinHistory, setCoinHistory] = useState(() => {
    try {
      const parsed = JSON.parse(
        localStorage.getItem(COIN_HISTORY_KEY) || "[]",
      );

      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [whatsappNumber, setWhatsappNumber] = useState(
    DEFAULT_WHATSAPP_NUMBER,
  );
  const [whatsappInput, setWhatsappInput] = useState(
    DEFAULT_WHATSAPP_NUMBER,
  );
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [whatsappError, setWhatsappError] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(
        COIN_HISTORY_KEY,
        JSON.stringify(coinHistory),
      );
    } catch (error) {
      console.error(error);
    }
  }, [coinHistory]);

  const loadDepositRequests = async () => {
    setDepositLoading(true);
    setDepositError("");

    try {
      const data = await requestJson(
        "/api/admin/demo-deposits",
      );

      setDepositRequests(
        Array.isArray(data.requests) ? data.requests : [],
      );
    } catch (error) {
      setDepositError(error.message);
    } finally {
      setDepositLoading(false);
    }
  };

  const loadWithdrawalRequests = async () => {
    setWithdrawalLoading(true);
    setWithdrawalError("");

    try {
      const data = await requestJson(
        "/api/admin/demo-withdrawals",
      );

      setWithdrawalRequests(
        Array.isArray(data.requests) ? data.requests : [],
      );
    } catch (error) {
      setWithdrawalError(error.message);
    } finally {
      setWithdrawalLoading(false);
    }
  };

  const loadCustomers = async () => {
    setCustomerLoading(true);
    setCustomerError("");

    try {
      const data = await requestJson("/api/admin/customers");

      setCustomers(
        Array.isArray(data.customers) ? data.customers : [],
      );
    } catch (error) {
      setCustomerError(error.message);
    } finally {
      setCustomerLoading(false);
    }
  };

  const loadWhatsAppNumber = async () => {
    setWhatsappLoading(true);
    setWhatsappError("");
    setWhatsappMessage("");

    try {
      const data = await requestJson(
        "/api/admin/settings/whatsapp",
      );

      const number = String(
        data.whatsappNumber || DEFAULT_WHATSAPP_NUMBER,
      ).replace(/\D/g, "");

      setWhatsappNumber(number);
      setWhatsappInput(number);
    } catch (error) {
      setWhatsappError(error.message);
    } finally {
      setWhatsappLoading(false);
    }
  };

  useEffect(() => {
    if (
      [
        "Dashboard",
        "Pending Deposits",
        "Transaction History",
      ].includes(activeSection)
    ) {
      loadDepositRequests();
    }

    if (
      [
        "Dashboard",
        "Pending Withdrawals",
        "Transaction History",
      ].includes(activeSection)
    ) {
      loadWithdrawalRequests();
    }

    if (
      ["Customers", "Coin Management"].includes(activeSection)
    ) {
      loadCustomers();
    }

    if (activeSection === "WhatsApp Settings") {
      loadWhatsAppNumber();
    }
  }, [activeSection]);

  const saveWhatsAppNumber = async event => {
    event.preventDefault();

    setWhatsappError("");
    setWhatsappMessage("");

    const cleanNumber = String(
      whatsappInput || "",
    ).replace(/\D/g, "");

    if (!/^[1-9][0-9]{9,14}$/.test(cleanNumber)) {
      setWhatsappError(
        "Enter a valid WhatsApp number with country code. Example: 919346824432",
      );
      return;
    }

    if (
      !window.confirm(
        `Change the website WhatsApp number to +${cleanNumber}?`,
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
            whatsappNumber: cleanNumber,
          }),
        },
      );

      const savedNumber = String(
        data.whatsappNumber || cleanNumber,
      ).replace(/\D/g, "");

      setWhatsappNumber(savedNumber);
      setWhatsappInput(savedNumber);
      setWhatsappMessage(
        `WhatsApp number updated successfully to +${savedNumber}.`,
      );
    } catch (error) {
      setWhatsappError(error.message);
    } finally {
      setWhatsappLoading(false);
    }
  };

  const createCustomer = async event => {
    event.preventDefault();

    if (customerCreating) return;

    setCustomerError("");
    setCustomerMessage("");

    const cleanName = customerName.trim();
    const cleanLoginId = customerLoginId.trim().toLowerCase();
    const cleanPromoCode = customerPromoCode.trim().toUpperCase();

    if (!cleanName) {
      setCustomerError("Customer Name is required.");
      return;
    }

    if (!/^[a-z0-9._-]{4,30}$/.test(cleanLoginId)) {
      setCustomerError(
        "Login ID must contain 4–30 letters, numbers, dots, underscores or hyphens.",
      );
      return;
    }

    if (!/^[A-Z0-9_-]{4,30}$/.test(cleanPromoCode)) {
      setCustomerError(
        "Promo Code must contain 4–30 letters, numbers, underscores or hyphens.",
      );
      return;
    }

    if (
      customers.some(
        customer =>
          getPromoCode(customer).toUpperCase() ===
          cleanPromoCode,
      )
    ) {
      setCustomerError(
        "This Promo Code is already assigned. Enter a different code.",
      );
      return;
    }

    if (loginPassword.length < 6) {
      setCustomerError(
        "Login Password must contain at least 6 characters.",
      );
      return;
    }

    if (withdrawalPassword.length < 6) {
      setCustomerError(
        "Withdrawal Password must contain at least 6 characters.",
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
      const data = await requestJson("/api/admin/customers", {
        method: "POST",
        body: JSON.stringify({
          name: cleanName,
          loginId: cleanLoginId,
          promoCode: cleanPromoCode,
          temporaryPassword: loginPassword,
          temporaryWithdrawalPassword: withdrawalPassword,
        }),
      });

      const savedPromo = getPromoCode(data.customer);

      setCustomerName("");
      setCustomerLoginId("");
      setCustomerPromoCode("");
      setLoginPassword("");
      setWithdrawalPassword("");

      await loadCustomers();

      if (savedPromo.toUpperCase() === cleanPromoCode) {
        setCustomerMessage(
          `Customer ${cleanLoginId} created successfully. Promo Code: ${savedPromo}`,
        );
      } else {
        setCustomerError(
          `Customer ${cleanLoginId} was created, but the server did not confirm the Promo Code. Complete the backend update before creating another customer.`,
        );
      }
    } catch (error) {
      setCustomerError(error.message);
    } finally {
      setCustomerCreating(false);
    }
  };

  const resetLoginPassword = async customer => {
    const temporaryPassword = window.prompt(
      `Enter NEW temporary Login Password for ${customer.loginId}`,
    );

    if (!temporaryPassword) return;

    if (temporaryPassword.length < 6) {
      window.alert(
        "Temporary Login Password must contain at least 6 characters.",
      );
      return;
    }

    try {
      await requestJson(
        `/api/admin/customers/${customer.id}/reset-login-password`,
        {
          method: "POST",
          body: JSON.stringify({ temporaryPassword }),
        },
      );

      window.alert(
        "Temporary Login Password reset successfully.",
      );

      await loadCustomers();
    } catch (error) {
      window.alert(error.message);
    }
  };

  const resetWithdrawalPassword = async customer => {
    const temporaryWithdrawalPassword = window.prompt(
      `Enter NEW temporary Withdrawal Password for ${customer.loginId}`,
    );

    if (!temporaryWithdrawalPassword) return;

    if (temporaryWithdrawalPassword.length < 6) {
      window.alert(
        "Temporary Withdrawal Password must contain at least 6 characters.",
      );
      return;
    }

    try {
      await requestJson(
        `/api/admin/customers/${customer.id}/reset-withdrawal-password`,
        {
          method: "POST",
          body: JSON.stringify({
            temporaryWithdrawalPassword,
          }),
        },
      );

      window.alert(
        "Temporary Withdrawal Password reset successfully.",
      );

      await loadCustomers();
    } catch (error) {
      window.alert(error.message);
    }
  };

  const pendingDeposits = useMemo(
    () => depositRequests.filter(isPending).length,
    [depositRequests],
  );

  const pendingWithdrawals = useMemo(
    () => withdrawalRequests.filter(isPending).length,
    [withdrawalRequests],
  );

  const updateDepositStatus = async (
    requestId,
    nextStatus,
  ) => {
    try {
      await requestJson(
        `/api/admin/demo-deposits/${encodeURIComponent(
          requestId,
        )}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: nextStatus }),
        },
      );

      await loadDepositRequests();
      return true;
    } catch (error) {
      window.alert(error.message);
      return false;
    }
  };

  const reviewDeposit = async (
    requestId,
    nextStatus,
  ) => {
    const request = depositRequests.find(
      item => item.id === requestId,
    );

    if (!request) {
      window.alert("Deposit request not found.");
      return;
    }

    if (!isPending(request)) {
      window.alert("This request has already been reviewed.");
      return;
    }

    const question =
      nextStatus === "APPROVED"
        ? `Approve ₹${money(request.amount)} deposit request?`
        : "Reject this deposit request?";

    if (!window.confirm(question)) return;

    if (await updateDepositStatus(requestId, nextStatus)) {
      window.alert(
        `Deposit request changed to ${nextStatus}.`,
      );
    }
  };

  const updateWithdrawalStatus = async (
    requestId,
    nextStatus,
  ) => {
    setWithdrawalError("");

    try {
      await requestJson(
        `/api/admin/demo-withdrawals/${encodeURIComponent(
          requestId,
        )}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: nextStatus }),
        },
      );

      await loadWithdrawalRequests();
      return true;
    } catch (error) {
      setWithdrawalError(error.message);
      window.alert(error.message);
      return false;
    }
  };

  const reviewWithdrawal = async (
    requestId,
    nextStatus,
  ) => {
    const request = withdrawalRequests.find(
      item => item.id === requestId,
    );

    if (!request) {
      window.alert("Withdrawal request not found.");
      return;
    }

    if (!isPending(request)) {
      window.alert(
        "This withdrawal request has already been reviewed.",
      );
      return;
    }

    const action =
      nextStatus === "APPROVED" ? "Approve" : "Reject";

    if (
      !window.confirm(
        `${action} ${money(request.amount)} coins withdrawal request?`,
      )
    ) {
      return;
    }

    if (
      await updateWithdrawalStatus(requestId, nextStatus)
    ) {
      window.alert(
        `Withdrawal request changed to ${nextStatus}.`,
      );
    }
  };

  const changeDemoCoins = async mode => {
    if (coinBusy) return;

    setCoinMessage("");

    if (!coinCustomerId) {
      setCoinMessage("Select customer first.");
      return;
    }

    const amount = Number(coinAmount);

    if (!Number.isSafeInteger(amount) || amount <= 0) {
      setCoinMessage(
        "Enter a valid whole-number Coin amount.",
      );
      return;
    }

    const customer = customers.find(
      item => String(item.id) === String(coinCustomerId),
    );

    if (!customer) {
      setCoinMessage("Selected customer was not found.");
      return;
    }

    if (mode !== "ADD") {
      setCoinMessage("Remove Coins is not available yet.");
      return;
    }

    setCoinBusy(true);

    try {
      const data = await requestJson(
        `/api/admin/customers/${customer.id}/add-demo-coins`,
        {
          method: "POST",
          body: JSON.stringify({
            amount,
            note: "Coins added by Admin",
          }),
        },
      );

      const nextBalance = Number(
        data.customer?.demo_coin_balance ??
          data.customer?.demoCoinBalance ??
          0,
      );

      const record = {
        id: Date.now(),
        customerId: customer.id,
        loginId: customer.loginId,
        customerName: customer.name || customer.loginId,
        type: "ADD",
        amount,
        balance: nextBalance,
        date: new Date().toLocaleString("en-IN"),
      };

      setCoinHistory(previous => [record, ...previous]);
      setCoinAmount("");

      setCoinMessage(
        `${money(amount)} Coins added to ${customer.name}. New balance: ${money(nextBalance)}`,
      );
    } catch (error) {
      setCoinMessage(error.message);
    } finally {
      setCoinBusy(false);
    }
  };

  const adminBoxes = [
    { title: "Deposit Accounts", icon: "🏦" },
    { title: "Coin Management", icon: "🪙" },
    { title: "Customers", icon: "👥" },
    { title: "WhatsApp Settings", icon: "📱" },
    { title: "API Settings", icon: "🔌" },
    { title: "Transaction History", icon: "📒" },
    { title: "Admin Settings", icon: "⚙️" },
  ];

  const goBack = () => setActiveSection("Dashboard");

  if (activeSection === "Deposit Accounts") {
    return <AdminPaymentSettings onBack={goBack} />;
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

      {activeSection === "Dashboard" && (
        <main className="mx-auto max-w-5xl px-3 py-5">
          <h2 className="text-xl font-black">
            Admin Dashboard
          </h2>

          {depositError && (
            <MessageBox text={depositError} error />
          )}

          {withdrawalError && (
            <MessageBox text={withdrawalError} error />
          )}

          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                setActiveSection("Pending Deposits")
              }
              className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-left"
            >
              <span className="text-2xl">📥</span>

              <p className="mt-2 text-2xl font-black text-green-300">
                {depositLoading ? "..." : pendingDeposits}
              </p>

              <p className="text-[9px] font-black">
                PENDING DEPOSITS
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveSection("Pending Withdrawals")
              }
              className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-left"
            >
              <span className="text-2xl">💸</span>

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

      {activeSection === "Pending Deposits" && (
        <AdminPage
          title="Pending Deposits"
          icon="📥"
          onBack={goBack}
        >
          <div className="grid grid-cols-2 gap-2">
            <InfoBox
              label="TOTAL PENDING"
              value={depositLoading ? "..." : pendingDeposits}
            />

            <RefreshButton
              loading={depositLoading}
              onClick={loadDepositRequests}
            />
          </div>

          {depositError && (
            <MessageBox text={depositError} error />
          )}

          {!depositLoading && pendingDeposits === 0 && (
            <EmptyState text="No pending deposits" />
          )}

          <div className="mt-4 space-y-3">
            {depositRequests
              .filter(isPending)
              .map(request => (
                <div
                  key={request.id}
                  className="rounded-xl border border-[#28655f] bg-[#083d37] p-4"
                >
                  <RequestHeading request={request} />

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <InfoBox
                      label="AMOUNT"
                      value={`₹${money(request.amount)}`}
                    />

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

                    <InfoBox
                      label="CUSTOMER ID"
                      value={request.customerId || "—"}
                    />
                  </div>

                  {request.proofName && (
                    <div className="mt-2">
                      <InfoBox
                        label="PROOF FILE"
                        value={request.proofName}
                      />
                    </div>
                  )}

                  <RequestDate value={request.createdAt} />

                  <ReviewButtons
                    onApprove={() =>
                      reviewDeposit(
                        request.id,
                        "APPROVED",
                      )
                    }
                    onReject={() =>
                      reviewDeposit(
                        request.id,
                        "REJECTED",
                      )
                    }
                  />
                </div>
              ))}
          </div>
        </AdminPage>
      )}

      {activeSection === "Pending Withdrawals" && (
        <AdminPage
          title="Pending Withdrawals"
          icon="💸"
          onBack={goBack}
        >
          <div className="grid grid-cols-2 gap-2">
            <InfoBox
              label="TOTAL PENDING"
              value={
                withdrawalLoading
                  ? "..."
                  : pendingWithdrawals
              }
            />

            <RefreshButton
              loading={withdrawalLoading}
              onClick={loadWithdrawalRequests}
            />
          </div>

          {withdrawalError && (
            <MessageBox text={withdrawalError} error />
          )}

          {!withdrawalLoading &&
            pendingWithdrawals === 0 && (
              <EmptyState text="No pending withdrawals" />
            )}

          <div className="mt-4 space-y-3">
            {withdrawalRequests
              .filter(isPending)
              .map(request => (
                <div
                  key={request.id}
                  className="rounded-xl border border-[#28655f] bg-[#083d37] p-4"
                >
                  <RequestHeading request={request} />

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <InfoBox
                      label="REQUESTED COINS"
                      value={money(request.amount)}
                    />

                    <InfoBox
                      label="CUSTOMER ID"
                      value={request.customerId || "—"}
                    />

                    <InfoBox
                      label="ACCOUNT HOLDER"
                      value={request.accountHolderName || "—"}
                    />

                    <InfoBox
                      label="BANK NAME"
                      value={request.bankName || "—"}
                    />

                    <InfoBox
                      label="ACCOUNT NUMBER"
                      value={request.accountNumber || "—"}
                    />

                    <InfoBox
                      label="IFSC CODE"
                      value={request.ifscCode || "—"}
                    />
                  </div>

                  <RequestDate value={request.createdAt} />

                  <ReviewButtons
                    onApprove={() =>
                      reviewWithdrawal(
                        request.id,
                        "APPROVED",
                      )
                    }
                    onReject={() =>
                      reviewWithdrawal(
                        request.id,
                        "REJECTED",
                      )
                    }
                  />
                </div>
              ))}
          </div>
        </AdminPage>
      )}

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
                  setCustomerName(event.target.value)
                }
              />

              <CustomerInput
                label="LOGIN ID"
                value={customerLoginId}
                onChange={event =>
                  setCustomerLoginId(event.target.value)
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
                Assign a unique Promo Code to this customer.
                Use 4–30 letters, numbers, underscores or
                hyphens.
              </p>

              <CustomerInput
                label="LOGIN PASSWORD"
                type="password"
                value={loginPassword}
                onChange={event =>
                  setLoginPassword(event.target.value)
                }
              />

              <CustomerInput
                label="WITHDRAWAL PASSWORD"
                type="password"
                value={withdrawalPassword}
                onChange={event =>
                  setWithdrawalPassword(event.target.value)
                }
              />
            </fieldset>

            {customerError && (
              <MessageBox text={customerError} error />
            )}

            {customerMessage && (
              <MessageBox text={customerMessage} />
            )}

            <button
              type="submit"
              disabled={customerCreating || customerLoading}
              className="mt-4 h-[46px] w-full rounded-lg bg-amber-500 text-[10px] font-black text-black disabled:opacity-50"
            >
              {customerCreating
                ? "PLEASE WAIT..."
                : "CREATE CUSTOMER"}
            </button>
          </form>

          <div className="mt-5">
            <RefreshButton
              loading={customerLoading || customerCreating}
              onClick={loadCustomers}
            />
          </div>

          <div className="mt-5 space-y-3">
            {customers.length === 0 && !customerLoading && (
              <EmptyState text="No customers found" />
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
                      {customer.loginId}
                    </p>
                  </div>

                  <StatusBadge status={customer.status} />
                </div>

                <div className="mt-3 space-y-2">
                  <InfoBox
                    label="PROMO CODE"
                    value={
                      getPromoCode(customer) || "NOT ASSIGNED"
                    }
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
                      resetLoginPassword(customer)
                    }
                    className="min-h-[42px] rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 text-[8px] font-black text-amber-300"
                  >
                    RESET LOGIN PASSWORD
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      resetWithdrawalPassword(customer)
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
              Change the WhatsApp contact used by the website.
              Customers will receive the current saved number
              from the server.
            </p>

            <div className="mt-4">
              <InfoBox
                label="CURRENT WHATSAPP NUMBER"
                value={
                  whatsappLoading
                    ? "Loading..."
                    : `+${
                        whatsappNumber ||
                        DEFAULT_WHATSAPP_NUMBER
                      }`
                }
              />
            </div>

            <form
              onSubmit={saveWhatsAppNumber}
              className="mt-4"
            >
              <label className="block">
                <span className="text-[8px] font-black text-gray-400">
                  NEW WHATSAPP NUMBER
                </span>

                <input
                  type="tel"
                  inputMode="numeric"
                  value={whatsappInput}
                  disabled={whatsappLoading}
                  onChange={event =>
                    setWhatsappInput(
                      event.target.value.replace(/\D/g, ""),
                    )
                  }
                  placeholder="Example: 919346824432"
                  autoComplete="off"
                  className="mt-2 h-[50px] w-full rounded-lg border border-green-500/30 bg-[#061c1a] px-3 text-sm font-bold text-white outline-none focus:border-green-400 disabled:opacity-50"
                />
              </label>

              <p className="mt-2 text-[8px] leading-4 text-gray-500">
                Enter country code + mobile number without
                spaces. Example: 919346824432
              </p>

              {whatsappError && (
                <MessageBox text={whatsappError} error />
              )}

              {whatsappMessage && (
                <MessageBox text={whatsappMessage} />
              )}

              <button
                type="submit"
                disabled={whatsappLoading}
                className="mt-4 h-[48px] w-full rounded-lg bg-[#20c968] text-[10px] font-black text-white disabled:opacity-50"
              >
                {whatsappLoading
                  ? "PLEASE WAIT..."
                  : "SAVE WHATSAPP NUMBER"}
              </button>
            </form>
          </div>

          <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-[9px] font-black text-amber-300">
              IMPORTANT
            </p>

            <p className="mt-2 text-[8px] leading-5 text-gray-400">
              Saving here updates the global website contact in
              the database. The customer WhatsApp button must
              use the public settings API.
            </p>
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

            <label className="mt-4 block text-[8px] font-black text-gray-400">
              CUSTOMER
            </label>

            <select
              value={coinCustomerId}
              disabled={coinBusy}
              onChange={event =>
                setCoinCustomerId(event.target.value)
              }
              className="mt-2 h-[46px] w-full rounded-lg border border-[#28655f] bg-[#061c1a] px-3 text-xs text-white"
            >
              <option value="">Select Customer</option>

              {customers.map(customer => (
                <option
                  key={customer.id}
                  value={customer.id}
                >
                  {customer.name} - {customer.loginId}
                </option>
              ))}
            </select>

            {customerError && (
              <MessageBox text={customerError} error />
            )}

            <CustomerInput
              label="COINS"
              type="number"
              value={coinAmount}
              disabled={coinBusy}
              onChange={event =>
                setCoinAmount(event.target.value)
              }
            />

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={coinBusy}
                onClick={() => changeDemoCoins("ADD")}
                className="h-[46px] rounded-lg bg-green-700 text-[10px] font-black disabled:opacity-50"
              >
                {coinBusy ? "PLEASE WAIT..." : "+ ADD COINS"}
              </button>

              <button
                type="button"
                disabled={coinBusy}
                onClick={() => changeDemoCoins("REMOVE")}
                className="h-[46px] rounded-lg bg-red-700 text-[10px] font-black disabled:opacity-50"
              >
                − REMOVE COINS
              </button>
            </div>

            {coinMessage && (
              <MessageBox text={coinMessage} />
            )}
          </div>

          <p className="mt-5 text-[10px] font-black text-amber-300">
            RECENT COIN ACTIVITY
          </p>

          <div className="mt-3 space-y-2">
            {coinHistory.length === 0 ? (
              <EmptyState text="No coin activity yet" />
            ) : (
              coinHistory.slice(0, 20).map(item => (
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
                        {item.customerId}
                      </p>
                    </div>

                    <span
                      className={
                        item.type === "ADD"
                          ? "text-green-300"
                          : "text-red-300"
                      }
                    >
                      {item.type === "ADD" ? "+" : "-"}
                      {money(item.amount)}
                    </span>
                  </div>

                  <p className="mt-2 text-[7px] text-gray-500">
                    {item.date}
                  </p>
                </div>
              ))
            )}
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
                depositLoading ? "..." : depositRequests.length
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
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
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

          <p className="mt-5 text-[10px] font-black text-amber-300">
            DEPOSIT HISTORY
          </p>

          {depositError && (
            <MessageBox text={depositError} error />
          )}

          <div className="mt-3 space-y-2">
            {!depositLoading && depositRequests.length === 0 ? (
              <EmptyState text="No deposit history" />
            ) : (
              depositRequests.map(item => (
                <div
                  key={item.id}
                  className="rounded-lg border border-[#28655f] bg-[#083d37] p-3"
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="text-[9px] font-black">
                        ₹{money(item.amount)}
                      </p>

                      <p className="mt-1 text-[8px] text-gray-400">
                        {item.customerName || "Customer"}
                      </p>

                      <p className="mt-1 text-[8px] text-amber-300">
                        {item.loginId || item.customerId || "—"}
                      </p>
                    </div>

                    <StatusBadge status={item.status} />
                  </div>

                  <p className="mt-2 break-all text-[8px] text-gray-500">
                    UTR:{" "}
                    {item.referenceNumber ||
                      item.reference ||
                      "—"}
                  </p>

                  {item.createdAt && (
                    <p className="mt-1 text-[7px] text-gray-500">
                      {new Date(
                        item.createdAt,
                      ).toLocaleString("en-IN")}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>

          <p className="mt-6 text-[10px] font-black text-amber-300">
            WITHDRAWAL HISTORY
          </p>

          {withdrawalError && (
            <MessageBox text={withdrawalError} error />
          )}

          <div className="mt-3 space-y-2">
            {!withdrawalLoading &&
            withdrawalRequests.length === 0 ? (
              <EmptyState text="No withdrawal history" />
            ) : (
              withdrawalRequests.map(item => (
                <div
                  key={item.id}
                  className="rounded-lg border border-[#28655f] bg-[#083d37] p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[9px] font-black">
                        {money(item.amount)} COINS
                      </p>

                      <p className="mt-1 text-[8px] text-gray-400">
                        {item.customerName || "Customer"}
                      </p>

                      <p className="mt-1 text-[8px] text-amber-300">
                        {item.loginId || item.customerId || "—"}
                      </p>

                      <p className="mt-2 text-[8px] text-gray-500">
                        {item.bankName || "—"} •{" "}
                        {item.accountNumber || "—"}
                      </p>

                      <p className="mt-1 text-[8px] text-gray-500">
                        IFSC: {item.ifscCode || "—"}
                      </p>

                      {item.createdAt && (
                        <p className="mt-1 text-[7px] text-gray-500">
                          {new Date(
                            item.createdAt,
                          ).toLocaleString("en-IN")}
                        </p>
                      )}
                    </div>

                    <StatusBadge status={item.status} />
                  </div>
                </div>
              ))
            )}
          </div>
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
          <span className="text-3xl">{icon}</span>

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
    ["APPROVED", "ACTIVE", "SUCCESS"].includes(value)
  ) {
    style =
      "border-green-500/30 bg-green-500/10 text-green-300";
  }

  if (["REJECTED", "REJECT"].includes(value)) {
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
          {request.loginId || `ID: ${request.customerId}`}
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
        value={new Date(value).toLocaleString("en-IN")}
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
