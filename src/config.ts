/** Єдині дві пошти, яким дозволено заходити. */
export const ALLOWED_EMAILS: readonly string[] = ['1chaikovskam@gmail.com', 'pavlokostereva@gmail.com'];

/**
 * Локальний режим (без Supabase): SHA-256 від "nasha:<пароль>". Сам пароль у коді не зберігається.
 * УВАГА: у локальному режимі це лише «замок» інтерфейсу, а не справжній захист (код сайту відкритий у браузері).
 * Справжній захист — режим із Supabase (див. README).
 */
export const LOCAL_PASSWORD_HASH = 'd11b1aac299255960c77973012b2254ac98dc2f5241a248cc89c0a5802eafd38';

export const isAllowedEmail = (e: unknown): boolean =>
  ALLOWED_EMAILS.includes(String(e ?? '').trim().toLowerCase());

/**
 * ТИМЧАСОВО: кнопка «Зайти без пароля» (лише в локальному режимі, без Supabase).
 * Перед публікацією сайту поставте false.
 */
export const DEV_SKIP_LOGIN = true;
