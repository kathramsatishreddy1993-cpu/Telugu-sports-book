import React, { useEffect, useRef, useState } from 'react';
import ExistingMatchDetailsPage from './MatchDetailsPage.previous.jsx';

const TEAL = '#0BB1B8';
const WINE = '#791A40';

const quickStakes = [
  100, 200, 500, 1000, 2000, 5000, 10000, 25000,
];

const format = value =>
  value == null ? '—' : String(value);

const coins = value =>
  Number.isFinite(Number(value))
    ? Number(value).toLocaleString('en-IN', {
        maximumFractionDigits: 2,
      })
    : '—';

const same = (a, b) =>
  a != null &&
  b != null &&
  String(a) === String(b);

function dateParts(value) {
  const date = value ? new Date(value) : null;

  if (!date || !Number.isFinite(date.getTime())) {
    return ['Date unavailable', ''];
  }

  return [
    date.toLocaleDateString('en-GB', {
      timeZone: 'Asia/Kolkata',
    }),

    date.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' IST',
  ];
}

// Reads the score supplied by the existing server feed.
function scoreText(event) {
  if (event.scoreAvailable === false) return '';

  const value = event.score;

  if (
    typeof value === 'number' &&
    Number.isFinite(value)
  ) {
    return String(value);
  }

  if (typeof value !== 'string') return '';

  const text = value.trim();

  if (
    !text ||
    /^(—|-|null|undefined|n\/?a|unknown|unavailable)$/i.test(text) ||
    /unavailable|awaiting|not available/i.test(text)
  ) {
    return '';
  }

  return text;
}

