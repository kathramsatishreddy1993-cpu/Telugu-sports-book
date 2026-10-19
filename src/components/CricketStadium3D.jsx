import React, { useEffect, useRef, useState } from "react";

const KITS = {
  RCB: ["#d71932", "#14213d"],
  CSK: ["#f5d51a", "#18513b"],
  MI: ["#1464b5", "#d6b45f"],
  KKR: ["#50216e", "#c6aa51"],
  SRH: ["#ef741e", "#20252c"],
  RR: ["#dc5394", "#183f76"],
  DC: ["#2867a6", "#b72b3a"],
  PBKS: ["#cf343b", "#c6cbd1"],
  GT: ["#1c304b", "#bfaa77"],
  LSG: ["#279cc9", "#e66f36"],
};

const rgb = (hex) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

const colour = (value) => (Array.isArray(value) ? value : rgb(value));
const add = (a, b) => a.map((v, i) => v + b[i]);
const sub = (a, b) => a.map((v, i) => v - b[i]);
const mul = (a, k) => a.map((v) => v * k);
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);

const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

const norm = (a) => mul(a, 1 / (Math.hypot(...a) || 1));
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const WHITE = "#e8edf0",
  SKIN = "#bd8b68",
  SHOE = "#e8ecec";

const cache = new Map();

function sphereGeometry(half = false) {
  const key = half ? "helmet" : "sphere";
  if (cache.has(key)) return cache.get(key);

  const out = [],
    rings = 8,
    sides = 12;

  const point = (i, j) => {
    const a = (i / rings) * (half ? Math.PI / 2 : Math.PI),
      b = (j / sides) * Math.PI * 2;

    return [
      Math.sin(a) * Math.cos(b),
      Math.cos(a),
      Math.sin(a) * Math.sin(b),
    ];
  };

  for (let i = 0; i < rings; i++)
    for (let j = 0; j < sides; j++) {
      const a = point(i, j),
        b = point(i + 1, j),
        c = point(i + 1, j + 1),
        d = point(i, j + 1);

      for (const p of [a, b, c, a, c, d]) out.push(...p, ...p);
    }

  cache.set(key, out);
  return out;
}

function boxGeometry() {
  if (cache.has("box")) return cache.get("box");

  const out = [];

  const faces = [
    [
      [1, 0, 0],
      [
        [1, -1, -1],
        [1, 1, -1],
        [1, 1, 1],
        [1, -1, 1],
      ],
    ],
    [
      [-1, 0, 0],
      [
        [-1, -1, 1],
        [-1, 1, 1],
        [-1, 1, -1],
        [-1, -1, -1],
      ],
    ],
    [
      [0, 1, 0],
      [
        [-1, 1, -1],
        [-1, 1, 1],
        [1, 1, 1],
        [1, 1, -1],
      ],
    ],
    [
      [0, -1, 0],
      [
        [-1, -1, 1],
        [-1, -1, -1],
        [1, -1, -1],
        [1, -1, 1],
      ],
    ],
    [
      [0, 0, 1],
      [
        [-1, -1, 1],
        [1, -1, 1],
        [1, 1, 1],
        [-1, 1, 1],
      ],
    ],
    [
      [0, 0, -1],
      [
        [1, -1, -1],
        [-1, -1, -1],
        [-1, 1, -1],
        [1, 1, -1],
      ],
    ],
  ];

  for (const [n, p] of faces)
    for (const i of [0, 1, 2, 0, 2, 3]) out.push(...p[i], ...n);

  cache.set("box", out);
  return out;
}

