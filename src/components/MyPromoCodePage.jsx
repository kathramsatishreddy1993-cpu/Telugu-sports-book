import React, { useEffect, useRef, useState } from "react";

export default function MyPromoCodePage({ onBack }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reload, setReload] = useState(0);

  const codeInput = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 20000);

    const loadPromoCode = async () => {
      setLoading(true);
      setError("");
      setMessage("");
      setDetails(null);

      try {
        const response = await fetch(
          "/api/customer/promo-code",
          {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
            headers: {
              Accept: "application/json",
            },
            signal: controller.signal,
          },
        );

        let data = {};

        try {
          data = await response.json();
        } catch {
          data = {};
        }

        if (!response.ok) {
          throw new Error(
            data.error || "Unable to load your Promo Code.",
          );
        }

        if (data.success !== true) {
          throw new Error("Unable to load your Promo Code.");
        }

        if (active) {
          setDetails(data);
        }
      } catch (requestError) {
        if (!active) return;

        setError(
          timedOut
            ? "Connection timed out. Please try again."
            : requestError.message ||
                "Unable to load your Promo Code.",
        );
      } finally {
        clearTimeout(timer);

        if (active) {
          setLoading(false);
        }
      }
    };

    loadPromoCode();

    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [reload]);

  const promoCode = String(details?.promoCode || "");

  const copyPromoCode = async () => {
    if (!promoCode) return;

    setMessage("");

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard unavailable");
      }

      await navigator.clipboard.writeText(promoCode);
      setMessage("Promo Code copied.");
    } catch {
      codeInput.current?.focus();
      codeInput.current?.select();

      setMessage(
        "కోడ్‌ను నొక్కి పట్టుకుని Copy ఎంచుకోండి.",
      );
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }

    window.location.assign("/");
  };

  return (
    <div className="min-h-screen bg-[#080d16] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#080d16] px-4 py-4">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="rounded-lg border border-amber-400/40 bg-[#111827] px-3 py-2 text-xs font-black"
          >
            ‹ BACK
          </button>

          <div className="text-right">
            <p className="text-[9px] font-black tracking-widest text-amber-400">
              TELUGU SPORTS BOOK
            </p>

            <h1 className="mt-1 text-sm font-black">
              MY PROMO CODE
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-6">
        <section className="overflow-hidden rounded-2xl border border-violet-400/30 bg-[#101827] p-5">
          <h2 className="text-xl font-black">
            My Promo Code
          </h2>

          {loading && (
            <p
              role="status"
              className="mt-5 text-sm text-slate-400"
            >
              Loading your Promo Code…
            </p>
          )}

          {!loading && error && (
            <div className="mt-5">
              <p
                role="alert"
                className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200"
              >
                {error}
              </p>

              <button
                type="button"
                onClick={() => setReload(value => value + 1)}
                className="mt-4 w-full rounded-xl bg-violet-500 px-4 py-3 text-sm font-black"
              >
                TRY AGAIN
              </button>
            </div>
          )}

          {!loading && !error && details && (
            <>
              <div className="mt-5 border-b border-white/10 pb-4">
                <p className="text-sm font-bold">
                  {details.name}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  User ID: {details.loginId}
                </p>
              </div>

              {promoCode ? (
                <>
                  <label
                    htmlFor="customer-promo-code"
                    className="mt-5 block text-[10px] font-black tracking-widest text-violet-300"
                  >
                    YOUR PROMO CODE
                  </label>

                  <input
                    ref={codeInput}
                    id="customer-promo-code"
                    type="text"
                    value={promoCode}
                    readOnly
                    spellCheck={false}
                    onClick={event => event.currentTarget.select()}
                    className="mt-3 w-full rounded-xl border border-violet-400/40 bg-violet-400/10 px-3 py-5 text-center text-xl font-black tracking-wider text-violet-200 outline-none"
                  />

                  <button
                    type="button"
                    onClick={copyPromoCode}
                    className="mt-4 w-full rounded-xl bg-violet-500 px-4 py-3 text-sm font-black transition active:scale-[0.98]"
                  >
                    COPY PROMO CODE
                  </button>

                  {message && (
                    <p
                      role="status"
                      className="mt-3 text-center text-xs text-emerald-300"
                    >
                      {message}
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm leading-6 text-amber-200">
                  మీకు ఇంకా ప్రోమో కోడ్ కేటాయించలేదు.
                  ప్రోమో కోడ్ కోసం Admin‌ను సంప్రదించండి.
                </p>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
