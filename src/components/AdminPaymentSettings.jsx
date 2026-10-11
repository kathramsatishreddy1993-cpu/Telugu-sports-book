import React, { useEffect, useState } from 'react';

const PAYMENT_SETTINGS_KEY = 'telugu_sports_payment_settings';

const defaultSettings = {
  account: {
    accountName: '',
    bankName: '',
    accountNumber: '',
    ifsc: '',
  },

  phonepe: {
    upiId: '',
  },

  gpay: {
    upiId: '',
  },

  paytm: {
    upiId: '',
  },
};

export default function AdminPaymentSettings({
  onBack,
}) {
  const [activeMethod, setActiveMethod] = useState('account');

  const [settings, setSettings] = useState(defaultSettings);

  const [message, setMessage] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(
        PAYMENT_SETTINGS_KEY
      );

      if (!saved) return;

      const parsed = JSON.parse(saved);

      setSettings({
        account: {
          ...defaultSettings.account,
          ...(parsed?.account || {}),
        },

        phonepe: {
          ...defaultSettings.phonepe,
          ...(parsed?.phonepe || {}),
        },

        gpay: {
          ...defaultSettings.gpay,
          ...(parsed?.gpay || {}),
        },

        paytm: {
          ...defaultSettings.paytm,
          ...(parsed?.paytm || {}),
        },
      });
    } catch (error) {
      console.error(
        'Unable to load payment settings:',
        error
      );
    }
  }, []);

  const updateAccount = (field, value) => {
    setSettings((previous) => ({
      ...previous,

      account: {
        ...previous.account,
        [field]: value,
      },
    }));

    setMessage('');
  };

  const updateUpi = (method, value) => {
    setSettings((previous) => ({
      ...previous,

      [method]: {
        ...previous[method],
        upiId: value,
      },
    }));

    setMessage('');
  };

  const handleSave = () => {
    try {
      localStorage.setItem(
        PAYMENT_SETTINGS_KEY,
        JSON.stringify(settings)
      );

      setMessage(
        'Payment details saved successfully.'
      );
    } catch (error) {
      console.error(
        'Unable to save payment settings:',
        error
      );

      setMessage(
        'Unable to save payment details.'
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#061c1a] text-white">

      {/* HEADER */}

      <header className="sticky top-0 z-50 border-b border-amber-500/30 bg-[#9a5a00] px-3 py-3 shadow-xl">

        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">

          <button
            type="button"
            onClick={onBack}
            className="rounded-md border border-amber-200/60 bg-black/10 px-3 py-2 text-[10px] font-black"
          >
            ‹ BACK
          </button>

          <div className="text-right">

            <p className="text-[9px] font-black tracking-[0.12em] text-amber-100">
              TELUGU SPORTS BOOK
            </p>

            <h1 className="text-base font-black">
              PAYMENT DETAILS
            </h1>

          </div>

        </div>

      </header>

      <main className="mx-auto max-w-3xl px-3 py-4">

        {/* INFORMATION */}

        <section className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">

          <p className="text-xs font-black text-amber-300">
            PAYMENT SETTINGS
          </p>

          <p className="mt-2 text-[10px] leading-5 text-gray-300">
            Configure the payment information displayed
            on the customer Deposit Page.
          </p>

        </section>

        {/* METHOD BUTTONS */}

        <section className="mb-4">

          <p className="mb-2 text-xs font-black">
            SELECT METHOD
          </p>

          <div className="grid grid-cols-4 gap-1.5">

            <MethodButton
              active={activeMethod === 'account'}
              label="ACCOUNT"
              onClick={() =>
                setActiveMethod('account')
              }
            />

            <MethodButton
              active={activeMethod === 'phonepe'}
              label="PHONEPE"
              onClick={() =>
                setActiveMethod('phonepe')
              }
            />

            <MethodButton
              active={activeMethod === 'gpay'}
              label="GPAY"
              onClick={() =>
                setActiveMethod('gpay')
              }
            />

            <MethodButton
              active={activeMethod === 'paytm'}
              label="PAYTM"
              onClick={() =>
                setActiveMethod('paytm')
              }
            />

          </div>

        </section>

        {/* ACCOUNT */}

        {activeMethod === 'account' && (

          <PaymentCard title="BANK ACCOUNT DETAILS">

            <InputField
              label="ACCOUNT NAME"
              placeholder="Enter account name"
              value={settings.account.accountName}
              onChange={(event) =>
                updateAccount(
                  'accountName',
                  event.target.value
                )
              }
            />

            <InputField
              label="BANK NAME"
              placeholder="Enter bank name"
              value={settings.account.bankName}
              onChange={(event) =>
                updateAccount(
                  'bankName',
                  event.target.value
                )
              }
            />

            <InputField
              label="ACCOUNT NUMBER"
              placeholder="Enter account number"
              value={settings.account.accountNumber}
              onChange={(event) =>
                updateAccount(
                  'accountNumber',
                  event.target.value
                )
              }
            />

            <InputField
              label="IFSC CODE"
              placeholder="Enter IFSC code"
              value={settings.account.ifsc}
              onChange={(event) =>
                updateAccount(
                  'ifsc',
                  event.target.value.toUpperCase()
                )
              }
            />

          </PaymentCard>

        )}

        {/* PHONEPE */}

        {activeMethod === 'phonepe' && (

          <PaymentCard title="PHONEPE DETAILS">

            <InputField
              label="PHONEPE UPI ID"
              placeholder="Enter PhonePe UPI ID"
              value={settings.phonepe.upiId}
              onChange={(event) =>
                updateUpi(
                  'phonepe',
                  event.target.value
                )
              }
            />

            <PaymentPreview
              title="PHONEPE"
              value={
                settings.phonepe.upiId ||
                'UPI ID not added'
              }
            />

          </PaymentCard>

        )}

        {/* GPAY */}

        {activeMethod === 'gpay' && (

          <PaymentCard title="GOOGLE PAY DETAILS">

            <InputField
              label="GOOGLE PAY UPI ID"
              placeholder="Enter Google Pay UPI ID"
              value={settings.gpay.upiId}
              onChange={(event) =>
                updateUpi(
                  'gpay',
                  event.target.value
                )
              }
            />

            <PaymentPreview
              title="GOOGLE PAY"
              value={
                settings.gpay.upiId ||
                'UPI ID not added'
              }
            />

          </PaymentCard>

        )}

        {/* PAYTM */}

        {activeMethod === 'paytm' && (

          <PaymentCard title="PAYTM DETAILS">

            <InputField
              label="PAYTM UPI ID"
              placeholder="Enter Paytm UPI ID"
              value={settings.paytm.upiId}
              onChange={(event) =>
                updateUpi(
                  'paytm',
                  event.target.value
                )
              }
            />

            <PaymentPreview
              title="PAYTM"
              value={
                settings.paytm.upiId ||
                'UPI ID not added'
              }
            />

          </PaymentCard>

        )}

        {/* SAVE */}

        <section className="mt-5 rounded-xl border border-[#28655f] bg-[#083d37] p-4">

          <p className="text-[10px] leading-5 text-gray-300">
            Save the details after completing your
            payment information.
          </p>

          <button
            type="button"
            onClick={handleSave}
            className="mt-4 h-[48px] w-full rounded-md border border-green-300 bg-green-700 text-xs font-black text-white"
          >
            SAVE PAYMENT DETAILS
          </button>

          {message && (

            <div className="mt-3 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-3">

              <p className="text-center text-[10px] font-black text-green-300">
                {message}
              </p>

            </div>

          )}

        </section>

        {/* IMPORTANT:
            CUSTOMER UTR / SCREENSHOT / AMOUNT
            ARE NOT PART OF THIS PAGE.
        */}

        <p className="px-4 py-6 text-center text-[8px] leading-4 text-gray-500">
          Demo payment configuration.
          No payment is processed on this page.
        </p>

      </main>

    </div>
  );
}

function MethodButton({
  active,
  label,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-[48px] rounded-md border text-[8px] font-black ${
        active
          ? 'border-amber-300 bg-amber-500 text-black'
          : 'border-[#28655f] bg-[#0b554d] text-white'
      }`}
    >
      {label}
    </button>
  );
}

function PaymentCard({
  title,
  children,
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#28655f] bg-[#083d37]">

      <div className="bg-[#0d7468] px-4 py-3">

        <h2 className="text-sm font-black">
          {title}
        </h2>

      </div>

      <div className="space-y-4 p-4">
        {children}
      </div>

    </section>
  );
}

function InputField({
  label,
  value,
  placeholder,
  onChange,
}) {
  return (
    <div>

      <label className="mb-2 block text-[9px] font-black text-gray-300">
        {label}
      </label>

      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete="off"
        className="h-[50px] w-full rounded-md border border-[#397d75] bg-[#063b36] px-3 text-xs font-bold text-white outline-none placeholder:text-gray-500 focus:border-amber-400"
      />

    </div>
  );
}

function PaymentPreview({
  title,
  value,
}) {
  return (
    <div className="rounded-lg border border-[#397d75] bg-black/10 p-4">

      <p className="text-[8px] font-black text-gray-400">
        CURRENT {title} DETAILS
      </p>

      <p className="mt-2 break-all text-xs font-black text-amber-300">
        {value}
      </p>

    </div>
  );
}
