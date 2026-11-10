import type { MeshData, VertexData } from './types';

export function buildGridMesh(
  cols: number,
  rows: number,
  bones: { id: string; x: number; y: number }[],
): MeshData {
  const vertices: VertexData[] = [];
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      const u = c / cols;
      const v = r / rows;
      vertices.push({
        u,
        v,
        ox: 0,
        oy: 0,
        w: autoWeight(u, v, bones),
      });
    }
  }
  const indices: number[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const a = r * (cols + 1) + c;
      const b = a + 1;
      const d = a + cols + 1;
      const e = d + 1;
      indices.push(a, d, b, b, d, e);
    }
  }
  return { cols, rows, vertices, indices };
}

function autoWeight(
  u: number,
  v: number,
  bones: { id: string; x: number; y: number }[],
): Record<string, number> {
  if (bones.length === 0) return {};
  const top = bones
    .map((b) => ({ id: b.id, d: (b.x - u) ** 2 + (b.y - v) ** 2 }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 2);
  const eps = 1e-3;
  const inv = top.map((t) => 1 / (t.d + eps));
  const sum = inv.reduce((a, b) => a + b, 0);
  const w: Record<string, number> = {};
  top.forEach((t, i) => {
    w[t.id] = inv[i] / sum;
  });
  return w;
}