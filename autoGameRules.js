import { randomInt } from "node:crypto";

export const GAME_NAMES = {
  "super-over": "SUPER OVER",
  "dragon-tiger": "DRAGON TIGER",
  "andar-bahar": "ANDAR BAHAR",
  "lucky-seven": "LUCKY SEVEN",
};

export const SUITS = ["S", "H", "C", "D"];

export function canonicalOutcome(value) {
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalOutcome).join(",") + "]";
  }

  if (value && typeof value === "object") {
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map(
          key =>
            JSON.stringify(key) +
            ":" +
            canonicalOutcome(value[key]),
        )
        .join(",") +
      "}"
    );
  }

  return JSON.stringify(value);
}

export const isRed = card =>
  card.suit === "H" || card.suit === "D";

export function shuffledDeck(copies = 1) {
  const cards = [];

  for (let copy = 0; copy < copies; copy++) {
    for (const suit of SUITS) {
      for (let rank = 1; rank <= 13; rank++) {
        cards.push({ rank, suit });
      }
    }
  }

  for (let i = cards.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  return cards;
}

const market = (
  key,
  label,
  returns,
  stage = 1,
  lay = false,
) => ({
  key,
  label,
  returns,
  stage,
  lay,
});

function cardMarkets(prefix = "") {
  return [
    market(`${prefix}EVEN`, "Even", 2.1),
    market(`${prefix}ODD`, "Odd", 1.79),
    market(`${prefix}RED`, "Red ♥ ♦", 1.95),
    market(`${prefix}BLACK`, "Black ♠ ♣", 1.95),

    ...SUITS.map(suit =>
      market(
        `${prefix}SUIT:${suit}`,
        {
          S: "Spades ♠",
          H: "Hearts ♥",
          C: "Clubs ♣",
          D: "Diamonds ♦",
        }[suit],
        3.85,
      ),
    ),
  ];
}

export function marketsFor(game) {
  if (game === "super-over") {
    return [
      market("RCB", "RCB", 1.98, 1, true),
      market("CSK", "CHENNAI", 1.98, 1, true),
    ];
  }

  if (game === "dragon-tiger") {
    return [
      market("DRAGON", "Dragon", 1.98, 1, true),
      market("TIGER", "Tiger", 1.98, 1, true),
      ...cardMarkets("D:"),
      ...cardMarkets("T:"),
    ];
  }

  if (game === "lucky-seven") {
    return [
      market("LOW", "Low · A–6", 2),
      market("HIGH", "High · 8–K", 2),
      ...cardMarkets(),

      market("GROUP:1", "A · 2 · 3", 4),
      market("GROUP:2", "4 · 5 · 6", 4),
      market("GROUP:3", "8 · 9 · 10", 4),
      market("GROUP:4", "J · Q · K", 4),

      ...Array.from({ length: 13 }, (_, index) =>
        market(
          `RANK:${index + 1}`,
          [
            "A",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            "10",
            "J",
            "Q",
            "K",
          ][index],
          12,
        ),
      ),
    ];
  }

  if (game === "andar-bahar") {
    return [
      market("A1", "Andar · First Bet", 2),
      market("B1", "Bahar · First Bet", 2),

      market("A2", "Andar · Second Bet", 2, 2),
      market("B2", "Bahar · Second Bet", 2, 2),

      market("SA", "Andar · First-card match", 15),
      market("SB", "Bahar · First-card match", 15),

      market("FIRST3", "First 3", 0),

      market("ODD", "Odd", 1.83),
      market("EVEN", "Even", 2.12),

      ...cardMarkets().filter(item =>
        item.key.startsWith("SUIT:"),
      ),

      ...[
        [1, 5, 3],
        [6, 10, 4],
        [11, 15, 5],
        [16, 20, 6],
        [21, 25, 9],
        [26, 30, 13],
        [31, 35, 20],
        [36, 40, 40],
        [41, 45, 110],
        [46, 49, 800],
      ].map(([first, last, returns]) =>
        market(
          `COUNT:${first}:${last}`,
          `${first}–${last} cards`,
          returns,
        ),
      ),
    ];
  }

  throw new Error("Unknown game.");
}

function innings(values, target = Infinity) {
  let runs = 0;
  let wickets = 0;

  const balls = [];

  for (const value of values) {
    balls.push(value);

    if (value === "W") {
      wickets++;
    } else {
      runs += value;
    }

    if (
      balls.length === 6 ||
      wickets === 2 ||
      runs > target
    ) {
      break;
    }
  }

  return { runs, wickets, balls };
}

export function superOutcome(values) {
  const rcb = innings(values.slice(0, 6));

  const csk = innings(
    values.slice(
      rcb.balls.length,
      rcb.balls.length + 6,
    ),
    rcb.runs,
  );

  return {
    rcb,
    csk,
    winner:
      rcb.runs === csk.runs
        ? "TIE"
        : rcb.runs > csk.runs
          ? "RCB"
          : "CSK",
  };
}

export function dragonWinner(dragon, tiger) {
  if (dragon.rank !== tiger.rank) {
    return dragon.rank > tiger.rank
      ? "DRAGON"
      : "TIGER";
  }

  return SUITS.indexOf(dragon.suit) <
    SUITS.indexOf(tiger.suit)
    ? "DRAGON"
    : "TIGER";
}

export function andarOutcome(deck) {
  const joker = deck[0];

  const firstSide = isRed(joker) ? "A" : "B";

  const draws = [];

  for (let index = 1; index < deck.length; index++) {
    const side =
      index % 2
        ? firstSide
        : firstSide === "A"
          ? "B"
          : "A";

    draws.push({
      ...deck[index],
      side,
    });

    if (deck[index].rank === joker.rank) {
      break;
    }
  }

  return {
    joker,
    firstSide,
    draws,
    winner: draws.at(-1).side,
  };
}

export function createOutcome(game, nextLuckyCard) {
  if (game === "super-over") {
    const values = Array.from(
      { length: 5 },
      () => [1, 2, 3, 4, 6, 0, "W"],
    ).flat();

    for (let i = values.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [values[i], values[j]] = [values[j], values[i]];
    }

    return superOutcome(values);
  }

  if (game === "dragon-tiger") {
    const [dragon, tiger] = shuffledDeck();

    return {
      dragon,
      tiger,
      winner: dragonWinner(dragon, tiger),
    };
  }

  if (game === "andar-bahar") {
    return andarOutcome(shuffledDeck());
  }

  if (game === "lucky-seven") {
    const card = nextLuckyCard;

    return {
      card,
      winner:
        card.rank === 7
          ? "SEVEN"
          : card.rank < 7
            ? "LOW"
            : "HIGH",
    };
  }

  throw new Error("Unknown game.");
}

export function timeline(game, outcome) {
  if (game === "super-over") {
    return [
      ...outcome.rcb.balls.map(
        (value, index, balls) => ({
          at: 7500 * (index + 1) / balls.length,
          team: "RCB",
          value,
        }),
      ),

      ...outcome.csk.balls.map(
        (value, index, balls) => ({
          at:
            7500 +
            7500 * (index + 1) / balls.length,
          team: "CSK",
          value,
        }),
      ),
    ];
  }

  if (game === "dragon-tiger") {
    return [
      {
        at: 1800,
        side: "DRAGON",
        card: outcome.dragon,
      },
      {
        at: 4200,
        side: "TIGER",
        card: outcome.tiger,
      },
    ];
  }

  if (game === "lucky-seven") {
    return [
      {
        at: 2500,
        side: "CARD",
        card: outcome.card,
      },
    ];
  }

  const gap =
    outcome.draws.length > 1 ? 7000 : 0;

  return [
    {
      at: 0,
      side: "JOKER",
      card: outcome.joker,
    },

    ...outcome.draws.map(
      (card, index, cards) => ({
        at:
          index === 0
            ? 1000
            : gap +
              15000 * index / (cards.length - 1),
        side: card.side,
        card,
      }),
    ),
  ];
}

export function duration(game, outcome) {
  if (game === "super-over") return 15000;
  if (game === "dragon-tiger") return 6000;
  if (game === "lucky-seven") return 5000;

  return 22500;
}

export function stageAt(game, outcome, delta) {
  if (delta < 0) return 1;

  if (
    game === "andar-bahar" &&
    outcome.draws.length > 1 &&
    delta >= 2000 &&
    delta < 7000
  ) {
    return 2;
  }

  return 0;
}

function cardWins(key, card) {
  if (key === "RED") {
    return isRed(card);
  }

  if (key === "BLACK") {
    return !isRed(card);
  }

  if (key === "EVEN") {
    return card.rank % 2 === 0;
  }

  if (key === "ODD") {
    return card.rank % 2 === 1;
  }

  if (key.startsWith("SUIT:")) {
    return card.suit === key.slice(5);
  }

  if (key.startsWith("RANK:")) {
    return card.rank === Number(key.slice(5));
  }

  if (key.startsWith("GROUP:")) {
    const groups = [
      [1, 2, 3],
      [4, 5, 6],
      [8, 9, 10],
      [11, 12, 13],
    ];

    return (
      groups[
        Number(key.slice(6)) - 1
      ]?.includes(card.rank) || false
    );
  }

  return false;
}

export function returnRate(game, outcome, key) {
  const selected = marketsFor(game).find(
    item => item.key === key,
  );

  if (!selected) {
    throw new Error("Invalid betting market.");
  }

  if (game === "super-over") {
    return outcome.winner === "TIE"
      ? 1
      : outcome.winner === key
        ? selected.returns
        : 0;
  }

  if (game === "dragon-tiger") {
    if (
      key === "DRAGON" ||
      key === "TIGER"
    ) {
      return outcome.winner === key
        ? selected.returns
        : 0;
    }

    return cardWins(
      key.slice(2),
      key.startsWith("D:")
        ? outcome.dragon
        : outcome.tiger,
    )
      ? selected.returns
      : 0;
  }

  if (game === "lucky-seven") {
    if (key === "LOW" || key === "HIGH") {
      return outcome.card.rank === 7
        ? 0.5
        : outcome.winner === key
          ? selected.returns
          : 0;
    }

    return cardWins(key, outcome.card)
      ? selected.returns
      : 0;
  }

  if (/^[AB][12]$/.test(key)) {
    if (outcome.winner !== key[0]) {
      return 0;
    }

    return key.endsWith("1") &&
      outcome.draws.length <= 2
      ? 1.5
      : 2;
  }

  if (key === "SA" || key === "SB") {
    return outcome.draws.length === 1 &&
      outcome.winner === key[1]
      ? 15
      : 0;
  }

  if (key.startsWith("COUNT:")) {
    const [, first, last] =
      key.split(":").map(Number);

    return outcome.draws.length >= first &&
      outcome.draws.length <= last
      ? selected.returns
      : 0;
  }

  if (key === "FIRST3") {
    if (outcome.draws.length < 2) {
      return 1;
    }

    const cards = [
      outcome.joker,
      ...outcome.draws.slice(0, 2),
    ];

    const ranks = cards
      .map(card => card.rank)
      .sort((a, b) => a - b);

    const straight =
      (
        ranks[0] + 1 === ranks[1] &&
        ranks[1] + 1 === ranks[2]
      ) ||
      ranks.join(",") === "1,12,13";

    const flush = cards.every(
      card => card.suit === cards[0].suit,
    );

    return straight && flush
      ? 121
      : straight
        ? 9
        : flush
          ? 6
          : 0;
  }

  return cardWins(
    key,
    outcome.draws.at(-1),
  )
    ? selected.returns
    : 0;
}

export function betHold(
  selected,
  amount,
  direction,
) {
  return direction === "LAY"
    ? Math.round(
        amount * (selected.returns - 1),
      )
    : amount;
}

export function betReturn(game, outcome, bet) {
  const rate = returnRate(
    game,
    outcome,
    bet.key,
  );

  if (bet.direction === "LAY") {
    if (
      game === "super-over" &&
      outcome.winner === "TIE"
    ) {
      return bet.hold;
    }

    return rate === 0
      ? bet.hold + bet.amount
      : 0;
  }

  return Math.floor(
    bet.amount * rate + 1e-7,
  );
}
