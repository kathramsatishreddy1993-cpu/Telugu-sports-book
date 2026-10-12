import React, {
  useMemo,
  useState,
} from 'react';

const DEPOSIT_KEY =
  'telugu_sports_demo_deposits';

const BALANCE_KEY =
  'telugu_sports_demo_balance';

const PAYMENT_SETTINGS_KEY =
  'telugu_sports_payment_settings';

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
  /* =====================================================
     STEP
  ===================================================== */

  const [step, setStep] =
    useState(1);

  /* =====================================================
     PAYMENT SETTINGS FROM ADMIN
  ===================================================== */

  const paymentSettings =
    useMemo(() => {
      try {
        const saved =
          localStorage.getItem(
            PAYMENT_SETTINGS_KEY
          );

        if (!saved) {
          return {};
        }

        const parsed =
          JSON.parse(saved);

        return parsed &&
          typeof parsed === 'object'
          ? parsed
          : {};
      } catch {
        return {};
      }
    }, []);

  /* =====================================================
     FORM
  ===================================================== */

  const [
    selectedMethod,
    setSelectedMethod,
  ] = useState('ACCOUNT');

  const [amount, setAmount] =
    useState('');

  const [utr, setUtr] =
    useState('');

  const [
    proofName,
    setProofName,
  ] = useState('');

  const [
    proofData,
    setProofData,
  ] = useState('');

  const [
    proofPreview,
    setProofPreview,
  ] = useState('');

  const [message, setMessage] =
    useState('');

  const [error, setError] =
    useState('');

  const [
    transactions,
    setTransactions,
  ] = useState(() => {
    try {
      const saved =
        localStorage.getItem(
          DEPOSIT_KEY
        );

      const parsed = saved
        ? JSON.parse(saved)
        : [];

      return Array.isArray(parsed)
        ? parsed
        : [];
    } catch {
      return [];
    }
  });

  /* =====================================================
     BALANCE
  ===================================================== */

  const formattedBalance =
    useMemo(() => {
      try {
        const saved =
          Number(
            localStorage.getItem(
              BALANCE_KEY
            ) || 10000
          );

        return Number.isFinite(
          saved
        )
          ? saved.toLocaleString(
              'en-IN'
            )
          : '10,000';
      } catch {
        return '10,000';
      }
    }, []);

  /* =====================================================
     CURRENT USER
  ===================================================== */

  const customerLoginId =
    user?.loginId ||
    user?.identifier ||
    user?.id ||
    'demo-user';

  const customerName =
    user?.name ||
    customerLoginId ||
    'Demo User';

  /* =====================================================
     PAYMENT SETTINGS HELPERS
  ===================================================== */

  const getValue = (
    possibleKeys,
    fallback = ''
  ) => {
    for (
      const key of possibleKeys
    ) {
      const value =
        paymentSettings?.[key];

      if (
        value !== undefined &&
        value !== null &&
        String(value).trim()
      ) {
        return value;
      }
    }

    return fallback;
  };

  const bankDetails = {
    accountName: getValue(
      [
        'accountName',
        'bankAccountName',
        'holderName',
      ],
      'Not configured'
    ),

    bankName: getValue(
      [
        'bankName',
        'accountBankName',
      ],
      'Not configured'
    ),

    accountNumber: getValue(
      [
        'accountNumber',
        'bankAccountNumber',
      ],
      'Not configured'
    ),

    ifsc: getValue(
      [
        'ifsc',
        'ifscCode',
        'bankIfsc',
      ],
      'Not configured'
    ),
  };

  const getMethodSettings = (
    method
  ) => {
    const lower =
      method.toLowerCase();

    const nested =
      paymentSettings?.[lower];

    if (
      nested &&
      typeof nested ===
        'object'
    ) {
      return {
        upiId:
          nested.upiId ||
          nested.upi ||
          nested.id ||
          'Not configured',

        qrImage:
          nested.qrImage ||
          nested.qr ||
          nested.qrData ||
          '',
      };
    }

    if (method === 'PHONEPE') {
      return {
        upiId: getValue(
          [
            'phonePeUpiId',
            'phonepeUpiId',
            'phonePeUpi',
            'phonepeUpi',
          ],
          'Not configured'
        ),

        qrImage: getValue(
          [
            'phonePeQrImage',
            'phonepeQrImage',
            'phonePeQr',
            'phonepeQr',
          ],
          ''
        ),
      };
    }

    if (method === 'GPAY') {
      return {
        upiId: getValue(
          [
            'gpayUpiId',
            'googlePayUpiId',
            'gpayUpi',
          ],
          'Not configured'
        ),

        qrImage: getValue(
          [
            'gpayQrImage',
            'googlePayQrImage',
            'gpayQr',
          ],
          ''
        ),
      };
    }

    if (method === 'PAYTM') {
      return {
        upiId: getValue(
          [
            'paytmUpiId',
            'paytmUpi',
          ],
          'Not configured'
        ),

        qrImage: getValue(
          [
            'paytmQrImage',
            'paytmQr',
          ],
          ''
        ),
      };
    }

    return {
      upiId:
        'Not configured',

      qrImage: '',
    };
  };

  const methodSettings =
    getMethodSettings(
      selectedMethod
    );

  /* =====================================================
     STEP 1
     AMOUNT → CONTINUE
  ===================================================== */

  const continueFromAmount =
    () => {
      setError('');
      setMessage('');

      const numericAmount =
        Number(amount);

      if (
        !Number.isFinite(
          numericAmount
        ) ||
        numericAmount <= 0
      ) {
        setError(
          'Please enter a valid amount.'
        );

        return;
      }

      setStep(2);

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    };

  /* =====================================================
     STEP 2
     METHOD → CONTINUE
  ===================================================== */

  const continueFromMethod =
    () => {
      setError('');
      setMessage('');

      setStep(3);

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    };

  /* =====================================================
     IMAGE UPLOAD
  ===================================================== */

  const handleProofChange =
    (event) => {
      setError('');

      const file =
        event.target
          .files?.[0];

      if (!file) {
        setProofName('');
        setProofData('');
        setProofPreview('');
        return;
      }

      if (
        !file.type.startsWith(
          'image/'
        )
      ) {
        setError(
          'Please select an image file.'
        );

        event.target.value =
          '';

        return;
      }

      /*
        Keep proof small because this
        demo uses localStorage.
      */

      const maxSize =
        1.5 * 1024 * 1024;

      if (
        file.size > maxSize
      ) {
        setError(
          'Screenshot is too large. Please upload an image below 1.5 MB.'
        );

        event.target.value =
          '';

        return;
      }

      const reader =
        new FileReader();

      reader.onload = () => {
        const result =
          String(
            reader.result || ''
          );

        setProofName(
          file.name
        );

        setProofData(
          result
        );

        setProofPreview(
          result
        );
      };

      reader.onerror = () => {
        setError(
          'Unable to read screenshot. Please select the image again.'
        );
      };

      reader.readAsDataURL(
        file
      );
    };

  /* =====================================================
     SUBMIT REQUEST
  ===================================================== */

  const handleSubmit =
    (event) => {
      event.preventDefault();

      setError('');
      setMessage('');

      const numericAmount =
        Number(amount);

      if (
        !Number.isFinite(
          numericAmount
        ) ||
        numericAmount <= 0
      ) {
        setError(
          'Please enter a valid amount.'
        );

        setStep(1);

        return;
      }

      const cleanUtr =
        utr.trim();

      if (!cleanUtr) {
        setError(
          'Please enter UTR / reference number.'
        );

        return;
      }

      if (!proofData) {
        setError(
          'Please upload payment proof screenshot.'
        );

        return;
      }

      /*
        Duplicate UTR check
      */

      const duplicate =
        transactions.some(
          (transaction) =>
            String(
              transaction
                ?.reference ||
                transaction?.utr ||
                ''
            )
              .trim()
              .toLowerCase() ===
            cleanUtr.toLowerCase()
        );

      if (duplicate) {
        setError(
          'This UTR / Reference Number has already been submitted. Please enter a new UTR.'
        );

        return;
      }

      const now =
        new Date();

      const newTransaction = {
        id:
          Date.now(),

        customerId:
          customerLoginId,

        loginId:
          customerLoginId,

        customerName,

        amount:
          numericAmount,

        reference:
          cleanUtr,

        utr:
          cleanUtr,

        method:
          selectedMethod,

        proof:
          proofName,

        proofName,

        /*
          This is what Admin uses
          to display the screenshot.
        */

        proofData,

        paymentProof:
          proofData,

        status:
          'PENDING',

        coinsCredited:
          false,

        createdAt:
          now.toISOString(),

        date:
          now.toLocaleString(
            'en-IN'
          ),
      };

      const updatedTransactions =
        [
          newTransaction,
          ...transactions,
        ];

      try {
        localStorage.setItem(
          DEPOSIT_KEY,
          JSON.stringify(
            updatedTransactions
          )
        );

        setTransactions(
          updatedTransactions
        );
      } catch (storageError) {
        console.error(
          storageError
        );

        setError(
          'Unable to save screenshot. Please upload a smaller screenshot and try again.'
        );

        return;
      }

      setUtr('');
      setProofName('');
      setProofData('');
      setProofPreview('');

      setMessage(
        'Demo deposit request submitted successfully. Admin review is pending.'
      );

      setStep(1);
      setAmount('');
      setSelectedMethod(
        'ACCOUNT'
      );

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    };

  /* =====================================================
     STEP BACK
  ===================================================== */

  const handleStepBack =
    () => {
      setError('');
      setMessage('');

      if (step === 3) {
        setStep(2);
        return;
      }

      if (step === 2) {
        setStep(1);
        return;
      }

      onBack?.();
    };

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="min-h-screen bg-[#062f2b] text-white">

      {/* HEADER */}

      <header className="sticky top-0 z-40 bg-[#9a5a00] px-3 py-3 shadow-lg">

        <div className="flex items-center justify-between gap-3">

          <button
            type="button"
            onClick={
              handleStepBack
            }
            className="rounded border border-amber-300 px-3 py-2 text-xs font-black"
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

        {/* CUSTOMER */}

        <section className="rounded-xl border border-[#17665d] bg-[#083d37] p-3">

          <div className="flex items-center justify-between gap-3">

            <div>

              <p className="text-[8px] font-black text-gray-400">
                CUSTOMER
              </p>

              <p className="mt-1 text-xs font-black">
                {customerName}
              </p>

              <p className="mt-1 text-[8px] text-amber-300">
                {customerLoginId}
              </p>

            </div>

            <div className="text-right">

              <p className="text-[8px] font-black text-gray-400">
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

          <p className="text-[9px] font-black text-amber-300">
            DEMONSTRATION ONLY
          </p>

          <p className="mt-1 text-[9px] leading-4 text-gray-300">
            No real payment is processed by this page.
          </p>

        </section>

        {/* STEP INDICATOR */}

        <section className="mt-4 grid grid-cols-3 gap-1">

          <StepBox
            number="1"
            label="AMOUNT"
            active={step === 1}
            completed={step > 1}
          />

          <StepBox
            number="2"
            label="PAYMENT"
            active={step === 2}
            completed={step > 2}
          />

          <StepBox
            number="3"
            label="PROOF"
            active={step === 3}
            completed={false}
          />

        </section>

        {/* ===============================================
            STEP 1
        =============================================== */}

        {step === 1 && (
          <section className="mt-4 rounded-xl border border-[#28655f] bg-[#083d37] p-4">

            <p className="text-[9px] font-black text-gray-400">
              STEP 1
            </p>

            <h2 className="mt-1 text-lg font-black text-amber-300">
              ENTER DEPOSIT AMOUNT
            </h2>

            <label className="mt-5 block">

              <span className="text-[10px] font-black text-gray-300">
                AMOUNT
              </span>

              <input
                type="number"
                inputMode="decimal"
                min="1"
                value={amount}
                onChange={(event) => {
                  setAmount(
                    event.target.value
                  );

                  setError('');
                }}
                onKeyDown={(event) => {
                  if (
                    event.key ===
                    'Enter'
                  ) {
                    event.preventDefault();

                    continueFromAmount();
                  }
                }}
                placeholder="Enter amount"
                className="mt-2 h-[54px] w-full rounded-lg border border-[#39756f] bg-[#062f2b] px-4 text-lg font-black text-white outline-none focus:border-amber-400"
              />

            </label>

            <div className="mt-3 grid grid-cols-4 gap-1">

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
                    onClick={() => {
                      setAmount(
                        String(value)
                      );

                      setError('');
                    }}
                    className="rounded-lg border border-amber-500/50 bg-black/20 py-3 text-[9px] font-black text-amber-300"
                  >
                    ₹
                    {value.toLocaleString(
                      'en-IN'
                    )}
                  </button>
                )
              )}

            </div>

            {error && (
              <ErrorBox
                text={error}
              />
            )}

            {message && (
              <SuccessBox
                text={message}
              />
            )}

            <button
              type="button"
              onClick={
                continueFromAmount
              }
              className="mt-5 h-[48px] w-full rounded-lg border border-white bg-green-700 text-xs font-black"
            >
              CONTINUE ›
            </button>

          </section>
        )}

        {/* ===============================================
            STEP 2
        =============================================== */}

        {step === 2 && (
          <>
            <section className="mt-4">

              <p className="text-[9px] font-black text-gray-400">
                STEP 2
              </p>

              <h2 className="mt-1 text-lg font-black text-amber-300">
                SELECT PAYMENT METHOD
              </h2>

              <div className="mt-3 grid grid-cols-4 gap-1">

                {paymentMethods.map(
                  (method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => {
                        setSelectedMethod(
                          method
                        );

                        setError('');
                      }}
                      className={`rounded-lg border px-1 py-3 text-[8px] font-black ${
                        selectedMethod ===
                        method
                          ? 'border-amber-300 bg-amber-500 text-black'
                          : 'border-[#28655f] bg-[#0a4942] text-white'
                      }`}
                    >
                      {method}
                    </button>
                  )
                )}

              </div>

            </section>

            <section className="mt-4 overflow-hidden rounded-xl border border-[#28655f] bg-[#083d37]">

              <div className="bg-[#0b6259] px-4 py-3">

                <h2 className="text-sm font-black">
                  {selectedMethod ===
                  'ACCOUNT'
                    ? 'BANK ACCOUNT DETAILS'
                    : `${selectedMethod} DETAILS`}
                </h2>

              </div>

              <div className="space-y-3 p-4">

                {selectedMethod ===
                  'ACCOUNT' ? (
                  <>
                    <DetailRow
                      label="Account Name"
                      value={
                        bankDetails.accountName
                      }
                    />

                    <DetailRow
                      label="Bank Name"
                      value={
                        bankDetails.bankName
                      }
                    />

                    <DetailRow
                      label="Account Number"
                      value={
                        bankDetails.accountNumber
                      }
                    />

                    <DetailRow
                      label="IFSC Code"
                      value={
                        bankDetails.ifsc
                      }
                    />
                  </>
                ) : (
                  <>
                    <DetailRow
                      label={`${selectedMethod} UPI ID`}
                      value={
                        methodSettings.upiId
                      }
                    />

                    {methodSettings.qrImage ? (

                      <div className="rounded-xl border border-[#39756f] bg-white p-3">

                        <img
                          src={
                            methodSettings.qrImage
                          }
                          alt={`${selectedMethod} QR`}
                          className="mx-auto max-h-[260px] max-w-full object-contain"
                        />

                      </div>

                    ) : (

                      <div className="flex min-h-[150px] items-center justify-center rounded-xl border border-dashed border-gray-500 bg-black/20">

                        <div className="text-center">

                          <div className="text-4xl">
                            ▦
                          </div>

                          <p className="mt-2 text-[9px] font-black text-gray-400">
                            QR NOT CONFIGURED
                          </p>

                        </div>

                      </div>

                    )}
                  </>
                )}

              </div>

            </section>

            <section className="mt-3 rounded-xl border border-amber-500/30 bg-black/20 p-3">

              <div className="flex items-center justify-between gap-3">

                <span className="text-[9px] font-black text-gray-400">
                  DEPOSIT AMOUNT
                </span>

                <span className="text-lg font-black text-amber-300">
                  ₹
                  {Number(
                    amount || 0
                  ).toLocaleString(
                    'en-IN'
                  )}
                </span>

              </div>

            </section>

            {error && (
              <ErrorBox
                text={error}
              />
            )}

            <button
              type="button"
              onClick={
                continueFromMethod
              }
              className="mt-4 h-[48px] w-full rounded-lg border border-white bg-green-700 text-xs font-black"
            >
              PAYMENT DONE — CONTINUE ›
            </button>
          </>
        )}

        {/* ===============================================
            STEP 3
        =============================================== */}

        {step === 3 && (
          <form
            onSubmit={
              handleSubmit
            }
            className="mt-4 rounded-xl border border-[#28655f] bg-[#083d37] p-4"
          >

            <p className="text-[9px] font-black text-gray-400">
              STEP 3
            </p>

            <h2 className="mt-1 text-lg font-black text-amber-300">
              PAYMENT PROOF
            </h2>

            <div className="mt-4 grid grid-cols-2 gap-2">

              <SmallInfoBox
                label="AMOUNT"
                value={`₹${Number(
                  amount || 0
                ).toLocaleString(
                  'en-IN'
                )}`}
              />

              <SmallInfoBox
                label="METHOD"
                value={
                  selectedMethod
                }
              />

            </div>

            {/* UTR */}

            <label className="mt-5 block">

              <span className="text-[10px] font-black text-gray-300">
                UTR / REFERENCE NUMBER
              </span>

              <input
                type="text"
                value={utr}
                onChange={(event) => {
                  setUtr(
                    event.target.value
                  );

                  setError('');
                }}
                placeholder="Enter UTR / reference number"
                className="mt-2 h-[50px] w-full rounded-lg border border-[#39756f] bg-[#062f2b] px-3 text-sm font-bold text-white outline-none focus:border-amber-400"
              />

            </label>

            {/* PROOF */}

            <label className="mt-5 block">

              <span className="text-[10px] font-black text-gray-300">
                UPLOAD PAYMENT PROOF
              </span>

              <p className="mt-1 text-[8px] text-gray-400">
                Select payment screenshot from your gallery.
              </p>

              <input
                type="file"
                accept="image/*"
                onChange={
                  handleProofChange
                }
                className="mt-2 block w-full rounded-lg border border-[#39756f] bg-[#062f2b] p-3 text-[10px] text-gray-300"
              />

            </label>

            {/* PREVIEW */}

            {proofPreview && (
              <div className="mt-4 overflow-hidden rounded-xl border border-green-500/40 bg-black/20 p-2">

                <p className="mb-2 text-[9px] font-black text-green-300">
                  ✓ PAYMENT PROOF SELECTED
                </p>

                <img
                  src={proofPreview}
                  alt="Payment proof preview"
                  className="max-h-[420px] w-full rounded-lg object-contain"
                />

                <p className="mt-2 break-all text-[8px] text-gray-400">
                  {proofName}
                </p>

              </div>
            )}

            {error && (
              <ErrorBox
                text={error}
              />
            )}

            {message && (
              <SuccessBox
                text={message}
              />
            )}

            <button
              type="submit"
              className="mt-5 h-[48px] w-full rounded-lg border border-white bg-green-700 text-xs font-black"
            >
              SUBMIT DEMO DEPOSIT
            </button>

          </form>
        )}

        {/* ===============================================
            HISTORY
        =============================================== */}

        {step === 1 && (
          <section className="mt-5 overflow-hidden rounded-xl border border-[#28655f] bg-[#083d37]">

            <div className="bg-[#0b6259] px-3 py-3">

              <h2 className="text-xs font-black">
                DEPOSIT REQUESTS
              </h2>

            </div>

            {transactions.length ===
            0 ? (

              <div className="px-3 py-6 text-center">

                <p className="text-[10px] text-gray-400">
                  No demo deposit requests yet.
                </p>

              </div>

            ) : (

              <div>

                {transactions.map(
                  (
                    transaction
                  ) => (

                    <div
                      key={
                        transaction.id
                      }
                      className="border-b border-[#28655f] p-3 last:border-b-0"
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div>

                          <p className="text-sm font-black">
                            ₹
                            {Number(
                              transaction.amount
                            ).toLocaleString(
                              'en-IN'
                            )}
                          </p>

                          <p className="mt-1 text-[8px] text-gray-400">
                            {
                              transaction.method
                            }
                          </p>

                        </div>

                        <StatusBadge
                          status={
                            transaction.status
                          }
                        />

                      </div>

                      <p className="mt-2 break-all text-[9px] text-gray-300">
                        UTR:{' '}
                        {
                          transaction.reference
                        }
                      </p>

                      <p className="mt-1 text-[8px] text-gray-500">
                        {
                          transaction.date
                        }
                      </p>

                    </div>

                  )
                )}

              </div>

            )}

          </section>
        )}

        <p className="px-4 py-6 text-center text-[8px] leading-4 text-gray-500">
          For demonstration and informational purposes only. No real-money transactions.
        </p>

      </main>

    </div>
  );
}

