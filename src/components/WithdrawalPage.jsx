import React, { useEffect, useState } from 'react';

const ACCOUNT_KEY = 'tsb_demo_withdrawal_account';
const TRANSACTION_KEY = 'tsb_demo_withdrawal_transactions';
const BALANCE_KEY = 'tsb_demo_coin_balance';

const STARTING_BALANCE = 10000;

export default function WithdrawalPage({ onBack }) {
  const [showAddAccount, setShowAddAccount] = useState(false);

  const [account, setAccount] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(ACCOUNT_KEY)) || null;
    } catch {
      return null;
    }
  });

  const [transactions, setTransactions] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(TRANSACTION_KEY)) || [];
    } catch {
      return [];
    }
  });

  const [balance, setBalance] = useState(() => {
    const saved = localStorage.getItem(BALANCE_KEY);
    return saved === null ? STARTING_BALANCE : Number(saved);
  });

  const [form, setForm] = useState({
    holderName: '',
    accountNumber: '',
    confirmAccountNumber: '',
    ifsc: '',
    password: '',
    confirmPassword: '',
  });

  const [amount, setAmount] = useState('');
  const [withdrawPassword, setWithdrawPassword] = useState('');

  useEffect(() => {
    localStorage.setItem(
      TRANSACTION_KEY,
      JSON.stringify(transactions)
    );
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(BALANCE_KEY, String(balance));
  }, [balance]);

  const updateForm = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const saveAccount = (e) => {
    e.preventDefault();

    if (!form.holderName.trim()) {
      alert('Enter account holder name');
      return;
    }

    if (!/^[0-9]{9,18}$/.test(form.accountNumber)) {
      alert('Enter a valid account number');
      return;
    }

    if (form.accountNumber !== form.confirmAccountNumber) {
      alert('Account numbers do not match');
      return;
    }

    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifsc.toUpperCase())) {
      alert('Enter a valid IFSC code');
      return;
    }

    if (form.password.length < 6) {
      alert('Withdrawal password must contain at least 6 characters');
      return;
    }

    if (form.password !== form.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    const newAccount = {
      holderName: form.holderName.trim(),
      accountNumber: form.accountNumber,
      ifsc: form.ifsc.toUpperCase(),
      password: form.password,
    };

    localStorage.setItem(
      ACCOUNT_KEY,
      JSON.stringify(newAccount)
    );

    setAccount(newAccount);
    setShowAddAccount(false);

    setForm({
      holderName: '',
      accountNumber: '',
      confirmAccountNumber: '',
      ifsc: '',
      password: '',
      confirmPassword: '',
    });

    alert('Demo account added successfully');
  };

  const handleWithdraw = (e) => {
    e.preventDefault();

    if (!account) {
      alert('Please add an account first');
      return;
    }

    const value = Number(amount);

    if (!Number.isInteger(value) || value < 100) {
      alert('Minimum withdrawal is 100 demo coins');
      return;
    }

    if (value > balance) {
      alert('LOW BALANCE');
      return;
    }

    if (withdrawPassword !== account.password) {
      alert('Incorrect withdrawal password');
      return;
    }

    const transaction = {
      id: `TSBW${Date.now()}`,
      amount: value,
      status: 'PENDING',
      date: new Date().toLocaleString('en-IN'),
    };

    setBalance((previous) => previous - value);

    setTransactions((previous) => [
      transaction,
      ...previous,
    ]);

    setAmount('');
    setWithdrawPassword('');

    alert('Demo withdrawal request submitted. Status: PENDING');
  };

  const maskAccount = (number) => {
    if (!number) return '';
    return `XXXX XXXX ${number.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-[#f3f2f7] text-gray-900">

      {/* HEADER */}
      <header className="bg-teal-800 px-4 py-4 text-white">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-black">
            TELUGU SPORTS BOOK
          </h1>

          <span className="text-xs font-bold">
            DEMO
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5">

        {/* BACK */}
        <button
          type="button"
          onClick={onBack}
          className="mb-5 rounded-lg bg-amber-700 px-6 py-3 font-bold text-white"
        >
          ← BACK
        </button>

        {/* BALANCE */}
        <div className="mb-5 rounded-xl bg-white p-5 text-center shadow-sm">
          <p className="text-sm font-semibold text-gray-500">
            AVAILABLE DEMO BALANCE
          </p>

          <h2 className="mt-2 text-3xl font-black text-teal-800">
            🪙 {balance.toLocaleString('en-IN')}
          </h2>

          <p className="mt-1 text-xs text-gray-500">
            Demo Coins
          </p>
        </div>

        {/* ADD ACCOUNT BUTTON */}
        <div className="mb-7 text-center">
          <button
            type="button"
            onClick={() => setShowAddAccount(!showAddAccount)}
            className="rounded-full bg-green-600 px-8 py-4 text-lg font-black text-white"
          >
            + ADD ACCOUNT
          </button>
        </div>

        {/* ADD ACCOUNT FORM */}
        {showAddAccount && (
          <form
            onSubmit={saveAccount}
            className="mb-6 space-y-4 rounded-xl bg-white p-5 shadow-sm"
          >
            <h2 className="text-center text-xl font-black">
              ADD BANK ACCOUNT
            </h2>

            <input
              type="text"
              placeholder="Account Holder Name"
              value={form.holderName}
              onChange={(e) =>
                updateForm('holderName', e.target.value)
              }
              className="w-full rounded-lg border p-4"
              required
            />

            <input
              type="text"
              inputMode="numeric"
              placeholder="Bank Account Number"
              value={form.accountNumber}
              onChange={(e) =>
                updateForm('accountNumber', e.target.value)
              }
              className="w-full rounded-lg border p-4"
              required
            />

            <input
              type="text"
              inputMode="numeric"
              placeholder="Confirm Account Number"
              value={form.confirmAccountNumber}
              onChange={(e) =>
                updateForm('confirmAccountNumber', e.target.value)
              }
              className="w-full rounded-lg border p-4"
              required
            />

            <input
              type="text"
              placeholder="IFSC Code"
              value={form.ifsc}
              onChange={(e) =>
                updateForm('ifsc', e.target.value.toUpperCase())
              }
              className="w-full rounded-lg border p-4"
              required
            />

            <input
              type="password"
              placeholder="Create Withdrawal Password"
              value={form.password}
              onChange={(e) =>
                updateForm('password', e.target.value)
              }
              className="w-full rounded-lg border p-4"
              required
            />

            <input
              type="password"
              placeholder="Confirm Withdrawal Password"
              value={form.confirmPassword}
              onChange={(e) =>
                updateForm('confirmPassword', e.target.value)
              }
              className="w-full rounded-lg border p-4"
              required
            />

            <button
              type="submit"
              className="w-full rounded-lg bg-teal-800 py-4 font-bold text-white"
            >
              SAVE ACCOUNT
            </button>
          </form>
        )}

        {/* INSTRUCTIONS */}
        <section className="mb-5 rounded-xl bg-white p-6 shadow-sm">
          <div className="space-y-5 text-sm leading-6 text-red-600">
            <p>
              1. This form is for requesting demo coin
              withdrawals from the main demo wallet only.
            </p>

            <p>
              2. Bonus demo coins are not eligible for
              withdrawal requests.
            </p>

            <p>
              3. Minimum withdrawal request is 100 demo coins.
            </p>

            <p>
              4. Withdrawal requests require sufficient
              available demo coins.
            </p>

            <p>
              5. Demo requests are reviewed by the administrator.
            </p>

            <p>
              6. No real money is transferred through this
              demonstration system.
            </p>
          </div>
        </section>

        {/* SUPPORT */}
        <section className="mb-6 rounded-xl bg-white p-3">
          <div className="rounded-2xl bg-amber-700 px-4 py-5 text-center text-white">
            <p className="text-xs font-black">
              FOR WITHDRAWAL PASSWORD RELATED ISSUES
            </p>

            <p className="mt-2 text-2xl">
              💬
            </p>

            <p className="mt-1 text-xs">
              Contact Demo Support
            </p>
          </div>
        </section>

        {/* SAVED ACCOUNT */}
        {account ? (
          <section className="mb-6 rounded-xl bg-white p-5 shadow-sm">

            <h2 className="mb-5 text-center text-xl font-black">
              {account.holderName.toUpperCase()}
            </h2>

            <div className="space-y-3 rounded-xl bg-gray-100 p-4">
              <div className="border-b pb-3">
                <p className="text-sm text-gray-500">
                  Account No
                </p>

                <p className="font-semibold">
                  {maskAccount(account.accountNumber)}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  IFSC Code
                </p>

                <p className="font-semibold">
                  {account.ifsc}
                </p>
              </div>
            </div>

            {/* WITHDRAW FORM */}
            <form
              onSubmit={handleWithdraw}
              className="mt-5 space-y-4"
            >
              <input
                type="number"
                min="100"
                step="1"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border p-4"
                required
              />

              <input
                type="password"
                placeholder="Enter Withdrawal Password"
                value={withdrawPassword}
                onChange={(e) =>
                  setWithdrawPassword(e.target.value)
                }
                className="w-full rounded-lg border p-4"
                required
              />

              <button
                type="submit"
                className="w-full rounded bg-red-700 py-4 text-lg font-bold text-white"
              >
                WITHDRAW
              </button>
            </form>
          </section>
        ) : (
          <div className="mb-6 rounded-xl bg-white p-6 text-center text-gray-500">
            No account added yet.
            <br />
            Click ADD ACCOUNT to continue.
          </div>
        )}

        {/* TRANSACTION HISTORY */}
        <section className="rounded-xl bg-white p-4 shadow-sm">

          <h2 className="mb-4 text-xl font-black">
            WITHDRAWAL HISTORY
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-sm">
              <thead className="bg-teal-800 text-white">
                <tr>
                  <th className="p-3 text-left">
                    Transaction No
                  </th>

                  <th className="p-3">
                    Coins
                  </th>

                  <th className="p-3">
                    Status
                  </th>

                  <th className="p-3">
                    Date
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
                      No withdrawal requests yet
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="border-b text-center"
                    >
                      <td className="p-3 text-left">
                        {tx.id}
                      </td>

                      <td className="p-3">
                        {tx.amount}
                      </td>

                      <td className="p-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            tx.status === 'SUCCESS'
                              ? 'bg-green-100 text-green-700'
                              : tx.status === 'REJECTED'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>

                      <td className="p-3">
                        {tx.date}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </section>

        <p className="py-6 text-center text-xs text-gray-500">
          Demo Withdrawal System — No Real Money Transfers
        </p>

      </main>
    </div>
  );
}
