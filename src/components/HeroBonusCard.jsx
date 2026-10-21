import React from 'react';

const BONUS_ITEMS = [
  {
    id: 'welcome',
    title: 'WELCOME',
    percentage: '5%',
    border: 'border-emerald-400/50',
    glow:
      'from-emerald-500/25 via-emerald-500/10 to-transparent',
    percentageColor: 'text-emerald-300',
    light: 'bg-emerald-400',
  },
  {
    id: 'promo',
    title: 'PROMO CODE',
    percentage: '5%',
    border: 'border-violet-400/50',
    glow:
      'from-violet-500/25 via-blue-500/10 to-transparent',
    percentageColor: 'text-cyan-300',
    light: 'bg-violet-400',
  },
  {
    id: 'losing',
    title: 'LOSING',
    percentage: '10%',
    border: 'border-orange-400/50',
    glow:
      'from-orange-500/25 via-amber-500/10 to-transparent',
    percentageColor: 'text-orange-300',
    light: 'bg-orange-400',
  },
];

export default function HeroBonusCard({
  onOpenBonus,
}) {
  return (
    <section
      aria-label="Bonus offers"
      className="grid w-full min-w-0 grid-cols-3 gap-2 text-white sm:gap-3"
    >
      {BONUS_ITEMS.map((bonus) => (
        <button
          key={bonus.id}
          type="button"
          onClick={() => onOpenBonus?.(bonus.id)}
          aria-label={`${bonus.title} Bonus ${bonus.percentage}`}
          className={`relative min-w-0 overflow-hidden rounded-xl border bg-[#101827] px-1 py-5 text-center transition active:scale-[0.97] sm:py-6 ${bonus.border}`}
        >
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${bonus.glow}`}
          />

          <div
            aria-hidden="true"
            className={`pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-15 blur-2xl ${bonus.light}`}
          />

          <div className="relative flex flex-col items-center justify-center">
            <span
              className={`text-3xl font-black leading-none sm:text-4xl ${bonus.percentageColor}`}
            >
              {bonus.percentage}
            </span>

            <span className="mt-3 whitespace-nowrap text-[9px] font-black tracking-wide sm:text-xs">
              {bonus.title}
            </span>

            <span className="mt-1 text-[8px] font-bold tracking-widest text-slate-400 sm:text-[10px]">
              BONUS
            </span>
          </div>

          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-x-3 bottom-0 h-px opacity-70 ${bonus.light}`}
          />
        </button>
      ))}
    </section>
  );
}
