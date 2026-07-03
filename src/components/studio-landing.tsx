"use client";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
} from "framer-motion";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  CirclePlay,
  Clock3,
  ClipboardList,
  Film,
  Mail,
  Pause,
  Play,
  RefreshCcw,
  ScanSearch,
  Scissors,
  Send,
  ShieldCheck,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties, MouseEvent } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { Reveal } from "@/components/reveal";
import { YouTubeEmbed } from "@/components/youtube-embed";
import { profile } from "@/lib/profile";
import { fallbackShowreelDuration, showreelTracks, type ShowreelTrack } from "@/lib/showreel-breakdown";
import { getThumbnailUrl, getYouTubeId } from "@/lib/youtube";
import { workCategories, type PortfolioCategory, type Work } from "@/types/work";
import editableCopy from "../../data/landing-content.json";

type Lang = "ru" | "en";
type Filter = "All" | PortfolioCategory;

type YouTubePlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  destroy: () => void;
};

type YouTubeApi = {
  Player: new (
    elementId: string,
    options: {
      videoId: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (event: { target: YouTubePlayer }) => void;
        onStateChange?: (event: { data: number; target: YouTubePlayer }) => void;
      };
    },
  ) => YouTubePlayer;
  PlayerState: {
    PLAYING: number;
    PAUSED: number;
    ENDED: number;
  };
};

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<YouTubeApi> | null = null;

function loadYouTubeApi() {
  if (typeof window === "undefined") return Promise.reject(new Error("Window is not available."));
  if (window.YT?.Player) return Promise.resolve(window.YT);

  youtubeApiPromise ??= new Promise<YouTubeApi>((resolve) => {
    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      if (window.YT) resolve(window.YT);
    };

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.appendChild(script);
    }
  });

  return youtubeApiPromise;
}

type StudioLandingProps = {
  works: Work[];
  editorMode?: boolean;
  editorContent?: Partial<LandingCopy> & Record<string, unknown>;
  editorWorks?: Work[];
  editorSelectionKey?: string;
  onEditorSelect?: (selection: EditorSelection) => void;
};

export type EditorPath = Array<string | number>;

export type EditorSelection =
  | {
      type: "text";
      label: string;
      path: EditorPath;
      area?: boolean;
    }
  | {
      type: "work";
      label: string;
      index: number;
    }
  | {
      type: "breakdown";
      label: string;
      trackId: string;
    };

const CONTENT_STORAGE_KEY = "nikolsky-studio-content-v1";
const WORKS_STORAGE_KEY = "nikolsky-studio-works-v1";

const categoryLabels: Record<string, Record<Lang, string>> = {
  Showreel: { ru: "Шоурил", en: "Showreel" },
  "Reels Pro": { ru: "Reels Pro", en: "Reels Pro" },
  "Reels Volume": { ru: "Reels Volume", en: "Reels Volume" },
  "Product Motion": { ru: "Product Motion", en: "Product Motion" },
  Courses: { ru: "Courses", en: "Courses" },
  "Motion Shorts": { ru: "Motion Shorts", en: "Motion Shorts" },
  "Ads / UGC": { ru: "Ads / UGC", en: "Ads / UGC" },
};

const categoryDescriptions: Partial<Record<PortfolioCategory, Record<Lang, string>>> = {
  "Reels Pro": {
    ru: "Сложный монтаж коротких роликов: структура, хук, удержание, дорогие субтитры, motion-вставки, tracking и After Effects.",
    en: "Advanced short-form editing: structure, hook, retention, premium captions, motion inserts, tracking and After Effects.",
  },
  "Reels Volume": {
    ru: "Пакетная нарезка для регулярного контента: мысли из длинных видео, лёгкие субтитры, B-roll, переходы и звуковые акценты.",
    en: "Batch short-form editing for regular content: ideas from long videos, clean captions, B-roll, simple transitions and sound accents.",
  },
  "Product Motion": {
    ru: "Motion-ролики для SaaS, crypto, tech и запусков: продуктовая упаковка, UI-анимация, 16:9, объяснение функции или сервиса.",
    en: "Motion videos for SaaS, crypto, tech and launches: product packaging, UI animation, 16:9, feature or service explanation.",
  },
  Courses: {
    ru: "Монтаж курсов, уроков и образовательного контента: чистка, структура, звук, титры и понятная подача.",
    en: "Editing for courses, lessons and educational content: cleanup, structure, sound, titles and clear delivery.",
  },
  "Motion Shorts": {
    ru: "Короткие vertical motion-ролики 5–10 секунд под быстрый visual hook, удержание и репосты.",
    en: "Short vertical motion videos, 5–10 seconds, built for a fast visual hook, retention and shares.",
  },
  "Ads / UGC": {
    ru: "Рекламные и UGC-style ролики для бизнеса, продукта или личного бренда: быстрый смысл, понятный оффер, несколько вариантов подачи.",
    en: "Ad and UGC-style videos for business, products or personal brands: quick message, clear offer and multiple creative angles.",
  },
};

const breakdownTrackCopy: Record<string, Record<Lang, Pick<ShowreelTrack, "label" | "title" | "description">>> = {
  hook: {
    ru: { label: "ХУК", title: "Первые секунды", description: "Цепляем внимание и задаём тон ролика." },
    en: { label: "HOOK", title: "First seconds", description: "Hook attention and set the tone of the video." },
  },
  pace: {
    ru: { label: "РИТМ", title: "Ритм монтажа", description: "Держим динамику через резы, паузы, звук и смену кадров." },
    en: { label: "PACE", title: "Editing rhythm", description: "Keep momentum through cuts, pauses, sound and shot changes." },
  },
  message: {
    ru: { label: "СМЫСЛ", title: "Смысл и подача", description: "Помогаем зрителю быстро понять идею и не потеряться." },
    en: { label: "MESSAGE", title: "Message and delivery", description: "Help the viewer understand the idea quickly and stay oriented." },
  },
  polish: {
    ru: { label: "ФИНАЛ", title: "Финальная упаковка", description: "Цвет, звук, титры и детали, которые делают видео собранным." },
    en: { label: "POLISH", title: "Final polish", description: "Color, sound, titles and details that make the video feel finished." },
  },
};

