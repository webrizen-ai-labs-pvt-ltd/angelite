import { Download01, Microphone01, Stars02 } from "@untitledui/icons";

// Cloning really is a sequence, so the steps are numbered.
const STEPS = [
    {
        icon: Microphone01,
        title: "Record ten seconds",
        body: "Read anything aloud in a quiet room, or upload a clip you already have.",
        glow: "radial-gradient(circle at 30% 40%, #9aa8e8 0%, transparent 55%), radial-gradient(circle at 75% 70%, #e6e0d3 0%, transparent 60%)",
    },
    {
        icon: Stars02,
        title: "Clone it in your browser",
        body: "The voice engine downloads once, about 146 MB. After that, a new voice takes about a second.",
        glow: "radial-gradient(circle at 60% 35%, #6574c4 0%, transparent 50%), radial-gradient(circle at 25% 80%, #9aa8e8 0%, transparent 55%)",
    },
    {
        icon: Download01,
        title: "Generate anything",
        body: "Write a script, add pauses and an effect, and the clip saves straight to a folder on your computer.",
        glow: "radial-gradient(circle at 70% 60%, #9aa8e8 0%, transparent 55%), radial-gradient(circle at 20% 30%, #6574c4 0%, transparent 40%)",
    },
];

export const Steps = () => (
    <section className="mx-auto max-w-[1240px] px-3 py-16 md:px-4 md:py-24">
        <div className="mb-12 max-w-xl px-2 md:mb-14">
            <h2 className="mkt-heading text-[clamp(2rem,4.4vw,3.25rem)] text-ink">Your voice in three steps</h2>
            <p className="mt-4 text-[18px] leading-relaxed text-ink-muted">No upload queue, no training run. Cloning happens on your own computer.</p>
        </div>
        <ol className="grid gap-3 md:grid-cols-3">
            {STEPS.map((step, index) => (
                <li key={step.title} className="flex flex-col overflow-hidden rounded-[28px] bg-vellum-card">
                    <div className="relative flex h-52 items-center justify-center overflow-hidden bg-vellum-deep">
                        <div className="absolute inset-0 scale-125 blur-2xl" style={{ background: step.glow }} aria-hidden="true" />
                        <span className="relative flex size-20 items-center justify-center rounded-full bg-vellum-card/70 text-ink shadow-lg ring-1 ring-vellum-card backdrop-blur">
                            <step.icon className="size-8" />
                        </span>
                        <span className="mkt-data absolute top-4 left-5 text-[12px] text-ink/60">Step {index + 1}</span>
                    </div>
                    <div className="flex flex-col gap-2 p-6">
                        <h3 className="text-[20px] font-medium text-ink">{step.title}</h3>
                        <p className="text-[15px] leading-relaxed text-ink-muted">{step.body}</p>
                    </div>
                </li>
            ))}
        </ol>
    </section>
);
