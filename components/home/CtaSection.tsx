import Link from "next/link";
import { auth } from "@/lib/auth";
import { signInWithDiscord } from "@/actions/auth";
import { Container } from "@/components/ui/Container";
import { cn } from "@/lib/utils";

const ctaButtonClasses = cn(
  "inline-flex items-center justify-center rounded-full border border-line px-10 py-5",
  "font-display text-lg text-bone transition-colors duration-fast",
  "hover:border-brass hover:text-brass",
  "focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-4"
);

// v0.3.0-alpha — Section 4/4, the final full-viewport CTA. An async
// Server Component (not just a static block) so a visitor who's already
// signed in gets sent to the Feed instead of being asked to "register"
// again — the button always does something correct for who's looking at it.
export async function CtaSection() {
  const session = await auth();

  return (
    <section className="flex min-h-screen flex-col items-center justify-center text-center">
      <Container className="flex flex-col items-center gap-12">
        <h2 className="font-display text-4xl leading-tight text-bone sm:text-5xl md:text-6xl">
          приєднуйся
          <br />
          ми завжди раді бачити
          <br />
          новеньких
          <br />у наших рядах ;)
        </h2>

        {session?.user ? (
          <Link href="/feed" className={ctaButtonClasses}>
            перейти до стрічки
          </Link>
        ) : (
          <form action={signInWithDiscord}>
            <button type="submit" className={ctaButtonClasses}>
              зареєструватись
            </button>
          </form>
        )}
      </Container>
    </section>
  );
}