const defaultCopy = {
  ru: {
    nav: ["Работы", "Продукты", "Метод", "Условия", "Контакт"],
    label: "Моушн-дизайн / видеомонтаж / постпродакшн",
    eyebrow: "Монтажная система Nikolsky",
    rec: "Reels · YouTube · Motion",
    safeFrame: "Кадр / 16:9",
    productLabel: "Услуга",
    stepLabel: "Шаг",
    blockLabel: "Блок",
    heroTitle: "Режиссирую внимание.",
    heroSub:
      "Собираю исходники в Reels, YouTube-выпуски, курсы и продуктовые ролики — с понятной структурой, чистым темпом и подачей под задачу.",
    casesCta: "Смотреть работы",
    projectCta: "Обсудить проект",
    trust: "6–7 лет в монтаже · Reels / YouTube / Motion / Courses · работа по предоплате",
    showreelCta: "Смотреть шоурил",
    showreelLabel: "ШОУРИЛ_01",
    tracks: ["V1: смысл", "V2: темп", "A1: речь", "FX: акцент"],
    stats: [
      ["6–7 лет", "опыт монтажа"],
      ["Short-form", "Reels / Shorts / TikTok"],
      ["Long-form", "YouTube / курсы"],
      ["Motion", "product / SaaS / запуск"],
    ],
    positionEyebrow: "Диагностика",
    positionTitle: "Когда исходники есть, но ролик не работает",
    positionText:
      "Часто проблема не в съёмке, а в сборке: видео долго разгоняется, мысль теряется, темп проседает, а визуальная подача выглядит разрозненно. Я помогаю собрать материал в понятный ролик под задачу и площадку.",
    positionCards: [
      ["Слабое начало", "Пересобираю первые секунды, чтобы зрителю было понятно, зачем смотреть дальше."],
      ["Видео тянется", "Убираю лишние паузы, повторы и провалы по темпу, чтобы ролик ощущался собранным."],
      ["Смысл теряется", "Выстраиваю структуру: что сказать первым, что оставить, что убрать и где усилить акцент."],
      ["Нет единого стиля", "Собираю подачу через субтитры, B-roll, звук, motion-элементы и визуальные акценты."],
    ],
    productsEyebrow: "Продукты",
    productsTitle: "С чем я могу помочь",
    products: [
      {
        code: "P01",
        title: "Короткие ролики",
        audience: "Для экспертов, блогеров, брендов и бизнеса.",
        text: "Собираю короткие ролики из исходников, съёмок, подкастов и говорящих форматов — с акцентом на первые секунды, темп и понятную подачу.",
        includes: [
          "отбор сильных фрагментов",
          "монтаж под удержание",
          "субтитры и акценты",
          "дополнительные кадры и моушн-элементы",
          "экспорт под Reels / Shorts / TikTok",
        ],
        cta: "Обсудить короткие ролики",
      },
      {
        code: "P02",
        title: "Продуктовый motion",
        audience: "Для SaaS, crypto, tech, запусков, продуктов и презентаций.",
        text: "Помогаю упаковать продукт или запуск в динамичный ролик, который быстро доносит суть и выглядит аккуратно и современно.",
        includes: [
          "структура ролика",
          "монтажный и визуальный ритм",
          "акценты на функции",
          "титры, UI-фрагменты, графика",
          "версии под соцсети / сайт / презентацию",
        ],
        cta: "Обсудить запуск",
      },
      {
        code: "P03",
        title: "Длинный формат и обучение",
        audience: "Для YouTube, курсов, подкастов и образовательного контента.",
        text: "Монтирую длинные форматы так, чтобы материал не рассыпался по ритму, оставался понятным и не терял зрителя по дороге.",
        includes: [
          "чистка материала",
          "структура эпизода",
          "монтаж по смысловым блокам",
          "работа с паузами и темпом",
          "экспорт 16:9 и/или 9:16",
        ],
        cta: "Обсудить длинный формат",
      },
    ],
    reelEyebrow: "Шоурил",
    reelTitle: "Шоурил Nikolsky Studio",
    reelText: "Короткий обзор работ и направлений: Reels, YouTube, курсы и продуктовые ролики.",
    chapters: "Разделы таймлайна",
    casesEyebrow: "SELECTED WORKS",
    casesTitle: "РАБОТЫ",
    casesText:
      "Выберите формат и посмотрите примеры: сложные Reels, регулярная нарезка, product motion, курсы, motion shorts и рекламные креативы.",
    all: "Все",
    task: "Задача",
    done: "Что сделано",
    why: "Почему работает",
    deliverables: "Что отдаю",
    openCase: "Открыть кейс",
    youtube: "YouTube",
    methodEyebrow: "Метод",
    methodTitle: "Как я работаю",
    methodSteps: [
      ["Задача", "Понимаю формат, площадку, исходники и ожидаемый результат."],
      ["Структура", "Собираю логику ролика: что оставить, что убрать, где ускорить и где усилить акцент."],
      ["Монтаж", "Работаю с темпом, резами, паузами, субтитрами, дополнительными кадрами и моушн-элементами."],
      ["Выдача", "Готовлю финальные версии и вношу согласованные правки."],
    ],
    termsEyebrow: "Условия",
    termsTitle: "Условия работы",
    termsText:
      "Понятный процесс без затянутых тестов и размытых договорённостей.",
    terms: [
      ["Небольшие задачи", "100% предоплата до старта."],
      ["Средние проекты", "50% до старта, 50% перед финальной выдачей."],
      ["Большие проекты", "Работа по этапам."],
      ["Тест", "Короткий фрагмент 5–10 секунд. Полноценный тестовый ролик оплачивается."],
    ],
    contactEyebrow: "Контакт",
    contactTitle: "Давайте соберём ваш материал в сильное видео.",
    contactText:
      "Напишите, какой формат нужен: Reels, запуск, продуктовый ролик, YouTube, курс или регулярный контент.",
    email: "Почта",
    vk: "VK",
    closeVideo: "Закрыть видео",
    openYoutube: "Открыть на YouTube",
    footer: "Видео только через YouTube / без бэкенда / без локального хранения",
  },
  en: {
    nav: ["Works", "Products", "Method", "Terms", "Contact"],
    label: "Motion design / video editor / attention director",
    eyebrow: "Nikolsky Control Room",
    rec: "Reels · YouTube · Motion",
    safeFrame: "Safe frame / 16:9",
    productLabel: "Product",
    stepLabel: "Step",
    blockLabel: "Block",
    heroTitle: "I direct attention.",
    heroSub:
      "I turn raw footage into Reels, YouTube episodes, courses, and product videos with clear structure, clean pacing, and task-driven delivery.",
    casesCta: "View cases",
    projectCta: "Discuss project",
    trust: "6–7 years editing · Reels / YouTube / Motion / Courses · prepaid work",
    showreelCta: "Watch showreel",
    showreelLabel: "SHOWREEL_01",
    tracks: ["V1: meaning", "V2: pace", "A1: voice", "FX: accent"],
    stats: [
      ["6–7 yrs", "editing experience"],
      ["Short-form", "Reels / Shorts / TikTok"],
      ["Long-form", "YouTube / courses"],
      ["Motion", "product / SaaS / launch"],
    ],
    positionEyebrow: "Diagnostics",
    positionTitle: "When the footage is there, but the video does not work",
    positionText:
      "The problem is often not the footage but the assembly: the video takes too long to start, the message drifts, the pacing collapses, and the visuals feel disconnected. I help assemble the material into a clear video tailored to the task and platform.",
    positionCards: [
      ["Weak Opening", "I rebuild the first seconds so the viewer understands why they should keep watching."],
      ["Video Drags On", "I remove unnecessary pauses, repetition, and pacing gaps so the video feels tight and intentional."],
      ["Meaning Gets Lost", "I build structure: what to say first, what to keep, what to cut, and where to strengthen the point."],
      ["No Unified Style", "I package the delivery through captions, B-roll, sound, motion elements, and visual accents."],
    ],
    productsEyebrow: "Products",
    productsTitle: "Work formats",
    productsText: "Choose the task: Reels Pro, batch short-form editing, Product Motion, Courses, Motion Shorts or Ads / UGC.",
    pricingNote: "Final price depends on footage volume, motion complexity, deadline and number of revisions.",
    products: [
      {
        code: "REELS PRO",
        title: "Reels Pro",
        audience: "For experts, brands, and premium image-led videos.",
        text: "Advanced short-form editing: hook, structure, captions, B-roll, motion inserts, tracking and After Effects.",
        price: "from ₽3,000–7,000 / video",
        timeline: "complex motion — after review",
        includes: [
          "structure and hook",
          "captions / accents",
          "motion / B-roll",
          "9:16 export",
        ],
        cta: "Discuss Reels Pro",
      },
      {
        code: "REELS VOLUME",
        title: "Reels Volume",
        audience: "For regular content and batch short-form editing.",
        text: "I turn long-form ideas into short clips with clean captions, B-roll, simple transitions and sound accents.",
        price: "from ₽700–1,200 / video",
        timeline: "packages from 10 videos",
        includes: [
          "idea extraction",
          "clean captions",
          "B-roll / transitions",
          "platform exports",
        ],
        cta: "Discuss Reels Volume",
      },
      {
        code: "PRODUCT MOTION",
        title: "Product Motion",
        audience: "For SaaS, crypto, tech and launches.",
        text: "I package a product or feature into a motion video: UI animation, product structure, 16:9 and clear delivery.",
        price: "from ₽150–300 / sec",
        timeline: "minimum project — from ₽12,000",
        includes: [
          "explanation structure",
          "UI animation",
          "motion design",
          "16:9 export",
        ],
        cta: "Discuss Product Motion",
      },
      {
        code: "COURSES",
        title: "Courses",
        audience: "For courses, lessons and educational content.",
        text: "I structure lessons with pause cleanup, sound, titles, slides and clear delivery.",
        price: "from ₽1,500–3,000 / lesson",
        timeline: "full course — after review",
        includes: [
          "pause cleanup",
          "lesson structure",
          "sound / titles",
          "lesson export",
        ],
        cta: "Discuss Courses",
      },
      {
        code: "MOTION SHORTS",
        title: "Motion Shorts",
        audience: "For short visual hooks and vertical motion videos.",
        text: "Short 5–10 second vertical motion videos built for a fast visual hook and retention.",
        price: "from ₽3,000–8,000 / video",
        timeline: "after review",
        includes: [
          "visual hook",
          "motion loop",
          "pace and text",
          "9:16 export",
        ],
        cta: "Discuss Motion Shorts",
      },
      {
        code: "ADS / UGC",
        title: "Ads / UGC",
        audience: "For business, products and personal brands.",
        text: "Ad and UGC-style videos with a quick message, clear offer and multiple creative angles.",
        price: "from ₽3,000–10,000 / creative",
        timeline: "after review",
        includes: [
          "hook and offer",
          "task-based edit",
          "captions",
          "creative angles",
        ],
        cta: "Discuss Ads / UGC",
      },
    ],
    reelEyebrow: "Showreel",
    reelTitle: "Nikolsky Studio Showreel",
    reelText: "60 seconds of short-form, motion, YouTube, courses, and product videos.",
    chapters: "Timeline chapters",
    casesEyebrow: "SELECTED WORKS",
    casesTitle: "WORKS",
    casesText:
      "Choose a format and watch relevant examples: advanced Reels, batch short-form editing, product motion, courses, motion shorts and ad creatives.",
    all: "All",
    task: "Task",
    done: "What was done",
    why: "Why it works",
    deliverables: "Deliverables",
    openCase: "Open case",
    youtube: "YouTube",
    methodEyebrow: "Method",
    methodTitle: "Meaning first. Rhythm second. Picture third.",
    methodSteps: [
      ["Brief", "I define who the video is for, why it exists, where it goes, and what action it should cause."],
      ["Attention Map", "I mark where the viewer hooks, where they may drop, and where meaning needs more force."],
      ["Edit System", "I build pace, cuts, pauses, subtitles, B-roll, motion, and visual accents."],
      ["Delivery", "I deliver final versions for the needed platforms. Revisions stay within the agreed scope."],
    ],
    termsEyebrow: "Terms",
    termsTitle: "Clear terms. No endless free tests.",
    termsText:
      "I work with prepayment because editing is not button demonstration. It is full work with meaning, rhythm, and material.",
    terms: [
      ["Small tasks", "100% prepayment before start."],
      ["Medium projects", "50% before start, 50% before final delivery."],
      ["Large projects", "Stages / milestones."],
      ["Test", "A short 5–10 second fragment. A full test video is paid."],
    ],
    contactEyebrow: "Contact",
    contactTitle: "Bring raw material. Leave with a story cut for the task.",
    contactText: "Tell me the format: Reels, launch, product video, YouTube, course, or regular content.",
    email: "Email",
    vk: "VK",
    closeVideo: "Close video",
    openYoutube: "Open on YouTube",
    footer: "YouTube embeds only / no backend / no local video storage",
  },
} as const;

type LandingCopy = typeof defaultCopy;
export type { LandingCopy };

type RuntimeText = LandingCopy[Lang] & {
  priceLabel?: string;
  deadlineLabel?: string;
  includedLabel?: string;
  faqOpen?: string;
  faqClose?: string;
  productsText?: string;
  pricingNote?: string;
  problemsLabel?: string;
  problems?: readonly string[];
  methodText?: string;
  methodNote?: string;
  trustItems?: readonly string[];
  faq?: readonly (readonly [string, string])[];
};

function mergeCopy<T>(base: T, override: unknown): T {
  if (!override || typeof override !== "object" || Array.isArray(override)) {
    return base;
  }

  const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };

  for (const [key, value] of Object.entries(override)) {
    const baseValue = (base as Record<string, unknown>)[key];
    result[key] =
      baseValue &&
      typeof baseValue === "object" &&
      !Array.isArray(baseValue) &&
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
        ? mergeCopy(baseValue, value)
        : value;
  }

  return result as T;
}

const copy = mergeCopy(defaultCopy, editableCopy) as LandingCopy;

const navHrefs = ["#work", "#products", "#method", "#terms", "#contact"];
const waveformSeed = [22, 48, 30, 66, 36, 74, 26, 52, 60, 32, 78, 40, 56, 24, 70, 46];

export function getEditorSelectionKey(selection: EditorSelection) {
  if (selection.type === "work") return `work:${selection.index}`;
  if (selection.type === "breakdown") return `breakdown:${selection.trackId}`;
  return `text:${selection.path.join(".")}`;
}

function VkIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M15.684 0H8.316C3.724 0 0 3.723 0 8.316v7.368C0 20.277 3.723 24 8.316 24h7.368C20.277 24 24 20.277 24 15.684V8.316C24 3.723 20.277 0 15.684 0zm3.692 17.123h-1.797c-.66 0-.862-.523-2.04-1.717-1.028-1.047-1.483-1.182-1.734-1.182-.354 0-.455.103-.455.62v1.448c0 .44-.14.706-1.3.706-1.936 0-4.087-1.176-5.598-3.363C4.14 10.9 3.86 9.54 3.86 9.09c0-.302.103-.62.62-.62h1.797c.467 0 .644.216.825.718.93 2.688 2.49 5.04 3.13 5.04.243 0 .354-.112.354-.686V11.05c-.076-1.21-.714-1.316-.714-1.75 0-.21.168-.43.44-.43h2.84c.37 0 .5.2.5.63v3.39c0 .37.166.5.278.5.243 0 .44-.14.88-.585 1.322-1.47 2.27-3.735 2.27-3.735.12-.26.34-.5.82-.5h1.796c.56 0 .68.29.56.7-.234.828-2.49 4.256-2.49 4.256-.202.336-.28.486 0 .857.202.3.874.864 1.315 1.387.82.932.908 1.358.908 1.704 0 .324-.3.466-.7.466z" />
    </svg>
  );
}

function getWorkTitle(work: Work, lang: Lang) {
  return lang === "ru" ? work.titleRu ?? work.title : work.title;
}

function getWorkDescription(work: Work, lang: Lang) {
  return lang === "ru" ? work.descriptionRu ?? work.description : work.description;
}

function getWorkTask(work: Work, lang: Lang) {
  return lang === "ru" ? work.taskRu ?? work.task : work.task;
}

function getWorkFormat(work: Work, lang: Lang) {
  return lang === "ru" ? work.formatRu ?? work.format : work.format;
}

