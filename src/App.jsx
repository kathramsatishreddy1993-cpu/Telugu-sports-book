import React, { useState } from 'react';

import Header from './components/Header';
import HeroBanner from './components/HeroBanner';
import HeroBonusCard from './components/HeroBonusCard';
import BonusPage from './components/BonusPage';
import AuthModal from './components/AuthModal';
import SportsSections from './components/SportsSections';

const AUTH_KEY = 'telugu_sports_auth_user';

export default function App() {
  const [view, setView] = useState('home');
  const [authMode, setAuthMode] = useState(null);

  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem(AUTH_KEY);

      if (!savedUser) {
        return null;
      }

      const parsedUser = JSON.parse(savedUser);

      return parsedUser?.isAuthenticated
        ? parsedUser
        : null;
    } catch (error) {
      console.error('Unable to restore login:', error);
      return null;
    }
  });

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    setAuthMode(null);
    setView('home');
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_KEY);
    setUser(null);
    setAuthMode(null);
    setView('home');
  };

  return (
    <div className="min-h-screen bg-[#080d16] text-white flex flex-col font-sans">

      <Header
        onOpenAuth={(mode) => setAuthMode(mode)}
        user={user}
        isAuthenticated={!!user}
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
        onClose={() => setAuthMode(null)}
        onLoginSuccess={handleLoginSuccess}
      />

    </div>
  );
}
