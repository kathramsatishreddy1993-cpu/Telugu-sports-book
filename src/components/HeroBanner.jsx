import React, {
  useEffect,
  useRef,
} from 'react';

/* =========================================
   GAME CARDS
========================================= */

const GAMES = [
  {
    id: 'ezugi',
    name: 'EZUGI',
    subtitle: 'LIVE GAMES',
    icon: '♠',
    glow:
      'from-violet-600/35 via-fuchsia-500/15 to-transparent',
    border:
      'border-violet-500/40',
    text:
      'text-violet-300',
  },
  {
    id: 'jili',
    name: 'JILI',
    subtitle: 'GAMING',
    icon: '◆',
    glow:
      'from-orange-500/35 via-amber-500/15 to-transparent',
    border:
      'border-orange-400/40',
    text:
      'text-orange-300',
  },
  {
    id: 'aviator',
    name: 'AVIATOR',
    subtitle: 'DEMO GAME',
    icon: '✈',
    glow:
      'from-red-600/35 via-rose-500/15 to-transparent',
    border:
      'border-red-500/40',
    text:
      'text-red-300',
  },
  {
    id: 'mines',
    name: 'MINES',
    subtitle: 'DEMO GAME',
    icon: '💎',
    glow:
      'from-cyan-500/35 via-blue-500/15 to-transparent',
    border:
      'border-cyan-400/40',
    text:
      'text-cyan-300',
  },
  {
    id: 'lightning',
    name: 'LIGHTNING',
    subtitle: 'DEMO GAME',
    icon: '⚡',
    glow:
      'from-yellow-500/35 via-orange-500/15 to-transparent',
    border:
      'border-yellow-400/40',
    text:
      'text-yellow-300',
  },
  {
    id: 'insta-live',
    name: 'INSTA LIVE',
    subtitle: 'LIVE GAMES',
    icon: '●',
    glow:
      'from-pink-600/35 via-purple-500/15 to-transparent',
    border:
      'border-pink-500/40',
    text:
      'text-pink-300',
  },
  {
    id: 'color',
    name: 'COLOR',
    subtitle: 'DEMO GAME',
    icon: '◉',
    glow:
      'from-emerald-500/35 via-cyan-500/15 to-transparent',
    border:
      'border-emerald-400/40',
    text:
      'text-emerald-300',
  },
];

/* =========================================
   LIVE MATCH CARDS

   Demo display data for homepage UI.
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
    glow:
      'from-blue-600/35 via-violet-500/15 to-transparent',
    border:
      'border-blue-500/40',
  },
  {
    id: 'pak-sl',
    team1: 'PAK',
    team2: 'SL',
    flag1: '🇵🇰',
    flag2: '🇱🇰',
    format: 'T20',
    status: 'LIVE',
    glow:
      'from-emerald-600/35 via-teal-500/15 to-transparent',
    border:
      'border-emerald-500/40',
  },
  {
    id: 'eng-nz',
    team1: 'ENG',
    team2: 'NZ',
    flag1: '🏴',
    flag2: '🇳🇿',
    format: 'TEST',
    status: 'LIVE',
    glow:
      'from-fuchsia-600/35 via-purple-500/15 to-transparent',
    border:
      'border-fuchsia-500/40',
  },
  {
    id: 'sa-ind',
    team1: 'SA',
    team2: 'IND',
    flag1: '🇿🇦',
    flag2: '🇮🇳',
    format: 'T20',
    status: 'LIVE',
    glow:
      'from-amber-500/35 via-orange-500/15 to-transparent',
    border:
      'border-amber-400/40',
  },
  {
    id: 'ban-afg',
    team1: 'BAN',
    team2: 'AFG',
    flag1: '🇧🇩',
    flag2: '🇦🇫',
    format: 'ODI',
    status: 'LIVE',
    glow:
      'from-red-600/35 via-rose-500/15 to-transparent',
    border:
      'border-red-500/40',
  },
  {
    id: 'wi-ire',
    team1: 'WI',
    team2: 'IRE',
    flag1: '🏏',
    flag2: '🇮🇪',
    format: 'T20',
    status: 'LIVE',
    glow:
      'from-cyan-600/35 via-blue-500/15 to-transparent',
    border:
      'border-cyan-500/40',
  },
];

/* =========================================
   MAIN COMPONENT
========================================= */

