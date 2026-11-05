# ТЗ-T6. Регистрация с подтверждением email

**Исполнитель:** Кодер (Kimi Code) · **Оценка:** 0.5 дня · **Приоритет:** P1
**Контекст:** аудит C7, ARCHITECTURE §5.

## Цель
При включённом подтверждении email в Supabase Auth `signUp` возвращает `data.session == null`, и приложение показывает ошибку «Аккаунт создан, но вход не выполнен». Нужен корректный UX: экран «Проверьте почту».

## Детали реализации
1. **`lib/backend/authApi.ts` → `signUp`:** если `data.user && !data.session` — вернуть специальный результат `{ kind: 'confirmation_required', email }` вместо throw. Тип результата оформить дискриминированным юнионом.
2. **`AuthContext`:** `signUp` возвращает результат наружу; состояние `awaitingConfirmation: string | null` (email).
3. **`AuthScreen`:** при `awaitingConfirmation` — информационный экран: «Мы отправили письмо на {email}. Перейдите по ссылке в письме, затем войдите». Кнопка «Назад ко входу» сбрасывает состояние.
4. **Глубокая ссылка после подтверждения:** в `app.json` задать `scheme: "doormaster"`; в `supabaseClient.ts` передать `auth: { redirectTo: ... }` — для web `window.location.origin`, для native `doormaster://`. При событии `onAuthStateChange('SIGNED_IN')` состояние сбрасывается само (уже есть подписка).
5. **Сброс пароля** (`requestPasswordReset`) — те же правила redirect: web origin, native `doormaster://`. Макет-путь без изменений.
6. Mock-режим: `mockSignUp` всегда логинит сразу — без изменений.

## Критерии приёмки
- На проекте с включённым «Confirm email»: регистрация показывает экран подтверждения, без ошибок.
- Подтверждение по ссылке в письме приводит к автовходу (web — по redirect на origin с hash-сессией; native — по схеме `doormaster://`).
- Отключённое подтверждение: регистрация сразу входит (старый путь).
- Сброс пароля работает на web и не ломается на native.
- `tsc --noEmit` чисто.
