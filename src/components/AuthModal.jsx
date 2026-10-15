import React, {
  useEffect,
  useState,
} from 'react';

const AUTH_KEY =
  'telugu_sports_auth_user';

const DEFAULT_WHATSAPP_NUMBER =
  '919346824432';

const LOGIN_BACKGROUND =
  '/file_0000000094288208a5d577eadc40844c.png';

/* =====================================================
   NORMALIZE WHATSAPP NUMBER
===================================================== */

function normalizeWhatsAppNumber(
  value
) {
  const digits = String(
    value || ''
  ).replace(/\D/g, '');

  if (!digits) {
    return DEFAULT_WHATSAPP_NUMBER;
  }

  if (digits.length === 10) {
    return `91${digits}`;
  }

  return digits;
}

/* =====================================================
   AUTH MODAL
===================================================== */

export default function AuthModal({
  isOpen,
  onClose,
  onLoginSuccess,
  initialMode = 'login',
}) {
  const [isLogin, setIsLogin] =
    useState(
      initialMode !== 'signup'
    );

  const [
    identifier,
    setIdentifier,
  ] = useState('');

  const [
    password,
    setPassword,
  ] = useState('');

  const [
    signupName,
    setSignupName,
  ] = useState('');

  const [
    preferredId,
    setPreferredId,
  ] = useState('');

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    rememberMe,
    setRememberMe,
  ] = useState(true);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState('');

  const [
    adminWhatsAppNumber,
    setAdminWhatsAppNumber,
  ] = useState(
    DEFAULT_WHATSAPP_NUMBER
  );

  const [
    whatsappLoading,
    setWhatsAppLoading,
  ] = useState(false);

  /* =====================================================
     MODAL RESET
  ===================================================== */

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setIsLogin(
      initialMode !== 'signup'
    );

    setError('');
  }, [
    isOpen,
    initialMode,
  ]);

  /* =====================================================
     LOAD ADMIN WHATSAPP NUMBER
  ===================================================== */

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let active = true;

    const loadWhatsAppNumber =
      async () => {
        try {
          setWhatsAppLoading(true);

          const response =
            await fetch(
              '/api/settings/whatsapp',
              {
                method: 'GET',

                headers: {
                  Accept:
                    'application/json',
                },

                cache:
                  'no-store',
              }
            );

          let data = null;

          try {
            data =
              await response.json();
          } catch {
            data = null;
          }

          if (!response.ok) {
            throw new Error(
              data?.error ||
                'Unable to load WhatsApp number.'
            );
          }

          if (!active) {
            return;
          }

          const number =
            normalizeWhatsAppNumber(
              data?.whatsappNumber ||
                data?.number ||
                data?.phone ||
                DEFAULT_WHATSAPP_NUMBER
            );

          setAdminWhatsAppNumber(
            number
          );
        } catch (loadError) {
          console.error(
            'WhatsApp Settings Error:',
            loadError
          );

          if (active) {
            setAdminWhatsAppNumber(
              DEFAULT_WHATSAPP_NUMBER
            );
          }
        } finally {
          if (active) {
            setWhatsAppLoading(
              false
            );
          }
        }
      };

    loadWhatsAppNumber();

    return () => {
      active = false;
    };
  }, [isOpen]);

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

  const handleLogin = async (
    event
  ) => {
    event.preventDefault();

    setError('');

    const cleanLoginId =
      identifier
        .trim()
        .toLowerCase();

    if (!cleanLoginId) {
      setError(
        'Please enter your Customer ID.'
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

      const response =
        await fetch(
          '/api/auth/customer-login',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                loginId:
                  cleanLoginId,

                password,
              }),
          }
        );

      let data = null;

      try {
        data =
          await response.json();
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
            data
              ?.mustChangePassword ??
              customer
                ?.mustChangePassword
          ),

        mustChangeWithdrawalPassword:
          Boolean(
            data
              ?.mustChangeWithdrawalPassword ??
              customer
                ?.mustChangeWithdrawalPassword
          ),

        withdrawalPasswordConfigured:
          Boolean(
            data
              ?.withdrawalPasswordConfigured ??
              customer
                ?.withdrawalPasswordConfigured
          ),
      };

      localStorage.setItem(
        AUTH_KEY,
        JSON.stringify(
          loggedInUser
        )
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

      mustChangePassword:
        false,

      mustChangeWithdrawalPassword:
        false,

      withdrawalPasswordConfigured:
        true,
    };

    try {
      localStorage.setItem(
        AUTH_KEY,
        JSON.stringify(
          demoUser
        )
      );
    } catch (storageError) {
      console.error(
        'Unable to save demo login:',
        storageError
      );
    }

    if (onLoginSuccess) {
      onLoginSuccess(
        demoUser
      );
    }

    if (onClose) {
      onClose();
    }
  };

  /* =====================================================
     WHATSAPP
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

    const whatsappNumber =
      normalizeWhatsAppNumber(
        adminWhatsAppNumber
      );

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
      encodeURIComponent(
        message
      );

    const appLink =
      `whatsapp://send?phone=${whatsappNumber}` +
      `&text=${encodedMessage}`;

    const webLink =
      `https://wa.me/${whatsappNumber}` +
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
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto bg-[#02070d]"
      style={{
        backgroundImage: `
          linear-gradient(
            rgba(2, 8, 15, 0.30),
            rgba(2, 8, 15, 0.62)
          ),
          url("${LOGIN_BACKGROUND}")
        `,
        backgroundSize: 'cover',
        backgroundPosition:
          'center top',
        backgroundRepeat:
          'no-repeat',
      }}
    >
      {/* DARK OVERLAY */}

      <div className="absolute inset-0 bg-black/20" />

      {/* CLOSE */}

      <button
        type="button"
        onClick={closeModal}
        disabled={loading}
        className="fixed right-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/60 text-2xl text-white shadow-xl backdrop-blur-md disabled:opacity-40"
        aria-label="Close"
      >
        ×
      </button>

      {/* PAGE */}

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8">

        <div className="w-full max-w-[430px]">

          {/* TOP SPACER
              Keeps form below the logo
              already present in image.
          */}

          <div className="h-[170px] sm:h-[190px]" />

          {/* LOGIN CARD */}

          <div className="overflow-hidden rounded-[28px] border border-cyan-400/70 bg-[#03101b]/95 shadow-[0_0_35px_rgba(34,211,238,0.22)] backdrop-blur-xl">

            <div className="px-5 pb-6 pt-5 sm:px-7">

              {/* TITLE */}

              <div className="text-center">

                <h2 className="text-2xl font-black text-white">
                  Welcome to
                </h2>

                <div className="mt-1 text-[22px] font-black uppercase leading-tight">
                  <span className="text-rose-500">
                    TELUGU
                  </span>{' '}

                  <span className="text-white">
                    SPORTS
                  </span>{' '}

                  <span className="text-amber-400">
                    BOOK
                  </span>
                </div>

                <p className="mt-2 text-xs text-gray-300">
                  Sports &amp; Entertainment Demo
                </p>

              </div>

              {/* TABS */}

              <div className="mt-5 flex overflow-hidden rounded-xl border border-cyan-500/30 bg-[#07131f]/90 p-1">

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setIsLogin(
                      true
                    );

                    setError('');
                  }}
                  className={`h-12 flex-1 rounded-lg text-sm font-black transition ${
                    isLogin
                      ? 'bg-gradient-to-r from-cyan-600 to-teal-500 text-white shadow-[0_0_18px_rgba(6,182,212,0.35)]'
                      : 'text-gray-300'
                  }`}
                >
                  Login
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setIsLogin(
                      false
                    );

                    setError('');
                  }}
                  className={`h-12 flex-1 rounded-lg text-sm font-black transition ${
                    !isLogin
                      ? 'bg-gradient-to-r from-cyan-600 to-teal-500 text-white shadow-[0_0_18px_rgba(6,182,212,0.35)]'
                      : 'text-gray-300'
                  }`}
                >
                  Sign Up
                </button>

              </div>

              {/* ================================
                  LOGIN
              ================================= */}

              {isLogin && (
                <form
                  onSubmit={
                    handleLogin
                  }
                  className="mt-5 space-y-4"
                >

                  {/* CUSTOMER ID */}

                  <div className="relative">

                    <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl text-gray-400">
                      ♙
                    </div>

                    <input
                      type="text"
                      value={
                        identifier
                      }
                      disabled={
                        loading
                      }
                      onChange={(
                        event
                      ) =>
                        setIdentifier(
                          event
                            .target
                            .value
                        )
                      }
                      placeholder="Customer ID"
                      autoComplete="username"
                      className="h-[58px] w-full rounded-xl border border-slate-500/70 bg-[#071522]/95 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-gray-400 focus:border-cyan-400 disabled:opacity-60"
                    />

                  </div>

                  {/* PASSWORD */}

                  <div className="relative">

                    <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-gray-400">
                      🔒
                    </div>

                    <input
                      type={
                        showPassword
                          ? 'text'
                          : 'password'
                      }
                      value={
                        password
                      }
                      disabled={
                        loading
                      }
                      onChange={(
                        event
                      ) =>
                        setPassword(
                          event
                            .target
                            .value
                        )
                      }
                      placeholder="Password"
                      autoComplete="current-password"
                      className="h-[58px] w-full rounded-xl border border-slate-500/70 bg-[#071522]/95 pl-12 pr-20 text-sm text-white outline-none transition placeholder:text-gray-400 focus:border-cyan-400 disabled:opacity-60"
                    />

                    <button
                      type="button"
                      disabled={
                        loading
                      }
                      onClick={() =>
                        setShowPassword(
                          (value) =>
                            !value
                        )
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-cyan-300"
                    >
                      {showPassword
                        ? 'HIDE'
                        : 'SHOW'}
                    </button>

                  </div>

                  {/* REMEMBER */}

                  <div className="flex items-center justify-between gap-3">

                    <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-300">

                      <input
                        type="checkbox"
                        checked={
                          rememberMe
                        }
                        onChange={(
                          event
                        ) =>
                          setRememberMe(
                            event
                              .target
                              .checked
                          )
                        }
                        className="h-4 w-4 accent-cyan-500"
                      />

                      Remember me

                    </label>

                    <span className="text-xs font-bold text-cyan-400">
                      Secure Login
                    </span>

                  </div>

                  {/* ERROR */}

                  {error && (
                    <ErrorBox
                      text={error}
                    />
                  )}

                  {/* LOGIN */}

                  <button
                    type="submit"
                    disabled={
                      loading
                    }
                    className="h-[56px] w-full rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-500 text-base font-black uppercase tracking-wider text-black shadow-[0_0_22px_rgba(245,158,11,0.30)] transition active:scale-[0.99] disabled:opacity-50"
                  >
                    {loading
                      ? 'CHECKING...'
                      : 'LOGIN'}
                  </button>

                  {/* OR */}

                  <div className="flex items-center gap-4 py-1">

                    <div className="h-px flex-1 bg-gray-600/70" />

                    <span className="text-xs font-bold text-gray-400">
                      OR
                    </span>

                    <div className="h-px flex-1 bg-gray-600/70" />

                  </div>

                  {/* DEMO LOGIN */}

                  <button
                    type="button"
                    onClick={
                      handleDemoLogin
                    }
                    disabled={
                      loading
                    }
                    className="flex h-[56px] w-full items-center justify-center gap-3 rounded-xl border-2 border-cyan-400 bg-[#06121d]/90 text-sm font-black uppercase tracking-wide text-white shadow-[0_0_20px_rgba(34,211,238,0.15)] transition active:scale-[0.99] disabled:opacity-50"
                  >
                    <span className="text-xl">
                      🎮
                    </span>

                    LOGIN WITH DEMO ID
                  </button>

                  {/* WHATSAPP */}

                  <button
                    type="button"
                    disabled={
                      whatsappLoading
                    }
                    onClick={() =>
                      openAdminWhatsApp({
                        requireDetails:
                          false,
                      })
                    }
                    className="flex w-full items-center justify-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 transition active:scale-[0.99] disabled:opacity-50"
                  >

                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#20c968] text-xl text-white">
                      ☎
                    </span>

                    <div className="text-left">

                      <div className="text-[10px] text-gray-400">
                        Need Help?
                      </div>

                      <div className="text-sm font-black text-emerald-400">
                        {whatsappLoading
                          ? 'Loading...'
                          : 'Chat on WhatsApp'}
                      </div>

                    </div>

                    <span className="ml-auto text-xl text-gray-400">
                      ›
                    </span>

                  </button>

                </form>
              )}

              {/* ================================
                  SIGN UP
              ================================= */}

              {!isLogin && (
                <form
                  onSubmit={
                    handleSignup
                  }
                  className="mt-5 space-y-4"
                >

                  <div>

                    <label className="mb-2 block text-xs font-bold text-gray-300">
                      Name
                    </label>

                    <input
                      type="text"
                      value={
                        signupName
                      }
                      onChange={(
                        event
                      ) =>
                        setSignupName(
                          event
                            .target
                            .value
                        )
                      }
                      placeholder="Enter your Name"
                      autoComplete="name"
                      className="h-[56px] w-full rounded-xl border border-slate-500/70 bg-[#071522]/95 px-4 text-sm text-white outline-none placeholder:text-gray-400 focus:border-cyan-400"
                    />

                  </div>

                  <div>

                    <label className="mb-2 block text-xs font-bold text-gray-300">
                      Preferred User ID
                    </label>

                    <input
                      type="text"
                      value={
                        preferredId
                      }
                      onChange={(
                        event
                      ) =>
                        setPreferredId(
                          event
                            .target
                            .value
                        )
                      }
                      placeholder="Example: satish123"
                      autoComplete="off"
                      className="h-[56px] w-full rounded-xl border border-slate-500/70 bg-[#071522]/95 px-4 text-sm text-white outline-none placeholder:text-gray-400 focus:border-cyan-400"
                    />

                  </div>

                  <div className="rounded-xl border border-amber-500/30 bg-black/40 p-4">

                    <p className="text-[11px] leading-5 text-gray-300">
                      Admin will create your
                      Customer ID, Temporary
                      Login Password and
                      Temporary Withdrawal
                      Password.
                    </p>

                    <p className="mt-2 text-[11px] leading-5 text-amber-300">
                      You will change both
                      temporary passwords
                      after your first login.
                    </p>

                  </div>

                  {error && (
                    <ErrorBox
                      text={error}
                    />
                  )}

                  <button
                    type="submit"
                    disabled={
                      whatsappLoading
                    }
                    className="h-[56px] w-full rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-500 text-sm font-black uppercase tracking-wider text-black shadow-[0_0_22px_rgba(245,158,11,0.30)] disabled:opacity-50"
                  >
                    {whatsappLoading
                      ? 'LOADING...'
                      : 'SIGN UP'}
                  </button>

                  <div className="flex items-center gap-4">

                    <div className="h-px flex-1 bg-gray-600/70" />

                    <span className="text-xs font-bold text-gray-400">
                      OR
                    </span>

                    <div className="h-px flex-1 bg-gray-600/70" />

                  </div>

                  <button
                    type="button"
                    disabled={
                      whatsappLoading
                    }
                    onClick={() =>
                      openAdminWhatsApp({
                        requireDetails:
                          false,
                      })
                    }
                    className="flex h-[58px] w-full items-center justify-center gap-3 rounded-xl border-2 border-emerald-400 bg-[#061b15]/90 text-sm font-black text-emerald-300 disabled:opacity-50"
                  >

                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#20c968] text-lg text-white">
                      ☎
                    </span>

                    GET TSB ID ON WHATSAPP

                  </button>

                </form>
              )}

              {/* DEMO NOTICE */}

              <div className="mt-5 border-t border-white/10 pt-4">

                <p className="text-center text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  Demo / Informational Website Only
                </p>

              </div>

            </div>

          </div>

          <div className="h-8" />

        </div>

      </div>

    </div>
  );
}

/* =====================================================
   ERROR BOX
===================================================== */

function ErrorBox({
  text,
}) {
  return (
    <div className="rounded-xl border border-red-500/30 bg-red-950/50 px-3 py-3 text-sm text-red-300">
      {text}
    </div>
  );
}
