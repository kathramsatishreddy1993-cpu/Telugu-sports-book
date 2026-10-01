import React from 'react';

export default function SportsSections() {
  const sports = [
    { id: 'cricket', name: 'Cricket', icon: '🏏', count: '12 Live Events' },
    { id: 'football', name: 'Football', icon: '⚽', count: '24 Live Events' },
    { id: 'tennis', name: 'Tennis', icon: '🎾', count: '8 Live Events' },
    { id: 'kabaddi', name: 'Kabaddi', icon: '🤼', count: '4 Live Events' },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 mt-8 space-y-6">
      <div className="flex items-center justify-between border-b border-gray-800 pb-3">
        <h2 className="text-xl font-bold text-white uppercase tracking-wider">
          Top Sports & Live Betting
        </h2>
        <span className="text-xs text-amber-400 font-semibold cursor-pointer hover:underline">
          View All &rarr;
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {sports.map((sport) => (
          <div
            key={sport.id}
            className="bg-[#0f172a] border border-gray-800 rounded-xl p-4 flex flex-col items-center text-center space-y-2 hover:border-amber-500/50 transition cursor-pointer"
          >
            <span className="text-3xl">{sport.icon}</span>
            <h3 className="text-sm font-bold text-white">{sport.name}</h3>
            <span className="text-xs text-gray-400">{sport.count}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
