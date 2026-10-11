import React, { useState } from 'react';

import DepositPage from './DepositPage';
import WithdrawalPage from './WithdrawalPage';
import AccountStatementPage from './AccountStatementPage';
import BetHistoryPage from './BetHistoryPage';
import UnsettledBetPage from './UnsettledBetPage';
import SetButtonValuesPage from './SetButtonValuesPage';
import ChangePasswordPage from './ChangePasswordPage';
import MatchDetailsPage from './MatchDetailsPage';

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

/* NEW LAUNCH — REAL UPLOADED IMAGES */
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
  'AVIATOR X',
  'FANTASY 11',
  'CRICKET BATTLE',
  'LIGHTNING ROULETTE',
  'DRAGON TIGER',
  'BACCARAT',
  'ROULETTE',
  'TEEN PATTI',
];

const providers = [
  'MAC88',
  'EZUGI',
  'SMARTSOFT',
  'SPRIBE',
  'EVOLUTION',
  'JILI',
  'TURBO GAMES',
  'GAMZIX',
  'KING MIDAS',
];

const placeholderBackgrounds = [
  'from-[#111827] via-[#312e81] to-[#7e22ce]',
  'from-[#172554] via-[#4c1d95] to-[#be185d]',
  'from-[#1e1b4b] via-[#581c87] to-[#4338ca]',
  'from-[#431407] via-[#9a3412] to-[#dc2626]',
];

function NeonScrollingLine() {
  return (
    <div className="neon-scroll-area">
      <div className="neon-scroll-track">
        <span className="neon-scroll-text">
          ✦ TELUGU SPORTS BOOK • PREMIUM SPORTS & ENTERTAINMENT DEMO ✦
        </span>

        <span className="neon-scroll-text">
          ✦ TELUGU SPORTS BOOK • PREMIUM SPORTS & ENTERTAINMENT DEMO ✦
        </span>
      </div>
    </div>
  );
}

