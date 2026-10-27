export const DEAL_GAME = "DEAL_OR_NO_DEAL";

export const DEAL_GAME_NAME = "DEAL OR NO DEAL";

export const DEAL_RESULT_MODE = "AUTO_RANDOM";

export const DEAL_RESULT_LABEL = "Automatic random demo";

export const DEAL_CASE_COUNT = 9;

export const DEAL_LIMITS = Object.freeze({
  minimum: 100,
  maximum: 25000,
});

export const DEAL_TIMING = Object.freeze({
  bettingMs: 30000,
  revealMs: 5000,
  offerCutoffMs: 10000,
});

export const DEAL_LEVELS = Object.freeze([
  Object.freeze({
    level: 1,
    winningCases: 6,
    multiplierHundredths: 140,
  }),
  Object.freeze({
    level: 2,
    winningCases: 6,
    multiplierHundredths: 200,
  }),
  Object.freeze({
    level: 3,
    winningCases: 5,
    multiplierHundredths: 350,
  }),
  Object.freeze({
    level: 4,
    winningCases: 5,
    multiplierHundredths: 600,
  }),
  Object.freeze({
    level: 5,
    winningCases: 4,
    multiplierHundredths: 1200,
  }),
  Object.freeze({
    level: 6,
    winningCases: 4,
    multiplierHundredths: 2500,
  }),
  Object.freeze({
    level: 7,
    winningCases: 3,
    multiplierHundredths: 7000,
  }),
  Object.freeze({
    level: 8,
    winningCases: 3,
    multiplierHundredths: 20000,
  }),
  Object.freeze({
    level: 9,
    winningCases: 2,
    multiplierHundredths: 80000,
  }),
]);

export const DEAL_MAX_LEVEL = DEAL_LEVELS.length;

export const DEAL_OFFER_LEVELS = Object.freeze([3, 6]);

export function dealLevelFor(level) {
  return (
    DEAL_LEVELS.find(item => item.level === level) ||
    null
  );
}

export function validDealStake(amount) {
  return (
    Number.isSafeInteger(amount) &&
    amount >= DEAL_LIMITS.minimum &&
    amount <= DEAL_LIMITS.maximum
  );
}

export function validDealCase(caseNumber) {
  return (
    Number.isInteger(caseNumber) &&
    caseNumber >= 1 &&
    caseNumber <= DEAL_CASE_COUNT
  );
}

function assertStake(amount) {
  if (!validDealStake(amount)) {
    throw new Error(
      "Enter 100–25,000 whole demo coins.",
    );
  }
}

function assertLevel(level) {
  const definition = dealLevelFor(level);

  if (!definition) {
    throw new Error(
      "Invalid Deal or No Deal level.",
    );
  }

  return definition;
}

export function validateDealWinners(level, winners) {
  const definition = assertLevel(level);

  if (
    !Array.isArray(winners) ||
    winners.length !== definition.winningCases ||
    !winners.every(validDealCase) ||
    new Set(winners).size !== winners.length
  ) {
    throw new Error(
      `Level ${level} requires exactly ${definition.winningCases} different winning cases from 1 to 9.`,
    );
  }

  return [...winners].sort((a, b) => a - b);
}

export function validateDealPlan(plan) {
  if (
    !Array.isArray(plan) ||
    plan.length !== DEAL_MAX_LEVEL
  ) {
    throw new Error(
      "All nine level outcomes must be generated and locked before betting opens.",
    );
  }

  const levels = plan.map(item => {
    if (!item || typeof item !== "object") {
      throw new Error("Invalid level plan.");
    }

    return {
      level: item.level,
      winners: validateDealWinners(
        item.level,
        item.winners,
      ),
    };
  });

  if (
    new Set(levels.map(item => item.level)).size !==
    DEAL_MAX_LEVEL
  ) {
    throw new Error(
      "Each level must appear exactly once.",
    );
  }

  return levels.sort((a, b) => a.level - b.level);
}

