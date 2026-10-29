"use client";

import { useEffect, useRef } from "react";
import { ArrowRight } from "@untitledui/icons";
import Link from "next/link";
import { FULLSCREEN_VERTEX, autoResize, createProgram, fullscreenTriangle, prefersReducedMotion, runWhileVisible } from "./gl";

// Closing card: an ink field with a slow angelite aurora, drawn as overlapping sound-wave interference.

const AURORA = `
precision highp float;
varying vec2 uv;
uniform vec2 uRes;
uniform float uTime;
void main(){
    vec2 p = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
    // Two travelling waves interfere; their crest lines glow like a halo.
    float w1 = sin(p.x * 3.2 + uTime * 0.35 + sin(p.y * 2.0 + uTime * 0.2) * 1.4);
    float w2 = sin(p.x * 2.1 - p.y * 3.0 - uTime * 0.25);
    float field = (w1 + w2) * 0.5;
    float glow = smoothstep(0.2, 1.0, field) * smoothstep(1.1, 0.0, length(p - vec2(0.35, -0.25)));
    float line = 1.0 - smoothstep(0.0, 0.035, abs(field - 0.55));
    vec3 ink = vec3(0.122, 0.11, 0.141);
    vec3 angelite = vec3(0.604, 0.659, 0.910);
    vec3 deep = vec3(0.396, 0.455, 0.769);
    vec3 col = ink + deep * glow * 0.85 + angelite * line * 0.55 * smoothstep(1.3, 0.1, length(p));
    gl_FragColor = vec4(col, 1.0);
}`;

export const CtaCard = ({ signedIn }: { signedIn: boolean }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current!;
        const gl = canvas.getContext("webgl", { antialias: false });
        if (!gl) return;
        let program: WebGLProgram;
        try {
            program = createProgram(gl, FULLSCREEN_VERTEX, AURORA);
        } catch {
            return;
        }
        gl.useProgram(program);
        fullscreenTriangle(gl, program);
        const uRes = gl.getUniformLocation(program, "uRes");
        const uTime = gl.getUniformLocation(program, "uTime");
        const draw = (now: number) => {
            gl.uniform2f(uRes, canvas.width, canvas.height);
            gl.uniform1f(uTime, now / 1000);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        };
        const stopResize = autoResize(canvas, gl, 1.25, () => draw(4000));
        if (prefersReducedMotion()) return stopResize;
        const stopLoop = runWhileVisible(canvas, draw);
        return () => {
            stopLoop();
            stopResize();
        };
    }, []);

    return (
        <section className="px-3 pt-8 pb-16 md:px-4 md:pb-24">
            <div className="relative mx-auto max-w-[1240px] overflow-hidden rounded-[32px] bg-ink">
                <canvas ref={canvasRef} className="absolute inset-0 size-full" aria-hidden="true" />
                <div className="relative flex flex-col items-center gap-6 px-6 py-20 text-center md:py-28">
                    <h2 className="mkt-display max-w-3xl text-[clamp(2.25rem,5.5vw,4.25rem)] text-vellum">Write something. Hear it in your own voice.</h2>
                    <p className="max-w-lg text-[18px] leading-relaxed text-vellum/70">Free to start, with no card. Cloning on your device has no limit.</p>
                    <Link
                        href={signedIn ? "/studio" : "/sign-up"}
                        className="mt-2 flex items-center gap-3 rounded-full bg-vellum py-2 pr-2 pl-6 text-[15px] font-medium text-ink transition hover:bg-angelite"
                    >
                        {signedIn ? "Open Studio" : "Create a free account"}
                        <span className="flex size-8 items-center justify-center rounded-full bg-ink text-vellum">
                            <ArrowRight className="size-4" aria-hidden="true" />
                        </span>
                    </Link>
                </div>
            </div>
        </section>
    );
};
