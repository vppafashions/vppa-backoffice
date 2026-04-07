"use client";

import type { SizeGuide } from "./types";

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

export async function getSizeGuides(limit = 100, offset = 0) {
  return dataProxy({
    action: "list",
    collectionId: "size-guides",
    queries: [
      { method: "limit", args: [limit] },
      { method: "offset", args: [offset] },
      { method: "orderDesc", args: ["$createdAt"] },
    ],
  });
}

export async function getSizeGuide(id: string) {
  return dataProxy({
    action: "get",
    collectionId: "size-guides",
    documentId: id,
  }) as Promise<SizeGuide>;
}

export async function createSizeGuide(data: Record<string, unknown>) {
  return dataProxy({
    action: "create",
    collectionId: "size-guides",
    data,
  }) as Promise<SizeGuide>;
}

export async function updateSizeGuide(id: string, data: Record<string, unknown>) {
  return dataProxy({
    action: "update",
    collectionId: "size-guides",
    documentId: id,
    data,
  }) as Promise<SizeGuide>;
}

export async function deleteSizeGuide(id: string) {
  await dataProxy({
    action: "delete",
    collectionId: "size-guides",
    documentId: id,
  });
}
