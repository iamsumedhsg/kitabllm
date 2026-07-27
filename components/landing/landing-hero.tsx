"use client";

import { useState, useEffect } from "react";
import { SignUpButton } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";

function TypewriterHeading() {
  const fullText = "Upload Your Research. Ask Questions. Get Grounded Answers With Citations.";
  const splitIndex = 28; // "Upload Your Research. Ask Q" in dark, rest in white
  const [displayedChars, setDisplayedChars] = useState(0);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    const startDelay = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        i++;
        setDisplayedChars(i);
        if (i >= fullText.length) {
          clearInterval(interval);
          setTimeout(() => setShowCursor(false), 1000);
        }
      }, 35);
      return () => clearInterval(interval);
    }, 400);
    return () => clearTimeout(startDelay);
  }, []);

  const displayedText = fullText.slice(0, displayedChars);
  const darkPart = displayedText.slice(0, Math.min(displayedChars, splitIndex));
  const lightPart = displayedText.slice(splitIndex);

  return (
    <h1 className="landing-heading">
      <span className="text-black">{darkPart}</span>
      <span className="text-white">{lightPart}</span>
      {showCursor && <span className="landing-cursor">|</span>}
    </h1>
  );
}

export function LandingHero() {
  const [showButton, setShowButton] = useState(false);
  const [showBadge, setShowBadge] = useState(false);

  useEffect(() => {
    const btnTimer = setTimeout(() => setShowButton(true), 3200);
    const badgeTimer = setTimeout(() => setShowBadge(true), 3600);
    return () => {
      clearTimeout(btnTimer);
      clearTimeout(badgeTimer);
    };
  }, []);

  return (
    <div className="landing-hero-left animate-fade-up">
      <TypewriterHeading />

      <p className="landing-subtitle">
        PDF, websites, transcripts — upload your sources into isolated notebooks
        and get AI answers grounded exclusively in your research.
      </p>

      {showButton && (
        <div className="btn-border-wrap landing-start-btn-wrap animate-pop-in">
          <SignUpButton>
            <button className="landing-start-btn">
              Start Researching
              <ArrowRight className="h-[18px] w-[18px]" />
            </button>
          </SignUpButton>
        </div>
      )}

      {showBadge && (
        <div className="landing-badge animate-pop-in">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#A068FF">
            <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.36Z"/>
          </svg>
          <span className="landing-badge-pill">RAG-Powered</span>
        </div>
      )}
    </div>
  );
}
