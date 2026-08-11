import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getProfileByUserId } from "@/lib/profiles";
import { updateProfileAction } from "@/actions/profile";
import { Container } from "@/components/ui/Container";
import { socialLabels, socialOrder } from "@/lib/social-icons";
import { cn } from "@/lib/utils";
import { formFieldClasses as fieldClasses, formLabelClasses as labelClasses } from "@/lib/form-styles";
import { PROFILE_WIDGETS, parseWidgetContent } from "@/lib/profile-widgets";

interface ProfileEditPageProps {
  searchParams: Promise<{ error?: string }>;
}

const ERROR_MESSAGES: Record<string, string> = {
  "empty-name": "Відображуване ім'я не може бути порожнім.",
  "file-too-large": "Файл завеликий. Перевірте ліміт для цього поля і спробуйте ще раз.",
  "unsupported-file": "Непідтримуваний тип файлу.",
  "invalid-birthday": "Некоректна дата народження.",
};

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
            <label htmlFor="avatarFile" className={labelClasses}>
              Аватар (зображення з пристрою)
            </label>
            {profile.avatar && (
              <p className="font-mono text-[11px] text-ash">
                Поточний аватар уже встановлено. Виберіть новий файл, щоб замінити його — якщо
                нічого не вибрати, поточний аватар залишиться без змін.
              </p>
            )}
            <input
              id="avatarFile"
              name="avatarFile"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className={cn(fieldClasses, "file:mr-4 file:rounded-md file:border-0 file:bg-charcoal file:px-3 file:py-1.5 file:font-mono file:text-xs file:text-bone")}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="bannerFile" className={labelClasses}>
              Банер (зображення, GIF або коротке відео без звуку)
            </label>
            {profile.banner && (
              <p className="font-mono text-[11px] text-ash">
                Поточний банер: {profile.bannerType.toLowerCase()}. Виберіть новий файл, щоб замінити
                його — якщо нічого не вибрати, поточний банер залишиться без змін.
              </p>
            )}
            <input
              id="bannerFile"
              name="bannerFile"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm"
              className={cn(fieldClasses, "file:mr-4 file:rounded-md file:border-0 file:bg-charcoal file:px-3 file:py-1.5 file:font-mono file:text-xs file:text-bone")}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="skills" className={labelClasses}>
              Скіли (через кому)
            </label>
            <input
              id="skills"
              name="skills"
              type="text"
              placeholder="web-design, photography"
              defaultValue={profile.skills.join(", ")}
              className={fieldClasses}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="education" className={labelClasses}>
              Навчання
            </label>
            <input
              id="education"
              name="education"
              type="text"
              maxLength={120}
              defaultValue={profile.education ?? ""}
              className={fieldClasses}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="birthday" className={labelClasses}>
              Дата народження
            </label>
            <p className="font-mono text-[11px] text-ash">
              Вік на сторінці профілю рахується автоматично від цієї дати — власне число віку ніде
              не зберігається.
            </p>
            <input
              id="birthday"
              name="birthday"
              type="date"
              defaultValue={profile.birthday ? profile.birthday.toISOString().slice(0, 10) : ""}
              className={cn(fieldClasses, "w-full sm:w-auto")}
            />
          </div>

          <fieldset className="flex flex-col gap-4 rounded-md border border-line/60 p-5">
            <legend className={labelClasses}>Улюблений трек</legend>
            <p className="font-mono text-[11px] text-ash">
              Локальний файл (mp3/wav/ogg), не посилання на стрімінговий сервіс.
            </p>

            {profile.musicUrl && (
              <label className="flex items-center gap-2 font-sans text-xs text-ash">
                <input type="checkbox" name="removeMusic" className="accent-brass" />
                Прибрати поточний трек
              </label>
            )}

            <div className="flex flex-col gap-2">
              <label htmlFor="musicFile" className="font-sans text-xs text-ash">
                Аудіофайл {profile.musicUrl && "(замінити)"}
              </label>
              <input
                id="musicFile"
                name="musicFile"
                type="file"
                accept="audio/mpeg,audio/wav,audio/x-wav,audio/ogg"
                className={cn(fieldClasses, "file:mr-4 file:rounded-md file:border-0 file:bg-charcoal file:px-3 file:py-1.5 file:font-mono file:text-xs file:text-bone")}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label htmlFor="musicTitle" className="font-sans text-xs text-ash">
                  Назва треку
                </label>
                <input
                  id="musicTitle"
                  name="musicTitle"
                  type="text"
                  maxLength={100}
                  defaultValue={profile.musicTitle ?? ""}
                  className={fieldClasses}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="musicArtist" className="font-sans text-xs text-ash">
                  Виконавець (необов&apos;язково)
                </label>
                <input
                  id="musicArtist"
                  name="musicArtist"
                  type="text"
                  maxLength={100}
                  defaultValue={profile.musicArtist ?? ""}
                  className={fieldClasses}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-4 rounded-md border border-line/60 p-5">
            <legend className={labelClasses}>Кастомний медіа-блок (сайдбар)</legend>
            <p className="font-mono text-[11px] text-ash">
              Необов&apos;язковий великий блок під карткою групи — зображення, GIF або коротке відео.
              Якщо нічого не завантажено, блок просто не показується.
            </p>
            {profile.widgetMedia && (
              <label className="flex items-center gap-2 font-sans text-xs text-ash">
                <input type="checkbox" name="removeWidgetMedia" className="accent-brass" />
                Прибрати поточний блок
              </label>
            )}
            <input
              id="widgetMediaFile"
              name="widgetMediaFile"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm"
              className={cn(fieldClasses, "file:mr-4 file:rounded-md file:border-0 file:bg-charcoal file:px-3 file:py-1.5 file:font-mono file:text-xs file:text-bone")}
            />
          </fieldset>

          <fieldset className="flex flex-col gap-4">
            <legend className={labelClasses}>Додаткові віджети</legend>
            <p className="font-mono text-[11px] text-ash">
              Заповніть будь-яке з полів, щоб увімкнути відповідний віджет у сайдбарі; залиште
              порожнім, щоб приховати.
            </p>
            {PROFILE_WIDGETS.map((widget) => (
              <div key={widget.id} className="flex flex-col gap-2">
                <label htmlFor={`widget_${widget.id}`} className="font-sans text-xs text-ash">
                  {widget.label} — {widget.description}
                </label>
                <textarea
                  id={`widget_${widget.id}`}
                  name={`widget_${widget.id}`}
                  rows={2}
                  maxLength={280}
                  defaultValue={parseWidgetContent(profile.widgetContent)[widget.id] ?? ""}
                  className={cn(fieldClasses, "resize-y")}
                />
              </div>
            ))}
          </fieldset>

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
