import React, { useEffect, useState } from "react";
import DepositPage from "./DepositPage";
import WithdrawalPage from "./WithdrawalPage";
import AccountStatementPage from "./AccountStatementPage";
import BetHistoryPage from "./BetHistoryPage";
import UnsettledBetPage from "./UnsettledBetPage";
import SetButtonValuesPage from "./SetButtonValuesPage";
import ChangePasswordPage from "./ChangePasswordPage";
import MatchDetailsPage from "./MatchDetailsPage";
import RulesPage from "./RulesPage";
import CricketMatchList from "./CricketMatchList";
import HeroBonusCard from "./HeroBonusCard";
import BonusPage from "./BonusPage";
import GameArtwork, { ACTIVE_GAMES } from "./GameArtwork";

const sports = [
  { icon: "🏏", name: "CRICKET" },
  { icon: "⚽", name: "FOOTBALL" },
  { icon: "🎾", name: "TENNIS" },
  { icon: "🏆", name: "FANTASY 11" },
  { icon: "🥊", name: "FIGHT EVENTS" },
  { icon: "🏇", name: "HORSE RACING" },
];

const featuredGames = ACTIVE_GAMES.slice(0, 3);
const secondGames = ACTIVE_GAMES.slice(3, 6);
const topScrollingGames = ACTIVE_GAMES;
const roulette = ACTIVE_GAMES[1];

const newLaunch = [
  { name: "JILI", image: "/games/jili.png" },
  { name: "GOLDEN KICK", image: "/games/golden-kick.png" },
  { name: "SNAKES & LADDERS", image: "/games/snakes-ladders.png" },
  { name: "PREDIX", image: "/games/predix.png" },
  { name: "MONEY HEIST", image: "/games/money-heist.png" },
  { name: "FOOTBALL X", image: "/games/football-x.png" },
  { name: "TWIST X", image: "/games/twist-x.png" },
  { name: "INSTANT RUMMY", image: "/games/instant-rummy.png" },
  { name: "JHANDI MUNDA", image: "/games/jhandi-munda.png" },
  { name: "BLACKJACK", image: "/games/blackjack.png" },
  { name: "DEAL OR NO DEAL", image: "/games/deal-or-no-deal.png" },
  { name: "LOOT BOXES", image: "/games/loot-boxes.png" },
];

const favourites = [
  { name: "AVIATOR X", image: "/games/aviator-x.png" },
  { name: "FANTASY 11", image: "/games/fantasy-11.png" },
  { name: "CRICKET BATTLE", image: "/games/cricket-battle.png" },
  { name: "LIGHTNING ROULETTE", image: "/games/lightning-roulette.png" },
  { name: "DRAGON TIGER", image: "/games/dragon-tiger.png" },
  { name: "BACCARAT", image: "/games/baccarat.png" },
  roulette,
  { name: "TEEN PATTI", image: "/games/teen-patti.png" },
];

const providers = [
  { name: "MAC88", image: "/games/mac88.png" },
  { name: "EZUGI", image: "/games/ezugi-provider.png" },
  { name: "SMARTSOFT", image: "/games/smartsoft.png" },
  { name: "SPRIBE", image: "/games/spribe.png" },
  { name: "EVOLUTION", image: "/games/evolution.png" },
  { name: "JILI", image: "/games/jili-provider.png" },
  { name: "TURBO GAMES", image: "/games/turbo-games.png" },
  { name: "GAMZIX", image: "/games/gamzix.png" },
  { name: "KING MIDAS", image: "/games/king-midas.png" },
];

function NeonScrollingLine() {
  return (
    <div className="tsb-neon-area">
      <div className="tsb-neon-track">
        <span className="tsb-neon-text">
          ✦ TELUGU SPORTS BOOK • PREMIUM SPORTS & ENTERTAINMENT ✦
        </span>
        <span className="tsb-neon-text">
          ✦ TELUGU SPORTS BOOK • PREMIUM SPORTS & ENTERTAINMENT ✦
        </span>
      </div>
    </div>
  );
}

function TopGamesSlider({ onGameClick }) {
  return (
    <section className="overflow-hidden border-b border-white/10 bg-[#080d16] py-3">
      <div className="tsb-game-slider">
        <div className="tsb-game-slider-track">
          {[...topScrollingGames, ...topScrollingGames].map(
            (game, index) => (
              <button
                key={`${game.name}-${index}`}
                type="button"
                aria-label={game.name}
                onClick={() => onGameClick(game)}
                className="tsb-top-game-card"
              >
                <div className="h-[74px] w-[112px] overflow-hidden rounded-xl border border-cyan-400/20 bg-[#111827] shadow-[0_0_15px_rgba(34,211,238,.08)]">
                  <GameArtwork game={game.id} />
                </div>
                <span className="mt-1 block max-w-[112px] truncate text-center text-[7px] font-black uppercase tracking-wide text-gray-300">
                  {game.name}
                </span>
              </button>
            ),
          )}
        </div>
      </div>
    </section>
  );
}

