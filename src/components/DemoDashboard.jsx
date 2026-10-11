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
  'CREED ROOMZ',
  'LIGHTNING',
  'INSTA LIVE',
  'EZUGI',
  'AVIATOR',
  'MINES',
  'BIKINI GAMES',
  'COLOR PREDICTION',
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

const gameBackgrounds = [
  'from-[#111827] via-[#312e81] to-[#7e22ce]',
  'from-[#172554] via-[#4c1d95] to-[#be185d]',
  'from-[#1e1b4b] via-[#581c87] to-[#4338ca]',
  'from-[#431407] via-[#9a3412] to-[#dc2626]',
];

function GameGrid({ title, games }) {
  return (
    <section className="mb-[2px] bg-white">
      {title && (
        <h2 className="bg-[#0b6259] px-3 py-2 text-[15px] font-black text-white">
          {title}
        </h2>
      )}

      <div className="grid grid-cols-4 gap-[2px] bg-white">
        {games.map((game, index) => (
          <button
            key={`${game}-${index}`}
            type="button"
            onClick={() => alert(`${game} — Demo Preview Only`)}
            className="min-w-0 overflow-hidden bg-[#10251f] text-white"
          >
            <div
              className={`relative flex h-[82px] items-center justify-center overflow-hidden bg-gradient-to-br ${
                gameBackgrounds[index % gameBackgrounds.length]
              } px-1`}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-white/5" />

              <span className="relative z-10 break-words px-[2px] text-center text-[8px] font-black uppercase leading-tight sm:text-xs">
                {game}
              </span>
            </div>

            <div className="flex h-[21px] items-center justify-center bg-gradient-to-b from-[#854d0e] to-[#064e3b] px-[2px]">
              <span className="line-clamp-2 break-words text-center text-[6px] font-black uppercase leading-tight sm:text-[10px]">
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
  const [showAccountStatement, setShowAccountStatement] = useState(false);
  const [showBetHistory, setShowBetHistory] = useState(false);
  const [showUnsettledBet, setShowUnsettledBet] = useState(false);
  const [showSetButtonValues, setShowSetButtonValues] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const [showCustomerMenu, setShowCustomerMenu] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);

  const [demoBalance] = useState(() => {
    try {
      const saved = localStorage.getItem('telugu_sports_demo_balance');

      if (saved === null) {
        localStorage.setItem('telugu_sports_demo_balance', '10000');
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

  return (
    <div className="min-h-screen bg-[#eeeeee] text-black">

      {/* ================= TOP HEADER ================= */}
      <header className="bg-[#9a5a00] px-2.5 pb-2 pt-2.5 text-white">

        <div className="flex items-start justify-between gap-2">

          <div className="min-w-0">
            <h1 className="whitespace-nowrap text-[16px] font-black leading-tight text-amber-300">
              🏠 TELUGU SPORTS
            </h1>

            <p className="ml-7 mt-[3px] text-[8px] font-black tracking-[0.16em]">
              BOOK • DEMO
            </p>
          </div>

          <div className="relative text-right">

            <p className="whitespace-nowrap text-[10px] font-black text-amber-200">
              🪙 {demoBalance.toLocaleString('en-IN')} Demo Coins
            </p>

            <button
              type="button"
              onClick={() =>
                setShowCustomerMenu((value) => !value)
              }
              className="mt-1 rounded border border-amber-300/50 bg-[#7c4800] px-2.5 py-1.5 text-[10px] font-black"
            >
              {user?.name ||
                user?.identifier ||
                'Demo User'}{' '}
              ▼
            </button>

            {showCustomerMenu && (
              <div className="absolute right-0 top-full z-50 mt-1 w-52 overflow-hidden border border-gray-300 bg-white text-left text-gray-900 shadow-2xl">

                {customerMenuItems.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() =>
                      handleCustomerMenu(item)
                    }
                    className="block w-full border-b border-gray-100 px-4 py-2.5 text-left text-[11px] font-bold hover:bg-gray-100"
                  >
                    {item}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={onLogout}
                  className="block w-full bg-red-50 px-4 py-2.5 text-left text-[11px] font-black text-red-700"
                >
                  Logout
                </button>

              </div>
            )}
          </div>
        </div>

        {/* DEPOSIT / WITHDRAWAL */}
        <div className="mt-2.5 grid grid-cols-2 gap-2">

          <button
            type="button"
            onClick={() => setShowDeposit(true)}
            className="h-[48px] rounded-md border border-white bg-green-700 px-2 text-[13px] font-black text-white shadow-sm"
          >
            💰 DEPOSIT
          </button>

          <button
            type="button"
            onClick={() => setShowWithdrawal(true)}
            className="h-[48px] rounded-md border border-white bg-red-700 px-2 text-[13px] font-black text-white shadow-sm"
          >
            💸 WITHDRAWAL
          </button>

        </div>

        <p className="mt-2 text-center text-[9px] font-black text-amber-100">
          🏆 OUR EXCHANGE • DREAM BIG WIN BIG 🏆
        </p>

      </header>

      {/* ================= MAIN TABS ================= */}
      <nav className="overflow-x-auto bg-[#945500] text-white">

        <div className="flex min-w-max">

          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setSelectedTab(tab)}
              className={`h-[42px] border-r border-amber-300/40 px-4 text-[10px] font-black ${
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

      {/* ================= SPORTS ================= */}
      <section className="overflow-x-auto bg-[#075249]">

        <div className="flex min-w-max">

          {sports.map((sport) => (
            <button
              key={sport.name}
              type="button"
              onClick={() =>
                setSelectedSport(sport.name)
              }
              className={`h-[82px] min-w-[105px] px-2 text-center text-white ${
                selectedSport === sport.name
                  ? 'bg-[#043d38]'
                  : 'bg-[#0b6259]'
              }`}
            >
              <span className="block text-[24px] leading-none">
                {sport.icon}
              </span>

              <span className="mt-2 block whitespace-nowrap text-[9px] font-black">
                {sport.name}
              </span>
            </button>
          ))}

        </div>
      </section>

      {/* ================= FILTER ================= */}
      <section className="flex h-[49px] items-center justify-between gap-2 border-b bg-white px-2">

        <div className="flex gap-1.5">

          {['LIVE', 'VIRTUAL', 'PREMIUM'].map(
            (filter) => (
              <button
                key={filter}
                type="button"
                onClick={() =>
                  setMatchFilter(filter)
                }
                className={`h-[30px] rounded-full border px-3 text-[8px] font-black ${
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

        <span className="whitespace-nowrap text-[8px] font-black">
          DEMO MATCHES
        </span>

      </section>

      {/* ================= MATCHES ================= */}
      <section>

        {matches.map((match) => (
          <article
            key={match.id}
            className="mb-[4px] border-b border-gray-300 bg-white px-2 py-2 shadow-sm"
          >

            <div className="flex items-start justify-between gap-2">

              <div className="min-w-0">

                <h2 className="inline-block border-b-2 border-teal-700 pb-[2px] text-[13px] font-black leading-tight">
                  {match.teams}
                </h2>

                <p className="mt-[3px] text-[9px] font-semibold text-red-600">
                  {match.date}
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedMatch(match)
                }
                className="shrink-0 rounded bg-[#0b766d] px-2.5 py-1.5 text-[9px] font-black text-white"
              >
                OPEN ›
              </button>

            </div>

            {/* 1 X 2 */}
            <div className="mt-2 grid grid-cols-3 text-center text-[9px] font-black">
              <span>1</span>
              <span>X</span>
              <span>2</span>
            </div>

            {/* ODDS */}
            <div className="mt-1 grid grid-cols-6 gap-[2px]">

              {match.odds.map((odd, index) => (
                <button
                  key={`${match.id}-${index}`}
                  type="button"
                  onClick={() =>
                    setSelectedMatch(match)
                  }
                  className={`h-[38px] text-[10px] font-black ${
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
              onClick={() =>
                setSelectedMatch(match)
              }
              className="mt-1.5 h-[31px] w-full rounded border border-teal-700 bg-teal-50 text-[9px] font-black text-teal-900"
            >
              VIEW MATCH ODDS & FANCY MARKETS ›
            </button>

          </article>
        ))}

      </section>

      {/* ================= FEATURED ================= */}
      <GameGrid
        title=""
        games={featuredGames}
      />

      {/* ================= NEW LAUNCH ================= */}
      <GameGrid
        title="NEW LAUNCH"
        games={newLaunch}
      />

      {/* ================= FAVOURITES ================= */}
      <GameGrid
        title="MY FAVOURITES"
        games={favourites}
      />

      {/* ================= PROVIDERS ================= */}
      <GameGrid
        title="OUR PROVIDERS"
        games={providers}
      />

      {/* ================= FOOTER ================= */}
      <footer className="bg-white px-4 py-8 text-center">

        <p className="text-[14px] font-black text-green-700">
          📕 DEMO WEBSITE
        </p>

        <p className="mx-auto mt-2 max-w-xl text-[10px] leading-4 text-gray-500">
          For demonstration and informational
          purposes only. No real-money
          transactions.
        </p>

      </footer>

    </div>
  );
}
