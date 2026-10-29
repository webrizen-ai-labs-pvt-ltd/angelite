"use client";

import { useEffect, useRef, useState } from "react";
import { autoResize, createProgram, prefersReducedMotion, runWhileVisible } from "./gl";

// A Chladni plate: a square plate vibrating in mode (n, m) has the standing wave
//   ψ(x, y) = cos(nπx)·cos(mπy) − cos(mπx)·cos(nπy).
// Each grain of sand slides down the gradient of ψ² and is kicked in proportion to |ψ|, so it is thrown off the
// moving regions and collects on the nodal lines, exactly as on a real plate. Ink sand on vellum.

const GRAINS = 9000;
export const MODES: [number, number][] = [
    [1, 4],
    [2, 3],
    [2, 5],
    [3, 4],
    [3, 5],
    [1, 6],
    [4, 5],
    [3, 7],
];

const psi = (n: number, m: number, x: number, y: number) =>
    Math.cos(n * Math.PI * x) * Math.cos(m * Math.PI * y) - Math.cos(m * Math.PI * x) * Math.cos(n * Math.PI * y);

const VERTEX = `attribute vec2 a; uniform float uSize; void main(){ gl_Position = vec4(a.x * 2.0 - 1.0, 1.0 - a.y * 2.0, 0.0, 1.0); gl_PointSize = uSize; }`;
const FRAGMENT = `precision mediump float; uniform vec3 uColor; void main(){ vec2 c = gl_PointCoord - 0.5; if (dot(c, c) > 0.25) discard; gl_FragColor = vec4(uColor, 0.85); }`;

export const SandPlate = ({ className, onModeChange }: { className?: string; onModeChange?: (mode: [number, number]) => void }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [supported, setSupported] = useState(true);

    useEffect(() => {
        const canvas = canvasRef.current!;
        const gl = canvas.getContext("webgl", { antialias: true, premultipliedAlpha: false, alpha: true });
        if (!gl) return setSupported(false);
        let program: WebGLProgram;
        try {
            program = createProgram(gl, VERTEX, FRAGMENT);
        } catch {
            return setSupported(false);
        }
        gl.useProgram(program);

        const pos = new Float32Array(GRAINS * 2);
        const vel = new Float32Array(GRAINS * 2);
        for (let i = 0; i < pos.length; i++) pos[i] = Math.random();
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, pos, gl.DYNAMIC_DRAW);
        const location = gl.getAttribLocation(program, "a");
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
        gl.uniform3f(gl.getUniformLocation(program, "uColor"), 0.122, 0.11, 0.141);
        const uSize = gl.getUniformLocation(program, "uSize");
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        let from = MODES[2];
        let to = MODES[2];
        let blend = 1;
        let modeIndex = 2;
        let lastSwitch = performance.now();

        const step = () => {
            const h = 0.0015;
            const w = (x: number, y: number) => (1 - blend) * psi(from[0], from[1], x, y) + blend * psi(to[0], to[1], x, y);
            for (let i = 0; i < GRAINS; i++) {
                const ix = i * 2;
                const iy = ix + 1;
                const x = pos[ix];
                const y = pos[iy];
                const here = w(x, y);
                const gx = (w(x + h, y) ** 2 - w(x - h, y) ** 2) / (2 * h);
                const gy = (w(x, y + h) ** 2 - w(x, y - h) ** 2) / (2 * h);
                const jolt = Math.abs(here) * 0.0045 + 0.0004;
                vel[ix] = vel[ix] * 0.8 - gx * 0.000035 + (Math.random() - 0.5) * jolt;
                vel[iy] = vel[iy] * 0.8 - gy * 0.000035 + (Math.random() - 0.5) * jolt;
                pos[ix] = Math.min(1, Math.max(0, x + vel[ix]));
                pos[iy] = Math.min(1, Math.max(0, y + vel[iy]));
            }
        };

        const draw = () => {
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, pos);
            gl.uniform1f(uSize, Math.max(1.6, canvas.width / 300));
            gl.drawArrays(gl.POINTS, 0, GRAINS);
        };

        const stopResize = autoResize(canvas, gl, 2, draw);
        for (let i = 0; i < 90; i++) step(); // open on a settled pattern rather than noise
        onModeChange?.(to);

        if (prefersReducedMotion()) {
            for (let i = 0; i < 170; i++) step();
            draw();
            return stopResize;
        }

        const stopLoop = runWhileVisible(canvas, (now) => {
            if (now - lastSwitch > 6500) {
                modeIndex = (modeIndex + 1) % MODES.length;
                from = to;
                to = MODES[modeIndex];
                blend = 0;
                lastSwitch = now;
                onModeChange?.(to);
            }
            blend = Math.min(1, blend + 0.02);
            step();
            draw();
        });
        return () => {
            stopLoop();
            stopResize();
        };
    }, [onModeChange]);

    return supported ? <canvas ref={canvasRef} className={className} aria-hidden="true" /> : <div className={className} />;
};
