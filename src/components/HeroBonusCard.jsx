import React from 'react';

export default function HeroBonusCard({ onOpenBonus }) {
  const bonuses = [
    {
      id: 'welcome',
      tag: 'New Players',
      tagColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      title: 'Welcome Bonus',
      percentage: '20%',
      description: 'Get an instant 20% match on your first deposit to start playing.',
      badgeColor: 'from-emerald-400 to-teal-500',
    },
    {
      id: 'promo',
      tag: 'Special Code',
      tagColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      title: 'Promo Code Bonus',
      percentage: '10%',
      description: 'Use active promo codes to claim an extra 10% boost on eligible events.',
      badgeColor: 'from-blue-400 to-indigo-500',
    },
    {
      id: 'loss',
      tag: 'Loss Protection',
      tagColor: 'bg-red-500/20 text-red-400 border-red-500/30',
      title: 'Losing Bonus',
      percentage: '10%',
      description: 'Get 10% cash return on net losses to keep your momentum going.',
      badgeColor: 'from-amber-400 to-orange-500',
    },
  ];

  return (
    <div
      onClick={onOpenBonus}
      className="cursor-pointer group relative w-full my-6 transition-transform transform active:scale-[0.99]"
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
          <span className="text-amber-400">🎁</span> Exclusive Member Bonuses
        </h2>
        <span className="text-xs text-amber-400 font-semibold group-hover:underline">
          View All Details &rarr;
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {bonuses.map((bonus) => (
          <div
            key={bonus.id}
            className="relative overflow-hidden rounded-2xl p-0.5 bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 group-hover:from-amber-500 group-hover:via-orange-500 group-hover:to-red-500 transition-all duration-300 shadow-xl"
          >
            <div className="bg-[#0f172a] rounded-[14px] p-5 h-full flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border ${bonus.tagColor}`}
                  >
                    {bonus.tag}
                  </span>
                  <span className={`text-2xl font-black bg-gradient-to-r ${bonus.badgeColor} bg-clip-text text-transparent`}>
                    {bonus.percentage}
                  </span>
                </div>

                <h3 className="text-lg font-black text-white tracking-wide">
                  {bonus.title}
                </h3>

                <p className="text-xs text-gray-400 leading-relaxed">
                  {bonus.description}
                </p>
              </div>

              <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Tap to Claim
                </span>
                <span className="text-xs text-amber-400 font-bold group-hover:translate-x-1 transition-transform">
                  &rarr;
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
