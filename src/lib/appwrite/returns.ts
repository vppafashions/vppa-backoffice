"use client";

import type { ReturnRequest, ReturnStatus } from "./types";

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

export async function getReturns(limit = 100, offset = 0) {
  return dataProxy({
    action: "list",
    collectionId: "returns",
    queries: [
      { method: "limit", args: [limit] },
      { method: "offset", args: [offset] },
      { method: "orderDesc", args: ["$createdAt"] },
    ],
  });
}

export async function getReturnsByStatus(status: ReturnStatus) {
  return dataProxy({
    action: "list",
    collectionId: "returns",
    queries: [
      { method: "equal", args: ["status", [status]] },
      { method: "orderDesc", args: ["$createdAt"] },
      { method: "limit", args: [100] },
    ],
  });
}

export async function getReturnById(id: string) {
  return dataProxy({
    action: "get",
    collectionId: "returns",
    documentId: id,
  }) as Promise<ReturnRequest>;
}

export async function updateReturnStatus(
  id: string,
  status: ReturnStatus,
  currentTimeline?: string,
  adminNotes?: string,
  refundAmount?: number,
  refundMethod?: string,
  razorpayRefundId?: string,
) {
  let timeline: Record<string, string> = {};
  if (currentTimeline) {
    try {
      timeline = JSON.parse(currentTimeline);
    } catch {
      // ignore
    }
  }
  timeline[status] = new Date().toISOString();

  const data: Record<string, unknown> = {
    status,
    statusTimeline: JSON.stringify(timeline),
  };
  if (adminNotes !== undefined) data.adminNotes = adminNotes;
  if (refundAmount !== undefined) data.refundAmount = refundAmount;
  if (refundMethod !== undefined) data.refundMethod = refundMethod;
  if (razorpayRefundId !== undefined) data.razorpayRefundId = razorpayRefundId;

  return dataProxy({
    action: "update",
    collectionId: "returns",
    documentId: id,
    data,
  }) as Promise<ReturnRequest>;
}

export async function sendReturnStatusEmail(returnReq: ReturnRequest, status: ReturnStatus) {
  try {
    await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "return-status-change",
        customerName: returnReq.customerName,
        customerEmail: returnReq.customerEmail,
        returnId: returnReq.$id,
        orderId: returnReq.orderId,
        status,
        items: returnReq.items,
        refundAmount: returnReq.refundAmount,
        reason: returnReq.reason,
      }),
    });
  } catch (error) {
    console.error("Failed to send return status email:", error);
  }
}

export async function processRazorpayRefund(paymentId: string, amount: number) {
  const res = await fetch("/api/refund", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paymentId, amount }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Refund failed");
  }
  return res.json();
}