function getWorkDone(work: Work, lang: Lang) {
  return lang === "ru" ? work.workDoneRu ?? work.workDone ?? [] : work.workDone ?? [];
}

function getWorkWhy(work: Work, lang: Lang) {
  return lang === "ru" ? work.whyItWorksRu ?? work.whyItWorks : work.whyItWorks;
}

function getDeliverables(work: Work, lang: Lang) {
  return lang === "ru" ? work.deliverablesRu ?? work.deliverables ?? [] : work.deliverables ?? [];
}

function getCategoryLabel(category: string, lang: Lang) {
  return categoryLabels[category]?.[lang] ?? category;
}

function viewWork(work: Work, lang: Lang): Work {
  return {
    ...work,
    title: getWorkTitle(work, lang),
    description: getWorkDescription(work, lang),
    category: getCategoryLabel(work.category, lang),
    task: getWorkTask(work, lang),
    format: getWorkFormat(work, lang),
    workDone: getWorkDone(work, lang),
    whyItWorks: getWorkWhy(work, lang),
    deliverables: getDeliverables(work, lang),
  };
}

function clipTime(index: number) {
  return `00:${String(index * 8 + 3).padStart(2, "0")}:${String((index * 11) % 24).padStart(2, "0")}`;
}

function formatSeconds(value: number) {
  const safeValue = Math.max(0, Math.floor(value));
  const minutes = Math.floor(safeValue / 60);
  const seconds = safeValue % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function Waveform({ seed = 0, bars = 32, className = "" }: { seed?: number; bars?: number; className?: string }) {
  return (
    <div className={`flex h-12 items-center gap-1 overflow-hidden ${className}`} aria-hidden>
      {Array.from({ length: bars }).map((_, index) => {
        const height = waveformSeed[(index + seed) % waveformSeed.length];
        return (
          <span
            key={`${seed}-${index}`}
            className="w-1 shrink-0 bg-accent/75"
            style={{ height: `${height}%`, opacity: 0.24 + ((index + seed) % 4) * 0.12 }}
          />
        );
      })}
    </div>
  );
}

export function StudioLanding({
  works,
  editorMode = false,
  editorContent,
  editorWorks,
  editorSelectionKey,
  onEditorSelect,
}: StudioLandingProps) {
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 24, restDelta: 0.001 });
  const [lang, setLang] = useState<Lang>("ru");
  const [activeFilter, setActiveFilter] = useState<Filter>("All");
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);
  const [activeMethodStep, setActiveMethodStep] = useState(0);
  const [faqVisible, setFaqVisible] = useState(false);
  const [openFaqItems, setOpenFaqItems] = useState<number[]>([0]);
  const [runtimeCopy, setRuntimeCopy] = useState<LandingCopy>(copy);
  const [runtimeWorks, setRuntimeWorks] = useState<Work[]>(works);
  const liveCopy = editorContent ? (mergeCopy(copy, editorContent) as LandingCopy) : runtimeCopy;
  const liveWorks = editorWorks ?? runtimeWorks;
  const t = liveCopy[lang];
  const runtimeT = t as RuntimeText;
  const editorStyles = ((liveCopy as unknown as { _editor?: { styles?: Record<string, number | string> } })._editor?.styles ?? {});
  const editorLinks = ((liveCopy as unknown as { _editor?: { links?: Partial<typeof profile> } })._editor?.links ?? {});
  const customBreakdownTracks = (liveCopy as unknown as { _editor?: { showreelTracks?: ShowreelTrack[] } })._editor?.showreelTracks;
  const breakdownTracks = Array.isArray(customBreakdownTracks) && customBreakdownTracks.length ? customBreakdownTracks : showreelTracks;
  const localizedBreakdownTracks = useMemo(
    () =>
      breakdownTracks.map((track) => ({
        ...track,
        ...(breakdownTrackCopy[track.id]?.[lang] ?? {}),
      })),
    [breakdownTracks, lang],
  );
  const links = { ...profile, ...editorLinks };
  const mainStyle = {
    "--accent": typeof editorStyles.accent === "string" ? editorStyles.accent : undefined,
  } as CSSProperties;
  const heroTitleSize = Number(editorStyles.heroTitleSize ?? 64);
  const heroSubtitleSize = Number(editorStyles.heroSubtitleSize ?? 20);
  const ctaHeight = Number(editorStyles.ctaHeight ?? 56);
  const ctaPadding = Number(editorStyles.ctaPadding ?? 28);
  const ctaFontSize = Number(editorStyles.ctaFontSize ?? 15);
  const heroTitleStyle = editorStyles.heroTitleSize
    ? ({ fontSize: `clamp(${Math.max(30, heroTitleSize * 0.68)}px, ${Math.max(4.8, heroTitleSize / 7.8)}vw, ${heroTitleSize * 1.6}px)` } as CSSProperties)
    : undefined;
  const heroSubtitleStyle = editorStyles.heroSubtitleSize
    ? ({ fontSize: `${heroSubtitleSize}px`, lineHeight: `${Math.round(heroSubtitleSize * 1.55)}px` } as CSSProperties)
    : undefined;
  const bodyScaleStyle = editorStyles.bodyScale
    ? ({ fontSize: `${Number(editorStyles.bodyScale)}%` } as CSSProperties)
    : undefined;
  const heroGridStyle = {
    columnGap: editorStyles.heroGap ? `${Number(editorStyles.heroGap)}px` : undefined,
  } as CSSProperties;
  const heroTextStyle = {
    position: "relative",
    left: editorStyles.heroTextX ? `${Number(editorStyles.heroTextX)}px` : undefined,
  } as CSSProperties;
  const heroMediaStyle = {
    position: "relative",
    left: editorStyles.heroMediaX ? `${Number(editorStyles.heroMediaX)}px` : undefined,
    transform: `scale(${Number(editorStyles.heroMediaScale ?? 100) / 100})`,
    transformOrigin: "center",
  } as CSSProperties;
  const ctaStyle = {
    height: editorStyles.ctaHeight ? `clamp(44px, ${ctaHeight / 8}vw, ${ctaHeight}px)` : undefined,
    paddingInline: editorStyles.ctaPadding ? `clamp(14px, ${ctaPadding / 8}vw, ${ctaPadding}px)` : undefined,
    fontSize: editorStyles.ctaFontSize ? `clamp(12px, ${ctaFontSize / 6}vw, ${ctaFontSize}px)` : undefined,
  } as CSSProperties;
  const blockStyle = (key: string) =>
    ({
      position: "relative",
      left: editorStyles[`${key}X`] ? `${Number(editorStyles[`${key}X`])}px` : undefined,
    }) as CSSProperties;

  const showreel = useMemo(() => {
    return [...liveWorks].sort((a, b) => {
      const featuredDiff = Number(Boolean(b.featured)) - Number(Boolean(a.featured));
      if (featuredDiff) return featuredDiff;
      const priorityDiff = Number(b.priority ?? 0) - Number(a.priority ?? 0);
      if (priorityDiff) return priorityDiff;
      return Number(b.category === "Showreel") - Number(a.category === "Showreel");
    })[0];
  }, [liveWorks]);
  const portfolioWorks = useMemo(() => liveWorks.filter((work) => !work.featured), [liveWorks]);
  const availableWorkFilters = useMemo(
    () => workCategories.filter((category) => portfolioWorks.some((work) => work.category === category)),
    [portfolioWorks],
  );
  const safeActiveFilter =
    activeFilter === "All" || availableWorkFilters.includes(activeFilter) ? activeFilter : "All";
  const filteredWorks =
    safeActiveFilter === "All"
      ? portfolioWorks
      : portfolioWorks.filter((work) => work.category === safeActiveFilter);
  const activeCategoryDescription =
    safeActiveFilter === "All" ? null : categoryDescriptions[safeActiveFilter]?.[lang] ?? null;
  const toggleFaqItem = (index: number) => {
    setOpenFaqItems((current) =>
      current.includes(index) ? current.filter((item) => item !== index) : [...current, index],
    );
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    if (editorContent && editorWorks) return;
    const readEditorContent = () => {
      try {
        const raw = window.localStorage.getItem(CONTENT_STORAGE_KEY);
        setRuntimeCopy(raw ? (mergeCopy(copy, JSON.parse(raw)) as LandingCopy) : copy);
      } catch {
        setRuntimeCopy(copy);
      }
    };
    const readEditorWorks = () => {
      try {
        const raw = window.localStorage.getItem(WORKS_STORAGE_KEY);
        setRuntimeWorks(raw ? (JSON.parse(raw) as Work[]) : works);
      } catch {
        setRuntimeWorks(works);
      }
    };

    readEditorContent();
    readEditorWorks();
    const onStorage = (event: StorageEvent) => {
      if (event.key === CONTENT_STORAGE_KEY) readEditorContent();
      if (event.key === WORKS_STORAGE_KEY) readEditorWorks();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [works, editorContent, editorWorks]);

  const selectInEditor = (selection: EditorSelection) => (event: MouseEvent<HTMLElement>) => {
    if (!editorMode) return;
    event.preventDefault();
    event.stopPropagation();
    onEditorSelect?.(selection);
  };

  const editorClass = (selection: EditorSelection) => {
    if (!editorMode) return "";
    const active = editorSelectionKey === getEditorSelectionKey(selection);
    return active
      ? " cursor-pointer ring-2 ring-accent ring-offset-2 ring-offset-black/80"
      : " cursor-pointer ring-1 ring-white/10 hover:ring-accent/70";
  };

  useEffect(() => {
    const hasOverlay = Boolean(selectedWork) || faqVisible;
    if (!hasOverlay) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (selectedWork) {
        setSelectedWork(null);
        return;
      }
      setFaqVisible(false);
    };

    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [selectedWork, faqVisible]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground" style={mainStyle}>
      <StudioBackground />
      <motion.div
        aria-hidden
        className="fixed left-0 top-0 z-50 h-px w-full origin-left bg-accent"
        style={{ scaleX }}
      />

      <Header lang={lang} setLang={setLang} nav={t.nav} projectCta={t.projectCta} contactUrl={links.telegramUrl} editorMode={editorMode} />

      <section id="top" className="relative mx-auto w-full max-w-7xl px-4 pb-8 pt-28 sm:px-6 sm:pt-24 lg:px-8" style={bodyScaleStyle}>
        <div
          className="relative z-10 grid gap-6 lg:min-h-[640px] lg:grid-cols-[minmax(0,1fr)_470px] lg:items-center lg:gap-8 xl:min-h-[680px] xl:grid-cols-[minmax(0,1fr)_520px]"
          style={heroGridStyle}
        >
          <motion.div
            initial={false}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            style={heroTextStyle}
          >
            <p
              onClickCapture={selectInEditor({ type: "text", label: "Направление под логотипом", path: ["ru", "label"] })}
              className={`mb-4 font-mono text-[11px] uppercase leading-5 text-accent sm:mb-5 sm:text-xs${editorClass({ type: "text", label: "Направление под логотипом", path: ["ru", "label"] })}`}
            >
              {t.label}
            </p>
            <h1
              onClickCapture={selectInEditor({ type: "text", label: "Главный заголовок", path: ["ru", "heroTitle"] })}
              className={`max-w-4xl text-[2.36rem] font-semibold uppercase leading-[0.9] text-white min-[380px]:text-[2.65rem] sm:text-[5.5rem] sm:leading-[0.84] md:text-[6.4rem] lg:text-[5.05rem] xl:text-[5.45rem]${editorClass({ type: "text", label: "Главный заголовок", path: ["ru", "heroTitle"] })}`}
              style={heroTitleStyle}
            >
              {t.heroTitle}
            </h1>
            <p
              onClickCapture={selectInEditor({ type: "text", label: "Подзаголовок первого экрана", path: ["ru", "heroSub"], area: true })}
              className={`mt-5 max-w-2xl text-base leading-7 text-white/72 sm:mt-7 sm:text-xl sm:leading-8${editorClass({ type: "text", label: "Подзаголовок первого экрана", path: ["ru", "heroSub"], area: true })}`}
              style={heroSubtitleStyle}
            >
              {t.heroSub}
            </p>
            <div className="mt-7 grid grid-cols-2 gap-2.5 sm:mt-9 sm:flex sm:flex-row sm:gap-3">
              <a
                href="#work"
                onClickCapture={selectInEditor({ type: "text", label: "Кнопка смотреть работы", path: ["ru", "casesCta"] })}
                className={`inline-flex h-[50px] items-center justify-center gap-2 bg-accent px-4 text-sm font-semibold text-black shadow-[0_0_34px_rgba(0,183,255,0.16)] transition hover:bg-white sm:h-14 sm:px-7 sm:text-[15px]${editorClass({ type: "text", label: "Кнопка смотреть работы", path: ["ru", "casesCta"] })}`}
                style={ctaStyle}
              >
                <CirclePlay size={17} />
                {t.casesCta}
              </a>
              <a
                href={links.telegramUrl}
                target="_blank"
                rel="noreferrer"
                onClickCapture={selectInEditor({ type: "text", label: "Кнопка обсудить проект", path: ["ru", "projectCta"] })}
                className={`inline-flex h-[50px] items-center justify-center gap-2 border border-white/16 bg-white/[0.035] px-4 text-sm font-semibold text-white transition hover:border-accent hover:text-accent sm:h-14 sm:px-7 sm:text-[15px]${editorClass({ type: "text", label: "Кнопка обсудить проект", path: ["ru", "projectCta"] })}`}
                style={ctaStyle}
              >
                <Send size={17} />
                {t.projectCta}
              </a>
            </div>
            <p
              onClickCapture={selectInEditor({ type: "text", label: "Строка доверия под кнопками", path: ["ru", "trust"], area: true })}
              className={`mt-5 max-w-2xl border-l border-accent/55 pl-3 text-sm leading-6 text-white/58 sm:mt-6 sm:pl-4${editorClass({ type: "text", label: "Строка доверия под кнопками", path: ["ru", "trust"], area: true })}`}
            >
              {t.trust}
            </p>
          </motion.div>

          <div style={heroMediaStyle}>
            <ShowreelPlayer
              work={viewWork(showreel, lang)}
              button={t.showreelCta}
              tracks={localizedBreakdownTracks}
              breakdownSummary={lang === "ru" ? "Хук, ритм, смысл, упаковка." : "Hook, pace, message, polish."}
              seekLabel={lang === "ru" ? "Перейти к" : "Jump to"}
              editorMode={editorMode}
              editorSelectionKey={editorSelectionKey}
              onEditorSelect={onEditorSelect}
            />
          </div>
        </div>
      </section>

      <section id="work" className="scene-section relative px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <Reveal className="mx-auto max-w-7xl" style={blockStyle("cases")}>
          <div className="mb-8 grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
            <div
              onClickCapture={selectInEditor({ type: "text", label: "Работы: заголовок", path: ["ru", "casesTitle"] })}
              className={editorClass({ type: "text", label: "Работы: заголовок", path: ["ru", "casesTitle"] })}
            >
              <SectionHeader eyebrow={t.casesEyebrow} title={t.casesTitle} text={t.casesText} />
            </div>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:justify-end lg:overflow-visible lg:px-0">
              {(["All", ...availableWorkFilters] as Filter[]).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`h-10 shrink-0 border px-4 font-mono text-xs uppercase transition ${
                    safeActiveFilter === filter
                      ? "border-accent bg-accent text-black"
                      : "border-white/12 bg-white/[0.025] text-white/52 hover:border-accent hover:text-accent"
                  }`}
                >
                  {filter === "All" ? t.all : getCategoryLabel(filter, lang)}
                </button>
              ))}
            </div>
          </div>

          {activeCategoryDescription ? (
            <motion.p
              key={`${safeActiveFilter}-${lang}`}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
              className="mb-5 max-w-4xl border-l border-accent/55 bg-black/18 py-2 pl-4 text-sm leading-6 text-white/60"
            >
              {activeCategoryDescription}
            </motion.p>
          ) : null}

          <motion.div layout className="grid gap-3">
            <AnimatePresence mode="popLayout">
              {filteredWorks.map((work, index) => (
                <div
                  key={work.id ?? work.title}
                  onClickCapture={selectInEditor({
                    type: "work",
                    label: `Работа: ${getWorkTitle(work, "ru")}`,
                    index: Math.max(0, liveWorks.findIndex((item) => item === work)),
                  })}
                  className={editorClass({
                    type: "work",
                    label: `Работа: ${getWorkTitle(work, "ru")}`,
                    index: Math.max(0, liveWorks.findIndex((item) => item === work)),
                  })}
                >
                  <CasePanel
                    work={work}
                    lang={lang}
                    index={index}
                    labels={{ task: t.task, done: t.done, open: t.openCase, youtube: t.youtube }}
                    onSelect={setSelectedWork}
                    reduceMotion={Boolean(reduceMotion)}
                  />
                </div>
              ))}
            </AnimatePresence>
          </motion.div>
        </Reveal>
      </section>

      <section id="products" className="scene-section relative overflow-hidden px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <SectionGlow variant="services" />
        <Reveal className="relative z-10 mx-auto max-w-7xl" style={blockStyle("products")}>
          <div
            onClickCapture={selectInEditor({ type: "text", label: "Услуги: заголовок", path: ["ru", "productsTitle"] })}
            className={editorClass({ type: "text", label: "Услуги: заголовок", path: ["ru", "productsTitle"] })}
          >
            <SectionHeader eyebrow={t.productsEyebrow} title={t.productsTitle} text={runtimeT.productsText} />
          </div>

          <div className="mt-8 grid items-stretch gap-3 md:grid-cols-2 xl:grid-cols-4">
            {t.products.map((product, index) => (
              <motion.div
                key={product.code}
                initial={reduceMotion ? false : { opacity: 0, transform: "translateY(18px)" }}
                whileInView={reduceMotion ? undefined : { opacity: 1, transform: "translateY(0px)" }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.34, delay: index * 0.045, ease: [0.23, 1, 0.32, 1] }}
                onClickCapture={selectInEditor({ type: "text", label: `Продукт ${index + 1}`, path: ["ru", "products", index, "title"] })}
                className={`h-full${editorClass({ type: "text", label: `Продукт ${index + 1}`, path: ["ru", "products", index, "title"] })}`}
              >
                <ProductPanel
                  product={product}
                  label={t.productLabel}
                  audienceLabel={lang === "ru" ? "Для кого" : "For whom"}
                  priceLabel={runtimeT.priceLabel ?? (lang === "ru" ? "Цена" : "Price")}
                  deadlineLabel={runtimeT.deadlineLabel ?? (lang === "ru" ? "Срок" : "Timeline")}
                  includedLabel={runtimeT.includedLabel ?? (lang === "ru" ? "Что входит" : "What is included")}
                  contactUrl={links.telegramUrl}
                  reduceMotion={Boolean(reduceMotion)}
                />
              </motion.div>
            ))}
          </div>

          {runtimeT.pricingNote ? (
            <p className="mt-5 max-w-3xl border-l border-accent/45 pl-4 text-sm leading-6 text-white/52">
              {runtimeT.pricingNote}
            </p>
          ) : null}

          <TrustStrip items={runtimeT.trustItems ?? getTrustItems(lang)} reduceMotion={Boolean(reduceMotion)} />
        </Reveal>
      </section>

      <section id="method" className="scene-section relative overflow-hidden px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <SectionGlow variant="workflow" />
        <Reveal className="relative z-10 mx-auto max-w-7xl" style={blockStyle("method")}>
          <div
            onClickCapture={selectInEditor({ type: "text", label: "Метод", path: ["ru", "methodTitle"] })}
            className={`max-w-4xl${editorClass({ type: "text", label: "Метод", path: ["ru", "methodTitle"] })}`}
          >
            <SectionHeader eyebrow={t.methodEyebrow} title={t.methodTitle} text={runtimeT.methodText} />
          </div>
          <WorkflowTimeline
            steps={t.methodSteps}
            activeStep={activeMethodStep}
            setActiveStep={setActiveMethodStep}
            stepLabel={t.stepLabel}
            note={runtimeT.methodNote}
            reduceMotion={Boolean(reduceMotion)}
            getEditorProps={(index) => ({
              onClickCapture: selectInEditor({ type: "text", label: `Метод: шаг ${index + 1}`, path: ["ru", "methodSteps", index, 0] }),
              className: editorClass({ type: "text", label: `Метод: шаг ${index + 1}`, path: ["ru", "methodSteps", index, 0] }),
            })}
          />
        </Reveal>
      </section>

      <section id="terms" className="scene-section relative overflow-hidden px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <SectionGlow variant="terms" />
        <Reveal className="relative z-10 mx-auto max-w-7xl" style={blockStyle("terms")}>
          <div
            onClickCapture={selectInEditor({ type: "text", label: "Условия", path: ["ru", "termsTitle"] })}
            className={`max-w-4xl${editorClass({ type: "text", label: "Условия", path: ["ru", "termsTitle"] })}`}
          >
            <SectionHeader eyebrow={t.termsEyebrow} title={t.termsTitle} text={t.termsText} />
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {t.terms.map(([title, text], index) => (
              <div
                key={title}
                onClickCapture={selectInEditor({ type: "text", label: `Условия: карточка ${index + 1}`, path: ["ru", "terms", index, 0] })}
                className={editorClass({ type: "text", label: `Условия: карточка ${index + 1}`, path: ["ru", "terms", index, 0] })}
              >
                <ControlPanel index={index} title={title} text={text} compact reduceMotion={Boolean(reduceMotion)} />
              </div>
            ))}
          </div>

          {runtimeT.faq?.length ? (
            <div className="mt-8">
              <button
                type="button"
                onClick={() => setFaqVisible(true)}
                aria-label={runtimeT.faqOpen ?? "Открыть FAQ"}
                className="inline-flex h-12 w-full items-center justify-center gap-3 border border-white/12 bg-white px-5 text-sm font-semibold text-black transition hover:border-accent hover:bg-accent active:scale-[0.98] sm:w-auto"
              >
                {runtimeT.faqOpen ?? "Открыть FAQ"}
                <ArrowUpRight size={17} />
              </button>
            </div>
          ) : null}
        </Reveal>
      </section>

      <section id="contact" className="scene-section relative overflow-hidden px-4 pb-8 pt-12 sm:px-6 sm:pt-16 lg:px-8 lg:pt-20">
        <SectionGlow variant="contact" />
        <Reveal className={`relative z-10 mx-auto max-w-7xl border border-white/12 bg-white/[0.025] p-4 sm:p-8${editorClass({ type: "text", label: "Контакт", path: ["ru", "contactTitle"], area: true })}`} style={blockStyle("contact")}>
          <div className="grid gap-10 lg:grid-cols-[1fr_430px] lg:items-end">
            <div onClickCapture={selectInEditor({ type: "text", label: "Контакт", path: ["ru", "contactTitle"], area: true })}>
              <p className="mb-5 font-mono text-xs uppercase text-accent">{t.contactEyebrow}</p>
              <h2 className="max-w-5xl text-[2rem] font-semibold uppercase leading-[0.98] text-white sm:text-6xl sm:leading-[0.92]">
                {t.contactTitle}
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/62 sm:mt-5 sm:text-base sm:leading-7">{t.contactText}</p>
            </div>
            <div className="grid gap-3">
              <a href={links.telegramUrl} target="_blank" rel="noreferrer" className="flex h-12 items-center justify-center gap-2 bg-accent px-6 text-sm font-semibold text-black transition hover:bg-white">
                <Send size={17} />
                Telegram
              </a>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <a href={`mailto:${links.email}`} className="flex h-11 items-center justify-center gap-2 border border-white/14 text-sm font-semibold text-white/72 hover:text-accent">
                  <Mail size={16} />
                  {t.email}
                </a>
                <a href={links.instagramUrl} target="_blank" rel="noreferrer" className="flex h-11 items-center justify-center gap-2 border border-white/14 text-sm font-semibold text-white/72 hover:text-accent">
                  IG
                  <ArrowUpRight size={14} />
                </a>
                <a href={links.vkUrl} target="_blank" rel="noreferrer" className="flex h-11 items-center justify-center gap-2 border border-white/14 text-sm font-semibold text-white/72 hover:text-accent">
                  <VkIcon size={16} />
                  {t.vk}
                </a>
              </div>
            </div>
          </div>
          <footer
            onClickCapture={selectInEditor({ type: "text", label: "Футер", path: ["ru", "footer"], area: true })}
            className={`mt-12 flex flex-col gap-3 border-t border-white/10 pt-5 font-mono text-xs uppercase text-white/34 sm:flex-row sm:justify-between${editorClass({ type: "text", label: "Футер", path: ["ru", "footer"], area: true })}`}
          >
            <span>{profile.studioName}</span>
            <span>{t.footer}</span>
          </footer>
        </Reveal>
      </section>

      <WorkModal
        work={selectedWork}
        lang={lang}
        onClose={() => setSelectedWork(null)}
        contactUrl={links.telegramUrl}
        labels={{
          close: t.closeVideo,
          open: t.openYoutube,
          task: t.task,
          done: t.done,
          why: t.why,
          deliverables: t.deliverables,
          project: t.projectCta,
        }}
      />

      <FaqOverlay
        open={faqVisible}
        title={lang === "ru" ? "Частые вопросы" : "FAQ"}
        closeLabel={runtimeT.faqClose ?? "Закрыть FAQ"}
        items={runtimeT.faq ?? []}
        openItems={openFaqItems}
        onToggleItem={toggleFaqItem}
        onClose={() => setFaqVisible(false)}
        reduceMotion={Boolean(reduceMotion)}
        getEditorProps={(index) => ({
          onClickCapture: selectInEditor({ type: "text", label: `FAQ ${index + 1}`, path: ["ru", "faq", index, 0] }),
          className: editorClass({ type: "text", label: `FAQ ${index + 1}`, path: ["ru", "faq", index, 0] }),
        })}
      />
    </main>
  );
}

