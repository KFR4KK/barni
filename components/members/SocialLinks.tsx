import type { SocialLink } from "@/data/types";

interface SocialLinksProps {
  links: SocialLink[];
}

export function SocialLinks({ links }: SocialLinksProps) {
  if (links.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-2">
      {links.map((link) => (
        <li key={link.url}>
          <a
            href={link.url}
            target="_blank"
            rel="noreferrer noopener"
            className="font-mono text-xs uppercase tracking-wider text-ash underline decoration-transparent underline-offset-4 transition-colors duration-150 hover:text-bone hover:decoration-brass focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2"
          >
            {link.label ?? link.platform} →
          </a>
        </li>
      ))}
    </ul>
  );
}
