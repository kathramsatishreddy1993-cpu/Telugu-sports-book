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

function Price({
  value,
  size,
  side,
  onPick,
  disabled = true,
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
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
    </button>
  );
}

function PricePair({
  row,
  fresh,
  enabled,
  first = 'BACK',
  wallet,
  marketId,
  selectionId,
}) {
  const label = !enabled
    ? 'FEED PAUSED'
    : !fresh
      ? 'STALE DATA'
      : row.blocked;

  const values = row.values;

  const choice = side =>
    wallet?.quotes.find(
      quote =>
        quote.marketId === marketId &&
        quote.selectionId === String(selectionId) &&
        (
          first === 'LAY'
            ? quote.selection === (
                side === 'LAY' ? 'NO' : 'YES'
              )
            : quote.type === side
        ),
    );

  const ready = (quote, value, size) =>
    !label &&
    quote?.allowed &&
    !wallet?.error &&
    !wallet?.quoteError &&
    !wallet?.busy &&
    wallet?.balance != null &&
    Date.now() - wallet.quoteAt < 15000 &&
    Number(quote.rate) === Number(value) &&
    (
      first !== 'LAY' ||
      Number(quote.sessionRate) === Number(size)
    );

  const a = choice(first);

  const b = choice(
    first === 'BACK' ? 'LAY' : 'BACK',
  );

  return (
    <div
      className="relative grid grid-cols-2 gap-1 overflow-hidden rounded"
      aria-label={label || 'Provider prices'}
    >
      <Price
        side={first}
        value={values.a}
        size={values.as}
        disabled={!ready(a, values.a, values.as)}
        onPick={() => wallet.pick(a)}
      />

      <Price
        side={first === 'BACK' ? 'LAY' : 'BACK'}
        value={values.b}
        size={values.bs}
        disabled={!ready(b, values.b, values.bs)}
        onPick={() => wallet.pick(b)}
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

async function demoAPI(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: 'same-origin',
    cache: 'no-store',

    headers: {
      Accept: 'application/json',

      ...(options.body
        ? {
            'Content-Type': 'application/json',
          }
        : {}),
    },
  });

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      'Server response was not JSON.',
    );
  }

  if (!response.ok) {
    throw Object.assign(
      new Error(
        data.error || 'Request failed.',
      ),
      { status: response.status },
    );
  }

  return data;
}

