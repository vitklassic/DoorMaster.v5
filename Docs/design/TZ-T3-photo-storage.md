# ТЗ-T3. Фото проёмов через Supabase Storage

**Исполнители:** Интегратор (bucket + миграция) + Кодер (клиент) · **Оценка:** 2–3 дня · **Приоритет:** P0
**Контекст:** аудит C2, ARCHITECTURE §6.2, стандарт ТС п.7.

## Цель
Сейчас фото сжимается в data URL и кладётся в `openings.photo_uri` (base64 в БД) — раздувает строки и realtime-пayload; съёмка реализована web-only (`<input type=file>`, `window`, `document`) и на native упадёт. Переводим на Supabase Storage + expo-image-picker (Expo Go-совместимо).

## Детали реализации

### Часть А. Сервер (Интегратор)
1. Bucket `opening-photos` (private), создание через миграцию (`insert into storage.buckets (id, name, public) values ('opening-photos','opening-photos', false)`).
2. Путь объекта: `{company_id}/{measurement_id}/{opening_id}.jpg`.
3. Политики на `storage.objects`:
   - SELECT: `(storage.foldername(name))[1] = public.current_company_id()::text`
   - INSERT: то же + `WITH CHECK` на расширение `.jpg`.
   - UPDATE/DELETE: то же.
4. Схема: колонку `openings.photo_uri` оставить, но хранить в ней **путь Storage** (не data URL). Комментарий в миграции. Data URL допустим только в mock-режиме (web без env).
5. Имена файлов — фиксированные (`photo.jpg` под id проёма), загрузка с `upsert: true` — замена фото не плодит файлы.

### Часть Б. Клиент (Кодер)
1. **`lib/measurements/photo.ts`** — заменить реализацию:
   - Native: `expo-image-picker` `launchCameraAsync` / `launchImageLibraryAsync` (`quality: 0.7`, `allowsEditing: false`) → asset → `fetch(uri)` → blob → upload. Никаких `window`/`document`.
   - Web (fallback): оставить текущий `<input type=file>` + `compressImage` — вынести в `photo.web.ts`.
   - Возвращаемое значение: `{ path: string } | null` (а не data URL).
2. **`photoStorage.ts` (новый):** `uploadOpeningPhoto(tenant, measurementId, openingId, blob)` → `supabase.storage.from('opening-photos').upload(path, blob, { upsert: true })`; `getOpeningPhotoUrl(path)` → `createSignedUrl(path, 3600)` с кэшем в памяти; `deleteOpeningPhoto(path)`.
3. Потоки:
   - Создание проёма: сначала `addOpening` без фото → получить `openingId` → upload → `updateOpening` с `photoDataUrl = path`. (Порядок важен: путь содержит id проёма.)
   - Отображение: `OpeningWithSignedUrl` — компонент/хук `usePhotoUrl(path)`; в `MeasurementDetail`, визарде, `FeedCard` (если есть фото).
   - Удаление проёма: удалить файл Storage (best-effort, ошибка не ломает UI).
4. **Отчет** (согласовано с T5): HTML получает подписанный URL (web) или скачанный `file://` (native для expo-print).
5. Mock-режим: без изменений (data URL в localStorage допустим).

### Зависимости
- Новая зависимость `expo-image-picker` — добавить стандартной версией под SDK 57 (`npx expo install expo-image-picker`). Другие новые пакеты не вводить.
- `expo-camera` из package.json убрать, если нигде не используется.

## Критерии приёмки
- На Android (Expo Go): сфотографировать проём камерой → фото видно в детали замера после перезахода.
- В БД в `photo_uri` — путь вида `<uuid>/<uuid>/<uuid>.jpg`, не base64 (проверить SQL).
- Файл в Storage доступен только пользователям своей компании (проверить вторым аккаунтом: signed URL от чужого пути → 403).
- Замена фото не создаёт новых файлов (upsert).
- Web-режим без env (mock): прежнее поведение работает.
- Отчет показывает фото на обеих платформах.
- `tsc --noEmit` чисто.
