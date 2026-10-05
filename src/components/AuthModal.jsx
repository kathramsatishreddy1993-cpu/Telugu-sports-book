const handleDemoLogin = () => {
  setError('');
  setMessage('');

  const demoUser = {
    name: 'Demo User',
    identifier: 'demo',
    isAuthenticated: true,
    isDemo: true,
  };

  localStorage.setItem(
    'telugu_sports_auth_user',
    JSON.stringify(demoUser)
  );

  if (onLoginSuccess) {
    onLoginSuccess(demoUser);
  }

  closeModal();
};
<button
  type="submit"
  disabled={loading || (!isLogin && !verified)}
  className="w-full py-2.5 font-bold text-black bg-gradient-to-r from-amber-400 to-amber-500 rounded-lg shadow-md transition text-sm uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
>
  {loading
    ? 'Processing...'
    : isLogin
    ? 'Log In'
    : 'Complete Signup'}
</button>
{isLogin && (
  <>
    <div className="flex items-center gap-3 my-2">
      <div className="flex-1 h-px bg-gray-800" />
      <span className="text-[11px] text-gray-500 font-semibold">
        OR
      </span>
      <div className="flex-1 h-px bg-gray-800" />
    </div>

    <button
      type="button"
      onClick={handleDemoLogin}
      disabled={loading}
      className="w-full py-2.5 font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-md transition text-sm uppercase tracking-wider disabled:opacity-50"
    >
      Login with Demo ID
    </button>
    export default AuthModal;
  </>
)}
