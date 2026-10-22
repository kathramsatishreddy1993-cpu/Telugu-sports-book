import React, { useEffect, useRef, useState } from "react";

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
import MyPromoCodePage from "./MyPromoCodePage";
import GameArtwork from "./GameArtwork";

const LOGO =
  "/games/file_0000000092bc82118617f615539c5f17.png";

const HEADER_BACKGROUND = "/games/tsb-header-bg.jpg";

const GAMES = [
  {
    id: "aviator",
    name: "AVIATOR",
    href: "/games/tsb-flight",
  },
  {
    id: "roulette",
    name: "ROULETTE",
    href: "/games/roulette",
  },
  {
    id: "super-over",
    name: "SUPER OVER",
    href: "/games/super-over",
  },
  {
    id: "color-prediction",
    name: "COLOR PREDICTION",
    href: "/games/color-prediction",
  },
  {
    id: "dragon-tiger",
    name: "DRAGON TIGER",
    href: "/games/dragon-tiger",
  },
  {
    id: "andar-bahar",
    name: "ANDAR BAHAR",
    href: "/games/andar-bahar",
  },
  {
    id: "lucky-seven",
    name: "LUCKY SEVEN",
    href: "/games/lucky-seven",
  },
  {
    id: "deal-or-no-deal",
    name: "DEAL OR NO DEAL",
    href: "/games/deal-or-no-deal",
  },
];

const sports = [
  { icon: "🏏", name: "CRICKET" },
  { icon: "⚽", name: "FOOTBALL" },
  { icon: "🎾", name: "TENNIS" },
  { icon: "🏆", name: "FANTASY 11" },
  { icon: "🥊", name: "FIGHT EVENTS" },
  { icon: "🏇", name: "HORSE RACING" },
];

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
  { name: "BACCARAT", image: "/games/baccarat.png" },
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

const MENU_ITEMS = [
  ["Home", "home"],
  ["Account Statement", "statement"],
  ["Bet History", "history"],
  ["Unsettled Bet", "unsettled"],
  ["Set Button Values", "buttons"],
  ["Change Password", "password"],
  ["My Promo Code", "promo"],
  ["Rule", "rules"],
];

function BrandLogo({ className = "" }) {
  return (
    <img
      src={LOGO}
      alt="Telugu Sports Book logo"
      className={`block h-full w-full object-contain ${className}`}
    />
  );
}

function GameImage({ game }) {
  const [failed, setFailed] = useState(false);

  if (game.id) {
    return <GameArtwork game={game.id} />;
  }

  if (failed || !game.image) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#e3f8f8] to-[#f1edf5] p-2 text-center text-xs font-black text-slate-900">
        {game.name}
      </div>
    );
  }

  return (
    <img
      src={game.image}
      alt={game.name}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-full w-full object-cover"
    />
  );
}

