# Deepseek v4 Handoff

Проект находится здесь: `outputs/nikolsky-studio`.

Текущий статус:

- Next.js App Router проект установлен и настроен.
- TailwindCSS v4, TypeScript, Framer Motion и lucide-react подключены.
- Основной UI в `src/components/studio-landing.tsx`.
- Портфолио рендерится динамически из `data/works.json`.
- Видео только через YouTube iframe, без локального хранения.
- Backend, база, формы и авторизация отсутствуют.
- Проверки `npm run lint`, `npm run typecheck`, `npm run build` проходят.
- Референсы скачаны в `work/ui-ux-pro-max-skill`.
- Текущая концепция: `Nikolsky Control Room`. Это не галерея, а продающая
  страница личного бренда: hero, positioning, products, showreel, cases,
  method, terms, final CTA.
- `data/works.json` расширен до мини-кейсов: task, format, workDone,
  whyItWorks, deliverables + RU-поля.
- Добавлен лёгкий конструктор текста: `data/landing-content.json`.

Что менять в первую очередь:

- Реальные unlisted YouTube-ссылки и тексты кейсов: `data/works.json`.
- Hero, продукты, метод, условия и CTA: `data/landing-content.json`.
- Telegram, Instagram, email, VK: `src/lib/profile.ts`.
- Категории: `data/works.json` и `src/types/work.ts`.
- Визуальная система: `src/app/globals.css` и Tailwind-классы в `studio-landing.tsx`.
- YouTube embed wrapper: `src/components/youtube-embed.tsx`.

Сохранять:

- Премиальная dark-first эстетика.
- Белый/серый + один яркий голубой акцент.
- Минимум текста, крупная типографика, много воздуха.
- Только YouTube thumbnails/iframe, никаких загруженных видео.
- Анимации лёгкие, через Framer Motion.
- Не добавлять CMS, backend, формы, auth или тяжёлые assets.
- Не возвращать обычную masonry/gallery структуру: кейсы должны продавать
  задачу, а продукты должны оставаться выше работ.

Команды проверки:

```bash
npm run lint
npm run typecheck
npm run build
npm run dev
```

Следующий polish:

- Подставить реальные unlisted YouTube-ролики.
- Доточить tone of voice Михаила.
- Проверить Telegram/Instagram/VK ссылки.
- После реальных превью ещё раз пройти mobile/desktop скриншоты.
