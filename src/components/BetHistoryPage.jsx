import React, { useMemo, useState } from 'react';

const DEMO_BET_HISTORY_KEY = 'tsb_demo_bet_history';

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getDefaultFromDate() {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().slice(0, 10);
}

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
  return Number(value || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  });
}

export default function BetHistoryPage({ user, onBack }) {
  const [sport, setSport] = useState('ALL');
  const [status, setStatus] = useState('MATCHED');
  const [fromDate, setFromDate] = useState(getDefaultFromDate());
  const [toDate, setToDate] = useState(getToday());

  const [bets] = useState(() => {
    try {
      const saved = localStorage.getItem(DEMO_BET_HISTORY_KEY);

      if (!saved) {
        return [];
      }

      const parsed = JSON.parse(saved);

      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Unable to load demo bet history:', error);
      return [];
    }
  });

  const sports = useMemo(() => {
    const availableSports = bets
      .map((bet) => bet.sport)
      .filter(Boolean);

    return ['ALL', ...new Set(availableSports)];
  }, [bets]);

  const [filteredBets, setFilteredBets] = useState(bets);

  const handleSubmit = (event) => {
    event.preventDefault();

    const filtered = bets.filter((bet) => {
      const betDate = bet.createdAt
        ? new Date(bet.createdAt)
        : null;

      let matchesDate = true;

      if (betDate && !Number.isNaN(betDate.getTime())) {
        const dateValue = betDate.toISOString().slice(0, 10);

        const matchesFrom =
          !fromDate || dateValue >= fromDate;

        const matchesTo =
          !toDate || dateValue <= toDate;

        matchesDate = matchesFrom && matchesTo;
      }

      const matchesSport =
        sport === 'ALL' || bet.sport === sport;

      const matchesStatus =
        status === 'ALL' ||
        String(bet.status || '').toUpperCase() === status;

      return (
        matchesDate &&
        matchesSport &&
        matchesStatus
      );
    });

    setFilteredBets(filtered);
  };

  const getCardColor = (bet) => {
    const type = String(
      bet.type || bet.side || ''
    ).toUpperCase();

    if (
      type === 'LAY' ||
      type === 'NO' ||
      type === 'PINK'
    ) {
      return 'bg-pink-100 border-pink-300';
    }

    return 'bg-sky-100 border-sky-300';
  };

  const getProfitLoss = (bet) => {
    const value = Number(
      bet.profitLoss ?? bet.pnl ?? 0
    );

    return value;
  };

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
      <div className="bg-teal-800 px-4 py-4 text-white">

        <h2 className="text-xl font-extrabold">
          Bet History
        </h2>

        <p className="mt-1 text-xs text-teal-100">
          Demo play history
        </p>

      </div>

      <main className="mx-auto max-w-4xl p-3">

        {/* FILTERS */}
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border bg-white p-3 shadow-sm"
        >

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

            {/* SPORT */}
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-600">
                Sport
              </label>

              <select
                value={sport}
                onChange={(event) =>
                  setSport(event.target.value)
                }
                className="w-full rounded border border-gray-300 px-3 py-3 text-sm outline-none focus:border-teal-700"
              >
                {sports.map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item === 'ALL'
                      ? 'All Sports'
                      : item}
                  </option>
                ))}
              </select>
            </div>

            {/* STATUS */}
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-600">
                Status
              </label>

              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value)
                }
                className="w-full rounded border border-gray-300 px-3 py-3 text-sm outline-none focus:border-teal-700"
              >
                <option value="ALL">
                  All
                </option>

                <option value="MATCHED">
                  Matched
                </option>

                <option value="SETTLED">
                  Settled
                </option>

                <option value="WON">
                  Won
                </option>

                <option value="LOST">
                  Lost
                </option>

                <option value="VOID">
                  Void
                </option>
              </select>
            </div>

            {/* FROM DATE */}
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-600">
                From Date
              </label>

              <input
                type="date"
                value={fromDate}
                onChange={(event) =>
                  setFromDate(event.target.value)
                }
                className="w-full rounded border border-gray-300 px-3 py-3 text-sm outline-none focus:border-teal-700"
              />
            </div>

            {/* TO DATE */}
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-600">
                To Date
              </label>

              <input
                type="date"
                value={toDate}
                onChange={(event) =>
                  setToDate(event.target.value)
                }
                className="w-full rounded border border-gray-300 px-3 py-3 text-sm outline-none focus:border-teal-700"
              />
            </div>

          </div>

          <button
            type="submit"
            className="mt-3 w-full rounded bg-teal-800 px-4 py-3 text-sm font-extrabold text-white hover:bg-teal-900"
          >
            Submit
          </button>

        </form>

        {/* RECORD COUNT */}
        <div className="mt-3 flex items-center justify-between rounded-lg bg-[#895000] px-3 py-3 text-white">

          <h3 className="text-sm font-extrabold">
            Demo Bet History
          </h3>

          <span className="text-[10px] font-bold">
            {filteredBets.length} Records
          </span>

        </div>

        {/* EMPTY STATE */}
        {filteredBets.length === 0 ? (

          <div className="rounded-b-lg border bg-white px-4 py-12 text-center shadow-sm">

            <div className="text-4xl">
              📋
            </div>

            <h4 className="mt-3 text-sm font-extrabold text-gray-700">
              No Bet History
            </h4>

            <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-gray-500">
              Your demo play history will appear here after
              demo selections are recorded.
            </p>

          </div>

        ) : (

          /* BET CARDS */
          <div className="space-y-3 py-3">

            {filteredBets.map((bet, index) => {

              const profitLoss =
                getProfitLoss(bet);

              return (
                <article
                  key={
                    bet.id ||
                    `${bet.createdAt}-${index}`
                  }
                  className={`overflow-hidden rounded-lg border shadow-sm ${getCardColor(
                    bet
                  )}`}
                >

                  {/* MATCH NAME */}
                  <div className="border-b border-black/10 bg-white/50 px-3 py-3">

                    <div className="flex items-start justify-between gap-2">

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

                      <span className="rounded-full bg-white/80 px-2 py-1 text-[9px] font-extrabold uppercase">
                        {bet.status ||
                          'MATCHED'}
                      </span>

                    </div>

                  </div>

                  <div className="p-3">

                    {/* SELECTION */}
                    <div className="mb-3">

                      <p className="text-[10px] font-bold uppercase text-gray-500">
                        Nation / Selection
                      </p>

                      <p className="mt-1 text-sm font-extrabold">
                        {bet.selection ||
                          bet.nation ||
                          bet.team ||
                          '-'}
                      </p>

                    </div>

                    {/* DETAILS */}
                    <div className="grid grid-cols-3 gap-2">

                      <div className="rounded bg-white/60 p-2 text-center">

                        <p className="text-[9px] font-bold uppercase text-gray-500">
                          User Rate
                        </p>

                        <p className="mt-1 text-sm font-black">
                          {bet.rate ||
                            bet.odd ||
                            bet.odds ||
                            '-'}
                        </p>

                      </div>

                      <div className="rounded bg-white/60 p-2 text-center">

                        <p className="text-[9px] font-bold uppercase text-gray-500">
                          Amount
                        </p>

                        <p className="mt-1 text-sm font-black">
                          🪙 {formatNumber(
                            bet.amount ||
                              bet.stake
                          )}
                        </p>

                      </div>

                      <div className="rounded bg-white/60 p-2 text-center">

                        <p className="text-[9px] font-bold uppercase text-gray-500">
                          P&amp;L
                        </p>

                        <p
                          className={`mt-1 text-sm font-black ${
                            profitLoss > 0
                              ? 'text-green-700'
                              : profitLoss < 0
                              ? 'text-red-700'
                              : 'text-gray-700'
                          }`}
                        >
                          {profitLoss > 0
                            ? '+'
                            : ''}
                          {formatNumber(
                            profitLoss
                          )}
                        </p>

                      </div>

                    </div>

                    {/* DATES */}
                    <div className="mt-3 grid grid-cols-2 gap-2">

                      <div className="rounded bg-white/60 p-2">

                        <p className="text-[9px] font-bold uppercase text-gray-500">
                          Place Date
                        </p>

                        <p className="mt-1 text-[11px] font-semibold">
                          {formatDate(
                            bet.createdAt ||
                              bet.placeDate
                          )}
                        </p>

                      </div>

                      <div className="rounded bg-white/60 p-2">

                        <p className="text-[9px] font-bold uppercase text-gray-500">
                          Match Date
                        </p>

                        <p className="mt-1 text-[11px] font-semibold">
                          {formatDate(
                            bet.matchDate
                          )}
                        </p>

                      </div>

                    </div>

                    {/* SPORT */}
                    <div className="mt-3 flex items-center justify-between border-t border-black/10 pt-2">

                      <span className="text-[10px] font-bold text-gray-600">
                        {bet.sport ||
                          'DEMO SPORT'}
                      </span>

                      <span className="text-[10px] font-extrabold uppercase text-gray-700">
                        {bet.type ||
                          bet.side ||
                          'DEMO'}
                      </span>

                    </div>

                  </div>

                </article>
              );
            })}

          </div>

        )}

        {/* DEMO NOTICE */}
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">

          <p className="text-xs font-bold text-amber-900">
            DEMO BET HISTORY
          </p>

          <p className="mt-1 text-[11px] leading-5 text-amber-800">
            This page displays demo play records and demo
            coins only. No real-money transactions are
            processed.
          </p>

        </div>

        {/* BACK */}
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