function GameSection({
  title,
  games,
  onGameClick,
  active = false,
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

      <div className={`grid gap-2 ${active ? "grid-cols-3" : "grid-cols-4"}`}>
        {games.map((game) => (
          <button
            key={game.name}
            type="button"
            aria-label={game.name}
            onClick={() => onGameClick(game)}
            className="group min-w-0 overflow-hidden rounded-xl border border-white/10 bg-[#111827] text-white shadow-lg transition active:scale-[0.97]"
          >
            <div className="relative aspect-square w-full overflow-hidden bg-black">
              {game.id ? (
                <GameArtwork game={game.id} />
              ) : (
                <img
                  src={game.image}
                  alt={game.name}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
              )}
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
  onOpenBonus,
}) {
  const [selectedSport, setSelectedSport] = useState("CRICKET");
  const [selectedTab, setSelectedTab] = useState("INPLAY");
  const [matchFilter, setMatchFilter] = useState("LIVE");

  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [showAccountStatement, setShowAccountStatement] = useState(false);
  const [showBetHistory, setShowBetHistory] = useState(false);
  const [showUnsettledBet, setShowUnsettledBet] = useState(false);
  const [showSetButtonValues, setShowSetButtonValues] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showCustomerMenu, setShowCustomerMenu] = useState(false);
  const [selectedBonus, setSelectedBonus] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);

  const [demoBalance, setDemoBalance] = useState(0);
  const [balanceError, setBalanceError] = useState("");

  useEffect(() => {
    let active = true;

    const loadDemoBalance = async () => {
      try {
        const customerId =
          user?.id || user?.customerId || user?.customer_id;

        if (!customerId) {
          if (active) {
            setDemoBalance(0);
            setBalanceError(
              "Customer ID is missing. Please login again.",
            );
          }
          return;
        }

        const response = await fetch(
          `/api/customers/${customerId}/demo-balance`,
          { cache: "no-store" },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Unable to load balance.");
        }

        if (active) {
          setDemoBalance(Number(data.balance) || 0);
          setBalanceError("");
        }
      } catch (error) {
        console.error("Balance Load Error:", error);
        if (active) setBalanceError(error.message);
      }
    };

    loadDemoBalance();
    window.addEventListener("focus", loadDemoBalance);
    window.addEventListener("demo-balance-updated", loadDemoBalance);

    return () => {
      active = false;
      window.removeEventListener("focus", loadDemoBalance);
      window.removeEventListener("demo-balance-updated", loadDemoBalance);
    };
  }, [
    user?.id,
    user?.customerId,
    user?.customer_id,
    selectedMatch,
    showDeposit,
    showWithdrawal,
  ]);

  const tabs = [
    "INPLAY",
    "SPORTS",
    "CASINO",
    "SPORTS BOOK",
    "PREDIX",
    "OTHERS",
  ];

  const customerMenuItems = [
    "Home",
    "Account Statement",
    "Bet History",
    "Unsettled Bet",
    "Set Button Values",
    "Change Password",
    "Rule",
  ];

  const handleCustomerMenu = (item) => {
    setShowCustomerMenu(false);

    if (item === "Home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (item === "Account Statement") setShowAccountStatement(true);
    if (item === "Bet History") setShowBetHistory(true);
    if (item === "Unsettled Bet") setShowUnsettledBet(true);
    if (item === "Set Button Values") setShowSetButtonValues(true);
    if (item === "Change Password") setShowChangePassword(true);
    if (item === "Rule") setShowRules(true);
  };

  const handleBonusClick = (bonusType) => {
    setShowCustomerMenu(false);

    if (typeof onOpenBonus === "function") {
      onOpenBonus(bonusType);
      return;
    }

    setSelectedBonus(bonusType);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    if (!selectedGame) return;

    const timer = setTimeout(() => {
      setSelectedGame(null);
      setSelectedTab("INPLAY");
      window.scrollTo({ top: 0, behavior: "auto" });
    }, 650);

    return () => clearTimeout(timer);
  }, [selectedGame]);

  const handleGameClick = (game) => {
    const active = ACTIVE_GAMES.find(
      (item) => item.id === game.id || item.name === game.name,
    );

    if (active) {
      window.location.assign(active.href);
      return;
    }

    setSelectedGame(game);
  };

  if (showDeposit) {
    return <DepositPage user={user} onBack={() => setShowDeposit(false)} />;
  }

  if (showWithdrawal) {
    return <WithdrawalPage user={user} onBack={() => setShowWithdrawal(false)} />;
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
    return <BetHistoryPage user={user} onBack={() => setShowBetHistory(false)} />;
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

  if (showRules) {
    return <RulesPage user={user} onBack={() => setShowRules(false)} />;
  }

  if (selectedBonus) {
    return (
      <BonusPage
        bonusType={selectedBonus}
        onBack={() => {
          setSelectedBonus(null);
          window.scrollTo(0, 0);
        }}
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
      <div
        aria-label="Returning to home"
        className="fixed inset-0 z-[100] bg-black"
      />
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#080d16] text-white">
      <style>{`
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
          0% { transform: translateX(100vw); }
          100% { transform: translateX(-100%); }
        }
        @keyframes tsbColor {
          0% { background-position: 0% 50%; }
          100% { background-position: 300% 50%; }
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
        .tsb-game-slider {
          width: 100%;
          overflow: hidden;
        }
        .tsb-game-slider-track {
          display: flex;
          width: max-content;
          gap: 10px;
          padding-left: 10px;
          animation: tsbGameSlide 30s linear infinite;
        }
        .tsb-game-slider-track:active {
          animation-play-state: paused;
        }
        .tsb-top-game-card {
          width: 112px;
          flex-shrink: 0;
        }
        @keyframes tsbGameSlide {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>

      <header className="border-b border-[#1f2937] bg-gradient-to-br from-[#0c1727] via-[#0b121e] to-[#111827] px-4 pb-3 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-amber-400/30 bg-black shadow-[0_0_20px_rgba(245,158,11,.12)]">
                <img
                  src="/games/file_0000000092bc82118617f615539c5f17.png"
                  alt="Telugu Sports Book"
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-wide">
                  <span className="text-amber-400">TELUGU</span>{" "}
                  <span className="text-white">SPORTS</span>
                </h1>
                <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.24em] text-cyan-400">
                  BOOK
                </p>
              </div>
            </div>
          </div>

          <div className="relative shrink-0 text-right">
            <div className="rounded-xl border border-amber-400/20 bg-black/20 px-3 py-2">
              <p className="text-[8px] font-bold uppercase tracking-wider text-gray-500">
                Balance
              </p>
              <p className="mt-0.5 text-sm font-black text-amber-300">
                🪙 {demoBalance.toLocaleString("en-IN")}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowCustomerMenu((value) => !value)}
              className="mt-2 max-w-[135px] truncate rounded-lg border border-cyan-400/30 bg-[#111827] px-3 py-2 text-[10px] font-black text-cyan-200"
            >
              {user?.name || user?.identifier || "User"} ▼
            </button>

            {showCustomerMenu && (
              <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-white/10 bg-[#111827] text-left text-gray-100 shadow-2xl">
                {customerMenuItems.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleCustomerMenu(item)}
                    className="block w-full border-b border-white/5 px-4 py-3 text-left text-[11px] font-bold transition hover:bg-white/5"
                  >
                    {item}
                  </button>
                ))}
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

        {balanceError && (
          <p role="alert" className="mt-2 text-[10px] text-amber-300">
            {balanceError}
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setShowDeposit(true)}
            className="group relative overflow-hidden rounded-2xl border border-emerald-400/50 bg-gradient-to-br from-[#08251f] via-[#0b1f1c] to-[#071713] px-3 py-3 text-left shadow-[0_0_8px_rgba(52,211,153,.35),inset_0_0_18px_rgba(52,211,153,.08)] transition active:scale-[0.97]"
          >
            <div className="absolute -left-5 top-1/2 h-16 w-16 -translate-y-1/2 rounded-full bg-emerald-400/10 blur-xl" />
            <div className="relative flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-300/30 bg-emerald-400/10 text-xl shadow-[0_0_14px_rgba(52,211,153,.25)]">
                  💰
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-black uppercase tracking-[0.08em] text-emerald-300">
                    DEPOSIT
                  </p>
                  <p className="mt-0.5 text-[8px] font-black uppercase tracking-[0.18em] text-emerald-100/60">
                    CREDITS
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-xl font-black text-emerald-300">
                ›
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setShowWithdrawal(true)}
            className="group relative overflow-hidden rounded-2xl border border-orange-400/50 bg-gradient-to-br from-[#2a1809] via-[#20150c] to-[#171008] px-3 py-3 text-left shadow-[0_0_8px_rgba(251,146,60,.35),inset_0_0_18px_rgba(251,146,60,.08)] transition active:scale-[0.97]"
          >
            <div className="absolute -left-5 top-1/2 h-16 w-16 -translate-y-1/2 rounded-full bg-orange-400/10 blur-xl" />
            <div className="relative flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-300/30 bg-orange-400/10 text-xl shadow-[0_0_14px_rgba(251,146,60,.25)]">
                  💵
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-black uppercase tracking-[0.06em] text-orange-300">
                    WITHDRAWAL
                  </p>
                  <p className="mt-0.5 text-[8px] font-black uppercase tracking-[0.16em] text-orange-100/60">
                    REQUEST
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-xl font-black text-orange-300">
                ›
              </span>
            </div>
          </button>
        </div>

        <div className="mt-3 overflow-hidden rounded-lg border border-cyan-500/10 bg-black/20">
          <NeonScrollingLine />
        </div>
      </header>

      <section className="bg-[#080d16] px-3 py-4">
        <div className="mx-auto max-w-xl">
          <HeroBonusCard onOpenBonus={handleBonusClick} />
        </div>
      </section>

      <TopGamesSlider onGameClick={handleGameClick} />

      <div className="bg-[#080d16] px-4 pb-3">
        <div className="flex items-center justify-center gap-2 rounded-lg border border-amber-400/10 bg-amber-400/5 px-3 py-2">
          <span className="text-xs">🏆</span>
          <p className="text-[9px] font-black uppercase tracking-wider text-amber-300">
            Our Exchange • Sports Hub
          </p>
        </div>
      </div>

      <nav
        className="tsb-scrollbar w-full overflow-x-auto border-b border-white/10 bg-[#0d1523]"
        style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x" }}
      >
        <div className="flex w-max min-w-full px-2 py-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setSelectedTab(tab)}
              className={`mr-2 shrink-0 rounded-lg border px-4 py-2 text-[9px] font-black transition ${
                selectedTab === tab
                  ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-300"
                  : "border-white/10 bg-[#111827] text-gray-400"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </nav>

      <section
        className="tsb-scrollbar w-full overflow-x-auto border-b border-white/10 bg-[#0a101b]"
        style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x" }}
      >
        <div className="flex w-max gap-2 px-3 py-3">
          {sports.map((sport) => (
            <button
              key={sport.name}
              type="button"
              onClick={() => setSelectedSport(sport.name)}
              className={`w-[90px] shrink-0 rounded-xl border px-2 py-2 text-center transition ${
                selectedSport === sport.name
                  ? "border-amber-400/50 bg-gradient-to-br from-amber-400/20 to-orange-500/10 text-white"
                  : "border-white/10 bg-[#111827] text-gray-400"
              }`}
            >
              <span className="block text-xl leading-none">{sport.icon}</span>
              <span className="mt-2 block whitespace-nowrap text-[7px] font-black leading-none">
                {sport.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="bg-[#080d16] px-3 pb-2 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500 shadow-[0_0_12px_#ef4444]" />
            <h2 className="text-lg font-black tracking-wide text-white">
              LIVE SPORTS
            </h2>
          </div>
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[8px] font-black text-emerald-400">
            ● CONNECTED
          </span>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#080d16] px-3 py-3">
        <div className="flex gap-2">
          {["LIVE", "VIRTUAL", "PREMIUM"].map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setMatchFilter(filter)}
              className={`rounded-lg border px-4 py-2 text-[8px] font-black ${
                matchFilter === filter
                  ? "border-red-400/40 bg-red-500/15 text-red-300"
                  : "border-white/10 bg-[#111827] text-gray-500"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </section>

      <section className="bg-[#080d16] px-3 pb-4">
        {selectedSport === "CRICKET" && (
          <CricketMatchList onOpenMatch={setSelectedMatch} />
        )}
      </section>

      <GameSection
        title="FEATURED GAMES"
        active
        games={featuredGames}
        onGameClick={handleGameClick}
      />
      <GameSection
        title="CARD GAMES"
        active
        games={secondGames}
        onGameClick={handleGameClick}
      />
      <GameSection
        title="NEW LAUNCH"
        games={newLaunch}
        onGameClick={handleGameClick}
      />
      <GameSection
        title="MY FAVOURITES"
        games={favourites.filter(
          (game) => !ACTIVE_GAMES.some((item) => item.name === game.name),
        )}
        onGameClick={handleGameClick}
      />
      <GameSection
        title="OUR PROVIDERS"
        games={providers}
        onGameClick={handleGameClick}
      />

      <footer className="border-t border-white/10 bg-[#050911] px-5 py-8 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-cyan-400/20 bg-black">
          <img
            src="/games/file_0000000092bc82118617f615539c5f17.png"
            alt="Telugu Sports Book"
            className="h-full w-full object-contain"
          />
        </div>
        <p className="mt-3 text-sm font-black text-white">
          TELUGU SPORTS BOOK
        </p>
        <p className="mx-auto mt-3 max-w-xl text-[9px] leading-5 text-gray-600">
          Demonstration and informational purposes only.
          No real-money transactions are processed.
        </p>
      </footer>
    </div>
  );
}
