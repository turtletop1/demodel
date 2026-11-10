import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import type { LoadedProject, Project } from './types';

export async function canvasToPng(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'),
  );
  return new Uint8Array(await blob.arrayBuffer());
}

export async function serializeProject(
  project: Project,
  textures: Record<string, HTMLCanvasElement>,
): Promise<Blob> {
  const files: Record<string, Uint8Array> = {};
  const layers = project.layers.map((l) => ({ ...l }));
  for (const l of layers) {
    const canvas = textures[l.id];
    if (!canvas) continue;
    const path = `textures/${l.id}.png`;
    files[path] = await canvasToPng(canvas);
    l.texture = path;
  }
  const json: Project = { ...project, layers };
  files['project.json'] = strToU8(JSON.stringify(json));
  return new Blob([zipSync(files, { level: 6 })], { type: 'application/zip' });
}

export async function deserializeProject(buf: ArrayBuffer): Promise<LoadedProject> {
  const entries = unzipSync(new Uint8Array(buf));
  const jsonText = entries['project.json'];
  if (!jsonText) throw new Error('project.json 缺失');
  const project = JSON.parse(strFromU8(jsonText)) as Project;

  const textures: Record<string, HTMLCanvasElement> = {};
  for (const l of project.layers) {
    const bytes = entries[l.texture];
    if (!bytes) continue;
    const blob = new Blob([bytes], { type: 'image/png' });
    const bmp = await createImageBitmap(blob);
    const c = document.createElement('canvas');
    c.width = bmp.width;
    c.height = bmp.height;
    c.getContext('2d')!.drawImage(bmp, 0, 0);
    textures[l.id] = c;
    bmp.close?.();
  }
  return { project, textures };
}