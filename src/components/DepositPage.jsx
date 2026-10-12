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
    }, [step]);

  /* =====================================================
     FORM STATE
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
    proofPreview,
    setProofPreview,
  ] = useState('');

  const [message, setMessage] =
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
     NORMALIZE ADMIN SETTINGS
  ===================================================== */

  const accountSettings =
    paymentSettings.account ||
    paymentSettings.bank ||
    paymentSettings.ACCOUNT ||
    {};

  const phonePeSettings =
    paymentSettings.phonepe ||
    paymentSettings.phonePe ||
    paymentSettings.PHONEPE ||
    {};

  const gpaySettings =
    paymentSettings.gpay ||
    paymentSettings.googlePay ||
    paymentSettings.GPAY ||
    {};

  const paytmSettings =
    paymentSettings.paytm ||
    paymentSettings.PAYTM ||
    {};

  const getValue = (
    object,
    keys
  ) => {
    for (const key of keys) {
      const value =
        object?.[key];

      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ''
      ) {
        return value;
      }
    }

    return '';
  };

  const accountName =
    getValue(
      accountSettings,
      [
        'accountName',
        'holderName',
        'name',
      ]
    ) ||
    getValue(
      paymentSettings,
      [
        'accountName',
        'holderName',
      ]
    );

  const bankName =
    getValue(
      accountSettings,
      [
        'bankName',
        'bank',
      ]
    ) ||
    getValue(
      paymentSettings,
      [
        'bankName',
        'bank',
      ]
    );

  const accountNumber =
    getValue(
      accountSettings,
      [
        'accountNumber',
        'number',
      ]
    ) ||
    getValue(
      paymentSettings,
      [
        'accountNumber',
      ]
    );

  const ifsc =
    getValue(
      accountSettings,
      [
        'ifsc',
        'ifscCode',
      ]
    ) ||
    getValue(
      paymentSettings,
      [
        'ifsc',
        'ifscCode',
      ]
    );

  /* =====================================================
     PAYMENT METHOD HELPERS
  ===================================================== */

  const getMethodSettings = (
    method
  ) => {
    if (method === 'PHONEPE') {
      return phonePeSettings;
    }

    if (method === 'GPAY') {
      return gpaySettings;
    }

    if (method === 'PAYTM') {
      return paytmSettings;
    }

    return accountSettings;
  };

  const methodSettings =
    getMethodSettings(
      selectedMethod
    );

  const selectedUpiId =
    getValue(
      methodSettings,
      [
        'upiId',
        'upi',
        'upiID',
        'id',
      ]
    );

  const selectedQr =
    getValue(
      methodSettings,
      [
        'qrImage',
        'qr',
        'qrCode',
        'image',
        'qrDataUrl',
      ]
    );

  /* =====================================================
     STEP 1 - PROCEED
  ===================================================== */

  const handleProceed = (
    event
  ) => {
    event.preventDefault();

    setMessage('');

    const numericAmount =
      Number(amount);

    if (
      !Number.isFinite(
        numericAmount
      ) ||
      numericAmount <= 0
    ) {
      setMessage(
        'Please enter a valid demo amount.'
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
     BACK TO AMOUNT
  ===================================================== */

  const handleBackToAmount =
    () => {
      setStep(1);

      setUtr('');
      setProofName('');
      setProofPreview('');
      setMessage('');

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    };

  /* =====================================================
     PAYMENT PROOF
  ===================================================== */

  const handleProofChange = (
    event
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      setProofName('');
      setProofPreview('');
      return;
    }

    if (
      !file.type.startsWith(
        'image/'
      )
    ) {
      setMessage(
        'Please select an image as payment proof.'
      );

      event.target.value = '';

      setProofName('');
      setProofPreview('');

      return;
    }

    setMessage('');
    setProofName(file.name);

    const reader =
      new FileReader();

    reader.onload = () => {
      setProofPreview(
        String(
          reader.result || ''
        )
      );
    };

    reader.readAsDataURL(file);
  };

  /* =====================================================
     SUBMIT REQUEST
  ===================================================== */

  const handleSubmit = (
    event
  ) => {
    event.preventDefault();

    setMessage('');

    const numericAmount =
      Number(amount);

    if (
      !Number.isFinite(
        numericAmount
      ) ||
      numericAmount <= 0
    ) {
      setMessage(
        'Please enter a valid demo amount.'
      );

      setStep(1);
      return;
    }

    const cleanUtr =
      utr.trim();

    if (!cleanUtr) {
      setMessage(
        'Please enter UTR / reference number.'
      );

      return;
    }

    if (!proofName) {
      setMessage(
        'Please upload payment proof.'
      );

      return;
    }

    const duplicate =
      transactions.some(
        (transaction) =>
          String(
            transaction.reference ||
              ''
          )
            .trim()
            .toLowerCase() ===
          cleanUtr.toLowerCase()
      );

    if (duplicate) {
      setMessage(
        'This UTR / Reference Number has already been submitted. Please enter a new UTR.'
      );

      return;
    }

    const newTransaction = {
      id: Date.now(),

      customerId:
        user?.loginId ||
        user?.identifier ||
        user?.id ||
        'demo-user',

      customerName:
        user?.name ||
        user?.loginId ||
        user?.identifier ||
        'Demo User',

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

      status:
        'PENDING',

      date:
        new Date().toLocaleString(
          'en-IN'
        ),

      createdAt:
        new Date().toISOString(),
    };

    const updatedTransactions = [
      newTransaction,
      ...transactions,
    ];

    setTransactions(
      updatedTransactions
    );

    try {
      localStorage.setItem(
        DEPOSIT_KEY,
        JSON.stringify(
          updatedTransactions
        )
      );
    } catch (error) {
      console.error(
        'Unable to save demo deposit:',
        error
      );

      setMessage(
        'Unable to save demo deposit request.'
      );

      return;
    }

    setUtr('');
    setProofName('');
    setProofPreview('');

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
            onClick={
              step === 1
                ? onBack
                : handleBackToAmount
            }
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

        {/* USER */}

        <section className="rounded-xl border border-[#17665d] bg-[#083d37] p-3">

          <div className="flex items-center justify-between gap-3">

            <div>

              <p className="text-[9px] font-bold text-gray-300">
                CUSTOMER
              </p>

              <p className="mt-1 text-xs font-black">
                {user?.name ||
                  user?.loginId ||
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

        {/* NOTICE */}

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

        {/* =================================================
            STEP 1
        ================================================= */}

        {step === 1 && (

          <form
            onSubmit={
              handleProceed
            }
            className="mt-4 rounded-xl border border-[#28655f] bg-[#083d37] p-4"
          >

            <div className="mb-4">

              <p className="text-[9px] font-black text-gray-400">
                STEP 1
              </p>

              <h2 className="mt-1 text-base font-black text-amber-300">
                DEPOSIT AMOUNT
              </h2>

              <p className="mt-2 text-[9px] leading-4 text-gray-400">
                Enter the demo deposit
                amount and press Proceed.
              </p>

            </div>

            <label className="block">

              <span className="text-[10px] font-black text-gray-300">
                AMOUNT
              </span>

              <input
                type="number"
                inputMode="decimal"
                min="1"
                value={amount}
                onChange={(
                  event
                ) => {
                  setAmount(
                    event.target.value
                  );

                  setMessage('');
                }}
                placeholder="Enter amount"
                className="mt-2 h-[52px] w-full rounded-lg border border-[#39756f] bg-[#062f2b] px-4 text-base font-black text-white outline-none focus:border-amber-400"
              />

            </label>

            <div className="mt-3 grid grid-cols-4 gap-1.5">

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

                      setMessage('');
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

            {message && (

              <div className="mt-3 rounded-lg border border-amber-500/30 bg-black/20 p-3 text-[10px] font-bold text-amber-200">
                {message}
              </div>

            )}

            <button
              type="submit"
              className="mt-4 h-[48px] w-full rounded-lg border border-amber-300 bg-amber-500 text-xs font-black text-black shadow-lg"
            >
              PROCEED
            </button>

          </form>

        )}

        {/* =================================================
            STEP 2
        ================================================= */}

        {step === 2 && (

          <>

            {/* AMOUNT SUMMARY */}

            <section className="mt-4 rounded-xl border border-amber-500/30 bg-[#083d37] p-4">

              <div className="flex items-center justify-between gap-3">

                <div>

                  <p className="text-[8px] font-black text-gray-400">
                    DEPOSIT AMOUNT
                  </p>

                  <p className="mt-1 text-xl font-black text-amber-300">
                    ₹
                    {Number(
                      amount
                    ).toLocaleString(
                      'en-IN'
                    )}
                  </p>

                </div>

                <button
                  type="button"
                  onClick={
                    handleBackToAmount
                  }
                  className="rounded-lg border border-amber-500/40 px-3 py-2 text-[8px] font-black text-amber-300"
                >
                  CHANGE
                </button>

              </div>

            </section>

            {/* PAYMENT METHOD */}

            <section className="mt-4">

              <p className="mb-2 text-[9px] font-black text-gray-400">
                STEP 2
              </p>

              <h2 className="mb-3 text-xs font-black">
                SELECT PAYMENT METHOD
              </h2>

              <div className="grid grid-cols-4 gap-1">

                {paymentMethods.map(
                  (method) => (

                    <button
                      key={method}
                      type="button"
                      onClick={() => {
                        setSelectedMethod(
                          method
                        );

                        setMessage('');
                      }}
                      className={`min-h-[48px] rounded-lg border px-1 text-[8px] font-black ${
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

            {/* PAYMENT DETAILS */}

            <section className="mt-3 overflow-hidden rounded-xl border border-[#28655f] bg-[#083d37]">

              <div className="bg-[#0b6259] px-4 py-3">

                <h2 className="text-xs font-black">
                  {selectedMethod}{' '}
                  DETAILS
                </h2>

              </div>

              <div className="space-y-3 p-4">

                {selectedMethod ===
                'ACCOUNT' ? (

                  <>

                    <DetailRow
                      label="Account Name"
                      value={
                        accountName ||
                        'Not configured by Admin'
                      }
                    />

                    <DetailRow
                      label="Bank"
                      value={
                        bankName ||
                        'Not configured by Admin'
                      }
                    />

                    <DetailRow
                      label="Account Number"
                      value={
                        accountNumber ||
                        'Not configured by Admin'
                      }
                    />

                    <DetailRow
                      label="IFSC"
                      value={
                        ifsc ||
                        'Not configured by Admin'
                      }
                    />

                  </>

                ) : (

                  <>

                    <DetailRow
                      label={`${selectedMethod} UPI ID`}
                      value={
                        selectedUpiId ||
                        'Not configured by Admin'
                      }
                    />

                    {selectedQr ? (

                      <div className="rounded-xl border border-[#39756f] bg-white p-3">

                        <img
                          src={
                            selectedQr
                          }
                          alt={`${selectedMethod} QR`}
                          className="mx-auto max-h-[240px] w-auto max-w-full object-contain"
                        />

                      </div>

                    ) : (

                      <div className="flex min-h-[150px] items-center justify-center rounded-xl border border-dashed border-gray-500 bg-black/20">

                        <div className="text-center">

                          <div className="text-4xl">
                            ▦
                          </div>

                          <p className="mt-2 text-[9px] font-black text-gray-400">
                            QR NOT CONFIGURED BY ADMIN
                          </p>

                        </div>

                      </div>

                    )}

                  </>

                )}

              </div>

            </section>

            {/* PAYMENT PROOF FORM */}

            <form
              onSubmit={
                handleSubmit
              }
              className="mt-4 rounded-xl border border-[#28655f] bg-[#083d37] p-4"
            >

              <h2 className="text-sm font-black text-amber-300">
                PAYMENT CONFIRMATION
              </h2>

              <p className="mt-2 text-[9px] leading-4 text-gray-400">
                After completing the demo
                payment step, enter the
                reference number and upload
                payment proof.
              </p>

              {/* UTR */}

              <label className="mt-4 block">

                <span className="text-[10px] font-black text-gray-300">
                  UTR / REFERENCE NUMBER
                </span>

                <input
                  type="text"
                  value={utr}
                  onChange={(
                    event
                  ) => {
                    setUtr(
                      event.target.value
                    );

                    setMessage('');
                  }}
                  placeholder="Enter UTR / reference number"
                  className="mt-2 h-[48px] w-full rounded-lg border border-[#39756f] bg-[#062f2b] px-3 text-sm font-bold text-white outline-none focus:border-amber-400"
                />

              </label>

              {/* PROOF */}

              <label className="mt-4 block">

                <span className="text-[10px] font-black text-gray-300">
                  UPLOAD PAYMENT PROOF
                </span>

                <p className="mt-1 text-[8px] text-gray-500">
                  Select screenshot or
                  payment proof image from
                  your device.
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

              {proofName && (

                <div className="mt-3 rounded-lg border border-green-500/30 bg-green-500/10 p-3">

                  <p className="text-[9px] font-black text-green-300">
                    ✓ PAYMENT PROOF SELECTED
                  </p>

                  <p className="mt-1 break-all text-[8px] text-gray-300">
                    {proofName}
                  </p>

                </div>

              )}

              {proofPreview && (

                <div className="mt-3 overflow-hidden rounded-xl border border-[#39756f] bg-black/20 p-2">

                  <img
                    src={
                      proofPreview
                    }
                    alt="Payment proof preview"
                    className="mx-auto max-h-[260px] w-auto max-w-full rounded-lg object-contain"
                  />

                </div>

              )}

              {message && (

                <div className="mt-3 rounded-lg border border-amber-500/30 bg-black/20 p-3 text-[10px] font-bold text-amber-200">
                  {message}
                </div>

              )}

              <button
                type="submit"
                className="mt-4 h-[48px] w-full rounded-lg border border-white bg-green-700 text-xs font-black text-white shadow-lg"
              >
                SUBMIT DEMO DEPOSIT
              </button>

            </form>

          </>

        )}

        {/* HISTORY */}

        <section className="mt-4 overflow-hidden rounded-xl border border-[#28655f] bg-[#083d37]">

          <div className="bg-[#0b6259] px-3 py-2">

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

        <p className="px-4 py-6 text-center text-[9px] leading-4 text-gray-400">
          For demonstration and
          informational purposes only. No
          real-money transactions.
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
    <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3 last:border-b-0">

      <span className="text-[9px] font-bold text-gray-400">
        {label}
      </span>

      <span className="max-w-[65%] break-all text-right text-[10px] font-black text-white">
        {value}
      </span>

    </div>
  );
}
