"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const TEXT =
    "Angelite reads anything aloud in ten natural voices, and clones yours from ten seconds of audio. It runs on open models, right in your browser, and every clip saves straight to your computer.";

/** A large statement whose words darken from muted to ink as it scrolls through the viewport. */
export const Statement = () => {
    const ref = useRef<HTMLParagraphElement>(null);

    useEffect(() => {
        const words = ref.current?.querySelectorAll("span");
        if (!words?.length) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            gsap.set(words, { opacity: 1 });
            return;
        }
        const tween = gsap.fromTo(
            words,
            { opacity: 0.22 },
            { opacity: 1, stagger: 0.05, ease: "none", scrollTrigger: { trigger: ref.current, start: "top 80%", end: "bottom 45%", scrub: true } },
        );
        return () => {
            tween.scrollTrigger?.kill();
            tween.kill();
        };
    }, []);

    return (
        <section className="px-5 py-28 md:py-40">
            <p ref={ref} className="mkt-heading mx-auto max-w-[980px] text-center text-[clamp(1.75rem,3.6vw,3rem)] leading-[1.25] text-ink">
                {TEXT.split(" ").map((word, index) => (
                    <span key={index} className="inline">
                        {word}{" "}
                    </span>
                ))}
            </p>
        </section>
    );
};
