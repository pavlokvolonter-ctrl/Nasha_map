/** Забарвлені будівлі. `token` — назва кольору з теми (globals.css → --color-<token>), самих кольорів тут немає. */
export interface BuildingTint {
  label: string;
  lat: number;
  lon: number;
  token: 'tint-blue' | 'tint-red';
}

/* Координати приблизні (інтерполяція за сусідніми адресами) — за потреби уточнити. */
export const BUILDING_TINTS: readonly BuildingTint[] = [
  { label: 'Винники, вул. 500-річчя Січі, 4', lat: 49.8154, lon: 24.152, token: 'tint-blue' },
  { label: 'Винники, вул. Кільцева, 6', lat: 49.82401, lon: 24.14889, token: 'tint-red' },
];
