import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

const BETS_KEY = 'telugu_sports_demo_bets';

const defaultQuickStakes = [
  100, 200, 500, 1000, 2000, 5000, 10000, 25000,
];

const demoFancyMarkets = [
  {
    id: 'six-over',
    title: '6 Overs Runs',
    subtitle: 'Demo Session',
    no: '48',
    yes: '49',
  },
  {
    id: 'current-over',
    title: 'Current Over Runs',
    subtitle: 'Demo Over Session',
    no: '8',
    yes: '9',
  },
  {
    id: 'next-over',
    title: 'Next Over Runs',
    subtitle: 'Demo Over Session',
    no: '7',
    yes: '8',
  },
  {
    id: '25-run-wicket',
    title: '25 Runs Wicket',
    subtitle: 'Demo Wicket Session',
    no: 'NO',
    yes: 'YES',
  },
  {
    id: 'batsman-runs',
    title: 'Current Batsman 30 Runs',
    subtitle: 'Demo Player Session',
    no: 'NO',
    yes: 'YES',
  },
  {
    id: 'batsman-four',
    title: 'Current Batsman Four',
    subtitle: 'Demo Player Session',
    no: 'NO',
    yes: 'YES',
  },
  {
    id: 'batsman-six',
    title: 'Current Batsman Six',
    subtitle: 'Demo Player Session',
    no: 'NO',
    yes: 'YES',
  },
  {
    id: 'partnership',
    title: 'Current Partnership Runs',
    subtitle: 'Demo Partnership',
    no: '42',
    yes: '43',
  },
  {
    id: 'fall-wicket',
    title: 'Fall Of Next Wicket',
    subtitle: 'Demo Wicket Session',
    no: '65',
    yes: '66',
  },
  {
    id: 'total-runs',
    title: 'Team Total Runs',
    subtitle: 'Demo Innings Session',
    no: '174',
    yes: '175',
  },
  {
    id: 'total-fours',
    title: 'Total Fours',
    subtitle: 'Demo Match Session',
    no: '23',
    yes: '24',
  },
  {
    id: 'total-sixes',
    title: 'Total Sixes',
    subtitle: 'Demo Match Session',
    no: '8',
    yes: '9',
  },
];

const fallbackMatch = {
  id: 1,
  teams: 'India vs Australia',
  date: 'Match',
  odds: ['1.85', '1.90', '3.20', '3.30', '2.10', '2.15'],
};

function readBets() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(BETS_KEY) || '[]'
    );

    return Array.isArray(saved)
      ? saved.filter((bet) => bet && typeof bet === 'object')
      : [];
  } catch {
    return [];
  }
}

function saveBets(bets) {
  localStorage.setItem(BETS_KEY, JSON.stringify(bets));

  window.dispatchEvent(
    new Event('demo-bets-updated')
  );
}

