import type { ReactNode } from 'react';

/** Біла панель із чорною рамкою; на телефоні — «шторка» знизу */
export default function Panel({ side, title, onClose, closeLabel, children }: {
  side: 'left' | 'right';
  title: string;
  onClose: () => void;
  closeLabel: string;
  children: ReactNode;
}) {
  const pos = side === 'left'
    ? 'left-4 max-h-[calc(100%-140px)] w-[300px]'
    : 'right-4 w-[320px]';
  return (
    <aside
      className={`fixed top-[calc(100px+env(safe-area-inset-top,0px))] flex flex-col gap-2.5 border border-ink bg-paper p-3.5 shadow-panel ${pos} max-sm:inset-x-0 max-sm:top-auto max-sm:bottom-0 max-sm:w-auto max-sm:overflow-auto max-sm:border-x-0 max-sm:border-b-0 max-sm:pb-[calc(14px+env(safe-area-inset-bottom,0px))] ${side === 'left' ? 'overflow-auto max-sm:max-h-[55%]' : 'max-sm:max-h-[62%]'}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] tracking-[0.08em] text-muted uppercase">{title}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="cursor-pointer border-0 bg-transparent px-1.5 py-0.5 text-xl leading-none text-ink"
        >
          ×
        </button>
      </div>
      {children}
    </aside>
  );
}
