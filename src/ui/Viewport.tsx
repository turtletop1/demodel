import { useEffect, useRef, useState } from 'react';
import { useEditor, textureRegistry } from '@editor/store';
import { useAnimationLoop } from '@editor/useRenderer';
import { Renderer } from '@runtime/renderer/Renderer';

interface Props {
  rendererRef: React.MutableRefObject<Renderer | null>;
}

export function Viewport({ rendererRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const project = useEditor((s) => s.project);
  const activeLayerId = useEditor((s) => s.activeLayerId);
  const activeBoneId = useEditor((s) => s.activeBoneId);
  const mode = useEditor((s) => s.mode);
  const t = useEditor((s) => s.t);

  useAnimationLoop(rendererRef);

  useEffect(() => {
    if (!canvasRef.current) return;
    const r = new Renderer(canvasRef.current);
    rendererRef.current = r;
    const p = useEditor.getState().project;
    if (p) {
      r.resize(p.width, p.height);
      r.syncLayers(p, textureRegistry);
    }
    return () => {
      rendererRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (rendererRef.current && project) {
      rendererRef.current.resize(project.width, project.height);
      rendererRef.current.syncLayers(project, textureRegistry);
    }
  }, [project, rendererRef]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !project) return;
    const ro = new ResizeObserver(() => {
      const cw = el.clientWidth - 24;
      const ch = el.clientHeight - 24;
      const s = Math.min(cw / project.width, ch / project.height);
      setScale(s);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [project]);

  // overlay：畫網格 + 骨骼
  useEffect(() => {
    const c = overlayRef.current;
    if (!c || !project) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = project.width * dpr;
    c.height = project.height * dpr;
    c.style.width = `${project.width}px`;
    c.style.height = `${project.height}px`;
    const ctx = c.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, project.width, project.height);

    const mesh = activeLayerId ? project.meshes[activeLayerId] : null;
    if (mesh && (mode === 'mesh' || mode === 'preview')) {
      ctx.strokeStyle = 'rgba(0, 200, 255, 0.5)';
      ctx.lineWidth = 1 / scale;
      for (let i = 0; i < mesh.indices.length; i += 3) {
        const a = mesh.vertices[mesh.indices[i]];
        const b = mesh.vertices[mesh.indices[i + 1]];
        const d = mesh.vertices[mesh.indices[i + 2]];
        const ax = a.u * project.width + a.ox;
        const ay = a.v * project.height + a.oy;
        const bx = b.u * project.width + b.ox;
        const by = b.v * project.height + b.oy;
        const dx = d.u * project.width + d.ox;
        const dy = d.v * project.height + d.oy;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.lineTo(dx, dy);
        ctx.closePath();
        ctx.stroke();
      }
      ctx.fillStyle = '#00ff88';
      const r = 3 / scale;
      for (const v of mesh.vertices) {
        ctx.beginPath();
        ctx.arc(v.u * project.width + v.ox, v.v * project.height + v.oy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (mode === 'bone' || mode === 'preview') {
      for (const b of project.skeleton) {
        const isActive = activeBoneId === b.id;
        ctx.strokeStyle = isActive ? '#ff2d55' : 'rgba(255, 150, 0, 0.9)';
        ctx.lineWidth = 2 / scale;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 6 / scale, 0, Math.PI * 2);
        ctx.stroke();
        const ex = b.x + Math.cos(b.angle) * b.length;
        const ey = b.y + Math.sin(b.angle) * b.length;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.fillStyle = isActive ? '#ff2d55' : '#ffaa00';
        ctx.beginPath();
        ctx.arc(ex, ey, 4 / scale, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [project, activeLayerId, activeBoneId, mode, t, scale]);

  const dragRef = useRef<
    | { kind: 'vertex'; vi: number; lx: number; ly: number }
    | { kind: 'bone'; id: string; lx: number; ly: number }
    | { kind: 'boneEnd'; id: string }
    | null
  >(null);

  const toLocal = (e: React.PointerEvent) => {
    if (!project) return null;
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * project.width;
    const y = ((e.clientY - rect.top) / rect.height) * project.height;
    return { x, y };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!project) return;
    const pt = toLocal(e);
    if (!pt) return;

    if (mode === 'mesh') {
      const mesh = activeLayerId ? project.meshes[activeLayerId] : null;
      if (!mesh) return;
      const hitR = 14;
      let best = -1;
      let bd = hitR * hitR;
      for (let i = 0; i < mesh.vertices.length; i++) {
        const v = mesh.vertices[i];
        const px = v.u * project.width + v.ox;
        const py = v.v * project.height + v.oy;
        const dd = (px - pt.x) ** 2 + (py - pt.y) ** 2;
        if (dd < bd) {
          bd = dd;
          best = i;
        }
      }
      if (best >= 0) {
        dragRef.current = { kind: 'vertex', vi: best, lx: pt.x, ly: pt.y };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }
      return;
    }

    if (mode === 'bone') {
      for (const b of project.skeleton) {
        const ex = b.x + Math.cos(b.angle) * b.length;
        const ey = b.y + Math.sin(b.angle) * b.length;
        if ((b.x - pt.x) ** 2 + (b.y - pt.y) ** 2 < 12 ** 2) {
          useEditor.getState().setActiveBone(b.id);
          dragRef.current = { kind: 'bone', id: b.id, lx: pt.x, ly: pt.y };
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          return;
        }
        if ((ex - pt.x) ** 2 + (ey - pt.y) ** 2 < 12 ** 2) {
          useEditor.getState().setActiveBone(b.id);
          dragRef.current = { kind: 'boneEnd', id: b.id };
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          return;
        }
      }
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!project || !dragRef.current) return;
    const pt = toLocal(e);
    if (!pt) return;
    const d = dragRef.current;
    if (d.kind === 'vertex' && activeLayerId) {
      const dx = pt.x - d.lx;
      const dy = pt.y - d.ly;
      useEditor.getState().dragVertex(activeLayerId, d.vi, dx, dy);
      d.lx = pt.x;
      d.ly = pt.y;
    } else if (d.kind === 'bone') {
      const b = project.skeleton.find((b) => b.id === d.id);
      if (!b) return;
      useEditor.getState().updateBone(d.id, {
        x: b.x + (pt.x - d.lx),
        y: b.y + (pt.y - d.ly),
      });
      d.lx = pt.x;
      d.ly = pt.y;
    } else if (d.kind === 'boneEnd') {
      const b = project.skeleton.find((b) => b.id === d.id);
      if (!b) return;
      const dx = pt.x - b.x;
      const dy = pt.y - b.y;
      useEditor.getState().updateBone(d.id, {
        angle: Math.atan2(dy, dx),
        length: Math.max(10, Math.hypot(dx, dy)),
      });
    }
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    if (!project || mode !== 'mesh' || !activeLayerId) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * project.width;
    const py = ((e.clientY - rect.top) / rect.height) * project.height;
    const mesh = project.meshes[activeLayerId];
    if (!mesh) return;
    const hitR = 14;
    let best = -1;
    let bd = hitR * hitR;
    for (let i = 0; i < mesh.vertices.length; i++) {
      const v = mesh.vertices[i];
      const vx = v.u * project.width + v.ox;
      const vy = v.v * project.height + v.oy;
      const dd = (vx - px) ** 2 + (vy - py) ** 2;
      if (dd < bd) {
        bd = dd;
        best = i;
      }
    }
    if (best >= 0) useEditor.getState().resetVertex(activeLayerId, best);
  };

  return (
    <div
      ref={wrapRef}
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 0,
        position: 'relative',
        background: '#1a1a1a',
        overflow: 'hidden',
      }}
    >
      {project ? (
        <div
          style={{
            position: 'relative',
            width: project.width * scale,
            height: project.height * scale,
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              width: project.width * scale,
              height: project.height * scale,
              display: 'block',
              background:
                'repeating-conic-gradient(#333 0% 25%, #222 0% 50%) 50% / 20px 20px',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onDoubleClick={onDoubleClick}
          />
          <canvas
            ref={overlayRef}
            style={{
              position: 'absolute',
              inset: 0,
              width: project.width * scale,
              height: project.height * scale,
              pointerEvents: 'none',
            }}
          />
        </div>
      ) : (
        <div style={{ color: '#888', fontSize: 14 }}>
          拖入 .psd 或 .mdpz，或按上方按鈕匯入
        </div>
      )}
    </div>
  );
}