function cylinderGeometry() {
  if (cache.has("cylinder")) return cache.get("cylinder");

  const out = [];

  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2,
      b = ((i + 1) / 12) * Math.PI * 2;

    const na = [Math.cos(a), 0, Math.sin(a)],
      nb = [Math.cos(b), 0, Math.sin(b)];

    const p = [
      [na[0], -1, na[2]],
      [nb[0], -1, nb[2]],
      [nb[0], 1, nb[2]],
      [na[0], 1, na[2]],
    ];

    for (const j of [0, 1, 2, 0, 2, 3])
      out.push(...p[j], ...(j === 0 || j === 3 ? na : nb));

    for (const sign of [-1, 1])
      for (const v of [
        [0, sign, 0],
        [Math.cos(a), sign, Math.sin(a)],
        [Math.cos(b), sign, Math.sin(b)],
      ])
        out.push(...v, 0, sign, 0);
  }

  cache.set("cylinder", out);
  return out;
}

class Mesh {
  constructor() {
    this.vertices = [];
  }

  shape(geometry, position, scale, color, basis = null) {
    const c = colour(color),
      g = geometry;

    const b = basis || [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];

    for (let i = 0; i < g.length; i += 6) {
      const x = g[i] * scale[0],
        y = g[i + 1] * scale[1],
        z = g[i + 2] * scale[2];

      const nx = g[i + 3] / scale[0],
        ny = g[i + 4] / scale[1],
        nz = g[i + 5] / scale[2];

      const ax = b[0][0] * nx + b[1][0] * ny + b[2][0] * nz;
      const ay = b[0][1] * nx + b[1][1] * ny + b[2][1] * nz;
      const az = b[0][2] * nx + b[1][2] * ny + b[2][2] * nz;
      const len = Math.hypot(ax, ay, az) || 1;

      this.vertices.push(
        position[0] + b[0][0] * x + b[1][0] * y + b[2][0] * z,
        position[1] + b[0][1] * x + b[1][1] * y + b[2][1] * z,
        position[2] + b[0][2] * x + b[1][2] * y + b[2][2] * z,
        ax / len,
        ay / len,
        az / len,
        c[0],
        c[1],
        c[2],
      );
    }
  }

  sphere(p, s, c) {
    this.shape(sphereGeometry(), p, s, c);
  }

  box(p, s, c, basis) {
    this.shape(boxGeometry(), p, s, c, basis);
  }

