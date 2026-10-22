import { randomInt } from "node:crypto";

export const COLOR_GAME_NAME = "COLOR PREDICTION";

export const COLOR_MODES = Object.freeze([
  Object.freeze({
    id: "30s",
    label: "30 Sec",
    durationMs: 30000,
    bettingMs: 25000,
    drawMs: 5000,
  }),

  Object.freeze({
    id: "1m",
    label: "1 Min",
    durationMs: 60000,
    bettingMs: 55000,
    drawMs: 5000,
  }),

  Object.freeze({
    id: "3m",
    label: "3 Min",
    durationMs: 180000,
    bettingMs: 175000,
    drawMs: 5000,
  }),

  Object.freeze({
    id: "5m",
    label: "5 Min",
    durationMs: 300000,
    bettingMs: 295000,
    drawMs: 5000,
  }),
]);

export const COLOR_BET_LIMITS = Object.freeze({
  minimum: 100,
  maximum: 25000,
});

export const COLOR_FEE_PERCENT = 2;

export const COLOR_MARKETS = Object.freeze([
  Object.freeze({
    key: "GREEN",
    label: "Green",
    kind: "COLOR",
  }),

  Object.freeze({
    key: "VIOLET",
    label: "Violet",
    kind: "COLOR",
  }),

  Object.freeze({
    key: "RED",
    label: "Red",
    kind: "COLOR",
  }),

  ...Array.from({ length: 10 }, (_, number) =>
    Object.freeze({
      key: `NUMBER_${number}`,
      label: String(number),
      kind: "NUMBER",
      number,
    }),
  ),

  Object.freeze({
    key: "BIG",
    label: "Big",
    kind: "SIZE",
  }),

  Object.freeze({
    key: "SMALL",
    label: "Small",
    kind: "SIZE",
  }),
]);

export function colorModeFor(modeId) {
  return COLOR_MODES.find(mode => mode.id === modeId) || null;
}

export function colorMarketFor(key) {
  return COLOR_MARKETS.find(market => market.key === key) || null;
}

export function validColorStake(amount) {
  return (
    Number.isSafeInteger(amount) &&
    amount >= COLOR_BET_LIMITS.minimum &&
    amount <= COLOR_BET_LIMITS.maximum
  );
}

function assertNumber(number) {
  if (
    !Number.isInteger(number) ||
    number < 0 ||
    number > 9
  ) {
    throw new Error("Result number must be an integer from 0 to 9.");
  }
}

export function colorResultFor(number) {
  assertNumber(number);

  let colors;

  if (number === 0) {
    colors = ["RED", "VIOLET"];
  } else if (number === 5) {
    colors = ["GREEN", "VIOLET"];
  } else if (number % 2 === 1) {
    colors = ["GREEN"];
  } else {
    colors = ["RED"];
  }

  return {
    number,
    colors,
    size: number >= 5 ? "BIG" : "SMALL",
  };
}

export function drawColorResult() {
  return colorResultFor(randomInt(0, 10));
}

/*
  Multipliers apply to the contract amount after the 2% fee.

  Green:
    1,3,7,9 -> 2x
    5       -> 1.5x

  Red:
    2,4,6,8 -> 2x
    0       -> 1.5x

  Violet:
    0,5     -> 2x

  Exact number:
    Match   -> 9x

  Big:
    5-9     -> 2x

  Small:
    0-4     -> 2x
*/

export function colorMultiplierFor(key, number) {
  assertNumber(number);

  if (!colorMarketFor(key)) {
    throw new Error("Invalid Color Prediction market.");
  }

  if (key === "GREEN") {
    if ([1, 3, 7, 9].includes(number)) {
      return 2;
    }

    return number === 5 ? 1.5 : 0;
  }

  if (key === "RED") {
    if ([2, 4, 6, 8].includes(number)) {
      return 2;
    }

    return number === 0 ? 1.5 : 0;
  }

  if (key === "VIOLET") {
    return number === 0 || number === 5 ? 2 : 0;
  }

  if (key === "BIG") {
    return number >= 5 ? 2 : 0;
  }

  if (key === "SMALL") {
    return number <= 4 ? 2 : 0;
  }

  if (key.startsWith("NUMBER_")) {
    const selectedNumber = Number(key.slice("NUMBER_".length));
    return selectedNumber === number ? 9 : 0;
  }

  return 0;
}

export function colorBetReturn(amount, key, number) {
  if (!validColorStake(amount)) {
    throw new Error("Enter 100–25,000 whole demo coins.");
  }

  const multiplier = colorMultiplierFor(key, number);

  /*
    Integer arithmetic avoids floating-point rounding errors.

    contract amount = amount * 98 / 100
    payout          = contract amount * multiplier

    Fractional demo-coin returns round down once, at the end.
  */

  const multiplierTimesTwo = BigInt(
    Math.round(multiplier * 2),
  );

  return Number(
    (
      BigInt(amount) *
      98n *
      multiplierTimesTwo
    ) / 200n,
  );
}

export function colorBetBreakdown(amount, key, number) {
  const payout = colorBetReturn(amount, key, number);

  return {
    stake: amount,
    feePercent: COLOR_FEE_PERCENT,
    fee: amount * 2 / 100,
    contractAmount: amount * 98 / 100,
    multiplier: colorMultiplierFor(key, number),
    payout,
    profit: payout - amount,
  };
}

export function colorRoundWindow(modeId, nowMs = Date.now()) {
  const mode = colorModeFor(modeId);

  if (!mode) {
    throw new Error("Invalid Color Prediction time mode.");
  }

  if (!Number.isSafeInteger(nowMs) || nowMs < 0) {
    throw new Error("Invalid server time.");
  }

  const index = Math.floor(nowMs / mode.durationMs);
  const opensAt = index * mode.durationMs;
  const closesAt = opensAt + mode.bettingMs;
  const endsAt = opensAt + mode.durationMs;

  return {
    mode: mode.id,
    period: `${mode.id}-${index}`,
    opensAt,
    closesAt,
    endsAt,
    phase: nowMs < closesAt ? "BETTING" : "DRAWING",
  };
}

export const COLOR_RULES_TEXT = [
  "Results are drawn randomly from the numbers 0 to 9.",
  "Each number has an equal chance. Results may repeat.",
  "Each time mode runs its own shared rounds.",
  "A 2% service fee is deducted from the stake.",
  "Payout multipliers apply to the remaining 98% contract amount.",
  "Green: 1, 3, 7, 9 return 2x; 5 returns 1.5x.",
  "Red: 2, 4, 6, 8 return 2x; 0 returns 1.5x.",
  "Violet: 0 or 5 returns 2x.",
  "An exact number match returns 9x.",
  "Big: 5 to 9 returns 2x.",
  "Small: 0 to 4 returns 2x.",
  "Returns include the returned stake; losing bets return zero.",
  "Fractional demo-coin returns round down per bet.",
  "Betting closes for the final 5 seconds of each round.",
  "Switching time modes does not move or cancel existing bets.",
].join(" ");
