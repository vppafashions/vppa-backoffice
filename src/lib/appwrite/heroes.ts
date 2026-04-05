"use client";

import type { Hero } from "./types";

async function dataProxy(body: Record<string, unknown>) {
  const res = await fetch("/api/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export async function getHeroes(limit = 100, offset = 0) {
  return dataProxy({
    action: "list",
    collectionId: "heroes",
    queries: [
      { method: "limit", args: [limit] },
      { method: "offset", args: [offset] },
      { method: "orderAsc", args: ["$createdAt"] },
    ],
  });
}

export async function getHeroesByPrefix(prefix: string) {
  const result = await dataProxy({
    action: "list",
    collectionId: "heroes",
    queries: [
      { method: "startsWith", args: ["sectionKey", prefix] },
      { method: "limit", args: [100] },
      { method: "orderAsc", args: ["$createdAt"] },
    ],
  });
  return result.documents as Hero[];
}

export async function getHero(id: string) {
  return dataProxy({
    action: "get",
    collectionId: "heroes",
    documentId: id,
  }) as Promise<Hero>;
}

export async function updateHero(id: string, data: Record<string, unknown>) {
  return dataProxy({
    action: "update",
    collectionId: "heroes",
    documentId: id,
    data,
  }) as Promise<Hero>;
}
