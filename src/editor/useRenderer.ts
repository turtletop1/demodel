import { useEffect, useRef } from 'react';
import { Renderer } from '@runtime/renderer/Renderer';
import { evaluateBones, restWorldMatrices } from '@runtime/evaluate';
import { useEditor, textureRegistry } from './store';

export function useAnimationLoop(renderer: React.RefObject<Renderer | null>) {
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  useEffect(() => {
    const tick = (now: number) => {
      const s = useEditor.getState();
      const r = renderer.current;
      if (s.project && r) {
        r.syncLayers(s.project, textureRegistry);
        let t = s.t;
        if (s.playing) {
          if (!startRef.current) startRef.current = now;
          const elapsed = now - startRef.current;
          t = (elapsed % s.project.durationMs) / s.project.durationMs;
          useEditor.setState((st) => {
            st.t = t;
          });
        } else {
          startRef.current = 0;
        }
        const { world, opacity } = evaluateBones(
          s.project.skeleton,
          s.project.tracks,
          t,
        );
        const rest = restWorldMatrices(s.project.skeleton);
        r.draw(s.project, world, rest, opacity);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [renderer]);
}