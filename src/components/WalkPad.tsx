import type { PointerEvent } from 'react';
import Button from './Button';

const sq = 'size-[46px] touch-none p-0 text-base max-sm:size-11';

/** Екранні кнопки руху камери (для телефона); на комп'ютері — WASD / стрілки */
export default function WalkPad({ canEdit, hideOnMobile, onJoy, onMarkHere, onExit }: {
  canEdit: boolean;
  hideOnMobile: boolean;
  onJoy: (forward: number, side: number, vertical: number) => void;
  onMarkHere: () => void;
  onExit: () => void;
}) {
  const hold = (f: number, s: number, v = 0) => ({
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => { e.currentTarget.setPointerCapture?.(e.pointerId); onJoy(f, s, v); },
    onPointerUp: () => onJoy(0, 0, 0),
    onPointerCancel: () => onJoy(0, 0, 0),
    onPointerLeave: () => onJoy(0, 0, 0),
    onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault(),
  });
  return (
    <div
      className={`fixed bottom-[calc(16px+env(safe-area-inset-bottom,0px))] left-4 flex touch-none items-end gap-2.5 select-none max-sm:bottom-[calc(10px+env(safe-area-inset-bottom,0px))] max-sm:left-2.5 ${hideOnMobile ? 'max-sm:hidden' : ''}`}
    >
      <div className="grid grid-cols-[repeat(3,auto)] grid-rows-2 gap-1">
        <Button className={`${sq} col-start-2 row-start-1`} aria-label="Вперед" {...hold(1, 0)}>▲</Button>
        <Button className={`${sq} col-start-1 row-start-2`} aria-label="Вліво" {...hold(0, -1)}>◀</Button>
        <Button className={`${sq} col-start-2 row-start-2`} aria-label="Назад" {...hold(-1, 0)}>▼</Button>
        <Button className={`${sq} col-start-3 row-start-2`} aria-label="Вправо" {...hold(0, 1)}>▶</Button>
      </div>
      <div className="flex flex-col gap-1">
        <Button className={`${sq} text-lg`} aria-label="Вгору" {...hold(0, 0, 1)}>⤒</Button>
        <Button className={`${sq} text-lg`} aria-label="Вниз" {...hold(0, 0, -1)}>⤓</Button>
      </div>
      <div className="flex flex-col gap-1.5">
        {canEdit && <Button variant="primary" onClick={onMarkHere}>Позначити в центрі</Button>}
        <Button onClick={onExit}>Зупинити ходіння</Button>
      </div>
    </div>
  );
}
