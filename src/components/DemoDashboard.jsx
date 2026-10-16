import React, { useEffect, useState } from 'react';

import DepositPage from './DepositPage';
import WithdrawalPage from './WithdrawalPage';
import AccountStatementPage from './AccountStatementPage';
import BetHistoryPage from './BetHistoryPage';
import UnsettledBetPage from './UnsettledBetPage';
import SetButtonValuesPage from './SetButtonValuesPage';
import ChangePasswordPage from './ChangePasswordPage';
import MatchDetailsPage from './MatchDetailsPage';
import RulesPage from './RulesPage';

const sports = [
  { icon: '🏏', name: 'CRICKET' },
  { icon: '⚽', name: 'FOOTBALL' },
  { icon: '🎾', name: 'TENNIS' },
  { icon: '🏆', name: 'FANTASY 11' },
  { icon: '🥊', name: 'FIGHT EVENTS' },
  { icon: '🏇', name: 'HORSE RACING' },
];

const matches = [
  {
    id: 1,
    teams: 'India vs Australia',
    date: 'Demo Match',
    odds: ['1.85', '1.90', '3.20', '3.30', '2.10', '2.15'],
  },
  {
    id: 2,
    teams: 'Afghanistan vs Bangladesh',
    date: 'Demo Match',
    odds: ['5.70', '5.80', '23.0', '24.0', '1.27', '1.28'],
  },
  {
    id: 3,
    teams: 'South Africa vs England',
    date: 'Demo Match',
    odds: ['2.25', '2.30', '3.10', '3.20', '1.75', '1.80'],
  },
  {
    id: 4,
    teams: 'Western Australia vs Queensland Bulls',
    date: 'Demo Match',
    odds: ['1.65', '1.70', '3.50', '3.60', '2.40', '2.45'],
  },
];

const featuredGames = [
  { name: 'CREED ROOMZ', image: '/games/creed-roomz.png' },
  { name: 'LIGHTNING', image: '/games/lightning.png' },
  { name: 'INSTA LIVE', image: '/games/insta-live.png' },
  { name: 'EZUGI', image: '/games/ezugi.png' },
  { name: 'AVIATOR', image: '/games/aviator.png' },
  { name: 'MINES', image: '/games/mines.png' },
  { name: 'BIKINI GAMES', image: '/games/bikini-games.png' },
  {
    name: 'COLOR PREDICTION',
    image: '/games/color-prediction.png',
  },
];

const newLaunch = [
  { name: 'JILI', image: '/games/jili.png' },
  { name: 'GOLDEN KICK', image: '/games/golden-kick.png' },
  {
    name: 'SNAKES & LADDERS',
    image: '/games/snakes-ladders.png',
  },
  { name: 'PREDIX', image: '/games/predix.png' },
  { name: 'MONEY HEIST', image: '/games/money-heist.png' },
  { name: 'FOOTBALL X', image: '/games/football-x.png' },
  { name: 'TWIST X', image: '/games/twist-x.png' },
  {
    name: 'INSTANT RUMMY',
    image: '/games/instant-rummy.png',
  },
  {
    name: 'JHANDI MUNDA',
    image: '/games/jhandi-munda.png',
  },
  { name: 'BLACKJACK', image: '/games/blackjack.png' },
  {
    name: 'DEAL OR NO DEAL',
    image: '/games/deal-or-no-deal.png',
  },
  { name: 'LOOT BOXES', image: '/games/loot-boxes.png' },
];

const favourites = [
  {
    name: 'AVIATOR X',
    image: '/games/aviator-x.png',
  },
  {
    name: 'FANTASY 11',
    image: '/games/fantasy-11.png',
  },
  {
    name: 'CRICKET BATTLE',
    image: '/games/cricket-battle.png',
  },
  {
    name: 'LIGHTNING ROULETTE',
    image: '/games/lightning-roulette.png',
  },
  {
    name: 'DRAGON TIGER',
    image: '/games/dragon-tiger.png',
  },
  {
    name: 'BACCARAT',
    image: '/games/baccarat.png',
  },
  {
    name: 'ROULETTE',
    image: '/games/roulette.png',
  },
  {
    name: 'TEEN PATTI',
    image: '/games/teen-patti.png',
  },
];

