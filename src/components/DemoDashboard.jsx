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
  {
    name: 'CREED ROOMZ',
    image: '/games/creed-roomz.png',
  },
  {
    name: 'LIGHTNING',
    image: '/games/lightning.png',
  },
  {
    name: 'INSTA LIVE',
    image: '/games/insta-live.png',
  },
  {
    name: 'EZUGI',
    image: '/games/ezugi.png',
  },
  {
    name: 'AVIATOR',
    image: '/games/aviator.png',
  },
  {
    name: 'MINES',
    image: '/games/mines.png',
  },
  {
    name: 'BIKINI GAMES',
    image: '/games/bikini-games.png',
  },
  {
    name: 'COLOR PREDICTION',
    image: '/games/color-prediction.png',
  },
];

const newLaunch = [
  'JILI',
  'GOLDEN KICK',
  'SNAKES & LADDERS',
  'PREDIX',
  'MONEY HEIST',
  'FOOTBALL X',
  'TWIST X',
  'INSTANT RUMMY',
  'JHANDI MUNDA',
  'BLACKJACK',
  'DEAL OR NO DEAL',
  'LOOT BOXES',
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

function FeaturedGamesGrid() {
  return (
    <section className="border-t-4 border-[#073c37] bg-[#062f2b]">
      <div className="grid grid-cols-4 gap-[2px]">
        {featuredGames.map((game) => (
          <button
            key={game.name}
            type="button"
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

      return Number.isFinite(value)
        ? value
        : 10000;
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
        onBack={() => setShowBetHistory(false)}
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

  if (selectedMatch) {
    return (
      <MatchDetailsPage
        match={selectedMatch}
        user={user}
        onBack={() => setSelectedMatch(null)}
      />
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#eeeeee] text-black">

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
                setShowCustomerMenu(
                  (value) => !value
                )
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

                {customerMenuItems.map(
                  (item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() =>
                        handleCustomerMenu(item)
                      }
                      className="block w-full border-b px-3 py-2 text-left text-[11px] font-bold"
                    >
                      {item}
                    </button>
                  )
                )}

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

        {/* COMPACT DEPOSIT / WITHDRAWAL */}
        <div className="mt-3 grid grid-cols-2 gap-2">

          <button
            type="button"
            onClick={() => setShowDeposit(true)}
            className="h-[46px] rounded-md border border-white bg-green-700 px-2 text-xs font-black text-white shadow"
          >
            💰 DEPOSIT
          </button>

          <button
            type="button"
            onClick={() =>
              setShowWithdrawal(true)
            }
            className="h-[46px] rounded-md border border-white bg-red-700 px-2 text-xs font-black text-white shadow"
          >
            💸 WITHDRAWAL
          </button>

        </div>

        <p className="mt-2 text-center text-[9px] font-black text-amber-100">
          🏆 OUR EXCHANGE • DREAM BIG WIN BIG 🏆
        </p>
      </header>

      {/* MAIN NAV - HORIZONTAL SCROLL */}
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
              onClick={() =>
                setSelectedTab(tab)
              }
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

      {/* SPORTS - COMPACT + HORIZONTAL SCROLL */}
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
              onClick={() =>
                setSelectedSport(sport.name)
              }
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
                onClick={() =>
                  setMatchFilter(filter)
                }
                className={`rounded-full border px-2.
