export type ParamName =
  | 'angle'
  | 'scaleX'
  | 'scaleY'
  | 'translateX'
  | 'translateY'
  | 'opacity';

export interface VertexData {
  u: number;
  v: number;
  ox: number;
  oy: number;
  w: Record<string, number>;
}

export interface MeshData {
  cols: number;
  rows: number;
  vertices: VertexData[];
  indices: number[];
}

export interface BoneData {
  id: string;
  name: string;
  parentId: string | null;
  x: number;
  y: number;
  angle: number;
  length: number;
}

export interface Keyframe {
  t: number;
  value: number;
  easing: 'linear' | 'easeInOut';
}

export interface Track {
  id: string;
  boneId: string;
  param: ParamName;
  keys: Keyframe[];
}

export interface LayerData {
  id: string;
  name: string;
  texture: string;
  visible: boolean;
  opacity: number;
  blendMode: 'normal' | 'multiply' | 'screen' | 'add';
}

export interface Project {
  version: 2;
  width: number;
  height: number;
  fps: number;
  durationMs: number;
  layers: LayerData[];
  meshes: Record<string, MeshData>;
  skeleton: BoneData[];
  tracks: Track[];
}

export interface LoadedProject {
  project: Project;
  textures: Record<string, HTMLCanvasElement>;
}

export type Mat = { a: number; b: number; c: number; d: number; e: number; f: number };