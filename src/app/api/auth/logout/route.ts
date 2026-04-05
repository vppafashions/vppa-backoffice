import { type NextRequest, NextResponse } from "next/server";

import { Account, Client } from "node-appwrite";

export async function POST(req: NextRequest) {
  const sessionCookie = req.cookies.get(
    `a_session_${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "69aaa3a900228aff9ae5"}`,
  )?.value;

  // Try to delete the session on Appwrite side if we have a cookie
  if (sessionCookie) {
    try {
      const client = new Client()
        .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1")
        .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "69aaa3a900228aff9ae5")
        .setSession(sessionCookie);

      const account = new Account(client);
      await account.deleteSession("current");
    } catch {
      // Session may already be expired — ignore
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete(`a_session_${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "69aaa3a900228aff9ae5"}`);
  return response;
}
