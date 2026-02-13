import { useState, useEffect, useCallback, useRef } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import CubeScene from "@/components/cube3d/CubeScene";

// === MOVE DATA ===

const FACES = ["R", "L", "U", "D", "F", "B"] as const;
const VARIANTS = ["", "'", "2"] as const;

const ROTATIONS = ["x", "x'", "x2", "y", "y'", "y2"];

const COMBOS: Record<string, string[]> = {
  "Sexy": ["R", "U", "R'", "U'"],
  "Inverse Sexy": ["U", "R", "U'", "R'"],
  "Sledgehammer": ["R'", "F", "R", "F'"],
  "Hedgeslammer": ["F", "R'", "F'", "R"],
};

// === HELPERS ===

const getRandomItem = <T,>(arr: T[], last?: T): T => {
  if (arr.length === 0) return "" as unknown as T;
  if (arr.length === 1) return arr[0];
  let item: T;
  do {
    item = arr[Math.floor(Math.random() * arr.length)];
  } while (item === last);
  return item;
};

// === COMPONENT ===

export default function MoveDisplay() {
  const [activeTab, setActiveTab] = useState("turns");

  // Turns config
  const [enabledFaces, setEnabledFaces] = useState<Record<string, boolean>>(
    Object.fromEntries(FACES.map((f) => [f, true]))
  );
  const [enabledVariants, setEnabledVariants] = useState<Record<string, Record<string, boolean>>>(
    Object.fromEntries(
      FACES.map((f) => [f, Object.fromEntries(VARIANTS.map((v) => [v || "base", true]))])
    )
  );
  const [includeRotations, setIncludeRotations] = useState(false);
  // Per-face wide move variants: { R: { base: false, "'": false, "2": false }, ... }
  const [enabledWideVariants, setEnabledWideVariants] = useState<Record<string, Record<string, boolean>>>(
    Object.fromEntries(
      FACES.map((f) => [f, Object.fromEntries(VARIANTS.map((v) => [v || "base", false]))])
    )
  );
  const [enabledCombos, setEnabledCombos] = useState<Record<string, boolean>>(
    Object.fromEntries(Object.keys(COMBOS).map((k) => [k, false]))
  );

  // Display state
  const [display, setDisplay] = useState("R");
  const [displayCounter, setDisplayCounter] = useState(0);
  const [phase, setPhase] = useState<"enter" | "exit">("enter");
  const [playing, setPlaying] = useState(false);
  const [tps, setTps] = useState(1); // turns per second
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRef = useRef(display);

  // 3D cube state
  const [currentMove3D, setCurrentMove3D] = useState<string | null>(null);
  const [moveKey, setMoveKey] = useState(0);
  const [resetKey, setResetKey] = useState(0);

  // Build the pool based on active tab
  const getPool = useCallback((): string[] => {
    if (activeTab === "turns") {
      const moves: string[] = [];
      for (const face of FACES) {
        if (!enabledFaces[face]) continue;
        for (const v of VARIANTS) {
          const key = v || "base";
          if (enabledVariants[face]?.[key]) {
            moves.push(`${face}${v}`);
          }
        }
      }
      // Add enabled wide move variants per face
      for (const face of FACES) {
        const wideFace = face.toLowerCase();
        for (const v of VARIANTS) {
          const key = v || "base";
          if (enabledWideVariants[face]?.[key]) {
            moves.push(`${wideFace}${v}`);
          }
        }
      }
      if (includeRotations) moves.push(...ROTATIONS);
      // Add enabled combos as joined strings
      for (const [name, enabled] of Object.entries(enabledCombos)) {
        if (enabled) moves.push(COMBOS[name].join(" "));
      }
      return moves.length > 0 ? moves : ["R"];
    }
    return ["R"];
  }, [activeTab, enabledFaces, enabledVariants, enabledWideVariants, includeRotations, enabledCombos]);

  const nextMove = useCallback(() => {
    if (activeTab !== "turns") return;
    setPhase("exit");
    setTimeout(() => {
      setDisplayCounter((c) => c + 1);
      const pool = getPool();
      const m = getRandomItem(pool, lastRef.current);
      lastRef.current = m;
      setDisplay(m);
      setCurrentMove3D(m);
      setMoveKey((k) => k + 1);
      setPhase("enter");
    }, 200);
  }, [activeTab, getPool]);

  const speed = 1000 / tps;

  useEffect(() => {
    if (!playing) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    nextMove();
    timerRef.current = setInterval(nextMove, speed);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playing, speed, nextMove]);

  // Reset when tab changes
  useEffect(() => {
    setPlaying(false);
    setCurrentMove3D(null);
    setResetKey((k) => k + 1);
    const pool = getPool();
    if (pool.length > 0) setDisplay(pool[0]);
  }, [activeTab]);

  const toggleFace = (face: string) => {
    setEnabledFaces((prev) => ({ ...prev, [face]: !prev[face] }));
  };

  const toggleVariant = (face: string, variant: string) => {
    setEnabledVariants((prev) => ({
      ...prev,
      [face]: { ...prev[face], [variant]: !prev[face]?.[variant] },
    }));
  };

  const toggleWideVariant = (face: string, variant: string) => {
    setEnabledWideVariants((prev) => ({
      ...prev,
      [face]: { ...prev[face], [variant]: !prev[face]?.[variant] },
    }));
  };

  const toggleCombo = (name: string) => {
    setEnabledCombos((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <div className="flex flex-col items-center min-h-screen px-4 py-8 gap-6 bg-gradient-to-b from-[hsl(0,0%,95%)] to-[hsl(0,0%,85%)]">
      {/* Header */}
      <h1 className="font-mono text-sm uppercase tracking-[0.3em] text-[hsl(220,10%,40%)]">
        Cube Trainer — Rotations
      </h1>

      {/* 3D Cube + Move display */}
      <div className="flex flex-col items-center gap-2">
        <CubeScene
          currentMove={currentMove3D}
          moveKey={moveKey}
          tps={tps}
          resetKey={resetKey}
        />
        <div className="relative flex items-center justify-center w-64 h-20">
          <div className="text-center">
            <span
              key={displayCounter}
              className={`font-mono font-extrabold text-[hsl(220,20%,15%)] select-none whitespace-nowrap animate-color-fade ${
                display.includes(" ") ? "text-2xl" : "text-5xl"
              }`}
              style={{ "--fade-duration": `${speed}ms` } as React.CSSProperties}
            >
              {display}
            </span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-4 w-full max-w-xs">
        <div className="flex gap-3">
          <button
            onClick={() => setPlaying((p) => !p)}
            className="font-mono text-sm uppercase tracking-widest px-8 py-3 rounded-lg bg-[hsl(220,20%,15%)] text-[hsl(0,0%,95%)] font-semibold hover:opacity-90 transition-opacity"
          >
            {playing ? "Pause" : "Start"}
          </button>
          <button
            onClick={() => {
              setPlaying(false);
              setResetKey((k) => k + 1);
              setCurrentMove3D(null);
              setDisplay("R");
            }}
            className="font-mono text-sm uppercase tracking-widest px-4 py-3 rounded-lg border border-[hsl(220,10%,70%)] text-[hsl(220,10%,40%)] font-semibold hover:bg-[hsl(0,0%,88%)] transition-colors"
          >
            Reset
          </button>
        </div>

        {/* Speed slider — turns per second */}
        <div className="w-full flex flex-col items-center gap-2">
          <label className="text-xs text-[hsl(220,10%,45%)] font-mono uppercase tracking-widest">
            {tps} turn{tps !== 1 ? "s" : ""} / sec
          </label>
          <Slider
            min={0.5}
            max={12}
            step={0.5}
            value={[tps]}
            onValueChange={([v]) => setTps(v)}
            className="w-full"
          />
          <div className="flex justify-between w-full text-[10px] text-[hsl(220,10%,55%)] font-mono">
            <span>0.5</span>
            <span>12</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-md">
        <TabsList className="grid w-full grid-cols-4 bg-[hsl(0,0%,88%)]">
          <TabsTrigger value="turns" className="font-mono text-xs">Turns</TabsTrigger>
          <TabsTrigger value="oll" className="font-mono text-xs">OLL</TabsTrigger>
          <TabsTrigger value="pll" className="font-mono text-xs">PLL</TabsTrigger>
          <TabsTrigger value="custom" className="font-mono text-xs">Custom</TabsTrigger>
        </TabsList>

        {/* TURNS TAB */}
        <TabsContent value="turns" className="space-y-4 pt-2">
          {/* Face toggles */}
          <div className="space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-[hsl(220,10%,45%)]">Faces & Variants</p>
            <div className="grid grid-cols-2 gap-2">
              {FACES.map((face) => (
                <div key={face} className="bg-[hsl(0,0%,92%)] rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={enabledFaces[face]}
                      onCheckedChange={() => toggleFace(face)}
                    />
                    <span className="font-mono font-bold text-sm text-[hsl(220,20%,15%)]">{face}</span>
                  </div>
                  {enabledFaces[face] && (
                    <div className="ml-6 space-y-1">
                      <div className="flex gap-2">
                        {VARIANTS.map((v) => {
                          const key = v || "base";
                          const label = v ? `${face}${v}` : face;
                          return (
                            <label key={key} className="flex items-center gap-1 text-xs font-mono text-[hsl(220,10%,40%)]">
                              <Checkbox
                                checked={enabledVariants[face]?.[key] ?? true}
                                onCheckedChange={() => toggleVariant(face, key)}
                                className="h-3 w-3"
                              />
                              {label}
                            </label>
                          );
                        })}
                      </div>
                      <div className="flex gap-2">
                        {VARIANTS.map((v) => {
                          const key = v || "base";
                          const wideFace = face.toLowerCase();
                          const label = v ? `${wideFace}${v}` : wideFace;
                          return (
                            <label key={`wide-${key}`} className="flex items-center gap-1 text-xs font-mono text-[hsl(220,10%,50%)]">
                              <Checkbox
                                checked={enabledWideVariants[face]?.[key] ?? false}
                                onCheckedChange={() => toggleWideVariant(face, key)}
                                className="h-3 w-3"
                              />
                              {label}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Rotations toggle */}
          <label className="flex items-center gap-2 font-mono text-xs text-[hsl(220,10%,40%)]">
            <Checkbox checked={includeRotations} onCheckedChange={() => setIncludeRotations((p) => !p)} />
            Include Rotations (x, y)
          </label>

          {/* Combos */}
          <div className="space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-widest text-[hsl(220,10%,45%)]">Combos</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(COMBOS).map(([name, moves]) => (
                <Badge
                  key={name}
                  variant={enabledCombos[name] ? "default" : "outline"}
                  className={`cursor-pointer font-mono text-[10px] transition-all ${
                    enabledCombos[name]
                      ? "bg-[hsl(220,20%,15%)] text-[hsl(0,0%,95%)]"
                      : "border-[hsl(220,10%,70%)] text-[hsl(220,10%,45%)] hover:bg-[hsl(0,0%,88%)]"
                  }`}
                  onClick={() => toggleCombo(name)}
                >
                  {name}
                </Badge>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* OLL TAB */}
        <TabsContent value="oll" className="space-y-3 pt-2">
          <p className="font-mono text-[10px] text-[hsl(220,10%,55%)]">
            Coming soon — OLL algorithm training with visual cube reference.
          </p>
        </TabsContent>

        {/* PLL TAB */}
        <TabsContent value="pll" className="space-y-3 pt-2">
          <p className="font-mono text-[10px] text-[hsl(220,10%,55%)]">
            Coming soon — PLL algorithm training with visual cube reference.
          </p>
        </TabsContent>

        {/* CUSTOM TAB */}
        <TabsContent value="custom" className="space-y-3 pt-2">
          <p className="font-mono text-[10px] text-[hsl(220,10%,55%)]">
            Coming soon — define your own algorithms and sequences to train.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
