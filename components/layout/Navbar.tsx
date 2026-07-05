import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { siteConfig } from "@/data/site";
import { AuthNav } from "@/components/auth/AuthNav";

// Now async: AuthNav reads the session server-side, and Next.js server
// components support async rendering natively — no client-side session
// fetch, no layout shift while auth state resolves.
export async function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-line/60 bg-graphite/80 backdrop-blur-nav">
      <Container wide>
        <nav className="flex h-16 items-center justify-between" aria-label="Основна навігація">
          <Link href="/" className="font-serif text-lg text-bone">
            {siteConfig.name}
          </Link>
          <div className="flex items-center gap-6">
            <ul className="flex items-center gap-6">
              {siteConfig.nav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="font-mono text-xs uppercase tracking-wider text-ash transition-colors duration-150 hover:text-bone focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <AuthNav />
          </div>
        </nav>
      </Container>
    </header>
  );
}
