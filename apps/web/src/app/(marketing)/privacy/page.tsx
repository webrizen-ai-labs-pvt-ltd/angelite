import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY, pageMetadata } from "@/lib/site";
import { HISTORY_RETENTION_DAYS } from "@/lib/usage";
import { PageIntro } from "../_components/page-intro";
import { Note, Page, Prose, Section } from "../_components/paper";

export const metadata: Metadata = pageMetadata({
    title: "Privacy",
    description: "What Angelite stores, where it's kept and for how long. Audio made on your device never leaves it.",
    path: "/privacy",
});

const SECTIONS = [
    {
        title: "Who we are",
        body: [
            `Angelite is run by ${COMPANY.legalName}, which decides how the information described here is used. Questions or requests about your data can be sent through the Contact page.`,
        ],
    },
    {
        title: "Your account",
        body: ["We store your email address, the display name you choose and your plan, so you can sign in and we can apply your limits."],
    },
    {
        title: "Voices you clone",
        body: [
            "When you save a cloned voice, its recording is kept in private storage that only your account can read, together with your confirmation that you have permission to use it.",
            "Deleting the voice deletes the recording.",
        ],
    },
    {
        title: "Audio made on your device",
        body: [
            "When a voice generates in your browser, your script and the audio never leave your computer. Clips are saved to the folder you choose, or to your browser's own storage.",
            "The voice model downloads from Hugging Face the first time, so Hugging Face sees that download request.",
        ],
    },
    {
        title: "Audio made on our servers",
        body: [
            "Preset voices are generated on servers run by Modal. Your script is sent there to be read aloud and isn't kept by the voice service.",
            `The audio and its text are saved to your history for ${HISTORY_RETENTION_DAYS} days, then deleted automatically. You can delete them sooner from the History page.`,
        ],
    },
    {
        title: "Messages you send us",
        body: ["When you use the Contact page we keep your name, email address and message so we can reply. Only our team can read them."],
    },
    {
        title: "Your choices",
        body: [
            "You can delete cloned voices and history items yourself at any time. To delete your account and everything linked to it, send a request through the Contact page and we'll do it.",
        ],
    },
    {
        title: "No tracking",
        body: ["Angelite uses no advertising, no third-party analytics and no tracking cookies. The only cookies are the ones that keep you signed in."],
    },
];

export default function PrivacyPage() {
    return (
        <>
            <PageIntro title="Your voice stays yours." kicker="Privacy">
                <p>What Angelite stores, where it&rsquo;s kept and for how long, in plain words.</p>
            </PageIntro>
            <Page>
                {SECTIONS.map((section, index) => (
                    <Section
                        key={section.title}
                        number={String(index + 1)}
                        title={section.title}
                        notes={index === 4 ? <Note value={`${HISTORY_RETENTION_DAYS} days`} label="before server audio is deleted" /> : undefined}
                    >
                        <Prose>
                            {section.body.map((paragraph) => (
                                <p key={paragraph}>{paragraph}</p>
                            ))}
                        </Prose>
                    </Section>
                ))}
                <p className="px-3 pt-4 text-[15px] text-ink-muted md:px-10">
                    Questions about your data?{" "}
                    <Link href="/contact" className="font-medium text-ink underline underline-offset-4">
                        Contact us
                    </Link>
                    . See also the{" "}
                    <Link href="/terms" className="font-medium text-ink underline underline-offset-4">
                        Terms of use
                    </Link>
                    .
                </p>
            </Page>
        </>
    );
}
