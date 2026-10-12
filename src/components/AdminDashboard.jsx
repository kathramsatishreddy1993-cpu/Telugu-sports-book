import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import AdminPaymentSettings from './AdminPaymentSettings';

const DEPOSIT_KEY =
  'telugu_sports_demo_deposits';

const WITHDRAWAL_KEY =
  'telugu_sports_demo_withdrawals';

const CUSTOMER_BALANCE_KEY =
  'telugu_sports_demo_balance';

export default function AdminDashboard({
  admin,
  onLogout,
}) {
  const [activeSection, setActiveSection] =
    useState('Dashboard');

  const [depositRequests] = useState(() => {
    try {
      const saved =
        localStorage.getItem(DEPOSIT_KEY);

      const parsed = saved
        ? JSON.parse(saved)
        : [];

      return Array.isArray(parsed)
        ? parsed
        : [];
    } catch {
      return [];
    }
  });

  const [
    withdrawalRequests,
    setWithdrawalRequests,
  ] = useState(() => {
    try {
      const saved =
        localStorage.getItem(
          WITHDRAWAL_KEY
        );

      const parsed = saved
        ? JSON.parse(saved)
        : [];

      return Array.isArray(parsed)
        ? parsed
        : [];
    } catch {
      return [];
    }
  });

  /* =====================================================
     CUSTOMER DATABASE STATE
  ===================================================== */

  const [customers, setCustomers] =
    useState([]);

  const [customerName, setCustomerName] =
    useState('');

  const [
    customerLoginId,
    setCustomerLoginId,
  ] = useState('');

  const [
    loginPassword,
    setLoginPassword,
  ] = useState('');

  const [
    withdrawalPassword,
    setWithdrawalPassword,
  ] = useState('');

  const [
    customerLoading,
    setCustomerLoading,
  ] = useState(false);

  const [
    customerMessage,
    setCustomerMessage,
  ] = useState('');

  const [
    customerError,
    setCustomerError,
  ] = useState('');

  const [
    resetLoadingId,
    setResetLoadingId,
  ] = useState(null);

  /* =====================================================
     SAVE WITHDRAWALS
  ===================================================== */

  useEffect(() => {
    try {
      localStorage.setItem(
        WITHDRAWAL_KEY,
        JSON.stringify(
          withdrawalRequests
        )
      );
    } catch (error) {
      console.error(
        'Unable to save withdrawal requests:',
        error
      );
    }
  }, [withdrawalRequests]);

  /* =====================================================
     LOAD CUSTOMERS
  ===================================================== */

  const loadCustomers = async () => {
    try {
      setCustomerLoading(true);
      setCustomerError('');

      const response = await fetch(
        '/api/admin/customers'
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            'Unable to load customers.'
        );
      }

      setCustomers(
        Array.isArray(data?.customers)
          ? data.customers
          : []
      );
    } catch (error) {
      console.error(
        'Load Customers Error:',
        error
      );

      setCustomerError(
        error.message ||
          'Unable to load customers.'
      );
    } finally {
      setCustomerLoading(false);
    }
  };

  useEffect(() => {
    if (
      activeSection === 'Customers'
    ) {
      loadCustomers();
    }
  }, [activeSection]);

  /* =====================================================
     CREATE CUSTOMER
  ===================================================== */

  const createCustomer = async (
    event
  ) => {
    event.preventDefault();

    setCustomerError('');
    setCustomerMessage('');

    const cleanName =
      customerName.trim();

    const cleanLoginId =
      customerLoginId
        .trim()
        .toLowerCase();

    if (!cleanName) {
      setCustomerError(
        'Customer Name is required.'
      );
      return;
    }

    if (!cleanLoginId) {
      setCustomerError(
        'Login ID is required.'
      );
      return;
    }

    if (
      !/^[a-z0-9._-]{4,30}$/.test(
        cleanLoginId
      )
    ) {
      setCustomerError(
        'Login ID must be 4-30 characters. Use letters, numbers, dot, underscore or hyphen only.'
      );
      return;
    }

    if (
      loginPassword.length < 6
    ) {
      setCustomerError(
        'Login Password must contain at least 6 characters.'
      );
      return;
    }

    if (
      withdrawalPassword.length < 6
    ) {
      setCustomerError(
        'Withdrawal Password must contain at least 6 characters.'
      );
      return;
    }

    if (
      loginPassword ===
      withdrawalPassword
    ) {
      setCustomerError(
        'Login Password and Withdrawal Password must be different.'
      );
      return;
    }

    try {
      setCustomerLoading(true);

      const response = await fetch(
        '/api/admin/customers',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            name: cleanName,
            loginId: cleanLoginId,

            temporaryPassword:
              loginPassword,

            temporaryWithdrawalPassword:
              withdrawalPassword,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            'Unable to create customer.'
        );
      }

      setCustomerMessage(
        `Customer ${cleanLoginId} created successfully.`
      );

      setCustomerName('');
      setCustomerLoginId('');
      setLoginPassword('');
      setWithdrawalPassword('');

      await loadCustomers();
    } catch (error) {
      console.error(
        'Create Customer Error:',
        error
      );

      setCustomerError(
        error.message ||
          'Unable to create customer.'
      );
    } finally {
      setCustomerLoading(false);
    }
  };

  /* =====================================================
     RESET LOGIN PASSWORD
  ===================================================== */

  const resetLoginPassword = async (
    customer
  ) => {
    setCustomerError('');
    setCustomerMessage('');

    const temporaryPassword =
      window.prompt(
        `Enter a NEW temporary Login Password for ${customer.loginId}.\n\nMinimum 6 characters.`
      );

    if (
      temporaryPassword === null
    ) {
      return;
    }

    if (
      temporaryPassword.length < 6
    ) {
      setCustomerError(
        'Temporary Login Password must contain at least 6 characters.'
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Reset Login Password for ${customer.loginId}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setResetLoadingId(
        `login-${customer.id}`
      );

      const response = await fetch(
        `/api/admin/customers/${customer.id}/reset-login-password`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            temporaryPassword,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            'Unable to reset Login Password.'
        );
      }

      setCustomerMessage(
        `Login Password reset successfully for ${customer.loginId}. Customer must change the temporary password after login.`
      );

      await loadCustomers();
    } catch (error) {
      console.error(
        'Reset Login Password Error:',
        error
      );

      setCustomerError(
        error.message ||
          'Unable to reset Login Password.'
      );
    } finally {
      setResetLoadingId(null);
    }
  };

  /* =====================================================
     RESET WITHDRAWAL PASSWORD
  ===================================================== */

  const resetWithdrawalPassword =
    async (customer) => {
      setCustomerError('');
      setCustomerMessage('');

      const temporaryPassword =
        window.prompt(
          `Enter a NEW temporary Withdrawal Password for ${customer.loginId}.\n\nMinimum 6 characters.`
        );

      if (
        temporaryPassword === null
      ) {
        return;
      }

      if (
        temporaryPassword.length < 6
      ) {
        setCustomerError(
          'Temporary Withdrawal Password must contain at least 6 characters.'
        );
        return;
      }

      const confirmed =
        window.confirm(
          `${
            customer.withdrawalPasswordConfigured
              ? 'Reset'
              : 'Configure'
          } Withdrawal Password for ${customer.loginId}?`
        );

      if (!confirmed) {
        return;
      }

      try {
        setResetLoadingId(
          `withdrawal-${customer.id}`
        );

        const response =
          await fetch(
            `/api/admin/customers/${customer.id}/reset-withdrawal-password`,
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body: JSON.stringify({
                temporaryWithdrawalPassword:
                  temporaryPassword,
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
              'Unable to reset Withdrawal Password.'
          );
        }

        setCustomerMessage(
          `Withdrawal Password ${
            customer.withdrawalPasswordConfigured
              ? 'reset'
              : 'configured'
          } successfully for ${customer.loginId}. Customer must change the temporary password.`
        );

        await loadCustomers();
      } catch (error) {
        console.error(
          'Reset Withdrawal Password Error:',
          error
        );

        setCustomerError(
          error.message ||
            'Unable to reset Withdrawal Password.'
        );
      } finally {
        setResetLoadingId(null);
      }
    };

  /* =====================================================
     COUNTS
  ===================================================== */

  const pendingDeposits =
    useMemo(() => {
      return depositRequests.filter(
        (item) =>
          String(
            item?.status || ''
          ).toUpperCase() ===
          'PENDING'
      ).length;
    }, [depositRequests]);

  const pendingWithdrawals =
    useMemo(() => {
      return withdrawalRequests.filter(
        (item) =>
          String(
            item?.status || ''
          ).toUpperCase() ===
          'PENDING'
      ).length;
    }, [withdrawalRequests]);

  /* =====================================================
     ADMIN BOXES
  ===================================================== */

  const adminBoxes = [
    {
      title: 'Deposit Accounts',
      icon: '🏦',
      section: 'Deposit Accounts',
      description:
        'Bank, PhonePe, GPay and Paytm deposit details',
    },

    {
      title: 'Coin Management',
      icon: '🪙',
      section: 'Coin Management',
      description:
        'Demo coin management information',
    },

    {
      title: 'Customers',
      icon: '👥',
      section: 'Customers',
      description:
        'Create and manage customer login IDs',
    },

    {
      title: 'API Settings',
      icon: '🔌',
      section: 'API Settings',
      description:
        'Sports API and Game API configuration',
    },

    {
      title: 'Transaction History',
      icon: '📒',
      section: 'Transaction History',
      description:
        'View demo transaction activity',
    },

    {
      title: 'Admin Settings',
      icon: '⚙️',
      section: 'Admin Settings',
      description:
        'Admin account and panel settings',
    },
  ];

  /* =====================================================
     APPROVE WITHDRAWAL
  ===================================================== */

  const approveWithdrawal = (
    requestId
  ) => {
    const request =
      withdrawalRequests.find(
        (item) =>
          item?.id === requestId
      );

    if (!request) {
      alert(
        'Withdrawal request not found.'
      );
      return;
    }

    if (
      String(
        request.status
      ).toUpperCase() !== 'PENDING'
    ) {
      alert(
        'This request has already been reviewed.'
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Approve ${Number(
          request.amount || 0
        ).toLocaleString(
          'en-IN'
        )} demo coin withdrawal?`
      );

    if (!confirmed) {
      return;
    }

    const reviewedAt =
      new Date().toISOString();

    const reviewedDate =
      new Date().toLocaleString(
        'en-IN'
      );

    setWithdrawalRequests(
      (previous) =>
        previous.map((item) => {
          if (
            item?.id !== requestId
          ) {
            return item;
          }

          return {
            ...item,
            status: 'APPROVED',
            reviewedAt,
            reviewedDate,
          };
        })
    );

    alert(
      'Demo withdrawal status changed to APPROVED.'
    );
  };

  /* =====================================================
     REJECT WITHDRAWAL
  ===================================================== */

  const rejectWithdrawal = (
    requestId
  ) => {
    const request =
      withdrawalRequests.find(
        (item) =>
          item?.id === requestId
      );

    if (!request) {
      alert(
        'Withdrawal request not found.'
      );
      return;
    }

    if (
      String(
        request.status
      ).toUpperCase() !== 'PENDING'
    ) {
      alert(
        'This request has already been reviewed.'
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Reject ${Number(
          request.amount || 0
        ).toLocaleString(
          'en-IN'
        )} demo coin withdrawal and restore held demo coins?`
      );

    if (!confirmed) {
      return;
    }

    const amount =
      Number(
        request.coinsHeld ??
          request.amount ??
          0
      );

    let restored = false;

    if (
      Number.isFinite(amount) &&
      amount > 0 &&
      request.coinsRestored !== true
    ) {
      try {
        const currentBalance =
          Number(
            localStorage.getItem(
              CUSTOMER_BALANCE_KEY
            ) || 0
          );

        const safeBalance =
          Number.isFinite(
            currentBalance
          )
            ? currentBalance
            : 0;

        const nextBalance =
          safeBalance + amount;

        localStorage.setItem(
          CUSTOMER_BALANCE_KEY,
          String(nextBalance)
        );

        restored = true;

        window.dispatchEvent(
          new CustomEvent(
            'tsb-demo-balance-updated',
            {
              detail: {
                balance:
                  nextBalance,
              },
            }
          )
        );
      } catch (error) {
        console.error(error);

        alert(
          'Unable to restore demo coins.'
        );

        return;
      }
    }

    const reviewedAt =
      new Date().toISOString();

    const reviewedDate =
      new Date().toLocaleString(
        'en-IN'
      );

    setWithdrawalRequests(
      (previous) =>
        previous.map((item) => {
          if (
            item?.id !== requestId
          ) {
            return item;
          }

          return {
            ...item,
            status: 'REJECTED',
            reviewedAt,
            reviewedDate,
            coinsRestored:
              restored ||
              item.coinsRestored ===
                true,
          };
        })
    );

    alert(
      restored
        ? 'Withdrawal REJECTED. Held demo coins restored.'
        : 'Withdrawal status changed to REJECTED.'
    );
  };

  /* =====================================================
     DEPOSIT ACCOUNTS
  ===================================================== */

  if (
    activeSection ===
    'Deposit Accounts'
  ) {
    return (
      <AdminPaymentSettings
        onBack={() =>
          setActiveSection(
            'Dashboard'
          )
        }
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#061c1a] text-white">

      <header className="sticky top-0 z-50 border-b border-amber-500/30 bg-[#9a5a00] px-4 py-4 shadow-xl">

        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">

          <div>
            <p className="text-[9px] font-black tracking-[0.16em] text-amber-200">
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
              {admin?.username ||
                'admin'}
            </p>
          </div>

        </div>

      </header>

      {/* DASHBOARD */}

      {activeSection ===
        'Dashboard' && (

        <main className="mx-auto max-w-5xl px-3 py-5">

          <section className="mb-5">

            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-400">
              MANAGEMENT
            </p>

            <h2 className="mt-1 text-xl font-black">
              Admin Dashboard
            </h2>

            <p className="mt-2 text-[10px] leading-5 text-gray-400">
              Customer management,
              deposit accounts, demo
              requests and API controls.
            </p>

          </section>

          <section className="mb-5 grid grid-cols-2 gap-2">

            <button
              type="button"
              onClick={() =>
                setActiveSection(
                  'Pending Deposits'
                )
              }
              className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-left"
            >

              <div className="flex items-center justify-between">

                <span className="text-2xl">
                  📥
                </span>

                <span className="text-2xl font-black text-green-300">
                  {pendingDeposits}
                </span>

              </div>

              <p className="mt-3 text-[10px] font-black">
                PENDING DEPOSITS
              </p>

            </button>

            <button
              type="button"
              onClick={() =>
                setActiveSection(
                  'Pending Withdrawals'
                )
              }
              className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-left"
            >

              <div className="flex items-center justify-between">

                <span className="text-2xl">
                  💸
                </span>

                <span className="text-2xl font-black text-red-300">
                  {pendingWithdrawals}
                </span>

              </div>

              <p className="mt-3 text-[10px] font-black">
                PENDING WITHDRAWALS
              </p>

            </button>

          </section>

          <section>

            <h3 className="mb-3 text-xs font-black text-amber-300">
              ADMIN MANAGEMENT
            </h3>

            <div className="grid grid-cols-2 gap-3">

              {adminBoxes.map(
                (item) => (

                  <button
                    key={item.title}
                    type="button"
                    onClick={() =>
                      setActiveSection(
                        item.section
                      )
                    }
                    className="relative min-h-[145px] rounded-xl border border-[#28655f] bg-[#083d37] p-4 text-left shadow-lg"
                  >

                    <span className="block text-3xl">
                      {item.icon}
                    </span>

                    <p className="mt-4 text-[11px] font-black">
                      {item.title}
                    </p>

                    <p className="mt-2 text-[8px] leading-4 text-gray-400">
                      {item.description}
                    </p>

                    <span className="absolute bottom-3 right-3 text-lg text-amber-300">
                      ›
                    </span>

                  </button>

                )
              )}

            </div>

          </section>

          <button
            type="button"
            onClick={onLogout}
            className="mt-6 h-[46px] w-full rounded-lg border border-red-500/50 bg-red-700 text-xs font-black"
          >
            ADMIN LOGOUT
          </button>

          <p className="px-4 py-6 text-center text-[8px] leading-4 text-gray-500">
            Demo administration
            interface. No real-money
            transactions or automatic
            payouts.
          </p>

        </main>

      )}

      {/* CUSTOMERS */}

      {activeSection ===
        'Customers' && (

        <AdminPage
          title="Customers"
          icon="👥"
          onBack={() =>
            setActiveSection(
              'Dashboard'
            )
          }
        >

          <form
            onSubmit={createCustomer}
            className="rounded-xl border border-amber-500/30 bg-black/10 p-4"
          >

            <p className="text-xs font-black text-amber-300">
              CREATE CUSTOMER ID
            </p>

            <p className="mt-2 text-[9px] leading-4 text-gray-400">
              Create a unique Login ID,
              Login Password and
              Withdrawal Password.
              Customer changes both
              passwords after first
              login.
            </p>

            <div className="mt-4 space-y-3">

              <CustomerInput
                label="CUSTOMER NAME"
                value={customerName}
                onChange={(e) =>
                  setCustomerName(
                    e.target.value
                  )
                }
                placeholder="Enter customer name"
              />

              <CustomerInput
                label="LOGIN ID"
                value={customerLoginId}
                onChange={(e) =>
                  setCustomerLoginId(
                    e.target.value
                  )
                }
                placeholder="Example: satish123"
              />

              <CustomerInput
                label="LOGIN PASSWORD"
                type="password"
                value={loginPassword}
                onChange={(e) =>
                  setLoginPassword(
                    e.target.value
                  )
                }
                placeholder="Minimum 6 characters"
              />

              <CustomerInput
                label="WITHDRAWAL PASSWORD"
                type="password"
                value={
                  withdrawalPassword
                }
                onChange={(e) =>
                  setWithdrawalPassword(
                    e.target.value
                  )
                }
                placeholder="Minimum 6 characters"
              />

            </div>

            {customerError && (
              <div className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-[9px] font-bold text-red-300">
                {customerError}
              </div>
            )}

            {customerMessage && (
              <div className="mt-3 rounded-lg border border-green-500/40 bg-green-500/10 p-3 text-[9px] font-bold text-green-300">
                {customerMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={customerLoading}
              className="mt-4 h-[46px] w-full rounded-lg bg-amber-500 text-[10px] font-black text-black disabled:opacity-50"
            >
              {customerLoading
                ? 'PLEASE WAIT...'
                : 'CREATE CUSTOMER'}
            </button>

          </form>

          <div className="mt-5">

            <div className="flex items-center justify-between">

              <p className="text-xs font-black text-white">
                CUSTOMER LIST
              </p>

              <button
                type="button"
                onClick={loadCustomers}
                disabled={customerLoading}
                className="rounded-md border border-teal-500/40 px-3 py-2 text-[8px] font-black text-teal-300"
              >
                REFRESH
              </button>

            </div>

            {customerLoading &&
            customers.length === 0 ? (

              <EmptyState
                text="Loading customers..."
              />

            ) : customers.length ===
              0 ? (

              <EmptyState
                text="No customers created yet"
              />

            ) : (

              <div className="mt-3 space-y-3">

                {customers.map(
                  (customer) => (

                    <div
                      key={customer.id}
                      className="rounded-xl border border-[#28655f] bg-[#083d37] p-4"
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div>

                          <p className="text-sm font-black">
                            {customer.name}
                          </p>

                          <p className="mt-1 text-[9px] text-gray-400">
                            Login ID:{' '}
                            <span className="font-black text-amber-300">
                              {customer.loginId}
                            </span>
                          </p>

                        </div>

                        <span
                          className={`rounded-full border px-2 py-1 text-[7px] font-black ${
                            String(
                              customer.status
                            ).toUpperCase() ===
                            'ACTIVE'
                              ? 'border-green-500/40 bg-green-500/10 text-green-300'
                              : 'border-red-500/40 bg-red-500/10 text-red-300'
                          }`}
                        >
                          {customer.status}
                        </span>

                      </div>

                      <div className="mt-3 space-y-2">

                        {customer.mustChangePassword ? (

                          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-[8px] font-black text-amber-300">
                            LOGIN PASSWORD CHANGE REQUIRED
                          </div>

                        ) : (

                          <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-[8px] font-black text-green-300">
                            LOGIN PASSWORD SET
                          </div>

                        )}

                        {!customer.withdrawalPasswordConfigured ? (

                          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-[8px] font-black text-red-300">
                            WITHDRAWAL PASSWORD NOT CONFIGURED
                          </div>

                        ) : customer.mustChangeWithdrawalPassword ? (

                          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-[8px] font-black text-amber-300">
                            WITHDRAWAL PASSWORD CHANGE REQUIRED
                          </div>

                        ) : (

                          <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-[8px] font-black text-green-300">
                            WITHDRAWAL PASSWORD SET
                          </div>

                        )}

                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">

                        <button
                          type="button"
                          disabled={
                            resetLoadingId !==
                            null
                          }
                          onClick={() =>
                            resetLoginPassword(
                              customer
                            )
                          }
                          className="min-h-[44px] rounded-lg border border-amber-500/50 bg-amber-500/10 px-2 text-[8px] font-black text-amber-300 disabled:opacity-50"
                        >
                          {resetLoadingId ===
                          `login-${customer.id}`
                            ? 'RESETTING...'
                            : '🔑 RESET LOGIN PASSWORD'}
                        </button>

                        <button
                          type="button"
                          disabled={
                            resetLoadingId !==
                            null
                          }
                          onClick={() =>
                            resetWithdrawalPassword(
                              customer
                            )
                          }
                          className="min-h-[44px] rounded-lg border border-cyan-500/50 bg-cyan-500/10 px-2 text-[8px] font-black text-cyan-300 disabled:opacity-50"
                        >
                          {resetLoadingId ===
                          `withdrawal-${customer.id}`
                            ? 'RESETTING...'
                            : customer.withdrawalPasswordConfigured
                            ? '🔐 RESET WITHDRAWAL PASSWORD'
                            : '🔐 SET WITHDRAWAL PASSWORD'}
                        </button>

                      </div>

                    </div>

                  )
                )}

              </div>

            )}

          </div>

        </AdminPage>

      )}

      {/* PENDING DEPOSITS */}

      {activeSection ===
        'Pending Deposits' && (

        <AdminPage
          title="Pending Deposits"
          icon="📥"
          onBack={() =>
            setActiveSection(
              'Dashboard'
            )
          }
        >

          <InfoBox
            label="TOTAL PENDING"
            value={pendingDeposits}
          />

          {pendingDeposits === 0 && (
            <EmptyState
              text="No pending deposits"
            />
          )}

          <div className="mt-4 space-y-3">

            {depositRequests
              .filter(
                (item) =>
                  String(
                    item?.status ||
                      ''
                  ).toUpperCase() ===
                  'PENDING'
              )
              .map(
                (
                  request,
                  index
                ) => (

                  <div
                    key={
                      request?.id ||
                      index
                    }
                    className="rounded-xl border border-[#28655f] bg-[#083d37] p-4"
                  >

                    <p className="text-xs font-black">
                      {request?.customerId ||
                        request?.userId ||
                        request?.customer ||
                        'Demo Customer'}
                    </p>

                    <div className="mt-3 grid grid-cols-2 gap-2">

                      <InfoBox
                        label="AMOUNT"
                        value={
                          request?.amount
                            ? `₹${Number(
                                request.amount
                              ).toLocaleString(
                                'en-IN'
                              )}`
                            : '—'
                        }
                      />

                      <InfoBox
                        label="REFERENCE / UTR"
                        value={
                          request?.reference ||
                          request?.utr ||
                          '—'
                        }
                      />

                    </div>

                  </div>

                )
              )}

          </div>

        </AdminPage>

      )}

      {/* PENDING WITHDRAWALS */}

      {activeSection ===
        'Pending Withdrawals' && (

        <AdminPage
          title="Pending Withdrawals"
          icon="💸"
          onBack={() =>
            setActiveSection(
              'Dashboard'
            )
          }
        >

          <InfoBox
            label="TOTAL PENDING"
            value={
              pendingWithdrawals
            }
          />

          {pendingWithdrawals ===
            0 && (

            <EmptyState
              text="No pending withdrawals"
            />

          )}

          <div className="mt-4 space-y-3">

            {withdrawalRequests
              .filter(
                (item) =>
                  String(
                    item?.status ||
                      ''
                  ).toUpperCase() ===
                  'PENDING'
              )
              .map(
                (
                  request,
                  index
                ) => (

                  <div
                    key={
                      request?.id ||
                      index
                    }
                    className="rounded-xl border border-[#28655f] bg-[#083d37] p-4"
                  >

                    <p className="text-sm font-black">
                      {request?.customerName ||
                        request?.customerId ||
                        'Demo Customer'}
                    </p>

                    <div className="mt-3">

                      <InfoBox
                        label="REQUESTED DEMO COINS"
                        value={Number(
                          request?.amount ||
                            0
                        ).toLocaleString(
                          'en-IN'
                        )}
                      />

                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2">

                      <InfoBox
                        label="ACCOUNT HOLDER"
                        value={
                          request?.holderName ||
                          '—'
                        }
                      />

                      <InfoBox
                        label="BANK NAME"
                        value={
                          request?.bankName ||
                          '—'
                        }
                      />

                      <InfoBox
                        label="ACCOUNT NUMBER"
                        value={
                          request?.accountNumber ||
                          '—'
                        }
                      />

                      <InfoBox
                        label="IFSC CODE"
                        value={
                          request?.ifsc ||
                          '—'
                        }
                      />

                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">

                      <button
                        type="button"
                        onClick={() =>
                          approveWithdrawal(
                            request.id
                          )
                        }
                        className="h-[44px] rounded-lg bg-green-700 text-[10px] font-black"
                      >
                        ✓ APPROVE
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          rejectWithdrawal(
                            request.id
                          )
                        }
                        className="h-[44px] rounded-lg bg-red-700 text-[10px] font-black"
                      >
                        ✕ REJECT
                      </button>

                    </div>

                  </div>

                )
              )}

          </div>

        </AdminPage>

      )}

      {/* COIN MANAGEMENT */}

      {activeSection ===
        'Coin Management' && (

        <AdminPage
          title="Coin Management"
          icon="🪙"
          onBack={() =>
            setActiveSection(
              'Dashboard'
            )
          }
        >

          <EmptyState
            text="Demo coin management setup pending"
          />

        </AdminPage>

      )}

      {/* API SETTINGS */}

      {activeSection ===
        'API Settings' && (

        <AdminPage
          title="API Settings"
          icon="🔌"
          onBack={() =>
            setActiveSection(
              'Dashboard'
            )
          }
        >

          <ApiBox
            title="SPORTS API"
            description="Sports data provider configuration"
          />

          <div className="mt-3">

            <ApiBox
              title="GAME API"
              description="Game provider configuration"
            />

          </div>

        </AdminPage>

      )}

      {/* TRANSACTION HISTORY */}

      {activeSection ===
        'Transaction History' && (

        <AdminPage
          title="Transaction History"
          icon="📒"
          onBack={() =>
            setActiveSection(
              'Dashboard'
            )
          }
        >

          <div className="grid grid-cols-2 gap-2">

            <InfoBox
              label="DEPOSIT REQUESTS"
              value={
                depositRequests.length
              }
            />

            <InfoBox
              label="WITHDRAWAL REQUESTS"
              value={
                withdrawalRequests.length
              }
            />

          </div>

          <div className="mt-4 space-y-2">

            {withdrawalRequests
              .slice(0, 20)
              .map(
                (
                  request,
                  index
                ) => (

                  <div
                    key={
                      request?.id ||
                      index
                    }
                    className="rounded-lg border border-[#28655f] bg-[#083d37] p-3"
                  >

                    <div className="flex items-center justify-between gap-3">

                      <div>

                        <p className="text-[9px] font-black">
                          {request?.customerName ||
                            request?.customerId ||
                            'Demo Customer'}
                        </p>

                        <p className="mt-1 text-[8px] text-gray-400">
                          {Number(
                            request?.amount ||
                              0
                          ).toLocaleString(
                            'en-IN'
                          )}{' '}
                          Demo Coins
                        </p>

                      </div>

                      <StatusBadge
                        status={
                          request?.status
                        }
                      />

                    </div>

                  </div>

                )
              )}

          </div>

        </AdminPage>

      )}

      {/* ADMIN SETTINGS */}

      {activeSection ===
        'Admin Settings' && (

        <AdminPage
          title="Admin Settings"
          icon="⚙️"
          onBack={() =>
            setActiveSection(
              'Dashboard'
            )
          }
        >

          <InfoBox
            label="ADMIN ID"
            value={
              admin?.username ||
              'admin'
            }
          />

        </AdminPage>

      )}

    </div>
  );
}

/* =====================================================
   COMPONENTS
===================================================== */

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
        className="mb-4 rounded-md border border-amber-500/40 bg-black/20 px-3 py-2 text-[9px] font-black text-amber-300"
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
  type = 'text',
  value,
  onChange,
  placeholder,
}) {
  return (
    <div>

      <label className="mb-2 block text-[8px] font-black text-gray-400">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete="off"
        className="h-[46px] w-full rounded-lg border border-[#28655f] bg-[#061c1a] px-3 text-xs text-white outline-none focus:border-amber-400"
      />

    </div>
  );
}

function InfoBox({
  label,
  value,
}) {
  return (
    <div className="rounded-lg border border-[#28655f] bg-black/10 p-3">

      <p className="text-[7px] font-black text-gray-500">
        {label}
      </p>

      <p className="mt-1 break-all text-[10px] font-black text-white">
        {value}
      </p>

    </div>
  );
}

function StatusBadge({
  status,
}) {
  const normalized =
    String(
      status || 'PENDING'
    ).toUpperCase();

  let className =
    'bg-amber-500/10 text-amber-300 border-amber-500/30';

  if (
    normalized === 'APPROVED' ||
    normalized === 'SUCCESS'
  ) {
    className =
      'bg-green-500/10 text-green-300 border-green-500/30';
  }

  if (
    normalized === 'REJECTED'
  ) {
    className =
      'bg-red-500/10 text-red-300 border-red-500/30';
  }

  return (
    <span
      className={`rounded border px-2 py-1 text-[7px] font-black ${className}`}
    >
      {normalized}
    </span>
  );
}

function EmptyState({
  text,
}) {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-[#28655f] bg-black/10 px-4 py-8 text-center">

      <p className="text-[10px] font-bold text-gray-500">
        {text}
      </p>

    </div>
  );
}

function ApiBox({
  title,
  description,
}) {
  return (
    <div className="rounded-xl border border-[#28655f] bg-[#083d37] p-4">

      <div className="flex items-center justify-between gap-3">

        <div>

          <p className="text-xs font-black text-white">
            {title}
          </p>

          <p className="mt-1 text-[8px] text-gray-400">
            {description}
          </p>

        </div>

        <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[7px] font-black text-amber-300">
          SETUP
        </span>

      </div>

    </div>
  );
}
