"use client";

import {
  ArrowDown,
  ArrowUp,
  Check,
  GitBranch,
  History,
  Monitor,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import seedContent from "../../data/landing-content.json";
import seedWorks from "../../data/works.json";
import {
  getEditorSelectionKey,
  StudioLanding,
  type EditorPath,
  type EditorSelection,
  type LandingCopy,
} from "@/components/studio-landing";
import { getThumbnailUrl } from "@/lib/youtube";
import { showreelTracks, type ShowreelTrack } from "@/lib/showreel-breakdown";
import { workCategories, type Work } from "@/types/work";

const STORAGE_KEY = "nikolsky-studio-content-v1";
const WORKS_STORAGE_KEY = "nikolsky-studio-works-v1";
const ADMIN_API = "http://127.0.0.1:4317";

type EditorContent = Partial<LandingCopy> & Record<string, unknown> & {
  _editor?: {
    styles?: {
      [key: string]: number | string | undefined;
      accent?: string;
      heroTitleSize?: number;
      bodyScale?: number;
      heroSubtitleSize?: number;
      heroTextX?: number;
      heroMediaX?: number;
      heroMediaScale?: number;
      heroGap?: number;
      ctaHeight?: number;
      ctaPadding?: number;
      ctaFontSize?: number;
    };
    links?: {
      telegramUrl?: string;
      instagramUrl?: string;
      vkUrl?: string;
      email?: string;
    };
    showreelTracks?: ShowreelTrack[];
  };
};

type EditorPanel = "hero" | "section" | "breakdown" | "video" | "page" | "versions";

type VersionItem = {
  id: string;
  name: string;
  createdAt: string;
};

type AdminResponse = {
  ok?: boolean;
  message?: string;
  content?: EditorContent;
  works?: Work[];
  versions?: VersionItem[];
};

const textFields: Array<EditorSelection & { type: "text" }> = [
  { type: "text", label: "Направление в hero", path: ["ru", "label"] },
  { type: "text", label: "Главный заголовок", path: ["ru", "heroTitle"] },
  { type: "text", label: "Подзаголовок hero", path: ["ru", "heroSub"], area: true },
  { type: "text", label: "Кнопка смотреть работы", path: ["ru", "casesCta"] },
  { type: "text", label: "Кнопка обсудить проект", path: ["ru", "projectCta"] },
  { type: "text", label: "Строка доверия", path: ["ru", "trust"], area: true },
  { type: "text", label: "Работы: заголовок", path: ["ru", "casesTitle"] },
  { type: "text", label: "Работы: текст", path: ["ru", "casesText"], area: true },
  { type: "text", label: "Услуги: заголовок", path: ["ru", "productsTitle"] },
  { type: "text", label: "Услуги: текст", path: ["ru", "productsText"], area: true },
  { type: "text", label: "Шоурил: заголовок", path: ["ru", "reelTitle"] },
  { type: "text", label: "Шоурил: текст", path: ["ru", "reelText"], area: true },
  { type: "text", label: "Метод: заголовок", path: ["ru", "methodTitle"] },
  { type: "text", label: "Метод: текст", path: ["ru", "methodText"], area: true },
  { type: "text", label: "Условия: заголовок", path: ["ru", "termsTitle"] },
  { type: "text", label: "Условия: текст", path: ["ru", "termsText"], area: true },
  { type: "text", label: "Контакт: заголовок", path: ["ru", "contactTitle"], area: true },
  { type: "text", label: "Контакт: текст", path: ["ru", "contactText"], area: true },
  { type: "text", label: "Футер", path: ["ru", "footer"], area: true },
];

const heroFields = textFields.slice(0, 6);

function isHeroSelection(selection: EditorSelection) {
  return selection.type === "text" && heroFields.some((field) => getEditorSelectionKey(field) === getEditorSelectionKey(selection));
}

function getSectionKey(selection: EditorSelection) {
  if (selection.type !== "text") return "page";
  const key = String(selection.path[1] ?? "");
  if (key.startsWith("position")) return "position";
  if (key.startsWith("products") || key === "priceLabel" || key === "deadlineLabel" || key === "includedLabel" || key === "problems" || key === "problemsLabel") return "products";
  if (key.startsWith("reel") || key === "chapters" || key === "showreelCta" || key === "showreelLabel" || key === "tracks") return "reel";
  if (key.startsWith("cases") || key === "all" || key === "openCase" || key === "youtube") return "cases";
  if (key.startsWith("method")) return "method";
  if (key.startsWith("terms") || key === "faq" || key === "faqOpen" || key === "faqClose") return "terms";
  if (key.startsWith("contact") || key === "footer" || key === "email" || key === "vk") return "contact";
  return "page";
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getAt(source: unknown, path: EditorPath): unknown {
  return path.reduce<unknown>((current, key) => {
    if (current && typeof current === "object") {
      return (current as Record<string | number, unknown>)[key];
    }
    return undefined;
  }, source);
}

function setAt<T>(source: T, path: EditorPath, value: unknown): T {
  const next = clone(source) as Record<string | number, unknown>;
  let cursor = next;

  path.slice(0, -1).forEach((key, index) => {
    const nextKey = path[index + 1];
    if (!cursor[key] || typeof cursor[key] !== "object") {
      cursor[key] = typeof nextKey === "number" ? [] : {};
    }
    cursor = cursor[key] as Record<string | number, unknown>;
  });

  cursor[path[path.length - 1]] = value;
  return next as T;
}

function makeWork(): Work {
  return {
    id: `work-${Date.now()}`,
    title: "New Work",
    titleRu: "Новая работа",
    category: "Reels",
    youtubeUrl: "https://www.youtube.com/watch?v=YOUR_VIDEO_ID",
    thumbnail: "auto",
    descriptionRu: "Короткое описание ролика.",
    taskRu: "Какая задача была у ролика.",
    formatRu: "Reels / 9:16",
    workDoneRu: ["монтаж", "субтитры", "акценты"],
    whyItWorksRu: "Почему эта версия работает.",
    deliverablesRu: ["финальный ролик"],
    featured: false,
    priority: 0,
  };
}

async function getAdmin(path: string) {
  const response = await fetch(`${ADMIN_API}${path}`);
  const data = (await response.json()) as AdminResponse;
  if (!response.ok || !data.ok) throw new Error(data.message || "Локальная админка не ответила.");
  return data;
}

async function postAdmin(path: string, body: unknown) {
  const response = await fetch(`${ADMIN_API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as AdminResponse;
  if (!response.ok || !data.ok) throw new Error(data.message || "Локальная команда не выполнена.");
  return data;
}

export function ContentEditor() {
  const [content, setContent] = useState<EditorContent>(() => clone(seedContent) as unknown as EditorContent);
  const [works, setWorks] = useState<Work[]>(() => clone(seedWorks) as Work[]);
  const [selection, setSelection] = useState<EditorSelection>(textFields[1]);
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [versionName, setVersionName] = useState("");
  const [status, setStatus] = useState("Готово");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [activePanel, setActivePanel] = useState<EditorPanel>("hero");
  const mounted = useRef(false);

  const selectionKey = useMemo(() => getEditorSelectionKey(selection), [selection]);
  const selectedText = useMemo(() => {
    if (selection.type !== "text") return "";
    const value = getAt(content, selection.path);
    return typeof value === "string" ? value : "";
  }, [content, selection]);

  const refreshVersions = useCallback(async () => {
    try {
      const data = await getAdmin("/versions");
      setVersions(data.versions ?? []);
    } catch {
      setVersions([]);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getAdmin("/content");
        if (data.content) setContent(data.content);
        if (data.works) setWorks(data.works);
        setStatus("Контент загружен из файлов");
      } catch {
        setStatus("Admin API не запущен. Открой через ярлык или npm run dev.");
      }
      void refreshVersions();
    };
    void load();
  }, [refreshVersions]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
    window.localStorage.setItem(WORKS_STORAGE_KEY, JSON.stringify(works));
  }, [content, works]);

  const saveToFiles = useCallback(async (message = "Сохранено") => {
    setSaving(true);
    setStatus("Сохраняю...");
    try {
      await postAdmin("/save", { content, works });
      setDirty(false);
      setStatus(message);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Не получилось сохранить.");
    } finally {
      setSaving(false);
    }
  }, [content, works]);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (!dirty) return;
    const timer = window.setTimeout(() => {
      void saveToFiles("Автосохранено");
    }, 700);
    return () => window.clearTimeout(timer);
  }, [dirty, saveToFiles]);

  const markDirty = () => setDirty(true);

  const selectEditorItem = (nextSelection: EditorSelection) => {
    setSelection(nextSelection);
    if (nextSelection.type === "work") {
      setActivePanel("video");
    } else if (nextSelection.type === "breakdown") {
      setActivePanel("breakdown");
    } else {
      setActivePanel(isHeroSelection(nextSelection) ? "hero" : "section");
    }
    setInspectorOpen(true);
  };

  const updateText = (value: string) => {
    if (selection.type !== "text") return;
    setContent((current) => setAt(current, selection.path, value));
    markDirty();
  };

  const updateContent = (path: EditorPath, value: unknown) => {
    setContent((current) => setAt(current, path, value));
    markDirty();
  };

  const updateWork = (index: number, patch: Partial<Work>) => {
    setWorks((current) => current.map((work, i) => (i === index ? { ...work, ...patch } : work)));
    markDirty();
  };

  const updateWorkList = (index: number, key: "workDoneRu" | "deliverablesRu", value: string[]) => {
    updateWork(index, { [key]: value });
  };

  const addWork = () => {
    const next = makeWork();
    setWorks((current) => [...current, next]);
    setSelection({ type: "work", label: "Новая работа", index: works.length });
    setActivePanel("video");
    markDirty();
  };

  const removeWork = (index: number) => {
    setWorks((current) => current.filter((_, i) => i !== index));
    setSelection(textFields[1]);
    setActivePanel("hero");
    markDirty();
  };

  const moveWork = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= works.length) return;
    setWorks((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setSelection({ type: "work", label: "Работа", index: target });
    setActivePanel("video");
    markDirty();
  };

  const makeFeatured = (index: number) => {
    setWorks((current) => current.map((work, i) => ({ ...work, featured: i === index })));
    markDirty();
  };

  const createVersion = async () => {
    setSaving(true);
    try {
      await postAdmin("/version", {
        name: versionName.trim() || `Версия ${new Date().toLocaleString("ru-RU")}`,
        content,
        works,
      });
      setVersionName("");
      setStatus("Версия сохранена");
      await refreshVersions();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Не получилось сохранить версию.");
    } finally {
      setSaving(false);
    }
  };

  const restoreVersion = async (id: string) => {
    setSaving(true);
    try {
      const data = await postAdmin("/restore", { id });
      if (data.content) setContent(data.content);
      if (data.works) setWorks(data.works);
      setDirty(false);
      setStatus("Версия восстановлена");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Не получилось восстановить версию.");
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    setSaving(true);
    setStatus("Сохраняю и пушу...");
    try {
      await postAdmin("/save", { content, works });
      const result = await postAdmin("/publish", {});
      setDirty(false);
      setStatus(result.message || "Запушено в GitHub");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Не получилось запушить.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#030506] text-white">
      <header className="sticky top-0 z-[80] border-b border-white/10 bg-[#05080b]/96 backdrop-blur">
        <div className="mx-auto flex max-w-[1920px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="font-mono text-xs uppercase text-accent">Nikolsky visual editor</p>
            <h1 className="text-lg font-semibold uppercase sm:text-xl">Редактируй прямо на сайте</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill text={dirty ? `${status} / есть изменения` : status} active={dirty || saving} />
            <a href="/" target="_blank" className="inline-flex h-10 items-center gap-2 border border-white/12 px-3 text-sm text-white/72">
              <Monitor size={15} />
              Открыть сайт
            </a>
            <button type="button" onClick={addWork} className="inline-flex h-10 items-center gap-2 border border-accent/45 px-3 text-sm font-semibold text-accent">
              <Plus size={15} />
              Видео
            </button>
            <button type="button" onClick={() => saveToFiles()} className="inline-flex h-10 items-center gap-2 bg-white px-3 text-sm font-semibold text-black">
              <Save size={15} />
              Сохранить
            </button>
            <button type="button" onClick={publish} className="inline-flex h-10 items-center gap-2 bg-accent px-3 text-sm font-semibold text-black">
              <GitBranch size={15} />
              Запушить в Git
            </button>
          </div>
        </div>
      </header>

      <div className="grid min-h-[calc(100vh-66px)] lg:grid-cols-[minmax(0,1fr)_430px]">
        <section className="relative h-[calc(100vh-66px)] overflow-y-auto border-r border-white/10 bg-black pb-[72vh] lg:pb-0">
          <StudioLanding
            works={works}
            editorMode
            editorContent={content}
            editorWorks={works}
            editorSelectionKey={selectionKey}
            onEditorSelect={selectEditorItem}
          />
        </section>

        <aside
          className={`fixed inset-x-0 bottom-0 z-[90] max-h-[72vh] overflow-y-auto border-t border-white/12 bg-[#070a0d] p-4 shadow-[0_-24px_70px_rgba(0,0,0,0.55)] transition lg:sticky lg:top-[66px] lg:h-[calc(100vh-66px)] lg:max-h-none lg:border-l lg:border-t-0 lg:shadow-none ${
            inspectorOpen ? "translate-y-0" : "translate-y-[calc(100%-52px)] lg:translate-y-0"
          }`}
        >
          <div className="grid gap-4">
            <button
              type="button"
              onClick={() => setInspectorOpen((current) => !current)}
              className="flex h-10 items-center justify-between border border-accent/35 bg-accent/10 px-3 text-left lg:hidden"
            >
              <span className="font-mono text-xs uppercase text-accent">Панель редактирования</span>
              <span className="text-sm text-white/72">{inspectorOpen ? "Свернуть" : "Открыть"}</span>
            </button>
            <PanelTabs activePanel={activePanel} setActivePanel={setActivePanel} />
            {activePanel === "hero" ? (
              <HeroPanel
                content={content}
                selection={selection}
                selectedText={selectedText}
                onSelect={selectEditorItem}
                onTextChange={updateText}
                updateContent={updateContent}
              />
            ) : null}
            {activePanel === "section" ? (
              <SectionPanel
                content={content}
                selection={selection}
                selectedText={selectedText}
                onTextChange={updateText}
                updateContent={updateContent}
              />
            ) : null}
            {activePanel === "breakdown" ? (
              <BreakdownPanel
                content={content}
                selection={selection}
                onSelect={selectEditorItem}
                updateContent={updateContent}
              />
            ) : null}
            {activePanel === "video" ? (
              <Inspector
                selection={selection.type === "work" ? selection : { type: "work", label: works[0]?.titleRu ?? "Видео", index: 0 }}
                textValue={selectedText}
                works={works}
                onTextChange={updateText}
                onWorkChange={updateWork}
                onWorkListChange={updateWorkList}
                onFeatured={makeFeatured}
                onRemove={removeWork}
                onMove={moveWork}
              />
            ) : null}
            {activePanel === "page" ? (
              <StructurePanel
                selection={selection}
                onSelect={selectEditorItem}
                works={works}
                addWork={addWork}
                moveWork={moveWork}
              />
            ) : null}
            {activePanel === "versions" ? (
              <VersionsPanel
                versions={versions}
                versionName={versionName}
                setVersionName={setVersionName}
                createVersion={createVersion}
                restoreVersion={restoreVersion}
              />
            ) : null}
          </div>
        </aside>
      </div>
    </main>
  );
}

function PanelTabs({
  activePanel,
  setActivePanel,
}: {
  activePanel: EditorPanel;
  setActivePanel: (panel: EditorPanel) => void;
}) {
  const tabs: Array<{ id: EditorPanel; label: string }> = [
    { id: "hero", label: "Главный" },
    { id: "section", label: "Блок" },
    { id: "breakdown", label: "Разбор" },
    { id: "video", label: "Видео" },
    { id: "page", label: "Страница" },
    { id: "versions", label: "Версии" },
  ];

  return (
    <div className="grid grid-cols-6 gap-1 border border-white/10 bg-black/25 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => setActivePanel(tab.id)}
          className={`h-9 text-xs font-semibold uppercase transition ${
            activePanel === tab.id ? "bg-accent text-black" : "text-white/48 hover:text-white"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function HeroPanel({
  content,
  selection,
  selectedText,
  onSelect,
  onTextChange,
  updateContent,
}: {
  content: EditorContent;
  selection: EditorSelection;
  selectedText: string;
  onSelect: (selection: EditorSelection) => void;
  onTextChange: (value: string) => void;
  updateContent: (path: EditorPath, value: unknown) => void;
}) {
  const styles = content._editor?.styles ?? {};
  const heroFields = textFields.slice(0, 6);
  const selectedHeroText =
    selection.type === "text" &&
    heroFields.some((field) => getEditorSelectionKey(field) === getEditorSelectionKey(selection));

  return (
    <>
      <Panel title="Главный экран" subtitle="Только hero: текст, кнопки, композиция">
        <div className="grid grid-cols-2 gap-2">
          {heroFields.map((field) => (
            <button
              key={getEditorSelectionKey(field)}
              type="button"
              onClick={() => onSelect(field)}
              className={`border px-3 py-2 text-left text-sm transition ${
                getEditorSelectionKey(selection) === getEditorSelectionKey(field)
                  ? "border-accent bg-accent/10 text-white"
                  : "border-white/10 bg-black/20 text-white/62 hover:border-accent/55"
              }`}
            >
              {field.label}
            </button>
          ))}
        </div>
        {selectedHeroText ? (
          <Field area={selection.area ?? selectedText.length > 80} label={selection.label} value={selectedText} onChange={onTextChange} />
        ) : (
          <p className="border border-white/10 bg-black/20 p-3 text-sm leading-6 text-white/48">
            Кликни текст на первом экране или выбери поле выше. Если кликнуть по шоурилу, справа откроется режим видео.
          </p>
        )}
      </Panel>

      <Panel title="Композиция hero" subtitle="Двигай блоки без кода">
        <RangeField
          label="Текст влево / вправо"
          value={Number(styles.heroTextX ?? 0)}
          min={-120}
          max={120}
          onChange={(value) => updateContent(["_editor", "styles", "heroTextX"], value)}
        />
        <RangeField
          label="Шоурил влево / вправо"
          value={Number(styles.heroMediaX ?? 0)}
          min={-140}
          max={140}
          onChange={(value) => updateContent(["_editor", "styles", "heroMediaX"], value)}
        />
        <RangeField
          label="Размер шоурила"
          value={Number(styles.heroMediaScale ?? 100)}
          min={86}
          max={116}
          onChange={(value) => updateContent(["_editor", "styles", "heroMediaScale"], value)}
        />
        <RangeField
          label="Расстояние между текстом и шоурилом"
          value={Number(styles.heroGap ?? 32)}
          min={12}
          max={96}
          onChange={(value) => updateContent(["_editor", "styles", "heroGap"], value)}
        />
      </Panel>

      <Panel title="Типографика и кнопки" subtitle="Размеры первого экрана">
        <RangeField
          label="Размер главного заголовка"
          value={Number(styles.heroTitleSize ?? 64)}
          min={42}
          max={86}
          onChange={(value) => updateContent(["_editor", "styles", "heroTitleSize"], value)}
        />
        <RangeField
          label="Размер подзаголовка"
          value={Number(styles.heroSubtitleSize ?? 20)}
          min={14}
          max={28}
          onChange={(value) => updateContent(["_editor", "styles", "heroSubtitleSize"], value)}
        />
        <RangeField
          label="Высота кнопок"
          value={Number(styles.ctaHeight ?? 56)}
          min={44}
          max={72}
          onChange={(value) => updateContent(["_editor", "styles", "ctaHeight"], value)}
        />
        <RangeField
          label="Ширина кнопок"
          value={Number(styles.ctaPadding ?? 28)}
          min={16}
          max={48}
          onChange={(value) => updateContent(["_editor", "styles", "ctaPadding"], value)}
        />
        <RangeField
          label="Размер текста кнопок"
          value={Number(styles.ctaFontSize ?? 15)}
          min={12}
          max={19}
          onChange={(value) => updateContent(["_editor", "styles", "ctaFontSize"], value)}
        />
        <label className="grid gap-2">
          <span className="text-xs uppercase text-white/48">Акцентный цвет</span>
          <input
            type="color"
            value={typeof styles.accent === "string" ? styles.accent : "#00b7ff"}
            onChange={(event) => updateContent(["_editor", "styles", "accent"], event.target.value)}
            className="h-10 w-full border border-white/10 bg-black"
          />
        </label>
      </Panel>
    </>
  );
}

function SectionPanel({
  content,
  selection,
  selectedText,
  onTextChange,
  updateContent,
}: {
  content: EditorContent;
  selection: EditorSelection;
  selectedText: string;
  onTextChange: (value: string) => void;
  updateContent: (path: EditorPath, value: unknown) => void;
}) {
  const section = getSectionKey(selection);
  const styles = content._editor?.styles ?? {};
  const titles: Record<string, string> = {
    position: "Позиционирование",
    products: "Продукты",
    reel: "Шоурил-блок",
    cases: "Работы",
    method: "Метод",
    terms: "Условия",
    contact: "Контакт",
    page: "Блок",
  };
  const xKey = `${section}X`;

  return (
    <>
      <Panel title={titles[section] ?? "Блок"} subtitle="Редактируется только выбранная секция">
        {selection.type === "text" ? (
          <Field area={selection.area ?? selectedText.length > 80} label={selection.label} value={selectedText} onChange={onTextChange} />
        ) : null}
        <RangeField
          label="Блок влево / вправо"
          value={Number(styles[xKey] ?? 0)}
          min={-160}
          max={160}
          onChange={(value) => updateContent(["_editor", "styles", xKey], value)}
        />
      </Panel>

      {section === "position" ? (
        <Panel title="Тексты блока" subtitle="Заголовок и карточки">
          <ContentField content={content} path={["ru", "positionEyebrow"]} label="Лейбл" updateContent={updateContent} />
          <ContentField content={content} path={["ru", "positionTitle"]} label="Заголовок" area updateContent={updateContent} />
          <ContentField content={content} path={["ru", "positionText"]} label="Описание" area updateContent={updateContent} />
          <PairList title="Карточки" root={["ru", "positionCards"]} content={content} updateContent={updateContent} />
        </Panel>
      ) : null}

      {section === "products" ? (
        <Panel title="Форматы работы" subtitle="Услуги, цены и короткая диагностика">
          <ContentField content={content} path={["ru", "productsEyebrow"]} label="Лейбл" updateContent={updateContent} />
          <ContentField content={content} path={["ru", "productsTitle"]} label="Заголовок" area updateContent={updateContent} />
          <ContentField content={content} path={["ru", "productsText"]} label="Описание" area updateContent={updateContent} />
          <ContentField content={content} path={["ru", "priceLabel"]} label="Лейбл цены" updateContent={updateContent} />
          <ContentField content={content} path={["ru", "deadlineLabel"]} label="Лейбл срока" updateContent={updateContent} />
          <ContentField content={content} path={["ru", "includedLabel"]} label="Лейбл пунктов" updateContent={updateContent} />
          <ContentField content={content} path={["ru", "problemsLabel"]} label="Лейбл проблем" updateContent={updateContent} />
          <EditableStringList title="Что обычно исправляю" root={["ru", "problems"]} content={content} updateContent={updateContent} />
          <ProductList content={content} updateContent={updateContent} />
        </Panel>
      ) : null}

      {section === "reel" ? (
        <Panel title="Шоурил-блок" subtitle="Текст под большим превью и таймлайн">
          <ContentField content={content} path={["ru", "reelEyebrow"]} label="Лейбл" updateContent={updateContent} />
          <ContentField content={content} path={["ru", "reelTitle"]} label="Заголовок" area updateContent={updateContent} />
          <ContentField content={content} path={["ru", "reelText"]} label="Описание" area updateContent={updateContent} />
          <ContentField content={content} path={["ru", "showreelCta"]} label="Кнопка" updateContent={updateContent} />
          <ContentField content={content} path={["ru", "chapters"]} label="Заголовок таймлайна" updateContent={updateContent} />
          <EditableStringList title="Треки первого экрана" root={["ru", "tracks"]} content={content} updateContent={updateContent} />
        </Panel>
      ) : null}

      {section === "cases" ? (
        <Panel title="Работы" subtitle="Заголовок секции и кнопки кейсов">
          <ContentField content={content} path={["ru", "casesEyebrow"]} label="Лейбл" updateContent={updateContent} />
          <ContentField content={content} path={["ru", "casesTitle"]} label="Заголовок" area updateContent={updateContent} />
          <ContentField content={content} path={["ru", "casesText"]} label="Описание" area updateContent={updateContent} />
          <ContentField content={content} path={["ru", "openCase"]} label="Кнопка открыть кейс" updateContent={updateContent} />
          <ContentField content={content} path={["ru", "youtube"]} label="Кнопка YouTube" updateContent={updateContent} />
          <p className="text-sm leading-6 text-white/48">Сами ролики редактируются во вкладке «Видео»: кликни по карточке работы.</p>
        </Panel>
      ) : null}

      {section === "method" ? (
        <Panel title="Метод" subtitle="Шаги работы">
          <ContentField content={content} path={["ru", "methodEyebrow"]} label="Лейбл" updateContent={updateContent} />
          <ContentField content={content} path={["ru", "methodTitle"]} label="Заголовок" area updateContent={updateContent} />
          <ContentField content={content} path={["ru", "methodText"]} label="Описание" area updateContent={updateContent} />
          <PairList title="Шаги" root={["ru", "methodSteps"]} content={content} updateContent={updateContent} />
        </Panel>
      ) : null}

      {section === "terms" ? (
        <Panel title="Условия" subtitle="Правила работы и оплаты">
          <ContentField content={content} path={["ru", "termsEyebrow"]} label="Лейбл" updateContent={updateContent} />
          <ContentField content={content} path={["ru", "termsTitle"]} label="Заголовок" area updateContent={updateContent} />
          <ContentField content={content} path={["ru", "termsText"]} label="Описание" area updateContent={updateContent} />
          <ContentField content={content} path={["ru", "faqOpen"]} label="Кнопка открыть FAQ" updateContent={updateContent} />
          <ContentField content={content} path={["ru", "faqClose"]} label="Кнопка закрыть FAQ" updateContent={updateContent} />
          <PairList title="Карточки условий" root={["ru", "terms"]} content={content} updateContent={updateContent} />
          <PairList title="FAQ" root={["ru", "faq"]} content={content} updateContent={updateContent} />
        </Panel>
      ) : null}

      {section === "contact" ? (
        <Panel title="Контакты" subtitle="Текст, ссылки и футер">
          <ContentField content={content} path={["ru", "contactEyebrow"]} label="Лейбл" updateContent={updateContent} />
          <ContentField content={content} path={["ru", "contactTitle"]} label="Заголовок" area updateContent={updateContent} />
          <ContentField content={content} path={["ru", "contactText"]} label="Описание" area updateContent={updateContent} />
          <ContentField content={content} path={["ru", "email"]} label="Текст кнопки email" updateContent={updateContent} />
          <ContentField content={content} path={["ru", "vk"]} label="Текст кнопки VK" updateContent={updateContent} />
          <ContentField content={content} path={["ru", "footer"]} label="Футер" area updateContent={updateContent} />
          <LinkSettings content={content} updateContent={updateContent} />
        </Panel>
      ) : null}
    </>
  );
}

function BreakdownPanel({
  content,
  selection,
  onSelect,
  updateContent,
}: {
  content: EditorContent;
  selection: EditorSelection;
  onSelect: (selection: EditorSelection) => void;
  updateContent: (path: EditorPath, value: unknown) => void;
}) {
  const tracks = content._editor?.showreelTracks?.length ? content._editor.showreelTracks : showreelTracks;
  const selectedTrackId = selection.type === "breakdown" ? selection.trackId : tracks[0]?.id;
  const selectedIndex = Math.max(0, tracks.findIndex((track) => track.id === selectedTrackId));
  const selectedTrack = tracks[selectedIndex] ?? tracks[0];

  const setTracks = (nextTracks: ShowreelTrack[]) => updateContent(["_editor", "showreelTracks"], nextTracks);
  const updateTrack = (patch: Partial<ShowreelTrack>) => {
    setTracks(tracks.map((track, index) => (index === selectedIndex ? { ...track, ...patch } : track)));
  };
  const updateSegment = (segmentIndex: number, patch: Partial<{ start: number; end: number }>) => {
    updateTrack({
      segments: selectedTrack.segments.map((segment, index) => (index === segmentIndex ? { ...segment, ...patch } : segment)),
    });
  };

  if (!selectedTrack) return null;

  return (
    <Panel title="Разбор шоурила" subtitle={selectedTrack.title}>
      <div className="grid grid-cols-2 gap-2">
        {tracks.map((track) => (
          <button
            key={track.id}
            type="button"
            onClick={() => onSelect({ type: "breakdown", label: track.title, trackId: track.id })}
            className={`border px-3 py-2 text-left text-sm ${track.id === selectedTrack.id ? "border-accent bg-accent/10 text-white" : "border-white/10 bg-black/20 text-white/58"}`}
          >
            <span className="block font-mono text-[10px] uppercase text-accent">{track.label}</span>
            {track.title}
          </button>
        ))}
      </div>

      <Field label="Короткий label" value={selectedTrack.label} onChange={(value) => updateTrack({ label: value })} />
      <Field label="Название" value={selectedTrack.title} onChange={(value) => updateTrack({ title: value })} />
      <Field area label="Описание" value={selectedTrack.description} onChange={(value) => updateTrack({ description: value })} />

      <div className="grid gap-2 border-t border-white/10 pt-4">
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs uppercase text-white/42">Сегменты</p>
          <button
            type="button"
            onClick={() => updateTrack({ segments: [...selectedTrack.segments, { start: 0, end: 3 }] })}
            className="h-8 bg-accent px-2 text-xs font-semibold text-black"
          >
            Добавить
          </button>
        </div>
        {selectedTrack.segments.map((segment, index) => (
          <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <NumberField label="Start, сек" value={segment.start} onChange={(value) => updateSegment(index, { start: value })} />
            <NumberField label="End, сек" value={segment.end} onChange={(value) => updateSegment(index, { end: value })} />
            <button
              type="button"
              onClick={() => updateTrack({ segments: selectedTrack.segments.filter((_, currentIndex) => currentIndex !== index) })}
              className="mt-6 size-10 border border-red-400/30 text-red-200"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <p className="text-sm leading-6 text-white/48">
        Клик по дорожке в превью выбирает её здесь и перематывает видео к началу первого сегмента.
      </p>
    </Panel>
  );
}

function ContentField({
  content,
  path,
  label,
  area,
  updateContent,
}: {
  content: EditorContent;
  path: EditorPath;
  label: string;
  area?: boolean;
  updateContent: (path: EditorPath, value: unknown) => void;
}) {
  const value = getAt(content, path);
  return (
    <Field
      label={label}
      area={area ?? String(value ?? "").length > 80}
      value={typeof value === "string" ? value : ""}
      onChange={(nextValue) => updateContent(path, nextValue)}
    />
  );
}

function PairList({
  title,
  root,
  content,
  updateContent,
}: {
  title: string;
  root: EditorPath;
  content: EditorContent;
  updateContent: (path: EditorPath, value: unknown) => void;
}) {
  const value = getAt(content, root);
  const pairs = Array.isArray(value) ? (value as string[][]) : [];
  const updatePair = (index: number, field: 0 | 1, nextValue: string) => {
    updateContent(root, pairs.map((pair, i) => (i === index ? [field === 0 ? nextValue : pair[0] ?? "", field === 1 ? nextValue : pair[1] ?? ""] : pair)));
  };
  const movePair = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= pairs.length) return;
    const next = [...pairs];
    [next[index], next[target]] = [next[target], next[index]];
    updateContent(root, next);
  };

  return (
    <div className="grid gap-3 border-t border-white/10 pt-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-xs uppercase text-white/42">{title}</p>
        <button type="button" onClick={() => updateContent(root, [...pairs, ["Новый заголовок", "Новый текст"]])} className="h-8 bg-accent px-2 text-xs font-semibold text-black">
          Добавить
        </button>
      </div>
      {pairs.map((pair, index) => (
        <div key={index} className="grid gap-2 border border-white/10 bg-black/20 p-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase text-accent">Пункт {index + 1}</span>
            <div className="flex gap-1">
              <button type="button" onClick={() => movePair(index, -1)} className="size-8 border border-white/10 text-white/60">↑</button>
              <button type="button" onClick={() => movePair(index, 1)} className="size-8 border border-white/10 text-white/60">↓</button>
              <button type="button" onClick={() => updateContent(root, pairs.filter((_, i) => i !== index))} className="size-8 border border-red-400/30 text-red-200">×</button>
            </div>
          </div>
          <Field label="Заголовок" value={pair[0] ?? ""} onChange={(nextValue) => updatePair(index, 0, nextValue)} />
          <Field area label="Текст" value={pair[1] ?? ""} onChange={(nextValue) => updatePair(index, 1, nextValue)} />
        </div>
      ))}
    </div>
  );
}

function EditableStringList({
  title,
  root,
  content,
  updateContent,
}: {
  title: string;
  root: EditorPath;
  content: EditorContent;
  updateContent: (path: EditorPath, value: unknown) => void;
}) {
  const value = getAt(content, root);
  const items = Array.isArray(value) ? (value as string[]) : [];
  return <StringList label={title} value={items} onChange={(nextValue) => updateContent(root, nextValue)} />;
}

function ProductList({
  content,
  updateContent,
}: {
  content: EditorContent;
  updateContent: (path: EditorPath, value: unknown) => void;
}) {
  type ProductDraft = {
    code: string;
    title: string;
    audience: string;
    text: string;
    fit?: string;
    price?: string;
    timeline?: string;
    includes: string[];
    cta: string;
  };
  const value = getAt(content, ["ru", "products"]);
  const products = Array.isArray(value) ? (value as ProductDraft[]) : [];
  const updateProduct = (index: number, patch: Partial<ProductDraft>) => {
    updateContent(["ru", "products"], products.map((product, i) => (i === index ? { ...product, ...patch } : product)));
  };
  const moveProduct = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= products.length) return;
    const next = [...products];
    [next[index], next[target]] = [next[target], next[index]];
    updateContent(["ru", "products"], next);
  };

  return (
    <div className="grid gap-3 border-t border-white/10 pt-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-xs uppercase text-white/42">Карточки продуктов</p>
        <button
          type="button"
          onClick={() =>
            updateContent(["ru", "products"], [
              ...products,
              {
                code: `P${String(products.length + 1).padStart(2, "0")}`,
                title: "Новая услуга",
                audience: "Для кого услуга.",
                text: "Описание услуги.",
                fit: "Кому подходит",
                price: "от £___",
                timeline: "Срок после оценки исходников",
                includes: ["Новый пункт"],
                cta: "Обсудить",
              },
            ])
          }
          className="h-8 bg-accent px-2 text-xs font-semibold text-black"
        >
          Добавить
        </button>
      </div>
      {products.map((product, index) => (
        <div key={`${product.code}-${index}`} className="grid gap-2 border border-white/10 bg-black/20 p-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase text-accent">{product.code || `P${index + 1}`}</span>
            <div className="flex gap-1">
              <button type="button" onClick={() => moveProduct(index, -1)} className="size-8 border border-white/10 text-white/60">↑</button>
              <button type="button" onClick={() => moveProduct(index, 1)} className="size-8 border border-white/10 text-white/60">↓</button>
              <button type="button" onClick={() => updateContent(["ru", "products"], products.filter((_, i) => i !== index))} className="size-8 border border-red-400/30 text-red-200">×</button>
            </div>
          </div>
          <Field label="Код" value={product.code ?? ""} onChange={(nextValue) => updateProduct(index, { code: nextValue })} />
          <Field label="Название" value={product.title ?? ""} onChange={(nextValue) => updateProduct(index, { title: nextValue })} />
          <Field area label="Для кого" value={product.audience ?? ""} onChange={(nextValue) => updateProduct(index, { audience: nextValue })} />
          <Field area label="Описание" value={product.text ?? ""} onChange={(nextValue) => updateProduct(index, { text: nextValue })} />
          <Field area label="Подходит для" value={product.fit ?? ""} onChange={(nextValue) => updateProduct(index, { fit: nextValue })} />
          <Field label="Цена" value={product.price ?? ""} onChange={(nextValue) => updateProduct(index, { price: nextValue })} />
          <Field area label="Срок / примечание" value={product.timeline ?? ""} onChange={(nextValue) => updateProduct(index, { timeline: nextValue })} />
          <StringList label="Что входит" value={product.includes ?? []} onChange={(nextValue) => updateProduct(index, { includes: nextValue })} />
          <Field label="Кнопка" value={product.cta ?? ""} onChange={(nextValue) => updateProduct(index, { cta: nextValue })} />
        </div>
      ))}
    </div>
  );
}

function LinkSettings({
  content,
  updateContent,
}: {
  content: EditorContent;
  updateContent: (path: EditorPath, value: unknown) => void;
}) {
  const links = content._editor?.links ?? {};
  return (
    <div className="grid gap-3 border-t border-white/10 pt-4">
      <p className="font-mono text-xs uppercase text-white/42">Ссылки</p>
      <Field label="Telegram URL" value={links.telegramUrl ?? ""} onChange={(value) => updateContent(["_editor", "links", "telegramUrl"], value)} />
      <Field label="Instagram URL" value={links.instagramUrl ?? ""} onChange={(value) => updateContent(["_editor", "links", "instagramUrl"], value)} />
      <Field label="VK URL" value={links.vkUrl ?? ""} onChange={(value) => updateContent(["_editor", "links", "vkUrl"], value)} />
      <Field label="Email" value={links.email ?? ""} onChange={(value) => updateContent(["_editor", "links", "email"], value)} />
    </div>
  );
}

function StructurePanel({
  selection,
  onSelect,
  works,
  addWork,
  moveWork,
}: {
  selection: EditorSelection;
  onSelect: (selection: EditorSelection) => void;
  works: Work[];
  addWork: () => void;
  moveWork: (index: number, direction: -1 | 1) => void;
}) {
  return (
    <Panel title="Страница" subtitle="Кликни элемент на сайте или выбери здесь">
      <div className="grid gap-2">
        {textFields.map((field) => (
          <button
            key={getEditorSelectionKey(field)}
            type="button"
            onClick={() => onSelect(field)}
            className={`border px-3 py-2 text-left text-sm transition ${
              getEditorSelectionKey(selection) === getEditorSelectionKey(field)
                ? "border-accent bg-accent/10 text-white"
                : "border-white/10 bg-black/20 text-white/62 hover:border-accent/55"
            }`}
          >
            {field.label}
          </button>
        ))}
      </div>

      <div className="border-t border-white/10 pt-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="font-mono text-xs uppercase text-white/42">Видео и работы</p>
          <button type="button" onClick={addWork} className="inline-flex h-8 items-center gap-1 bg-accent px-2 text-xs font-semibold text-black">
            <Plus size={13} />
            Добавить
          </button>
        </div>
        <div className="grid gap-2">
          {works.map((work, index) => (
            <div key={work.id ?? index} className="grid grid-cols-[1fr_auto_auto] gap-1">
              <button
                type="button"
                onClick={() => onSelect({ type: "work", label: work.titleRu ?? work.title, index })}
                className={`border px-3 py-2 text-left text-sm ${
                  selection.type === "work" && selection.index === index
                    ? "border-accent bg-accent/10 text-white"
                    : "border-white/10 bg-black/20 text-white/62"
                }`}
              >
                {work.featured ? "★ " : ""}
                {work.titleRu ?? work.title}
              </button>
              <button type="button" onClick={() => moveWork(index, -1)} className="grid size-9 place-items-center border border-white/10 text-white/54">
                <ArrowUp size={14} />
              </button>
              <button type="button" onClick={() => moveWork(index, 1)} className="grid size-9 place-items-center border border-white/10 text-white/54">
                <ArrowDown size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function StylePanel({
  content,
  updateContent,
}: {
  content: EditorContent;
  updateContent: (path: EditorPath, value: unknown) => void;
}) {
  const styles = content._editor?.styles ?? {};
  return (
    <Panel title="Внешний вид" subtitle="Базовые настройки без кода">
      <label className="grid gap-2">
        <span className="text-xs uppercase text-white/48">Акцентный цвет</span>
        <input
          type="color"
          value={typeof styles.accent === "string" ? styles.accent : "#00b7ff"}
          onChange={(event) => updateContent(["_editor", "styles", "accent"], event.target.value)}
          className="h-10 w-full border border-white/10 bg-black"
        />
      </label>
      <RangeField
        label="Размер главного заголовка"
        value={Number(styles.heroTitleSize ?? 64)}
        min={42}
        max={86}
        onChange={(value) => updateContent(["_editor", "styles", "heroTitleSize"], value)}
      />
      <RangeField
        label="Масштаб текста первого экрана"
        value={Number(styles.bodyScale ?? 100)}
        min={90}
        max={118}
        onChange={(value) => updateContent(["_editor", "styles", "bodyScale"], value)}
      />
    </Panel>
  );
}

function Inspector({
  selection,
  textValue,
  works,
  onTextChange,
  onWorkChange,
  onWorkListChange,
  onFeatured,
  onRemove,
  onMove,
}: {
  selection: EditorSelection;
  textValue: string;
  works: Work[];
  onTextChange: (value: string) => void;
  onWorkChange: (index: number, patch: Partial<Work>) => void;
  onWorkListChange: (index: number, key: "workDoneRu" | "deliverablesRu", value: string[]) => void;
  onFeatured: (index: number) => void;
  onRemove: (index: number) => void;
  onMove: (index: number, direction: -1 | 1) => void;
}) {
  if (selection.type === "work") {
    const work = works[selection.index];
    if (!work) return null;
    return (
      <Panel title="Работа / видео" subtitle={work.titleRu ?? work.title}>
        <div className="aspect-video border border-white/12 bg-cover bg-center" style={{ backgroundImage: `url(${getThumbnailUrl(work)})` }} />
        <Field label="Название на русском" value={work.titleRu ?? ""} onChange={(value) => onWorkChange(selection.index, { titleRu: value })} />
        <Field label="Название EN / fallback" value={work.title} onChange={(value) => onWorkChange(selection.index, { title: value })} />
        <Field label="YouTube ссылка" value={work.youtubeUrl} onChange={(value) => onWorkChange(selection.index, { youtubeUrl: value })} />
        <Field label="Превью" hint="auto или прямая ссылка на картинку" value={work.thumbnail ?? "auto"} onChange={(value) => onWorkChange(selection.index, { thumbnail: value || "auto" })} />
        <NumberField
          label="Приоритет показа"
          hint="Чем выше число, тем выше ролик в выборе для первого экрана. Главное видео всё равно задаётся кнопкой ниже."
          value={Number(work.priority ?? 0)}
          onChange={(value) => onWorkChange(selection.index, { priority: value })}
        />
        <label className="grid gap-2">
          <span className="text-xs uppercase text-white/48">Категория</span>
          <select
            className="h-11 w-full border border-white/10 bg-black/35 px-3 text-sm text-white outline-none"
            value={work.category}
            onChange={(event) => onWorkChange(selection.index, { category: event.target.value })}
          >
            {["Showreel", ...workCategories].map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </label>
        <Field label="Формат" value={work.formatRu ?? ""} onChange={(value) => onWorkChange(selection.index, { formatRu: value })} />
        <Field area label="Описание" value={work.descriptionRu ?? ""} onChange={(value) => onWorkChange(selection.index, { descriptionRu: value })} />
        <Field area label="Задача" value={work.taskRu ?? ""} onChange={(value) => onWorkChange(selection.index, { taskRu: value })} />
        <StringList label="Что сделано" value={work.workDoneRu ?? []} onChange={(value) => onWorkListChange(selection.index, "workDoneRu", value)} />
        <Field area label="Почему работает" value={work.whyItWorksRu ?? ""} onChange={(value) => onWorkChange(selection.index, { whyItWorksRu: value })} />
        <StringList label="Что отдаю" value={work.deliverablesRu ?? []} onChange={(value) => onWorkListChange(selection.index, "deliverablesRu", value)} />
        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={() => onMove(selection.index, -1)} className="h-10 border border-white/12 text-sm text-white/68">Выше</button>
          <button type="button" onClick={() => onMove(selection.index, 1)} className="h-10 border border-white/12 text-sm text-white/68">Ниже</button>
        </div>
        <button
          type="button"
          onClick={() => onFeatured(selection.index)}
          className={`inline-flex h-10 items-center justify-center border text-sm font-semibold ${
            work.featured ? "border-accent bg-accent text-black" : "border-accent/40 text-accent"
          }`}
        >
          {work.featured ? "Показывается на первом экране" : "Поставить на первый экран"}
        </button>
        <button type="button" onClick={() => onRemove(selection.index)} className="inline-flex h-10 items-center justify-center gap-2 border border-red-400/35 text-sm text-red-200">
          <Trash2 size={15} />
          Удалить видео
        </button>
      </Panel>
    );
  }

  if (selection.type !== "text") {
    return (
      <Panel title="Разбор" subtitle={selection.label}>
        <p className="text-sm leading-6 text-white/48">Настройки этой дорожки находятся во вкладке «Разбор».</p>
      </Panel>
    );
  }

  return (
    <Panel title="Текст" subtitle={selection.label}>
      <Field area={selection.area ?? textValue.length > 80} label={selection.label} value={textValue} onChange={onTextChange} />
      <p className="text-sm leading-6 text-white/48">
        Текст меняется сразу в настоящем лендинге слева и автоматически сохраняется в JSON.
      </p>
    </Panel>
  );
}

function VersionsPanel({
  versions,
  versionName,
  setVersionName,
  createVersion,
  restoreVersion,
}: {
  versions: VersionItem[];
  versionName: string;
  setVersionName: (value: string) => void;
  createVersion: () => void;
  restoreVersion: (id: string) => void;
}) {
  return (
    <Panel title="Версии" subtitle="Снимок перед экспериментами">
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input
          className="h-10 border border-white/10 bg-black/35 px-3 text-sm text-white outline-none focus:border-accent"
          value={versionName}
          onChange={(event) => setVersionName(event.target.value)}
          placeholder="Например: до правок hero"
        />
        <button type="button" onClick={createVersion} className="inline-flex h-10 items-center gap-2 bg-white px-3 text-sm font-semibold text-black">
          <History size={15} />
          Снимок
        </button>
      </div>
      <div className="grid gap-2">
        {versions.length ? versions.map((version) => (
          <button
            key={version.id}
            type="button"
            onClick={() => restoreVersion(version.id)}
            className="border border-white/10 bg-black/20 px-3 py-2 text-left text-sm text-white/66 hover:border-accent/60"
          >
            <span className="block text-white">{version.name}</span>
            <span className="font-mono text-[11px] uppercase text-white/38">{new Date(version.createdAt).toLocaleString("ru-RU")}</span>
          </button>
        )) : <p className="text-sm text-white/42">Версий пока нет.</p>}
      </div>
    </Panel>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border border-white/10 bg-[#06090b] p-4">
      <div className="border-b border-white/10 pb-3">
        <p className="font-mono text-xs uppercase text-accent">{title}</p>
        {subtitle ? <h2 className="mt-1 text-lg font-semibold uppercase leading-tight">{subtitle}</h2> : null}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  area,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  area?: boolean;
  hint?: string;
}) {
  const className = "w-full border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none focus:border-accent";
  return (
    <label className="grid gap-2">
      <span className="text-xs uppercase text-white/48">{label}</span>
      {area ? (
        <textarea className={`${className} min-h-28 resize-y leading-6`} value={value} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input className={className} value={value} onChange={(event) => onChange(event.target.value)} />
      )}
      {hint ? <span className="text-xs text-white/34">{hint}</span> : null}
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  hint?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs uppercase text-white/48">{label}</span>
      <input
        type="number"
        className="w-full border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none focus:border-accent"
        value={value}
        onChange={(event) => onChange(Number(event.target.value || 0))}
      />
      {hint ? <span className="text-xs leading-5 text-white/34">{hint}</span> : null}
    </label>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="flex items-center justify-between text-xs uppercase text-white/48">
        <span>{label}</span>
        <span className="font-mono text-accent">{value}</span>
      </span>
      <input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function StringList({ label, value, onChange }: { label: string; value: string[]; onChange: (value: string[]) => void }) {
  return (
    <div className="grid gap-2">
      <p className="text-xs uppercase text-white/48">{label}</p>
      {value.map((item, index) => (
        <div key={index} className="grid grid-cols-[1fr_auto] gap-2">
          <input
            className="w-full border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none focus:border-accent"
            value={item}
            onChange={(event) => onChange(value.map((current, i) => (i === index ? event.target.value : current)))}
          />
          <button type="button" onClick={() => onChange(value.filter((_, i) => i !== index))} className="grid size-10 place-items-center border border-white/10 text-white/52">
            x
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...value, "Новый пункт"])} className="inline-flex h-9 items-center justify-center gap-2 border border-white/12 text-sm text-white/70">
        <Plus size={14} />
        Добавить пункт
      </button>
    </div>
  );
}

function StatusPill({ text, active }: { text: string; active?: boolean }) {
  return (
    <span className={`inline-flex min-h-10 items-center gap-2 border px-3 font-mono text-[11px] uppercase ${active ? "border-accent/50 text-accent" : "border-white/12 text-white/46"}`}>
      {active ? <RefreshCw size={13} /> : <Check size={13} />}
      {text}
    </span>
  );
}
