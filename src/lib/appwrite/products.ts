"use client";

import { ID, Query } from "appwrite";

import { COLLECTION_IDS, DATABASE_ID, databases } from "./config";
import type { Product } from "./types";

export async function getProducts(limit = 100, offset = 0) {
  const response = await databases.listDocuments<Product>(DATABASE_ID, COLLECTION_IDS.products, [
    Query.limit(limit),
    Query.offset(offset),
    Query.orderDesc("$createdAt"),
  ]);
  return response;
}

export async function getProduct(id: string) {
  const response = await databases.getDocument<Product>(DATABASE_ID, COLLECTION_IDS.products, id);
  return response;
}

export async function createProduct(data: Record<string, unknown>) {
  const response = await databases.createDocument(DATABASE_ID, COLLECTION_IDS.products, ID.unique(), data);
  return response as unknown as Product;
}

export async function updateProduct(id: string, data: Record<string, unknown>) {
  const response = await databases.updateDocument(DATABASE_ID, COLLECTION_IDS.products, id, data);
  return response as unknown as Product;
}

export async function deleteProduct(id: string) {
  await databases.deleteDocument(DATABASE_ID, COLLECTION_IDS.products, id);
}
