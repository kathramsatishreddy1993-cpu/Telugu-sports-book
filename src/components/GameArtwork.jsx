import React, {
  useEffect,
  useState,
} from "react";

const ARTWORK_IMAGES = [
  "/games/tsb-game-artwork.png",
  "/games/%20tsb-game-artwork.png",
];

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

const ICONS = {
  aviator: "✈️",
  roulette: "🎡",
  "super-over": "🏏",
  "color-prediction": "🔴 🟢",
  "dragon-tiger": "🐉 🐅",
  "andar-bahar": "🂡 🂮",
  "lucky-seven": "7️⃣",
  "deal-or-no-deal": "💼",
};

let artworkPromise;

function loadArtwork() {
  if (artworkPromise) {
    return artworkPromise;
  }

  artworkPromise = new Promise(
    resolve => {
      let index = 0;

      function tryNext() {
        if (
          index >=
          ARTWORK_IMAGES.length
        ) {
          resolve(null);
          return;
        }

        const source =
          ARTWORK_IMAGES[index++];

        const image =
          new Image();

        image.onload = () => {
          if (
            image.naturalWidth > 0 &&
            image.naturalHeight > 0
          ) {
            resolve(source);
          } else {
            tryNext();
          }
        };

        image.onerror =
          tryNext;

        image.src =
          source;
      }

      tryNext();
    },
  );

  return artworkPromise;
}

export default function GameArtwork({
  game,
  className = "",
}) {
  const [source, setSource] =
    useState(null);

  const gameId =
    typeof game === "string"
      ? game
      : game?.id;

  const region =
    ARTWORK_REGIONS[gameId];

  const name =
    ACTIVE_GAMES.find(
      item =>
        item.id === gameId,
    )?.name ||
    (
      typeof game === "object" &&
      game?.name
    ) ||
    "TELUGU SPORTS BOOK";

  useEffect(() => {
    let active = true;

    loadArtwork().then(
      value => {
        if (active) {
          setSource(value);
        }
      },
    );

    return () => {
      active = false;
    };
  }, []);

  if (
    !region ||
    !source
  ) {
    return (
      <div
        role="img"
        aria-label={
          `${name} game artwork`
        }
        className={className}
        style={{
          width: "100%",
          height: "100%",
          minHeight: 40,

          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",

          gap: 7,
          padding: 8,
          overflow: "hidden",
          textAlign: "center",

          background:
            "linear-gradient(" +
            "135deg," +
            "#08b7bc 0%," +
            "#16434b 48%," +
            "#791b3e 100%" +
            ")",

          color: "#fff",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            fontSize:
              "clamp(24px,6vw,54px)",
            lineHeight: 1.2,
          }}
        >
          {ICONS[gameId] || "🎮"}
        </span>

        <span
          style={{
            fontFamily:
              "Arial,sans-serif",

            fontSize:
              "clamp(7px,1.8vw,13px)",

            fontWeight: 900,
            lineHeight: 1.2,
          }}
        >
          {name}
        </span>
      </div>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"

      viewBox={
        `${region.x} ` +
        `${region.y} ` +
        `${region.width} ` +
        `${region.height}`
      }

      preserveAspectRatio="xMidYMid slice"

      role="img"

      aria-label={
        `${name} game artwork`
      }

      className={className}

      style={{
        display: "block",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: "#16434b",
      }}
    >
      <title>
        {name}
      </title>

      <image
        href={source}
        x="0"
        y="0"
        width="1536"
        height="1024"
        preserveAspectRatio="none"

        onError={() =>
          setSource(null)
        }
      />
    </svg>
  );
}
