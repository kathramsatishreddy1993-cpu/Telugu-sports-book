import React from "react";

const ARTWORK_IMAGE = "/games/%20tsb-game-artwork.png";

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
  {
    id: "deal-or-no-deal",
    name: "DEAL OR NO DEAL",
    href: "/games/deal-or-no-deal",
  },
];

export const NEW_GAMES = [];

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
  ACTIVE_GAMES[7],
];

const ARTWORK_REGIONS = {
  aviator: {
    x: 10,
    y: 266,
    width: 372,
    height: 320,
  },
  roulette: {
    x: 393,
    y: 266,
    width: 370,
    height: 320,
  },
  "super-over": {
    x: 774,
    y: 266,
    width: 370,
    height: 320,
  },
  "color-prediction": {
    x: 1155,
    y: 266,
    width: 371,
    height: 320,
  },
  "dragon-tiger": {
    x: 10,
    y: 656,
    width: 372,
    height: 306,
  },
  "andar-bahar": {
    x: 393,
    y: 656,
    width: 370,
    height: 306,
  },
  "lucky-seven": {
    x: 774,
    y: 656,
    width: 370,
    height: 306,
  },
  "deal-or-no-deal": {
    x: 1155,
    y: 656,
    width: 371,
    height: 306,
  },
};

export default function GameArtwork({
  game,
  className = "",
}) {
  const gameId =
    typeof game === "string" ? game : game?.id;

  const region = ARTWORK_REGIONS[gameId];

  const name =
    ACTIVE_GAMES.find(item => item.id === gameId)
      ?.name || "TELUGU SPORTS BOOK";

  if (!region) {
    return (
      <div
        role="img"
        aria-label={name}
        className={`flex h-full w-full items-center justify-center bg-[#080d16] p-2 text-center text-xs font-black text-amber-200 ${className}`}
      >
        {name}
      </div>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`${region.x} ${region.y} ${region.width} ${region.height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`${name} game artwork`}
      className={`block h-full w-full ${className}`}
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <title>{name}</title>

      <image
        href={ARTWORK_IMAGE}
        x="0"
        y="0"
        width="1536"
        height="1024"
        preserveAspectRatio="none"
      />
    </svg>
  );
}
