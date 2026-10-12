import React, { useEffect, useState } from 'react';

const AUTH_KEY = 'telugu_sports_auth_user';
const ADMIN_WHATSAPP_NUMBER = '919346824432';

export default function AuthModal({
  isOpen,
  onClose,
  onLoginSuccess,
  initialMode = 'login',
}) {
  const [isLogin, setIsLogin] = useState(
    initialMode !== 'signup'
  );

  const [identifier, setIdentifier] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [signupName, setSignupName] =
    useState('');

  const [preferredId, setPreferredId] =
    useState('');

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setIsLogin(initialMode !== 'signup');
    setError('');
  }, [isOpen, initialMode]);

  if (!isOpen) {
    return null;
  }

  /* =====================================================
     CLOSE
  ===================================================== */

  const closeModal = () => {
    if (loading) {
      return;
    }

    setError('');

    if (onClose) {
      onClose();
    }
  };

  /* =====================================================
     DATABASE CUSTOMER LOGIN
  ===================================================== */

  const handleLogin = async (event) => {
    event.preventDefault();

    setError('');

    const cleanLoginId =
      identifier.trim().toLowerCase();

    if (!cleanLoginId) {
      setError(
        'Please enter your User ID.'
      );
      return;
    }

    if (!password) {
      setError(
        'Please enter your Password.'
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        '/api/auth/customer-login',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            loginId: cleanLoginId,
            password,
          }),
        }
      );

      let data = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            'Invalid Login ID or Password.'
        );
      }

      const customer =
        data?.customer || {};

      const loggedInUser = {
        id:
          customer?.id ??
          data?.customerId ??
          null,

        name:
          customer?.name ||
          cleanLoginId,

        loginId:
          customer?.loginId ||
          cleanLoginId,

        identifier:
          customer?.loginId ||
          cleanLoginId,

        status:
          customer?.status ||
          'ACTIVE',

        isAuthenticated: true,

        isDemo: true,

        mustChangePassword:
          Boolean(
            data?.mustChangePassword ??
              customer?.mustChangePassword
          ),

        mustChangeWithdrawalPassword:
          Boolean(
            data?.mustChangeWithdrawalPassword ??
              customer?.mustChangeWithdrawalPassword
          ),

        withdrawalPasswordConfigured:
          Boolean(
            data?.withdrawalPasswordConfigured ??
              customer?.withdrawalPasswordConfigured
          ),
      };

      /*
        We intentionally do NOT save the
        temporary password anywhere.
      */

      localStorage.setItem(
        AUTH_KEY,
        JSON.stringify(loggedInUser)
      );

      setIdentifier('');
      setPassword('');
      setError('');

      if (onLoginSuccess) {
        onLoginSuccess(
          loggedInUser
        );
      }

      if (onClose) {
        onClose();
      }
    } catch (loginError) {
      console.error(
        'Customer Login Error:',
        loginError
      );

      setError(
        loginError?.message ||
          'Unable to login. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     DEMO LOGIN
  ===================================================== */

  const handleDemoLogin = () => {
    setError('');

    const demoUser = {
      name: 'Demo User',
      loginId: 'demo',
      identifier: 'demo',

      isAuthenticated: true,
      isDemo: true,

      mustChangePassword: false,
      mustChangeWithdrawalPassword:
        false,

      withdrawalPasswordConfigured:
        true,
    };

    try {
      localStorage.setItem(
        AUTH_KEY,
        JSON.stringify(demoUser)
      );
    } catch (storageError) {
      console.error(
        'Unable to save demo login:',
        storageError
      );
    }

    if (onLoginSuccess) {
      onLoginSuccess(demoUser);
    }

    if (onClose) {
      onClose();
    }
  };

  /* =====================================================
     WHATSAPP SIGNUP
  ===================================================== */

  const openAdminWhatsApp = ({
    requireDetails = false,
  } = {}) => {
    setError('');

    const cleanName =
      signupName.trim();

    const cleanId =
      preferredId
        .trim()
        .toLowerCase();

    if (
      requireDetails &&
      !cleanName
    ) {
      setError(
        'Please enter your Name.'
      );
      return;
    }

    if (
      requireDetails &&
      !cleanId
    ) {
      setError(
        'Please enter your Preferred User ID.'
      );
      return;
    }

    let message =
      'Hello, I want a new TSB ID.';

    if (cleanName) {
      message +=
        `\nName: ${cleanName}`;
    }

    if (cleanId) {
      message +=
        `\nPreferred User ID: ${cleanId}`;
    }

    message +=
      '\nPlease create my TSB ID, temporary Login Password and temporary Withdrawal Password.';

    const encodedMessage =
      encodeURIComponent(message);

    const appLink =
      `whatsapp://send?phone=${ADMIN_WHATSAPP_NUMBER}` +
      `&text=${encodedMessage}`;

    const webLink =
      `https://wa.me/${ADMIN_WHATSAPP_NUMBER}` +
      `?text=${encodedMessage}`;

    window.location.href =
      appLink;

    setTimeout(() => {
      if (
        document.visibilityState ===
        'visible'
      ) {
        window.location.href =
          webLink;
      }
    }, 1200);
  };

  const handleSignup = (
    event
  ) => {
    event.preventDefault();

    openAdminWhatsApp({
      requireDetails: true,
    });
  };

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 px-4">

      <div className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl border border-teal-900/50 bg-[#060913] p-6 shadow-2xl">

        {/* CLOSE */}

        <button
          type="button"
          onClick={closeModal}
          disabled={loading}
          className="absolute right-4 top-4 text-xl text-gray-400 transition hover:text-white disabled:opacity-40"
          aria-label="Close"
        >
          ×
        </button>

        {/* LOGO */}

        <div className="mb-6 text-center">

          <div className="mb-2 text-3xl font-extrabold tracking-wide text-amber-400">
            TSB
          </div>

          <h2 className="text-xl font-black text-white">
            {isLogin
              ? 'Welcome Back'
              : 'Sign Up'}
          </h2>

          <p className="mt-2 text-sm text-gray-400">
            {isLogin
              ? 'Login with your Customer ID and Password'
              : 'Request your new TSB ID'}
          </p>

        </div>

        {/* TABS */}

        <div className="mb-5 flex rounded-lg bg-[#0d111c] p-1">

          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setIsLogin(true);
              setError('');
            }}
            className={`flex-1 rounded-md py-2.5 text-sm font-bold transition ${
              isLogin
                ? 'bg-teal-600 text-white'
                : 'text-gray-400'
            }`}
          >
            Log In
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setIsLogin(false);
              setError('');
            }}
            className={`flex-1 rounded-md py-2.5 text-sm font-bold transition ${
              !isLogin
                ? 'bg-teal-600 text-white'
                : 'text-gray-400'
            }`}
          >
            Sign Up
          </button>

        </div>

        {/* LOGIN */}

        {isLogin && (
          <form
            onSubmit={handleLogin}
            className="space-y-4"
          >

            {/* USER ID */}

            <div>

              <label className="mb-2 block text-xs font-bold text-gray-300">
                Customer ID
              </label>

              <input
                type="text"
                value={identifier}
                disabled={loading}
                onChange={(event) =>
                  setIdentifier(
                    event.target.value
                  )
                }
                placeholder="Enter Customer ID"
                autoComplete="username"
                className="h-[52px] w-full rounded-lg border border-gray-800 bg-[#0d111c] px-4 text-sm text-white outline-none focus:border-teal-500 disabled:opacity-60"
              />

            </div>

            {/* PASSWORD */}

            <div>

              <label className="mb-2 block text-xs font-bold text-gray-300">
                Login Password
              </label>

              <div className="relative">

                <input
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  value={password}
                  disabled={loading}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  placeholder="Enter Login Password"
                  autoComplete="current-password"
                  className="h-[52px] w-full rounded-lg border border-gray-800 bg-[#0d111c] px-4 pr-20 text-sm text-white outline-none focus:border-teal-500 disabled:opacity-60"
                />

                <button
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    setShowPassword(
                      (value) => !value
                    )
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400"
                >
                  {showPassword
                    ? 'Hide'
                    : 'Show'}
                </button>

              </div>

            </div>

            {/* ERROR */}

            {error && (
              <ErrorBox
                text={error}
              />
            )}

            {/* LOGIN BUTTON */}

            <button
              type="submit"
              disabled={loading}
              className="h-[52px] w-full rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 text-sm font-black uppercase tracking-wider text-black disabled:opacity-50"
            >
              {loading
                ? 'Checking...'
                : 'Log In'}
            </button>

            {/* DIVIDER */}

            <div className="flex items-center gap-3 py-1">

              <div className="h-px flex-1 bg-gray-800" />

              <span className="text-[11px] font-bold text-gray-500">
                OR
              </span>

              <div className="h-px flex-1 bg-gray-800" />

            </div>

            {/* DEMO LOGIN */}

            <button
              type="button"
              onClick={
                handleDemoLogin
              }
              disabled={loading}
              className="h-[52px] w-full rounded-lg bg-emerald-600 text-sm font-black uppercase tracking-wider text-white disabled:opacity-50"
            >
              Login with Demo ID
            </button>

          </form>
        )}

        {/* SIGNUP */}

        {!isLogin && (
          <form
            onSubmit={handleSignup}
            className="space-y-4"
          >

            {/* NAME */}

            <div>

              <label className="mb-2 block text-xs font-bold text-gray-300">
                Name
              </label>

              <input
                type="text"
                value={signupName}
                onChange={(event) =>
                  setSignupName(
                    event.target.value
                  )
                }
                placeholder="Enter your Name"
                autoComplete="name"
                className="h-[52px] w-full rounded-lg border border-gray-800 bg-[#0d111c] px-4 text-sm text-white outline-none focus:border-teal-500"
              />

            </div>

            {/* PREFERRED ID */}

            <div>

              <label className="mb-2 block text-xs font-bold text-gray-300">
                Preferred User ID
              </label>

              <input
                type="text"
                value={preferredId}
                onChange={(event) =>
                  setPreferredId(
                    event.target.value
                  )
                }
                placeholder="Example: satish123"
                autoComplete="off"
                className="h-[52px] w-full rounded-lg border border-gray-800 bg-[#0d111c] px-4 text-sm text-white outline-none focus:border-teal-500"
              />

            </div>

            {/* INFO */}

            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">

              <p className="text-[10px] leading-5 text-gray-400">
                Admin will create your
                Customer ID, Temporary
                Login Password and
                Temporary Withdrawal
                Password.
              </p>

              <p className="mt-2 text-[10px] leading-5 text-amber-300">
                You will change both
                temporary passwords after
                your first login.
              </p>

            </div>

            {/* ERROR */}

            {error && (
              <ErrorBox
                text={error}
              />
            )}

            {/* SIGN UP */}

            <button
              type="submit"
              className="h-[52px] w-full rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 text-sm font-black uppercase tracking-wider text-black"
            >
              SIGN UP
            </button>

            {/* DIVIDER */}

            <div className="flex items-center gap-3 py-1">

              <div className="h-px flex-1 bg-gray-800" />

              <span className="text-[11px] font-bold text-gray-500">
                OR
              </span>

              <div className="h-px flex-1 bg-gray-800" />

            </div>

            {/* WHATSAPP */}

            <button
              type="button"
              onClick={() =>
                openAdminWhatsApp({
                  requireDetails:
                    false,
                })
              }
              className="flex h-[56px] w-full items-center justify-center gap-3 rounded-full bg-[#20c968] px-4 text-sm font-black text-white shadow-lg"
            >

              <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-lg">
                ☎
              </span>

              <span>
                GET TSB ID NOW
              </span>

            </button>

            <p className="text-center text-[10px] leading-4 text-gray-500">
              WhatsApp Admin to request
              your new TSB ID.
            </p>

          </form>
        )}

        <p className="mt-5 text-center text-[11px] text-gray-500">
          Demo / informational website only
        </p>

      </div>

    </div>
  );
}

function ErrorBox({
  text,
}) {
  return (
    <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-400">
      {text}
    </div>
  );
}
