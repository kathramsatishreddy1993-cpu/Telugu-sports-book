import React, {
  useEffect,
  useState,
} from "react";

import Header from "./components/Header";
import HeroBanner from "./components/HeroBanner";
import HeroBonusCard from "./components/HeroBonusCard";
import BonusPage from "./components/BonusPage";
import AuthModal from "./components/AuthModal";
import SportsSections from "./components/SportsSections";
import DemoDashboard from "./components/DemoDashboard";
import ChangePasswordPage from "./components/ChangePasswordPage";
import AdminLoginPage from "./components/AdminLoginPage";
import AdminManagementShell from "./components/AdminManagementShell";
import NewAdminPortal from "./components/NewAdminPortal";
import GameControlPage from "./components/GameControlPage";
import RoulettePage from "./components/RoulettePage";
import TSBFlightPage from "./components/TSBFlightPage";
import CardGamesPage from "./components/CardGamesPage";
import ColorPredictionPage from "./components/ColorPredictionPage";
import AnimatedSuperOverPage from "./components/AnimatedSuperOverPage";
import DealOrNoDealPage from "./components/DealOrNoDealPage";
import DealOrNoDealControlPage from "./components/DealOrNoDealControlPage";
import InstantGamesPage from "./components/InstantGamesPage";
import DiceGamesPage from "./components/DiceGamesPage";

const AUTH_KEY =
  "telugu_sports_auth_user";

const ADMIN_AUTH_KEY =
  "telugu_sports_demo_admin";

const EXISTING_GAMES = {
  "/games/tsb-flight": {
    title: "AVIATOR",
    Page: TSBFlightPage,
  },

  "/games/roulette": {
    title: "ROULETTE",
    Page: RoulettePage,
  },

  "/games/super-over": {
    title: "SUPER OVER",
    Page: CardGamesPage,
    game: "super-over",
  },

  "/games/color-prediction": {
    title: "COLOR PREDICTION",
    Page: ColorPredictionPage,
  },

  "/games/dragon-tiger": {
    title: "DRAGON TIGER",
    Page: CardGamesPage,
    game: "dragon-tiger",
  },

  "/games/andar-bahar": {
    title: "ANDAR BAHAR",
    Page: CardGamesPage,
    game: "andar-bahar",
  },

  "/games/lucky-seven": {
    title: "LUCKY SEVEN",
    Page: CardGamesPage,
    game: "lucky-seven",
  },

  "/games/deal-or-no-deal": {
    title: "DEAL OR NO DEAL",
    Page: DealOrNoDealPage,

    description:
      "Random demo results are locked before betting opens.",
  },

  "/games/mini-roulette": {
    title: "MINI ROULETTE",
    Page: InstantGamesPage,
    game: "mini-roulette",

    description:
      "Single-player random demo. Demo coins only.",
  },

  "/games/keno-80": {
    title: "KENO 80",
    Page: InstantGamesPage,
    game: "keno-80",

    description:
      "Pick up to 10 numbers. Twenty numbers are drawn randomly. Demo coins only.",
  },

  "/games/lankesh": {
    title: "LANKESH",
    Page: DiceGamesPage,
    game: "lankesh",

    description:
      "Shared random demo rounds. Choose F1-F10. Demo coins only.",
  },

  "/games/jhandi-munda": {
    title: "JHANDI MUNDA",
    Page: DiceGamesPage,
    game: "jhandi-munda",

    description:
      "Six dice, six symbols and shared random demo rounds. Demo coins only.",
  },

  "/games/animated-super-over": {
    title: "ANIMATED SUPER OVER",
    Page: AnimatedSuperOverPage,
  },
};

const NEW_GAMES = {
  "/games/twist-x": {
    title: "TWIST X",
    game: "twist-x",
  },

  "/games/extra-sic-bo": {
    title: "EXTRA SIC BO",
    game: "extra-sic-bo",
  },

  "/games/dream-wheel": {
    title: "DREAM WHEEL",
    game: "dream-wheel",
  },

  "/games/chicken-road-cross": {
    title: "CHICKEN ROAD CROSS",
    game: "chicken-road-cross",
  },
};

