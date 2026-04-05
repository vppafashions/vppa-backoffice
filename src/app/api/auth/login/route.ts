import { type NextRequest, NextResponse } from "next/server";

import { Account, Client } from "node-appwrite";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  try {
    // Use admin client with API key to create session (bypasses rate limits)
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1")
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "69aaa3a900228aff9ae5")
      .setKey(process.env.APPWRITE_API_KEY!);

    const account = new Account(client);
    const session = await account.createEmailPasswordSession(email, password);

    const response = NextResponse.json({ success: true });
    response.cookies.set(
      `a_session_${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "69aaa3a900228aff9ae5"}`,
      session.secret,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        expires: new Date(session.expire),
        path: "/",
      },
    );

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
