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
  CirclePlay,
  Clock3,
  Film,
  Mail,
  Play,
  Send,
  X,
} from "lucide-react";
import type { CSSProperties, MouseEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { Reveal } from "@/components/reveal";
import { YouTubeEmbed } from "@/components/youtube-embed";
import { profile } from "@/lib/profile";
import { getThumbnailUrl } from "@/lib/youtube";
import { workCategories, type PortfolioCategory, type Work } from "@/types/work";
import editableCopy from "../../data/landing-content.json";

type Lang = "ru" | "en";
type Filter = "All" | PortfolioCategory;

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
    };

const CONTENT_STORAGE_KEY = "nikolsky-studio-content-v1";
const WORKS_STORAGE_KEY = "nikolsky-studio-works-v1";

const categoryLabels: Record<string, Record<Lang, string>> = {
  Showreel: { ru: "Шоурил", en: "Showreel" },
  Reels: { ru: "Reels", en: "Reels" },
  "Motion Design": { ru: "Motion", en: "Motion" },
  "SaaS / Crypto": { ru: "SaaS / Crypto", en: "SaaS / Crypto" },
  Courses: { ru: "Курсы", en: "Courses" },
  YouTube: { ru: "YouTube", en: "YouTube" },
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
    positionEyebrow: "Позиционирование",
    positionTitle: "Монтаж — это не про эффекты. Это про логику и подачу.",
    positionText:
      "Часто есть материал, но нет собранного видео: смысл теряется, темп провисает, первые секунды не работают. Я помогаю выстроить структуру, усилить подачу и сделать ролик аккуратнее.",
    positionCards: [
      ["Хук", "Первые секунды должны объяснить, почему стоит смотреть дальше."],
      ["Темп", "Резы, паузы, субтитры и акценты собираются под удержание, а не под хаос."],
      ["Упаковка", "Видео должно выглядеть дороже продукта, а не дешевле него."],
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
    casesEyebrow: "Работы",
    casesTitle: "Работы",
    casesText:
      "Подборка проектов в разных форматах. Каждый проект — это конкретная задача: удержание внимания, понятная подача, продуктовая упаковка или работа с длинным форматом.",
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
    nav: ["Work", "Products", "Method", "Terms", "Contact"],
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
    positionEyebrow: "Positioning",
    positionTitle: "I do not decorate video. I build an attention route.",
    positionText:
      "Good editing is not a set of effects. It is logic: where the viewer hooks, where they may drop, where to speed up, pause, clarify, and lead to the offer.",
    positionCards: [
      ["Hook", "The first seconds explain why the viewer should keep watching."],
      ["Pace", "Cuts, pauses, subtitles, and accents are built for retention, not chaos."],
      ["Packaging", "The video should look more expensive than the product, not cheaper."],
    ],
    productsEyebrow: "Products",
    productsTitle: "Do not choose editing. Choose the task.",
    products: [
      {
        code: "P01",
        title: "Short-form Engine",
        audience: "For experts, creators, brands, and businesses.",
        text: "I turn long recordings, talking heads, podcasts, and shoots into Reels / Shorts / TikTok that hook fast and feel systematic.",
        includes: [
          "strong fragment selection",
          "retention-first editing",
          "captions and accents",
          "B-roll / motion elements",
          "export for Reels / Shorts / TikTok",
        ],
        cta: "Discuss short-form",
      },
      {
        code: "P02",
        title: "Sales / Launch Motion",
        audience: "For SaaS, crypto, tech, launches, products, and decks.",
        text: "I build dynamic product videos, promos, and motion clips that explain product value quickly.",
        includes: [
          "video structure",
          "edit / motion rhythm",
          "feature accents",
          "titles, UI fragments, graphics",
          "versions for social / website / deck",
        ],
        cta: "Discuss launch",
      },
      {
        code: "P03",
        title: "Long-form Cut",
        audience: "For YouTube, courses, podcasts, and educational content.",
        text: "I cut long videos so they do not collapse in pace: remove noise, keep structure, and strengthen meaning.",
        includes: [
          "material cleanup",
          "episode structure",
          "semantic block editing",
          "pause and pace work",
          "16:9 and/or 9:16 export",
        ],
        cta: "Discuss long-form",
      },
    ],
    reelEyebrow: "Showreel",
    reelTitle: "Nikolsky Studio Showreel",
    reelText: "60 seconds of short-form, motion, YouTube, courses, and product videos.",
    chapters: "Timeline chapters",
    casesEyebrow: "Cases",
    casesTitle: "Work is not a grid. Every case is a task.",
    casesText:
      "Filters do not hide projects. They switch tracks: short-form, product motion, education, and long-form.",
    all: "All",
    task: "Task",
    done: "Work done",
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
  return selection.type === "work" ? `work:${selection.index}` : `text:${selection.path.join(".")}`;
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
  const [runtimeCopy, setRuntimeCopy] = useState<LandingCopy>(copy);
  const [runtimeWorks, setRuntimeWorks] = useState<Work[]>(works);
  const liveCopy = editorContent ? (mergeCopy(copy, editorContent) as LandingCopy) : runtimeCopy;
  const liveWorks = editorWorks ?? runtimeWorks;
  const t = liveCopy[lang];
  const editorStyles = ((liveCopy as unknown as { _editor?: { styles?: Record<string, number | string> } })._editor?.styles ?? {});
  const mainStyle = {
    "--accent": typeof editorStyles.accent === "string" ? editorStyles.accent : undefined,
  } as CSSProperties;
  const heroTitleStyle = editorStyles.heroTitleSize
    ? ({ fontSize: `clamp(2.25rem, ${Number(editorStyles.heroTitleSize) / 12}vw, ${Number(editorStyles.heroTitleSize) / 10}rem)` } as CSSProperties)
    : undefined;
  const bodyScaleStyle = editorStyles.bodyScale
    ? ({ fontSize: `${Number(editorStyles.bodyScale)}%` } as CSSProperties)
    : undefined;

  const showreel = liveWorks.find((work) => work.featured) ?? liveWorks[0];
  const portfolioWorks = useMemo(() => liveWorks.filter((work) => !work.featured), [liveWorks]);
  const filteredWorks =
    activeFilter === "All"
      ? portfolioWorks
      : portfolioWorks.filter((work) => work.category === activeFilter);

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
      ? " ring-2 ring-accent ring-offset-2 ring-offset-black/80"
      : " ring-1 ring-white/10 hover:ring-accent/70";
  };

  useEffect(() => {
    if (!selectedWork) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setSelectedWork(null);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [selectedWork]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground" style={mainStyle}>
      <StudioBackground />
      <motion.div
        aria-hidden
        className="fixed left-0 top-0 z-50 h-px w-full origin-left bg-accent"
        style={{ scaleX }}
      />

      <Header lang={lang} setLang={setLang} nav={t.nav} projectCta={t.projectCta} editorMode={editorMode} />

      <section id="top" className="relative mx-auto w-full max-w-7xl px-4 pb-8 pt-28 sm:px-6 sm:pt-24 lg:px-8" style={bodyScaleStyle}>
        <div className="relative z-10 grid gap-6 lg:min-h-[640px] lg:grid-cols-[minmax(0,1fr)_470px] lg:items-center lg:gap-8 xl:min-h-[680px] xl:grid-cols-[minmax(0,1fr)_520px]">
          <motion.div
            initial={false}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
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
            >
              {t.heroSub}
            </p>
            <div className="mt-7 grid grid-cols-2 gap-2.5 sm:mt-9 sm:flex sm:flex-row sm:gap-3">
              <a
                href="#work"
                onClickCapture={selectInEditor({ type: "text", label: "Кнопка смотреть работы", path: ["ru", "casesCta"] })}
                className={`inline-flex h-[50px] items-center justify-center gap-2 bg-accent px-4 text-sm font-semibold text-black shadow-[0_0_34px_rgba(0,183,255,0.16)] transition hover:bg-white sm:h-14 sm:px-7 sm:text-[15px]${editorClass({ type: "text", label: "Кнопка смотреть работы", path: ["ru", "casesCta"] })}`}
              >
                <CirclePlay size={17} />
                {t.casesCta}
              </a>
              <a
                href={profile.telegramUrl}
                target="_blank"
                rel="noreferrer"
                onClickCapture={selectInEditor({ type: "text", label: "Кнопка обсудить проект", path: ["ru", "projectCta"] })}
                className={`inline-flex h-[50px] items-center justify-center gap-2 border border-white/16 bg-white/[0.035] px-4 text-sm font-semibold text-white transition hover:border-accent hover:text-accent sm:h-14 sm:px-7 sm:text-[15px]${editorClass({ type: "text", label: "Кнопка обсудить проект", path: ["ru", "projectCta"] })}`}
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

          <div
            onClickCapture={selectInEditor({ type: "work", label: "Главный шоурил", index: Math.max(0, liveWorks.findIndex((work) => work === showreel)) })}
            className={editorClass({ type: "work", label: "Главный шоурил", index: Math.max(0, liveWorks.findIndex((work) => work === showreel)) })}
          >
            <ShowreelPlayer
              work={viewWork(showreel, lang)}
              label={t.showreelLabel}
              button={t.showreelCta}
              tracks={t.tracks}
              safeFrame={t.safeFrame}
              onPlay={() => setSelectedWork(showreel)}
            />
          </div>
        </div>
      </section>

      <section className="scene-section relative px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <Reveal className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <SectionHeader eyebrow={t.positionEyebrow} title={t.positionTitle} text={t.positionText} />
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {t.positionCards.map(([title, text], index) => (
              <ControlPanel key={title} index={index} title={title} text={text} blockLabel={t.blockLabel} />
            ))}
          </div>
        </Reveal>
      </section>

      <section id="products" className="scene-section relative px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <Reveal className="mx-auto max-w-7xl">
          <SectionHeader eyebrow={t.productsEyebrow} title={t.productsTitle} />
          <div className="mt-8 grid gap-3 lg:grid-cols-3">
            {t.products.map((product) => (
              <ProductPanel key={product.code} product={product} label={t.productLabel} />
            ))}
          </div>
        </Reveal>
      </section>

      <section className="scene-section relative px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <Reveal className="mx-auto max-w-7xl">
          <div className="grid overflow-hidden border border-white/12 bg-[#05080b]/88 lg:grid-cols-[0.78fr_1.22fr]">
            <button type="button" onClick={() => setSelectedWork(showreel)} className="group relative min-h-[320px] overflow-hidden border-b border-white/10 text-left sm:min-h-[420px] lg:border-b-0 lg:border-r">
              <div className="absolute inset-0 bg-cover bg-center opacity-[0.52]" style={{ backgroundImage: `url(${getThumbnailUrl(showreel)})` }} />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,6,0.18),rgba(3,5,6,0.88)),radial-gradient(circle_at_45%_34%,rgba(0,183,255,0.18),transparent_30%)]" />
              <div className="relative flex h-full flex-col justify-between p-5 sm:p-7">
                <div>
                  <p className="font-mono text-xs uppercase text-accent">{t.reelEyebrow}</p>
                  <h2 className="mt-4 max-w-xl text-[2.35rem] font-semibold uppercase leading-[0.92] text-white sm:text-6xl sm:leading-[0.9]">
                    {t.reelTitle}
                  </h2>
                  <p className="mt-5 max-w-md text-base leading-7 text-white/62">{t.reelText}</p>
                </div>
                <span className="inline-flex h-12 w-fit items-center gap-2 bg-white px-5 text-sm font-semibold text-black transition group-hover:bg-accent">
                  <Play size={17} fill="currentColor" />
                  {t.showreelCta}
                </span>
              </div>
            </button>
            <TimelineChapters works={portfolioWorks.slice(0, 5)} lang={lang} title={t.chapters} onSelect={setSelectedWork} />
          </div>
        </Reveal>
      </section>

      <section id="work" className="scene-section relative px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <Reveal className="mx-auto max-w-7xl">
          <div className="mb-8 grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
            <SectionHeader eyebrow={t.casesEyebrow} title={t.casesTitle} text={t.casesText} />
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:justify-end lg:overflow-visible lg:px-0">
              {(["All", ...workCategories] as Filter[]).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`h-10 shrink-0 border px-4 font-mono text-xs uppercase transition ${
                    activeFilter === filter
                      ? "border-accent bg-accent text-black"
                      : "border-white/12 bg-white/[0.025] text-white/52 hover:border-accent hover:text-accent"
                  }`}
                >
                  {filter === "All" ? t.all : getCategoryLabel(filter, lang)}
                </button>
              ))}
            </div>
          </div>

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
                  />
                </div>
              ))}
            </AnimatePresence>
          </motion.div>
        </Reveal>
      </section>

      <section id="method" className="scene-section relative px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <Reveal className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeader eyebrow={t.methodEyebrow} title={t.methodTitle} />
          <div className="grid border border-white/10 bg-white/[0.02]">
            {t.methodSteps.map(([title, text], index) => (
              <div key={title} className="grid gap-3 border-b border-white/10 p-4 last:border-b-0 sm:grid-cols-[112px_1fr] sm:gap-4 sm:p-5">
                <span className="font-mono text-xs uppercase text-accent">{t.stepLabel} {String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="text-lg font-semibold uppercase text-white sm:text-xl">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/62 sm:text-base sm:leading-7">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      <section id="terms" className="scene-section relative px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <Reveal className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
            <SectionHeader eyebrow={t.termsEyebrow} title={t.termsTitle} text={t.termsText} />
            <div className="grid gap-3 sm:grid-cols-2">
              {t.terms.map(([title, text], index) => (
                <ControlPanel key={title} index={index} title={title} text={text} blockLabel={t.blockLabel} compact />
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      <section id="contact" className="scene-section relative px-4 pb-8 pt-12 sm:px-6 sm:pt-16 lg:px-8 lg:pt-20">
        <Reveal className="mx-auto max-w-7xl border border-white/12 bg-white/[0.025] p-4 sm:p-8">
          <div className="grid gap-10 lg:grid-cols-[1fr_430px] lg:items-end">
            <div>
              <p className="mb-5 font-mono text-xs uppercase text-accent">{t.contactEyebrow}</p>
              <h2 className="max-w-5xl text-[2rem] font-semibold uppercase leading-[0.98] text-white sm:text-6xl sm:leading-[0.92]">
                {t.contactTitle}
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/62 sm:mt-5 sm:text-base sm:leading-7">{t.contactText}</p>
            </div>
            <div className="grid gap-3">
              <a href={profile.telegramUrl} target="_blank" rel="noreferrer" className="flex h-12 items-center justify-center gap-2 bg-accent px-6 text-sm font-semibold text-black transition hover:bg-white">
                <Send size={17} />
                Telegram
              </a>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <a href={`mailto:${profile.email}`} className="flex h-11 items-center justify-center gap-2 border border-white/14 text-sm font-semibold text-white/72 hover:text-accent">
                  <Mail size={16} />
                  {t.email}
                </a>
                <a href={profile.instagramUrl} target="_blank" rel="noreferrer" className="flex h-11 items-center justify-center gap-2 border border-white/14 text-sm font-semibold text-white/72 hover:text-accent">
                  IG
                  <ArrowUpRight size={14} />
                </a>
                <a href={profile.vkUrl} target="_blank" rel="noreferrer" className="flex h-11 items-center justify-center gap-2 border border-white/14 text-sm font-semibold text-white/72 hover:text-accent">
                  <VkIcon size={16} />
                  {t.vk}
                </a>
              </div>
            </div>
          </div>
          <footer className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-5 font-mono text-xs uppercase text-white/34 sm:flex-row sm:justify-between">
            <span>{profile.studioName}</span>
            <span>{t.footer}</span>
          </footer>
        </Reveal>
      </section>

      <WorkModal
        work={selectedWork}
        lang={lang}
        onClose={() => setSelectedWork(null)}
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
    </main>
  );
}

function Header({
  lang,
  setLang,
  nav,
  projectCta,
  editorMode = false,
}: {
  lang: Lang;
  setLang: (lang: Lang) => void;
  nav: readonly string[];
  projectCta: string;
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
          <a href={profile.telegramUrl} target="_blank" rel="noreferrer" aria-label="Telegram" className="grid size-9 place-items-center bg-white text-black transition hover:bg-accent sm:hidden">
            <Send size={15} />
          </a>
          <a href={profile.telegramUrl} target="_blank" rel="noreferrer" className="hidden h-10 items-center justify-center gap-2 bg-white px-4 text-sm font-semibold text-black transition hover:bg-accent sm:inline-flex">
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
  label,
  button,
  tracks,
  safeFrame,
  onPlay,
}: {
  work: Work;
  label: string;
  button: string;
  tracks: readonly string[];
  safeFrame: string;
  onPlay: () => void;
}) {
  const thumbnailUrl = getThumbnailUrl(work);
  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="relative border border-white/12 bg-[#05080b]/92 shadow-[0_24px_70px_rgba(0,0,0,0.38)] sm:shadow-[0_30px_90px_rgba(0,0,0,0.44)]"
    >
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5 font-mono text-[10px] uppercase text-white/42 sm:px-4 sm:py-3 sm:text-[11px]">
        <span>{label}</span>
        <span>00:00:00:00</span>
      </div>
      <button type="button" onClick={onPlay} className="group relative block aspect-video w-full overflow-hidden text-left">
        <div className="absolute inset-0 bg-cover bg-center opacity-[0.68]" style={{ backgroundImage: `url(${thumbnailUrl})` }} />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,6,0.05),rgba(3,5,6,0.82)),radial-gradient(circle_at_50%_35%,rgba(0,183,255,0.16),transparent_32%)]" />
        <div className="absolute inset-4 border border-white/12 sm:inset-6" />
        <div className="absolute left-4 top-4 font-mono text-[10px] uppercase text-white/48 sm:left-5 sm:top-5 sm:text-[11px]">{safeFrame}</div>
        <div className="absolute inset-0 grid place-items-center">
          <span className="grid size-14 place-items-center border border-white/24 bg-white/[0.08] text-white backdrop-blur transition group-hover:border-accent group-hover:text-accent sm:size-20">
            <Play size={26} fill="currentColor" className="sm:size-[34px]" />
          </span>
        </div>
        <div className="absolute bottom-4 left-4 right-4 sm:bottom-5 sm:left-5 sm:right-5">
          <p className="font-mono text-[10px] uppercase text-accent sm:text-[11px]">{work.category}</p>
          <h3 className="mt-2 text-2xl font-semibold uppercase leading-none text-white sm:text-4xl">{work.title}</h3>
        </div>
      </button>
      <div className="hidden border-t border-white/10 sm:grid">
        {tracks.map((track, index) => (
          <div key={track} className="grid grid-cols-[92px_1fr] border-b border-white/10 last:border-b-0">
            <div className="border-r border-white/10 px-3 py-3 font-mono text-[10px] uppercase text-white/38">{track}</div>
            <div className="relative flex items-center gap-2 overflow-hidden px-3 py-2">
              <span className="h-7 w-[30%] bg-accent/14" />
              <span className="h-7 w-[18%] bg-white/10" />
              <span className="h-7 w-[28%] bg-accent/22" />
              <span className="absolute bottom-0 top-0 w-px bg-accent/80" style={{ left: `${26 + index * 14}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-3 px-3 py-3 sm:grid-cols-[1fr_auto] sm:items-center sm:px-4 sm:py-4">
        <Waveform bars={22} className="h-9 sm:h-12" />
        <button type="button" onClick={onPlay} className="h-10 bg-white px-5 text-sm font-semibold text-black transition hover:bg-accent sm:h-11">
          {button}
        </button>
      </div>
    </motion.div>
  );
}

function ControlPanel({
  index,
  title,
  text,
  blockLabel,
  compact = false,
}: {
  index: number;
  title: string;
  text: string;
  blockLabel: string;
  compact?: boolean;
}) {
  return (
    <div className={`border border-white/10 bg-white/[0.02] p-4 sm:p-5 ${compact ? "sm:min-h-40" : "sm:min-h-44"}`}>
      <div className="mb-4 flex items-center justify-between font-mono text-[11px] uppercase sm:mb-6 sm:text-xs">
        <span className="text-accent">{blockLabel} / {String(index + 1).padStart(2, "0")}</span>
        <span className="text-white/32">00:{String(index * 9 + 3).padStart(2, "0")}:12</span>
      </div>
      <h3 className="text-xl font-semibold uppercase text-white sm:text-2xl">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-white/62 sm:mt-4 sm:text-base sm:leading-7">{text}</p>
    </div>
  );
}

function ProductPanel({
  product,
  label,
}: {
  product: {
    code: string;
    title: string;
    audience: string;
    text: string;
    includes: readonly string[];
    cta: string;
  };
  label: string;
}) {
  return (
    <article className="group flex flex-col border border-white/10 bg-white/[0.025] p-4 transition hover:border-accent/70 sm:p-5 lg:min-h-[540px]">
      <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-3 font-mono text-[11px] uppercase sm:mb-8 sm:pb-4 sm:text-xs">
        <span className="text-accent">{product.code}</span>
        <span className="text-white/32">{label}</span>
      </div>
      <h3 className="text-2xl font-semibold uppercase leading-[0.98] text-white sm:text-3xl sm:leading-[0.96]">{product.title}</h3>
      <p className="mt-3 text-xs uppercase leading-5 text-white/50 sm:mt-4 sm:min-h-12 sm:text-sm sm:leading-6">{product.audience}</p>
      <p className="mt-4 text-sm leading-6 text-white/66 sm:mt-6 sm:text-base sm:leading-7">{product.text}</p>
      <div className="mt-5 grid gap-2 sm:mt-8">
        {product.includes.map((item) => (
          <div key={item} className="flex items-start gap-3 border-t border-white/[0.08] pt-3 text-sm leading-6 text-white/62">
            <Check size={15} className="mt-1 shrink-0 text-accent" />
            <span>{item}</span>
          </div>
        ))}
      </div>
      <a href={profile.telegramUrl} target="_blank" rel="noreferrer" className="mt-6 inline-flex h-11 items-center justify-center gap-2 bg-white px-4 text-sm font-semibold text-black transition group-hover:bg-accent sm:mt-auto">
        {product.cta}
        <ArrowUpRight size={15} />
      </a>
    </article>
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
}: {
  work: Work;
  lang: Lang;
  index: number;
  labels: { task: string; done: string; open: string; youtube: string };
  onSelect: (work: Work) => void;
}) {
  const displayWork = viewWork(work, lang);
  const done = getWorkDone(work, lang).slice(0, 5);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3, delay: index * 0.02 }}
      className="group grid overflow-hidden border border-white/10 bg-white/[0.02] transition hover:border-accent/70 lg:grid-cols-[320px_1fr_220px]"
    >
      <button type="button" onClick={() => onSelect(work)} className="relative aspect-[1.18/1] overflow-hidden border-b border-white/10 text-left sm:aspect-video lg:aspect-auto lg:border-b-0 lg:border-r">
        <div className="absolute inset-0 bg-cover bg-center opacity-80 transition" style={{ backgroundImage: `url(${getThumbnailUrl(work)})` }} />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,6,0.08),rgba(3,5,6,0.72))]" />
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between sm:bottom-4 sm:left-4 sm:right-4">
          <span className="font-mono text-[11px] uppercase text-accent sm:text-xs">{clipTime(index)}</span>
          <span className="grid size-10 place-items-center border border-white/18 bg-black/36 text-white backdrop-blur sm:size-11">
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

function WorkModal({
  work,
  lang,
  onClose,
  labels,
}: {
  work: Work | null;
  lang: Lang;
  onClose: () => void;
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
              <a href={profile.telegramUrl} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center gap-2 bg-accent px-5 text-sm font-semibold text-black transition hover:bg-white">
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
