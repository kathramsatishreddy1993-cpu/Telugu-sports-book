import React, { useState } from 'react';
import { 
  Menu, X, ArrowLeft, Eye, EyeOff, Gift, Users, 
  RefreshCcw, MessageCircle, ChevronDown, Trophy, 
  Gamepad2, Club, ShieldAlert, Smartphone, Sparkles, 
  Share2, CheckCircle2, Zap, Award, Flame, Search,
  Coins, ArrowDownRight, Check, Lock, LogOut
} from 'lucide-react';

const AUTH_KEY = 'telugu_sports_auth_user';
const ADMIN_AUTH_KEY = 'telugu_sports_demo_admin';
const WALLET_KEY = 'telugu_sports_wallet_balance';

const customStyles = `
  @keyframes rainbow-glow {
    0% { color: #ff3366; text-shadow: 0 0 12px rgba(255,51,102,0.8), 0 0 25px rgba(255,51,102,0.5); }
    20% { color: #ffbe0b; text-shadow: 0 0 12px rgba(255,190,11,0.8), 0 0 25px rgba(255,190,11,0.5); }
    40% { color: #00f5d4; text-shadow: 0 0 12px rgba(0,245,212,0.8), 0 0 25px rgba(0,245,212,0.5); }
    60% { color: #00bbf9; text-shadow: 0 0 12px rgba(0,187,249,0.8), 0 0 25px rgba(0,187,249,0.5); }
    80% { color: #9b5de5; text-shadow: 0 0 12px rgba(155,93,229,0.8), 0 0 25px rgba(155,93,229,0.5); }
    100% { color: #ff3366; text-shadow: 0 0 12px rgba(255,51,102,0.8), 0 0 25px rgba(255,51,102,0.5); }
  }
  
  @keyframes text-blink {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.85; transform: scale(1.02); }
  }

  .animate-rainbow-glow {
    animation: rainbow-glow 3.5s linear infinite, text-blink 1.8s ease-in-out infinite;
    display: inline-block;
  }

  .modal-backdrop {
    background: rgba(5, 10, 20, 0.85);
    backdrop-filter: blur(6px);
  }
`;

