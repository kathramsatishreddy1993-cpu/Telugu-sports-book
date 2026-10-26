import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import ExistingMatchDetailsPage from './MatchDetailsPage.previous.jsx';

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

function blockedStatus(value) {
  const status = String(value || '')
    .trim()
    .toUpperCase();

  if (/BALL[ _-]*RUNNING/.test(status)) {
    return 'BALL RUNNING';
  }

  if (/SUSPEND/.test(status)) {
    return 'SUSPENDED';
  }

  if (/CLOSE|ENDED|FINISHED|SETTLED/.test(status)) {
    return 'CLOSED';
  }

  if (/INACTIVE|PAUSED|STOPPED/.test(status)) {
    return 'SUSPENDED';
  }

  if (
    ['', 'UNKNOWN', 'OPEN', 'ACTIVE'].includes(status)
  ) {
    return '';
  }

  return status.slice(0, 40);
}

function rememberPair(
  cache,
  key,
  values,
  status,
  fresh,
  session = false,
) {
  const valid = (price, size) =>
    price != null &&
    Number.isFinite(Number(price)) &&
    Number(price) >= (
      session ? 0 : 0.000001
    ) &&
    Number(size) > 0;

  const usable =
    valid(values.a, values.as) ||
    valid(values.b, values.bs);

  const blocked = blockedStatus(status);

  if (fresh && usable && !blocked) {
    cache.set(key, {
      ...values,
      at: Date.now(),
    });
  }

  const previous = cache.get(key);

  const saved =
    previous &&
    Date.now() - previous.at < 1800000
      ? previous
      : null;

  return {
    values: usable
      ? values
      : saved || {
          a: null,
          as: null,
          b: null,
          bs: null,
        },

    blocked:
      blocked ||
      (!usable ? 'UNAVAILABLE' : ''),

    previous:
      !usable && Boolean(saved),
  };
}

function Price({ value, size, side }) {
  return (
    <div
      className={`flex min-h-[62px] min-w-0 flex-col items-center justify-center rounded p-1 ${
        side === 'BACK'
          ? 'bg-sky-200'
          : 'bg-pink-200'
      }`}
    >
      <strong className="text-base">
        {format(value)}
      </strong>

      <span className="mt-1 text-[10px] text-slate-600">
        {size == null ? side : format(size)}
      </span>
    </div>
  );
}

