"use client";

import { useState, useEffect } from "react";

function useCountUp(target: number, duration: number = 2000, delay: number = 1200) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setCount(Math.floor(eased * target));
        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }, delay);
    return () => clearTimeout(timeout);
  }, [target, duration, delay]);

  return count;
}

const orbits = [
  {
    size: 353,
    dir: "reverse" as const,
    dur: 30,
    items: [{ angle: 270, size: 54, shape: "square", label: "PDF" }],
  },
  {
    size: 501,
    dir: "normal" as const,
    dur: 40,
    items: [
      { angle: 60, size: 54, shape: "round", label: "Web" },
      { angle: 180, size: 66, shape: "round", label: "VTT" },
      { angle: 300, size: 54, shape: "square", label: "Text" },
    ],
  },
  {
    size: 649,
    dir: "normal" as const,
    dur: 50,
    items: [{ angle: 130, size: 72, shape: "round", label: "AI" }],
  },
  {
    size: 797,
    dir: "reverse" as const,
    dur: 60,
    items: [
      { angle: 30, size: 54, shape: "round", label: "RAG" },
      { angle: 150, size: 72, shape: "square", label: "Q&A" },
      { angle: 270, size: 54, shape: "round", label: "Cite" },
    ],
  },
];

export function LandingCircles() {
  const count = useCountUp(500, 2000, 1200);

  return (
    <div className="circles-container animate-scale-in">
      {orbits.map((orbit, oi) => {
        const radius = orbit.size / 2;
        return (
          <div
            key={oi}
            className="orbit-ring"
            style={{
              width: orbit.size,
              height: orbit.size,
              animationDuration: `${orbit.dur}s`,
              animationDirection: orbit.dir,
            }}
          >
            {orbit.items.map((item, ii) => {
              const rad = (item.angle * Math.PI) / 180;
              const x = radius + radius * Math.cos(rad) - item.size / 2;
              const y = radius + radius * Math.sin(rad) - item.size / 2;
              return (
                <div
                  key={ii}
                  className="orbit-item"
                  style={{
                    width: item.size,
                    height: item.size,
                    borderRadius: item.shape === "round" ? "50%" : "16px",
                    top: y,
                    left: x,
                    animationDuration: `${orbit.dur}s`,
                    animationDirection: orbit.dir === "reverse" ? "normal" : "reverse",
                  }}
                >
                  <span className="orbit-item-label">{item.label}</span>
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Center */}
      <div className="circles-center">
        <span className="circles-count">{count}+</span>
        <span className="circles-label">Sources Processed</span>
      </div>
    </div>
  );
}
