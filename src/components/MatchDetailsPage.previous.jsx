import React, {
  useEffect,
  useState,
} from 'react';

import ExistingMatchDetailsPage from './MatchDetailsPage.previous';

const format = value =>
  value == null ? '—' : String(value);

function formatDate(value) {
  if (!value) return 'Unavailable';

  const parsed = new Date(value);

  if (!Number.isFinite(parsed.getTime())) {
    return 'Unavailable';
  }

  return (
    parsed.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
    }) + ' IST'
  );
}

function Price({ value, size, side }) {
  return (
    <div
      className={`flex min-h-[50px] min-w-0 flex-col items-center justify-center rounded p-1 ${
        side === 'BACK'
          ? 'bg-sky-200'
          : 'bg-pink-200'
      }`}
    >
      <strong className="text-sm">
        {format(value)}
      </strong>

      <span className="text-[9px] text-slate-600">
        {size == null ? side : format(size)}
      </span>
    </div>
  );
}

function ProviderMatch({ match, onBack }) {
  const matchId = String(
    match.eventId ?? match.id ?? '',
  );

  const [event, setEvent] = useState(match);
  const [meta, setMeta] = useState(null);

  const [receivedAt, setReceivedAt] =
    useState(0);

  const [clock, setClock] =
    useState(Date.now());

  const [error, setError] = useState('');

  const [available, setAvailable] =
    useState(false);

  useEffect(() => {
    let active = true;
    let loading = false;
    let sequence = 0;
    let stream;

    const controller = new AbortController();

    const apply = body => {
      if (!active) return;

      const rows = Array.isArray(body.events)
        ? body.events
        : Array.isArray(body.data)
          ? body.data
          : null;

      if (!rows) return;

      sequence += 1;

      const found = rows.find(
        row =>
          String(row.eventId ?? row.id) ===
          matchId,
      );

      setAvailable(Boolean(found));

      if (found) {
        setEvent(found);
      }

      setMeta(body.sports?.cricket || body);
      setReceivedAt(Date.now());
      setError('');
    };

    const load = async () => {
      if (loading || !active) return;

      loading = true;

      const revision = sequence;

      try {
        const response = await fetch(
          '/api/sports/events?sport=cricket',
          {
            cache: 'no-store',
            credentials: 'same-origin',
            signal: controller.signal,
          },
        );

        const body = await response.json();

        if (!response.ok) {
          throw new Error(
            'Unable to read saved sports feed.',
          );
        }

        if (
          active &&
          revision === sequence
        ) {
          apply(body);
        }
      } catch (failure) {
        if (
          active &&
          revision === sequence &&
          failure.name !== 'AbortError'
        ) {
          setError(
            'Connection unavailable. Showing the last received prices.',
          );

          setReceivedAt(0);
        }
      } finally {
        loading = false;
      }
    };

    setEvent(match);
    setMeta(null);
    setAvailable(false);
    setReceivedAt(0);
    setError('');

    void load();

    if (
      typeof EventSource !== 'undefined'
    ) {
      stream = new EventSource(
        '/api/sports/stream',
      );

      stream.onmessage = message => {
        try {
          apply(JSON.parse(message.data));
        } catch {
          // Cached GET retries automatically.
        }
      };

      stream.onerror = () => {
        void load();
      };
    }

    const timer = setInterval(() => {
      void load();
    }, 5000);

    const tick = setInterval(() => {
      setClock(Date.now());
    }, 1000);

    const focus = () => {
      void load();
    };

    window.addEventListener('focus', focus);

    return () => {
      active = false;
      controller.abort();

      clearInterval(timer);
      clearInterval(tick);

      stream?.close();

      window.removeEventListener(
        'focus',
        focus,
      );
    };

    // Server responses replace the selected event.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  const connected = Boolean(
    available &&
      meta?.enabled === true &&
      !meta?.stale &&
      !event.stale &&
      !error &&
      receivedAt > 0 &&
      clock - receivedAt < 15000,
  );

  const odds = event.matchOdds;

  const freshnessLimit = Math.max(
    Number(meta?.pollIntervalMs || 15000) * 3,
    30000,
  );

  const marketAge =
    clock -
    Date.parse(event.marketUpdatedAt || '');

  const pricesFresh = Boolean(
    connected &&
      Number.isFinite(marketAge) &&
      marketAge >= -1000 &&
      marketAge < freshnessLimit,
  );

  const fancyAge =
    clock -
    Date.parse(event.fancyUpdatedAt || '');

  const fancyFresh = Boolean(
    connected &&
      Number.isFinite(fancyAge) &&
      fancyAge >= -1000 &&
      fancyAge < freshnessLimit,
  );

  const live = Boolean(
    pricesFresh &&
      event.status === 'LIVE' &&
      odds?.inplay === true,
  );

  return (
    <div className="min-h-screen bg-[#eeeeee] text-slate-900">
      <header className="sticky top-0 z-40 flex items-center gap-3 bg-[#063f39] p-3 text-white shadow">
        <button
          type="button"
          onClick={onBack}
          className="rounded border border-teal-500 px-3 py-2 font-bold"
        >
          ← Back
        </button>

        <div className="min-w-0 flex-1 text-center">
          <p className="text-sm font-black text-amber-300">
            TELUGU SPORTS BOOK
          </p>

          <p className="text-[10px]">
            SPORTBEX · PROVIDER MARKETS
          </p>
        </div>
      </header>

      <section className="bg-white p-4 shadow-sm">
        <p
          className={`text-[10px] font-black ${
            live
              ? 'text-red-600'
              : 'text-teal-700'
          }`}
        >
          {live
            ? '● LIVE'
            : !pricesFresh
              ? 'SAVED DATA / WAITING FOR MARKET UPDATE'
              : odds?.inplay === false
                ? 'UPCOMING / NOT IN PLAY'
                : 'MATCH STATUS UNAVAILABLE'}
        </p>

        <h1 className="mt-2 text-xl font-black">
          {event.homeTeam} vs {event.awayTeam}
        </h1>

        <p className="mt-2 text-xs text-slate-600">
          {event.league}
          {' · '}
          {formatDate(event.startTime)}
        </p>

        <p className="mt-2 text-[10px] text-slate-500">
          Last market response:{' '}
          {formatDate(event.marketUpdatedAt)}
        </p>
      </section>

      {(!connected || error) && (
        <p
          role="status"
          className="bg-amber-100 p-3 text-xs font-bold text-amber-900"
        >
          {error ||
            (meta?.enabled === false
              ? 'Cricket API OFF. Saved prices are shown.'
              : !available
                ? 'Waiting for this match in the saved feed.'
                : 'Waiting for a fresh provider response.')}
        </p>
      )}

      <section className="mt-2 bg-[#082f2c] p-4 text-white">
        <p className="text-[10px] text-teal-200">
          {connected ? 'SCORE' : 'SAVED SCORE'}
        </p>

        <p className="mt-1 font-bold">
          {event.scoreAvailable
            ? event.score
            : 'Live score unavailable for this event'}
        </p>
      </section>

      <section className="mt-2 overflow-hidden bg-white">
        <h2 className="bg-[#0b6259] px-3 py-2 text-sm font-black text-white">
          MATCH ODDS
          {' · '}
          {odds?.status || 'UNAVAILABLE'}
          {!pricesFresh && odds
            ? ' · SAVED'
            : ''}
        </h2>

        <p className="px-3 py-2 text-[10px] text-slate-600">
          {pricesFresh
            ? 'Latest saved provider response'
            : 'Saved / unavailable prices'}

          {odds?.delayed === true
            ? ' · Provider delay flag: delayed or unknown'
            : ''}
        </p>

        <div className="grid grid-cols-[1fr_96px_96px] bg-slate-100 px-3 py-2 text-center text-[10px] font-black">
          <span className="text-left">
            TEAM
          </span>

          <span>BACK · SIZE</span>
          <span>LAY · SIZE</span>
        </div>

        {(odds?.runners || []).map(runner => (
          <div
            key={runner.selectionId}
            className="grid grid-cols-[1fr_96px_96px] items-center gap-1 border-b p-2"
          >
            <div>
              <strong className="text-xs">
                {runner.name}
              </strong>

              <p className="text-[9px]">
                {runner.status}
              </p>
            </div>

            <Price
              side="BACK"
              value={runner.back?.[0]?.price}
              size={runner.back?.[0]?.size}
            />

            <Price
              side="LAY"
              value={runner.lay?.[0]?.price}
              size={runner.lay?.[0]?.size}
            />
          </div>
        ))}

        {!odds?.runners?.length && (
          <p className="p-4 text-xs">
            No Match Odds returned for this event.
          </p>
        )}
      </section>

      <section className="mt-2 bg-white">
        <h2 className="bg-[#0b6259] px-3 py-2 text-sm font-black text-white">
          BOOKMAKER
        </h2>

        <p className="p-3 text-[10px] text-slate-500">
          Provider rate format · These values are
          not decimal exchange odds.
        </p>

        <div className="grid grid-cols-[1fr_78px_78px] bg-slate-100 p-2 text-center text-[10px] font-black">
          <span className="text-left">
            TEAM
          </span>

          <span>BACK</span>
          <span>LAY</span>
        </div>

        {(event.bookmaker || []).map(row => (
          <div
            key={`${row.marketId}:${row.selectionId}`}
            className="grid grid-cols-[1fr_78px_78px] items-center gap-1 border-b p-2"
          >
            <div>
              <strong className="text-xs">
                {row.name}
              </strong>

              <p className="text-[9px]">
                {row.status}
                {' · '}
                {fancyFresh ? 'Updated' : 'Saved'}
              </p>
            </div>

            <Price
              side="BACK"
              value={row.back}
              size={row.backSize}
            />

            <Price
              side="LAY"
              value={row.lay}
              size={row.laySize}
            />
          </div>
        ))}

        {!event.bookmaker?.length && (
          <p className="p-4 text-xs">
            No bookmaker rows returned.
          </p>
        )}
      </section>

      <section className="mt-2 bg-white">
        <h2 className="bg-[#0b6259] px-3 py-2 text-sm font-black text-white">
          FANCY / SESSION
        </h2>

        <div className="grid grid-cols-[1fr_78px_78px] bg-slate-100 p-2 text-center text-[10px] font-black">
          <span className="text-left">
            MARKET
          </span>

          <span>NO · RATE</span>
          <span>YES · RATE</span>
        </div>

        {(event.fancy || []).map(row => (
          <div
            key={row.id}
            className="grid grid-cols-[1fr_78px_78px] items-center gap-1 border-b p-2"
          >
            <div className="min-w-0">
              <strong className="break-words text-xs">
                {row.title}
              </strong>

              <p className="mt-1 text-[9px] text-slate-600">
                {row.status === 'UNKNOWN'
                  ? 'Status not supplied'
                  : row.status}
                {' · '}
                {fancyFresh ? 'Updated' : 'Saved'}
              </p>
            </div>

            <Price
              side="LAY"
              value={row.no}
              size={row.noRate}
            />

            <Price
              side="BACK"
              value={row.yes}
              size={row.yesRate}
            />
          </div>
        ))}

        {!event.fancy?.length && (
          <p className="p-4 text-xs">
            No fancy/session rows returned for
            this event.
          </p>
        )}
      </section>

      <p className="m-3 rounded border border-amber-300 bg-amber-50 p-3 text-[11px] leading-5 text-amber-900">
        Provider prices are for viewing. Demo
        selections are currently unavailable on
        these markets. A missing market status
        does not mean the market is open.
      </p>

      <button
        type="button"
        onClick={onBack}
        className="m-3 w-[calc(100%-24px)] rounded bg-[#063f39] p-3 font-bold text-white"
      >
        ← BACK TO MATCHES
      </button>
    </div>
  );
}

export default function MatchDetailsPage(props) {
  if (props.match?.provider === 'sportbex') {
    return (
      <ProviderMatch
        key={String(
          props.match.eventId ?? props.match.id,
        )}
        {...props}
      />
    );
  }

  return <ExistingMatchDetailsPage {...props} />;
}
