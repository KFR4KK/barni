import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getProfileByUserId } from "@/lib/profiles";
import { syncDiscordMembership } from "@/lib/discord-sync";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { DiscordBadge } from "@/components/members/DiscordBadge";
import { RefreshDiscordButton } from "@/components/members/RefreshDiscordButton";

// Phase 2 shipped this as a deliberate placeholder ("linking a signed-in
// Discord account to an editable profile is Phase 3's job"). This is that
// job: the page now looks up whether the signed-in User owns a Profile
// (lib/profiles.ts) and branches on it, instead of always showing the
// static "coming soon" message.
//
// Still the real protection pattern for a route that requires being
// signed in: check `auth()` in the Server Component itself and redirect
// if there's no session — see middleware.ts for why the middleware
// cookie check alone isn't sufficient on its own.
export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  // Phase 4 — "synchronize ... when the user refreshes their profile"
  // requirement: every load of this page re-checks Discord membership
  // before reading the Profile back out, so this page is never showing
  // more than one page-load's worth of stale data. Failures are handled
  // entirely inside syncDiscordMembership (Discord outage -> last known
  // state kept, no Profile yet -> no-op) — nothing here needs a
  // try/catch of its own.
  await syncDiscordMembership(session.user.id);

  const profile = await getProfileByUserId(session.user.id);
  const label = session.user.displayName ?? session.user.username;

  return (
    <Container>
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <p className="font-mono text-xs uppercase tracking-wider text-brass">{label}</p>

        {profile ? (
          <>
            <h1 className="font-serif text-2xl text-bone">Ваш профіль заявлено</h1>
            <p className="max-w-md font-sans text-sm text-ash">
              Ви керуєте сторінкою «{profile.displayName}». Звідси можна перейти на неї або
              відредагувати вміст.
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-4">
              <Button href={`/members/${profile.slug}`} variant="outline">
                Переглянути сторінку
              </Button>
              <Button href="/profile/edit" variant="outline">
                Редагувати профіль
              </Button>
            </div>

            <div className="mt-4 flex flex-col items-center gap-3">
              <DiscordBadge serverMember={profile.serverMember} />
              <RefreshDiscordButton />
            </div>
          </>
        ) : (
          <>
            <h1 className="font-serif text-2xl text-bone">Ви ще не заявили профіль</h1>
            <p className="max-w-md font-sans text-sm text-ash">
              Знайдіть свою сторінку в списку учасників і натисніть «Заявити профіль», щоб
              отримати змогу редагувати її.
            </p>
            <Link
              href="/#members"
              className="mt-2 font-mono text-xs uppercase tracking-wider text-ash underline decoration-transparent underline-offset-4 transition-colors duration-150 hover:text-bone hover:decoration-brass focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2"
            >
              До списку учасників →
            </Link>
          </>
        )}
      </div>
    </Container>
  );
}
