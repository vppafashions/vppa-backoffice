import { type NextRequest, NextResponse } from "next/server";

import { Account, Client } from "node-appwrite";

export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get(
    `a_session_${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "69aaa3a900228aff9ae5"}`,
  )?.value;

  if (!sessionCookie) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }

  try {
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1")
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "69aaa3a900228aff9ae5")
      .setSession(sessionCookie);

    const account = new Account(client);
    const user = await account.get();
    return NextResponse.json(user);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Session invalid";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
