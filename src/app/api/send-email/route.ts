import { type NextRequest, NextResponse } from "next/server";

const PICA_API_URL = "https://api.picaos.com/v1/passthrough/gmail/send-email";
const PICA_SECRET = process.env.PICA_SECRET_KEY!;
const PICA_CONNECTION_KEY = process.env.PICA_GMAIL_CONNECTION_KEY!;
const PICA_ACTION_ID = "conn_mod_def::GGXAjWkZO8U::uMc1LQIHTTKzeMm3rLL5gQ";

const SIGNATURE = [
  "",
  "--",
  "VPPA Fashions",
  "No.161/1, Ground Floor, 100 Feet Rd, 3rd Block,",
  "Sir M Vishveswaraya Layout, Ullal, Bengaluru, Karnataka 560110",
  "Phone: +91 90716 91999 | GSTIN: 29DLFPG6129H1ZY",
  "Email: vppafashions@gmail.com",
].join("\r\n");

function buildRawMime(to: string, subject: string, textBody: string): string {
  const mimeMessage = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    textBody,
  ].join("\r\n");

  return Buffer.from(mimeMessage).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sendEmail(to: string, subject: string, body: string) {
  const raw = buildRawMime(to, subject, body);

  const response = await fetch(PICA_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-pica-secret": PICA_SECRET,
      "x-pica-connection-key": PICA_CONNECTION_KEY,
      "x-pica-action-id": PICA_ACTION_ID,
    },
    body: JSON.stringify({
      raw,
      connectionKey: PICA_CONNECTION_KEY,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Pica email failed: ${err}`);
  }

  return response.json();
}

type EmailItem = { name: string; quantity: number; price: number; size?: string; color?: string };

function formatRupees(n: number): string {
  return `Rs.${n.toLocaleString("en-IN")}`;
}

function formatItemLines(items: EmailItem[]): string {
  if (!items.length) return "  (no items)";
  return items
    .map((item) => {
      const variant = [item.size, item.color].filter(Boolean).join(" / ");
      return `  - ${item.name}${variant ? ` (${variant})` : ""} x${item.quantity}   ${formatRupees(item.price * item.quantity)}`;
    })
    .join("\r\n");
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "Order Placed",
    confirmed: "Order Confirmed",
    shipped: "Order Shipped",
    delivered: "Order Delivered",
    cancelled: "Order Cancelled",
  };
  return labels[status] || status;
}

function getStatusMessage(status: string): string {
  switch (status) {
    case "confirmed":
      return "Great news! Your order has been confirmed and is being prepared.";
    case "shipped":
      return "Your order is on its way.";
    case "delivered":
      return "Your order has been delivered. We hope you love your purchase!";
    case "cancelled":
      return "Your order has been cancelled. If you have any questions, please contact us.";
    default:
      return "Your order status has been updated.";
  }
}

function buildStatusEmailText(
  customerName: string,
  orderId: string,
  status: string,
  items: EmailItem[],
  total: number,
  trackingNumber?: string,
  courier?: string,
): string {
  const lines: string[] = [
    `Hi ${customerName},`,
    "",
    getStatusMessage(status),
    "",
    `Status: ${getStatusLabel(status)}`,
    `Order Number: #${orderId.slice(0, 8)}`,
  ];

  if (status === "shipped" && trackingNumber) {
    lines.push("");
    lines.push("Tracking Information");
    if (courier) lines.push(`Courier: ${courier}`);
    lines.push(`Tracking Number: ${trackingNumber}`);
  }

  lines.push("");
  lines.push("Items:");
  lines.push(formatItemLines(items));
  lines.push("");
  lines.push(`Total: ${formatRupees(total)}`);
  lines.push("");
  lines.push("Track your order anytime at https://vppafashions.com/my-orders");
  lines.push(SIGNATURE);
  return lines.join("\r\n");
}

function getReturnStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    requested: "Return Requested",
    approved: "Return Approved",
    rejected: "Return Rejected",
    picked_up: "Item Picked Up",
    refunded: "Refund Processed",
  };
  return labels[status] || status;
}

