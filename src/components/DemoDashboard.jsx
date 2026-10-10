import React, { useState } from 'react';

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
const demoGameColors = [
  'from-purple-950 via-indigo-800 to-fuchsia-700',
  'from-blue-950 via-violet-800 to-pink-700',
  'from-rose-950 via-purple-800 to-indigo-700',
  'from-amber-950 via-orange-800 to-red-700',
];

function GameGrid({ title, games }) {
  return (
    <section className="mb-1">
      {title && (
        <h2 className="bg-teal-800 px-3 py-2 text-lg font-extrabold text-white">
          {title}
        </h2>
      )}

      <div className="grid grid-cols-4 gap-[3px] bg-white">
        {games.map((game, index) => (
          <button
            key={`${game}-${index}`}
            type="button"
            onClick={() => alert(`${game} — Demo Preview Only`)}
            className="min-w-0 overflow-hidden bg-[#10251f] text-white"
          >
            <div
              className={`flex aspect-[1.15/1] items-center justify-center bg-gradient-to-br ${
                demoGameColors[index % demoGameColors.length]
              } px-1 text-center`}
            >
              <span className="break-words text-[10px] font-black uppercase leading-tight drop-shadow-lg sm:text-sm">
                {game}
              </span>
            </div>

            <div className="flex min-h-7 items-center justify-center bg-gradient-to-b from-amber-800 to-teal-900 px-1 py-1 text-center">
              <span className="break-words text-[8px] font-bold uppercase leading-tight sm:text-xs">
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

  const tabs = [
    'INPLAY',
    'SPORTS',
    'CASINO',
    'SPORTS BOOK',
    'PREDIX',
    'OTHERS',
  ];

  return (
    <div className="min-h-screen bg-white text-black">

      {/* TOP HEADER */}
      <header className="bg-[#895000] px-3 py-3 text-white">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏠</span>

            <div>
              <h1 className="text-lg font-black italic tracking-tight text-amber-300">
                TELUGU SPORTS
              </h1>
              <p className="text-[10px] font-bold tracking-widest">
                BOOK • DEMO
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs font-bold text-amber-200">
              🪙 10,000 Demo Coins
            </p>

            <p className="max-w-32 truncate text-xs">
              {user?.name || 'Demo User'}
            </p>

            <button
              type="button"
              onClick={onLogout}
              className="mt-1 rounded bg-red-700 px-2 py-1 text-[10px] font-bold"
            >
              Logout
            </button>
          </div>
        </div>

        {/* WALLET BUTTONS */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => alert('Demo Deposit — Coming Soon')}
            className="rounded-md border border-white bg-green-700 py-3 text-sm font-extrabold text-white"
          >
            💰 DEPOSIT
          </button>

          <button
            type="button"
            onClick={() => alert('Demo Withdrawal — Coming Soon')}
            className="rounded-md border border-white bg-red-700 py-3 text-sm font-extrabold text-white"
          >
            💸 WITHDRAWAL
          </button>
        </div>

        <div className="mt-3 text-center text-xs font-bold text-amber-100">
          🏆 OUR EXCHANGE • DREAM BIG WIN BIG 🏆
        </div>
      </header>

      {/* MAIN NAVIGATION */}
      <nav className="flex overflow-x-auto bg-[#895000] text-white">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setSelectedTab(tab)}
            className={`shrink-0 border-r border-amber-200/50 px-4 py-3 text-xs font-extrabold ${
              selectedTab === tab
                ? 'bg-amber-700 text-white'
                : 'text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>

      {/* SPORTS CATEGORIES */}
      <div className="flex overflow-x-auto bg-teal-800 text-white">
        {sports.map((sport) => (
          <button
            key={sport.name}
            type="button"
            onClick={() => setSelectedSport(sport.name)}
            className={`flex min-w-[85px] shrink-0 flex-col items-center justify-center gap-1 px-2 py-3 ${
              selectedSport === sport.name
                ? 'bg-teal-950'
                : 'bg-teal-800'
            }`}
          >
            <span className="text-2xl">{sport.icon}</span>

            <span className="text-[10px] font-extrabold">
              {sport.name}
            </span>
          </button>
        ))}
      </div>

      {/* MATCHES AREA */}
      <section className="bg-white">

        <div className="flex items-center justify-between gap-2 border-b px-2 py-2">
          <div className="flex gap-1">
            {['LIVE', 'VIRTUAL', 'PREMIUM'].map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setMatchFilter(filter)}
                className={`rounded-full border px-2 py-2 text-[10px] font-semibold ${
                  matchFilter === filter
                    ? 'border-amber-700 bg-amber-100 text-amber-900'
                    : 'border-amber-700 text-amber-900'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <span className="text-[10px] font-bold">
            DEMO MATCHES
          </span>
        </div>

        {/*
          IMPORTANT:
          Only the white match list scrolls inside this box.
          Scrolling the games below scrolls the full page.
        */}
        <div
          className="h-[320px] overflow-y-auto overscroll-contain bg-white"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {matches.map((match) => (
            <div
              key={match.id}
              className="border-b-4 border-gray-200 px-2 py-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-extrabold text-black">
                    {match.teams}
                  </h3>

                  <p className="mt-1 text-xs text-red-600">
                    {match.date}
                  </p>
                </div>

                <span className="text-xs text-green-600">
                  ● DEMO
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 text-center text-xs font-bold">
                <span>1</span>
                <span>X</span>
                <span>2</span>
              </div>

              <div className="mt-2 grid grid-cols-6 gap-[2px]">
                {match.odds.map((odd, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() =>
                      alert(
                        `${match.teams}\nDemo Odd: ${odd}\nNo real betting`
                      )
                    }
                    className={`min-h-10 text-xs font-extrabold text-black ${
                      index % 2 === 0
                        ? 'bg-sky-300'
                        : 'bg-pink-300'
                    }`}
                  >
                    {odd}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* GAMES SECTION — NORMAL PAGE SCROLL */}
      <div className="bg-white">

        <GameGrid games={featuredGames} />

        <GameGrid
          title="NEW LAUNCH"
          games={newLaunch}
        />

        <GameGrid
          title="MY FAVOURITES"
          games={favourites}
        />

        <GameGrid
          title="OUR PROVIDERS"
          games={providers}
        />

      </div>

      {/* FOOTER */}
      <footer className="bg-white px-4 py-8 text-center">
        <p className="text-sm font-extrabold text-green-700">
          🛡️ DEMO WEBSITE
        </p>

        <p className="mt-2 text-xs text-gray-500">
          For demonstration and informational purposes only.
          No real-money transactions.
        </p>
      </footer>

    </div>
  );
}
