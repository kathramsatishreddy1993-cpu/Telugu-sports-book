import React, { useState } from 'react';

const DEFAULT_VALUES = [
  100,
  200,
  500,
  1000,
  2000,
  5000,
  10000,
  25000,
];

const STORAGE_KEY = 'tsb_demo_button_values';

export default function SetButtonValuesPage({ user, onBack }) {
  const [values, setValues] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (!saved) {
        return DEFAULT_VALUES;
      }

      const parsed = JSON.parse(saved);

      if (
        Array.isArray(parsed) &&
        parsed.length === 8
      ) {
        return parsed;
      }

      return DEFAULT_VALUES;
    } catch (error) {
      console.error(
        'Unable to load demo button values:',
        error
      );

      return DEFAULT_VALUES;
    }
  });

  const [message, setMessage] = useState('');

  const handleChange = (index, value) => {
    const updatedValues = [...values];

    updatedValues[index] = value;

    setValues(updatedValues);
    setMessage('');
  };

  const handleUpdate = () => {
    const cleanedValues = values.map((value) =>
      Number(value)
    );

    const invalidValue = cleanedValues.some(
      (value) =>
        !Number.isFinite(value) ||
        value <= 0
    );

    if (invalidValue) {
      setMessage(
        'Please enter a valid value greater than 0 in all 8 fields.'
      );

      return;
    }

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(cleanedValues)
    );

    setValues(cleanedValues);

    setMessage(
      'Demo button values updated successfully.'
    );
  };

  const handleReset = () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(DEFAULT_VALUES)
    );

    setValues(DEFAULT_VALUES);

    setMessage(
      'Default demo button values restored.'
    );
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-gray-900">

      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-[#895000] px-3 py-3 text-white shadow">

        <div className="flex items-center justify-between gap-2">

          <button
            type="button"
            onClick={onBack}
            className="rounded-md border border-white/40 bg-black/20 px-3 py-2 text-sm font-bold"
          >
            ← Back
          </button>

          <div className="text-center">
            <h1 className="text-base font-black text-amber-300">
              TELUGU SPORTS
            </h1>

            <p className="text-[9px] font-bold tracking-widest">
              BOOK • DEMO
            </p>
          </div>

          <div className="max-w-24 text-right">
            <p className="truncate text-[10px] font-bold">
              {user?.name || 'Demo User'}
            </p>
          </div>

        </div>

      </header>

      {/* PAGE TITLE */}
      <div className="bg-teal-800 px-4 py-5 text-white">

        <h2 className="text-xl font-extrabold">
          Change Button Values
        </h2>

        <p className="mt-1 text-xs text-teal-100">
          Customize your demo quick stake buttons
        </p>

      </div>

      <main className="mx-auto max-w-2xl p-3">

        {/* VALUES CARD */}
        <section className="overflow-hidden rounded-lg border bg-white shadow-sm">

          <div className="grid grid-cols-2 bg-[#895000] px-4 py-3 text-sm font-extrabold text-white">

            <div>
              Price Label
            </div>

            <div>
              Price Value
            </div>

          </div>

          <div className="divide-y">

            {values.map((value, index) => (

              <div
                key={index}
                className="grid grid-cols-2 items-center gap-3 px-4 py-3"
              >

                <div>
                  <span className="text-sm font-bold text-gray-700">
                    Button {index + 1}
                  </span>
                </div>

                <input
                  type="number"
                  min="1"
                  inputMode="numeric"
                  value={value}
                  onChange={(event) =>
                    handleChange(
                      index,
                      event.target.value
                    )
                  }
                  className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-bold outline-none focus:border-teal-700"
                />

              </div>

            ))}

          </div>

        </section>

        {/* PREVIEW */}
        <section className="mt-4 rounded-lg border bg-white p-4 shadow-sm">

          <h3 className="text-sm font-extrabold text-gray-800">
            Quick Button Preview
          </h3>

          <p className="mt-1 text-xs text-gray-500">
            These values will be used for your demo quick
            stake buttons.
          </p>

          <div className="mt-4 grid grid-cols-4 gap-2">

            {values.map((value, index) => (

              <button
                key={index}
                type="button"
                className="rounded-md bg-sky-300 px-1 py-3 text-xs font-extrabold text-black"
              >
                +{Number(value || 0).toLocaleString('en-IN')}
              </button>

            ))}

          </div>

        </section>

        {/* MESSAGE */}
        {message && (

          <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50 p-3">

            <p className="text-xs font-bold text-teal-800">
              {message}
            </p>

          </div>

        )}

        {/* BUTTONS */}
        <div className="mt-4 grid grid-cols-2 gap-3">

          <button
            type="button"
            onClick={handleReset}
            className="rounded-lg border border-[#895000] bg-white py-3 text-sm font-extrabold text-[#895000]"
          >
            RESET
          </button>

          <button
            type="button"
            onClick={handleUpdate}
            className="rounded-lg bg-teal-800 py-3 text-sm font-extrabold text-white"
          >
            UPDATE
          </button>

        </div>

        {/* DEMO NOTICE */}
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">

          <p className="text-xs font-extrabold text-amber-900">
            DEMO BUTTON VALUES
          </p>

          <p className="mt-1 text-[11px] leading-5 text-amber-800">
            These settings are used only for simulated demo
            play with demo coins. They do not represent
            real-money transactions.
          </p>

        </div>

        <button
          type="button"
          onClick={onBack}
          className="mt-4 w-full rounded-lg bg-[#895000] py-3 text-sm font-extrabold text-white"
        >
          ← BACK TO HOME
        </button>

      </main>

    </div>
  );
}
