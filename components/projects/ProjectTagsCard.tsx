import { Github } from "lucide-react";
import type { TagOption } from "@/lib/tags";
import { cn, formatDateDMY } from "@/lib/utils";

interface ProjectTagsCardProps {
  tags: TagOption[];
  githubUrl: string | null;
  publishedAt: Date;
  className?: string;
}

export function ProjectTagsCard({ tags, githubUrl, publishedAt, className }: ProjectTagsCardProps) {
  return (
    <aside
      className={cn(
        "flex flex-col gap-6 rounded-[20px] border border-line/50 bg-charcoal/20 p-6",
        className
      )}
    >
      <div>
        <h2 className="font-mono text-xs uppercase tracking-wider text-ash">Теги проєкту</h2>
        {tags.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <li
                key={tag.id}
                className={cn(
                  "rounded-full border px-3 py-1.5 font-mono text-xs",
                  tag.isBuiltIn ? "border-line text-bone" : "border-brass/40 bg-brass/5 text-brass"
                )}
              >
                {tag.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 font-sans text-sm text-ash/70">Теги ще не додані</p>
        )}
      </div>

      {githubUrl && (
        <a
          href={githubUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center justify-center gap-2 rounded-md border border-line px-4 py-2.5 font-mono text-sm text-bone transition-colors duration-fast hover:border-brass/50 hover:text-brass"
        >
          <Github size={16} aria-hidden="true" />
          GitHub
        </a>
      )}

      <p className="font-mono text-xs text-ash/50">{formatDateDMY(publishedAt)}</p>
    </aside>
  );
}
