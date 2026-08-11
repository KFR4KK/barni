import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Container } from "@/components/ui/Container";
import { LoginForm } from "@/components/auth/LoginForm";

// The unified sign-in/sign-up entry point (Account Linking brief,
// section 11) — replaces the navbar's old "straight into Discord OAuth"
// SignInButton (still there for Discord specifically; this page is where
// it now links). Google/Telegram buttons join LoginForm the same way
// Discord's already there, once those providers are added — nothing
// about this page's shape needs to change for that.
export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/feed");
  }

  return (
    <Container className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-3xl text-bone">Welcome to .vibe</h1>
        </div>
        <LoginForm />
      </div>
    </Container>
  );
}
