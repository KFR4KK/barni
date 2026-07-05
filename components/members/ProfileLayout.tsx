import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ProfileLayoutProps {
  header: ReactNode;
  children: ReactNode;
  /** Optional right-hand column (e.g. Awards). Sits beside the bio on large
   * screens; drops below it, full width, on tablet and mobile. */
  aside?: ReactNode;
}

export function ProfileLayout({ header, children, aside }: ProfileLayoutProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-12 md:grid-cols-[240px_1fr] md:gap-16",
        aside && "lg:grid-cols-[240px_1fr_300px]"
      )}
    >
      <div>{header}</div>
      <div className="max-w-[60ch]">{children}</div>
      {aside && <div className="md:col-span-2 lg:col-span-1">{aside}</div>}
    </div>
  );
}
