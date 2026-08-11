"use client";

import { useEffect, useRef, useActionState } from "react";
import { signInWithTelegram, type TelegramAuthResult } from "@/actions/auth-telegram";
import type { TelegramAuthData } from "@/lib/telegram-auth";

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramAuthData) => void;
  }
}

const initialState: TelegramAuthResult = {};

// Telegram Login Widget — not OAuth2, so this isn't a "Continue with
// Telegram" button that calls signIn() the way Discord/Google's do (see
// lib/telegram-auth.ts's top comment). Telegram itself renders the
// actual button via a <script> tag it serves
// (telegram-widget.js?22) into this div, and calls
// `window.onTelegramAuth` with a signed payload once the person
// approves in their Telegram app — that payload gets verified and
// turned into a real session by actions/auth-telegram.ts's
// signInWithTelegram, the same way every other sign-in method in this
// app ends up as a database Session row.
//
// Requires NEXT_PUBLIC_TELEGRAM_BOT_USERNAME (the bot's @username, not
// the token — safe to expose client-side, it's what the widget itself
// displays) and only works on the domain registered with BotFather's
// /setdomain — see docs/AUTH_SETUP.md. Does not render at all on
// localhost, by Telegram's own design.
export function TelegramLoginWidget() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, formAction] = useActionState(signInWithTelegram, initialState);

  useEffect(() => {
    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
    if (!botUsername || !containerRef.current) return;

    window.onTelegramAuth = (user: TelegramAuthData) => {
      formAction(user);
    };

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "8");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    containerRef.current.appendChild(script);

    return () => {
      window.onTelegramAuth = undefined;
    };
  }, [formAction]);

  if (!process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      <div ref={containerRef} />
      {state.error && <p className="font-sans text-xs text-brass">{state.error}</p>}
    </div>
  );
}
