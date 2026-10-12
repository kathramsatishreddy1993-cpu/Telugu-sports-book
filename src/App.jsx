import React, { useState } from 'react';

import Header from './components/Header';
import HeroBanner from './components/HeroBanner';
import HeroBonusCard from './components/HeroBonusCard';
import BonusPage from './components/BonusPage';
import AuthModal from './components/AuthModal';
import SportsSections from './components/SportsSections';
import DemoDashboard from './components/DemoDashboard';
import ChangePasswordPage from './components/ChangePasswordPage';

/* ADMIN */
import AdminLoginPage from './components/AdminLoginPage';
import AdminDashboard from './components/AdminDashboard';

const AUTH_KEY =
  'telugu_sports_auth_user';

const ADMIN_AUTH_KEY =
  'telugu_sports_demo_admin';

export default function App() {
  const [view, setView] =
    useState('home');

  const [authMode, setAuthMode] =
    useState(null);

  /* =========================================
     CUSTOMER LOGIN
  ========================================= */

  const [user, setUser] =
    useState(() => {
      try {
        const savedUser =
          localStorage.getItem(
            AUTH_KEY
          );

        if (!savedUser) {
          return null;
        }

        const parsedUser =
          JSON.parse(savedUser);

        return parsedUser
          ?.isAuthenticated
          ? parsedUser
          : null;
      } catch (error) {
        console.error(
          'Unable to restore login:',
          error
        );

        return null;
      }
    });

  /* =========================================
     ADMIN LOGIN
  ========================================= */

  const [admin, setAdmin] =
    useState(() => {
      try {
        const savedAdmin =
          localStorage.getItem(
            ADMIN_AUTH_KEY
          );

        if (!savedAdmin) {
          return null;
        }

        const parsedAdmin =
          JSON.parse(savedAdmin);

        return parsedAdmin
          ?.isAuthenticated
          ? parsedAdmin
          : null;
      } catch (error) {
        console.error(
          'Unable to restore admin login:',
          error
        );

        return null;
      }
    });

  /* =========================================
     ROUTE CHECK
  ========================================= */

  const cleanPath =
    window.location.pathname
      .replace(/\/+$/, '')
      .toLowerCase();

  /*
    CUSTOMER:
    /

    ADMIN:
    /admin
  */

  const isAdminMode =
    cleanPath === '/admin';

  /* =========================================
     SAVE CUSTOMER SESSION
  ========================================= */

  const saveCustomerSession = (
    customer
  ) => {
    try {
      localStorage.setItem(
        AUTH_KEY,
        JSON.stringify(customer)
      );
    } catch (error) {
      console.error(
        'Unable to save customer session:',
        error
      );
    }
  };

  /* =========================================
     CUSTOMER LOGIN SUCCESS
  ========================================= */

  const handleLoginSuccess = (
    loggedInUser
  ) => {
    /*
      AuthModal should return the
      database login result.

      These flags decide whether
      Security Setup must appear.
    */

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
      normalizedUser
    );

    setUser(normalizedUser);

    setAuthMode(null);

    setView('home');
  };

  /* =========================================
     SECURITY SETUP COMPLETE
  ========================================= */

  const handleSecurityComplete = (
    updatedUser
  ) => {
    const completedUser = {
      ...updatedUser,

      isAuthenticated: true,

      mustChangePassword:
        false,

      mustChangeWithdrawalPassword:
        false,

      withdrawalPasswordConfigured:
        true,
    };

    saveCustomerSession(
      completedUser
    );

    setUser(completedUser);

    setView('home');
  };

  /* =========================================
     CUSTOMER LOGOUT
  ========================================= */

  const handleLogout = () => {
    try {
      localStorage.removeItem(
        AUTH_KEY
      );
    } catch (error) {
      console.error(
        'Unable to logout:',
        error
      );
    }

    setUser(null);

    setAuthMode(null);

    setView('home');
  };

  /* =========================================
     ADMIN LOGIN SUCCESS
  ========================================= */

  const handleAdminLogin = (
    loggedInAdmin
  ) => {
    setAdmin(
      loggedInAdmin
    );
  };

  /* =========================================
     ADMIN LOGOUT
  ========================================= */

  const handleAdminLogout = () => {
    try {
      localStorage.removeItem(
        ADMIN_AUTH_KEY
      );
    } catch (error) {
      console.error(
        'Unable to logout admin:',
        error
      );
    }

    setAdmin(null);
  };

  /* =========================================
     EXIT ADMIN
  ========================================= */

  const handleExitAdmin = () => {
    window.location.href = '/';
  };

  /* =========================================
     ADMIN BLOCK
  ========================================= */

  if (isAdminMode) {
    if (
      admin?.isAuthenticated
    ) {
      return (
        <AdminDashboard
          admin={admin}
          onLogout={
            handleAdminLogout
          }
        />
      );
    }

    return (
      <AdminLoginPage
        onLogin={
          handleAdminLogin
        }
        onBack={
          handleExitAdmin
        }
      />
    );
  }

  /* =========================================
     CUSTOMER SECURITY CHECK
  ========================================= */

  const requiresSecuritySetup =
    Boolean(
      user?.isAuthenticated &&
        (
          user?.mustChangePassword ===
            true ||
          user
            ?.mustChangeWithdrawalPassword ===
            true
        )
    );

  /*
    IMPORTANT:

    If either temporary password
    still needs to be changed,
    customer cannot enter Dashboard.
  */

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

  /* =========================================
     CUSTOMER DASHBOARD
  ========================================= */

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

  /* =========================================
     PUBLIC CUSTOMER HOME
  ========================================= */

  return (
    <div className="min-h-screen bg-[#080d16] text-white flex flex-col font-sans">

      <Header
        onOpenAuth={(mode) =>
          setAuthMode(mode)
        }
        user={user}
        isAuthenticated={
          !!user
        }
        onLogout={
          handleLogout
        }
      />

      {view === 'home' ? (
        <main className="flex-1 pb-16">

          <HeroBanner />

          <div className="max-w-xl mx-auto px-4 my-4">

            <HeroBonusCard
              onOpenBonus={() =>
                setView(
                  'bonus'
                )
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
          !!authMode
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
