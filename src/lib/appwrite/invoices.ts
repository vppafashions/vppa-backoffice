"use client";

import type { Invoice } from "./types";

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

export async function getInvoices(limit = 100, offset = 0) {
  return dataProxy({
    action: "list",
    collectionId: "invoices",
    queries: [
      { method: "limit", args: [limit] },
      { method: "offset", args: [offset] },
      { method: "orderDesc", args: ["$createdAt"] },
    ],
  });
}

export async function getInvoice(id: string) {
  return dataProxy({
    action: "get",
    collectionId: "invoices",
    documentId: id,
  }) as Promise<Invoice>;
}

export async function createInvoice(data: Record<string, unknown>) {
  return dataProxy({
    action: "create",
    collectionId: "invoices",
    data,
  }) as Promise<Invoice>;
}

export async function updateInvoice(id: string, data: Record<string, unknown>) {
  return dataProxy({
    action: "update",
    collectionId: "invoices",
    documentId: id,
    data,
  }) as Promise<Invoice>;
}

export async function deleteInvoice(id: string) {
  await dataProxy({
    action: "delete",
    collectionId: "invoices",
    documentId: id,
  });
}

export async function getNextInvoiceNumber(): Promise<string> {
  const response = await dataProxy({
    action: "list",
    collectionId: "invoices",
    queries: [
      { method: "orderDesc", args: ["$createdAt"] },
      { method: "limit", args: [1] },
    ],
  });
  if (response.documents.length === 0) {
    return "1001";
  }
  const lastNumber = Number.parseInt(response.documents[0].invoiceNumber, 10);
  return String(Number.isNaN(lastNumber) ? 1001 : lastNumber + 1);
}
