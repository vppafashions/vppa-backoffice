"use client";

import type { Coupon } from "./types";

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

export async function getCoupons(limit = 100, offset = 0) {
  return dataProxy({
    action: "list",
    collectionId: "coupons",
    queries: [
      { method: "limit", args: [limit] },
      { method: "offset", args: [offset] },
      { method: "orderDesc", args: ["$createdAt"] },
    ],
  });
}

export async function getCouponById(id: string) {
  return dataProxy({
    action: "get",
    collectionId: "coupons",
    documentId: id,
  }) as Promise<Coupon>;
}

export async function createCoupon(data: Record<string, unknown>) {
  return dataProxy({
    action: "create",
    collectionId: "coupons",
    data,
  }) as Promise<Coupon>;
}

export async function updateCoupon(id: string, data: Record<string, unknown>) {
  return dataProxy({
    action: "update",
    collectionId: "coupons",
    documentId: id,
    data,
  }) as Promise<Coupon>;
}

export async function deleteCoupon(id: string) {
  return dataProxy({
    action: "delete",
    collectionId: "coupons",
    documentId: id,
  });
}
