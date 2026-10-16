import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

const AUTH_KEY =
  'telugu_sports_auth_user';

const PAYMENT_SETTINGS_KEY =
  'telugu_sports_payment_settings';

const DEFAULT_PAYMENT_SETTINGS = {
  account: {
    accountName: 'TELUGU SPORTS',
    bankName: '',
    accountNumber: '',
    ifsc: '',
  },

  phonepe: {
    number: '',
    upiId: '',
    qrImage: '',
  },

  gpay: {
    number: '',
    upiId: '',
    qrImage: '',
  },

  paytm: {
    number: '',
    upiId: '',
    qrImage: '',
  },
};

const PAYMENT_METHODS = [
  {
    id: 'ACCOUNT',
    label: 'BANK ACCOUNT',
  },
  {
    id: 'PHONEPE',
    label: 'PHONEPE',
  },
  {
    id: 'GPAY',
    label: 'GOOGLE PAY',
  },
  {
    id: 'PAYTM',
    label: 'PAYTM',
  },
];

function safeParse(
  value,
  fallback = null
) {
  try {
    if (!value) {
      return fallback;
    }

    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function formatAmount(value) {
  return Number(
    value || 0
  ).toLocaleString('en-IN');
}

function formatDate(value) {
  if (!value) {
    return '-';
  }

  try {
    return new Date(
      value
    ).toLocaleString('en-IN');
  } catch {
    return String(value);
  }
}

function getStatusClass(status) {
  const cleanStatus =
    String(
      status || ''
    ).toUpperCase();

  if (cleanStatus === 'APPROVED') {
    return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
  }

  if (cleanStatus === 'REJECTED') {
    return 'text-red-400 border-red-500/40 bg-red-500/10';
  }

  return 'text-amber-300 border-amber-500/40 bg-amber-500/10';
}

export default function DepositPage({
  user,
  onBack,
}) {
  /* =====================================================
     CURRENT CUSTOMER
  ===================================================== */

  const customer = useMemo(() => {
    const storedUser =
      safeParse(
        localStorage.getItem(
          AUTH_KEY
        ),
        {}
      ) || {};

    const source =
      user &&
      typeof user === 'object'
        ? user
        : storedUser;

    const customerId =
      Number(
        source.id ||
        source.customerId ||
        0
      );

    const loginId =
      String(
        source.loginId ||
        source.identifier ||
        ''
      ).trim();

    const name =
      String(
        source.name ||
        source.customerName ||
        loginId ||
        'Customer'
      ).trim();

    return {
      customerId,
      loginId,
      name,
    };
  }, [user]);

  /* =====================================================
     STATE
  ===================================================== */

  const [
    selectedMethod,
    setSelectedMethod,
  ] = useState('ACCOUNT');

  const [
    amount,
    setAmount,
  ] = useState('');

  const [
    referenceNumber,
    setReferenceNumber,
  ] = useState('');

  const [
    proofFile,
    setProofFile,
  ] = useState(null);

  const [
    paymentSettings,
    setPaymentSettings,
  ] = useState(
    DEFAULT_PAYMENT_SETTINGS
  );

  const [
    transactions,
    setTransactions,
  ] = useState([]);

  const [
    balance,
    setBalance,
  ] = useState(0);

  const [
    loadingBalance,
    setLoadingBalance,
  ] = useState(false);

  const [
    loadingHistory,
    setLoadingHistory,
  ] = useState(false);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState('');

  const [
    message,
    setMessage,
  ] = useState('');

  /* =====================================================
     LOAD PAYMENT SETTINGS
  ===================================================== */

  const loadPaymentSettings = () => {
    const saved =
      safeParse(
        localStorage.getItem(
          PAYMENT_SETTINGS_KEY
        ),
        null
      );

    if (
      saved &&
      typeof saved === 'object'
    ) {
      setPaymentSettings({
        ...DEFAULT_PAYMENT_SETTINGS,
        ...saved,

        account: {
          ...DEFAULT_PAYMENT_SETTINGS.account,
          ...(saved.account || {}),
        },

        phonepe: {
          ...DEFAULT_PAYMENT_SETTINGS.phonepe,
          ...(saved.phonepe || {}),
        },

        gpay: {
          ...DEFAULT_PAYMENT_SETTINGS.gpay,
          ...(saved.gpay || {}),
        },

        paytm: {
          ...DEFAULT_PAYMENT_SETTINGS.paytm,
          ...(saved.paytm || {}),
        },
      });
    } else {
      setPaymentSettings(
        DEFAULT_PAYMENT_SETTINGS
      );
    }
  };

  useEffect(() => {
    loadPaymentSettings();

    const handleStorage = (
      event
    ) => {
      if (
        event.key ===
        PAYMENT_SETTINGS_KEY
      ) {
        loadPaymentSettings();
      }
    };

    window.addEventListener(
      'storage',
      handleStorage
    );

    return () => {
      window.removeEventListener(
        'storage',
        handleStorage
      );
    };
  }, []);

  /* =====================================================
     LOAD CUSTOMER BALANCE
  ===================================================== */

  const loadBalance =
    async () => {
      if (!customer.customerId) {
        setBalance(0);
        return;
      }

      setLoadingBalance(true);

      try {
        const response =
          await fetch(
            `/api/customers/${encodeURIComponent(
              customer.customerId
            )}/demo-balance`,
            {
              method: 'GET',

              headers: {
                Accept:
                  'application/json',
              },
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
            'Unable to load balance.'
          );
        }

        setBalance(
          Number(
            data?.balance ||
            0
          )
        );
      } catch (loadError) {
        console.error(
          'Deposit Balance Error:',
          loadError
        );

        setBalance(0);
      } finally {
        setLoadingBalance(false);
      }
    };

  /* =====================================================
     LOAD CUSTOMER DEPOSIT HISTORY
  ===================================================== */

  const loadHistory =
    async () => {
      if (!customer.customerId) {
        setTransactions([]);
        return;
      }

      setLoadingHistory(true);

      try {
        const response =
          await fetch(
            `/api/customers/${encodeURIComponent(
              customer.customerId
            )}/demo-deposits`,
            {
              method: 'GET',

              headers: {
                Accept:
                  'application/json',
              },
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
            'Unable to load deposit history.'
          );
        }

        setTransactions(
          Array.isArray(
            data?.requests
          )
            ? data.requests
            : []
        );
      } catch (historyError) {
        console.error(
          'Deposit History Error:',
          historyError
        );

        setTransactions([]);
      } finally {
        setLoadingHistory(false);
      }
    };

  useEffect(() => {
    loadBalance();
    loadHistory();
  }, [customer.customerId]);

  /* =====================================================
     REFERENCE NUMBER
  ===================================================== */

  const handleReferenceChange =
    (event) => {
      const digitsOnly =
        String(
          event.target.value ||
          ''
        )
          .replace(/\D/g, '')
          .slice(0, 12);

      setReferenceNumber(
        digitsOnly
      );

      setError('');
      setMessage('');
    };

  /* =====================================================
     AMOUNT
  ===================================================== */

  const handleAmountChange =
    (event) => {
      const digitsOnly =
        String(
          event.target.value ||
          ''
        ).replace(/\D/g, '');

      setAmount(digitsOnly);

      setError('');
      setMessage('');
    };

  /* =====================================================
     PROOF
  ===================================================== */

  const handleProofChange =
    (event) => {
      setError('');
      setMessage('');

      const file =
        event.target.files?.[0];

      if (!file) {
        setProofFile(null);
        return;
      }

      const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
      ];

      if (
        !allowedTypes.includes(
          file.type
        )
      ) {
        setProofFile(null);

        event.target.value = '';

        setError(
          'Please select a JPG, PNG or WEBP image.'
        );

        return;
      }

      if (
        file.size >
        1.5 * 1024 * 1024
      ) {
        setProofFile(null);

        event.target.value = '';

        setError(
          'Screenshot size must be 1.5 MB or less.'
        );

        return;
      }

      setProofFile(file);
    };

  /* =====================================================
     SUBMIT
  ===================================================== */

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      if (submitting) {
        return;
      }

      setError('');
      setMessage('');

      if (!customer.customerId) {
        setError(
          'Customer account information is missing. Please login again.'
        );

        return;
      }

      const cleanAmount =
        Number(amount);

      if (
        !Number.isInteger(
          cleanAmount
        ) ||
        cleanAmount <= 0
      ) {
        setError(
          'Please enter a valid amount.'
        );

        return;
      }

      if (
        !/^\d{12}$/.test(
          referenceNumber
        )
      ) {
        setError(
          'UTR / Reference Number must contain exactly 12 digits.'
        );

        return;
      }

      setSubmitting(true);

      try {
        const response =
          await fetch(
            '/api/demo-deposits',
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json',

                Accept:
                  'application/json',
              },

              body: JSON.stringify({
                customerId:
                  customer.customerId,

                amount:
                  cleanAmount,

                referenceNumber,

                paymentMethod:
                  selectedMethod,

                proofName:
                  proofFile?.name ||
                  '',
              }),
            }
          );

        let data = {};

        try {
          data =
            await response.json();
        } catch {
          data = {};
        }

        if (!response.ok) {
          if (
            response.status ===
              409 ||
            data?.code ===
              'REPEATED_REFERENCE'
          ) {
            throw new Error(
              'UTR ALREADY USED / REPEATED UTR'
            );
          }

          throw new Error(
            data?.error ||
            'Unable to submit deposit request.'
          );
        }

        setMessage(
          'Deposit request submitted successfully.'
        );

        setAmount('');
        setReferenceNumber('');
        setProofFile(null);

        const fileInput =
          document.getElementById(
            'deposit-proof-file'
          );

        if (fileInput) {
          fileInput.value = '';
        }

        await loadHistory();
      } catch (submitError) {
        console.error(
          'Deposit Submit Error:',
          submitError
        );

        setError(
          submitError?.message ||
          'Unable to submit deposit request.'
        );
      } finally {
        setSubmitting(false);
      }
    };

  /* =====================================================
     PAYMENT DETAILS
  ===================================================== */

  const renderPaymentDetails =
    () => {
      if (
        selectedMethod ===
        'ACCOUNT'
      ) {
        const account =
          paymentSettings.account ||
          {};

        return (
          <div className="space-y-2">
            <InfoRow
              label="Account Name"
              value={
                account.accountName ||
                '-'
              }
            />

            <InfoRow
              label="Bank Name"
              value={
                account.bankName ||
                '-'
              }
            />

            <InfoRow
              label="Account Number"
              value={
                account.accountNumber ||
                '-'
              }
            />

            <InfoRow
              label="IFSC"
              value={
                account.ifsc ||
                '-'
              }
            />
          </div>
        );
      }

      const key =
        selectedMethod ===
        'PHONEPE'
          ? 'phonepe'
          : selectedMethod ===
            'GPAY'
          ? 'gpay'
          : 'paytm';

      const details =
        paymentSettings[key] ||
        {};

      const methodName =
        selectedMethod ===
        'PHONEPE'
          ? 'PhonePe'
          : selectedMethod ===
            'GPAY'
          ? 'Google Pay'
          : 'Paytm';

      return (
        <div className="space-y-4">
          {/* QR CODE */}

          {details.qrImage ? (
            <div className="rounded-2xl border border-cyan-500/20 bg-[#050b12] p-4">
              <p className="mb-3 text-center text-[11px] font-bold leading-relaxed text-slate-400">
                Scan the QR code
                below
              </p>

              <div className="flex justify-center">
                <div className="rounded-2xl bg-white p-3 shadow-xl">
                  <img
                    src={
                      details.qrImage
                    }
                    alt={`${methodName} QR Code`}
                    className="h-[230px] w-[230px] max-w-full object-contain sm:h-[280px] sm:w-[280px]"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-700 bg-[#050b12] px-4 py-6 text-center">
              <p className="text-xs font-bold text-slate-500">
                {methodName} QR
                code is not
                available.
              </p>
            </div>
          )}

          {/* UPI ID */}

          <InfoRow
            label="UPI ID"
            value={
              details.upiId ||
              '-'
            }
          />

          {/* MOBILE NUMBER
              Kept for compatibility
              with older saved settings.
          */}

          {details.number ? (
            <InfoRow
              label="Mobile Number"
              value={
                details.number
              }
            />
          ) : null}
        </div>
      );
    };

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="min-h-screen bg-[#050b12] text-white">
      {/* HEADER */}

      <div className="sticky top-0 z-30 border-b border-cyan-500/20 bg-[#07111c]/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-3 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-lg text-white"
            >
              ←
            </button>

            <div>
              <h1 className="text-base font-black tracking-wide text-cyan-300">
                DEPOSIT
              </h1>

              <p className="text-[11px] text-slate-400">
                {customer.name}

                {customer.loginId
                  ? ` • ${customer.loginId}`
                  : ''}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-right">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Available Balance
            </p>

            <p className="text-sm font-black text-cyan-300">
              {loadingBalance
                ? '...'
                : formatAmount(
                    balance
                  )}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-4 px-3 py-4">
        {/* PAYMENT METHOD */}

        <section className="rounded-2xl border border-slate-800 bg-[#09131f] p-3 shadow-xl">
          <h2 className="mb-3 text-sm font-black text-white">
            Select Payment
            Method
          </h2>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PAYMENT_METHODS.map(
              (method) => {
                const active =
                  selectedMethod ===
                  method.id;

                return (
                  <button
                    key={
                      method.id
                    }
                    type="button"
                    onClick={() => {
                      setSelectedMethod(
                        method.id
                      );

                      setError('');
                      setMessage('');

                      loadPaymentSettings();
                    }}
                    className={`rounded-xl border px-2 py-3 text-xs font-black transition ${
                      active
                        ? 'border-cyan-400 bg-cyan-500/15 text-cyan-300'
                        : 'border-slate-700 bg-slate-900 text-slate-300'
                    }`}
                  >
                    {
                      method.label
                    }
                  </button>
                );
              }
            )}
          </div>
        </section>

        {/* PAYMENT DETAILS */}

        <section className="rounded-2xl border border-slate-800 bg-[#09131f] p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-black text-white">
              Payment Details
            </h2>

            <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-300">
              {
                selectedMethod
              }
            </span>
          </div>

          {renderPaymentDetails()}
        </section>

        {/* REQUEST FORM */}

        <form
          onSubmit={
            handleSubmit
          }
          className="rounded-2xl border border-slate-800 bg-[#09131f] p-4 shadow-xl"
        >
          <h2 className="mb-4 text-sm font-black text-white">
            Submit Deposit
            Request
          </h2>

          <div className="space-y-4">
            {/* AMOUNT */}

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-300">
                Amount
              </label>

              <div className="flex overflow-hidden rounded-xl border border-slate-700 bg-[#050b12] focus-within:border-cyan-500">
                <div className="flex items-center border-r border-slate-700 px-3 font-black text-amber-300">
                  ₹
                </div>

                <input
                  type="text"
                  inputMode="numeric"
                  value={amount}
                  onChange={
                    handleAmountChange
                  }
                  placeholder="Enter amount"
                  className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm font-bold text-white outline-none placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* UTR */}

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">
                  UTR /
                  Reference Number
                </label>

                <span
                  className={`text-[10px] font-bold ${
                    referenceNumber.length ===
                    12
                      ? 'text-emerald-400'
                      : 'text-slate-500'
                  }`}
                >
                  {
                    referenceNumber.length
                  }
                  /12
                </span>
              </div>

              <input
                type="text"
                inputMode="numeric"
                maxLength={12}
                value={
                  referenceNumber
                }
                onChange={
                  handleReferenceChange
                }
                placeholder="Enter 12-digit reference"
                className="w-full rounded-xl border border-slate-700 bg-[#050b12] px-3 py-3 text-sm font-bold tracking-widest text-white outline-none placeholder:tracking-normal placeholder:text-slate-600 focus:border-cyan-500"
              />

              <p className="mt-1.5 text-[10px] leading-relaxed text-slate-500">
                Reference number
                must be exactly
                12 digits.
              </p>
            </div>

            {/* SCREENSHOT */}

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-300">
                Screenshot
                (Optional)
              </label>

              <input
                id="deposit-proof-file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={
                  handleProofChange
                }
                className="block w-full rounded-xl border border-slate-700 bg-[#050b12] px-3 py-2.5 text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-500/15 file:px-3 file:py-2 file:text-xs file:font-black file:text-cyan-300"
              />

              {proofFile && (
                <p className="mt-2 break-all text-[10px] text-emerald-400">
                  Selected:{' '}
                  {
                    proofFile.name
                  }
                </p>
              )}
            </div>

            {/* ERROR */}

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-3 text-xs font-bold leading-relaxed text-red-300">
                {error}
              </div>
            )}

            {/* SUCCESS */}

            {message && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 text-xs font-bold leading-relaxed text-emerald-300">
                {message}
              </div>
            )}

            {/* SUBMIT */}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-4 py-3 text-sm font-black text-[#041018] shadow-lg transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? 'SUBMITTING...'
                : 'SUBMIT DEPOSIT'}
            </button>
          </div>
        </form>

        {/* HISTORY */}

        <section className="rounded-2xl border border-slate-800 bg-[#09131f] p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-black text-white">
              Deposit History
            </h2>

            <button
              type="button"
              onClick={loadHistory}
              disabled={
                loadingHistory
              }
              className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1.5 text-[10px] font-black text-cyan-300 disabled:opacity-50"
            >
              {loadingHistory
                ? 'LOADING...'
                : 'REFRESH'}
            </button>
          </div>

          {loadingHistory &&
          transactions.length ===
            0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Loading deposit
              history...
            </div>
          ) : transactions.length ===
            0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 bg-[#050b12] px-3 py-8 text-center text-xs text-slate-500">
              No deposit
              requests yet.
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map(
                (transaction) => (
                  <div
                    key={
                      transaction.id
                    }
                    className="rounded-xl border border-slate-800 bg-[#050b12] p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-black text-white">
                          ₹
                          {formatAmount(
                            transaction.amount
                          )}
                        </p>

                        <p className="mt-1 text-[10px] text-slate-500">
                          {formatDate(
                            transaction.createdAt
                          )}
                        </p>
                      </div>

                      <span
                        className={`rounded-lg border px-2 py-1 text-[9px] font-black ${getStatusClass(
                          transaction.status
                        )}`}
                      >
                        {String(
                          transaction.status ||
                          'PENDING'
                        ).toUpperCase()}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-2">
                        <p className="text-slate-500">
                          Method
                        </p>

                        <p className="mt-1 font-bold text-slate-200">
                          {transaction.paymentMethod ||
                            transaction.method ||
                            '-'}
                        </p>
                      </div>

                      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-2">
                        <p className="text-slate-500">
                          Reference
                        </p>

                        <p className="mt-1 break-all font-bold text-slate-200">
                          {transaction.referenceNumber ||
                            transaction.reference ||
                            '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {/* DISCLOSURE */}

        <div className="px-2 pb-5 text-center text-[10px] leading-relaxed text-slate-600">
          Informational
          demonstration only.
          No real-money
          transactions are
          processed by this
          page.
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SMALL INFO ROW
========================================================= */

function InfoRow({
  label,
  value,
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#050b12] px-3 py-2.5">
      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </span>

      <span className="break-all text-right text-xs font-black text-slate-200">
        {value}
      </span>
    </div>
  );
}
