"use client";

import type { Collection } from "./types";

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

export async function getCollections(limit = 100, offset = 0) {
  return dataProxy({
    action: "list",
    collectionId: "collections",
    queries: [
      { method: "limit", args: [limit] },
      { method: "offset", args: [offset] },
      { method: "orderDesc", args: ["$createdAt"] },
    ],
  });
}

export async function getCollection(id: string) {
  return dataProxy({
    action: "get",
    collectionId: "collections",
    documentId: id,
  }) as Promise<Collection>;
}

export async function createCollection(data: Record<string, unknown>) {
  return dataProxy({
    action: "create",
    collectionId: "collections",
    data,
  }) as Promise<Collection>;
}

export async function updateCollection(id: string, data: Record<string, unknown>) {
  return dataProxy({
    action: "update",
    collectionId: "collections",
    documentId: id,
    data,
  }) as Promise<Collection>;
}

export async function deleteCollection(id: string) {
  await dataProxy({
    action: "delete",
    collectionId: "collections",
    documentId: id,
  });
}
