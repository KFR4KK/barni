"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { FollowListItem } from "@/components/members/FollowListItem";
import type { FollowListEntry } from "@/lib/follows";

interface FollowListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: "Followers" | "Following";
  /** e.g. `/api/users/${username}/followers` — built by the caller so
   * this component doesn't need to know about the username at all. */
  endpoint: string;
  /** Shown when the list is genuinely empty (not just filtered out by
   * search) — e.g. "No followers yet." */
  emptyMessage: string;
}

// Only show the search box once a list is long enough that scanning it by
// eye stops being the faster option — for a handful of entries a search
// box is just extra UI. Not a hard requirement, just a reasonable cutoff.
const SEARCH_THRESHOLD = 8;

// Phase 5.2 — one instance of this per list type (see
// components/members/FollowSection.tsx, which renders one for Followers
// and one for Following); each fetches its own endpoint the first time
// it's opened.
export function FollowListModal({ isOpen, onClose, title, endpoint, emptyMessage }: FollowListModalProps) {
  const [entries, setEntries] = useState<FollowListEntry[] | null>(null);
  const [error, setError] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setError(false);
    setSearchTerm("");

    fetch(endpoint)
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed: ${response.status}`);
        return response.json() as Promise<{ users: FollowListEntry[] }>;
      })
      .then((data) => {
        if (!cancelled) setEntries(data.users);
      })
      .catch((err) => {
        console.error("[follow-list] failed to load list:", err);
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
    // Deliberately re-fetches every time the modal opens rather than
    // caching — a fresh list on open is one request, not "a request per
    // character" (that constraint is about the search box below, which
    // filters the already-fetched array in memory instead).
  }, [isOpen, endpoint]);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filtered =
    entries && normalizedSearch
      ? entries.filter(
          (entry) =>
            entry.username.toLowerCase().includes(normalizedSearch) ||
            entry.displayName.toLowerCase().includes(normalizedSearch)
        )
      : entries;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      {error && (
        <p className="py-4 text-center font-mono text-xs text-ash">Не вдалося завантажити список.</p>
      )}

      {!error && entries === null && (
        <p className="py-4 text-center font-mono text-xs text-ash">Завантаження…</p>
      )}

      {!error && entries !== null && (
        <>
          {entries.length > SEARCH_THRESHOLD && (
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Пошук за іменем або username"
              className="mb-3 w-full rounded-md border border-line bg-graphite px-3 py-2 font-sans text-sm text-bone placeholder:text-ash/60 focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2"
            />
          )}

          {entries.length === 0 && (
            <p className="py-4 text-center font-mono text-xs text-ash">{emptyMessage}</p>
          )}

          {entries.length > 0 && filtered && filtered.length === 0 && (
            <p className="py-4 text-center font-mono text-xs text-ash">Нічого не знайдено.</p>
          )}

          {filtered && filtered.length > 0 && (
            <div>
              {filtered.map((entry) => (
                <FollowListItem key={entry.userId} entry={entry} />
              ))}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