function FeaturedGamesGrid({ onGameClick }) {
  return (
    <section className="border-t-4 border-[#073c37] bg-[#062f2b]">
      <div className="grid grid-cols-4 gap-[2px]">
        {featuredGames.map((game) => (
          <button
            key={game.name}
            type="button"
            onClick={() => onGameClick(game)}
            className="min-w-0 overflow-hidden bg-[#10251f] text-white"
          >
            <div className="relative aspect-square w-full overflow-hidden bg-black">
              <img
                src={game.image}
                alt={game.name}
                className="h-full w-full object-cover"
              />

              <span className="absolute right-1 top-1 rounded bg-black/60 px-1 py-[1px] text-[6px] font-bold">
                DEMO
              </span>
            </div>

            <div className="flex h-[25px] items-center justify-center bg-gradient-to-b from-[#7c4b0b] to-[#063c34] px-1">
              <span className="line-clamp-2 text-center text-[7px] font-black uppercase leading-tight">
                {game.name}
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

/* NEW LAUNCH IMAGE GRID */
function NewLaunchGrid({ onGameClick }) {
  return (
    <section className="border-t border-[#164c46] bg-[#062f2b]">
      <h2 className="px-3 py-2 text-sm font-black text-white">
        NEW LAUNCH
      </h2>

      <div className="grid grid-cols-4 gap-[2px]">
        {newLaunch.map((game) => (
          <button
            key={game.name}
            type="button"
            onClick={() => onGameClick(game)}
            className="min-w-0 overflow-hidden bg-[#10251f] text-white"
          >
            <div className="relative aspect-square w-full overflow-hidden bg-black">
              <img
                src={game.image}
                alt={game.name}
                className="h-full w-full object-cover"
              />

              <span className="absolute right-1 top-1 rounded bg-black/60 px-1 py-[1px] text-[6px] font-bold">
                DEMO
              </span>
            </div>

            <div className="flex h-[25px] items-center justify-center bg-gradient-to-b from-[#7c4b0b] to-[#063c34] px-1">
              <span className="line-clamp-2 text-center text-[7px] font-black uppercase leading-tight">
                {game.name}
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function DemoGameGrid({ title, games }) {
  return (
    <section className="border-t border-[#164c46] bg-[#062f2b]">
      <h2 className="px-3 py-2 text-sm font-black text-white">
        {title}
      </h2>

      <div className="grid grid-cols-4 gap-[2px]">
        {games.map((game, index) => (
          <button
            key={`${game}-${index}`}
            type="button"
            className="min-w-0 overflow-hidden bg-[#10251f] text-white"
          >
            <div
              className={`relative flex aspect-square items-center justify-center bg-gradient-to-br ${
                placeholderBackgrounds[
                  index % placeholderBackgrounds.length
                ]
              } px-1`}
            >
              <span className="break-words text-center text-[8px] font-black uppercase leading-tight">
                {game}
              </span>

              <span className="absolute right-1 top-1 rounded bg-black/40 px-1 text-[6px]">
                DEMO
              </span>
            </div>

            <div className="flex h-[25px] items-center justify-center bg-gradient-to-b from-[#7c4b0b] to-[#063c34] px-1">
              <span className="line-clamp-2 text-center text-[7px] font-black uppercase leading-tight">
                {game}
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

export default function DemoDashboard({ user, onLogout }) {
  const [selectedSport, setSelectedSport] = useState('CRICKET');
  const [selectedTab, setSelectedTab] = useState('INPLAY');
  const [matchFilter, setMatchFilter] = useState('LIVE');

  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [showAccountStatement, setShowAccountStatement] =
    useState(false);
  const [showBetHistory, setShowBetHistory] = useState(false);
  const [showUnsettledBet, setShowUnsettledBet] =
    useState(false);
  const [showSetButtonValues, setShowSetButtonValues] =
    useState(false);
  const [showChangePassword, setShowChangePassword] =
    useState(false);
  const [showCustomerMenu, setShowCustomerMenu] =
    useState(false);

  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);

  const [demoBalance] = useState(() => {
    try {
      const saved = localStorage.getItem(
        'telugu_sports_demo_balance'
      );

      if (saved === null) {
        localStorage.setItem(
          'telugu_sports_demo_balance',
          '10000'
        );
        return 10000;
      }

      const value = Number(saved);

      return Number.isFinite(value) ? value : 10000;
    } catch {
      return 10000;
    }
  });

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
      alert('Rule — Demo page will be connected next');
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
        onBack={() => setShowAccountStatement(false)}
      />
    );
  }

  if (showBetHistory) {
    return (
      <BetHistoryPage
        user={user}
        onBack={() => setShowBetHistory(false)}
      />
    );
  }

  if (showUnsettledBet) {
    return (
      <UnsettledBetPage
        user={user}
        onBack={() => setShowUnsettledBet(false)}
      />
    );
  }

  if (showSetButtonValues) {
    return (
      <SetButtonValuesPage
        user={user}
        onBack={() => setShowSetButtonValues(false)}
      />
    );
  }

  if (showChangePassword) {
    return (
      <ChangePasswordPage
        user={user}
        onBack={() => setShowChangePassword(false)}
      />
    );
  }

  if (selectedMatch) {
    return (
      <MatchDetailsPage
        match={selectedMatch}
        user={user}
        onBack={() => setSelectedMatch(null)}
      />
    );
  }

  if (selectedGame) {
    return (
      <div className="min-h-screen bg-[#062f2b] text-white">
        <header className="flex items-center bg-[#9a5a00] px-3 py-3">
          <button
            type="button"
            onClick={() => setSelectedGame(null)}
            className="mr-3 rounded border border-amber-300 px-3 py-1.5 text-xs font-black"
          >
            ‹ BACK
          </button>

          <h1 className="text-sm font-black text-amber-200">
            {selectedGame.name}
          </h1>
        </header>

        <div className="flex min-h-[70vh] flex-col items-center justify-center px-5 text-center">
          <img
            src={selectedGame.image}
            alt={selectedGame.name}
            className="mb-5 w-full max-w-[300px] rounded-lg shadow-2xl"
          />

          <h2 className="text-2xl font-black text-amber-300">
            {selectedGame.name}
          </h2>

          <div className="mt-4 rounded-full border border-amber-400 bg-black/30 px-6 py-2">
            <span className="text-sm font-black">
              🚀 COMING SOON
            </span>
          </div>

          <p className="mt-4 text-xs text-gray-300">
            Demo preview only
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#eeeeee] text-black">
      <style>
        {`
          .neon-scroll-area {
            width: 100%;
            height: 34px;
            overflow: hidden;
            position: relative;
            margin-top: 5px;
            margin-bottom: 3px;
            white-space: nowrap;
            display: flex;
            align-items: center;
          }

          .neon-scroll-track {
            position: absolute;
            display: flex;
            width: max-content;
            align-items: center;
            animation: teluguSportsScroll 13s linear infinite;
          }

          .neon-scroll-text {
            display: inline-block;
            padding-right: 70px;
            font-size: 16px;
            line-height: 34px;
            font-weight: 900;
            letter-spacing: 1px;

            background: linear-gradient(
              90deg,
              #ff1744,
              #ffea00,
              #00e5ff,
              #76ff03,
              #ff00ff,
              #ffffff,
              #ff1744
            );

            background-size: 300% 100%;
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;

            animation: neonColorMove 2s linear infinite;

            filter:
              drop-shadow(0 0 2px #ffffff)
              drop-shadow(0 0 4px #00e5ff);
          }

          @keyframes teluguSportsScroll {
            0% {
              transform: translateX(100vw);
            }

            100% {
              transform: translateX(-100%);
            }
          }

          @keyframes neonColorMove {
            0% {
              background-position: 0% 50%;
            }

            100% {
              background-position: 300% 50%;
            }
          }
        `}
      </style>

      {/* HEADER */}
      <header className="bg-[#9a5a00] px-3 pb-2 pt-3 text-white">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-lg font-black text-amber-300">
              🏠 TELUGU SPORTS
            </h1>

            <p className="ml-7 mt-0.5 text-[10px] font-black tracking-[0.15em]">
              BOOK • DEMO
            </p>
          </div>

          <div className="relative text-right">
            <p className="text-xs font-black text-amber-200">
              🪙 {demoBalance.toLocaleString('en-IN')} Demo Coins
            </p>

            <button
              type="button"
              onClick={() =>
                setShowCustomerMenu((value) => !value)
              }
              className="mt-1 rounded border border-amber-300/50 bg-[#7c4800] px-2 py-1.5 text-xs font-black"
            >
              {user?.name ||
                user?.identifier ||
                'Demo User'}{' '}
              ▼
            </button>

            {showCustomerMenu && (
              <div className="absolute right-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-md border bg-white text-left text-gray-900 shadow-2xl">
                {customerMenuItems.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleCustomerMenu(item)}
                    className="block w-full border-b px-3 py-2 text-left text-[11px] font-bold"
                  >
                    {item}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={onLogout}
                  className="block w-full bg-red-50 px-3 py-2 text-left text-[11px] font-black text-red-700"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        <NeonScrollingLine />

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setShowDeposit(true)}
            className="h-[44px] rounded-md border border-white bg-green-700 px-2 text-xs font-black text-white shadow"
          >
            💰 DEPOSIT
          </button>

          <button
            type="button"
            onClick={() => setShowWithdrawal(true)}
            className="h-[44px] rounded-md border border-white bg-red-700 px-2 text-xs font-black text-white shadow"
          >
            💸 WITHDRAWAL
          </button>
        </div>

        <p className="mt-2 text-center text-[9px] font-black text-amber-100">
          🏆 OUR EXCHANGE • DREAM BIG WIN BIG 🏆
        </p>
      </header>

      {/* MAIN NAV */}
      <nav
        className="w-full overflow-x-auto bg-[#945500] text-white"
        style={{
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-x',
        }}
      >
        <div className="flex w-max min-w-full">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setSelectedTab(tab)}
              className={`shrink-0 border-r border-amber-300/40 px-5 py-2.5 text-[10px] font-black ${
                selectedTab === tab
                  ? 'bg-[#c35b08]'
                  : ''
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </nav>

      {/* SPORTS */}
      <section
        className="w-full overflow-x-auto bg-[#075249]"
        style={{
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-x',
        }}
      >
        <div className="flex w-max">
          {sports.map((sport) => (
            <button
              key={sport.name}
              type="button"
              onClick={() => setSelectedSport(sport.name)}
              className={`w-[88px] shrink-0 px-1 py-1.5 text-center text-white ${
                selectedSport === sport.name
                  ? 'bg-[#043d38]'
                  : 'bg-[#0b6259]'
              }`}
            >
              <span className="block text-lg leading-none">
                {sport.icon}
              </span>

              <span className="mt-1 block whitespace-nowrap text-[7px] font-black leading-none">
                {sport.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* FILTER */}
      <section className="flex items-center justify-between gap-1 border-b bg-white px-2 py-2">
        <div className="flex gap-1">
          {['LIVE', 'VIRTUAL', 'PREMIUM'].map(
            (filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setMatchFilter(filter)}
                className={`rounded-full border px-2.5 py-1.5 text-[8px] font-black ${
                  matchFilter === filter
                    ? 'border-amber-600 bg-amber-50 text-amber-900'
                    : 'border-gray-300 bg-white text-gray-600'
                }`}
              >
                {filter}
              </button>
            )
          )}
        </div>

        <span className="text-[8px] font-black">
          DEMO MATCHES
        </span>
      </section>

      {/* MATCH LIST */}
      <section className="bg-[#eeeeee]">
        {matches.map((match) => (
          <article
            key={match.id}
            className="mb-1 border-b border-gray-300 bg-white px-2 py-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => setSelectedMatch(match)}
                  className="block w-full text-left"
                >
                  <h2 className="truncate border-b-2 border-teal-700 pb-1 text-[13px] font-black">
                    {match.teams}
                  </h2>
                </button>

                <p className="mt-1 text-[9px] font-bold text-red-600">
                  {match.date}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMatch(match)}
                className="shrink-0 rounded bg-[#0b766d] px-2 py-1.5 text-[8px] font-black text-white"
              >
                OPEN ›
              </button>
            </div>

            <div className="mt-2 grid grid-cols-3 text-center text-[9px] font-black">
              <span>1</span>
              <span>X</span>
              <span>2</span>
            </div>

            <div className="mt-1 grid grid-cols-6 gap-[2px]">
              {match.odds.map((odd, index) => (
                <button
                  key={`${match.id}-${index}`}
                  type="button"
                  onClick={() => setSelectedMatch(match)}
                  className={`h-[38px] text-[9px] font-black ${
                    index % 2 === 0
                      ? 'bg-sky-300'
                      : 'bg-pink-300'
                  }`}
                >
                  {odd}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSelectedMatch(match)}
              className="mt-1.5 h-[30px] w-full rounded border border-teal-700 bg-teal-50 text-[8px] font-black text-teal-900"
            >
              VIEW MATCH ODDS & FANCY MARKETS ›
            </button>
          </article>
        ))}
      </section>

      {/* FIRST 8 IMAGES */}
      <FeaturedGamesGrid onGameClick={setSelectedGame} />

      {/* NEW LAUNCH 12 REAL IMAGES */}
      <NewLaunchGrid onGameClick={setSelectedGame} />

      {/* THESE TWO STAY AS BEFORE */}
      <DemoGameGrid
        title="MY FAVOURITES"
        games={favourites}
      />

      <DemoGameGrid
        title="OUR PROVIDERS"
        games={providers}
      />

      <footer className="bg-white px-4 py-8 text-center">
        <p className="text-sm font-black text-green-700">
          📕 DEMO WEBSITE
        </p>

        <p className="mx-auto mt-2 max-w-xl text-[10px] leading-5 text-gray-500">
          For demonstration and informational purposes only.
          No real-money transactions.
        </p>
      </footer>
    </div>
  );
}
