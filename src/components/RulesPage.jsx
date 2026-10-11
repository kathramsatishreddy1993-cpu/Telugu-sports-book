import React, { useState } from 'react';
import { rulesData } from './rulesData';

export default function RulesPage({ user, onBack }) {
  const [openRule, setOpenRule] = useState(null);

  const toggleRule = (id) => {
    setOpenRule((current) => (current === id ? null : id));
  };

  return (
    <div className="min-h-screen bg-[#f3f3f3] text-gray-900">
      {/* TOP HEADER */}
      <header className="sticky top-0 z-50 bg-[#062e2b] text-white shadow-lg">
        <div className="flex min-h-[58px] items-center justify-between px-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md border border-teal-600 bg-[#0a4540] px-3 py-2 text-sm font-bold"
          >
            ← Back
          </button>

          <div className="px-2 text-center">
            <div className="text-sm font-black tracking-wide text-amber-400 sm:text-base">
              TELUGU SPORTS BOOK
            </div>

            <div className="text-[10px] font-bold tracking-[0.2em] text-teal-200">
              • DEMO •
            </div>
          </div>

          <div className="max-w-[90px] truncate text-right text-xs font-bold text-white">
            {user?.name || user?.identifier || 'Demo User'}
          </div>
        </div>
      </header>

      {/* PAGE TITLE */}
      <section className="border-b border-gray-300 bg-white px-4 py-4 shadow-sm">
        <h1 className="text-xl font-black text-[#073d38]">
          Rules
        </h1>

        <p className="mt-1 text-xs text-gray-500">
          TELUGU SPORTS BOOK demo rules &amp; information
        </p>
      </section>

      {/* IMPORTANT DEMO NOTICE */}
      <div className="mx-3 mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
        <p className="text-xs font-semibold leading-5 text-amber-900">
          DEMO NOTICE — These rules are displayed for demonstration and
          informational purposes only. This demo website does not process
          real-money transactions.
        </p>
      </div>

      {/* RULE ACCORDIONS */}
      <main className="mx-auto w-full max-w-5xl px-3 py-3">
        <div className="overflow-hidden rounded-md border border-[#0a5c53] bg-white shadow">
          {rulesData.map((rule, index) => {
            const isOpen = openRule === rule.id;

            return (
              <div
                key={rule.id}
                className={
                  index === 0
                    ? ''
                    : 'border-t border-[#0d6a60]'
                }
              >
                <button
                  type="button"
                  onClick={() => toggleRule(rule.id)}
                  className="flex w-full items-center justify-between gap-3 bg-gradient-to-r from-[#0b4d47] to-[#0a6157] px-4 py-3 text-left text-white transition hover:brightness-110"
                >
                  <span className="text-sm font-extrabold sm:text-base">
                    {rule.title}
                  </span>

                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-teal-300 bg-black/20 text-lg font-black transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  >
                    ⌄
                  </span>
                </button>

                {isOpen && (
                  <div className="bg-white px-4 py-4">
                    {rule.intro && (
                      <div className="mb-4 rounded-md border-l-4 border-amber-500 bg-amber-50 p-3">
                        <p className="whitespace-pre-line text-sm font-semibold leading-6 text-gray-800">
                          {rule.intro}
                        </p>
                      </div>
                    )}

                    {rule.groups?.map((group, groupIndex) => (
                      <section
                        key={`${rule.id}-${groupIndex}`}
                        className={
                          groupIndex === 0
                            ? ''
                            : 'mt-5 border-t border-gray-200 pt-4'
                        }
                      >
                        {group.heading && (
                          <h2 className="mb-3 rounded bg-[#e6f3f1] px-3 py-2 text-sm font-black text-[#07463f]">
                            {group.heading}
                          </h2>
                        )}

                        <div className="space-y-2">
                          {group.rules.map((text, ruleIndex) => (
                            <div
                              key={`${rule.id}-${groupIndex}-${ruleIndex}`}
                              className="flex items-start gap-2 rounded-md border border-gray-200 bg-[#fafafa] p-3"
                            >
                              <span className="mt-[2px] flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0b5c53] px-1 text-[10px] font-black text-white">
                                {ruleIndex + 1}
                              </span>

                              <p className="whitespace-pre-line break-words text-[13px] leading-6 text-gray-800 sm:text-sm">
                                {text}
                              </p>
                            </div>
                          ))}
                        </div>
                      </section>
                    ))}

                    {(!rule.groups || rule.groups.length === 0) && (
                      <p className="text-sm text-gray-500">
                        No rules available.
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => setOpenRule(null)}
                      className="mt-5 w-full rounded-md border border-[#0b5c53] bg-[#edf7f5] py-2 text-xs font-black uppercase tracking-wide text-[#084b44]"
                    >
                      Close {rule.title}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* BOTTOM HOME BUTTON */}
        <button
          type="button"
          onClick={onBack}
          className="mt-5 w-full rounded-lg bg-[#083f3a] py-3 text-sm font-black text-white shadow"
        >
          ← BACK TO HOME
        </button>

        <div className="py-5 text-center">
          <div className="text-xs font-black text-[#075249]">
            TELUGU SPORTS BOOK • DEMO
          </div>

          <p className="mt-1 text-[10px] leading-4 text-gray-500">
            For demonstration and informational purposes only.
            <br />
            No real-money transactions.
          </p>
        </div>
      </main>
    </div>
  );
}
