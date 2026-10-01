import React from 'react';

export default function HeroBonusCard({ onOpenBonus }) {
  return (
    <div
      onClick={onOpenBonus}
      className="cursor-pointer group relative overflow-hidden rounded-2xl p-0.5 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 shadow-xl transition-transform transform hover:-translate-y-1 active:scale-98"
    >
      <div className="bg-[#0f172a] rounded-[14px] p-5 flex items-center justify-between relative z-10">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider border border-red-500/30">
              Special Offer
            </span>
            <span className="text-amber-400 font-extrabold text-sm tracking-wide uppercase">
              BONUS
            </span>
          </div>
          <h3 className="text-lg md:text-xl font-black text-white tracking-wide">
            Loss Return 10%
          </h3>
          <p className="text-xs text-gray-400">
            Get 10% return on net losses. Click to view terms & claim.
          </p>
        </div>

        <button className="px-4 py-2 text-xs md:text-sm font-bold text-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl shadow-lg transition">
          Claim Now
        </button>
      </div>
    </div>
  );
}
