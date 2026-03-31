"use client";

import { ID, Query } from "appwrite";

import { COLLECTION_IDS, DATABASE_ID, databases } from "./config";
import type { Invoice } from "./types";

export async function getInvoices(limit = 100, offset = 0) {
  const response = await databases.listDocuments<Invoice>(DATABASE_ID, COLLECTION_IDS.invoices, [
    Query.limit(limit),
    Query.offset(offset),
    Query.orderDesc("$createdAt"),
  ]);
  return response;
}

export async function getInvoice(id: string) {
  const response = await databases.getDocument<Invoice>(DATABASE_ID, COLLECTION_IDS.invoices, id);
  return response;
}

export async function createInvoice(data: Record<string, unknown>) {
  const response = await databases.createDocument(DATABASE_ID, COLLECTION_IDS.invoices, ID.unique(), data);
  return response as unknown as Invoice;
}

export async function updateInvoice(id: string, data: Record<string, unknown>) {
  const response = await databases.updateDocument(DATABASE_ID, COLLECTION_IDS.invoices, id, data);
  return response as unknown as Invoice;
}

export async function deleteInvoice(id: string) {
  await databases.deleteDocument(DATABASE_ID, COLLECTION_IDS.invoices, id);
}

export async function getNextInvoiceNumber(): Promise<string> {
  const response = await databases.listDocuments<Invoice>(DATABASE_ID, COLLECTION_IDS.invoices, [
    Query.orderDesc("$createdAt"),
    Query.limit(1),
  ]);
  if (response.documents.length === 0) {
    return "1001";
  }
  const lastNumber = Number.parseInt(response.documents[0].invoiceNumber, 10);
  return String(Number.isNaN(lastNumber) ? 1001 : lastNumber + 1);
}
