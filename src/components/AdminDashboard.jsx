import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import AdminPaymentSettings from './AdminPaymentSettings';

const COIN_HISTORY_KEY =
  'telugu_sports_demo_coin_history';

const DEFAULT_WHATSAPP_NUMBER =
  '919346824432';

export default function AdminDashboard({
  admin,
  onLogout,
}) {
  const [activeSection, setActiveSection] =
    useState('Dashboard');

  /* =====================================================
     DEPOSITS - SERVER / POSTGRESQL
  ===================================================== */

  const [depositRequests, setDepositRequests] =
    useState([]);

  const [depositLoading, setDepositLoading] =
    useState(false);

  const [depositError, setDepositError] =
    useState('');

  /* =====================================================
     WITHDRAWALS - SERVER / POSTGRESQL
  ===================================================== */

  const [
    withdrawalRequests,
    setWithdrawalRequests,
  ] = useState([]);

  const [
    withdrawalLoading,
    setWithdrawalLoading,
  ] = useState(false);

  const [
    withdrawalError,
    setWithdrawalError,
  ] = useState('');

  /* =====================================================
     CUSTOMERS
  ===================================================== */

  const [customers, setCustomers] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerLoginId, setCustomerLoginId] =
    useState('');
  const [loginPassword, setLoginPassword] =
    useState('');
  const [
    withdrawalPassword,
    setWithdrawalPassword,
  ] = useState('');

  const [customerLoading, setCustomerLoading] =
    useState(false);

  const [customerMessage, setCustomerMessage] =
    useState('');

  const [customerError, setCustomerError] =
    useState('');

  /* =====================================================
     COIN MANAGEMENT
  ===================================================== */

  const [coinCustomerId, setCoinCustomerId] =
    useState('');

  const [coinAmount, setCoinAmount] = useState('');

  const [coinMessage, setCoinMessage] =
    useState('');

  const [coinHistory, setCoinHistory] =
    useState(() => {
      try {
        const saved =
          localStorage.getItem(COIN_HISTORY_KEY);

        const parsed = saved
          ? JSON.parse(saved)
          : [];

        return Array.isArray(parsed)
          ? parsed
          : [];
      } catch {
        return [];
      }
    });

  /* =====================================================
     WHATSAPP SETTINGS
  ===================================================== */

  const [whatsappNumber, setWhatsappNumber] =
    useState(DEFAULT_WHATSAPP_NUMBER);

  const [whatsappInput, setWhatsappInput] =
    useState(DEFAULT_WHATSAPP_NUMBER);

  const [whatsappLoading, setWhatsappLoading] =
    useState(false);

  const [whatsappMessage, setWhatsappMessage] =
    useState('');

  const [whatsappError, setWhatsappError] =
    useState('');

  /* =====================================================
     SAVE COIN HISTORY
  ===================================================== */

  useEffect(() => {
    try {
      localStorage.setItem(
        COIN_HISTORY_KEY,
        JSON.stringify(coinHistory)
      );
    } catch (error) {
      console.error(error);
    }
  }, [coinHistory]);

  /* =====================================================
     LOAD DEPOSIT REQUESTS FROM SERVER
  ===================================================== */

  const loadDepositRequests = async () => {
    try {
      setDepositLoading(true);
      setDepositError('');

      const response = await fetch(
        '/api/admin/demo-deposits',
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          cache: 'no-store',
        }
      );

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            'Unable to load deposit requests.'
        );
      }

      setDepositRequests(
        Array.isArray(data?.requests)
          ? data.requests
          : []
      );
    } catch (error) {
      console.error(
        'Load Deposit Requests Error:',
        error
      );

      setDepositError(
        error?.message ||
          'Unable to load deposit requests.'
      );
    } finally {
      setDepositLoading(false);
    }
  };

  /* =====================================================
     LOAD WITHDRAWAL REQUESTS FROM SERVER
  ===================================================== */

  const loadWithdrawalRequests = async () => {
    try {
      setWithdrawalLoading(true);
      setWithdrawalError('');

      const response = await fetch(
        '/api/admin/demo-withdrawals',
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          cache: 'no-store',
        }
      );

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            'Unable to load withdrawal requests.'
        );
      }

      setWithdrawalRequests(
        Array.isArray(data?.requests)
          ? data.requests
          : []
      );
    } catch (error) {
      console.error(
        'Load Withdrawal Requests Error:',
        error
      );

      setWithdrawalError(
        error?.message ||
          'Unable to load withdrawal requests.'
      );
    } finally {
      setWithdrawalLoading(false);
    }
  };

  /* =====================================================
     INITIAL SERVER DATA
  ===================================================== */

  useEffect(() => {
    loadDepositRequests();
    loadWithdrawalRequests();
  }, []);

  useEffect(() => {
    if (
      activeSection === 'Dashboard' ||
      activeSection === 'Pending Deposits' ||
      activeSection === 'Transaction History'
    ) {
      loadDepositRequests();
    }

    if (
      activeSection === 'Dashboard' ||
      activeSection === 'Pending Withdrawals' ||
      activeSection === 'Transaction History'
    ) {
      loadWithdrawalRequests();
    }
  }, [activeSection]);

  /* =====================================================
     LOAD CUSTOMERS
  ===================================================== */

  const loadCustomers = async () => {
    try {
      setCustomerLoading(true);
      setCustomerError('');

      const response = await fetch(
        '/api/admin/customers'
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            'Unable to load customers.'
        );
      }

      setCustomers(
        Array.isArray(data?.customers)
          ? data.customers
          : []
      );
    } catch (error) {
      console.error(error);

      setCustomerError(
        error.message ||
          'Unable to load customers.'
      );
    } finally {
      setCustomerLoading(false);
    }
  };

  useEffect(() => {
    if (
      activeSection === 'Customers' ||
      activeSection === 'Coin Management'
    ) {
      loadCustomers();
    }
  }, [activeSection]);

  /* =====================================================
     LOAD WHATSAPP NUMBER
  ===================================================== */

  const loadWhatsAppNumber = async () => {
    try {
      setWhatsappLoading(true);
      setWhatsappError('');
      setWhatsappMessage('');

      const response = await fetch(
        '/api/admin/settings/whatsapp'
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            'Unable to load WhatsApp number.'
        );
      }

      const number = String(
        data?.whatsappNumber ||
          DEFAULT_WHATSAPP_NUMBER
      ).replace(/\D/g, '');

      setWhatsappNumber(number);
      setWhatsappInput(number);
    } catch (error) {
      console.error(
        'Load WhatsApp Settings Error:',
        error
      );

      setWhatsappError(
        error?.message ||
          'Unable to load WhatsApp number.'
      );
    } finally {
      setWhatsappLoading(false);
    }
  };

  useEffect(() => {
    if (
      activeSection === 'WhatsApp Settings'
    ) {
      loadWhatsAppNumber();
    }
  }, [activeSection]);

  const saveWhatsAppNumber = async (event) => {
    event.preventDefault();

    setWhatsappError('');
    setWhatsappMessage('');

    const cleanNumber = String(
      whatsappInput || ''
    ).replace(/\D/g, '');

    if (
      !/^[1-9][0-9]{9,14}$/.test(cleanNumber)
    ) {
      setWhatsappError(
        'Enter a valid WhatsApp number with country code. Example: 919346824432'
      );
      return;
    }

    if (
      !window.confirm(
        `Change the website WhatsApp number to +${cleanNumber}?`
      )
    ) {
      return;
    }

    try {
      setWhatsappLoading(true);

      const response = await fetch(
        '/api/admin/settings/whatsapp',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            whatsappNumber: cleanNumber,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            'Unable to update WhatsApp number.'
        );
      }

      const savedNumber = String(
        data?.whatsappNumber || cleanNumber
      ).replace(/\D/g, '');

      setWhatsappNumber(savedNumber);
      setWhatsappInput(savedNumber);

      setWhatsappMessage(
        `WhatsApp number updated successfully to +${savedNumber}.`
      );
    } catch (error) {
      console.error(
        'Save WhatsApp Settings Error:',
        error
      );

      setWhatsappError(
        error?.message ||
          'Unable to update WhatsApp number.'
      );
    } finally {
      setWhatsappLoading(false);
    }
  };

  /* =====================================================
     CREATE CUSTOMER
  ===================================================== */

  const createCustomer = async (event) => {
    event.preventDefault();

    setCustomerError('');
    setCustomerMessage('');

    const cleanName = customerName.trim();

    const cleanLoginId =
      customerLoginId.trim().toLowerCase();

    if (!cleanName) {
      setCustomerError(
        'Customer Name is required.'
      );
      return;
    }

    if (!cleanLoginId) {
      setCustomerError(
        'Login ID is required.'
      );
      return;
    }

    if (
      !/^[a-z0-9._-]{4,30}$/.test(
        cleanLoginId
      )
    ) {
      setCustomerError(
        'Login ID must be 4-30 characters.'
      );
      return;
    }

    if (loginPassword.length < 6) {
      setCustomerError(
        'Login Password must contain at least 6 characters.'
      );
      return;
    }

    if (withdrawalPassword.length < 6) {
      setCustomerError(
        'Withdrawal Password must contain at least 6 characters.'
      );
      return;
    }

    if (
      loginPassword === withdrawalPassword
    ) {
      setCustomerError(
        'Login Password and Withdrawal Password must be different.'
      );
      return;
    }

    try {
      setCustomerLoading(true);

      const response = await fetch(
        '/api/admin/customers',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            name: cleanName,
            loginId: cleanLoginId,
            temporaryPassword:
              loginPassword,
            temporaryWithdrawalPassword:
              withdrawalPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            'Unable to create customer.'
        );
      }

      setCustomerMessage(
        `Customer ${cleanLoginId} created successfully.`
      );

      setCustomerName('');
      setCustomerLoginId('');
      setLoginPassword('');
      setWithdrawalPassword('');

      await loadCustomers();
    } catch (error) {
      setCustomerError(
        error.message ||
          'Unable to create customer.'
      );
    } finally {
      setCustomerLoading(false);
    }
  };

  /* =====================================================
     RESET LOGIN PASSWORD
  ===================================================== */

  const resetLoginPassword = async (
    customer
  ) => {
    const temporaryPassword =
      window.prompt(
        `Enter NEW temporary Login Password for ${customer.loginId}`
      );

    if (!temporaryPassword) return;

    if (temporaryPassword.length < 6) {
      alert(
        'Temporary Login Password must contain at least 6 characters.'
      );
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/customers/${customer.id}/reset-login-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            temporaryPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            'Unable to reset Login Password.'
        );
      }

      alert(
        'Temporary Login Password reset successfully.'
      );

      await loadCustomers();
    } catch (error) {
      alert(
        error.message ||
          'Unable to reset Login Password.'
      );
    }
  };

  /* =====================================================
     RESET WITHDRAWAL PASSWORD
  ===================================================== */

  const resetWithdrawalPassword = async (
    customer
  ) => {
    const temporaryWithdrawalPassword =
      window.prompt(
        `Enter NEW temporary Withdrawal Password for ${customer.loginId}`
      );

    if (!temporaryWithdrawalPassword) return;

    if (
      temporaryWithdrawalPassword.length < 6
    ) {
      alert(
        'Temporary Withdrawal Password must contain at least 6 characters.'
      );
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/customers/${customer.id}/reset-withdrawal-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            temporaryWithdrawalPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            'Unable to reset Withdrawal Password.'
        );
      }

      alert(
        'Temporary Withdrawal Password reset successfully.'
      );

      await loadCustomers();
    } catch (error) {
      alert(
        error.message ||
          'Unable to reset Withdrawal Password.'
      );
    }
  };

  /* =====================================================
     COUNTS
  ===================================================== */

  const pendingDeposits = useMemo(() => {
    return depositRequests.filter(
      (item) =>
        String(
          item?.status || ''
        ).toUpperCase() === 'PENDING'
    ).length;
  }, [depositRequests]);

  const pendingWithdrawals = useMemo(() => {
    return withdrawalRequests.filter(
      (item) =>
        String(
          item?.status || ''
        ).toUpperCase() === 'PENDING'
    ).length;
  }, [withdrawalRequests]);

  /* =====================================================
     DEPOSIT STATUS - SERVER
  ===================================================== */

  const updateDepositStatus = async (
    requestId,
    nextStatus
  ) => {
    try {
      const response = await fetch(
        `/api/admin/demo-deposits/${encodeURIComponent(
          requestId
        )}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type':
              'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            status: nextStatus,
          }),
        }
      );

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            'Unable to update deposit request.'
        );
      }

      await loadDepositRequests();

      return true;
    } catch (error) {
      console.error(
        'Update Deposit Status Error:',
        error
      );

      alert(
        error?.message ||
          'Unable to update deposit request.'
      );

      return false;
    }
  };

  const approveDeposit = async (
    requestId
  ) => {
    const request = depositRequests.find(
      (item) => item?.id === requestId
    );

    if (!request) {
      alert('Deposit request not found.');
      return;
    }

    if (
      String(
        request.status
      ).toUpperCase() !== 'PENDING'
    ) {
      alert(
        'This request has already been reviewed.'
      );
      return;
    }

    const confirmed = window.confirm(
      `Approve ₹${Number(
        request.amount || 0
      ).toLocaleString(
        'en-IN'
      )} deposit request?`
    );

    if (!confirmed) return;

    const success =
      await updateDepositStatus(
        requestId,
        'APPROVED'
      );

    if (success) {
      alert(
        'Deposit request changed to APPROVED.'
      );
    }
  };

  const rejectDeposit = async (
    requestId
  ) => {
    const request = depositRequests.find(
      (item) => item?.id === requestId
    );

    if (!request) {
      alert('Deposit request not found.');
      return;
    }

    if (
      String(
        request.status
      ).toUpperCase() !== 'PENDING'
    ) {
      alert(
        'This request has already been reviewed.'
      );
      return;
    }

    const confirmed = window.confirm(
      'Reject this deposit request?'
    );

    if (!confirmed) return;

    const success =
      await updateDepositStatus(
        requestId,
        'REJECTED'
      );

    if (success) {
      alert(
        'Deposit request changed to REJECTED.'
      );
    }
  };

  /* =====================================================
     WITHDRAWAL STATUS - SERVER
  ===================================================== */

  const updateWithdrawalStatus = async (
    requestId,
    nextStatus
  ) => {
    try {
      setWithdrawalError('');

      const response = await fetch(
        `/api/admin/demo-withdrawals/${encodeURIComponent(
          requestId
        )}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type':
              'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            status: nextStatus,
          }),
        }
      );

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            'Unable to update withdrawal request.'
        );
      }

      await loadWithdrawalRequests();

      return true;
    } catch (error) {
      console.error(
        'Update Withdrawal Status Error:',
        error
      );

      const message =
        error?.message ||
        'Unable to update withdrawal request.';

      setWithdrawalError(message);
      alert(message);

      return false;
    }
  };

  const approveWithdrawal = async (
    requestId
  ) => {
    const request =
      withdrawalRequests.find(
        (item) => item?.id === requestId
      );

    if (!request) {
      alert(
        'Withdrawal request not found.'
      );
      return;
    }

    if (
      String(
        request.status || ''
      ).toUpperCase() !== 'PENDING'
    ) {
      alert(
        'This withdrawal request has already been reviewed.'
      );
      return;
    }

    const confirmed = window.confirm(
      `Approve ${Number(
        request.amount || 0
      ).toLocaleString(
        'en-IN'
      )} coins withdrawal request?`
    );

    if (!confirmed) return;

    const success =
      await updateWithdrawalStatus(
        requestId,
        'APPROVED'
      );

    if (success) {
      alert(
        'Withdrawal request changed to APPROVED.'
      );
    }
  };

  const rejectWithdrawal = async (
    requestId
  ) => {
    const request =
      withdrawalRequests.find(
        (item) => item?.id === requestId
      );

    if (!request) {
      alert(
        'Withdrawal request not found.'
      );
      return;
    }

    if (
      String(
        request.status || ''
      ).toUpperCase() !== 'PENDING'
    ) {
      alert(
        'This withdrawal request has already been reviewed.'
      );
      return;
    }

    const confirmed = window.confirm(
      `Reject ${Number(
        request.amount || 0
      ).toLocaleString(
        'en-IN'
      )} coins withdrawal request?`
    );

    if (!confirmed) return;

    const success =
      await updateWithdrawalStatus(
        requestId,
        'REJECTED'
      );

    if (success) {
      alert(
        'Withdrawal request changed to REJECTED.'
      );
    }
  };

  /* =====================================================
     COIN MANAGEMENT
  ===================================================== */

  const changeDemoCoins = async (mode) => {
    setCoinMessage('');

    if (!coinCustomerId) {
      setCoinMessage(
        'Select customer first.'
      );
      return;
    }

    const amount = Number(coinAmount);

    if (
      !Number.isInteger(amount) ||
      amount <= 0
    ) {
      setCoinMessage(
        'Enter a valid whole-number Coin amount.'
      );
      return;
    }

    const customer = customers.find(
      (item) =>
        String(item.id) ===
        String(coinCustomerId)
    );

    if (!customer) {
      setCoinMessage(
        'Selected customer was not found.'
      );
      return;
    }

    if (mode !== 'ADD') {
      setCoinMessage(
        'Remove Coins is not available yet.'
      );
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/customers/${customer.id}/add-demo-coins`,
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            amount,
            note:
              'Coins added by Admin',
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            'Unable to add Coins.'
        );
      }

      const nextBalance = Number(
        data?.customer
          ?.demo_coin_balance || 0
      );

      const record = {
        id: Date.now(),
        customerId: customer.id,
        loginId: customer.loginId,
        customerName:
          customer.name ||
          customer.loginId,
        type: 'ADD',
        amount,
        balance: nextBalance,
        date:
          new Date().toLocaleString(
            'en-IN'
          ),
      };

      setCoinHistory((previous) => [
        record,
        ...previous,
      ]);

      setCoinAmount('');

      setCoinMessage(
        `${amount.toLocaleString(
          'en-IN'
        )} Coins added to ${
          customer.name
        }. New balance: ${nextBalance.toLocaleString(
          'en-IN'
        )}`
      );
    } catch (error) {
      console.error(
        'Coin Update Error:',
        error
      );

      setCoinMessage(
        error?.message ||
          'Unable to update Coins.'
      );
    }
  };

  /* =====================================================
     ADMIN BOXES
  ===================================================== */

  const adminBoxes = [
    {
      title: 'Deposit Accounts',
      icon: '🏦',
      section: 'Deposit Accounts',
    },
    {
      title: 'Coin Management',
      icon: '🪙',
      section: 'Coin Management',
    },
    {
      title: 'Customers',
      icon: '👥',
      section: 'Customers',
    },
    {
      title: 'WhatsApp Settings',
      icon: '📱',
      section: 'WhatsApp Settings',
    },
    {
      title: 'API Settings',
      icon: '🔌',
      section: 'API Settings',
    },
    {
      title: 'Transaction History',
      icon: '📒',
      section: 'Transaction History',
    },
    {
      title: 'Admin Settings',
      icon: '⚙️',
      section: 'Admin Settings',
    },
  ];

  if (
    activeSection === 'Deposit Accounts'
  ) {
    return (
      <AdminPaymentSettings
        onBack={() =>
          setActiveSection('Dashboard')
        }
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#061c1a] text-white">
      <header className="sticky top-0 z-50 bg-[#9a5a00] px-4 py-4 shadow-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <p className="text-[9px] font-black tracking-widest text-amber-200">
              TELUGU SPORTS BOOK
            </p>

            <h1 className="mt-1 text-lg font-black">
              🛡️ ADMIN CONTROL PANEL
            </h1>
          </div>

          <div className="text-right">
            <p className="text-[8px] text-amber-100">
              ADMIN ID
            </p>

            <p className="text-[11px] font-black">
              {admin?.username ||
                'admin'}
            </p>
          </div>
        </div>
      </header>

      {activeSection === 'Dashboard' && (
        <main className="mx-auto max-w-5xl px-3 py-5">
          <h2 className="text-xl font-black">
            Admin Dashboard
          </h2>

          {depositError && (
            <MessageBox
              text={depositError}
              error
            />
          )}

          {withdrawalError && (
            <MessageBox
              text={withdrawalError}
              error
            />
          )}

          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                setActiveSection(
                  'Pending Deposits'
                )
              }
              className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-left"
            >
              <span className="text-2xl">
                📥
              </span>

              <p className="mt-2 text-2xl font-black text-green-300">
                {depositLoading
                  ? '...'
                  : pendingDeposits}
              </p>

              <p className="text-[9px] font-black">
                PENDING DEPOSITS
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveSection(
                  'Pending Withdrawals'
                )
              }
              className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-left"
            >
              <span className="text-2xl">
                💸
              </span>

              <p className="mt-2 text-2xl font-black text-red-300">
                {withdrawalLoading
                  ? '...'
                  : pendingWithdrawals}
              </p>

              <p className="text-[9px] font-black">
                PENDING WITHDRAWALS
              </p>
            </button>
          </div>

          <p className="mb-3 mt-6 text-xs font-black text-amber-300">
            ADMIN MANAGEMENT
          </p>

          <div className="grid grid-cols-2 gap-3">
            {adminBoxes.map((item) => (
              <button
                type="button"
                key={item.title}
                onClick={() =>
                  setActiveSection(
                    item.section
                  )
                }
                className="min-h-[130px] rounded-xl border border-[#28655f] bg-[#083d37] p-4 text-left"
              >
                <span className="text-3xl">
                  {item.icon}
                </span>

                <p className="mt-4 text-[11px] font-black">
                  {item.title}
                </p>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="mt-6 h-[46px] w-full rounded-lg bg-red-700 text-xs font-black"
          >
            ADMIN LOGOUT
          </button>
        </main>
      )}

      {activeSection ===
        'Pending Deposits' && (
        <AdminPage
          title="Pending Deposits"
          icon="📥"
          onBack={() =>
            setActiveSection(
              'Dashboard'
            )
          }
        >
          <div className="grid grid-cols-2 gap-2">
            <InfoBox
              label="TOTAL PENDING"
              value={
                depositLoading
                  ? '...'
                  : pendingDeposits
              }
            />

            <button
              type="button"
              disabled={depositLoading}
              onClick={
                loadDepositRequests
              }
              className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 p-3 text-[9px] font-black text-cyan-300 disabled:opacity-50"
            >
              {depositLoading
                ? 'LOADING...'
                : '↻ REFRESH'}
            </button>
          </div>

          {depositError && (
            <MessageBox
              text={depositError}
              error
            />
          )}

          {!depositLoading &&
            pendingDeposits === 0 && (
              <EmptyState text="No pending deposits" />
            )}

          <div className="mt-4 space-y-3">
            {depositRequests
              .filter(
                (item) =>
                  String(
                    item?.status || ''
                  ).toUpperCase() ===
                  'PENDING'
              )
              .map((request) => (
                <div
                  key={request.id}
                  className="rounded-xl border border-[#28655f] bg-[#083d37] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black">
                        {request.customerName ||
                          'Customer'}
                      </p>

                      <p className="mt-1 text-[9px] font-black text-amber-300">
                        {request.loginId ||
                          `ID: ${request.customerId}`}
                      </p>
                    </div>

                    <StatusBadge
                      status={
                        request.status
                      }
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <InfoBox
                      label="AMOUNT"
                      value={`₹${Number(
                        request.amount || 0
                      ).toLocaleString(
                        'en-IN'
                      )}`}
                    />

                    <InfoBox
                      label="REFERENCE / UTR"
                      value={
                        request.referenceNumber ||
                        request.reference ||
                        '—'
                      }
                    />

                    <InfoBox
                      label="METHOD"
                      value={
                        request.paymentMethod ||
                        request.method ||
                        '—'
                      }
                    />

                    <InfoBox
                      label="CUSTOMER ID"
                      value={
                        request.customerId ||
                        '—'
                      }
                    />
                  </div>

                  {request.proofName && (
                    <div className="mt-2">
                      <InfoBox
                        label="PROOF FILE"
                        value={
                          request.proofName
                        }
                      />
                    </div>
                  )}

                  {request.createdAt && (
                    <div className="mt-2">
                      <InfoBox
                        label="REQUEST DATE"
                        value={new Date(
                          request.createdAt
                        ).toLocaleString(
                          'en-IN'
                        )}
                      />
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        approveDeposit(
                          request.id
                        )
                      }
                      className="h-[44px] rounded-lg bg-green-700 text-[10px] font-black"
                    >
                      ✓ APPROVE
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        rejectDeposit(
                          request.id
                        )
                      }
                      className="h-[44px] rounded-lg bg-red-700 text-[10px] font-black"
                    >
                      ✕ REJECT
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </AdminPage>
      )}

      {activeSection ===
        'Pending Withdrawals' && (
        <AdminPage
          title="Pending Withdrawals"
          icon="💸"
          onBack={() =>
            setActiveSection(
              'Dashboard'
            )
          }
        >
          <div className="grid grid-cols-2 gap-2">
            <InfoBox
              label="TOTAL PENDING"
              value={
                withdrawalLoading
                  ? '...'
                  : pendingWithdrawals
              }
            />

            <button
              type="button"
              disabled={
                withdrawalLoading
              }
              onClick={
                loadWithdrawalRequests
              }
              className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 p-3 text-[9px] font-black text-cyan-300 disabled:opacity-50"
            >
              {withdrawalLoading
                ? 'LOADING...'
                : '↻ REFRESH'}
            </button>
          </div>

          {withdrawalError && (
            <MessageBox
              text={withdrawalError}
              error
            />
          )}

          {!withdrawalLoading &&
            pendingWithdrawals === 0 && (
              <EmptyState text="No pending withdrawals" />
            )}

          <div className="mt-4 space-y-3">
            {withdrawalRequests
              .filter(
                (item) =>
                  String(
                    item?.status || ''
                  ).toUpperCase() ===
                  'PENDING'
              )
              .map((request) => (
                <div
                  key={request.id}
                  className="rounded-xl border border-[#28655f] bg-[#083d37] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black">
                        {request.customerName ||
                          'Customer'}
                      </p>

                      <p className="mt-1 text-[9px] font-black text-amber-300">
                        {request.loginId ||
                          `ID: ${request.customerId}`}
                      </p>
                    </div>

                    <StatusBadge
                      status={
                        request.status
                      }
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <InfoBox
                      label="REQUESTED COINS"
                      value={Number(
                        request.amount || 0
                      ).toLocaleString(
                        'en-IN'
                      )}
                    />

                    <InfoBox
                      label="CUSTOMER ID"
                      value={
                        request.customerId ||
                        '—'
                      }
                    />

                    <InfoBox
                      label="ACCOUNT HOLDER"
                      value={
                        request.accountHolderName ||
                        '—'
                      }
                    />

                    <InfoBox
                      label="BANK NAME"
                      value={
                        request.bankName ||
                        '—'
                      }
                    />

                    <InfoBox
                      label="ACCOUNT NUMBER"
                      value={
                        request.accountNumber ||
                        '—'
                      }
                    />

                    <InfoBox
                      label="IFSC CODE"
                      value={
                        request.ifscCode ||
                        '—'
                      }
                    />
                  </div>

                  {request.createdAt && (
                    <div className="mt-2">
                      <InfoBox
                        label="REQUEST DATE"
                        value={new Date(
                          request.createdAt
                        ).toLocaleString(
                          'en-IN'
                        )}
                      />
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        approveWithdrawal(
                          request.id
                        )
                      }
                      className="h-[44px] rounded-lg bg-green-700 text-[10px] font-black"
                    >
                      ✓ APPROVE
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        rejectWithdrawal(
                          request.id
                        )
                      }
                      className="h-[44px] rounded-lg bg-red-700 text-[10px] font-black"
                    >
                      ✕ REJECT
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </AdminPage>
      )}

      {activeSection === 'Customers' && (
        <AdminPage
          title="Customers"
          icon="👥"
          onBack={() =>
            setActiveSection(
              'Dashboard'
            )
          }
        >
          <form
            onSubmit={createCustomer}
            className="rounded-xl border border-amber-500/30 bg-black/10 p-4"
          >
            <p className="text-xs font-black text-amber-300">
              CREATE CUSTOMER ID
            </p>

            <div className="mt-4 space-y-3">
              <CustomerInput
                label="CUSTOMER NAME"
                value={customerName}
                onChange={(e) =>
                  setCustomerName(
                    e.target.value
                  )
                }
              />

              <CustomerInput
                label="LOGIN ID"
                value={customerLoginId}
                onChange={(e) =>
                  setCustomerLoginId(
                    e.target.value
                  )
                }
              />

              <CustomerInput
                label="LOGIN PASSWORD"
                type="password"
                value={loginPassword}
                onChange={(e) =>
                  setLoginPassword(
                    e.target.value
                  )
                }
              />

              <CustomerInput
                label="WITHDRAWAL PASSWORD"
                type="password"
                value={
                  withdrawalPassword
                }
                onChange={(e) =>
                  setWithdrawalPassword(
                    e.target.value
                  )
                }
              />
            </div>

            {customerError && (
              <MessageBox
                text={customerError}
                error
              />
            )}

            {customerMessage && (
              <MessageBox
                text={customerMessage}
              />
            )}

            <button
              type="submit"
              disabled={customerLoading}
              className="mt-4 h-[46px] w-full rounded-lg bg-amber-500 text-[10px] font-black text-black disabled:opacity-50"
            >
              {customerLoading
                ? 'PLEASE WAIT...'
                : 'CREATE CUSTOMER'}
            </button>
          </form>

          <div className="mt-5 space-y-3">
            {customers.length === 0 &&
              !customerLoading && (
                <EmptyState text="No customers found" />
              )}

            {customers.map(
              (customer) => (
                <div
                  key={customer.id}
                  className="rounded-xl border border-[#28655f] bg-[#083d37] p-4"
                >
                  <div className="flex justify-between">
                    <div>
                      <p className="text-sm font-black">
                        {customer.name}
                      </p>

                      <p className="mt-1 text-[9px] text-amber-300">
                        {customer.loginId}
                      </p>
                    </div>

                    <StatusBadge
                      status={
                        customer.status
                      }
                    />
                  </div>

                  <div className="mt-3 space-y-2">
                    <InfoBox
                      label="LOGIN PASSWORD"
                      value={
                        customer.mustChangePassword
                          ? 'CHANGE REQUIRED'
                          : 'SET'
                      }
                    />

                    <InfoBox
                      label="WITHDRAWAL PASSWORD"
                      value={
                        !customer.withdrawalPasswordConfigured
                          ? 'NOT CONFIGURED'
                          : customer.mustChangeWithdrawalPassword
                          ? 'CHANGE REQUIRED'
                          : 'SET'
                      }
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        resetLoginPassword(
                          customer
                        )
                      }
                      className="min-h-[42px] rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 text-[8px] font-black text-amber-300"
                    >
                      RESET LOGIN PASSWORD
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        resetWithdrawalPassword(
                          customer
                        )
                      }
                      className="min-h-[42px] rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2 text-[8px] font-black text-cyan-300"
                    >
                      RESET WITHDRAWAL PASSWORD
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </AdminPage>
      )}

      {activeSection ===
        'WhatsApp Settings' && (
        <AdminPage
          title="WhatsApp Settings"
          icon="📱"
          onBack={() =>
            setActiveSection(
              'Dashboard'
            )
          }
        >
          <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4">
            <p className="text-xs font-black text-green-300">
              GLOBAL WHATSAPP CONTACT
            </p>

            <p className="mt-2 text-[9px] leading-5 text-gray-400">
              Change the WhatsApp contact used by the website.
              Customers will receive the current saved number from the server.
            </p>

            <div className="mt-4">
              <InfoBox
                label="CURRENT WHATSAPP NUMBER"
                value={
                  whatsappLoading
                    ? 'Loading...'
                    : `+${
                        whatsappNumber ||
                        DEFAULT_WHATSAPP_NUMBER
                      }`
                }
              />
            </div>

            <form
              onSubmit={
                saveWhatsAppNumber
              }
              className="mt-4"
            >
              <label className="block">
                <span className="text-[8px] font-black text-gray-400">
                  NEW WHATSAPP NUMBER
                </span>

                <input
                  type="tel"
                  inputMode="numeric"
                  value={whatsappInput}
                  disabled={
                    whatsappLoading
                  }
                  onChange={(event) =>
                    setWhatsappInput(
                      event.target.value.replace(
                        /\D/g,
                        ''
                      )
                    )
                  }
                  placeholder="Example: 919346824432"
                  autoComplete="off"
                  className="mt-2 h-[50px] w-full rounded-lg border border-green-500/30 bg-[#061c1a] px-3 text-sm font-bold text-white outline-none focus:border-green-400 disabled:opacity-50"
                />
              </label>

              <p className="mt-2 text-[8px] leading-4 text-gray-500">
                Enter country code + mobile number without spaces.
                Example: 919346824432
              </p>

              {whatsappError && (
                <MessageBox
                  text={whatsappError}
                  error
                />
              )}

              {whatsappMessage && (
                <MessageBox
                  text={whatsappMessage}
                />
              )}

              <button
                type="submit"
                disabled={
                  whatsappLoading
                }
                className="mt-4 h-[48px] w-full rounded-lg bg-[#20c968] text-[10px] font-black text-white disabled:opacity-50"
              >
                {whatsappLoading
                  ? 'PLEASE WAIT...'
                  : 'SAVE WHATSAPP NUMBER'}
              </button>
            </form>
          </div>

          <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-[9px] font-black text-amber-300">
              IMPORTANT
            </p>

            <p className="mt-2 text-[8px] leading-5 text-gray-400">
              Saving here updates the global website contact in the database.
              The customer WhatsApp button must use the public settings API.
            </p>
          </div>
        </AdminPage>
      )}

      {activeSection ===
        'Coin Management' && (
        <AdminPage
          title="Coin Management"
          icon="🪙"
          onBack={() =>
            setActiveSection(
              'Dashboard'
            )
          }
        >
          <div className="rounded-xl border border-[#28655f] bg-[#083d37] p-4">
            <p className="text-xs font-black text-amber-300">
              COIN CONTROL
            </p>

            <label className="mt-4 block text-[8px] font-black text-gray-400">
              CUSTOMER
            </label>

            <select
              value={coinCustomerId}
              onChange={(e) =>
                setCoinCustomerId(
                  e.target.value
                )
              }
              className="mt-2 h-[46px] w-full rounded-lg border border-[#28655f] bg-[#061c1a] px-3 text-xs text-white"
            >
              <option value="">
                Select Customer
              </option>

              {customers.map(
                (customer) => (
                  <option
                    key={customer.id}
                    value={customer.id}
                  >
                    {customer.name} -{' '}
                    {customer.loginId}
                  </option>
                )
              )}
            </select>

            <CustomerInput
              label="COINS"
              type="number"
              value={coinAmount}
              onChange={(e) =>
                setCoinAmount(
                  e.target.value
                )
              }
            />

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  changeDemoCoins('ADD')
                }
                className="h-[46px] rounded-lg bg-green-700 text-[10px] font-black"
              >
                + ADD COINS
              </button>

              <button
                type="button"
                onClick={() =>
                  changeDemoCoins(
                    'REMOVE'
                  )
                }
                className="h-[46px] rounded-lg bg-red-700 text-[10px] font-black"
              >
                − REMOVE COINS
              </button>
            </div>

            {coinMessage && (
              <MessageBox
                text={coinMessage}
              />
            )}
          </div>

          <p className="mt-5 text-[10px] font-black text-amber-300">
            RECENT COIN ACTIVITY
          </p>

          <div className="mt-3 space-y-2">
            {coinHistory.length === 0 ? (
              <EmptyState text="No coin activity yet" />
            ) : (
              coinHistory
                .slice(0, 20)
                .map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-[#28655f] bg-[#083d37] p-3"
                  >
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="text-[9px] font-black">
                          {
                            item.customerName
                          }
                        </p>

                        <p className="mt-1 text-[8px] text-gray-400">
                          {
                            item.customerId
                          }
                        </p>
                      </div>

                      <span
                        className={
                          item.type ===
                          'ADD'
                            ? 'text-green-300'
                            : 'text-red-300'
                        }
                      >
                        {item.type ===
                        'ADD'
                          ? '+'
                          : '-'}
                        {Number(
                          item.amount
                        ).toLocaleString(
                          'en-IN'
                        )}
                      </span>
                    </div>

                    <p className="mt-2 text-[7px] text-gray-500">
                      {item.date}
                    </p>
                  </div>
                ))
            )}
          </div>
        </AdminPage>
      )}

      {activeSection ===
        'Transaction History' && (
        <AdminPage
          title="Transaction History"
          icon="📒"
          onBack={() =>
            setActiveSection(
              'Dashboard'
            )
          }
        >
          <div className="grid grid-cols-2 gap-2">
            <InfoBox
              label="DEPOSITS"
              value={
                depositLoading
                  ? '...'
                  : depositRequests.length
              }
            />

            <InfoBox
              label="WITHDRAWALS"
              value={
                withdrawalLoading
                  ? '...'
                  : withdrawalRequests.length
              }
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={depositLoading}
              onClick={
                loadDepositRequests
              }
              className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-[8px] font-black text-green-300 disabled:opacity-50"
            >
              ↻ REFRESH DEPOSITS
            </button>

            <button
              type="button"
              disabled={
                withdrawalLoading
              }
              onClick={
                loadWithdrawalRequests
              }
              className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-[8px] font-black text-red-300 disabled:opacity-50"
            >
              ↻ REFRESH WITHDRAWALS
            </button>
          </div>

          <p className="mt-5 text-[10px] font-black text-amber-300">
            DEPOSIT HISTORY
          </p>

          {depositError && (
            <MessageBox
              text={depositError}
              error
            />
          )}

          <div className="mt-3 space-y-2">
            {!depositLoading &&
            depositRequests.length === 0 ? (
              <EmptyState text="No deposit history" />
            ) : (
              depositRequests.map(
                (item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-[#28655f] bg-[#083d37] p-3"
                  >
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="text-[9px] font-black">
                          ₹
                          {Number(
                            item.amount || 0
                          ).toLocaleString(
                            'en-IN'
                          )}
                        </p>

                        <p className="mt-1 text-[8px] text-gray-400">
                          {item.customerName ||
                            'Customer'}
                        </p>

                        <p className="mt-1 text-[8px] text-amber-300">
                          {item.loginId ||
                            item.customerId ||
                            '—'}
                        </p>
                      </div>

                      <StatusBadge
                        status={
                          item.status
                        }
                      />
                    </div>

                    <p className="mt-2 break-all text-[8px] text-gray-500">
                      UTR:{' '}
                      {item.referenceNumber ||
                        item.reference ||
                        '—'}
                    </p>

                    {item.createdAt && (
                      <p className="mt-1 text-[7px] text-gray-500">
                        {new Date(
                          item.createdAt
                        ).toLocaleString(
                          'en-IN'
                        )}
                      </p>
                    )}
                  </div>
                )
              )
            )}
          </div>

          <p className="mt-6 text-[10px] font-black text-amber-300">
            WITHDRAWAL HISTORY
          </p>

          {withdrawalError && (
            <MessageBox
              text={withdrawalError}
              error
            />
          )}

          <div className="mt-3 space-y-2">
            {!withdrawalLoading &&
            withdrawalRequests.length ===
              0 ? (
              <EmptyState text="No withdrawal history" />
            ) : (
              withdrawalRequests.map(
                (item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-[#28655f] bg-[#083d37] p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[9px] font-black">
                          {Number(
                            item.amount || 0
                          ).toLocaleString(
                            'en-IN'
                          )}{' '}
                          COINS
                        </p>

                        <p className="mt-1 text-[8px] text-gray-400">
                          {item.customerName ||
                            'Customer'}
                        </p>

                        <p className="mt-1 text-[8px] text-amber-300">
                          {item.loginId ||
                            item.customerId ||
                            '—'}
                        </p>

                        <p className="mt-2 text-[8px] text-gray-500">
                          {item.bankName ||
                            '—'}
                          {' • '}
                          {item.accountNumber ||
                            '—'}
                        </p>

                        <p className="mt-1 text-[8px] text-gray-500">
                          IFSC:{' '}
                          {item.ifscCode ||
                            '—'}
                        </p>

                        {item.createdAt && (
                          <p className="mt-1 text-[7px] text-gray-500">
                            {new Date(
                              item.createdAt
                            ).toLocaleString(
                              'en-IN'
                            )}
                          </p>
                        )}
                      </div>

                      <StatusBadge
                        status={
                          item.status
                        }
                      />
                    </div>
                  </div>
                )
              )
            )}
          </div>
        </AdminPage>
      )}

      {activeSection ===
        'API Settings' && (
        <AdminPage
          title="API Settings"
          icon="🔌"
          onBack={() =>
            setActiveSection(
              'Dashboard'
            )
          }
        >
          <EmptyState text="API configuration section" />
        </AdminPage>
      )}

      {activeSection ===
        'Admin Settings' && (
        <AdminPage
          title="Admin Settings"
          icon="⚙️"
          onBack={() =>
            setActiveSection(
              'Dashboard'
            )
          }
        >
          <InfoBox
            label="ADMIN ID"
            value={
              admin?.username ||
              'admin'
            }
          />
        </AdminPage>
      )}
    </div>
  );
}

/* =====================================================
   SMALL COMPONENTS
===================================================== */

function AdminPage({
  title,
  icon,
  onBack,
  children,
}) {
  return (
    <main className="mx-auto max-w-5xl px-3 py-4">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 rounded-md border border-amber-500/40 px-3 py-2 text-[9px] font-black text-amber-300"
      >
        ‹ ADMIN DASHBOARD
      </button>

      <section className="rounded-xl border border-[#28655f] bg-[#072d29] p-4">
        <div className="mb-5 flex items-center gap-3">
          <span className="text-3xl">
            {icon}
          </span>

          <div>
            <p className="text-[8px] font-black text-gray-500">
              ADMIN MANAGEMENT
            </p>

            <h2 className="text-lg font-black text-amber-300">
              {title}
            </h2>
          </div>
        </div>

        {children}
      </section>
    </main>
  );
}

function CustomerInput({
  label,
  type = 'text',
  value,
  onChange,
}) {
  return (
    <label className="mt-3 block">
      <span className="text-[8px] font-black text-gray-400">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={onChange}
        autoComplete="off"
        className="mt-2 h-[46px] w-full rounded-lg border border-[#28655f] bg-[#061c1a] px-3 text-xs text-white outline-none"
      />
    </label>
  );
}

function InfoBox({
  label,
  value,
}) {
  return (
    <div className="rounded-lg border border-[#28655f] bg-black/10 p-3">
      <p className="text-[7px] font-black text-gray-500">
        {label}
      </p>

      <p className="mt-1 break-all text-[10px] font-black">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}) {
  const value = String(
    status || 'PENDING'
  ).toUpperCase();

  let style =
    'border-amber-500/30 bg-amber-500/10 text-amber-300';

  if (
    value === 'APPROVED' ||
    value === 'ACTIVE' ||
    value === 'SUCCESS'
  ) {
    style =
      'border-green-500/30 bg-green-500/10 text-green-300';
  }

  if (
    value === 'REJECTED' ||
    value === 'REJECT'
  ) {
    style =
      'border-red-500/30 bg-red-500/10 text-red-300';
  }

  return (
    <span
      className={`rounded border px-2 py-1 text-[7px] font-black ${style}`}
    >
      {value}
    </span>
  );
}

function EmptyState({
  text,
}) {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-[#28655f] px-4 py-8 text-center">
      <p className="text-[10px] text-gray-500">
        {text}
      </p>
    </div>
  );
}

function MessageBox({
  text,
  error = false,
}) {
  return (
    <div
      className={`mt-3 rounded-lg border p-3 text-[9px] font-bold ${
        error
          ? 'border-red-500/40 bg-red-500/10 text-red-300'
          : 'border-green-500/40 bg-green-500/10 text-green-300'
      }`}
    >
      {text}
    </div>
  );
}