const providers = [
  {
    name: 'MAC88',
    image: '/games/mac88.png',
  },
  {
    name: 'EZUGI',
    image: '/games/ezugi-provider.png',
  },
  {
    name: 'SMARTSOFT',
    image: '/games/smartsoft.png',
  },
  {
    name: 'SPRIBE',
    image: '/games/spribe.png',
  },
  {
    name: 'EVOLUTION',
    image: '/games/evolution.png',
  },
  {
    name: 'JILI',
    image: '/games/jili-provider.png',
  },
  {
    name: 'TURBO GAMES',
    image: '/games/turbo-games.png',
  },
  {
    name: 'GAMZIX',
    image: '/games/gamzix.png',
  },
  {
    name: 'KING MIDAS',
    image: '/games/king-midas.png',
  },
];

function NeonScrollingLine() {
  return (
    <div className="tsb-neon-area">
      <div className="tsb-neon-track">
        <span className="tsb-neon-text">
          ✦ TELUGU SPORTS BOOK • PREMIUM SPORTS & ENTERTAINMENT DEMO ✦
        </span>

        <span className="tsb-neon-text">
          ✦ TELUGU SPORTS BOOK • PREMIUM SPORTS & ENTERTAINMENT DEMO ✦
        </span>
      </div>
    </div>
  );
}

