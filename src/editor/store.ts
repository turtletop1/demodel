import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  BoneData,
  Keyframe,
  MeshData,
  ParamName,
  Project,
  Track,
} from '@runtime/types';
import { buildGridMesh } from '@runtime/mesh';

/**
 * textures 不進 store — canvas 是 mutable GPU 資源，Immer 的 freeze 會炸。
 * 這裡用 module-level Map，跨元件共用、非反應式。
 */
export const textureRegistry = new Map<string, HTMLCanvasElement>();

export function setTextures(textures: Record<string, HTMLCanvasElement> | null) {
  textureRegistry.clear();
  if (textures) {
    for (const [k, v] of Object.entries(textures)) textureRegistry.set(k, v);
  }
}

export function getTexture(id: string): HTMLCanvasElement | undefined {
  return textureRegistry.get(id);
}

export function allTextures(): Record<string, HTMLCanvasElement> {
  return Object.fromEntries(textureRegistry);
}

type Mode = 'mesh' | 'bone' | 'preview';

interface EditorState {
  project: Project | null;
  activeLayerId: string | null;
  activeBoneId: string | null;
  mode: Mode;
  t: number;
  playing: boolean;
  gridCols: number;
  gridRows: number;

  setProject: (p: Project | null, textures?: Record<string, HTMLCanvasElement>) => void;
  setActiveLayer: (id: string | null) => void;
  setActiveBone: (id: string | null) => void;
  setMode: (m: Mode) => void;
  setT: (t: number) => void;
  setPlaying: (p: boolean) => void;
  setGridDims: (cols: number, rows: number) => void;

  generateMesh: (layerId: string) => void;
  dragVertex: (layerId: string, vi: number, dx: number, dy: number) => void;
  resetVertex: (layerId: string, vi: number) => void;

  addBone: (x: number, y: number, parentId?: string | null) => string;
  updateBone: (id: string, patch: Partial<BoneData>) => void;
  removeBone: (id: string) => void;

  addTrack: (boneId: string, param: ParamName) => void;
  removeTrack: (trackId: string) => void;
  addKey: (trackId: string, t: number, value: number) => void;
  updateKey: (trackId: string, keyIndex: number, patch: Partial<Keyframe>) => void;
  removeKey: (trackId: string, keyIndex: number) => void;
}

export const useEditor = create<EditorState>()(
  immer((set) => ({
    project: null,
    activeLayerId: null,
    activeBoneId: null,
    mode: 'mesh',
    t: 0,
    playing: false,
    gridCols: 16,
    gridRows: 16,

    setProject: (p, textures) =>
      set((s) => {
        s.project = p;
        s.activeLayerId = p?.layers[0]?.id ?? null;
        s.activeBoneId = p?.skeleton[0]?.id ?? null;
        s.t = 0;
        s.playing = false;
        if (textures !== undefined) setTextures(textures);
      }),

    setActiveLayer: (id) =>
      set((s) => {
        s.activeLayerId = id;
      }),
    setActiveBone: (id) =>
      set((s) => {
        s.activeBoneId = id;
      }),
    setMode: (m) =>
      set((s) => {
        s.mode = m;
      }),
    setT: (t) =>
      set((s) => {
        s.t = t;
      }),
    setPlaying: (p) =>
      set((s) => {
        s.playing = p;
      }),
    setGridDims: (cols, rows) =>
      set((s) => {
        s.gridCols = cols;
        s.gridRows = rows;
      }),

    generateMesh: (layerId) =>
      set((s) => {
        if (!s.project) return;
        const { width, height } = s.project;
        const bones = s.project.skeleton.map((b) => ({
          id: b.id,
          x: b.x / width,
          y: b.y / height,
        }));
        s.project.meshes[layerId] = buildGridMesh(s.gridCols, s.gridRows, bones);
      }),

    dragVertex: (layerId, vi, dx, dy) =>
      set((s) => {
        const mesh = s.project?.meshes[layerId];
        if (!mesh) return;
        const v = mesh.vertices[vi];
        v.ox += dx;
        v.oy += dy;
      }),

    resetVertex: (layerId, vi) =>
      set((s) => {
        const mesh = s.project?.meshes[layerId];
        if (!mesh) return;
        mesh.vertices[vi].ox = 0;
        mesh.vertices[vi].oy = 0;
      }),

    addBone: (x, y, parentId = null) => {
      const id = crypto.randomUUID();
      set((s) => {
        if (!s.project) return;
        const bone: BoneData = {
          id,
          name: `bone_${s.project.skeleton.length + 1}`,
          parentId: parentId ?? null,
          x,
          y,
          angle: 0,
          length: 60,
        };
        s.project.skeleton.push(bone);
        s.activeBoneId = id;
      });
      return id;
    },

    updateBone: (id, patch) =>
      set((s) => {
        const b = s.project?.skeleton.find((b) => b.id === id);
        if (!b) return;
        Object.assign(b, patch);
      }),

    removeBone: (id) =>
      set((s) => {
        if (!s.project) return;
        const p = s.project;
        p.skeleton = p.skeleton.filter((b) => b.id !== id);
        for (const b of p.skeleton) if (b.parentId === id) b.parentId = null;
        p.tracks = p.tracks.filter((t) => t.boneId !== id);
        for (const mesh of Object.values(p.meshes)) {
          for (const v of mesh.vertices) delete v.w[id];
        }
        if (s.activeBoneId === id) s.activeBoneId = p.skeleton[0]?.id ?? null;
      }),

    addTrack: (boneId, param) =>
      set((s) => {
        if (!s.project) return;
        const t: Track = {
          id: crypto.randomUUID(),
          boneId,
          param,
          keys: [
            { t: 0, value: param.startsWith('scale') ? 1 : 0, easing: 'easeInOut' },
            { t: 1, value: param.startsWith('scale') ? 1 : 0, easing: 'easeInOut' },
          ],
        };
        s.project.tracks.push(t);
      }),

    removeTrack: (trackId) =>
      set((s) => {
        if (!s.project) return;
        s.project.tracks = s.project.tracks.filter((t) => t.id !== trackId);
      }),

    addKey: (trackId, t, value) =>
      set((s) => {
        const track = s.project?.tracks.find((t) => t.id === trackId);
        if (!track) return;
        track.keys.push({ t, value, easing: 'easeInOut' });
        track.keys.sort((a, b) => a.t - b.t);
      }),

    updateKey: (trackId, keyIndex, patch) =>
      set((s) => {
        const track = s.project?.tracks.find((t) => t.id === trackId);
        if (!track) return;
        Object.assign(track.keys[keyIndex], patch);
        track.keys.sort((a, b) => a.t - b.t);
      }),

    removeKey: (trackId, keyIndex) =>
      set((s) => {
        const track = s.project?.tracks.find((t) => t.id === trackId);
        if (!track) return;
        track.keys.splice(keyIndex, 1);
      }),
  })),
);

export const currentMesh = (s: EditorState): MeshData | null =>
  s.project && s.activeLayerId ? s.project.meshes[s.activeLayerId] ?? null : null;