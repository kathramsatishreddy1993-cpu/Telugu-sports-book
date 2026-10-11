const placeDemoSelection = () => {
  const amount = Number(stake);

  if (!selectedMarket) {
    setMessage('Please select a demo market.');
    return;
  }

  if (!amount || amount <= 0) {
    setMessage('Please enter a valid demo stake.');
    return;
  }

  if (amount > 10000) {
    setMessage(
      'Maximum demo stake is 10,000 demo coins.'
    );
    return;
  }

  const demoBet = {
    id: `demo-${Date.now()}`,
    matchId: currentMatch.id,
    match: currentMatch.teams,
    sport: currentMatch.sport || 'CRICKET',

    market: selectedMarket.market,
    selection: selectedMarket.selection,
    type: selectedMarket.type,
    rate: selectedMarket.rate,

    stake: amount,

    status: 'MATCHED',
    result: 'PENDING',
    profitLoss: 0,

    placedAt: new Date().toISOString(),

    demoOnly: true,
  };

  try {
    const oldBets = JSON.parse(
      localStorage.getItem(
        'telugu_sports_demo_bets'
      ) || '[]'
    );

    const updatedBets = [
      demoBet,
      ...oldBets,
    ];

    localStorage.setItem(
      'telugu_sports_demo_bets',
      JSON.stringify(updatedBets)
    );

    setMessage(
      `DEMO BET PLACED ✓ ${selectedMarket.market} • ${selectedMarket.selection} • ${amount.toLocaleString(
        'en-IN'
      )} demo coins`
    );

    setStake('');

    setTimeout(() => {
      setSelectedMarket(null);
      setMessage('');
    }, 1200);
  } catch (error) {
    console.error(
      'Demo bet save error:',
      error
    );

    setMessage(
      'Demo bet could not be saved. Please try again.'
    );
  }
};
