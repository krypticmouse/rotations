/**
 * Maps Rubik's cube move notation strings to rotation parameters.
 */

export interface MoveDefinition {
  axis: "x" | "y" | "z";
  /** Which cubies are affected, based on their grid position */
  layerFilter: (pos: [number, number, number]) => boolean;
  /** Rotation angle in radians (positive = CCW when looking from +axis) */
  angle: number;
}

// Base move definitions: axis, layer selector, base angle (CW 90 when looking from +axis)
const BASE_MOVES: Record<
  string,
  { axis: "x" | "y" | "z"; filter: (p: [number, number, number]) => boolean; angle: number }
> = {
  R: { axis: "x", filter: (p) => p[0] === 1, angle: -Math.PI / 2 },
  L: { axis: "x", filter: (p) => p[0] === -1, angle: Math.PI / 2 },
  U: { axis: "y", filter: (p) => p[1] === 1, angle: -Math.PI / 2 },
  D: { axis: "y", filter: (p) => p[1] === -1, angle: Math.PI / 2 },
  F: { axis: "z", filter: (p) => p[2] === 1, angle: -Math.PI / 2 },
  B: { axis: "z", filter: (p) => p[2] === -1, angle: Math.PI / 2 },
  // Wide moves
  r: { axis: "x", filter: (p) => p[0] >= 0, angle: -Math.PI / 2 },
  l: { axis: "x", filter: (p) => p[0] <= 0, angle: Math.PI / 2 },
  u: { axis: "y", filter: (p) => p[1] >= 0, angle: -Math.PI / 2 },
  d: { axis: "y", filter: (p) => p[1] <= 0, angle: Math.PI / 2 },
  f: { axis: "z", filter: (p) => p[2] >= 0, angle: -Math.PI / 2 },
  b: { axis: "z", filter: (p) => p[2] <= 0, angle: Math.PI / 2 },
  // Slice moves
  M: { axis: "x", filter: (p) => p[0] === 0, angle: Math.PI / 2 },   // follows L
  S: { axis: "z", filter: (p) => p[2] === 0, angle: -Math.PI / 2 },  // follows F
  E: { axis: "y", filter: (p) => p[1] === 0, angle: Math.PI / 2 },   // follows D
  // Whole-cube rotations
  x: { axis: "x", filter: () => true, angle: -Math.PI / 2 },  // follows R
  y: { axis: "y", filter: () => true, angle: -Math.PI / 2 },  // follows U
  z: { axis: "z", filter: () => true, angle: -Math.PI / 2 },  // follows F
};

// Regex: face char, optional "2", optional "'"
// Handles: R, R', R2, R2', r, r', M, M', M2, x, x', x2, etc.
const MOVE_REGEX = /^([RLUDFBrludfbMSExyz])([2]?)([']?)$/;

export function parseMove(notation: string): MoveDefinition | null {
  const trimmed = notation.trim();
  const match = trimmed.match(MOVE_REGEX);
  if (!match) return null;

  const [, face, doubleStr, primeStr] = match;
  const base = BASE_MOVES[face];
  if (!base) return null;

  let angle = base.angle;

  // Prime reverses direction
  if (primeStr === "'") {
    angle = -angle;
  }

  // Double means 180 degrees
  if (doubleStr === "2") {
    angle = angle > 0 ? Math.PI : -Math.PI;
  }

  return {
    axis: base.axis,
    layerFilter: base.filter,
    angle,
  };
}
