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

export default function AccountStatementPage({ user, onBack }) {
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

      if (
        !activityDate ||
        Number.isNaN(activityDate.getTime())
      ) {
        return true;
      }

      const dateValue = activityDate
        .toISOString()
        .slice(0, 10);

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

  const totalCredit = filteredActivities.reduce(
    (total, item) => total + Number(item.credit || 0),
    0
  );

  const totalDebit = filteredActivities.reduce(
    (total, item) => total + Number(item.debit || 0),
    0
  );

  const latestBalance =
    filteredActivities.length > 0
      ? Number(filteredActivities[0]?.balance || 0)
      : Number(
          localStorage.getItem('tsb_demo_coin_balance') ||
            10000
        );

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-gray-900">

      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-[#895000] px-3 py-3 text-white shadow">

        <div className="flex items-center justify-between">

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

      {/* PAGE TITLE */}
      <div className="bg-teal-800 px-4 py-4 text-white">
        <h2 className="text-xl font-extrabold">
          Account Statement
        </h2>

        <p className="mt-1 text-xs text-teal-100">
          Demo coin activity and transaction history
        </p>
      </div>

      <main className="mx-auto max-w-5xl p-3">

        {/* FILTER */}
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border bg-white p-3 shadow-sm"
        >

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">

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
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal-700"
              />
            </div>

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
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal-700"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-gray-600">
                Sport
              </label>

              <select
                value={sport}
                onChange={(event) =>
                  setSport(event.target.value)
                }
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal-700"
              >
                {sports.map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item === 'ALL'
                      ? 'All'
                      : item}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full rounded bg-teal-800 px-4 py-2 text-sm font-extrabold text-white hover:bg-teal-900"
              >
                Submit
              </button>
            </div>

          </div>
        </form>

        {/* SUMMARY */}
        <div className="mt-3 grid grid-cols-3 gap-2">

          <div className="rounded-lg bg-green-50 p-3 text-center shadow-sm">
            <p className="text-[10px] font-bold uppercase text-gray-500">
              Credit
            </p>

            <p className="mt-1 text-sm font-black text-green-700">
              +{formatNumber(totalCredit)}
            </p>
          </div>

          <div className="rounded-lg bg-red-50 p-3 text-center shadow-sm">
            <p className="text-[10px] font-bold uppercase text-gray-500">
              Debit
            </p>

            <p className="mt-1 text-sm font-black text-red-700">
              -{formatNumber(totalDebit)}
            </p>
          </div>

          <div className="rounded-lg bg-amber-50 p-3 text-center shadow-sm">
            <p className="text-[10px] font-bold uppercase text-gray-500">
              Balance
            </p>

            <p className="mt-1 text-sm font-black text-amber-700">
              🪙 {formatNumber(latestBalance)}
            </p>
          </div>

        </div>

        {/* ACCOUNT STATEMENT TABLE */}
        <section className="mt-3 overflow-hidden rounded-lg border bg-white shadow-sm">

          <div className="flex items-center justify-between bg-teal-800 px-3 py-3 text-white">

            <h3 className="text-sm font-extrabold">
              Demo Activity
            </h3>

            <span className="text-[10px] font-semibold">
              {filteredActivities.length} Records
            </span>

          </div>

          {filteredActivities.length === 0 ? (

            <div className="px-4 py-12 text-center">

              <div className="text-4xl">
                📄
              </div>

              <h4 className="mt-3 text-sm font-extrabold text-gray-700">
                No Account Activity
              </h4>

              <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-gray-500">
                Demo play activity will appear here after
                demo transactions or demo game activity are
                recorded.
              </p>

            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="min-w-[850px] w-full border-collapse text-xs">

                <thead>
                  <tr className="bg-gray-100 text-gray-700">

                    <th className="border-b px-3 py-3 text-left">
                      Sr No
                    </th>

                    <th className="border-b px-3 py-3 text-left">
                      Date
                    </th>

                    <th className="border-b px-3 py-3 text-left">
                      Match / Game
                    </th>

                    <th className="border-b px-3 py-3 text-left">
                      Sport
                    </th>

                    <th className="border-b px-3 py-3 text-right">
                      Credit
                    </th>

                    <th className="border-b px-3 py-3 text-right">
                      Debit
                    </th>

                    <th className="border-b px-3 py-3 text-right">
                      Balance
                    </th>

                    <th className="border-b px-3 py-3 text-left">
                      Remark
                    </th>

                  </tr>
                </thead>

                <tbody>

                  {filteredActivities.map((item, index) => (

                    <tr
                      key={
                        item.id ||
                        `${item.createdAt}-${index}`
                      }
                      className="border-b last:border-b-0"
                    >

                      <td className="px-3 py-3">
                        {index + 1}
                      </td>

                      <td className="whitespace-nowrap px-3 py-3">
                        {formatDate(item.createdAt)}
                      </td>

                      <td className="px-3 py-3 font-semibold">
                        {item.match ||
                          item.game ||
                          item.title ||
                          '-'}
                      </td>

                      <td className="px-3 py-3">
                        {item.sport || '-'}
                      </td>

                      <td className="px-3 py-3 text-right font-bold text-green-700">
                        {Number(item.credit || 0) > 0
                          ? `+${formatNumber(
                              item.credit
                            )}`
                          : '-'}
                      </td>

                      <td className="px-3 py-3 text-right font-bold text-red-700">
                        {Number(item.debit || 0) > 0
                          ? `-${formatNumber(
                              item.debit
                            )}`
                          : '-'}
                      </td>

                      <td className="px-3 py-3 text-right font-extrabold">
                        {formatNumber(item.balance)}
                      </td>

                      <td className="px-3 py-3">
                        {item.remark ||
                          item.result ||
                          'Demo Activity'}
                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          )}

        </section>

        {/* DEMO NOTICE */}
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">

          <p className="text-xs font-bold text-amber-900">
            DEMO ACCOUNT STATEMENT
          </p>

          <p className="mt-1 text-[11px] leading-5 text-amber-800">
            This page displays demo coin activity only.
            No real-money transactions are processed.
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
