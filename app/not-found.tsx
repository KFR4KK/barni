import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";

export default function NotFound() {
  return (
    <Section>
      <Container>
        <h1 className="font-serif text-4xl text-bone">Тут нічого немає.</h1>
        <p className="mt-4 font-sans text-ash">Ця сторінка не існує.</p>
        <Link
          href="/"
          className="mt-8 inline-block font-mono text-xs uppercase tracking-wider text-ash transition-colors duration-150 hover:text-bone focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2"
        >
          ← На головну
        </Link>
      </Container>
    </Section>
  );
}
