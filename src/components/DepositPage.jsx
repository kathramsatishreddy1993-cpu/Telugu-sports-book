import React, { useMemo, useState } from 'react';

const DEMO_BANK = {
  accountName: 'TELUGU SPORTS BOOK DEMO',
  bankName: 'Demo Bank',
  accountNumber: 'XXXX XXXX 1234',
  ifsc: 'DEMO0001234',
  upiId: 'demo@upi',
};

const paymentMethods = [
  'ACCOUNT',
  'PHONEPE',
  'GPAY',
  'PAYTM',
];

export default function DepositPage({
  user,
  onBack,
}) {
  const [selectedMethod, setSelectedMethod] =
    useState('ACCOUNT');

  const [amount, setAmount] = useState('');
  const [utr, setUtr] = useState('');
  const [proofName, setProofName] =
    useState('');

  const [message, setMessage] =
    useState('');

  const [transactions, setTransactions] =
    useState(() => {
      try {
        const saved = localStorage.getItem(
          'telugu_sports_demo_deposits'
        );

        return saved
          ? JSON.parse(saved)
          : [];
      } catch {
        return [];
      }
    });

  const formattedBalance = useMemo(() => {
    try {
      const saved = Number(
        localStorage.getItem(
          'telugu_sports_demo_balance'
        ) || 10000
      );

      return Number.isFinite(saved)
        ? saved.toLocaleString('en-IN')
        : '10,000';
    } catch {
      return '10,000';
    }
  }, []);

  const handleProofChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      setProofName('');
      return;
    }

    setProofName(file.name);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    setMessage('');

    const numericAmount = Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      setMessage(
        'Please enter a valid demo amount.'
      );
      return;
    }

    if (!utr.trim()) {
      setMessage(
        'Please enter UTR / reference number.'
      );
      return;
    }

    const newTransaction = {
      id: Date.now(),
      amount: numericAmount,
      reference: utr.trim(),
      method: selectedMethod,
      proof: proofName || 'No file selected',
      status: 'PENDING',
      date: new Date().toLocaleString(
        'en-IN'
      ),
    };

    const updatedTransactions = [
      newTransaction,
      ...transactions,
    ];

    setTransactions(updatedTransactions);

    try {
      localStorage.setItem(
        'telugu_sports_demo_deposits',
        JSON.stringify(updatedTransactions)
      );
    } catch {
      // Demo storage unavailable.
    }

    setAmount('');
    setUtr('');
    setProofName('');

    setMessage(
      'Demo deposit request submitted successfully.'
    );
  };

  return (
    <div className="min-h-screen bg-[#062f2b] text-white">

      {/* HEADER */}

      <header className="sticky top-0 z-40 bg-[#9a5a00] px-3 py-3 shadow-lg">
        <div className="flex items-center justify-between gap-3">

          <button
            type="button"
            onClick={onBack}
            className="rounded border border-amber-300 px-3 py-1.5 text-xs font-black"
          >
            ‹ BACK
          </button>

          <div className="text-right">
            <p className="text-[9px] font-black tracking-wider text-amber-200">
              TELUGU SPORTS BOOK
            </p>

            <h1 className="text-sm font-black">
              DEPOSIT
            </h1>
          </div>

        </div>
      </header>

      <main className="mx-auto max-w-xl px-3 py-4">

        {/* USER / BALANCE */}

        <section className="rounded-xl border border-[#17665d] bg-[#083d37] p-3">

          <div className="flex items-center justify-between gap-3">

            <div>
              <p className="text-[9px] font-bold text-gray-300">
                CUSTOMER
              </p>

              <p className="mt-1 text-xs font-black">
                {user?.name ||
                  user?.identifier ||
                  'Demo User'}
              </p>
            </div>

            <div className="text-right">
              <p className="text-[9px] font-bold text-gray-300">
                DEMO BALANCE
              </p>

              <p className="mt-1 text-sm font-black text-amber-300">
                🪙 {formattedBalance}
              </p>
            </div>

          </div>

        </section>

        {/* DEMO NOTICE */}

        <section className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">

          <p className="text-[10px] font-black text-amber-300">
            DEMO DEPOSIT
          </p>

          <p className="mt-1 text-[10px] leading-5 text-gray-300">
            This page is for demonstration
            purposes only. No real payment is
            processed.
          </p>

        </section>

        {/* PAYMENT METHOD */}

        <section className="mt-4">

          <h2 className="mb-2 text-xs font-black">
            SELECT METHOD
          </h2>

          <div className="grid grid-cols-4 gap-1">

            {paymentMethods.map((method) => (
              <button
                key={method}
                type="button"
                onClick={() =>
                  setSelectedMethod(method)
                }
                className={`rounded border px-1 py-2 text-[8px] font-black ${
                  selectedMethod === method
                    ? 'border-amber-400 bg-amber-500 text-black'
                    : 'border-[#28655f] bg-[#0a4942] text-white'
                }`}
              >
                {method}
              </button>
            ))}

          </div>

        </section>

        {/* PAYMENT DETAILS */}

        <section className="mt-3 overflow-hidden rounded-xl border border-[#28655f] bg-[#083d37]">

          <div className="bg-[#0b6259] px-3 py-2">
            <h2 className="text-xs font-black">
              {selectedMethod} DETAILS
            </h2>
          </div>

          <div className="space-y-3 p-3">

            {selectedMethod ===
              'ACCOUNT' && (
              <>
                <DetailRow
                  label="Account Name"
                  value={
                    DEMO_BANK.accountName
                  }
                />

                <DetailRow
                  label="Bank"
                  value={
                    DEMO_BANK.bankName
                  }
                />

                <DetailRow
                  label="Account Number"
                  value={
                    DEMO_BANK.accountNumber
                  }
                />

                <DetailRow
                  label="IFSC"
                  value={DEMO_BANK.ifsc}
                />
              </>
            )}

            {selectedMethod !==
              'ACCOUNT' && (
              <>
                <DetailRow
                  label={`${selectedMethod} UPI`}
                  value={DEMO_BANK.upiId}
                />

                <div className="flex min-h-[150px] items-center justify-center rounded-lg border border-dashed border-gray-500 bg-black/20">

                  <div className="text-center">

                    <div className="text-4xl">
                      ▦
                    </div>

                    <p className="mt-2 text-[10px] font-black text-gray-300">
                      DEMO QR
                    </p>

                  </div>

                </div>
              </>
            )}

          </div>

        </section>

        {/* DEPOSIT FORM */}

        <form
          onSubmit={handleSubmit}
          className="mt-4 rounded-xl border border-[#28655f] bg-[#083d37] p-3"
        >

          <h2 className="text-sm font-black text-amber-300">
            DEPOSIT REQUEST
          </h2>

          {/* AMOUNT */}

          <label className="mt-4 block">

            <span className="text-[10px] font-black text-gray-300">
              AMOUNT
            </span>

            <input
              type="number"
              inputMode="decimal"
              min="1"
              value={amount}
              onChange={(event) =>
                setAmount(
                  event.target.value
                )
              }
              placeholder="Enter amount"
              className="mt-1.5 h-[44px] w-full rounded-md border border-[#39756f] bg-[#062f2b] px-3 text-sm font-bold text-white outline-none"
            />

          </label>

          {/* QUICK AMOUNTS */}

          <div className="mt-2 grid grid-cols-4 gap-1">

            {[500, 1000, 2000, 5000].map(
              (value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setAmount(
                      String(value)
                    )
                  }
                  className="rounded border border-amber-500/50 bg-black/20 py-2 text-[9px] font-black text-amber-300"
                >
                  ₹
                  {value.toLocaleString(
                    'en-IN'
                  )}
                </button>
              )
            )}

          </div>

          {/* UTR */}

          <label className="mt-4 block">

            <span className="text-[10px] font-black text-gray-300">
              UTR / REFERENCE NUMBER
            </span>

            <input
              type="text"
              value={utr}
              onChange={(event) =>
                setUtr(
                  event.target.value
                )
              }
              placeholder="Enter reference number"
              className="mt-1.5 h-[44px] w-full rounded-md border border-[#39756f] bg-[#062f2b] px-3 text-sm font-bold text-white outline-none"
            />

          </label>

          {/* PROOF */}

          <label className="mt-4 block">

            <span className="text-[10px] font-black text-gray-300">
              UPLOAD PAYMENT PROOF
            </span>

            <input
              type="file"
              accept="image/*"
              onChange={
                handleProofChange
              }
              className="mt-1.5 block w-full rounded-md border border-[#39756f] bg-[#062f2b] p-2 text-[10px] text-gray-300"
            />

          </label>

          {proofName && (
            <p className="mt-2 text-[9px] text-green-300">
              ✓ {proofName}
            </p>
          )}

          {/* MESSAGE */}

          {message && (
            <div className="mt-3 rounded-md border border-amber-500/30 bg-black/20 p-2 text-[10px] font-bold text-amber-200">
              {message}
            </div>
          )}

          {/* SUBMIT */}

          <button
            type="submit"
            className="mt-4 h-[44px] w-full rounded-md border border-white bg-green-700 text-xs font-black text-white shadow-lg"
          >
            SUBMIT DEMO DEPOSIT
          </button>

        </form>

        {/* HISTORY */}

        <section className="mt-4 overflow-hidden rounded-xl border border-[#28655f] bg-[#083d37]">

          <div className="bg-[#0b6259] px-3 py-2">
            <h2 className="text-xs font-black">
              DEPOSIT REQUESTS
            </h2>
          </div>

          {transactions.length === 0 ? (
            <div className="px-3 py-6 text-center">

              <p className="text-[10px] text-gray-400">
                No demo deposit requests yet.
              </p>

            </div>
          ) : (
            <div>

              {transactions.map(
                (transaction) => (
                  <div
                    key={
                      transaction.id
                    }
                    className="border-b border-[#28655f] p-3 last:border-b-0"
                  >

                    <div className="flex items-start justify-between gap-2">

                      <div>
                        <p className="text-sm font-black text-white">
                          ₹
                          {Number(
                            transaction.amount
                          ).toLocaleString(
                            'en-IN'
                          )}
                        </p>

                        <p className="mt-1 text-[9px] text-gray-400">
                          {
                            transaction.method
                          }
                        </p>
                      </div>

                      <span className="rounded bg-amber-500/20 px-2 py-1 text-[8px] font-black text-amber-300">
                        {
                          transaction.status
                        }
                      </span>

                    </div>

                    <p className="mt-2 text-[9px] text-gray-300">
                      Ref:{' '}
                      {
                        transaction.reference
                      }
                    </p>

                    <p className="mt-1 text-[8px] text-gray-500">
                      {transaction.date}
                    </p>

                  </div>
                )
              )}

            </div>
          )}

        </section>

        {/* FOOTER NOTICE */}

        <p className="px-4 py-6 text-center text-[9px] leading-4 text-gray-400">
          For demonstration and informational
          purposes only. No real-money
          transactions.
        </p>

      </main>

    </div>
  );
}

function DetailRow({
  label,
  value,
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2 last:border-b-0">

      <span className="text-[9px] font-bold text-gray-400">
        {label}
      </span>

      <span className="text-right text-[10px] font-black text-white">
        {value}
      </span>

    </div>
  );
}
