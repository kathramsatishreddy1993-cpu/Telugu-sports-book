import React, { useId } from "react";

export const ACTIVE_GAMES = [
  {
    id: "aviator",
    name: "AVIATOR",
    href: "/games/tsb-flight",
  },
  {
    id: "roulette",
    name: "ROULETTE",
    href: "/games/roulette",
  },
  {
    id: "super-over",
    name: "SUPER OVER",
    href: "/games/super-over",
  },
  {
    id: "dragon-tiger",
    name: "DRAGON TIGER",
    href: "/games/dragon-tiger",
  },
  {
    id: "andar-bahar",
    name: "ANDAR BAHAR",
    href: "/games/andar-bahar",
  },
  {
    id: "lucky-seven",
    name: "LUCKY SEVEN",
    href: "/games/lucky-seven",
  },
  {
    id: "color-prediction",
    name: "COLOR PREDICTION",
    href: "/games/color-prediction",
  },
];

export const NEW_GAMES = [
  {
    id: "deal-or-no-deal",
    name: "DEAL OR NO DEAL",
  },
];

export const FEATURED_GAME_ITEMS = [
  ACTIVE_GAMES[0],
  ACTIVE_GAMES[1],
  ACTIVE_GAMES[2],
  ACTIVE_GAMES[6],
];

export const CARD_GAME_ITEMS = [
  ACTIVE_GAMES[3],
  ACTIVE_GAMES[4],
  ACTIVE_GAMES[5],
  NEW_GAMES[0],
];

const ALL_ARTWORK_GAMES = [
  ...ACTIVE_GAMES,
  ...NEW_GAMES,
];

