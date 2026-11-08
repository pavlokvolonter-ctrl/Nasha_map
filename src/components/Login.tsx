import { useState, type FormEvent } from 'react';
import { signIn, canSkipLogin, skipLogin } from '../lib/useAuth';
import Button from './Button';
import Gate from './Gate';

const field =
  'box-border w-full rounded-none border border-rule bg-field p-2.5 text-[15px] text-ink focus:border-ink focus:bg-paper';

export default function Login({ onClose }: { onClose?: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await signIn(email, password);
    } catch (ex) {
      setErr(ex instanceof Error && ex.message ? ex.message : 'Не вдалося увійти');
      setBusy(false);
    }
  };

  return (
    <Gate overlay={!!onClose} onSubmit={submit}>
      <p className="m-0 text-[13px] leading-normal text-muted">Вхід лише для двох. Введіть пошту та пароль.</p>
      <input
        className={field} type="email" required autoFocus autoComplete="username" inputMode="email"
        placeholder="пошта" value={email} onChange={(e) => setEmail(e.target.value)}
      />
      <div className="relative">
        <input
          className={`${field} pr-[84px]`} type={show ? 'text' : 'password'} required autoComplete="current-password"
          placeholder="пароль" value={password} onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="button" onClick={() => setShow((v) => !v)}
          className="absolute top-1/2 right-1.5 -translate-y-1/2 cursor-pointer border-0 bg-transparent p-1.5 text-xs text-muted hover:text-ink"
        >
          {show ? 'сховати' : 'показати'}
        </button>
      </div>
      {err && <div className="text-[13px] text-danger">{err}</div>}
      <Button variant="primary" type="submit" disabled={busy}>{busy ? 'Заходжу…' : 'Увійти'}</Button>
      {canSkipLogin && <Button variant="ghost" onClick={skipLogin}>Зайти без пароля (тимчасово)</Button>}
      {onClose && <Button variant="ghost" onClick={onClose}>Назад до мапи</Button>}
    </Gate>
  );
}
