import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getProfileByUserId } from "@/lib/profiles";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

// Every sign-in now redirects here first (see actions/auth.ts).
//
// Account Linking — this is also the gate that sends a genuinely brand
// new account (no username chosen yet, any provider) to
// /onboarding/username before it ever sees this greeting or anything
// else in the app. `username` is fetched in the same query as
// `hasSeenWelcome` below rather than added as a second DB round trip.
//
// `hasSeenWelcome`/`username` are read straight from the DB rather than
// `session.user` on purpose for the former (growing the session payload
// for a flag read exactly once per account isn't worth it) — username
// piggybacks on that same query since it's already here.
export default async function WelcomePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { hasSeenWelcome: true, username: true },
  });

  // Same "shouldn't happen, but the row is gone or was never created"
  // defensiveness the rest of this page already had — if there's truly
  // no User row to check, there's nothing to greet or onboard; treat it
  // as "already seen".
  if (!user) {
    redirect("/feed");
  }

  if (!user.username) {
    redirect("/onboarding/username");
  }

  if (user.hasSeenWelcome) {
    redirect("/feed");
  }

  // Flips the flag before rendering, not after: a Server Component can
  // still throw or the browser tab can close mid-render, and "greeted
  // twice" is a harmless repeat, while "never marked seen, so /welcome
  // loops forever" would not be.
  //
  // Fetched alongside: the owner's own Profile, so "Створити перший
  // пост" can land on their own page (components/posts/PostsSection.tsx's
  // inline composer) rather than repeating the Feed link below it.
  const [, profile] = await Promise.all([
    prisma.user.update({
      where: { id: session.user.id },
      data: { hasSeenWelcome: true },
    }),
    getProfileByUserId(session.user.id),
  ]);

  const firstPostHref = profile ? `/members/${user.username}` : "/feed";

  return (
    <Container>
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
        <span className="text-4xl" aria-hidden="true">
          👋
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="font-serif text-3xl text-bone md:text-4xl">
            Ласкаво просимо до .vibe.
          </h1>
          <p className="font-sans text-sm text-ash">Ваш профіль вже створений.</p>
          <p className="font-sans text-sm text-ash">Що хочете зробити?</p>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
          <Button href="/feed" variant="outline">
            Перейти до Feed
          </Button>
          <Button href="/profile/edit" variant="outline">
            Редагувати профіль
          </Button>
          <Button href={firstPostHref} variant="outline">
            Створити перший пост
          </Button>
          <Button href="/projects/new" variant="outline">
            Створити перший проєкт
          </Button>
        </div>
      </div>
    </Container>
  );
}
