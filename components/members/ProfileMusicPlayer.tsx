"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileMusicPlayerProps {
  url: string;
  title: string;
  artist: string | null;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

// Phase 12, point 6 — Favorite Music.
//
// A local file (mp3/wav/ogg — Profile.musicUrl, uploaded via
// lib/storage.ts's uploadAudio), never a Spotify/YouTube embed, per the
// brief. Revision: this used to be fixed to the bottom-right of the
// viewport and followed the visitor around the whole page while
// scrolling. Per the mockup it's a static widget that lives in place in
// the header's right column instead — it scrolls away with the rest of
// the header like any other widget there.
//
// Always shown once a favorite track is set — no dismiss control per
// the latest revision (the × button was removed; the already-played
// portion of the seek bar is white to make progress readable at a
// glance).
export function ProfileMusicPlayer({ url, title, artist }: ProfileMusicPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(() => {
        // Blocked by the browser's autoplay policy (shouldn't happen
        // here since this is always a direct user click, but a failed
        // play() should never throw an unhandled rejection).
      });
      setIsPlaying(true);
    }
  }

  function handleSeek(event: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current;
    if (!audio) return;
    const next = Number(event.target.value);
    audio.currentTime = next;
    setCurrentTime(next);
  }

  const playedPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="relative flex w-full max-w-full flex-col gap-4 rounded-[28px] border border-line/60 bg-charcoal/95 p-6 shadow-card"
      role="region"
      aria-label="Улюблений трек"
    >
      <audio ref={audioRef} src={url} preload="metadata" />

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? "Пауза" : "Відтворити"}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center text-bone transition-colors duration-fast hover:text-brass"
        >
          {isPlaying ? <Pause size={22} /> : <Play size={22} className="ml-0.5" />}
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate font-sans text-sm font-semibold uppercase tracking-wide text-bone">
            {title}
          </p>
          {artist && <p className="truncate font-sans text-xs text-ash">{artist}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <input
          type="range"
          min={0}
          max={duration || 0}
          value={currentTime}
          onChange={handleSeek}
          aria-label="Позиція відтворення"
          style={{
            background: `linear-gradient(to right, rgb(var(--color-bone)) ${playedPercent}%, rgb(var(--color-line)) ${playedPercent}%)`,
          }}
          className={cn(
            "h-1 w-full cursor-pointer appearance-none rounded-full",
            "[&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-bone"
          )}
        />
        <span className="text-center font-sans text-[11px] text-ash/70">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
