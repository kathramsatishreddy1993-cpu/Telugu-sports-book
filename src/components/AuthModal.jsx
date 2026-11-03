import React, {
  useEffect,
  useState,
} from "react";

const AUTH_KEY = "telugu_sports_auth_user";

const DEFAULT_WHATSAPP_NUMBER =
  "919346824432";

const LOGIN_BACKGROUND =
  "/file_0000000094288208a5d577eadc40844c.png";

function normalizeWhatsAppNumber(value) {
  const digits = String(value || "").replace(
    /\D/g,
    "",
  );

  if (!digits) {
    return DEFAULT_WHATSAPP_NUMBER;
  }

  if (digits.length === 10) {
    return `91${digits}`;
  }

  return digits;
}

function WhatsAppIcon({
  className = "h-6 w-6",
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M20.52 3.48A11.91 11.91 0 0 0 12.04 0C5.44 0 .06 5.37.06 11.97c0 2.11.55 4.17 1.6 5.99L0 24l6.2-1.63a11.97 11.97 0 0 0 5.83 1.49h.01c6.6 0 11.97-5.37 11.97-11.97 0-3.2-1.24-6.2-3.49-8.41ZM12.04 21.84a9.91 9.91 0 0 1-5.05-1.38l-.36-.21-3.68.97.98-3.59-.23-.37a9.91 9.91 0 0 1-1.52-5.29c0-5.49 4.47-9.96 9.97-9.96a9.9 9.9 0 0 1 7.04 2.92 9.9 9.9 0 0 1 2.91 7.05c0 5.49-4.47 9.96-9.96 9.96Zm5.46-7.46c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.67-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.2 5.09 4.49.71.31 1.27.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35Z" />
    </svg>
  );
}

