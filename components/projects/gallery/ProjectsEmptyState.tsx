import Link from "next/link";
import { Sparkles } from "lucide-react";

const primaryButtonClasses =
  "inline-flex items-center justify-center rounded-full bg-brass px-6 py-3 font-sans text-sm font-medium text-graphite transition-opacity duration-fast hover:opacity-90";

export function ProjectsEmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <Sparkles size={28} className="text-ash" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p className="font-display text-xl font-normal lowercase text-bone">Ще немає проєктів</p>
        <p className="font-sans text-sm text-ash">Стань першим, хто покаже свою роботу.</p>
      </div>
      <Link href="/projects/new" className={primaryButtonClasses}>
        Створити перший проєкт
      </Link>
    </div>
  );
}
