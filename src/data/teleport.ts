/** Точки телепорту в координатах моделі (1 одиниця = 1 м). */
export const TELEPORT = {
  lviv: { x: 60, z: -40, label: 'До Львова' },
  vynnyky: { x: 7060, z: 2790, label: 'До Винників' },
} as const;

/** Правіше за цю межу вважаємо, що камера вже у Винниках. */
export const VYNNYKY_MIN_X = 4500;
