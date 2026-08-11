"use client";

import { useActionState, useState, useTransition } from "react";
import { MessageCircle, Chrome, Mail } from "lucide-react";
import { connectDiscordFromSettings, connectGoogleFromSettings } from "@/actions/auth";
import { unlinkProvider, connectEmail, type AccountLinkingResult } from "@/actions/account-linking";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-validation";
import { cn } from "@/lib/utils";

interface AccountRow {
  provider: string;
  showOnProfile: boolean;
}

interface ConnectedAccountsProps {
  email: string | null;
  hasPassword: boolean;
  accounts: AccountRow[];
}

// Account Linking, section 7 — one row per possible sign-in method.
// PROVIDERS covers Discord + Google, each connecting via a plain Server
// Action button. Telegram (lib/telegram-auth.ts, actions/auth-telegram.ts,
// components/auth/TelegramLoginWidget.tsx) is built and working but
// temporarily not rendered anywhere — Telegram's own login-confirmation
// delivery was unreliable during testing, unrelated to anything in this
// app. Re-enabling it later is just re-adding <TelegramLoginWidget />
// here and on the login page — nothing to rebuild.
const PROVIDERS: { id: string; label: string; icon: typeof MessageCircle; connect: () => Promise<void> }[] = [
  { id: "discord", label: "Discord", icon: MessageCircle, connect: connectDiscordFromSettings },
  { id: "google", label: "Google", icon: Chrome, connect: connectGoogleFromSettings },
];

const initialEmailState: AccountLinkingResult = {};

export function ConnectedAccounts({ email, hasPassword, accounts }: ConnectedAccountsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [emailState, emailAction, isEmailPending] = useActionState(connectEmail, initialEmailState);

  // "Email connected" means both an email AND a password are on file —
  // a password alone can never sign anyone back in (signInWithPassword
  // looks accounts up by email), so this form always collects both,
  // whether it's the first time or a later change.
  const isEmailConnected = Boolean(email && hasPassword);
  const totalMethods = accounts.length + (hasPassword ? 1 : 0);

  function handleUnlink(provider: string) {
    setError(null);
    startTransition(async () => {
      const result = await unlinkProvider(provider);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {error && <p className="font-sans text-sm text-brass">{error}</p>}

      {/* Email — a password (paired with an email), not an Account row,
         so it's its own form rather than a row in the PROVIDERS loop
         below. This IS the "Connect" affordance for email — there's no
         separate button elsewhere, filling in both fields and pressing
         save is the connect action. */}
      <form action={emailAction} className="flex flex-col gap-3 rounded-md border border-line px-4 py-3.5">
        <div className="flex items-center gap-3">
          <Mail size={18} className="text-ash" aria-hidden="true" />
          <div>
            <p className="font-sans text-sm text-bone">Email</p>
            <p className="font-mono text-xs text-ash">
              {isEmailConnected ? email : "Not connected"}
            </p>
          </div>
        </div>

        <input
          type="email"
          name="email"
          defaultValue={email ?? ""}
          placeholder="you@example.com"
          className="w-full rounded-md border border-line bg-graphite px-3 py-2 font-sans text-sm text-bone placeholder:text-ash/50 focus:border-brass focus:outline-none"
        />
        <div className="flex gap-2">
          <input
            type="password"
            name="password"
            minLength={MIN_PASSWORD_LENGTH}
            placeholder={hasPassword ? "Новий пароль" : "Пароль"}
            className="w-full rounded-md border border-line bg-graphite px-3 py-2 font-sans text-sm text-bone placeholder:text-ash/50 focus:border-brass focus:outline-none"
          />
          <button
            type="submit"
            disabled={isEmailPending}
            className="shrink-0 rounded-md border border-line px-4 py-2 font-mono text-xs uppercase tracking-wider text-bone transition-colors duration-fast hover:border-brass hover:text-brass disabled:opacity-60"
          >
            {isEmailConnected ? "Change" : "Connect"}
          </button>
        </div>
        {emailState.error && <p className="font-sans text-xs text-brass">{emailState.error}</p>}
      </form>

      {/* OAuth providers. */}
      {PROVIDERS.map(({ id, label, icon: Icon, connect }) => {
        const account = accounts.find((a) => a.provider === id);
        const isConnected = Boolean(account);

        return (
          <div key={id} className="flex items-center justify-between gap-4 rounded-md border border-line px-4 py-3.5">
            <div className="flex items-center gap-3">
              <Icon size={18} className="text-ash" aria-hidden="true" />
              <div>
                <p className="font-sans text-sm text-bone">{label}</p>
                <p className="font-mono text-xs text-ash">
                  {isConnected ? "Connected" : "Not connected"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {isConnected ? (
                <button
                  type="button"
                  disabled={isPending || totalMethods <= 1}
                  onClick={() => handleUnlink(id)}
                  title={totalMethods <= 1 ? "Це єдиний спосіб входу" : undefined}
                  className={cn(
                    "rounded-md border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-ash transition-colors duration-fast hover:border-brass hover:text-brass",
                    (isPending || totalMethods <= 1) && "opacity-60"
                  )}
                >
                  Disconnect
                </button>
              ) : (
                <form action={connect}>
                  <button
                    type="submit"
                    className="rounded-md border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-bone transition-colors duration-fast hover:border-brass hover:text-brass"
                  >
                    Connect
                  </button>
                </form>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
