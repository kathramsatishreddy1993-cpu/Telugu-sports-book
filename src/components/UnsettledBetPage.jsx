import React, { useMemo, useState } from 'react';

const DEMO_BET_HISTORY_KEY = 'tsb_demo_bet_history';

function formatDate(value) {
  if (!value) return '-';

  try {
    return new Date(value).toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

function formatNumber(value) {
  const number = Number(value || 0);

  return number.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  });
}

export default function UnsettledBetPage({ user, onBack }) {
  const [filter, setFilter] = useState('MATCHED');

  const [bets] = useState(() => {
    try {
      const saved = localStorage.getItem(DEMO_BET_HISTORY_KEY);

      if (!saved) {
        return [];
      }

      const parsed = JSON.parse(saved);

      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Unable to load demo bets:', error);
      return [];
    }
  });

  const unsettledBets = useMemo(() => {
    return bets.filter((bet) => {
      const status = String(
        bet.status || 'MATCHED'
      ).toUpperCase();

      /*
        Settled bets should not appear
        on the Unsettled Bet page.
      */
      if (
        status === 'SETTLED' ||
        status === 'WON' ||
        status === 'LOST'
      ) {
        return false;
      }

      if (filter === 'MATCHED') {
        return (
          status === 'MATCHED' ||
          status === 'LIVE' ||
          status === 'RUNNING' ||
          status === 'SETTLEMENT_PENDING' ||
          status === 'PENDING'
        );
      }

      if (filter === 'UNMATCHED') {
        return status === 'UNMATCHED';
      }

      if (filter === 'DELETED') {
        return (
          status === 'DELETED' ||
          status === 'CANCELLED' ||
          status === 'CANCELED'
        );
      }

      return false;
    });
  }, [bets, filter]);

  const filterButtons = [
    {
      label: 'Matched',
      value: 'MATCHED',
    },
    {
      label: 'Un-Matched',
      value: 'UNMATCHED',
    },
    {
      label: 'Deleted',
      value: 'DELETED',
    },
  ];

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-gray-900">

      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-[#895000] px-3 py-3 text-white shadow">

        <div className="flex items-center justify-between gap-2">

          <button
            type="button"
            onClick={onBack}
            className="rounded-md border border-white/40 bg-black/20 px-3 py-2 text-sm font-bold"
          >
            ← Back
          </button>

          <div className="text-center">
            <h1 className="text-base font-black text-amber-300">
              TELUGU SPORTS
            </h1>

            <p className="text-[9px] font-bold tracking-widest">
              BOOK • DEMO
            </p>
          </div>

          <div className="max-w-24 text-right">
            <p className="truncate text-[10px] font-bold">
              {user?.name || 'Demo User'}
            </p>
          </div>

        </div>

      </header>

      {/* TITLE */}
      <div className="bg-teal-800 px-4 py-5 text-white">

        <h2 className="text-xl font-extrabold">
          Un-Settled Bet
        </h2>

        <p className="mt-1 text-xs text-teal-100">
          Active and settlement-pending demo selections
        </p>

      </div>

      <main className="mx-auto max-w-4xl p-3">

        {/* FILTER CARD */}
        <section className="rounded-lg border bg-white p-4 shadow-sm">

          <p className="mb-3 text-xs font-extrabold text-gray-600">
            Bet Status
          </p>

          <div className="grid grid-cols-3 gap-2">

            {filterButtons.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={`rounded-md border px-2 py-3 text-xs font-extrabold ${
                  filter === item.value
                    ? 'border-teal-800 bg-teal-800 text-white'
                    : 'border-gray-300 bg-white text-gray-700'
                }`}
              >
                {item.label}
              </button>
            ))}

          </div>

        </section>

        {/* RESULT HEADER */}
        <section className="mt-3 overflow-hidden rounded-lg border bg-white shadow-sm">

          <div className="flex items-center justify-between bg-[#895000] px-4 py-3 text-white">

            <h3 className="text-sm font-extrabold">
              Demo Unsettled Bets
            </h3>

            <span className="text-[10px] font-bold">
              {unsettledBets.length} Records
            </span>

          </div>

          {/* NO RECORDS */}
          {unsettledBets.length === 0 ? (

            <div className="px-4 py-14 text-center">

              <div className="text-5xl">
                📋
              </div>

              <h4 className="mt-4 text-base font-extrabold text-gray-700">
                No Unsettled Bets
              </h4>

              <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-gray-500">
                Active demo selections and demo selections
                waiting for settlement will appear here.
              </p>

            </div>

          ) : (

            <div className="space-y-3 bg-gray-100 p-3">

              {unsettledBets.map((bet, index) => {

                const status = String(
                  bet.status || 'MATCHED'
                ).toUpperCase();

                const isBack =
                  String(
                    bet.type ||
                    bet.betType ||
                    'BACK'
                  ).toUpperCase() === 'BACK';

                return (
                  <article
                    key={
                      bet.id ||
                      `${bet.createdAt}-${index}`
                    }
                    className={`overflow-hidden rounded-lg border shadow-sm ${
                      isBack
                        ? 'border-sky-200 bg-sky-50'
                        : 'border-pink-200 bg-pink-50'
                    }`}
                  >

                    {/* MATCH NAME */}
                    <div className="flex items-start justify-between gap-3 border-b border-black/10 bg-white/60 px-3 py-3">

                      <div>
                        <p className="text-[10px] font-bold uppercase text-gray-500">
                          Match Name
                        </p>

                        <h4 className="mt-1 text-sm font-extrabold text-gray-900">
                          {bet.match ||
                            bet.matchName ||
                            bet.game ||
                            'Demo Match'}
                        </h4>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-extrabold ${
                          status === 'UNMATCHED'
                            ? 'bg-amber-100 text-amber-800'
                            : status === 'DELETED' ||
                              status === 'CANCELLED' ||
                              status === 'CANCELED'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {status.replaceAll('_', ' ')}
                      </span>

                    </div>

                    {/* DETAILS */}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-4 p-3 sm:grid-cols-3">

                      <div>
                        <p className="text-[10px] font-bold text-gray-500">
                          Nation / Selection
                        </p>

                        <p className="mt-1 text-xs font-extrabold text-gray-900">
                          {bet.selection ||
                            bet.nation ||
                            bet.team ||
                            '-'}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold text-gray-500">
                          User Rate
                        </p>

                        <p className="mt-1 text-xs font-extrabold text-gray-900">
                          {bet.rate ||
                            bet.odd ||
                            bet.odds ||
                            '-'}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold text-gray-500">
                          Amount
                        </p>

                        <p className="mt-1 text-xs font-extrabold text-gray-900">
                          🪙 {formatNumber(
                            bet.amount ||
                            bet.stake
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold text-gray-500">
                          P&amp;L
                        </p>

                        <p className="mt-1 text-xs font-extrabold text-gray-900">
                          --
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold text-gray-500">
                          Place Date
                        </p>

                        <p className="mt-1 text-[11px] font-semibold text-gray-800">
                          {formatDate(
                            bet.createdAt ||
                            bet.placeDate
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold text-gray-500">
                          Match Date
                        </p>

                        <p className="mt-1 text-[11px] font-semibold text-gray-800">
                          {formatDate(
                            bet.matchDate
                          )}
                        </p>
                      </div>

                    </div>

                    {/* DEMO STATUS */}
                    <div className="border-t border-black/10 bg-white/50 px-3 py-2">

                      <p className="text-[10px] font-semibold text-gray-600">
                        {status === 'SETTLEMENT_PENDING'
                          ? 'Match finished — demo settlement pending.'
                          : status === 'LIVE' ||
                            status === 'RUNNING'
                          ? 'Demo match is currently running.'
                          : status === 'UNMATCHED'
                          ? 'Demo selection is currently unmatched.'
                          : status === 'DELETED' ||
                            status === 'CANCELLED' ||
                            status === 'CANCELED'
                          ? 'Demo selection was removed.'
                          : 'Demo selection is active.'}
                      </p>

                    </div>

                  </article>
                );
              })}

            </div>

          )}

        </section>

        {/* DEMO NOTICE */}
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">

          <p className="text-xs font-extrabold text-amber-900">
            DEMO UNSETTLED BETS
          </p>

          <p className="mt-1 text-[11px] leading-5 text-amber-800">
            This section is for simulated demo selections
            using demo coins only. Settled demo selections
            are excluded from this page.
          </p>

        </div>

        <button
          type="button"
          onClick={onBack}
          className="mt-4 w-full rounded-lg bg-[#895000] py-3 text-sm font-extrabold text-white"
        >
          ← BACK TO HOME
        </button>

      </main>

    </div>
  );
}
