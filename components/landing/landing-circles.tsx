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
        const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        setCount(Math.floor(eased * target));
        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }, delay);
    return () => clearTimeout(timeout);
  }, [target, duration, delay]);

  return count;
}

const sourceIcons = [
  { orbit: 1, angle: 270, radius: 177, size: 58, shape: "square", glow: "#A068FF", label: "PDF" },
  { orbit: 2, angle: 60, radius: 251, size: 58, shape: "round", glow: "#FFD700", label: "Web" },
  { orbit: 2, angle: 180, radius: 251, size: 78, shape: "round", glow: "#FF69B4", label: "VTT" },
  { orbit: 2, angle: 300, radius: 251, size: 58, shape: "square", glow: "#4DA6FF", label: "Text" },
  { orbit: 3, angle: 130, radius: 325, size: 88, shape: "round", glow: "#FF69B4", label: "AI" },
  { orbit: 4, angle: 30, radius: 399, size: 58, shape: "round", glow: "#A068FF", label: "RAG" },
  { orbit: 4, angle: 150, radius: 399, size: 88, shape: "square", glow: "#FF8C00", label: "Q&A" },
  { orbit: 4, angle: 270, radius: 399, size: 58, shape: "round", glow: "#A068FF", label: "Cite" },
];

export function LandingCircles() {
  const count = useCountUp(500, 2000, 1200);

  return (
    <div className="circles-container animate-scale-in">
      {/* Orbits */}
      {[
        { size: 353, dir: "reverse", dur: "30s" },
        { size: 501, dir: "normal", dur: "40s" },
        { size: 649, dir: "normal", dur: "50s" },
        { size: 797, dir: "reverse", dur: "60s" },
      ].map((orbit, i) => (
        <div
          key={i}
          className="orbit"
          style={{
            width: orbit.size,
            height: orbit.size,
            animationDirection: orbit.dir as "normal" | "reverse",
            animationDuration: orbit.dur,
          }}
        />
      ))}

      {/* Center content */}
      <div className="circles-center">
        <span className="circles-count">{count}+</span>
        <span className="circles-label">Sources Processed</span>
      </div>

      {/* Source type icons on orbits */}
      {sourceIcons.map((item, i) => (
        <div
          key={i}
          className="orbit-avatar"
          style={{
            width: item.size,
            height: item.size,
            borderRadius: item.shape === "round" ? "50%" : "20px",
            boxShadow: `0 0 20px ${item.glow}40, 0 0 40px ${item.glow}20`,
            background: `${item.glow}15`,
            border: `2px solid ${item.glow}60`,
            animationDelay: `${0.6 + i * 0.2}s`,
            // Position using CSS custom properties
            ["--angle" as string]: `${item.angle}deg`,
            ["--radius" as string]: `${item.radius}px`,
          }}
        >
          <span className="orbit-avatar-label" style={{ color: item.glow }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
