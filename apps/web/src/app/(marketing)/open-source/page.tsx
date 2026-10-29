import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site";
import { PageIntro } from "../_components/page-intro";
import { Note, Page, Prose, Section } from "../_components/paper";
import { STACK } from "../_components/stack-data";

export const metadata: Metadata = pageMetadata({
    title: "Open source",
    description: "The open models and libraries Angelite is built from, including Kokoro-82M and Pocket TTS, with their licenses.",
    path: "/open-source",
});

const PATHS = [
    ["Preset voices", "Your script goes to Kokoro-82M on CPU servers at Modal. FFmpeg applies the effect and encodes MP3, Opus or WAV."],
    ["Cloned voices", "Pocket TTS runs in your browser through ONNX Runtime Web. The model downloads once from Hugging Face and stays on your device."],
    ["Accounts and history", "Supabase handles sign-in, saved voices and 30 days of server history. Clips made on your device are never uploaded."],
];

export default function OpenSourcePage() {
    return (
        <>
            <PageIntro title="Open models, open code." kicker="Open source">
                <p>Every model that makes a sound in Angelite is open, and so is every library it&rsquo;s built with. Here is the complete list.</p>
            </PageIntro>
            <Page>
                <Section number="1" title="Components" notes={<Note value={String(STACK.length)} label="open-source projects" />}>
                    <div className="overflow-x-auto" data-lenis-prevent>
                        <table className="w-full min-w-[560px] text-left text-[16px]">
                            <thead>
                                <tr className="mkt-rule border-y text-ink-muted">
                                    <th scope="col" className="py-2.5 pr-6 font-normal">
                                        Project
                                    </th>
                                    <th scope="col" className="py-2.5 pr-6 font-normal">
                                        Role in Angelite
                                    </th>
                                    <th scope="col" className="py-2.5 font-normal">
                                        License
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {STACK.map((item) => (
                                    <tr key={item.name} className="mkt-rule border-b">
                                        <td className="py-3 pr-6">
                                            <a href={item.url} target="_blank" rel="noreferrer" className="text-ink underline-offset-4 hover:underline">
                                                {item.name}
                                            </a>
                                        </td>
                                        <td className="py-3 pr-6 text-ink-muted">{item.role}</td>
                                        <td className="mkt-data py-3 text-[13px] text-deep-angelite">{item.license}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Section>

                <Section number="2" title="How a voice is made">
                    <dl className="flex flex-col">
                        {PATHS.map(([title, body]) => (
                            <div key={title} className="mkt-rule grid gap-1 border-b py-4 sm:grid-cols-[220px_1fr] sm:gap-8">
                                <dt className="text-[18px] text-ink">{title}</dt>
                                <dd className="text-[17px] leading-relaxed text-ink-muted">{body}</dd>
                            </div>
                        ))}
                    </dl>
                </Section>

                <Section number="3" title="Credits">
                    <Prose>
                        <p>
                            In-browser cloning uses Kyutai&rsquo;s Pocket TTS (CC BY 4.0) as exported to ONNX by KevinAHM (CC BY 4.0), with a web worker adapted
                            from KevinAHM&rsquo;s pocket-tts-web demo (Apache-2.0).
                        </p>
                        <p>
                            Kokoro-82M is by hexgrad. Chatterbox is by Resemble AI and adds an inaudible Perth watermark to server-cloned audio. Animations on
                            this site use GSAP, free under its standard license.
                        </p>
                    </Prose>
                </Section>
            </Page>
        </>
    );
}
