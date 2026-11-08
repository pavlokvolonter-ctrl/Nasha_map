import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { sb, supabaseEnabled } from './supabase';
import { isAllowedEmail, LOCAL_PASSWORD_HASH, ALLOWED_EMAILS, DEV_SKIP_LOGIN } from '../config';

const LOCAL_KEY = 'nasha-local-user';
const EVT = 'nasha-auth';

/**
 * locked — локальний режим, не увійшли · local — локальний режим, увійшли
 * loading | anon | authed — режим Supabase (allowed: чи є пошта в таблиці editors, перевіряється через RLS)
 */
export type AuthState =
  | { status: 'locked' }
  | { status: 'local'; user: string }
  | { status: 'loading' }
  | { status: 'anon' }
  | { status: 'authed'; session: Session; allowed: boolean };

const readLocalUser = (): string | null => {
  try { const u = localStorage.getItem(LOCAL_KEY); return u && isAllowedEmail(u) ? u : null; } catch { return null; }
};
const localState = (): AuthState => { const u = readLocalUser(); return u ? { status: 'local', user: u } : { status: 'locked' }; };

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>(() => (supabaseEnabled ? { status: 'loading' } : localState()));

  useEffect(() => {
    if (!supabaseEnabled) {
      const f = () => setState(localState());
      f(); // у браузері читаємо збережений вхід
      addEventListener(EVT, f);
      return () => removeEventListener(EVT, f);
    }
    const client = sb();
    let cancelled = false;
    const check = async (session: Session | null) => {
      if (!session) { if (!cancelled) setState({ status: 'anon' }); return; }
      if (!isAllowedEmail(session.user?.email)) { // сторонню пошту не пускаємо навіть до запиту в базу
        if (!cancelled) setState({ status: 'authed', session, allowed: false });
        return;
      }
      const { data, error } = await client.from('editors').select('email').limit(1);
      if (cancelled) return;
      setState({ status: 'authed', session, allowed: !error && Array.isArray(data) && data.length > 0 });
    };
    void client.auth.getSession().then(({ data }) => check(data.session));
    const { data: sub } = client.auth.onAuthStateChange((evt, session) => {
      if (evt === 'SIGNED_IN' || evt === 'SIGNED_OUT') setTimeout(() => void check(session), 0);
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  return state;
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Вхід за поштою та паролем. Кидає Error з зрозумілим текстом. */
export async function signIn(emailRaw: string, password: string): Promise<void> {
  const email = emailRaw.trim().toLowerCase();
  if (!isAllowedEmail(email)) throw new Error('Ця пошта не має доступу');
  if (supabaseEnabled) {
    const { error } = await sb().auth.signInWithPassword({ email, password });
    if (error) throw new Error(/invalid login/i.test(error.message) ? 'Невірна пошта або пароль' : error.message);
    return;
  }
  if ((await sha256('nasha:' + password)) !== LOCAL_PASSWORD_HASH) throw new Error('Невірний пароль');
  localStorage.setItem(LOCAL_KEY, email);
  dispatchEvent(new Event(EVT));
}

export async function signOut(): Promise<void> {
  if (supabaseEnabled) { await sb().auth.signOut(); return; }
  localStorage.removeItem(LOCAL_KEY);
  dispatchEvent(new Event(EVT));
}

/** Тимчасовий вхід без пароля (лише локальний режим і лише поки DEV_SKIP_LOGIN = true). */
export const canSkipLogin = DEV_SKIP_LOGIN && !supabaseEnabled;
export function skipLogin(): void {
  if (!canSkipLogin) return;
  localStorage.setItem(LOCAL_KEY, ALLOWED_EMAILS[0]);
  dispatchEvent(new Event(EVT));
}
