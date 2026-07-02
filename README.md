# Nikolsky Studio

Премиальный one-page лендинг для motion designer / video editor.

Текущая визуальная идея: `Nikolsky Control Room` — строгая тёмная монтажная
система с showreel-player, продуктами, кейсами-задачами, таймлайном,
timecode/waveform-мотивами и лёгкими YouTube-превью.

## Стек

- Next.js App Router
- TypeScript
- TailwindCSS
- Framer Motion
- YouTube iframe embeds only
- No backend, no database, no local video storage

## Запуск

```bash
npm install
npm run dev
```

Open the local URL printed by Next.js. The usual default is:

```txt
http://localhost:3000
```

## Проверка

```bash
npm run lint
npm run typecheck
npm run build
```

## Главные файлы

- `data/landing-content.json` - лёгкий конструктор текста и блоков лендинга.
- `data/works.json` - работы, YouTube-ссылки и данные мини-кейсов.
- `src/lib/profile.ts` - name, studio name, Telegram, Instagram.
- `src/app/page.tsx` - imports JSON and renders the landing page.
- `src/components/studio-landing.tsx` - full one-page UI.
- `src/components/youtube-embed.tsx` - iframe embed wrapper.
- `src/lib/youtube.ts` - YouTube ID, embed URL, and thumbnail helpers.

## Языки

Русский язык включён по умолчанию. Переключатель RU/EN находится в header.
Основные RU-тексты лендинга правятся в `data/landing-content.json`.
Работы используют `titleRu`, `descriptionRu`, `taskRu`, `workDoneRu`,
`whyItWorksRu` и `deliverablesRu` в `data/works.json`.

`npm run dev` запускает Next.js и локальный admin API для сохранения/публикации.

## Админка

Открой локально:

```txt
http://localhost:3000/editor
```

Как работать:

- Кликаешь любой текстовый фрагмент слева.
- Редактируешь выбранный текст справа.
- Кликаешь видео-карточку, чтобы менять YouTube-ссылку, название, описание,
  категорию, превью, список работ, выдачу и главный шоурил.
- `Добавить видео` создаёт новую карточку.
- `Сохранить` пишет изменения в `data/landing-content.json` и `data/works.json`.
- `Запушить в Git` сохраняет, делает commit и push. GitHub Pages пересоберёт сайт.

В production `/editor` закрыт. Публичные посетители видят только сайт.
Админка и кнопка git push работают только локально через `npm run dev`.

Не удаляй названия ключей в JSON. Менять строки и пункты массивов можно.
После правки запусти:

```bash
npm run typecheck
npm run build
npm run publish
```

## Как показывать портфолио ссылкой

Рекомендованный вариант без аренды сервера: GitHub Pages. В проект уже добавлен
workflow `.github/workflows/deploy-pages.yml`, который собирает статическую
версию сайта и публикует её.

Рабочий процесс:

1. Правишь сайт локально через `/editor` или JSON-файлы.
2. Сохраняешь изменения в `data/landing-content.json` и `data/works.json`.
3. Нажимаешь `Запушить в Git` в админке или запускаешь `npm run publish`.
4. GitHub Actions автоматически пересобирает сайт.
5. Клиентам отправляешь только публичную ссылку на главную страницу.

Важно: публичная ссылка не даёт доступ к редактированию. `/editor` в production
возвращает 404.

## Видео

Все видео грузятся только из YouTube-ссылок в `data/works.json`.

Use unlisted YouTube URLs like:

```json
{
  "title": "Crypto Explainer",
  "category": "Motion Design",
  "youtubeUrl": "https://www.youtube.com/watch?v=YOUR_VIDEO_ID",
  "thumbnail": "auto",
  "description": "Short optional line",
  "taskRu": "Какую задачу решал ролик",
  "workDoneRu": ["структура", "монтаж", "субтитры"],
  "whyItWorksRu": "Почему эта версия работает"
}
```

Первый объект с `"featured": true` используется как главный showreel. Работы
рендерятся динамически из JSON. Превью берутся через YouTube thumbnails,
просмотр открывается через iframe.

## Структура страницы

- Hero: кто Михаил, для кого монтаж и зачем.
- Positioning: хук, темп, упаковка.
- Products: Short-form Engine, Sales / Launch Motion, Long-form Cut.
- Showreel: YouTube player + главы таймлайна.
- Cases: каждая работа показывает задачу и что сделано.
- Method: Brief, Attention Map, Edit System, Delivery.
- Terms: предоплата, этапы, тестовый фрагмент.
- Contact: Telegram, почта, Instagram, VK.

## Categories

The active filters are defined in `src/types/work.ts`:

- Reels
- Motion Design
- SaaS / Crypto
- Courses
- YouTube

If you add a new category in JSON, also add it to `workCategories`.

## VS Code

Open this folder directly:

```bash
code .
```

The `.vscode` folder includes recommendations for TailwindCSS, ESLint, and Prettier extensions.
