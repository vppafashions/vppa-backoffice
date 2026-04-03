export const COLLECTION_SLUG_VALUES = [
  "velocity_men",
  "velocity_women",
  "power_men",
  "power_women",
  "attitude_men",
  "attitude_women",
  "presence_men",
  "presence_women",
] as const;

export type CollectionSlug = (typeof COLLECTION_SLUG_VALUES)[number];

export const COLLECTION_SLUG_LABELS: Record<CollectionSlug, string> = {
  velocity_men: "Velocity Men",
  velocity_women: "Velocity Women",
  power_men: "Power Men",
  power_women: "Power Women",
  attitude_men: "Attitude Men",
  attitude_women: "Attitude Women",
  presence_men: "Presence Men",
  presence_women: "Presence Women",
};

export function isCollectionSlug(value: string): value is CollectionSlug {
  return COLLECTION_SLUG_VALUES.includes(value as CollectionSlug);
}

export function getCollectionSlugLabel(value: string) {
  return isCollectionSlug(value) ? COLLECTION_SLUG_LABELS[value] : value;
}
