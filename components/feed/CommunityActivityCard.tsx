import { FileText, MessageSquare, UserPlus } from "lucide-react";
import { FeedSidebarCard } from "@/components/feed/FeedSidebarCard";
import type { CommunityActivityToday } from "@/lib/community-stats";

interface CommunityActivityCardProps {
  activity: CommunityActivityToday;
  className?: string;
}

const ROWS = [
  { key: "newPosts" as const, icon: FileText, label: "нових постів" },
  { key: "newComments" as const, icon: MessageSquare, label: "нових коментарів" },
  { key: "newMembers" as const, icon: UserPlus, label: "нових учасників" },
];

// Feed Redesign — the second "make the platform feel alive" right-column
// widget. Real same-day counts (see lib/community-stats.ts), not a fake
// activity feed — a "0 сьогодні" row is an honest, small platform, not
// hidden behind a placeholder number.
export function CommunityActivityCard({ activity, className }: CommunityActivityCardProps) {
  return (
    <FeedSidebarCard title="Сьогодні на .vibe" subtitle="активність спільноти" className={className}>
      <div className="flex flex-col gap-3">
        {ROWS.map(({ key, icon: Icon, label }) => (
          <div key={key} className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-graphite text-ash">
              <Icon size={14} aria-hidden="true" />
            </span>
            <p className="font-sans text-sm text-bone">
              <span className="font-medium text-brass">{activity[key]}</span> {label}
            </p>
          </div>
        ))}
      </div>
    </FeedSidebarCard>
  );
}
