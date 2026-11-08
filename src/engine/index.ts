import { buildCityEngine } from './createCityEngine';
import type { CityEngine, EngineOptions } from '../types';

/** Створює 3D-рушій мапи. Кидає Error('WEBGL_UNAVAILABLE'), якщо браузер не вміє WebGL. */
export function createCityEngine(opts: EngineOptions): CityEngine {
  return buildCityEngine(opts) as CityEngine;
}
