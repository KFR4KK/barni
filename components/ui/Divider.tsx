import { cn } from "@/lib/utils";

interface DividerProps {
  /** The single brass hairline, reserved for the transition into the members section. */
  accent?: boolean;
  className?: string;
}

export function Divider({ accent = false, className }: DividerProps) {
  return <hr className={cn("border-t", accent ? "border-brass/60" : "border-line", className)} />;
}
