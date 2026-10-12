const rejectWithdrawal = (requestId) => {
  const request = withdrawalRequests.find(
    (item) => item?.id === requestId
  );

  if (!request) {
    alert('Withdrawal request not found.');
    return;
  }

  if (
    String(request.status || '').toUpperCase() !== 'PENDING'
  ) {
    alert('This withdrawal request has already been reviewed.');
    return;
  }

  const confirmed = window.confirm(
    `Reject ${Number(
      request.amount || 0
    ).toLocaleString('en-IN')} demo coins withdrawal and restore the coins?`
  );

  if (!confirmed) return;

  const refundAmount = Number(
    request.coinsHeld || request.amount || 0
  );

  try {
    const currentBalance = Number(
      localStorage.getItem(BALANCE_KEY) || 0
    );

    const safeBalance = Number.isFinite(currentBalance)
      ? currentBalance
      : 0;

    const shouldRestore =
      request.coinsRestored !== true &&
      Number.isFinite(refundAmount) &&
      refundAmount > 0;

    const nextBalance = shouldRestore
      ? safeBalance + refundAmount
      : safeBalance;

    if (shouldRestore) {
      localStorage.setItem(
        BALANCE_KEY,
        String(nextBalance)
      );

      window.dispatchEvent(
        new CustomEvent('tsb-demo-balance-updated', {
          detail: {
            balance: nextBalance,
          },
        })
      );
    }

    setWithdrawalRequests((previous) =>
      previous.map((item) =>
        item?.id === requestId
          ? {
              ...item,
              status: 'REJECTED',
              coinsRestored: shouldRestore
                ? true
                : item.coinsRestored,
              restoredCoins: shouldRestore
                ? refundAmount
                : item.restoredCoins,
              reviewedAt: new Date().toISOString(),
              reviewedDate: new Date().toLocaleString(
                'en-IN'
              ),
            }
          : item
      )
    );

    alert(
      shouldRestore
        ? `${refundAmount.toLocaleString(
            'en-IN'
          )} demo coins restored to customer balance.`
        : 'Withdrawal request rejected.'
    );
  } catch (error) {
    console.error(
      'Unable to reject withdrawal:',
      error
    );

    alert(
      'Unable to reject withdrawal request.'
    );
  }
};
