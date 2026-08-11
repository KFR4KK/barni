import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Container } from "@/components/ui/Container";
import { UsernameForm } from "@/components/onboarding/UsernameForm";

// The one screen every brand-new account — regardless of provider — is
// sent to before it can reach anything else (see app/welcome/page.tsx's
// gate). Nothing here imports a username from Discord/Google/Telegram;
// see lib/username.ts and actions/onboarding.ts's chooseUsername.
export default async function ChooseUsernamePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }
  if (session.user.username) {
    redirect("/welcome");
  }

  return (
    <Container>
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="font-serif text-3xl text-bone md:text-4xl">Обери свій username</h1>
          <p className="max-w-sm font-sans text-sm text-ash">
            Це твій постійний ідентифікатор на .vibe — за ним тебе будуть
            знаходити інші учасники. Змінити його пізніше буде непросто,
            обирай уважно.
          </p>
        </div>

        <div className="w-full max-w-sm">
          <UsernameForm />
        </div>
      </div>
    </Container>
  );
}
