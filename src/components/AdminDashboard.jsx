import React, { useMemo, useState } from 'react';

export default function AdminDashboard({
  admin,
  onLogout,
}) {
  const [activeSection, setActiveSection] =
    useState('Dashboard');

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

  const menuItems = [
    {
      name: 'Dashboard',
      icon: '🏠',
    },
    {
      name: 'Deposit Requests',
      icon: '💰',
    },
    {
      name: 'Withdrawal Requests',
      icon: '💸',
    },
    {
      name: 'Customers',
      icon: '👥',
    },
    {
      name: 'Demo Transactions',
      icon: '📒',
    },
    {
      name: 'Payment Details',
      icon: '🏦',
    },
  ];

  const cards = [
    {
      title: 'Pending Deposits',
      value: pendingDeposits,
      icon: '💰',
      section: 'Deposit Requests',
      description:
        'Deposit requests waiting for review',
    },
    {
      title: 'Pending Withdrawals',
      value: pendingWithdrawals,
      icon: '💸',
      section: 'Withdrawal Requests',
      description:
        'Withdrawal requests waiting for review',
    },
    {
      title: 'Customers',
      value: '—',
      icon: '👥',
      section: 'Customers',
      description:
        'View demo customer accounts',
    },
    {
      title: 'Transactions',
      value:
        depositRequests.length +
        withdrawalRequests.length,
      icon: '📒',
      section: 'Demo Transactions',
      description:
        'Demo request activity',
    },
  ];

  return (
    <div className="min-h-screen bg-[#061c1a] text-white">

      {/* HEADER */}

      <header className="sticky top-0 z-50 border-b border-amber-500/30 bg-[#9a5a00] px-3 py-3 shadow-xl">

        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">

          <div>

            <p className="text-[9px] font-black tracking-[0.16em] text-amber-200">
              TELUGU SPORTS BOOK
            </p>

            <h1 className="mt-0.5 text-base font-black">
              🛡️ ADMIN PANEL
            </h1>

          </div>

          <div className="text-right">

            <p className="text-[9px] text-amber-100">
              Logged in as
            </p>

            <p className="text-[11px] font-black">
              {admin?.username ||
                'Admin'}
            </p>

          </div>

        </div>

      </header>

      {/* NAVIGATION */}

      <nav
        className="overflow-x-auto border-b border-[#28655f] bg-[#083d37]"
        style={{
          WebkitOverflowScrolling:
            'touch',
        }}
      >

        <div className="flex w-max min-w-full">

          {menuItems.map((item) => (

            <button
              key={item.name}
              type="button"
              onClick={() =>
                setActiveSection(
                  item.name
                )
              }
              className={`shrink-0 border-r border-[#28655f] px-4 py-3 text-[9px] font-black ${
                activeSection ===
                item.name
                  ? 'bg-[#0b6259] text-amber-300'
                  : 'text-gray-200'
              }`}
            >

              <span className="mr-1">
                {item.icon}
              </span>

              {item.name}

            </button>

          ))}

        </div>

      </nav>

      <main className="mx-auto max-w-6xl px-3 py-4">

        {/* DASHBOARD */}

        {activeSection ===
          'Dashboard' && (
          <>

            <section className="mb-4">

              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-400">
                Administration
              </p>

              <h2 className="mt-1 text-xl font-black">
                Dashboard
              </h2>

              <p className="mt-1 text-[10px] leading-5 text-gray-400">
                Demo customer requests and
                account activity overview.
              </p>

            </section>

            {/* STATUS CARDS */}

            <section className="grid grid-cols-2 gap-2">

              {cards.map(
                (card) => (

                  <button
                    key={card.title}
                    type="button"
                    onClick={() =>
                      setActiveSection(
                        card.section
                      )
                    }
                    className="rounded-xl border border-[#28655f] bg-[#083d37] p-3 text-left shadow-lg"
                  >

                    <div className="flex items-start justify-between gap-2">

                      <span className="text-2xl">
                        {card.icon}
                      </span>

                      <span className="text-2xl font-black text-amber-300">
                        {card.value}
                      </span>

                    </div>

                    <p className="mt-3 text-[11px] font-black">
                      {card.title}
                    </p>

                    <p className="mt-1 text-[8px] leading-4 text-gray-400">
                      {
                        card.description
                      }
                    </p>

                  </button>

                )
              )}

            </section>

            {/* QUICK MANAGEMENT */}

            <section className="mt-5">

              <h2 className="mb-2 text-xs font-black text-amber-300">
                QUICK MANAGEMENT
              </h2>

              <div className="overflow-hidden rounded-xl border border-[#28655f] bg-[#083d37]">

                {menuItems
                  .filter(
                    (item) =>
                      item.name !==
                      'Dashboard'
                  )
                  .map((item) => (

                    <button
                      key={item.name}
                      type="button"
                      onClick={() =>
                        setActiveSection(
                          item.name
                        )
                      }
                      className="flex w-full items-center justify-between border-b border-[#28655f] px-4 py-4 text-left last:border-b-0"
                    >

                      <div className="flex items-center gap-3">

                        <span className="text-xl">
                          {item.icon}
                        </span>

                        <span className="text-[11px] font-black">
                          {item.name}
                        </span>

                      </div>

                      <span className="text-lg text-amber-300">
                        ›
                      </span>

                    </button>

                  ))}

              </div>

            </section>

          </>
        )}

        {/* DEPOSIT REQUESTS */}

        {activeSection ===
          'Deposit Requests' && (

          <AdminSection
            title="Deposit Requests"
            icon="💰"
            onBack={() =>
              setActiveSection(
                'Dashboard'
              )
            }
          >

            <p className="text-[10px] leading-5 text-gray-300">
              Pending demo deposit
              requests will be managed
              here.
            </p>

            <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">

              <p className="text-[10px] font-black text-amber-300">
                Pending Requests
              </p>

              <p className="mt-1 text-2xl font-black">
                {pendingDeposits}
              </p>

            </div>

            <p className="mt-3 text-[9px] text-gray-500">
              Amount, reference/UTR,
              uploaded proof and review
              controls will be added in
              the next step.
            </p>

          </AdminSection>

        )}

        {/* WITHDRAWALS */}

        {activeSection ===
          'Withdrawal Requests' && (

          <AdminSection
            title="Withdrawal Requests"
            icon="💸"
            onBack={() =>
              setActiveSection(
                'Dashboard'
              )
            }
          >

            <p className="text-[10px] leading-5 text-gray-300">
              Pending demo withdrawal
              requests will be managed
              here.
            </p>

            <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3">

              <p className="text-[10px] font-black text-red-300">
                Pending Requests
              </p>

              <p className="mt-1 text-2xl font-black">
                {pendingWithdrawals}
              </p>

            </div>

            <p className="mt-3 text-[9px] text-gray-500">
              Customer details, demo
              balance and review controls
              will be added next.
            </p>

          </AdminSection>

        )}

        {/* CUSTOMERS */}

        {activeSection ===
          'Customers' && (

          <AdminSection
            title="Customers"
            icon="👥"
            onBack={() =>
              setActiveSection(
                'Dashboard'
              )
            }
          >

            <p className="text-[10px] leading-5 text-gray-300">
              Customer list and demo
              account information will
              appear here.
            </p>

          </AdminSection>

        )}

        {/* TRANSACTIONS */}

        {activeSection ===
          'Demo Transactions' && (

          <AdminSection
            title="Demo Transactions"
            icon="📒"
            onBack={() =>
              setActiveSection(
                'Dashboard'
              )
            }
          >

            <div className="grid grid-cols-2 gap-2">

              <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3">

                <p className="text-[9px] text-gray-400">
                  Deposit Requests
                </p>

                <p className="mt-1 text-xl font-black text-green-300">
                  {
                    depositRequests.length
                  }
                </p>

              </div>

              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">

                <p className="text-[9px] text-gray-400">
                  Withdrawal Requests
                </p>

                <p className="mt-1 text-xl font-black text-red-300">
                  {
                    withdrawalRequests.length
                  }
                </p>

              </div>

            </div>

          </AdminSection>

        )}

        {/* PAYMENT DETAILS */}

        {activeSection ===
          'Payment Details' && (

          <AdminSection
            title="Payment Details"
            icon="🏦"
            onBack={() =>
              setActiveSection(
                'Dashboard'
              )
            }
          >

            <p className="text-[10px] leading-5 text-gray-300">
              Demo bank / UPI / QR
              information shown on the
              customer Deposit Page can
              be configured here in the
              next step.
            </p>

          </AdminSection>

        )}

        {/* LOGOUT */}

        <section className="mt-6">

          <button
            type="button"
            onClick={onLogout}
            className="h-[44px] w-full rounded-md border border-red-500/40 bg-red-700 text-xs font-black text-white"
          >
            ADMIN LOGOUT
          </button>

        </section>

        <p className="px-3 py-6 text-center text-[8px] leading-4 text-gray-500">
          Demo administration interface.
          No real-money transactions or
          automatic payouts.
        </p>

      </main>

    </div>
  );
}

function AdminSection({
  title,
  icon,
  onBack,
  children,
}) {
  return (
    <section>

      <button
        type="button"
        onClick={onBack}
        className="mb-3 rounded border border-amber-500/40 bg-black/20 px-3 py-2 text-[9px] font-black text-amber-300"
      >
        ‹ DASHBOARD
      </button>

      <div className="rounded-xl border border-[#28655f] bg-[#083d37] p-4">

        <div className="mb-4 flex items-center gap-3">

          <span className="text-2xl">
            {icon}
          </span>

          <h2 className="text-base font-black text-amber-300">
            {title}
          </h2>

        </div>

        {children}

      </div>

    </section>
  );
}
