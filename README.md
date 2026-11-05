# DoorMaster

Мобильное приложение для замера дверных проёмов. Монтажник снимает замеры и фиксирует параметры проёмов, менеджер видит ленту замеров в реальном времени и получает PDF-отчёты.

## Стек

- Expo SDK 57, expo-router
- React Native 0.86, TypeScript
- Supabase: PostgreSQL + Auth + Realtime (RLS, мульти-тенантность на уровне компании)

## Быстрый старт

```bash
npm install
```

Создайте `.env` в корне репозитория:

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

Если переменные не заданы, приложение работает в mock-режиме (localStorage) — только на web.

```bash
npm run dev
```

Откройте приложение в Expo Go (Android/iOS), отсканировав QR-код, или нажмите `w` в консоли Metro для запуска web-версии.

### Запуск двойным кликом в Windows

- `start-door-master-web.cmd` — web-версия; при ошибке показывает полный лог запуска.
- `start-door-master-expo.cmd` — Metro с QR-кодом для телефона.

## Структура каталогов

- `app/` — экраны приложения (маршруты expo-router, включает вкладки и гарды ролей)
- `components/` — UI-компоненты
- `lib/auth` — контекст аутентификации и сессии
- `lib/backend` — клиент Supabase, API (auth, замеры, проёмы)
- `lib/measurements` — доменная логика замеров
- `supabase/migrations/` — миграции базы данных
- `Docs/` — актуальный статус, ТЗ, бэклог, тест-план, ретроспектива и блокнот
- `.agents/skills/supabase-dev/` — проектный скилл безопасных миграций и проверки Supabase

## Скрипты

| Скрипт | Назначение |
| --- | --- |
| `npm run dev` | Запуск dev-сервера Expo (Metro) |
| `npm run typecheck` | Проверка типов TypeScript (`tsc --noEmit`) |
| `npm run lint` | Линтинг (`expo lint`) |
| `npm run build:web` | Экспорт web-сборки (`expo export --platform web`) |
