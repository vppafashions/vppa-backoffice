"use client";

import { calculateInvoiceItem, calculateInvoiceTotals } from "../invoice-pdf";
import type { Invoice, Order, OrderItem } from "./types";

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

export async function getNextInvoiceNumber(prefix: "ECOM" | "STORE" = "STORE"): Promise<string> {
  const response = await dataProxy({
    action: "list",
    collectionId: "invoices",
    queries: [
      { method: "orderDesc", args: ["$createdAt"] },
      { method: "limit", args: [100] },
    ],
  });
  const docs = response.documents as Invoice[];
  const prefixPattern = `${prefix}-`;
  const matching = docs
    .filter((d: Invoice) => d.invoiceNumber.startsWith(prefixPattern))
    .map((d: Invoice) => Number.parseInt(d.invoiceNumber.replace(prefixPattern, ""), 10))
    .filter((n: number) => !Number.isNaN(n));
  const maxNum = matching.length > 0 ? Math.max(...matching) : 1000;
  return `${prefix}-${maxNum + 1}`;
}

export async function findInvoiceByOrderId(orderId: string): Promise<Invoice | null> {
  const response = await dataProxy({
    action: "list",
    collectionId: "invoices",
    queries: [
      { method: "equal", args: ["orderNumber", [`#${orderId.slice(0, 8)}`]] },
      { method: "limit", args: [1] },
    ],
  });
  return response.documents.length > 0 ? (response.documents[0] as Invoice) : null;
}

export async function generateInvoiceFromOrder(order: Order): Promise<Invoice> {
  const invoiceNumber = await getNextInvoiceNumber("ECOM");
  const today = new Date().toISOString().split("T")[0];

  let orderItems: OrderItem[] = [];
  try {
    orderItems = JSON.parse(order.items);
  } catch {
    orderItems = [];
  }

  const invoiceItems = orderItems.map((item) =>
    calculateInvoiceItem(
      `${item.name}${item.size ? ` (${item.size})` : ""}${item.color ? ` - ${item.color}` : ""}`,
      item.quantity,
      item.price,
      item.price,
    ),
  );

  const totals = calculateInvoiceTotals(invoiceItems, 0, 0);

  const data = {
    invoiceNumber,
    invoiceDate: today,
    orderNumber: `#${order.$id.slice(0, 8)}`,
    orderDate: order.$createdAt ? order.$createdAt.split("T")[0] : today,
    customerName: order.customerName,
    customerAddress: order.address || "",
    customerPhone: order.phone || "",
    customerEmail: order.email || "",
    customerPin: "",
    customerState: "",
    stateCode: "",
    placeOfSupply: "",
    modeOfTransport: "",
    items: JSON.stringify(invoiceItems),
    subtotal: totals.subtotal,
    taxableAmount: totals.taxableAmount,
    cgstAmount: totals.cgstAmount,
    sgstAmount: totals.sgstAmount,
    totalTax: totals.totalTax,
    shippingAmount: 0,
    discount: 0,
    grandTotal: totals.grandTotal,
    status: "paid" as const,
  };

  return createInvoice(data);
}
