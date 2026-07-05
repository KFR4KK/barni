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


  {
    slug: "marakyia",
    nickname: "Marakyia",
    realName: "Ілля", // e.g. "Макс" — shown as "(Макс)" under the nickname; leave empty to hide
    skills: ["актор"],
    bio: "Завоз року,актор, вмію все по чучуть і знаю все по чучуть, чемпіон європи з чогось, і тричі рекордсмен України з того самого, люблю енергетіки і колу",
    avatar: "/images/members/marakyia.jpg",
    avatarAlt: "Портрет учасника Marakyia",
    socials: {
      telegram: "https://t.me/Maraky1a",
      tiktok: "https://www.tiktok.com/@_mara_kyia_?_r=1&_t=ZS-97kqE6hRaG9",
      instagram: "https://www.instagram.com/mara_kyia_/",
    },
    quickInfo: [
      { icon: "/images/flags/ua.svg", label: "Вінниця / Київ" },
      { icon: "🎂", label: "18 років" },
      { icon: "🎮", label: "CS2 & Dota2" },
    ],
    joinedDate: "2025-12-19",
    status: "active",
    awards: [
      {
        title: "Рекордсмен по банам від платформ",
        description: "Бан на пів року в роблоксі і в телеграмі на 2 роки",
        icon: "Cross",
      },
      {
        title: "Бабнік 2025",
        description: "",
        icon: "Trophy",
      },
    ],
  },


  {
    slug: "carpingo-42",
    nickname: "carpingo_⁴²",
    realName: "Артур", // e.g. "Макс" — shown as "(Макс)" under the nickname; leave empty to hide
    skills: ["боротьба", "дизайн одягу"],
    bio: "carpingo_⁴² заслужений містер хайп 2024, професійно будує лабіринт 4 рази і не добудовує його, а також вміє дуже ахуєнно й сексуально спати з відкритим ротом",
    avatar: "/images/members/carpingo-42.jpg",
    avatarAlt: "Портрет учасника carpingo_⁴²",
    socials: {
      telegram: "https://t.me/carpingo_42",
      tiktok: "https://www.tiktok.com/@carpingo_42?_r=1&_t=ZS-97kuLdS5BOS",
      instagram: "https://www.instagram.com/carpingo_42",
    },
    quickInfo: [
      { icon: "/images/flags/de.svg", label: "Крайльсхайм" },
      { icon: "🎂", label: "17 років" },
      { icon: "🎮", label: "Minecraft" },
    ],
    joinedDate: "2025-12-24",
    status: "active",
    awards: [
      {
        title: "Містер хайп 2024",
        description: "За єбєйші завози на постоянній основі",
        icon: "Trophy",
      },
      {
        title: "Ухилянт 2024",
        description: "Виїхав з України",
        icon: "Cross",
      },
    ],
  },


  {
    slug: "adolf",
    nickname: "Adolf",
    realName: "Захар", // e.g. "Макс" — shown as "(Макс)" under the nickname; leave empty to hide
    skills: ["актор", "про бедварс плеєр"],
    bio: "Актор, про бедварс плеєр, вміє прокрутити руку на 480 градусів, роняли в дитинстві",
    avatar: "/images/members/adolf.jpg",
    avatarAlt: "Портрет учасника Adolf",
    socials: {
      telegram: "https://t.me/Zkhrmg",
      tiktok: "https://www.tiktok.com/@alldiesold?_r=1&_t=ZS-97kuYIEzNh3",
      instagram: "https://www.instagram.com/alldiesold",
    },
    quickInfo: [
      { icon: "/images/flags/ua.svg", label: "Вінниця" },
      { icon: "🎂", label: "17 років" },
      { icon: "🎵", label: "інді-рок" },
    ],
    joinedDate: "2025-12-19",
    status: "active",
    awards: [
      {
        title: "Терраріст",
        description: "100+ досягнень у Terraria",
        icon: "Trophy",
      },
      {
        title: "Без перспектив стати магом",
        description: 'Через свою зовнішність, його шанси залишитись дєвствєнніком майже дорівнюють нулю',
        icon: "Star",
      },
    ],
  },


  {
    slug: "vintsept",
    nickname: "Vintsept",
    realName: "Андрій", // e.g. "Макс" — shown as "(Макс)" under the nickname; leave empty to hide
    skills: ["файний тіп"],
    bio: "Vintsept — наймолодший адміністратор серверу, найдавніший друг фаундера і обладатєль дуже мємної собаки на ім’я Гільза",
    avatar: "/images/members/vintsept.jpg",
    avatarAlt: "Портрет учасника Vintsept",
    socials: {
      telegram: "https://t.me/UA_amoguc",
      tiktok: "https://www.tiktok.com/@amoguc000?_r=1&_t=ZS-97l2CjdPB3Y",
      instagram: "",
    },
    quickInfo: [
      { icon: "/images/flags/ua.svg", label: "Вінниця" },
      { icon: "🎂", label: "13 років" },
      { icon: "🎮", label: "Minecraft" },
    ],
    joinedDate: "2025-02-17",
    status: "active",
    awards: [
      {
        title: "Та блять",
        description: "Заїбав зразу двох адміністраторів",
        icon: "Cross",
      },
    ],
  },
];