function getReturnStatusMessage(status: string, refundAmount: number): string {
  switch (status) {
    case "requested":
      return "We have received your return request and will review it shortly.";
    case "approved":
      return "Your return request has been approved. We will arrange pickup soon.";
    case "rejected":
      return "Unfortunately, your return request has been rejected. Please contact us for more details.";
    case "picked_up":
      return "Your return item has been picked up. We will process your refund shortly.";
    case "refunded":
      return `Your refund of ${formatRupees(refundAmount)} has been processed. It may take 5-7 business days to reflect in your account.`;
    default:
      return "Your return status has been updated.";
  }
}

function buildReturnStatusEmailText(
  customerName: string,
  returnId: string,
  orderId: string,
  status: string,
  items: EmailItem[],
  refundAmount: number,
  reason: string,
): string {
  const lines: string[] = [
    `Hi ${customerName},`,
    "",
    getReturnStatusMessage(status, refundAmount),
    "",
    `Status: ${getReturnStatusLabel(status)}`,
    `Return ID: #${returnId.slice(0, 8)}`,
    `Order ID: #${orderId.slice(0, 8)}`,
  ];

  if (reason) {
    lines.push(`Reason: ${reason}`);
  }

  if (refundAmount > 0) {
    lines.push("");
    lines.push(`Refund Amount: ${formatRupees(refundAmount)}`);
  }

  lines.push("");
  lines.push("Items:");
  lines.push(formatItemLines(items));
  lines.push(SIGNATURE);
  return lines.join("\r\n");
}

function buildNewOrderAdminEmailText(
  customerName: string,
  email: string,
  phone: string,
  orderId: string,
  items: EmailItem[],
  total: number,
  address: string,
): string {
  return [
    `New order #${orderId.slice(0, 8)}`,
    "",
    `Customer: ${customerName}`,
    `Email: ${email}`,
    `Phone: ${phone || "N/A"}`,
    `Address: ${address || "N/A"}`,
    "",
    "Items:",
    formatItemLines(items),
    "",
    `Total: ${formatRupees(total)}`,
    "",
    "Manage in backoffice: https://backoffice.vppafashions.com/dashboard/orders",
  ].join("\r\n");
}

export async function POST(req: NextRequest) {
  if (!PICA_SECRET || !PICA_CONNECTION_KEY) {
    return NextResponse.json({ error: "Email service not configured" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { type } = body;

    if (type === "order-status-change") {
      const { customerName, customerEmail, orderId, status, items, total, trackingNumber, courier } = body;

      if (!customerEmail || !orderId || !status) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }

      const parsedItems = typeof items === "string" ? JSON.parse(items) : items || [];
      const text = buildStatusEmailText(
        customerName || "Customer",
        orderId,
        status,
        parsedItems,
        total || 0,
        trackingNumber,
        courier,
      );
      const subject = `VPPA Fashions - ${getStatusLabel(status)} | Order #${orderId.slice(0, 8)}`;

      const result = await sendEmail(customerEmail, subject, text);
      return NextResponse.json({ success: true, result });
    }

    if (type === "new-order") {
      const { customerName, customerEmail, phone, orderId, items, total, address } = body;

      if (!orderId) {
        return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
      }

      const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "vppafashions@gmail.com";
      const parsedItems = typeof items === "string" ? JSON.parse(items) : items || [];
      const text = buildNewOrderAdminEmailText(
        customerName || "Customer",
        customerEmail || "",
        phone || "",
        orderId,
        parsedItems,
        total || 0,
        address || "",
      );
      const subject = `New Order Received! #${orderId.slice(0, 8)} - Rs.${(total || 0).toLocaleString("en-IN")}`;

      const result = await sendEmail(adminEmail, subject, text);
      return NextResponse.json({ success: true, result });
    }

    if (type === "return-status-change") {
      const { customerName, customerEmail, returnId, orderId, status, items, refundAmount, reason } = body;

      if (!customerEmail || !returnId || !status) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }

      const parsedItems = typeof items === "string" ? JSON.parse(items) : items || [];
      const text = buildReturnStatusEmailText(
        customerName || "Customer",
        returnId,
        orderId,
        status,
        parsedItems,
        refundAmount || 0,
        reason || "",
      );
      const subject = `VPPA Fashions - ${getReturnStatusLabel(status)} | Return #${returnId.slice(0, 8)}`;

      const result = await sendEmail(customerEmail, subject, text);
      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json({ error: "Invalid email type" }, { status: 400 });
  } catch (error: unknown) {
    console.error("Send email error:", error);
    const message = error instanceof Error ? error.message : "Failed to send email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
