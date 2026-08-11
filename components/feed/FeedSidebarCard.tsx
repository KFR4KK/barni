import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FeedSidebarCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  className?: string;
}

export function FeedSidebarCard({ title, subtitle, children, className }: FeedSidebarCardProps) {
  return (
    <div
      className={cn(
        "rounded-[20px] border border-line/50 bg-charcoal/20 p-6 shadow-card",
        className
      )}
    >
      <div className="mb-5">
        <h2 className="font-display text-base font-medium text-bone">{title}</h2>
        <p className="mt-0.5 font-mono text-[11px] text-ash/80">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
