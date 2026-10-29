// Small WebGL helpers shared by the marketing shaders.

export function createProgram(gl: WebGLRenderingContext, vertex: string, fragment: string) {
    const compile = (type: number, source: string) => {
        const shader = gl.createShader(type)!;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "Shader failed to compile");
        return shader;
    };
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(program);
    return program;
}

/** A full-screen triangle bound to attribute `p`. */
export function fullscreenTriangle(gl: WebGLRenderingContext, program: WebGLProgram) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const location = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
    return buffer;
}

export const FULLSCREEN_VERTEX = `attribute vec2 p; varying vec2 uv; void main(){ uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

/** Keeps a canvas's drawing buffer matched to its CSS size. Returns a cleanup function. */
export function autoResize(canvas: HTMLCanvasElement, gl: WebGLRenderingContext, maxScale = 1.5, onResize?: () => void) {
    const resize = () => {
        const scale = Math.min(window.devicePixelRatio, maxScale);
        canvas.width = Math.max(1, Math.round(canvas.clientWidth * scale));
        canvas.height = Math.max(1, Math.round(canvas.clientHeight * scale));
        gl.viewport(0, 0, canvas.width, canvas.height);
        onResize?.();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
}

/** Calls `frame` every animation frame while the element is on screen and the tab is visible. */
export function runWhileVisible(element: Element, frame: (now: number) => void) {
    let visible = true;
    const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
    io.observe(element);
    let id = 0;
    const loop = (now: number) => {
        id = requestAnimationFrame(loop);
        if (visible && !document.hidden) frame(now);
    };
    id = requestAnimationFrame(loop);
    return () => {
        cancelAnimationFrame(id);
        io.disconnect();
    };
}

export const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Loudness (RMS, 0–1) of an analyser's current window. */
export function loudness(analyser: AnalyserNode, buffer: Float32Array<ArrayBuffer>) {
    analyser.getFloatTimeDomainData(buffer);
    let sum = 0;
    for (const sample of buffer) sum += sample * sample;
    return Math.min(1, Math.sqrt(sum / buffer.length) * 6);
}
