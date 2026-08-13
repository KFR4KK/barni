import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

// Auth.js redirects here (configured via `pages.error` in lib/auth.ts)
// instead of showing its own default, unstyled error screen. `error` is
// one of Auth.js's fixed error codes — see the map below for which
// real-world situation each one corresponds to.
const ERROR_MESSAGES: Record<string, string> = {
  AccessDenied: "Вхід скасовано — ви відхилили запит на авторизацію в Discord.",
  OAuthSignin: "Не вдалося розпочати вхід через Discord. Спробуйте ще раз.",
  OAuthCallback: "Discord повернув некоректну відповідь під час входу. Спробуйте ще раз.",
  OAuthCreateAccount: "Не вдалося створити обліковий запис на основі даних Discord.",
  Callback: "Помилка під час обробки входу. Спробуйте ще раз.",
  OAuthAccountNotLinked: "Цей Discord-акаунт уже пов'язаний з іншим обліковим записом.",
  Configuration: "Помилка конфігурації входу. Повідомте адміністратора сайту.",
  Verification: "Посилання для входу недійсне або застаріло.",
  SessionRequired: "Щоб продовжити, спочатку увійдіть через Discord.",
  Default: "Під час входу сталася помилка. Спробуйте ще раз.",
};

interface AuthErrorPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const { error } = await searchParams;
  const message = ERROR_MESSAGES[error ?? "Default"] ?? ERROR_MESSAGES.Default;

  return (
    <Container>
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
        <p className="font-sans text-xs uppercase tracking-wider text-brass">Помилка входу</p>
        <h1 className="font-serif text-2xl text-bone">Щось пішло не так</h1>
        <p className="max-w-md font-sans text-sm text-ash">{message}</p>
        <Button href="/" variant="outline">
          На головну
        </Button>
      </div>
    </Container>
  );
}
