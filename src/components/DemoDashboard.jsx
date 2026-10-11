function GameGrid({ title, games }) {
  return (
    <section className="mb-4 bg-[#f4f4f4]">
      {title && (
        <div className="flex items-center justify-between bg-[#0b6259] px-4 py-3">
          <h2 className="text-[18px] font-black uppercase tracking-wide text-white">
            {title}
          </h2>

          <span className="rounded-full bg-white/10 px-3 py-1 text-[9px] font-bold text-teal-100">
            DEMO
          </span>
        </div>
      )}

      <div className="grid grid-cols-4 gap-[4px] bg-[#e5e7eb] p-[4px]">
        {games.map((game, index) => {
          const backgrounds = [
            'from-[#171b4d] via-[#45229a] to-[#9d19b7]',
            'from-[#151d52] via-[#3435b0] to-[#9b168f]',
            'from-[#351149] via-[#7b176d] to-[#ca1748]',
            'from-[#49220c] via-[#a12b12] to-[#d52d18]',
          ];

          return (
            <button
              key={`${game}-${index}`}
              type="button"
              onClick={() =>
                alert(`${game} — Demo Preview Only`)
              }
              className="group min-w-0 overflow-hidden rounded-[7px] bg-[#071c1a] text-white shadow-sm transition active:scale-[0.97]"
            >
              {/* GAME IMAGE / COVER AREA */}
              <div
                className={`relative flex aspect-[0.95/1] items-center justify-center overflow-hidden bg-gradient-to-br ${
                  backgrounds[index % backgrounds.length]
                } px-1`}
              >
                {/* subtle professional overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-white/5" />

                {/* decorative glow */}
                <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-white/10 blur-xl" />

                <span className="relative z-10 break-words px-1 text-center text-[10px] font-black uppercase leading-tight drop-shadow-md sm:text-sm">
                  {game}
                </span>

                <span className="absolute right-1.5 top-1.5 rounded bg-black/40 px-1.5 py-[2px] text-[6px] font-black tracking-wide text-white">
                  DEMO
                </span>
              </div>

              {/* GAME NAME */}
              <div className="flex min-h-[31px] items-center justify-center border-t border-white/10 bg-gradient-to-b from-[#173e38] to-[#071c1a] px-1.5 py-1">
                <span className="line-clamp-2 break-words text-center text-[8px] font-extrabold uppercase leading-tight text-white sm:text-[11px]">
                  {game}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
