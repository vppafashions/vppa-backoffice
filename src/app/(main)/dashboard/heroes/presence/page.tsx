"use client";

import { HeroSectionPage } from "../_components/hero-section-page";

export default function PresenceHeroesPage() {
  return (
    <HeroSectionPage
      title="Presence Heroes"
      description="Edit hero banner and editorial quote on the Presence collection page"
      prefix="collection-presence-"
      sectionLabels={{
        "collection-presence-hero": {
          label: "Presence Hero Banner",
          description: "Hero image, title, tagline, and CTA for the Presence page",
        },
        "collection-presence-quote": {
          label: "Presence Quote",
          description: "Editorial quote displayed on the Presence collection page",
        },
      }}
    />
  );
}
