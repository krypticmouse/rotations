/**
 * Pure cube state model — no React, no Three.js imports.
 * Manages the 26 visible cubies of a 3x3 Rubik's cube.
 */

import { parseMove } from "./moveMap";

export interface CubieState {
  /** Stable identifier based on initial position, e.g. "1_0_-1" */
  id: string;
  /** Current grid position: each coordinate is -1, 0, or 1 */
  position: [number, number, number];
  /** Accumulated orientation as quaternion [x, y, z, w] */
  quaternion: [number, number, number, number];
  /** Initial position — used to determine sticker colors */
  initialPosition: [number, number, number];
}

export interface CubeModel {
  cubies: CubieState[];
}

// Standard Rubik's cube colors
const COLORS = {
  R: "#C41E3A", // +X → Red
  L: "#FF5800", // -X → Orange
  U: "#FFFFFF", // +Y → White
  D: "#FFD500", // -Y → Yellow
  F: "#009E60", // +Z → Green
  B: "#0051BA", // -Z → Blue
  interior: "#1a1a1a",
} as const;

/**
 * Returns the 6 face colors for a cubie based on its initial position.
 * Order: [+X, -X, +Y, -Y, +Z, -Z] — matches Three.js box material order.
 */
export function getColorsForCubie(initialPos: [number, number, number]): string[] {
  const [x, y, z] = initialPos;
  return [
    x === 1 ? COLORS.R : COLORS.interior,   // +X face
    x === -1 ? COLORS.L : COLORS.interior,  // -X face
    y === 1 ? COLORS.U : COLORS.interior,   // +Y face
    y === -1 ? COLORS.D : COLORS.interior,  // -Y face
    z === 1 ? COLORS.F : COLORS.interior,   // +Z face
    z === -1 ? COLORS.B : COLORS.interior,  // -Z face
  ];
}

/** Create a solved 3x3 cube with 26 cubies. */
export function createSolvedCube(): CubeModel {
  const cubies: CubieState[] = [];
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        if (x === 0 && y === 0 && z === 0) continue; // skip hidden center
        const pos: [number, number, number] = [x, y, z];
        cubies.push({
          id: `${x}_${y}_${z}`,
          position: [...pos],
          quaternion: [0, 0, 0, 1], // identity
          initialPosition: [...pos],
        });
      }
    }
  }
  return { cubies };
}

// ---- Quaternion math (avoid importing THREE in this pure module) ----

type Quat = [number, number, number, number]; // [x, y, z, w]

function quatFromAxisAngle(ax: number, ay: number, az: number, angle: number): Quat {
  const half = angle / 2;
  const s = Math.sin(half);
  return [ax * s, ay * s, az * s, Math.cos(half)];
}

function quatMultiply(a: Quat, b: Quat): Quat {
  // a * b
  return [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ];
}

/** Rotate a 3D integer position around an axis by the given angle. */
function rotatePosition(
  pos: [number, number, number],
  axis: "x" | "y" | "z",
  angle: number
): [number, number, number] {
  // For 90/180/270 degree rotations of integer coords, use exact transforms
  const [x, y, z] = pos;
  // Normalize angle to number of 90-degree CW steps (looking from +axis)
  // angle is in radians; -PI/2 = 1 CW step, PI/2 = 1 CCW step, PI = 2 steps
  let steps = Math.round(angle / (-Math.PI / 2));
  steps = ((steps % 4) + 4) % 4; // normalize to 0..3

  if (steps === 0) return [x, y, z];

  let a: number, b: number;
  if (axis === "x") {
    [a, b] = [y, z];
    for (let i = 0; i < steps; i++) {
      const tmp = a;
      a = b;
      b = -tmp;
    }
    return [x, a, b];
  }
  if (axis === "y") {
    [a, b] = [z, x];
    for (let i = 0; i < steps; i++) {
      const tmp = a;
      a = b;
      b = -tmp;
    }
    return [b, y, a];
  }
  // axis === "z"
  [a, b] = [x, y];
  for (let i = 0; i < steps; i++) {
    const tmp = a;
    a = b;
    b = -tmp;
  }
  return [a, b, z];
}

/** Apply a move notation string to the cube, returning a new CubeModel. */
export function applyMove(cube: CubeModel, notation: string): CubeModel {
  const parsed = parseMove(notation);
  if (!parsed) return cube;

  const { axis, layerFilter, angle } = parsed;
  const axisVec: [number, number, number] =
    axis === "x" ? [1, 0, 0] : axis === "y" ? [0, 1, 0] : [0, 0, 1];
  const rotQuat = quatFromAxisAngle(axisVec[0], axisVec[1], axisVec[2], angle);

  return {
    cubies: cube.cubies.map((c) => {
      if (!layerFilter(c.position)) return c;
      return {
        ...c,
        position: rotatePosition(c.position, axis, angle),
        quaternion: quatMultiply(rotQuat, c.quaternion),
      };
    }),
  };
}