  limb(a, b, r, c) {
    const y = norm(sub(b, a)),
      x = norm(
        cross(Math.abs(y[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0], y),
      ),
      z = cross(x, y);

    this.shape(
      cylinderGeometry(),
      mix(a, b, 0.5),
      [r, Math.hypot(...sub(b, a)) / 2, r],
      c,
      [x, y, z],
    );
  }
}

function human(mesh, origin, kit, role, pose = {}) {
  const yaw = pose.yaw || 0,
    cos = Math.cos(yaw),
    sin = Math.sin(yaw);

  const P = (x, y, z) => [
    origin[0] + x * cos + z * sin,
    origin[1] + y,
    origin[2] - x * sin + z * cos,
  ];

  const C = kit[0],
    T = kit[1],
    trousers = role === "umpire" ? "#28303b" : C;

  const sphere = (p, s, c) => mesh.sphere(P(...p), s, c);
  const limb = (a, b, r, c) => mesh.limb(P(...a), P(...b), r, c);
  const stride = pose.stride || 0;

  // Adult anatomy: torso, shoulders, elbows, knees and hands.
  sphere(
    [0, 1.28, 0],
    [0.245, 0.3, 0.145],
    role === "umpire" ? WHITE : C,
  );

  sphere([0, 1.04, 0], [0.18, 0.15, 0.12], trousers);
  sphere([0, 0.91, 0], [0.205, 0.15, 0.135], trousers);

  limb(
    [-0.2, 1.49, 0],
    [0.2, 1.49, 0],
    0.085,
    role === "umpire" ? WHITE : C,
  );

  limb([-0.11, 1.5, 0.13], [0, 1.41, 0.15], 0.018, T);
  limb([0.11, 1.5, 0.13], [0, 1.41, 0.15], 0.018, T);
  limb([0, 1.52, 0], [0, 1.62, 0], 0.065, SKIN);

  sphere([0, 1.73, 0.008], [0.105, 0.125, 0.105], SKIN);
  sphere([0, 1.66, 0.035], [0.085, 0.05, 0.08], SKIN);
  sphere([-0.116, 1.72, 0.004], [0.023, 0.041, 0.018], SKIN);
  sphere([0.116, 1.72, 0.004], [0.023, 0.041, 0.018], SKIN);
  sphere([0, 1.72, 0.119], [0.025, 0.035, 0.023], SKIN);

  for (const x of [-0.042, 0.042]) {
    sphere([x, 1.75, 0.105], [0.025, 0.01, 0.008], "#ece9e2");
    sphere([x, 1.75, 0.113], [0.01, 0.009, 0.006], "#283336");
    limb(
      [x - 0.025, 1.777, 0.104],
      [x + 0.022, 1.78, 0.104],
      0.006,
      "#302923",
    );
  }

  limb(
    [-0.028, 1.661, 0.106],
    [0.028, 1.661, 0.106],
    0.005,
    "#714f42",
  );

  for (const side of [-1, 1]) {
    const hip = [side * 0.115, 0.9, 0],
      knee = [side * 0.13, 0.51, side * stride],
      ankle = [side * 0.14, 0.12, -side * stride * 0.55];

    limb(hip, knee, 0.095, trousers);
    sphere(knee, [0.086, 0.085, 0.083], trousers);
    limb(knee, ankle, 0.073, trousers);

    sphere(
      [ankle[0], 0.065, ankle[2] + 0.065],
      [0.085, 0.062, 0.16],
      SHOE,
    );

    if (role === "batter") {
      const padTop = add(knee, [0, -0.01, 0.085]),
        padBottom = add(ankle, [0, 0.055, 0.1]);

      limb(padTop, padBottom, 0.088, WHITE);

      for (let line = -1; line <= 1; line++)
        limb(
          add(padTop, [line * 0.043, 0, 0.065]),
          add(padBottom, [line * 0.043, 0, 0.065]),
          0.009,
          "#b8c2c9",
        );

      for (const t of [0.25, 0.63]) {
        const middle = mix(padTop, padBottom, t);

        limb(
          add(middle, [-0.085, 0, 0.01]),
          add(middle, [0.085, 0, 0.01]),
          0.013,
          "#b8bec4",
        );
      }
    }
  }

  let leftElbow = [-0.31, 1.17, 0.02],
    rightElbow = [0.31, 1.17, 0.02],
    leftHand = [-0.27, 0.94, 0.1],
    rightHand = [0.27, 0.94, 0.1];

  if (role === "batter") {
    const swing = pose.swing || 0;

    leftElbow = [-0.23, 1.23, 0.24];
    rightElbow = [0.28, 1.23, 0.22];
    leftHand = [0.15 - swing * 0.42, 1.12 + swing * 0.38, 0.36];
    rightHand = [0.2 - swing * 0.42, 1.16 + swing * 0.38, 0.36];
  } else if (role === "bowler" && pose.delivery) {
    const a = pose.delivery;

    rightElbow = [
      0.27,
      1.49 + Math.sin(a) * 0.25,
      Math.cos(a) * 0.23,
    ];

    rightHand = [
      0.24,
      1.49 + Math.sin(a) * 0.6,
      Math.cos(a) * 0.53,
    ];
  } else if (role === "umpire") {
    if (pose.signal === 6) {
      leftElbow = [-0.29, 1.7, 0];
      leftHand = [-0.3, 2.03, 0];
      rightElbow = [0.29, 1.7, 0];
      rightHand = [0.3, 2.03, 0];
    }

    if (pose.signal === 4) {
      rightElbow = [0.46, 1.44, 0.07];

      rightHand = [
        0.72,
        1.44,
        0.15 + Math.sin(pose.time * 5) * 0.16,
      ];
    }

    if (pose.signal === "W") {
      rightElbow = [0.28, 1.73, 0];
      rightHand = [0.26, 2.04, 0];
    }
  }

  for (const [side, elbow, hand] of [
    [-1, leftElbow, leftHand],
    [1, rightElbow, rightHand],
  ]) {
    const shoulder = [side * 0.24, 1.47, 0],
      sleeve = mix(shoulder, elbow, 0.58);

    limb(
      shoulder,
      sleeve,
      0.078,
      role === "umpire" ? WHITE : C,
    );

    limb(sleeve, elbow, 0.057, SKIN);
    sphere(elbow, [0.055, 0.057, 0.055], SKIN);
    limb(elbow, hand, 0.048, SKIN);

    sphere(
      hand,
      [0.058, 0.074, 0.035],
      role === "batter" ? WHITE : SKIN,
    );

    if (role === "batter")
      for (let finger = -1; finger <= 1; finger++)
        limb(
          add(hand, [finger * 0.027, 0.025, 0.026]),
          add(hand, [finger * 0.027, -0.038, 0.04]),
          0.013,
          WHITE,
        );
  }

  if (role === "batter") {
    mesh.shape(
      sphereGeometry(true),
      P(0, 1.75, 0),
      [0.143, 0.135, 0.143],
      C,
    );

    limb([-0.14, 1.75, 0.02], [0.14, 1.75, 0.02], 0.012, T);

    for (const h of [1.72, 1.67, 1.62])
      limb(
        [-0.115, h, 0.156],
        [0.115, h, 0.156],
        0.006,
        "#8d9b9e",
      );

    for (const x of [-0.1, 0, 0.1])
      limb(
        [x, 1.74, 0.155],
        [x, 1.6, 0.155],
        0.005,
        "#8d9b9e",
      );

    const hand = mix(leftHand, rightHand, 0.5),
      tip = add(hand, [
        -0.06 - (pose.swing || 0) * 0.32,
        -0.55 + (pose.swing || 0) * 0.78,
        0.03,
      ]);

    limb(hand, mix(hand, tip, 0.33), 0.022, "#26342f");

    const a = P(...mix(hand, tip, 0.35)),
      b = P(...tip),
      y = norm(sub(b, a)),
      x = norm(cross([0, 0, 1], y)),
      z = cross(x, y);

    mesh.box(
      mix(a, b, 0.5),
      [0.065, Math.hypot(...sub(b, a)) / 2, 0.021],
      "#d9b87b",
      [x, y, z],
    );
  } else {
    mesh.shape(
      sphereGeometry(true),
      P(0, 1.79, 0),
      [0.126, 0.075, 0.126],
      role === "umpire" ? WHITE : C,
    );

    mesh.box(
      P(0, 1.79, 0.11),
      [role === "umpire" ? 0.18 : 0.115, 0.012, 0.09],
      role === "umpire" ? WHITE : C,
    );
  }

  if (role === "umpire" && pose.signal === "W")
    limb(
      add(rightHand, [0, 0.03, 0]),
      add(rightHand, [0, 0.13, 0]),
      0.012,
      SKIN,
    );
}

function field() {
  const m = new Mesh();

  m.box([0, -0.25, 0], [75, 0.2, 75], "#355f32");

  for (let ring = 0; ring < 8; ring++) {
    const r = 43 - ring * 4.5;

    m.shape(
      cylinderGeometry(),
      [0, -0.04 + ring * 0.002, 0],
      [r, 0.015, r],
      ring % 2 ? "#527f3c" : "#5b8842",
    );
  }

  m.box([0, 0.035, 0], [1.5, 0.035, 11], "#c1ac7d");

  for (const z of [-9, 9]) {
    m.box([0, 0.083, z], [1.8, 0.007, 0.025], WHITE);

    for (const x of [-0.11, 0, 0.11])
      m.limb(
        [x, 0.1, z],
        [x, 0.82, z],
        0.023,
        "#e0dbbd",
      );

    m.limb(
      [-0.14, 0.84, z],
      [0.14, 0.84, z],
      0.015,
      "#dbceac",
    );
  }

  for (let s = 0; s < 72; s++) {
    const a = (s / 72) * Math.PI * 2,
      b = ((s + 1) / 72) * Math.PI * 2;

    m.limb(
      [Math.cos(a) * 42, 0.045, Math.sin(a) * 42],
      [Math.cos(b) * 42, 0.045, Math.sin(b) * 42],
      0.06,
      WHITE,
    );

    const center = [
      Math.cos(a) * 51,
      0,
      Math.sin(a) * 51,
    ];

    const basis = [
      [Math.sin(a), 0, -Math.cos(a)],
      [0, 1, 0],
      [Math.cos(a), 0, Math.sin(a)],
    ];

    for (let row = 0; row < 4; row++) {
      const r = 48 + row * 2.1;

      m.box(
        [Math.cos(a) * r, 1.3 + row * 1.6, Math.sin(a) * r],
        [2.35, 0.65, 1.15],
        row % 2 ? "#83958e" : "#748b85",
        basis,
      );

      if (s % 2 === 0)
        for (let j = -1; j <= 1; j++) {
          const p = [
            Math.cos(a) * r + Math.sin(a) * j * 1.1,
            2.15 + row * 1.6,
            Math.sin(a) * r - Math.cos(a) * j * 1.1,
          ];

          m.sphere(
            p,
            [0.15, 0.18, 0.15],
            ["#ba8e72", "#d8c8ae", "#9c735b"][
              (row + s + j + 3) % 3
            ],
          );

          m.box(
            add(p, [0, -0.28, 0]),
            [0.16, 0.18, 0.1],
            ["#244768", "#e6d7ba", "#b64c50", "#274d48"][
              (row + s + j + 5) % 4
            ],
            basis,
          );
        }
    }

    if (s % 18 === 0) {
      m.limb(
        [center[0], 0, center[2]],
        [center[0], 21, center[2]],
        0.16,
        "#b5bfbb",
      );

      m.box(
        [center[0], 21, center[2]],
        [2.8, 0.8, 0.25],
        "#ede9ca",
        basis,
      );
    }
  }

  return m.vertices;
}

const STATIC_FIELD = field();

let backgroundKey = "",
  backgroundGeometry = null;

export function deliveryFrame(match, now) {
  const start = Date.parse(match.startAt),
    delta = now - start;

  const seq = Math.max(0, Math.floor(delta / 10000));
  const event = match.events.find((e) => e.index === seq);
  const finished = match.phase === "RESULT";

  if (delta >= 0 && seq < 12 && !finished) {
    if (event) {
      const elapsed = (now - start - event.at) / 1000;

      return {
        event,
        active: elapsed >= 0 && elapsed < 2,
        t: clamp(1.75 + elapsed * 4.125, 1.75, 10),
        delivery: false,
      };
    }

    const first = match.scores[0];
    const team =
      first.balls?.length === 6 || first.wickets === 2 ? 1 : 0;

    return {
      event: { team, value: null, index: seq },
      active: true,
      t: clamp((delta % 10000) / 8000, 0, 1) * 1.75,
      delivery: true,
    };
  }

  return {
    event: match.events.at(-1),
    active: false,
    t: 10,
    delivery: false,
  };
}

export function sceneData(match, now) {
  const { event, active, t, delivery } = deliveryFrame(match, now),
    team = event?.team || 0;

  const batting =
    KITS[match.teams[team].split(" ")[0]] || KITS.RCB;

  const bowling =
    KITS[match.teams[1 - team].split(" ")[0]] || KITS.CSK;

  const key = batting.join(":") + bowling.join(":");

  if (backgroundKey !== key) {
    const standing = new Mesh();

    for (const [x, z] of [
      [-14, -8],
      [16, -13],
      [-22, 3],
      [22, 7],
      [-10, 20],
      [10, 26],
      [-28, -19],
      [27, -24],
    ])
      human(standing, [x, 0.05, z], bowling, "fielder", {
        yaw: Math.atan2(-x, -z),
      });

    human(standing, [-1.9, 0.1, 8.6], batting, "batter", {
      yaw: Math.PI * 0.65,
    });

    human(standing, [0, 0.1, -12.4], bowling, "fielder", {});

    backgroundGeometry = new Float32Array(
      STATIC_FIELD.length + standing.vertices.length,
    );

    backgroundGeometry.set(STATIC_FIELD);
    backgroundGeometry.set(
      standing.vertices,
      STATIC_FIELD.length,
    );

    backgroundKey = key;
  }

  const m = new Mesh();

  human(m, [-0.35, 0.1, -8.7], batting, "batter", {
    swing: active
      ? Math.sin(clamp((t - 1.6) / 0.65, 0, 1) * Math.PI)
      : 0,
  });

  human(
    m,
    [0, 0.1, active ? 6.4 - Math.min(t, 1.6) * 3.4 : 5],
    bowling,
    "bowler",
    {
      yaw: Math.PI,
      stride:
        active && t < 1.7 ? Math.sin(t * 13) * 0.16 : 0,
      delivery:
        active && t < 2.4 ? 1.6 + t * 4 : 0,
    },
  );

  human(m, [1.0, 0.1, 10.5], [WHITE, "#313c49"], "umpire", {
    yaw: Math.PI,
    signal: active && t > 3 ? event.value : null,
    time: t,
  });

  if (active) {
    let ball;

    if (t < 1.75)
      ball = mix(
        [0, 2.15, 1],
        [0, 0.65, -8.4],
        clamp((t - 1.5) / 0.25, 0, 1),
      );
    else if (event.value === 6) {
      const u = clamp((t - 1.75) / 2.8, 0, 1);

      ball = [
        -u * 24,
        1 + Math.sin(u * Math.PI) * 13,
        -9 - u * 35,
      ];
    } else if (event.value === 4) {
      const u = clamp((t - 1.75) / 3, 0, 1);

      ball = [
        u * 38,
        0.16 + Math.abs(Math.sin(u * 12)) * 0.18,
        -9 - u * 17,
      ];
    } else if (event.value === "W")
      ball = [0.05, 0.45, -9.03];
    else
      ball = mix(
        [0, 0.65, -9],
        [0, 0.25, -13],
        clamp((t - 1.75) / 1.2, 0, 1),
      );

    if (t >= 1.5 && t < 5)
      m.sphere(ball, [0.055, 0.055, 0.055], "#f3eee5");

    if (event.value === "W" && t > 1.8)
      m.limb(
        [-0.15, 0.86, -9],
        [0.25, 1.04, -9.3],
        0.016,
        "#e3d6b7",
      );
  }

  const close =
    active &&
    (event.value === 4 ||
      event.value === 6 ||
      event.value === "W") &&
    t > 2.8 &&
    t < 6;

  const signal =
    active &&
    (event.value === 4 ||
      event.value === 6 ||
      event.value === "W") &&
    t >= 6;

  return {
    background: backgroundGeometry,
    vertices: m.vertices,

    camera: close
      ? [3.0, 2.35, -3.2]
      : signal
        ? [4.0, 2.4, 15]
        : [2.7, 3.25, 19],

    target: close
      ? [-0.35, 1.13, -8.7]
      : signal
        ? [1, 1.25, 10.5]
        : [0, 1.0, -6],

    label: delivery
      ? "NEXT DELIVERY"
      : active
        ? event.value === "W"
          ? "WICKET"
          : event.value === 6
            ? "SIX"
            : event.value === 4
              ? "FOUR"
              : event.value === 0
                ? "DOT BALL"
                : `${event.value} RUN${event.value === 1 ? "" : "S"}`
        : match.phase === "RESULT"
          ? "MATCH COMPLETE"
          : match.phase === "BETTING"
            ? "BETTING OPEN"
            : "WAITING FOR MATCH",
  };
}

export function cameraMatrix(eye, target, aspect) {
  const z = norm(sub(eye, target)),
    x = norm(cross([0, 1, 0], z)),
    y = cross(z, x);

  const view = [
    x[0],
    y[0],
    z[0],
    0,
    x[1],
    y[1],
    z[1],
    0,
    x[2],
    y[2],
    z[2],
    0,
    -dot(x, eye),
    -dot(y, eye),
    -dot(z, eye),
    1,
  ];

  const f = 1 / Math.tan((42 * Math.PI) / 360),
    near = 0.1,
    far = 220;

  const proj = [
    f / aspect,
    0,
    0,
    0,
    0,
    f,
    0,
    0,
    0,
    0,
    (far + near) / (near - far),
    -1,
    0,
    0,
    (2 * far * near) / (near - far),
    0,
  ];

  const out = new Array(16).fill(0);

  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++)
      for (let k = 0; k < 4; k++)
        out[c * 4 + r] +=
          proj[k * 4 + r] * view[c * 4 + k];

