"use client";

import { Query } from "appwrite";

import { COLLECTION_IDS, DATABASE_ID, databases } from "./config";
import type { Hero } from "./types";

export async function getHeroes(limit = 100, offset = 0) {
  const response = await databases.listDocuments<Hero>(DATABASE_ID, COLLECTION_IDS.heroes, [
    Query.limit(limit),
    Query.offset(offset),
    Query.orderAsc("$createdAt"),
  ]);
  return response;
}

export async function getHero(id: string) {
  const response = await databases.getDocument<Hero>(DATABASE_ID, COLLECTION_IDS.heroes, id);
  return response;
}

export async function updateHero(id: string, data: Record<string, unknown>) {
  const response = await databases.updateDocument(DATABASE_ID, COLLECTION_IDS.heroes, id, data);
  return response as unknown as Hero;
}