export function dealPlanText(plan) {
  return JSON.stringify(validateDealPlan(plan));
}

export function dealCollectAmount(originalStake, level) {
  assertStake(originalStake);

  const definition = assertLevel(level);

  return Number(
    (
      BigInt(originalStake) *
      BigInt(definition.multiplierHundredths)
    ) / 100n,
  );
}

export function dealCaseWon(plan, level, caseNumber) {
  if (!validDealCase(caseNumber)) {
    throw new Error(
      "Choose a case from 1 to 9.",
    );
  }

  const selectedLevel = validateDealPlan(plan).find(
    item => item.level === level,
  );

  if (!selectedLevel) {
    throw new Error(
      "Invalid Deal or No Deal level.",
    );
  }

  return selectedLevel.winners.includes(caseNumber);
}

export function dealLevelResult({
  plan,
  level,
  caseNumber,
  originalStake,
}) {
  assertStake(originalStake);
  assertLevel(level);

  const won = dealCaseWon(
    plan,
    level,
    caseNumber,
  );

  return {
    level,
    caseNumber,
    won,
    collectAmount: won
      ? dealCollectAmount(originalStake, level)
      : 0,
    nextLevel:
      won && level < DEAL_MAX_LEVEL
        ? level + 1
        : null,
    autoCollect:
      won && level === DEAL_MAX_LEVEL,
    finished:
      !won || level === DEAL_MAX_LEVEL,
  };
}

export function dealBankerOffer({
  originalStake,
  completedLevel,
  percent = 100,
}) {
  if (
    !DEAL_OFFER_LEVELS.includes(completedLevel)
  ) {
    throw new Error(
      "Banker's Offer is available after levels 3 and 6.",
    );
  }

  if (
    !Number.isInteger(percent) ||
    percent < 90 ||
    percent > 110
  ) {
    throw new Error(
      "Banker's Offer percentage must be a whole number from 90 to 110.",
    );
  }

  const collectAmount = dealCollectAmount(
    originalStake,
    completedLevel,
  );

  return Number(
    (
      BigInt(collectAmount) *
      BigInt(percent)
    ) / 100n,
  );
}

export function publicDealLevels() {
  return DEAL_LEVELS.map(item => ({
    level: item.level,
    winningCases: item.winningCases,
    totalCases: DEAL_CASE_COUNT,
    multiplier:
      item.multiplierHundredths / 100,
  }));
}

export const DEAL_RULES_TEXT = [
  "Automatic random demo: the server randomly selects the winning cases for each new session.",
  "All nine level outcomes and offer percentages are locked before betting opens.",
  "Controllers cannot publish or change new outcomes.",
  "Winning cases are revealed only after their level finishes.",
  "Choose one of nine cases and confirm your stake during level 1 betting.",
  "The original stake is charged once per game entry.",
  "Continuing does not charge an additional stake.",
  "After a winning level, collect or risk the current winnings to continue.",
  "Losing a level ends the entry with zero return.",
  "Collect values use the original stake and include the stake.",
  "Collect values are not added together across levels.",
  "Banker's Offers are available after levels 3 and 6.",
  "Offer percentages are randomly selected from 90 to 110 and locked before betting opens.",
  "Accepting DEAL collects the displayed offer and ends the entry.",
  "NO DEAL does not automatically continue: choose a case and confirm CONTINUE during the next betting window.",
  "If no offer choice is made before the offer deadline, NO DEAL applies.",
  "If you do not confirm continuation before the next betting window closes, current winnings are automatically collected.",
  "You must win all nine levels to receive 800x the original stake; waiting alone does not award 800x.",
  "Winning level 9 automatically collects 800x the original stake.",
  "Each session has shared winning cases for all customers.",
  "A new random session starts automatically after the previous session finishes.",
  "Fractional demo-coin returns round down.",
  "Demo coins only.",
].join(" ");
