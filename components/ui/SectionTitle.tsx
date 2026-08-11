import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionTitleProps {
  children: ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
}

export function SectionTitle({ children, className, as: Tag = "h2" }: SectionTitleProps) {
  return (
    <Tag className={cn("font-serif text-4xl leading-tight text-bone md:text-5xl", className)}>
      {children}
    </Tag>
  );
}
