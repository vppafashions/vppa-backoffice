"use client";

import { Query } from "appwrite";

import { COLLECTION_IDS, DATABASE_ID, databases } from "./config";
import type { Order } from "./types";

export async function getOrders(limit = 100, offset = 0) {
  const response = await databases.listDocuments<Order>(DATABASE_ID, COLLECTION_IDS.orders, [
    Query.limit(limit),
    Query.offset(offset),
    Query.orderDesc("$createdAt"),
  ]);
  return response;
}

export async function getOrder(id: string) {
  const response = await databases.getDocument<Order>(DATABASE_ID, COLLECTION_IDS.orders, id);
  return response;
}

export async function updateOrderStatus(id: string, status: Order["status"]) {
  const response = await databases.updateDocument(DATABASE_ID, COLLECTION_IDS.orders, id, { status });
  return response as unknown as Order;
}

export async function updateOrderTracking(id: string, trackingNumber: string, courier: string) {
  const response = await databases.updateDocument(DATABASE_ID, COLLECTION_IDS.orders, id, {
    trackingNumber,
    courier,
  });
  return response as unknown as Order;
}
