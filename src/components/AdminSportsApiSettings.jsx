import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

const sports = [
  ['cricket', 'Cricket', 5],
  ['football', 'Football', 30],
  ['tennis', 'Tennis', 30],
  ['fantasy_eleven', 'Fantasy Eleven', 30],
  ['fight_events', 'Fight Events', 30],
  ['horse_racing', 'Horse Racing', 30],
  ['politics', 'Politics', 30],
  ['kabaddi', 'Kabaddi', 30],
];

async function request(options = {}) {
  const response = await fetch(
    '/api/admin/settings/sports-feed',
    {
      credentials: 'same-origin',
      cache: 'no-store',
      ...options,

      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    },
  );

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      'Server response was not JSON. Verify deployment.',
    );
  }

  if (!response.ok) {
    throw new Error(
      data.error ||
        'Unable to load API settings.',
    );
  }

  return data;
}

function time(value) {
  return value &&
    Number.isFinite(
      new Date(value).getTime(),
    )
    ? new Date(value).toLocaleString(
        'en-IN',
        {
          timeZone: 'Asia/Kolkata',
        },
      ) + ' IST'
    : 'No fresh update saved';
}

export default function AdminSportsApiSettings() {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const alive = useRef(false);
  const pending = useRef(false);
  const revision = useRef(0);

  useEffect(() => {
    alive.current = true;

    let loading = false;
    let active = true;

    const load = async () => {
      if (
        loading ||
        pending.current
      ) {
        return;
      }

      loading = true;

      const current = revision.current;

      try {
        const next = await request();

        if (
          active &&
          current === revision.current &&
          !pending.current
        ) {
          setData(next);
          setError('');
        }
      } catch (failure) {
        if (
          active &&
          current === revision.current &&
          !pending.current
        ) {
          setError(failure.message);
        }
      } finally {
        loading = false;
      }
    };

    void load();

    const timer = setInterval(
      load,
      5000,
    );

    return () => {
      active = false;
      alive.current = false;
      clearInterval(timer);
    };
  }, []);

  const change = async (
    sport,
    enabled,
  ) => {
    if (
      !data?.sports ||
      pending.current
    ) {
      return;
    }

    pending.current = true;
    revision.current += 1;

    setBusy(sport);
    setMessage('');
    setError('');

    try {
      const next = await request({
        method: 'POST',

        body: JSON.stringify({
          enabled: {
            sport,
            enabled,
          },

          version: data.version,
        }),
      });

      if (alive.current) {
        setData(next);

        const name = sports.find(
          item => item[0] === sport,
        )[1];

        setMessage(
          `${name} ${
            enabled
              ? 'ON saved. Waiting for fresh supported data.'
              : 'OFF saved. New provider calls and new bets paused; saved matches remain visible.'
          }`,
        );
      }
    } catch (failure) {
      if (alive.current) {
        setError(failure.message);
      }

      try {
        const next = await request();

        if (alive.current) {
          setData(next);
        }
      } catch {
        // Automatic refresh retries.
      }
    } finally {
      pending.current = false;

      if (alive.current) {
        setBusy('');
      }
    }
  };

  return (
    <section className="rounded-2xl border border-teal-700 bg-[#083d37] p-5 text-white">
      <h2 className="text-lg font-black text-amber-200">
        SPORTS API SETTINGS
      </h2>

      <p className="mt-3 text-sm leading-6 text-cyan-100">
        ప్రతి విభాగానికి ప్రత్యేక ON/OFF.
        Cricket: 5 seconds. Others: 30 seconds.
        OFFలో సేవ్ అయిన మ్యాచ్‌లు కనిపిస్తాయి;
        కొత్త బెట్‌లు ఆగుతాయి.
      </p>

      <p className="mt-2 text-xs text-cyan-100">
        Mode:{' '}
        {data?.mode === 'demo'
          ? 'DEMO / MOCK'
          : data?.mode === 'live'
            ? 'LIVE'
            : 'LOADING'}
        {' · '}
        Shared server feed for all customers.
      </p>

      {data && !data.sports && (
        <p
          role="alert"
          className="mt-4 text-amber-200"
        >
          Server update pending. Replace
          sportsService.js and restart before
          using these controls.
        </p>
      )}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {sports.map(
          ([id, name, seconds]) => {
            const state =
              data?.sports?.[id];

            return (
              <article
                key={id}
                className="rounded-xl border border-teal-600 bg-black/15 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-black text-amber-200">
                    {name}
                  </h3>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      state?.enabled
                        ? 'bg-emerald-300 text-black'
                        : 'bg-slate-700 text-white'
                    }`}
                  >
                    {!state
                      ? 'LOADING'
                      : state.enabled
                        ? 'ON'
                        : 'OFF'}
                  </span>
                </div>

                <p className="mt-2 text-xs">
                  Update interval:{' '}
                  <strong>
                    {seconds} seconds while ON
                  </strong>
                </p>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  {[true, false].map(
                    enabled => (
                      <button
                        key={String(enabled)}
                        type="button"
                        disabled={
                          !state ||
                          Boolean(busy) ||
                          state.enabled ===
                            enabled
                        }
                        onClick={() =>
                          change(id, enabled)
                        }
                        className={`rounded-lg py-3 font-black disabled:opacity-40 ${
                          enabled
                            ? 'bg-emerald-300 text-black'
                            : 'bg-rose-600 text-white'
                        }`}
                      >
                        {busy === id
                          ? 'SAVING…'
                          : enabled
                            ? 'ON'
                            : 'OFF'}
                      </button>
                    ),
                  )}
                </div>

                {state && (
                  <div className="mt-3 space-y-2 text-xs leading-5 text-slate-200">
                    <p>
                      {!state.enabled
                        ? 'API OFF — Betting Paused'
                        : !state.supported
                          ? 'Provider integration pending'
                          : state.stale
                            ? 'Waiting / unavailable — Betting Paused'
                            : data.mode === 'demo'
                              ? 'Demo feed active'
                              : 'Live scores active · Verified markets pending'}
                    </p>

                    <p>
                      Saved matches:{' '}
                      {state.savedMatches}
                      {' · '}
                      Last fresh update:{' '}
                      {time(
                        state.lastUpdated,
                      )}
                    </p>

                    {state.error && (
                      <p className="text-amber-200">
                        {state.error}
                      </p>
                    )}

                    {state.scheduleError && (
                      <p className="text-amber-200">
                        Schedule:{' '}
                        {state.scheduleError}
                      </p>
                    )}

                    {state.retryAt && (
                      <p className="text-amber-200">
                        Provider retry after:{' '}
                        {time(
                          state.retryAt,
                        )}
                      </p>
                    )}
                  </div>
                )}
              </article>
            );
          },
        )}
      </div>

      {message && (
        <p
          role="status"
          className="mt-4 text-sm text-emerald-200"
        >
          {message}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-4 text-sm text-amber-200"
        >
          {error}
        </p>
      )}

      <p className="mt-5 text-xs leading-5 text-slate-300">
        Settings save automatically and survive
        restart. Current live integration:
        Sportmonks Cricket scores only, without
        odds. Other live categories need their
        provider integration. Cricket upcoming
        schedule refresh remains every 5 minutes
        while ON. Demo fixtures appear only where
        the existing mock provider supplies them.
      </p>
    </section>
  );
}