function Header({
  lang,
  setLang,
  nav,
  projectCta,
  contactUrl,
  editorMode = false,
}: {
  lang: Lang;
  setLang: (lang: Lang) => void;
  nav: readonly string[];
  projectCta: string;
  contactUrl: string;
  editorMode?: boolean;
}) {
  return (
    <header className={`${editorMode ? "sticky top-0" : "fixed inset-x-0 top-0"} z-40 border-b border-white/[0.1] bg-[#030506]/91 backdrop-blur-xl`}>
      <nav className="mx-auto flex h-[60px] w-full max-w-7xl items-center justify-between px-4 sm:h-[68px] sm:px-6 lg:px-8">
        <a href="#top" className="flex items-center gap-3" aria-label="Nikolsky Studio">
          <span className="grid size-9 place-items-center border border-white/20 bg-white/[0.055] font-mono text-xs font-semibold text-white">NS</span>
          <span className="grid gap-0.5">
            <span className="text-[15px] font-semibold leading-none tracking-normal text-white sm:text-base">{profile.studioName}</span>
            <span className="font-mono text-[9px] uppercase leading-none text-white/42 sm:text-[10px]">Video Editing / Motion</span>
          </span>
        </a>
        <div className="hidden items-center gap-1 lg:flex">
          {nav.map((label, index) => (
            <a key={label} href={navHrefs[index]} className="px-3.5 py-2 font-mono text-xs uppercase text-white/58 transition hover:text-accent">
              {label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="grid h-9 grid-cols-2 border border-white/12 bg-white/[0.025] p-1 sm:h-10">
            {(["ru", "en"] as Lang[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setLang(item)}
                className={`px-3 font-mono text-xs uppercase transition ${
                  lang === item ? "bg-accent text-black" : "text-white/45 hover:text-white"
                }`}
                aria-pressed={lang === item}
              >
                {item}
              </button>
            ))}
          </div>
          <a href={contactUrl} target="_blank" rel="noreferrer" aria-label="Telegram" className="grid size-9 place-items-center bg-white text-black transition hover:bg-accent sm:hidden">
            <Send size={15} />
          </a>
          <a href={contactUrl} target="_blank" rel="noreferrer" className="hidden h-10 items-center justify-center gap-2 bg-white px-4 text-sm font-semibold text-black transition hover:bg-accent sm:inline-flex">
            <Send size={15} />
            {projectCta}
          </a>
        </div>
      </nav>
      <div className="lg:hidden">
        <div className="mx-auto grid max-w-7xl grid-cols-5 gap-1 px-4 pb-2">
          {nav.map((label, index) => (
            <a
              key={label}
              href={navHrefs[index]}
              className="border border-white/10 bg-white/[0.03] px-1 py-2 text-center font-mono text-[8.5px] uppercase text-white/58 min-[380px]:text-[9.5px]"
            >
              {label}
            </a>
          ))}
        </div>
      </div>
    </header>
  );
}

function StudioBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="editor-bg absolute inset-0" />
      <div className="scanline-layer absolute inset-0" />
      <div className="noise-layer absolute inset-0" />
    </div>
  );
}

function SectionGlow({ variant }: { variant: "services" | "workflow" | "terms" | "contact" }) {
  const glow: Record<typeof variant, CSSProperties> = {
    services: {
      background:
        "radial-gradient(circle at 18% 16%, rgba(0, 183, 255, 0.12), transparent 30%), radial-gradient(circle at 78% 28%, rgba(255, 255, 255, 0.035), transparent 24%)",
    },
    workflow: {
      background:
        "radial-gradient(ellipse at 52% 34%, rgba(0, 183, 255, 0.13), transparent 34%), linear-gradient(90deg, transparent 0%, rgba(0, 183, 255, 0.045) 45%, transparent 82%)",
    },
    terms: {
      background:
        "radial-gradient(circle at 76% 12%, rgba(0, 183, 255, 0.07), transparent 28%), radial-gradient(circle at 18% 78%, rgba(255, 255, 255, 0.025), transparent 24%)",
    },
    contact: {
      background:
        "radial-gradient(circle at 50% 30%, rgba(0, 183, 255, 0.16), transparent 32%), linear-gradient(180deg, transparent 0%, rgba(0, 183, 255, 0.035) 100%)",
    },
  };

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div
        className="absolute inset-x-[-12%] inset-y-[-18%] opacity-80"
        style={{
          ...glow[variant],
          maskImage: "linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
        }}
      />
    </div>
  );
}

