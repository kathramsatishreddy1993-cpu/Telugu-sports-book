import React, { useState } from 'react';

const DEMO_BANK = {
  bankName: '',
  accountNumber: '',
  ifsc: '',
  accountHolder: '',
  minAmount: 300,
  maxAmount: 100000,
};

export default function DepositPage({ onBack }) {
  const [method, setMethod] = useState('ACCOUNT');
  const [amount, setAmount] = useState('');
  const [utr, setUtr] = useState('');
  const [proof, setProof] = useState(null);
  const [transactions, setTransactions] = useState([]);

  const methods = [
    'WHATSAPP DEPOSIT',
    'ACCOUNT',
    'PAYTM',
    'GPAY',
  ];

  const handleSubmit = (e) => {
    e.preventDefault();

    const value = Number(amount);

    if (!Number.isFinite(value) || value < 300 || value > 100000) {
      alert('Enter an amount between 300 and 100000');
      return;
    }

    if (!/^[0-9]{6,12}$/.test(utr)) {
      alert('Enter a valid 6–12 digit demo reference number');
      return;
    }

    if (!proof) {
      alert('Please upload a demo payment screenshot');
      return;
    }

    const transaction = {
      id: `TSB${Date.now()}`,
      amount: value,
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

    alert('Demo request submitted successfully');
  };

  return (
    <div className="min-h-screen bg-[#f3f2f7] text-gray-900">

      {/* HEADER */}
      <header className="bg-teal-800 text-white p-4 flex justify-between items-center">
        <h1 className="font-black text-lg">
          TELUGU SPORTS BOOK
        </h1>

        <span className="text-xs">
          DEMO
        </span>
      </header>

      <main className="max-w-3xl mx-auto p-4">

        {/* BACK */}
        <button
          type="button"
          onClick={onBack}
          className="bg-amber-700 text-white px-6 py-3 rounded-lg mb-5"
        >
          ← BACK
        </button>

        {/* PAYMENT METHODS */}
        <div className="bg-white rounded-2xl p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {methods.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMethod(item)}
              className={`rounded-xl border p-4 text-sm font-bold ${
                method === item
                  ? 'bg-teal-800 text-white'
                  : 'bg-white text-gray-900'
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {/* BANK DETAILS */}
        <section className="bg-white rounded-xl p-5 mb-5">

          <h2 className="text-2xl font-bold text-center mb-5">
            BANK ACCOUNT
          </h2>

          <div className="bg-gray-100 rounded-xl p-4 space-y-3">

            {[
              ['Bank Name', DEMO_BANK.bankName],
              ['A/C No', DEMO_BANK.accountNumber],
              ['IFSC Code', DEMO_BANK.ifsc],
              ['Account Name', DEMO_BANK.accountHolder],
              ['Min Amount', DEMO_BANK.minAmount],
              ['Max Amount', DEMO_BANK.maxAmount],
            ].map(([label, value]) => (
              <div
                key={label}
                className="border-b pb-2 flex justify-between gap-3"
              >
                <span className="font-semibold">
                  {label}
                </span>

                <span className="text-gray-600 break-all">
                  {value || 'Not configured'}
                </span>
              </div>
            ))}

          </div>

          <p className="text-sm text-gray-500 mt-4 text-center">
            Demo bank details are not configured.
          </p>

        </section>

        {/* DEMO REQUEST FORM */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl p-5 space-y-5"
        >

          <h2 className="text-xl font-bold">
            DEMO DEPOSIT REQUEST
          </h2>

          <div>
            <label className="block font-semibold mb-2">
              Amount *
            </label>

            <input
              type="number"
              min="300"
              max="100000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full border rounded-lg p-4"
              required
            />
          </div>

          <div>
            <label className="block font-semibold mb-2">
              Demo Transaction Reference *
            </label>

            <input
              type="text"
              inputMode="numeric"
              maxLength={12}
              value={utr}
              onChange={(e) => setUtr(e.target.value)}
              placeholder="6 to 12 digit reference"
              className="w-full border rounded-lg p-4"
              required
            />
          </div>

          <div>
            <label className="block font-semibold mb-2">
              Upload Demo Payment Proof *
            </label>

            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) =>
                setProof(e.target.files?.[0] || null)
              }
              className="w-full border rounded-lg p-3"
              required={!proof}
            />

            {proof && (
              <p className="text-green-700 text-sm mt-2">
                Selected: {proof.name}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-teal-800 text-white font-bold py-4 rounded-lg"
          >
            SUBMIT DEMO REQUEST
          </button>

        </form>

        {/* TRANSACTION HISTORY */}
        <section className="bg-white rounded-xl p-4 mt-6">

          <h2 className="text-xl font-bold mb-4">
            TRANSACTION HISTORY
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[550px] text-sm">

              <thead className="bg-teal-800 text-white">
                <tr>
                  <th className="p-3 text-left">Transaction No</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">UTR</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>

              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-5 text-center text-gray-500"
                    >
                      No demo transactions yet
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="border-b">
                      <td className="p-3">{tx.id}</td>
                      <td className="p-3">₹{tx.amount}</td>
                      <td className="p-3">{tx.utr}</td>
                      <td className="p-3">
                        <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-bold">
                          {tx.status}
                        </span>
                      </td>
                      <td className="p-3">{tx.date}</td>
                    </tr>
                  ))
                )}
              </tbody>

            </table>
          </div>

        </section>

        <p className="text-center text-xs text-gray-500 py-6">
          Demo interface only. No real payments are processed.
        </p>

      </main>
    </div>
  );
}
