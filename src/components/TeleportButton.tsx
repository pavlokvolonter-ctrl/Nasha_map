import { useEffect, useState, type RefObject } from 'react';
import type { CityEngine } from '../types';
import { TELEPORT, VYNNYKY_MIN_X } from '../data/teleport';
import Button from './Button';

/** Переносить камеру у Винники, а якщо вона вже там — до Львова. */
export default function TeleportButton({ engineRef }: { engineRef: RefObject<CityEngine | null> }) {
  const [inVynnyky, setInVynnyky] = useState(false);
  useEffect(() => {
    const tick = () => {
      const e = engineRef.current;
      if (e) setInVynnyky(e.getFeet().x > VYNNYKY_MIN_X);
    };
    tick();
    const id = window.setInterval(tick, 300);
    return () => window.clearInterval(id);
  }, [engineRef]);

  const target = inVynnyky ? TELEPORT.lviv : TELEPORT.vynnyky;
  return (
    <Button onClick={() => engineRef.current?.flyTo(target.x, target.z)}>
      Телепорт<span className="max-sm:hidden"> · {target.label}</span>
    </Button>
  );
}
