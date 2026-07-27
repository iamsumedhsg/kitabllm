"use client";

import { LandingHeader } from "./landing-header";
import { LandingHero } from "./landing-hero";
import { LandingCircles } from "./landing-circles";
import { LandingLogos } from "./landing-logos";
import "./landing.css";

export function LandingPage() {
  return (
    <div className="landing-app">
      <LandingHeader />
      <main className="landing-hero">
        <div className="landing-hero-content">
          <LandingHero />
        </div>
        <div className="landing-hero-visual">
          <LandingCircles />
        </div>
      </main>
      <LandingLogos />
    </div>
  );
}
