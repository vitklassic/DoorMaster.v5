# DoorMaster — Архитектура

Состояние на 2026-11-05. Код: https://github.com/vitklassic/DoorMaster.v5 (main, 6 коммитов, экспорт из Bolt).

## 1. Стек и назначение

- **Клиент:** Expo (SDK 57) + expo-router, React Native 0.86, React 19, TypeScript.
- **Бэкенд:** Supabase (PostgreSQL + Auth + Realtime). Edge Functions / Storage — не используются пока.
- **Цель продукта:** замер дверных проемов монтажником с телефона + панель менеджера с лентой замеров в реальном времени + AI-распознавание PDF-смет (фича отсутствует в коде).

## 2. Клиент: структура

```
app/                    expo-router
  (tabs)/index.tsx      «Новый замер»: home → ObjectForm → OpeningWizard (пошагово) → finish
  (tabs)/history.tsx    «Мои замеры»: список, поиск, просмотр/редактирование, удаление
  (tabs)/manager.tsx    «Панель»: ManagerDashboard (только роль manager)
components/             UI: ObjectForm, OpeningWizard (7 шагов), OpeningSchema (SVG),
                        ManagerDashboard + FeedCard + InstallersSidebar + InviteInstallerCard
lib/
  auth/                 AuthContext, roles (installer | manager), Tenant { userId, companyId }
  backend/              measurementsApi / authApi / inviteApi / profilesApi / measurementsRealtime
                        Каждый модуль: if (!supabase) → mock.* (mockBackend на localStorage)
  measurements/         types, validation (mm, лимиты), schemaGeometry (SVG-схема),
                        report (HTML-отчет), pdfExport (expo-print), feed, format
supabase/migrations/    9 миграций (см. §4)
```

### Текущий пользовательский поток (замер)
1. Регистрация: почта+пароль, либо по инвайт-коду (вступление в компанию), либо новая компания.
2. Создание замера: дом, адрес, заказчик, этаж, подъезд, квартира (numeric), заметки.
3. Добавление проема по шагам: этаж → помещение → фото → высота (мм) → ширина (мм) → толщина (мм) → сторона открывания (со схемой SVG).
4. Отчет: HTML → печать/PDF (expo-print на native, window.open на web).

## 3. Модель данных (целевая = текущая + доработки)

### Есть сейчас
- `companies(id, name)` — тенант.
- `profiles(id→auth.users, display_name, role, company_id)` — роль: installer | manager.
- `measurements(id, user_id, company_id, home_name, object_address, client_name, floor, entrance, apartment, notes, status, created_at, updated_at)` — `status` есть в БД, но **клиент его не читает/не пишет** (всегда 'draft').
- `openings(id, measurement_id, floor, room, photo_uri, height_mm, width_mm, thickness_mm, opening_side, created_at)`.
- `invite_codes(code, company_id, created_by, expires_at)`.

### Известные проблемы схемы
1. `openings.photo_uri` хранит **data URL (base64)** — перегружает строки таблицы и realtime-пayload. Цель: Supabase Storage (`opening-photos/{company_id}/{measurement_id}/{opening_id}.jpg`), в БД — путь.
2. `openings` не имеет `company_id` — realtime-подписка `measurementsRealtime.ts` фильтрует `company_id` на `openings` и **не работает** (фильтр по несуществующей колонке; события по openings не приходят, либо канал падает).
3. Статусная модель не реализована на клиенте (см. TS.md, п.5): нужны переходы и фильтрация.
4. Нет таблиц под AI-сметы: `estimate_files`, `estimate_items` (позиции: наименование, размеры, количество, цена), `import_sessions` (статус парсинга, ручное подтверждение).

## 4. RLS и tenancy (факт по миграциям)

