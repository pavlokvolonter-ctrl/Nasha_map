import { sb } from './supabase';
import type { Place, PlacesApi } from '../types';

const VISIBLE_FROM = 7000; // з якої відстані видно підпис

const r1 = (v: number | string): number => Math.round(+v * 10) / 10;

interface PlaceRow {
  id: string;
  name: string | null;
  addr: string | null;
  x: number;
  z: number;
  created_by?: string | null;
}

const fromRow = (r: PlaceRow): Place => ({
  id: r.id, name: r.name || '', addr: r.addr || '', x: r.x, z: r.z,
  kind: 'poi', d: VISIBLE_FROM, custom: true, by: r.created_by || '',
});

/** Спільна база (Supabase, таблиця places — див. supabase/places.sql) */
export const remotePlacesApi: PlacesApi = {
  async list() {
    const { data, error } = await sb().from('places').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    return (data as PlaceRow[]).map(fromRow);
  },
  async save(p) {
    const { error } = await sb().from('places').upsert(
      { id: p.id, name: p.name, addr: p.addr, x: r1(p.x), z: r1(p.z) },
      { onConflict: 'id' },
    );
    if (error) throw error;
  },
  async remove(id) {
    const { error } = await sb().from('places').delete().eq('id', id);
    if (error) throw error;
  },
};

/** Локальний режим: localStorage цього браузера */
const LS = 'nasha-places-v1';
const read = (): Place[] => {
  try {
    const a: unknown = JSON.parse(localStorage.getItem(LS) || '[]');
    return Array.isArray(a) ? (a as Place[]) : [];
  } catch { return []; }
};
const write = (list: Place[]) => localStorage.setItem(LS, JSON.stringify(list));

export const localPlacesApi: PlacesApi = {
  async list() { return read().map((p) => ({ ...p, custom: true, kind: 'poi' as const, d: VISIBLE_FROM })); },
  async save(p) {
    const all = read();
    const i = all.findIndex((x) => x.id === p.id);
    const row: Place = { id: p.id, name: p.name, addr: p.addr, x: r1(p.x), z: r1(p.z), kind: 'poi', d: VISIBLE_FROM, custom: true, by: p.by };
    if (i >= 0) all[i] = row; else all.push(row);
    write(all);
  },
  async remove(id) { write(read().filter((p) => p.id !== id)); },
};
