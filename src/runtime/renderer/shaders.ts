export const VS = `#version 300 es
in vec2 aPos;
in vec2 aUV;
uniform vec2 uRes;
out vec2 vUV;
void main() {
  vUV = aUV;
  vec2 p = aPos / uRes;
  gl_Position = vec4(p.x * 2.0 - 1.0, 1.0 - p.y * 2.0, 0.0, 1.0);
}`;

export const FS = `#version 300 es
precision mediump float;
in vec2 vUV;
uniform sampler2D uTex;
uniform float uAlpha;
out vec4 outColor;
void main() {
  vec4 c = texture(uTex, vUV);
  outColor = vec4(c.rgb, c.a * uAlpha);
}`;