export default function AuthModal({
  isOpen,
  onClose,
  onLoginSuccess,
  initialMode = "login",
}) {
  const [isLogin, setIsLogin] = useState(
    initialMode !== "signup",
  );

  const [identifier, setIdentifier] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [signupName, setSignupName] =
    useState("");

  const [preferredId, setPreferredId] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [rememberMe, setRememberMe] =
    useState(true);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [
    adminWhatsAppNumber,
    setAdminWhatsAppNumber,
  ] = useState(DEFAULT_WHATSAPP_NUMBER);

  const [
    whatsappLoading,
    setWhatsAppLoading,
  ] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setIsLogin(initialMode !== "signup");
    setError("");
  }, [isOpen, initialMode]);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;

    const loadWhatsAppNumber = async () => {
      try {
        setWhatsAppLoading(true);

        const response = await fetch(
          "/api/public/settings",
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            cache: "no-store",
          },
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
              "Unable to load WhatsApp number.",
          );
        }

        if (!active) return;

        setAdminWhatsAppNumber(
          normalizeWhatsAppNumber(
            data?.whatsappNumber ||
              data?.number ||
              data?.phone ||
              DEFAULT_WHATSAPP_NUMBER,
          ),
        );
      } catch (loadError) {
        console.error(
          "WhatsApp Settings Error:",
          loadError,
        );

        if (active) {
          setAdminWhatsAppNumber(
            DEFAULT_WHATSAPP_NUMBER,
          );
        }
      } finally {
        if (active) {
          setWhatsAppLoading(false);
        }
      }
    };

    void loadWhatsAppNumber();

    return () => {
      active = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const closeModal = () => {
    if (loading) return;

    setError("");
    onClose?.();
  };

  const handleLogin = async event => {
    event.preventDefault();
    setError("");

    const cleanLoginId =
      identifier.trim().toLowerCase();

    if (!cleanLoginId) {
      setError(
        "Please enter your Customer ID.",
      );
      return;
    }

    if (!password) {
      setError(
        "Please enter your Password.",
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "/api/auth/customer-login",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            loginId: cleanLoginId,
            password,
          }),
        },
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
            "Invalid Login ID or Password.",
        );
      }

      const customer = data?.customer || {};

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
          "ACTIVE",

        isAuthenticated: true,
        isDemo: true,

        mustChangePassword: Boolean(
          data?.mustChangePassword ??
            customer?.mustChangePassword,
        ),

        mustChangeWithdrawalPassword:
          Boolean(
            data?.mustChangeWithdrawalPassword ??
              customer?.mustChangeWithdrawalPassword,
          ),

        withdrawalPasswordConfigured:
          Boolean(
            data?.withdrawalPasswordConfigured ??
              customer?.withdrawalPasswordConfigured,
          ),
      };

      localStorage.setItem(
        AUTH_KEY,
        JSON.stringify(loggedInUser),
      );

      setIdentifier("");
      setPassword("");
      setError("");

      onLoginSuccess?.(loggedInUser);
      onClose?.();
    } catch (loginError) {
      console.error(
        "Customer Login Error:",
        loginError,
      );

      setError(
        loginError?.message ||
          "Unable to login. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setError("");

    const demoUser = {
      name: "Demo User",
      loginId: "demo",
      identifier: "demo",
      isAuthenticated: true,
      isDemo: true,
      mustChangePassword: false,
      mustChangeWithdrawalPassword: false,
      withdrawalPasswordConfigured: true,
    };

    try {
      localStorage.setItem(
        AUTH_KEY,
        JSON.stringify(demoUser),
      );
    } catch (storageError) {
      console.error(
        "Unable to save demo login:",
        storageError,
      );
    }

    onLoginSuccess?.(demoUser);
    onClose?.();
  };

  const openAdminWhatsApp = ({
    requireDetails = false,
  } = {}) => {
    setError("");

    const cleanName = signupName.trim();

    const cleanId =
      preferredId.trim().toLowerCase();

    if (requireDetails && !cleanName) {
      setError(
        "Please enter your Name.",
      );
      return;
    }

    if (requireDetails && !cleanId) {
      setError(
        "Please enter your User ID.",
      );
      return;
    }

    const whatsappNumber =
      normalizeWhatsAppNumber(
        adminWhatsAppNumber,
      );

    const lines = [
      "Hello, I want a new ID.",
    ];

    if (cleanName) {
      lines.push(
        `Name: ${cleanName}`,
      );
    }

    if (cleanId) {
      lines.push(
        `User ID: ${cleanId}`,
      );
    }

    const encodedMessage =
      encodeURIComponent(
        lines.join("\n"),
      );

    const appLink =
      `whatsapp://send?phone=${whatsappNumber}` +
      `&text=${encodedMessage}`;

    const webLink =
      `https://wa.me/${whatsappNumber}` +
      `?text=${encodedMessage}`;

    window.location.href = appLink;

    setTimeout(() => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        window.location.href = webLink;
      }
    }, 1200);
  };

  const handleSignup = event => {
    event.preventDefault();

    openAdminWhatsApp({
      requireDetails: true,
    });
  };

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
        backgroundSize: "cover",
        backgroundPosition: "center top",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="absolute inset-0 bg-black/20" />

      <button
        type="button"
        onClick={closeModal}
        disabled={loading}
        className="fixed right-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/60 text-2xl text-white shadow-xl backdrop-blur-md disabled:opacity-40"
        aria-label="Close"
      >
        ×
      </button>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8">
        <div className="w-full max-w-[430px]">
          <div className="h-[170px] sm:h-[190px]" />

          <div className="overflow-hidden rounded-[28px] border border-cyan-400/70 bg-[#03101b]/95 shadow-[0_0_35px_rgba(34,211,238,0.22)] backdrop-blur-xl">
            <div className="px-5 pb-6 pt-5 sm:px-7">
              <div className="text-center">
                <h2 className="text-2xl font-black text-white">
                  Welcome to
                </h2>

                <div className="mt-1 text-[22px] font-black uppercase leading-tight">
                  <span className="text-rose-500">
                    TELUGU
                  </span>{" "}
                  <span className="text-white">
                    SPORTS
                  </span>{" "}
                  <span className="text-amber-400">
                    BOOK
                  </span>
                </div>

                <p className="mt-2 text-xs text-gray-300">
                  Sports &amp; Entertainment Demo
                </p>
              </div>

              <div className="mt-5 flex overflow-hidden rounded-xl border border-cyan-500/30 bg-[#07131f]/90 p-1">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setIsLogin(true);
                    setError("");
                  }}
                  className={`h-12 flex-1 rounded-lg text-sm font-black transition ${
                    isLogin
                      ? "bg-gradient-to-r from-cyan-600 to-teal-500 text-white shadow-[0_0_18px_rgba(6,182,212,0.35)]"
                      : "text-gray-300"
                  }`}
                >
                  Login
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setIsLogin(false);
                    setError("");
                  }}
                  className={`h-12 flex-1 rounded-lg text-sm font-black transition ${
                    !isLogin
                      ? "bg-gradient-to-r from-cyan-600 to-teal-500 text-white shadow-[0_0_18px_rgba(6,182,212,0.35)]"
                      : "text-gray-300"
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {isLogin && (
                <form
                  onSubmit={handleLogin}
                  className="mt-5 space-y-4"
                >
                  <div className="relative">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl text-gray-400"
                    >
                      ♙
                    </div>

                    <input
                      type="text"
                      aria-label="Customer ID"
                      value={identifier}
                      disabled={loading}
                      onChange={event =>
                        setIdentifier(
                          event.target.value,
                        )
                      }
                      placeholder="Customer ID"
                      autoComplete="username"
                      className="h-[58px] w-full rounded-xl border border-slate-500/70 bg-[#071522]/95 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-gray-400 focus:border-cyan-400 disabled:opacity-60"
                    />
                  </div>

                  <div className="relative">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-gray-400"
                    >
                      🔒
                    </div>

                    <input
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      aria-label="Password"
                      value={password}
                      disabled={loading}
                      onChange={event =>
                        setPassword(
                          event.target.value,
                        )
                      }
                      placeholder="Password"
                      autoComplete="current-password"
                      className="h-[58px] w-full rounded-xl border border-slate-500/70 bg-[#071522]/95 pl-12 pr-20 text-sm text-white outline-none transition placeholder:text-gray-400 focus:border-cyan-400 disabled:opacity-60"
                    />

                    <button
                      type="button"
                      disabled={loading}
                      onClick={() =>
                        setShowPassword(
                          value => !value,
                        )
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-cyan-300"
                    >
                      {showPassword
                        ? "HIDE"
                        : "SHOW"}
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-300">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={event =>
                          setRememberMe(
                            event.target.checked,
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

                  {error && (
                    <ErrorBox text={error} />
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="h-[56px] w-full rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-500 text-base font-black uppercase tracking-wider text-black shadow-[0_0_22px_rgba(245,158,11,0.30)] transition active:scale-[0.99] disabled:opacity-50"
                  >
                    {loading
                      ? "CHECKING..."
                      : "LOGIN"}
                  </button>

                  <div className="flex items-center gap-4 py-1">
                    <div className="h-px flex-1 bg-gray-600/70" />

                    <span className="text-xs font-bold text-gray-400">
                      OR
                    </span>

                    <div className="h-px flex-1 bg-gray-600/70" />
                  </div>

                  <button
                    type="button"
                    onClick={handleDemoLogin}
                    disabled={loading}
                    className="flex h-[56px] w-full items-center justify-center gap-3 rounded-xl border-2 border-cyan-400 bg-[#06121d]/90 text-sm font-black uppercase tracking-wide text-white shadow-[0_0_20px_rgba(34,211,238,0.15)] transition active:scale-[0.99] disabled:opacity-50"
                  >
                    <span
                      aria-hidden="true"
                      className="text-xl"
                    >
                      🎮
                    </span>

                    LOGIN WITH DEMO ID
                  </button>

                  <button
                    type="button"
                    disabled={whatsappLoading}
                    onClick={() =>
                      openAdminWhatsApp({
                        requireDetails: false,
                      })
                    }
                    className="flex w-full items-center justify-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 transition active:scale-[0.99] disabled:opacity-50"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#20c968] text-white">
                      <WhatsAppIcon className="h-6 w-6" />
                    </span>

                    <div className="text-left">
                      <div className="text-[10px] text-gray-400">
                        Need Help?
                      </div>

                      <div className="text-sm font-black text-emerald-400">
                        {whatsappLoading
                          ? "Loading..."
                          : "Chat on WhatsApp"}
                      </div>
                    </div>

                    <span
                      aria-hidden="true"
                      className="ml-auto text-xl text-gray-400"
                    >
                      ›
                    </span>
                  </button>
                </form>
              )}

              {!isLogin && (
                <form
                  onSubmit={handleSignup}
                  className="mt-5 space-y-4"
                >
                  <div>
                    <label
                      htmlFor="tsb-signup-name"
                      className="mb-2 block text-xs font-bold text-gray-300"
                    >
                      Name
                    </label>

                    <input
                      id="tsb-signup-name"
                      type="text"
                      value={signupName}
                      onChange={event =>
                        setSignupName(
                          event.target.value,
                        )
                      }
                      placeholder="Enter your Name"
                      autoComplete="name"
                      className="h-[56px] w-full rounded-xl border border-slate-500/70 bg-[#071522]/95 px-4 text-sm text-white outline-none placeholder:text-gray-400 focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="tsb-preferred-id"
                      className="mb-2 block text-xs font-bold text-gray-300"
                    >
                      User ID
                    </label>

                    <input
                      id="tsb-preferred-id"
                      type="text"
                      value={preferredId}
                      onChange={event =>
                        setPreferredId(
                          event.target.value,
                        )
                      }
                      placeholder="User ID"
                      autoComplete="off"
                      className="h-[56px] w-full rounded-xl border border-slate-500/70 bg-[#071522]/95 px-4 text-sm text-white outline-none placeholder:text-gray-400 focus:border-cyan-400"
                    />
                  </div>

                  {error && (
                    <ErrorBox text={error} />
                  )}

                  <button
                    type="submit"
                    disabled={whatsappLoading}
                    className="h-[56px] w-full rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-500 text-sm font-black uppercase tracking-wider text-black shadow-[0_0_22px_rgba(245,158,11,0.30)] disabled:opacity-50"
                  >
                    {whatsappLoading
                      ? "LOADING..."
                      : "SIGN UP"}
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
                    disabled={whatsappLoading}
                    onClick={() =>
                      openAdminWhatsApp({
                        requireDetails: false,
                      })
                    }
                    className="flex h-[58px] w-full items-center justify-center gap-3 rounded-xl border-2 border-emerald-400 bg-[#061b15]/90 text-sm font-black text-emerald-300 disabled:opacity-50"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#20c968] text-white">
                      <WhatsAppIcon className="h-5 w-5" />
                    </span>

                    GET TSB ID ON WHATSAPP
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="h-8" />
        </div>
      </div>
    </div>
  );
}

function ErrorBox({ text }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-500/30 bg-red-950/50 px-3 py-3 text-sm text-red-300"
    >
      {text}
    </div>
  );
}
