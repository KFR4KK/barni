import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Container } from "@/components/ui/Container";
import { PostForm } from "@/components/posts/PostForm";

// Phase 8.0 — Posts Foundation. Same shape as app/projects/new/page.tsx:
// requires a session — anyone signed in can post, whether or not they've
// claimed a member Profile, same reasoning as Project.authorId (see
// prisma/schema.prisma's comment there). No middleware entry for this
// route either; the real check happens here, in the Server Component.
//
// Phase 9.4 — Inline Post Composer. Kept for backward compatibility only
// (per the brief) — no page in the app links here anymore; Feed and
// Profile both create posts through the new components/posts/PostComposer
// instead. Left as-is rather than rebuilt around PostComposer, since
// nothing exercises it going forward.
export default async function NewPostPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  // Where PostForm sends the user after a successful publish — their own
  // profile page. Resolved here, not in PostForm itself, since this
  // Server Component already has the session and PostForm (a Client
  // Component) doesn't — see PostForm's own comment on `redirectTo`.
  const redirectTo = session.user.username ? `/members/${session.user.username}` : "/";

  return (
    <Container>
      <div className="py-16 md:py-24">
        <p className="font-sans text-xs uppercase tracking-wider text-brass">Новий пост</p>
        <h1 className="mt-2 font-serif text-3xl text-bone md:text-4xl">Опублікувати пост</h1>
        <div className="mt-10 max-w-2xl">
          <PostForm redirectTo={redirectTo} />
        </div>
      </div>
    </Container>
  );
}