const order = [
  0, 32, 15, 19, 4, 21, 2, 25, 17,
  34, 6, 27, 13, 36, 11, 30, 8, 23,
  10, 5, 24, 16, 33, 1, 20, 14, 31,
  9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

const red = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18,
  19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export default function GameArtwork({
  game,
  className = "",
}) {
  const uid = useId().replace(/:/g, "");
  const gold = `url(#${uid}gold)`;

  const background = {
    aviator: "#280917",
    roulette: "#11291f",
    "super-over": "#071f3a",
    "dragon-tiger": "#32131c",
    "andar-bahar": "#1a1230",
    "lucky-seven": "#123230",
    "color-prediction": "#21113b",
    "deal-or-no-deal": "#35230a",
  }[game] || "#111827";

  const name =
    ALL_ARTWORK_GAMES.find(item => item.id === game)?.name ||
    "TSB";

  const card = (x, y, rank, suit, rotate = 0) => {
    const color =
      suit === "♥" || suit === "♦"
        ? "#c32836"
        : "#151b25";

    return (
      <g transform={`translate(${x} ${y}) rotate(${rotate} 30 43)`}>
        <rect
          width="60"
          height="86"
          rx="7"
          fill="#fff8df"
          stroke={gold}
          strokeWidth="2"
        />
        <text x="8" y="23" fill={color} fontSize="20" fontWeight="900">
          {rank}
        </text>
        <text x="30" y="63" textAnchor="middle" fill={color} fontSize="35">
          {suit}
        </text>
      </g>
    );
  };

  return (
    <svg
      viewBox="0 0 300 230"
      role="img"
      aria-label={`${name} game artwork`}
      className={`h-full w-full ${className}`}
    >
      <defs>
        <linearGradient id={`${uid}gold`} x2="1" y2="1">
          <stop stopColor="#7e4413" />
          <stop offset=".35" stopColor="#fff0ad" />
          <stop offset=".65" stopColor="#d89a32" />
          <stop offset="1" stopColor="#72400e" />
        </linearGradient>

        <radialGradient id={`${uid}glow`}>
          <stop stopColor={background} />
          <stop offset="1" stopColor="#05090f" />
        </radialGradient>

        <linearGradient id={`${uid}case`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#5b4630" />
          <stop offset=".5" stopColor="#241c14" />
          <stop offset="1" stopColor="#100d0a" />
        </linearGradient>
      </defs>

      <rect width="300" height="230" fill={`url(#${uid}glow)`} />

      <circle
        cx="150" cy="108" r="98"
        fill="none" stroke={gold} opacity=".2"
      />
      <circle
        cx="150" cy="108" r="88"
        fill="none" stroke={gold} opacity=".12"
      />

      {game === "roulette" && (
        <g transform="translate(150 105) scale(1 .88)">
          <circle r="95" fill="#401b10" stroke={gold} strokeWidth="8" />

          {order.map((number, index) => (
            <g key={number} transform={`rotate(${index * 360 / 37})`}>
              <path
                d="M -7.1 -85 A 85 85 0 0 1 7.1 -85 L 4.2 -51 A 51 51 0 0 0 -4.2 -51 Z"
                fill={
                  number === 0
                    ? "#14965c"
                    : red.has(number)
                      ? "#be2433"
                      : "#111822"
                }
                stroke="#ddbc70"
                strokeWidth=".5"
              />
              <text
                x="0" y="-72" textAnchor="middle"
                fill="#fff2c9" fontSize="7"
              >
                {number}
              </text>
              <path
                d="M -4.5 -64 L 4.5 -64 L 3.5 -51 L -3.5 -51 Z"
                fill={
                  number === 0
                    ? "#087545"
                    : red.has(number)
                      ? "#881020"
                      : "#04070b"
                }
              />
            </g>
          ))}

          <circle r="50" fill="#291309" stroke={gold} strokeWidth="3" />
          <circle r="20" fill={gold} />
          <path
            d="M 0 -31 V 24 M -27 -7 H 27"
            stroke={gold}
            strokeWidth="7"
            strokeLinecap="round"
          />
          <circle cx="-39" cy="43" r="4.5" fill="#fff6d8" />
        </g>
      )}

      {game === "aviator" && (
        <g transform="translate(32 37)">
          <path
            d="M 0 111 Q 98 126 229 2"
            fill="none" stroke="#ef5666" strokeWidth="3"
          />
          <g transform="translate(123 28) rotate(-18)">
            <path
              d="M -55 25 L -14 16 L 8 -20 L 22 -21 L 16 11 L 57 14 Q 75 19 57 25 L 14 29 L -6 49 L -20 49 L -15 28 L -55 34 Z"
              fill="#e62b4e" stroke="#ffc4ba" strokeWidth="1.5"
            />
            <path
              d="M -56 27 L -72 28"
              stroke="#ffc955" strokeWidth="5" strokeLinecap="round"
            />
          </g>
          <text x="8" y="56" fill="#ffce65" fontSize="28" fontWeight="900">
            2.00×
          </text>
        </g>
      )}

      {game === "super-over" && (
        <g>
          <path
            d="M 70 158 L 145 48"
            stroke={gold} strokeWidth="21" strokeLinecap="round"
          />
          <path
            d="M 144 49 L 166 15"
            stroke="#edddaa" strokeWidth="9" strokeLinecap="round"
          />
          <circle
            cx="207" cy="84" r="30"
            fill="#c62638" stroke="#ff8b96" strokeWidth="2"
          />
          <path
            d="M 202 57 Q 223 82 203 112"
            fill="none" stroke="#ffe6d3" strokeWidth="2"
          />
          <text
            x="171" y="147" textAnchor="middle"
            fill="#f6d281" fontSize="18" fontWeight="900"
          >
            RCB vs CSK
          </text>
        </g>
      )}

      {game === "dragon-tiger" && (
        <>
          {card(73, 49, "K", "♠", -12)}
          {card(165, 49, "Q", "♥", 12)}
          <text
            x="150" y="163" textAnchor="middle"
            fill={gold} fontSize="20" fontWeight="900"
          >
            DRAGON · TIGER
          </text>
        </>
      )}

      {game === "andar-bahar" && (
        <>
          {card(62, 68, "A", "♥", -12)}
          {card(119, 35, "A", "♠")}
          {card(178, 68, "9", "♦", 12)}
          <text
            x="150" y="175" textAnchor="middle"
            fill={gold} fontSize="16" fontWeight="900"
          >
            ANDAR · BAHAR
          </text>
        </>
      )}

      {game === "lucky-seven" && (
        <>
          {card(72, 59, "6", "♣", -15)}
          {card(167, 59, "8", "♥", 15)}
          <text
            x="150" y="132" textAnchor="middle"
            fill={gold} stroke="#7e4514" strokeWidth="1"
            fontSize="112" fontWeight="900"
          >
            7
          </text>
        </>
      )}

      {game === "color-prediction" && (
        <g>
          <circle cx="92" cy="96" r="44" fill="#ec3756" opacity=".15" />
          <circle cx="208" cy="96" r="44" fill="#22c987" opacity=".15" />
          <circle cx="150" cy="70" r="43" fill="#9b5cff" opacity=".15" />

          <circle
            cx="94" cy="105" r="34"
            fill="#e93252" stroke="#ff9eaf" strokeWidth="2"
          />
          <circle
            cx="150" cy="72" r="34"
            fill="#8950e9" stroke="#d4b5ff" strokeWidth="2"
          />
          <circle
            cx="206" cy="105" r="34"
            fill="#12ae76" stroke="#9af6cb" strokeWidth="2"
          />

          <ellipse
            cx="84" cy="91" rx="13" ry="7"
            fill="#fff" opacity=".3" transform="rotate(-30 84 91)"
          />
          <ellipse
            cx="140" cy="58" rx="13" ry="7"
            fill="#fff" opacity=".3" transform="rotate(-30 140 58)"
          />
          <ellipse
            cx="196" cy="91" rx="13" ry="7"
            fill="#fff" opacity=".3" transform="rotate(-30 196 91)"
          />

          <text
            x="150" y="166" textAnchor="middle"
            fill={gold} fontSize="18" fontWeight="900"
          >
            CHOOSE YOUR COLOR
          </text>
        </g>
      )}

      {game === "deal-or-no-deal" && (
        <g>
          <g opacity=".55">
            <rect
              x="44" y="56" width="88" height="76" rx="8"
              fill={`url(#${uid}case)`} stroke={gold} strokeWidth="2"
              transform="rotate(-12 88 94)"
            />
            <rect
              x="168" y="56" width="88" height="76" rx="8"
              fill={`url(#${uid}case)`} stroke={gold} strokeWidth="2"
              transform="rotate(12 212 94)"
            />
          </g>

          <path
            d="M 128 65 V 49 Q 128 42 135 42 H 165 Q 172 42 172 49 V 65"
            fill="none" stroke={gold} strokeWidth="6"
          />
          <rect
            x="84" y="65" width="132" height="93" rx="10"
            fill={`url(#${uid}case)`} stroke={gold} strokeWidth="3"
          />
          <path d="M 85 95 H 215" stroke={gold} strokeWidth="2" />
          <rect x="108" y="88" width="10" height="17" rx="2" fill={gold} />
          <rect x="182" y="88" width="10" height="17" rx="2" fill={gold} />

          <text
            x="150" y="135" textAnchor="middle"
            fill="#ffe7a3" fontSize="30" fontWeight="900"
          >
            ?
          </text>
          <text
            x="150" y="181" textAnchor="middle"
            fill={gold} fontSize="17" fontWeight="900"
          >
            DEAL OR NO DEAL
          </text>
        </g>
      )}

      <rect
        x="0" y="193" width="300" height="37"
        fill="#030709" opacity=".8"
      />

      <text
        x="150"
        y="217"
        textAnchor="middle"
        fill="#efd99c"
        fontFamily="sans-serif"
        fontSize={game === "color-prediction" ? "13" : "15"}
        fontWeight="900"
        letterSpacing="1.4"
      >
        {name}
      </text>

      <rect
        x="248" y="8" width="43" height="17" rx="5"
        fill="#0c1216" stroke="#d2ad57" strokeWidth=".6"
      />
      <text
        x="269" y="20" textAnchor="middle"
        fill="#f1dfaa" fontSize="9" fontWeight="bold"
      >
        DEMO
      </text>
    </svg>
  );
}
