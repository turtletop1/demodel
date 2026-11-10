import type { MeshData } from '../types';

export class LayerGL {
  posBuf: WebGLBuffer;
  uvBuf: WebGLBuffer;
  idxBuf: WebGLBuffer;
  tex: WebGLTexture;
  indexCount: number;
  private posSize = 0;

  constructor(
    private gl: WebGL2RenderingContext,
    public mesh: MeshData,
    canvas: HTMLCanvasElement,
  ) {
    this.posBuf = gl.createBuffer()!;
    this.uvBuf = gl.createBuffer()!;
    this.idxBuf = gl.createBuffer()!;
    this.tex = gl.createTexture()!;

    const uv = new Float32Array(mesh.vertices.length * 2);
    for (let i = 0; i < mesh.vertices.length; i++) {
      uv[i * 2] = mesh.vertices[i].u;
      uv[i * 2 + 1] = mesh.vertices[i].v;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuf);
    gl.bufferData(gl.ARRAY_BUFFER, uv, gl.STATIC_DRAW);

    const idx = new Uint16Array(mesh.indices);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.idxBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    this.indexCount = idx.length;

    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  updatePositions(positions: Float32Array) {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
    const bytes = positions.byteLength;
    if (bytes !== this.posSize) {
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
      this.posSize = bytes;
    } else {
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, positions);
    }
  }

  draw(aPos: number, aUV: number, uTex: WebGLUniformLocation, uAlpha: WebGLUniformLocation, alpha: number) {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aPos);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuf);
    gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aUV);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.idxBuf);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.uniform1i(uTex, 0);
    gl.uniform1f(uAlpha, alpha);
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
  }

  dispose() {
    const gl = this.gl;
    gl.deleteBuffer(this.posBuf);
    gl.deleteBuffer(this.uvBuf);
    gl.deleteBuffer(this.idxBuf);
    gl.deleteTexture(this.tex);
  }
}