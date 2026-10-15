import React, { useEffect, useRef } from 'react';

/* =========================================
   BONUS DATA
========================================= */

const BONUS_ITEMS = [
  {
    id: 'welcome',
    title: 'WELCOME',
    subtitle: 'BONUS',
    percentage: '10%',
    icon: '🎁',
    border:
      'border-emerald-400/50',
    glow:
      'from-emerald-500/30 via-green-500/10 to-transparent',
    percentageColor:
      'text-emerald-300',
  },
  {
    id: 'promo',
    title: 'PROMO CODE',
    subtitle: 'BONUS',
    percentage: '10%',
    icon: '🎟️',
    border:
      'border-violet-400/50',
    glow:
      'from-blue-500/30 via-violet-500/15 to-transparent',
    percentageColor:
      'text-cyan-300',
  },
  {
    id: 'losing',
    title: 'LOSING',
    subtitle: 'BONUS',
    percentage: '10%',
    icon: '↩️',
    border:
      'border-orange-400/50',
    glow:
      'from-orange-500/30 via-red-500/10 to-transparent',
    percentageColor:
      'text-orange-300',
  },
];

/* =========================================
   MAIN COMPONENT
========================================= */

export default function HeroBonusCard({
  onOpenBonus,
}) {
  const scrollRef = useRef(null);

  /* =========================================
     GENTLE AUTO SCROLL
  ========================================= */

  useEffect(() => {
    const element =
      scrollRef.current;

    if (!element) {
      return undefined;
    }

    let animationFrame = null;
    let paused = false;

    const autoScroll = () => {
      if (!paused) {
        element.scrollLeft += 0.22;

        const maxScroll =
          element.scrollWidth -
          element.clientWidth;

        if (
          maxScroll > 0 &&
          element.scrollLeft >=
            maxScroll
        ) {
          element.scrollLeft = 0;
        }
      }

      animationFrame =
        requestAnimationFrame(
          autoScroll
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
        autoScroll
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
  }, []);

  return (
    <section className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#0b111d] text-white">

      {/* =====================================
          BACKGROUND LIGHTS
      ===================================== */}

      <div className="pointer-events-none absolute -left-12 top-0 h-24 w-24 rounded-full bg-amber-500/10 blur-3xl" />

      <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-violet-500/10 blur-3xl" />

      {/* =====================================
          HORIZONTAL BONUS ROW
      ===================================== */}

      <div
        ref={scrollRef}
        className="scrollbar-hide relative flex items-stretch gap-2 overflow-x-auto p-2"
      >

        {/* ===================================
            BONUS TITLE CARD
        =================================== */}

        <button
          type="button"
          onClick={onOpenBonus}
          className="relative h-[78px] w-[112px] flex-none overflow-hidden rounded-lg border border-amber-400/50 bg-[#15130d] text-left active:scale-[0.97]"
        >

          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-amber-500/25 via-orange-500/10 to-transparent" />

          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-red-500 via-yellow-300 to-violet-500" />

          <div className="relative flex h-full flex-col justify-center px-3">

            <div className="flex items-center gap-1.5">

              <span className="text-xl">
                🎁
              </span>

              <span className="text-[14px] font-black tracking-wide text-amber-300">
                BONUS
              </span>

            </div>

            <p className="mt-1 text-[7px] font-black uppercase tracking-[0.13em] text-orange-300">
              Special Offers
            </p>

            <p className="mt-1 text-[6px] font-bold uppercase tracking-wider text-gray-500">
              View Details →
            </p>

          </div>

        </button>

        {/* ===================================
            BONUS CARDS
        =================================== */}

        {BONUS_ITEMS.map(
          (bonus) => (
            <BonusItem
              key={bonus.id}
              bonus={bonus}
              onClick={
                onOpenBonus
              }
            />
          )
        )}

      </div>

      {/* =====================================
          MULTI COLOR BOTTOM LIGHT
      ===================================== */}

      <div className="pointer-events-none absolute inset-x-4 bottom-0 h-px bg-gradient-to-r from-emerald-400 via-cyan-400 via-violet-400 to-orange-400 opacity-70" />

    </section>
  );
}

/* =========================================
   BONUS ITEM
========================================= */

function BonusItem({
  bonus,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative h-[78px] w-[132px] flex-none overflow-hidden rounded-lg border ${bonus.border} bg-[#111827] text-left transition active:scale-[0.97]`}
    >

      {/* BACKGROUND */}

      <div
        className={`absolute inset-0 bg-gradient-to-br ${bonus.glow}`}
      />

      {/* TOP LIGHT */}

      <div className="pointer-events-none absolute inset-x-0 top-0 h-px animate-pulse bg-gradient-to-r from-transparent via-white/60 to-transparent" />

      {/* SIDE GLOW */}

      <div className="pointer-events-none absolute -right-5 -top-5 h-14 w-14 rounded-full bg-white/10 blur-2xl transition group-hover:bg-white/20" />

      {/* CONTENT */}

      <div className="relative flex h-full items-center gap-2 px-2.5">

        {/* ICON */}

        <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-white/10 bg-black/25 text-xl shadow-lg">
          {bonus.icon}
        </div>

        {/* TEXT */}

        <div className="min-w-0">

          <div
            className={`text-[17px] font-black leading-none ${bonus.percentageColor}`}
          >
            {bonus.percentage}
          </div>

          <div className="mt-1 truncate text-[8px] font-black uppercase tracking-wide text-white">
            {bonus.title}
          </div>

          <div className="mt-0.5 text-[6px] font-bold uppercase tracking-wider text-gray-400">
            {bonus.subtitle}
          </div>

        </div>

      </div>

      {/* BOTTOM NEON */}

      <div
        className={`pointer-events-none absolute inset-x-2 bottom-0 h-px bg-gradient-to-r ${bonus.glow}`}
      />

    </button>
  );
}
