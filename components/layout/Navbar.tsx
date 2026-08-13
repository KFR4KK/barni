import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { NavLink } from "@/components/layout/NavLink";
import { AuthNav } from "@/components/auth/AuthNav";

export async function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-line/40 bg-graphite/95 backdrop-blur-nav">
      <Container wide>
        <nav className="flex h-16 items-center justify-between" aria-label="Основна навігація">
          <Link
            href="/"
            className="font-display text-lg tracking-tight text-bone transition-colors duration-150 hover:text-brass"
          >
            .vibe
          </Link>
          <div className="flex items-center gap-5 sm:gap-6">
            <NavLink href="/feed" label="Feed" />
            <NavLink href="/projects" label="Projects" />
            <AuthNav />
          </div>
        </nav>
      </Container>
    </header>
  );
}
