import { useMemo, useRef, useState } from 'react';
import type { Mark, Place } from '../types';

const norm = (s: string | undefined): string => (s || '').toLowerCase().replace(/[’'`]/g, '');

interface Hit {
  key: string;
  place?: Place;
  mark?: Mark;
  title: string;
  date: string;
  rank: number;
}

export default function SearchBox({ marks, places, onPlace, onPick }: {
  marks: Mark[];
  places: Place[];
  onPlace: (p: Place) => void;
  onPick: (id: string) => void;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const ref = useRef<HTMLInputElement>(null);

  const words = useMemo(() => norm(q).trim().split(/\s+/).filter(Boolean), [q]);

  const found = useMemo<Hit[]>(() => {
    if (!words.length) return [];
    const own: Hit[] = [];
    for (const m of marks) {
      const fields = [m.date, m.title, m.text];
      const hay = norm(fields.join(' \n '));
      if (!words.every((w) => hay.includes(w))) continue;
      const first = fields.findIndex((f) => norm(f).includes(words[0]));
      own.push({ key: m.id, mark: m, title: m.title, date: m.date, rank: first < 0 ? 3 : first });
    }
    const ps: Hit[] = places
      .filter((p) => words.every((w) => norm(p.name + ' ' + p.addr).includes(w)))
      .map((p) => ({ key: p.id, place: p, title: p.name, date: p.addr, rank: 5 }));
    return [...own, ...ps].sort((a, b) => a.rank - b.rank).slice(0, 8);
  }, [words, marks, places]);

  const pick = (h: Hit) => {
    if (h.place) onPlace(h.place); else if (h.mark) onPick(h.mark.id);
    setOpen(false);
    setQ('');
    ref.current?.blur();
  };

  const snippet = (h: Hit): string => {
    if (!h.mark) return '';
    const f = [h.mark.title, h.mark.text].find((s) => norm(s).includes(words[0])) || h.mark.text || '';
    if (f === h.mark.title) return '';
    return f.length > 70 ? f.slice(0, 70) + '…' : f;
  };

  return (
    <div className="relative flex max-w-[380px] min-w-[150px] flex-[1_1_220px] self-stretch">
      <input
        ref={ref}
        type="search"
        placeholder="Пошук: спогад, мітка, слово…"
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(0); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, found.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
          else if (e.key === 'Enter' && found[hi]) pick(found[hi]);
          else if (e.key === 'Escape') { setOpen(false); e.currentTarget.blur(); }
        }}
        className="box-border h-full w-full appearance-none rounded-none border border-ink bg-paper px-3 py-[7px] text-[13px] font-medium text-ink placeholder:font-normal placeholder:text-muted max-sm:text-xs"
      />
      {open && q.trim() && (
        <ul className="absolute top-[calc(100%+4px)] right-0 left-0 z-50 m-0 max-h-[60vh] list-none overflow-auto border border-ink bg-paper p-0 shadow-pop">
          {found.length === 0 && <li className="px-3 py-2 text-[13px] text-muted">Нічого не знайдено</li>}
          {found.map((h, i) => (
            <li
              key={h.key}
              onMouseDown={(e) => { e.preventDefault(); pick(h); }}
              onMouseEnter={() => setHi(i)}
              className={`flex cursor-pointer flex-col gap-0.5 border-b border-rule px-3 py-2 text-[13px] text-ink ${i === hi ? 'bg-hover' : ''}`}
            >
              <b>{h.place ? '📍 ' : ''}{h.title || h.date || 'без назви'}</b>
              <span className="text-xs text-muted">
                {h.title && h.date ? h.date : ''}{snippet(h) ? (h.title && h.date ? ' · ' : '') + snippet(h) : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
