import { Container } from "@/components/ui/Container";
import { siteConfig } from "@/data/site";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line/60 py-12">
      <Container wide>
        <div className="flex flex-col items-start gap-4 font-mono text-xs text-ash md:flex-row md:items-center md:justify-between">
          <p>
            © {year} {siteConfig.name}
          </p>
          <a
            href={siteConfig.social.discord}
            target="_blank"
            rel="noreferrer noopener"
            className="transition-colors duration-150 hover:text-bone focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2"
          >
            Discord →
          </a>
        </div>
      </Container>
    </footer>
  );
}
