"use client";

import { useActionState } from "react";
import { chooseUsername, type ChooseUsernameResult } from "@/actions/onboarding";

const initialState: ChooseUsernameResult = {};

// Client component purely for useActionState's pending/error UI — the
// actual username choice is still a plain Server Action
// (actions/onboarding.ts's chooseUsername), same "no client-side auth
// logic" rule every other auth surface in this app already follows.
export function UsernameForm() {
  const [state, formAction, isPending] = useActionState(chooseUsername, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex items-center rounded-md border border-line bg-graphite px-3 py-2.5 focus-within:border-brass">
        <span className="font-mono text-sm text-ash">@</span>
        <input
          type="text"
          name="username"
          required
          minLength={3}
          maxLength={20}
          pattern="[a-zA-Z0-9_]+"
          autoComplete="off"
          autoFocus
          placeholder="max"
          className="w-full bg-transparent px-1 font-sans text-sm text-bone placeholder:text-ash/50 focus:outline-none"
        />
      </div>

      {state.error && <p className="font-sans text-sm text-brass">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center rounded-md border border-line px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-bone transition-colors duration-fast hover:border-brass hover:text-brass disabled:opacity-60"
      >
        {isPending ? "Зберігаємо…" : "Продовжити"}
      </button>
    </form>
  );
}