function restoredSession(key) {
  try {
    const saved = JSON.parse(
      localStorage.getItem(key) ||
        "null",
    );

    return saved?.isAuthenticated
      ? saved
      : null;
  } catch (error) {
    console.error(
      "Unable to restore session:",
      error,
    );

    return null;
  }
}

function NewGamePendingPage({
  title,
  onBack,
  onLogout,
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#080d16] p-6 text-center text-white">
      <p className="text-xs font-bold tracking-widest text-amber-300">
        TELUGU SPORTS BOOK · DEMO
      </p>

      <h1 className="mt-4 text-3xl font-black text-cyan-300">
        {title}
      </h1>

      <p
        role="status"
        className="mt-5 max-w-md text-sm leading-7 text-slate-300"
      >
        ఈ గేమ్ సిద్ధమవుతోంది.
        గేమ్ పేజీ అందుబాటులోకి
        వచ్చిన తర్వాత ఇక్కడ ఆడవచ్చు.
      </p>

      <button
        type="button"
        onClick={onBack}
        className="mt-7 rounded-xl bg-cyan-400 px-7 py-3 font-black text-black"
      >
        ← Customer home
      </button>

      <button
        type="button"
        onClick={onLogout}
        className="mt-5 text-sm text-slate-400"
      >
        Logout
      </button>
    </main>
  );
}

