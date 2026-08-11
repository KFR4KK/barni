import { FeedSidebarCard } from "@/components/feed/FeedSidebarCard";
import { cn } from "@/lib/utils";

export interface PopularTag {
  name: string;
  count: number;
}

interface PopularTagsCardProps {
  tags: PopularTag[];
  className?: string;
}

export function PopularTagsCard({ tags, className }: PopularTagsCardProps) {
  return (
    <FeedSidebarCard
      title="Найпопулярніші теги"
      subtitle="тег / використання"
      className={className}
    >
      <ul className="divide-y divide-line/40">
        {tags.map((tag) => (
          <li
            key={tag.name}
            className={cn(
              "flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0",
              "font-mono text-[11px]"
            )}
          >
            <span className="text-ash">{tag.name}</span>
            <span className="tabular-nums text-ash/60">{tag.count}</span>
          </li>
        ))}
      </ul>
    </FeedSidebarCard>
  );
}
