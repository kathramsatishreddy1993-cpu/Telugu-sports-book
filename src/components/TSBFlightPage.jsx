import React, { useEffect, useRef, useState } from 'react';
import {
  flightApi,
  useFlightState,
  flightRequestKey,
  notifyFlightWallet,
} from './flightClient';

export default function TSBFlightPage({ user, onBack, onLogout }) {
  const { data, error, receivedAt, refresh } = useFlightState(
    '/api/flight/state',
  );
  const [clock, setClock] = useState(Date.now());
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    const timer = setInterval(() => setClock(Date.now()), 50);
    return () => {
      alive.current = false;
      clearInterval(timer);
    };
  }, []);
  const customerId = user?.id ?? user?.customerId ?? user?.customer_id;
  const wrongAccount =
    data && String(data.customerId) !== String(customerId);
  const round = data?.round;
  const elapsed = Math.max(0, clock - receivedAt);
  const serverNow = data
    ? new Date(data.serverTime).getTime() + elapsed
    : clock;
  const start = round ? new Date(round.startsAt).getTime() : 0;
  const fresh = Boolean(data && !error && elapsed < 3500 && !wrongAccount);
  const phase =
    round?.phase === 'CRASHED'
      ? 'CRASHED'
      : !round
        ? 'WAITING'
        : serverNow < start
          ? 'COUNTDOWN'
          : 'RUNNING';
  const multiplier =
    phase === 'CRASHED'
      ? round.crashMultiplier
      : phase === 'RUNNING'
        ? Math.floor(
            Math.exp(
              ((data?.growthRate || 0.085) *
                Math.max(0, serverNow - start)) /
                1000,
            ) * 100,
          ) / 100
        : 1;
  const shownBalance = data ? Number(data.balance).toLocaleString('en-IN') : 'Loading...';
  const [verified, setVerified] = useState('');
  useEffect(() => {
    let active = true;
    setVerified('');
    if (
      round?.phase === 'CRASHED' &&
      round.seed &&
      globalThis.crypto?.subtle
    ) {
      const text = `${round.id}:${Math.round(round.crashMultiplier * 100)}:${round.seed}`;
      crypto.subtle
        .digest('SHA-256', new TextEncoder().encode(text))
        .then((hash) => {
          const result = Array.from(new Uint8Array(hash), (x) =>
            x.toString(16).padStart(2, '0'),
          ).join('');
          if (active)
            setVerified(
              result === round.commitment
                ? 'Locked result verified ✓'
                : 'Result verification failed',
            );
        })
        .catch(() => {
          if (active) setVerified('Verification unavailable.');
        });
    }
    return () => {
      active = false;
    };
  }, [
    round?.id,
    round?.phase,
    round?.seed,
    round?.crashMultiplier,
    round?.commitment,
  ]);

  return (
    <div className="min-h-screen bg-[#060d19] text-white font-sans">
      <header className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#0b1628] p-4">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-cyan-400/30 px-3 py-2 text-sm text-cyan-200"
        >
          ← Home
        </button>
        <div>
          <h1 className="text-lg font-black text-cyan-300">TSB FLIGHT</h1>
          <p className="text-[10px] text-slate-400">MULTIPLAYER DEMO</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">Demo coins</p>
          <p className="font-black text-amber-300">{shownBalance}</p>
        </div>
      </header>
      <main className="mx-auto max-w-4xl space-y-4 p-4">
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100">
          <strong>Admin-controlled demo test round.</strong> The controller
          locks the crash point before betting opens. Demo coins only.
          Closing this page does not cash out; the server must accept your
          cash-out request before crash.
        </div>
        {(error || wrongAccount) && (
          <div
            role="alert"
            className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200"
          >
            {wrongAccount
              ? 'Customer session does not match. Logout and login again.'
              : error}
            <button
              type="button"
              onClick={onLogout}
              className="ml-3 underline"
            >
              Logout / login again
            </button>
          </div>
        )}
        <FlightScene round={round} phase={phase} multiplier={multiplier} now={serverNow} start={start} verified={verified} fresh={fresh} />
        {[1, 2].map((slot) => (
          <BetBox key={`${customerId}-${round?.id || 'waiting'}-${slot}`} slot={slot}
            round={round} phase={phase} fresh={fresh} multiplier={multiplier}
            bets={data?.bets || []} refresh={refresh} />
        ))}
        <section className="rounded-2xl border border-white/10 bg-[#0d192a] p-4">
          <h2 className="font-black">Recent rounds</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {data?.history?.map((r) => (
              <span
                key={r.id}
                className="rounded-full border border-red-400/20 bg-red-400/10 px-3 py-1 text-xs text-red-200"
              >
                #{r.id} · {r.crashMultiplier.toFixed(2)}×
              </span>
            ))}
            {!data?.history?.length && (
              <p className="text-xs text-slate-400">
                No completed rounds.
              </p>
            )}
          </div>
        </section>
        <section className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0d192a] p-4">
          <h2 className="font-black">Your flight history</h2>
          <table className="mt-3 w-full text-left text-xs">
            <thead className="text-slate-400">
              <tr>
                <th className="py-2">Round</th>
                <th>Box</th>
                <th>Stake</th>
                <th>Result</th>
                <th>Returned</th>
              </tr>
            </thead>
            <tbody>
              {data?.bets?.map((b) => (
                <tr key={b.id} className="border-t border-white/5">
                  <td className="py-3">#{b.roundId}</td>
                  <td>{b.slot || 1}</td>
                  <td>{b.stake}</td>
                  <td>
                    {b.status}
                    {b.cashoutMultiplier
                      ? ` · ${b.cashoutMultiplier.toFixed(2)}×`
                      : ''}
                  </td>
                  <td>{b.payout}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        {round && (
          <details className="break-all rounded-xl border border-white/10 p-3 text-[10px] text-slate-400">
            <summary className="cursor-pointer">
              Locked round verification
            </summary>
            <p className="mt-2">SHA-256 commitment: {round.commitment}</p>
            {round.seed && (
              <p className="mt-2">Revealed seed: {round.seed}</p>
            )}
            <p className="mt-2">
              Commitment input: round ID : crash multiplier × 100 : seed.
              This verifies the locked result; this test mode is
              admin-selected, not random.
            </p>
          </details>
        )}
      </main>
    </div>
  );
}


function BetBox({ slot, round, phase, fresh, multiplier, bets, refresh }) {
  const [stake, setStake] = useState('50');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState(null);
  const pending = useRef(null);
  const inflight = useRef(false);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const remote = bets.find(b => String(b.roundId) === String(round?.id) && Number(b.slot || 1) === slot);
  // A successful mutation is shown immediately, even before the next poll.
  const bet = remote?.status === 'CASHED_OUT' || remote?.status === 'LOST' ? remote : saved || remote;
  const editable = !busy && !bet && !pending.current;
  const cashout = bet?.status === 'PLACED' && phase === 'RUNNING';
  const canBet = !bet && phase === 'COUNTDOWN';
  const change = delta => {
    if (!editable) return;
    setStake(String(Math.min(25000, Math.max(10, (Number(stake) || 0) + delta))));
  };
  const act = async () => {
    if (inflight.current || !fresh || (!cashout && !canBet)) return;
    inflight.current = true;
    setBusy(true); setMessage('');
    try {
      let result;
      if (cashout) {
        result = await flightApi(`/api/flight/bets/${bet.id}/cashout`, {});
      } else {
        const amount = Number(stake);
        if (!Number.isSafeInteger(amount) || amount < 10 || amount > 25000)
          throw new Error('Enter 10–25,000 whole demo coins.');
        const payload = pending.current || {roundId: round.id, slot, stake: amount, requestKey: flightRequestKey()};
        pending.current = payload;
        result = await flightApi('/api/flight/bets', payload);
        pending.current = null;
      }
      notifyFlightWallet();
      if (mounted.current) {
        setSaved(result.bet);
        setMessage(result.bet.status === 'CASHED_OUT'
          ? `Cashed out at ${result.bet.cashoutMultiplier.toFixed(2)}× · ${result.bet.payout.toLocaleString('en-IN')} coins returned (stake included).`
          : `Box ${slot}: ${result.bet.stake.toLocaleString('en-IN')} demo coins placed.`);
      }
    } catch (error) {
      if (mounted.current) setMessage(error.message);
    } finally {
      inflight.current = false;
      if (mounted.current) setBusy(false);
      refresh();
    }
  };
  return (
    <section className="rounded-2xl border border-white/10 bg-[#0d192a] p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-black text-cyan-200">BET BOX {slot}</h2>
        <span className="text-[10px] text-slate-400">10–25,000 demo coins</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <div className="flex items-center rounded-full border border-white/20 bg-[#060d19] p-1">
            <button type="button" aria-label={`Decrease box ${slot} stake`} disabled={!editable} onClick={() => change(-10)} className="h-10 w-8 shrink-0 rounded-full text-xl disabled:opacity-30">−</button>
            <input aria-label={`Box ${slot} stake`} type="text" inputMode="numeric" value={stake} disabled={!editable}
              onChange={e => { if (/^\d*$/.test(e.target.value)) setStake(e.target.value); }}
              className="min-w-0 w-full bg-transparent text-center text-xl font-black outline-none disabled:opacity-50" />
            <button type="button" aria-label={`Increase box ${slot} stake`} disabled={!editable} onClick={() => change(10)} className="h-10 w-8 shrink-0 rounded-full text-xl disabled:opacity-30">+</button>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[100,500,1000,5000].map(amount => <button key={amount} type="button" disabled={!editable} onClick={() => change(amount)} className="rounded-full bg-white/5 py-2 text-xs font-bold text-slate-300 disabled:opacity-30">+{amount.toLocaleString('en-IN')}</button>)}
          </div>
        </div>
        <button type="button" disabled={busy || !fresh || (!cashout && !canBet)} onClick={act}
          className={`min-w-0 rounded-2xl px-2 py-3 font-black text-black disabled:opacity-40 ${cashout ? 'bg-amber-300' : 'bg-emerald-400'}`}>
          <span className="block text-sm">{busy ? 'PROCESSING…' : cashout ? 'CASH OUT' : bet ? bet.status === 'CASHED_OUT' ? 'CASHED OUT' : bet.status === 'LOST' ? 'ROUND LOST' : 'BET PLACED' : pending.current ? 'RETRY SAME BET' : 'BET'}</span>
          <span className="mt-2 block break-words text-xl">{cashout ? `≈ ${Math.floor(bet.stake * multiplier).toLocaleString('en-IN')}` : Number(bet?.stake ?? stake).toLocaleString('en-IN')}</span>
          <span className="mt-1 block text-[10px]">DEMO COINS</span>
        </button>
      </div>
      {message && <p role="status" className="mt-3 text-xs leading-5 text-cyan-100">{message}</p>}
      {bet && <p className="mt-2 text-[10px] text-slate-400">Round #{bet.roundId} · {bet.status}</p>}
      <p className="mt-3 text-[10px] leading-5 text-slate-400">Bet during countdown. Cash out each box separately before crash. Server timing applies.</p>
    </section>
  );
}

function FlightScene({round, phase, multiplier, now, start, verified, fresh}) {
  const running = phase === 'RUNNING', crashed = phase === 'CRASHED';
  const seconds = Math.max(0,(now-start)/1000);
  const duration = crashed ? Math.log(Math.max(1,round?.crashMultiplier || 1))/.085 : seconds;
  const progress = running || crashed ? 1-Math.exp(-duration/15) : 0;
  const x = 52+440*progress, y = 265-165*Math.pow(progress,1.35)+(running ? Math.sin(seconds*2)*4*progress : 0);
  const curve = `M 52 265 Q ${52+(x-52)*.55} 265 ${x} ${y}`;
  return <section className="relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-[#07111f]">
    <style>{`
      @keyframes tsb-grid {to {background-position:-36px 36px}}
      @keyframes tsb-depart {to {transform:translate(200px,-120px);opacity:0}}
      @keyframes tsb-engine {to {opacity:.4;transform:scaleX(.6)}}
      .tsb-flight-grid{position:absolute;inset:0;opacity:.15;background-image:linear-gradient(#38bdf8 1px,transparent 1px),linear-gradient(90deg,#38bdf8 1px,transparent 1px);background-size:36px 36px}
      .tsb-flight-grid.fly{animation:tsb-grid 2s linear infinite}
      .tsb-plane-depart{animation:tsb-depart .7s ease-in forwards}
      .tsb-plane-engine{transform-box:fill-box;transform-origin:right;animation:tsb-engine .18s infinite alternate}
    `}</style>
    <div className={`tsb-flight-grid ${running ? 'fly' : ''}`} />
    <div className="absolute inset-x-0 top-5 z-10 text-center px-3">
      <p className="text-[10px] font-bold tracking-widest text-slate-400">{round ? `ROUND #${round.id}` : 'TSB FLIGHT'}</p>
      <p className={`mt-4 text-5xl font-black sm:text-7xl ${crashed ? 'text-red-400' : 'text-cyan-300'}`}>{phase === 'WAITING' ? 'WAITING' : phase === 'COUNTDOWN' ? Math.max(0,Math.ceil((start-now)/1000)) : `${multiplier.toFixed(2)}×`}</p>
      <p className="mt-2 text-[10px] font-black">{phase === 'COUNTDOWN' ? 'BETTING OPEN · RESULT LOCKED' : crashed ? 'ROUND CRASHED' : running ? 'FLIGHT RUNNING' : 'WAITING FOR NEXT ROUND'}</p>
    </div>
    <svg viewBox="0 0 600 330" className="relative block w-full" role="img" aria-label={running ? 'Plane flying upward' : 'Flight display'}>
      <defs><linearGradient id="tsb-flight-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={crashed ? '#f87171' : '#22d3ee'} stopOpacity=".3"/><stop offset="100%" stopColor="#22d3ee" stopOpacity="0"/></linearGradient></defs>
      <path d="M 30 35 V 285 H 570" fill="none" stroke="#334155" />
      {(running || crashed) && <><path d={`${curve} L ${x} 285 L 52 285 Z`} fill="url(#tsb-flight-fill)"/><path d={curve} fill="none" stroke={crashed ? '#f87171' : '#22d3ee'} strokeWidth="4" strokeLinecap="round"/></>}
      <g transform={`translate(${x} ${y})`}><g key={`${round?.id}-${crashed}`} className={crashed ? 'tsb-plane-depart' : ''}><g transform={`rotate(${-8-progress*25})`}>
        {running && <path className="tsb-plane-engine" d="M -30 -3 L -65 0 L -30 5 Z" fill="#fbbf24"/>}
        <path d="M -36 -5 L -14 -6 L -5 -26 L 5 -26 L 4 -6 L 25 -5 Q 42 -3 44 1 Q 39 6 25 7 L 3 7 L -14 25 L -24 25 L -14 6 L -34 6 L -45 15 L -51 15 L -44 2 L -51 -11 L -44 -11 Z" fill="#67e8f9" stroke="#ecfeff" strokeWidth="1.3"/>
        <path d="M 18 -4 L 28 -3 L 32 0 L 18 0 Z" fill="#0c4a6e"/>
      </g></g></g>
    </svg>
    <div className="relative min-h-[30px] px-3 pb-3 text-center text-[10px] text-slate-300">{!fresh && round ? 'Connection unavailable — actions paused; animation is an estimate.' : verified}</div>
  </section>;
}
