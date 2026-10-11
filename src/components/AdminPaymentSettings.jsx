import React, { useEffect, useRef, useState } from 'react';

const PAYMENT_SETTINGS_KEY =
  'telugu_sports_payment_settings';

const defaultSettings = {
  account: {
    accountName: '',
    bankName: '',
    accountNumber: '',
    ifsc: '',
  },

  phonepe: {
    upiId: '',
    qrImage: '',
  },

  gpay: {
    upiId: '',
    qrImage: '',
  },

  paytm: {
    upiId: '',
    qrImage: '',
  },
};

export default function AdminPaymentSettings({
  onBack,
}) {
  const [activeMethod, setActiveMethod] =
    useState('account');

  const [settings, setSettings] =
    useState(defaultSettings);

  const [message, setMessage] =
    useState('');

  /* =========================
     LOAD SAVED SETTINGS
     ========================= */

  useEffect(() => {
    try {
      const saved =
        localStorage.getItem(
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

  /* =========================
     ACCOUNT UPDATE
     ========================= */

  const updateAccount = (
    field,
    value
  ) => {
    setSettings((previous) => ({
      ...previous,

      account: {
        ...previous.account,
        [field]: value,
      },
    }));

    setMessage('');
  };

  /* =========================
     UPI UPDATE
     ========================= */

  const updateUpi = (
    method,
    value
  ) => {
    setSettings((previous) => ({
      ...previous,

      [method]: {
        ...previous[method],
        upiId: value,
      },
    }));

    setMessage('');
  };

  /* =========================
     QR IMAGE UPDATE
     ========================= */

  const updateQrImage = (
    method,
    image
  ) => {
    setSettings((previous) => ({
      ...previous,

      [method]: {
        ...previous[method],
        qrImage: image,
      },
    }));

    setMessage('');
  };

  /* =========================
     QR FILE SELECT
     ========================= */

  const handleQrUpload = (
    method,
    file
  ) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage(
        'Please select an image file.'
      );
      return;
    }

    /*
      Keep the image reasonably small
      because this demo currently stores
      settings in localStorage.
    */

    const maxSize =
      1.5 * 1024 * 1024;

    if (file.size > maxSize) {
      setMessage(
        'QR image is too large. Please upload an image smaller than 1.5 MB.'
      );
      return;
    }

    const reader =
      new FileReader();

    reader.onload = () => {
      updateQrImage(
        method,
        reader.result
      );

      setMessage(
        'QR image selected. Press SAVE PAYMENT DETAILS to save it.'
      );
    };

    reader.onerror = () => {
      setMessage(
        'Unable to read QR image.'
      );
    };

    reader.readAsDataURL(file);
  };

  /* =========================
     REMOVE QR
     ========================= */

  const handleRemoveQr = (
    method
  ) => {
    updateQrImage(
      method,
      ''
    );

    setMessage(
      'QR image removed. Press SAVE PAYMENT DETAILS to save the change.'
    );
  };

  /* =========================
     SAVE
     ========================= */

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
        'Unable to save payment details. QR image may be too large.'
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
              DEPOSIT ACCOUNTS
            </h1>

          </div>

        </div>

      </header>

      <main className="mx-auto max-w-3xl px-3 py-4">

        {/* INFORMATION */}

        <section className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">

          <p className="text-xs font-black text-amber-300">
            DEPOSIT ACCOUNT SETTINGS
          </p>

          <p className="mt-2 text-[10px] leading-5 text-gray-300">
            Configure the bank and UPI
            information displayed on the
            customer Deposit Page.
          </p>

        </section>

        {/* METHOD BUTTONS */}

        <section className="mb-4">

          <p className="mb-2 text-xs font-black">
            SELECT METHOD
          </p>

          <div className="grid grid-cols-4 gap-1.5">

            <MethodButton
              active={
                activeMethod ===
                'account'
              }
              label="ACCOUNT"
              onClick={() =>
                setActiveMethod(
                  'account'
                )
              }
            />

            <MethodButton
              active={
                activeMethod ===
                'phonepe'
              }
              label="PHONEPE"
              onClick={() =>
                setActiveMethod(
                  'phonepe'
                )
              }
            />

            <MethodButton
              active={
                activeMethod ===
                'gpay'
              }
              label="GPAY"
              onClick={() =>
                setActiveMethod(
                  'gpay'
                )
              }
            />

            <MethodButton
              active={
                activeMethod ===
                'paytm'
              }
              label="PAYTM"
              onClick={() =>
                setActiveMethod(
                  'paytm'
                )
              }
            />

          </div>

        </section>

        {/* =====================
            BANK ACCOUNT
            ===================== */}

        {activeMethod ===
          'account' && (

          <PaymentCard title="BANK ACCOUNT DETAILS">

            <InputField
              label="ACCOUNT NAME"
              placeholder="Enter account name"
              value={
                settings.account
                  .accountName
              }
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
              value={
                settings.account
                  .bankName
              }
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
              value={
                settings.account
                  .accountNumber
              }
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
              value={
                settings.account.ifsc
              }
              onChange={(event) =>
                updateAccount(
                  'ifsc',
                  event.target.value
                    .toUpperCase()
                )
              }
            />

          </PaymentCard>

        )}

        {/* =====================
            PHONEPE
            ===================== */}

        {activeMethod ===
          'phonepe' && (

          <PaymentCard title="PHONEPE DETAILS">

            <InputField
              label="PHONEPE UPI ID"
              placeholder="Enter PhonePe UPI ID"
              value={
                settings.phonepe.upiId
              }
              onChange={(event) =>
                updateUpi(
                  'phonepe',
                  event.target.value
                )
              }
            />

            <QrImageManager
              method="phonepe"
              title="PHONEPE"
              image={
                settings.phonepe
                  .qrImage
              }
              onUpload={
                handleQrUpload
              }
              onRemove={
                handleRemoveQr
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

        {/* =====================
            GOOGLE PAY
            ===================== */}

        {activeMethod ===
          'gpay' && (

          <PaymentCard title="GOOGLE PAY DETAILS">

            <InputField
              label="GOOGLE PAY UPI ID"
              placeholder="Enter Google Pay UPI ID"
              value={
                settings.gpay.upiId
              }
              onChange={(event) =>
                updateUpi(
                  'gpay',
                  event.target.value
                )
              }
            />

            <QrImageManager
              method="gpay"
              title="GOOGLE PAY"
              image={
                settings.gpay.qrImage
              }
              onUpload={
                handleQrUpload
              }
              onRemove={
                handleRemoveQr
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

        {/* =====================
            PAYTM
            ===================== */}

        {activeMethod ===
          'paytm' && (

          <PaymentCard title="PAYTM DETAILS">

            <InputField
              label="PAYTM UPI ID"
              placeholder="Enter Paytm UPI ID"
              value={
                settings.paytm.upiId
              }
              onChange={(event) =>
                updateUpi(
                  'paytm',
                  event.target.value
                )
              }
            />

            <QrImageManager
              method="paytm"
              title="PAYTM"
              image={
                settings.paytm.qrImage
              }
              onUpload={
                handleQrUpload
              }
              onRemove={
                handleRemoveQr
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

        {/* =====================
            SAVE
            ===================== */}

        <section className="mt-5 rounded-xl border border-[#28655f] bg-[#083d37] p-4">

          <p className="text-[10px] leading-5 text-gray-300">
            Save the details after
            completing your deposit
            account information.
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

        <p className="px-4 py-6 text-center text-[8px] leading-4 text-gray-500">
          Demo payment configuration.
          No payment is processed on
          this page.
        </p>

      </main>

    </div>
  );
}

/* =========================
   METHOD BUTTON
   ========================= */

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

/* =========================
   PAYMENT CARD
   ========================= */

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

/* =========================
   INPUT FIELD
   ========================= */

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

/* =========================
   QR IMAGE MANAGER
   ========================= */

function QrImageManager({
  method,
  title,
  image,
  onUpload,
  onRemove,
}) {
  const inputRef =
    useRef(null);

  const openFilePicker = () => {
    inputRef.current?.click();
  };

  return (
    <div>

      <p className="mb-2 text-[9px] font-black text-gray-300">
        UPLOAD {title} QR IMAGE
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
        onChange={(event) => {
          const file =
            event.target.files?.[0];

          onUpload(
            method,
            file
          );

          event.target.value = '';
        }}
      />

      {!image ? (

        <button
          type="button"
          onClick={
            openFilePicker
          }
          className="flex min-h-[110px] w-full flex-col items-center justify-center rounded-lg border border-dashed border-amber-400/60 bg-black/10 px-4 py-5"
        >

          <span className="text-3xl">
            🖼️
          </span>

          <span className="mt-2 text-[10px] font-black text-amber-300">
            UPLOAD {title} QR IMAGE
          </span>

          <span className="mt-1 text-[8px] text-gray-500">
            PNG, JPG or WEBP
          </span>

        </button>

      ) : (

        <div className="rounded-xl border border-[#397d75] bg-black/10 p-4">

          <p className="mb-3 text-[8px] font-black text-gray-400">
            UPLOADED QR PREVIEW
          </p>

          <div className="flex justify-center">

            <div className="rounded-xl bg-white p-3">

              <img
                src={image}
                alt={`${title} QR`}
                className="h-[190px] w-[190px] object-contain"
              />

            </div>

          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">

            <button
              type="button"
              onClick={
                openFilePicker
              }
              className="h-[42px] rounded-md border border-amber-400/50 bg-amber-500/10 text-[9px] font-black text-amber-300"
            >
              CHANGE QR
            </button>

            <button
              type="button"
              onClick={() =>
                onRemove(method)
              }
              className="h-[42px] rounded-md border border-red-500/50 bg-red-500/10 text-[9px] font-black text-red-300"
            >
              REMOVE QR
            </button>

          </div>

        </div>

      )}

    </div>
  );
}

/* =========================
   PAYMENT PREVIEW
   ========================= */

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