/* =====================================================
   COMPONENTS
===================================================== */

function StepBox({
  number,
  label,
  active,
  completed,
}) {
  let classes =
    'border-[#28655f] bg-[#083d37] text-gray-400';

  if (active) {
    classes =
      'border-amber-400 bg-amber-500/20 text-amber-300';
  }

  if (completed) {
    classes =
      'border-green-500/40 bg-green-500/10 text-green-300';
  }

  return (
    <div
      className={`rounded-lg border p-2 text-center ${classes}`}
    >

      <p className="text-[10px] font-black">
        {completed
          ? '✓'
          : number}
      </p>

      <p className="mt-1 text-[7px] font-black">
        {label}
      </p>

    </div>
  );
}

function DetailRow({
  label,
  value,
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3 last:border-b-0">

      <span className="text-[9px] font-bold text-gray-400">
        {label}
      </span>

      <span className="max-w-[65%] break-all text-right text-[11px] font-black">
        {value}
      </span>

    </div>
  );
}

function SmallInfoBox({
  label,
  value,
}) {
  return (
    <div className="rounded-lg border border-[#28655f] bg-black/20 p-3">

      <p className="text-[7px] font-black text-gray-500">
        {label}
      </p>

      <p className="mt-1 break-all text-[11px] font-black">
        {value}
      </p>

    </div>
  );
}

function ErrorBox({
  text,
}) {
  return (
    <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-[9px] font-bold text-red-300">
      {text}
    </div>
  );
}

function SuccessBox({
  text,
}) {
  return (
    <div className="mt-4 rounded-lg border border-green-500/40 bg-green-500/10 p-3 text-[9px] font-bold text-green-300">
      {text}
    </div>
  );
}

function StatusBadge({
  status,
}) {
  const normalized =
    String(
      status || 'PENDING'
    ).toUpperCase();

  let className =
    'border-amber-500/30 bg-amber-500/10 text-amber-300';

  if (
    normalized ===
    'APPROVED'
  ) {
    className =
      'border-green-500/30 bg-green-500/10 text-green-300';
  }

  if (
    normalized ===
    'REJECTED'
  ) {
    className =
      'border-red-500/30 bg-red-500/10 text-red-300';
  }

  return (
    <span
      className={`rounded border px-2 py-1 text-[7px] font-black ${className}`}
    >
      {normalized}
    </span>
  );
}
