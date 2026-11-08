import { useEffect, useRef, useState } from 'react';
import type { Place } from '../types';
import Button from './Button';
import Panel from './Panel';

const field =
  'box-border w-full rounded-none border border-rule bg-field px-[9px] py-2 text-sm text-ink focus:border-ink focus:bg-paper max-sm:text-base';
const label = '-mb-1.5 text-xs font-medium text-muted';

export default function PlaceEditor({ place, latlon, onChange, onClose, onDelete }: {
  place: Place;
  latlon: [number, number];
  onChange: (patch: Partial<Place>) => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setConfirm(false); }, [place.id]);
  useEffect(() => {
    // нове порожнє місце — одразу ставимо курсор у назву
    if (!place.name) {
      const t = setTimeout(() => nameRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place.id]);

  const [la, lo] = latlon;
  return (
    <Panel side="right" title="Місце на мапі" onClose={onClose} closeLabel="Закрити">
      <label className={label} htmlFor="plName">Назва (підпис на мапі)</label>
      <input
        id="plName" ref={nameRef} className={field} placeholder="напр. Цукерня, Арсенал" autoComplete="off"
        value={place.name} onChange={(e) => onChange({ name: e.target.value })}
        onKeyDown={(e) => { if (e.key === 'Enter') onClose(); }}
      />
      <label className={label} htmlFor="plAddr">Адреса (для пошуку)</label>
      <input
        id="plAddr" className={field} placeholder="напр. вул. Городоцька, 1" autoComplete="off"
        value={place.addr} onChange={(e) => onChange({ addr: e.target.value })}
        onKeyDown={(e) => { if (e.key === 'Enter') onClose(); }}
      />
      <div className="border-t border-rule pt-2 font-mono text-[11px] text-muted">
        {la.toFixed(5)}° пн. ш. · {lo.toFixed(5)}° сх. д.
        {place.by && <><br />додав(ла): {place.by}</>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={onClose}>Зберегти</Button>
        <Button variant={confirm ? 'danger' : 'ghost'} onClick={() => { if (!confirm) setConfirm(true); else onDelete(); }}>
          {confirm ? 'Так, видалити місце' : 'Видалити'}
        </Button>
      </div>
    </Panel>
  );
}
