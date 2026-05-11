"use client";

import type { Models } from "appwrite";

import type { Review } from "./types";

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

export async function getReviews(limit = 200, offset = 0) {
  return dataProxy({
    action: "list",
    collectionId: "reviews",
    queries: [
      { method: "limit", args: [limit] },
      { method: "offset", args: [offset] },
      { method: "orderDesc", args: ["$createdAt"] },
    ],
  }) as Promise<Models.DocumentList<Review>>;
}

export async function getReviewsByProduct(productId: string, limit = 200) {
  return dataProxy({
    action: "list",
    collectionId: "reviews",
    queries: [
      { method: "equal", args: ["productId", productId] },
      { method: "orderDesc", args: ["$createdAt"] },
      { method: "limit", args: [limit] },
    ],
  }) as Promise<Models.DocumentList<Review>>;
}

export async function deleteReview(id: string) {
  await dataProxy({
    action: "delete",
    collectionId: "reviews",
    documentId: id,
  });
}

export async function updateReview(id: string, data: Partial<Pick<Review, "approved" | "title" | "comment">>) {
  return dataProxy({
    action: "update",
    collectionId: "reviews",
    documentId: id,
    data,
  }) as Promise<Review>;
}
