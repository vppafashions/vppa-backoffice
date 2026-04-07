"use client";

import type { HsnCode } from "./types";

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

export async function getHsnCodes(limit = 100, offset = 0) {
  return dataProxy({
    action: "list",
    collectionId: "hsn-codes",
    queries: [
      { method: "limit", args: [limit] },
      { method: "offset", args: [offset] },
      { method: "orderAsc", args: ["code"] },
    ],
  });
}

export async function getHsnCode(id: string) {
  return dataProxy({
    action: "get",
    collectionId: "hsn-codes",
    documentId: id,
  }) as Promise<HsnCode>;
}

export async function createHsnCode(data: Record<string, unknown>) {
  return dataProxy({
    action: "create",
    collectionId: "hsn-codes",
    data,
  }) as Promise<HsnCode>;
}

export async function updateHsnCode(id: string, data: Record<string, unknown>) {
  return dataProxy({
    action: "update",
    collectionId: "hsn-codes",
    documentId: id,
    data,
  }) as Promise<HsnCode>;
}

export async function deleteHsnCode(id: string) {
  await dataProxy({
    action: "delete",
    collectionId: "hsn-codes",
    documentId: id,
  });
}
