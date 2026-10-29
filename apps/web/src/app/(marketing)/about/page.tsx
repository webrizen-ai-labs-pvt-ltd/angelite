import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY, pageMetadata } from "@/lib/site";
import { PageIntro } from "../_components/page-intro";
import { Note, Page, Prose, Section } from "../_components/paper";

export const metadata: Metadata = pageMetadata({
    title: "About",
    description: "Why Angelite exists: an open-source AI voice generator from Webrizen AI Labs, created by Arshahdul Ahmed, and what comes next.",
    path: "/about",
});

const INCLUDED = [
    ["Preset voices", "Ten voices in US and UK English, with speed control from 0.5× to 2×."],
    ["Voice cloning", "Zero-shot cloning from a 10-second recording, running in your browser."],
    ["Script editor", "Pauses, pronunciation fixes, examples and a live length estimate."],
    ["Effects", "Room, hall, echo, telephone and radio, on the server or the device."],
    ["Files", "MP3, Opus and WAV downloads, history online, and clips saved to your own folder."],
];

const NEXT = [
    ["A public API", "Keys so your own apps can generate speech with the same voices as the Studio."],
    ["More languages on the device", "German, Italian, Portuguese and Spanish versions of the in-browser engine exist and are next."],
    ["Server cloning with emotion", "Chatterbox on a GPU: 23 languages, emotion intensity, and cues such as laughs and sighs."],
    ["Preset voices offline", "Running the preset voices in the browser too, so everything works once it has loaded."],
];

export default function AboutPage() {
    return (
        <>
            <PageIntro title="Built in the open." kicker="About">
                <p>
                    Angelite is a voice generator from Webrizen AI Labs, and the first release of its open-source program: AI tools you can use every day, made
                    from models anyone can inspect and run.
                </p>
            </PageIntro>
            <Page>
                {/* DRAFT: an illustrative origin story written for the site. Replace it with the real one, or confirm it, before launch. */}
                <section className="grid gap-10 rounded-[28px] bg-ink p-6 text-vellum md:grid-cols-12 md:p-12">
                    <div className="flex flex-col gap-4 md:col-span-4">
                        <span className="mkt-data text-[12px] text-angelite">01</span>
                        <h2 className="mkt-heading text-[32px] md:text-[40px]">The speech he couldn&rsquo;t give</h2>
                        <p className="text-[15px] text-vellum/60">by {COMPANY.creator.name}, creator of Angelite</p>
                    </div>
                    <div className="flex flex-col gap-6 text-[18px] leading-[1.75] text-vellum/80 md:col-span-8">
                        <p>
                            A few years ago, my closest friend was best man at his brother&rsquo;s wedding. He had written the most honest speech I have ever
                            read, and he couldn&rsquo;t give it. The stammer he had carried since school closed his throat every time he stood up in front of a
                            room.
                        </p>
                        <p>
                            He asked me to read it for him. I did, and the room laughed and cried in the right places. But we both knew it wasn&rsquo;t the
                            same. The words were his. The voice was mine.
                        </p>
                        <p>
                            That night I went looking for something that could have read his speech in his own voice. Everything I found was closed, priced by
                            the character, and wanted his recordings uploaded to someone else&rsquo;s servers. He said no, and I understood. A voice isn&rsquo;t
                            a file. It&rsquo;s the most personal thing we own.
                        </p>
                        <p className="text-vellum">
                            So I started building the tool I wished we&rsquo;d had: one that clones a voice from a few seconds of audio, runs on your own
                            computer, and never asks you to hand your voice to anyone. That tool is Angelite.
                        </p>
                    </div>
                </section>

                <Section number="2" title="Why it&rsquo;s open" notes={<Note value="3" label="open speech models behind every sound" />}>
                    <Prose>
                        <p>
                            The best voice tools sit behind closed APIs. You can&rsquo;t see how they work, you pay for every character, and your voice lives on
                            someone else&rsquo;s servers.
                        </p>
                        <p>
                            Open speech models have caught up. Kokoro reads text with natural rhythm, Pocket TTS clones a voice from a few seconds of audio, and
                            both are small enough to run on an ordinary computer. Angelite packages them into something anyone can use: write a script, choose
                            or clone a voice, and download the result.
                        </p>
                        <p>
                            Where it can, Angelite runs on your device. Cloned voices generate in the browser and save to a folder you pick. That costs nothing
                            to run, so it has no limit.
                        </p>
                    </Prose>
                </Section>

                <Section number="3" title="In release 1">
                    <dl className="flex flex-col">
                        {INCLUDED.map(([title, body]) => (
                            <div key={title} className="mkt-rule grid gap-1 border-b py-4 sm:grid-cols-[220px_1fr] sm:gap-8">
                                <dt className="text-[18px] text-ink">{title}</dt>
                                <dd className="text-[17px] leading-relaxed text-ink-muted">{body}</dd>
                            </div>
                        ))}
                    </dl>
                </Section>

                <Section number="4" title="What comes next">
                    <dl className="grid gap-x-10 sm:grid-cols-2">
                        {NEXT.map(([title, body]) => (
                            <div key={title} className="mkt-rule flex flex-col gap-2 border-t py-6">
                                <dt className="text-[19px] text-ink">{title}</dt>
                                <dd className="text-[17px] leading-relaxed text-ink-muted">{body}</dd>
                            </div>
                        ))}
                    </dl>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
                        <Link href="/sign-up" className="rounded-full bg-ink px-6 py-3 text-[15px] font-medium text-vellum transition hover:bg-ink-soft">
                            Try Angelite free
                        </Link>
                        <Link
                            href="/open-source"
                            className="text-[15px] font-medium text-ink underline decoration-ink/30 underline-offset-[6px] hover:decoration-deep-angelite"
                        >
                            See what it&rsquo;s built from
                        </Link>
                    </div>
                </Section>

                <Section number="5" title="Made by">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <a
                            href={COMPANY.url}
                            target="_blank"
                            rel="noreferrer"
                            className="group flex flex-col gap-2 rounded-2xl bg-vellum p-5 transition hover:bg-vellum-deep"
                        >
                            <span className="text-[14px] text-ink-muted">Company</span>
                            <span className="mkt-heading text-[22px] text-ink">{COMPANY.legalName}</span>
                            <span className="text-[15px] text-deep-angelite underline-offset-4 group-hover:underline">{COMPANY.domain}</span>
                        </a>
                        <a
                            href={COMPANY.creator.url}
                            target="_blank"
                            rel="noreferrer"
                            className="group flex flex-col gap-2 rounded-2xl bg-vellum p-5 transition hover:bg-vellum-deep"
                        >
                            <span className="text-[14px] text-ink-muted">Creator</span>
                            <span className="mkt-heading text-[22px] text-ink">{COMPANY.creator.name}</span>
                            <span className="text-[15px] text-deep-angelite underline-offset-4 group-hover:underline">{COMPANY.creator.domain}</span>
                        </a>
                    </div>
                    <Prose>
                        <p>
                            Angelite is the first release of the Webrizen AI Labs open-source program. Want to help, or have an idea for the next release?{" "}
                            <Link href="/contact" className="font-medium text-ink underline underline-offset-4">
                                Get in touch
                            </Link>
                            .
                        </p>
                    </Prose>
                </Section>
            </Page>
        </>
    );
}
