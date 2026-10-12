import { useState } from 'react';

const AUTH_KEY = 'telugu_sports_auth_user';
const ADMIN_WHATSAPP_NUMBER = '919346824432';

function AuthModal({
  isOpen,
  onClose,
  onLoginSuccess,
}) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] =
    useState(false);

  const [identifier, setIdentifier] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [signupName, setSignupName] =
    useState('');

  const [preferredId, setPreferredId] =
    useState('');

  const [error, setError] =
    useState('');

  /*
    LOGIN FLOW

    login
    login-password
    withdrawal-password
  */

  const [securityStep, setSecurityStep] =
    useState('login');

  const [
    loggedInCustomer,
    setLoggedInCustomer,
  ] = useState(null);

  /*
    LOGIN PASSWORD CHANGE
  */

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

  /*
    WITHDRAWAL PASSWORD CHANGE
  */

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

  if (!isOpen) {
    return null;
  }

  /* =====================================================
     RESET
  ===================================================== */

  const resetSecurityState = () => {
    setSecurityStep('login');

    setLoggedInCustomer(null);

    setCurrentLoginPassword('');
    setNewLoginPassword('');
    setConfirmLoginPassword('');

    setCurrentWithdrawalPassword('');
    setNewWithdrawalPassword('');
    setConfirmWithdrawalPassword('');
  };

  /* =====================================================
     CLOSE
  ===================================================== */

  const closeModal = () => {
    setError('');

    resetSecurityState();

    onClose?.();
  };

  /* =====================================================
     COMPLETE LOGIN
  ===================================================== */

  const completeCustomerLogin = (
    customer
  ) => {
    const authUser = {
      id: customer?.id,

      name:
        customer?.name ||
        customer?.loginId,

      identifier:
        customer?.loginId,

      loginId:
        customer?.loginId,

      isAuthenticated: true,

      isDemo: false,
    };

    try {
      localStorage.setItem(
        AUTH_KEY,
        JSON.stringify(authUser)
      );
    } catch (storageError) {
      console.error(
        'Unable to save customer login:',
        storageError
      );
    }

    if (onLoginSuccess) {
      onLoginSuccess(authUser);
    }

    setError('');

    resetSecurityState();

    onClose?.();
  };

  /* =====================================================
     DEMO LOGIN
  ===================================================== */

  const handleDemoLogin = () => {
    setError('');

    const demoUser = {
      name: 'Demo User',
      identifier: 'demo',
      loginId: 'demo',
      isAuthenticated: true,
      isDemo: true,
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

    resetSecurityState();

    onClose?.();
  };

  /* =====================================================
     CUSTOMER DATABASE LOGIN
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
            loginId:
              cleanLoginId,

            password,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            'Unable to login.'
        );
      }

      const customer =
        data?.customer;

      if (!customer) {
        throw new Error(
          'Customer information was not returned by the server.'
        );
      }

      setLoggedInCustomer(
        customer
      );

      /*
        Temporary Login Password
        entered during login becomes
        current password for first
        password-change step.
      */

      setCurrentLoginPassword(
        password
      );

      /*
        FIRST PRIORITY:
        LOGIN PASSWORD CHANGE
      */

      if (
        data.mustChangePassword ===
          true ||
        customer.mustChangePassword ===
          true
      ) {
        setSecurityStep(
          'login-password'
        );

        setError('');

        return;
      }

      /*
        SECOND PRIORITY:
        WITHDRAWAL PASSWORD CHANGE
      */

      if (
        data.mustChangeWithdrawalPassword ===
          true ||
        customer.mustChangeWithdrawalPassword ===
          true
      ) {
        if (
          !data.withdrawalPasswordConfigured &&
          !customer.withdrawalPasswordConfigured
        ) {
          setError(
            'Withdrawal Password has not been configured for this customer. Please contact Admin.'
          );

          return;
        }

        setSecurityStep(
          'withdrawal-password'
        );

        setError('');

        return;
      }

      /*
        BOTH PASSWORDS ALREADY SET
      */

      completeCustomerLogin(
        customer
      );
    } catch (loginError) {
      console.error(
        'Customer Login Error:',
        loginError
      );

      setError(
        loginError.message ||
          'Unable to login. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     CHANGE LOGIN PASSWORD
  ===================================================== */

  const handleLoginPasswordChange =
    async (event) => {
      event.preventDefault();

      setError('');

      if (!loggedInCustomer?.loginId) {
        setError(
          'Customer login session is missing. Please login again.'
        );

        return;
      }

      if (!currentLoginPassword) {
        setError(
          'Current Login Password is required.'
        );

        return;
      }

      if (
        newLoginPassword.length < 6
      ) {
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
          'New Login Password and Confirm Login Password do not match.'
        );

        return;
      }

      if (
        currentLoginPassword ===
        newLoginPassword
      ) {
        setError(
          'New Login Password must be different from the temporary password.'
        );

        return;
      }

      try {
        setLoading(true);

        const response =
          await fetch(
            '/api/auth/change-customer-password',
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body:
                JSON.stringify({
                  loginId:
                    loggedInCustomer.loginId,

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

        /*
          LOGIN PASSWORD CHANGED.

          Now check Withdrawal Password.
        */

        if (
          loggedInCustomer
            .mustChangeWithdrawalPassword ===
            true
        ) {
          if (
            !loggedInCustomer
              .withdrawalPasswordConfigured
          ) {
            setError(
              'Login Password changed successfully. Withdrawal Password is not configured. Please contact Admin.'
            );

            return;
          }

          setSecurityStep(
            'withdrawal-password'
          );

          setError('');

          return;
        }

        completeCustomerLogin({
          ...loggedInCustomer,

          mustChangePassword:
            false,
        });
      } catch (changeError) {
        console.error(
          'Change Login Password Error:',
          changeError
        );

        setError(
          changeError.message ||
            'Unable to change Login Password.'
        );
      } finally {
        setLoading(false);
      }
    };

  /* =====================================================
     CHANGE WITHDRAWAL PASSWORD
  ===================================================== */

  const handleWithdrawalPasswordChange =
    async (event) => {
      event.preventDefault();

      setError('');

      if (!loggedInCustomer?.loginId) {
        setError(
          'Customer login session is missing. Please login again.'
        );

        return;
      }

      if (
        !currentWithdrawalPassword
      ) {
        setError(
          'Temporary Withdrawal Password is required.'
        );

        return;
      }

      if (
        newWithdrawalPassword.length <
        6
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
          'New Withdrawal Password and Confirm Withdrawal Password do not match.'
        );

        return;
      }

      if (
        currentWithdrawalPassword ===
        newWithdrawalPassword
      ) {
        setError(
          'New Withdrawal Password must be different from the temporary Withdrawal Password.'
        );

        return;
      }

      try {
        setLoading(true);

        const response =
          await fetch(
            '/api/auth/change-withdrawal-password',
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body:
                JSON.stringify({
                  loginId:
                    loggedInCustomer.loginId,

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

        /*
          SECURITY SETUP COMPLETE
        */

        completeCustomerLogin({
          ...loggedInCustomer,

          mustChangePassword:
            false,

          mustChangeWithdrawalPassword:
            false,

          withdrawalPasswordConfigured:
            true,
        });
      } catch (changeError) {
        console.error(
          'Change Withdrawal Password Error:',
          changeError
        );

        setError(
          changeError.message ||
            'Unable to change Withdrawal Password.'
        );
      } finally {
        setLoading(false);
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
      preferredId.trim();

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
      encodeURIComponent(
        message
      );

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

  /* =====================================================
     SIGNUP
  ===================================================== */

  const handleSignup = (
    event
  ) => {
    event.preventDefault();

    openAdminWhatsApp({
      requireDetails: true,
    });
  };

  /* =====================================================
     LOGIN PASSWORD SECURITY SCREEN
  ===================================================== */

  if (
    securityStep ===
    'login-password'
  ) {
    return (
      <ModalShell
        onClose={closeModal}
      >
        <SecurityHeader
          step="1"
          title="Change Login Password"
          subtitle={`First login security setup • ${loggedInCustomer?.loginId || ''}`}
        />

        <form
          onSubmit={
            handleLoginPasswordChange
          }
          className="space-y-4"
        >
          <PasswordField
            label="TEMPORARY / CURRENT LOGIN PASSWORD"
            value={
              currentLoginPassword
            }
            onChange={
              setCurrentLoginPassword
            }
            placeholder="Enter temporary login password"
          />

          <PasswordField
            label="NEW LOGIN PASSWORD"
            value={
              newLoginPassword
            }
            onChange={
              setNewLoginPassword
            }
            placeholder="Minimum 6 characters"
          />

          <PasswordField
            label="CONFIRM LOGIN PASSWORD"
            value={
              confirmLoginPassword
            }
            onChange={
              setConfirmLoginPassword
            }
            placeholder="Re-enter new login password"
          />

          {error && (
            <ErrorBox
              text={error}
            />
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-[52px] w-full rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 text-sm font-black uppercase tracking-wider text-black disabled:opacity-50"
          >
            {loading
              ? 'PLEASE WAIT...'
              : 'CHANGE LOGIN PASSWORD'}
          </button>

          <p className="text-center text-[10px] leading-4 text-gray-500">
            After changing your
            Login Password, Withdrawal
            Password security setup
            will continue.
          </p>
        </form>
      </ModalShell>
    );
  }

  /* =====================================================
     WITHDRAWAL PASSWORD SECURITY SCREEN
  ===================================================== */

  if (
    securityStep ===
    'withdrawal-password'
  ) {
    return (
      <ModalShell
        onClose={closeModal}
      >
        <SecurityHeader
          step="2"
          title="Change Withdrawal Password"
          subtitle={`Security setup • ${loggedInCustomer?.loginId || ''}`}
        />

        <form
          onSubmit={
            handleWithdrawalPasswordChange
          }
          className="space-y-4"
        >
          <PasswordField
            label="TEMPORARY / CURRENT WITHDRAWAL PASSWORD"
            value={
              currentWithdrawalPassword
            }
            onChange={
              setCurrentWithdrawalPassword
            }
            placeholder="Enter temporary withdrawal password"
          />

          <PasswordField
            label="NEW WITHDRAWAL PASSWORD"
            value={
              newWithdrawalPassword
            }
            onChange={
              setNewWithdrawalPassword
            }
            placeholder="Minimum 6 characters"
          />

          <PasswordField
            label="CONFIRM WITHDRAWAL PASSWORD"
            value={
              confirmWithdrawalPassword
            }
            onChange={
              setConfirmWithdrawalPassword
            }
            placeholder="Re-enter new withdrawal password"
          />

          {error && (
            <ErrorBox
              text={error}
            />
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-[52px] w-full rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 text-sm font-black uppercase tracking-wider text-black disabled:opacity-50"
          >
            {loading
              ? 'PLEASE WAIT...'
              : 'COMPLETE SECURITY SETUP'}
          </button>

          <p className="text-center text-[10px] leading-4 text-gray-500">
            Dashboard opens after
            required password setup is
            completed.
          </p>
        </form>
      </ModalShell>
    );
  }

  /* =====================================================
     LOGIN / SIGNUP SCREEN
  ===================================================== */

  return (
    <ModalShell
      onClose={closeModal}
    >
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
            ? 'Login with your User ID and Password'
            : 'Request your new TSB ID'}
        </p>
      </div>

      <div className="mb-5 flex rounded-lg bg-[#0d111c] p-1">
        <button
          type="button"
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

      {isLogin && (
        <form
          onSubmit={handleLogin}
          className="space-y-4"
        >
          <div>
            <label className="mb-2 block text-xs font-bold text-gray-300">
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
              className="h-[52px] w-full rounded-lg border border-gray-800 bg-[#0d111c] px-4 text-sm text-white outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold text-gray-300">
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
                className="h-[52px] w-full rounded-lg border border-gray-800 bg-[#0d111c] px-4 pr-20 text-sm text-white outline-none focus:border-teal-500"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (value) =>
                      !value
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

          {error && (
            <ErrorBox
              text={error}
            />
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-[52px] w-full rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 text-sm font-black uppercase tracking-wider text-black disabled:opacity-50"
          >
            {loading
              ? 'Logging In...'
              : 'Log In'}
          </button>

          <div className="flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-gray-800" />

            <span className="text-[11px] font-bold text-gray-500">
              OR
            </span>

            <div className="h-px flex-1 bg-gray-800" />
          </div>

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

      {!isLogin && (
        <form
          onSubmit={handleSignup}
          className="space-y-4"
        >
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

          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <p className="text-[10px] leading-5 text-gray-400">
              Admin will confirm your
              User ID and provide a
              temporary Login Password
              and temporary Withdrawal
              Password through WhatsApp.
            </p>
          </div>

          {error && (
            <ErrorBox
              text={error}
            />
          )}

          <button
            type="submit"
            className="h-[52px] w-full rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 text-sm font-black uppercase tracking-wider text-black"
          >
            SIGN UP
          </button>

          <div className="flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-gray-800" />

            <span className="text-[11px] font-bold text-gray-500">
              OR
            </span>

            <div className="h-px flex-1 bg-gray-800" />
          </div>

          <button
            type="button"
            onClick={() =>
              openAdminWhatsApp({
                requireDetails: false,
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
        Demo / informational website
        only
      </p>
    </ModalShell>
  );
}

/* =====================================================
   MODAL SHELL
===================================================== */

function ModalShell({
  onClose,
  children,
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 px-4">
      <div className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl border border-teal-900/50 bg-[#060913] p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 text-xl text-gray-400 transition hover:text-white"
          aria-label="Close"
        >
          ×
        </button>

        {children}
      </div>
    </div>
  );
}

/* =====================================================
   SECURITY HEADER
===================================================== */

function SecurityHeader({
  step,
  title,
  subtitle,
}) {
  return (
    <div className="mb-6 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-amber-400/50 bg-amber-500/10 text-2xl">
        🔐
      </div>

      <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-amber-400">
        SECURITY SETUP • STEP {step}
      </p>

      <h2 className="mt-2 text-xl font-black text-white">
        {title}
      </h2>

      <p className="mt-2 text-[11px] text-gray-400">
        {subtitle}
      </p>
    </div>
  );
}

/* =====================================================
   PASSWORD FIELD
===================================================== */

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
}) {
  const [show, setShow] =
    useState(false);

  return (
    <div>
      <label className="mb-2 block text-[10px] font-black text-gray-300">
        {label}
      </label>

      <div className="relative">
        <input
          type={
            show
              ? 'text'
              : 'password'
          }
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value
            )
          }
          placeholder={placeholder}
          autoComplete="new-password"
          className="h-[52px] w-full rounded-lg border border-gray-800 bg-[#0d111c] px-4 pr-20 text-sm text-white outline-none focus:border-teal-500"
        />

        <button
          type="button"
          onClick={() =>
            setShow(
              (value) =>
                !value
            )
          }
          className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400"
        >
          {show
            ? 'Hide'
            : 'Show'}
        </button>
      </div>
    </div>
  );
}

/* =====================================================
   ERROR
===================================================== */

function ErrorBox({
  text,
}) {
  return (
    <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-400">
      {text}
    </div>
  );
}

export default AuthModal;