function blockedStatus(value) {
  const status = String(value || '')
    .trim()
    .toUpperCase();

  if (/BALL[ _-]*RUNNING/.test(status)) {
    return 'BALL RUNNING';
  }

  if (
    /SUSPEND|INACTIVE|PAUSED|STOPPED/.test(status)
  ) {
    return 'SUSPENDED';
  }

  if (/CLOSE|ENDED|FINISHED|SETTLED/.test(status)) {
    return 'CLOSED';
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
    Number(price) >= (session ? 0 : 0.000001) &&
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

    previous: !usable && Boolean(saved),
  };
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
      new Error(data.error || 'Request failed.'),
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

  const [state, setState] = useState({
    balance: null,
    bets: [],
    quotes: [],
    error: '',
    quoteError: '',
    quoteAt: 0,
  });

  const [selected, setSelected] = useState(null);
  const [stake, setStake] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const retry = useRef(null);
  const requestKey = useRef('');
  const busyRef = useRef(false);
  const generation = useRef(0);
  const revision = useRef(0);
  const refreshRef = useRef(null);

  useEffect(() => {
    const token = ++generation.current;

    let active = true;
    let loading = false;

    busyRef.current = false;
    retry.current = null;

    setBusy(false);
    setSelected(null);
    setStake('');
    setMessage('');

    setState({
      balance: null,
      bets: [],
      quotes: [],
      error: '',
      quoteError: '',
      quoteAt: 0,
    });

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

      const [wallet, market] =
        await Promise.allSettled([
          demoAPI(
            `/api/demo-bets?matchId=${encodeURIComponent(matchId)}`,
          ),

          demoAPI(
            `/api/demo-bets/markets?matchId=${encodeURIComponent(matchId)}`,
          ),
        ]);

      if (
        active &&
        generation.current === token &&
        !busyRef.current &&
        captured === revision.current
      ) {
        const walletOK =
          wallet.status === 'fulfilled' &&
          String(wallet.value.customerId) === customerId &&
          wallet.value.balance != null &&
          Number.isFinite(Number(wallet.value.balance));

        setState(previous => ({
          ...previous,

          balance: walletOK
            ? Number(wallet.value.balance)
            : null,

          bets: walletOK
            ? Array.isArray(wallet.value.bets)
              ? wallet.value.bets
              : []
            : [],

          error: walletOK
            ? ''
            : wallet.status === 'rejected'
              ? wallet.reason.message
              : 'Please logout and login again.',

          quotes:
            market.status === 'fulfilled' &&
            Array.isArray(market.value.quotes)
              ? market.value.quotes
              : [],

          quoteAt:
            market.status === 'fulfilled'
              ? Date.now()
              : 0,

          quoteError:
            market.status === 'fulfilled'
              ? ''
              : market.reason.message,
        }));
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
      generation.current += 1;

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
      state.error ||
      state.quoteError ||
      !quote?.allowed ||
      state.balance == null
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
    if (busyRef.current || !selected) return;

    if (!retry.current && !canSubmit) {
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

    if (
      !retry.current &&
      amount > state.balance
    ) {
      setMessage('Insufficient demo coins.');
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

    const token = generation.current;

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

      if (generation.current === token) {
        setState(previous => ({
          ...previous,
          balance: Number(data.balance),

          bets: [
            data.bet,

            ...previous.bets.filter(
              bet => !same(bet.id, data.bet.id),
            ),
          ],
        }));

        setSelected(null);
        retry.current = null;
        setMessage('Demo selection saved.');

        notify();
      }
    } catch (failure) {
      if (generation.current === token) {
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
      if (generation.current === token) {
        busyRef.current = false;
        setBusy(false);

        void refreshRef.current?.();
      }
    }
  };

  const simulate = async (betId, outcome) => {
    if (busyRef.current) return;

    const token = generation.current;

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

      if (generation.current === token) {
        setState(previous => ({
          ...previous,
          balance: Number(data.balance),

          bets: previous.bets.map(bet =>
            same(bet.id, data.bet.id)
              ? data.bet
              : bet,
          ),
        }));

        setMessage(
          'Demo result simulated. This is not an official match result.',
        );

        notify();
      }
    } catch (failure) {
      if (generation.current === token) {
        setMessage(failure.message);
      }
    } finally {
      if (generation.current === token) {
        busyRef.current = false;
        setBusy(false);

        void refreshRef.current?.();
      }
    }
  };

  return {
    ...state,
    selected,
    stake,
    setStake,
    message,
    busy,
    pick,
    close,
    save,
    simulate,
    retrying: Boolean(retry.current),
  };
}

function Price({
  value,
  size,
  side,
  onPick,
  disabled,
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      className="flex min-h-[64px] min-w-0 flex-col items-center justify-center p-1 text-white disabled:cursor-not-allowed"
      style={{
        background:
          side === 'BACK' ? TEAL : WINE,
      }}
    >
      <strong className="text-xl font-black tabular-nums">
        {format(value)}
      </strong>

      <span className="mt-1 text-[9px]">
        {size == null ? side : coins(size)}
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

  const values = row.values || {};

  const choice = side =>
    wallet.quotes.find(
      quote =>
        same(quote.marketId, marketId) &&
        same(quote.selectionId, selectionId) &&
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
    !wallet.error &&
    !wallet.quoteError &&
    !wallet.busy &&
    wallet.balance != null &&
    Date.now() - wallet.quoteAt < 15000 &&
    value != null &&
    Number.isFinite(Number(value)) &&
    Number(size) > 0 &&
    Number(quote.rate) === Number(value) &&
    (
      first !== 'LAY' ||
      Number(quote.sessionRate) === Number(size)
    );

  const other =
    first === 'BACK' ? 'LAY' : 'BACK';

  const a = choice(first);
  const b = choice(other);

  return (
    <div
      className="relative grid grid-cols-2 gap-px overflow-hidden"
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
        side={other}
        value={values.b}
        size={values.bs}
        disabled={!ready(b, values.b, values.bs)}
        onPick={() => wallet.pick(b)}
      />

      {label && (
        <div
          role="status"
          className="absolute inset-0 flex flex-col items-center justify-center px-1 text-center text-white"
          style={{
            background: 'rgba(121,26,64,0.92)',
          }}
        >
          <strong className="text-[10px] font-black">
            {label}
          </strong>

          {row.previous && (
            <span className="mt-1 text-[8px]">
              LAST RECEIVED PRICES
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Only pending match-odds selections contribute here.
// The existing API treats a LAY stake as held liability.
function runnerExposure(bets, runners, runner) {
  let stake = 0;
  let profit = 0;
  let count = 0;
  let known = true;

  for (const bet of bets) {
    if (
      bet.marketId !== 'match-odds' ||
      String(bet.status).toUpperCase() !== 'MATCHED' ||
      (
        bet.result &&
        String(bet.result).toUpperCase() !== 'PENDING'
      )
    ) {
      continue;
    }

    const amount = Number(bet.stake);
    const rate = Number(bet.rate);

    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !Number.isFinite(rate) ||
      rate <= 1
    ) {
      continue;
    }

    const selection =
      runners.find(item =>
        same(item.selectionId, bet.selectionId),
      ) ||
      runners.find(
        item =>
          String(item.name).trim().toLowerCase() ===
          String(bet.selection).trim().toLowerCase(),
      );

    if (!selection) {
      known = false;
      continue;
    }

    const isSelected = same(
      selection.selectionId,
      runner.selectionId,
    );

    const type = String(bet.type).toUpperCase();

    if (!['BACK', 'LAY'].includes(type)) {
      known = false;
      continue;
    }

    const supplied = Number(bet.payoutRate);

    const multiplier =
      Number.isFinite(supplied) && supplied > 1
        ? supplied
        : type === 'BACK'
          ? rate
          : 1 + 1 / (rate - 1);

    count += 1;

    if (isSelected) {
      stake += amount;
    }

    profit +=
      type === 'BACK'
        ? isSelected
          ? amount * (multiplier - 1)
          : -amount
        : isSelected
          ? -amount
          : amount * (multiplier - 1);
  }

  return {
    stake,
    profit: Math.round(profit * 100) / 100,
    count,
    known,
  };
}

function BetsView({ wallet }) {
  return (
    <section
      className="m-3 overflow-hidden rounded-xl border bg-white"
      style={{ borderColor: WINE }}
    >
      <h2
        className="px-3 py-3 text-sm font-black text-white"
        style={{ background: WINE }}
      >
        YOUR MATCHED BET
      </h2>

      <div className="grid grid-cols-[minmax(0,1fr)_60px_80px] gap-2 border-b p-3 text-xs font-black">
        <span>Selection</span>

        <span className="text-center">
          Odds
        </span>

        <span className="text-right">
          Stake / Risk
        </span>
      </div>

      {!wallet.bets.length && (
        <p className="p-5 text-center text-sm">
          No demo selections for this match.
        </p>
      )}

      {wallet.bets.map(bet => (
        <article
          key={bet.id}
          className="border-b p-3 last:border-b-0"
        >
          <div className="grid grid-cols-[minmax(0,1fr)_60px_80px] items-start gap-2 text-xs">
            <div className="min-w-0">
              <strong className="break-words">
                {bet.selection} · {bet.type}
              </strong>

              <p className="mt-1 text-[10px]">
                {bet.market}
              </p>
            </div>

            <strong className="text-center tabular-nums">
              {format(bet.rate)}
            </strong>

            <strong className="text-right tabular-nums">
              {coins(bet.stake)}

              <span className="block text-[9px] font-normal">
                Coins
              </span>
            </strong>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px]">
            <span
              className="rounded-full px-3 py-1 font-bold text-white"
              style={{ background: WINE }}
            >
              {bet.status} · {bet.result || 'PENDING'}
            </span>

            <span>
              Settled P/L: {coins(bet.profitLoss ?? 0)}
            </span>
          </div>

          {bet.createdAt && (
            <p className="mt-2 text-[9px]">
              {dateParts(bet.createdAt).join(' · ')}
            </p>
          )}

          {bet.status === 'MATCHED' && (
            <details className="mt-3 text-[10px]">
              <summary
                className="cursor-pointer font-bold"
                style={{ color: WINE }}
              >
                Demo simulation controls
              </summary>

              <p className="mt-2">
                Manual demo result only; not an
                official match result.
              </p>

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
                    className="rounded px-3 py-2 font-bold text-white disabled:opacity-50"
                    style={{ background: WINE }}
                  >
                    SIMULATE {outcome}
                  </button>
                ))}
              </div>
            </details>
          )}
        </article>
      ))}
    </section>
  );
}

function BetSlip({
  wallet,
  connected,
  clock,
}) {
  const selected = wallet.selected;

  if (!selected) return null;

  const current = wallet.quotes.find(
    quote =>
      same(quote.marketId, selected.marketId) &&
      same(
        quote.selectionId,
        selected.selectionId,
      ) &&
      quote.selection === selected.selection &&
      quote.type === selected.type,
  );

  const canSubmit = Boolean(
    connected &&
      !wallet.error &&
      !wallet.quoteError &&
      clock - wallet.quoteAt < 15000 &&
      current?.allowed &&
      Number(current.rate) === Number(selected.rate) &&
      Number(current.payoutRate) ===
        Number(selected.payoutRate),
  );

  const held = Number(wallet.stake) || 0;
  const payout = Number(selected.payoutRate);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60"
      onKeyDown={event => {
        if (event.key === 'Escape') {
          wallet.close();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Demo bet slip"
        className="max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-white p-4"
      >
        <div
          className="flex items-center justify-between gap-2 font-black"
          style={{ color: WINE }}
        >
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

          {selected.sessionRate != null
            ? ` · Rate: ${selected.sessionRate}`
            : ''}
        </p>

        <p className="mt-2 text-xs">
          Balance: {coins(wallet.balance)} Demo Coins
        </p>

        <label
          htmlFor="provider-demo-risk"
          className="mt-4 block text-xs font-bold"
        >
          {selected.type === 'LAY' ||
          selected.selection === 'NO'
            ? 'Risk / liability held'
            : 'Stake'}

          {' '}
          ({selected.min}–{selected.max} Coins)
        </label>

        <input
          autoFocus
          id="provider-demo-risk"
          inputMode="numeric"
          value={wallet.stake}
          disabled={wallet.busy || wallet.retrying}
          onChange={event => {
            if (/^\d*$/.test(event.target.value)) {
              wallet.setStake(event.target.value);
            }
          }}
          className="mt-2 w-full rounded-lg border-2 p-3 text-lg font-bold"
          style={{ borderColor: TEAL }}
          placeholder="Enter demo coins"
        />

        <div className="mt-3 grid grid-cols-4 gap-2">
          {quickStakes.map(amount => (
            <button
              key={amount}
              type="button"
              disabled={
                wallet.busy ||
                wallet.retrying ||
                amount < selected.min ||
                amount > selected.max
              }
              onClick={() =>
                wallet.setStake(String(amount))
              }
              className="rounded border py-2 text-xs font-bold disabled:opacity-30"
              style={{
                borderColor: TEAL,
                color: WINE,
              }}
            >
              {coins(amount)}
            </button>
          ))}
        </div>

        {Number.isFinite(payout) && (
          <p className="mt-3 text-xs">
            If simulated WON: {coins(held * payout)}
            {' '}Coins returned, including{' '}
            {coins(held)} held Coins.
          </p>
        )}

        <p className="mt-2 text-xs">
          If simulated LOST: lose {coins(held)} Coins.
          LAY / NO stake represents liability.
        </p>

        {!canSubmit && (
          <p
            className="mt-3 text-xs font-bold"
            style={{ color: WINE }}
          >
            Market paused or price changed. Close
            and choose the latest price.
          </p>
        )}

        {wallet.message && (
          <p
            role="status"
            className="mt-3 rounded border p-3 text-xs"
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
          onClick={() => wallet.save(canSubmit)}
          className="mt-4 w-full rounded-lg p-3 font-black text-white disabled:opacity-50"
          style={{ background: WINE }}
        >
          {wallet.busy
            ? 'SAVING...'
            : wallet.retrying
              ? 'RETRY SAME REQUEST'
              : 'SAVE DEMO SELECTION'}
        </button>

        <p className="mt-3 text-[10px]">
          Virtual coins only. Manual simulation;
          no real-money payout.
        </p>
      </section>
    </div>
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

  const [tab, setTab] = useState('odds');
  const [event, setEvent] = useState(match);
  const [meta, setMeta] = useState(null);
  const [receivedAt, setReceivedAt] = useState(0);
  const [clock, setClock] = useState(Date.now());
  const [error, setError] = useState('');
  const [available, setAvailable] = useState(false);

  const history = useRef(new Map());

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
          age <
            Math.max(
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
            'Unable to read sports feed.',
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
            'Connection unavailable. Waiting for an update.',
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
    setMeta(null);
    setError('');

    void load();

    if (typeof EventSource !== 'undefined') {
      stream = new EventSource(
        '/api/sports/stream',
      );

      stream.onmessage = message => {
        try {
          apply(JSON.parse(message.data));
        } catch {
          // GET retries automatically.
        }
      };

      stream.onerror = () => {
        void load();
      };
    }

    const timer = setInterval(load, 5000);

    const tick = setInterval(
      () => setClock(Date.now()),
      1000,
    );

    window.addEventListener('focus', load);

    return () => {
      active = false;

      controller.abort();

      clearInterval(timer);
      clearInterval(tick);

      stream?.close();

      window.removeEventListener('focus', load);
    };

    // The selected event is replaced by server snapshots.
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
  const runners = odds?.runners || [];

  const limit = Math.max(
    Number(meta?.pollIntervalMs || 15000) * 3,
    30000,
  );

  const marketAge =
    clock - Date.parse(event.marketUpdatedAt || '');

  const fancyAge =
    clock - Date.parse(event.fancyUpdatedAt || '');

  const pricesFresh = Boolean(
    connected &&
      Number.isFinite(marketAge) &&
      marketAge >= -1000 &&
      marketAge < limit,
  );

  const fancyFresh = Boolean(
    connected &&
      Number.isFinite(fancyAge) &&
      fancyAge >= -1000 &&
      fancyAge < limit,
  );

  const [date, time] = dateParts(event.startTime);

  const score = scoreText(event);

  const marketStatus = !connected
    ? 'PAUSED'
    : !pricesFresh
      ? 'WAITING'
      : blockedStatus(odds?.status) ||
        (odds ? 'OPEN' : 'UNAVAILABLE');

  const warning =
    error ||
    (
      meta?.enabled === false
        ? 'Cricket updates paused.'
        : !available
          ? 'Waiting for this match feed.'
          : !connected
            ? 'Waiting for fresh data. Selections are paused.'
            : ''
    );

  const columns =
    'grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)]';

  return (
    <div
      className="min-h-screen bg-white text-slate-900"
      style={{
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div className="sticky top-0 z-40">
        <header
          className="flex items-center gap-2 px-3 py-4 text-white"
          style={{ background: TEAL }}
        >
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to matches"
            className="shrink-0 px-1 text-3xl"
          >
            ←
          </button>

          <h1 className="min-w-0 flex-1 text-center text-xs font-black sm:text-lg">
            TELUGU SPORTS BOOK
          </h1>

          <div
            className="shrink-0 rounded-lg px-2 py-2 text-center"
            style={{ background: '#008D96' }}
          >
            <strong className="block text-xs tabular-nums sm:text-base">
              {wallet.balance == null
                ? '…'
                : coins(wallet.balance)}
              {' '}Coins
            </strong>

            <span className="block text-[9px] font-bold">
              DEMO
            </span>
          </div>
        </header>

        <nav
          aria-label="Match tabs"
          className="grid grid-cols-2 text-white"
          style={{ background: WINE }}
        >
          {[
            ['odds', 'ODDS'],
            [
              'bets',
              `MATCHED BET (${wallet.bets.length})`,
            ],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-current={
                tab === id ? 'page' : undefined
              }
              onClick={() => setTab(id)}
              className="relative px-2 py-4 text-xs font-black sm:text-sm"
            >
              {label}

              {tab === id && (
                <span className="absolute bottom-0 left-[12%] h-1 w-[76%] rounded-full bg-white" />
              )}
            </button>
          ))}
        </nav>
      </div>

      <section
        className="flex items-center justify-between gap-3 px-3 py-3 text-white"
        style={{ background: TEAL }}
      >
        <div className="min-w-0">
          <h2 className="break-words text-sm font-black sm:text-lg">
            {event.homeTeam} v {event.awayTeam}
          </h2>
        </div>

        <div className="shrink-0 text-right text-[10px] font-bold sm:text-xs">
          <p>{date}</p>
          <p className="mt-1">{time}</p>
        </div>
      </section>

      {(wallet.error || wallet.quoteError) && (
        <p
          role="alert"
          className="border-b p-3 text-xs font-bold"
          style={{ color: WINE }}
        >
          {wallet.error || wallet.quoteError}
        </p>
      )}

      {wallet.message && !wallet.selected && (
        <p
          role="status"
          className="border-b p-3 text-xs"
          style={{ color: WINE }}
        >
          {wallet.message}
        </p>
      )}

      {tab === 'bets' ? (
        <BetsView wallet={wallet} />
      ) : (
        <>
          <section
            className="m-3 rounded-xl border-2 p-3 text-center"
            style={{ borderColor: TEAL }}
          >
            <h2
              className="text-xs font-black"
              style={{ color: TEAL }}
            >
              SCORE
            </h2>

            <p className="mt-2 whitespace-pre-line break-words text-base font-bold">
              {score || 'Awaiting live score'}
            </p>

            {score && !connected && (
              <p
                className="mt-2 text-[10px]"
                style={{ color: WINE }}
              >
                Last received score · waiting for update
              </p>
            )}
          </section>

          {warning && (
            <p
              role="status"
              className="mx-3 mb-3 rounded-lg border px-3 py-2 text-[10px] font-bold"
              style={{
                color: WINE,
                borderColor: WINE,
              }}
            >
              {warning}
            </p>
          )}

          <section
            className="mx-3 overflow-hidden rounded-xl border"
            style={{ borderColor: TEAL }}
          >
            <div
              className="flex items-center justify-between gap-2 px-3 py-3 text-white"
              style={{ background: TEAL }}
            >
              <h2 className="text-sm font-black">
                MATCH ODDS
              </h2>

              <span
                className="rounded-lg px-3 py-2 text-[10px] font-black"
                style={{ background: WINE }}
              >
                {marketStatus}
              </span>
            </div>

            <div
              className={`${columns} border-b text-[10px] font-black`}
            >
              <span className="p-3">TEAM</span>

              <div className="grid grid-cols-2 items-center text-center">
                <span>BACK</span>
                <span>LAY</span>
              </div>
            </div>

            {runners.map(runner => {
              const exposure = runnerExposure(
                wallet.bets,
                runners,
                runner,
              );

              return (
                <div
                  key={runner.selectionId}
                  className={`${columns} items-stretch border-b last:border-b-0`}
                  style={{ borderColor: TEAL }}
                >
                  <div className="min-w-0 self-center p-3">
                    <strong className="break-words text-xs sm:text-sm">
                      {runner.name}
                    </strong>

                    {exposure.known &&
                      exposure.count > 0 && (
                        <p
                          className="mt-1 text-sm font-black"
                          style={{
                            color:
                              exposure.profit < 0
                                ? WINE
                                : '#00836B',
                          }}
                        >
                          {exposure.profit >= 0 ? '+' : ''}
                          {coins(exposure.profit)} Coins
                        </p>
                      )}

                    {!exposure.known && (
                      <p className="mt-1 text-[9px]">
                        Outcome P/L unavailable
                      </p>
                    )}

                    {exposure.stake > 0 && (
                      <p className="mt-1 text-[9px]">
                        Your stake / risk:{' '}
                        {coins(exposure.stake)} Coins
                      </p>
                    )}
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
              );
            })}

            {!runners.length && (
              <p className="p-4 text-xs">
                Match odds unavailable.
              </p>
            )}

            {runners.length > 0 && (
              <p className="border-t px-3 py-2 text-[9px]">
                Outcome P/L for pending match-odds
                selections · before any commission.
                Numbers below prices are provider size.
              </p>
            )}

            {odds?.delayed === true && (
              <p
                className="px-3 pb-2 text-[9px]"
                style={{ color: WINE }}
              >
                Provider indicates delayed prices.
              </p>
            )}
          </section>

          <section
            className="mx-3 mt-3 overflow-hidden rounded-xl border"
            style={{ borderColor: TEAL }}
          >
            <h2
              className="px-3 py-3 text-sm font-black text-white"
              style={{ background: TEAL }}
            >
              BOOKMAKER
            </h2>

            <p className="p-3 text-[9px]">
              Provider rate format; not decimal
              exchange odds.
            </p>

            <div
              className={`${columns} border-y text-[10px] font-black`}
            >
              <span className="p-3">TEAM</span>

              <div className="grid grid-cols-2 items-center text-center">
                <span>BACK</span>
                <span>LAY</span>
              </div>
            </div>

            {(event.bookmaker || []).map(row => (
              <div
                key={`${row.marketId}:${row.selectionId}`}
                className={`${columns} items-stretch border-b last:border-b-0`}
              >
                <div className="min-w-0 self-center p-3">
                  <strong className="break-words text-xs">
                    {row.name}
                  </strong>
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
                No bookmaker markets available.
              </p>
            )}
          </section>

          <section
            className="mx-3 mt-3 overflow-hidden rounded-xl border"
            style={{ borderColor: TEAL }}
          >
            <h2
              className="px-3 py-3 text-sm font-black text-white"
              style={{ background: TEAL }}
            >
              FANCY / SESSION
            </h2>

            <div
              className={`${columns} border-b text-[10px] font-black`}
            >
              <span className="p-3">MARKET</span>

              <div className="grid grid-cols-2 items-center text-center">
                <span>NO · RATE</span>
                <span>YES · RATE</span>
              </div>
            </div>

            {(event.fancy || []).map(row => (
              <div
                key={row.id}
                className={`${columns} items-stretch border-b last:border-b-0`}
              >
                <div className="min-w-0 self-center p-3">
                  <strong className="break-words text-xs">
                    {row.title}
                  </strong>
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
                No fancy / session markets available.
              </p>
            )}
          </section>
        </>
      )}

      <footer className="p-4 text-center text-[10px]">
        Demo coins only
      </footer>

      <BetSlip
        wallet={wallet}
        connected={connected}
        clock={clock}
      />
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
