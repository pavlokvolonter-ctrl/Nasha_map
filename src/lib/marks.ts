import type { Mark } from '../types';

const r1 = (v: number | string): number => Math.round(+v * 10) / 10;

/** Те, що зберігаємо: bid — лише прапорець «прив'язано до будівлі» (1/-1), індекс будівлі рушій знаходить за координатами */
export const clean = (m: Mark): Mark => ({
  id: m.id,
  x: r1(m.x),
  z: r1(m.z),
  top: r1(+m.top || 1),
  bid: m.bid >= 0 ? 1 : -1,
  lx: r1(m.lx),
  lz: r1(m.lz),
  ly: m.ly || 4,
  date: m.date || '',
  title: m.title || '',
  text: m.text || '',
  example: !!m.example,
});

/** Рядок таблиці public.marks */
export interface MarkRow {
  id: string;
  x: number;
  z: number;
  top: number;
  bid: number;
  lx: number;
  lz: number;
  ly: number;
  date_label: string | null;
  title: string | null;
  body: string | null;
  is_example: boolean | null;
  created_by?: string | null;
}

export const toRow = (m: Mark): Omit<MarkRow, 'created_by'> => {
  const c = clean(m);
  return {
    id: c.id, x: c.x, z: c.z, top: c.top, bid: c.bid, lx: c.lx, lz: c.lz, ly: c.ly,
    date_label: c.date, title: c.title, body: c.text, is_example: c.example,
  };
};

export const fromRow = (r: MarkRow): Mark => ({
  id: r.id, x: r.x, z: r.z, top: r.top, bid: r.bid, lx: r.lx, lz: r.lz, ly: r.ly,
  date: r.date_label || '', title: r.title || '', text: r.body || '',
  example: !!r.is_example, by: r.created_by || '',
});
