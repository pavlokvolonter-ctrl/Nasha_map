/** Мітка-спогад (те, що додають двоє користувачів) */
export interface Mark {
  id: string;
  x: number;
  z: number;
  top: number;
  /** 1 — прив'язано до будівлі, -1 — стоїть на землі (індекс будівлі рушій знаходить сам) */
  bid: number;
  lx: number;
  lz: number;
  ly: number;
  date: string;
  title: string;
  text: string;
  example: boolean;
  by?: string;
}

/** Публічне місце: підпис на мапі (Політехніка, Forum…), не редагується */
export interface Place {
  id: string;
  name: string;
  addr: string;
  x: number;
  z: number;
  kind: 'poi' | 'mc';
  d: number;
  label?: string;
  /** додане користувачем (можна редагувати й видаляти) */
  custom?: boolean;
  by?: string;
}

/** Що зараз ставимо на мапі: спогад чи місце */
export type Placing = 'mark' | 'place' | null;

/** Сховище власних місць: localStorage або Supabase */
export interface PlacesApi {
  list(): Promise<Place[]>;
  save(place: Place): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface TourInfo {
  part: number;
  parts: number;
  name: string;
  km: number;
}

/** Події, які 3D-рушій надсилає в React */
export interface EngineEvents {
  pinClick: (id: string) => void;
  place: (mark: Mark) => void;
  background: () => void;
  tour: (info: TourInfo | null) => void;
  walk: (walking: boolean) => void;
}

export interface EngineOptions {
  stage: HTMLElement;
  labelsEl: HTMLElement;
  needleEl: SVGElement | null;
  on: Partial<EngineEvents>;
}

/** Імперативний API 3D-рушія */
export interface CityEngine {
  setMarkers(marks: Mark[]): void;
  setPlaces(places: Place[]): void;
  setBuildingTints(list: { lat: number; lon: number; color: string }[]): void;
  setSelected(id: string | null): void;
  setCanEdit(v: boolean): void;
  setPlacing(v: boolean): void;
  setShowNames(v: boolean): void;
  flyTo(x: number, z: number): void;
  startTour(): void;
  stopTour(): void;
  startWalk(): void;
  stopWalk(): void;
  setJoystick(forward: number, side: number, vertical?: number): void;
  getFeet(): { x: number; z: number };
  makeMarkerAt(x: number, z: number): Mark;
  toLatLon(x: number, z: number): [number, number];
  destroy(): void;
  isWalking(): boolean;
}

/** Сховище міток: localStorage або Supabase */
export interface MarksApi {
  list(): Promise<Mark[]>;
  save(list: Mark[]): Promise<void>;
  remove(id: string): Promise<void>;
  subscribe(h: { onUpsert: (m: Mark) => void; onDelete: (id: string) => void }): () => void;
}

export type EngineHandlers = Partial<EngineEvents>;
