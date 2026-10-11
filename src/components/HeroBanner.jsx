import React from 'react';

export default function HeroBanner() {
  return (
    <section className="relative overflow-hidden bg-[#080d16] px-4 py-8 text-white">
      {/* BACKGROUND GLOW */}
      <div className="pointer-events-none absolute -left-16 top-0 h-44 w-44 rounded-full bg-teal-500/10 blur-3xl" />

      <div className="pointer-events-none absolute -right-16 bottom-0 h-44 w-44 rounded-full bg-amber-500/10 blur-3xl" />

      {/* CONTENT */}
      <div className="relative mx-auto max-w-5xl">
        <div className="rounded-2xl border border-white/10 bg-[#0d1524] px-5 py-7">
          
          <div className="inline-flex rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1">
            <span className="text-[9px] font-black uppercase tracking-[0.18em] text-teal-300">
              SPORTS • GAMES • ENTERTAINMENT
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-black leading-tight">
            INDIA&apos;S PREMIER
            <span className="block text-amber-400">
              SPORTS &amp; GAMING HUB
            </span>
          </h1>

          <p className="mt-3 max-w-xl text-[12px] leading-5 text-gray-400">
            Premium Sports &amp; Entertainment Demo
          </p>

          {/* INFO BOXES */}
          <div className="mt-6 grid grid-cols-3 gap-2">
            
            <div className="rounded-xl border border-white/10 bg-black/20 px-2 py-3 text-center">
              <span className="block text-xl">
                🏏
              </span>

              <span className="mt-1 block text-[8px] font-black uppercase text-white">
                SPORTS
              </span>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 px-2 py-3 text-center">
              <span className="block text-xl">
                🎮
              </span>

              <span className="mt-1 block text-[8px] font-black uppercase text-white">
                GAMES
              </span>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 px-2 py-3 text-center">
              <span className="block text-xl">
                ⚡
              </span>

              <span className="mt-1 block text-[8px] font-black uppercase text-white">
                LIVE
              </span>
            </div>

          </div>

          {/* DEMO NOTICE */}
          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500">
              DEMONSTRATION &amp; INFORMATIONAL EXPERIENCE
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
