"use client";

import { type RefObject, useEffect, useRef } from "react";
import { FULLSCREEN_VERTEX, autoResize, createProgram, fullscreenTriangle, loudness, prefersReducedMotion, runWhileVisible } from "./gl";

// Marbled-paper shader (suminagashi), used by the home hero and the sign-in pages. Ink and vellum swirl through each other with thin angelite veins,
// in the brand's 90/10 balance. When a voice plays, its loudness stirs the marbling.

const MARBLE = `
precision highp float;
varying vec2 uv;
uniform vec2 uRes;
uniform float uTime;
uniform float uStir;
uniform vec2 uMouse;

float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
float noise(vec2 p){
    vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ v += a * noise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p; a *= 0.5; } return v; }

void main(){
    vec2 p = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
    vec2 m = (uMouse - 0.5) * vec2(uRes.x / uRes.y, 1.0);

    // A vortex that leans toward the pointer and turns harder while a voice speaks: the stylus dragged through the bath.
    vec2 d = p - m * 0.4;
    float r = length(d);
    float a = (2.4 + uStir * 3.0) * exp(-r * 1.25) + uTime * 0.05;
    p = m * 0.4 + mat2(cos(a), -sin(a), sin(a), cos(a)) * d;

    // Two rounds of domain warping fold straight stripes into the combed shapes of marbled paper.
    vec2 q = p + 0.4 * vec2(fbm(p * 1.1 + uTime * 0.04), fbm(p * 1.1 + 3.1 - uTime * 0.035)) - 0.2;
    q += 0.2 * vec2(fbm(q * 1.5 + 7.0), fbm(q * 1.5 + 1.3)) - 0.1;
    float v = q.x * 1.15 + q.y * 0.55 + 0.8 * fbm(q * 1.2 + 2.0);
    float t = fract(v * 2.3);

    vec3 vellum = vec3(0.945, 0.929, 0.894);
    vec3 card = vec3(0.973, 0.965, 0.945);
    vec3 deepVellum = vec3(0.902, 0.878, 0.827);
    vec3 ink = vec3(0.122, 0.11, 0.141);
    vec3 angelite = vec3(0.604, 0.659, 0.910);
    vec3 deep = vec3(0.396, 0.455, 0.769);

    // Paint bands across each stripe: mostly vellum, thin ink and angelite lines (the brand's 90/10 balance).
    float e = 0.006;
    vec3 col = vellum;
    col = mix(col, card, smoothstep(0.08, 0.08 + e, t) - smoothstep(0.34, 0.34 + e, t));
    col = mix(col, ink, smoothstep(0.34, 0.34 + e, t) - smoothstep(0.375, 0.375 + e, t));
    col = mix(col, deepVellum, smoothstep(0.375, 0.375 + e, t) - smoothstep(0.52, 0.52 + e, t));
    col = mix(col, deep, smoothstep(0.52, 0.52 + e, t) - smoothstep(0.545, 0.545 + e, t));
    col = mix(col, angelite, smoothstep(0.545, 0.545 + e, t) - smoothstep(0.6, 0.6 + e, t));
    col = mix(col, card, smoothstep(0.6, 0.6 + e, t) - smoothstep(0.86, 0.86 + e, t));
    col = mix(col, ink, (smoothstep(0.93, 0.93 + e, t) - smoothstep(0.945, 0.945 + e, t)) * 0.8);

    // Paper grain
    col += (hash(uv * uRes) - 0.5) * 0.02;
    gl_FragColor = vec4(col, 1.0);
}`;

/** Fills its parent with the marbling. Pass an analyser to let a playing voice stir it. */
export const MarbleCanvas = ({ analyserRef, className }: { analyserRef?: RefObject<AnalyserNode | null>; className?: string }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current!;
        const gl = canvas.getContext("webgl", { antialias: false });
        if (!gl) return;
        let program: WebGLProgram;
        try {
            program = createProgram(gl, FULLSCREEN_VERTEX, MARBLE);
        } catch {
            return;
        }
        gl.useProgram(program);
        fullscreenTriangle(gl, program);
        const [uRes, uTime, uStir, uMouse] = ["uRes", "uTime", "uStir", "uMouse"].map((name) => gl.getUniformLocation(program, name));
        const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
        const samples = new Float32Array(1024);
        let stir = 0;
        let clock = 0;
        let last = performance.now();

        const draw = (now: number) => {
            const level = analyserRef?.current ? loudness(analyserRef.current, samples) : 0;
            stir += (level - stir) * (level > stir ? 0.3 : 0.04);
            clock += ((now - last) / 1000) * (1 + stir * 5); // speech speeds the flow up
            last = now;
            mouse.x += (mouse.tx - mouse.x) * 0.03;
            mouse.y += (mouse.ty - mouse.y) * 0.03;
            gl.uniform2f(uRes, canvas.width, canvas.height);
            gl.uniform1f(uTime, clock + 20);
            gl.uniform1f(uStir, stir);
            gl.uniform2f(uMouse, mouse.x, mouse.y);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        };

        const stopResize = autoResize(canvas, gl, 1.25, () => draw(performance.now()));
        const onMove = (event: PointerEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouse.tx = (event.clientX - rect.left) / rect.width;
            mouse.ty = 1 - (event.clientY - rect.top) / rect.height;
        };
        window.addEventListener("pointermove", onMove, { passive: true });

        if (prefersReducedMotion()) {
            draw(performance.now());
            return () => {
                stopResize();
                window.removeEventListener("pointermove", onMove);
            };
        }
        const stopLoop = runWhileVisible(canvas, draw);
        return () => {
            stopLoop();
            stopResize();
            window.removeEventListener("pointermove", onMove);
        };
    }, [analyserRef]);

    return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
};
