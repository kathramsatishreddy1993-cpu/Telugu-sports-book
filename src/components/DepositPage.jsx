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
        {/* PAGE TITLE */}
        <section className="mb-6 text-center">
          <div className="text-4xl">🎁</div>

          <p className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">
            EXCLUSIVE MEMBER BONUS
          </p>

          <h2 className="mt-2 text-2xl font-black">
            Bonus Offers
          </h2>
        </section>

        {/* 1. WELCOME BONUS */}
        <section className="mb-4 overflow-hidden rounded-2xl border border-emerald-500/40 bg-[#10192b]">
          <div className="px-5 py-5">
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
              Eligible amounts from ₹2,000 are eligible for a
              20% Welcome Bonus. Bonus eligibility is calculated
              only up to ₹10,000.
            </p>

            {/* MIN / MAX */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <p className="text-[9px] font-black uppercase text-gray-500">
                  Minimum Eligible Amount
                </p>

                <p className="mt-2 text-xl font-black text-white">
                  ₹2,000
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <p className="text-[9px] font-black uppercase text-gray-500">
                  Maximum Eligible Amount
                </p>

                <p className="mt-2 text-xl font-black text-white">
                  ₹10,000
                </p>
              </div>
            </div>

            {/* RULE */}
            <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                WELCOME BONUS RULE
              </p>

              <p className="mt-3 text-[11px] leading-5 text-gray-300">
                Amounts below ₹2,000 are not eligible for the
                Welcome Bonus.
              </p>

              <p className="mt-2 text-[11px] leading-5 text-gray-300">
                Eligible amounts from ₹2,000 up to ₹10,000
                receive a 20% Bonus.
              </p>

              <p className="mt-2 text-[11px] leading-5 text-gray-300">
                If the amount is above ₹10,000, Bonus eligibility
                remains capped at ₹10,000.
              </p>
            </div>
          </div>
        </section>

        {/* 2. PROMO CODE BONUS */}
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
              Eligible users with a valid and active promotional
              code can receive a 10% Bonus according to the
              applicable promotional offer.
            </p>

            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                PROMO CONDITIONS
              </p>

              <p className="mt-2 text-[10px] leading-5 text-gray-400">
                Promo codes may have separate eligibility,
                validity and offer conditions. Only active
                promotional codes are eligible.
              </p>
            </div>
          </div>
        </section>

        {/* 3. LOSING BONUS */}
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
              Eligible net losses can receive a 10% Losing Bonus
              according to the applicable offer conditions.
            </p>

            <div className="mt-4 rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-orange-400">
                LOSING BONUS
              </p>

              <p className="mt-2 text-[10px] leading-5 text-gray-300">
                Losing Bonus eligibility is calculated according
                to the applicable offer rules and eligible net
                loss amount.
              </p>
            </div>
          </div>
        </section>

        {/* 4. LIMITED PERIOD OFFER */}
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
                These bonus offers are available for a limited
                period only and may be modified or withdrawn
                at any time.
              </p>
            </div>
          </div>
        </section>

        {/* NOTICE */}
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
