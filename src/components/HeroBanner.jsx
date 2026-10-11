import React from 'react';

export default function HeroBonusCard({ onOpenBonus }) {
  return (
    <section className="bg-[#080d16] px-4 pb-5 pt-3 text-white">
      {/* TITLE ROW */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🎁</span>

          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-400">
              Exclusive Member
            </p>

            <h2 className="text-xl font-black uppercase leading-tight">
              BONUS
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenBonus}
          className="shrink-0 text-xs font-black text-amber-400 underline underline-offset-4"
        >
          View Details →
        </button>
      </div>

      {/* SINGLE BONUS CARD */}
      <button
        type="button"
        onClick={onOpenBonus}
        className="group relative w-full overflow-hidden rounded-[24px] border-2 border-amber-500 bg-[#111a2d] p-[2px] text-left"
      >
        {/* MULTI COLOR BORDER EFFECT */}
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 opacity-40" />

        <div className="relative rounded-[21px] bg-[#10192b] px-5 py-5">
          {/* TOP */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="inline-flex rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-400">
                MEMBER OFFERS
              </span>

              <h3 className="mt-3 text-xl font-black text-white">
                Exclusive Member Bonuses
              </h3>

              <p className="mt-2 text-[12px] leading-5 text-gray-400">
                Welcome Bonus • Promo Code Bonus • Losing Bonus
              </p>
            </div>

            <div className="text-right">
              <span className="text-3xl">🎁</span>
            </div>
          </div>

          {/* BONUS MINI ITEMS */}
          <div className="mt-5 grid grid-cols-3 gap-2">
            {/* WELCOME */}
            <div className="rounded-xl border border-emerald-500/30 bg-black/20 px-2 py-3 text-center">
              <p className="text-lg font-black text-emerald-400">
                20%
              </p>

              <p className="mt-1 text-[8px] font-black uppercase leading-tight text-white">
                Welcome
              </p>
            </div>

            {/* PROMO */}
            <div className="rounded-xl border border-blue-500/30 bg-black/20 px-2 py-3 text-center">
              <p className="text-lg font-black text-blue-400">
                10%
              </p>

              <p className="mt-1 text-[8px] font-black uppercase leading-tight text-white">
                Promo Code
              </p>
            </div>

            {/* LOSING */}
            <div className="rounded-xl border border-red-500/30 bg-black/20 px-2 py-3 text-center">
              <p className="text-lg font-black text-orange-400">
                10%
              </p>

              <p className="mt-1 text-[8px] font-black uppercase leading-tight text-white">
                Losing
              </p>
            </div>
          </div>

          {/* BOTTOM */}
          <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                TAP TO VIEW ALL BONUS DETAILS
              </p>

              <p className="mt-1 text-[9px] text-gray-500">
                Limited period demo offers
              </p>
            </div>

            <span className="text-2xl font-black text-amber-400">
              →
            </span>
          </div>
        </div>
      </button>
    </section>
  );
}
