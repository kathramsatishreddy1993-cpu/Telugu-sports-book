import React, { useState } from 'react';
import { rulesData } from './rulesData';

export default function RulesPage({
  onBack,
}) {
  const [selectedRule, setSelectedRule] =
    useState(null);

  const handleBack = () => {
    if (selectedRule) {
      setSelectedRule(null);

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });

      return;
    }

    if (onBack) {
      onBack();
    }
  };

  const openRule = (rule) => {
    setSelectedRule(rule);

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  /* =========================================
     SELECTED RULE DETAILS
  ========================================= */

  if (selectedRule) {
    return (
      <div className="min-h-screen bg-[#080d16] text-white">

        {/* HEADER */}

        <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b121e] px-3 py-3 shadow-xl">

          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">

            <button
              type="button"
              onClick={handleBack}
              className="shrink-0 rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-[10px] font-black text-amber-300"
            >
              ‹ BACK
            </button>

            <div className="min-w-0 text-right">

              <p className="text-[7px] font-black uppercase tracking-[0.18em] text-cyan-400">
                TELUGU SPORTS BOOK
              </p>

              <h1 className="mt-1 truncate text-sm font-black text-white">
                RULES
              </h1>

            </div>

          </div>

        </header>

        <main className="mx-auto max-w-3xl px-3 py-4">

          {/* RULE TITLE */}

          <section className="overflow-hidden rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-[#10202c] via-[#0c1724] to-[#111827] p-5 shadow-xl">

            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-cyan-400">
              RULE DETAILS
            </p>

            <h2 className="mt-2 break-words text-xl font-black leading-7 text-white">
              {selectedRule.title}
            </h2>

            {selectedRule.intro && (
              <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">

                {Array.isArray(
                  selectedRule.intro
                ) ? (
                  selectedRule.intro.map(
                    (item, index) => (
                      <p
                        key={index}
                        className={`text-[10px] leading-6 text-gray-300 ${
                          index > 0
                            ? 'mt-2'
                            : ''
                        }`}
                      >
                        {item}
                      </p>
                    )
                  )
                ) : (
                  <p className="text-[10px] leading-6 text-gray-300">
                    {selectedRule.intro}
                  </p>
                )}

              </div>
            )}

          </section>

          {/* GROUPS */}

          <section className="mt-4 space-y-4">

            {selectedRule.groups?.map(
              (group, groupIndex) => (
                <article
                  key={`${selectedRule.id}-${groupIndex}`}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-[#111827] shadow-xl"
                >

                  {group.heading && (
                    <div className="border-b border-cyan-400/20 bg-gradient-to-r from-cyan-400/10 to-transparent px-4 py-3">

                      <div className="flex items-center gap-2">

                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/10 text-[9px] font-black text-cyan-300">
                          {String(
                            groupIndex + 1
                          ).padStart(
                            2,
                            '0'
                          )}
                        </div>

                        <h3 className="text-[11px] font-black uppercase leading-5 text-cyan-200">
                          {group.heading}
                        </h3>

                      </div>

                    </div>
                  )}

                  <div className="divide-y divide-white/5">

                    {group.rules?.map(
                      (
                        ruleText,
                        ruleIndex
                      ) => (
                        <div
                          key={`${groupIndex}-${ruleIndex}`}
                          className="flex items-start gap-3 px-4 py-4"
                        >

                          <div className="flex h-7 min-w-[28px] shrink-0 items-center justify-center rounded-md border border-emerald-400/20 bg-emerald-400/10 px-1 text-[8px] font-black text-emerald-300">
                            {ruleIndex + 1}
                          </div>

                          <p className="min-w-0 flex-1 whitespace-pre-line break-words text-[10px] leading-6 text-gray-300">
                            {ruleText}
                          </p>

                        </div>
                      )
                    )}

                  </div>

                </article>
              )
            )}

          </section>

          {/* BACK BUTTON */}

          <button
            type="button"
            onClick={handleBack}
            className="mt-5 w-full rounded-xl border border-cyan-400/30 bg-[#083f3a] py-3 text-[11px] font-black text-white shadow-lg"
          >
            ← BACK TO ALL RULES
          </button>

          {/* FOOTER */}

          <footer className="py-8 text-center">

            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/5 text-lg">
              🏆
            </div>

            <p className="mt-3 text-xs font-black text-white">
              TELUGU SPORTS BOOK
            </p>

            <p className="mt-1 text-[8px] font-black uppercase tracking-[0.18em] text-cyan-500">
              DEMO WEBSITE
            </p>

            <p className="mt-3 text-[8px] leading-4 text-gray-600">
              For demonstration and
              informational purposes only.
              <br />
              No real-money transactions.
            </p>

          </footer>

        </main>

      </div>
    );
  }

  /* =========================================
     ALL RULE SUBJECTS
  ========================================= */

  return (
    <div className="min-h-screen bg-[#080d16] text-white">

      {/* HEADER */}

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b121e] px-3 py-3 shadow-xl">

        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">

          <button
            type="button"
            onClick={handleBack}
            className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-[10px] font-black text-amber-300"
          >
            ‹ BACK
          </button>

          <div className="text-right">

            <p className="text-[7px] font-black uppercase tracking-[0.18em] text-cyan-400">
              TELUGU SPORTS BOOK
            </p>

            <h1 className="mt-1 text-sm font-black text-white">
              RULES
            </h1>

          </div>

        </div>

      </header>

      <main className="mx-auto max-w-3xl px-3 py-4">

        {/* TITLE */}

        <section className="rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-[#10202c] via-[#0c1724] to-[#111827] p-5 shadow-xl">

          <div className="flex items-center gap-3">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10 text-2xl">
              📜
            </div>

            <div className="min-w-0">

              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-cyan-400">
                RULE INFORMATION
              </p>

              <h2 className="mt-1 text-xl font-black text-white">
                Rules
              </h2>

            </div>

          </div>

          <p className="mt-4 text-[10px] leading-5 text-gray-400">
            Select a subject below to view
            its complete rules.
          </p>

        </section>

        {/* SUBJECT LIST */}

        <section className="mt-4 space-y-2">

          {rulesData.map(
            (rule, index) => (
              <button
                key={
                  rule.id ||
                  `${rule.title}-${index}`
                }
                type="button"
                onClick={() =>
                  openRule(rule)
                }
                className="group flex w-full items-center justify-between gap-3 rounded-xl border border-emerald-400/20 bg-[#11695f] px-4 py-4 text-left shadow-lg transition active:scale-[0.99]"
              >

                <div className="flex min-w-0 items-center gap-3">

                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/15 text-[9px] font-black text-emerald-100">
                    {String(
                      index + 1
                    ).padStart(
                      2,
                      '0'
                    )}
                  </div>

                  <span className="min-w-0 break-words text-[12px] font-black leading-5 text-white">
                    {rule.title}
                  </span>

                </div>

                <span className="shrink-0 text-lg font-black text-emerald-200 transition group-active:translate-x-1">
                  ›
                </span>

              </button>
            )
          )}

        </section>

        {/* INFO */}

        <section className="mt-5 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-center">

          <p className="text-[9px] leading-5 text-gray-400">
            Rule subjects and details are
            loaded from the existing
            rulesData.js file.
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
            For demonstration and
            informational purposes only.
            <br />
            No real-money transactions.
          </p>

        </footer>

      </main>

    </div>
  );
}
