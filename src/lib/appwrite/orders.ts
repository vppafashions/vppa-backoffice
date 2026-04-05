"use client";

import type { Order } from "./types";

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

export async function getOrders(limit = 100, offset = 0) {
  return dataProxy({
    action: "list",
    collectionId: "orders",
    queries: [
      { method: "limit", args: [limit] },
      { method: "offset", args: [offset] },
      { method: "orderDesc", args: ["$createdAt"] },
    ],
  });
}

export async function getOrder(id: string) {
  return dataProxy({
    action: "get",
    collectionId: "orders",
    documentId: id,
  }) as Promise<Order>;
}

export async function updateOrderStatus(id: string, status: Order["status"]) {
  return dataProxy({
    action: "update",
    collectionId: "orders",
    documentId: id,
    data: { status },
  }) as Promise<Order>;
}

export async function updateOrderTracking(id: string, trackingNumber: string, courier: string) {
  return dataProxy({
    action: "update",
    collectionId: "orders",
    documentId: id,
    data: { trackingNumber, courier },
  }) as Promise<Order>;
}
