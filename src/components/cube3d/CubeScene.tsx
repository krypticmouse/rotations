import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import RubiksCube from "./RubiksCube";

interface CubeSceneProps {
  /** The move notation to animate */
  currentMove: string | null;
  /** Increments each time a new move starts */
  moveKey: number;
  /** Turns per second */
  tps: number;
  /** Increments when the cube should reset to solved */
  resetKey: number;
}

export default function CubeScene({ currentMove, moveKey, tps, resetKey }: CubeSceneProps) {
  return (
    <div className="w-80 h-72 rounded-xl overflow-hidden">
      <Canvas
        camera={{ position: [4.2, 3, 4.2], fov: 36 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 8, 5]} intensity={0.9} />
        <directionalLight position={[-3, -2, -3]} intensity={0.2} />
        <RubiksCube
          currentMove={currentMove}
          moveKey={moveKey}
          tps={tps}
          resetKey={resetKey}
        />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          dampingFactor={0.1}
          rotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
}
