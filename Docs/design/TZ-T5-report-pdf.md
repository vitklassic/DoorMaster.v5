# ТЗ-T5. Отчёт/PDF кроссплатформенно

**Исполнитель:** Кодер (Kimi Code) · **Оценка:** 1 день · **Приоритет:** P0
**Контекст:** аудит C6, стандарт ТС п.7. Зависимость: T3 (фото — подписанные URL / file://).

## Цель
Сейчас два параллельных механизма: `pdfExport.ts` (expo-print, не используется) и `report.ts → openPrintReport` (web-only `window.open` + `document.write`). На native кнопка отчёта сломана. Нужен один кроссплатформенный путь.

## Детали реализации
1. **`buildReportHtml(measurement, photos)`** — оставить в `report.ts` как чистую функцию без DOM API. Подпись расширить: `photos: Record<string, string>` (openingId → URL или file://). Вместо вставки `photoDataUrl` использовать `photos[opening.id]`.
2. В summary добавить строку «Статус» (из T2; если T2 ещё не влит — поле опционально).
3. **Платформенный рендер:**
   - `report.web.ts`: текущее поведение — `window.open('', '_blank')` + `document.write` + `print()`. Код web-only живёт только здесь.
   - `report.native.ts`: `Print.printToFileAsync({ html })` → `Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Отчёт по замеру' })`. Ловить отмену шаринга — не показывать ошибку.
4. **Источник фото для HTML:**
   - Web: подписанные URL Storage (T3, `getOpeningPhotoUrl`).
   - Native: скачать по signed URL в `FileSystem.cacheDirectory` через `expo-file-system`, в HTML подставить `file://` путь; удалить временные файлы после `printToFileAsync`.
5. Удалить неиспользуемый `pdfExport.ts` и дубли логики; вызов из `MeasurementDetail` заменить на новый `shareReport(measurement)`.

## Критерии приёмки
- Android (Expo Go): кнопка «Отчёт/PDF» формирует PDF и открывает системное меню «Поделиться».
- Web: открывается печатная форма с корректной вёрсткой и фото.
- Фото проёмов видны в PDF на обеих платформах.
- Никаких `window`/`document` вне `*.web.ts` (проверить поиском по `lib/` и `components/`).
- `tsc --noEmit` чисто.
