# ТЗ-T9. Гигиена репозитория

**Исполнитель:** Кодер (Kimi Code) · **Оценка:** 0.5 дня · **Приоритет:** P1
**Контекст:** аудит C9.

## Детали реализации
1. `package.json`: `"name": "doormaster"` (сейчас `bolt-expo-starter`).
2. `README.md` (заполнить, на русском):
   - Название и назначение: замер дверных проёмов для монтажников, панель менеджера, отчёты PDF.
   - Стек: Expo SDK 57, expo-router, Supabase.
   - Запуск: `npm install`, env-переменные `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (без них — mock-режим для web), `npm run dev` → Expo Go / web.
   - Структура каталогов кратко (по `ARCHITECTURE.md` §2).
   - Скрипты: `dev`, `typecheck`, `lint`, `build:web`.
   - Ссылка на документацию процесса: репозиторий клонируется в workspace рядом с `Docs/`.

## Критерии приёмки
- README читаем новичком: по шагам от клона до работающего приложения (web-мок и реальный Supabase).
- `npm run typecheck` чисто; name в package.json обновлён.
