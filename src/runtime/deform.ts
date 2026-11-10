import type { Mat, MeshData } from './types';

export function deformMesh(
  mesh: MeshData,
  animWorld: Record<string, Mat>,
  restWorld: Record<string, Mat>,
  texW: number,
  texH: number,
  out?: Float32Array,
): Float32Array {
  const deltas: Record<string, Mat> = {};
  for (const id in animWorld) {
    const wa = animWorld[id];
    const wr = restWorld[id];
    if (!wr) {
      deltas[id] = wa;
      continue;
    }
    const det = wr.a * wr.d - wr.b * wr.c;
    if (Math.abs(det) < 1e-9) {
      deltas[id] = wa;
      continue;
    }
    const inv: Mat = {
      a:  wr.d / det,
      b: -wr.b / det,
      c: -wr.c / det,
      d:  wr.a / det,
      e:  (wr.c * wr.f - wr.d * wr.e) / det,
      f:  (wr.b * wr.e - wr.a * wr.f) / det,
    };
    deltas[id] = {
      a: wa.a * inv.a + wa.c * inv.b,
      b: wa.b * inv.a + wa.d * inv.b,
      c: wa.a * inv.c + wa.c * inv.d,
      d: wa.b * inv.c + wa.d * inv.d,
      e: wa.a * inv.e + wa.c * inv.f + wa.e,
      f: wa.b * inv.e + wa.d * inv.f + wa.f,
    };
  }

  const n = mesh.vertices.length;
  const buf = out && out.length === n * 2 ? out : new Float32Array(n * 2);

  for (let i = 0; i < n; i++) {
    const v = mesh.vertices[i];
    const px = v.u * texW + v.ox;
    const py = v.v * texH + v.oy;

    let x = 0;
    let y = 0;
    let ws = 0;
    for (const bid in v.w) {
      const w = v.w[bid];
      if (!w) continue;
      const m = deltas[bid];
      if (!m) continue;
      x += w * (m.a * px + m.c * py + m.e);
      y += w * (m.b * px + m.d * py + m.f);
      ws += w;
    }
    if (ws < 1e-6) {
      x = px;
      y = py;
    } else {
      x /= ws;
      y /= ws;
    }
    buf[i * 2] = x;
    buf[i * 2 + 1] = y;
  }
  return buf;
}