import { type NextRequest, NextResponse } from "next/server";

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";

export async function POST(req: NextRequest) {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    return NextResponse.json({ error: "Razorpay not configured" }, { status: 500 });
  }

  // Verify session cookie for auth
  const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "69aaa3a900228aff9ae5";
  const session = req.cookies.get(`a_session_${PROJECT_ID}`)?.value;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { paymentId, amount } = await req.json();

    if (!paymentId || !amount) {
      return NextResponse.json({ error: "Missing paymentId or amount" }, { status: 400 });
    }

    // Razorpay refund API - amount is in paise
    const amountInPaise = Math.round(amount * 100);

    const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64")}`,
      },
      body: JSON.stringify({
        amount: amountInPaise,
        speed: "normal",
        notes: {
          source: "vppa-backoffice",
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return NextResponse.json(
        { error: err.error?.description || "Razorpay refund failed" },
        { status: response.status },
      );
    }

    const result = await response.json();
    return NextResponse.json({
      success: true,
      refundId: result.id,
      amount: result.amount / 100,
      status: result.status,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Refund failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
