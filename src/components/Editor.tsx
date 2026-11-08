import { useEffect, useRef, useState } from 'react';
import type { Mark } from '../types';
import Button from './Button';
import Panel from './Panel';

const field =
  'box-border w-full resize-y rounded-none border border-rule bg-field px-[9px] py-2 text-sm text-ink focus:border-ink focus:bg-paper max-sm:text-base';
const label = '-mb-1.5 text-xs font-medium text-muted';

export default function Editor({ mark, latlon, onChange, onClose, onDelete }: {
  mark: Mark;
  latlon: [number, number];
  onChange: (patch: Partial<Mark>) => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setConfirm(false); }, [mark.id]);
  useEffect(() => {
    // нова порожня позначка — одразу ставимо курсор у підпис
    if (!mark.title && !mark.date && !mark.text) {
      const t = setTimeout(() => titleRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mark.id]);

  const [la, lo] = latlon;
  return (
    <Panel side="right" title="Подія на мапі" onClose={onClose} closeLabel="Закрити">
      <label className={label} htmlFor="edDate">Коли</label>
      <input
        id="edDate" className={field} placeholder="напр. 12 вересня 2026" autoComplete="off"
        value={mark.date} onChange={(e) => onChange({ date: e.target.value })}
      />
      <label className={label} htmlFor="edTitle">Що тут відбулось</label>
      <input
        id="edTitle" ref={titleRef} className={field} placeholder="Короткий підпис над місцем" autoComplete="off"
        value={mark.title} onChange={(e) => onChange({ title: e.target.value })}
        onKeyDown={(e) => { if (e.key === 'Enter') onClose(); }}
      />
      <label className={label} htmlFor="edText">Подробиці</label>
      <textarea
        id="edText" className={field} rows={3} placeholder="Кілька речень — видно, коли позначку вибрано"
        value={mark.text} onChange={(e) => onChange({ text: e.target.value })}
      />
      <div className="border-t border-rule pt-2 font-mono text-[11px] text-muted">
        {la.toFixed(5)}° пн. ш. · {lo.toFixed(5)}° сх. д.
        {mark.by && <><br />додав(ла): {mark.by}</>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={onClose}>Зберегти</Button>
        <Button variant={confirm ? 'danger' : 'ghost'} onClick={() => { if (!confirm) setConfirm(true); else onDelete(); }}>
          {confirm ? 'Так, видалити позначку' : 'Видалити'}
        </Button>
      </div>
    </Panel>
  );
}
