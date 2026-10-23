import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

const quickStakes = [
  100,
  200,
  500,
  1000,
  2000,
  5000,
  10000,
  25000,
];

const newKey = () =>
  globalThis.crypto?.randomUUID?.() ||
  `demo-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: 'same-origin',
    cache: 'no-store',

    headers: {
      Accept: 'application/json',

      ...(options.body
        ? {
            'Content-Type':
              'application/json',
          }
        : {}),

      ...options.headers,
    },
  });

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      'Server response was not JSON. Verify the deployment.',
    );
  }

  if (!response.ok) {
    throw Object.assign(
      new Error(
        data.error ||
          'Unable to complete request.',
      ),
      {
        status: response.status,
        balance: data.balance,
      },
    );
  }

  return data;
}

export default function MatchDetailsPage({
  match,
  user,
  onBack,
  onUpdateWallet,
}) {
  const initial = match || {};

  const matchId = String(
    initial.eventId ??
      initial.id ??
      '',
  );

  const customerId = String(
    user?.id ??
      user?.customerId ??
      user?.customer_id ??
      '',
  );

  const context =
    `${customerId}:${matchId}`;

  const contextRef = useRef(context);
  contextRef.current = context;

  const alive = useRef(false);
  const busyRef = useRef(false);
  const keyRef = useRef('');
  const retryRef = useRef(null);
  const revision = useRef(0);
  const loadId = useRef(0);

  const [balance, setBalance] =
    useState(0);

  const [bets, setBets] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [markets, setMarkets] =
    useState([]);

  const [teams, setTeams] =
    useState([]);

  const [event, setEvent] =
    useState(initial);

  const [feed, setFeed] =
    useState(null);

  const [receivedAt, setReceivedAt] =
    useState(0);

  const [clock, setClock] =
    useState(Date.now());

  const [pageError, setPageError] =
    useState('');

  const [marketError, setMarketError] =
    useState('');

  const [feedError, setFeedError] =
    useState('');

  const [
    operationError,
    setOperationError,
  ] = useState('');

  const [showBets, setShowBets] =
    useState(false);

  const [selected, setSelected] =
    useState(null);

  const [stake, setStake] =
    useState('');

  const [message, setMessage] =
    useState('');

  const [busy, setBusy] =
    useState(false);

  const [saved, setSaved] =
    useState(false);

  useEffect(() => {
    alive.current = true;

    return () => {
      alive.current = false;
      loadId.current += 1;
    };
  }, []);

  const refresh = useCallback(
    async () => {
      const id = ++loadId.current;
      const version = revision.current;
      const captured = context;

      try {
        const data = await api(
          `/api/demo-bets?matchId=${encodeURIComponent(
            matchId,
          )}`,
        );

        if (
          !alive.current ||
          contextRef.current !== captured ||
          id !== loadId.current ||
          busyRef.current ||
          revision.current !== version
        ) {
          return;
        }

        if (
          !customerId ||
          String(data.customerId) !==
            customerId
        ) {
          throw new Error(
            'Please logout and login again with this customer account.',
          );
        }

        setBalance(Number(data.balance));
        setBets(data.bets || []);
        setPageError('');
      } catch (error) {
        if (
          alive.current &&
          contextRef.current === captured &&
          id === loadId.current &&
          !busyRef.current
        ) {
          setPageError(error.message);
        }
      } finally {
        if (
          alive.current &&
          contextRef.current === captured &&
          id === loadId.current
        ) {
          setLoading(false);
        }
      }
    },
    [context, matchId, customerId],
  );

  useEffect(() => {
    let active = true;

    setLoading(true);
    setBets([]);
    setBalance(0);
    setMarkets([]);
    setTeams([]);
    setMarketError('');
    setOperationError('');
    setSelected(null);
    setSaved(false);
    setMessage('');

    retryRef.current = null;

    void refresh();

    api(
      `/api/demo-bets/markets?matchId=${encodeURIComponent(
        matchId,
      )}`,
    )
      .then(data => {
        if (active) {
          setMarkets(data.markets || []);
          setTeams(data.teams || []);
          setMarketError('');
        }
      })
      .catch(error => {
        if (active) {
          setMarketError(error.message);
        }
      });

    const update = () => {
      if (!busyRef.current) {
        void refresh();
      }
    };

    window.addEventListener(
      'focus',
      update,
    );

    window.addEventListener(
      'demo-balance-updated',
      update,
    );

    window.addEventListener(
      'demo-bets-updated',
      update,
    );

    const timer = setInterval(
      update,
      5000,
    );

    return () => {
      active = false;
      loadId.current += 1;

      clearInterval(timer);

      window.removeEventListener(
        'focus',
        update,
      );

      window.removeEventListener(
        'demo-balance-updated',
        update,
      );

      window.removeEventListener(
        'demo-bets-updated',
        update,
      );
    };
  }, [refresh, matchId]);

  useEffect(() => {
    let active = true;
    let loadingFeed = false;
    let sequence = 0;
    let stream;

    setFeed(null);
    setReceivedAt(0);
    setFeedError('');
    setEvent(initial);

    const apply = data => {
      if (!active) return;

      sequence += 1;

      const found = (
        data.events ||
        data.data ||
        []
      ).find(
        item =>
          String(
            item.eventId ?? item.id,
          ) === matchId ||
          String(item.id ?? '') ===
            matchId,
      );

      setReceivedAt(Date.now());
      setFeedError('');

      if (found) {
        setEvent(found);
        setFeed(found);
      } else {
        setFeed({
          bettingAllowed: false,

          bettingReason:
            'Match unavailable or ended — Betting Paused',

          paused: true,
        });
      }
    };

    const load = async () => {
      if (
        !active ||
        loadingFeed
      ) {
        return;
      }

      loadingFeed = true;

      const current = sequence;

      try {
        const data = await api(
          '/api/sports/events',
        );

        if (
          active &&
          current === sequence
        ) {
          apply(data);
        }
      } catch (error) {
        if (
          active &&
          current === sequence
        ) {
          setFeedError(error.message);
          setReceivedAt(0);
        }
      } finally {
        loadingFeed = false;
      }
    };

    void load();

    if (
      typeof EventSource !==
      'undefined'
    ) {
      stream = new EventSource(
        '/api/sports/stream',
      );

      stream.onmessage = message => {
        try {
          const data = JSON.parse(
            message.data,
          );

          if (
            Array.isArray(data.events)
          ) {
            apply(data);
          }
        } catch {
          // Cached GET retries automatically.
        }
      };

      stream.onerror = () => {
        void load();
      };
    }

    const timer = setInterval(() => {
      setClock(Date.now());
      void load();
    }, 5000);

    const focus = () => {
      void load();
    };

    window.addEventListener(
      'focus',
      focus,
    );

    return () => {
      active = false;

      clearInterval(timer);
      stream?.close();

      window.removeEventListener(
        'focus',
        focus,
      );
    };

    // Server responses are authoritative.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  const matchName =
    event.teams ||
    `${
      event.homeTeam ||
      initial.homeTeam ||
      'Home'
    } vs ${
      event.awayTeam ||
      initial.awayTeam ||
      'Away'
    }`;

  const connectionFresh =
    receivedAt > 0 &&
    clock - receivedAt < 15000;

  const allowed =
    feed?.bettingAllowed === true &&
    connectionFresh &&
    !feedError;

  const reason = feedError
    ? 'Feed unavailable — Betting Paused'
    : !connectionFresh
      ? 'Waiting for server feed — Betting Paused'
      : feed?.bettingReason ||
        (!allowed
          ? 'Betting Paused'
          : '');

  const disabled =
    busy ||
    loading ||
    Boolean(
      pageError || marketError,
    ) ||
    !allowed;

  const settleDisabled =
    busy ||
    loading ||
    Boolean(pageError);

  const formattedBalance = loading
    ? '...'
    : balance.toLocaleString('en-IN');

  const activeBets = bets.filter(
    bet =>
      [
        'MATCHED',
        'UNMATCHED',
      ].includes(bet.status),
  );

  const notify = () => {
    window.dispatchEvent(
      new Event(
        'demo-balance-updated',
      ),
    );

    window.dispatchEvent(
      new Event(
        'demo-bets-updated',
      ),
    );
  };

  const open = selection => {
    if (
      disabled ||
      busyRef.current
    ) {
      return;
    }

    keyRef.current = newKey();
    retryRef.current = null;

    setSelected(selection);
    setStake('');
    setMessage('');
    setSaved(false);
  };

  const close = () => {
    if (busyRef.current) return;

    setSelected(null);
    setStake('');
    setMessage('');
    setSaved(false);

    retryRef.current = null;
  };

  const save = async () => {
    if (
      busyRef.current ||
      saved ||
      !selected
    ) {
      return;
    }

    // Retry may retrieve an already accepted
    // request while new bets are paused.
    if (
      (!allowed &&
        !retryRef.current) ||
      loading ||
      pageError ||
      marketError
    ) {
      setMessage(
        reason ||
          'Resolve the login or connection error first.',
      );

      return;
    }

    const amount = Number(stake);

    if (
      !Number.isSafeInteger(
        amount,
      ) ||
      amount < 100 ||
      amount > 25000
    ) {
      setMessage(
        'Demo stake must be 100–25,000 whole coins.',
      );

      return;
    }

    const payload =
      retryRef.current || {
        requestKey: keyRef.current,
        matchId,
        matchName,

        matchDate: String(
          event.startTime ||
            initial.date ||
            '',
        ),

        marketId:
          selected.marketId,

        type: selected.type,

        selection:
          selected.selection,

        stake: amount,
      };

    retryRef.current = payload;

    const captured = context;

    busyRef.current = true;
    revision.current += 1;

    setBusy(true);
    setMessage(
      'Saving to server...',
    );

    try {
      const data = await api(
        '/api/demo-bets',
        {
          method: 'POST',
          body: JSON.stringify(
            payload,
          ),
        },
      );

      if (
        !alive.current ||
        contextRef.current !==
          captured
      ) {
        return;
      }

      setBalance(
        Number(data.balance),
      );

      setBets(previous => [
        data.bet,

        ...previous.filter(
          bet =>
            bet.id !==
            data.bet.id,
        ),
      ]);

      setSaved(true);

      setMessage(
        `Saved on server. ${data.bet.stake.toLocaleString(
          'en-IN',
        )} demo coins deducted. Balance: ${Number(
          data.balance,
        ).toLocaleString('en-IN')}.`,
      );

      notify();
    } catch (error) {
      if (
        alive.current &&
        contextRef.current ===
          captured
      ) {
        if (
          Number.isFinite(
            error.balance,
          )
        ) {
          setBalance(
            error.balance,
          );
        }

        setMessage(
          `${error.message} Retry keeps the same request key to prevent duplicate deduction.`,
        );
      }
    } finally {
      busyRef.current = false;

      if (alive.current) {
        setBusy(false);
        void refresh();
      }
    }
  };

  const settle = async (
    id,
    outcome,
  ) => {
    if (
      busyRef.current ||
      settleDisabled
    ) {
      return;
    }

    const captured = context;

    busyRef.current = true;
    revision.current += 1;

    setBusy(true);
    setOperationError('');

    try {
      const data = await api(
        `/api/demo-bets/${encodeURIComponent(
          id,
        )}/simulate-settlement`,
        {
          method: 'POST',

          body: JSON.stringify({
            outcome,
          }),
        },
      );

      if (
        !alive.current ||
        contextRef.current !==
          captured
      ) {
        return;
      }

      setBalance(
        Number(data.balance),
      );

      setBets(previous =>
        previous.map(bet =>
          bet.id === data.bet.id
            ? data.bet
            : bet,
        ),
      );

      notify();
    } catch (error) {
      if (
        alive.current &&
        contextRef.current ===
          captured
      ) {
        setOperationError(
          error.message,
        );
      }
    } finally {
      busyRef.current = false;

      if (alive.current) {
        setBusy(false);
        void refresh();
      }
    }
  };

  // Keep compatibility with the existing parent.
  // The server controls the wallet balance.
  void onUpdateWallet;

  const fieldLocked =
    busy ||
    saved ||
    Boolean(
      retryRef.current,
    ) ||
    !allowed;

  const retryDisabled =
    busy ||
    loading ||
    saved ||
    Boolean(
      pageError ||
        marketError,
    ) ||
    (!allowed &&
      !retryRef.current);

  const liveActive =
    feed?.feedEnabled === true &&
    !feed.stale &&
    connectionFresh;

  return (
    <div className="min-h-screen bg-[#eeeeee] text-black">
      <header className="sticky top-0 z-40 bg-[#063f39] text-white shadow-lg">
        <div className="flex min-h-[64px] items-center justify-between gap-2 px-3">
          <button
            type="button"
            disabled={busy}
            onClick={onBack}
            className="rounded-md border border-teal-500 bg-[#07564e] px-3 py-2 text-sm font-black"
          >
            ← Back
          </button>

          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-sm font-black text-amber-400">
              TELUGU SPORTS BOOK
            </p>

            <p className="text-[9px] font-bold tracking-[0.25em] text-teal-100">
              •{' '}
              {event.source ===
              'REAL_API'
                ? 'LIVE SCORES'
                : 'DEMO'}{' '}
              •
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs font-black text-amber-300">
              🪙 {formattedBalance}
            </p>

            <p className="mt-1 max-w-[85px] truncate text-[10px] font-bold">
              {user?.name ||
                user?.identifier ||
                'Demo User'}
            </p>
          </div>
        </div>
      </header>

      <div className="sticky top-[64px] z-30 flex bg-[#9a5a00] text-white shadow">
        <button
          type="button"
          onClick={() =>
            setShowBets(false)
          }
          className={`flex-1 border-r border-amber-200/40 px-3 py-3 text-xs font-black ${
            !showBets
              ? 'bg-[#7a4700]'
              : ''
          }`}
        >
          ODDS
        </button>

        <button
          type="button"
          onClick={() =>
            setShowBets(true)
          }
          className={`flex-[2] px-3 py-3 text-left text-xs font-black ${
            showBets
              ? 'bg-[#7a4700]'
              : ''
          }`}
        >
          MATCHED BET (
          {activeBets.length})
        </button>
      </div>

      <div
        role="status"
        className={`px-3 py-3 text-xs font-bold ${
          allowed
            ? 'bg-emerald-100 text-emerald-900'
            : 'bg-amber-100 text-amber-900'
        }`}
      >
        {allowed
          ? 'API ON · Demo markets open'
          : reason}
      </div>

      {(pageError ||
        marketError ||
        operationError) && (
        <div
          role="alert"
          className="m-3 rounded border border-red-300 bg-red-50 p-3 text-xs font-bold text-red-800"
        >
          {pageError ||
            marketError ||
            operationError}

          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void refresh()
            }
            className="ml-3 underline"
          >
            RELOAD BALANCE
          </button>
        </div>
      )}

      {showBets ? (
        <section className="pb-8">
          <div className="bg-[#0b6259] px-3 py-3 text-white">
            <h2 className="text-sm font-black">
              MATCHED DEMO BETS
            </h2>

            <p className="mt-1 text-[10px]">
              {matchName}
            </p>
          </div>

          {loading ? (
            <p className="p-6 text-center">
              Loading server bets...
            </p>
          ) : activeBets.length ===
            0 ? (
            <div className="m-3 rounded-lg bg-white p-8 text-center shadow">
              <p className="text-4xl">
                📋
              </p>

              <p className="mt-3 font-black">
                No Matched Bets
              </p>

              <p className="mt-2 text-xs text-gray-500">
                New selections are saved
                to your server account.
              </p>
            </div>
          ) : (
            <div className="space-y-3 p-3">
              {activeBets.map(bet => (
                <div
                  key={bet.id}
                  className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm"
                >
                  <div className="flex items-center justify-between bg-[#0b6259] px-3 py-2 text-white">
                    <p className="text-xs font-black">
                      {bet.market}
                    </p>

                    <span className="rounded bg-green-100 px-2 py-1 text-[9px] font-black text-green-800">
                      {bet.status}
                    </span>
                  </div>

                  <div className="p-3">
                    <p className="text-xs font-black">
                      {bet.matchName}
                    </p>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      {[
                        [
                          'SELECTION',
                          bet.selection,
                          'bg-gray-100',
                        ],
                        [
                          'RATE / TARGET',
                          bet.rate,
                          'bg-sky-100',
                        ],
                        [
                          'STAKE',
                          Number(
                            bet.stake,
                          ).toLocaleString(
                            'en-IN',
                          ),
                          'bg-amber-100',
                        ],
                      ].map(
                        ([
                          label,
                          value,
                          color,
                        ]) => (
                          <div
                            key={label}
                            className={`rounded p-2 ${color}`}
                          >
                            <p className="text-[9px] font-bold text-gray-500">
                              {label}
                            </p>

                            <p className="mt-1 text-sm font-black">
                              {value}
                            </p>
                          </div>
                        ),
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                      <span className="text-[10px] font-semibold text-gray-500">
                        డెమో సెటిల్‌మెంట్:
                      </span>

                      <div className="flex gap-2">
                        {[
                          'WON',
                          'LOST',
                        ].map(
                          outcome => (
                            <button
                              key={outcome}
                              type="button"
                              disabled={
                                settleDisabled
                              }
                              onClick={() =>
                                settle(
                                  bet.id,
                                  outcome,
                                )
                              }
                              className={`rounded px-3 py-2 text-[10px] font-black text-white disabled:opacity-50 ${
                                outcome ===
                                'WON'
                                  ? 'bg-green-600'
                                  : 'bg-red-600'
                              }`}
                            >
                              {outcome ===
                              'WON'
                                ? 'WIN (గెలిచింది)'
                                : 'LOST (ఓడిపోయింది)'}
                            </button>
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() =>
              setShowBets(false)
            }
            className="mx-3 mt-3 w-[calc(100%-24px)] rounded-md bg-[#075249] py-3 text-sm font-black text-white"
          >
            ← BACK TO ODDS
          </button>
        </section>
      ) : (
        <>
          <section className="bg-white px-3 py-4 shadow-sm">
            <p
              className={`text-[10px] font-black ${
                liveActive
                  ? 'text-red-600'
                  : 'text-slate-500'
              }`}
            >
              <span
                className={
                  liveActive
                    ? 'animate-pulse'
                    : ''
                }
              >
                ●
              </span>{' '}
              {liveActive
                ? event.source ===
                  'REAL_API'
                  ? 'LIVE FEED'
                  : 'DEMO FEED'
                : 'FEED PAUSED'}
            </p>

            <h1 className="mt-1 text-xl font-black">
              {matchName}
            </h1>

            <p className="mt-1 text-xs text-gray-500">
              {initial.date ||
                event.startTime ||
                'Time unavailable'}
            </p>
          </section>

          <section className="mt-2 bg-[#0b6259] px-3 py-4 text-white">
            <p className="text-[10px] font-bold text-teal-100">
              AVAILABLE DEMO BALANCE
            </p>

            <p className="mt-2 text-xl font-black text-amber-300">
              🪙 {formattedBalance}{' '}
              Demo Coins
            </p>
          </section>

          <section className="mt-2 bg-[#082f2c] px-3 py-4 text-white">
            <p className="text-xs font-bold text-teal-200">
              {event.source ===
              'REAL_API'
                ? 'SAVED / LIVE SCORE'
                : 'DEMO SCORE'}
            </p>

            <p className="mt-1 text-lg font-black">
              {event.score ||
                'Score unavailable'}
            </p>

            <p className="mt-1 text-xs text-gray-300">
              {event.note ||
                event.providerStatus ||
                ''}
            </p>
          </section>

          <section className="mt-2 bg-white">
            <div className="bg-[#0b6259] px-3 py-2 text-sm font-black text-white">
              MATCH ODDS • DEMO
            </div>

            <div className="grid grid-cols-[1fr_72px_72px] bg-gray-100 p-2 text-center text-[10px] font-black">
              <span className="text-left">
                SELECTION
              </span>

              <span>BACK</span>
              <span>LAY</span>
            </div>

            {teams.map(team => (
              <div
                key={team.name}
                className="grid grid-cols-[1fr_72px_72px] items-center gap-[2px] border-b p-2"
              >
                <span className="text-sm font-black">
                  {team.name}
                </span>

                {[
                  'BACK',
                  'LAY',
                ].map(type => (
                  <button
                    key={type}
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      open({
                        marketId:
                          'match-odds',

                        market:
                          'Match Odds',

                        selection:
                          team.name,

                        rate:
                          type ===
                          'BACK'
                            ? team.back
                            : team.lay,

                        type,
                      })
                    }
                    className={`min-h-12 text-sm font-black disabled:opacity-50 ${
                      type === 'BACK'
                        ? 'bg-sky-300'
                        : 'bg-pink-300'
                    }`}
                  >
                    {type === 'BACK'
                      ? team.back
                      : team.lay}

                    <span className="block text-[8px]">
                      {type}
                    </span>
                  </button>
                ))}
              </div>
            ))}

            {teams.length === 0 && (
              <p className="p-4 text-xs text-gray-600">
                Demo odds unavailable.
                Verified live market
                integration is pending.
              </p>
            )}
          </section>

          <section className="mt-2 bg-white pb-3">
            <div className="bg-[#0b6259] px-3 py-3 text-white">
              <h2 className="text-base font-black">
                FANCY MARKET
              </h2>

              <p className="text-[9px]">
                Cricket Demo Sessions
              </p>
            </div>

            <div className="grid grid-cols-[1fr_78px_78px] bg-gray-100 p-2 text-center text-[10px] font-black">
              <span className="text-left">
                MARKET
              </span>

              <span className="text-pink-700">
                NO
              </span>

              <span className="text-sky-700">
                YES
              </span>
            </div>

            {markets.map(market => (
              <div
                key={market.id}
                className="grid grid-cols-[1fr_78px_78px] items-stretch gap-[2px] border-b p-2"
              >
                <div className="flex min-w-0 flex-col justify-center pr-2">
                  <p className="break-words text-[13px] font-black">
                    {market.title}
                  </p>

                  <p className="mt-1 text-[9px] text-gray-500">
                    {market.subtitle}
                  </p>
                </div>

                {[
                  'NO',
                  'YES',
                ].map(selection => (
                  <button
                    key={selection}
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      open({
                        marketId:
                          market.id,

                        market:
                          market.title,

                        selection,

                        rate:
                          selection ===
                          'NO'
                            ? market.no
                            : market.yes,

                        type: 'FANCY',
                      })
                    }
                    className={`min-h-[58px] px-1 disabled:opacity-50 ${
                      selection === 'NO'
                        ? 'bg-pink-300'
                        : 'bg-sky-300'
                    }`}
                  >
                    <span className="block text-base font-black">
                      {selection === 'NO'
                        ? market.no
                        : market.yes}
                    </span>

                    <span className="block text-[9px] font-bold">
                      {selection}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </section>

          <section className="m-3 rounded border border-amber-300 bg-amber-50 p-3 text-[11px] font-bold leading-5 text-amber-900">
            DEMO ONLY — Market lines
            are simulated. WIN / LOST
            buttons manually simulate
            settlement. No automatic
            live-score settlement or
            real-money payouts. Live
            scores do not provide
            betting odds.
          </section>

          <button
            type="button"
            disabled={busy}
            onClick={onBack}
            className="mx-3 mb-8 w-[calc(100%-24px)] rounded bg-[#064c45] py-3 text-sm font-black text-white"
          >
            ← BACK TO MATCHES
          </button>
        </>
      )}

      {selected && (
        <div className="fixed inset-0 z-[100] flex items-end bg-black/60">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Demo bet slip"
            className="max-h-[88vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl"
          >
            <div
              className={`flex items-center justify-between px-4 py-3 ${
                selected.selection ===
                  'NO' ||
                selected.type === 'LAY'
                  ? 'bg-pink-300'
                  : 'bg-sky-300'
              }`}
            >
              <div>
                <p className="text-sm font-black">
                  DEMO BET SLIP
                </p>

                <p className="text-[10px] font-bold">
                  Available: 🪙{' '}
                  {formattedBalance}
                </p>
              </div>

              <button
                type="button"
                disabled={busy}
                aria-label="Close bet slip"
                onClick={close}
                className="h-8 w-8 rounded-full bg-black/20 text-xl font-black"
              >
                ×
              </button>
            </div>

            <div className="p-4">
              <p className="text-xs text-gray-500">
                {matchName}
              </p>

              <h3 className="mt-1 text-lg font-black">
                {selected.market}
              </h3>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  [
                    'SELECTION',
                    selected.selection,
                  ],
                  [
                    'DEMO RATE / TARGET',
                    selected.rate,
                  ],
                ].map(
                  ([label, value]) => (
                    <div
                      key={label}
                      className="rounded bg-gray-100 p-3"
                    >
                      <p className="text-[10px] text-gray-500">
                        {label}
                      </p>

                      <p className="mt-1 font-black">
                        {value}
                      </p>
                    </div>
                  ),
                )}
              </div>

              {!allowed && (
                <p
                  role="status"
                  className="mt-3 text-xs font-bold text-amber-800"
                >
                  {reason}
                </p>
              )}

              <label
                htmlFor="demo-stake"
                className="mt-4 block text-xs font-black"
              >
                Demo Stake — Minimum
                100 / Maximum 25,000
              </label>

              <input
                id="demo-stake"
                type="text"
                inputMode="numeric"
                value={stake}
                disabled={fieldLocked}
                onChange={e => {
                  if (
                    /^\d*$/.test(
                      e.target.value,
                    )
                  ) {
                    setStake(
                      e.target.value,
                    );

                    setMessage('');
                  }
                }}
                placeholder="Enter demo coins"
                className="mt-2 w-full rounded border-2 border-gray-300 px-3 py-3 text-lg font-black disabled:opacity-50"
              />

              <div className="mt-3 grid grid-cols-4 gap-2">
                {quickStakes.map(
                  amount => (
                    <button
                      key={amount}
                      type="button"
                      disabled={
                        fieldLocked
                      }
                      onClick={() => {
                        setStake(
                          String(
                            (Number(
                              stake,
                            ) || 0) +
                              amount,
                          ),
                        );

                        setMessage('');
                      }}
                      className="rounded bg-gray-200 py-2 text-[11px] font-black disabled:opacity-50"
                    >
                      +
                      {amount.toLocaleString(
                        'en-IN',
                      )}
                    </button>
                  ),
                )}
              </div>

              {message && (
                <div
                  role="status"
                  className="mt-4 rounded border border-teal-200 bg-teal-50 p-3 text-xs font-bold leading-5 text-teal-900"
                >
                  {message}
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={close}
                  className="rounded border border-gray-400 py-3 text-sm font-black"
                >
                  {saved
                    ? 'CLOSE'
                    : 'CANCEL'}
                </button>

                <button
                  type="button"
                  disabled={
                    retryDisabled
                  }
                  onClick={save}
                  className="rounded bg-[#075249] py-3 text-sm font-black text-white disabled:opacity-50"
                >
                  {busy
                    ? 'SAVING...'
                    : saved
                      ? 'SAVED ✓'
                      : retryRef.current
                        ? 'RETRY SAME REQUEST'
                        : 'SAVE DEMO SELECTION'}
                </button>
              </div>

              <p className="mt-4 text-center text-[10px] leading-4 text-gray-500">
                Demo coins are saved
                on the server. Fancy
                WIN returns stake plus
                equal profit. Demo LAY
                stake represents
                liability. No
                real-money betting or
                payouts.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
