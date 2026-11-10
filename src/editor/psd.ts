import { readPsd, initializeCanvas } from 'ag-psd';
import type { Project } from '@runtime/types';

initializeCanvas(
  (w, h) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  },
  () => document.createElement('canvas'),
);

function mapBlend(mode?: string): 'normal' | 'multiply' | 'screen' | 'add' {
  switch (mode) {
    case 'multiply':
      return 'multiply';
    case 'screen':
      return 'screen';
    case 'linear dodge':
    case 'add':
      return 'add';
    default:
      return 'normal';
  }
}

export interface PSDImport {
  project: Project;
  textures: Record<string, HTMLCanvasElement>;
}

export async function importPSD(file: File): Promise<PSDImport> {
  const buf = await file.arrayBuffer();
  const psd = readPsd(buf, {
    skipLayerImageData: false,
    skipCompositeImageData: true,
    skipThumbnail: true,
  });

  const W = psd.width;
  const H = psd.height;
  const layers: Project['layers'] = [];
  const textures: Record<string, HTMLCanvasElement> = {};

  const walk = (nodes: any[]) => {
    for (const n of nodes) {
      if (n.children && n.children.length > 0) {
        walk(n.children);
        continue;
      }
      if (!n.canvas) continue;
      if (!n.name) continue;
      if (n.hidden && n.opacity === 0) continue;

      const id = crypto.randomUUID();
      const flat = document.createElement('canvas');
      flat.width = W;
      flat.height = H;
      const ctx = flat.getContext('2d')!;
      ctx.drawImage(n.canvas, n.left ?? 0, n.top ?? 0);

      textures[id] = flat;
      layers.push({
        id,
        name: n.name,
        texture: `textures/${id}.png`,
        visible: !n.hidden,
        opacity: n.opacity != null ? n.opacity / 255 : 1,
        blendMode: mapBlend(n.blendMode),
      });
    }
  };
  walk(psd.children ?? []);

  if (layers.length === 0) {
    throw new Error('PSD 中找不到可用的點陣圖層');
  }

  const project: Project = {
    version: 2,
    width: W,
    height: H,
    fps: 24,
    durationMs: 2000,
    layers,
    meshes: {},
    skeleton: [],
    tracks: [],
  };

  return { project, textures };
}