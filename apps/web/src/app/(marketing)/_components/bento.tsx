"use client";

import { useState } from "react";
import { ArrowRight, FolderClosed } from "@untitledui/icons";
import Link from "next/link";
import { SandPlate } from "./sand-plate";

const FILES = ["angelite-my-voice-2026-10-31_09-14-02.wav", "angelite-heart-2026-10-31_09-12-47.wav", "angelite-george-2026-10-30_18-40-11.wav"];

export const Bento = ({ signedIn }: { signedIn: boolean }) => {
    const [mode, setMode] = useState<[number, number]>([2, 5]);

    return (
        <section className="mx-auto max-w-[1240px] px-3 py-16 md:px-4 md:py-24">
            <div className="mx-auto mb-12 max-w-2xl px-2 text-center md:mb-16">
                <h2 className="mkt-heading text-[clamp(2rem,4.4vw,3.25rem)] text-ink">Why people make voices with Angelite</h2>
                <p className="mt-4 text-[18px] leading-relaxed text-ink-muted">Studio-quality speech without a studio, a subscription or a closed model.</p>
            </div>

            <div className="grid gap-3 md:grid-cols-[1.05fr_1fr_1fr] md:grid-rows-[auto_auto]">
                {/* Cloning, with a live Chladni plate. */}
                <article className="flex flex-col gap-6 rounded-[28px] bg-vellum-card p-5 md:row-span-2 md:p-6">
                    <div className="relative overflow-hidden rounded-[20px] bg-vellum">
                        <SandPlate className="aspect-square w-full" onModeChange={setMode} />
                        <span className="mkt-data absolute bottom-3 left-3 rounded-full bg-vellum-card/90 px-2.5 py-1 text-[11px] text-ink-muted">
                            plate mode ({mode[0]}, {mode[1]})
                        </span>
                    </div>
                    <div className="mt-auto flex flex-col gap-5">
                        <h3 className="mkt-heading text-[26px] text-ink md:text-[28px]">
                            Clone any voice from ten seconds of audio, with no training and no waiting.
                        </h3>
                        <p className="text-[15px] leading-relaxed text-ink-muted">
                            Like sand finding the still lines on a vibrating plate, the model settles on what makes a voice yours.
                        </p>
                        <Link
                            href={signedIn ? "/voices" : "/sign-up"}
                            className="flex w-max items-center gap-3 rounded-full bg-ink py-2 pr-2 pl-5 text-[15px] font-medium text-vellum transition hover:bg-ink-soft"
                        >
                            Clone your voice
                            <span className="flex size-8 items-center justify-center rounded-full bg-vellum text-ink">
                                <ArrowRight className="size-4" aria-hidden="true" />
                            </span>
                        </Link>
                    </div>
                </article>

                {/* Privacy */}
                <article className="flex flex-col justify-between gap-8 rounded-[28px] bg-vellum-card p-6 md:p-7">
                    <ul className="flex flex-col gap-2" aria-label="Example files in a chosen folder">
                        {FILES.map((file, index) => (
                            <li
                                key={file}
                                className="mkt-data flex items-center gap-2.5 truncate rounded-xl bg-vellum px-3 py-2.5 text-[12px] text-ink-muted"
                                style={{ opacity: 1 - index * 0.25 }}
                            >
                                <FolderClosed className="size-4 shrink-0 text-deep-angelite" aria-hidden="true" />
                                <span className="truncate">{file}</span>
                            </li>
                        ))}
                    </ul>
                    <h3 className="mkt-heading text-[24px] text-ink">
                        Private by design. <span className="text-ink-muted">Scripts and audio made on your device never leave it.</span>
                    </h3>
                </article>

                {/* Speed */}
                <article className="relative flex flex-col justify-end gap-2 overflow-hidden rounded-[28px] bg-vellum-card p-6 md:p-7">
                    <img src="/brand/angelite-seal.png" alt="" className="absolute -top-6 -right-6 size-40 rotate-12 opacity-95" />
                    <p className="mkt-display mt-28 text-[64px] leading-none text-ink">1.3 s</p>
                    <p className="text-[15px] text-ink-muted">to clone a voice, measured in Chrome on a desktop.</p>
                </article>

                {/* Free */}
                <article className="flex flex-col gap-8 rounded-[28px] bg-ink p-6 text-vellum md:col-span-2 md:flex-row md:items-end md:justify-between md:p-8">
                    <div className="flex max-w-md flex-col gap-4">
                        <h3 className="mkt-heading text-[26px] md:text-[30px]">
                            Free, and unlimited <span className="text-vellum/55">on your own device.</span>
                        </h3>
                        <p className="text-[15px] leading-relaxed text-vellum/65">
                            Cloned voices run in your browser, so they cost nothing to run and have no monthly limit. Preset voices on our servers include
                            10,000 characters a month.
                        </p>
                    </div>
                    <dl className="grid min-w-[240px] gap-3 text-[14px]">
                        <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between">
                                <dt className="text-vellum/65">On your device</dt>
                                <dd>Unlimited</dd>
                            </div>
                            <div className="h-1.5 rounded-full bg-angelite" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between">
                                <dt className="text-vellum/65">On our servers</dt>
                                <dd className="mkt-data">10,000 / mo</dd>
                            </div>
                            <div className="h-1.5 rounded-full bg-vellum/15">
                                <div className="h-full w-1/3 rounded-full bg-vellum/60" />
                            </div>
                        </div>
                        <Link href="/pricing" className="mt-1 text-[14px] font-medium text-vellum underline underline-offset-4">
                            Compare plans
                        </Link>
                    </dl>
                </article>
            </div>
        </section>
    );
};
