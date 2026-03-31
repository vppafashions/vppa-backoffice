"use client";

import { HeroSectionPage } from "../_components/hero-section-page";

export default function HomepageHeroesPage() {
  return (
    <HeroSectionPage
      title="Homepage Heroes"
      description="Edit hero banners, text content, and images on the homepage"
      prefix="homepage-"
      sectionLabels={{
        "homepage-hero": {
          label: "Hero Banner",
          description: "Main hero image and text at the top of the homepage",
        },
        "homepage-manifesto": {
          label: "Brand Manifesto",
          description: "Brand quote section below the hero banner",
        },
        "homepage-editorial": {
          label: "Editorial Break",
          description: "Four Pillars section between collections and featured products",
        },
        "homepage-featured": {
          label: "Featured Products Header",
          description: "The Edit section heading and CTA",
        },
        "homepage-newsletter": {
          label: "Newsletter Section",
          description: "Newsletter signup section at the bottom of homepage",
        },
      }}
    />
  );
}
