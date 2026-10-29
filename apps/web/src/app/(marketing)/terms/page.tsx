import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY, pageMetadata } from "@/lib/site";
import { HISTORY_RETENTION_DAYS } from "@/lib/usage";
import { PageIntro } from "../_components/page-intro";
import { Page, Prose, Section } from "../_components/paper";

export const metadata: Metadata = pageMetadata({
    title: "Terms of use",
    description: "The terms for using Angelite, including the rules for cloning voices with permission.",
    path: "/terms",
});

const LAST_UPDATED = "November 1, 2026";

const SECTIONS: { title: string; body: string[] }[] = [
    {
        title: "Who we are",
        body: [
            `Angelite is provided by ${COMPANY.legalName} ("Webrizen AI Labs", "we", "us"). By creating an account or using Angelite, you agree to these terms. If you don't agree, please don't use the service.`,
        ],
    },
    {
        title: "Your account",
        body: [
            "You need an account to use the Studio. Keep your password to yourself and tell us if you think someone else has used your account. You must be old enough to agree to these terms where you live.",
        ],
    },
    {
        title: "Cloning voices",
        body: [
            "Only clone a voice that is your own, or one you have clear permission to use. When you save a cloned voice you confirm that permission, and we keep a record of it.",
            "Never use Angelite to impersonate someone, to deceive or defraud anyone, to harass people, or to make content that is illegal where you or your listeners are. We may remove voices and close accounts that break this rule, and we cooperate with valid requests from the people affected.",
        ],
    },
    {
        title: "What you make",
        body: [
            "Your scripts and the audio you generate belong to you. To produce audio on our servers we process your script and your voice recording only as needed to make it, and we keep server-made audio for " +
                `${HISTORY_RETENTION_DAYS} days so it appears in your history. Audio made on your device never reaches us.`,
            "Angelite's voices come from open models with their own licenses, listed on the Open source page. Some require credit when you publish; it's your job to follow them for what you publish.",
        ],
    },
    {
        title: "Plans and limits",
        body: [
            "Angelite is free to use with the limits shown on the Pricing page. Pro is offered by invitation during release 1. We may change plans and limits; if a change affects you materially, we'll tell you before it takes effect.",
        ],
    },
    {
        title: "Availability",
        body: [
            "Angelite is release 1 of an open-source program. We work to keep it running well, but it is provided as is, without guarantees that it will be uninterrupted, error-free, or suitable for a particular purpose. Keep your own copies of anything important.",
        ],
    },
    {
        title: "Liability",
        body: [
            "To the extent the law allows, Webrizen AI Labs is not liable for indirect or consequential losses arising from your use of Angelite, and our total liability for any claim is limited to the amount you paid us for the service in the twelve months before the claim. Nothing here limits rights you have under law that can't be limited.",
        ],
    },
    {
        title: "Ending your use",
        body: [
            "You can stop using Angelite and delete your voices and history at any time. We may suspend or close accounts that break these terms or put other people at risk.",
        ],
    },
    {
        title: "Changes and contact",
        body: [
            "We may update these terms as Angelite grows. The date at the top shows the latest version, and we'll give notice of significant changes. These terms are governed by the laws of the place where Webrizen AI Labs Private Limited is registered.",
        ],
    },
];

export default function TermsPage() {
    return (
        <>
            <PageIntro title="Terms of use" kicker={`Last updated ${LAST_UPDATED}`}>
                <p>The rules for using Angelite, written to be read. The short version: make good things, and only clone voices you have permission to use.</p>
            </PageIntro>
            <Page>
                {SECTIONS.map((section, index) => (
                    <Section key={section.title} number={String(index + 1)} title={section.title}>
                        <Prose>
                            {section.body.map((paragraph) => (
                                <p key={paragraph}>{paragraph}</p>
                            ))}
                            {index === SECTIONS.length - 1 && (
                                <p>
                                    Questions about these terms?{" "}
                                    <Link href="/contact" className="font-medium text-ink underline underline-offset-4">
                                        Contact us
                                    </Link>
                                    .
                                </p>
                            )}
                        </Prose>
                    </Section>
                ))}
            </Page>
        </>
    );
}