export default function MatchDetailsPage({
  match,
  user,
  onBack,
  onUpdateWallet,
}) {
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [stake, setStake] = useState('');
  const [message, setMessage] = useState('');
  const [demoBalance, setDemoBalance] = useState(0);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [allBets, setAllBets] = useState(readBets);
  const [showMatchedBets, setShowMatchedBets] = useState(false);
  const [selectionSaved, setSelectionSaved] = useState(false);

  const currentMatch = match || fallbackMatch;

  const odds = Array.isArray(currentMatch.odds)
    ? currentMatch.odds
    : fallbackMatch.odds;

  const customerId =
    user?.id ??
    user?.customerId ??
    user?.customer_id;

  const loadServerBalance = useCallback(async (signal) => {
    if (!customerId) {
      setDemoBalance(0);
      setBalanceLoading(false);
      return;
    }

    try {
      setBalanceLoading(true);

      const response = await fetch(
        `/api/customers/${encodeURIComponent(customerId)}/demo-balance`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          signal,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
          data?.error ||
          'Unable to load balance.'
        );
      }

      const balance = Number(
        data?.demoCoinBalance ??
        data?.balance ??
        data?.demo_coin_balance ??
        0
      );

      if (!signal?.aborted) {
        setDemoBalance(
          Number.isFinite(balance) ? balance : 0
        );
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Balance load error:', error);
      }
    } finally {
      if (!signal?.aborted) {
        setBalanceLoading(false);
      }
    }
  }, [customerId]);

  useEffect(() => {
    const controller = new AbortController();

    const refreshBalance = () => {
      loadServerBalance(controller.signal);
    };

    const refreshBets = () => {
      setAllBets(readBets());
    };

    const handleStorage = (event) => {
      if (event.key === BETS_KEY || event.key === null) {
        refreshBets();
      }
    };

    refreshBalance();
    refreshBets();

    window.addEventListener('focus', refreshBets);
    window.addEventListener('storage', handleStorage);
    window.addEventListener(
      'demo-balance-updated',
      refreshBalance
    );
    window.addEventListener(
      'demo-bets-updated',
      refreshBets
    );

    return () => {
      controller.abort();

      window.removeEventListener('focus', refreshBets);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(
        'demo-balance-updated',
        refreshBalance
      );
      window.removeEventListener(
        'demo-bets-updated',
        refreshBets
      );
    };
  }, [loadServerBalance]);

  const matchBets = useMemo(() => {
    return allBets
      .filter(
        (bet) =>
          String(bet.matchId) === String(currentMatch.id)
      )
      .filter(
        (bet) =>
          bet.status === 'MATCHED' ||
          bet.status === 'UNMATCHED'
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      );
  }, [allBets, currentMatch.id]);

  const notifyWallet = (balance) => {
    if (typeof onUpdateWallet !== 'function') return;

    try {
      Promise.resolve(onUpdateWallet(balance)).catch(
        (error) => {
          console.error('Wallet update callback failed:', error);
        }
      );
    } catch (error) {
      console.error('Wallet update callback failed:', error);
    }
  };

  const openSelection = (selection) => {
    setSelectedMarket(selection);
    setStake('');
    setMessage('');
    setSelectionSaved(false);
  };

  const closeBetSlip = () => {
    setSelectedMarket(null);
    setStake('');
    setMessage('');
    setSelectionSaved(false);
  };

  const handleStakeChange = (event) => {
    const value = event.target.value;

    if (value === '' || /^\d+$/.test(value)) {
      setStake(value);
      setMessage('');
    }
  };

  const addStake = (amount) => {
    setStake(String((Number(stake) || 0) + amount));
    setMessage('');
  };

  const placeDemoSelection = () => {
    if (!selectedMarket || selectionSaved) return;

    if (balanceLoading) {
      setMessage('Please wait until the balance loads.');
      return;
    }

    const amount = Number(stake);

    if (!Number.isSafeInteger(amount) || amount < 100) {
      setMessage('Minimum demo stake is 100 demo coins.');
      return;
    }

    if (amount > 25000) {
      setMessage('Maximum demo stake is 25,000 demo coins.');
      return;
    }

    if (amount > demoBalance) {
      setMessage('Insufficient demo wallet balance.');
      return;
    }

    const newBalance = demoBalance - amount;

    // Fancy values such as 48/49 are session targets,
    // not decimal payout odds. Use a fixed demo return.
    const numericRate = Number(selectedMarket.rate);
    const payoutRate =
      selectedMarket.type === 'FANCY'
        ? 2
        : Number.isFinite(numericRate) && numericRate > 1
          ? numericRate
          : 2;

    const newBet = {
      id: `demo-bet-${
        globalThis.crypto?.randomUUID?.() ||
        `${Date.now()}-${Math.random().toString(36).slice(2)}`
      }`,
      customerId: customerId ?? null,
      matchId: currentMatch.id,
      matchName: currentMatch.teams,
      matchDate: currentMatch.date,
      sport: 'CRICKET',
      market: selectedMarket.market,
      selection: selectedMarket.selection,
      type: selectedMarket.type,
      rate: selectedMarket.rate,
      payoutRate,
      stake: amount,
      status: 'MATCHED',
      result: 'PENDING',
      profitLoss: 0,
      balanceBefore: demoBalance,
      balanceAfter: newBalance,
      userName: user?.name || user?.identifier || 'Demo User',
      createdAt: new Date().toISOString(),
    };

    const updatedBets = [newBet, ...readBets()];

    try {
      saveBets(updatedBets);
    } catch (error) {
      console.error('Unable to save demo bet:', error);
      setMessage('Unable to save. Please check browser storage.');
      return;
    }

    setAllBets(updatedBets);
    setDemoBalance(newBalance);
    setSelectionSaved(true);
    notifyWallet(newBalance);

    setMessage(
      `Demo selection saved. ${amount.toLocaleString(
        'en-IN'
      )} demo coins deducted from the displayed balance.`
    );
  };

  const simulateAutoSettlement = (betId, outcome) => {
    if (outcome !== 'WON' && outcome !== 'LOST') return;

    const currentList = readBets();
    const targetBet = currentList.find(
      (bet) => bet.id === betId
    );

    if (
      !targetBet ||
      targetBet.result !== 'PENDING' ||
      targetBet.status !== 'MATCHED'
    ) {
      return;
    }

    const stakeAmount = Number(targetBet.stake) || 0;
    const storedRate = Number(
      targetBet.payoutRate ??
      (targetBet.type === 'FANCY' ? 2 : targetBet.rate)
    );

    const payoutRate =
      Number.isFinite(storedRate) && storedRate > 1
        ? storedRate
        : 2;

    const payout =
      outcome === 'WON'
        ? Math.round(stakeAmount * payoutRate)
        : 0;

    const updatedWallet = demoBalance + payout;

    // Retain settled records for history.
    // The active matched-bets filter hides them.
    const updatedBets = currentList.map((bet) =>
      bet.id === betId
        ? {
            ...bet,
            status: 'SETTLED',
            result: outcome,
            profitLoss: payout - stakeAmount,
            payout,
            balanceAfter: updatedWallet,
            settledAt: new Date().toISOString(),
          }
        : bet
    );

    try {
      saveBets(updatedBets);
    } catch (error) {
      console.error('Unable to save demo settlement:', error);
      return;
    }

    setAllBets(updatedBets);
    setDemoBalance(updatedWallet);
    notifyWallet(updatedWallet);
  };

  return (
    <div className="min-h-screen bg-[#eeeeee] text-black">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-[#063f39] text-white shadow-lg">
        <div className="flex min-h-[64px] items-center justify-between gap-2 px-3">
          <button
            type="button"
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
              • DEMO •
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs font-black text-amber-300">
              🪙{' '}
              {balanceLoading
                ? '...'
                : demoBalance.toLocaleString('en-IN')}
            </p>
            <p className="mt-1 max-w-[85px] truncate text-[10px] font-bold">
              {user?.name || user?.identifier || 'Demo User'}
            </p>
          </div>
        </div>
      </header>

      {/* ODDS / MATCHED BET BAR */}
      <div className="sticky top-[64px] z-30 flex bg-[#9a5a00] text-white shadow">
        <button
          type="button"
          onClick={() => setShowMatchedBets(false)}
          className={`flex-1 border-r border-amber-200/40 px-3 py-3 text-xs font-black ${
            !showMatchedBets ? 'bg-[#7a4700]' : ''
          }`}
        >
          ODDS
        </button>

        <button
          type="button"
          onClick={() => setShowMatchedBets(true)}
          className={`flex-[2] px-3 py-3 text-left text-xs font-black ${
            showMatchedBets ? 'bg-[#7a4700]' : ''
          }`}
        >
          MATCHED BET ({matchBets.length})
        </button>
      </div>

      {showMatchedBets ? (
        <section className="bg-[#eeeeee] pb-8">
          <div className="bg-[#0b6259] px-3 py-3 text-white">
            <h2 className="text-sm font-black">
              MATCHED DEMO BETS
            </h2>
            <p className="mt-1 text-[10px] text-teal-100">
              {currentMatch.teams}
            </p>
          </div>

          {matchBets.length === 0 ? (
            <div className="m-3 rounded-lg bg-white p-8 text-center shadow">
              <p className="text-4xl">📋</p>
              <p className="mt-3 text-base font-black text-gray-800">
                No Matched Bets
              </p>
              <p className="mt-2 text-xs leading-5 text-gray-500">
                Place a demo selection from the Odds or Fancy Market.
              </p>
              <button
                type="button"
                onClick={() => setShowMatchedBets(false)}
                className="mt-5 rounded-md bg-[#075249] px-6 py-3 text-xs font-black text-white"
              >
                VIEW ODDS
              </button>
            </div>
          ) : (
            <div className="space-y-3 p-3">
              {matchBets.map((bet) => (
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
                    <p className="text-xs font-black text-gray-900">
                      {bet.matchName}
                    </p>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded bg-gray-100 p-2">
                        <p className="text-[9px] font-bold text-gray-500">
                          SELECTION
                        </p>
                        <p className="mt-1 text-sm font-black">
                          {bet.selection}
                        </p>
                      </div>

                      <div className="rounded bg-sky-100 p-2">
                        <p className="text-[9px] font-bold text-gray-500">
                          RATE
                        </p>
                        <p className="mt-1 text-sm font-black">
                          {bet.rate}
                        </p>
                      </div>

                      <div className="rounded bg-amber-100 p-2">
                        <p className="text-[9px] font-bold text-gray-500">
                          STAKE
                        </p>
                        <p className="mt-1 text-sm font-black">
                          {Number(bet.stake).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 pt-3">
                      <span className="text-[10px] font-semibold text-gray-500">
                        డెమో సెటిల్‌మెంట్:
                      </span>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={balanceLoading}
                          onClick={() =>
                            simulateAutoSettlement(bet.id, 'WON')
                          }
                          className="rounded bg-green-600 px-3 py-1.5 text-[10px] font-black text-white disabled:opacity-50"
                        >
                          WIN (గెలిచింది)
                        </button>

                        <button
                          type="button"
                          disabled={balanceLoading}
                          onClick={() =>
                            simulateAutoSettlement(bet.id, 'LOST')
                          }
                          className="rounded bg-red-600 px-3 py-1.5 text-[10px] font-black text-white disabled:opacity-50"
                        >
                          LOST (ఓడిపోయింది)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowMatchedBets(false)}
            className="mx-3 mt-3 w-[calc(100%-24px)] rounded-md bg-[#075249] py-3 text-sm font-black text-white"
          >
            ← BACK TO ODDS
          </button>
        </section>
      ) : (
        <>
          {/* MATCH TITLE */}
          <section className="bg-white px-3 py-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wide text-red-600">
              ● DEMO MATCH
            </p>
            <h1 className="mt-1 text-xl font-black text-gray-900">
              {currentMatch.teams}
            </h1>
            <p className="mt-1 text-xs font-semibold text-gray-500">
              {currentMatch.date}
            </p>
          </section>

          {/* BALANCE */}
          <section className="mt-2 bg-[#0b6259] px-3 py-4 text-white">
            <p className="text-[10px] font-bold text-teal-100">
              AVAILABLE DEMO BALANCE
            </p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xl font-black text-amber-300">
                🪙{' '}
                {balanceLoading
                  ? 'Loading...'
                  : `${demoBalance.toLocaleString('en-IN')} Demo Coins`}
              </p>
              <span className="rounded bg-[#06443e] px-2 py-1 text-[9px] font-black">
                DEMO
              </span>
            </div>
          </section>

          {/* SCORE */}
          <section className="mt-2 bg-[#082f2c] px-3 py-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-teal-200">
                  DEMO LIVE SCORE
                </p>
                <p className="mt-1 text-lg font-black">
                  India 82/2
                </p>
                <p className="text-xs text-gray-300">
                  9.4 Overs
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-teal-200">
                  Current Run Rate
                </p>
                <p className="text-xl font-black text-amber-400">
                  8.48
                </p>
              </div>
            </div>
          </section>

          {/* BATSMEN */}
          <section className="mt-2 bg-white">
            <div className="bg-[#0b6259] px-3 py-2 text-sm font-black text-white">
              CURRENT BATSMEN • DEMO
            </div>

            <div className="grid grid-cols-2 gap-[1px] bg-gray-200">
              {[
                { name: 'R. Sharma *', score: '34 Runs • 21 Balls' },
                { name: 'V. Kohli', score: '21 Runs • 16 Balls' },
              ].map((batsman) => (
                <div key={batsman.name} className="bg-white p-3">
                  <p className="text-xs font-bold text-gray-500">
                    BATSMAN
                  </p>
                  <p className="mt-1 text-sm font-black">
                    {batsman.name}
                  </p>
                  <p className="mt-1 text-xs">
                    {batsman.score}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* MATCH ODDS */}
          <section className="mt-2 bg-white">
            <div className="flex items-center justify-between bg-[#0b6259] px-3 py-2 text-white">
              <h2 className="text-sm font-black">MATCH ODDS</h2>
              <span className="text-[10px] font-bold">DEMO</span>
            </div>

            <div className="grid grid-cols-[1fr_72px_72px] border-b bg-gray-100 px-2 py-2 text-center text-[10px] font-black text-gray-600">
              <span className="text-left">SELECTION</span>
              <span>BACK</span>
              <span>LAY</span>
            </div>

            {[
              { name: 'India', back: odds[0], lay: odds[1] },
              { name: 'Draw', back: odds[2], lay: odds[3] },
              { name: 'Australia', back: odds[4], lay: odds[5] },
            ].map((team) => (
              <div
                key={team.name}
                className="grid grid-cols-[1fr_72px_72px] items-center gap-[2px] border-b p-2"
              >
                <span className="text-sm font-black">
                  {team.name}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    openSelection({
                      market: 'Match Odds',
                      selection: team.name,
                      rate: team.back,
                      type: 'BACK',
                    })
                  }
                  className="min-h-12 bg-sky-300 text-sm font-black"
                >
                  {team.back}
                  <span className="block text-[8px]">BACK</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    openSelection({
                      market: 'Match Odds',
                      selection: team.name,
                      rate: team.lay,
                      type: 'LAY',
                    })
                  }
                  className="min-h-12 bg-pink-300 text-sm font-black"
                >
                  {team.lay}
                  <span className="block text-[8px]">LAY</span>
                </button>
              </div>
            ))}
          </section>

          {/* FANCY MARKET */}
          <section className="mt-2 bg-white pb-3">
            <div className="flex items-center justify-between bg-[#0b6259] px-3 py-3 text-white">
              <div>
                <h2 className="text-base font-black">
                  FANCY MARKET
                </h2>
                <p className="text-[9px] text-teal-100">
                  Demo Sessions
                </p>
              </div>
              <span className="rounded bg-amber-400 px-2 py-1 text-[9px] font-black text-black">
                DEMO
              </span>
            </div>

            <div className="grid grid-cols-[1fr_78px_78px] bg-gray-100 px-2 py-2 text-center text-[10px] font-black">
              <span className="text-left">MARKET</span>
              <span className="text-pink-700">NO</span>
              <span className="text-sky-700">YES</span>
            </div>

            {demoFancyMarkets.map((market) => (
              <div
                key={market.id}
                className="grid grid-cols-[1fr_78px_78px] items-stretch gap-[2px] border-b border-gray-200 p-2"
              >
                <div className="flex min-w-0 flex-col justify-center pr-2">
                  <p className="break-words text-[13px] font-black">
                    {market.title}
                  </p>
                  <p className="mt-1 text-[9px] font-semibold text-gray-500">
                    {market.subtitle}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    openSelection({
                      market: market.title,
                      selection: 'NO',
                      rate: market.no,
                      type: 'FANCY',
                    })
                  }
                  className="min-h-[58px] bg-pink-300 px-1"
                >
                  <span className="block text-base font-black">
                    {market.no}
                  </span>
                  <span className="block text-[9px] font-bold">
                    NO
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    openSelection({
                      market: market.title,
                      selection: 'YES',
                      rate: market.yes,
                      type: 'FANCY',
                    })
                  }
                  className="min-h-[58px] bg-sky-300 px-1"
                >
                  <span className="block text-base font-black">
                    {market.yes}
                  </span>
                  <span className="block text-[9px] font-bold">
                    YES
                  </span>
                </button>
              </div>
            ))}
          </section>

          <section className="m-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
            <p className="text-[11px] font-bold leading-5 text-amber-900">
              DEMO ONLY — Scores, odds and selections are
              simulated for interface testing. WIN / LOST
              buttons manually simulate results. No real-money
              transactions or payouts.
            </p>
          </section>

          <button
            type="button"
            onClick={onBack}
            className="mx-3 mb-8 w-[calc(100%-24px)] rounded-md bg-[#064c45] py-3 text-sm font-black text-white"
          >
            ← BACK TO MATCHES
          </button>
        </>
      )}

      {/* BET SLIP */}
      {selectedMarket && (
        <div className="fixed inset-0 z-[100] flex items-end bg-black/60">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Demo bet slip"
            className="max-h-[88vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl"
          >
            <div
              className={`flex items-center justify-between px-4 py-3 ${
                selectedMarket.selection === 'NO' ||
                selectedMarket.type === 'LAY'
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
                  {balanceLoading
                    ? '...'
                    : demoBalance.toLocaleString('en-IN')}
                </p>
              </div>

              <button
                type="button"
                aria-label="Close bet slip"
                onClick={closeBetSlip}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-xl font-black"
              >
                ×
              </button>
            </div>

            <div className="p-4">
              <p className="text-xs font-bold text-gray-500">
                {currentMatch.teams}
              </p>
              <h3 className="mt-1 text-lg font-black">
                {selectedMarket.market}
              </h3>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-md bg-gray-100 p-3">
                  <p className="text-[10px] font-bold text-gray-500">
                    SELECTION
                  </p>
                  <p className="mt-1 text-base font-black">
                    {selectedMarket.selection}
                  </p>
                </div>

                <div className="rounded-md bg-amber-100 p-3">
                  <p className="text-[10px] font-bold text-gray-500">
                    DEMO RATE / TARGET
                  </p>
                  <p className="mt-1 text-base font-black">
                    {selectedMarket.rate}
                  </p>
                </div>
              </div>

              <label
                htmlFor="demo-stake"
                className="mt-4 block text-xs font-black text-gray-700"
              >
                Demo Stake — Minimum 100 / Maximum 25,000
              </label>

              <input
                id="demo-stake"
                type="text"
                inputMode="numeric"
                value={stake}
                disabled={selectionSaved}
                onChange={handleStakeChange}
                placeholder="Enter demo coins"
                className="mt-2 w-full rounded-md border-2 border-gray-300 px-3 py-3 text-lg font-black outline-none focus:border-teal-700 disabled:opacity-50"
              />

              <div className="mt-3 grid grid-cols-4 gap-2">
                {defaultQuickStakes.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    disabled={selectionSaved}
                    onClick={() => addStake(amount)}
                    className="rounded-md bg-gray-200 py-2 text-[11px] font-black disabled:opacity-50"
                  >
                    +{amount.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>

              {message && (
                <div
                  role="status"
                  className="mt-4 rounded-md border border-teal-200 bg-teal-50 p-3"
                >
                  <p className="text-xs font-bold leading-5 text-teal-900">
                    {message}
                  </p>
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={closeBetSlip}
                  className="rounded-md border border-gray-400 py-3 text-sm font-black"
                >
                  {selectionSaved ? 'CLOSE' : 'CANCEL'}
                </button>

                <button
                  type="button"
                  disabled={balanceLoading || selectionSaved}
                  onClick={placeDemoSelection}
                  className="rounded-md bg-[#075249] py-3 text-sm font-black text-white disabled:opacity-50"
                >
                  {selectionSaved ? 'SAVED ✓' : 'SAVE DEMO SELECTION'}
                </button>
              </div>

              <p className="mt-4 text-center text-[10px] font-semibold leading-4 text-gray-500">
                Simulation only. Fancy markets use a fixed
                2× demo return including stake. Wallet changes
                on this page are simulated; no real-money
                betting or payouts.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
