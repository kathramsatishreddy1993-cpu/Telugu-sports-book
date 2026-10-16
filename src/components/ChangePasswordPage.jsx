import React, { useState } from 'react';

export default function ChangePasswordPage({
  user,
  onComplete,
  onLogout,
}) {
  const loginId =
    user?.loginId ||
    user?.identifier ||
    '';

  const [
    loginPasswordDone,
    setLoginPasswordDone,
  ] = useState(false);

  const [
    withdrawalPasswordDone,
    setWithdrawalPasswordDone,
  ] = useState(false);

  /* LOGIN PASSWORD */

  const [
    currentLoginPassword,
    setCurrentLoginPassword,
  ] = useState('');

  const [
    newLoginPassword,
    setNewLoginPassword,
  ] = useState('');

  const [
    confirmLoginPassword,
    setConfirmLoginPassword,
  ] = useState('');

  /* WITHDRAWAL PASSWORD */

  const [
    currentWithdrawalPassword,
    setCurrentWithdrawalPassword,
  ] = useState('');

  const [
    newWithdrawalPassword,
    setNewWithdrawalPassword,
  ] = useState('');

  const [
    confirmWithdrawalPassword,
    setConfirmWithdrawalPassword,
  ] = useState('');

  /* UI */

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  const [message, setMessage] =
    useState('');

  const [
    showLoginPasswords,
    setShowLoginPasswords,
  ] = useState(false);

  const [
    showWithdrawalPasswords,
    setShowWithdrawalPasswords,
  ] = useState(false);

  /* CHANGE LOGIN PASSWORD */

  const changeLoginPassword = async (
    event
  ) => {
    event.preventDefault();

    setError('');
    setMessage('');

    if (
      !currentLoginPassword ||
      !newLoginPassword ||
      !confirmLoginPassword
    ) {
      setError(
        'Please complete all Login Password fields.'
      );
      return;
    }

    if (newLoginPassword.length < 6) {
      setError(
        'New Login Password must contain at least 6 characters.'
      );
      return;
    }

    if (
      newLoginPassword !==
      confirmLoginPassword
    ) {
      setError(
        'New Password and Confirm New Password do not match.'
      );
      return;
    }

    if (
      currentLoginPassword ===
      newLoginPassword
    ) {
      setError(
        'New Login Password must be different from Old Password.'
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        '/api/auth/change-customer-password',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            loginId,
            currentPassword:
              currentLoginPassword,
            newPassword:
              newLoginPassword,
            confirmPassword:
              confirmLoginPassword,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            'Unable to change Login Password.'
        );
      }

      setLoginPasswordDone(true);

      setCurrentLoginPassword('');
      setNewLoginPassword('');
      setConfirmLoginPassword('');

      setMessage(
        'Login Password changed successfully.'
      );
    } catch (requestError) {
      console.error(
        'Login Password Change Error:',
        requestError
      );

      setError(
        requestError.message ||
          'Unable to change Login Password.'
      );
    } finally {
      setLoading(false);
    }
  };

  /* CHANGE WITHDRAWAL PASSWORD */

  const changeWithdrawalPassword =
    async (event) => {
      event.preventDefault();

      setError('');
      setMessage('');

      if (
        !currentWithdrawalPassword ||
        !newWithdrawalPassword ||
        !confirmWithdrawalPassword
      ) {
        setError(
          'Please complete all Withdrawal Password fields.'
        );
        return;
      }

      if (
        newWithdrawalPassword.length < 6
      ) {
        setError(
          'New Withdrawal Password must contain at least 6 characters.'
        );
        return;
      }

      if (
        newWithdrawalPassword !==
        confirmWithdrawalPassword
      ) {
        setError(
          'New Withdrawal Password and Confirm New Withdrawal Password do not match.'
        );
        return;
      }

      if (
        currentWithdrawalPassword ===
        newWithdrawalPassword
      ) {
        setError(
          'New Withdrawal Password must be different from Old Withdrawal Password.'
        );
        return;
      }

      try {
        setLoading(true);

        const response = await fetch(
          '/api/auth/change-withdrawal-password',
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              loginId,
              currentPassword:
                currentWithdrawalPassword,
              newPassword:
                newWithdrawalPassword,
              confirmPassword:
                confirmWithdrawalPassword,
            }),
          }
        );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
              'Unable to change Withdrawal Password.'
          );
        }

        setWithdrawalPasswordDone(true);

        setCurrentWithdrawalPassword('');
        setNewWithdrawalPassword('');
        setConfirmWithdrawalPassword('');

        setMessage(
          'Withdrawal Password changed successfully.'
        );
      } catch (requestError) {
        console.error(
          'Withdrawal Password Change Error:',
          requestError
        );

        setError(
          requestError.message ||
            'Unable to change Withdrawal Password.'
        );
      } finally {
        setLoading(false);
      }
    };

  /* CONTINUE TO DASHBOARD */

  const continueToDashboard = () => {
    setError('');

    if (
      !loginPasswordDone ||
      !withdrawalPasswordDone
    ) {
      setError(
        'Please change both passwords first.'
      );
      return;
    }

    const updatedUser = {
      ...user,
      loginId,
      identifier: loginId,
      isAuthenticated: true,
      mustChangePassword: false,
      mustChangeWithdrawalPassword:
        false,
      withdrawalPasswordConfigured:
        true,
    };

    try {
      localStorage.setItem(
        'telugu_sports_auth_user',
        JSON.stringify(updatedUser)
      );
    } catch (storageError) {
      console.error(
        'Session update error:',
        storageError
      );
    }

    if (
      typeof onComplete === 'function'
    ) {
      onComplete(updatedUser);
      return;
    }

    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-[#061c1a] text-white">

      {/* HEADER */}

      <header className="border-b border-amber-500/30 bg-[#9a5a00] px-4 py-4">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">

          <div>
            <p className="text-[9px] font-black tracking-[0.15em] text-amber-200">
              TELUGU SPORTS BOOK
            </p>

            <h1 className="mt-1 text-lg font-black">
              🔐 SECURITY SETUP
            </h1>
          </div>

          <div className="text-right">
            <p className="text-[8px] text-amber-100">
              LOGIN ID
            </p>

            <p className="text-[10px] font-black">
              {loginId || 'CUSTOMER'}
            </p>
          </div>

        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-6">

        {/* INTRO */}

        <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-xs font-black text-amber-300">
            FIRST LOGIN SECURITY
          </p>

          <p className="mt-2 text-[10px] leading-5 text-gray-300">
            Change your Login Password
            and Withdrawal Password before
            entering the Dashboard.
          </p>
        </div>

        {/* STATUS */}

        <div className="mb-5 grid grid-cols-2 gap-2">
          <StatusBox
            title="LOGIN PASSWORD"
            complete={loginPasswordDone}
          />

          <StatusBox
            title="WITHDRAWAL PASSWORD"
            complete={
              withdrawalPasswordDone
            }
          />
        </div>

        {/* ERROR */}

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3">
            <p className="text-[10px] font-bold text-red-300">
              ⚠ {error}
            </p>
          </div>
        )}

        {/* SUCCESS */}

        {message && (
          <div className="mb-4 rounded-lg border border-green-500/40 bg-green-500/10 p-3">
            <p className="text-[10px] font-bold text-green-300">
              ✓ {message}
            </p>
          </div>
        )}

        {/* LOGIN PASSWORD */}

        <form
          onSubmit={changeLoginPassword}
          className={`mb-5 rounded-xl border p-4 ${
            loginPasswordDone
              ? 'border-green-500/40 bg-green-500/10'
              : 'border-[#28655f] bg-[#083d37]'
          }`}
        >
          <div className="flex items-center justify-between gap-2">

            <p className="text-sm font-black text-amber-300">
              Change LOGIN PASSWORD
            </p>

            {loginPasswordDone && (
              <span className="text-[8px] font-black text-green-300">
                ✓ COMPLETED
              </span>
            )}

          </div>

          {!loginPasswordDone && (
            <>
              <div className="mt-4 space-y-3">

                <PasswordInput
                  label="OLD PASSWORD"
                  placeholder="Enter Old Password"
                  value={
                    currentLoginPassword
                  }
                  onChange={(event) =>
                    setCurrentLoginPassword(
                      event.target.value
                    )
                  }
                  show={
                    showLoginPasswords
                  }
                  autoComplete="current-password"
                />

                <PasswordInput
                  label="NEW PASSWORD"
                  placeholder="Enter New Password"
                  value={newLoginPassword}
                  onChange={(event) =>
                    setNewLoginPassword(
                      event.target.value
                    )
                  }
                  show={
                    showLoginPasswords
                  }
                  autoComplete="new-password"
                />

                <PasswordInput
                  label="CONFIRM NEW PASSWORD"
                  placeholder="Confirm New Password"
                  value={
                    confirmLoginPassword
                  }
                  onChange={(event) =>
                    setConfirmLoginPassword(
                      event.target.value
                    )
                  }
                  show={
                    showLoginPasswords
                  }
                  autoComplete="new-password"
                />

              </div>

              <button
                type="button"
                onClick={() =>
                  setShowLoginPasswords(
                    (previous) =>
                      !previous
                  )
                }
                className="mt-3 text-[9px] font-black text-teal-300"
              >
                {showLoginPasswords
                  ? '🙈 HIDE PASSWORDS'
                  : '👁 SHOW PASSWORDS'}
              </button>

              <button
                type="submit"
                disabled={loading}
                className="mt-4 h-[48px] w-full rounded-lg bg-amber-500 text-[10px] font-black text-black disabled:opacity-50"
              >
                {loading
                  ? 'PLEASE WAIT...'
                  : 'CHANGE LOGIN PASSWORD'}
              </button>
            </>
          )}

          {loginPasswordDone && (
            <p className="mt-3 text-[10px] font-bold text-green-300">
              ✓ Login Password changed successfully.
            </p>
          )}

        </form>

        {/* WITHDRAWAL PASSWORD */}

        <form
          onSubmit={
            changeWithdrawalPassword
          }
          className={`mb-5 rounded-xl border p-4 ${
            withdrawalPasswordDone
              ? 'border-green-500/40 bg-green-500/10'
              : 'border-[#28655f] bg-[#083d37]'
          }`}
        >
          <div className="flex items-center justify-between gap-2">

            <p className="text-sm font-black text-amber-300">
              Change WITHDRAWAL PASSWORD
            </p>

            {withdrawalPasswordDone && (
              <span className="text-[8px] font-black text-green-300">
                ✓ COMPLETED
              </span>
            )}

          </div>

          {!withdrawalPasswordDone && (
            <>
              <div className="mt-4 space-y-3">

                <PasswordInput
                  label="OLD WITHDRAWAL PASSWORD"
                  placeholder="Enter Old Withdrawal Password"
                  value={
                    currentWithdrawalPassword
                  }
                  onChange={(event) =>
                    setCurrentWithdrawalPassword(
                      event.target.value
                    )
                  }
                  show={
                    showWithdrawalPasswords
                  }
                  autoComplete="current-password"
                />

                <PasswordInput
                  label="NEW WITHDRAWAL PASSWORD"
                  placeholder="Enter New Withdrawal Password"
                  value={
                    newWithdrawalPassword
                  }
                  onChange={(event) =>
                    setNewWithdrawalPassword(
                      event.target.value
                    )
                  }
                  show={
                    showWithdrawalPasswords
                  }
                  autoComplete="new-password"
                />

                <PasswordInput
                  label="CONFIRM NEW WITHDRAWAL PASSWORD"
                  placeholder="Confirm New Withdrawal Password"
                  value={
                    confirmWithdrawalPassword
                  }
                  onChange={(event) =>
                    setConfirmWithdrawalPassword(
                      event.target.value
                    )
                  }
                  show={
                    showWithdrawalPasswords
                  }
                  autoComplete="new-password"
                />

              </div>

              <button
                type="button"
                onClick={() =>
                  setShowWithdrawalPasswords(
                    (previous) =>
                      !previous
                  )
                }
                className="mt-3 text-[9px] font-black text-teal-300"
              >
                {showWithdrawalPasswords
                  ? '🙈 HIDE PASSWORDS'
                  : '👁 SHOW PASSWORDS'}
              </button>

              <button
                type="submit"
                disabled={loading}
                className="mt-4 h-[48px] w-full rounded-lg bg-amber-500 text-[10px] font-black text-black disabled:opacity-50"
              >
                {loading
                  ? 'PLEASE WAIT...'
                  : 'CHANGE WITHDRAWAL PASSWORD'}
              </button>
            </>
          )}

          {withdrawalPasswordDone && (
            <p className="mt-3 text-[10px] font-bold text-green-300">
              ✓ Withdrawal Password changed successfully.
            </p>
          )}

        </form>

        {/* COMPLETE */}

        {loginPasswordDone &&
          withdrawalPasswordDone && (
            <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-5 text-center">

              <div className="text-4xl">
                ✅
              </div>

              <p className="mt-3 text-sm font-black text-green-300">
                SECURITY SETUP COMPLETE
              </p>

              <p className="mt-2 text-[10px] leading-5 text-gray-300">
                Login Password and
                Withdrawal Password changed
                successfully.
              </p>

              <button
                type="button"
                onClick={
                  continueToDashboard
                }
                className="mt-5 h-[48px] w-full rounded-lg bg-green-600 text-[11px] font-black text-white"
              >
                CONTINUE TO DASHBOARD
              </button>

            </div>
          )}

        {/* LOGOUT */}

        <button
          type="button"
          onClick={() => {
            if (
              typeof onLogout ===
              'function'
            ) {
              onLogout();
            }
          }}
          className="mt-5 h-[44px] w-full rounded-lg border border-red-500/40 bg-red-500/10 text-[9px] font-black text-red-300"
        >
          LOGOUT
        </button>

        <p className="mt-5 text-center text-[8px] leading-4 text-gray-500">
          Demo / informational website security setup.
        </p>

      </main>
    </div>
  );
}

function PasswordInput({
  label,
  value,
  onChange,
  show,
  placeholder,
  autoComplete,
}) {
  return (
    <div>
      <label className="mb-2 block text-[8px] font-black text-gray-400">
        {label}
      </label>

      <input
        type={
          show ? 'text' : 'password'
        }
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="h-[48px] w-full rounded-lg border border-[#28655f] bg-[#061c1a] px-3 text-xs text-white outline-none placeholder:text-gray-600 focus:border-amber-400"
      />
    </div>
  );
}

function StatusBox({
  title,
  complete,
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        complete
          ? 'border-green-500/40 bg-green-500/10'
          : 'border-amber-500/40 bg-amber-500/10'
      }`}
    >
      <p className="text-[7px] font-black text-gray-400">
        {title}
      </p>

      <p
        className={`mt-2 text-[8px] font-black ${
          complete
            ? 'text-green-300'
            : 'text-amber-300'
        }`}
      >
        {complete
          ? '✓ COMPLETED'
          : '● REQUIRED'}
      </p>
    </div>
  );
}
