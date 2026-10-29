import type { EffectId } from "../script";

// Web Audio versions of the server's ffmpeg effects (EFFECTS in services/inference/app.py), for on-device audio.

type Echo = { delayMs: number; gain: number };

const ECHOES: Partial<Record<EffectId, Echo[]>> = {
    room: [
        { delayMs: 20, gain: 0.25 },
        { delayMs: 37, gain: 0.18 },
    ],
    hall: [
        { delayMs: 60, gain: 0.35 },
        { delayMs: 110, gain: 0.28 },
        { delayMs: 170, gain: 0.2 },
        { delayMs: 240, gain: 0.12 },
    ],
    echo: [{ delayMs: 300, gain: 0.4 }],
};

const BANDS: Partial<Record<EffectId, { low: number; high: number; compress: number; makeup: number }>> = {
    telephone: { low: 300, high: 3400, compress: 4, makeup: 2 },
    radio: { low: 180, high: 6000, compress: 6, makeup: 3 },
};

/** Returns a processed copy of mono `samples`. Echo tails make the result slightly longer. */
export async function applyEffect(samples: Float32Array, sampleRate: number, effect: EffectId): Promise<Float32Array> {
    if (effect === "none" || samples.length === 0) return samples;

    const echoes = ECHOES[effect] ?? [];
    const tail = echoes.length ? Math.ceil((Math.max(...echoes.map((echo) => echo.delayMs)) / 1000) * sampleRate) : 0;
    const context = new OfflineAudioContext(1, samples.length + tail, sampleRate);
    const buffer = context.createBuffer(1, samples.length, sampleRate);
    buffer.copyToChannel(new Float32Array(samples), 0);
    const source = context.createBufferSource();
    source.buffer = buffer;

    if (echoes.length) {
        // ffmpeg aecho: dry * 0.8 plus each delayed copy at its decay.
        const dry = context.createGain();
        dry.gain.value = 0.8;
        source.connect(dry).connect(context.destination);
        for (const echo of echoes) {
            const delay = context.createDelay(1);
            delay.delayTime.value = echo.delayMs / 1000;
            const gain = context.createGain();
            gain.gain.value = echo.gain * 0.8;
            source.connect(delay).connect(gain).connect(context.destination);
        }
    }

    const band = BANDS[effect];
    if (band) {
        const highpass = new BiquadFilterNode(context, { type: "highpass", frequency: band.low });
        const lowpass = new BiquadFilterNode(context, { type: "lowpass", frequency: band.high });
        const compressor = new DynamicsCompressorNode(context, { threshold: -20, ratio: band.compress, attack: 0.005, release: 0.1 });
        const makeup = new GainNode(context, { gain: band.makeup });
        source.connect(highpass).connect(lowpass).connect(compressor).connect(makeup).connect(context.destination);
    }

    source.start();
    const rendered = (await context.startRendering()).getChannelData(0);
    // Keep peaks below clipping after the makeup gain and stacked echoes.
    let peak = 0;
    for (const sample of rendered) peak = Math.max(peak, Math.abs(sample));
    if (peak > 0.98) for (let i = 0; i < rendered.length; i++) rendered[i] *= 0.98 / peak;
    return rendered;
}
