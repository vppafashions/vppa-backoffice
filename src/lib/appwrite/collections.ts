"use client";

import { ID, Query } from "appwrite";

import { COLLECTION_IDS, DATABASE_ID, databases } from "./config";
import type { Collection } from "./types";

export async function getCollections(limit = 100, offset = 0) {
  const response = await databases.listDocuments<Collection>(DATABASE_ID, COLLECTION_IDS.collections, [
    Query.limit(limit),
    Query.offset(offset),
    Query.orderDesc("$createdAt"),
  ]);
  return response;
}

export async function getCollection(id: string) {
  const response = await databases.getDocument<Collection>(DATABASE_ID, COLLECTION_IDS.collections, id);
  return response;
}

export async function createCollection(data: Record<string, unknown>) {
  const response = await databases.createDocument(DATABASE_ID, COLLECTION_IDS.collections, ID.unique(), data);
  return response as unknown as Collection;
}

export async function updateCollection(id: string, data: Record<string, unknown>) {
  const response = await databases.updateDocument(DATABASE_ID, COLLECTION_IDS.collections, id, data);
  return response as unknown as Collection;
}

export async function deleteCollection(id: string) {
  await databases.deleteDocument(DATABASE_ID, COLLECTION_IDS.collections, id);
}
