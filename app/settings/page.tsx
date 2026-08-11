import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Container } from "@/components/ui/Container";
import { ConnectedAccounts } from "@/components/settings/ConnectedAccounts";

// Account Linking, section 7 — the "Connected accounts" settings screen.
// Discord and Google are real, connectable providers today (Telegram
// joins once that provider is added to lib/auth.ts). Email is handled
// as "has a password or not" rather than an Account row, since it isn't
// one.
export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (!session.user.username) {
    redirect("/onboarding/username");
  }

  const [user, accounts] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, passwordHash: true },
    }),
    prisma.account.findMany({
      where: { userId: session.user.id },
      select: { provider: true, showOnProfile: true },
    }),
  ]);

  return (
    <Container className="py-16 md:py-24">
      <h1 className="font-serif text-3xl text-bone md:text-4xl">Налаштування</h1>
      <p className="mt-2 font-sans text-sm text-ash">
        Керуй способами входу в свій акаунт .vibe.
      </p>

      <div className="mt-10 max-w-xl">
        <ConnectedAccounts
          email={user?.email ?? null}
          hasPassword={Boolean(user?.passwordHash)}
          accounts={accounts}
        />
      </div>
    </Container>
  );
}
