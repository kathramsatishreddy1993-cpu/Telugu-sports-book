import React, { useState } from 'react';

const DEMO_PASSWORD_KEY = 'tsb_demo_login_password';

export default function ChangePasswordPage({
  user,
  onBack,
}) {
  const [currentPassword, setCurrentPassword] =
    useState('');

  const [newPassword, setNewPassword] =
    useState('');

  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [showCurrent, setShowCurrent] =
    useState(false);

  const [showNew, setShowNew] =
    useState(false);

  const [showConfirm, setShowConfirm] =
    useState(false);

  const [message, setMessage] =
    useState('');

  const [error, setError] =
    useState('');

  const handleSubmit = (event) => {
    event.preventDefault();

    setError('');
    setMessage('');

    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      setError('Please fill all password fields.');
      return;
    }

    if (newPassword.length < 6) {
      setError(
        'New password must contain at least 6 characters.'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(
        'New Password and Confirm Password do not match.'
      );
      return;
    }

    /*
      DEMO ONLY:
      This localStorage password is only for the
      simulated demo website.

      A production login system should verify and
      change passwords securely on the backend.
    */

    const savedPassword =
      localStorage.getItem(DEMO_PASSWORD_KEY);

    if (
      savedPassword &&
      currentPassword !== savedPassword
    ) {
      setError('Current Password is incorrect.');
      return;
    }

    if (currentPassword === newPassword) {
      setError(
        'New Password must be different from Current Password.'
      );
      return;
    }

    localStorage.setItem(
      DEMO_PASSWORD_KEY,
      newPassword
    );

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');

    setMessage(
      'Demo password changed successfully.'
    );
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-gray-900">

      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-[#895000] px-3 py-3 text-white shadow">

        <div className="flex items-center justify-between">

          <button
            type="button"
            onClick={onBack}
            className="rounded-md border border-white/40 bg-black/20 px-3 py-2 text-sm font-bold"
          >
            ← Back
          </button>

          <div className="text-center">
            <h1 className="text-base font-black text-amber-300">
              TELUGU SPORTS
            </h1>

            <p className="text-[9px] font-bold tracking-widest">
              BOOK • DEMO
            </p>
          </div>

          <div className="max-w-24 text-right">
            <p className="truncate text-[10px] font-bold">
              {user?.name || 'Demo User'}
            </p>
          </div>

        </div>

      </header>

      {/* PAGE TITLE */}
      <div className="bg-teal-800 px-4 py-5 text-white">

        <h2 className="text-xl font-extrabold">
          Change Password
        </h2>

        <p className="mt-1 text-xs text-teal-100">
          Change your demo login password
        </p>

      </div>

      <main className="mx-auto max-w-xl p-3">

        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-lg border bg-white shadow-sm"
        >

          {/* CURRENT PASSWORD */}
          <div className="border-b p-4">

            <label className="mb-2 block text-sm font-extrabold text-gray-700">
              Current Password
            </label>

            <div className="flex overflow-hidden rounded-md border border-gray-300">

              <input
                type={
                  showCurrent
                    ? 'text'
                    : 'password'
                }
                value={currentPassword}
                onChange={(event) =>
                  setCurrentPassword(
                    event.target.value
                  )
                }
                placeholder="Enter current password"
                autoComplete="current-password"
                className="min-w-0 flex-1 px-3 py-3 text-sm outline-none"
              />

              <button
                type="button"
                onClick={() =>
                  setShowCurrent(
                    (previous) => !previous
                  )
                }
                className="border-l bg-gray-50 px-4 text-xs font-bold text-gray-600"
              >
                {showCurrent
                  ? 'HIDE'
                  : 'SHOW'}
              </button>

            </div>

          </div>

          {/* NEW PASSWORD */}
          <div className="border-b p-4">

            <label className="mb-2 block text-sm font-extrabold text-gray-700">
              New Password
            </label>

            <div className="flex overflow-hidden rounded-md border border-gray-300">

              <input
                type={
                  showNew
                    ? 'text'
                    : 'password'
                }
                value={newPassword}
                onChange={(event) =>
                  setNewPassword(
                    event.target.value
                  )
                }
                placeholder="Enter new password"
                autoComplete="new-password"
                className="min-w-0 flex-1 px-3 py-3 text-sm outline-none"
              />

              <button
                type="button"
                onClick={() =>
                  setShowNew(
                    (previous) => !previous
                  )
                }
                className="border-l bg-gray-50 px-4 text-xs font-bold text-gray-600"
              >
                {showNew
                  ? 'HIDE'
                  : 'SHOW'}
              </button>

            </div>

          </div>

          {/* CONFIRM PASSWORD */}
          <div className="p-4">

            <label className="mb-2 block text-sm font-extrabold text-gray-700">
              Confirm New Password
            </label>

            <div className="flex overflow-hidden rounded-md border border-gray-300">

              <input
                type={
                  showConfirm
                    ? 'text'
                    : 'password'
                }
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
                placeholder="Confirm new password"
                autoComplete="new-password"
                className="min-w-0 flex-1 px-3 py-3 text-sm outline-none"
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirm(
                    (previous) => !previous
                  )
                }
                className="border-l bg-gray-50 px-4 text-xs font-bold text-gray-600"
              >
                {showConfirm
                  ? 'HIDE'
                  : 'SHOW'}
              </button>

            </div>

          </div>

          {/* ERROR */}
          {error && (
            <div className="mx-4 mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-3">
              <p className="text-xs font-bold text-red-700">
                {error}
              </p>
            </div>
          )}

          {/* SUCCESS */}
          {message && (
            <div className="mx-4 mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-3">
              <p className="text-xs font-bold text-green-700">
                ✓ {message}
              </p>
            </div>
          )}

          {/* CHANGE BUTTON */}
          <div className="p-4 pt-0">

            <button
              type="submit"
              className="w-full rounded-md bg-teal-800 py-3 text-sm font-extrabold text-white hover:bg-teal-900"
            >
              CHANGE PASSWORD
            </button>

          </div>

        </form>

        {/* NOTICE */}
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">

          <p className="text-xs font-extrabold text-amber-900">
            🔐 DEMO PASSWORD
          </p>

          <p className="mt-2 text-[11px] leading-5 text-amber-800">
            This password change is for the demo
            website only. Login Password and
            Withdrawal Password are separate.
          </p>

        </div>

        <button
          type="button"
          onClick={onBack}
          className="mt-4 w-full rounded-lg bg-[#895000] py-3 text-sm font-extrabold text-white"
        >
          ← BACK TO HOME
        </button>

      </main>

    </div>
  );
}
