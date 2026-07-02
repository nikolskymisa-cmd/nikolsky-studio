"use client";

import {
  ArrowUpRight,
  Check,
  ExternalLink,
  GitBranch,
  Plus,
  RefreshCw,
  Save,
  Star,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import seedContent from "../../data/landing-content.json";
import seedWorks from "../../data/works.json";
import { getThumbnailUrl } from "@/lib/youtube";
import { workCategories, type Work } from "@/types/work";

const STORAGE_KEY = "nikolsky-studio-content-v1";
const WORKS_STORAGE_KEY = "nikolsky-studio-works-v1";
const ADMIN_API = "http://127.0.0.1:4317";

type Pair = [string, string];
type Product = {
  code: string;
  title: string;
  audience: string;
  text: string;
  includes: string[];
  cta: string;
};
type EditorContent = typeof seedContent & {
  ru: typeof seedContent.ru & {
    products: Product[];
    stats: Pair[];
    positionCards: Pair[];
    methodSteps: Pair[];
    terms: Pair[];
  };
};
type Path = Array<string | number>;
type TextSelection = {
  type: "text";
  label: string;
  path: Path;
  area?: boolean;
};
type WorkSelection = {
  type: "work";
  index: number;
};
type Selection = TextSelection | WorkSelection;

function cloneContent(): EditorContent {
  return JSON.parse(JSON.stringify(seedContent)) as EditorContent;
}

function cloneWorks(): Work[] {
  return JSON.parse(JSON.stringify(seedWorks)) as Work[];
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getAt(source: unknown, path: Path): unknown {
  return path.reduce<unknown>((current, key) => {
    if (current && typeof current === "object") {
      return (current as Record<string | number, unknown>)[key];
    }
    return undefined;
  }, source);
}

function setAt<T>(source: T, path: Path, value: unknown): T {
  const next = clone(source) as Record<string | number, unknown>;
  let cursor: Record<string | number, unknown> = next;

  path.slice(0, -1).forEach((key) => {
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
    taskRu: "Какую задачу решал ролик.",
    formatRu: "Reels / 9:16",
    workDoneRu: ["монтаж", "субтитры", "акценты"],
    whyItWorksRu: "Почему эта версия работает.",
    deliverablesRu: ["финальный ролик"],
  };
}

async function postAdmin(path: string, body: unknown) {
  const response = await fetch(`${ADMIN_API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as { ok?: boolean; message?: string; output?: string };
  if (!response.ok || !data.ok) {
    throw new Error(data.message || "Локальная команда не выполнена.");
  }
  return data;
}

export function ContentEditor() {
  const [content, setContent] = useState<EditorContent>(() => cloneContent());
  const [works, setWorks] = useState<Work[]>(() => cloneWorks());
  const [selection, setSelection] = useState<Selection>({ type: "text", label: "Главный заголовок", path: ["ru", "heroTitle"], area: false });
  const [status, setStatus] = useState("Готово");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const mounted = useRef(false);

  const ru = content.ru;
  const featuredIndex = works.findIndex((work) => work.featured);
  const showreel = works[featuredIndex >= 0 ? featuredIndex : 0];

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
    window.localStorage.setItem(WORKS_STORAGE_KEY, JSON.stringify(works));
  }, [content, works]);

  const selectedText = useMemo(() => {
    if (selection.type !== "text") return "";
    const value = getAt(content, selection.path);
    return typeof value === "string" ? value : "";
  }, [content, selection]);

  const markDirty = () => setDirty(true);

  const selectText = (label: string, path: Path, area = false) => {
    setSelection({ type: "text", label, path, area });
  };

  const updateText = (value: string) => {
    if (selection.type !== "text") return;
    setContent((current) => setAt(current, selection.path, value));
    markDirty();
  };

  const updateContent = (path: Path, value: unknown) => {
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
    setSelection({ type: "work", index: works.length });
    markDirty();
  };

  const removeWork = (index: number) => {
    setWorks((current) => current.filter((_, i) => i !== index));
    setSelection({ type: "text", label: "Работы", path: ["ru", "casesTitle"] });
    markDirty();
  };

  const makeFeatured = (index: number) => {
    setWorks((current) => current.map((work, i) => ({ ...work, featured: i === index })));
    markDirty();
  };

  const saveToFiles = useCallback(async (message = "Сохранено в data") => {
    setSaving(true);
    setStatus("Сохраняю...");
    try {
      await postAdmin("/save", { content, works });
      setDirty(false);
      setStatus(message);
    } catch {
      setStatus("Admin API не запущен. Перезапусти npm run dev.");
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

  const resetLocal = () => {
    setContent(cloneContent());
    setWorks(cloneWorks());
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(WORKS_STORAGE_KEY);
    setDirty(true);
    setStatus("Сброшено к файлам проекта");
  };

  return (
    <main className="min-h-screen bg-[#030506] text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#05080b]/96 backdrop-blur">
        <div className="mx-auto flex max-w-[1720px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="font-mono text-xs uppercase text-accent">Nikolsky local admin</p>
            <h1 className="text-xl font-semibold uppercase">Кликни элемент, измени справа</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill text={dirty ? `${status} / есть изменения` : status} active={dirty || saving} />
            <a href="/" target="_blank" className="inline-flex h-10 items-center gap-2 border border-white/12 px-3 text-sm text-white/72">
              <ExternalLink size={15} />
              Сайт
            </a>
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

      <div className="mx-auto grid max-w-[1720px] gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_430px]">
        <section className="grid gap-4">
          <AdminHero ru={ru} selectText={selectText} showreel={showreel} showreelIndex={featuredIndex >= 0 ? featuredIndex : 0} selectWork={(index) => setSelection({ type: "work", index })} />

          <AdminSection title="Смысл">
            <ClickText label="Лейбл" selected={selection} path={["ru", "positionEyebrow"]} onSelect={selectText}>
              {ru.positionEyebrow}
            </ClickText>
            <ClickText label="Заголовок" selected={selection} path={["ru", "positionTitle"]} area onSelect={selectText}>
              {ru.positionTitle}
            </ClickText>
            <ClickText label="Текст" selected={selection} path={["ru", "positionText"]} area onSelect={selectText}>
              {ru.positionText}
            </ClickText>
            <div className="grid gap-2 md:grid-cols-3">
              {ru.positionCards.map(([title, text], index) => (
                <MiniCard key={index}>
                  <ClickText label={`Карточка ${index + 1}: заголовок`} selected={selection} path={["ru", "positionCards", index, 0]} onSelect={selectText}>
                    {title}
                  </ClickText>
                  <ClickText label={`Карточка ${index + 1}: текст`} selected={selection} path={["ru", "positionCards", index, 1]} area onSelect={selectText}>
                    {text}
                  </ClickText>
                </MiniCard>
              ))}
            </div>
          </AdminSection>

          <AdminSection
            title="Видео и портфолио"
            action={
              <button type="button" onClick={addWork} className="inline-flex h-9 items-center gap-2 bg-accent px-3 text-sm font-semibold text-black">
                <Plus size={15} />
                Добавить видео
              </button>
            }
          >
            <ClickText label="Заголовок блока работ" selected={selection} path={["ru", "casesTitle"]} onSelect={selectText}>
              {ru.casesTitle}
            </ClickText>
            <ClickText label="Описание блока работ" selected={selection} path={["ru", "casesText"]} area onSelect={selectText}>
              {ru.casesText}
            </ClickText>
            <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {works.map((work, index) => (
                <WorkAdminCard
                  key={work.id ?? index}
                  work={work}
                  active={selection.type === "work" && selection.index === index}
                  onSelect={() => setSelection({ type: "work", index })}
                  onFeatured={() => makeFeatured(index)}
                  onRemove={() => removeWork(index)}
                />
              ))}
            </div>
          </AdminSection>

          <AdminSection title="Услуги">
            <ClickText label="Заголовок услуг" selected={selection} path={["ru", "productsTitle"]} onSelect={selectText}>
              {ru.productsTitle}
            </ClickText>
            <div className="grid gap-3 lg:grid-cols-3">
              {ru.products.map((product, index) => (
                <MiniCard key={product.code}>
                  <ClickText label={`Услуга ${index + 1}: название`} selected={selection} path={["ru", "products", index, "title"]} onSelect={selectText}>
                    {product.title}
                  </ClickText>
                  <ClickText label={`Услуга ${index + 1}: для кого`} selected={selection} path={["ru", "products", index, "audience"]} area onSelect={selectText}>
                    {product.audience}
                  </ClickText>
                  <ClickText label={`Услуга ${index + 1}: описание`} selected={selection} path={["ru", "products", index, "text"]} area onSelect={selectText}>
                    {product.text}
                  </ClickText>
                  <div className="grid gap-1">
                    {product.includes.map((item, itemIndex) => (
                      <ClickText key={itemIndex} label={`Услуга ${index + 1}: пункт ${itemIndex + 1}`} selected={selection} path={["ru", "products", index, "includes", itemIndex]} onSelect={selectText}>
                        {item}
                      </ClickText>
                    ))}
                  </div>
                </MiniCard>
              ))}
            </div>
          </AdminSection>

          <AdminSection title="Метод и условия">
            <TwoColumnPairs title="Метод" pairs={ru.methodSteps} root={["ru", "methodSteps"]} selection={selection} selectText={selectText} />
            <TwoColumnPairs title="Условия" pairs={ru.terms} root={["ru", "terms"]} selection={selection} selectText={selectText} />
          </AdminSection>

          <AdminSection title="Контакт">
            <ClickText label="Заголовок контакта" selected={selection} path={["ru", "contactTitle"]} area onSelect={selectText}>
              {ru.contactTitle}
            </ClickText>
            <ClickText label="Текст контакта" selected={selection} path={["ru", "contactText"]} area onSelect={selectText}>
              {ru.contactText}
            </ClickText>
            <ClickText label="Футер" selected={selection} path={["ru", "footer"]} area onSelect={selectText}>
              {ru.footer}
            </ClickText>
          </AdminSection>
        </section>

        <aside className="xl:sticky xl:top-[86px] xl:h-[calc(100vh-104px)]">
          <Inspector
            selection={selection}
            textValue={selectedText}
            works={works}
            onTextChange={updateText}
            onWorkChange={updateWork}
            onWorkListChange={updateWorkList}
            onFeatured={makeFeatured}
            onRemove={removeWork}
            onReset={resetLocal}
            setSelection={setSelection}
            updateContent={updateContent}
          />
        </aside>
      </div>
    </main>
  );
}

function AdminHero({
  ru,
  showreel,
  showreelIndex,
  selectText,
  selectWork,
}: {
  ru: EditorContent["ru"];
  showreel?: Work;
  showreelIndex: number;
  selectText: (label: string, path: Path, area?: boolean) => void;
  selectWork: (index: number) => void;
}) {
  return (
    <AdminSection title="Первый экран">
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="border border-white/10 bg-white/[0.025] p-4">
          <ClickText label="Техническая строка" path={["ru", "eyebrow"]} onSelect={selectText}>{ru.eyebrow}</ClickText>
          <ClickText label="Направление" path={["ru", "label"]} onSelect={selectText}>{ru.label}</ClickText>
          <ClickText label="Главный заголовок" path={["ru", "heroTitle"]} onSelect={selectText}>
            <span className="text-4xl font-semibold uppercase leading-none">{ru.heroTitle}</span>
          </ClickText>
          <ClickText label="Подзаголовок" path={["ru", "heroSub"]} area onSelect={selectText}>{ru.heroSub}</ClickText>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ClickText label="Кнопка работ" path={["ru", "casesCta"]} onSelect={selectText}>{ru.casesCta}</ClickText>
            <ClickText label="Кнопка связи" path={["ru", "projectCta"]} onSelect={selectText}>{ru.projectCta}</ClickText>
          </div>
          <ClickText label="Строка доверия" path={["ru", "trust"]} area onSelect={selectText}>{ru.trust}</ClickText>
        </div>
        {showreel ? (
          <button type="button" onClick={() => selectWork(showreelIndex)} className="group overflow-hidden border border-accent/40 bg-white/[0.025] text-left">
            <div className="aspect-video bg-cover bg-center" style={{ backgroundImage: `url(${getThumbnailUrl(showreel)})` }} />
            <div className="p-4">
              <p className="font-mono text-xs uppercase text-accent">Главный шоурил</p>
              <h3 className="mt-2 text-2xl font-semibold uppercase">{showreel.titleRu ?? showreel.title}</h3>
              <p className="mt-2 break-all text-sm text-white/50">{showreel.youtubeUrl}</p>
            </div>
          </button>
        ) : null}
      </div>
    </AdminSection>
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
  onReset,
  updateContent,
}: {
  selection: Selection;
  textValue: string;
  works: Work[];
  onTextChange: (value: string) => void;
  onWorkChange: (index: number, patch: Partial<Work>) => void;
  onWorkListChange: (index: number, key: "workDoneRu" | "deliverablesRu", value: string[]) => void;
  onFeatured: (index: number) => void;
  onRemove: (index: number) => void;
  onReset: () => void;
  setSelection: (selection: Selection) => void;
  updateContent: (path: Path, value: unknown) => void;
}) {
  if (selection.type === "work") {
    const work = works[selection.index];
    if (!work) return null;
    return (
      <Panel title="Редактирование видео" subtitle={`Видео ${selection.index + 1}`}>
        <div className="aspect-video border border-white/12 bg-cover bg-center" style={{ backgroundImage: `url(${getThumbnailUrl(work)})` }} />
        <Field label="Название на русском" value={work.titleRu ?? ""} onChange={(value) => onWorkChange(selection.index, { titleRu: value })} />
        <Field label="Название EN / fallback" value={work.title} onChange={(value) => onWorkChange(selection.index, { title: value })} />
        <Field label="YouTube ссылка" value={work.youtubeUrl} onChange={(value) => onWorkChange(selection.index, { youtubeUrl: value })} />
        <Field label="Превью карточки" hint="auto или прямая ссылка на картинку" value={work.thumbnail ?? "auto"} onChange={(value) => onWorkChange(selection.index, { thumbnail: value || "auto" })} />
        <label className="block">
          <span className="mb-2 block text-xs uppercase text-white/48">Категория</span>
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
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => onFeatured(selection.index)} className="inline-flex h-10 items-center justify-center gap-2 border border-accent/40 text-sm text-accent">
            <Star size={15} />
            Главный
          </button>
          <a href={work.youtubeUrl} target="_blank" className="inline-flex h-10 items-center justify-center gap-2 border border-white/12 text-sm text-white/70">
            <ArrowUpRight size={15} />
            YouTube
          </a>
        </div>
        <button type="button" onClick={() => onRemove(selection.index)} className="inline-flex h-10 items-center justify-center gap-2 border border-red-400/35 text-sm text-red-200">
          <Trash2 size={15} />
          Удалить видео
        </button>
      </Panel>
    );
  }

  return (
    <Panel title="Редактирование текста" subtitle={selection.label}>
      <Field area={selection.area ?? textValue.length > 80} label={selection.label} value={textValue} onChange={onTextChange} />
      <button type="button" onClick={onReset} className="inline-flex h-10 items-center justify-center gap-2 border border-white/12 text-sm text-white/62">
        <RefreshCw size={15} />
        Сбросить к файлам
      </button>
      <p className="text-sm leading-6 text-white/48">
        Выделяй текст или видео слева. Изменения автоматически пишутся в JSON и сразу видны на локальном сайте.
      </p>
      <QuickStats updateContent={updateContent} />
    </Panel>
  );
}

function QuickStats({ updateContent }: { updateContent: (path: Path, value: unknown) => void }) {
  const stats = cloneContent().ru.stats;
  return (
    <div className="border-t border-white/10 pt-4">
      <p className="mb-2 font-mono text-xs uppercase text-white/40">Подсказка</p>
      <p className="text-sm leading-6 text-white/48">
        Метрики тоже редактируются на canvas слева. При необходимости можно менять массивы прямо в JSON, но для обычной работы это не нужно.
      </p>
      <button type="button" onClick={() => updateContent(["ru", "stats"], stats)} className="mt-3 hidden">
        reset stats
      </button>
    </div>
  );
}

function AdminSection({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="border border-white/10 bg-[#06090b] p-4">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/10 pb-3">
        <h2 className="font-mono text-xs uppercase text-accent">{title}</h2>
        {action}
      </div>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

function MiniCard({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-2 border border-white/10 bg-white/[0.02] p-3">{children}</div>;
}

function ClickText({
  label,
  path,
  selected,
  area,
  onSelect,
  children,
}: {
  label: string;
  path: Path;
  selected?: Selection;
  area?: boolean;
  onSelect: (label: string, path: Path, area?: boolean) => void;
  children: React.ReactNode;
}) {
  const active = selected?.type === "text" && JSON.stringify(selected.path) === JSON.stringify(path);
  return (
    <button
      type="button"
      onClick={() => onSelect(label, path, area)}
      className={`block w-full border p-2 text-left transition ${
        active ? "border-accent bg-accent/10" : "border-white/10 bg-black/20 hover:border-accent/55"
      }`}
    >
      <span className="mb-1 block font-mono text-[10px] uppercase text-white/36">{label}</span>
      <span className="block text-sm leading-6 text-white/78">{children}</span>
    </button>
  );
}

function WorkAdminCard({
  work,
  active,
  onSelect,
  onFeatured,
  onRemove,
}: {
  work: Work;
  active: boolean;
  onSelect: () => void;
  onFeatured: () => void;
  onRemove: () => void;
}) {
  return (
    <article className={`overflow-hidden border ${active ? "border-accent" : "border-white/10"} bg-white/[0.02]`}>
      <button type="button" onClick={onSelect} className="block w-full text-left">
        <div className="relative aspect-video bg-cover bg-center" style={{ backgroundImage: `url(${getThumbnailUrl(work)})` }}>
          {work.featured ? <span className="absolute left-3 top-3 bg-accent px-2 py-1 font-mono text-[10px] uppercase text-black">Шоурил</span> : null}
        </div>
        <div className="p-3">
          <p className="font-mono text-[10px] uppercase text-accent">{work.category}</p>
          <h3 className="mt-1 text-lg font-semibold uppercase">{work.titleRu ?? work.title}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-5 text-white/52">{work.taskRu ?? work.descriptionRu ?? work.youtubeUrl}</p>
        </div>
      </button>
      <div className="grid grid-cols-2 border-t border-white/10">
        <button type="button" onClick={onFeatured} className="inline-flex h-10 items-center justify-center gap-2 border-r border-white/10 text-sm text-white/70">
          <Star size={14} />
          Главный
        </button>
        <button type="button" onClick={onRemove} className="inline-flex h-10 items-center justify-center gap-2 text-sm text-red-200">
          <Trash2 size={14} />
          Удалить
        </button>
      </div>
    </article>
  );
}

function TwoColumnPairs({
  title,
  pairs,
  root,
  selection,
  selectText,
}: {
  title: string;
  pairs: Pair[];
  root: Path;
  selection: Selection;
  selectText: (label: string, path: Path, area?: boolean) => void;
}) {
  return (
    <div>
      <p className="mb-2 font-mono text-xs uppercase text-white/38">{title}</p>
      <div className="grid gap-2 md:grid-cols-2">
        {pairs.map(([heading, text], index) => (
          <MiniCard key={index}>
            <ClickText label={`${title} ${index + 1}: заголовок`} selected={selection} path={[...root, index, 0]} onSelect={selectText}>
              {heading}
            </ClickText>
            <ClickText label={`${title} ${index + 1}: текст`} selected={selection} path={[...root, index, 1]} area onSelect={selectText}>
              {text}
            </ClickText>
          </MiniCard>
        ))}
      </div>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="grid max-h-full gap-4 overflow-y-auto border border-white/10 bg-[#06090b] p-4">
      <div className="border-b border-white/10 pb-3">
        <p className="font-mono text-xs uppercase text-accent">{title}</p>
        {subtitle ? <h2 className="mt-1 text-xl font-semibold uppercase">{subtitle}</h2> : null}
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
    <label className="block">
      <span className="mb-2 block text-xs uppercase text-white/48">{label}</span>
      {area ? (
        <textarea className={`${className} min-h-28 resize-y leading-6`} value={value} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input className={className} value={value} onChange={(event) => onChange(event.target.value)} />
      )}
      {hint ? <span className="mt-1 block text-xs text-white/34">{hint}</span> : null}
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
