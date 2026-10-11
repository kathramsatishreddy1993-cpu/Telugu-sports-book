import React, { useEffect, useState } from 'react';

const PAYMENT_SETTINGS_KEY = 'telugu_sports_payment_settings';

const defaultSettings = {
  account: {
    accountName: 'TELUGU SPORTS BOOK DEMO',
    bankName: 'Demo Bank',
    accountNumber: 'XXXX XXXX 1234',
    ifsc: 'DEMO0001234',
  },

  phonepe: {
    upiId: 'demo@upi',
    qrImage: '',
  },

  gpay: {
    upiId: 'demo@upi',
    qrImage: '',
  },

  paytm: {
    upiId: 'demo@upi',
    qrImage: '',
  },
};

export default function AdminPaymentSettings({ onBack }) {
  const [settings, setSettings] = useState(defaultSettings);
  const [activeMethod, setActiveMethod] = useState('account');
  const [message, setMessage] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PAYMENT_SETTINGS_KEY);

      if (saved) {
        const parsed = JSON.parse(saved);

        setSettings({
          account: {
            ...defaultSettings.account,
            ...(parsed.account || {}),
          },

          phonepe: {
            ...defaultSettings.phonepe,
            ...(parsed.phonepe || {}),
          },

          gpay: {
            ...defaultSettings.gpay,
            ...(parsed.gpay || {}),
          },

          paytm: {
            ...defaultSettings.paytm,
            ...(parsed.paytm || {}),
          },
        });
      }
    } catch (error) {
      console.error('Unable to load payment settings:', error);
    }
  }, []);

  const updateAccount = (field, value) => {
    setSettings((current) => ({
      ...current,
      account: {
        ...current.account,
        [field]: value,
      },
    }));

    setMessage('');
  };

  const updateUPI = (method, field, value) => {
    setSettings((current) => ({
      ...current,
      [method]: {
        ...current[method],
        [field]: value,
      },
    }));

    setMessage('');
  };

  const handleQRUpload = (method, file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage('Please select an image file.');
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      updateUPI(method, 'qrImage', reader.result);
    };

    reader.onerror = () => {
      setMessage('Unable to read QR image.');
    };

    reader.readAsDataURL(file);
  };

  const removeQR = (method) => {
    updateUPI(method, 'qrImage', '');
  };

  const saveSettings = () => {
    try {
      localStorage.setItem(
        PAYMENT_SETTINGS_KEY,
        JSON.stringify(settings)
      );

      setMessage('Payment settings saved successfully.');
    } catch (error) {
      console.error('Unable to save payment settings:', error);

      setMessage(
        'Unable to save settings. QR image may be too large.'
      );
    }
  };

  const resetSettings = () => {
    const confirmed = window.confirm(
      'Reset all payment settings to demo defaults?'
    );

    if (!confirmed) return;

    setSettings(defaultSettings);

    localStorage.setItem(
      PAYMENT_SETTINGS_KEY,
      JSON.stringify(defaultSettings)
    );

    setMessage('Payment settings reset.');
  };

  const methodButton = (id, label) => (
    <button
      type="button"
      onClick={() => {
        setActiveMethod(id);
        setMessage('');
      }}
      className={`rounded-lg border px-2 py-3 text-[11px] font-black transition ${
        activeMethod === id
          ? 'border-amber-400 bg-amber-500 text-black'
          : 'border-teal-700 bg-[#0b4d43] text-white'
      }`}
    >
      {label}
    </button>
  );

  const renderUPISettings = (method, title) => {
    const data = settings[method];

    return (
      <section className="overflow-hidden rounded-2xl border border-teal-700 bg-[#09473f]">
        <div className="bg-[#0d7466] px-4 py-4">
          <h2 className="text-lg font-black">
            {title} SETTINGS
          </h2>
        </div>

        <div className="space-y-5 p-4">
          <div>
            <label className="mb-2 block text-xs font-black text-gray-300">
              {title} UPI ID
            </label>

            <input
              type="text"
              value={data.upiId}
              onChange={(event) =>
                updateUPI(
                  method,
                  'upiId',
                  event.target.value
                )
              }
              placeholder="Enter UPI ID"
              className="w-full rounded-xl border border-teal-700 bg-[#063c36] px-4 py-4 text-sm font-bold text-white outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-black text-gray-300">
              QR / SCANNER IMAGE
            </label>

            <label className="flex min-h-[70px] cursor-pointer items-center justify-center rounded-xl border border-dashed border-teal-500 bg-[#063c36] px-4 text-center">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) =>
                  handleQRUpload(
                    method,
                    event.target.files?.[0]
                  )
                }
              />

              <span className="text-sm font-black text-amber-300">
                + SELECT QR IMAGE
              </span>
            </label>
          </div>

          {data.qrImage ? (
            <div className="rounded-xl border border-teal-700 bg-[#063c36] p-4">
              <p className="mb-3 text-xs font-black text-gray-400">
                QR PREVIEW
              </p>

              <div className="flex justify-center">
                <img
                  src={data.qrImage}
                  alt={`${title} QR`}
                  className="max-h-[260px] max-w-full rounded-xl bg-white object-contain p-2"
                />
              </div>

              <button
                type="button"
                onClick={() => removeQR(method)}
                className="mt-4 w-full rounded-lg border border-red-500/50 bg-red-500/10 py-3 text-xs font-black text-red-300"
              >
                REMOVE QR IMAGE
              </button>
            </div>
          ) : (
            <div className="flex min-h-[170px] items-center justify-center rounded-xl border border-dashed border-gray-600 bg-[#063c36]">
              <div className="text-center text-gray-400">
                <div className="text-4xl">▦</div>

                <p className="mt-2 text-xs font-black">
                  NO QR IMAGE SELECTED
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-[#003f37] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#a86600] px-4 py-4">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-amber-200/70 px-4 py-3 text-sm font-black"
          >
            ‹ BACK
          </button>

          <div className="text-right">
            <p className="text-[11px] font-black uppercase tracking-wider text-amber-100">
              TELUGU SPORTS BOOK
            </p>

            <h1 className="text-xl font-black">
              PAYMENT SETTINGS
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-xl space-y-5 px-4 py-5">
        <section className="rounded-2xl border border-amber-500/40 bg-[#173d2c] p-4">
          <p className="text-sm font-black text-amber-300">
            ADMIN PAYMENT SETTINGS
          </p>

          <p className="mt-2 text-xs leading-5 text-gray-300">
            Manage the demo payment details displayed on the
            customer Deposit page.
          </p>
        </section>

        <section>
          <p className="mb-3 text-sm font-black">
            SELECT METHOD
          </p>

          <div className="grid grid-cols-4 gap-2">
            {methodButton('account', 'ACCOUNT')}
            {methodButton('phonepe', 'PHONEPE')}
            {methodButton('gpay', 'GPAY')}
            {methodButton('paytm', 'PAYTM')}
          </div>
        </section>

        {activeMethod === 'account' && (
          <section className="overflow-hidden rounded-2xl border border-teal-700 bg-[#09473f]">
            <div className="bg-[#0d7466] px-4 py-4">
              <h2 className="text-lg font-black">
                BANK ACCOUNT SETTINGS
              </h2>
            </div>

            <div className="space-y-4 p-4">
              <div>
                <label className="mb-2 block text-xs font-black text-gray-300">
                  ACCOUNT NAME
                </label>

                <input
                  type="text"
                  value={settings.account.accountName}
                  onChange={(event) =>
                    updateAccount(
                      'accountName',
                      event.target.value
                    )
                  }
                  placeholder="Enter account name"
                  className="w-full rounded-xl border border-teal-700 bg-[#063c36] px-4 py-4 text-sm font-bold text-white outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-black text-gray-300">
                  BANK NAME
                </label>

                <input
                  type="text"
                  value={settings.account.bankName}
                  onChange={(event) =>
                    updateAccount(
                      'bankName',
                      event.target.value
                    )
                  }
                  placeholder="Enter bank name"
                  className="w-full rounded-xl border border-teal-700 bg-[#063c36] px-4 py-4 text-sm font-bold text-white outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-black text-gray-300">
                  ACCOUNT NUMBER
                </label>

                <input
                  type="text"
                  value={settings.account.accountNumber}
                  onChange={(event) =>
                    updateAccount(
                      'accountNumber',
                      event.target.value
                    )
                  }
                  placeholder="Enter account number"
                  className="w-full rounded-xl border border-teal-700 bg-[#063c36] px-4 py-4 text-sm font-bold text-white outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-black text-gray-300">
                  IFSC
                </label>

                <input
                  type="text"
                  value={settings.account.ifsc}
                  onChange={(event) =>
                    updateAccount(
                      'ifsc',
                      event.target.value.toUpperCase()
                    )
                  }
                  placeholder="Enter IFSC"
                  className="w-full rounded-xl border border-teal-700 bg-[#063c36] px-4 py-4 text-sm font-bold uppercase text-white outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </section>
        )}

        {activeMethod === 'phonepe' &&
          renderUPISettings('phonepe', 'PHONEPE')}

        {activeMethod === 'gpay' &&
          renderUPISettings('gpay', 'GPAY')}

        {activeMethod === 'paytm' &&
          renderUPISettings('paytm', 'PAYTM')}

        {message && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-center text-sm font-bold text-emerald-300">
            {message}
          </div>
        )}

        <button
          type="button"
          onClick={saveSettings}
          className="w-full rounded-xl border border-emerald-300 bg-emerald-600 py-4 text-sm font-black text-white"
        >
          SAVE PAYMENT SETTINGS
        </button>

        <button
          type="button"
          onClick={resetSettings}
          className="w-full rounded-xl border border-gray-600 bg-[#0a302c] py-3 text-xs font-black text-gray-300"
        >
          RESET DEMO SETTINGS
        </button>

        <p className="pb-8 pt-2 text-center text-[11px] leading-5 text-gray-400">
          Demo management settings only. No real-money
          transaction is processed by this page.
        </p>
      </main>
    </div>
  );
}
