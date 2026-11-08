import { useCallback, useEffect, useRef, useState } from 'react';
import MapView from './components/MapView';
import TopBar from './components/TopBar';
import MarksList from './components/MarksList';
import Editor from './components/Editor';
import WalkPad from './components/WalkPad';
import Login from './components/Login';
import Denied from './components/Denied';
import placesData from './data/places.json';
import { useAuth, signOut } from './lib/useAuth';
import { publicView } from './lib/supabase';
import { localApi, remoteApi, seedMarks } from './lib/api';
import type { CityEngine, EngineHandlers, Mark, MarksApi, Place, TourInfo } from './types';

const places = placesData as Place[];

const fullScreenText =
  'fixed inset-0 grid place-items-center font-mono text-xs tracking-[0.06em] text-muted uppercase';
const capBase =
  'fixed left-1/2 max-w-[calc(100%-32px)] -translate-x-1/2 px-3.5 text-center text-[13px] max-sm:text-xs';
const cap = `${capBase} border border-ink bg-paper py-2 font-semibold bottom-[calc(22px+env(safe-area-inset-bottom,0px))] max-sm:bottom-[calc(62px+env(safe-area-inset-bottom,0px))]`;
const hint = `${capBase} bg-ink py-[9px] text-white bottom-[calc(22px+env(safe-area-inset-bottom,0px))] max-sm:bottom-[calc(62px+env(safe-area-inset-bottom,0px))]`;

const errText = (e: unknown): string => (e instanceof Error ? e.message : String(e));
const isMobile = () => innerWidth <= 640;

/** Вибір режиму: без бекенду → локально; інакше потрібен вхід за поштою зі списку дозволених */
export default function App() {
  const auth = useAuth();

  if (auth.status === 'loading') return <div className={fullScreenText}>Завантаження…</div>;
  if (auth.status === 'locked') return <Login />;
  if (auth.status === 'local') return <MapApp api={localApi} canEdit user={auth.user} localMode />;

  const email = auth.status === 'authed' ? auth.session.user.email : undefined;
  if (auth.status === 'anon') return publicView ? <MapApp api={remoteApi} canEdit={false} showLogin /> : <Login />;
  if (!auth.allowed && !publicView) return <Denied email={email} />;
  return <MapApp api={remoteApi} canEdit={auth.allowed} user={email} />;
}

interface MapAppProps {
  api: MarksApi;
  canEdit: boolean;
  user?: string;
  localMode?: boolean;
  showLogin?: boolean;
}

