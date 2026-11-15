import { useMemo } from "react";

const COLORS = ["#6d4aff", "#ff6b9a", "#ffb84d", "#3ddc97", "#4dabf7", "#ffd43b"];

/** A pure-CSS burst: 36 pieces, no canvas, no timers. Hidden entirely under prefers-reduced-motion. */
function makePieces(seed: number) {
  let state = seed || 1;
  const rand = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
  return Array.from({ length: 36 }, (_, i) => ({
    id: i,
    color: COLORS[i % COLORS.length]!,
    x: (rand() - 0.5) * 520,
    y: -(120 + rand() * 260),
    rotate: rand() * 720 - 360,
    delay: rand() * 120,
    size: 6 + rand() * 6,
  }));
}

export function Confetti({ seed }: { seed: number }) {
  const pieces = useMemo(() => makePieces(seed), [seed]);

  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p) => (
        <i
          key={p.id}
          style={{
            background: p.color,
            width: p.size,
            height: p.size * 0.5,
            animationDelay: `${p.delay}ms`,
            ["--x" as string]: `${p.x}px`,
            ["--y" as string]: `${p.y}px`,
            ["--r" as string]: `${p.rotate}deg`,
          }}
        />
      ))}
    </div>
  );
}
