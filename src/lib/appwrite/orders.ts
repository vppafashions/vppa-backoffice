"use client";

import type { Order } from "./types";

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

export async function getOrders(limit = 100, offset = 0) {
  return dataProxy({
    action: "list",
    collectionId: "orders",
    queries: [
      { method: "limit", args: [limit] },
      { method: "offset", args: [offset] },
      { method: "orderDesc", args: ["$createdAt"] },
    ],
  });
}

export async function getOrder(id: string) {
  return dataProxy({
    action: "get",
    collectionId: "orders",
    documentId: id,
  }) as Promise<Order>;
}

export async function updateOrderStatus(id: string, status: Order["status"], currentTimeline?: string) {
  // Parse existing timeline or start fresh
  let timeline: Record<string, string> = {};
  if (currentTimeline) {
    try {
      timeline = JSON.parse(currentTimeline);
    } catch {
      // ignore
    }
  }
  // Set the timestamp for the new status
  timeline[status] = new Date().toISOString();

  return dataProxy({
    action: "update",
    collectionId: "orders",
    documentId: id,
    data: { status, statusTimeline: JSON.stringify(timeline) },
  }) as Promise<Order>;
}

export async function sendOrderStatusEmail(order: Order, status: Order["status"]) {
  try {
    await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "order-status-change",
        customerName: order.customerName,
        customerEmail: order.email,
        orderId: order.$id,
        status,
        items: order.items,
        total: order.total,
        trackingNumber: order.trackingNumber,
        courier: order.courier,
      }),
    });
  } catch (error) {
    console.error("Failed to send status email:", error);
  }
}

export async function sendNewOrderEmail(order: Order) {
  try {
    await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "new-order",
        customerName: order.customerName,
        customerEmail: order.email,
        phone: order.phone,
        orderId: order.$id,
        items: order.items,
        total: order.total,
        address: order.address,
      }),
    });
  } catch (error) {
    console.error("Failed to send new order email:", error);
  }
}

export async function updateOrderTracking(id: string, trackingNumber: string, courier: string) {
  return dataProxy({
    action: "update",
    collectionId: "orders",
    documentId: id,
    data: { trackingNumber, courier },
  }) as Promise<Order>;
}