function PricePair({
  row,
  fresh,
  enabled,
  first = 'BACK',
}) {
  const label = !enabled
    ? 'FEED PAUSED'
    : !fresh
      ? 'STALE DATA'
      : row.blocked;

  const values = row.values;

  return (
    <div
      className="relative grid grid-cols-2 gap-1 overflow-hidden rounded"
      aria-label={label || 'Provider prices'}
    >
      <Price
        side={first}
        value={values.a}
        size={values.as}
      />

      <Price
        side={
          first === 'BACK'
            ? 'LAY'
            : 'BACK'
        }
        value={values.b}
        size={values.bs}
      />

      {label && (
        <div
          role="status"
          className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 px-1 text-center"
        >
          <strong className="text-[11px] font-black text-red-300 sm:text-sm">
            {label}
          </strong>

          {row.previous && (
            <span className="mt-1 text-[8px] text-white">
              LAST RECEIVED PRICES
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function ProviderMatch({ match, onBack }) {
  const matchId = String(
    match.eventId ?? match.id ?? '',
  );

  const history = useRef(new Map());

  const [event, setEvent] = useState(match);
  const [meta, setMeta] = useState(null);

  const [receivedAt, setReceivedAt] =
    useState(0);

  const [clock, setClock] =
    useState(Date.now());

  const [error, setError] =
    useState('');

  const [available, setAvailable] =
    useState(false);

  useEffect(() => {
    let active = true;
    let loading = false;
    let sequence = 0;
    let stream;
    let metaForSnapshot = {};

    const controller =
      new AbortController();

    history.current.clear();

    const decorate = item => {
      const config = metaForSnapshot;

      const fresh =
        config.enabled === true &&
        !config.stale &&
        !item.stale;

      const recent = value => {
        const age =
          Date.now() -
          Date.parse(value || '');

        return (
          fresh &&
          Number.isFinite(age) &&
          age >= -1000 &&
          age < Math.max(
            Number(
              config.pollIntervalMs || 15000,
            ) * 3,
            30000,
          )
        );
      };

      const pair = (
        key,
        values,
        status,
        isFresh,
        session = false,
      ) =>
        rememberPair(
          history.current,
          key,
          values,
          status,
          isFresh,
          session,
        );

      return {
        ...item,

        matchOdds: item.matchOdds
          ? {
              ...item.matchOdds,

              runners: (
                item.matchOdds.runners || []
              ).map(runner => ({
                ...runner,

                display: pair(
                  `odds:${item.matchOdds.marketId}:${runner.selectionId}`,
                  {
                    a: runner.back?.[0]?.price,
                    as: runner.back?.[0]?.size,
                    b: runner.lay?.[0]?.price,
                    bs: runner.lay?.[0]?.size,
                  },
                  blockedStatus(
                    item.matchOdds.status,
                  ) || runner.status,
                  recent(item.marketUpdatedAt),
                ),
              })),
            }
          : null,

        bookmaker: (
          item.bookmaker || []
        ).map(row => ({
          ...row,

          display: pair(
            `book:${row.marketId}:${row.selectionId}`,
            {
              a: row.back,
              as: row.backSize,
              b: row.lay,
              bs: row.laySize,
            },
            row.status,
            recent(item.fancyUpdatedAt),
          ),
        })),

        fancy: (
          item.fancy || []
        ).map(row => ({
          ...row,

          display: pair(
            `fancy:${row.id}`,
            {
              a: row.no,
              as: row.noRate,
              b: row.yes,
              bs: row.yesRate,
            },
            row.status,
            recent(item.fancyUpdatedAt),
            true,
          ),
        })),
      };
    };

    const apply = body => {
      if (!active || !body) return;

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

      metaForSnapshot =
        body.sports?.cricket || body;

      setAvailable(Boolean(found));

      if (found) {
        setEvent(decorate(found));
      }

      setMeta(metaForSnapshot);
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

        const body =
          await response.json();

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

    // Each server response replaces this event.
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

  const limit = Math.max(
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
      marketAge < limit,
  );

  const fancyAge =
    clock -
    Date.parse(event.fancyUpdatedAt || '');

  const fancyFresh = Boolean(
    connected &&
      Number.isFinite(fancyAge) &&
      fancyAge >= -1000 &&
      fancyAge < limit,
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
              ? 'SAVED DATA / WAITING FOR UPDATE'
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

        <div className="grid grid-cols-[minmax(0,1fr)_180px] gap-2 bg-slate-100 p-2 text-[10px] font-black">
          <span>TEAM</span>

          <div className="grid grid-cols-2 text-center">
            <span>BACK · SIZE</span>
            <span>LAY · SIZE</span>
          </div>
        </div>

        {(odds?.runners || []).map(runner => (
          <div
            key={runner.selectionId}
            className="grid grid-cols-[minmax(0,1fr)_180px] items-center gap-2 border-b p-2"
          >
            <div className="min-w-0">
              <strong className="break-words text-xs">
                {runner.name}
              </strong>

              <p className="mt-1 text-[9px]">
                {runner.status}
              </p>
            </div>

            <PricePair
              row={
                runner.display || {
                  values: {},
                }
              }
              fresh={pricesFresh}
              enabled={connected}
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
          Provider rate format · These values
          are not decimal exchange odds.
        </p>

        <div className="grid grid-cols-[minmax(0,1fr)_156px] gap-2 bg-slate-100 p-2 text-[10px] font-black">
          <span>TEAM</span>

          <div className="grid grid-cols-2 text-center">
            <span>BACK</span>
            <span>LAY</span>
          </div>
        </div>

        {(event.bookmaker || []).map(row => (
          <div
            key={`${row.marketId}:${row.selectionId}`}
            className="grid grid-cols-[minmax(0,1fr)_156px] items-center gap-2 border-b p-2"
          >
            <div className="min-w-0">
              <strong className="break-words text-xs">
                {row.name}
              </strong>

              <p className="mt-1 text-[9px]">
                {row.status}
                {' · '}
                {fancyFresh
                  ? 'Updated'
                  : 'Saved'}
              </p>
            </div>

            <PricePair
              row={
                row.display || {
                  values: {},
                }
              }
              fresh={fancyFresh}
              enabled={connected}
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

        <div className="grid grid-cols-[minmax(0,1fr)_156px] gap-2 bg-slate-100 p-2 text-[10px] font-black">
          <span>MARKET</span>

          <div className="grid grid-cols-2 text-center">
            <span>NO · RATE</span>
            <span>YES · RATE</span>
          </div>
        </div>

        {(event.fancy || []).map(row => (
          <div
            key={row.id}
            className="grid grid-cols-[minmax(0,1fr)_156px] items-center gap-2 border-b p-2"
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
                {fancyFresh
                  ? 'Updated'
                  : 'Saved'}
              </p>
            </div>

            <PricePair
              row={
                row.display || {
                  values: {},
                }
              }
              fresh={fancyFresh}
              enabled={connected}
              first="LAY"
            />
          </div>
        ))}

        {!event.fancy?.length && (
          <p className="p-4 text-xs">
            No fancy/session rows returned
            for this event.
          </p>
        )}
      </section>

      <p className="m-3 rounded border border-amber-300 bg-amber-50 p-3 text-[11px] leading-5 text-amber-900">
        Provider prices are for viewing.
        Demo selections are currently unavailable
        on these markets. A missing market status
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