const workflowIcons: readonly LucideIcon[] = [ClipboardList, ScanSearch, ShieldCheck, Scissors, RefreshCcw, Upload];

function getTrustItems(lang: Lang) {
  return lang === "ru"
    ? [
        "6–7 лет в монтаже",
        "Reels / YouTube / Motion / Courses",
        "работа по предоплате",
        "короткий тест 5–10 секунд",
        "прямой контакт со специалистом",
      ]
    : [
        "6–7 years editing",
        "Reels / YouTube / Motion / Courses",
        "prepaid work",
        "5–10 sec test fragment",
        "direct contact with the specialist",
      ];
}

function TrustStrip({ items, reduceMotion }: { items: readonly string[]; reduceMotion: boolean }) {
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, transform: "translateY(14px)" }}
      whileInView={reduceMotion ? undefined : { opacity: 1, transform: "translateY(0px)" }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.32, ease: [0.23, 1, 0.32, 1] }}
      className="mt-5 overflow-hidden border border-white/10 bg-black/24 shadow-[0_20px_80px_rgba(0,0,0,0.18)] backdrop-blur-[2px] sm:mt-6"
    >
      <div className="grid grid-cols-2 divide-x divide-y divide-white/10 sm:grid-cols-5 sm:divide-y-0">
        {items.slice(0, 5).map((item, index) => (
          <motion.div
            key={item}
            initial={reduceMotion ? false : { opacity: 0, transform: "translateY(10px)" }}
            whileInView={reduceMotion ? undefined : { opacity: 1, transform: "translateY(0px)" }}
            viewport={{ once: true, margin: "-70px" }}
            transition={{ duration: 0.28, delay: index * 0.035, ease: [0.23, 1, 0.32, 1] }}
            whileHover={reduceMotion ? undefined : { y: -2, scale: 1.012 }}
            whileTap={reduceMotion ? undefined : { scale: 0.985 }}
            className="relative min-h-24 p-4 transition-colors hover:bg-accent/[0.035] sm:min-h-28"
          >
            <span className="font-mono text-[10px] uppercase text-accent/70">{String(index + 1).padStart(2, "0")}</span>
            <p className="mt-4 text-sm font-semibold uppercase leading-5 text-white/78 sm:text-[15px]">{item}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function WorkflowTimeline({
  steps,
  activeStep,
  setActiveStep,
  stepLabel,
  note,
  reduceMotion,
  getEditorProps,
}: {
  steps: readonly (readonly [string, string])[];
  activeStep: number;
  setActiveStep: (index: number) => void;
  stepLabel: string;
  note?: string;
  reduceMotion: boolean;
  getEditorProps: (index: number) => {
    onClickCapture?: (event: MouseEvent<HTMLElement>) => void;
    className?: string;
  };
}) {
  const safeActiveStep = Math.min(activeStep, Math.max(0, steps.length - 1));
  const active = steps[safeActiveStep] ?? steps[0];
  const progress = steps.length > 1 ? Math.max(0.035, safeActiveStep / (steps.length - 1)) : 1;
  const ActiveIcon = workflowIcons[safeActiveStep % workflowIcons.length];

  return (
    <div className="mt-9 overflow-hidden border border-white/10 bg-[#030608]/72 shadow-[0_26px_110px_rgba(0,0,0,0.26)] backdrop-blur-[2px]">
      <div className="hidden lg:block">
        <div className="relative p-7">
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_18%,rgba(0,183,255,0.08),transparent_42%),linear-gradient(90deg,transparent,rgba(255,255,255,0.025),transparent)]" />
          <div className="relative grid gap-9 lg:grid-cols-[300px_1fr]">
            <div>
              <p className="font-mono text-[11px] uppercase text-accent">workflow path</p>
              <h3 className="mt-4 text-3xl font-semibold uppercase leading-none text-white">От исходников к финалу</h3>
              <p className="mt-4 text-sm leading-6 text-white/55">
                {note ?? "Вы понимаете, что происходит на каждом этапе: сроки, оплата, правки и выдача фиксируются заранее."}
              </p>
            </div>

            <div className="relative px-2 pt-9">
              <div className="absolute left-8 right-8 top-[61px] h-px bg-white/12" />
              <motion.div
                className="absolute left-8 right-8 top-[60px] h-[3px] origin-left rounded-full bg-gradient-to-r from-accent via-accent/80 to-transparent shadow-[0_0_34px_rgba(0,183,255,0.34)]"
                initial={reduceMotion ? false : { transform: "scaleX(0.035)" }}
                animate={{ transform: `scaleX(${progress})` }}
                transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.23, 1, 0.32, 1] }}
              />
              <div className="relative grid grid-cols-6 gap-3">
                {steps.map(([title], index) => {
                  const isActive = index === safeActiveStep;
                  const isDone = index < safeActiveStep;
                  const Icon = workflowIcons[index % workflowIcons.length];
                  const editorProps = getEditorProps(index);
                  return (
                    <motion.button
                      key={title}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setActiveStep(index)}
                      onClickCapture={editorProps.onClickCapture}
                      whileHover={reduceMotion ? undefined : { y: -3, scale: 1.018 }}
                      whileTap={reduceMotion ? undefined : { scale: 0.985 }}
                      transition={{ type: "spring", stiffness: 280, damping: 24 }}
                      className={`group flex min-w-0 flex-col items-center gap-4 text-center outline-none${editorProps.className ?? ""}`}
                    >
                      <span
                        className={`relative grid size-14 place-items-center border transition-colors duration-200 ${
                          isActive
                            ? "border-accent bg-accent text-black shadow-[0_0_38px_rgba(0,183,255,0.34)]"
                            : isDone
                              ? "border-accent/55 bg-accent/[0.08] text-accent"
                              : "border-white/14 bg-[#05090b] text-white/42 group-hover:border-accent/70 group-hover:text-accent"
                        }`}
                      >
                        <span className="absolute -inset-1 border border-white/[0.045]" />
                        <Icon size={20} strokeWidth={1.7} />
                      </span>
                      <span className={`font-mono text-[11px] uppercase tracking-normal ${isActive ? "text-white" : "text-white/46"}`}>
                        {String(index + 1).padStart(2, "0")} / {title}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {active ? (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${safeActiveStep}-${active[0]}`}
              initial={reduceMotion ? false : { opacity: 0, transform: "translateY(10px)" }}
              animate={reduceMotion ? undefined : { opacity: 1, transform: "translateY(0px)" }}
              exit={reduceMotion ? undefined : { opacity: 0, transform: "translateY(-8px)" }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              className="grid gap-6 border-t border-white/10 bg-gradient-to-r from-accent/[0.07] via-white/[0.02] to-transparent p-7 lg:grid-cols-[300px_1fr_210px] lg:items-center"
            >
              <div className="flex items-center gap-4 border-r border-white/10 pr-6">
                <span className="grid size-14 shrink-0 place-items-center border border-accent/70 bg-accent/[0.08] text-accent shadow-[0_0_28px_rgba(0,183,255,0.16)]">
                  <ActiveIcon size={22} strokeWidth={1.7} />
                </span>
                <div>
                  <p className="font-mono text-xs uppercase text-accent">{stepLabel} {String(safeActiveStep + 1).padStart(2, "0")}</p>
                  <h3 className="mt-2 text-3xl font-semibold uppercase leading-none text-white">{active[0]}</h3>
                </div>
              </div>
              <p className="max-w-3xl text-lg leading-8 text-white/68">{active[1]}</p>
              <div className="grid gap-2 font-mono text-[10px] uppercase text-white/36">
                <span className="border border-white/10 bg-black/22 px-3 py-2">срок фиксируем</span>
                <span className="border border-white/10 bg-black/22 px-3 py-2">правки согласуем</span>
                <span className="border border-white/10 bg-black/22 px-3 py-2">выдача под площадку</span>
              </div>
            </motion.div>
          </AnimatePresence>
        ) : null}
      </div>

      <div className="grid gap-3 p-4 lg:hidden">
        {steps.map(([title, text], index) => {
          const isActive = index === safeActiveStep;
          const isDone = index < safeActiveStep;
          const Icon = workflowIcons[index % workflowIcons.length];
          const editorProps = getEditorProps(index);
          return (
            <div key={title} className="relative pl-10">
              {index < steps.length - 1 ? <span aria-hidden className="absolute left-[19px] top-11 h-[calc(100%-10px)] w-px bg-white/10" /> : null}
              <motion.button
                type="button"
                onClick={() => setActiveStep(index)}
                onClickCapture={editorProps.onClickCapture}
                whileTap={reduceMotion ? undefined : { scale: 0.985 }}
                className={`flex w-full items-center gap-3 border p-3 text-left transition ${
                  isActive
                    ? "border-accent/80 bg-accent/[0.055] shadow-[0_0_26px_rgba(0,183,255,0.11)]"
                    : "border-white/10 bg-black/20"
                }${editorProps.className ?? ""}`}
              >
                <span
                  className={`absolute left-0 top-3 grid size-9 place-items-center border ${
                    isActive
                      ? "border-accent bg-accent text-black shadow-[0_0_28px_rgba(0,183,255,0.32)]"
                      : isDone
                        ? "border-accent/50 bg-accent/[0.08] text-accent"
                        : "border-white/14 bg-black text-white/42"
                  }`}
                >
                  <Icon size={17} strokeWidth={1.7} />
                </span>
                <span>
                  <span className="block font-mono text-[10px] uppercase text-accent/75">{stepLabel} {String(index + 1).padStart(2, "0")}</span>
                  <span className="mt-1 block text-base font-semibold uppercase text-white">{title}</span>
                </span>
              </motion.button>
              <AnimatePresence initial={false}>
                {isActive ? (
                  <motion.p
                    key="mobile-step"
                    initial={reduceMotion ? false : { opacity: 0, transform: "translateY(-4px)" }}
                    animate={reduceMotion ? undefined : { opacity: 1, transform: "translateY(0px)" }}
                    exit={reduceMotion ? undefined : { opacity: 0, transform: "translateY(-4px)" }}
                    transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                    className="border-x border-b border-accent/30 bg-black/24 px-3 pb-4 pt-1 text-sm leading-6 text-white/62"
                  >
                    {text}
                  </motion.p>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SectionHeader({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <div>
      <p className="mb-3 font-mono text-[11px] uppercase text-accent sm:mb-4 sm:text-xs">{eyebrow}</p>
      <h2 className="max-w-4xl text-[2rem] font-semibold uppercase leading-[0.98] text-white sm:text-5xl sm:leading-[0.95]">
        {title}
      </h2>
      {text ? <p className="mt-4 max-w-3xl text-[15px] leading-7 text-white/62 sm:mt-5 sm:text-base">{text}</p> : null}
    </div>
  );
}

function ShowreelPlayer({
  work,
  button,
  tracks,
  breakdownSummary,
  seekLabel,
  editorMode = false,
  editorSelectionKey,
  onEditorSelect,
}: {
  work: Work;
  button: string;
  tracks: ShowreelTrack[];
  breakdownSummary: string;
  seekLabel: string;
  editorMode?: boolean;
  editorSelectionKey?: string;
  onEditorSelect?: (selection: EditorSelection) => void;
}) {
  const thumbnailUrl = getThumbnailUrl(work);
  const videoId = getYouTubeId(work.youtubeUrl);
  const playerHostId = `yt-${useId().replace(/:/g, "")}`;
  const playerRef = useRef<YouTubePlayer | null>(null);
  const pendingSeekRef = useRef<number | null>(null);
  const autoplayOnReadyRef = useRef(false);
  const [playerActive, setPlayerActive] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [durationKnown, setDurationKnown] = useState(false);
  const [duration, setDuration] = useState(fallbackShowreelDuration);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState(tracks[0]?.id ?? "hook");
  const timelineDuration = durationKnown ? duration : fallbackShowreelDuration;
  const progress = clampPercent((currentTime / Math.max(timelineDuration, 1)) * 100);

  useEffect(() => {
    if (!playerActive || !videoId) return;
    let disposed = false;

    loadYouTubeApi().then((api) => {
      if (disposed) return;

      playerRef.current = new api.Player(playerHostId, {
        videoId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          controls: 1,
          enablejsapi: 1,
          autoplay: 0,
          mute: 1,
        },
        events: {
          onReady: (event) => {
            if (disposed) return;
            setPlayerReady(true);
            const apiDuration = event.target.getDuration();
            if (Number.isFinite(apiDuration) && apiDuration > 0) {
              setDuration(apiDuration);
              setDurationKnown(true);
            }

            if (pendingSeekRef.current !== null) {
              event.target.seekTo(pendingSeekRef.current, true);
              pendingSeekRef.current = null;
            }

            if (autoplayOnReadyRef.current) event.target.playVideo();
          },
          onStateChange: (event) => {
            if (disposed || !window.YT?.PlayerState) return;
            setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
            if (event.data === window.YT.PlayerState.ENDED) setCurrentTime(0);
          },
        },
      });
    });

    return () => {
      disposed = true;
      playerRef.current?.destroy();
      playerRef.current = null;
      setPlayerReady(false);
    };
  }, [playerActive, playerHostId, videoId]);

  useEffect(() => {
    if (!playerActive) return;
    let disposed = false;

    const tick = () => {
      if (disposed) return;
      const player = playerRef.current;
      if (player) {
        const apiDuration = player.getDuration();
        const apiTime = player.getCurrentTime();

        if (Number.isFinite(apiDuration) && apiDuration > 0) {
          setDuration(apiDuration);
          setDurationKnown(true);
        }

        if (Number.isFinite(apiTime)) setCurrentTime(apiTime);
      }
    };

    tick();
    const timer = window.setInterval(tick, 220);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [playerActive]);

  const togglePlayback = () => {
    if (!playerActive) {
      autoplayOnReadyRef.current = true;
      setPlayerActive(true);
      setIsPlaying(true);
      return;
    }

    if (!playerReady || !playerRef.current) return;

    if (isPlaying) {
      playerRef.current.pauseVideo();
      setIsPlaying(false);
    } else {
      playerRef.current.playVideo();
      setIsPlaying(true);
    }
  };

  const seekToSegment = (track: ShowreelTrack, start: number) => {
    const wasPlaying = isPlaying;
    setSelectedTrackId(track.id);
    onEditorSelect?.({ type: "breakdown", label: track.title, trackId: track.id });
    pendingSeekRef.current = start;
    autoplayOnReadyRef.current = wasPlaying;
    setCurrentTime(start);
    setPlayerActive(true);

    if (playerRef.current) {
      playerRef.current.seekTo(start, true);
      if (wasPlaying) playerRef.current.playVideo();
    }
  };

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="relative border border-white/12 bg-[#05080b]/92 shadow-[0_24px_70px_rgba(0,0,0,0.38)] sm:shadow-[0_30px_90px_rgba(0,0,0,0.44)]"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        {playerActive && videoId ? <div id={playerHostId} className="absolute inset-0 h-full w-full" /> : null}
        {!playerActive ? (
          <button type="button" onClick={togglePlayback} className="group absolute inset-0 block w-full text-left">
            <div className="absolute inset-0 bg-cover bg-center opacity-[0.68]" style={{ backgroundImage: `url(${thumbnailUrl})` }} />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,6,0.05),rgba(3,5,6,0.82)),radial-gradient(circle_at_50%_35%,rgba(0,183,255,0.16),transparent_32%)]" />
            <div className="absolute inset-4 border border-white/12 sm:inset-6" />
            <div className="absolute inset-0 grid place-items-center">
              <span className="grid size-14 place-items-center border border-white/24 bg-white/[0.08] text-white backdrop-blur transition group-hover:border-accent group-hover:text-accent sm:size-20">
                <Play size={26} fill="currentColor" className="sm:size-[34px]" />
              </span>
            </div>
            <div className="absolute bottom-4 left-4 right-4 sm:bottom-5 sm:left-5 sm:right-5">
              <p className="font-mono text-[10px] uppercase text-accent sm:text-[11px]">{work.category}</p>
              <h3 className="mt-2 text-2xl font-semibold uppercase leading-none text-white sm:text-4xl">{work.title}</h3>
              <p className="mt-2 max-w-sm text-xs leading-5 text-white/56 sm:text-sm">{work.description}</p>
            </div>
          </button>
        ) : null}
      </div>

      <div className="border-t border-white/10 p-3 sm:p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase text-accent sm:text-[11px]">Breakdown</p>
              <p className="mt-1 text-xs leading-5 text-white/45">{breakdownSummary}</p>
            </div>
          <button type="button" onClick={togglePlayback} className="inline-flex h-9 shrink-0 items-center justify-center gap-2 bg-white px-3 text-xs font-semibold text-black transition hover:bg-accent sm:px-4 sm:text-sm">
            {isPlaying ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
            {button}
          </button>
        </div>

        <div className="grid gap-2">
          {tracks.map((track) => (
            <BreakdownTrackRow
              key={track.id}
              track={track}
              currentTime={currentTime}
              duration={timelineDuration}
              progress={progress}
              selected={selectedTrackId === track.id || editorSelectionKey === `breakdown:${track.id}`}
              editorMode={editorMode}
              seekLabel={seekLabel}
              onSeek={seekToSegment}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function BreakdownTrackRow({
  track,
  currentTime,
  duration,
  progress,
  selected,
  editorMode,
  onSeek,
}: {
  track: ShowreelTrack;
  currentTime: number;
  duration: number;
  progress: number;
  selected: boolean;
  editorMode: boolean;
  onSeek: (track: ShowreelTrack, seconds: number) => void;
}) {
  const inSegment = track.segments.some((segment) => currentTime >= segment.start && currentTime <= segment.end);
  const active = selected;

  return (
    <div
      className={`grid grid-cols-[36px_88px_minmax(0,1fr)] items-center gap-2 border p-2 transition sm:grid-cols-[48px_112px_minmax(0,1fr)_190px] sm:gap-3 ${
        active
          ? "border-accent/60 bg-accent/[0.055] shadow-[0_0_28px_rgba(0,183,255,0.1)]"
          : "border-white/10 bg-white/[0.018]"
      }`}
    >
      <button
        type="button"
        onClick={() => onSeek(track, track.segments[0]?.start ?? 0)}
        className={`grid size-8 place-items-center border transition sm:size-10 ${
          active ? "border-accent/65 text-accent shadow-[0_0_18px_rgba(0,183,255,0.18)]" : "border-white/10 text-white/38 hover:border-accent/45 hover:text-accent"
        }`}
        aria-label={`Перейти к ${track.title}`}
      >
        <BreakdownIcon icon={track.icon} />
      </button>

      <button type="button" onClick={() => onSeek(track, track.segments[0]?.start ?? 0)} className="min-w-0 text-left">
        <span className={`block truncate font-mono text-[8px] uppercase sm:text-[10px] ${active ? "text-accent" : "text-white/44"}`}>{track.label}</span>
        <span className="mt-0.5 block text-[10px] font-medium uppercase leading-3 text-white/88 sm:mt-1 sm:text-[13px] sm:leading-4">{track.title}</span>
      </button>

      <div className="relative h-6 overflow-hidden border border-white/10 bg-black/28 sm:h-7">
        <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/10" />
        {selected ? (
          <span className="absolute bottom-0 top-0 z-20 w-px bg-accent shadow-[0_0_16px_rgba(0,183,255,0.75)] transition-[left] duration-200 ease-linear" style={{ left: `${progress}%` }} />
        ) : null}
        {track.segments.map((segment, index) => {
          const left = clampPercent((segment.start / duration) * 100);
          const width = clampPercent(((segment.end - segment.start) / duration) * 100);
          const segmentActive = selected || (!selected && inSegment);
          return (
            <button
              key={`${track.id}-${index}`}
              type="button"
              title={`Перейти к ${track.label}`}
              onClick={() => onSeek(track, segment.start)}
              className={`absolute top-1/2 h-4 -translate-y-1/2 transition ${
                segmentActive ? "bg-accent shadow-[0_0_18px_rgba(0,183,255,0.55)]" : "bg-accent/24 hover:bg-accent/58"
              }`}
              style={{ left: `${left}%`, width: `${Math.max(width, 4)}%` }}
            />
          );
        })}
      </div>

      <p className={`hidden text-xs leading-5 sm:block ${active ? "text-white/78" : "text-white/44"}`}>{track.description}</p>
    </div>
  );
}

function BreakdownIcon({ icon }: { icon: ShowreelTrack["icon"] }) {
  if (icon === "target") {
    return (
      <svg viewBox="0 0 24 24" className="size-5 sm:size-6" fill="none" stroke="currentColor" strokeWidth="1.7">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
      </svg>
    );
  }

  if (icon === "pulse") {
    return (
      <svg viewBox="0 0 24 24" className="size-5 sm:size-6" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M4 12h3l2-6 4 13 2-7h5" />
      </svg>
    );
  }

  if (icon === "message") {
    return (
      <svg viewBox="0 0 24 24" className="size-5 sm:size-6" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M5 6h14v9H9l-4 4V6Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="size-5 sm:size-6" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 2l1.6 6.2L20 10l-6.4 1.8L12 18l-1.6-6.2L4 10l6.4-1.8L12 2Z" />
      <path d="M18 15l.8 3.2L22 19l-3.2.8L18 23l-.8-3.2L14 19l3.2-.8L18 15Z" />
    </svg>
  );
}

function ControlPanel({
  index,
  title,
  text,
  compact = false,
  reduceMotion = false,
}: {
  index: number;
  title: string;
  text: string;
  compact?: boolean;
  reduceMotion?: boolean;
}) {
  return (
    <motion.div
      whileHover={reduceMotion ? undefined : { y: -3, scale: 1.015 }}
      whileTap={reduceMotion ? undefined : { scale: 0.985 }}
      transition={{ type: "spring", stiffness: 280, damping: 24 }}
      className={`relative h-full overflow-hidden border border-white/10 bg-black/24 p-4 transition-colors duration-150 hover:border-accent/65 hover:shadow-[0_0_34px_rgba(0,183,255,0.12)] sm:p-5 ${compact ? "sm:min-h-36" : "sm:min-h-44"}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/35 to-transparent" />
      <p className="mb-4 font-mono text-[11px] uppercase text-accent/80">{String(index + 1).padStart(2, "0")}</p>
      <h3 className="text-lg font-semibold uppercase leading-tight text-white sm:text-xl">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-white/58">{text}</p>
    </motion.div>
  );
}

function ProductPanel({
  product,
  label,
  priceLabel,
  deadlineLabel,
  includedLabel,
  audienceLabel,
  contactUrl,
  reduceMotion,
}: {
  product: {
    code: string;
    title: string;
    audience: string;
    text: string;
    includes: readonly string[];
    cta: string;
    price?: string;
    timeline?: string;
    fit?: string;
  };
  label: string;
  audienceLabel: string;
  priceLabel: string;
  deadlineLabel: string;
  includedLabel: string;
  contactUrl: string;
  reduceMotion: boolean;
}) {
  return (
    <motion.article
      whileHover={reduceMotion ? undefined : { y: -4, scale: 1.012 }}
      whileTap={reduceMotion ? undefined : { scale: 0.985 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="relative flex h-full min-h-[470px] flex-col overflow-hidden border border-white/10 bg-black/30 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.16)] transition-colors duration-150 hover:border-accent/65 hover:shadow-[0_0_42px_rgba(0,183,255,0.12)] sm:p-6 xl:min-h-[500px]"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent opacity-70" />
      <div className="mb-6 flex items-center justify-between gap-3 font-mono text-[11px] uppercase">
        <span className="text-accent">{product.code}</span>
        <span className="text-white/28">{label}</span>
      </div>
      <h3 className="text-2xl font-semibold uppercase leading-[0.98] text-white sm:text-[1.7rem]">{product.title}</h3>
      <div className="mt-5 border-l border-accent/55 pl-3">
        <p className="font-mono text-[10px] uppercase text-accent/80">{audienceLabel}</p>
        <p className="mt-1 text-sm leading-6 text-white/58">{product.audience}</p>
      </div>
      <p className="mt-5 text-sm leading-6 text-white/66">{product.text}</p>
      <div className="mt-6">
        <p className="font-mono text-[10px] uppercase text-accent/85">{includedLabel}</p>
        <div className="mt-3 grid gap-2">
          {product.includes.slice(0, 4).map((item) => (
            <div key={item} className="flex items-start gap-3 text-sm leading-5 text-white/62">
              <Check size={14} className="mt-0.5 shrink-0 text-accent" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-auto pt-7">
        <div className="grid grid-cols-2 gap-2 border-y border-white/10 py-3">
          <div>
            <p className="font-mono text-[10px] uppercase text-white/34">{priceLabel}</p>
            <p className="mt-1 text-sm font-semibold uppercase text-white">{product.price}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase text-white/34">{deadlineLabel}</p>
            <p className="mt-1 text-sm font-semibold uppercase text-white">{product.timeline}</p>
          </div>
        </div>
        <a href={contactUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 bg-white px-4 text-sm font-semibold text-black transition hover:bg-accent active:scale-[0.98]">
          {product.cta}
          <ArrowUpRight size={15} />
        </a>
      </div>
    </motion.article>
  );
}

function TimelineChapters({
  works,
  lang,
  title,
  onSelect,
}: {
  works: Work[];
  lang: Lang;
  title: string;
  onSelect: (work: Work) => void;
}) {
  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex justify-between font-mono text-[11px] uppercase text-white/42 sm:mb-5 sm:text-xs">
        <span>{title}</span>
        <span>V1 / A1 / FX</span>
      </div>
      <div className="grid gap-3">
        {works.map((work, index) => (
          <button key={work.id ?? work.title} type="button" onClick={() => onSelect(work)} className="group grid grid-cols-[62px_1fr] border border-white/10 bg-white/[0.02] text-left transition hover:border-accent/70 sm:grid-cols-[74px_1fr]">
            <div className="border-r border-white/10 p-2 font-mono text-[9px] uppercase leading-4 text-white/42 sm:p-3 sm:text-[10px]">{clipTime(index)}</div>
            <div className="p-3">
              <div className="mb-2 grid grid-cols-[48px_1fr_auto] items-center gap-2 sm:grid-cols-[58px_1fr_auto] sm:gap-3">
                <div className="h-9 border border-white/10 bg-cover bg-center" style={{ backgroundImage: `url(${getThumbnailUrl(work)})` }} />
                <span className="font-mono text-[10px] uppercase text-accent">{getCategoryLabel(work.category, lang)}</span>
                <Clock3 size={13} className="text-white/30" />
              </div>
              <p className="text-sm font-semibold uppercase leading-5 text-white">{getWorkTitle(work, lang)}</p>
              <Waveform seed={index} bars={18} className="h-8 sm:h-10" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function CasePanel({
  work,
  lang,
  index,
  labels,
  onSelect,
  reduceMotion,
}: {
  work: Work;
  lang: Lang;
  index: number;
  labels: { task: string; done: string; open: string; youtube: string };
  onSelect: (work: Work) => void;
  reduceMotion: boolean;
}) {
  const displayWork = viewWork(work, lang);
  const done = getWorkDone(work, lang).slice(0, 5);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      whileHover={reduceMotion ? undefined : { y: -2, scale: 1.01 }}
      whileTap={reduceMotion ? undefined : { scale: 0.985 }}
      transition={{ duration: 0.3, delay: index * 0.02 }}
      className="group grid overflow-hidden border border-white/10 bg-white/[0.02] transition-colors hover:border-accent/70 hover:shadow-[0_0_34px_rgba(0,183,255,0.1)] lg:grid-cols-[320px_1fr_220px]"
    >
      <button type="button" onClick={() => onSelect(work)} className="relative aspect-[1.18/1] overflow-hidden border-b border-white/10 text-left sm:aspect-video lg:aspect-auto lg:border-b-0 lg:border-r">
        <div className="absolute inset-0 bg-cover bg-center opacity-80 transition duration-300 group-hover:scale-[1.018] group-hover:opacity-68" style={{ backgroundImage: `url(${getThumbnailUrl(work)})` }} />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,6,0.08),rgba(3,5,6,0.72))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,183,255,0.16),transparent_38%)] opacity-0 transition duration-300 group-hover:opacity-100" />
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between sm:bottom-4 sm:left-4 sm:right-4">
          <span className="font-mono text-[11px] uppercase text-accent sm:text-xs">{clipTime(index)}</span>
          <span className="grid size-10 place-items-center border border-white/18 bg-black/36 text-white backdrop-blur transition group-hover:border-accent/80 group-hover:text-accent group-hover:shadow-[0_0_22px_rgba(0,183,255,0.22)] sm:size-11">
            <Play size={18} fill="currentColor" />
          </span>
        </div>
      </button>
      <div className="p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase text-white/44 sm:mb-4 sm:text-[11px]">
          <Film size={13} />
          <span>{displayWork.category}</span>
          <span>/</span>
          <span>{getWorkFormat(work, lang)}</span>
        </div>
        <h3 className="text-2xl font-semibold uppercase leading-tight text-white sm:text-3xl">{displayWork.title}</h3>
        <div className="mt-4 border-l border-accent/70 pl-3 sm:mt-5 sm:pl-4">
          <p className="font-mono text-[11px] uppercase text-accent">{labels.task}</p>
          <p className="mt-2 text-sm leading-6 text-white/66 sm:text-base sm:leading-7">{getWorkTask(work, lang)}</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 sm:mt-5">
          {done.map((item) => (
            <span key={item} className="border border-white/10 bg-black/[0.22] px-2.5 py-1.5 font-mono text-[10px] uppercase leading-4 text-white/54 sm:px-3 sm:text-[11px]">
              {item}
            </span>
          ))}
        </div>
      </div>
      <div className="grid border-t border-white/10 p-4 sm:p-5 lg:border-l lg:border-t-0">
        <p className="hidden font-mono text-[11px] uppercase text-white/38 sm:block">{labels.done}</p>
        <Waveform seed={index * 2} bars={28} className="mt-3 hidden sm:flex" />
        <div className="grid grid-cols-2 gap-2 sm:mt-auto sm:grid-cols-1 sm:pt-5">
          <button type="button" onClick={() => onSelect(work)} className="inline-flex h-10 items-center justify-center gap-2 bg-white px-4 text-sm font-semibold text-black transition hover:bg-accent">
            {labels.open}
            <ArrowUpRight size={15} />
          </button>
          <a href={work.youtubeUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-2 border border-white/14 text-sm font-semibold text-white/68 transition hover:border-accent hover:text-accent">
            {labels.youtube}
            <ArrowUpRight size={15} />
          </a>
        </div>
      </div>
    </motion.article>
  );
}

function FaqOverlay({
  open,
  title,
  closeLabel,
  items,
  openItems,
  onToggleItem,
  onClose,
  reduceMotion,
  getEditorProps,
}: {
  open: boolean;
  title: string;
  closeLabel: string;
  items: readonly (readonly [string, string])[];
  openItems: number[];
  onToggleItem: (index: number) => void;
  onClose: () => void;
  reduceMotion: boolean;
  getEditorProps: (index: number) => {
    onClickCapture?: (event: MouseEvent<HTMLElement>) => void;
    className?: string;
  };
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-end bg-black/78 px-3 py-3 backdrop-blur-xl sm:place-items-center sm:px-5 sm:py-6"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={reduceMotion ? undefined : { opacity: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          onMouseDown={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <motion.div
            className="max-h-[88vh] w-full max-w-3xl overflow-hidden border border-white/12 bg-[#05080b] shadow-[0_36px_140px_rgba(0,0,0,0.55)]"
            initial={reduceMotion ? false : { opacity: 0, transform: "translateY(18px) scale(0.985)" }}
            animate={reduceMotion ? undefined : { opacity: 1, transform: "translateY(0px) scale(1)" }}
            exit={reduceMotion ? undefined : { opacity: 0, transform: "translateY(12px) scale(0.985)" }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 bg-white/[0.025] p-4 sm:p-5">
              <div>
                <p className="font-mono text-[11px] uppercase text-accent">FAQ / условия</p>
                <h3 className="mt-2 text-2xl font-semibold uppercase leading-none text-white sm:text-4xl">{title}</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={closeLabel}
                className="grid size-11 shrink-0 place-items-center border border-white/14 bg-black/24 text-white transition hover:border-accent hover:text-accent"
              >
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[68vh] overflow-y-auto p-3 sm:p-4">
              <div className="grid gap-2">
                {items.map(([question, answer], index) => {
                  const isOpen = openItems.includes(index);
                  const editorProps = getEditorProps(index);
                  return (
                    <div
                      key={question}
                      onClickCapture={editorProps.onClickCapture}
                      className={`border border-white/10 bg-black/24 transition-colors hover:border-accent/40${editorProps.className ?? ""}`}
                    >
                      <button
                        type="button"
                        onClick={() => onToggleItem(index)}
                        className="flex w-full items-center justify-between gap-4 p-4 text-left transition hover:bg-white/[0.025] sm:p-5"
                      >
                        <span className="text-base font-semibold uppercase leading-tight text-white sm:text-lg">{question}</span>
                        <ChevronDown size={18} className={`shrink-0 text-accent transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen ? (
                          <motion.div
                            key="answer"
                            initial={reduceMotion ? false : { opacity: 0, transform: "translateY(-4px)" }}
                            animate={reduceMotion ? undefined : { opacity: 1, transform: "translateY(0px)" }}
                            exit={reduceMotion ? undefined : { opacity: 0, transform: "translateY(-4px)" }}
                            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                            className="px-4 pb-4 text-sm leading-6 text-white/60 sm:px-5 sm:pb-5 sm:text-base sm:leading-7"
                          >
                            {answer}
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function WorkModal({
  work,
  lang,
  onClose,
  contactUrl,
  labels,
}: {
  work: Work | null;
  lang: Lang;
  onClose: () => void;
  contactUrl: string;
  labels: {
    close: string;
    open: string;
    task: string;
    done: string;
    why: string;
    deliverables: string;
    project: string;
  };
}) {
  if (!work) return null;
  const displayWork = viewWork(work, lang);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/88 px-0 py-0 backdrop-blur-xl sm:px-4 sm:py-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onMouseDown={onClose}
        role="dialog"
        aria-modal="true"
        aria-label={`${displayWork.title} preview`}
      >
        <motion.div
          className="min-h-screen w-full max-w-6xl border-white/12 bg-[#05080b] sm:min-h-0 sm:border"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.22 }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-white/10 bg-[#05080b]/95 p-4 backdrop-blur">
            <div>
              <p className="font-mono text-[11px] uppercase text-accent sm:text-xs">{displayWork.category}</p>
              <h3 className="mt-1 text-xl font-semibold uppercase leading-tight text-white sm:text-2xl">{displayWork.title}</h3>
            </div>
            <button type="button" onClick={onClose} aria-label={labels.close} className="grid size-11 place-items-center border border-white/14 bg-white/[0.04] text-white transition hover:bg-white/[0.1]">
              <X size={20} />
            </button>
          </div>
          <div className="grid lg:grid-cols-[1.22fr_0.78fr]">
            <div className="border-b border-white/10 p-3 sm:p-4 lg:border-b-0 lg:border-r">
              <div className="relative aspect-video w-full overflow-hidden border border-white/12 bg-black">
                <YouTubeEmbed work={displayWork} autoplay className="absolute inset-0 h-full w-full" />
              </div>
              <div className="mt-3 flex justify-end sm:mt-4">
                <a href={work.youtubeUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-2 border border-white/14 px-4 text-sm text-white/70 transition hover:border-accent hover:text-accent">
                  {labels.open}
                  <ArrowUpRight size={15} />
                </a>
              </div>
            </div>
            <div className="grid gap-4 p-4 sm:gap-5 sm:p-5">
              <ModalBlock label={labels.task} text={displayWork.task} />
              <ModalList label={labels.done} items={displayWork.workDone ?? []} />
              <ModalBlock label={labels.why} text={displayWork.whyItWorks} />
              <ModalList label={labels.deliverables} items={displayWork.deliverables ?? []} />
              <a href={contactUrl} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center gap-2 bg-accent px-5 text-sm font-semibold text-black transition hover:bg-white">
                {labels.project}
                <Send size={16} />
              </a>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ModalBlock({ label, text }: { label: string; text?: string }) {
  if (!text) return null;
  return (
    <div>
      <p className="font-mono text-[11px] uppercase text-accent">{label}</p>
      <p className="mt-2 leading-7 text-white/66">{text}</p>
    </div>
  );
}

function ModalList({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="font-mono text-[11px] uppercase text-accent">{label}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className="border border-white/10 bg-white/[0.025] px-3 py-1.5 font-mono text-[11px] uppercase text-white/58">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