  return out;
}

const VERTEX = `
attribute vec3 p;
attribute vec3 n;
attribute vec3 c;

uniform mat4 vp;

varying vec3 normal;
varying vec3 color;
varying vec3 world;

void main() {
  normal = n;
  color = c;
  world = p;
  gl_Position = vp * vec4(p, 1.0);
}
`;

const FRAGMENT = `
precision mediump float;

varying vec3 normal;
varying vec3 color;
varying vec3 world;

uniform vec3 eye;

void main() {
  vec3 N = normalize(normal);
  vec3 L = normalize(vec3(-.4, .85, .5));

  float d = max(dot(N, L), 0.0);

  vec3 H = normalize(L + normalize(eye - world));
  float spec = pow(max(dot(N, H), 0.0), 24.0) * .12;

  vec3 lit = color * (.43 + .65 * d) + vec3(spec);

  float fog = clamp(
    length(eye - world) / 180.0,
    0.0,
    .65
  );

  gl_FragColor = vec4(
    mix(lit, vec3(.47, .60, .65), fog),
    1.0
  );
}
`;

export function CricketScene({ match, now }) {
  const canvas = useRef(null),
    current = useRef({ match, now }),
    [error, setError] = useState("");

  current.current = { match, now };

  useEffect(() => {
    const node = canvas.current;

    const gl = node.getContext("webgl", {
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: false,
    });

    if (!gl) {
      setError(
        "3D requires WebGL. Enable hardware acceleration or try another browser.",
      );
      return;
    }

    let program,
      staticBuffer,
      dynamicBuffer,
      frame,
      stopped = false,
      last = 0,
      uploadedBackground = null;

    const shaders = [];

    try {
      const shader = (type, source) => {
        const s = gl.createShader(type);
        shaders.push(s);

        gl.shaderSource(s, source);
        gl.compileShader(s);

        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
          throw new Error(gl.getShaderInfoLog(s));

        return s;
      };

      program = gl.createProgram();

      gl.attachShader(
        program,
        shader(gl.VERTEX_SHADER, VERTEX),
      );

      gl.attachShader(
        program,
        shader(gl.FRAGMENT_SHADER, FRAGMENT),
      );

      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        throw new Error(gl.getProgramInfoLog(program));

      gl.useProgram(program);
      gl.enable(gl.DEPTH_TEST);
      gl.clearColor(0.47, 0.6, 0.65, 1);

      staticBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, staticBuffer);

      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(STATIC_FIELD),
        gl.STATIC_DRAW,
      );

      dynamicBuffer = gl.createBuffer();

      const attrs = ["p", "n", "c"].map((name) =>
          gl.getAttribLocation(program, name),
        ),
        vp = gl.getUniformLocation(program, "vp"),
        eye = gl.getUniformLocation(program, "eye");

      const draw = (buffer, count) => {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

        attrs.forEach((a, i) => {
          gl.enableVertexAttribArray(a);
          gl.vertexAttribPointer(
            a,
            3,
            gl.FLOAT,
            false,
            36,
            i * 12,
          );
        });

        gl.drawArrays(gl.TRIANGLES, 0, count);
      };

      const loop = (time) => {
        if (stopped) return;

        frame = requestAnimationFrame(loop);

        if (time - last < 33) return;
        last = time;

        const ratio = Math.min(
            window.devicePixelRatio || 1,
            1.5,
          ),
          w = Math.max(
            1,
            Math.round(node.clientWidth * ratio),
          ),
          h = Math.max(
            1,
            Math.round(node.clientHeight * ratio),
          );

        if (node.width !== w || node.height !== h) {
          node.width = w;
          node.height = h;
        }

        gl.viewport(0, 0, w, h);

        const state = current.current,
          scene = sceneData(state.match, state.now);

        gl.clear(
          gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT,
        );

        gl.uniformMatrix4fv(
          vp,
          false,
          new Float32Array(
            cameraMatrix(scene.camera, scene.target, w / h),
          ),
        );

        gl.uniform3fv(
          eye,
          new Float32Array(scene.camera),
        );

        if (uploadedBackground !== scene.background) {
          gl.bindBuffer(gl.ARRAY_BUFFER, staticBuffer);

          gl.bufferData(
            gl.ARRAY_BUFFER,
            scene.background,
            gl.STATIC_DRAW,
          );

          uploadedBackground = scene.background;
        }

        draw(
          staticBuffer,
          scene.background.length / 9,
        );

        gl.bindBuffer(gl.ARRAY_BUFFER, dynamicBuffer);

        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array(scene.vertices),
          gl.DYNAMIC_DRAW,
        );

        draw(
          dynamicBuffer,
          scene.vertices.length / 9,
        );
      };

      frame = requestAnimationFrame(loop);
    } catch (e) {
      setError(
        "Unable to start the 3D renderer: " + e.message,
      );
    }

    const lost = (e) => {
      e.preventDefault();

      setError(
        "3D graphics interrupted. Reload this match to restore the view.",
      );

      stopped = true;
    };

    node.addEventListener("webglcontextlost", lost);

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);

      node.removeEventListener("webglcontextlost", lost);

      if (staticBuffer) gl.deleteBuffer(staticBuffer);
      if (dynamicBuffer) gl.deleteBuffer(dynamicBuffer);
      if (program) gl.deleteProgram(program);

      shaders.forEach((s) => gl.deleteShader(s));
    };
  }, []);

  const { event, active, delivery } = deliveryFrame(match, now);

  const label = delivery
    ? "NEXT DELIVERY"
    : active
      ? event.value === "W"
        ? "WICKET"
        : event.value === 6
          ? "SIX"
          : event.value === 4
            ? "FOUR"
            : event.value === 0
              ? "DOT BALL"
              : `${event.value} RUN${event.value === 1 ? "" : "S"}`
      : match.phase === "RESULT"
        ? "MATCH COMPLETE"
        : match.phase === "BETTING"
          ? "BETTING OPEN"
          : "WAITING FOR MATCH";

  return (
    <section
      aria-label="3D cricket stadium"
      style={{
        position: "relative",
        background: "#20372e",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvas}
        aria-label="Adult cricket players with helmets, gloves and leg pads"
        style={{
          display: "block",
          width: "100%",
          aspectRatio: "16 / 10",
        }}
      />

      <span
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          color: "#fff",
          fontSize: 10,
          fontWeight: 800,
          background: "#142c36dd",
          padding: "6px 9px",
          borderRadius: 5,
        }}
      >
        3D VIRTUAL CRICKET
      </span>

      <strong
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          fontSize: 14,
          color: "#f7d68a",
          background: "#122833e8",
          padding: "7px 12px",
          borderRadius: 5,
        }}
      >
        {label}
      </strong>

      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          padding: "10px 12px",
          background: "#102b30ee",
          fontSize: 12,
          color: "white",
          fontWeight: 800,
        }}
      >
        {match.teams.map((team, i) => (
          <span key={team}>
            {team} {match.scores[i].runs}/
            {match.scores[i].wickets} (
            {match.scores[i].overs})
          </span>
        ))}
      </div>

      {error && (
        <div
          role="alert"
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            padding: 24,
            background: "#14212bef",
            color: "#f9c9a4",
            textAlign: "center",
          }}
        >
          {error}
        </div>
      )}
    </section>
  );
}

export const previewGeometry = STATIC_FIELD;
export default CricketScene;
