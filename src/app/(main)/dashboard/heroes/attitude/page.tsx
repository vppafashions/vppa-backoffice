"use client";

import { HeroSectionPage } from "../_components/hero-section-page";

export default function AttitudeHeroesPage() {
  return (
    <HeroSectionPage
      title="Attitude Heroes"
      description="Edit hero banner and editorial quote on the Attitude collection page"
      prefix="collection-attitude-"
      sectionLabels={{
        "collection-attitude-hero": {
          label: "Attitude Hero Banner",
          description: "Hero image, title, tagline, and CTA for the Attitude page",
        },
        "collection-attitude-quote": {
          label: "Attitude Quote",
          description: "Editorial quote displayed on the Attitude collection page",
        },
      }}
    />
  );
}
