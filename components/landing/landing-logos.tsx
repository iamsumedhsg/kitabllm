"use client";

const logos = [
  { name: "OpenAI", text: "OpenAI" },
  { name: "LangChain", text: "LangChain" },
  { name: "pgvector", text: "pgvector" },
  { name: "Prisma", text: "Prisma" },
  { name: "Next.js", text: "Next.js" },
];

export function LandingLogos() {
  const repeated = [...logos, ...logos, ...logos, ...logos];

  return (
    <div className="landing-logos animate-fade-up-delay">
      <div className="landing-logos-track">
        {repeated.map((logo, i) => (
          <div key={i} className="landing-logo-item">
            <span className="landing-logo-item-text">{logo.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
