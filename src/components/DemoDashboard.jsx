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
import { AnimatedSuperOverLobby } from "./AnimatedSuperOverPage";
import GameArtwork, { ACTIVE_GAMES } from "./GameArtwork";

const sports = [
  { icon: "🏏", name: "CRICKET" },
  { icon: "⚽", name: "FOOTBALL" },
  { icon: "🎾", name: "TENNIS" },
  { icon: "🏆", name: "FANTASY 11" },
  { icon: "🥊", name: "FIGHT EVENTS" },
  { icon: "🏇", name: "HORSE RACING" },
];

const matches = [
  {
    id: 1,
    teams: "India vs Australia",
    date: "Match",
    odds: ["1.85", "1.90", "3.20", "3.30", "2.10", "2.15"],
  },
  {
    id: 2,
    teams: "Afghanistan vs Bangladesh",
    date: "Match",
    odds: ["5.70", "5.80", "23.0", "24.0", "1.27", "1.28"],
  },
  {
    id: 3,
    teams: "South Africa vs England",
    date: "Match",
    odds: ["2.25", "2.30", "3.10", "3.20", "1.75", "1.80"],
  },
  {
    id: 4,
    teams: "Western Australia vs Queensland Bulls",
    date: "Match",
    odds: ["1.65", "1.70", "3.50", "3.60", "2.40", "2.45"],
  },
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
  {
    name: "LIGHTNING ROULETTE",
    image: "/games/lightning-roulette.png",
  },
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

      <div
        className={`grid gap-2 ${
          active ? "grid-cols-3" : "grid-cols-4"
        }`}
      >
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

export default function DemoDashboard({ user, onLogout }) {
  const [selectedSport, setSelectedSport] = useState("CRICKET");
  const [selectedTab, setSelectedTab] = useState("INPLAY");
  const [matchFilter, setMatchFilter] = useState("LIVE");
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [showAccountStatement, setShowAccountStatement] =
    useState(false);
  const [showBetHistory, setShowBetHistory] = useState(false);
  const [showUnsettledBet, setShowUnsettledBet] = useState(false);
  const [showSetButtonValues, setShowSetButtonValues] =
    useState(false);
  const [showChangePassword, setShowChangePassword] =
    useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showCustomerMenu, setShowCustomerMenu] = useState(false);
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
          throw new Error(
            data?.error || "Unable to load balance.",
          );
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
    window.addEventListener(
      "demo-balance-updated",
      loadDemoBalance,
    );

    return () => {
      active = false;

      window.removeEventListener("focus", loadDemoBalance);
      window.removeEventListener(
        "demo-balance-updated",
        loadDemoBalance,
      );
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

    if (item === "Account Statement") {
      setShowAccountStatement(true);
    }
    if (item === "Bet History") setShowBetHistory(true);
    if (item === "Unsettled Bet") setShowUnsettledBet(true);
    if (item === "Set Button Values") {
      setShowSetButtonValues(true);
    }
    if (item === "Change Password") {
      setShowChangePassword(true);
    }
    if (item === "Rule") setShowRules(true);
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

  if (showRules) {
    return (
      <RulesPage
        user={user}
        onBack={() => setShowRules(false)}
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

        .tsb-game