export default function App() {
  const [view, setView] =
    useState("home");

  const [authMode, setAuthMode] =
    useState(null);

  const [
    selectedBonus,
    setSelectedBonus,
  ] = useState(null);

  const [
    selectedPublicItem,
    setSelectedPublicItem,
  ] = useState(null);

  const [user, setUser] =
    useState(() =>
      restoredSession(AUTH_KEY),
    );

  const [admin, setAdmin] =
    useState(() =>
      restoredSession(
        ADMIN_AUTH_KEY,
      ),
    );

  const cleanPath =
    window.location.pathname
      .replace(/\/+$/, "")
      .toLowerCase() || "/";

  const isNewAdminMode =
    cleanPath === "/new-admin";

  const isAdminMode =
    cleanPath === "/admin";

  const isGameControl =
    cleanPath === "/game-control";

  const isRouletteControl =
    cleanPath ===
    "/game-control/roulette";

  const isDealOrNoDealControl =
    cleanPath ===
    "/game-control/deal-or-no-deal";

  const existingGame =
    Object.hasOwn(
      EXISTING_GAMES,
      cleanPath,
    )
      ? EXISTING_GAMES[cleanPath]
      : null;

  const newGame =
    Object.hasOwn(
      NEW_GAMES,
      cleanPath,
    )
      ? NEW_GAMES[cleanPath]
      : null;

  const selectedGame =
    existingGame || newGame;

  const isCustomerGame =
    Boolean(selectedGame);

  const unknownGame =
    cleanPath.startsWith(
      "/games/",
    ) && !isCustomerGame;

  const [
    adminChecking,
    setAdminChecking,
  ] = useState(isAdminMode);

  useEffect(() => {
    if (!unknownGame) {
      return undefined;
    }

    const timer = setTimeout(
      () =>
        window.location.replace(
          "/",
        ),
      650,
    );

    return () =>
      clearTimeout(timer);
  }, [unknownGame]);

  useEffect(() => {
    if (!isAdminMode) {
      return undefined;
    }

    let active = true;

    const controller =
      new AbortController();

    fetch(
      "/api/auth/admin-session",
      {
        credentials:
          "same-origin",

        cache:
          "no-store",

        signal:
          controller.signal,
      },
    )
      .then(async response => {
        const data =
          await response.json();

        if (active) {
          setAdmin(
            response.ok &&
              data.admin?.historyOnly !==
                true
              ? data.admin
              : null,
          );
        }
      })
      .catch(() => {
        if (active) {
          setAdmin(null);
        }
      })
      .finally(() => {
        if (active) {
          setAdminChecking(
            false,
          );
        }
      });

    return () => {
      active = false;

      controller.abort();
    };
  }, [isAdminMode]);

  const saveCustomerSession =
    customer => {
      try {
        localStorage.setItem(
          AUTH_KEY,

          JSON.stringify(
            customer,
          ),
        );
      } catch (error) {
        console.error(
          "Unable to save customer session:",
          error,
        );
      }
    };

  const handleOpenBonus = (
    bonusType = null,
  ) => {
    setSelectedBonus(
      typeof bonusType === "string"
        ? bonusType
        : null,
    );

    setView("bonus");

    window.scrollTo(0, 0);
  };

  const handleCloseBonus = () => {
    setView("home");

    setSelectedBonus(null);

    window.scrollTo(0, 0);
  };

  const handlePublicItemClick = (
    mode = "login",
    item = null,
  ) => {
    setSelectedPublicItem(item);

    setAuthMode(
      mode === "signup"
        ? "signup"
        : "login",
    );
  };

  const handleLoginSuccess =
    loggedInUser => {
      const normalizedUser = {
        ...loggedInUser,

        isAuthenticated: true,

        loginId:
          loggedInUser?.loginId ||
          loggedInUser?.identifier ||
          "",

        identifier:
          loggedInUser?.identifier ||
          loggedInUser?.loginId ||
          "",
      };

      saveCustomerSession(
        normalizedUser,
      );

      setUser(
        normalizedUser,
      );

      setAuthMode(null);
      setView("home");
      setSelectedBonus(null);

      if (
        selectedPublicItem
      ) {
        try {
          sessionStorage.setItem(
            "telugu_sports_selected_demo_item",

            JSON.stringify(
              selectedPublicItem,
            ),
          );
        } catch (error) {
          console.error(
            "Unable to save selected demo item:",
            error,
          );
        }
      }

      setSelectedPublicItem(
        null,
      );
    };

  const handleSecurityComplete =
    updatedUser => {
      const completedUser = {
        ...user,
        ...updatedUser,

        isAuthenticated: true,

        mustChangePassword: false,

        mustChangeWithdrawalPassword:
          false,

        withdrawalPasswordConfigured:
          true,
      };

      saveCustomerSession(
        completedUser,
      );

      setUser(
        completedUser,
      );

      setView("home");

      setSelectedBonus(null);
    };

  const handleLogout = () => {
    try {
      localStorage.removeItem(
        AUTH_KEY,
      );

      sessionStorage.removeItem(
        "telugu_sports_selected_demo_item",
      );
    } catch (error) {
      console.error(
        "Unable to logout:",
        error,
      );
    }

    setUser(null);
    setAuthMode(null);
    setSelectedPublicItem(null);
    setSelectedBonus(null);
    setView("home");
  };

  const handleAdminLogout =
    async () => {
      try {
        await fetch(
          "/api/auth/admin-logout",
          {
            method: "POST",

            credentials:
              "same-origin",
          },
        );
      } catch (error) {
        console.error(
          "Server logout failed:",
          error,
        );
      }

      try {
        localStorage.removeItem(
          ADMIN_AUTH_KEY,
        );
      } catch (error) {
        console.error(
          "Unable to logout admin:",
          error,
        );
      }

      setAdmin(null);
    };

  if (
    isNewAdminMode
  ) {
    return <NewAdminPortal />;
  }

  if (
    isDealOrNoDealControl
  ) {
    return (
      <DealOrNoDealControlPage />
    );
  }

  if (
    isRouletteControl
  ) {
    return (
      <RoulettePage controller />
    );
  }

  if (
    isGameControl
  ) {
    return <GameControlPage />;
  }

  if (
    isAdminMode
  ) {
    if (
      adminChecking
    ) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#061c1a] text-sm text-amber-200">
          Checking Admin session…
        </div>
      );
    }

    return admin?.isAuthenticated ? (
      <AdminManagementShell
        admin={admin}
        onLogout={
          handleAdminLogout
        }
      />
    ) : (
      <AdminLoginPage
        onLogin={setAdmin}
        onBack={() =>
          window.location.assign(
            "/",
          )
        }
      />
    );
  }

  const requiresSecuritySetup =
    Boolean(
      user?.isAuthenticated &&
        (
          user.mustChangePassword ===
            true ||
          user.mustChangeWithdrawalPassword ===
            true
        ),
    );

  if (
    requiresSecuritySetup
  ) {
    return (
      <ChangePasswordPage
        user={user}
        onComplete={
          handleSecurityComplete
        }
        onLogout={
          handleLogout
        }
      />
    );
  }

  if (
    unknownGame
  ) {
    return (
      <div className="fixed inset-0 bg-black" />
    );
  }

  if (
    isCustomerGame
  ) {
    if (
      user?.isAuthenticated
    ) {
      const onBack = () =>
        window.location.assign(
          "/",
        );

      if (
        newGame
      ) {
        return (
          <NewGamePendingPage
            title={
              newGame.title
            }
            onBack={
              onBack
            }
            onLogout={
              handleLogout
            }
          />
        );
      }

      const GamePage =
        existingGame.Page;

      return (
        <GamePage
          game={
            existingGame.game
          }
          user={
            user
          }
          onBack={
            onBack
          }
          onLogout={
            handleLogout
          }
        />
      );
    }

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#080d16] p-5 text-center text-white">
        <h1 className="text-3xl font-black text-cyan-300">
          {selectedGame.title}
        </h1>

        <p className="mt-4 max-w-md text-sm leading-6 text-slate-300">
          Login with your customer ID
          to access this demo game.
          Demo coins only.
        </p>

        {newGame ? (
          <p className="mt-3 max-w-md text-xs leading-5 text-amber-200">
            ఈ గేమ్ ఇంకా సిద్ధమవుతోంది.
          </p>
        ) : selectedGame.description ? (
          <p className="mt-3 max-w-md text-xs leading-5 text-amber-200">
            {
              selectedGame.description
            }
          </p>
        ) : null}

        <button
          type="button"
          onClick={() =>
            setAuthMode(
              "login",
            )
          }
          className="mt-6 rounded-xl bg-cyan-400 px-8 py-3 font-black text-black"
        >
          CUSTOMER LOGIN
        </button>

        <a
          href="/"
          className="mt-5 text-sm text-slate-400"
        >
          ← Customer home
        </a>

        <AuthModal
          isOpen={
            Boolean(authMode)
          }
          initialMode={
            authMode || "login"
          }
          onClose={() =>
            setAuthMode(null)
          }
          onLoginSuccess={
            handleLoginSuccess
          }
        />
      </div>
    );
  }

  if (
    user?.isAuthenticated
  ) {
    return (
      <DemoDashboard
        user={user}
        onLogout={
          handleLogout
        }
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#080d16] font-sans text-white">
      <Header
        onOpenAuth={
          setAuthMode
        }
        user={user}
        isAuthenticated={
          Boolean(user)
        }
        onLogout={
          handleLogout
        }
      />

      {view === "home" ? (
        <main className="flex-1 pb-16">
          <HeroBanner
            onRequireAuth={
              handlePublicItemClick
            }
          />

          <div className="mx-auto my-4 max-w-xl px-4">
            <HeroBonusCard
              onOpenBonus={
                handleOpenBonus
              }
            />
          </div>

          <SportsSections />
        </main>
      ) : (
        <BonusPage
          bonusType={
            selectedBonus
          }
          onBack={
            handleCloseBonus
          }
        />
      )}

      <AuthModal
        isOpen={
          Boolean(authMode)
        }
        initialMode={
          authMode || "login"
        }
        onClose={() => {
          setAuthMode(null);

          setSelectedPublicItem(
            null,
          );
        }}
        onLoginSuccess={
          handleLoginSuccess
        }
      />
    </div>
  );
}
