import React, {
  useEffect,
  useRef,
} from 'react';

/* =========================================
   GAME CARDS
========================================= */

const GAMES = [
  {
    id: 'aviator',
    name: 'AVIATOR',
    subtitle: 'DEMO GAME',
    image: '/games/aviator.png',
    border: 'border-red-500/50',
    glow:
      'from-red-600/35 via-rose-500/15 to-transparent',
    text: 'text-red-300',
  },
  {
    id: 'mines',
    name: 'MINES',
    subtitle: 'DEMO GAME',
    image: '/games/mines.png',
    border: 'border-cyan-400/50',
    glow:
      'from-cyan-500/35 via-blue-500/15 to-transparent',
    text: 'text-cyan-300',
  },
  {
    id: 'lightning',
    name: 'LIGHTNING',
    subtitle: 'LIVE GAMES',
    image: '/games/lightning.png',
    border: 'border-yellow-400/50',
    glow:
      'from-yellow-500/30 via-orange-500/15 to-transparent',
    text: 'text-yellow-300',
  },
  {
    id: 'ezugi',
    name: 'EZUGI',
    subtitle: 'LIVE GAMES',
    image: '/games/ezugi.png',
    border: 'border-violet-500/50',
    glow:
      'from-violet-600/35 via-fuchsia-500/15 to-transparent',
    text: 'text-violet-300',
  },
  {
    id: 'jili',
    name: 'JILI',
    subtitle: 'GAMING',
    image: '/games/jili.png',
    border: 'border-orange-400/50',
    glow:
      'from-orange-500/35 via-amber-500/15 to-transparent',
    text: 'text-orange-300',
  },
  {
    id: 'insta-live',
    name: 'INSTA LIVE',
    subtitle: 'LIVE GAMES',
    image: '/games/insta-live.png',
    border: 'border-pink-500/50',
    glow:
      'from-pink-600/35 via-purple-500/15 to-transparent',
    text: 'text-pink-300',
  },
  {
    id: 'color-prediction',
    name: 'COLOR',
    subtitle: 'DEMO GAME',
    image: '/games/color-prediction.png',
    border: 'border-emerald-400/50',
    glow:
      'from-emerald-500/35 via-cyan-500/15 to-transparent',
    text: 'text-emerald-300',
  },
  {
    id: 'baccarat',
    name: 'BACCARAT',
    subtitle: 'DEMO GAME',
    image: '/games/baccarat.png',
    border: 'border-blue-400/50',
    glow:
      'from-blue-600/35 via-cyan-500/15 to-transparent',
    text: 'text-blue-300',
  },
];

/* =========================================
   TODAY'S LIVE MATCHES
   DEMO / INFORMATIONAL DISPLAY
========================================= */

const LIVE_MATCHES = [
  {
    id: 'ind-aus',
    team1: 'IND',
    team2: 'AUS',
    flag1: '🇮🇳',
    flag2: '🇦🇺',
    format: 'ODI',
    status: 'LIVE',
    border: 'border-blue-500/50',
    glow:
      'from-blue-600/35 via-violet-500/15 to-transparent',
  },
  {
    id: 'pak-sl',
    team1: 'PAK',
    team2: 'SL',
    flag1: '🇵🇰',
    flag2: '🇱🇰',
    format: 'T20',
    status: 'LIVE',
    border: 'border-emerald-500/50',
    glow:
      'from-emerald-600/35 via-teal-500/15 to-transparent',
  },
  {
    id: 'eng-nz',
    team1: 'ENG',
    team2: 'NZ',
    flag1: '🏴',
    flag2: '🇳🇿',
    format: 'TEST',
    status: 'LIVE',
    border: 'border-fuchsia-500/50',
    glow:
      'from-fuchsia-600/35 via-purple-500/15 to-transparent',
  },
  {
    id: 'sa-ind',
    team1: 'SA',
    team2: 'IND',
    flag1: '🇿🇦',
    flag2: '🇮🇳',
    format: 'T20',
    status: '7:00 PM',
    border: 'border-amber-400/50',
    glow:
      'from-amber-500/35 via-orange-500/15 to-transparent',
  },
  {
    id: 'ban-afg',
    team1: 'BAN',
    team2: 'AFG',
    flag1: '🇧🇩',
    flag2: '🇦🇫',
    format: 'ODI',
    status: 'LIVE',
    border: 'border-red-500/50',
    glow:
      'from-red-600/35 via-rose-500/15 to-transparent',
  },
  {
    id: 'wi-ire',
    team1: 'WI',
    team2: 'IRE',
    flag1: '🏏',
    flag2: '🇮🇪',
    format: 'T20',
    status: 'LIVE',
    border: 'border-cyan-500/50',
    glow:
      'from-cyan-600/35 via-blue-500/15 to-transparent',
  },
];

