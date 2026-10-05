import React, { useEffect, useState } from 'react';
import Header from './components/Header';
import HeroBanner from './components/HeroBanner';
import HeroBonusCard from './components/HeroBonusCard';
import BonusPage from './components/BonusPage';
import AuthModal from './components/AuthModal';
import SportsSections from './components/SportsSections';

const AUTH_KEY = 'telugu_sports_auth_user';

export default function App() {
  const [view, setView] = useState('home');
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Restore existing authenticated/demo session
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(AUTH_KEY);

      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);

        if (parsedUser?.isAuthenticated === true) {
          setUser(parsedUser);
        }
      }
    } catch (error) {
      console.error('Failed to restore authentication:', error);
      localStorage.removeItem(AUTH_KEY);
    } finally {
      setIsCheckingAuth(false);
    }
  }, []);

  const handleLoginSuccess = (userData) => {
    const authenticatedUser = {
      ...userData,
      isAuthenticated: true,
    };

    localStorage.setItem(
      AUTH_KEY,
      JSON.stringify(authenticatedUser)
    );

    setUser(authenticatedUser);
    setAuthMode(null);
    setView('home');
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_KEY);
    setUser(null);
    setView('home');
    setAuthMode('login');
  };

  // Prevent the application from rendering before auth state is checked
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#080d16] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-amber-400 font-black text-xl">
            TELUGU SPORTS BOOK
          </div>
          <div className="text-gray-500 text-xs mt-2">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  // STRICT AUTH GUARD
  // No authenticated user = only Login / Sign Up screen
  if (!user) {
    return (
      <div className="min-h-screen bg-[#080d16] text-white">
        <Header
          onOpenAuth={(mode = 'login') => setAuthMode(mode)}
        />

        <AuthModal
          isOpen={true}
          mode={authMode || 'login'}
          onClose={() => setAuthMode('login')}
          onSwitchMode={(mode) => setAuthMode(mode)}
          onLoginSuccess={handleLoginSuccess}
        />
      </div>
    );
  }

  // AUTHENTICATED / DEMO USER AREA
  return (
    <div className="min-h-screen bg-[#080d16] text-white flex flex-col font-sans">
      <Header
        user={user}
        onOpenAuth={(mode) => setAuthMode(mode)}
        onLogout={handleLogout}
      />

      {view === 'home' ? (
        <main className="flex-1 pb-16">
          <HeroBanner />

          <div className="max-w-xl mx-auto px-4 my-4">
            <HeroBonusCard
              onOpenBonus={() => setView('bonus')}
            />
          </div>

          <SportsSections />
        </main>
      ) : (
        <BonusPage
          onBack={() => setView('home')}
        />
      )}

      <AuthModal
        isOpen={!!authMode}
        mode={authMode}
        onClose={() => setAuthMode(null)}
        onSwitchMode={(mode) => setAuthMode(mode)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
