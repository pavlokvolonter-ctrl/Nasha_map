import type { Mark, Place } from '../types';
import Button from './Button';
import SearchBox from './SearchBox';

interface Props {
  canEdit: boolean;
  placing: boolean;
  walking: boolean;
  touring: boolean;
  count: number;
  showNames: boolean;
  user?: string;
  localMode?: boolean;
  showLogin?: boolean;
  marks: Mark[];
  places: Place[];
  onPlace: (p: Place) => void;
  onPick: (id: string) => void;
  onAdd: () => void;
  onWalk: () => void;
  onTour: () => void;
  onList: () => void;
  onNames: (v: boolean) => void;
  onSignOut: () => void;
  onSignIn: () => void;
}

export default function TopBar({
  canEdit, placing, walking, touring, count, showNames, user, localMode, showLogin,
  marks, places, onPlace, onPick, onAdd, onWalk, onTour, onList, onNames, onSignOut, onSignIn,
}: Props) {
  return (
    <header className="pointer-events-none fixed top-[calc(12px+env(safe-area-inset-top,0px))] right-4 left-4 flex flex-wrap items-stretch gap-2.5 max-sm:top-[calc(8px+env(safe-area-inset-top,0px))] max-sm:right-2 max-sm:left-2 max-sm:flex-nowrap max-sm:gap-1.5 *:pointer-events-auto">
      <div className="flex flex-col justify-center border border-ink bg-paper px-3.5 pt-2 pb-[9px] max-sm:flex-none max-sm:px-2.5 max-sm:py-1.5">
        <div className="text-xl leading-none font-bold tracking-[0.14em] uppercase max-sm:text-[15px]">Львів</div>
        <div className="mt-[5px] font-mono text-[10px] tracking-[0.03em] text-muted max-sm:hidden">
          {localMode ? 'локальний режим · зміни лише в цьому браузері' : 'центр · Личаків · Винники · 49.84° пн. ш. 24.03° сх. д.'}
        </div>
      </div>

      <SearchBox marks={marks} places={places} onPlace={onPlace} onPick={onPick} />

      <div className="flex flex-wrap items-center gap-2 border border-ink bg-paper p-2 max-sm:min-w-0 max-sm:flex-1 max-sm:flex-nowrap max-sm:gap-[5px] max-sm:overflow-x-auto max-sm:p-[5px] max-sm:[scrollbar-width:none] max-sm:*:flex-none">
        {canEdit && (
          <Button variant={placing ? 'primaryOn' : 'primary'} onClick={onAdd}>
            {placing ? 'Скасувати' : '+ Позначити подію'}
          </Button>
        )}
        <Button variant={walking ? 'active' : 'default'} onClick={onWalk}>
          {walking ? 'Зупинитись' : 'Ходити'}
        </Button>
        <Button variant={touring ? 'active' : 'default'} onClick={onTour}>
          {touring ? 'Зупинити' : <>Маршрут<span className="max-sm:hidden"> до Винників</span></>}
        </Button>
        <Button onClick={onList}>
          Позначки<span className="ml-1 font-mono text-[11px] text-muted">{count}</span>
        </Button>
        <label className="flex cursor-pointer items-center gap-1.5 px-1.5 text-[13px] select-none max-sm:px-1 max-sm:text-xs">
          <input type="checkbox" className="accent-ink" checked={showNames} onChange={(e) => onNames(e.target.checked)} />
          Назви<span className="max-sm:hidden"> місць</span>
        </label>
        {user && (
          <span title={user} className="max-w-[190px] truncate px-1 font-mono text-[11px] text-muted max-sm:hidden">
            {user}{!canEdit && ' · лише перегляд'}
          </span>
        )}
        {user && <Button onClick={onSignOut}>Вийти</Button>}
        {showLogin && <Button onClick={onSignIn}>Увійти</Button>}
      </div>
    </header>
  );
}
