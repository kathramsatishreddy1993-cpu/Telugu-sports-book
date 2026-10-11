import React from 'react';

export default function BonusPage({ onBack }) {
  return (
    <div className="min-h-screen bg-[#080d16] text-white">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#080d16] px-4 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-amber-400/50 bg-[#111827] px-3 py-2 text-xs font-black text-white"
          >
            ‹ BACK
          </button>

          <div className="text-right">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-400">
              TELUGU SPORTS BOOK
            </p>

            <h1 className="text-sm font-black">
              BONUS DETAILS
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {/* MAIN TITLE */}
        <section className="mb-6 text-center">
          <div className="text-4xl">
            🎁
          </div>

          <p className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">
            EXCLUSIVE MEMBER BONUS
          </p>

          <h2 className="mt-2 text-2xl font-black">
            Bonus Offers
          </h2>

          <p className="mx-auto mt-2 max-w-xl text-[11px] leading-5 text-gray-400">
            Demo bonus information for Telugu Sports Book members.
          </p>
        </section>

        {/* 1 — WELCOME BONUS */}
        <section className="mb-4 overflow-hidden rounded-2xl border border-emerald-500/40 bg-[#10192b]">
          <div className="border-b border-white/10 px-5 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-400">
                  NEW PLAYERS
                </span>

                <h3 className="mt-3 text-xl font-black">
                  Welcome Bonus
                </h3>
              </div>

              <span className="text-3xl font-black text-emerald-400">
                20%
              </span>
            </div>

            <p className="mt-4 text-[12px] leading-5 text-gray-300">
              Eligible first demo deposit amount receives a 20% Demo Bonus.
            </p>
          </div>

          <div className="px-5 py-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-[9px] font-bold uppercase text-gray-500">
                  Minimum
                </p>

                <p className="mt-1 text-lg font-black text-white">
                  ₹2,000
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-[9px] font-bold uppercase text-gray-500">
                  Maximum
                </p>

                <p className="mt-1 text-lg font-black text-white">
                  ₹10,000
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-[10px] font-black uppercase text-emerald-400">
                Bonus Examples
              </p>

              <div className="mt-3 space-y-2 text-[11px] text-gray-300">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span>₹2,000</span>
                  <span className="font-black text-emerald-400">
                    + ₹400 Demo Bonus
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span>₹5,000</span>
                  <span className="font-black text-emerald-400">
                    + ₹1,000 Demo Bonus
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span>₹10,000</span>
                  <span className="font-black text-emerald-400">
                    + ₹2,000 Demo Bonus
                  </span>
                </div>
              </div>
            </div>

            <p className="mt-4 text-[10px] leading-5 text-gray-400">
              Minimum eligible amount is ₹2,000.
              The 20% calculation applies only up to
              the maximum eligible amount of ₹10,000.
            </p>
          </div>
        </section>

        {/* 2 — PROMO CODE BONUS */}
        <section className="mb-4 overflow-hidden rounded-2xl border border-blue-500/40 bg-[#10192b]">
          <div className="px-5 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex rounded-md border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-blue-400">
                  SPECIAL CODE
                </span>

                <h3 className="mt-3 text-xl font-black">
                  Promo Code Bonus
                </h3>
              </div>

              <span className="text-3xl font-black text-blue-400">
                10%
              </span>
            </div>

            <p className="mt-4 text-[12px] leading-5 text-gray-300">
              Eligible demo users with a valid and active
              promotional code can receive a 10% Demo Bonus
              according to the applicable promotional offer.
            </p>

            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                PROMO CONDITIONS
              </p>

              <p className="mt-2 text-[10px] leading-5 text-gray-400">
                Promo codes may have separate eligibility,
                validity and offer conditions. Only active
                demo promo codes are eligible.
              </p>
            </div>
          </div>
        </section>

        {/* 3 — LOSING BONUS */}
        <section className="mb-4 overflow-hidden rounded-2xl border border-orange-500/40 bg-[#10192b]">
          <div className="px-5 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex rounded-md border border-red-500/40 bg-red-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-red-400">
                  LOSS PROTECTION
                </span>

                <h3 className="mt-3 text-xl font-black">
                  Losing Bonus
                </h3>
              </div>

              <span className="text-3xl font-black text-orange-400">
                10%
              </span>
            </div>

            <p className="mt-4 text-[12px] leading-5 text-gray-300">
              Eligible demo net losses can receive a
              10% Demo Losing Bonus according to the
              applicable demo offer conditions.
            </p>

            <div className="mt-4 rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
              <p className="text-[10px] font-black uppercase text-orange-400">
                DEMO EXAMPLE
              </p>

              <div className="mt-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[9px] text-gray-500">
                    Eligible Demo Net Loss
                  </p>

                  <p className="mt-1 text-lg font-black">
                    ₹1,00,000
                  </p>
                </div>

                <span className="text-xl text-gray-500">
                  →
                </span>

                <div className="text-right">
                  <p className="text-[9px] text-gray-500">
                    10% Demo Bonus
                  </p>

                  <p className="mt-1 text-lg font-black text-orange-400">
                    ₹10,000
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-4 text-[10px] leading-5 text-gray-400">
              This example is for demonstration and
              informational purposes only.
            </p>
          </div>
        </section>

        {/* 4 — LIMITED PERIOD */}
        <section className="mb-6 rounded-2xl border border-amber-500/40 bg-[#10192b] p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">
              ⏳
            </span>

            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-amber-400">
                Limited Period Offer
              </h3>

              <p className="mt-3 text-[11px] leading-5 text-gray-300">
                These bonus offers are available for a
                limited period only and may be modified
                or withdrawn at any time.
              </p>
            </div>
          </div>
        </section>

        {/* DEMO NOTICE */}
        <section className="rounded-xl border border-white/10 bg-black/20 px-4 py-4 text-center">
          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-gray-500">
            DEMO WEBSITE
          </p>

          <p className="mt-2 text-[9px] leading-4 text-gray-500">
            For demonstration and informational purposes only.
            No real-money transactions.
          </p>
        </section>
      </main>
    </div>
  );
}
