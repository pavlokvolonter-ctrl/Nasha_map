import type { FormEvent, ReactNode } from 'react';

/** Повноекранна картка входу */
export default function Gate({ children, overlay = false, onSubmit }: {
  children: ReactNode;
  overlay?: boolean;
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void;
}) {
  const card = 'flex w-[min(380px,100%)] flex-col gap-3 border border-ink bg-paper p-[22px] shadow-panel';
  const title = <h1 className="m-0 text-[22px] font-bold tracking-[0.14em] uppercase">наша</h1>;
  return (
    <div className={`fixed inset-0 z-[60] grid place-items-center p-5 ${overlay ? 'bg-scrim' : 'bg-bg'}`}>
      {onSubmit ? (
        <form className={card} onSubmit={onSubmit}>{title}{children}</form>
      ) : (
        <div className={card}>{title}{children}</div>
      )}
    </div>
  );
}
