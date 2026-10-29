"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cx } from "@/utils/cx";

gsap.registerPlugin(ScrollTrigger);

// The page frame: two vertical guide lines run the full length of the site, horizontal dividers cross them with small
// registration marks, and soft gradient shapes drift behind everything at different scroll speeds.

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Vertical guide lines at the edges of the content column. */
export const FrameLines = () => (
    <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-y-0 left-1/2 z-[1] hidden w-[calc(100%-1.5rem)] max-w-[1272px] -translate-x-1/2 border-x border-ink/10 md:block"
    />
);

const Cross = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 11 11" className={cx("absolute top-1/2 size-[11px] -translate-y-1/2 text-ink/40", className)} aria-hidden="true">
        <path d="M5.5 0v11M0 5.5h11" stroke="currentColor" strokeWidth="1" />
    </svg>
);

/**
 * A full-width divider with registration crosses where it meets the guide lines. With `wave`, three sound waves draw
 * themselves along it as it scrolls past, each drifting at its own speed.
 */
export const Divider = ({ wave }: { wave?: boolean }) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!wave || reduced()) return;
        const context = gsap.context(() => {
            gsap.utils.toArray<SVGPathElement>("path[data-wave]").forEach((path, index) => {
                const length = path.getTotalLength();
                gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
                gsap.to(path, {
                    strokeDashoffset: 0,
                    ease: "none",
                    scrollTrigger: { trigger: ref.current, start: "top 95%", end: "top 35%", scrub: true },
                });
                gsap.fromTo(
                    path,
                    { x: -40 * (index + 1) },
                    { x: 40 * (index + 1), ease: "none", scrollTrigger: { trigger: ref.current, start: "top bottom", end: "bottom top", scrub: true } },
                );
            });
        }, ref);
        return () => context.revert();
    }, [wave]);

    return (
        <div ref={ref} className={cx("relative", wave ? "h-28 md:h-36" : "h-px")} aria-hidden="true">
            <div className="absolute inset-x-0 top-1/2 h-px bg-ink/10" />
            <div className="absolute inset-y-0 left-1/2 w-[calc(100%-1.5rem)] max-w-[1272px] -translate-x-1/2">
                <Cross className="-left-[5px] hidden md:block" />
                <Cross className="-right-[5px] hidden md:block" />
                {wave && (
                    <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
                        {[
                            { amp: 26, freq: 3, color: "#6574c4", width: 1.5 },
                            { amp: 16, freq: 5, color: "#9aa8e8", width: 1.25 },
                            { amp: 9, freq: 8, color: "#1f1c24", width: 1 },
                        ].map((line) => (
                            <path
                                key={line.freq}
                                data-wave
                                d={Array.from({ length: 121 }, (_, i) => {
                                    const x = i * 10;
                                    // A wave packet: louder in the middle, quiet at both ends, like a spoken word.
                                    const envelope = Math.sin((i / 120) * Math.PI);
                                    const y = 60 + Math.sin((i / 120) * Math.PI * 2 * line.freq) * line.amp * envelope;
                                    return `${i ? "L" : "M"}${x},${y.toFixed(1)}`;
                                }).join(" ")}
                                fill="none"
                                stroke={line.color}
                                strokeWidth={line.width}
                                strokeOpacity={0.7}
                                vectorEffect="non-scaling-stroke"
                            />
                        ))}
                    </svg>
                )}
            </div>
        </div>
    );
};

/** Soft angelite shapes that slowly change shape and drift at different speeds as the page scrolls. */
export const AmbientBackground = () => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (reduced()) return;
        const context = gsap.context(() => {
            gsap.utils.toArray<HTMLElement>("[data-depth]").forEach((blob) => {
                const depth = Number(blob.dataset.depth);
                gsap.to(blob, { y: () => -window.innerHeight * depth, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: true } });
            });
        }, ref);
        return () => context.revert();
    }, []);

    return (
        <div ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
            <div
                data-depth="0.6"
                className="absolute top-[8%] -left-[12%] size-[46vw] animate-[blob_22s_ease-in-out_infinite] bg-angelite/25 blur-[90px] motion-reduce:animate-none"
            />
            <div
                data-depth="1.2"
                className="absolute top-[55%] -right-[14%] size-[40vw] animate-[blob_28s_ease-in-out_infinite_reverse] bg-deep-angelite/15 blur-[100px] motion-reduce:animate-none"
            />
            <div
                data-depth="1.8"
                className="absolute top-[120%] left-[20%] size-[36vw] animate-[blob_25s_ease-in-out_infinite] bg-angelite/20 blur-[90px] motion-reduce:animate-none"
            />
            <div
                data-depth="2.4"
                className="absolute top-[190%] right-[5%] size-[34vw] animate-[blob_30s_ease-in-out_infinite_reverse] bg-vellum-deep blur-[80px] motion-reduce:animate-none"
            />
        </div>
    );
};
