import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getProfileByUserId } from "@/lib/profiles";
import { updateProfileAction } from "@/actions/profile";
import { Container } from "@/components/ui/Container";
import { socialLabels, socialOrder } from "@/lib/social-icons";
import { cn } from "@/lib/utils";

interface ProfileEditPageProps {
  searchParams: Promise<{ error?: string }>;
}

const ERROR_MESSAGES: Record<string, string> = {
  "empty-name": "Відображуване ім'я не може бути порожнім.",
};

// Shared input styling: no input/textarea existed anywhere in the app
// before this page, so these classes stay close to the existing Button
// component's border/focus treatment (border-line, brass focus ring)
// rather than introducing a new visual language.
const fieldClasses = cn(
  "w-full rounded-md border border-line bg-charcoal/40 px-4 py-2.5 font-sans text-sm text-bone",
  "placeholder:text-ash/60",
  "transition-colors duration-fast focus:border-brass focus:outline-none",
  "focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2"
);

const labelClasses = "font-mono text-xs uppercase tracking-wider text-ash";

// Requires an owned Profile, not just a session — this is Phase 3's real
// authorization for the route (middleware only checks a cookie, see
// middleware.ts). A signed-in User who hasn't claimed a profile yet has
// nothing here to edit and is sent back to /profile, which explains why.
export default async function ProfileEditPage({ searchParams }: ProfileEditPageProps) {
  const { error } = await searchParams;
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  const profile = await getProfileByUserId(session.user.id);
  if (!profile) {
    redirect("/profile");
  }

  const socials = (profile.socials ?? {}) as Partial<Record<string, string>>;
  const errorMessage = error ? ERROR_MESSAGES[error] : undefined;

  return (
    <Container>
      <div className="py-16 md:py-24">
        <p className="font-mono text-xs uppercase tracking-wider text-brass">Редагування</p>
        <h1 className="mt-2 font-serif text-3xl text-bone md:text-4xl">Ваш профіль</h1>
        <p className="mt-3 max-w-[58ch] font-sans text-sm text-ash">
          Ці зміни одразу з&apos;являться на сторінці «{profile.displayName}» та в списку
          учасників.
        </p>

        {errorMessage && (
          <p className="mt-6 font-mono text-xs text-brass">{errorMessage}</p>
        )}

        <form action={updateProfileAction} className="mt-10 flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <label htmlFor="displayName" className={labelClasses}>
              Відображуване ім&apos;я
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              required
              maxLength={60}
              defaultValue={profile.displayName}
              className={fieldClasses}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="realName" className={labelClasses}>
              Справжнє ім&apos;я
            </label>
            <input
              id="realName"
              name="realName"
              type="text"
              maxLength={60}
              defaultValue={profile.realName ?? ""}
              className={fieldClasses}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="bio" className={labelClasses}>
              Опис
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={5}
              maxLength={2000}
              defaultValue={profile.bio}
              className={cn(fieldClasses, "resize-y leading-relaxed")}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="city" className={labelClasses}>
                Місто
              </label>
              <input
                id="city"
                name="city"
                type="text"
                maxLength={60}
                defaultValue={profile.city ?? ""}
                className={fieldClasses}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="country" className={labelClasses}>
                Країна
              </label>
              <input
                id="country"
                name="country"
                type="text"
                maxLength={60}
                defaultValue={profile.country ?? ""}
                className={fieldClasses}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="avatar" className={labelClasses}>
              Аватар (посилання на зображення)
            </label>
            <input
              id="avatar"
              name="avatar"
              type="text"
              placeholder="/images/members/your-avatar.jpg або https://…"
              defaultValue={profile.avatar ?? ""}
              className={fieldClasses}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="banner" className={labelClasses}>
              Банер (посилання на зображення, для попереднього перегляду посилань)
            </label>
            <input
              id="banner"
              name="banner"
              type="text"
              placeholder="https://…"
              defaultValue={profile.banner ?? ""}
              className={fieldClasses}
            />
          </div>

          <fieldset className="flex flex-col gap-4">
            <legend className={labelClasses}>Соц мережі</legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {socialOrder.map((platform) => (
                <div key={platform} className="flex flex-col gap-2">
                  <label htmlFor={`social_${platform}`} className="font-sans text-xs text-ash">
                    {socialLabels[platform]}
                  </label>
                  <input
                    id={`social_${platform}`}
                    name={`social_${platform}`}
                    type="text"
                    placeholder="https://…"
                    defaultValue={socials[platform] ?? ""}
                    className={fieldClasses}
                  />
                </div>
              ))}
            </div>
          </fieldset>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-md border border-line px-5 py-2.5 font-mono text-xs uppercase tracking-wider text-bone transition-colors duration-fast hover:border-brass hover:text-brass focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2"
            >
              Зберегти зміни
            </button>
          </div>
        </form>
      </div>
    </Container>
  );
}
