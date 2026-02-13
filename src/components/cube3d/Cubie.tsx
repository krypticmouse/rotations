import { useMemo } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import type { CubieState } from "./cubeState";
import { getColorsForCubie } from "./cubeState";

interface CubieProps {
  cubieState: CubieState;
}

const CUBIE_SIZE = 0.9;
const STICKER_SIZE = 0.82;
const STICKER_OFFSET = 0.451; // slightly outside the cubie face

/** Normal vectors for each face: +X, -X, +Y, -Y, +Z, -Z */
const FACE_NORMALS: [number, number, number][] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

/** Euler rotations to orient a plane facing +Z to each face normal */
const FACE_ROTATIONS: [number, number, number][] = [
  [0, Math.PI / 2, 0],   // +X
  [0, -Math.PI / 2, 0],  // -X
  [-Math.PI / 2, 0, 0],  // +Y
  [Math.PI / 2, 0, 0],   // -Y
  [0, 0, 0],             // +Z
  [0, Math.PI, 0],       // -Z
];

export default function Cubie({ cubieState }: CubieProps) {
  const colors = useMemo(
    () => getColorsForCubie(cubieState.initialPosition),
    [cubieState.initialPosition]
  );

  const quaternion = useMemo(
    () => new THREE.Quaternion(...cubieState.quaternion),
    [cubieState.quaternion]
  );

  const bodyMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#111111", roughness: 0.3 }),
    []
  );

  return (
    <group position={cubieState.position} quaternion={quaternion}>
      {/* Black body */}
      <RoundedBox args={[CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE]} radius={0.06} smoothness={4}>
        <primitive object={bodyMaterial} attach="material" />
      </RoundedBox>

      {/* Colored stickers */}
      {colors.map((color, i) => {
        if (color === "#1a1a1a") return null; // skip interior faces
        const [nx, ny, nz] = FACE_NORMALS[i];
        return (
          <mesh
            key={i}
            position={[nx * STICKER_OFFSET, ny * STICKER_OFFSET, nz * STICKER_OFFSET]}
            rotation={FACE_ROTATIONS[i]}
          >
            <planeGeometry args={[STICKER_SIZE, STICKER_SIZE]} />
            <meshStandardMaterial color={color} roughness={0.4} side={THREE.FrontSide} />
          </mesh>
        );
      })}
    </group>
  );
}
