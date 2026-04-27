"use client";

import type { Product } from "./types";

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

export async function getProducts(limit = 100, offset = 0) {
  return dataProxy({
    action: "list",
    collectionId: "products",
    queries: [
      { method: "limit", args: [limit] },
      { method: "offset", args: [offset] },
      { method: "orderDesc", args: ["$createdAt"] },
    ],
  });
}

export async function getProduct(id: string) {
  return dataProxy({
    action: "get",
    collectionId: "products",
    documentId: id,
  }) as Promise<Product>;
}

export async function createProduct(data: Record<string, unknown>) {
  return dataProxy({
    action: "create",
    collectionId: "products",
    data,
  }) as Promise<Product>;
}

export async function updateProduct(id: string, data: Record<string, unknown>) {
  return dataProxy({
    action: "update",
    collectionId: "products",
    documentId: id,
    data,
  }) as Promise<Product>;
}

export async function deleteProduct(id: string) {
  await dataProxy({
    action: "delete",
    collectionId: "products",
    documentId: id,
  });
  // Also delete linked extras (ignore if not found)
  try {
    await dataProxy({
      action: "delete",
      collectionId: "productExtras",
      documentId: id,
    });
  } catch {
    // extras doc may not exist for older products
  }
}

// --- Product Extras (linked by same $id) ---

export interface ProductExtras {
  returnPolicy?: string;
  colorImages?: string;
  stickerLabel2?: string;
}

export async function getProductExtras(id: string): Promise<ProductExtras> {
  try {
    return await dataProxy({
      action: "get",
      collectionId: "productExtras",
      documentId: id,
    });
  } catch {
    return {};
  }
}

export async function saveProductExtras(id: string, data: ProductExtras, isNew: boolean) {
  if (isNew) {
    return dataProxy({
      action: "create",
      collectionId: "productExtras",
      documentId: id,
      data,
    });
  }
  // Try update first; if it doesn't exist yet, create it
  try {
    return await dataProxy({
      action: "update",
      collectionId: "productExtras",
      documentId: id,
      data,
    });
  } catch {
    return dataProxy({
      action: "create",
      collectionId: "productExtras",
      documentId: id,
      data,
    });
  }
}