export default function App() {
  const [view, setView] = useState('home'); // 'home' | 'match' | 'bonus'
  const [authMode, setAuthMode] = useState(null); // 'login' | 'signup' | null
  const [activeBetModal, setActiveBetModal] = useState(false);
  const [activeTab, setActiveTab] = useState('odds'); // 'odds' | 'matched'
  const [showPassword, setShowPassword] = useState(false);

  const [walletBalance, setWalletBalance] = useState(() => {
    try {
      const savedBalance = localStorage.getItem(WALLET_KEY);
      return savedBalance !== null ? Number(savedBalance) : 46000;
    } catch (error) {
      console.error('Unable to restore wallet balance:', error);
      return 46000;
    }
  });

  const handleUpdateWallet = (newBalance) => {
    setWalletBalance(newBalance);
    try {
      localStorage.setItem(WALLET_KEY, newBalance.toString());
    } catch (error) {
      console.error('Unable to save wallet balance:', error);
    }
  };

  const [matchedBets, setMatchedBets] = useState([
    {
      id: 1,
      market: '6 Overs Runs',
      match: 'India vs Australia',
      selection: 'YES',
      rate: 49,
      stake: 500,
      timestamp: '17/10/2026, 8:39:51 am',
      status: 'PENDING'
    },
    {
      id: 2,
      market: '6 Overs Runs',
      match: 'India vs Australia',
      selection: 'YES',
      rate: 49,
      stake: 200,
      timestamp: '17/10/2026, 8:06:06 am',
      status: 'PENDING'
    },
    {
      id: 3,
      market: '6 Overs Runs',
      match: 'India vs Australia',
      selection: 'YES',
      rate: 49,
      stake: 100,
      timestamp: '17/10/2026, 8:05:53 am',
      status: 'PENDING'
    }
  ]);

  const [selectedBet, setSelectedBet] = useState(null);
  const [betStake, setBetStake] = useState('500');
  const [formError, setFormError] = useState('');

  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem(AUTH_KEY);
      if (!savedUser) return null;
      const parsedUser = JSON.parse(savedUser);
      return parsedUser?.isAuthenticated ? parsedUser : null;
    } catch (error) {
      return null;
    }
  });

  const saveCustomerSession = (customer) => {
    try {
      localStorage.setItem(AUTH_KEY, JSON.stringify(customer));
    } catch (error) {
      console.error('Unable to save customer session:', error);
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem(AUTH_KEY);
    } catch (error) {
      console.error('Unable to logout:', error);
    }
    setUser(null);
    setAuthMode(null);
    setView('home');
  };

  const handleOpenBetModal = (marketName, selection, rate) => {
    if (!user) {
      setAuthMode('login');
      return;
    }
    setSelectedBet({ market: marketName, selection, rate });
    setBetStake('500');
    setFormError('');
    setActiveBetModal(true);
  };

  const handlePlaceBet = () => {
    const stakeAmount = Number(betStake);

    if (isNaN(stakeAmount) || stakeAmount <= 0) {
      setFormError('దయచేసి సరైన స్టేక్ మొత్తం ఎంటర్ చేయండి.');
      return;
    }

    if (stakeAmount > walletBalance) {
      setFormError('మీ వాలెట్‌లో తగినంత బ్యాలెన్స్ లేదు!');
      return;
    }

    // Deduct stake directly from current wallet state
    const newBalance = walletBalance - stakeAmount;
    handleUpdateWallet(newBalance);

    const now = new Date();
    const formattedDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}`;

    const newBet = {
      id: Date.now(),
      market: selectedBet.market,
      match: 'India vs Australia',
      selection: selectedBet.selection,
      rate: selectedBet.rate,
      stake: stakeAmount,
      timestamp: formattedDate,
      status: 'PENDING'
    };

    setMatchedBets([newBet, ...matchedBets]);
    setActiveBetModal(false);
    setActiveTab('matched');
  };

  const Header = () => (
    <header className="fixed top-0 left-0 right-0 h-16 bg-slate-950/95 border-b border-teal-900/60 z-40 backdrop-blur-md flex items-center justify-between px-3 sm:px-6 shadow-lg">
      <div className="flex items-center space-x-2 sm:space-x-3">
        <button className="text-teal-400 p-2 rounded-lg hover:bg-teal-950/50 focus:outline-none">
          <Menu size={24} />
        </button>
        
        <div 
          onClick={() => setView('home')} 
          className="flex items-center space-x-2 cursor-pointer select-none"
        >
          <div className="w-8 h-8 bg-gradient-to-tr from-teal-600 to-teal-400 rounded-lg flex items-center justify-center text-slate-950 font-black shadow-md">
            <Trophy size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-teal-400 font-black text-base sm:text-xl tracking-wider leading-none">
              TELUGU
            </span>
            <span className="text-slate-200 font-semibold text-[10px] sm:text-xs tracking-[0.2em] leading-tight">
              SPORTS BOOK
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-3">
        <div className="flex items-center space-x-1.5 bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg shadow-inner">
          <div className="w-5 h-5 bg-yellow-400 text-slate-950 rounded-full flex items-center justify-center font-bold text-[11px]">
            ₹
          </div>
          <div className="flex flex-col text-right">
            <span className="text-yellow-400 font-black text-xs sm:text-sm leading-none">
              {walletBalance.toLocaleString('en-IN')}
            </span>
            <span className="text-[9px] text-slate-400 font-medium leading-tight">Siri</span>
          </div>
        </div>

        {!user ? (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAuthMode('login')}
              className="bg-teal-600 hover:bg-teal-500 text-slate-950 font-black text-xs px-3 py-1.5 rounded-md shadow-md uppercase"
            >
              Log In
            </button>
            <button
              onClick={() => setAuthMode('signup')}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-3 py-1.5 rounded-md shadow-md uppercase"
            >
              Sign Up
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg"
          >
            <LogOut size={18} />
          </button>
        )}
      </div>
    </header>
  );

  const renderBonusPage = () => (
    <div className="min-h-screen bg-slate-950 text-white pt-20 pb-12 px-4 max-w-4xl mx-auto space-y-6">
      <style>{customStyles}</style>
      <div className="flex items-center justify-between border-b border-teal-900/60 pb-4">
        <button
          onClick={() => setView('home')}
          className="flex items-center space-x-2 text-teal-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-teal-800/50 hover:bg-slate-800"
        >
          <ArrowLeft size={18} />
          <span className="text-xs font-bold">Back</span>
        </button>
        <h1 className="text-3xl font-black text-center tracking-widest animate-rainbow-glow">
          BONUS
        </h1>
        <div className="w-16"></div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* WELCOME BONUS */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/40 rounded-xl p-5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none"></div>
          <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-lg flex items-center justify-center mb-4 border border-amber-500/30">
            <Gift size={28} />
          </div>
          <h2 className="text-amber-400 font-extrabold text-lg mb-2">WELCOME BONUS</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Welcome Bonus – Receive a 20% bonus based on the eligible amount added.
          </p>
          <div className="mt-4 pt-4 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
            <p>• Applicable on initial account deposits.</p>
            <p>• Automatically calculated on eligible balance.</p>
          </div>
        </div>

        {/* PROMO CODE BONUS */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-teal-500/40 rounded-xl p-5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/10 rounded-full blur-xl pointer-events-none"></div>
          <div className="w-12 h-12 bg-teal-500/20 text-teal-400 rounded-lg flex items-center justify-center mb-4 border border-teal-500/30">
            <Users size={28} />
          </div>
          <h2 className="text-teal-400 font-extrabold text-lg mb-2">PROMO CODE BONUS</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Promo Code Bonus – Receive a 10% bonus when an eligible referral joins through your referral and the required promo code is entered.
          </p>
          <div className="mt-4 pt-4 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
            <p>• Requires valid referral campaign code.</p>
            <p>• Credited upon referee verification.</p>
          </div>
        </div>

        {/* LOSING BONUS */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-rose-500/40 rounded-xl p-5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-xl pointer-events-none"></div>
          <div className="w-12 h-12 bg-rose-500/20 text-rose-400 rounded-lg flex items-center justify-center mb-4 border border-rose-500/30">
            <RefreshCcw size={28} />
          </div>
          <h2 className="text-rose-400 font-extrabold text-lg mb-2">LOSING BONUS</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Losing Bonus – If an eligible loss reaches ₹1,00,000, a 5% return bonus may be credited according to the applicable bonus rules.
          </p>
          <div className="mt-4 pt-4 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
            <p>• Applies on net accumulated losses.</p>
            <p>• Terms and conditions apply.</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderHomePage = () => (
    <main className="pt-20 pb-16 px-3 sm:px-6 max-w-5xl mx-auto space-y-6">
      <style>{customStyles}</style>

      {/* HERO BANNER */}
      <div 
        onClick={() => setView('match')}
        className="bg-gradient-to-r from-teal-950 via-slate-900 to-slate-950 border border-teal-800/60 rounded-2xl p-4 sm:p-6 shadow-2xl cursor-pointer hover:border-teal-500 transition-all group"
      >
        <div className="flex justify-between items-center mb-2">
          <span className="bg-rose-600 text-white font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
            LIVE MATCH
          </span>
          <span className="text-teal-400 text-xs font-bold flex items-center space-x-1">
            <span>View Match Market</span>
            <ArrowDownRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-white mb-1">INDIA vs AUSTRALIA</h2>
        <p className="text-xs text-slate-400">3rd ODI • Fancy Sessions & Odds Available</p>
      </div>

      {/* MULTI-COLOR ANIMATED BONUS BUTTON */}
      <div className="bg-slate-900/90 border border-amber-500/30 p-4 rounded-xl text-center shadow-lg">
        <button
          onClick={() => setView('bonus')}
          className="w-full py-3 bg-slate-950 border border-amber-400/50 rounded-lg hover:border-amber-400 transition-all shadow-inner"
        >
          <span className="text-2xl font-black animate-rainbow-glow tracking-widest">
            ★ BONUS OFFERS ★
          </span>
        </button>
      </div>

      {/* SPORTS CATEGORIES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { title: 'CRICKET', icon: Trophy, count: '12 Live' },
          { title: 'CASINO', icon: Club, count: '24/7 Tables' },
          { title: 'FOOTBALL', icon: Gamepad2, count: '8 Live' },
          { title: 'TENNIS', icon: Zap, count: '5 Live' },
        ].map((item, idx) => (
          <div
            key={idx}
            onClick={() => setView('match')}
            className="bg-slate-900 border border-slate-800 hover:border-teal-600/60 p-4 rounded-xl text-center cursor-pointer transition-all hover:-translate-y-0.5 shadow-md"
          >
            <item.icon size={28} className="mx-auto text-teal-400 mb-2" />
            <h3 className="font-extrabold text-sm text-white">{item.title}</h3>
            <span className="text-[10px] text-slate-400">{item.count}</span>
          </div>
        ))}
      </div>
    </main>
  );

  const renderMatchDetails = () => (
    <main className="pt-16 pb-16 min-h-screen bg-[#07251e] text-slate-100 font-sans">
      <div className="bg-[#0b382d] text-white px-3 py-2.5 flex items-center justify-between border-b border-[#144d3f]">
        <button 
          onClick={() => setView('home')}
          className="flex items-center space-x-1.5 bg-[#082b23] border border-[#1a5b4c] text-teal-200 px-3 py-1 rounded-md text-xs font-bold hover:bg-[#0c4235]"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>

        <div className="text-center">
          <h1 className="text-sm sm:text-base font-black tracking-wider text-yellow-400 uppercase leading-tight">
            TELUGU SPORTS BOOK
          </h1>
          <span className="text-[10px] tracking-widest text-teal-300 font-semibold">• DEMO •</span>
        </div>

        <div className="flex items-center space-x-1.5 bg-[#051c17] px-2.5 py-1 rounded-md border border-[#1a5b4c]">
          <div className="w-4 h-4 rounded-full bg-yellow-400 text-slate-950 font-bold text-[10px] flex items-center justify-center">
            ₹
          </div>
          <div className="text-right">
            <span className="text-yellow-400 font-extrabold text-xs block leading-none">
              {walletBalance.toLocaleString('en-IN')}
            </span>
            <span className="text-[8px] text-slate-300 leading-none block">Siri</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 bg-[#804600] text-white text-xs font-bold uppercase tracking-wider text-center cursor-pointer shadow-md">
        <div 
          onClick={() => setActiveTab('odds')}
          className={`py-2.5 border-r border-[#965300] transition-colors ${
            activeTab === 'odds' ? 'bg-[#915000] text-yellow-300 font-extrabold border-b-2 border-yellow-400' : 'opacity-80 hover:opacity-100'
          }`}
        >
          ODDS
        </div>
        <div 
          onClick={() => setActiveTab('matched')}
          className={`py-2.5 transition-colors ${
            activeTab === 'matched' ? 'bg-[#915000] text-yellow-300 font-extrabold border-b-2 border-yellow-400' : 'opacity-80 hover:opacity-100'
          }`}
        >
          MATCHED BET ({matchedBets.length})
        </div>
      </div>

      {activeTab === 'odds' ? (
        <div className="max-w-3xl mx-auto p-2 sm:p-4 space-y-3">
          <div className="bg-[#0d4739] text-white p-2.5 rounded-t border-b-2 border-teal-500 flex justify-between items-center">
            <div>
              <h3 className="font-extrabold text-sm sm:text-base tracking-wide uppercase text-white">FANCY MARKET</h3>
              <p className="text-[10px] text-teal-200">Demo Sessions</p>
            </div>
            <span className="bg-yellow-500 text-slate-950 font-bold text-[10px] px-2 py-0.5 rounded shadow">
              DEMO
            </span>
          </div>

          <div className="bg-slate-100 text-slate-700 px-3 py-1.5 text-[11px] font-bold flex justify-between items-center rounded-b">
            <span>MARKET</span>
            <div className="flex space-x-12 pr-6">
              <span className="text-red-600">NO</span>
              <span className="text-teal-600">YES</span>
            </div>
          </div>

          <div className="bg-white rounded shadow divide-y divide-slate-100 text-xs sm:text-sm">
            {[
              { title: '6 Overs Runs', sub: 'Demo Session', noRate: '48', yesRate: '49' },
              { title: 'Current Over Runs', sub: 'Demo Over Session', noRate: '8', yesRate: '9' },
              { title: 'Next Over Runs', sub: 'Demo Over Session', noRate: '7', yesRate: '8' },
              { title: '25 Runs Wicket', sub: 'Demo Wicket Session', noRate: 'NO', yesRate: 'YES' },
            ].map((market, idx) => (
              <div key={idx} className="p-2.5 flex items-center justify-between hover:bg-slate-50">
                <div>
                  <h4 className="font-extrabold text-slate-900">{market.title}</h4>
                  <p className="text-[10px] text-slate-500">{market.sub}</p>
                </div>

                <div className="flex space-x-1.5">
                  <button 
                    onClick={() => handleOpenBetModal(market.title, 'NO', market.noRate)}
                    className="w-16 sm:w-20 py-2 bg-[#f8b2cd] hover:bg-[#f69dbe] text-slate-900 font-black rounded text-center transition-all shadow-sm"
                  >
                    <span className="block text-xs font-black">{market.noRate}</span>
                    <span className="block text-[8px] font-bold uppercase text-red-700">NO</span>
                  </button>

                  <button 
                    onClick={() => handleOpenBetModal(market.title, 'YES', market.yesRate)}
                    className="w-16 sm:w-20 py-2 bg-[#82c8f8] hover:bg-[#6abbf5] text-slate-900 font-black rounded text-center transition-all shadow-sm"
                  >
                    <span className="block text-xs font-black">{market.yesRate}</span>
                    <span className="block text-[8px] font-bold uppercase text-blue-800">YES</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto p-3 sm:p-4 space-y-4">
          <div className="bg-[#0b382d] text-white p-3 rounded border border-[#144d3f] shadow">
            <h2 className="font-black text-sm uppercase text-yellow-400">MATCHED DEMO BETS</h2>
            <p className="text-xs text-teal-200">India vs Australia</p>
          </div>

          <div className="space-y-3">
            {matchedBets.map((bet) => (
              <div key={bet.id} className="bg-white rounded-lg shadow-md overflow-hidden border border-slate-200 text-slate-900">
                <div className="bg-[#0d4739] text-white px-3 py-1.5 flex justify-between items-center">
                  <span className="font-extrabold text-xs">{bet.market}</span>
                  <span className="bg-[#a3e6cd] text-slate-950 font-black text-[9px] px-2 py-0.5 rounded uppercase">
                    MATCHED
                  </span>
                </div>

                <div className="p-3">
                  <h3 className="font-black text-sm text-slate-900 mb-2">{bet.match}</h3>
                  <div className="grid grid-cols-3 gap-2 text-center mb-2">
                    <div className="bg-slate-100 p-2 rounded">
                      <span className="block text-[9px] font-bold text-slate-500">SELECTION</span>
                      <span className="block font-black text-xs">{bet.selection}</span>
                    </div>
                    <div className="bg-[#e2f0fc] p-2 rounded">
                      <span className="block text-[9px] font-bold text-slate-500">RATE</span>
                      <span className="block font-black text-xs">{bet.rate}</span>
                    </div>
                    <div className="bg-[#fef3cf] p-2 rounded">
                      <span className="block text-[9px] font-bold text-slate-500">STAKE</span>
                      <span className="block font-black text-xs">₹{bet.stake}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                    <span>{bet.timestamp}</span>
                    <span className="text-amber-700 font-extrabold uppercase">{bet.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );

  const renderBetModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 modal-backdrop">
      <div className="relative w-full max-w-sm bg-slate-950 border border-teal-600 rounded-xl shadow-2xl overflow-hidden text-white">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-teal-900">
          <span className="font-extrabold text-sm text-teal-400 uppercase">Place Bet</span>
          <button onClick={() => setActiveBetModal(false)} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase">Selected Market</span>
            <p className="font-extrabold text-sm text-white">{selectedBet?.market}</p>
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-800 text-xs">
              <span className="text-slate-300">Selection: <strong className="text-teal-400">{selectedBet?.selection}</strong></span>
              <span className="text-slate-300">Rate: <strong className="text-yellow-400">{selectedBet?.rate}</strong></span>
            </div>
          </div>

          {formError && (
            <p className="text-xs text-red-400 text-center bg-red-950/60 p-2 rounded border border-red-500/40">
              {formError}
            </p>
          )}

          <div>
            <label className="text-xs text-slate-300 block mb-1">Enter Stake (₹)</label>
            <input 
              type="number"
              value={betStake}
              onChange={(e) => setBetStake(e.target.value)}
              className="w-full bg-white text-slate-900 font-black text-lg p-2.5 rounded text-center focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {['100', '200', '500', '1000'].map(amount => (
              <button 
                key={amount}
                onClick={() => setBetStake(amount)}
                className="bg-slate-900 hover:bg-slate-800 border border-teal-800/60 text-teal-300 font-bold text-xs py-1.5 rounded"
              >
                +{amount}
              </button>
            ))}
          </div>

          <div className="bg-slate-900 p-2.5 rounded text-xs text-slate-300 flex justify-between items-center">
            <span>Available Balance:</span>
            <span className="font-black text-yellow-400">₹{walletBalance.toLocaleString('en-IN')}</span>
          </div>

          <button 
            onClick={handlePlaceBet}
            className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 text-slate-950 font-black text-sm py-3 rounded-lg shadow-lg uppercase"
          >
            Confirm & Deduct ₹{betStake || 0}
          </button>
        </div>
      </div>
    </div>
  );

  const renderAuthModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 modal-backdrop">
      <div className="relative w-full max-w-sm bg-slate-950 border border-teal-600/80 rounded-2xl shadow-2xl overflow-hidden text-white p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Trophy className="text-teal-400" size={20} />
            <span className="font-black text-sm tracking-wider text-teal-400 uppercase">
              {authMode === 'login' ? 'Login' : 'Sign Up'}
            </span>
          </div>
          <button onClick={() => setAuthMode(null)} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {authMode === 'login' ? (
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              const newUser = { isAuthenticated: true, loginId: 'User' };
              saveCustomerSession(newUser);
              setUser(newUser);
              setAuthMode(null);
            }} 
            className="space-y-3"
          >
            <div>
              <label className="text-xs text-slate-400 block mb-1">User ID</label>
              <input 
                type="text" 
                required 
                placeholder="Enter User ID" 
                className="w-full bg-white text-slate-900 p-2.5 rounded font-medium text-sm focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  required 
                  placeholder="Enter Password" 
                  className="w-full bg-white text-slate-900 p-2.5 rounded font-medium text-sm pr-10 focus:outline-none"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-black py-2.5 rounded text-sm uppercase transition-all"
            >
              Login
            </button>

            <div className="text-center pt-2">
              <button 
                type="button"
                onClick={() => setAuthMode('signup')} 
                className="text-xs text-teal-400 underline font-semibold"
              >
                New User? Sign Up
              </button>
            </div>
          </form>
        ) : (
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              const newUser = { isAuthenticated: true, loginId: 'NewUser' };
              saveCustomerSession(newUser);
              setUser(newUser);
              setAuthMode(null);
            }} 
            className="space-y-3"
          >
            <div>
              <label className="text-xs text-slate-400 block mb-1">Mobile Number</label>
              <input 
                type="tel" 
                required 
                placeholder="10-digit Mobile Number" 
                className="w-full bg-white text-slate-900 p-2.5 rounded font-medium text-sm focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Choose Password</label>
              <input 
                type="password" 
                required 
                placeholder="Enter Password" 
                className="w-full bg-white text-slate-900 p-2.5 rounded font-medium text-sm focus:outline-none"
              />
            </div>

            <button 
              type="submit" 
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2.5 rounded text-sm uppercase transition-all"
            >
              Register
            </button>

            <div className="text-center pt-2">
              <button 
                type="button"
                onClick={() => setAuthMode('login')} 
                className="text-xs text-amber-400 underline font-semibold"
              >
                Already have an account? Log In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Header />
      {view === 'home' && renderHomePage()}
      {view === 'match' && renderMatchDetails()}
      {view === 'bonus' && renderBonusPage()}
      {activeBetModal && renderBetModal()}
      {authMode && renderAuthModal()}
    </div>
  );
}
