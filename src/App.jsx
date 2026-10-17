import React, { useState, useEffect } from 'react';
import { 
  Menu, X, ArrowLeft, Eye, EyeOff, Gift, Users, 
  RefreshCcw, MessageCircle, ChevronDown, Trophy, 
  Gamepad2, Club, ShieldAlert, Smartphone, Sparkles, 
  Share2, CheckCircle2, Zap, Award, Flame, Search,
  Coins, ArrowDownRight, Check
} from 'lucide-react';

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

  .scrollbar-thin::-webkit-scrollbar {
    width: 6px;
  }
  .scrollbar-thin::-webkit-scrollbar-track {
    background: #0d1322;
  }
  .scrollbar-thin::-webkit-scrollbar-thumb {
    background: #1e293b;
    border-radius: 4px;
  }
`;

export default function App() {
  const [activeModal, setActiveModal] = useState(null); // 'login' | 'signup' | 'bet' | null
  const [currentView, setCurrentView] = useState('match'); // Default to Match view
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Wallet and Bets State (Starting at ₹46,000)
  const [walletBalance, setWalletBalance] = useState(46000);
  const [activeTab, setActiveTab] = useState('odds'); // 'odds' | 'matched'
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

  // Selected Bet State for Slip / Modal
  const [selectedBet, setSelectedBet] = useState(null);
  const [betStake, setBetStake] = useState('500');
  const [formError, setFormError] = useState('');

  const handleOpenBetModal = (marketName, selection, rate) => {
    setSelectedBet({
      market: marketName,
      selection: selection,
      rate: rate
    });
    setBetStake('500');
    setFormError('');
    setActiveModal('bet');
  };

  const handlePlaceBet = () => {
    const stakeAmount = Number(betStake);

    if (isNaN(stakeAmount) || stakeAmount <= 0) {
      setFormError('కనీసం సరియైన స్టేక్ అమౌంట్ నమోదు చేయండి.');
      return;
    }

    if (stakeAmount > walletBalance) {
      setFormError('మీ వాలెట్‌లో తగినంత బ్యాలెన్స్ లేదు!');
      return;
    }

    // CRITICAL FIX: Deduct stake amount directly from wallet state
    setWalletBalance(prevBalance => prevBalance - stakeAmount);

    // Create new matched bet entry
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
    setActiveModal(null);
    setActiveTab('matched'); // Show deduction in MATCHED BET tab
  };

  const Header = () => (
    <header className="fixed top-0 left-0 right-0 h-16 bg-slate-950/95 border-b border-teal-900/60 z-40 backdrop-blur-md flex items-center justify-between px-3 sm:px-6 shadow-lg shadow-teal-950/40">
      <div className="flex items-center space-x-2 sm:space-x-3">
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="text-teal-400 p-2 rounded-lg hover:bg-teal-950/50 focus:outline-none transition-colors"
        >
          <Menu size={24} />
        </button>
        
        <div 
          onClick={() => setCurrentView('home')} 
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
      </div>
    </header>
  );

  const renderMatchDetails = () => (
    <main className="pt-16 pb-16 min-h-screen bg-[#07251e] text-slate-100 font-sans">
      <div className="bg-[#0b382d] text-white px-3 py-2.5 flex items-center justify-between border-b border-[#144d3f]">
        <button 
          onClick={() => setCurrentView('home')}
          className="flex items-center space-x-1.5 bg-[#082b23] border border-[#1a5b4c] text-teal-200 px-3 py-1 rounded-md text-xs font-bold hover:bg-[#0c4235] transition-colors"
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
        /* MATCHED BET VIEW */
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
      <div className="relative w-full max-w-sm bg-slate-950 border border-teal-600 rounded-xl shadow-2xl overflow-hidden my-auto text-white">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-teal-900">
          <span className="font-extrabold text-sm text-teal-400 uppercase">Place Bet</span>
          <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white">
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Header />
      {renderMatchDetails()}
      {activeModal === 'bet' && renderBetModal()}
    </div>
  );
}