function useDemoWallet(matchId, user) {
  const customerId = String(
    user?.id ??
      user?.customerId ??
      user?.customer_id ??
      '',
  );

  const context = `${customerId}:${matchId}`;
  const contextRef = useRef(context);
  contextRef.current = context;

  const [balance, setBalance] = useState(null);
  const [bets, setBets] = useState([]);
  const [quotes, setQuotes] = useState([]);

  const [error, setError] = useState('');
  const [quoteError, setQuoteError] = useState('');

  const [quoteAt, setQuoteAt] = useState(0);
  const [selected, setSelected] = useState(null);
  const [stake, setStake] = useState('');

  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [showBets, setShowBets] = useState(false);

  const retry = useRef(null);
  const requestKey = useRef('');
  const busyRef = useRef(false);
  const alive = useRef(false);
  const refreshRef = useRef(null);
  const revision = useRef(0);

  useEffect(() => {
    let active = true;
    let loading = false;

    alive.current = true;

    setBalance(null);
    setBets([]);
    setQuotes([]);
    setQuoteAt(0);
    setSelected(null);
    retry.current = null;

    const load = async () => {
      if (
        !active ||
        loading ||
        busyRef.current
      ) {
        return;
      }

      loading = true;

      const captured = revision.current;

      const results = await Promise.allSettled([
        demoAPI(
          `/api/demo-bets?matchId=${encodeURIComponent(matchId)}`,
        ),

        demoAPI(
          `/api/demo-bets/markets?matchId=${encodeURIComponent(matchId)}`,
        ),
      ]);

      if (
        active &&
        !busyRef.current &&
        captured === revision.current
      ) {
        const [wallet, market] = results;

        if (
          wallet.status === 'fulfilled' &&
          String(wallet.value.customerId) ===
            customerId
        ) {
          setBalance(
            Number(wallet.value.balance),
          );

          setBets(wallet.value.bets || []);
          setError('');
        } else {
          setError(
            wallet.status === 'rejected'
              ? wallet.reason.message
              : 'Please logout and login again.',
          );

          setBalance(null);
        }

        if (market.status === 'fulfilled') {
          setQuotes(
            market.value.quotes || [],
          );

          setQuoteAt(Date.now());
          setQuoteError('');
        } else {
          setQuotes([]);
          setQuoteAt(0);
          setQuoteError(
            market.reason.message,
          );
        }
      }

      loading = false;
    };

    refreshRef.current = load;

    void load();

    const timer = setInterval(load, 5000);

    window.addEventListener('focus', load);

    window.addEventListener(
      'demo-balance-updated',
      load,
    );

    return () => {
      active = false;
      alive.current = false;

      clearInterval(timer);

      window.removeEventListener('focus', load);

      window.removeEventListener(
        'demo-balance-updated',
        load,
      );
    };
  }, [matchId, customerId]);

  const notify = () => {
    window.dispatchEvent(
      new Event('demo-balance-updated'),
    );

    window.dispatchEvent(
      new Event('demo-bets-updated'),
    );
  };

  const pick = quote => {
    if (
      busyRef.current ||
      error ||
      quoteError ||
      !quote?.allowed ||
      balance == null
    ) {
      return;
    }

    retry.current = null;

    requestKey.current =
      globalThis.crypto?.randomUUID?.() ||
      `demo-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;

    setSelected(quote);
    setStake('');
    setMessage('');
  };

  const close = () => {
    if (busyRef.current) return;

    setSelected(null);
    retry.current = null;
    setMessage('');
  };

  const save = async canSubmit => {
    if (
      busyRef.current ||
      !selected
    ) {
      return;
    }

    if (
      !retry.current &&
      !canSubmit
    ) {
      setMessage(
        'Market paused or price changed. Close and select the latest price.',
      );

      return;
    }

    const amount = Number(stake);

    if (
      !retry.current &&
      (
        !Number.isSafeInteger(amount) ||
        amount < selected.min ||
        amount > selected.max
      )
    ) {
      setMessage(
        `Enter ${selected.min}–${selected.max} whole demo coins.`,
      );

      return;
    }

    const payload = retry.current || {
      requestKey: requestKey.current,
      matchId,
      marketId: selected.marketId,
      selection: selected.selection,
      selectionId: selected.selectionId,
      type: selected.type,
      stake: amount,
      expectedRate: selected.rate,
      expectedPayoutRate: selected.payoutRate,
    };

    const captured = context;

    retry.current = payload;
    revision.current += 1;
    busyRef.current = true;

    setBusy(true);
    setMessage('Saving to server...');

    try {
      const data = await demoAPI(
        '/api/demo-bets',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );

      if (
        alive.current &&
        contextRef.current === captured
      ) {
        setBalance(Number(data.balance));

        setBets(previous => [
          data.bet,
          ...previous.filter(
            bet => bet.id !== data.bet.id,
          ),
        ]);

        setSelected(null);
        retry.current = null;
        setMessage('Demo selection saved.');

        notify();
      }
    } catch (failure) {
      if (
        alive.current &&
        contextRef.current === captured
      ) {
        if (
          failure.status &&
          failure.status < 500
        ) {
          retry.current = null;
        }

        setMessage(
          failure.message +
          (
            retry.current
              ? ' Retry uses the same request key.'
              : ''
          ),
        );
      }
    } finally {
      busyRef.current = false;

      if (
        alive.current &&
        contextRef.current === captured
      ) {
        setBusy(false);
        void refreshRef.current?.();
      }
    }
  };

  const simulate = async (betId, outcome) => {
    if (busyRef.current) return;

    const captured = context;

    revision.current += 1;
    busyRef.current = true;

    setBusy(true);
    setMessage('');

    try {
      const data = await demoAPI(
        `/api/demo-bets/${encodeURIComponent(betId)}/simulate-settlement`,
        {
          method: 'POST',
          body: JSON.stringify({ outcome }),
        },
      );

      if (
        alive.current &&
        contextRef.current === captured
      ) {
        setBalance(Number(data.balance));

        setBets(previous =>
          previous.map(bet =>
            bet.id === data.bet.id
              ? data.bet
              : bet,
          ),
        );

        setMessage(
          'Demo result simulated. This is not an official match result.',
        );

        notify();
      }
    } catch (failure) {
      if (
        alive.current &&
        contextRef.current === captured
      ) {
        setMessage(failure.message);
      }
    } finally {
      busyRef.current = false;

      if (
        alive.current &&
        contextRef.current === captured
      ) {
        setBusy(false);
        void refreshRef.current?.();
      }
    }
  };

  return {
    balance,
    bets,
    quotes,
    error,
    quoteError,
    quoteAt,
    selected,
    stake,
    setStake,
    message,
    busy,
    showBets,
    setShowBets,
    pick,
    close,
    save,
    simulate,
    retrying: Boolean(retry.current),
  };
}

function WalletPanel({
  wallet,
  connected,
  clock,
}) {
  const selected = wallet.selected;

  const current = selected &&
    wallet.quotes.find(
      quote =>
        quote.marketId === selected.marketId &&
        quote.selectionId === selected.selectionId &&
        quote.selection === selected.selection &&
        quote.type === selected.type,
    );

  const canSubmit = Boolean(
    connected &&
    !wallet.error &&
    !wallet.quoteError &&
    clock - wallet.quoteAt < 15000 &&
    current?.allowed &&
    current.rate === selected?.rate &&
    current.payoutRate === selected?.payoutRate,
  );

  const held = Number(wallet.stake) || 0;

  return (
    <>
      {(wallet.error || wallet.quoteError) && (
        <p
          role="alert"
          className="bg-red-50 p-3 text-xs text-red-800"
        >
          {wallet.error || wallet.quoteError}
        </p>
      )}

      <button
        type="button"
        onClick={() =>
          wallet.setShowBets(!wallet.showBets)
        }
        className="w-full bg-[#9a5a00] p-3 text-xs font-black text-white"
      >
        {wallet.showBets ? 'HIDE' : 'SHOW'} MY DEMO BETS
        {' '}({wallet.bets.length})
      </button>

      {wallet.message && !selected && (
        <p
          role="status"
          className="bg-teal-50 p-3 text-xs"
        >
          {wallet.message}
        </p>
      )}

      {wallet.showBets && (
        <section className="space-y-2 p-3">
          {!wallet.bets.length && (
            <p className="text-xs">
              No demo selections saved for this match.
            </p>
          )}

          {wallet.bets.map(bet => (
            <article
              key={bet.id}
              className="rounded border bg-white p-3 text-xs"
            >
              <strong>
                {bet.market} · {bet.selection} · {bet.type}
              </strong>

              <p className="mt-1">
                Line / price: {bet.rate}
                {' · '}
                Risk held: {bet.stake} coins
              </p>

              <p className="mt-1">
                {bet.status} · {bet.result}
                {' · '}
                P/L: {bet.profitLoss}
              </p>

              {bet.status === 'MATCHED' && (
                <div className="mt-2 flex gap-2">
                  {['WON', 'LOST'].map(outcome => (
                    <button
                      key={outcome}
                      type="button"
                      disabled={wallet.busy}
                      onClick={() =>
                        wallet.simulate(
                          bet.id,
                          outcome,
                        )
                      }
                      className="rounded bg-slate-700 p-2 text-[10px] text-white disabled:opacity-50"
                    >
                      SIMULATE {outcome}
                    </button>
                  ))}
                </div>
              )}
            </article>
          ))}
        </section>
      )}

      {selected && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Demo bet slip"
            className="max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-t-xl bg-white p-4 shadow-xl"
          >
            <div className="flex justify-between">
              <strong>DEMO BET SLIP</strong>

              <button
                type="button"
                disabled={wallet.busy}
                onClick={wallet.close}
              >
                ✕ CLOSE
              </button>
            </div>

            <p className="mt-3 text-sm font-bold">
              {selected.market}
              {' · '}
              {selected.selection}
              {' · '}
              {selected.type}
            </p>

            <p className="mt-2 text-xs">
              Line / price: {selected.rate}

              {selected.sessionRate
                ? ` · Rate: ${selected.sessionRate}`
                : ''}
            </p>

            <p className="mt-2 text-xs">
              Wallet:{' '}
              {wallet.balance == null
                ? 'Unavailable'
                : wallet.balance.toLocaleString('en-IN')}
              {' '}demo coins
            </p>

            <label
              htmlFor="provider-demo-risk"
              className="mt-4 block text-xs font-bold"
            >
              Risk / coins held
              {' '}({selected.min}–{selected.max})
            </label>

            <input
              id="provider-demo-risk"
              inputMode="numeric"
              value={wallet.stake}
              disabled={
                wallet.busy || wallet.retrying
              }
              onChange={event => {
                if (
                  /^\d*$/.test(event.target.value)
                ) {
                  wallet.setStake(
                    event.target.value,
                  );
                }
              }}
              className="mt-2 w-full rounded border-2 p-3 text-lg font-bold"
              placeholder="Enter demo coins"
            />

            <div className="mt-2 grid grid-cols-4 gap-2">
              {[100, 500, 1000, 5000].map(amount => (
                <button
                  key={amount}
                  type="button"
                  disabled={
                    wallet.busy || wallet.retrying
                  }
                  onClick={() =>
                    wallet.setStake(
                      String(held + amount),
                    )
                  }
                  className="rounded bg-slate-100 p-2 text-xs"
                >
                  +{amount}
                </button>
              ))}
            </div>

            <p className="mt-3 text-xs">
              If simulated WON: return{' '}
              {Math.round(
                held * selected.payoutRate,
              )}
              {' '}coins, including {held} held coins.
            </p>

            <p className="mt-1 text-xs">
              If simulated LOST: lose the {held} held
              coins. LAY / NO risk is liability.
            </p>

            {!canSubmit && (
              <p className="mt-3 text-xs font-bold text-amber-800">
                Market paused or price changed.
                Choose the latest price.
              </p>
            )}

            {wallet.message && (
              <p
                role="status"
                className="mt-3 bg-teal-50 p-3 text-xs"
              >
                {wallet.message}
              </p>
            )}

            <button
              type="button"
              disabled={
                wallet.busy ||
                (!canSubmit && !wallet.retrying)
              }
              onClick={() =>
                wallet.save(canSubmit)
              }
              className="mt-4 w-full rounded bg-[#063f39] p-3 font-bold text-white disabled:opacity-50"
            >
              {wallet.busy
                ? 'SAVING...'
                : wallet.retrying
                  ? 'RETRY SAME REQUEST'
                  : 'SAVE DEMO SELECTION'}
            </button>

            <p className="mt-3 text-[10px] text-slate-600">
              Virtual coins only. Results are manually
              simulated; no official result settlement
              or real-money payout.
            </p>
          </section>
        </div>
      )}
    </>
  );
}

function ProviderMatch({
  match,
  user,
  onBack,
}) {
  const matchId = String(
    match.eventId ?? match.id ?? '',
  );

  const wallet = useDemoWallet(matchId, user);

  const [event, setEvent] = useState(match);
  const history = useRef(new Map());

  const [meta, setMeta] = useState(null);
  const [receivedAt, setReceivedAt] = useState(0);
  const [clock, setClock] = useState(Date.now());
  const [error, setError] = useState('');
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let active = true;
    let loading = false;
    let sequence = 0;
    let stream;
    let metaForSnapshot = {};

    const controller = new AbortController();

    history.current.clear();

    const decorate = item => {
      const config = metaForSnapshot;

      const fresh =
        config.enabled === true &&
        !config.stale &&
        !item.stale;

      const recent = value => {
        const age =
          Date.now() - Date.parse(value || '');

        return (
          fresh &&
          Number.isFinite(age) &&
          age >= -1000 &&
          age < Math.max(
            Number(config.pollIntervalMs || 15000) * 3,
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
          String(row.eventId ?? row.id) === matchId,
      );

      setAvailable(Boolean(found));

      metaForSnapshot =
        body.sports?.cricket || body;

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
    setAvailable(false);
    setReceivedAt(0);

    void load();

    if (typeof EventSource !== 'undefined') {
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

      window.removeEventListener('focus', focus);
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

  const limit = Math.max(
    Number(meta?.pollIntervalMs || 15000) * 3,
    30000,
  );

  const marketAge =
    clock - Date.parse(event.marketUpdatedAt || '');

  const pricesFresh = Boolean(
    connected &&
    Number.isFinite(marketAge) &&
    marketAge >= -1000 &&
    marketAge < limit,
  );

  const fancyAge =
    clock - Date.parse(event.fancyUpdatedAt || '');

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

        <div className="shrink-0 text-right text-[10px]">
          <span>DEMO COINS</span>

          <strong className="block text-sm text-amber-300">
            {wallet.balance == null
              ? '…'
              : wallet.balance.toLocaleString('en-IN')}
          </strong>
        </div>
      </header>

      <WalletPanel
        wallet={wallet}
        connected={connected}
        clock={clock}
      />

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
          SCORE
        </p>

        <p className="mt-1 font-bold">
          {event.scoreAvailable
            ? event.score
            : 'Live score unavailable for this event'}
        </p>
      </section>

      <section className="mt-2 overflow-hidden bg-white">
        <h2 className="bg-[#0b6259] px-3 py-2 text-sm font-black text-white">
          MATCH ODDS · {odds?.status || 'UNAVAILABLE'}
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
              wallet={wallet}
              marketId="match-odds"
              selectionId={runner.selectionId}
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
                {fancyFresh ? 'Updated' : 'Saved'}
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
              wallet={wallet}
              marketId={`bookmaker:${row.marketId}`}
              selectionId={row.selectionId}
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
                {fancyFresh ? 'Updated' : 'Saved'}
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
              wallet={wallet}
              marketId={`fancy:${row.id}`}
              selectionId={row.selectionId}
            />
          </div>
        ))}

        {!event.fancy?.length && (
          <p className="p-4 text-xs">
            No fancy/session rows returned for this event.
          </p>
        )}
      </section>

      <p className="m-3 rounded border border-amber-300 bg-amber-50 p-3 text-[11px] leading-5 text-amber-900">
        Virtual demo coins only. Tap an available price
        to select. Suspended or stale markets are paused.
        Results are manually simulated, not settled from
        live scores. A missing status does not verify
        that a market is open.
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
