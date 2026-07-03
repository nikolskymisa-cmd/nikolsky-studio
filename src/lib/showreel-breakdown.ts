export type ShowreelSegment = {
  start: number;
  end: number;
};

export type ShowreelTrack = {
  id: string;
  label: string;
  icon: "target" | "pulse" | "message" | "spark";
  title: string;
  description: string;
  segments: ShowreelSegment[];
};

export const fallbackShowreelDuration = 36;

export const showreelTracks: ShowreelTrack[] = [
  {
    id: "hook",
    label: "ХУК",
    icon: "target",
    title: "Первые секунды",
    description: "Цепляем внимание и задаём тон ролика.",
    segments: [{ start: 0, end: 3 }],
  },
  {
    id: "pace",
    label: "РИТМ",
    icon: "pulse",
    title: "Ритм монтажа",
    description: "Держим динамику через резы, паузы, звук и смену кадров.",
    segments: [{ start: 3, end: 18 }],
  },
  {
    id: "message",
    label: "СМЫСЛ",
    icon: "message",
    title: "Смысл и подача",
    description: "Помогаем зрителю быстро понять идею и не потеряться.",
    segments: [{ start: 8, end: 26 }],
  },
  {
    id: "polish",
    label: "ФИНАЛ",
    icon: "spark",
    title: "Финальная упаковка",
    description: "Цвет, звук, титры и детали, которые делают видео собранным.",
    segments: [{ start: 22, end: 36 }],
  },
];