/* =========================================
   MAIN COMPONENT
========================================= */

export default function HeroBanner({
  onRequireAuth,
}) {
  const gamesRef = useRef(null);
  const matchesRef = useRef(null);

  useAutoScroll(gamesRef, 0.48);
  useAutoScroll(matchesRef, 0.38);

  const handleProtectedClick = (
    item
  ) => {
    if (
      typeof onRequireAuth ===
      'function'
    ) {
      onRequireAuth(
        'login',
        item
      );
    }
  };

  return (
    <section className="relative overflow-hidden bg-[#080d16] px-3 pb-3 pt-3 text-white">

      {/* BACKGROUND LIGHTS */}

      <div className="pointer-events-none absolute -left-20 top-0 h-44 w-44 rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="pointer-events-none absolute -right-20 top-20 h-44 w-44 rounded-full bg-violet-600/10 blur-3xl" />

      <div className="relative mx-auto max-w-6xl space-y-3">

        {/* =====================================
            GAMES
        ===================================== */}

        <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0b111d]/95 shadow-[0_8px_30px_rgba(0,0,0,0.30)]">

          <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">

            <div className="flex items-center gap-2">

              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.95)]" />

              <h2 className="text-[11px] font-black uppercase tracking-[0.16em] text-white">
                Games
              </h2>

            </div>

            <span className="text-[8px] font-bold uppercase tracking-wider text-gray-500">
              Swipe • Explore
            </span>

          </div>

          <div
            ref={gamesRef}
            className="scrollbar-hide flex gap-2 overflow-x-auto px-2 py-2"
          >

            {[
              ...GAMES,
              ...GAMES,
            ].map(
              (
                game,
                index
              ) => (
                <GameCard
                  key={`${game.id}-${index}`}
                  game={game}
                  onClick={() =>
                    handleProtectedClick({
                      type: 'game',
                      ...game,
                    })
                  }
                />
              )
            )}

          </div>

        </div>

        {/* =====================================
            TODAY'S LIVE MATCHES
        ===================================== */}

        <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0b111d]/95 shadow-[0_8px_30px_rgba(0,0,0,0.30)]">

          <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">

            <div className="flex items-center gap-2">

              <span className="relative flex h-2 w-2">

                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-50" />

                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.95)]" />

              </span>

              <h2 className="text-[11px] font-black uppercase tracking-[0.13em] text-white">
                Today&apos;s Live Matches
              </h2>

            </div>

            <span className="text-[8px] font-black uppercase tracking-wider text-red-400">
              Live
            </span>

          </div>

          <div
            ref={matchesRef}
            className="scrollbar-hide flex gap-2 overflow-x-auto px-2 py-2"
          >

            {[
              ...LIVE_MATCHES,
              ...LIVE_MATCHES,
            ].map(
              (
                match,
                index
              ) => (
                <MatchCard
                  key={`${match.id}-${index}`}
                  match={match}
                  onClick={() =>
                    handleProtectedClick({
                      type: 'match',
                      ...match,
                    })
                  }
                />
              )
            )}

          </div>

          <div className="border-t border-white/[0.04] px-3 py-1.5 text-center">

            <p className="text-[7px] font-semibold uppercase tracking-[0.12em] text-gray-600">
              Demo match display • informational only
            </p>

          </div>

        </div>

      </div>

    </section>
  );
}

/* =========================================
   GAME CARD
========================================= */

