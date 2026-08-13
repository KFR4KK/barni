"use client";

import { useActionState, useState } from "react";
import { MessageCircle, Chrome } from "lucide-react";
import { signInWithDiscord, signInWithGoogle } from "@/actions/auth";
import { registerWithPassword, signInWithPassword, type CredentialsActionResult } from "@/actions/auth-credentials";
import { cn } from "@/lib/utils";

const initialState: CredentialsActionResult = {};

const fieldClasses =
  "w-full rounded-md border border-line bg-graphite px-3 py-2.5 font-sans text-sm text-bone placeholder:text-ash/50 focus:border-brass focus:outline-none";

const oauthButtonClasses =
  "inline-flex w-full items-center justify-center gap-2 rounded-md border border-line px-4 py-2.5 font-sans text-xs uppercase tracking-wider text-bone transition-colors duration-fast hover:border-brass hover:text-brass";

const primaryButtonClasses =
  "inline-flex w-full items-center justify-center rounded-md bg-brass px-4 py-2.5 font-sans text-sm font-medium text-graphite transition-opacity duration-fast hover:opacity-90 disabled:opacity-60";

// Account Linking, section 11's UX — one form, two modes ("Create
// account" vs "Sign in"), same fields either way. Both modes call the
// same OAuth providers below them: "Continue with Discord" on the
// register tab and the sign-in tab do the exact same thing, since
// OAuth sign-up/sign-in is one Discord flow either way (see
// lib/auth.ts's `signIn` event — a returning provider just logs the
// existing account in, a new one creates it).
export function LoginForm() {
  const [mode, setMode] = useState<"register" | "signin">("register");
  const [registerState, registerAction, isRegisterPending] = useActionState(registerWithPassword, initialState);
  const [signInState, signInAction, isSignInPending] = useActionState(signInWithPassword, initialState);

  const isRegister = mode === "register";
  const state = isRegister ? registerState : signInState;
  const isPending = isRegister ? isRegisterPending : isSignInPending;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <form action={signInWithDiscord}>
          <button type="submit" className={oauthButtonClasses}>
            <MessageCircle size={16} aria-hidden="true" />
            Continue with Discord
          </button>
        </form>
        <form action={signInWithGoogle}>
          <button type="submit" className={oauthButtonClasses}>
            <Chrome size={16} aria-hidden="true" />
            Continue with Google
          </button>
        </form>
        {/* Telegram temporarily disabled — see components/auth/TelegramLoginWidget.tsx,
           still there and working, just not rendered here right now. */}
      </div>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-line" />
        <span className="font-sans text-[10px] uppercase tracking-wider text-ash">or</span>
        <div className="h-px flex-1 bg-line" />
      </div>

      <form action={isRegister ? registerAction : signInAction} className="flex flex-col gap-3">
        <input type="email" name="email" required placeholder="Email" className={fieldClasses} autoComplete="email" />
        <input
          type="password"
          name="password"
          required
          minLength={isRegister ? 8 : undefined}
          placeholder="Password"
          className={fieldClasses}
          autoComplete={isRegister ? "new-password" : "current-password"}
        />

        {state.error && <p className="font-sans text-sm text-brass">{state.error}</p>}

        <button type="submit" disabled={isPending} className={primaryButtonClasses}>
          {isPending ? "…" : isRegister ? "Create account" : "Sign in"}
        </button>
      </form>

      <p className="text-center font-sans text-xs text-ash">
        {isRegister ? "Вже маєш акаунт?" : "Ще немає акаунта?"}{" "}
        <button
          type="button"
          onClick={() => setMode(isRegister ? "signin" : "register")}
          className={cn("font-medium text-brass underline-offset-2 hover:underline")}
        >
          {isRegister ? "Увійти" : "Створити акаунт"}
        </button>
      </p>
    </div>
  );
}
