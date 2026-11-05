# T0. Подключение Supabase (пошагово)

**Статус:** обязательный нулевой шаг — без него приложение работает в mock-режиме (localStorage), и T2/T3/T4/T6 проверить невозможно.
**Кто что делает:** пользователь — пункты 1–2 (создание проекта), Интегратор (Kimi Code) — пункты 3–7.

## 1. Создание проекта (пользователь, ~10 мин)

1. https://supabase.com/dashboard → **New project**.
2. Organization: любая (или создать). Name: `doormaster`. Database password: сгенерировать и **сохранить** (нужен только для прямого доступа к Postgres, CLI его спросит). Region: **EU (Frankfurt)** — ближайший к Minsk.
3. Дождаться инициализации (~2 мин).

## 2. Получение ключей (пользователь, 2 мин)

Settings → API:
- `Project URL` → `EXPO_PUBLIC_SUPABASE_URL`
- `anon public` key → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Передать оба значения Интегратору. **Anon key публичный** (RLS защищает данные), но проект приватный — не коммитить в открытый репозиторий в другом виде, только через `.env` (уже в `.gitignore`).

## 3. Env-файл (Интегратор)

В корне `repo/` создать `.env`:
```
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```
Expo подхватывает `EXPO_PUBLIC_*` из `.env` автоматически. Файл в `.gitignore` — проверено.

## 4. Применение миграций (Интегратор)

Рекомендуется Supabase CLI:
```bash
npm i -g supabase
supabase login
supabase link --project-ref <project-ref>   # из Project URL
supabase db push                               # применит все из supabase/migrations/
```
Альтернатива без CLI: Dashboard → SQL Editor, по одному выполнить 9 файлов из `supabase/migrations/` **в порядке возрастания timestamp** в имени файла.

Проверка: Table Editor видит `profiles`, `companies`, `measurements`, `openings`, `invite_codes`.

## 5. Настройка Auth (Интегратор + решение пользователя)

Authentication → Settings → URL Configuration:
- **Site URL**: для web-разработки `http://localhost:8081`.
- **Redirect URLs** добавить: `http://localhost:8081/**` и `doormaster://**` (схема из T6, добавить в `app.json` в рамках T6).
- **Confirm email**: решение для dev-периода — рекомендуется **OFF** (регистрация сразу входит), в проде включить и задействовать T6. Зафиксировать выбор в комментарии к этому файлу.

## 6. Проверка сквозного сценария (Интегратор)

1. `npm install && npm run dev` → web или Expo Go.
2. Регистрация нового пользователя → в Table Editor (`profiles`) появилась строка с `role = 'manager'`, `company_id` заполнен (триггер `handle_new_user`).
3. Создать замер + проём → строки в `measurements`/`openings`, размеры в мм.
4. Менеджер создаёт инвайт → второй аккаунт регистрируется по коду → `role = 'installer'`, тот же `company_id` → замер второго пользователя виден ленте первого.

## 7. После подключения

- Задачи T2, T3, T4, T6 становятся выполнимыми и проверяемыми.
- Mock-режим остаётся fallback'ом (без env) для быстрой web-разработки — это нормально (см. C8, P2).
