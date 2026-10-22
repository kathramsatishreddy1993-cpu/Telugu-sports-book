import React, { useEffect, useState } from 'react';

const BONUS_DETAILS = {
  welcome: {
    title: 'Welcome Bonus',
    percentage: '5%',
    color: 'text-emerald-400',
    border: 'border-emerald-400/40',
    background: 'bg-emerald-400/10',
    description:
      'మినిమమ్ ₹2,000 డిపాజిట్ చేస్తే 5% వెల్కమ్ బోనస్ లభిస్తుంది. గరిష్ఠ డిపాజిట్ పరిమితి లేదు.',
    details: [
      ['Minimum Deposit', '₹2,000'],
      ['Maximum Deposit', 'Unlimited'],
      ['Welcome Bonus', '5%'],
    ],
  },

  promo: {
    title: 'Promo Code Bonus',
    percentage: '5%',
    color: 'text-violet-400',
    border: 'border-violet-400/40',
    background: 'bg-violet-400/10',
    description:
      'మీ ప్రోమో కోడ్ ద్వారా వచ్చిన కొత్త కస్టమర్ డిపాజిట్ చేస్తే, ఆ డిపాజిట్ మొత్తంపై వారికి 5% బోనస్ మరియు మీకు 5% ప్రోమో బోనస్ లభిస్తుంది.',
    instructions: [
      'మీ అకౌంట్ మెనూలో “My Promo Code” ఓపెన్ చేసి, మీ ప్రోమో కోడ్‌ను కాపీ చేయండి.',
      'మీ ద్వారా కొత్త ID తీసుకునే వ్యక్తికి ఆ కోడ్‌ను పంపండి.',
      'వారు తమ WhatsApp నంబర్ నుంచి Admin‌కు కొత్త ID కోసం రిక్వెస్ట్ పంపేటప్పుడు, మీ ప్రోమో కోడ్‌ను కూడా ఆ మెసేజ్‌లో పేస్ట్ చేయాలి.',
      'ఆ ప్రోమో కోడ్‌తో కొత్త ID క్రియేట్ చేసిన తర్వాత, వారి డిపాజిట్ మొత్తంపై వారికి 5% మరియు మీకు 5% బోనస్ Admin జోడిస్తారు.',
    ],
    details: [
      ['New Customer Bonus', '5%'],
      ['Your Referral Bonus', '5%'],
    ],
  },

  losing: {
    title: 'Losing Bonus',
    percentage: '10%',
    color: 'text-orange-400',
    border: 'border-orange-400/40',
    background: 'bg-orange-400/10',
    description:
      '₹1,00,000 లాస్ అయినప్పుడు 10% లాసింగ్ బోనస్ లభిస్తుంది.',
    details: [
      ['Loss Amount', '₹1,00,000'],
      ['Losing Bonus', '10%'],
    ],
  },
};

function normalizeBonusType(value) {
  const type = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, '');

  if (
    type === 'welcome' ||
    type === 'welcomebonus'
  ) {
    return 'welcome';
  }

  if (
    [
      'promo',
      'promocode',
      'promobonus',
      'promocodebonus',
      'referral',
    ].includes(type)
  ) {
    return 'promo';
  }

  if (
    [
      'losing',
      'loss',
      'losingbonus',
      'lossbonus',
    ].includes(type)
  ) {
    return 'losing';
  }

  return null;
}

export default function BonusPage({
  onBack,
  bonusType,
}) {
  const [selectedBonus, setSelectedBonus] = useState(
    () => normalizeBonusType(bonusType),
  );

  useEffect(() => {
    setSelectedBonus(normalizeBonusType(bonusType));
  }, [bonusType]);

  const bonus = BONUS_DETAILS[selectedBonus];

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }

    window.location.assign('/');
  };

  return (
    <div className="min-h-screen bg-[#080d16] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#080d16] px-4 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="rounded-lg border border-amber-400/50 bg-[#111827] px-3 py-2 text-xs font-black text-white transition active:scale-95"
          >
            ‹ BACK
          </button>

          <div className="text-right">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-400">
              TELUGU SPORTS BOOK
            </p>

            <h1 className="mt-1 text-sm font-black uppercase">
              {bonus ? bonus.title : 'Bonus Offers'}
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {!bonus && (
          <>
            <h2 className="mb-5 text-center text-xl font-black">
              Bonus Offers
            </h2>

            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              {[
                {
                  key: 'welcome',
                  label: 'WELCOME',
                },
                {
                  key: 'promo',
                  label: 'PROMO CODE',
                },
                {
                  key: 'losing',
                  label: 'LOSING',
                },
              ].map(({ key, label }) => {
                const item = BONUS_DETAILS[key];

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedBonus(key)}
                    className={`flex min-w-0 flex-col items-center justify-center rounded-2xl border px-2 py-6 text-center transition active:scale-95 ${item.border} ${item.background}`}
                  >
                    <span
                      className={`text-3xl font-black sm:text-4xl ${item.color}`}
                    >
                      {item.percentage}
                    </span>

                    <span className="mt-3 text-[10px] font-black sm:text-xs">
                      {label}
                    </span>

                    <span className="mt-1 text-[9px] font-bold tracking-wider text-slate-400">
                      BONUS
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {bonus && (
          <section
            className={`overflow-hidden rounded-2xl border bg-[#10192b] ${bonus.border}`}
          >
            <div className="p-5 sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-black">
                  {bonus.title}
                </h2>

                <span
                  className={`shrink-0 text-4xl font-black ${bonus.color}`}
                >
                  {bonus.percentage}
                </span>
              </div>

              <p className="mt-5 text-sm leading-7 text-gray-300">
                {bonus.description}
              </p>

              {bonus.instructions && (
                <div className="mt-5 rounded-xl border border-violet-400/20 bg-violet-400/5 p-4">
                  <h3 className="text-sm font-black text-violet-300">
                    ప్రోమో కోడ్ ఎలా ఉపయోగించాలి?
                  </h3>

                  <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm leading-7 text-slate-300">
                    {bonus.instructions.map(instruction => (
                      <li key={instruction}>
                        {instruction}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <dl
                className={`mt-6 divide-y divide-white/10 rounded-xl border px-4 ${bonus.border} ${bonus.background}`}
              >
                {bonus.details.map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-4 py-4"
                  >
                    <dt className="text-xs text-slate-300">
                      {label}
                    </dt>

                    <dd
                      className={`text-right text-sm font-black ${bonus.color}`}
                    >
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>

              <p className="mt-5 text-[10px] text-slate-500">
                Demo coins కోసం బోనస్ వివరాలు.
              </p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
