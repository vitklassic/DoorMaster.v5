# ТЗ-T4. Исправление Realtime (openings + profiles)

**Исполнитель:** Интегратор (Kimi Code) · **Оценка:** 0.5–1 день · **Приоритет:** P0
**Контекст:** аудит C3, C4 (`Docs/tech/ARCHITECTURE.md` §5).

## Цель
Лента менеджера не получает realtime-события по проёмам: **`measurementsRealtime.ts`** подписывается на `openings` с фильтром `company_id=eq.{companyId}`, но у `openings` нет колонки `company_id` — подписка бесполезна. Дополнительно — фикс дефекта **C10**: регистрация по инвайту падает на живой БД (`is_valid_invite_code` недоступен anon, а вызывается до получения сессии).

> Уточнение после применения миграций на живой БД (2026-11-05): `profiles` **уже** в publication `supabase_realtime` (миграция `20261103211508`) — ранее запланированная часть про profiles не нужна.

## Детали реализации

### Миграция 1 — денормализация company_id в openings (предпочтительный вариант)
Новая миграция в `supabase/migrations/` (шапка-комментарий обязательна):
- `ALTER TABLE openings ADD COLUMN company_id uuid REFERENCES companies(id) ON DELETE CASCADE;`
- Backfill: `UPDATE openings o SET company_id = m.company_id FROM measurements m WHERE o.measurement_id = m.id;`
- `NOT NULL` после backfill; индекс `idx_openings_company_id`.
- Триггер `BEFORE INSERT OR UPDATE OF measurement_id` — выставлять `company_id` из родительского замера (защита от рассинхрона).
- RLS-политики на openings: добавить `company_id = public.current_company_id()` как дополнительное условие (вместо/вместе с EXISTS — оставить EXISTS для совместимости, условие через OR).

### Миграция 2 — фикс C10 (инвайты)
- `GRANT EXECUTE ON FUNCTION public.is_valid_invite_code(text) TO anon;`
- Функция безопасна для anon: принимает только код, возвращает `company_id` или NULL; код и есть секрет. Клиент не менять — вызов из `signUp` заработает.
- В шапке миграции зафиксировать причину (иначе следующий аудитор снова «исправит» REVOKE обратно).

### Клиент
- Код клиента (`measurementsRealtime.ts`, `profilesApi.ts`) менять не нужно — фильтры заработают сами.

## Критерии приёмки
- События INSERT/UPDATE/DELETE по `openings` мгновенно отражаются в ленте менеджера (проверить на двух вкладках/устройствах: монтажник добавляет проём — у менеджера карточка обновляется без перезагрузки).
- Регистрация нового пользователя по инвайт-коду проходит без «permission denied»: RPC `is_valid_invite_code` вызывается анонимно и возвращает company_id (проверить curl'ом без Authorization-сессии).
- RLS: пользователь компании B не получает событий/строк компании A (проверить SQL-запросом от второго пользователя).
- `supabase db push` / применение миграций проходит без ошибок на чистой БД.
