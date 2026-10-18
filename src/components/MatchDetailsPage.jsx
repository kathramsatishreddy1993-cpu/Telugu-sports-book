import React, { useCallback, useEffect, useRef, useState } from 'react';

const quickStakes = [100, 200, 500, 1000, 2000, 5000, 10000, 25000];
const fallbackMatch = { id: 1, teams: 'India vs Australia', date: 'Match' };
const demoTeams = [
  { name: 'India', back: '1.85', lay: '1.90' },
  { name: 'Draw', back: '3.20', lay: '3.30' },
  { name: 'Australia', back: '2.10', lay: '2.15' },
];
function newKey() {
  return globalThis.crypto?.randomUUID?.() ||
    `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options, credentials: 'same-origin', cache: 'no-store',
    headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
  });
  let data;
  try { data = await response.json(); }
  catch { throw new Error('Server response was not JSON. Please verify the deployment.'); }
  if (!response.ok) {
    const error = new Error(data.error || data.message || 'Unable to complete request.');
    error.status = response.status;
    error.balance = data.balance;
    throw error;
  }
  return data;
}

export default function MatchDetailsPage({ match, user, onBack, onUpdateWallet }) {
  const currentMatch = match || fallbackMatch;
  const matchId = String(currentMatch.id ?? currentMatch.eventId ?? '1');
  const matchName = currentMatch.teams || `${currentMatch.homeTeam || 'Home'} vs ${currentMatch.awayTeam || 'Away'}`;
  const customerId = user?.id ?? user?.customerId ?? user?.customer_id;
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [bets, setBets] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [pageError, setPageError] = useState('');
  const [marketError, setMarketError] = useState('');
  const [operationError, setOperationError] = useState('');
  const [showMatchedBets, setShowMatchedBets] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [stake, setStake] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const busyRef = useRef(false);
  const requestRef = useRef('');
  const retryPayloadRef = useRef(null);
  const mutationRef = useRef(0);
  const loadRef = useRef(0);
  const aliveRef = useRef(true);
  const activeCustomerRef = useRef(customerId);
  activeCustomerRef.current = customerId;

  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; loadRef.current += 1; };
  }, []);

  // Notify dashboard to reload its authoritative server balance.
  // Do not pass an absolute wallet value to an unknown callback that might write it back.
  const walletChanged = () => {
    window.dispatchEvent(new Event('demo-balance-updated'));
    window.dispatchEvent(new Event('demo-bets-updated'));
  };

  const refresh = useCallback(async () => {
    const loadId = ++loadRef.current;
    const mutation = mutationRef.current;
    setPageError('');
    try {
      const data = await api(`/api/demo-bets?matchId=${encodeURIComponent(matchId)}`);
      if (!aliveRef.current || loadId !== loadRef.current || busyRef.current || mutation !== mutationRef.current) return;
      if (!customerId || String(data.customerId) !== String(customerId)) throw new Error('Please logout and login again with this customer account.');
      setBalance(Number(data.balance));
      setBets(data.bets || []);
    } catch (error) {
      if (aliveRef.current && loadId === loadRef.current && !busyRef.current) setPageError(error.message);
    } finally {
      if (aliveRef.current && loadId === loadRef.current) setLoading(false);
    }
  }, [matchId, customerId]);

  useEffect(() => {
    setLoading(true); setBets([]); setBalance(0); setMarkets([]); setOperationError('');
    setSelectedMarket(null); retryPayloadRef.current = null;
    let active = true;
    refresh();
    api('/api/demo-bets/markets').then((data) => {
      if (active) { setMarkets(data.markets || []); setMarketError(''); }
    }).catch((error) => { if (active) setMarketError(error.message); });
    const update = () => { if (!busyRef.current) refresh(); };
    window.addEventListener('focus', update);
    window.addEventListener('demo-balance-updated', update);
    window.addEventListener('demo-bets-updated', update);
    return () => {
      active = false; loadRef.current += 1;
      window.removeEventListener('focus', update);
      window.removeEventListener('demo-balance-updated', update);
      window.removeEventListener('demo-bets-updated', update);
    };
  }, [refresh]);

  const openSelection = (selection) => {
    if (busyRef.current) return;
    requestRef.current = newKey(); retryPayloadRef.current = null;
    setSelectedMarket(selection); setStake(''); setMessage(''); setSaved(false);
  };
  const close = () => {
    if (busyRef.current) return;
    setSelectedMarket(null); setStake(''); setMessage(''); setSaved(false);
    retryPayloadRef.current = null;
  };
  const save = async () => {
    if (busyRef.current || saved || !selectedMarket) return;
    if (loading || pageError || marketError) { setMessage('Please resolve the server connection or login error first.'); return; }
    const amount = Number(stake);
    if (!Number.isSafeInteger(amount) || amount < 100 || amount > 25000) { setMessage('Demo stake must be 100–25,000 whole coins.'); return; }
    const payload = retryPayloadRef.current || {
      requestKey: requestRef.current, matchId, matchName,
      matchDate: String(currentMatch.date || ''),
      marketId: selectedMarket.marketId, type: selectedMarket.type,
      selection: selectedMarket.selection, stake: amount,
    };
    // Freeze the exact request for retries after an unknown network outcome.
    retryPayloadRef.current = payload;
    const accountAtStart = customerId;
    busyRef.current = true; mutationRef.current += 1; setBusy(true); setMessage('Saving to server...');
    try {
      const data = await api('/api/demo-bets', { method: 'POST', body: JSON.stringify(payload) });
      if (!aliveRef.current || activeCustomerRef.current !== accountAtStart) return;
      setBalance(Number(data.balance));
      setBets((previous) => [data.bet, ...previous.filter((b) => b.id !== data.bet.id)]);
      setSaved(true);
      setMessage(`Saved on server. ${data.bet.stake.toLocaleString('en-IN')} demo coins deducted. Balance: ${Number(data.balance).toLocaleString('en-IN')}.`);
      walletChanged();
    } catch (error) {
      if (!aliveRef.current || activeCustomerRef.current !== accountAtStart) return;
      if (Number.isFinite(Number(error.balance))) setBalance(Number(error.balance));
      setMessage(`${error.message} Retry uses the same request to prevent duplicate deduction.`);
    } finally {
      busyRef.current = false;
      if (aliveRef.current) { setBusy(false); refresh(); }
    }
  };
  const settle = async (id, outcome) => {
    if (busyRef.current || loading || pageError) return;
    const accountAtStart = customerId;
    setOperationError('');
    busyRef.current = true; mutationRef.current += 1; setBusy(true);
    try {
      const data = await api(`/api/demo-bets/${encodeURIComponent(id)}/simulate-settlement`, {
        method: 'POST', body: JSON.stringify({ outcome }),
      });
      if (!aliveRef.current || activeCustomerRef.current !== accountAtStart) return;
      setBalance(Number(data.balance));
      setBets((previous) => previous.map((bet) => bet.id === data.bet.id ? data.bet : bet));
      walletChanged();
    } catch (error) {
      if (aliveRef.current) setOperationError(error.message);
    } finally {
      busyRef.current = false;
      if (aliveRef.current) { setBusy(false); refresh(); }
    }
  };
  // Prop accepted for compatibility; server is the sole wallet authority.
  void onUpdateWallet;
  const activeBets = bets.filter((bet) => bet.status === 'MATCHED' || bet.status === 'UNMATCHED');
  const disabled = busy || loading || Boolean(pageError || marketError);
  const formattedBalance = loading ? '...' : balance.toLocaleString('en-IN');
  const fieldLocked = busy || saved || Boolean(retryPayloadRef.current);

  return (
    <div className="min-h-screen bg-[#eeeeee] text-black">
      <header className="sticky top-0 z-40 bg-[#063f39] text-white shadow-lg">
        <div className="flex min-h-[64px] items-center justify-between gap-2 px-3">
          <button type="button" disabled={busy} onClick={onBack} className="rounded-md border border-teal-500 bg-[#07564e] px-3 py-2 text-sm font-black">← Back</button>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-sm font-black text-amber-400">TELUGU SPORTS BOOK</p>
            <p className="text-[9px] font-bold tracking-[0.25em] text-teal-100">• DEMO •</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-black text-amber-300">🪙 {formattedBalance}</p>
            <p className="mt-1 max-w-[85px] truncate text-[10px] font-bold">{user?.name || user?.identifier || 'Demo User'}</p>
          </div>
        </div>
      </header>
      <div className="sticky top-[64px] z-30 flex bg-[#9a5a00] text-white shadow">
        <button type="button" onClick={() => setShowMatchedBets(false)} className={`flex-1 border-r border-amber-200/40 px-3 py-3 text-xs font-black ${!showMatchedBets ? 'bg-[#7a4700]' : ''}`}>ODDS</button>
        <button type="button" onClick={() => setShowMatchedBets(true)} className={`flex-[2] px-3 py-3 text-left text-xs font-black ${showMatchedBets ? 'bg-[#7a4700]' : ''}`}>MATCHED BET ({activeBets.length})</button>
      </div>
      {(pageError || marketError || operationError) && <div role="alert" className="m-3 rounded border border-red-300 bg-red-50 p-3 text-xs font-bold text-red-800">
        {pageError || marketError || operationError}
        <button type="button" disabled={busy} onClick={refresh} className="ml-3 underline">RELOAD BALANCE</button>
      </div>}
      {showMatchedBets ? (
        <section className="pb-8">
          <div className="bg-[#0b6259] px-3 py-3 text-white"><h2 className="text-sm font-black">MATCHED DEMO BETS</h2><p className="mt-1 text-[10px]">{matchName}</p></div>
          {loading ? <p className="p-6 text-center">Loading server bets...</p> : activeBets.length === 0 ? (
            <div className="m-3 rounded-lg bg-white p-8 text-center shadow"><p className="text-4xl">📋</p><p className="mt-3 font-black">No Matched Bets</p><p className="mt-2 text-xs text-gray-500">New selections are saved to your server account.</p></div>
          ) : <div className="space-y-3 p-3">{activeBets.map((bet) => (
            <div key={bet.id} className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm">
              <div className="flex items-center justify-between bg-[#0b6259] px-3 py-2 text-white"><p className="text-xs font-black">{bet.market}</p><span className="rounded bg-green-100 px-2 py-1 text-[9px] font-black text-green-800">{bet.status}</span></div>
              <div className="p-3"><p className="text-xs font-black">{bet.matchName}</p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  {[['SELECTION', bet.selection, 'bg-gray-100'], ['RATE / TARGET', bet.rate, 'bg-sky-100'], ['STAKE', Number(bet.stake).toLocaleString('en-IN'), 'bg-amber-100']].map(([label, value, color]) => <div key={label} className={`rounded p-2 ${color}`}><p className="text-[9px] font-bold text-gray-500">{label}</p><p className="mt-1 text-sm font-black">{value}</p></div>)}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3"><span className="text-[10px] font-semibold text-gray-500">డెమో సెటిల్‌మెంట్:</span><div className="flex gap-2">
                  <button type="button" disabled={disabled} onClick={() => settle(bet.id, 'WON')} className="rounded bg-green-600 px-3 py-2 text-[10px] font-black text-white disabled:opacity-50">WIN (గెలిచింది)</button>
                  <button type="button" disabled={disabled} onClick={() => settle(bet.id, 'LOST')} className="rounded bg-red-600 px-3 py-2 text-[10px] font-black text-white disabled:opacity-50">LOST (ఓడిపోయింది)</button>
                </div></div>
              </div>
            </div>
          ))}</div>}
          <button type="button" onClick={() => setShowMatchedBets(false)} className="mx-3 mt-3 w-[calc(100%-24px)] rounded-md bg-[#075249] py-3 text-sm font-black text-white">← BACK TO ODDS</button>
        </section>
      ) : <>
        <section className="bg-white px-3 py-4 shadow-sm"><p className="text-[10px] font-black text-red-600">● DEMO MATCH</p><h1 className="mt-1 text-xl font-black">{matchName}</h1><p className="mt-1 text-xs text-gray-500">{currentMatch.date}</p></section>
        <section className="mt-2 bg-[#0b6259] px-3 py-4 text-white"><p className="text-[10px] font-bold text-teal-100">AVAILABLE DEMO BALANCE</p><p className="mt-2 text-xl font-black text-amber-300">🪙 {formattedBalance} Demo Coins</p></section>
        <section className="mt-2 bg-[#082f2c] px-3 py-4 text-white"><div className="flex justify-between"><div><p className="text-xs font-bold text-teal-200">DEMO LIVE SCORE</p><p className="mt-1 text-lg font-black">India 82/2</p><p className="text-xs text-gray-300">9.4 Overs</p></div><div className="text-right"><p className="text-xs text-teal-200">Current Run Rate</p><p className="text-xl font-black text-amber-400">8.48</p></div></div></section>
        <section className="mt-2 bg-white"><div className="bg-[#0b6259] px-3 py-2 text-sm font-black text-white">CURRENT BATSMEN • DEMO</div><div className="grid grid-cols-2 gap-px bg-gray-200">{[['R. Sharma *', '34 Runs • 21 Balls'], ['V. Kohli', '21 Runs • 16 Balls']].map(([name, score]) => <div key={name} className="bg-white p-3"><p className="text-xs text-gray-500">BATSMAN</p><p className="mt-1 text-sm font-black">{name}</p><p className="mt-1 text-xs">{score}</p></div>)}</div></section>
        <section className="mt-2 bg-white"><div className="bg-[#0b6259] px-3 py-2 text-sm font-black text-white">MATCH ODDS • DEMO</div>
          <div className="grid grid-cols-[1fr_72px_72px] bg-gray-100 p-2 text-center text-[10px] font-black"><span className="text-left">SELECTION</span><span>BACK</span><span>LAY</span></div>
          {demoTeams.map((team) => <div key={team.name} className="grid grid-cols-[1fr_72px_72px] items-center gap-[2px] border-b p-2"><span className="text-sm font-black">{team.name}</span>{['BACK', 'LAY'].map((type) => <button key={type} type="button" disabled={disabled} onClick={() => openSelection({ marketId: 'match-odds', market: 'Match Odds', selection: team.name, rate: type === 'BACK' ? team.back : team.lay, type })} className={`min-h-12 text-sm font-black disabled:opacity-50 ${type === 'BACK' ? 'bg-sky-300' : 'bg-pink-300'}`}>{type === 'BACK' ? team.back : team.lay}<span className="block text-[8px]">{type}</span></button>)}</div>)}
        </section>
        <section className="mt-2 bg-white pb-3"><div className="bg-[#0b6259] px-3 py-3 text-white"><h2 className="text-base font-black">FANCY MARKET</h2><p className="text-[9px]">Demo Sessions</p></div>
          <div className="grid grid-cols-[1fr_78px_78px] bg-gray-100 p-2 text-center text-[10px] font-black"><span className="text-left">MARKET</span><span className="text-pink-700">NO</span><span className="text-sky-700">YES</span></div>
          {markets.map((market) => <div key={market.id} className="grid grid-cols-[1fr_78px_78px] items-stretch gap-[2px] border-b p-2"><div className="flex min-w-0 flex-col justify-center pr-2"><p className="break-words text-[13px] font-black">{market.title}</p><p className="mt-1 text-[9px] text-gray-500">{market.subtitle}</p></div>{['NO', 'YES'].map((selection) => <button key={selection} type="button" disabled={disabled} onClick={() => openSelection({ marketId: market.id, market: market.title, selection, rate: selection === 'NO' ? market.no : market.yes, type: 'FANCY' })} className={`min-h-[58px] px-1 disabled:opacity-50 ${selection === 'NO' ? 'bg-pink-300' : 'bg-sky-300'}`}><span className="block text-base font-black">{selection === 'NO' ? market.no : market.yes}</span><span className="block text-[9px] font-bold">{selection}</span></button>)}</div>)}
        </section>
        <section className="m-3 rounded border border-amber-300 bg-amber-50 p-3 text-[11px] font-bold leading-5 text-amber-900">DEMO ONLY — Scores and market lines are simulated. WIN / LOST buttons manually simulate settlement. No automatic live-score settlement or real-money payouts.</section>
        <button type="button" disabled={busy} onClick={onBack} className="mx-3 mb-8 w-[calc(100%-24px)] rounded bg-[#064c45] py-3 text-sm font-black text-white">← BACK TO MATCHES</button>
      </>}
      {selectedMarket && <div className="fixed inset-0 z-[100] flex items-end bg-black/60"><div role="dialog" aria-modal="true" aria-label="Demo bet slip" className="max-h-[88vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl">
        <div className={`flex items-center justify-between px-4 py-3 ${selectedMarket.selection === 'NO' || selectedMarket.type === 'LAY' ? 'bg-pink-300' : 'bg-sky-300'}`}><div><p className="text-sm font-black">DEMO BET SLIP</p><p className="text-[10px] font-bold">Available: 🪙 {formattedBalance}</p></div><button type="button" disabled={busy} aria-label="Close bet slip" onClick={close} className="h-8 w-8 rounded-full bg-black/20 text-xl font-black">×</button></div>
        <div className="p-4"><p className="text-xs text-gray-500">{matchName}</p><h3 className="mt-1 text-lg font-black">{selectedMarket.market}</h3>
          <div className="mt-3 grid grid-cols-2 gap-2">{[['SELECTION', selectedMarket.selection], ['DEMO RATE / TARGET', selectedMarket.rate]].map(([label, value]) => <div key={label} className="rounded bg-gray-100 p-3"><p className="text-[10px] text-gray-500">{label}</p><p className="mt-1 font-black">{value}</p></div>)}</div>
          <label htmlFor="demo-stake" className="mt-4 block text-xs font-black">Demo Stake — Minimum 100 / Maximum 25,000</label>
          <input id="demo-stake" type="text" inputMode="numeric" value={stake} disabled={fieldLocked} onChange={(event) => { if (/^\d*$/.test(event.target.value)) { setStake(event.target.value); setMessage(''); } }} placeholder="Enter demo coins" className="mt-2 w-full rounded border-2 border-gray-300 px-3 py-3 text-lg font-black disabled:opacity-50" />
          <div className="mt-3 grid grid-cols-4 gap-2">{quickStakes.map((amount) => <button key={amount} type="button" disabled={fieldLocked} onClick={() => { setStake(String((Number(stake) || 0) + amount)); setMessage(''); }} className="rounded bg-gray-200 py-2 text-[11px] font-black disabled:opacity-50">+{amount.toLocaleString('en-IN')}</button>)}</div>
          {message && <div role="status" className="mt-4 rounded border border-teal-200 bg-teal-50 p-3 text-xs font-bold leading-5 text-teal-900">{message}</div>}
          <div className="mt-4 grid grid-cols-2 gap-3"><button type="button" disabled={busy} onClick={close} className="rounded border border-gray-400 py-3 text-sm font-black">{saved ? 'CLOSE' : 'CANCEL'}</button><button type="button" disabled={disabled || saved} onClick={save} className="rounded bg-[#075249] py-3 text-sm font-black text-white disabled:opacity-50">{busy ? 'SAVING...' : saved ? 'SAVED ✓' : retryPayloadRef.current ? 'RETRY SAME REQUEST' : 'SAVE DEMO SELECTION'}</button></div>
          <p className="mt-4 text-center text-[10px] leading-4 text-gray-500">Demo coins are saved on the server. Fancy WIN returns stake plus equal profit. Demo LAY stake represents liability. No real-money betting or payouts.</p>
        </div>
      </div></div>}
    </div>
  );
}
