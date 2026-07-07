import type { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { toFollowListEntry, type FollowListEntry } from "@/lib/follows";
import { buildProfileURL } from "@/lib/utils";

// Phase 7.4 — Notifications Foundation. Same role as lib/follows.ts,
// lib/project-likes.ts, etc: the one place that talks to the
// Notification table. Every Route Handler that can cause a notification
// (follow, profile comment, project comment, reply, project like) calls
// createNotification() here rather than writing `prisma.notification.*`
// inline — see each of those routes' own comments for exactly where.
//
// This file is also the one place that knows how to turn a raw
// Notification row (type + entityId) into something a UI can render
// (an actor, a message, a link) — see resolveNotificationDetails below.
// A future NotificationType only ever needs a new branch there, never a
// new table or a schema change (see schema.prisma's comment on the
// model for why `entityId` is untyped).

// ---------------------------------------------------------------------------
// Writing

export interface CreateNotificationInput {
  recipientId: string;
  actorId: string;
  type: NotificationType;
  /** See schema.prisma's comment on Notification.entityId — meaning
   * depends on `type`. Omit (or pass null) for FOLLOW, which needs
   * nothing beyond the actor. */
  entityId?: string | null;
}

// The single entry point every source of a notification calls. Returns
// null, and creates nothing, for a self-notification (e.g. commenting on
// your own project, liking your own project) — per the brief's "не
// создавать уведомление самому себе" — so callers never have to
// duplicate that check themselves before calling this.
export async function createNotification(input: CreateNotificationInput) {
  if (input.recipientId === input.actorId) return null;

  return prisma.notification.create({
    data: {
      recipientId: input.recipientId,
      actorId: input.actorId,
      type: input.type,
      entityId: input.entityId ?? null,
    },
  });
}

// ---------------------------------------------------------------------------
// Reading

// Safety cap on how many notifications a single GET returns — same role
// as lib/follows.ts's FOLLOW_LIST_MAX. Not pagination (explicitly out of
// scope for this phase, per the brief) — the dropdown is a "небольшое
// меню", not a full inbox, so a fixed recent-first window is all it
// needs.
const NOTIFICATIONS_LIST_LIMIT = 30;

export interface NotificationView {
  id: string;
  type: NotificationType;
  read: boolean;
  createdAt: Date;
  actor: FollowListEntry;
  /** Fully composed, human-readable text — see resolveNotificationDetails.
   * The UI renders this as-is; it doesn't reconstruct sentences per type
   * itself, so a new NotificationType never needs a UI change, only a
   * new branch in this file. */
  message: string;
  /** Where clicking the notification should navigate. Null when the
   * thing it pointed at (a comment, a project) has since been deleted,
   * or when the actor never claimed a Profile to link to — the row still
   * renders, it just isn't a link. */
  href: string | null;
}

// Resolves one notification's `entityId` (whose meaning depends on
// `type` — see schema.prisma) into a message + href. Deliberately
// tolerant of the target having since been deleted: comments and
// projects aren't cascaded from Notification (entityId isn't a real FK —
// see the model comment), so a lookup miss here just means "no link
// anymore", not a broken page.
async function resolveNotificationDetails(
  type: NotificationType,
  entityId: string | null,
  actorName: string
): Promise<{ message: string; href: string | null }> {
  switch (type) {
    case "FOLLOW": {
      // Nothing to look up — the actor themselves is the whole subject.
      // Handled by the caller, which already has the resolved actor.
      return { message: `${actorName} почав стежити за вами`, href: null };
    }

    case "PROFILE_COMMENT": {
      if (!entityId) return { message: `${actorName} залишив коментар на вашій сторінці`, href: null };
      const comment = await prisma.profileComment.findUnique({
        where: { id: entityId },
        include: { profileUser: { include: { profile: true } } },
      });
      const slug = comment?.profileUser.profile?.slug ?? null;
      return {
        message: `${actorName} залишив коментар на вашій сторінці`,
        href: slug ? buildProfileURL(slug) : null,
      };
    }

    case "PROJECT_COMMENT": {
      if (!entityId) return { message: `${actorName} залишив коментар до вашого проєкту`, href: null };
      const comment = await prisma.projectComment.findUnique({
        where: { id: entityId },
        include: { project: { select: { slug: true, title: true } } },
      });
      return {
        message: comment
          ? `${actorName} залишив коментар до вашого проєкту «${comment.project.title}»`
          : `${actorName} залишив коментар до вашого проєкту`,
        href: comment ? `/projects/${comment.project.slug}` : null,
      };
    }

    case "COMMENT_REPLY": {
      // A reply's entityId is a comment id, but this one type covers
      // replies to both ProfileComment and ProjectComment threads (per
      // the brief — one NotificationType, not two). The two tables have
      // disjoint cuid id spaces, so trying ProfileComment first and
      // falling back to ProjectComment is the only way to tell which
      // without a discriminator column the brief doesn't ask for.
      if (entityId) {
        const profileReply = await prisma.profileComment.findUnique({
          where: { id: entityId },
          include: { profileUser: { include: { profile: true } } },
        });
        if (profileReply) {
          const slug = profileReply.profileUser.profile?.slug ?? null;
          return {
            message: `${actorName} відповів на ваш коментар`,
            href: slug ? buildProfileURL(slug) : null,
          };
        }

        const projectReply = await prisma.projectComment.findUnique({
          where: { id: entityId },
          include: { project: { select: { slug: true } } },
        });
        if (projectReply) {
          return {
            message: `${actorName} відповів на ваш коментар`,
            href: `/projects/${projectReply.project.slug}`,
          };
        }
      }
      return { message: `${actorName} відповів на ваш коментар`, href: null };
    }

    case "PROJECT_LIKE": {
      if (!entityId) return { message: `${actorName} вподобав ваш проєкт`, href: null };
      const project = await prisma.project.findUnique({
        where: { id: entityId },
        select: { slug: true, title: true },
      });
      return {
        message: project ? `${actorName} вподобав ваш проєкт «${project.title}»` : `${actorName} вподобав ваш проєкт`,
        href: project ? `/projects/${project.slug}` : null,
      };
    }
  }
}

// The recipient's notifications, newest first, each resolved to
// something the dropdown can render directly. Mirrors
// getProfileComments/getProjectComments's shape: one query for the raw
// rows (+ actor), then a per-row resolve step for the type-specific
// message/link.
export async function getNotifications(recipientId: string): Promise<NotificationView[]> {
  const rows = await prisma.notification.findMany({
    where: { recipientId },
    orderBy: { createdAt: "desc" },
    take: NOTIFICATIONS_LIST_LIMIT,
    include: { actor: { include: { profile: true } } },
  });

  return Promise.all(
    rows.map(async (row) => {
      const actor = toFollowListEntry(row.actor);
      const { message, href } = await resolveNotificationDetails(row.type, row.entityId, actor.displayName);
      return {
        id: row.id,
        type: row.type,
        read: row.read,
        createdAt: row.createdAt,
        actor,
        message,
        href,
      };
    })
  );
}

export function getUnreadCount(recipientId: string): Promise<number> {
  return prisma.notification.count({ where: { recipientId, read: false } });
}

// ---------------------------------------------------------------------------
// Marking as read

// Scoped to `{ id, recipientId }` in the same query that performs the
// write — same "ownership enforced by the query itself" idiom as
// lib/follows.ts's unfollow / lib/project-likes.ts's toggleLike —
// updateMany rather than update so this is idempotent: marking an
// already-read notification read again, or one that isn't yours (0 rows
// match), is a no-op, not an error.
export async function markAsRead(notificationId: string, recipientId: string): Promise<boolean> {
  const result = await prisma.notification.updateMany({
    where: { id: notificationId, recipientId },
    data: { read: true },
  });
  return result.count > 0;
}

export async function markAllAsRead(recipientId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { recipientId, read: false },
    data: { read: true },
  });
  return result.count;
}
