import type { BoneData, Mat, Track, ParamName } from './types';

const identity = (): Mat => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });

function mul(m: Mat, n: Mat): Mat {
  return {
    a: m.a * n.a + m.c * n.b,
    b: m.b * n.a + m.d * n.b,
    c: m.a * n.c + m.c * n.d,
    d: m.b * n.c + m.d * n.d,
    e: m.a * n.e + m.c * n.f + m.e,
    f: m.b * n.e + m.d * n.f + m.f,
  };
}

function trs(x: number, y: number, angle: number, sx: number, sy: number): Mat {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { a: c * sx, b: s * sx, c: -s * sy, d: c * sy, e: x, f: y };
}

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export function sampleTrack(track: Track, t: number): number {
  const k = track.keys;
  if (k.length === 0) return 0;
  if (t <= k[0].t) return k[0].value;
  if (t >= k[k.length - 1].t) return k[k.length - 1].value;
  for (let i = 0; i < k.length - 1; i++) {
    const a = k[i];
    const b = k[i + 1];
    if (t <= b.t) {
      let alpha = (t - a.t) / Math.max(1e-6, b.t - a.t);
      if (b.easing === 'easeInOut') alpha = easeInOut(alpha);
      return a.value + (b.value - a.value) * alpha;
    }
  }
  return k[k.length - 1].value;
}

interface LocalPose {
  tx: number;
  ty: number;
  angle: number;
  sx: number;
  sy: number;
}

export function evaluateBones(
  bones: BoneData[],
  tracks: Track[],
  t: number,
): { world: Record<string, Mat>; opacity: Record<string, number> } {
  const local: Record<string, LocalPose> = {};
  const opacity: Record<string, number> = {};
  for (const b of bones) {
    local[b.id] = { tx: b.x, ty: b.y, angle: b.angle, sx: 1, sy: 1 };
  }
  for (const track of tracks) {
    const value = sampleTrack(track, t);
    const L = local[track.boneId];
    if (!L) continue;
    switch (track.param as ParamName) {
      case 'angle':
        L.angle += value;
        break;
      case 'translateX':
        L.tx += value;
        break;
      case 'translateY':
        L.ty += value;
        break;
      case 'scaleX':
        L.sx *= value === 0 ? 1 : value;
        break;
      case 'scaleY':
        L.sy *= value === 0 ? 1 : value;
        break;
      case 'opacity':
        opacity[track.boneId] = (opacity[track.boneId] ?? 1) * value;
        break;
    }
  }

  const byId = new Map(bones.map((b) => [b.id, b]));
  const world: Record<string, Mat> = {};
  const visiting = new Set<string>();

  const compute = (id: string): Mat => {
    const cached = world[id];
    if (cached) return cached;
    if (visiting.has(id)) return identity();
    visiting.add(id);

    const b = byId.get(id);
    if (!b) {
      visiting.delete(id);
      return identity();
    }
    const L = local[id];
    const localMat = trs(L.tx, L.ty, L.angle, L.sx, L.sy);

    let m: Mat;
    if (b.parentId) {
      const parent = byId.get(b.parentId);
      if (parent) {
        const pw = compute(b.parentId);
        // parent 的世界位移 + 本骨相對位移
        const rel = trs(L.tx - parent.x, L.ty - parent.y, 0, 1, 1);
        m = mul(pw, mul(rel, trs(0, 0, L.angle, L.sx, L.sy)));
        // 補回本地轉動，讓 angle 世界位置對齊
        m = {
          ...m,
          e: m.e,
          f: m.f,
        };
      } else {
        m = localMat;
      }
    } else {
      m = localMat;
    }
    world[id] = m;
    visiting.delete(id);
    return m;
  };

  for (const b of bones) compute(b.id);
  return { world, opacity };
}

export function restWorldMatrices(bones: BoneData[]): Record<string, Mat> {
  return evaluateBones(bones, [], 0).world;
}