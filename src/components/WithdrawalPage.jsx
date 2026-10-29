import React, { useEffect, useMemo, useState } from 'react';

const AUTH_KEY = 'telugu_sports_auth_user';
const MIN_WITHDRAWAL = 100;
const HISTORY_LIMIT = 20;

const EMPTY_FORM = {
  holderName: '',
  bankName: '',
  accountNumber: '',
  confirmAccountNumber: '',
  ifsc: '',
  password: '',
};

function formatAmount(value) {
  const number = Number(value);

  return `₹${(Number.isFinite(number) ? number : 0).toLocaleString(
    'en-IN',
    { maximumFractionDigits: 2 }
  )}`;
}

function maskAccount(value) {
  return value ? `XXXX XXXX ${String(value).slice(-4)}` : '—';
}

function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return `${date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })} IST`;
}

export default function WithdrawalPage({ user, onBack }) {
  const customer = useMemo(() => {
    let source = user;

    if (!source) {
      try {
        const saved = localStorage.getItem(AUTH_KEY);
        if (saved) source = JSON.parse(saved);
      } catch (error) {
        console.error('Unable to read customer:', error);
      }
    }

    return {
      customerId: Number(source?.id || source?.customerId || 0),
      customerName:
        source?.name ||
        source?.username ||
        source?.loginId ||
        source?.identifier ||
        'Customer',
    };
  }, [user]);

  const accountKey = customer.customerId
    ? `tsb_withdrawal_account_${String(customer.customerId)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '_')}`
    : '';

  const [showAddAccount, setShowAddAccount] = useState(false);
  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [balance, setBalance] = useState(0);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [balanceError, setBalanceError] = useState('');
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [amount, setAmount] = useState('');

  useEffect(() => {
    setAccount(null);
    setShowAddAccount(false);
    setAmount('');
    setForm({ ...EMPTY_FORM });

    if (!accountKey) return;

    try {
      const saved = localStorage.getItem(accountKey);
      if (!saved) return;

      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        setAccount(parsed);
      }
    } catch (error) {
      console.error('Unable to load bank account:', error);
    }
  }, [accountKey]);

  const loadBalance = async () => {
    const customerId = customer.customerId;

    if (!customerId) {
      setBalance(0);
      setBalanceError('Customer ID not available.');
      setBalanceLoading(false);
      return;
    }

    setBalanceLoading(true);
    setBalanceError('');

    try {
      const response = await fetch(
        `/api/customers/${encodeURIComponent(customerId)}/demo-balance`,
        {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || 'Unable to load available balance.'
        );
      }

      const nextBalance = Number(
        data?.balance ??
          data?.demo_coin_balance ??
          data?.customer?.demo_coin_balance ??
          0
      );

      setBalance(Number.isFinite(nextBalance) ? nextBalance : 0);
    } catch (error) {
      console.error('Balance Load Error:', error);
      setBalance(0);
      setBalanceError(
        error?.message || 'Unable to load available balance.'
      );
    } finally {
      setBalanceLoading(false);
    }
  };

  const loadWithdrawalHistory = async () => {
    const customerId = customer.customerId;

    if (!customerId) {
      setTransactions([]);
      setHistoryError('Customer ID not available.');
      setHistoryLoading(false);
      return;
    }

    setHistoryLoading(true);
    setHistoryError('');

    try {
      const response = await fetch(
        `/api/customers/${encodeURIComponent(customerId)}/demo-withdrawals`,
        {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || 'Unable to load withdrawal history.'
        );
      }

      setTransactions(
        Array.isArray(data?.requests) ? data.requests : []
      );
    } catch (error) {
      console.error('Withdrawal History Load Error:', error);
      setTransactions([]);
      setHistoryError(
        error?.message || 'Unable to load withdrawal history.'
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadBalance();
    loadWithdrawalHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer.customerId]);

  const updateForm = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const toggleAccountForm = () => {
    if (showAddAccount) {
      setShowAddAccount(false);
      setForm({ ...EMPTY_FORM });
      return;
    }

    setForm({
      ...EMPTY_FORM,
      holderName: account?.holderName || '',
      bankName: account?.bankName || '',
      accountNumber: account?.accountNumber || '',
      confirmAccountNumber: account?.accountNumber || '',
      ifsc: account?.ifsc || '',
    });

    setShowAddAccount(true);
  };

  const saveAccount = (event) => {
    event.preventDefault();

    if (!accountKey) {
      alert('Customer ID not available');
      return;
    }

    const holderName = form.holderName.trim();
    const bankName = form.bankName.trim();
    const accountNumber = form.accountNumber.trim();
    const confirmAccountNumber = form.confirmAccountNumber.trim();
    const ifsc = form.ifsc.trim().toUpperCase();

    if (!holderName) {
      alert('Enter account holder name');
      return;
    }

    if (!bankName) {
      alert('Enter bank name');
      return;
    }

    if (!/^[0-9]{9,18}$/.test(accountNumber)) {
      alert('Enter a valid account number');
      return;
    }

    if (accountNumber !== confirmAccountNumber) {
      alert('Account numbers do not match');
      return;
    }

    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      alert('Enter a valid IFSC code');
      return;
    }

    // Existing local validation only; this does not verify the
    // withdrawal password against the server.
    // The password is never saved to localStorage.
    if (!form.password || form.password.length < 6) {
      alert('Enter your Withdrawal Password');
      return;
    }

    const newAccount = {
      holderName,
      bankName,
      accountNumber,
      ifsc,
    };

    try {
      localStorage.setItem(accountKey, JSON.stringify(newAccount));
    } catch (error) {
      console.error('Unable to save account:', error);
      alert('Unable to save account');
      return;
    }

    setAccount(newAccount);
    setShowAddAccount(false);
    setForm({ ...EMPTY_FORM });
  };

  const handleWithdraw = async (event) => {
    event.preventDefault();

    if (submitting) return;

    if (!account) {
      alert('Please add a bank account first');
      return;
    }

    const customerId = customer.customerId;

    if (!Number.isInteger(customerId) || customerId <= 0) {
      alert('Customer ID not available');
      return;
    }

    const value = Number(amount);

    if (!Number.isInteger(value) || value < MIN_WITHDRAWAL) {
      alert(`Minimum withdrawal is ${formatAmount(MIN_WITHDRAWAL)}`);
      return;
    }

    if (balanceLoading) {
      alert('Please wait. Available balance is loading.');
      return;
    }

    if (balanceError) {
      alert('Available balance could not be verified.');
      return;
    }

    if (value > balance) {
      alert('LOW BALANCE');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/demo-withdrawals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          customerId,
          amount: value,
          accountHolderName: account.holderName,
          bankName: account.bankName,
          accountNumber: account.accountNumber,
          ifscCode: account.ifsc,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || 'Unable to submit withdrawal request.'
        );
      }

      setAmount('');
      await loadWithdrawalHistory();
      await loadBalance();

      alert('Withdrawal request submitted.');
    } catch (error) {
      console.error('Withdrawal Submit Error:', error);
      alert(
        error?.message || 'Unable to submit withdrawal request.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const deleteAccount = () => {
    if (!window.confirm('Remove saved bank account?')) return;

    try {
      if (accountKey) localStorage.removeItem(accountKey);
    } catch (error) {
      console.error('Unable to remove account:', error);
      alert('Unable to remove saved bank account.');
      return;
    }

    setAccount(null);
    setShowAddAccount(false);
    setForm({ ...EMPTY_FORM });
  };

  const history = transactions
    .filter(
      (transaction) =>
        Number(
          transaction?.customerId ?? transaction?.customer_id
        ) === customer.customerId
    )
    .slice(0, HISTORY_LIMIT);

  return (
    <div className="tsb-withdrawal">
      <style>{`
        .tsb-withdrawal {
          --green: #166534;
          --wine: #722f37;
          --white: #ffffff;
          min-height: 100vh;
          background: var(--white);
          color: var(--green);
          font-family: inherit;
          padding-bottom: 30px;
        }

        .tsb-withdrawal,
        .tsb-withdrawal * {
          box-sizing: border-box;
        }

        .tsb-withdrawal button,
        .tsb-withdrawal input {
          font: inherit;
        }

        .tsb-withdrawal button {
          cursor: pointer;
          transition: opacity .15s ease;
        }

        .tsb-withdrawal button:hover {
          opacity: .9;
        }

        .tsb-withdrawal button:disabled {
          cursor: not-allowed;
          opacity: .5;
        }

        .tsb-withdrawal button:focus-visible,
        .tsb-withdrawal input:focus-visible {
          outline: 3px solid var(--wine);
          outline-offset: 3px;
        }

        .tsb-withdrawal .wd-header {
          background: var(--green);
          color: var(--white);
          border-bottom: 4px solid var(--wine);
          padding: 18px 16px;
        }

        .tsb-withdrawal .wd-header-inner,
        .tsb-withdrawal .wd-main {
          width: 100%;
          max-width: 768px;
          margin: 0 auto;
        }

        .tsb-withdrawal .wd-brand {
          margin: 0 0 5px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.5px;
        }

        .tsb-withdrawal h1 {
          margin: 0;
          font-size: 22px;
          font-weight: 900;
        }

        .tsb-withdrawal .wd-main {
          padding: 20px 16px;
        }

        .tsb-withdrawal .wd-button {
          border: 1px solid var(--green);
          border-radius: 10px;
          background: var(--green);
          color: var(--white);
          padding: 12px 18px;
          font-size: 12px;
          font-weight: 900;
        }

        .tsb-withdrawal .wd-wine {
          background: var(--wine);
          border-color: var(--wine);
        }

        .tsb-withdrawal .wd-back {
          margin-bottom: 18px;
        }

        .tsb-withdrawal .wd-card {
          background: var(--white);
          border: 1px solid var(--green);
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .tsb-withdrawal .wd-wallet {
          text-align: center;
          border: 2px solid var(--green);
        }

        .tsb-withdrawal .wd-caption {
          margin: 0;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .5px;
        }

        .tsb-withdrawal .wd-balance-box {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          max-width: 100%;
          margin-top: 14px;
          border: 2px solid var(--green);
          border-radius: 14px;
          padding: 14px 20px;
          background: var(--white);
        }

        .tsb-withdrawal .wd-rupee {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: 42px;
          height: 42px;
          border-radius: 10px;
          background: var(--green);
          color: var(--white);
          font-size: 28px;
          font-weight: 900;
        }

        .tsb-withdrawal .wd-balance {
          min-width: 0;
          overflow-wrap: anywhere;
          font-size: clamp(24px, 7vw, 36px);
          font-weight: 900;
          line-height: 1.2;
        }

        .tsb-withdrawal .wd-note {
          margin: 10px 0 0;
          font-size: 11px;
          line-height: 1.6;
          color: var(--wine);
        }

        .tsb-withdrawal .wd-error {
          margin: 12px 0;
          color: var(--wine);
          font-size: 12px;
          font-weight: 800;
          overflow-wrap: anywhere;
        }

        .tsb-withdrawal .wd-center {
          text-align: center;
          margin-bottom: 20px;
        }

        .tsb-withdrawal .wd-title {
          margin: 0 0 12px;
          font-size: 18px;
          font-weight: 900;
        }

        .tsb-withdrawal .wd-form {
          display: grid;
          gap: 16px;
        }

        .tsb-withdrawal .wd-label {
          display: block;
          margin-bottom: 7px;
          font-size: 11px;
          font-weight: 900;
        }

        .tsb-withdrawal .wd-input {
          width: 100%;
          min-width: 0;
          border: 1px solid var(--green);
          border-radius: 10px;
          padding: 14px;
          background: var(--white);
          color: var(--green);
          font-size: 16px;
        }

        .tsb-withdrawal .wd-input::placeholder {
          color: var(--green);
          opacity: .7;
        }

        .tsb-withdrawal .wd-full {
          width: 100%;
          padding: 16px;
          font-size: 15px;
        }

        .tsb-withdrawal .wd-information {
          margin: 0;
          padding-left: 18px;
          color: var(--wine);
          font-size: 12px;
          line-height: 1.8;
        }

        .tsb-withdrawal .wd-information li + li {
          margin-top: 6px;
        }

        .tsb-withdrawal .wd-account-heading,
        .tsb-withdrawal .wd-history-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
        }

        .tsb-withdrawal .wd-holder {
          margin: 5px 0 0;
          font-size: 18px;
          font-weight: 900;
          overflow-wrap: anywhere;
        }

        .tsb-withdrawal .wd-account-details {
          border: 1px solid var(--green);
          border-radius: 12px;
          overflow: hidden;
        }

        .tsb-withdrawal .wd-account-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 13px;
          border-bottom: 1px solid var(--green);
          font-size: 12px;
        }

        .tsb-withdrawal .wd-account-row:last-child {
          border-bottom: 0;
        }

        .tsb-withdrawal .wd-account-value {
          font-weight: 800;
          text-align: right;
          overflow-wrap: anywhere;
          min-width: 0;
        }

        .tsb-withdrawal .wd-withdraw-form {
          margin-top: 20px;
        }

        .tsb-withdrawal .wd-amount-wrap {
          display: flex;
          align-items: center;
          border: 1px solid var(--green);
          border-radius: 10px;
          overflow: hidden;
        }

        .tsb-withdrawal .wd-amount-prefix {
          align-self: stretch;
          display: flex;
          align-items: center;
          padding: 0 16px;
          background: var(--green);
          color: var(--white);
          font-size: 23px;
          font-weight: 900;
        }

        .tsb-withdrawal .wd-amount-wrap input {
          border: 0;
          border-radius: 0;
        }

        .tsb-withdrawal .wd-quick {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
        }

        .tsb-withdrawal .wd-quick button {
          border: 1px solid var(--green);
          border-radius: 8px;
          padding: 12px 3px;
          background: var(--white);
          color: var(--green);
          font-size: 12px;
          font-weight: 900;
        }

        .tsb-withdrawal .wd-quick button[aria-pressed="true"] {
          background: var(--green);
          color: var(--white);
        }

        .tsb-withdrawal .wd-empty {
          text-align: center;
          font-size: 13px;
          line-height: 1.8;
        }

        .tsb-withdrawal .wd-history {
          padding: 0;
          overflow: hidden;
        }

        .tsb-withdrawal .wd-history-heading {
          padding: 18px 16px 0;
        }

        .tsb-withdrawal .wd-history-heading .wd-title {
          font-size: 16px;
          margin-bottom: 5px;
        }

        .tsb-withdrawal .wd-history-caption {
          margin: 0;
          font-size: 10px;
        }

        .tsb-withdrawal .wd-history-error {
          margin: 0 16px 16px;
          padding: 12px;
          border: 1px solid var(--wine);
          border-radius: 8px;
        }

        .tsb-withdrawal .wd-table-scroll {
          overflow-x: auto;
        }

        .tsb-withdrawal table {
          border-collapse: collapse;
          width: 100%;
          min-width: 560px;
          font-size: 12px;
        }

        .tsb-withdrawal thead {
          background: var(--green);
          color: var(--white);
        }

        .tsb-withdrawal th,
        .tsb-withdrawal td {
          padding: 13px;
          text-align: left;
        }

        .tsb-withdrawal tbody tr + tr {
          border-top: 1px solid var(--green);
        }

        .tsb-withdrawal .wd-status {
          display: inline-block;
          border: 1px solid var(--wine);
          border-radius: 6px;
          padding: 6px 9px;
          color: var(--wine);
          background: var(--white);
          font-size: 10px;
          font-weight: 900;
        }

        .tsb-withdrawal .wd-status-success {
          border-color: var(--green);
          background: var(--green);
          color: var(--white);
        }

        .tsb-withdrawal .wd-status-rejected {
          background: var(--wine);
          color: var(--white);
        }

        .tsb-withdrawal .wd-table-empty {
          text-align: center;
          padding: 30px 16px;
        }

        @media (max-width: 380px) {
          .tsb-withdrawal .wd-card {
            padding: 16px;
          }

          .tsb-withdrawal .wd-history {
            padding: 0;
          }

          .tsb-withdrawal .wd-quick {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>

      <header className="wd-header">
        <div className="wd-header-inner">
          <p className="wd-brand">TELUGU SPORTS BOOK</p>
          <h1>WITHDRAWAL</h1>
        </div>
      </header>

      <main className="wd-main">
        <button
          type="button"
          onClick={onBack}
          className="wd-button wd-wine wd-back"
        >
          ← BACK
        </button>

        <section className="wd-card wd-wallet">
          <p className="wd-caption">AVAILABLE WALLET BALANCE</p>

          <div
            className="wd-balance-box"
            aria-live="polite"
            aria-label={
              balanceLoading
                ? 'Balance loading'
                : balanceError
                  ? 'Balance unavailable'
                  : `Available demo balance ${formatAmount(balance)}`
            }
          >
            <span className="wd-rupee" aria-hidden="true">₹</span>

            <span className="wd-balance">
              {balanceLoading
                ? 'Loading...'
                : balanceError
                  ? '—'
                  : Number(balance).toLocaleString('en-IN', {
                      maximumFractionDigits: 2,
                    })}
            </span>
          </div>

          <p className="wd-note">DEMO BALANCE · VIRTUAL COINS ONLY</p>

          {balanceError && (
            <div>
              <p className="wd-error" role="alert">{balanceError}</p>
              <button
                type="button"
                onClick={loadBalance}
                className="wd-button"
              >
                RETRY
              </button>
            </div>
          )}
        </section>

        <div className="wd-center">
          <button
            type="button"
            onClick={toggleAccountForm}
            className="wd-button"
            aria-expanded={showAddAccount}
            aria-controls="wd-bank-form"
          >
            {showAddAccount
              ? 'CANCEL'
              : account
                ? '✎ CHANGE ACCOUNT'
                : '+ ADD ACCOUNT'}
          </button>
        </div>

        {showAddAccount && (
          <form
            id="wd-bank-form"
            onSubmit={saveAccount}
            className="wd-card wd-form"
          >
            <div>
              <h2 className="wd-title">
                {account ? 'CHANGE BANK ACCOUNT' : 'ADD BANK ACCOUNT'}
              </h2>
              <p className="wd-note">
                Enter your bank details and withdrawal password.
              </p>
            </div>

            <Field label="ACCOUNT HOLDER NAME" id="wd-holder">
              <input
                id="wd-holder"
                type="text"
                placeholder="Enter account holder name"
                value={form.holderName}
                onChange={(event) =>
                  updateForm('holderName', event.target.value)
                }
                className="wd-input"
                required
              />
            </Field>

            <Field label="BANK NAME" id="wd-bank">
              <input
                id="wd-bank"
                type="text"
                placeholder="Enter bank name"
                value={form.bankName}
                onChange={(event) =>
                  updateForm('bankName', event.target.value)
                }
                className="wd-input"
                required
              />
            </Field>

            <Field label="ACCOUNT NUMBER" id="wd-account">
              <input
                id="wd-account"
                type="text"
                inputMode="numeric"
                maxLength={18}
                placeholder="Enter bank account number"
                value={form.accountNumber}
                onChange={(event) =>
                  updateForm(
                    'accountNumber',
                    event.target.value.replace(/\D/g, '')
                  )
                }
                className="wd-input"
                required
              />
            </Field>

            <Field label="CONFIRM ACCOUNT NUMBER" id="wd-confirm-account">
              <input
                id="wd-confirm-account"
                type="text"
                inputMode="numeric"
                maxLength={18}
                placeholder="Confirm bank account number"
                value={form.confirmAccountNumber}
                onChange={(event) =>
                  updateForm(
                    'confirmAccountNumber',
                    event.target.value.replace(/\D/g, '')
                  )
                }
                className="wd-input"
                required
              />
            </Field>

            <Field label="IFSC CODE" id="wd-ifsc">
              <input
                id="wd-ifsc"
                type="text"
                maxLength={11}
                placeholder="Enter IFSC code"
                value={form.ifsc}
                onChange={(event) =>
                  updateForm('ifsc', event.target.value.toUpperCase())
                }
                className="wd-input"
                required
              />
            </Field>

            <Field label="WITHDRAWAL PASSWORD" id="wd-password">
              <input
                id="wd-password"
                type="password"
                autoComplete="off"
                minLength={6}
                placeholder="Enter withdrawal password"
                value={form.password}
                onChange={(event) =>
                  updateForm('password', event.target.value)
                }
                className="wd-input"
                required
              />
            </Field>

            <button type="submit" className="wd-button wd-full">
              SAVE ACCOUNT
            </button>
          </form>
        )}

        <section className="wd-card">
          <ol className="wd-information">
            <li>Demo withdrawal requests use available virtual balance only.</li>
            <li>Requests are recorded separately for each customer.</li>
            <li>Minimum request amount: {formatAmount(MIN_WITHDRAWAL)}.</li>
            <li>Pending requests can be reviewed by the Admin.</li>
          </ol>
        </section>

        {account ? (
          <section className="wd-card">
            <div className="wd-account-heading">
              <div>
                <p className="wd-caption">SAVED BANK ACCOUNT</p>
                <h2 className="wd-holder">
                  {String(account.holderName || '').toUpperCase()}
                </h2>
              </div>

              <button
                type="button"
                onClick={deleteAccount}
                className="wd-button wd-wine"
              >
                DELETE
              </button>
            </div>

            <div className="wd-account-details">
              <AccountRow label="Bank" value={account.bankName} />
              <AccountRow
                label="Account No"
                value={maskAccount(account.accountNumber)}
              />
              <AccountRow label="IFSC Code" value={account.ifsc} />
            </div>

            <form
              onSubmit={handleWithdraw}
              className="wd-form wd-withdraw-form"
            >
              <Field label="ENTER AMOUNT" id="wd-amount">
                <div className="wd-amount-wrap">
                  <span className="wd-amount-prefix" aria-hidden="true">₹</span>
                  <input
                    id="wd-amount"
                    type="number"
                    inputMode="numeric"
                    min={MIN_WITHDRAWAL}
                    step="1"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    className="wd-input"
                    required
                  />
                </div>
              </Field>

              <div className="wd-quick">
                {[500, 1000, 2000, 5000].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAmount(String(value))}
                    aria-pressed={Number(amount) === value}
                  >
                    {formatAmount(value)}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={
                  submitting ||
                  balanceLoading ||
                  Boolean(balanceError)
                }
                className="wd-button wd-wine wd-full"
              >
                {submitting ? 'SUBMITTING...' : 'WITHDRAW'}
              </button>
            </form>
          </section>
        ) : (
          <div className="wd-card wd-empty">
            No bank account added yet.
            <br />
            Click ADD ACCOUNT to continue.
          </div>
        )}

        <section className="wd-card wd-history">
          <div className="wd-history-heading">
            <div>
              <h2 className="wd-title">WITHDRAWAL HISTORY</h2>
              <p className="wd-history-caption">
                Latest {HISTORY_LIMIT} requests · Times in IST
              </p>
            </div>

            <button
              type="button"
              onClick={loadWithdrawalHistory}
              disabled={historyLoading}
              className="wd-button"
            >
              {historyLoading ? 'LOADING...' : 'REFRESH'}
            </button>
          </div>

          {historyError && (
            <p className="wd-error wd-history-error" role="alert">
              {historyError}
            </p>
          )}

          <div className="wd-table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">AMOUNT</th>
                  <th scope="col">STATUS</th>
                  <th scope="col">ACCOUNT</th>
                  <th scope="col">DATE</th>
                </tr>
              </thead>

              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="wd-table-empty">
                      {historyLoading
                        ? 'Loading withdrawal history...'
                        : historyError
                          ? 'Withdrawal history unavailable'
                          : 'No withdrawal requests yet'}
                    </td>
                  </tr>
                ) : (
                  history.map((transaction) => {
                    const status = String(
                      transaction.status || 'PENDING'
                    ).toUpperCase();

                    const success = ['APPROVED', 'SUCCESS'].includes(status);
                    const rejected = ['REJECTED', 'REJECT'].includes(status);

                    const last4 = String(
                      transaction.accountNumber ??
                        transaction.account_number ??
                        ''
                    ).slice(-4);

                    return (
                      <tr key={transaction.id}>
                        <td>
                          <strong>{formatAmount(transaction.amount)}</strong>
                        </td>
                        <td>
                          <span
                            className={`wd-status${
                              success
                                ? ' wd-status-success'
                                : rejected
                                  ? ' wd-status-rejected'
                                  : ''
                            }`}
                          >
                            {status}
                          </span>
                        </td>
                        <td>{last4 ? `XXXX-${last4}` : '—'}</td>
                        <td>
                          {formatDate(
                            transaction.createdAt ?? transaction.created_at
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function Field({ label, id, children }) {
  return (
    <div>
      <label htmlFor={id} className="wd-label">
        {label}
      </label>
      {children}
    </div>
  );
}

function AccountRow({ label, value }) {
  return (
    <div className="wd-account-row">
      <span>{label}</span>
      <span className="wd-account-value">{value || '—'}</span>
    </div>
  );
}
