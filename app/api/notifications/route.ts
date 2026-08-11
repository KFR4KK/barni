import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getNotifications, getUnreadCount, markAllAsRead, markAsRead } from "@/lib/notifications";

// Phase 7.4 — Notifications Foundation.
//
// GET and PATCH only, per the brief ("никакого DELETE пока") — there's
// no UI to delete a notification, and nothing else in this phase needs
// to. Both handlers only ever trust `session.user.id` as whose
// notifications are being read/updated — the same posture every other
// write path in this app takes (see app/api/follow/route.ts's own
// comment on this).
//
// GET returns both the resolved list and the unread count in one
// response — the dropdown needs both the moment it opens, and computing
// the count from the same `read` column the list already has would mean
// a second round trip for a number the server already has cheaply.

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [notifications, unreadCount] = await Promise.all([
    getNotifications(session.user.id),
    getUnreadCount(session.user.id),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}

function readPatchInput(body: unknown): { all: true } | { id: string } | null {
  if (typeof body !== "object" || body === null) return null;
  const { all, id } = body as Record<string, unknown>;

  if (all === true) return { all: true };
  if (typeof id === "string" && id.length > 0) return { id };
  return null;
}

// Two things a client can ask for: mark one notification read (clicking
// it) or mark all of them read (the "Позначити всі як прочитані"
// button) — one endpoint, discriminated by body shape, rather than two
// Route Handlers, since both are the same "flip `read` to true" write
// just scoped differently.
export async function PATCH(request: Request) {
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

  const input = readPatchInput(body);
  if (!input) {
    return NextResponse.json({ error: "invalid-input" }, { status: 400 });
  }

  if ("all" in input) {
    await markAllAsRead(session.user.id);
  } else {
    // Idempotent by construction (see markAsRead's own comment) — an
    // unknown or already-read id is a silent no-op, not a 404, so a
    // double-click or a stale client never surfaces an error here.
    await markAsRead(input.id, session.user.id);
  }

  const unreadCount = await getUnreadCount(session.user.id);
  return NextResponse.json({ ok: true, unreadCount });
}
