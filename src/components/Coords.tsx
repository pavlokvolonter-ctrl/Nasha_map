import { useEffect, useState, type RefObject } from 'react';
import type { CityEngine } from '../types';

/** Живі координати точки, на яку зараз дивиться камера. */
export default function Coords({ engineRef }: { engineRef: RefObject<CityEngine | null> }) {
  const [text, setText] = useState('');
  useEffect(() => {
    const tick = () => {
      const e = engineRef.current;
      if (!e) return;
      const f = e.getFeet();
      const [lat, lon] = e.toLatLon(f.x, f.z);
      setText(`${lat.toFixed(4)}° пн. ш. ${lon.toFixed(4)}° сх. д.`);
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [engineRef]);
  return <>{text}</>;
}
