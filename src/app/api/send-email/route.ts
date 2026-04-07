import { type NextRequest, NextResponse } from "next/server";

const PICA_API_URL = "https://api.picaos.com/v1/passthrough/gmail/send-email";
const PICA_SECRET = process.env.PICA_SECRET_KEY!;
const PICA_CONNECTION_KEY = process.env.PICA_GMAIL_CONNECTION_KEY!;
const PICA_ACTION_ID = "conn_mod_def::GGXAjWkZO8U::uMc1LQIHTTKzeMm3rLL5gQ";

async function sendEmail(to: string, subject: string, body: string) {
  const response = await fetch(PICA_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-pica-secret": PICA_SECRET,
      "x-pica-connection-key": PICA_CONNECTION_KEY,
      "x-pica-action-id": PICA_ACTION_ID,
    },
    body: JSON.stringify({
      to,
      subject,
      body,
      mimeType: "text/html",
      connectionKey: PICA_CONNECTION_KEY,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Pica email failed: ${err}`);
  }

  return response.json();
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

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: "#f59e0b",
    confirmed: "#3b82f6",
    shipped: "#8b5cf6",
    delivered: "#22c55e",
    cancelled: "#ef4444",
  };
  return colors[status] || "#6b7280";
}

function buildStatusEmailHtml(
  customerName: string,
  orderId: string,
  status: string,
  items: Array<{ name: string; quantity: number; price: number; size?: string; color?: string }>,
  total: number,
  trackingNumber?: string,
  courier?: string,
): string {
  const statusLabel = getStatusLabel(status);
  const statusColor = getStatusColor(status);

  let statusMessage = "";
  switch (status) {
    case "confirmed":
      statusMessage = "Great news! Your order has been confirmed and is being prepared.";
      break;
    case "shipped":
      statusMessage = "Your order is on its way!";
      break;
    case "delivered":
      statusMessage = "Your order has been delivered. We hope you love your purchase!";
      break;
    case "cancelled":
      statusMessage = "Your order has been cancelled. If you have questions, please contact us.";
      break;
    default:
      statusMessage = "Your order status has been updated.";
  }

  const itemsHtml = items
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${item.name}${item.size ? ` (${item.size})` : ""}${item.color ? ` - ${item.color}` : ""}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">&#8377;${(item.price * item.quantity).toLocaleString("en-IN")}</td>
        </tr>`,
    )
    .join("");

  const trackingHtml =
    status === "shipped" && trackingNumber
      ? `<div style="background:#f3f4f6;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="margin:0 0 4px;font-weight:600;color:#374151;">Tracking Information</p>
          <p style="margin:0;color:#6b7280;">${courier ? `Courier: ${courier}<br/>` : ""}Tracking Number: <strong>${trackingNumber}</strong></p>
        </div>`
      : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:#000;padding:24px;text-align:center;border-radius:12px 12px 0 0;">
      <h1 style="color:#fff;margin:0;font-size:24px;letter-spacing:2px;">VPPA FASHIONS</h1>
    </div>
    <div style="background:#fff;padding:32px;border-radius:0 0 12px 12px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <div style="text-align:center;margin-bottom:24px;">
        <span style="display:inline-block;background:${statusColor};color:#fff;padding:6px 16px;border-radius:20px;font-size:14px;font-weight:600;">${statusLabel}</span>
      </div>
      <p style="color:#374151;font-size:16px;line-height:1.6;">Hi ${customerName},</p>
      <p style="color:#374151;font-size:16px;line-height:1.6;">${statusMessage}</p>
      <p style="color:#6b7280;font-size:14px;">Order ID: <strong>${orderId}</strong></p>
      ${trackingHtml}
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:8px 12px;text-align:left;font-size:13px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Item</th>
            <th style="padding:8px 12px;text-align:center;font-size:13px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Qty</th>
            <th style="padding:8px 12px;text-align:right;font-size:13px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Amount</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding:12px;text-align:right;font-weight:700;font-size:15px;border-top:2px solid #e5e7eb;">Total</td>
            <td style="padding:12px;text-align:right;font-weight:700;font-size:15px;border-top:2px solid #e5e7eb;">&#8377;${total.toLocaleString("en-IN")}</td>
          </tr>
        </tfoot>
      </table>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
      <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">
        VPPA Fashions | No.161/1, Ground Floor, 100 Feet Rd, 3rd Block, Sir M Vishveswaraya Layout, Ullal, Bengaluru, Karnataka 560110
        <br/>Phone: +91 90716 91999 | GSTIN: 29DLFPG6129H1ZY
        <br/>Email: vppafashions@gmail.com
      </p>
    </div>
  </div>
</body>
</html>`;
}

function buildNewOrderAdminEmailHtml(
  customerName: string,
  email: string,
  phone: string,
  orderId: string,
  items: Array<{ name: string; quantity: number; price: number; size?: string; color?: string }>,
  total: number,
  address: string,
): string {
  const itemsHtml = items
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${item.name}${item.size ? ` (${item.size})` : ""}${item.color ? ` - ${item.color}` : ""}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">&#8377;${(item.price * item.quantity).toLocaleString("en-IN")}</td>
        </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:#000;padding:24px;text-align:center;border-radius:12px 12px 0 0;">
      <h1 style="color:#fff;margin:0;font-size:24px;letter-spacing:2px;">VPPA FASHIONS</h1>
      <p style="color:#9ca3af;margin:4px 0 0;font-size:14px;">New Order Received</p>
    </div>
    <div style="background:#fff;padding:32px;border-radius:0 0 12px 12px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:16px;margin-bottom:24px;">
        <p style="margin:0;color:#065f46;font-weight:600;font-size:16px;">New Order #${orderId}</p>
        <p style="margin:4px 0 0;color:#065f46;">Total: &#8377;${total.toLocaleString("en-IN")}</p>
      </div>
      <h3 style="color:#374151;margin:0 0 12px;">Customer Details</h3>
      <table style="width:100%;margin-bottom:20px;">
        <tr><td style="padding:4px 0;color:#6b7280;width:100px;">Name</td><td style="padding:4px 0;color:#111827;font-weight:500;">${customerName}</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280;">Email</td><td style="padding:4px 0;color:#111827;font-weight:500;">${email}</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280;">Phone</td><td style="padding:4px 0;color:#111827;font-weight:500;">${phone || "N/A"}</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280;vertical-align:top;">Address</td><td style="padding:4px 0;color:#111827;font-weight:500;">${address || "N/A"}</td></tr>
      </table>
      <h3 style="color:#374151;margin:0 0 12px;">Order Items</h3>
      <table style="width:100%;border-collapse:collapse;margin:0 0 16px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:8px 12px;text-align:left;font-size:13px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Item</th>
            <th style="padding:8px 12px;text-align:center;font-size:13px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Qty</th>
            <th style="padding:8px 12px;text-align:right;font-size:13px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Amount</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding:12px;text-align:right;font-weight:700;font-size:15px;border-top:2px solid #e5e7eb;">Total</td>
            <td style="padding:12px;text-align:right;font-weight:700;font-size:15px;border-top:2px solid #e5e7eb;">&#8377;${total.toLocaleString("en-IN")}</td>
          </tr>
        </tfoot>
      </table>
      <p style="color:#6b7280;font-size:13px;text-align:center;">
        <a href="https://backoffice.vppafashions.com/dashboard/orders" style="color:#3b82f6;text-decoration:none;font-weight:600;">View in Backoffice &rarr;</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  // Verify Pica keys are configured
  if (!PICA_SECRET || !PICA_CONNECTION_KEY) {
    return NextResponse.json({ error: "Email service not configured" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { type } = body;

    if (type === "order-status-change") {
      // Send status update email to customer
      const { customerName, customerEmail, orderId, status, items, total, trackingNumber, courier } = body;

      if (!customerEmail || !orderId || !status) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }

      const parsedItems = typeof items === "string" ? JSON.parse(items) : items || [];
      const html = buildStatusEmailHtml(
        customerName || "Customer",
        orderId,
        status,
        parsedItems,
        total || 0,
        trackingNumber,
        courier,
      );
      const subject = `VPPA Fashions - ${getStatusLabel(status)} | Order #${orderId.slice(0, 8)}`;

      const result = await sendEmail(customerEmail, subject, html);
      return NextResponse.json({ success: true, result });
    }

    if (type === "new-order") {
      // Send new order notification to admin
      const { customerName, customerEmail, phone, orderId, items, total, address } = body;

      if (!orderId) {
        return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
      }

      const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "vppafashions@gmail.com";
      const parsedItems = typeof items === "string" ? JSON.parse(items) : items || [];
      const html = buildNewOrderAdminEmailHtml(
        customerName || "Customer",
        customerEmail || "",
        phone || "",
        orderId,
        parsedItems,
        total || 0,
        address || "",
      );
      const subject = `New Order Received! #${orderId.slice(0, 8)} - ₹${(total || 0).toLocaleString("en-IN")}`;

      const result = await sendEmail(adminEmail, subject, html);
      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json({ error: "Invalid email type" }, { status: 400 });
  } catch (error: unknown) {
    console.error("Send email error:", error);
    const message = error instanceof Error ? error.message : "Failed to send email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