export default function HeroBanner({
  onRequireAuth,
}) {
  const gamesRef =
    useRef(null);

  const matchesRef =
    useRef(null);

  /* =========================================
     AUTO SCROLL
  ========================================= */

  useAutoScroll(
    gamesRef,
    0.55
  );

  useAutoScroll(
    matchesRef,
    0.45
  );

  /* =========================================
     CLICK
  ========================================= */

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

      {/* BACKGROUND GLOW */}

      <div className="pointer-events-none absolute -left-24 top-0 h-52 w-52 rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="pointer-events-none absolute right-0 top-12 h-52 w-52 rounded-full bg-violet-600/10 blur-3xl" />

      <div className="pointer-events-none absolute bottom-0 left-1/2 h-40 w-72 -translate-x-1/2 rounded-full bg-amber-500/5 blur-3xl" />

      <div className="relative mx-auto max-w-6xl space-y-3">

        {/* =====================================
            GAMES
        ===================================== */}

        <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#0b111d]/95 shadow-[0_8px_30px_rgba(0,0,0,0.28)]">

          {/* TITLE */}

          <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">

            <div className="flex items-center gap-2">

              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />

              <h2 className="text-[10px] font-black uppercase tracking-[0.16em] text-white">
                Games
              </h2>

            </div>

            <span className="text-[8px] font-bold uppercase tracking-wider text-gray-500">
              Swipe • Explore
            </span>

          </div>

          {/* SCROLLER */}

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
                    handleProtectedClick(
                      {
                        type:
                          'game',
                        ...game,
                      }
                    )
                  }
                />
              )
            )}

          </div>

        </div>

        {/* =====================================
            TODAY LIVE MATCHES
        ===================================== */}

        <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#0b111d]/95 shadow-[0_8px_30px_rgba(0,0,0,0.28)]">

          {/* TITLE */}

          <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">

            <div className="flex items-center gap-2">

              <span className="relative flex h-2 w-2">

                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-50" />

                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />

              </span>

              <h2 className="text-[10px] font-black uppercase tracking-[0.14em] text-white">
                Today&apos;s Live Matches
              </h2>

            </div>

            <span className="text-[8px] font-black uppercase tracking-wider text-red-400">
              Live
            </span>

          </div>

          {/* SCROLLER */}

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
                  match={
                    match
                  }
                  onClick={() =>
                    handleProtectedClick(
                      {
                        type:
                          'match',
                        ...match,
                      }
                    )
                  }
                />
              )
            )}

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
      className={`group relative h-[66px] w-[126px] flex-none overflow-hidden rounded-lg border ${game.border} bg-[#111827] text-left transition active:scale-[0.97]`}
    >

      {/* GLOW */}

      <div
        className={`absolute inset-0 bg-gradient-to-br ${game.glow}`}
      />

      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

      {/* CONTENT */}

      <div className="relative flex h-full items-center gap-2 px-3">

        <div className={`flex h-8 w-8 flex-none items-center justify-center rounded-lg border border-white/10 bg-black/30 text-lg ${game.text} shadow-lg`}>
          {game.icon}
        </div>

        <div className="min-w-0">

          <div className="truncate text-[10px] font-black tracking-wide text-white">
            {game.name}
          </div>

          <div className={`mt-0.5 truncate text-[7px] font-bold uppercase tracking-wider ${game.text}`}>
            {game.subtitle}
          </div>

        </div>

      </div>

      {/* HOVER LIGHT */}

      <div className="pointer-events-none absolute -right-5 -top-8 h-16 w-16 rounded-full bg-white/10 blur-2xl transition group-hover:bg-white/20" />

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
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative h-[66px] w-[158px] flex-none overflow-hidden rounded-lg border ${match.border} bg-[#111827] text-left transition active:scale-[0.97]`}
    >

      {/* MULTI COLOR BACKGROUND */}

      <div
        className={`absolute inset-0 bg-gradient-to-br ${match.glow}`}
      />

      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

      {/* TOP */}

      <div className="relative flex items-center justify-between px-2.5 pt-2">

        <span className="text-[7px] font-black uppercase tracking-wider text-gray-400">
          {match.format}
        </span>

        <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-1.5 py-0.5 text-[6px] font-black text-red-300">

          <span className="h-1 w-1 animate-pulse rounded-full bg-red-400" />

          {match.status}

        </span>

      </div>

      {/* TEAMS */}

      <div className="relative mt-1.5 flex items-center justify-center gap-2">

        <div className="flex items-center gap-1">

          <span className="text-base">
            {match.flag1}
          </span>

          <span className="text-[10px] font-black text-white">
            {match.team1}
          </span>

        </div>

        <span className="text-[7px] font-black text-gray-500">
          VS
        </span>

        <div className="flex items-center gap-1">

          <span className="text-[10px] font-black text-white">
            {match.team2}
          </span>

          <span className="text-base">
            {match.flag2}
          </span>

        </div>

      </div>

      {/* LIGHT */}

      <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-white/10 blur-2xl transition group-hover:bg-white/20" />

    </button>
  );
}

/* =========================================
   AUTO SCROLL HOOK
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
