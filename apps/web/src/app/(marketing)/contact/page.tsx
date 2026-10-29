import type { Metadata } from "next";
import { COMPANY, pageMetadata } from "@/lib/site";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { PageIntro } from "../_components/page-intro";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = pageMetadata({
    title: "Contact",
    description: "Questions, feedback or a bug to report? Send the Angelite team a message.",
    path: "/contact",
});

export default async function ContactPage() {
    const user = await getCurrentUser();
    let displayName: string | undefined;
    if (user) {
        const { data } = await (await createClient()).from("profiles").select("display_name").maybeSingle();
        displayName = data?.display_name ?? undefined;
    }

    return (
        <>
            <PageIntro title="Get in touch" kicker="Contact">
                <p>Questions, feedback, a bug, or an idea for the next release. Send a message and a person will read it.</p>
            </PageIntro>
            <div className="mx-auto grid max-w-[1240px] gap-3 px-3 pb-16 md:grid-cols-[1.5fr_1fr] md:px-4 md:pb-24">
                <section className="rounded-[28px] bg-vellum-card p-6 md:p-10" aria-label="Contact form">
                    <ContactForm defaultName={displayName} defaultEmail={user?.email} />
                </section>
                <aside className="flex flex-col gap-3">
                    <div className="flex flex-col gap-3 rounded-[28px] bg-ink p-6 text-vellum md:p-8">
                        <p className="text-[14px] text-vellum/60">Angelite is made by</p>
                        <p className="mkt-heading text-[24px]">{COMPANY.legalName}</p>
                        <a href={COMPANY.url} target="_blank" rel="noreferrer" className="w-max text-[15px] text-angelite underline underline-offset-4">
                            {COMPANY.domain}
                        </a>
                    </div>
                    <div className="flex flex-col gap-3 rounded-[28px] bg-vellum-card p-6 md:p-8">
                        <p className="text-[14px] text-ink-muted">Creator</p>
                        <p className="mkt-heading text-[22px] text-ink">{COMPANY.creator.name}</p>
                        <a
                            href={COMPANY.creator.url}
                            target="_blank"
                            rel="noreferrer"
                            className="w-max text-[15px] text-deep-angelite underline underline-offset-4"
                        >
                            {COMPANY.creator.domain}
                        </a>
                    </div>
                    <div className="rounded-[28px] bg-vellum-card p-6 text-[15px] leading-relaxed text-ink-muted md:p-8">
                        Reporting a voice cloned without permission? Choose &ldquo;Something isn&rsquo;t working&rdquo; and include where you heard it. We treat
                        these first.
                    </div>
                </aside>
            </div>
        </>
    );
}
