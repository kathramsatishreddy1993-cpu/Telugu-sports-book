import React, { useMemo, useState } from 'react';
import { useLiveSports } from '../hooks/useLiveSports';

const SPORT_FILTERS = [
  {
    id: 'all',
    name: 'All Sports',
    icon: '🏆',
  },
  {
    id: 'cricket',
    name: 'Cricket',
    icon: '🏏',
  },
  {
    id: 'football',
    name: 'Football',
    icon: '⚽',
  },
  {
    id: 'tennis',
    name: 'Tennis',
    icon: '🎾',
  },
  {
    id: 'basketball',
    name: 'Basketball',
    icon: '🏀',
  },
  {
    id: 'baseball',
    name: 'Baseball',
    icon: '⚾',
  },
  {
    id: 'fight_events',
    name: 'Fight Events',
    icon: '🥊',
  },
];

function formatStartTime(value) {
  if (!value) {
    return 'Time unavailable';
  }

  try {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return 'Time unavailable';
    }

    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Time unavailable';
  }
}

function getSportIcon(sport) {
  const found = SPORT_FILTERS.find(
    (item) => item.id === String(sport).toLowerCase()
  );

  return found?.icon || '🏆';
}

function getStatusClasses(status) {
  switch (status) {
    case 'LIVE':
      return 'bg-red-500/15 text-red-400 border-red-500/30';

    case 'ENDED':
      return 'bg-slate-700/40 text-slate-400 border-slate-700';

    default:
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  }
}

function EventCard({ event }) {
  const status =
    String(event?.status || 'UPCOMING').toUpperCase();

  const isDemo =
    String(event?.source || '').toUpperCase() !==
    'REAL_API';

  return (
    <div className="bg-[#0f172a] border border-gray-800 rounded-xl p-4 hover:border-amber-500/40 transition">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl">
            {getSportIcon(event?.sport)}
          </span>

          <div className="min-w-0">
            <div className="text-xs text-gray-400 uppercase truncate">
              {event?.league || 'Sports Event'}
            </div>

            <div className="text-xs text-gray-500 mt-0.5">
              {formatStartTime(event?.startTime)}
            </div>
          </div>
        </div>

        <span
          className={`shrink-0 px-2 py-1 rounded-full border text-[10px] font-bold ${getStatusClasses(
            status
          )}`}
        >
          {status === 'LIVE' ? '● LIVE' : status}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-white truncate">
            {event?.homeTeam || 'Home Team'}
          </span>

          {status === 'LIVE' && (
            <span className="text-xs font-bold text-emerald-400">
              LIVE
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-white truncate">
            {event?.awayTeam || 'Away Team'}
          </span>
        </div>
      </div>

      {event?.score && (
        <div className="mt-3 px-3 py-2 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-gray-300">
          {event.score}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <span
          className={`text-[10px] font-semibold uppercase ${
            isDemo
              ? 'text-slate-500'
              : 'text-emerald-400'
          }`}
        >
          {isDemo ? 'DEMO / MOCK DATA' : 'LIVE API DATA'}
        </span>

        <span className="text-[10px] text-gray-600">
          Informational
        </span>
      </div>
    </div>
  );
}

export default function SportsSections() {
  const [selectedSport, setSelectedSport] =
    useState('all');

  const {
    events,
    loading,
    isLiveConnected,
    dataFeedType,
  } = useLiveSports(selectedSport);

  const counts = useMemo(() => {
    const result = {};

    SPORT_FILTERS.forEach((sport) => {
      result[sport.id] = 0;
    });

    events.forEach((event) => {
      const sport =
        String(event?.sport || '').toLowerCase();

      if (result[sport] !== undefined) {
        result[sport] += 1;
      }
    });

    return result;
  }, [events]);

  const liveEvents = useMemo(
    () =>
      events.filter(
        (event) =>
          String(event?.status || '').toUpperCase() ===
          'LIVE'
      ),
    [events]
  );

  const upcomingEvents = useMemo(
    () =>
      events.filter(
        (event) =>
          String(event?.status || '').toUpperCase() !==
          'LIVE'
      ),
    [events]
  );

  const isDemo =
    dataFeedType !== 'REAL_API';

  return (
    <section className="max-w-7xl mx-auto px-4 mt-8 pb-8">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-gray-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white uppercase tracking-wider">
              Live Sports
            </h2>

            {isLiveConnected && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 uppercase">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Connected
              </span>
            )}
          </div>

          <p className="text-xs text-gray-500 mt-1">
            {isDemo
              ? 'Demo / mock sports data'
              : 'Live data from sports API'}
          </p>
        </div>

        <div
          className={`text-[10px] font-bold px-3 py-1.5 rounded-full border ${
            isDemo
              ? 'text-amber-400 border-amber-500/20 bg-amber-500/10'
              : 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10'
          }`}
        >
          {isDemo
            ? 'DEMO MODE'
            : 'REAL API CONNECTED'}
        </div>
      </div>

      {/* Sport Filters */}
      <div className="mt-5 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {SPORT_FILTERS.map((sport) => {
          const isSelected =
            selectedSport === sport.id;

          const count =
            sport.id === 'all'
              ? events.length
              : counts[sport.id] || 0;

          return (
            <button
              key={sport.id}
              type="button"
              onClick={() =>
                setSelectedSport(sport.id)
              }
              className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition ${
                isSelected
                  ? 'bg-amber-400 text-slate-950 border-amber-400'
                  : 'bg-[#0f172a] text-gray-300 border-gray-800 hover:border-amber-500/40'
              }`}
            >
              <span>{sport.icon}</span>

              <span>{sport.name}</span>

              <span
                className={`text-[10px] ${
                  isSelected
                    ? 'text-slate-800'
                    : 'text-gray-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="bg-[#0f172a] border border-gray-800 rounded-xl p-5 animate-pulse"
            >
              <div className="h-4 bg-slate-800 rounded w-1/3 mb-4" />
              <div className="h-4 bg-slate-800 rounded w-2/3 mb-3" />
              <div className="h-4 bg-slate-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      {!loading && events.length === 0 && (
        <div className="mt-6 rounded-xl border border-gray-800 bg-[#0f172a] p-8 text-center">
          <div className="text-4xl mb-3">🏟️</div>

          <h3 className="text-white font-bold">
            No events available
          </h3>

          <p className="text-xs text-gray-500 mt-2">
            There are currently no sports events for this
            category.
          </p>
        </div>
      )}

      {!loading && events.length > 0 && (
        <>
          {/* Live Events */}
          {liveEvents.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />

                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Live Now
                </h3>

                <span className="text-xs text-red-400">
                  {liveEvents.length}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {liveEvents.map((event) => (
                  <EventCard
                    key={event.eventId}
                    event={event}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming / Other Events */}
          {upcomingEvents.length > 0 && (
            <div className="mt-7">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  {liveEvents.length > 0
                    ? 'Upcoming Events'
                    : 'Sports Events'}
                </h3>

                <span className="text-xs text-gray-500">
                  {upcomingEvents.length}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingEvents.map((event) => (
                  <EventCard
                    key={event.eventId}
                    event={event}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
