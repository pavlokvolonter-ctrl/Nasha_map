import type { Mark } from '../types';
import Button from './Button';
import Panel from './Panel';

export default function MarksList({ marks, loaded, canImport, onPick, onClose, onImport }: {
  marks: Mark[];
  loaded: boolean;
  canImport: boolean;
  onPick: (id: string) => void;
  onClose: () => void;
  onImport: () => void;
}) {
  return (
    <Panel side="left" title="Позначені події" onClose={onClose} closeLabel="Закрити список">
      {!marks.length ? (
        <div className="text-[13px] leading-normal text-muted">
          {loaded ? 'Поки що немає позначок. Натисніть «Позначити подію» і клацніть на місце.' : 'Завантажую…'}
          {loaded && canImport && (
            <p className="mt-2.5 mb-0"><Button onClick={onImport}>Завантажити початкові місця</Button></p>
          )}
        </div>
      ) : (
        <ol className="m-0 flex list-none flex-col p-0">
          {marks.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => onPick(m.id)}
                className="grid w-full cursor-pointer grid-cols-[12px_1fr] items-start gap-2.5 border-0 border-t border-rule bg-transparent px-0.5 py-[9px] text-left text-ink hover:bg-warm-soft"
              >
                <span className="mt-[5px] size-[9px] rounded-full bg-warm shadow-dot-sm" />
                <span className="min-w-0 leading-snug font-semibold">
                  <span className="block font-mono text-[10px] font-normal tracking-[0.04em] text-warm-ink uppercase">
                    {m.date || '—'}{m.example ? ' · приклад' : ''}
                  </span>
                  {m.title || 'Без підпису'}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