- Все таблицы с RLS; доступ только `authenticated`.
- `measurements`, `profiles`, `companies` — scope `company_id = current_company_id()`.
- `openings` — scope через родительскую запись (`EXISTS measurements … company_id = current_company_id()`). Корректно, но realtime-фильтр по `company_id` на openings невозможен → либо денормализовать `company_id` в openings, либо подписываться без фильтра (RLS отсечет лишнее — проверить производительность).
- Функции `current_company_id()`, `current_user_role()` — SECURITY DEFINER, доступны authenticated.
- `handle_new_user`: создает profile + company (если нет валидного invite_code).
- Realtime publication: `measurements`, `openings` (+ REPLICA IDENTITY FULL), `profiles` (добавлена в миграции `20261103211508` — в аудите C4 ошибочно считалась отсутствующей, дефект снят).
- Инвайты: RPC `create_invite_code`, `is_valid_invite_code` (проверка TTL на сервере). ⚠️ Оба REVOKE от anon; `is_valid_invite_code` вызывается из `signUp` **до** получения сессии → на реальной БД регистрация по инвайту падает с «permission denied» (дефект C10).

## 5. Критические дефекты (фиксировать до новых фич)

| # | Дефект | Где | Тип |
|---|--------|-----|-----|
| C1 | `FORCE_MANAGER_ROLE = true` — все пользователи принудительно становятся manager | `lib/auth/AuthContext.tsx` | debug-хак в проде-коде |
| C2 | Фото: web-only `<input type=file>`; data URL в БД; на native упадет (`window`, `document`) | `lib/measurements/photo.ts`, `openings.photo_uri` | мобильная платформа сломана |
| C3 | Realtime на `openings` фильтрует `company_id` — колонки нет | `lib/backend/measurementsRealtime.ts` | лента менеджера не живая для проемов |
| C4 | ~~Realtime на `profiles` — таблица не в publication~~ — **снят**: profiles добавлена в publication миграцией `20261103211508` | — | ложная тревога аудита |
| C5 | `status` не проброшен в типы/API/UI; нет статусной модели замера | `types.ts`, `MeasurementsContext` | нарушение TS.md п.5 |
| C6 | Отчет через `window.open/document.write` — web-only; pdfExport (expo-print) дублирует | `lib/measurements/report.ts` | на native кнопка отчета сломана |
| C7 | signUp: при включенном подтверждении email `data.session == null` → ошибка «вход не выполнен» | `lib/backend/authApi.ts` | onboarding |
| C8 | mockBackend на `window.localStorage` — упадет на native при отсутствии env | `lib/backend/mockBackend.ts` | только dev/web |
| C9 | package.json name = «bolt-expo-starter», README пустой | корень | гигиена |
| C10 | `is_valid_invite_code` REVOKE от anon, но вызывается из `signUp` до сессии → регистрация по инвайту падает (проверено на живой БД: `42501 permission denied`) | миграция `20261103211508`, `lib/backend/inviteApi.ts` | onboarding сломан на реальной БД |

## 6. Целевая архитектура (кратко)

1. **Слой доступа к данным** — оставить паттерн `api → (supabase | mock)`, весь web-only код изолировать за `Platform.OS === 'web'` или заменить кроссплатформенными API (expo-print, expo-image-picker, expo-file-system).
2. **Хранилище фото** — Supabase Storage, bucket `opening-photos` (private), политики: read/insert/delete внутри своей company (через parent measurement). Клиент: сжатие до ~1024px JPEG 0.8 (уже есть логика), upload → путь в БД.
3. **Статусная модель** — переходы `draft → active → done → archived` (+ допустимые вперед/назад согласно TS.md п.5), поле `status` в типах, бейджи в списке/ленте, фильтр по статусу для менеджера.
4. **AI-сметы** (новый домен): загрузка PDF → Storage → очередь (таблица `estimate_files` со статусом `pending | processing | needs_review | confirmed | failed`) → Edge Function (парсинг: текстовый слой / vision) → `estimate_items` → UI сверки с ручным подтверждением → конвертация в проемы/позиции замера. Подробное ТЗ отдельным документом.
5. **Realtime** — для openings решение по C3 (денормализация company_id предпочтительна); profiles уже в publication, сайдбар монтажников live-обновляется.