function GameSection({
  title,
  games,
  onGameClick,
}) {
  return (
    <section className="border-t border-[#1e293b] bg-[#080d16] px-3 py-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]" />

          <h2 className="text-sm font-black uppercase tracking-[0.08em] text-white">
            {title}
          </h2>
        </div>

        <span className="text-[8px] font-black uppercase tracking-wider text-gray-600">
          Explore
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {games.map((game) => (
          <button
            key={game.name}
            type="button"
            onClick={() => onGameClick(game)}
            className="group min-w-0 overflow-hidden rounded-xl border border-white/10 bg-[#111827] text-white shadow-lg transition active:scale-[0.97]"
          >
            <div className="relative aspect-square w-full overflow-hidden bg-black">
              <img
                src={game.image}
                alt={game.name}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              />

              <span className="absolute right-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[6px] font-black text-cyan-300">
                DEMO
              </span>

              <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black to-transparent" />
            </div>

            <div className="flex min-h-[32px] items-center justify-center px-1 py-1">
              <span className="line-clamp-2 text-center text-[7px] font-black uppercase leading-tight text-gray-200">
                {game.name}
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

export default function DemoDashboard({
  user,
  onLogout,
}) {
  const [selectedSport, setSelectedSport] =
    useState('CRICKET');

  const [selectedTab, setSelectedTab] =
    useState('INPLAY');

  const [matchFilter, setMatchFilter] =
    useState('LIVE');

  const [showDeposit, setShowDeposit] =
    useState(false);

  const [showWithdrawal, setShowWithdrawal] =
    useState(false);

  const [
    showAccountStatement,
    setShowAccountStatement,
  ] = useState(false);

  const [showBetHistory, setShowBetHistory] =
    useState(false);

  const [
    showUnsettledBet,
    setShowUnsettledBet,
  ] = useState(false);

  const [
    showSetButtonValues,
    setShowSetButtonValues,
  ] = useState(false);

  const [
    showChangePassword,
    setShowChangePassword,
  ] = useState(false);

  const [showRules, setShowRules] =
    useState(false);

  const [
    showCustomerMenu,
    setShowCustomerMenu,
  ] = useState(false);

  const [selectedMatch, setSelectedMatch] =
    useState(null);

  const [selectedGame, setSelectedGame] =
    useState(null);

  const [demoBalance, setDemoBalance] =
    useState(0);

  useEffect(() => {
    const loadDemoBalance = async () => {
      try {
        const customerId =
          user?.id || user?.customerId;

        if (!customerId) {
          setDemoBalance(0);
          return;
        }

        const response = await fetch(
          `/api/customers/${customerId}/demo-balance`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
            'Unable to load Demo Coin balance.'
          );
        }

        setDemoBalance(
          Number(data.balance) || 0
        );
      } catch (error) {
        console.error(
          'Demo Balance Load Error:',
          error
        );

        setDemoBalance(0);
      }
    };

    loadDemoBalance();
  }, [user?.id, user?.customerId]);

  const tabs = [
    'INPLAY',
    'SPORTS',
    'CASINO',
    'SPORTS BOOK',
    'PREDIX',
    'OTHERS',
  ];

  const customerMenuItems = [
    'Home',
    'Account Statement',
    'Bet History',
    'Unsettled Bet',
    'Set Button Values',
    'Change Password',
    'Rule',
  ];

  const handleCustomerMenu = (item) => {
    setShowCustomerMenu(false);

    if (item === 'Home') {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });

      return;
    }

    if (item === 'Account Statement') {
      setShowAccountStatement(true);
      return;
    }

    if (item === 'Bet History') {
      setShowBetHistory(true);
      return;
    }

    if (item === 'Unsettled Bet') {
      setShowUnsettledBet(true);
      return;
    }

    if (item === 'Set Button Values') {
      setShowSetButtonValues(true);
      return;
    }

    if (item === 'Change Password') {
      setShowChangePassword(true);
      return;
    }

    if (item === 'Rule') {
      setShowRules(true);
      return;
    }
  };

  if (showDeposit) {
    return (
      <DepositPage
        user={user}
        onBack={() => setShowDeposit(false)}
      />
    );
  }

  if (showWithdrawal) {
    return (
      <WithdrawalPage
        user={user}
        onBack={() => setShowWithdrawal(false)}
      />
    );
  }

  if (showAccountStatement) {
    return (
      <AccountStatementPage
        user={user}
        onBack={() =>
          setShowAccountStatement(false)
        }
      />
    );
  }

  if (showBetHistory) {
    return (
      <BetHistoryPage
        user={user}
        onBack={() =>
          setShowBetHistory(false)
        }
      />
    );
  }

  if (showUnsettledBet) {
    return (
      <UnsettledBetPage
        user={user}
        onBack={() =>
          setShowUnsettledBet(false)
        }
      />
    );
  }

  if (showSetButtonValues) {
    return (
      <SetButtonValuesPage
        user={user}
        onBack={() =>
          setShowSetButtonValues(false)
        }
      />
    );
  }

  if (showChangePassword) {
    return (
      <ChangePasswordPage
        user={user}
        onBack={() =>
          setShowChangePassword(false)
        }
      />
    );
  }

  if (showRules) {
    return (
      <RulesPage
        user={user}
        onBack={() =>
          setShowRules(false)
        }
      />
    );
  }

  if (selectedMatch) {
    return (
      <MatchDetailsPage
        match={selectedMatch}
        user={user}
        onBack={() =>
          setSelectedMatch(null)
        }
      />
    );
  }

  if (selectedGame) {
    return (
      <div className="min-h-screen bg-[#080d16] text-white">
        <header className="sticky top-0 z-40 flex items-center border-b border-cyan-500/20 bg-[#0b121e] px-4 py-3">
          <button
            type="button"
            onClick={() =>
              setSelectedGame(null)
            }
            className="mr-3 rounded-lg border border-cyan-400/40 bg-[#111827] px-3 py-2 text-xs font-black text-cyan-300"
          >
            ‹ BACK
          </button>

          <h1 className="truncate text-sm font-black text-white">
            {selectedGame.name}
          </h1>
        </header>

        <div className="flex min-h-[75vh] flex-col items-center justify-center px-5 text-center">
          <div className="w-full max-w-[320px] overflow-hidden rounded-2xl border border-cyan-500/30 bg-[#111827] p-2 shadow-[0_0_35px_rgba(34,211,238,0.12)]">
            <img
              src={selectedGame.image}
              alt={selectedGame.name}
              className="w-full rounded-xl"
            />
          </div>

          <h2 className="mt-6 text-2xl font-black text-white">
            {selectedGame.name}
          </h2>

          <div className="mt-4 rounded-full border border-amber-400/50 bg-amber-400/10 px-6 py-2">
            <span className="text-sm font-black text-amber-300">
              🚀 COMING SOON
            </span>
          </div>

          <p className="mt-4 text-xs text-gray-500">
            Demo preview only
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#080d16] text-white">

      <style>
        {`
          .tsb-neon-area {
            width: 100%;
            height: 30px;
            overflow: hidden;
            position: relative;
            white-space: nowrap;
            display: flex;
            align-items: center;
          }

          .tsb-neon-track {
            position: absolute;
            display: flex;
            width: max-content;
            align-items: center;
            animation: tsbScroll 14s linear infinite;
          }

          .tsb-neon-text {
            display: inline-block;
            padding-right: 70px;
            font-size: 12px;
            line-height: 30px;
            font-weight: 900;
            letter-spacing: 1px;

            background: linear-gradient(
              90deg,
              #22d3ee,
              #34d399,
              #fbbf24,
              #fb7185,
              #a78bfa,
              #22d3ee
            );

            background-size: 300% 100%;
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;

            animation: tsbColor 3s linear infinite;

            filter:
              drop-shadow(0 0 2px rgba(34,211,238,.7))
              drop-shadow(0 0 5px rgba(52,211,153,.35));
          }

          @keyframes tsbScroll {
            0% {
              transform: translateX(100vw);
            }

            100% {
              transform: translateX(-100%);
            }
          }

          @keyframes tsbColor {
            0% {
              background-position: 0% 50%;
            }

            100% {
              background-position: 300% 50%;
            }
          }

          .tsb-scrollbar::-webkit-scrollbar {
            height: 3px;
          }

          .tsb-scrollbar::-webkit-scrollbar-track {
            background: #020617;
          }

          .tsb-scrollbar::-webkit-scrollbar-thumb {
            background: #0d9488;
            border-radius: 999px;
          }
        `}
      </style>

      {/* PREMIUM HEADER */}

      <header className="border-b border-[#1f2937] bg-gradient-to-br from-[#0c1727] via-[#0b121e] to-[#111827] px-4 pb-3 pt-4">

        <div className="flex items-start justify-between gap-3">

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/30 bg-gradient-to-br from-amber-400/20 to-orange-500/10 text-xl shadow-[0_0_20px_rgba(245,158,11,.12)]">
                🏆
              </div>

              <div>
                <h1 className="text-lg font-black tracking-wide">
                  <span className="text-amber-400">
                    TELUGU
                  </span>{' '}
                  <span className="text-white">
                    SPORTS
                  </span>
                </h1>

                <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.24em] text-cyan-400">
                  BOOK • DEMO
                </p>
              </div>
            </div>
          </div>

          <div className="relative shrink-0 text-right">

            <div className="rounded-xl border border-amber-400/20 bg-black/20 px-3 py-2">
              <p className="text-[8px] font-bold uppercase tracking-wider text-gray-500">
                Demo Balance
              </p>

              <p className="mt-0.5 text-sm font-black text-amber-300">
                🪙{' '}
                {demoBalance.toLocaleString(
                  'en-IN'
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowCustomerMenu(
                  (value) => !value
                )
              }
              className="mt-2 max-w-[135px] truncate rounded-lg border border-cyan-400/30 bg-[#111827] px-3 py-2 text-[10px] font-black text-cyan-200"
            >
              {user?.name ||
                user?.identifier ||
                'Demo User'}{' '}
              ▼
            </button>

            {showCustomerMenu && (
              <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-white/10 bg-[#111827] text-left text-gray-100 shadow-2xl">

                {customerMenuItems.map(
                  (item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() =>
                        handleCustomerMenu(
                          item
                        )
                      }
                      className="block w-full border-b border-white/5 px-4 py-3 text-left text-[11px] font-bold transition hover:bg-white/5"
                    >
                      {item}
                    </button>
                  )
                )}

                <button
                  type="button"
                  onClick={onLogout}
                  className="block w-full bg-red-500/10 px-4 py-3 text-left text-[11px] font-black text-red-400"
                >
                  Logout
                </button>

              </div>
            )}

          </div>
        </div>

        <div className="mt-2 overflow-hidden rounded-lg border border-cyan-500/10 bg-black/20">
          <NeonScrollingLine />
        </div>

        {/* ACTION CARDS */}

        <div className="mt-3 grid grid-cols-2 gap-3">

          <button
            type="button"
            onClick={() =>
              setShowDeposit(true)
            }
            className="relative overflow-hidden rounded-xl border border-emerald-400/40 bg-gradient-to-br from-emerald-500/25 via-[#10241f] to-[#0d1719] px-3 py-3 text-left shadow-[0_0_20px_rgba(52,211,153,.08)] transition active:scale-[0.98]"
          >
            <span className="block text-xl">
              💰
            </span>

            <span className="mt-1 block text-sm font-black text-white">
              DEPOSIT
            </span>

            <span className="mt-0.5 block text-[8px] font-bold uppercase tracking-wider text-emerald-400">
              Demo Credits
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setShowWithdrawal(true)
            }
            className="relative overflow-hidden rounded-xl border border-orange-400/40 bg-gradient-to-br from-orange-500/25 via-[#251811] to-[#17120f] px-3 py-3 text-left shadow-[0_0_20px_rgba(251,146,60,.08)] transition active:scale-[0.98]"
          >
            <span className="block text-xl">
              💸
            </span>

            <span className="mt-1 block text-sm font-black text-white">
              WITHDRAWAL
            </span>

            <span className="mt-0.5 block text-[8px] font-bold uppercase tracking-wider text-orange-400">
              Demo Request
            </span>
          </button>

        </div>

        <div className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-amber-400/10 bg-amber-400/5 px-3 py-2">
          <span className="text-xs">
            🏆
          </span>

          <p className="text-[9px] font-black uppercase tracking-wider text-amber-300">
            Our Exchange • Demo Sports Hub
          </p>
        </div>

      </header>

      {/* MAIN NAV */}

      <nav
        className="tsb-scrollbar w-full overflow-x-auto border-b border-white/10 bg-[#0d1523]"
        style={{
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-x',
        }}
      >
        <div className="flex w-max min-w-full px-2 py-2">

          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() =>
                setSelectedTab(tab)
              }
              className={`mr-2 shrink-0 rounded-lg border px-4 py-2 text-[9px] font-black transition ${
                selectedTab === tab
                  ? 'border-cyan-400/50 bg-cyan-400/15 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,.08)]'
                  : 'border-white/10 bg-[#111827] text-gray-400'
              }`}
            >
              {tab}
            </button>
          ))}

        </div>
      </nav>

      {/* SPORTS */}

      <section
        className="tsb-scrollbar w-full overflow-x-auto border-b border-white/10 bg-[#0a101b]"
        style={{
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-x',
        }}
      >
        <div className="flex w-max gap-2 px-3 py-3">

          {sports.map((sport) => (
            <button
              key={sport.name}
              type="button"
              onClick={() =>
                setSelectedSport(
                  sport.name
                )
              }
              className={`w-[90px] shrink-0 rounded-xl border px-2 py-2 text-center transition ${
                selectedSport === sport.name
                  ? 'border-amber-400/50 bg-gradient-to-br from-amber-400/20 to-orange-500/10 text-white'
                  : 'border-white/10 bg-[#111827] text-gray-400'
              }`}
            >
              <span className="block text-xl leading-none">
                {sport.icon}
              </span>

              <span className="mt-2 block whitespace-nowrap text-[7px] font-black leading-none">
                {sport.name}
              </span>
            </button>
          ))}

        </div>
      </section>

      {/* MATCH SECTION HEADER */}

      <section className="bg-[#080d16] px-3 pb-2 pt-4">
        <div className="flex items-center justify-between">

          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500 shadow-[0_0_12px_#ef4444]" />

              <h2 className="text-lg font-black tracking-wide text-white">
                LIVE SPORTS
              </h2>
            </div>

            <p className="mt-1 text-[9px] font-bold text-gray-600">
              Demo / mock sports data
            </p>
          </div>

          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[8px] font-black text-emerald-400">
            ● CONNECTED
          </span>

        </div>
      </section>

      {/* FILTER */}

      <section className="border-b border-white/10 bg-[#080d16] px-3 py-3">

        <div className="flex gap-2">

          {[
            'LIVE',
            'VIRTUAL',
            'PREMIUM',
          ].map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() =>
                setMatchFilter(filter)
              }
              className={`rounded-lg border px-4 py-2 text-[8px] font-black ${
                matchFilter === filter
                  ? 'border-red-400/40 bg-red-500/15 text-red-300'
                  : 'border-white/10 bg-[#111827] text-gray-500'
              }`}
            >
              {filter}
            </button>
          ))}

        </div>

      </section>

      {/* MATCHES */}

      <section className="bg-[#080d16] px-3 pb-4">

        {matches.map((match) => (
          <article
            key={match.id}
            className="mb-3 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#111827] to-[#0c1320] shadow-xl"
          >

            <div className="flex items-start justify-between gap-2 border-b border-white/5 px-4 py-3">

              <div className="min-w-0 flex-1">

                <div className="mb-1 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />

                  <span className="text-[7px] font-black uppercase tracking-wider text-red-400">
                    Live Demo
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedMatch(
                      match
                    )
                  }
                  className="block w-full text-left"
                >
                  <h2 className="truncate text-[13px] font-black text-white">
                    {match.teams}
                  </h2>
                </button>

                <p className="mt-1 text-[8px] font-bold text-gray-500">
                  {match.date}
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedMatch(match)
                }
                className="shrink-0 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-[8px] font-black text-cyan-300"
              >
                OPEN ›
              </button>

            </div>

            <div className="px-3 py-3">

              <div className="grid grid-cols-3 text-center text-[8px] font-black text-gray-500">
                <span>1</span>
                <span>X</span>
                <span>2</span>
              </div>

              <div className="mt-2 grid grid-cols-6 gap-1">

                {match.odds.map(
                  (odd, index) => (
                    <button
                      key={`${match.id}-${index}`}
                      type="button"
                      onClick={() =>
                        setSelectedMatch(
                          match
                        )
                      }
                      className={`h-[42px] rounded-lg border text-[9px] font-black ${
                        index % 2 === 0
                          ? 'border-cyan-400/20 bg-cyan-400/15 text-cyan-200'
                          : 'border-pink-400/20 bg-pink-400/15 text-pink-200'
                      }`}
                    >
                      {odd}
                    </button>
                  )
                )}

              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedMatch(match)
                }
                className="mt-3 h-[34px] w-full rounded-lg border border-cyan-400/20 bg-[#0b1c24] text-[8px] font-black uppercase tracking-wider text-cyan-300"
              >
                View Match Details ›
              </button>

            </div>

          </article>
        ))}

      </section>

      {/* FEATURED */}

      <GameSection
        title="FEATURED GAMES"
        games={featuredGames}
        onGameClick={setSelectedGame}
      />

      {/* NEW LAUNCH */}

      <GameSection
        title="NEW LAUNCH"
        games={newLaunch}
        onGameClick={setSelectedGame}
      />

      {/* FAVOURITES */}

      <GameSection
        title="MY FAVOURITES"
        games={favourites}
        onGameClick={setSelectedGame}
      />

      {/* PROVIDERS */}

      <GameSection
        title="OUR PROVIDERS"
        games={providers}
        onGameClick={setSelectedGame}
      />

      {/* FOOTER */}

      <footer className="border-t border-white/10 bg-[#050911] px-5 py-8 text-center">

        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/5 text-xl">
          🏆
        </div>

        <p className="mt-3 text-sm font-black text-white">
          TELUGU SPORTS BOOK
        </p>

        <p className="mt-1 text-[8px] font-black uppercase tracking-[0.18em] text-cyan-500">
          Demo Website
        </p>

        <p className="mx-auto mt-3 max-w-xl text-[9px] leading-5 text-gray-600">
          For demonstration and informational purposes only.
          No real-money transactions.
        </p>

      </footer>

    </div>
  );
}
