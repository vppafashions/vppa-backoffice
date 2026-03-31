"use client";

import { HeroSectionPage } from "../_components/hero-section-page";

export default function VelocityHeroesPage() {
  return (
    <HeroSectionPage
      title="Velocity Heroes"
      description="Edit hero banner and editorial quote on the Velocity collection page"
      prefix="collection-velocity-"
      sectionLabels={{
        "collection-velocity-hero": {
          label: "Velocity Hero Banner",
          description: "Hero image, title, tagline, and CTA for the Velocity page",
        },
        "collection-velocity-quote": {
          label: "Velocity Quote",
          description: "Editorial quote displayed on the Velocity collection page",
        },
      }}
    />
  );
}
