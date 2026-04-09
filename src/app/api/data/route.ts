import { type NextRequest, NextResponse } from "next/server";

import { AppwriteException, Client, Databases, ID, Query, Users } from "node-appwrite";

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1";
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "69aaa3a900228aff9ae5";
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "69aaa3c3001805a8a9ef";
const API_KEY = process.env.APPWRITE_API_KEY || "";

function getSessionCookie(req: NextRequest): string | undefined {
  return req.cookies.get(`a_session_${PROJECT_ID}`)?.value;
}

function getClient(): Client {
  return new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
}

function getAdminClient(): Databases {
  return new Databases(getClient());
}

function verifySession(req: NextRequest): boolean {
  return !!getSessionCookie(req);
}

// Build Query objects from serialized query descriptors
function buildQueries(queryDescriptors: Array<{ method: string; args: unknown[] }>): string[] {
  const queries: string[] = [];
  for (const q of queryDescriptors) {
    const method = q.method as keyof typeof Query;
    if (typeof Query[method] === "function") {
      queries.push((Query[method] as (...args: unknown[]) => string)(...q.args));
    }
  }
  return queries;
}

// Retry helper for transient failures (network timeouts, rate limits)
async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 1000): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isRetryable = error instanceof AppwriteException && (error.code === 429 || error.code >= 500);
      if (!isRetryable || attempt === retries) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
    }
  }
  throw new Error("Retry exhausted");
}

// POST handler for all data operations
export async function POST(req: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({ error: "Server misconfiguration: APPWRITE_API_KEY is not set" }, { status: 500 });
  }

  if (!verifySession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { action, collectionId, documentId, data, queries } = body;

  const databases = getAdminClient();

  try {
    switch (action) {
      case "list": {
        const q = queries ? buildQueries(queries) : [];
        const result = await withRetry(() => databases.listDocuments(DATABASE_ID, collectionId, q));
        return NextResponse.json(result);
      }
      case "get": {
        const result = await withRetry(() => databases.getDocument(DATABASE_ID, collectionId, documentId));
        return NextResponse.json(result);
      }
      case "create": {
        const result = await withRetry(() =>
          databases.createDocument(DATABASE_ID, collectionId, documentId || ID.unique(), data),
        );
        return NextResponse.json(result);
      }
      case "update": {
        const result = await withRetry(() => databases.updateDocument(DATABASE_ID, collectionId, documentId, data));
        return NextResponse.json(result);
      }
      case "delete": {
        await withRetry(() => databases.deleteDocument(DATABASE_ID, collectionId, documentId));
        return NextResponse.json({ success: true });
      }
      case "listUsers": {
        const usersService = new Users(getClient());
        const result = await withRetry(() => usersService.list());
        return NextResponse.json(result);
      }
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error: unknown) {
    if (error instanceof AppwriteException) {
      const status = error.code === 429 ? 429 : error.code >= 400 && error.code < 600 ? error.code : 500;
      return NextResponse.json(
        {
          error: error.message,
          type: error.type,
          code: error.code,
          action,
          collectionId,
        },
        { status },
      );
    }
    const message = error instanceof Error ? error.message : "Operation failed";
    return NextResponse.json({ error: message, action, collectionId }, { status: 500 });
  }
}
