import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

const AUTH_KEY = 'telugu_sports_auth_user';

const MIN_WITHDRAWAL = 100;
const HISTORY_LIMIT = 20;

export default function WithdrawalPage({
  user,
  onBack,
}) {
  /* =====================================================
     CURRENT CUSTOMER
  ===================================================== */

  const customer = useMemo(() => {
    let source = user;

    if (!source) {
      try {
        const saved = localStorage.getItem(AUTH_KEY);

        if (saved) {
          source = JSON.parse(saved);
        }
      } catch (error) {
        console.error(
          'Unable to read customer:',
          error
        );
      }
    }

    return {
      customerId: Number(
        source?.id ||
          source?.customerId ||
          0
      ),

      customerName:
        source?.name ||
        source?.username ||
        source?.loginId ||
        source?.identifier ||
        'Customer',

      loginId:
        source?.loginId ||
        source?.identifier ||
        '',
    };
  }, [user]);

  /* =====================================================
     CUSTOMER-SPECIFIC BANK STORAGE
  ===================================================== */

  const storageCustomerId = useMemo(() => {
    if (!customer.customerId) {
      return '';
    }

    return String(customer.customerId)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_');
  }, [customer.customerId]);

  const accountKey = storageCustomerId
    ? `tsb_withdrawal_account_${storageCustomerId}`
    : '';

  /* =====================================================
     STATE
  ===================================================== */

  const [
    showAddAccount,
    setShowAddAccount,
  ] = useState(false);

  const [
    account,
    setAccount,
  ] = useState(null);

  const [
    transactions,
    setTransactions,
  ] = useState([]);

  const [
    historyLoading,
    setHistoryLoading,
  ] = useState(false);

  const [
    historyError,
    setHistoryError,
  ] = useState('');

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  /* =====================================================
     AVAILABLE BALANCE
  ===================================================== */

  const [
    balance,
    setBalance,
  ] = useState(0);

  const [
    balanceLoading,
    setBalanceLoading,
  ] = useState(true);

  const [
    balanceError,
    setBalanceError,
  ] = useState('');

  /* =====================================================
     FORM
  ===================================================== */

  const [
    form,
    setForm,
  ] = useState({
    holderName: '',
    bankName: '',
    accountNumber: '',
    confirmAccountNumber: '',
    ifsc: '',
    password: '',
  });

  const [
    amount,
    setAmount,
  ] = useState('');

  /* =====================================================
     LOAD CUSTOMER BANK ACCOUNT
  ===================================================== */

  useEffect(() => {
    setAccount(null);
    setShowAddAccount(false);
    setAmount('');

    if (!accountKey) {
      return;
    }

    try {
      const savedAccount =
        localStorage.getItem(accountKey);

      if (!savedAccount) {
        return;
      }

      const parsedAccount =
        JSON.parse(savedAccount);

      if (
        parsedAccount &&
        typeof parsedAccount === 'object'
      ) {
        setAccount(parsedAccount);
      }
    } catch (error) {
      console.error(
        'Unable to load customer bank account:',
        error
      );

      setAccount(null);
    }
  }, [accountKey]);

  /* =====================================================
     LOAD AVAILABLE BALANCE
  ===================================================== */

  const loadBalance = async () => {
    const customerId =
      customer.customerId;

    if (!customerId) {
      setBalance(0);

      setBalanceError(
        'Customer ID not available.'
      );

      setBalanceLoading(false);

      return;
    }

    setBalanceLoading(true);
    setBalanceError('');

    try {
      const response = await fetch(
        `/api/customers/${encodeURIComponent(
          customerId
        )}/demo-balance`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          cache: 'no-store',
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            'Unable to load available balance.'
        );
      }

      const nextBalance = Number(
        data?.balance ??
          data?.demo_coin_balance ??
          data?.customer?.demo_coin_balance ??
          0
      );

      setBalance(
        Number.isFinite(nextBalance)
          ? nextBalance
          : 0
      );
    } catch (error) {
      console.error(
        'Available Balance Load Error:',
        error
      );

      setBalance(0);

      setBalanceError(
        error?.message ||
          'Unable to load available balance.'
      );
    } finally {
      setBalanceLoading(false);
    }
  };

  /* =====================================================
     LOAD WITHDRAWAL HISTORY FROM SERVER
  ===================================================== */

  const loadWithdrawalHistory =
    async () => {
      const customerId =
        customer.customerId;

      if (!customerId) {
        setTransactions([]);

        setHistoryError(
          'Customer ID not available.'
        );

        return;
      }

      setHistoryLoading(true);
      setHistoryError('');

      try {
        const response = await fetch(
          `/api/customers/${encodeURIComponent(
            customerId
          )}/demo-withdrawals`,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
            },
            cache: 'no-store',
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
              'Unable to load withdrawal history.'
          );
        }

        const requests = Array.isArray(
          data?.requests
        )
          ? data.requests
          : [];

        setTransactions(requests);
      } catch (error) {
        console.error(
          'Withdrawal History Load Error:',
          error
        );

        setTransactions([]);

        setHistoryError(
          error?.message ||
            'Unable to load withdrawal history.'
        );
      } finally {
        setHistoryLoading(false);
      }
    };

  /* =====================================================
     INITIAL SERVER LOAD
  ===================================================== */

  useEffect(() => {
    if (!customer.customerId) {
      return;
    }

    loadBalance();
    loadWithdrawalHistory();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer.customerId]);

  /* =====================================================
     FORM UPDATE
  ===================================================== */

  const updateForm = (
    field,
    value
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  /* =====================================================
     SAVE / CHANGE BANK ACCOUNT
  ===================================================== */

  const saveAccount = (event) => {
    event.preventDefault();

    if (!accountKey) {
      alert(
        'Customer ID not available'
      );

      return;
    }

    const holderName =
      form.holderName.trim();

    const bankName =
      form.bankName.trim();

    const accountNumber =
      form.accountNumber.trim();

    const confirmAccountNumber =
      form.confirmAccountNumber.trim();

    const ifsc =
      form.ifsc
        .trim()
        .toUpperCase();

    const password =
      form.password;

    if (!holderName) {
      alert(
        'Enter account holder name'
      );

      return;
    }

    if (!bankName) {
      alert(
        'Enter bank name'
      );

      return;
    }

    if (
      !/^[0-9]{9,18}$/.test(
        accountNumber
      )
    ) {
      alert(
        'Enter a valid account number'
      );

      return;
    }

    if (
      accountNumber !==
      confirmAccountNumber
    ) {
      alert(
        'Account numbers do not match'
      );

      return;
    }

    if (
      !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(
        ifsc
      )
    ) {
      alert(
        'Enter a valid IFSC code'
      );

      return;
    }

    /*
      Withdrawal password remains required here.

      Important:
      It is NOT stored in localStorage.
      Server-side verification can be connected
      separately.
    */

    if (
      !password ||
      password.length < 6
    ) {
      alert(
        'Enter your Withdrawal Password'
      );

      return;
    }

    const newAccount = {
      holderName,
      bankName,
      accountNumber,
      ifsc,
    };

    try {
      localStorage.setItem(
        accountKey,
        JSON.stringify(newAccount)
      );
    } catch (error) {
      console.error(
        'Unable to save withdrawal account:',
        error
      );

      alert(
        'Unable to save account'
      );

      return;
    }

    setAccount(newAccount);

    setShowAddAccount(false);

    setForm({
      holderName: '',
      bankName: '',
      accountNumber: '',
      confirmAccountNumber: '',
      ifsc: '',
      password: '',
    });
  };

  /* =====================================================
     SUBMIT WITHDRAWAL TO SERVER
  ===================================================== */

  const handleWithdraw =
    async (event) => {
      event.preventDefault();

      if (submitting) {
        return;
      }

      if (!account) {
        alert(
          'Please add a bank account first'
        );

        return;
      }

      const customerId =
        customer.customerId;

      if (
        !Number.isInteger(
          customerId
        ) ||
        customerId <= 0
      ) {
        alert(
          'Customer ID not available'
        );

        return;
      }

      const value =
        Number(amount);

      if (
        !Number.isInteger(value) ||
        value < MIN_WITHDRAWAL
      ) {
        alert(
          `Minimum withdrawal is ${MIN_WITHDRAWAL}`
        );

        return;
      }

      if (balanceLoading) {
        alert(
          'Please wait. Available balance is loading.'
        );

        return;
      }

      if (balanceError) {
        alert(
          'Available balance could not be verified.'
        );

        return;
      }

      if (value > balance) {
        alert('LOW BALANCE');

        return;
      }

      setSubmitting(true);

      try {
        /*
          STEP 2A SERVER ROUTE

          POST /api/demo-withdrawals
        */

        const response = await fetch(
          '/api/demo-withdrawals',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',

              Accept:
                'application/json',
            },

            body: JSON.stringify({
              customerId,
              amount: value,

              accountHolderName:
                account.holderName,

              bankName:
                account.bankName,

              accountNumber:
                account.accountNumber,

              ifscCode:
                account.ifsc,
            }),
          }
        );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
              'Unable to submit withdrawal request.'
          );
        }

        setAmount('');

        /*
          Reload directly from PostgreSQL.

          This prevents another customer's
          history from appearing here.
        */

        await loadWithdrawalHistory();

        /*
          Current balance is loaded again
          from the server.

          We do not create a fake
          localStorage balance here.
        */

        await loadBalance();

        alert(
          'Withdrawal request submitted.'
        );
      } catch (error) {
        console.error(
          'Withdrawal Submit Error:',
          error
        );

        alert(
          error?.message ||
            'Unable to submit withdrawal request.'
        );
      } finally {
        setSubmitting(false);
      }
    };

  /* =====================================================
     DELETE SAVED BANK ACCOUNT
  ===================================================== */

  const deleteAccount = () => {
    const confirmed =
      window.confirm(
        'Remove saved bank account?'
      );

    if (!confirmed) {
      return;
    }

    try {
      if (accountKey) {
        localStorage.removeItem(
          accountKey
        );
      }
    } catch (error) {
      console.error(
        'Unable to remove account:',
        error
      );
    }

    setAccount(null);

    setShowAddAccount(false);

    setForm({
      holderName: '',
      bankName: '',
      accountNumber: '',
      confirmAccountNumber: '',
      ifsc: '',
      password: '',
    });
  };

  /* =====================================================
     HELPERS
  ===================================================== */

  const maskAccount = (
    number
  ) => {
    if (!number) {
      return '';
    }

    return `XXXX XXXX ${String(
      number
    ).slice(-4)}`;
  };

  const statusClass = (
    status
  ) => {
    const normalized =
      String(
        status || ''
      ).toUpperCase();

    if (
      normalized === 'APPROVED' ||
      normalized === 'SUCCESS'
    ) {
      return 'border border-green-500 bg-green-50 text-green-700';
    }

    if (
      normalized === 'REJECTED' ||
      normalized === 'REJECT'
    ) {
      return 'border border-red-500 bg-red-50 text-red-700';
    }

    return 'border border-amber-500 bg-amber-50 text-amber-700';
  };

  const formatDate = (
    value
  ) => {
    if (!value) {
      return '—';
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return '—';
    }

    return date.toLocaleString(
      'en-IN'
    );
  };

  /*
    Server already filters using customer_id.

    This additional frontend filter
    is only an extra isolation check.
  */

  const history =
    transactions
      .filter(
        (transaction) =>
          Number(
            transaction?.customerId
          ) ===
          Number(
            customer.customerId
          )
      )
      .slice(
        0,
        HISTORY_LIMIT
      );

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="min-h-screen bg-[#f3f2f7] text-gray-900">

      {/* HEADER */}

      <header className="bg-teal-800 px-4 py-4 text-white">

        <div className="mx-auto flex max-w-3xl items-center justify-between">

          <div>

            <p className="text-[10px] font-bold tracking-wider text-teal-100">
              TELUGU SPORTS BOOK
            </p>

            <h1 className="text-lg font-black">
              WITHDRAWAL
            </h1>

          </div>

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

        {/* AVAILABLE BALANCE */}

        <section className="mb-5 rounded-xl bg-white p-5 text-center shadow-sm">

          <p className="text-xs font-bold text-gray-500">
            AVAILABLE BALANCE
          </p>

          <h2 className="mt-2 text-3xl font-black text-teal-800">

            {balanceLoading
              ? 'Loading...'
              : `🪙 ${Number(
                  balance
                ).toLocaleString(
                  'en-IN'
                )}`}

          </h2>

          {balanceError && (

            <div className="mt-3">

              <p className="text-xs font-bold text-red-600">
                {balanceError}
              </p>

              <button
                type="button"
                onClick={
                  loadBalance
                }
                className="mt-2 rounded-lg bg-teal-800 px-4 py-2 text-xs font-black text-white"
              >
                RETRY
              </button>

            </div>

          )}

        </section>

        {/* ACCOUNT BUTTON */}

        <div className="mb-6 text-center">

          <button
            type="button"
            onClick={() =>
              setShowAddAccount(
                (previous) =>
                  !previous
              )
            }
            className="rounded-full bg-green-600 px-8 py-4 text-lg font-black text-white"
          >
            {account
              ? '✎ CHANGE ACCOUNT'
              : '+ ADD ACCOUNT'}
          </button>

        </div>

        {/* ACCOUNT FORM */}

        {showAddAccount && (

          <form
            onSubmit={
              saveAccount
            }
            className="mb-6 space-y-4 rounded-xl bg-white p-5 shadow-sm"
          >

            <h2 className="text-center text-xl font-black">
              {account
                ? 'CHANGE BANK ACCOUNT'
                : 'ADD BANK ACCOUNT'}
            </h2>

            <p className="text-center text-[11px] text-gray-500">
              Withdrawal Password is required when adding or changing a bank account.
            </p>

            <div>

              <label className="mb-1 block text-xs font-bold text-gray-600">
                ACCOUNT HOLDER NAME
              </label>

              <input
                type="text"
                placeholder="Enter account holder name"
                value={
                  form.holderName
                }
                onChange={(
                  event
                ) =>
                  updateForm(
                    'holderName',
                    event.target.value
                  )
                }
                className="w-full rounded-lg border p-4"
                required
              />

            </div>

            <div>

              <label className="mb-1 block text-xs font-bold text-gray-600">
                BANK NAME
              </label>

              <input
                type="text"
                placeholder="Enter bank name"
                value={
                  form.bankName
                }
                onChange={(
                  event
                ) =>
                  updateForm(
                    'bankName',
                    event.target.value
                  )
                }
                className="w-full rounded-lg border p-4"
                required
              />

            </div>

            <div>

              <label className="mb-1 block text-xs font-bold text-gray-600">
                ACCOUNT NUMBER
              </label>

              <input
                type="text"
                inputMode="numeric"
                placeholder="Enter bank account number"
                value={
                  form.accountNumber
                }
                onChange={(
                  event
                ) =>
                  updateForm(
                    'accountNumber',
                    event.target.value.replace(
                      /\D/g,
                      ''
                    )
                  )
                }
                className="w-full rounded-lg border p-4"
                required
              />

            </div>

            <div>

              <label className="mb-1 block text-xs font-bold text-gray-600">
                CONFIRM ACCOUNT NUMBER
              </label>

              <input
                type="text"
                inputMode="numeric"
                placeholder="Confirm bank account number"
                value={
                  form.confirmAccountNumber
                }
                onChange={(
                  event
                ) =>
                  updateForm(
                    'confirmAccountNumber',
                    event.target.value.replace(
                      /\D/g,
                      ''
                    )
                  )
                }
                className="w-full rounded-lg border p-4"
                required
              />

            </div>

            <div>

              <label className="mb-1 block text-xs font-bold text-gray-600">
                IFSC CODE
              </label>

              <input
                type="text"
                placeholder="Enter IFSC code"
                value={
                  form.ifsc
                }
                onChange={(
                  event
                ) =>
                  updateForm(
                    'ifsc',
                    event.target.value.toUpperCase()
                  )
                }
                className="w-full rounded-lg border p-4 uppercase"
                required
              />

            </div>

            <div>

              <label className="mb-1 block text-xs font-bold text-gray-600">
                WITHDRAWAL PASSWORD
              </label>

              <input
                type="password"
                placeholder="Enter withdrawal password"
                value={
                  form.password
                }
                onChange={(
                  event
                ) =>
                  updateForm(
                    'password',
                    event.target.value
                  )
                }
                className="w-full rounded-lg border p-4"
                required
              />

              <p className="mt-2 text-[10px] text-gray-500">
                Password is required only for adding or changing the bank account.
              </p>

            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-teal-800 py-4 font-black text-white"
            >
              SAVE ACCOUNT
            </button>

          </form>

        )}

        {/* INFORMATION */}

        <section className="mb-5 rounded-xl bg-white p-5 shadow-sm">

          <div className="space-y-3 text-xs leading-5 text-red-600">

            <p>
              1. Withdrawal requests use the available balance only.
            </p>

            <p>
              2. Requests are recorded separately for each customer.
            </p>

            <p>
              3. Insufficient balance will show LOW BALANCE.
            </p>

            <p>
              4. Pending requests can be reviewed by the Admin.
            </p>

          </div>

        </section>

        {/* SAVED ACCOUNT */}

        {account ? (

          <section className="mb-6 rounded-xl bg-white p-5 shadow-sm">

            <div className="mb-5 flex items-start justify-between gap-3">

              <div>

                <p className="text-[10px] font-bold text-gray-500">
                  SAVED BANK ACCOUNT
                </p>

                <h2 className="mt-1 text-lg font-black">
                  {String(
                    account.holderName ||
                      ''
                  ).toUpperCase()}
                </h2>

              </div>

              <button
                type="button"
                onClick={
                  deleteAccount
                }
                className="rounded-lg bg-red-600 px-3 py-2 text-xs font-black text-white"
              >
                DELETE
              </button>

            </div>

            <div className="overflow-hidden rounded-xl bg-gray-100">

              <AccountRow
                label="Bank"
                value={
                  account.bankName
                }
              />

              <AccountRow
                label="Account No"
                value={
                  maskAccount(
                    account.accountNumber
                  )
                }
              />

              <AccountRow
                label="IFSC Code"
                value={
                  account.ifsc
                }
                last
              />

            </div>

            <form
              onSubmit={
                handleWithdraw
              }
              className="mt-5 space-y-4"
            >

              <div>

                <label className="mb-2 block text-xs font-black text-gray-600">
                  ENTER AMOUNT
                </label>

                <input
                  type="number"
                  min={
                    MIN_WITHDRAWAL
                  }
                  step="1"
                  placeholder="Enter amount"
                  value={
                    amount
                  }
                  onChange={(
                    event
                  ) =>
                    setAmount(
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border p-4 text-lg font-bold"
                  required
                />

              </div>

              <div className="grid grid-cols-4 gap-2">

                {[
                  500,
                  1000,
                  2000,
                  5000,
                ].map(
                  (value) => (

                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setAmount(
                          String(value)
                        )
                      }
                      className="rounded-lg border border-teal-700 py-3 text-xs font-black text-teal-800"
                    >
                      {value.toLocaleString(
                        'en-IN'
                      )}
                    </button>

                  )
                )}

              </div>

              <button
                type="submit"
                disabled={
                  submitting ||
                  balanceLoading ||
                  Boolean(balanceError)
                }
                className="w-full rounded-md bg-red-700 py-4 text-lg font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting
                  ? 'SUBMITTING...'
                  : 'WITHDRAW'}
              </button>

            </form>

          </section>

        ) : (

          <div className="mb-6 rounded-xl bg-white p-6 text-center text-sm text-gray-500 shadow-sm">

            No bank account added yet.

            <br />

            Click ADD ACCOUNT to continue.

          </div>

        )}

        {/* WITHDRAWAL HISTORY */}

        <section className="overflow-hidden rounded-xl bg-white shadow-sm">

          <div className="flex items-center justify-between gap-3 px-4 py-4">

            <div>

              <h2 className="text-lg font-black">
                WITHDRAWAL HISTORY
              </h2>

              <p className="mt-1 text-[10px] text-gray-500">
                Latest{' '}
                {HISTORY_LIMIT}{' '}
                withdrawal requests
              </p>

            </div>

            <button
              type="button"
              onClick={
                loadWithdrawalHistory
              }
              disabled={
                historyLoading
              }
              className="rounded-lg bg-teal-800 px-3 py-2 text-[10px] font-black text-white disabled:opacity-50"
            >
              {historyLoading
                ? 'LOADING...'
                : 'REFRESH'}
            </button>

          </div>

          {historyError && (

            <div className="mx-4 mb-4 rounded-lg border border-red-300 bg-red-50 p-3">

              <p className="text-xs font-bold text-red-700">
                {historyError}
              </p>

            </div>

          )}

          <div className="overflow-x-auto">

            <table className="w-full min-w-[560px] text-xs">

              <thead className="bg-teal-800 text-white">

                <tr>

                  <th className="p-3 text-left">
                    AMOUNT
                  </th>

                  <th className="p-3 text-left">
                    STATUS
                  </th>

                  <th className="p-3 text-left">
                    ACCOUNT
                  </th>

                  <th className="p-3 text-left">
                    DATE
                  </th>

                </tr>

              </thead>

              <tbody>

                {historyLoading &&
                history.length === 0 ? (

                  <tr>

                    <td
                      colSpan={4}
                      className="p-8 text-center font-bold text-gray-500"
                    >
                      Loading withdrawal history...
                    </td>

                  </tr>

                ) : history.length ===
                  0 ? (

                  <tr>

                    <td
                      colSpan={4}
                      className="p-8 text-center text-gray-500"
                    >
                      No withdrawal requests yet
                    </td>

                  </tr>

                ) : (

                  history.map(
                    (transaction) => {

                      const last4 =
                        String(
                          transaction
                            ?.accountNumber ||
                            ''
                        ).slice(-4);

                      return (
                        <tr
                          key={
                            transaction.id
                          }
                          className="border-b"
                        >

                          <td className="p-3 font-bold">
                            {Number(
                              transaction.amount
                            ).toLocaleString(
                              'en-IN'
                            )}
                          </td>

                          <td className="p-3">

                            <span
                              className={`inline-block rounded-md px-3 py-1 text-[10px] font-black ${statusClass(
                                transaction.status
                              )}`}
                            >
                              {String(
                                transaction.status ||
                                  'PENDING'
                              ).toUpperCase()}
                            </span>

                          </td>

                          <td className="p-3">
                            {last4
                              ? `XXXX-${last4}`
                              : '—'}
                          </td>

                          <td className="whitespace-nowrap p-3">
                            {formatDate(
                              transaction.createdAt
                            )}
                          </td>

                        </tr>
                      );
                    }
                  )

                )}

              </tbody>

            </table>

          </div>

        </section>

      </main>

    </div>
  );
}

/* =========================================================
   ACCOUNT ROW
========================================================= */

function AccountRow({
  label,
  value,
  last = false,
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 px-4 py-3 ${
        last
          ? ''
          : 'border-b'
      }`}
    >
      <span className="text-xs text-gray-500">
        {label}
      </span>

      <span className="text-right text-sm font-bold">
        {value || '—'}
      </span>
    </div>
  );
}
