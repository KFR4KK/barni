import Link from "next/link";
import { Github, Send } from "lucide-react";
import { updatesPageInfo } from "@/data/updates";

// Updates page (Dev Blog / Changelog) — the left column's info card, per
// the brief: fully static, no interactivity, stays put while the right
// column's post list scrolls (see app/updates/page.tsx's sticky
// wrapper — this component itself has no positioning of its own, so it
// stays reusable if that page's layout changes later).
export function UpdatesInfoCard() {
  return (
    <div className="flex flex-col gap-6 rounded-[24px] border border-line/50 bg-charcoal/20 p-8 text-center shadow-card">
      <h1 className="font-display text-2xl font-normal lowercase text-bone">
        версія - {updatesPageInfo.version}
      </h1>

      <div className="flex flex-col gap-3 font-sans text-sm leading-relaxed text-ash">
        <p>
          створено{" "}
          <Link
            href={updatesPageInfo.creatorUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="text-brass underline decoration-brass/30 underline-offset-2 hover:decoration-brass"
          >
            {updatesPageInfo.creatorName}
          </Link>
          <br />
          <span className="italic text-ash/80">всі контакти є за посиланням (сайт портфоліо)</span>
        </p>

        <p>
          гітхаб репозиторій проєкту:
          <br />
          <Link
            href={updatesPageInfo.githubUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 text-brass underline decoration-brass/30 underline-offset-2 hover:decoration-brass"
          >
            <Github size={13} aria-hidden="true" />
            {updatesPageInfo.githubUrl.replace(/^https?:\/\//, "")}
          </Link>
        </p>

        <p>
          телеграм канал проєкту з оновленнями, сповіщеннями та ботом через який можете
          запропонувати правки або повідомити про баги на сайті:
          <br />
          <Link
            href={updatesPageInfo.telegramUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 text-brass underline decoration-brass/30 underline-offset-2 hover:decoration-brass"
          >
            <Send size={13} aria-hidden="true" />
            {updatesPageInfo.telegramUrl.replace(/^https?:\/\//, "")}
          </Link>
        </p>
      </div>

      <p className="mt-4 font-sans text-sm italic text-ash/70">{updatesPageInfo.closingNote}</p>
    </div>
  );
}
