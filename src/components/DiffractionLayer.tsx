import { useEffect, useRef, type RefObject } from "react";

const VS = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FS = `
precision highp float;
uniform vec2 u_res;
uniform vec2 u_light;
uniform float u_time;

vec3 hue(float h) {
  return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 p = (uv * 2.0 - 1.0);
  p.x *= u_res.x / max(u_res.y, 1.0);

  vec3 V = normalize(vec3(p, 1.4));
  vec3 N = normalize(vec3((u_light - 0.5) * 0.85, 1.0));
  float ndv = pow(max(0.0, dot(N, V)), 1.25);

  float g1 = dot(uv, vec2(42.0, 4.0)) + u_light.x * 7.0;
  float g2 = dot(uv, vec2(-9.0, 31.0)) + u_light.y * 5.5 + u_time * 0.14;
  float spec = 0.55 * sin(g1 * 6.28318) + 0.45 * sin(g2 * 6.28318);
  float h = fract(0.58 + spec * 0.2 + ndv * 0.32 + u_light.x * 0.18);
  vec3 rainbow = hue(h);

  vec2 sp = uv * vec2(38.0, 58.0);
  vec2 id = floor(sp);
  vec2 f = fract(sp) - 0.5;
  float n = fract(sin(dot(id, vec2(127.1, 311.7))) * 43758.5453);
  float tw = 0.5 + 0.5 * sin(u_time * 3.2 + n * 40.0);
  float star = smoothstep(0.16, 0.0, length(f)) * step(0.84, n) * tw;

  float foil = 0.18 + 0.82 * pow(ndv, 0.55) * (0.4 + 0.6 * spec);
  vec3 col = rainbow * foil + vec3(star * 1.35);
  float alpha = 0.38 + 0.32 * ndv + star * 0.45;
  gl_FragColor = vec4(col, alpha);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

type Props = {
  hostRef: RefObject<HTMLDivElement | null>;
};

export function DiffractionLayer({ hostRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
    });
    if (!gl) return;

    const surface = canvas;
    const card = host;
    const ctx = gl;

    const vs = compile(ctx, ctx.VERTEX_SHADER, VS);
    const fs = compile(ctx, ctx.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return;

    const program = ctx.createProgram();
    if (!program) return;
    ctx.attachShader(program, vs);
    ctx.attachShader(program, fs);
    ctx.linkProgram(program);
    if (!ctx.getProgramParameter(program, ctx.LINK_STATUS)) return;
    ctx.useProgram(program);

    const buf = ctx.createBuffer();
    ctx.bindBuffer(ctx.ARRAY_BUFFER, buf);
    ctx.bufferData(
      ctx.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      ctx.STATIC_DRAW,
    );
    const loc = ctx.getAttribLocation(program, "a_pos");
    ctx.enableVertexAttribArray(loc);
    ctx.vertexAttribPointer(loc, 2, ctx.FLOAT, false, 0, 0);

    const uRes = ctx.getUniformLocation(program, "u_res");
    const uLight = ctx.getUniformLocation(program, "u_light");
    const uTime = ctx.getUniformLocation(program, "u_time");

    let raf = 0;
    let alive = true;
    const t0 = performance.now();

    function resize() {
      const rect = card.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (surface.width !== w || surface.height !== h) {
        surface.width = w;
        surface.height = h;
      }
    }

    function lightFromHost() {
      const style = getComputedStyle(card);
      const x = Number.parseFloat(style.getPropertyValue("--px")) || 42;
      const y = Number.parseFloat(style.getPropertyValue("--py")) || 38;
      return [x / 100, 1 - y / 100] as const;
    }

    function frame(now: number) {
      if (!alive) return;
      resize();
      const [lx, ly] = lightFromHost();
      ctx.viewport(0, 0, surface.width, surface.height);
      ctx.clearColor(0, 0, 0, 0);
      ctx.clear(ctx.COLOR_BUFFER_BIT);
      ctx.uniform2f(uRes, surface.width, surface.height);
      ctx.uniform2f(uLight, lx, ly);
      ctx.uniform1f(uTime, (now - t0) / 1000);
      ctx.drawArrays(ctx.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ctx.deleteProgram(program);
      ctx.deleteShader(vs);
      ctx.deleteShader(fs);
      if (buf) ctx.deleteBuffer(buf);
    };
  }, [hostRef]);

  return <canvas ref={canvasRef} className="foil-shader" aria-hidden="true" />;
}
