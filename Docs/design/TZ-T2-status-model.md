# ТЗ-T2. Статусная модель замера

**Исполнители:** Интегратор (миграция) + Кодер (клиент) · **Оценка:** 1–2 дня · **Приоритет:** P0
**Контекст:** аудит C5, стандарт ТС п.5, ARCHITECTURE §6.3.

## Цель
Колонка `measurements.status` существует (DEFAULT `'draft'`), но клиент её не читает и не пишет. Внедрить полную статусную модель: `draft → active → done → archived` с разрешённым откатом назад.

## Детали реализации

### Часть А. Миграция (Интегратор)
1. CHECK-ограничение: `status IN ('draft','active','done','archived')` (дефолт 'draft').
2. Индекс `idx_measurements_company_status ON measurements(company_id, status)`.
3. RPC `set_measurement_status(p_measurement_id uuid, p_status text)`:
   - SECURITY-проверка: замер из `current_company_id()`, иначе RAISE EXCEPTION.
   - Проверка допустимости перехода по таблице переходов (ниже); недопустимый → RAISE EXCEPTION 'Недопустимый переход статуса'.
   - `UPDATE measurements SET status = p_status, updated_at = now() WHERE id = p_measurement_id`.
4. Клиент не должен иметь прямого UPDATE `status` (удалить `status` из разрешённых полей update — статус меняется только через RPC). В текущих политиках UPDATE разрешён на всю строку — ограничить: WITH CHECK (status = (SELECT status FROM measurements WHERE id = id)) невозможно просто; достаточно RPC + соглашение + проверка перехода в RPC. Политику UPDATE оставить как есть (company-scoped), источником истины делать RPC.

Таблица переходов:
```
draft → active | (остальные нет)
active → done | draft
done → archived | active
archived → done
```

### Часть Б. Клиент (Кодер)
1. `lib/measurements/types.ts`: `MEASUREMENT_STATUSES`, `MeasurementStatus`, поле `status` в `Measurement`.
2. `lib/backend/measurementsApi.ts`: маппинг `status` в `toMeasurement`; `setMeasurementStatus(tenant, id, status)` → `supabase.rpc('set_measurement_status')`; mock — обновить запись (с той же таблицей переходов, общий модуль `statusTransitions.ts`).
3. `MeasurementsContext`: экшн `setStatus(measurementId, status): Promise<boolean>` через `runAction`.
4. UI:
   - Экран детали замера (`MeasurementDetail`): блок «Статус» с текущим статусом и кнопками допустимых переходов (подписи: «Начать замер», «Завершить замер», «Вернуть в работу», «В архив», «Вернуть из архива»).
   - Список истории и карточка `FeedCard`: цветной бейдж статуса.
   - Панель менеджера: чипы-фильтры «Все / Активные / Готовые / Архив»; по умолчанию `active`+`done` (без `draft` и `archived`).
   - При статусе `done`: запрет редактирования деталей и проёмов (кнопки редактирования скрыты; доступен только переход `done → active`).
   - `draft` доступен только в истории владельца, в ленту менеджера не попадает.
5. Отчет (`report.ts`): строка «Статус» в summary-блоке.

## Критерии приёмки
- Все 6 переходов из таблицы работают на устройстве; недопустимые кнопки не показываются.
- `done` блокирует редактирование: визард недоступен, кнопок «Изменить» нет.
- Лента менеджера: draft-замеры не видны; фильтры работают.
- Пользователь чужой компании не может сменить статус (RPC бросает ошибку → `syncError` на клиенте).
- `tsc --noEmit` чисто; миграции применяются на чистой БД.
