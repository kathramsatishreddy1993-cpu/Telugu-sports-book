import React from 'react';

export default function BonusPage({ onBack }) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* BACK BUTTON */}
      <button
        onClick={onBack}
        className="flex items-center space-x-2 text-sm text-gray-400 hover:text-white transition"
      >
        <span>&larr; Back to Dashboard</span>
      </button>

      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 p-0.5 rounded-2xl shadow-2xl">
        <div className="bg-[#0f172a] rounded-[15px] p-6 md:p-8 space-y-4">
          <span className="inline-block px-3 py-1 text-xs font-bold text-amber-400 uppercase bg-amber-400/10 border border-amber-500/30 rounded-full">
            Exclusive Member Bonus
          </span>
          
          <h1 className="text-2xl md:text-4xl font-black text-white tracking-wide">
            ₹1,00,000 LOSS &rarr; 10% RETURN
          </h1>

          <p className="text-gray-300 text-sm md:text-base leading-relaxed">
            Mitigate your risks with our flagship loss protection feature. Get an automatic 10% cash return credited to your balance on net weekly sports losses up to ₹1,00,000.
          </p>
        </div>
      </div>

      {/* TERMS & CONDITIONS GRID */}
      <div className="bg-[#0b121e] border border-gray-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-white uppercase tracking-wider">
          Bonus Rules & Specifications
        </h2>

        <ul className="space-y-3 text-sm text-gray-300 list-disc list-inside">
          <li>Calculation is based on net settlement across all sports markets.</li>
          <li>10% return is automatically calculated every Monday at 00:00 IST.</li>
          <li>Maximum return cap applies according to tier guidelines.</li>
          <li>Bonus funds carry a 1x turnover requirement before withdrawal.</li>
        </ul>
      </div>
    </div>
  );
}
