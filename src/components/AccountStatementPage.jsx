import React, { useMemo, useState } from 'react';

const DEMO_ACTIVITY_KEY = 'tsb_demo_account_activity';

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getDefaultFromDate() {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().slice(0, 10);
}

export default function AccountStatementPage({ onBack }) {
  const [fromDate, setFromDate] = useState(getDefaultFromDate());
  const [toDate, setToDate] = useState(getToday());
  const [sport, setSport] = useState('ALL');

  const [activities] = useState(() => {
    try {
      const saved = localStorage.getItem(DEMO_ACTIVITY_KEY);

      if (!saved) {
        return [];
      }

      const parsed = JSON.parse(saved);

      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Unable to load demo account activity:', error);
      return [];
    }
  });

  const [filteredActivities, setFilteredActivities] =
    useState(activities);

  const sports = useMemo(() => {
    const availableSports = activities
      .map((item) => item.sport)
      .filter(Boolean);

    return ['ALL', ...new Set(availableSports)];
  }, [activities]);

  const handleSubmit = (event) => {
    event.preventDefault();

    const filtered = activities.filter((item) => {
      const activityDate = item.createdAt
        ? new Date(item.createdAt)
        : null;

      if (!activityDate || Number.isNaN(activityDate.getTime())) {
        return true;
      }

      const dateValue = activityDate.toISOString().slice(0, 10);

      const matchesFromDate =
        !fromDate || dateValue >= fromDate;

      const matchesToDate =
        !toDate || dateValue <= toDate;

      const matchesSport =
        sport === 'ALL' || item.sport === sport;

      return (
        matchesFromDate &&
        matchesToDate &&
        matchesSport
      );
    });

    setFilteredActivities(filtered);
  };

  const formatAmount = (value) => {
    const amount = Number(value || 0);

    return amount.toLocaleString('en-IN');
  };

  return (
    <div className="min-h-screen bg-[#f4f4f4] text-gray-900">

      {/* HEADER */}
      <header className="flex items-center justify-between bg-[#895000] px-3 py-3 text-white">

        <button
          type="button"
          onClick={onBack}
          className="rounded border border-white/50 px-3 py-2 text-sm font-bold"
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

        <div className="w-[60px]" />

      </header>

      {/* PAGE TITLE */}
      <div className="bg-teal-800 px-4 py-4 text-white">
        <h2 className="text-xl font-extrabold">
          Account Statement
        </h2>

        <p className="mt-1 text-xs text-teal-100">
          Demo Coin Activity
        </p>
      </div>

      {/* FILTER AREA */}
      <form
        onSubmit={handleSubmit}
        className="border-b bg-white p-4 shadow-sm"
      >

        <div className="grid grid-cols-2 gap-3">

          <div>
            <label className="mb-1 block text-xs font-bold text-gray-700">
              From Date
            </label>

            <input
              type="date"
              value={fromDate}
              onChange={(event) =>
                setFromDate(event.target.value)
              }
              className="w-full rounded border border-gray-300 bg-white px-2 py-3 text-sm outline-none focus:border-teal-700"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-gray-700">
              To Date
            </label>

            <input
              type="date"
              value={toDate}
              onChange={(event) =>
                setToDate(event.target.value)
              }
              className="w-full rounded border border-gray-300 bg-white px-2 py-3 text-sm outline-none focus:border-teal-700"
            />
          </div>

        </div>

        <div className="mt-3">
          <label className="mb-1 block text-xs font-bold text-gray-700">
            Sport
          </label>

          <select
            value={sport}
            onChange={(event) =>
              setSport(event.target.value)
            }
            className="w-full rounded border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-teal-700"
          >
            {sports.map((item) => (
              <option
                key={item}
                value={item}
              >
                {item === 'ALL' ? 'All Sports' : item}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="mt-4 w-full rounded bg-teal-800 py-3 text-sm font-extrabold text-white"
        >
          SUBMIT
        </button>

      </form>

      {/* STATEMENT */}
      <main className="p-3">

        <div className="overflow-hidden rounded-md border border-gray-300 bg-white">

          {/* TABLE HEADER */}
          <div className="grid grid-cols-[45px_1fr_70px_80px] bg-[#895000] text-[10px] font-bold text-white">

            <div className="border-r border-white/30 p-2 text-center">
              Sr No
            </div>

            <div className="border-r border-white/30 p-2">
              Details
            </div>

            <div className="border-r border-white/30 p-2 text-center">
              P/L
            </div>

            <div className="p-2 text-center">
              Balance
            </div>

          </div>

          {/* EMPTY STATE */}
          {filteredActivities.length === 0 && (
            <div className="px-4 py-12 text-center">

              <div className="text-4xl">
                📄
              </div>

              <h3 className="mt-3 text-sm font-extrabold text-gray-700">
                No Demo Activity
              </h3>

              <p className="mt-1 text-xs leading-5 text-gray-500">
                Demo match or game activity will appear
                here after it is recorded.
              </p>

            </div>
          )}

          {/* ACTIVITY ROWS */}
          {filteredActivities.map((item, index) => {
            const profitLoss = Number(
              item.profitLoss || 0
            );

            return (
              <div
                key={item.id || index}
                className="grid grid-cols-[45px_1fr_70px_80px] border-t border-gray-200 text-xs"
              >

                <div className="flex items-center justify-center border-r p-2 font-bold">
                  {index + 1}
                </div>

                <div className="border-r p-2">

                  <p className="font-extrabold text-gray-900">
                    {item.matchName ||
                      item.gameName ||
                      'Demo Activity'}
                  </p>

                  {item.selection && (
                    <p className="mt-1 text-[10px] text-gray-600">
                      Selection: {item.selection}
                    </p>
                  )}

                  <p className="mt-1 text-[10px] font-semibold text-teal-700">
                    {item.sport || 'DEMO'}
                  </p>

                  <p className="mt-1 text-[10px] text-gray-500">
                    Stake: 🪙
                    {formatAmount(item.stake)}
                  </p>

                  <p className="mt-1 text-[9px] text-gray-400">
                    {item.createdAt
                      ? new Date(
                          item.createdAt
                        ).toLocaleString('en-IN')
                      : '--'}
                  </p>

                </div>

                <div
                  className={`flex items-center justify-center border-r p-2 text-center font-extrabold ${
                    profitLoss > 0
                      ? 'text-green-700'
                      : profitLoss < 0
                      ? 'text-red-700'
                      : 'text-gray-600'
                  }`}
                >
                  {profitLoss > 0 ? '+' : ''}
                  {formatAmount(profitLoss)}
                </div>

                <div className="flex items-center justify-center p-2 text-center font-extrabold text-gray-900">
                  🪙
                  {formatAmount(item.balance)}
                </div>

              </div>
            );
          })}

        </div>

        {/* DEMO NOTICE */}
        <div className="mt-4 rounded-md border border-teal-200 bg-teal-50 p-3 text-center">

          <p className="text-xs font-extrabold text-teal-800">
            DEMO ACCOUNT STATEMENT
          </p>

          <p className="mt-1 text-[10px] leading-4 text-gray-600">
            Demo coins only. No real-money transactions.
          </p>

        </div>

      </main>

    </div>
  );
}
