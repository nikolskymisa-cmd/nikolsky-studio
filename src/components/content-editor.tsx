"use client";

import { Copy, Download, ExternalLink, FolderOpen, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

import seedContent from "../../data/landing-content.json";
import seedWorks from "../../data/works.json";

const STORAGE_KEY = "nikolsky-studio-content-v1";
const WORKS_STORAGE_KEY = "nikolsky-studio-works-v1";

type Pair = [string, string];
type Product = {
  code: string;
  title: string;
  audience: string;
  text: string;
  includes: string[];
  cta: string;
};
type EditableWork = {
  id?: string;
  title: string;
  titleRu?: string;
  category: string;
  youtubeUrl: string;
  thumbnail?: string;
  description?: string;
  descriptionRu?: string;
  taskRu?: string;
  formatRu?: string;
  workDoneRu?: string[];
  whyItWorksRu?: string;
  deliverablesRu?: string[];
  featured?: boolean;
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
type WritableFileHandle = {
  createWritable: () => Promise<{
    write: (data: string) => Promise<void>;
    close: () => Promise<void>;
  }>;
};
type LocalDirectoryHandle = {
  name: string;
  getFileHandle: (name: string, options?: { create?: boolean }) => Promise<WritableFileHandle>;
  getDirectoryHandle?: (name: string, options?: { create?: boolean }) => Promise<LocalDirectoryHandle>;
};
type SavePickerWindow = Window & {
  showSaveFilePicker?: (options: {
    suggestedName: string;
    types: Array<{ description: string; accept: Record<string, string[]> }>;
  }) => Promise<WritableFileHandle>;
  showDirectoryPicker?: (options?: { mode?: "read" | "readwrite" }) => Promise<LocalDirectoryHandle>;
};

const sections = [
  ["hero", "Hero"],
  ["position", "Смысл"],
  ["products", "Продукты"],
  ["showreel", "Шоурил"],
  ["videos", "Видео"],
  ["cases", "Работы"],
  ["method", "Метод"],
  ["terms", "Условия"],
  ["contact", "Контакт"],
] as const;

function cloneSeed(): EditorContent {
  return JSON.parse(JSON.stringify(seedContent)) as EditorContent;
}

function cloneWorks(): EditableWork[] {
  return JSON.parse(JSON.stringify(seedWorks)) as EditableWork[];
}

export function ContentEditor() {
  const [content, setContent] = useState<EditorContent>(() => {
    if (typeof window === "undefined") return cloneSeed();
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as EditorContent) : cloneSeed();
    } catch {
      return cloneSeed();
    }
  });
  const [works, setWorks] = useState<EditableWork[]>(() => {
    if (typeof window === "undefined") return cloneWorks();
    try {
      const raw = window.localStorage.getItem(WORKS_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as EditableWork[]) : cloneWorks();
    } catch {
      return cloneWorks();
    }
  });
  const [active, setActive] = useState<(typeof sections)[number][0]>("hero");
  const [dataDirectory, setDataDirectory] = useState<LocalDirectoryHandle | null>(null);
  const [saveStatus, setSaveStatus] = useState("");

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
  }, [content]);

  useEffect(() => {
    window.localStorage.setItem(WORKS_STORAGE_KEY, JSON.stringify(works));
  }, [works]);

  const ru = content.ru;
  const updateRu = <K extends keyof EditorContent["ru"]>(key: K, value: EditorContent["ru"][K]) => {
    setContent((current) => ({ ...current, ru: { ...current.ru, [key]: value } }));
  };

  const getProjectDataDirectory = async (handle: LocalDirectoryHandle) => {
    if (handle.name === "data" || !handle.getDirectoryHandle) return handle;
    return handle.getDirectoryHandle("data", { create: true });
  };

  const writeJsonFile = async (directory: LocalDirectoryHandle, fileName: string, data: unknown) => {
    const file = await directory.getFileHandle(fileName, { create: true });
    const writable = await file.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
  };

  const chooseDataFolder = async () => {
    const picker = (window as SavePickerWindow).showDirectoryPicker;
    if (!picker) {
      setSaveStatus("Браузер не умеет сохранять в папку. Используй кнопки JSON ниже.");
      return null;
    }

    try {
      const selected = await picker({ mode: "readwrite" });
      const directory = await getProjectDataDirectory(selected);
      setDataDirectory(directory);
      setSaveStatus("Папка data подключена.");
      return directory;
    } catch {
      setSaveStatus("Выбор папки отменён.");
      return null;
    }
  };

  const saveProjectData = async () => {
    const directory = dataDirectory ?? (await chooseDataFolder());
    if (!directory) return;

    try {
      await Promise.all([
        writeJsonFile(directory, "landing-content.json", content),
        writeJsonFile(directory, "works.json", works),
      ]);
      setSaveStatus("Сохранено в data/landing-content.json и data/works.json.");
    } catch {
      setSaveStatus("Не получилось сохранить. Проверь доступ к папке проекта.");
    }
  };

  const saveJson = async (fileName: string, data: unknown) => {
    const text = JSON.stringify(data, null, 2);
    const picker = (window as SavePickerWindow).showSaveFilePicker;
    if (picker) {
      const handle = await picker({
        suggestedName: fileName,
        types: [{ description: "JSON", accept: { "application/json": [".json"] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(text);
      await writable.close();
      return;
    }

    downloadJson(fileName, text);
  };

  const downloadJson = (fileName: string, text: string) => {
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const copyJson = async () => {
    await navigator.clipboard.writeText(JSON.stringify(content, null, 2));
  };
  const copyWorks = async () => {
    await navigator.clipboard.writeText(JSON.stringify(works, null, 2));
  };

  const reset = () => {
    const clean = cloneSeed();
    setContent(clean);
    setWorks(cloneWorks());
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(WORKS_STORAGE_KEY);
  };

  return (
    <main className="min-h-screen bg-[#030506] text-white">
      <div className="grid min-h-screen lg:grid-cols-[520px_1fr]">
        <aside className="border-r border-white/10 bg-[#06090b]">
          <div className="sticky top-0 z-10 border-b border-white/10 bg-[#06090b]/95 p-4 backdrop-blur">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase text-accent">Nikolsky editor</p>
                <h1 className="mt-1 text-2xl font-semibold uppercase">Конструктор текста</h1>
              </div>
              <a href="/" target="_blank" className="grid size-10 place-items-center bg-white text-black">
                <ExternalLink size={16} />
              </a>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {sections.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActive(id)}
                  className={`h-9 border px-2 font-mono text-[11px] uppercase ${
                    active === id ? "border-accent bg-accent text-black" : "border-white/10 text-white/58"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 p-4">
            <div className="border border-accent/35 bg-accent/[0.06] p-4">
              <p className="text-sm leading-6 text-white/70">
                Для постоянных правок выбери корневую папку проекта или папку data. После этого редактор сам сохранит
                тексты и YouTube-ссылки в JSON.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={chooseDataFolder} className="flex h-11 items-center justify-center gap-2 border border-white/12 text-sm">
                  <FolderOpen size={15} />
                  Выбрать папку
                </button>
                <button type="button" onClick={saveProjectData} className="flex h-11 items-center justify-center gap-2 bg-accent text-sm font-semibold text-black">
                  <Download size={15} />
                  Сохранить в проект
                </button>
              </div>
              {saveStatus ? <p className="mt-3 text-xs uppercase text-white/48">{saveStatus}</p> : null}
            </div>

            {active === "hero" ? (
              <Panel title="Первый экран">
                <Field label="Маленький label" value={ru.label} onChange={(v) => updateRu("label", v)} />
                <Field label="Техническая строка" value={ru.eyebrow} onChange={(v) => updateRu("eyebrow", v)} />
                <Field label="Заголовок" value={ru.heroTitle} onChange={(v) => updateRu("heroTitle", v)} />
                <Field area label="Подзаголовок" value={ru.heroSub} onChange={(v) => updateRu("heroSub", v)} />
                <Field label="Кнопка работ" value={ru.casesCta} onChange={(v) => updateRu("casesCta", v)} />
                <Field label="Кнопка связи" value={ru.projectCta} onChange={(v) => updateRu("projectCta", v)} />
                <Field area label="Строка доверия" value={ru.trust} onChange={(v) => updateRu("trust", v)} />
                <PairList label="Метрики" value={ru.stats} onChange={(v) => updateRu("stats", v)} />
              </Panel>
            ) : null}

            {active === "position" ? (
              <Panel title="Смысловой блок">
                <Field label="Лейбл" value={ru.positionEyebrow} onChange={(v) => updateRu("positionEyebrow", v)} />
                <Field area label="Заголовок" value={ru.positionTitle} onChange={(v) => updateRu("positionTitle", v)} />
                <Field area label="Текст" value={ru.positionText} onChange={(v) => updateRu("positionText", v)} />
                <PairList label="Карточки" value={ru.positionCards} onChange={(v) => updateRu("positionCards", v)} />
              </Panel>
            ) : null}

            {active === "products" ? (
              <Panel title="Продукты / услуги">
                <Field label="Лейбл" value={ru.productsEyebrow} onChange={(v) => updateRu("productsEyebrow", v)} />
                <Field label="Заголовок" value={ru.productsTitle} onChange={(v) => updateRu("productsTitle", v)} />
                <ProductList value={ru.products} onChange={(v) => updateRu("products", v)} />
              </Panel>
            ) : null}

            {active === "showreel" ? (
              <Panel title="Шоурил">
                <Field label="Лейбл" value={ru.reelEyebrow} onChange={(v) => updateRu("reelEyebrow", v)} />
                <Field label="Заголовок" value={ru.reelTitle} onChange={(v) => updateRu("reelTitle", v)} />
                <Field area label="Текст" value={ru.reelText} onChange={(v) => updateRu("reelText", v)} />
                <Field label="Кнопка" value={ru.showreelCta} onChange={(v) => updateRu("showreelCta", v)} />
                <Field label="Заголовок дорожек" value={ru.chapters} onChange={(v) => updateRu("chapters", v)} />
              </Panel>
            ) : null}

            {active === "videos" ? (
              <Panel title="Видео и YouTube-ссылки">
                <p className="text-sm leading-6 text-white/58">
                  Здесь меняются ролики, которые отображаются на сайте. Для шоурила включи галочку Главный шоурил.
                </p>
                <WorkList value={works} onChange={setWorks} />
              </Panel>
            ) : null}

            {active === "cases" ? (
              <Panel title="Работы">
                <Field label="Лейбл" value={ru.casesEyebrow} onChange={(v) => updateRu("casesEyebrow", v)} />
                <Field label="Заголовок" value={ru.casesTitle} onChange={(v) => updateRu("casesTitle", v)} />
                <Field area label="Описание" value={ru.casesText} onChange={(v) => updateRu("casesText", v)} />
                <Field label="Кнопка кейса" value={ru.openCase} onChange={(v) => updateRu("openCase", v)} />
              </Panel>
            ) : null}

            {active === "method" ? (
              <Panel title="Метод">
                <Field label="Лейбл" value={ru.methodEyebrow} onChange={(v) => updateRu("methodEyebrow", v)} />
                <Field label="Заголовок" value={ru.methodTitle} onChange={(v) => updateRu("methodTitle", v)} />
                <PairList label="Шаги" value={ru.methodSteps} onChange={(v) => updateRu("methodSteps", v)} />
              </Panel>
            ) : null}

            {active === "terms" ? (
              <Panel title="Условия">
                <Field label="Лейбл" value={ru.termsEyebrow} onChange={(v) => updateRu("termsEyebrow", v)} />
                <Field label="Заголовок" value={ru.termsTitle} onChange={(v) => updateRu("termsTitle", v)} />
                <Field area label="Текст" value={ru.termsText} onChange={(v) => updateRu("termsText", v)} />
                <PairList label="Пункты" value={ru.terms} onChange={(v) => updateRu("terms", v)} />
              </Panel>
            ) : null}

            {active === "contact" ? (
              <Panel title="Финальный CTA">
                <Field label="Лейбл" value={ru.contactEyebrow} onChange={(v) => updateRu("contactEyebrow", v)} />
                <Field area label="Заголовок" value={ru.contactTitle} onChange={(v) => updateRu("contactTitle", v)} />
                <Field area label="Текст" value={ru.contactText} onChange={(v) => updateRu("contactText", v)} />
                <Field label="Футер" value={ru.footer} onChange={(v) => updateRu("footer", v)} />
              </Panel>
            ) : null}

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button type="button" onClick={copyJson} className="flex h-11 items-center justify-center gap-2 border border-white/12 text-sm">
                <Copy size={15} />
                Копировать текст
              </button>
              <button type="button" onClick={() => saveJson("landing-content.json", content)} className="flex h-11 items-center justify-center gap-2 bg-white text-sm font-semibold text-black">
                <Download size={15} />
                Скачать текст
              </button>
              <button type="button" onClick={copyWorks} className="flex h-11 items-center justify-center gap-2 border border-white/12 text-sm">
                <Copy size={15} />
                Копировать работы
              </button>
              <button type="button" onClick={() => saveJson("works.json", works)} className="flex h-11 items-center justify-center gap-2 bg-white text-sm font-semibold text-black">
                <Download size={15} />
                Скачать работы
              </button>
              <button type="button" onClick={reset} className="col-span-2 flex h-11 items-center justify-center gap-2 border border-white/12 text-sm">
                <RotateCcw size={15} />
                Сбросить
              </button>
            </div>
          </div>
        </aside>

        <section className="hidden bg-black lg:block">
          <iframe title="Preview" src="/" className="h-screen w-full border-0" />
        </section>
      </div>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-white/10 bg-white/[0.025] p-4">
      <h2 className="mb-4 font-mono text-xs uppercase text-accent">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  area = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  area?: boolean;
}) {
  const className =
    "w-full border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none focus:border-accent";
  return (
    <label className="block">
      <span className="mb-2 block text-xs uppercase text-white/48">{label}</span>
      {area ? (
        <textarea className={`${className} min-h-24 resize-y`} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className={className} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

function PairList({ label, value, onChange }: { label: string; value: Pair[]; onChange: (value: Pair[]) => void }) {
  return (
    <div>
      <p className="mb-2 text-xs uppercase text-white/48">{label}</p>
      <div className="space-y-2">
        {value.map(([a, b], index) => (
          <div key={index} className="grid gap-2">
            <input className="border border-white/10 bg-black/35 px-3 py-2 text-sm" value={a} onChange={(e) => onChange(value.map((item, i) => (i === index ? [e.target.value, item[1]] : item)))} />
            <textarea className="min-h-16 border border-white/10 bg-black/35 px-3 py-2 text-sm" value={b} onChange={(e) => onChange(value.map((item, i) => (i === index ? [item[0], e.target.value] : item)))} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductList({ value, onChange }: { value: Product[]; onChange: (value: Product[]) => void }) {
  const update = (index: number, product: Product) => onChange(value.map((item, i) => (i === index ? product : item)));
  return (
    <div className="space-y-4">
      {value.map((product, index) => (
        <div key={product.code} className="border border-white/10 p-3">
          <p className="mb-3 font-mono text-xs uppercase text-accent">{product.code}</p>
          <Field label="Название" value={product.title} onChange={(v) => update(index, { ...product, title: v })} />
          <Field label="Для кого" value={product.audience} onChange={(v) => update(index, { ...product, audience: v })} />
          <Field area label="Описание" value={product.text} onChange={(v) => update(index, { ...product, text: v })} />
          <Field label="CTA" value={product.cta} onChange={(v) => update(index, { ...product, cta: v })} />
          <div className="mt-4 space-y-2">
            <p className="text-xs uppercase text-white/48">Что входит</p>
            {product.includes.map((item, itemIndex) => (
              <input
                key={itemIndex}
                className="w-full border border-white/10 bg-black/35 px-3 py-2 text-sm"
                value={item}
                onChange={(e) =>
                  update(index, {
                    ...product,
                    includes: product.includes.map((current, i) => (i === itemIndex ? e.target.value : current)),
                  })
                }
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function WorkList({ value, onChange }: { value: EditableWork[]; onChange: (value: EditableWork[]) => void }) {
  const update = (index: number, work: EditableWork) => onChange(value.map((item, i) => (i === index ? work : item)));
  const addWork = () =>
    onChange([
      ...value,
      {
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
      },
    ]);

  return (
    <div className="space-y-4">
      {value.map((work, index) => (
        <div key={work.id ?? index} className="border border-white/10 p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="font-mono text-xs uppercase text-accent">Видео {index + 1}</p>
            <label className="flex items-center gap-2 text-xs uppercase text-white/58">
              <input
                type="checkbox"
                checked={Boolean(work.featured)}
                onChange={(event) =>
                  onChange(value.map((item, i) => ({ ...item, featured: i === index ? event.target.checked : false })))
                }
              />
              Главный шоурил
            </label>
          </div>

          <Field label="YouTube ссылка" value={work.youtubeUrl} onChange={(v) => update(index, { ...work, youtubeUrl: v })} />
          <Field label="Название на русском" value={work.titleRu ?? ""} onChange={(v) => update(index, { ...work, titleRu: v })} />
          <Field label="Название EN / fallback" value={work.title} onChange={(v) => update(index, { ...work, title: v })} />
          <Field label="Категория" value={work.category} onChange={(v) => update(index, { ...work, category: v })} />
          <Field label="Формат" value={work.formatRu ?? ""} onChange={(v) => update(index, { ...work, formatRu: v })} />
          <Field area label="Короткое описание" value={work.descriptionRu ?? ""} onChange={(v) => update(index, { ...work, descriptionRu: v })} />
          <Field area label="Задача" value={work.taskRu ?? ""} onChange={(v) => update(index, { ...work, taskRu: v })} />
          <StringList label="Что сделано" value={work.workDoneRu ?? []} onChange={(v) => update(index, { ...work, workDoneRu: v })} />
          <Field area label="Почему работает" value={work.whyItWorksRu ?? ""} onChange={(v) => update(index, { ...work, whyItWorksRu: v })} />
          <StringList label="Что отдаю" value={work.deliverablesRu ?? []} onChange={(v) => update(index, { ...work, deliverablesRu: v })} />

          <button
            type="button"
            onClick={() => onChange(value.filter((_, i) => i !== index))}
            className="mt-3 h-9 border border-red-400/30 px-3 text-sm text-red-200"
          >
            Удалить видео
          </button>
        </div>
      ))}
      <button type="button" onClick={addWork} className="h-11 w-full bg-accent text-sm font-semibold text-black">
        Добавить видео
      </button>
    </div>
  );
}

function StringList({ label, value, onChange }: { label: string; value: string[]; onChange: (value: string[]) => void }) {
  return (
    <div className="mt-4 space-y-2">
      <p className="text-xs uppercase text-white/48">{label}</p>
      {value.map((item, index) => (
        <div key={index} className="grid grid-cols-[1fr_auto] gap-2">
          <input
            className="w-full border border-white/10 bg-black/35 px-3 py-2 text-sm"
            value={item}
            onChange={(event) => onChange(value.map((current, i) => (i === index ? event.target.value : current)))}
          />
          <button type="button" onClick={() => onChange(value.filter((_, i) => i !== index))} className="w-10 border border-white/10 text-white/58">
            x
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...value, "Новый пункт"])} className="h-9 border border-white/12 px-3 text-sm text-white/72">
        Добавить пункт
      </button>
    </div>
  );
}
