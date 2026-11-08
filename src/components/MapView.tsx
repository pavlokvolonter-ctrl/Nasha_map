import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { createCityEngine } from '../engine';
import type { CityEngine, EngineHandlers } from '../types';

const EVENTS = ['pinClick', 'place', 'background', 'tour', 'walk'] as const;

const overlayText =
  'fixed inset-0 grid place-items-center p-6 text-center font-mono text-xs tracking-[0.06em] text-muted uppercase';

/** Тримає 3D-рушій. Події рушія пересилаються в handlersRef.current — актуальні обробники з App. */
export default function MapView({ engineRef, handlersRef, onReady, hideCompass }: {
  engineRef: MutableRefObject<CityEngine | null>;
  handlersRef: MutableRefObject<EngineHandlers>;
  onReady: () => void;
  hideCompass: boolean;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const needleRef = useRef<SVGSVGElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'nogl' | 'error'>('loading');

  useEffect(() => {
    let engine: CityEngine | null = null;
    // даємо браузеру намалювати «Будую модель міста…» перед важкою синхронною побудовою
    const t = setTimeout(() => {
      try {
        const on: EngineHandlers = {};
        for (const k of EVENTS) {
          (on as Record<string, (...a: unknown[]) => void>)[k] = (...a) =>
            (handlersRef.current[k] as ((...x: unknown[]) => void) | undefined)?.(...a);
        }
        engine = createCityEngine({
          stage: stageRef.current as HTMLDivElement,
          labelsEl: labelsRef.current as HTMLDivElement,
          needleEl: needleRef.current,
          on,
        });
        engineRef.current = engine;
        setStatus('ready');
        onReady();
      } catch (e) {
        console.error(e);
        setStatus(e instanceof Error && e.message === 'WEBGL_UNAVAILABLE' ? 'nogl' : 'error');
      }
    }, 60);
    return () => {
      clearTimeout(t);
      engine?.destroy();
      engineRef.current = null;
    };
    // рушій створюється один раз
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div id="stage" ref={stageRef} className="fixed inset-0" />
      <div id="labels" ref={labelsRef} className="pointer-events-none fixed inset-0 overflow-hidden" />
      {status === 'loading' && <div className={overlayText}>Будую модель міста…</div>}
      {status === 'nogl' && <div className={overlayText}>Цей браузер не показує 3D-графіку (WebGL). Відкрийте мапу в Safari або Chrome.</div>}
      {status === 'error' && <div className={overlayText}>Не вдалося показати 3D-мапу. Оновіть сторінку.</div>}
      <div
        title="Північ"
        className={`fixed right-4 bottom-[calc(16px+env(safe-area-inset-bottom,0px))] grid size-[54px] place-items-center rounded-full border border-ink bg-paper max-sm:right-2.5 max-sm:bottom-[calc(10px+env(safe-area-inset-bottom,0px))] max-sm:size-[42px] ${hideCompass ? 'max-sm:hidden' : ''}`}
      >
        <svg viewBox="-20 -20 40 40" ref={needleRef} aria-hidden="true" className="size-10 max-sm:size-[30px]">
          <polygon points="0,-15 5,2 0,-2 -5,2" className="fill-warm stroke-ink" strokeWidth="1" />
          <polygon points="0,15 5,2 0,-2 -5,2" className="fill-paper stroke-ink" strokeWidth="1" />
        </svg>
      </div>
    </>
  );
}
