"use client";

import { useEffect, useState } from "react";

const WORDS = [
  "дизайнери",
  "розробники",
  "фотографи",
  "2D художники",
  "3D художники",
  "музиканти",
  "відеомейкери",
  "UI/UX дизайнери",
  "motion дизайнери",
  "ілюстратори",
];

const INTERVAL_MS = 2600;
const TRANSITION_MS = 300;

// Only the word swaps — size, weight, and color (text-brass, the one
// accent) stay fixed on the wrapper so the animation never touches
// anything but the text content and its own opacity/position.
export function RotatingWord() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const cycle = setInterval(() => {
      setVisible(false);
      const swap = setTimeout(() => {
        setIndex((current) => (current + 1) % WORDS.length);
        setVisible(true);
      }, TRANSITION_MS);
      return () => clearTimeout(swap);
    }, INTERVAL_MS);

    return () => clearInterval(cycle);
  }, []);

  return (
    <span
      className={`inline-block text-brass transition-all duration-300 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      {WORDS[index]}
    </span>
  );
}
