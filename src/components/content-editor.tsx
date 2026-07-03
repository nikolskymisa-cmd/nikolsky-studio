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
import { workCategories, type Work } from "@/types/work";

const STORAGE_KEY = "nikolsky-studio-content-v1";
const WORKS_STORAGE_KEY = "nikolsky-studio-works-v1";
const ADMIN_API = "http://127.0.0.1:4317";

type EditorContent = Partial<LandingCopy> & Record<string, unknown> & {
  _editor?: {
    styles?: {
      accent?: string;
      heroTitleSize?: number;
      bodyScale?: number;
    };
  };
};

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
  { type: "text", label: "Позиционирование: лейбл", path: ["ru", "positionEyebrow"] },
  { type: "text", label: "Позиционирование: заголовок", path: ["ru", "positionTitle"], area: true },
  { type: "text", label: "Позиционирование: текст", path: ["ru", "positionText"], area: true },
  { type: "text", label: "Услуги: заголовок", path: ["ru", "productsTitle"] },
  { type: "text", label: "Шоурил: заголовок", path: ["ru", "reelTitle"] },
  { type: "text", label: "Шоурил: текст", path: ["ru", "reelText"], area: true },
  { type: "text", label: "Работы: заголовок", path: ["ru", "casesTitle"] },
  { type: "text", label: "Работы: текст", path: ["ru", "casesText"], area: true },
  { type: "text", label: "Метод: заголовок", path: ["ru", "methodTitle"] },
  { type: "text", label: "Условия: заголовок", path: ["ru", "termsTitle"] },
  { type: "text", label: "Условия: текст", path: ["ru", "termsText"], area: true },
  { type: "text", label: "Контакт: заголовок", path: ["ru", "contactTitle"], area: true },
  { type: "text", label: "Контакт: текст", path: ["ru", "contactText"], area: true },
  { type: "text", label: "Футер", path: ["ru", "footer"], area: true },
];

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
    markDirty();
  };

  const removeWork = (index: number) => {
    setWorks((current) => current.filter((_, i) => i !== index));
    setSelection(textFields[1]);
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
            onEditorSelect={(nextSelection) => {
              setSelection(nextSelection);
              setInspectorOpen(true);
            }}
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
            <Inspector
              selection={selection}
              textValue={selectedText}
              works={works}
              onTextChange={updateText}
              onWorkChange={updateWork}
              onWorkListChange={updateWorkList}
              onFeatured={makeFeatured}
              onRemove={removeWork}
              onMove={moveWork}
            />
            <StructurePanel
              selection={selection}
              onSelect={(nextSelection) => {
                setSelection(nextSelection);
                setInspectorOpen(true);
              }}
              works={works}
              addWork={addWork}
              moveWork={moveWork}
            />
            <StylePanel content={content} updateContent={updateContent} />
            <VersionsPanel
              versions={versions}
              versionName={versionName}
              setVersionName={setVersionName}
              createVersion={createVersion}
              restoreVersion={restoreVersion}
            />
          </div>
        </aside>
      </div>
    </main>
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
          <button type="button" onClick={() => onFeatured(selection.index)} className="h-10 border border-accent/40 text-sm text-accent">Шоурил</button>
        </div>
        <button type="button" onClick={() => onRemove(selection.index)} className="inline-flex h-10 items-center justify-center gap-2 border border-red-400/35 text-sm text-red-200">
          <Trash2 size={15} />
          Удалить видео
        </button>
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
