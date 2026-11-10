import { deformMesh } from '../deform';
import type { Mat, Project } from '../types';
import { LayerGL } from './LayerGL';
import { FS, VS } from './shaders';

export type TextureSource = Record<string, HTMLCanvasElement> | Map<string, HTMLCanvasElement>;

function getTex(src: TextureSource, id: string): HTMLCanvasElement | undefined {
  return src instanceof Map ? src.get(id) : src[id];
}

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s);
    throw new Error(`shader: ${log}`);
  }
  return s;
}

export class Renderer {
  private gl: WebGL2RenderingContext;
  private prog: WebGLProgram;
  private aPos: number;
  private aUV: number;
  private uRes: WebGLUniformLocation;
  private uTex: WebGLUniformLocation;
  private uAlpha: WebGLUniformLocation;

  private layers = new Map<string, LayerGL>();
  private scratch = new Map<string, Float32Array>();

  constructor(public canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
      antialias: true,
    });
    if (!gl) throw new Error('WebGL2 不可用');
    this.gl = gl;

    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(prog) ?? 'link failed');
    }
    this.prog = prog;
    gl.useProgram(prog);

    this.aPos = gl.getAttribLocation(prog, 'aPos');
    this.aUV = gl.getAttribLocation(prog, 'aUV');
    this.uRes = gl.getUniformLocation(prog, 'uRes')!;
    this.uTex = gl.getUniformLocation(prog, 'uTex')!;
    this.uAlpha = gl.getUniformLocation(prog, 'uAlpha')!;

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  resize(width: number, height: number, dpr = window.devicePixelRatio || 1) {
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.gl.useProgram(this.prog);
    this.gl.uniform2f(this.uRes, width, height);
  }

  syncLayers(project: Project, textures: TextureSource) {
    const gl = this.gl;
    const seen = new Set<string>();
    for (const l of project.layers) {
      seen.add(l.id);
      const mesh = project.meshes[l.id];
      const tex = getTex(textures, l.id);
      if (!mesh || !tex) continue;
      const existing = this.layers.get(l.id);
      const prevMesh = (existing as any)?.__meshRef;
      if (!existing || prevMesh !== mesh) {
        existing?.dispose();
        const created = new LayerGL(gl, mesh, tex);
        (created as any).__meshRef = mesh;
        this.layers.set(l.id, created);
      }
    }
    for (const id of Array.from(this.layers.keys())) {
      if (!seen.has(id)) {
        this.layers.get(id)!.dispose();
        this.layers.delete(id);
        this.scratch.delete(id);
      }
    }
  }

  draw(
    project: Project,
    animWorld: Record<string, Mat>,
    restWorld: Record<string, Mat>,
    layerOpacity: Record<string, number> = {},
  ) {
    const gl = this.gl;
    gl.useProgram(this.prog);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    for (let i = project.layers.length - 1; i >= 0; i--) {
      const layer = project.layers[i];
      if (!layer.visible) continue;
      const lg = this.layers.get(layer.id);
      const mesh = project.meshes[layer.id];
      if (!lg || !mesh) continue;

      const positions = deformMesh(
        mesh,
        animWorld,
        restWorld,
        project.width,
        project.height,
        this.scratch.get(layer.id),
      );
      this.scratch.set(layer.id, positions);
      lg.updatePositions(positions);

      const boneOpacity = layerOpacity[layer.id] ?? 1;
      lg.draw(this.aPos, this.aUV, this.uTex, this.uAlpha, layer.opacity * boneOpacity);
    }
  }
}