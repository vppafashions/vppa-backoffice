"use client";

import { HeroSectionPage } from "../_components/hero-section-page";

export default function PowerHeroesPage() {
  return (
    <HeroSectionPage
      title="Power Heroes"
      description="Edit hero banner and editorial quote on the Power collection page"
      prefix="collection-power-"
      sectionLabels={{
        "collection-power-hero": {
          label: "Power Hero Banner",
          description: "Hero image, title, tagline, and CTA for the Power page",
        },
        "collection-power-quote": {
          label: "Power Quote",
          description: "Editorial quote displayed on the Power collection page",
        },
      }}
    />
  );
}