function MapApp({ api, canEdit, user, localMode, showLogin }: MapAppProps) {
  const engineRef = useRef<CityEngine | null>(null);
  const handlersRef = useRef<EngineHandlers>({});
  const [engineReady, setEngineReady] = useState(false);

  const [marks, setMarks] = useState<Mark[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [walking, setWalking] = useState(false);
  const [touring, setTouring] = useState(false);
  const [tour, setTour] = useState<TourInfo | null>(null);
  const [showNames, setShowNames] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);

  // «живі» копії стану для обробників, які створюються один раз
  const marksRef = useRef(marks); marksRef.current = marks;
  const selectedRef = useRef(selectedId); selectedRef.current = selectedId;
  const placingRef = useRef(placing); placingRef.current = placing;

  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const showToast = useCallback((text: string, ms = 2600) => {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), ms);
  }, []);

  /* ---------- завантаження + живі оновлення ---------- */
  const dirty = useRef(new Map<string, number>()); // id -> версія незбереженої правки
  const verRef = useRef(0);
  const savingRef = useRef(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let dead = false;
    api.list()
      .then((list) => { if (!dead) setMarks(list); })
      .catch((e: unknown) => { console.error(e); if (!dead) showToast('Не вдалося завантажити місця: ' + errText(e), 6000); })
      .finally(() => { if (!dead) setLoaded(true); });
    const off = api.subscribe({
      onUpsert: (m) => {
        if (dirty.current.has(m.id)) return; // не затираємо те, що зараз редагуємо
        setMarks((prev) => (prev.some((x) => x.id === m.id) ? prev.map((x) => (x.id === m.id ? m : x)) : [...prev, m]));
      },
      onDelete: (id) => {
        dirty.current.delete(id);
        setMarks((prev) => prev.filter((x) => x.id !== id));
        setSelectedId((s) => (s === id ? null : s));
      },
    });
    return () => { dead = true; off(); };
  }, [api, showToast]);

  /* ---------- збереження ---------- */
  const markDirty = useCallback((id: string) => {
    dirty.current.set(id, ++verRef.current);
    setTick((t) => t + 1);
  }, []);

  const flush = useCallback(async () => {
    if (!canEdit || savingRef.current || !dirty.current.size) return;
    const snap = new Map(dirty.current);
    const list = marksRef.current.filter((m) => snap.has(m.id));
    savingRef.current = true;
    try {
      await api.save(list);
      for (const [id, v] of snap) if (dirty.current.get(id) === v) dirty.current.delete(id);
      showToast('Збережено', 1600);
      if (dirty.current.size) setTick((t) => t + 1); // під час збереження з'явились нові правки
    } catch (e) {
      console.error(e);
      showToast('Не вдалося зберегти: ' + errText(e), 6000);
    } finally {
      savingRef.current = false;
    }
  }, [api, canEdit, showToast]);

  // автозбереження через 1,2 с після останньої правки
  useEffect(() => {
    if (!dirty.current.size) return undefined;
    const t = setTimeout(() => void flush(), 1200);
    return () => clearTimeout(t);
  }, [tick, flush]);

  useEffect(() => {
    const f = (e: BeforeUnloadEvent) => { if (dirty.current.size) { e.preventDefault(); e.returnValue = ''; } };
    addEventListener('beforeunload', f);
    return () => removeEventListener('beforeunload', f);
  }, []);

  const updateMark = useCallback((id: string, patch: Partial<Mark>) => {
    setMarks((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch, example: false } : m)));
    markDirty(id);
  }, [markDirty]);

  const addMark = useCallback((m: Mark) => {
    const nm: Mark = { ...m, bid: m.bid >= 0 ? 1 : -1, by: user || '' };
    setMarks((prev) => [...prev, nm]);
    markDirty(nm.id);
    setPlacing(false);
    setSelectedId(nm.id);
  }, [markDirty, user]);

  const deselect = useCallback(() => { setSelectedId(null); void flush(); }, [flush]);

  const flyToMark = useCallback((id: string) => {
    const m = marksRef.current.find((x) => x.id === id);
    if (m) engineRef.current?.flyTo(m.x, m.z);
  }, []);

  const select = useCallback((id: string, fly: boolean) => {
    setSelectedId(id);
    if (isMobile()) setListOpen(false);
    if (fly) flyToMark(id);
  }, [flyToMark]);

  /** Вибір мітки зі списку чи пошуку: редактор відкриваємо лише тим, хто може редагувати */
  const pickMark = useCallback((id: string) => {
    if (canEdit) select(id, true);
    else { setSelectedId(id); flyToMark(id); }
  }, [canEdit, select, flyToMark]);

  const deleteMark = useCallback(async (id: string) => {
    setMarks((prev) => prev.filter((m) => m.id !== id));
    dirty.current.delete(id);
    setSelectedId(null);
    try { await api.remove(id); } catch (e) {
      console.error(e);
      showToast('Не вдалося видалити: ' + errText(e), 6000);
      api.list().then(setMarks).catch(() => {});
    }
  }, [api, showToast]);

  const importSeed = useCallback(async () => {
    const s = seedMarks();
    try { await api.save(s); setMarks(s); showToast('Початкові місця завантажено'); }
    catch (e) { console.error(e); showToast('Не вдалося завантажити: ' + errText(e), 6000); }
  }, [api, showToast]);

  /* ---------- події 3D-рушія ---------- */
  handlersRef.current = {
    pinClick: (id) => {
      if (canEdit) { select(id, true); return; }
      const on = selectedRef.current !== id;
      setSelectedId(on ? id : null);
      if (on) flyToMark(id);
    },
    place: (m) => { if (canEdit) addMark(m); },
    background: () => { if (selectedRef.current) deselect(); },
    tour: (info) => { setTour(info); if (!info) setTouring(false); },
    walk: (w) => setWalking(w),
  };

  /* ---------- синхронізація стану React → рушій ---------- */
  useEffect(() => { engineRef.current?.setMarkers(marks); }, [marks, engineReady]);
  useEffect(() => { engineRef.current?.setPlaces(places); }, [engineReady]);
  useEffect(() => { engineRef.current?.setSelected(selectedId); }, [selectedId, engineReady]);
  useEffect(() => { engineRef.current?.setCanEdit(canEdit); }, [canEdit, engineReady]);
  useEffect(() => { engineRef.current?.setShowNames(showNames); }, [showNames, engineReady]);
  useEffect(() => { engineRef.current?.setPlacing(placing); }, [placing, engineReady]);

  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (engineRef.current?.isWalking()) { engineRef.current.stopWalk(); return; }
      if (placingRef.current) { setPlacing(false); return; }
      deselect();
    };
    addEventListener('keydown', f);
    return () => removeEventListener('keydown', f);
  }, [deselect]);

  /* ---------- кнопки ---------- */
  const toggleTour = () => {
    const e = engineRef.current; if (!e) return;
    if (touring) { e.stopTour(); setTouring(false); return; }
    if (selectedRef.current) deselect();
    setPlacing(false);
    e.startTour();
    setTouring(true);
  };
  const toggleWalk = () => {
    const e = engineRef.current; if (!e) return;
    if (e.isWalking()) { e.stopWalk(); return; }
    setTouring(false);
    (document.activeElement as HTMLElement | null)?.blur?.();
    e.startWalk();
  };
  const markHere = () => {
    const e = engineRef.current; if (!e) return;
    const f = e.getFeet();
    addMark(e.makeMarkerAt(f.x, f.z));
  };

  const selected = marks.find((m) => m.id === selectedId) ?? null;
  const latlon: [number, number] = selected && engineReady && engineRef.current
    ? engineRef.current.toLatLon(selected.x, selected.z)
    : [0, 0];
  // відкрита шторка (список чи редактор) на телефоні закриває компас, підказки й кнопки ходіння
  const sheet = listOpen || !!selectedId;

  return (
    <>
      <MapView engineRef={engineRef} handlersRef={handlersRef} onReady={() => setEngineReady(true)} hideCompass={sheet} />

      <TopBar
        canEdit={canEdit} placing={placing} walking={walking} touring={touring} count={marks.length}
        showNames={showNames} user={user} localMode={localMode} showLogin={showLogin}
        marks={marks} places={places}
        onPlace={(p) => { deselect(); engineRef.current?.flyTo(p.x, p.z); }}
        onPick={pickMark}
        onAdd={() => setPlacing((p) => !p)} onWalk={toggleWalk} onTour={toggleTour}
        onList={() => { if (!listOpen && selectedId && isMobile()) deselect(); setListOpen((v) => !v); }}
        onNames={setShowNames} onSignOut={() => void signOut()} onSignIn={() => setLoginOpen(true)}
      />

      {tour && !sheet && (
        <div className={cap}>
          <small className="block font-mono text-[10px] font-normal tracking-[0.05em] text-muted uppercase">
            Маршрут ≈ {tour.km.toFixed(1).replace('.', ',')} км · {tour.part + 1} з {tour.parts}
          </small>
          {tour.name}
        </div>
      )}
      {toast && (
        <div className={`${cap} bottom-[calc(84px+env(safe-area-inset-bottom,0px))] font-medium max-sm:bottom-[calc(112px+env(safe-area-inset-bottom,0px))]`}>
          {toast}
        </div>
      )}
      {placing && (
        <div className={hint}>
          Клацніть на будівлю чи вулицю — там загориться <b className="text-warm">тепле світло</b>. Esc — скасувати
        </div>
      )}
      {walking && !placing && (
        <div className={`${hint} max-[1100px]:max-w-[calc(100%-330px)] max-[1100px]:bottom-[calc(86px+env(safe-area-inset-bottom,0px))] max-sm:hidden`}>
          <b className="text-warm">W A S D</b> / стрілки — рухатись · <b className="text-warm">Пробіл</b> — вгору, <b className="text-warm">C</b> — вниз · <b className="text-warm">Shift</b> — швидше · мишею — обертати, колесо — масштаб · <b className="text-warm">Esc</b> — вийти
        </div>
      )}

      {listOpen && (
        <MarksList
          marks={marks} loaded={loaded} canImport={canEdit && !localMode}
          onPick={pickMark} onClose={() => setListOpen(false)} onImport={() => void importSeed()}
        />
      )}

      {canEdit && selected && (
        <Editor
          key={selected.id} mark={selected} latlon={latlon}
          onChange={(patch) => updateMark(selected.id, patch)}
          onClose={deselect} onDelete={() => void deleteMark(selected.id)}
        />
      )}

      {walking && (
        <WalkPad
          canEdit={canEdit} hideOnMobile={sheet}
          onJoy={(f, s, v) => engineRef.current?.setJoystick(f, s, v)}
          onMarkHere={markHere} onExit={() => engineRef.current?.stopWalk()}
        />
      )}

      {!walking && (
        <div className="fixed bottom-[calc(16px+env(safe-area-inset-bottom,0px))] left-4 max-w-[calc(100%-110px)] bg-label-bg px-2 py-[5px] text-[11px] text-muted max-sm:hidden">
          Тягніть — обертати · Shift + тягніть або права кнопка — зсув · коліщатко чи щипок — масштаб
        </div>
      )}

      {loginOpen && <Login onClose={() => setLoginOpen(false)} />}
    </>
  );
}
