import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createPost, MAX_POST_CONTENT_LENGTH, MIN_POST_CONTENT_LENGTH } from "@/lib/posts";

// Phase 8.0 — Posts Foundation.
//
// Same shape as app/api/projects/route.ts: a Route Handler (not a Server
// Action), since the create form (components/posts/PostForm.tsx) is a
// Client Component that needs the created post back as JSON to redirect
// afterward. Only `auth()`'s session decides the author — the request
// body can supply `content`/`imageUrl`, never a `userId`.

interface CreateBody {
  content: string;
  imageUrl: string | null;
}

function readCreateInput(body: unknown): CreateBody | null {
  if (typeof body !== "object" || body === null) return null;
  const { content, imageUrl } = body as Record<string, unknown>;
  if (typeof content !== "string") return null;

  // Brief: 1–2000 characters, enforced both client-side (PostForm) and
  // here — the client check is only ever a UX nicety.
  const trimmedContent = content.trim();
  if (trimmedContent.length < MIN_POST_CONTENT_LENGTH) return null;
  if (trimmedContent.length > MAX_POST_CONTENT_LENGTH) return null;

  const trimmedImageUrl = typeof imageUrl === "string" ? imageUrl.trim() : "";

  return { content: trimmedContent, imageUrl: trimmedImageUrl || null };
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 });
  }

  const input = readCreateInput(body);
  if (!input) {
    return NextResponse.json({ error: "invalid-input" }, { status: 400 });
  }

  const post = await createPost(session.user.id, input);
  return NextResponse.json({ post }, { status: 201 });
}
