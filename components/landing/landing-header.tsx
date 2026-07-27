"use client";

import { SignInButton, SignUpButton } from "@clerk/nextjs";
import Image from "next/image";

export function LandingHeader() {
  return (
    <header className="landing-header animate-fade-down">
      <div className="landing-header-left">
        <div className="landing-logo">
          <Image src="/book.svg" alt="KitabLLM" width={28} height={28} />
          <span className="landing-logo-text">KitabLLM</span>
        </div>
        <nav className="landing-nav">
          <a href="#features" className="landing-nav-link">Features</a>
          <a href="#how-it-works" className="landing-nav-link">How It Works</a>
          <a href="#pricing" className="landing-nav-link">Pricing</a>
        </nav>
      </div>
      <div className="landing-header-right">
        <SignInButton>
          <button className="landing-login-link">Log In</button>
        </SignInButton>
        <div className="btn-border-wrap">
          <SignUpButton>
            <button className="landing-cta-btn">Get Started</button>
          </SignUpButton>
        </div>
      </div>
    </header>
  );
}
