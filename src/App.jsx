import React, { useState } from 'react';
import Header from './components/Header';
import HeroBanner from './components/HeroBanner';
import HeroBonusCard from './components/HeroBonusCard';
import BonusPage from './components/BonusPage';
import AuthModal from './components/AuthModal';
import SportsSections from './components/SportsSections';

export default function App() {
  const [view, setView] = useState('home');
  const [authMode, setAuthMode] = useState(null);

  return (
    <div className="min-h-screen bg-[#080d16] text-white flex flex-col font-sans">
      <Header onOpenAuth={(mode) => setAuthMode(mode)} />

      {view === 'home' ? (
        <main className="flex-1 pb-16">
          <HeroBanner />

          <div className="max-w-xl mx-auto px-4 my-4">
            <HeroBonusCard onOpenBonus={() => setView('bonus')} />
          </div>

          <SportsSections />
        </main>
      ) : (
        <BonusPage onBack={() => setView('home')} />
      )}

      <AuthModal
        isOpen={!!authMode}
        mode={authMode}
        onClose={() => setAuthMode(null)}
        onSwitchMode={(mode) => setAuthMode(mode)}
      />
    </div>
  );
}
