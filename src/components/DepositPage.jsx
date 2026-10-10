import React, { useState } from 'react';

const DEMO_BANK = {
  bankName: '',
  accountNumber: '',
  ifsc: '',
  accountHolder: '',
  minAmount: 300,
  maxAmount: 100000,
};

const METHODS = [
  { name: 'WHATSAPP DEPOSIT', icon: '🟢' },
  { name: 'ACCOUNT', icon: '🏦' },
  { name: 'PAYTM', icon: '💳' },
  { name: 'GPAY', icon: '💳' },
];

const INSTRUCTIONS = [
  'This page is for demonstration purposes only.',
  'Enter an amount and select SUBMIT to continue.',
  'Only administrator-configured demo account information will be displayed.',
  'Enter a 6 to 12 digit demo reference number.',
  'Upload a sample image to test the request form.',
  'Submitted demo requests will appear as PENDING in Transaction History.',
];

export default function DepositPage({ onBack }) {
  const [step, setStep] = useState(1);

  const [method, setMethod] = useState('ACCOUNT');
  const [amount, setAmount] = useState('');
  const [utr, setUtr] = useState('');
  const [proof, setProof] = useState(null);

  const [transactions, setTransactions] = useState([]);

  const bankConfigured = Boolean(
    DEMO_BANK.bankName &&
    DEMO_BANK.accountNumber &&
    DEMO_BANK.ifsc &&
    DEMO_BANK.accountHolder
  );

  const handleAmountSubmit = (event) => {
    event.preventDefault();

    const value = Number(amount);

    if (
      !Number.isFinite(value) ||
      value < DEMO_BANK.minAmount ||
      value > DEMO_BANK.maxAmount
    ) {
      alert(
        `Enter an amount between ${DEMO_BANK.minAmount} and ${DEMO_BANK.maxAmount}`
      );
      return;
    }

    setStep(2);
    window.scrollTo(0, 0);
  };

  const handleRequestSubmit = (event) => {
    event.preventDefault();

    if (!/^[0-9]{6,12}$/.test(utr)) {
      alert('Enter a valid 6 to 12 digit demo reference');
      return;
    }

    if (!proof) {
      alert('Please upload a sample image');
      return;
    }

    const transaction = {
      id: `TSB${Date.now()}`,
      amount: Number(amount),
      utr,
      method,
      status: 'PENDING',
      date: new Date().toLocaleString('en-IN'),
    };

    setTransactions((previous) => [
      transaction,
      ...previous,
    ]);

    setAmount('');
    setUtr('');
    setProof(null);
    setMethod('ACCOUNT');

    setStep(1);
    window.scrollTo(0, 0);

    alert('Demo request submitted. Status: PENDING');
  };

  return (
    <div className="min-h-screen bg-[#f3f2f7] text-gray-900">

      {/* HEADER */}
      <header className="bg-[#116258] px-4 py-4 text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <h1 className="text-lg font-black italic text-amber-300">
            TELUGU SPORTS BOOK
          </h1>

          <span className="text-xs font-bold">
            DEMO
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-3 py-5">

        {/* BACK BUTTON */}
        <button
          type="button"
          onClick={() => {
            if (step === 2) {
              setStep(1);
            } else {
              onBack?.();
            }
          }}
          className="mb-5 rounded-lg bg-[#895000] px-6 py-3 font-semibold text-white"
        >
          ← BACK
        </button>

        {step === 1 ? (
          <>
            {/* STEP 1: AMOUNT */}
            <section className="mb-5 rounded-lg bg-white p-5 shadow-sm">
              <form onSubmit={handleAmountSubmit}>

                <label
                  htmlFor="depositAmount"
                  className="mb-3 block text-base font-bold"
                >
                  Amount
                </label>

                <div className="flex overflow-hidden rounded-lg border border-gray-300">

                  <input
                    id="depositAmount"
                    type="number"
                    min={DEMO_BANK.minAmount}
                    max={DEMO_BANK.maxAmount}
                    step="1"
                    value={amount}
                    onChange={(event) =>
                      setAmount(event.target.value)
                    }
                    placeholder="Enter amount"
                    className="min-w-0 flex-1 px-4 py-4 text-base outline-none"
                    required
                  />

                  <button
                    type="submit"
                    className="shrink-0 bg-[#116258] px-5 py-4 font-extrabold text-white"
                  >
                    SUBMIT
                  </button>

                </div>

              </form>
            </section>

            {/* STEP 1: INSTRUCTIONS */}
            <section className="mb-5 rounded-lg bg-white px-5 py-7 shadow-sm">

              <h2 className="mb-5 text-lg font-extrabold">
                DEPOSIT INSTRUCTIONS
              </h2>

              <div className="space-y-6">
                {INSTRUCTIONS.map((instruction, index) => (
                  <p
                    key={index}
                    className="text-sm leading-7 text-red-600"
                  >
                    {index + 1}. {instruction}
                  </p>
                ))}
              </div>

            </section>

            {/* STEP 1: TRANSACTION HISTORY */}
            <section className="rounded-lg bg-white p-4 shadow-sm">

              <h2 className="mb-5 text-xl font-extrabold">
                TRANSACTION HISTORY
              </h2>

              <div className="overflow-x-auto">

                <table className="w-full min-w-[570px] border-collapse text-sm">

                  <thead className="bg-[#116258] text-white">
                    <tr>
                      <th className="p-3 text-left">
                        TRANSACTION NO
                      </th>
                      <th className="p-3 text-left">
                        AMOUNT
                      </th>
                      <th className="p-3 text-left">
                        STATUS
                      </th>
                      <th className="p-3 text-left">
                        DATE
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {transactions.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="p-6 text-center text-gray-500"
                        >
                          No demo transactions yet
                        </td>
                      </tr>
                    ) : (
                      transactions.map((transaction) => (
                        <tr
                          key={transaction.id}
                          className="border-b even:bg-gray-50"
                        >
                          <td className="p-3">
                            {transaction.id}
                          </td>

                          <td className="p-3">
                            {transaction.amount.toFixed(2)}
                          </td>

                          <td className="p-3">
                            <span className="rounded border border-amber-500 bg-amber-50 px-3 py-1 font-bold text-amber-700">
                              {transaction.status}
                            </span>
                          </td>

                          <td className="p-3">
                            {transaction.date}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>

                </table>

              </div>
            </section>
          </>
        ) : (
          <>
            {/* STEP 2: SELECT METHOD */}
            <section className="mb-4 rounded-2xl bg-white p-3 shadow-sm">

              <div className="grid grid-cols-4 gap-1">

                {METHODS.map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setMethod(item.name)}
                    className={`flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border px-1 py-3 text-center ${
                      method === item.name
                        ? 'border-teal-800 bg-[#116258] text-white'
                        : 'border-gray-300 bg-white text-gray-900'
                    }`}
                  >
                    <span className="text-[10px] font-extrabold sm:text-sm">
                      {item.name}
                    </span>

                    <span className="text-2xl">
                      {item.icon}
                    </span>
                  </button>
                ))}

              </div>
            </section>

            {/* STEP 2: BANK DETAILS */}
            <section className="mb-5 rounded-lg bg-white p-5 shadow-sm">

              <h2 className="mb-5 text-center text-2xl font-extrabold">
                {method === 'ACCOUNT'
                  ? 'BANK ACCOUNT'
                  : method}
              </h2>

              {method === 'ACCOUNT' ? (
                bankConfigured ? (
                  <div className="space-y-3 rounded-2xl bg-[#f3f2f7] p-4">

                    {[
                      ['Bank Name', DEMO_BANK.bankName],
                      ['A/C No', DEMO_BANK.accountNumber],
                      ['IFSC Code', DEMO_BANK.ifsc],
                      ['Account Name', DEMO_BANK.accountHolder],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="flex items-center justify-between gap-2 border-b pb-2"
                      >
                        <span className="text-sm font-bold">
                          {label}
                        </span>

                        <span className="break-all text-right text-sm">
                          {value}
                        </span>
                      </div>
                    ))}

                  </div>
                ) : (
                  <div className="rounded-xl bg-gray-100 p-6 text-center text-sm text-gray-500">
                    Demo bank details are not configured.
                  </div>
                )
              ) : (
                <div className="rounded-xl bg-gray-100 p-6 text-center text-sm text-gray-500">
                  {method} demo details are not configured.
                </div>
              )}

              <div className="mt-4 rounded-xl bg-gray-100 p-4 text-sm">

                <p>
                  <strong>Min Amount:</strong>{' '}
                  {DEMO_BANK.minAmount}
                </p>

                <p className="mt-2">
                  <strong>Max Amount:</strong>{' '}
                  {DEMO_BANK.maxAmount}
                </p>

              </div>

            </section>

            {/* STEP 2: REQUEST FORM */}
            <form
              onSubmit={handleRequestSubmit}
              className="space-y-5 rounded-lg bg-white p-5 shadow-sm"
            >

              <h2 className="text-xl font-extrabold">
                DEMO DEPOSIT REQUEST
              </h2>

              <div>
                <label className="mb-2 block font-bold">
                  Amount
                </label>

                <div className="rounded-lg border bg-gray-100 p-4 font-bold">
                  {Number(amount).toFixed(2)}
                </div>
              </div>

              <div>
                <label
                  htmlFor="demoUtr"
                  className="mb-2 block font-bold"
                >
                  Demo Transaction Reference *
                </label>

                <input
                  id="demoUtr"
                  type="text"
                  inputMode="numeric"
                  maxLength={12}
                  value={utr}
                  onChange={(event) =>
                    setUtr(
                      event.target.value.replace(/\D/g, '')
                    )
                  }
                  placeholder="6 to 12 digit reference"
                  className="w-full rounded-lg border border-gray-300 p-4 outline-none focus:border-teal-700"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="demoProof"
                  className="mb-2 block font-bold"
                >
                  Upload Demo Payment Proof *
                </label>

                <input
                  id="demoProof"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) =>
                    setProof(event.target.files?.[0] || null)
                  }
                  className="w-full rounded-lg border border-gray-300 p-3"
                  required={!proof}
                />

                {proof && (
                  <p className="mt-2 text-sm text-green-700">
                    Selected: {proof.name}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-[#116258] py-4 font-extrabold text-white"
              >
                SUBMIT DEMO REQUEST
              </button>

            </form>
          </>
        )}

        <p className="py-6 text-center text-xs text-gray-500">
          Demo interface only. No real payments are processed.
        </p>

      </main>
    </div>
  );
}