function GameCard({
  game,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative h-[76px] w-[138px] flex-none overflow-hidden rounded-xl border ${game.border} bg-[#101725] text-left shadow-lg transition active:scale-[0.97]`}
    >

      {/* IMAGE */}

      <img
        src={game.image}
        alt={game.name}
        loading="lazy"
        draggable="false"
        className="absolute inset-0 h-full w-full object-cover opacity-75 transition duration-300 group-hover:scale-105 group-hover:opacity-90"
      />

      {/* DARK OVERLAY */}

      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/55 to-black/20" />

      {/* COLOUR GLOW */}

      <div
        className={`absolute inset-0 bg-gradient-to-br ${game.glow}`}
      />

      {/* NEON EDGES */}

      <div className="pointer-events-none absolute inset-x-3 top-0 h-px animate-pulse bg-gradient-to-r from-transparent via-white/70 to-transparent" />

      <div className="pointer-events-none absolute inset-x-2 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent" />

      {/* TEXT */}

      <div className="relative flex h-full flex-col justify-end px-3 pb-2">

        <p className="truncate text-[11px] font-black tracking-wide text-white drop-shadow-lg">
          {game.name}
        </p>

        <p
          className={`mt-0.5 truncate text-[7px] font-black uppercase tracking-wider ${game.text}`}
        >
          {game.subtitle}
        </p>

      </div>

    </button>
  );
}

/* =========================================
   MATCH CARD
========================================= */

function MatchCard({
  match,
  onClick,
}) {
  const isLive =
    match.status === 'LIVE';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative h-[70px] w-[164px] flex-none overflow-hidden rounded-xl border ${match.border} bg-[#101725] text-left shadow-lg transition active:scale-[0.97]`}
    >

      {/* DARK MULTI-COLOUR BACKGROUND */}

      <div
        className={`absolute inset-0 bg-gradient-to-br ${match.glow}`}
      />

      <div className="absolute inset-0 bg-black/10" />

      {/* TOP NEON */}

      <div className="pointer-events-none absolute inset-x-4 top-0 h-px animate-pulse bg-gradient-to-r from-transparent via-white/70 to-transparent" />

      {/* FORMAT / STATUS */}

      <div className="relative flex items-center justify-between px-2.5 pt-2">

        <span className="text-[7px] font-black uppercase tracking-wider text-gray-300">
          {match.format}
        </span>

        <span
          className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[6px] font-black ${
            isLive
              ? 'bg-red-500/20 text-red-300'
              : 'bg-amber-500/20 text-amber-300'
          }`}
        >

          {isLive && (
            <span className="h-1 w-1 animate-pulse rounded-full bg-red-400 shadow-[0_0_7px_rgba(248,113,113,1)]" />
          )}

          {match.status}

        </span>

      </div>

      {/* TEAMS */}

      <div className="relative mt-1.5 flex items-center justify-center gap-2">

        <div className="flex items-center gap-1">

          <span className="text-base leading-none">
            {match.flag1}
          </span>

          <span className="text-[10px] font-black text-white">
            {match.team1}
          </span>

        </div>

        <span className="rounded bg-black/30 px-1 py-0.5 text-[6px] font-black text-gray-400">
          VS
        </span>

        <div className="flex items-center gap-1">

          <span className="text-[10px] font-black text-white">
            {match.team2}
          </span>

          <span className="text-base leading-none">
            {match.flag2}
          </span>

        </div>

      </div>

      {/* BOTTOM NEON */}

      <div className="pointer-events-none absolute inset-x-3 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent" />

      {/* SIDE GLOW */}

      <div className="pointer-events-none absolute -right-7 -top-7 h-16 w-16 rounded-full bg-white/10 blur-2xl" />

    </button>
  );
}

/* =========================================
   AUTO SCROLL
========================================= */

function useAutoScroll(
  scrollRef,
  speed = 0.5
) {
  useEffect(() => {
    const element =
      scrollRef.current;

    if (!element) {
      return undefined;
    }

    let animationFrame = null;
    let paused = false;

    const scroll = () => {
      if (!paused) {
        element.scrollLeft +=
          speed;

        const halfWidth =
          element.scrollWidth /
          2;

        if (
          halfWidth > 0 &&
          element.scrollLeft >=
            halfWidth
        ) {
          element.scrollLeft -=
            halfWidth;
        }
      }

      animationFrame =
        requestAnimationFrame(
          scroll
        );
    };

    const pause = () => {
      paused = true;
    };

    const resume = () => {
      paused = false;
    };

    element.addEventListener(
      'touchstart',
      pause,
      {
        passive: true,
      }
    );

    element.addEventListener(
      'touchend',
      resume,
      {
        passive: true,
      }
    );

    element.addEventListener(
      'touchcancel',
      resume,
      {
        passive: true,
      }
    );

    element.addEventListener(
      'mouseenter',
      pause
    );

    element.addEventListener(
      'mouseleave',
      resume
    );

    animationFrame =
      requestAnimationFrame(
        scroll
      );

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(
          animationFrame
        );
      }

      element.removeEventListener(
        'touchstart',
        pause
      );

      element.removeEventListener(
        'touchend',
        resume
      );

      element.removeEventListener(
        'touchcancel',
        resume
      );

      element.removeEventListener(
        'mouseenter',
        pause
      );

      element.removeEventListener(
        'mouseleave',
        resume
      );
    };
  }, [
    scrollRef,
    speed,
  ]);
}
