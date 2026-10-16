import React from 'react';

export default function RulesPage({
  onBack,
}) {
  const rules = [
    {
      number: '01',
      title: 'DEMO WEBSITE',
      text:
        'This website is provided only for demonstration and informational purposes.',
    },
    {
      number: '02',
      title: 'DEMO COINS',
      text:
        'All balances shown on this website are Demo Coins. Demo Coins do not represent real money.',
    },
    {
      number: '03',
      title: 'SPORTS DATA',
      text:
        'Match information, scores, markets and other sports information may contain demo or mock data.',
    },
    {
      number: '04',
      title: 'GAME PREVIEWS',
      text:
        'Games displayed on the website are demonstration previews. Availability may vary.',
    },
    {
      number: '05',
      title: 'ACCOUNT SECURITY',
      text:
        'Customers should keep their Login Password and Withdrawal Password private and should not share them with other people.',
    },
    {
      number: '06',
      title: 'PASSWORDS',
      text:
        'Login Password and Withdrawal Password should be different. Customers may be required to change temporary passwords after login.',
    },
    {
      number: '07',
      title: 'BANK ACCOUNT DETAILS',
      text:
        'Customers should check their demo bank-account information carefully before submitting a demo withdrawal request.',
    },
    {
      number: '08',
      title: 'DEMO DEPOSIT REQUESTS',
      text:
        'Deposit screens and requests are demonstration features. No real payment is processed by this website.',
    },
    {
      number: '09',
      title: 'DEMO WITHDRAWAL REQUESTS',
      text:
        'Withdrawal requests use Demo Coins only. They do not initiate or guarantee any real-money transfer.',
    },
    {
      number: '10',
      title: 'ADMIN REVIEW',
      text:
        'Demo requests may remain Pending, Approved or Rejected according to actions performed in the demonstration Admin Panel.',
    },
    {
      number: '11',
      title: 'DATA ACCURACY',
      text:
        'Demo information may be changed, reset or removed during website development and testing.',
    },
    {
      number: '12',
      title: 'RESPONSIBLE USE',
      text:
        'Use this website only for its intended demonstration and informational purpose.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#080d16] text-white">

      {/* HEADER */}

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b121e] px-4 py-3 shadow-xl">

        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">

          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-[10px] font-black text-amber-300"
          >
            ‹ BACK
          </button>

          <div className="text-right">

            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-cyan-400">
              TELUGU SPORTS BOOK
            </p>

            <h1 className="mt-1 text-sm font-black">
              RULES
            </h1>

          </div>

        </div>

      </header>

      <main className="mx-auto max-w-3xl px-3 py-4">

        {/* TITLE */}

        <section className="overflow-hidden rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-[#10202c] via-[#0c1724] to-[#111827] p-5 shadow-xl">

          <div className="flex items-center gap-3">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10 text-2xl">
              📜
            </div>

            <div>

              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-cyan-400">
                DEMO INFORMATION
              </p>

              <h2 className="mt-1 text-xl font-black text-white">
                Rules & Guidelines
              </h2>

            </div>

          </div>

          <p className="mt-4 text-[10px] leading-5 text-gray-400">
            Please read the following rules before using the demo website.
          </p>

        </section>

        {/* IMPORTANT NOTICE */}

        <section className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">

          <div className="flex items-start gap-3">

            <span className="text-xl">
              ⚠️
            </span>

            <div>

              <p className="text-[10px] font-black text-amber-300">
                IMPORTANT NOTICE
              </p>

              <p className="mt-2 text-[9px] leading-5 text-gray-300">
                TELUGU SPORTS BOOK is currently presented as a demonstration website.
                Demo Coins and demo requests shown here are not real currency.
              </p>

            </div>

          </div>

        </section>

        {/* RULES */}

        <section className="mt-4 space-y-3">

          {rules.map((rule) => (

            <article
              key={rule.number}
              className="rounded-xl border border-white/10 bg-[#111827] p-4 shadow-lg"
            >

              <div className="flex items-start gap-3">

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/10 text-[10px] font-black text-cyan-300">
                  {rule.number}
                </div>

                <div className="min-w-0 flex-1">

                  <h3 className="text-[11px] font-black text-white">
                    {rule.title}
                  </h3>

                  <p className="mt-2 text-[9px] leading-5 text-gray-400">
                    {rule.text}
                  </p>

                </div>

              </div>

            </article>

          ))}

        </section>

        {/* DEMO COIN NOTICE */}

        <section className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-center">

          <div className="text-2xl">
            🪙
          </div>

          <h3 className="mt-2 text-xs font-black text-emerald-300">
            DEMO COINS ONLY
          </h3>

          <p className="mx-auto mt-2 max-w-lg text-[9px] leading-5 text-gray-400">
            Demo Coin balances are intended only for testing and demonstration.
            They have no cash value.
          </p>

        </section>

        {/* FOOTER */}

        <footer className="py-8 text-center">

          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/5 text-lg">
            🏆
          </div>

          <p className="mt-3 text-xs font-black">
            TELUGU SPORTS BOOK
          </p>

          <p className="mt-1 text-[8px] font-black uppercase tracking-[0.18em] text-cyan-500">
            DEMO WEBSITE
          </p>

          <p className="mt-3 text-[8px] leading-4 text-gray-600">
            For demonstration and informational purposes only.
            <br />
            No real-money transactions.
          </p>

        </footer>

      </main>

    </div>
  );
}
