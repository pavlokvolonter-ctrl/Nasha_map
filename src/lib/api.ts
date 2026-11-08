import { sb } from './supabase';
import { clean, toRow, fromRow, type MarkRow } from './marks';
import initialMarks from '../data/initialMarks.json';
import type { Mark, MarksApi } from '../types';

/** Початкові місця з оригінальної мапи */
export const seedMarks = (): Mark[] => (initialMarks as Mark[]).map((m) => ({ ...m }));

/** Спільна база (Supabase) */
export const remoteApi: MarksApi = {
  async list() {
    const { data, error } = await sb().from('marks').select('*').order('seq', { ascending: true });
    if (error) throw error;
    return (data as MarkRow[]).map(fromRow);
  },
  async save(list) {
    if (!list.length) return;
    const { error } = await sb().from('marks').upsert(list.map(toRow), { onConflict: 'id' });
    if (error) throw error;
  },
  async remove(id) {
    const { error } = await sb().from('marks').delete().eq('id', id);
    if (error) throw error;
  },
  /** Живі оновлення: коли інший користувач додає/змінює/видаляє місце */
  subscribe({ onUpsert, onDelete }) {
    const client = sb();
    const ch = client
      .channel('marks-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marks' }, (p) => {
        if (p.eventType === 'DELETE') onDelete((p.old as { id: string }).id);
        else onUpsert(fromRow(p.new as MarkRow));
      })
      .subscribe();
    return () => { void client.removeChannel(ch); };
  },
};

/** Локальний режим (без бекенду): усе в localStorage цього браузера */
const LS = 'nasha-marks-v1';
const LS_SEEN = 'nasha-seed-seen-v1';

const readLocal = (): Mark[] | null => {
  try {
    const a: unknown = JSON.parse(localStorage.getItem(LS) || 'null');
    if (Array.isArray(a)) return a as Mark[];
  } catch { /* ignore */ }
  return null;
};
const writeLocal = (list: Mark[]) => localStorage.setItem(LS, JSON.stringify(list.map(clean)));

export const localApi: MarksApi = {
  async list() {
    let all = readLocal();
    if (!all) return seedMarks();
    if (all.some((m) => String(m.id).startsWith('p-'))) { // публічні місця тепер окремо
      all = all.filter((m) => !String(m.id).startsWith('p-'));
      writeLocal(all);
    }
    // дописати нові стартові місця, яких користувач ще не бачив (видалені не повертаються)
    let seen: string[];
    try { seen = (JSON.parse(localStorage.getItem(LS_SEEN) || 'null') as string[] | null) ?? all.map((m) => m.id); }
    catch { seen = all.map((m) => m.id); }
    const seeds = seedMarks();
    const current = all;
    const add = seeds.filter((m) => !seen.includes(m.id) && !current.some((x) => x.id === m.id));
    localStorage.setItem(LS_SEEN, JSON.stringify([...new Set([...seen, ...seeds.map((m) => m.id)])]));
    if (add.length) { all.push(...add); writeLocal(all); }
    return all;
  },
  async save(list) {
    const all = readLocal() ?? seedMarks();
    for (const m of list) {
      const i = all.findIndex((x) => x.id === m.id);
      if (i >= 0) all[i] = clean(m); else all.push(clean(m));
    }
    writeLocal(all);
  },
  async remove(id) { writeLocal((readLocal() ?? seedMarks()).filter((m) => m.id !== id)); },
  subscribe() { return () => {}; },
};
