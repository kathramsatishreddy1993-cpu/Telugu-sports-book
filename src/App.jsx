import React, {
  useEffect,
  useState,
} from 'react';

import Header from './components/Header';
import HeroBanner from './components/HeroBanner';
import HeroBonusCard from './components/HeroBonusCard';
import BonusPage from './components/BonusPage';
import AuthModal from './components/AuthModal';
import SportsSections from './components/SportsSections';
import DemoDashboard from './components/DemoDashboard';
import ChangePasswordPage from './components/ChangePasswordPage';

import AdminLoginPage from './components/AdminLoginPage';
import AdminManagementShell from './components/AdminManagementShell';

import GameControlPage from './components/GameControlPage';
import TSBFlightPage from './components/TSBFlightPage';

const AUTH_KEY =
  'telugu_sports_auth_user';

const ADMIN_AUTH_KEY =
  'telugu_sports_demo_admin';

/* RESTORE SAVED SESSION */

function restoredSession(key) {
  try {
    const saved = JSON.parse(
      localStorage.getItem(key) || 'null',
    );

    return saved?.isAuthenticated
      ? saved
      : null;
  } catch (error) {
    console.error(
      'Unable to restore session:',
      error,
    );

    return null;
  }
}

export default function App() {
  const [view, setView] =
    useState('home');

  const [authMode, setAuthMode] =
    useState(null);

  const [
    selectedPublicItem,
    setSelectedPublicItem,
  ] = useState(null);

  const [user, setUser] = useState(
    () => restoredSession(AUTH_KEY),
  );

  const [admin, setAdmin] = useState(
    () => restoredSession(ADMIN_AUTH_KEY),
  );

  /* ROUTES */

  const cleanPath =
    window.location.pathname
      .replace(/\/+$/, '')
      .toLowerCase();

  const isAdminMode =
    cleanPath === '/admin';

  const isGameControl =
    cleanPath === '/game-control';

  const isFlight =
    cleanPath === '/games/tsb-flight';

  const [
    adminChecking,
    setAdminChecking,
  ] = useState(isAdminMode);

  /* VERIFY ADMIN SESSION WITH SERVER */

  useEffect(() => {
    if (!isAdminMode) {
      return;
    }

    let active = true;

    fetch('/api/auth/admin-session', {
      credentials: 'same-origin',
      cache: 'no-store',
    })
      .then(async (response) => {
        const data =
          await response.json();

        if (active) {
          setAdmin(
            response.ok
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
          setAdminChecking(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isAdminMode]);

  /* SAVE CUSTOMER SESSION */

  const saveCustomerSession = (
    customer,
  ) => {
    try {
      localStorage.setItem(
        AUTH_KEY,
        JSON.stringify(customer),
      );
    } catch (error) {
      console.error(
        'Unable to save customer session:',
        error,
      );
    }
  };

  /* PUBLIC ITEM CLICK */

  const handlePublicItemClick = (
    mode = 'login',
    item = null,
  ) => {
    setSelectedPublicItem(item);

    setAuthMode(
      mode === 'signup'
        ? 'signup'
        : 'login',
    );
  };

  /* CUSTOMER LOGIN SUCCESS */

  const handleLoginSuccess = (
    loggedInUser,
  ) => {
    const normalizedUser = {
      ...loggedInUser,

      isAuthenticated: true,

      loginId:
        loggedInUser?.loginId ||
        loggedInUser?.identifier ||
        '',

      identifier:
        loggedInUser?.identifier ||
        loggedInUser?.loginId ||
        '',
    };

    saveCustomerSession(
      normalizedUser,
    );

    setUser(normalizedUser);

    setAuthMode(null);

    setView('home');

    if (selectedPublicItem) {
      try {
        sessionStorage.setItem(
          'telugu_sports_selected_demo_item',

          JSON.stringify(
            selectedPublicItem,
          ),
        );
      } catch (error) {
        console.error(
          'Unable to save selected demo item:',
          error,
        );
      }
    }

    setSelectedPublicItem(null);
  };

  /* CUSTOMER SECURITY SETUP COMPLETE */

  const handleSecurityComplete = (
    updatedUser,
  ) => {
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

    setUser(completedUser);

    setView('home');
  };

  /* CUSTOMER LOGOUT */

  const handleLogout = () => {
    try {
      localStorage.removeItem(
        AUTH_KEY,
      );

      sessionStorage.removeItem(
        'telugu_sports_selected_demo_item',
      );
    } catch (error) {
      console.error(
        'Unable to logout:',
        error,
      );
    }

    setUser(null);

    setAuthMode(null);

    setSelectedPublicItem(null);

    setView('home');
  };

  /* ADMIN LOGOUT */

  const handleAdminLogout =
    async () => {
      try {
        await fetch(
          '/api/auth/admin-logout',
          {
            method: 'POST',

            credentials:
              'same-origin',
          },
        );
      } catch (error) {
        console.error(
          'Server logout failed:',
          error,
        );
      }

      try {
        localStorage.removeItem(
          ADMIN_AUTH_KEY,
        );
      } catch (error) {
        console.error(
          'Unable to logout admin:',
          error,
        );
      }

      setAdmin(null);
    };

  /* SEPARATE GAME CONTROL PANEL */

  if (isGameControl) {
    return <GameControlPage />;
  }

  /* MAIN ADMIN PANEL */

  if (isAdminMode) {
    if (adminChecking) {
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

        onBack={() => {
          window.location.href = '/';
        }}
      />
    );
  }

  /* CUSTOMER SECURITY CHECK */

  const requiresSecuritySetup =
    Boolean(
      user?.isAuthenticated &&
        (
          user.mustChangePassword === true ||
          user.mustChangeWithdrawalPassword === true
        ),
    );

  if (requiresSecuritySetup) {
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

  /* TSB FLIGHT CUSTOMER PAGE */

  if (isFlight) {
    if (user?.isAuthenticated) {
      return (
        <TSBFlightPage
          user={user}

          onBack={() =>
            window.location.assign('/')
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
          TSB FLIGHT
        </h1>

        <p className="mt-4 max-w-md text-sm leading-6 text-slate-300">
          Admin-controlled multiplayer demo.
          Login with your customer ID to
          use your demo coins.
        </p>

        <button
          type="button"

          onClick={() =>
            setAuthMode('login')
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
            authMode || 'login'
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

  /* CUSTOMER DASHBOARD */

  if (user?.isAuthenticated) {
    return (
      <DemoDashboard
        user={user}

        onLogout={
          handleLogout
        }
      />
    );
  }

  /* PUBLIC CUSTOMER HOME */

  return (
    <div className="min-h-screen bg-[#080d16] text-white flex flex-col font-sans">
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

      {view === 'home' ? (
        <main className="flex-1 pb-16">
          <HeroBanner
            onRequireAuth={
              handlePublicItemClick
            }
          />

          <div className="max-w-xl mx-auto px-4 my-4">
            <HeroBonusCard
              onOpenBonus={() =>
                setView('bonus')
              }
            />
          </div>

          <SportsSections />
        </main>
      ) : (
        <BonusPage
          onBack={() =>
            setView('home')
          }
        />
      )}

      <AuthModal
        isOpen={
          Boolean(authMode)
        }

        initialMode={
          authMode || 'login'
        }

        onClose={() => {
          setAuthMode(null);

          setSelectedPublicItem(null);
        }}

        onLoginSuccess={
          handleLoginSuccess
        }
      />
    </div>
  );
}
