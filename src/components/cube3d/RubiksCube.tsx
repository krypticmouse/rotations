import { useState, useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import Cubie from "./Cubie";
import { createSolvedCube, applyMove, type CubeModel } from "./cubeState";
import { parseMove } from "./moveMap";

interface RubiksCubeProps {
  currentMove: string | null;
  moveKey: number;
  tps: number;
  resetKey: number;
}

interface AnimDef {
  cubieIds: Set<string>;
  axis: "x" | "y" | "z";
  targetAngle: number;
  moveNotation: string;
  duration: number;
}

export default function RubiksCube({ currentMove, moveKey, tps, resetKey }: RubiksCubeProps) {
  // Cube state as both state (for re-render) and ref (for immediate access in useFrame)
  const [cubeState, setCubeState] = useState<CubeModel>(() => createSolvedCube());
  const cubeRef = useRef<CubeModel>(cubeState);
  cubeRef.current = cubeState;

  // Animation definition as state so setting it triggers re-render (moves cubies into group)
  const [animDef, setAnimDef] = useState<AnimDef | null>(null);
  // Mutable timing data for useFrame
  const timingRef = useRef<{ startTime: number } | null>(null);
  const groupRef = useRef<THREE.Group>(null);
  const lastMoveKeyRef = useRef(moveKey);
  const lastResetKeyRef = useRef(resetKey);
  const queueRef = useRef<{ moves: string[]; totalCount: number }>({ moves: [], totalCount: 1 });

  // Reset cube
  useEffect(() => {
    if (resetKey !== lastResetKeyRef.current) {
      lastResetKeyRef.current = resetKey;
      const solved = createSolvedCube();
      setCubeState(solved);
      cubeRef.current = solved;
      setAnimDef(null);
      timingRef.current = null;
      queueRef.current = { moves: [], totalCount: 1 };
      if (groupRef.current) groupRef.current.rotation.set(0, 0, 0);
    }
  }, [resetKey]);

  // Start a new move animation
  const beginMove = (notation: string, cube: CubeModel, totalMoves: number) => {
    const parsed = parseMove(notation);
    if (!parsed) return;

    const affected = cube.cubies.filter((c) => parsed.layerFilter(c.position));
    const duration = Math.max((1 / tps) * 0.7 / totalMoves, 0.05);

    timingRef.current = { startTime: -1 };
    // Setting state triggers re-render → cubies split into static/animating
    setAnimDef({
      cubieIds: new Set(affected.map((c) => c.id)),
      axis: parsed.axis,
      targetAngle: parsed.angle,
      moveNotation: notation,
      duration,
    });
  };

  // React to new moves
  useEffect(() => {
    if (moveKey === lastMoveKeyRef.current) return;
    lastMoveKeyRef.current = moveKey;
    if (!currentMove) return;

    const cube = cubeRef.current;

    if (currentMove.includes(" ")) {
      const moves = currentMove.split(/\s+/).filter(Boolean);
      if (moves.length === 0) return;
      queueRef.current = { moves: moves.slice(1), totalCount: moves.length };
      beginMove(moves[0], cube, moves.length);
    } else {
      queueRef.current = { moves: [], totalCount: 1 };
      beginMove(currentMove, cube, 1);
    }
  }, [moveKey, currentMove, tps]);

  // Smoothstep easing
  const smoothstep = (t: number) => t * t * (3 - 2 * t);

  // Per-frame animation
  useFrame((state) => {
    if (!animDef || !timingRef.current || !groupRef.current) return;

    if (timingRef.current.startTime < 0) {
      timingRef.current.startTime = state.clock.elapsedTime;
    }

    const elapsed = state.clock.elapsedTime - timingRef.current.startTime;
    const t = Math.min(elapsed / animDef.duration, 1);
    const eased = smoothstep(t);
    const angle = eased * animDef.targetAngle;

    groupRef.current.rotation.set(
      animDef.axis === "x" ? angle : 0,
      animDef.axis === "y" ? angle : 0,
      animDef.axis === "z" ? angle : 0
    );

    if (t >= 1) {
      groupRef.current.rotation.set(0, 0, 0);

      const newState = applyMove(cubeRef.current, animDef.moveNotation);
      cubeRef.current = newState;
      setCubeState(newState);

      const queue = queueRef.current;
      if (queue.moves.length > 0) {
        const nextNotation = queue.moves.shift()!;
        // Start next animation immediately using the updated cube state
        const parsed = parseMove(nextNotation);
        if (parsed) {
          const affected = newState.cubies.filter((c) => parsed.layerFilter(c.position));
          timingRef.current = { startTime: -1 };
          setAnimDef({
            cubieIds: new Set(affected.map((c) => c.id)),
            axis: parsed.axis,
            targetAngle: parsed.angle,
            moveNotation: nextNotation,
            duration: Math.max((1 / tps) * 0.7 / queue.totalCount, 0.05),
          });
        } else {
          setAnimDef(null);
          timingRef.current = null;
        }
      } else {
        setAnimDef(null);
        timingRef.current = null;
      }
    }
  });

  // Split cubies into static and animating groups
  const animatingCubies = animDef
    ? cubeState.cubies.filter((c) => animDef.cubieIds.has(c.id))
    : [];
  const staticCubies = animDef
    ? cubeState.cubies.filter((c) => !animDef.cubieIds.has(c.id))
    : cubeState.cubies;

  return (
    <>
      {staticCubies.map((cubie) => (
        <Cubie key={cubie.id} cubieState={cubie} />
      ))}
      <group ref={groupRef}>
        {animatingCubies.map((cubie) => (
          <Cubie key={cubie.id} cubieState={cubie} />
        ))}
      </group>
    </>
  );
}
