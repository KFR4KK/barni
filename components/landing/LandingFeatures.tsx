import { FolderKanban, Newspaper, Users, Layers, Handshake, Image } from "lucide-react";
import { Container } from "@/components/ui/Container";

const FEATURES = [
  { icon: FolderKanban, title: "Проєкти", description: "Публікуй роботи з обкладинкою, описом і посиланнями." },
  { icon: Newspaper, title: "Пости", description: "Веди власний блог прямо на платформі." },
  { icon: Users, title: "Групи", description: "Об'єднуйся з іншими навколо спільної теми." },
  { icon: Layers, title: "Портфоліо", description: "Профіль, що показує весь твій шлях і роботи." },
  { icon: Handshake, title: "Колаборація", description: "Знаходь тімейтів для наступного проєкту." },
  { icon: Image, title: "Медіа", description: "Завантажуй зображення, аудіо й відео без обмежень." },
];

// Six cards, one line of description each, per the brief's "do not use
// long descriptions". A plain border-only card (no fill beyond the
// shared charcoal surface token) rather than per-card color, keeping
// the "one accent color" rule the rest of the app already follows.
export function LandingFeatures() {
  return (
    <section className="py-20 sm:py-28">
      <Container wide>
        <h2 className="text-center font-display text-2xl font-normal lowercase text-bone sm:text-3xl">
          Все, що потрібно для творчості
        </h2>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="flex flex-col gap-3 rounded-2xl border border-line/60 bg-charcoal/40 p-6 transition-colors duration-base hover:border-brass/40"
            >
              <Icon size={22} className="text-brass" aria-hidden="true" />
              <h3 className="font-display text-base font-normal lowercase text-bone">{title}</h3>
              <p className="font-sans text-sm text-ash/80">{description}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
