import type { Member } from "@/data/types";

// This is the ONLY file that needs to change to add, edit, or remove a member.
// To add someone: drop their avatar into /public/images/members and add one
// object to this array. Nothing else in the codebase needs to be touched —
// the /members/[slug] route and the home page index both read from here.
export const members: Member[] = [
  {
    slug: "kefir",
    nickname: "кефір",
    realName: "Максим", // e.g. "Макс" — shown as "(Макс)" under the nickname; leave empty to hide
    skills: ["веб дизайнер", "фотограф"],
    bio: "Народився в Україні, 16 років, цього року закінчив школу, веб-дизайнер, фотограф, і хотів би навчитися моушн-дизайну та 3D",
    avatar: "/images/members/kefir.jpg",
    avatarAlt: "Портрет учасника кефір",
    socials: {
      telegram: "https://t.me/kfr4kk",
      tiktok: "https://www.tiktok.com/@kfr4kk?_r=1&_t=ZM-91LZJNTpt6a",
      instagram: "https://www.instagram.com/kfr4k?igsh=eDdtenhucHJoeG5q",
    },
    quickInfo: [
      { icon: "/images/flags/sk.svg", label: "Жиліна" },
      { icon: "🎂", label: "17 років" },
      { icon: "💻", label: "FOUNDER OF BARNI" },
      { icon: "🎵", label: "Mylancore" },
    ],
    joinedDate: "2025-02-17",
    status: "active",
    awards: [
      {
        title: "Харизма року 2025",
        description: "За неперевершений стиль, харизму та вплив у спільноті.",
        icon: "Trophy",
      },
      {
        title: "Позор Вінниці",
        description: "Мало хто знає за що, і від кого нагорода ;)",
        icon: "Star",
      },
    ],
  },
];
