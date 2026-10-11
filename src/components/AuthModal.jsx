import { useState } from 'react';

const AUTH_KEY = 'telugu_sports_auth_user';

/*
  IMPORTANT:
  Replace this with the Admin WhatsApp number.

  Format:
  Country code + mobile number
  Do NOT use +, spaces or hyphens.

  Example format only:
  919876543210
*/
const ADMIN_WHATSAPP_NUMBER = '91XXXXXXXXXX';

function AuthModal({
  isOpen,
  onClose,
  onLoginSuccess,
}) {
  const [isLogin, setIsLogin] =
    useState(true);

  const [loading, setLoading] =
    useState(false);

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    identifier,
    setIdentifier,
  ] = useState('');

  const [
    password,
    setPassword,
  ] = useState('');

  const [error, setError] =
    useState('');

  const [message, setMessage] =
    useState('');

  if (!isOpen) {
    return null;
  }

  /* =========================
     CLOSE MODAL
     ========================= */

  const closeModal = () => {
    setError('');
    setMessage('');

    onClose?.();
  };

  /* =========================
     DEMO LOGIN
     ========================= */

  const handleDemoLogin = () => {
    setError('');
    setMessage('');

    const demoUser = {
      name: 'Demo User',
      identifier: 'demo',
      isAuthenticated: true,
      isDemo: true,
    };

    localStorage.setItem(
      AUTH_KEY,
      JSON.stringify(demoUser)
    );

    if (onLoginSuccess) {
      onLoginSuccess(demoUser);
    }

    closeModal();
  };

  /* =========================
     CUSTOMER LOGIN

     Temporary frontend flow.

     Server authentication will
     be connected later.
     ========================= */

  const handleLogin = (event) => {
    event.preventDefault();

    setError('');
    setMessage('');

    if (!identifier.trim()) {
      setError(
        'Please enter your User ID.'
      );
      return;
    }

    if (!password) {
      setError(
        'Please enter your password.'
      );
      return;
    }

    setLoading(true);

    /*
      IMPORTANT:

      At present this keeps the
      existing demo behaviour.

      Later this section will call
      the server login API and
      verify the Admin-created
      Customer ID + password.
    */

    setTimeout(() => {
      const user = {
        name: identifier.trim(),
        identifier:
          identifier.trim(),
        isAuthenticated: true,
        isDemo: true,
      };

      localStorage.setItem(
        AUTH_KEY,
        JSON.stringify(user)
      );

      if (onLoginSuccess) {
        onLoginSuccess(user);
      }

      setLoading(false);
      closeModal();
    }, 400);
  };

  /* =========================
     WHATSAPP NEW ID REQUEST
     ========================= */

  const handleWhatsAppSignup = () => {
    setError('');
    setMessage('');

    if (
      !ADMIN_WHATSAPP_NUMBER ||
      ADMIN_WHATSAPP_NUMBER.includes(
        'X'
      )
    ) {
      setError(
        'Admin WhatsApp number has not been configured yet.'
      );
      return;
    }

    const text =
      'Hello, I want a new ID. Please create my Telugu Sports Book demo account.';

    const whatsappUrl =
      `https://wa.me/${ADMIN_WHATSAPP_NUMBER}` +
      `?text=${encodeURIComponent(
        text
      )}`;

    window.open(
      whatsappUrl,
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 px-4">

      <div className="relative w-full max-w-md rounded-2xl border border-teal-900/50 bg-[#060913] p-6 shadow-2xl">

        {/* CLOSE */}

        <button
          type="button"
          onClick={closeModal}
          className="absolute right-4 top-4 text-xl text-gray-400 transition hover:text-white"
          aria-label="Close"
        >
          ×
        </button>

        {/* LOGO */}

        <div className="mb-6 text-center">

          <div className="mb-2 text-2xl font-extrabold tracking-wide text-amber-400">
            TSB
          </div>

          <h2 className="text-xl font-bold text-white">
            {isLogin
              ? 'Welcome Back'
              : 'Create New ID'}
          </h2>

          <p className="mt-1 text-sm text-gray-400">
            {isLogin
              ? 'Login with your User ID and Password'
              : 'Contact Admin on WhatsApp to request your new ID'}
          </p>

        </div>

        {/* LOGIN / SIGN UP TABS */}

        <div className="mb-5 flex rounded-lg bg-[#0d111c] p-1">

          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setError('');
              setMessage('');
            }}
            className={`flex-1 rounded-md py-2 text-sm font-bold transition ${
              isLogin
                ? 'bg-teal-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Log In
          </button>

          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setError('');
              setMessage('');
            }}
            className={`flex-1 rounded-md py-2 text-sm font-bold transition ${
              !isLogin
                ? 'bg-teal-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Sign Up
          </button>

        </div>

        {/* =====================
            LOGIN
            ===================== */}

        {isLogin && (

          <form
            onSubmit={handleLogin}
            className="space-y-4"
          >

            {/* USER ID */}

            <div>

              <label className="mb-1 block text-xs font-semibold text-gray-300">
                User ID
              </label>

              <input
                type="text"
                value={identifier}
                onChange={(event) =>
                  setIdentifier(
                    event.target.value
                  )
                }
                placeholder="Enter User ID"
                autoComplete="username"
                className="w-full rounded-lg border border-gray-800 bg-[#0d111c] px-3 py-2.5 text-sm text-white outline-none focus:border-teal-500"
              />

            </div>

            {/* PASSWORD */}

            <div>

              <label className="mb-1 block text-xs font-semibold text-gray-300">
                Password
              </label>

              <div className="relative">

                <input
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  placeholder="Enter Password"
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-gray-800 bg-[#0d111c] px-3 py-2.5 pr-20 text-sm text-white outline-none focus:border-teal-500"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (value) => !value
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 hover:text-white"
                >
                  {showPassword
                    ? 'Hide'
                    : 'Show'}
                </button>

              </div>

            </div>

            {/* ERROR */}

            {error && (

              <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-400">
                {error}
              </div>

            )}

            {/* MESSAGE */}

            {message && (

              <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-400">
                {message}
              </div>

            )}

            {/* LOGIN */}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 py-2.5 text-sm font-bold uppercase tracking-wider text-black shadow-md transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? 'Logging In...'
                : 'Log In'}
            </button>

            {/* DIVIDER */}

            <div className="my-2 flex items-center gap-3">

              <div className="h-px flex-1 bg-gray-800" />

              <span className="text-[11px] font-semibold text-gray-500">
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
              className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-emerald-500 disabled:opacity-50"
            >
              Login with Demo ID
            </button>

          </form>

        )}

        {/* =====================
            SIGN UP / WHATSAPP
            ===================== */}

        {!isLogin && (

          <div>

            <div className="rounded-xl border border-[#174d48] bg-[#0d111c] p-5 text-center">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-600 text-3xl">
                💬
              </div>

              <h3 className="mt-4 text-lg font-black text-white">
                Request New ID
              </h3>

              <p className="mt-2 text-xs leading-5 text-gray-400">
                Click the WhatsApp
                button below and send
                your new ID request to
                Admin.
              </p>

              <div className="mt-4 rounded-lg border border-gray-800 bg-black/20 p-3 text-left">

                <p className="text-[10px] font-bold text-gray-500">
                  MESSAGE
                </p>

                <p className="mt-1 text-xs font-semibold text-gray-300">
                  I want a new ID.
                </p>

              </div>

              <button
                type="button"
                onClick={
                  handleWhatsAppSignup
                }
                className="mt-5 w-full rounded-lg bg-green-600 py-3 text-sm font-black uppercase tracking-wide text-white shadow-lg transition hover:bg-green-500"
              >
                💬 Continue with WhatsApp
              </button>

            </div>

            {error && (

              <div className="mt-4 rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-400">
                {error}
              </div>

            )}

            <p className="mt-4 text-center text-[10px] leading-4 text-gray-500">
              Admin will create your
              User ID and temporary
              password.
            </p>

          </div>

        )}

        {/* FOOTER */}

        <p className="mt-5 text-center text-[11px] text-gray-500">
          Demo / informational website only
        </p>

      </div>

    </div>
  );
}

export default AuthModal;
