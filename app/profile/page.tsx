import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Container } from "@/components/ui/Container";

// Deliberate placeholder, not a partial feature: the user menu (Phase 2's
// requirements) needs a "Профіль" destination, but linking a signed-in
// Discord account to an editable profile is Phase 3's job (profile
// claiming) and Phase 4's job (editing). Rather than leave the menu item
// dangling or half-build either of those here, this route says exactly
// what it is and nothing more.
//
// It does double as this phase's example of the real protection pattern
// for a route that requires being signed in: check `auth()` in the
// Server Component itself and redirect if there's no session. This is
// the enforcement layer — see middleware.ts for why the middleware
// cookie check alone is not considered sufficient on its own.
export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  return (
    <Container>
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <p className="font-mono text-xs uppercase tracking-wider text-brass">
          {session.user.displayName ?? session.user.username}
        </p>
        <h1 className="font-serif text-2xl text-bone">Профіль скоро з&apos;явиться</h1>
        <p className="max-w-md font-sans text-sm text-ash">
          Ви успішно увійшли через Discord. Редагування профілю ще в розробці — очікуйте в
          наступному оновленні.
        </p>
      </div>
    </Container>
  );
}