function GameSection({
  title,
  games,
  compact = false,
  onGameClick,
}) {
  return (
    <section className="border-t border-slate-200 bg-white px-3 py-3">
      <div className="mb-3 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-[#08b7bc] shadow-[0_0_10px_rgba(8,183,188,.3)]" />
        <h2 className="text-sm font-black uppercase tracking-wide text-slate-900">
          {title}
        </h2>
      </div>

      <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
        {games.map(game => (
          <button
            key={game.id || game.name}
            type="button"
            onClick={() => onGameClick(game)}
            className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-slate-900 shadow-lg transition active:scale-95"
          >
            <div
              className={`relative w-full overflow-hidden bg-black ${
                compact ? "aspect-[3/2]" : "aspect-square"
              }`}
            >
              <GameImage game={game} />

              {!game.href && (
                <span className="absolute right-1 top-1 rounded bg-black/80 px-1 py-0.5 text-[6px] font-bold text-amber-200">
                  SOON
                </span>
              )}
            </div>

            <div className="flex min-h-[26px] items-center justify-center px-1 py-1">
              <span className="text-center text-[7px] font-black uppercase leading-tight text-slate-900 sm:text-[10px]">
                {game.name}
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function TopGamesSlider({ onGameClick }) {
  const scrollerRef = useRef(null);
  const pauseUntilRef = useRef(0);
  const focusedRef = useRef(false);
  const suppressClickUntilRef = useRef(0);
  const gestureRef = useRef(null);

  const pause = () => {
    pauseUntilRef.current = performance.now() + 3000;
  };

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return undefined;

    const motion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    let frameId;
    let previousTime = 0;
    let position = scroller.scrollLeft;
    let direction = 1;

    const animate = now => {
      const elapsed = previousTime
        ? Math.min(now - previousTime, 50)
        : 0;

      previousTime = now;

      const paused =
        motion.matches ||
        document.hidden ||
        focusedRef.current ||
        gestureRef.current !== null ||
        now < pauseUntilRef.current;

      const maximum =
        scroller.scrollWidth - scroller.clientWidth;

      if (paused || maximum <= 0) {
        position = scroller.scrollLeft;
      } else {
        position += direction * elapsed * 0.025;

        if (position >= maximum) {
          position = maximum;
          direction = -1;
        } else if (position <= 0) {
          position = 0;
          direction = 1;
        }

        scroller.scrollLeft = position;
      }

      frameId = window.requestAnimationFrame(animate);
    };

    frameId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  const handlePointerDown = event => {
    if (!event.isPrimary || event.button !== 0) return;

    pause();
    suppressClickUntilRef.current = 0;

    gestureRef.current = {
      id: event.pointerId,
      type: event.pointerType,
      x: event.clientX,
      y: event.clientY,
      scrollLeft: event.currentTarget.scrollLeft,
      moved: false,
    };
  };

  const handlePointerMove = event => {
    const gesture = gestureRef.current;

    if (!gesture || gesture.id !== event.pointerId) {
      return;
    }

    const distanceX = event.clientX - gesture.x;
    const distanceY = event.clientY - gesture.y;

    if (
      Math.abs(distanceX) > 8 ||
      Math.abs(distanceY) > 8
    ) {
      gesture.moved = true;
    }

    if (
      gesture.type === "mouse" &&
      Math.abs(distanceX) > 8
    ) {
      event.preventDefault();

      if (
        !event.currentTarget.hasPointerCapture(event.pointerId)
      ) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }

      event.currentTarget.scrollLeft =
        gesture.scrollLeft - distanceX;
    }
  };

  const finishGesture = event => {
    const gesture = gestureRef.current;

    if (!gesture || gesture.id !== event.pointerId) {
      return;
    }

    if (gesture.moved) {
      suppressClickUntilRef.current =
        performance.now() + 800;
    }

    gestureRef.current = null;
    pause();

    if (
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <section className="border-b border-slate-200 bg-white py-3">
      <div
        ref={scrollerRef}
        role="region"
        aria-label="Games. Swipe left or right to browse."
        className="tsb-game-scroller tsb-scrollbar"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishGesture}
        onPointerCancel={finishGesture}
        onLostPointerCapture={finishGesture}
        onPointerLeave={event => {
          if (
            event.pointerType === "mouse" &&
            !event.currentTarget.hasPointerCapture(event.pointerId)
          ) {
            finishGesture(event);
          }
        }}
        onTouchEnd={pause}
        onWheel={pause}
        onScroll={() => {
          if (gestureRef.current) {
            gestureRef.current.moved = true;
            pause();
          }
        }}
        onFocusCapture={event => {
          if (event.target.matches(":focus-visible")) {
            focusedRef.current = true;
          }
          pause();
        }}
        onBlurCapture={event => {
          if (
            !event.currentTarget.contains(event.relatedTarget)
          ) {
            focusedRef.current = false;
            pause();
          }
        }}
        onClickCapture={event => {
          if (
            event.detail !== 0 &&
            performance.now() < suppressClickUntilRef.current
          ) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        onDragStart={event => event.preventDefault()}
      >
        <div className="flex w-max gap-2 px-3 pb-1">
          {GAMES.map(game => (
            <button
              key={game.id}
              type="button"
              aria-label={`Open ${game.name}`}
              onClick={() => onGameClick(game)}
              className="w-[82px] shrink-0 select-none rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#08b7bc]"
            >
              <div className="pointer-events-none h-[54px] overflow-hidden rounded-lg border border-slate-200 bg-black">
                <GameArtwork game={game.id} />
              </div>

              <span className="pointer-events-none mt-1 block truncate text-center text-[7px] font-black text-slate-900">
                {game.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function DemoDashboard({ user, onLogout }) {
  const [page, setPage] = useState("home");
  const [selectedSport, setSelectedSport] = useState("CRICKET");
  const [selectedTab, setSelectedTab] = useState("INPLAY");
  const [matchFilter, setMatchFilter] = useState("LIVE");
  const [showCustomerMenu, setShowCustomerMenu] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [demoBalance, setDemoBalance] = useState(0);
  const [balanceError, setBalanceError] = useState("");
  const [notice, setNotice] = useState("");

  const customerId =
    user?.id || user?.customerId || user?.customer_id;

  useEffect(() => {
    let active = true;
    let loading = false;
    const controller = new AbortController();

    const loadBalance = async () => {
      if (loading) return;

      if (!customerId) {
        if (active) {
          setDemoBalance(0);
          setBalanceError(
            "Customer ID is missing. Please login again.",
          );
        }
        return;
      }

      loading = true;

      try {
        const response = await fetch(
          `/api/customers/${encodeURIComponent(customerId)}/demo-balance`,
          {
            credentials: "same-origin",
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Unable to load balance.",
          );
        }

        if (active) {
          setDemoBalance(Number(data.balance) || 0);
          setBalanceError("");
        }
      } catch (requestError) {
        if (active && requestError.name !== "AbortError") {
          setBalanceError(requestError.message);
        }
      } finally {
        loading = false;
      }
    };

    loadBalance();

    window.addEventListener("focus", loadBalance);
    window.addEventListener("demo-balance-updated", loadBalance);

    return () => {
      active = false;
      controller.abort();
      window.removeEventListener("focus", loadBalance);
      window.removeEventListener(
        "demo-balance-updated",
        loadBalance,
      );
    };
  }, [customerId, page, selectedMatch]);

  const goHome = () => {
    setPage("home");
    setSelectedMatch(null);
    setShowCustomerMenu(false);
    setNotice("");
    window.scrollTo(0, 0);
  };

  const openPage = nextPage => {
    setShowCustomerMenu(false);
    setPage(nextPage);
    setNotice("");
    window.scrollTo(0, 0);
  };

  const handleGameClick = game => {
    if (game.href) {
      window.location.assign(game.href);
      return;
    }

    setNotice(`${game.name} is not available yet.`);
  };

  if (page === "deposit") {
    return <DepositPage user={user} onBack={goHome} />;
  }

  if (page === "withdrawal") {
    return <WithdrawalPage user={user} onBack={goHome} />;
  }

  if (page === "statement") {
    return <AccountStatementPage user={user} onBack={goHome} />;
  }

  if (page === "history") {
    return <BetHistoryPage user={user} onBack={goHome} />;
  }

  if (page === "unsettled") {
    return <UnsettledBetPage user={user} onBack={goHome} />;
  }

  if (page === "buttons") {
    return <SetButtonValuesPage user={user} onBack={goHome} />;
  }

  if (page === "password") {
    return (
      <ChangePasswordPage
        user={user}
        onBack={goHome}
        onComplete={goHome}
        onLogout={onLogout}
      />
    );
  }

  if (page === "promo") {
    return <MyPromoCodePage user={user} onBack={goHome} />;
  }

  if (page === "rules") {
    return <RulesPage user={user} onBack={goHome} />;
  }

  if (selectedMatch) {
    return (
      <MatchDetailsPage
        match={selectedMatch}
        user={user}
        onBack={() => {
          setSelectedMatch(null);
          window.scrollTo(0, 0);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-slate-900">
      <style>{`
        .tsb-game-scroller {
          width: 100%;
          overflow-x: auto;
          overflow-y: hidden;
          touch-action: pan-x pan-y;
          overscroll-behavior-x: contain;
          -webkit-overflow-scrolling: touch;
          scroll-behavior: auto;
          cursor: grab;
          user-select: none;
        }

        .tsb-game-scroller:active {
          cursor: grabbing;
        }

        .tsb-header {
          background-color: #061a25;
          background-image:
            linear-gradient(
              180deg,
              rgba(0, 10, 18, .18),
              rgba(0, 10, 18, .06)
            ),
            var(--tsb-header-image);
          background-position: center;
          background-size: cover;
          background-repeat: no-repeat;
        }

        .tsb-neon-track {
          display: flex;
          width: max-content;
          animation: tsbNeonSlide 20s linear infinite;
        }

        .tsb-neon-text {
          flex-shrink: 0;
          padding-right: 50px;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 1px;
          line-height: 30px;
          color: #28e1e5;
          text-shadow: 0 0 8px rgba(8,183,188,.55);
        }

        @keyframes tsbNeonSlide {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }

        .tsb-scrollbar {
          scrollbar-color: #08b7bc #f1f5f9;
        }

        .tsb-scrollbar::-webkit-scrollbar {
          width: 4px;
          height: 3px;
        }

        .tsb-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
        }

        .tsb-scrollbar::-webkit-scrollbar-thumb {
          background: #08b7bc;
          border-radius: 999px;
        }

        .tsb-wallet-label {
          display: flex;
          align-items: center;
          align-self: stretch;
          position: relative;
        }

        .tsb-wallet-label::after {
          content: "\\00a0";
          display: inline-block;
          width: 0;
          font-size: 8px;
          line-height: 2;
          visibility: hidden;
        }

        @media (prefers-reduced-motion: reduce) {
          .tsb-neon-track {
            animation: none;
          }
        }
      `}</style>

      <header
        className="tsb-header border-b border-slate-200 px-4 pb-3 pt-4 text-white"
        style={{
          "--tsb-header-image": `url("${HEADER_BACKGROUND}")`,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-amber-400/30 bg-black shadow-[0_0_20px_rgba(245,158,11,.12)]">
              <BrandLogo />
            </div>

            <div className="min-w-0">
              <h1 className="text-base font-black tracking-wide sm:text-lg">
                <span className="text-amber-400">TELUGU</span>{" "}
                SPORTS
              </h1>

              <p className="mt-1 text-[9px] font-black tracking-[0.24em] text-cyan-400">
                BOOK
              </p>
            </div>
          </div>

          <div className="relative shrink-0 text-right">
            <div className="rounded-xl border border-amber-400/30 bg-[#03121d]/90 px-3 py-2">
              <p className="text-[8px] font-bold uppercase text-gray-300">
                Demo Balance
              </p>

              <p className="mt-1 text-sm font-black text-amber-300">
                🪙 {demoBalance.toLocaleString("en-IN")}
              </p>
            </div>

            <button
              type="button"
              aria-expanded={showCustomerMenu}
              aria-controls="customer-menu"
              onClick={() =>
                setShowCustomerMenu(value => !value)
              }
              className="mt-2 max-w-[135px] truncate rounded-lg border border-cyan-400/50 bg-[#031b29]/90 px-3 py-2 text-[10px] font-black text-cyan-200"
            >
              {user?.name ||
                user?.loginId ||
                user?.identifier ||
                "User"}{" "}
              ▼
            </button>

            {showCustomerMenu && (
              <div
                id="customer-menu"
                className="absolute right-0 top-full z-50 mt-2 max-h-[70vh] w-56 overflow-y-auto rounded-xl border border-slate-200 bg-white text-left shadow-2xl"
              >
                {MENU_ITEMS.map(([label, target]) => (
                  <button
                    key={target}
                    type="button"
                    onClick={() =>
                      target === "home"
                        ? goHome()
                        : openPage(target)
                    }
                    className={`block w-full border-b border-slate-100 px-4 py-3 text-left text-[11px] font-bold hover:bg-slate-50 ${
                      target === "promo"
                        ? "text-violet-700"
                        : "text-slate-900"
                    }`}
                  >
                    {label}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={onLogout}
                  className="block w-full bg-red-50 px-4 py-3 text-left text-[11px] font-black text-red-700"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {balanceError && (
          <p
            role="alert"
            className="mt-2 text-[10px] text-amber-300"
          >
            {balanceError}
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => openPage("deposit")}
            className="rounded-2xl border border-[#08b7bc] bg-[#08b7bc] px-3 py-3 text-left shadow-[0_0_8px_rgba(8,183,188,.25)] active:scale-95"
          >
            <span className="flex items-center gap-2">
              <span className="text-2xl">💰</span>

              <span className="relative">
                <span
                  aria-hidden="true"
                  className="invisible block text-xs font-bold"
                >
                  &nbsp;
                </span>
                <span
                  aria-hidden="true"
                  className="invisible text-[8px]"
                >
                  &nbsp;
                </span>
                <strong className="absolute inset-0 flex items-center text-xs text-white">
                  DEPOSIT
                </strong>
              </span>

              <span className="ml-auto text-xl text-white">
                ›
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => openPage("withdrawal")}
            className="rounded-2xl border border-[#791b3e] bg-[#791b3e] px-3 py-3 text-left shadow-[0_0_8px_rgba(121,27,62,.25)] active:scale-95"
          >
            <span className="flex items-center gap-2">
              <span className="text-2xl">💵</span>

              <span className="relative">
                <span
                  aria-hidden="true"
                  className="invisible block text-xs font-bold"
                >
                  &nbsp;
                </span>
                <span
                  aria-hidden="true"
                  className="invisible text-[8px]"
                >
                  &nbsp;
                </span>
                <strong className="absolute inset-0 flex items-center whitespace-nowrap text-xs text-white">
                  WITHDRAWAL
                </strong>
              </span>

              <span className="ml-auto text-xl text-white">
                ›
              </span>
            </span>
          </button>
        </div>

        <div className="mt-3 overflow-hidden rounded-lg border border-black bg-black">
          <div className="tsb-neon-track">
            {[0, 1].map(index => (
              <span
                key={index}
                aria-hidden={index === 1}
                className="tsb-neon-text"
              >
                ✦ TELUGU SPORTS BOOK • PREMIUM SPORTS
                & ENTERTAINMENT ✦
              </span>
            ))}
          </div>
        </div>
      </header>

      <TopGamesSlider onGameClick={handleGameClick} />

      <div className="px-4 py-3">
        <p className="rounded-lg border border-[#08b7bc] bg-[#08b7bc] px-3 py-2 text-center text-[9px] font-black uppercase tracking-wider text-black">
          🏆 Our Exchange • Sports Hub
        </p>
      </div>

      <nav className="tsb-scrollbar overflow-x-auto border-b border-slate-200 bg-white">
        <div className="flex w-max min-w-full gap-2 px-3 py-2">
          {[
            "INPLAY",
            "SPORTS",
            "CASINO",
            "SPORTS BOOK",
            "PREDIX",
            "OTHERS",
          ].map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setSelectedTab(tab)}
              className={`shrink-0 rounded-lg border px-4 py-2 text-[9px] font-black text-white ${
                selectedTab === tab
                  ? "border-[#a72a55] bg-[#a12450] shadow-[0_0_10px_rgba(161,36,80,.2)]"
                  : "border-[#791b3e] bg-[#791b3e]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </nav>

      <section className="tsb-scrollbar overflow-x-auto border-b border-slate-200 bg-white">
        <div className="flex w-max gap-2 px-3 py-3">
          {sports.map(sport => (
            <button
              key={sport.name}
              type="button"
              onClick={() => setSelectedSport(sport.name)}
              className={`w-[90px] shrink-0 rounded-xl border bg-[#08b7bc] px-2 py-2 text-center text-black ${
                selectedSport === sport.name
                  ? "border-[#087f83] shadow-[inset_0_0_0_1px_#087f83]"
                  : "border-[#08b7bc]"
              }`}
            >
              <span className="block text-xl">
                {sport.icon}
              </span>
              <span className="mt-2 block whitespace-nowrap text-[7px] font-black">
                {sport.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="px-3 pb-2 pt-4">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_12px_#ef4444]" />
          <h2 className="text-lg font-black text-slate-900">
            LIVE SPORTS
          </h2>
        </div>

        <div className="mt-3 flex gap-2">
          {["LIVE", "VIRTUAL", "PREMIUM"].map(filter => (
            <button
              key={filter}
              type="button"
              onClick={() => setMatchFilter(filter)}
              className={`rounded-lg border px-4 py-2 text-[8px] font-black text-white ${
                matchFilter === filter
                  ? "border-[#ac2854] bg-[#ac2854]"
                  : "border-[#791b3e] bg-[#791b3e]"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </section>

      <section className="px-3 pb-4">
        <div className="tsb-scrollbar max-h-[420px] overflow-y-auto overscroll-contain rounded-xl">
          {selectedSport === "CRICKET" &&
          matchFilter === "LIVE" ? (
            <CricketMatchList
              onOpenMatch={match => {
                setSelectedMatch(match);
                window.scrollTo(0, 0);
              }}
            />
          ) : (
            <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-600">
              No {matchFilter.toLowerCase()}{" "}
              {selectedSport.toLowerCase()} fixtures
              are available in this view.
            </p>
          )}
        </div>
      </section>

      {notice && (
        <div
          role="status"
          className="mx-3 mb-3 flex items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900"
        >
          <span>{notice}</span>
          <button
            type="button"
            aria-label="Dismiss message"
            onClick={() => setNotice("")}
            className="px-2 text-lg"
          >
            ×
          </button>
        </div>
      )}

      <GameSection
        title="FEATURED GAMES"
        games={GAMES.slice(0, 4)}
        compact
        onGameClick={handleGameClick}
      />

      <GameSection
        title="CARD GAMES"
        games={GAMES.slice(4, 8)}
        compact
        onGameClick={handleGameClick}
      />

      <GameSection
        title="NEW LAUNCH"
        games={newLaunch}
        onGameClick={handleGameClick}
      />

      <GameSection
        title="MY FAVOURITES"
        games={favourites}
        onGameClick={handleGameClick}
      />

      <GameSection
        title="OUR PROVIDERS"
        games={providers}
        onGameClick={handleGameClick}
      />

      <footer className="border-t border-slate-200 bg-white px-5 py-8 text-center">
        <div className="mx-auto h-14 w-14 overflow-hidden rounded-xl border border-amber-400/20 bg-black">
          <BrandLogo />
        </div>

        <p className="mt-3 text-sm font-black text-slate-900">
          TELUGU SPORTS BOOK
        </p>

        <p className="mx-auto mt-3 max-w-xl text-[9px] leading-5 text-slate-500">
          Demonstration and informational purposes
          only. No real-money transactions are
          processed.
        </p>
      </footer>
    </div>
  );
}
