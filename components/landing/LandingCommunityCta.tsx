import Link from "next/link";
import { Container } from "@/components/ui/Container";

const primaryButtonClasses =
  "inline-flex items-center justify-center rounded-full bg-brass px-8 py-3.5 font-sans text-sm font-medium text-graphite transition-opacity duration-fast hover:opacity-90 focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-4";

const secondaryButtonClasses =
  "inline-flex items-center justify-center rounded-full border border-line px-8 py-3.5 font-sans text-sm font-medium text-bone transition-colors duration-fast hover:border-brass hover:text-brass focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-4";

// Final section — both buttons land on the unified /login page (Account
// Linking, section 11); which tab is active there is the person's own
// choice (Discord/Google/Telegram/Email — see components/auth/LoginForm.tsx),
// not something this section needs to know about.
export function LandingCommunityCta() {
  return (
    <section className="py-24 sm:py-32">
      <Container wide className="flex flex-col items-center gap-6 text-center">
        <h2 className="max-w-2xl font-display text-3xl font-normal leading-tight text-bone sm:text-4xl md:text-5xl">
          Приєднуйся до спільноти .vibe
        </h2>
        <p className="max-w-md font-sans text-base text-ash">
          Публікуй свої роботи, знаходь команду і рости разом з іншими
          творчими людьми.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Link href="/login" className={primaryButtonClasses}>
            Створити акаунт
          </Link>
          <Link href="/login" className={secondaryButtonClasses}>
            Увійти
          </Link>
        </div>
      </Container>
    </section>
  );
}
