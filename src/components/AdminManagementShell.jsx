import React, { useState } from 'react';
import AdminDashboard from './AdminDashboard';
import AdminControllerAccounts from './AdminControllerAccounts';

// Reuse the complete existing Admin dashboard without modifying its source.
// This wrapper adds account management without rewriting those sections.
export default function AdminManagementShell({ admin, onLogout }) {
  const [showAccounts, setShowAccounts] = useState(false);
  if (showAccounts)
    return (
      <AdminControllerAccounts
        admin={admin}
        onBack={() => setShowAccounts(false)}
        onLogout={onLogout}
      />
    );
  return (
    <>
      <div className="border-b border-cyan-500/20 bg-[#061c1a] px-3 py-3 text-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-bold text-cyan-100">
            Game Controller account management
          </p>
          <button
            type="button"
            onClick={() => setShowAccounts(true)}
            className="rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-[10px] font-black text-cyan-200"
          >
            🔑 GAME CONTROLLER ACCOUNTS
          </button>
        </div>
      </div>
      <AdminDashboard admin={admin} onLogout={onLogout} />
    </>
  );
}
