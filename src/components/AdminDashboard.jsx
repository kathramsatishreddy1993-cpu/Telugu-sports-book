import React, { useMemo, useState } from 'react';

import AdminPaymentSettings from './AdminPaymentSettings';

export default function AdminDashboard({
  admin,
  onLogout,
}) {
  const [activeSection, setActiveSection] =
    useState('Dashboard');

  /*
   * DEMO DATA
   */

  const depositRequests = useMemo(() => {
    try {
      const saved = localStorage.getItem(
        'telugu_sports_demo_deposits'
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
  }, []);

  const withdrawalRequests = useMemo(() => {
    try {
      const saved = localStorage.getItem(
        'telugu_sports_demo_withdrawals'
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
  }, []);

  const pendingDeposits =
    depositRequests.filter(
      (item) =>
        String(
          item?.status || ''
        ).toUpperCase() === 'PENDING'
    ).length;

  const pendingWithdrawals =
    withdrawalRequests.filter(
      (item) =>
        String(
          item?.status || ''
        ).toUpperCase() === 'PENDING'
    ).length;

  /*
   * ADMIN MANAGEMENT BOXES
   */

  const adminBoxes = [
    {
      title: 'Payment Settings',
      icon: '🏦',
      section: 'Payment Settings',
      description:
        'Bank account, PhonePe, GPay and Paytm settings',
    },

    {
      title: 'Deposit Requests',
      icon: '📥',
      section: 'Deposit Requests',
      badge: pendingDeposits,
      description:
        'View customer demo deposit requests',
    },

    {
      title: 'Withdrawal Management',
      icon: '💸',
      section: 'Withdrawal Management',
      badge: pendingWithdrawals,
      description:
        'Manage customer demo withdrawal records',
    },

    {
      title: 'Coin Management',
      icon: '🪙',
      section: 'Coin Management',
      description:
        'Manage customer demo coin balances',
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
        'View demo management activity',
    },

    {
      title: 'Admin Settings',
      icon: '⚙️',
      section: 'Admin Settings',
      description:
        'Admin account and panel settings',
    },
  ];

  /*
   * PAYMENT SETTINGS
   */

  if (activeSection === 'Payment Settings') {
    return (
      <AdminPaymentSettings
        onBack={() =>
          setActiveSection('Dashboard')
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

      {activeSection === 'Dashboard' && (
        <main className="mx-auto max-w-5xl px-3 py-5">

          {/* WELCOME */}

          <section className="mb-5">

            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-400">
              MANAGEMENT
            </p>

            <h2 className="mt-1 text-xl font-black">
              Admin Dashboard
            </h2>

            <p className="mt-2 text-[10px] leading-5 text-gray-400">
              Customer management, payment
              settings, demo wallet and API
              controls.
            </p>

          </section>

          {/* ALERT SUMMARY */}

          <section className="mb-5 grid grid-cols-2 gap-2">

            <button
              type="button"
              onClick={() =>
                setActiveSection(
                  'Deposit Requests'
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
                  'Withdrawal Management'
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

          {/* MANAGEMENT BOXES */}

          <section>

            <h3 className="mb-3 text-xs font-black text-amber-300">
              ADMIN MANAGEMENT
            </h3>

            <div className="grid grid-cols-2 gap-3">

              {adminBoxes.map((item) => (

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

                  {typeof item.badge ===
                    'number' && (
                    <span className="absolute right-3 top-3 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1.5 text-[9px] font-black text-white">
                      {item.badge}
                    </span>
                  )}

                  <span className="block text-3xl">
                    {item.icon}
                  </span>

                  <p className="mt-4 text-[11px] font-black text-white">
                    {item.title}
                  </p>

                  <p className="mt-2 text-[8px] leading-4 text-gray-400">
                    {item.description}
                  </p>

                  <span className="absolute bottom-3 right-3 text-lg text-amber-300">
                    ›
                  </span>

                </button>

              ))}

            </div>

          </section>

          {/* LOGOUT */}

          <button
            type="button"
            onClick={onLogout}
            className="mt-6 h-[46px] w-full rounded-lg border border-red-500/50 bg-red-700 text-xs font-black text-white"
          >
            ADMIN LOGOUT
          </button>

          <p className="px-4 py-6 text-center text-[8px] leading-4 text-gray-500">
            Demo administration interface.
            No real-money transactions or
            automatic payouts.
          </p>

        </main>
      )}

      {/* DEPOSIT REQUESTS */}

      {activeSection ===
        'Deposit Requests' && (

        <AdminPage
          title="Deposit Requests"
          icon="📥"
          onBack={() =>
            setActiveSection('Dashboard')
          }
        >

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">

            <p className="text-[9px] font-black text-amber-300">
              PENDING REQUESTS
            </p>

            <p className="mt-1 text-3xl font-black">
              {pendingDeposits}
            </p>

          </div>

          <p className="mt-4 text-[10px] leading-5 text-gray-300">
            Customer ID, demo amount,
            reference/UTR and uploaded
            proof will appear in this
            section.
          </p>

          {depositRequests.length === 0 ? (

            <EmptyState
              text="No deposit requests"
            />

          ) : (

            <div className="mt-4 space-y-3">

              {depositRequests.map(
                (request, index) => (

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

                        <p className="mt-1 text-xs font-black">
                          {request?.customerId ||
                            request?.userId ||
                            request?.customer ||
                            'Demo Customer'}
                        </p>
                      </div>

                      <span className="rounded bg-amber-500/20 px-2 py-1 text-[8px] font-black text-amber-300">
                        {request?.status ||
                          'PENDING'}
                      </span>

                    </div>

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

      {/* WITHDRAWAL MANAGEMENT */}

      {activeSection ===
        'Withdrawal Management' && (

        <AdminPage
          title="Withdrawal Management"
          icon="💸"
          onBack={() =>
            setActiveSection('Dashboard')
          }
        >

          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">

            <p className="text-[9px] font-black text-red-300">
              PENDING REQUESTS
            </p>

            <p className="mt-1 text-3xl font-black">
              {pendingWithdrawals}
            </p>

          </div>

          <p className="mt-4 text-[10px] leading-5 text-gray-300">
            Customer-specific demo
            withdrawal requests and status
            records will appear here.
          </p>

          {withdrawalRequests.length === 0 ? (
            <EmptyState
              text="No withdrawal requests"
            />
          ) : (
            <div className="mt-4 space-y-3">

              {withdrawalRequests.map(
                (request, index) => (

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
                        'Demo Customer'}
                    </p>

                    <p className="mt-2 text-lg font-black text-amber-300">
                      {request?.amount
                        ? `${Number(
                            request.amount
                          ).toLocaleString(
                            'en-IN'
                          )} Demo Coins`
                        : '—'}
                    </p>

                    <p className="mt-2 text-[8px] font-black text-gray-400">
                      {request?.status ||
                        'PENDING'}
                    </p>

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
            setActiveSection('Dashboard')
          }
        >

          <p className="text-[10px] leading-5 text-gray-300">
            Customer demo coin management
            will be configured in this
            section.
          </p>

          <EmptyState
            text="Coin management setup pending"
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
            setActiveSection('Dashboard')
          }
        >

          <p className="text-[10px] leading-5 text-gray-300">
            Customer IDs and demo account
            information will appear here.
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
            setActiveSection('Dashboard')
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
            setActiveSection('Dashboard')
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

        </AdminPage>

      )}

      {/* ADMIN SETTINGS */}

      {activeSection ===
        'Admin Settings' && (

        <AdminPage
          title="Admin Settings"
          icon="⚙️"
          onBack={() =>
            setActiveSection('Dashboard')
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
