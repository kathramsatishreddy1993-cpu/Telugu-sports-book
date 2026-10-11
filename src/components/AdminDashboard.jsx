import React, { useEffect, useMemo, useState } from 'react';

import AdminPaymentSettings from './AdminPaymentSettings';

const DEPOSIT_KEY = 'telugu_sports_demo_deposits';
const WITHDRAWAL_KEY = 'telugu_sports_demo_withdrawals';
const CUSTOMER_BALANCE_KEY = 'telugu_sports_demo_balance';

export default function AdminDashboard({
  admin,
  onLogout,
}) {
  const [activeSection, setActiveSection] =
    useState('Dashboard');

  const [depositRequests, setDepositRequests] =
    useState(() => {
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

  /* =========================
     SAVE WITHDRAWALS
  ========================= */

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

  /* =========================
     COUNTS
  ========================= */

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

  /* =========================
     ADMIN MANAGEMENT BOXES
  ========================= */

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
        'Customer IDs and demo account information',
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

  /* =========================
     APPROVE WITHDRAWAL
     DEMO STATUS ONLY
  ========================= */

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

  /* =========================
     REJECT WITHDRAWAL

     Customer coins were held
     when request was created.

     In this same-browser demo,
     rejection restores them.
  ========================= */

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
        console.error(
          'Unable to restore demo coins:',
          error
        );

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

  /* =========================
     DEPOSIT ACCOUNTS
  ========================= */

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

      {/* HEADER */}

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

          {/* PENDING ALERTS */}

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

          {/* ADMIN MANAGEMENT */}

          <section>

            <h3 className="mb-3 text-xs font-black text-amber-300">
              ADMIN MANAGEMENT
            </h3>

            <div className="grid grid-cols-2 gap-3">

              {adminBoxes.map(
                (item) => (

                  <button
                    key={
                      item.title
                    }
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

                    <p className="mt-4 text-[11px] font-black text-white">
                      {item.title}
                    </p>

                    <p className="mt-2 text-[8px] leading-4 text-gray-400">
                      {
                        item.description
                      }
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
            className="mt-6 h-[46px] w-full rounded-lg border border-red-500/50 bg-red-700 text-xs font-black text-white"
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

          <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4">

            <p className="text-[9px] font-black text-green-300">
              TOTAL PENDING
            </p>

            <p className="mt-1 text-3xl font-black">
              {pendingDeposits}
            </p>

          </div>

          {depositRequests.filter(
            (item) =>
              String(
                item?.status || ''
              ).toUpperCase() ===
              'PENDING'
          ).length === 0 ? (

            <EmptyState
              text="No pending deposits"
            />

          ) : (

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

                      <p className="text-[8px] text-gray-400">
                        CUSTOMER
                      </p>

                      <p className="mt-1 text-xs font-black">
                        {request?.customerId ||
                          request?.userId ||
                          request?.customer ||
                          'Demo Customer'}
                      </p>

                      <div className="mt-4 grid grid-cols-2 gap-2">

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

          )}

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

          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">

            <p className="text-[9px] font-black text-red-300">
              TOTAL PENDING
            </p>

            <p className="mt-1 text-3xl font-black">
              {pendingWithdrawals}
            </p>

          </div>

          {withdrawalRequests.filter(
            (item) =>
              String(
                item?.status || ''
              ).toUpperCase() ===
              'PENDING'
          ).length === 0 ? (

            <EmptyState
              text="No pending withdrawals"
            />

          ) : (

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

                      <div className="flex items-start justify-between gap-3">

                        <div>

                          <p className="text-[8px] text-gray-400">
                            CUSTOMER
                          </p>

                          <p className="mt-1 text-sm font-black">
                            {request?.customerName ||
                              request?.customerId ||
                              'Demo Customer'}
                          </p>

                          {request?.customerId && (

                            <p className="mt-1 text-[8px] text-gray-500">
                              ID: {
                                request.customerId
                              }
                            </p>

                          )}

                        </div>

                        <span className="rounded bg-amber-500/20 px-2 py-1 text-[8px] font-black text-amber-300">
                          PENDING
                        </span>

                      </div>

                      <div className="mt-4">

                        <InfoBox
                          label="REQUESTED DEMO COINS"
                          value={
                            request?.amount
                              ? Number(
                                  request.amount
                                ).toLocaleString(
                                  'en-IN'
                                )
                              : '—'
                          }
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

                      <div className="mt-2">

                        <InfoBox
                          label="REQUEST DATE"
                          value={
                            request?.date ||
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
                          className="h-[44px] rounded-lg border border-green-400/50 bg-green-700 text-[10px] font-black text-white"
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
                          className="h-[44px] rounded-lg border border-red-400/50 bg-red-700 text-[10px] font-black text-white"
                        >
                          ✕ REJECT
                        </button>

                      </div>

                    </div>

                  )
                )}

            </div>

          )}

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

          <p className="text-[10px] leading-5 text-gray-300">
            Demo coin management
            information will appear
            here.
          </p>

          <EmptyState
            text="Demo coin management setup pending"
          />

        </AdminPage>

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

          <p className="text-[10px] leading-5 text-gray-300">
            Customer IDs and demo
            account information will
            appear here.
          </p>

          <EmptyState
            text="Customer database connection pending"
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

          <div className="space-y-3">

            <ApiBox
              title="SPORTS API"
              description="Sports data provider configuration"
            />

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

          <p className="mt-4 text-[9px] leading-4 text-gray-500">
            Additional admin security
            settings can be connected
            separately.
          </p>

        </AdminPage>

      )}

    </div>
  );
}

/* =========================
   ADMIN PAGE
========================= */

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

/* =========================
   INFO BOX
========================= */

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

/* =========================
   STATUS BADGE
========================= */

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

/* =========================
   EMPTY STATE
========================= */

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

/* =========================
   API BOX
========================= */

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
