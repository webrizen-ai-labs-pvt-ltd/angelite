import type { Metadata } from "next";
import Link from "next/link";
import { PRO_SERVER_TEXT_CHARS } from "@/lib/script";
import { pageMetadata } from "@/lib/site";
import { HISTORY_RETENTION_DAYS } from "@/lib/usage";
import { MAX_TEXT_CHARS } from "@/lib/voices";
import { PageIntro } from "../_components/page-intro";
import { Note, Page, Prose, Section } from "../_components/paper";

export const metadata: Metadata = pageMetadata({
    title: "Pricing",
    description: "Angelite is free to use. Voice cloning and generation on your own device are unlimited; preset voices include 10,000 characters a month.",
    path: "/pricing",
});

const ROWS: { label: string; free: string; pro: string }[] = [
    { label: "Cloning and generation on your device", free: "Unlimited", pro: "Unlimited" },
    { label: "Characters per on-device generation", free: MAX_TEXT_CHARS.toLocaleString(), pro: "No limit" },
    { label: "Preset voices on the servers", free: "10,000 characters a month", pro: "Unlimited" },
    { label: "Characters per server generation", free: MAX_TEXT_CHARS.toLocaleString(), pro: PRO_SERVER_TEXT_CHARS.toLocaleString() },
    { label: "Saved cloned voices", free: "3", pro: "Unlimited" },
    { label: "Online history", free: `${HISTORY_RETENTION_DAYS} days`, pro: `${HISTORY_RETENTION_DAYS} days` },
];

export default function PricingPage() {
    return (
        <>
            <PageIntro title="Free to use." kicker="Pricing">
                <p>Angelite costs nothing to start. Anything that runs on your own device is unlimited, because it costs us nothing to run.</p>
            </PageIntro>
            <Page>
                <Section number="1" title="Plans" notes={<Note value="$0" label="to start, with no card" />}>
                    <div className="mkt-rule grid border-y sm:grid-cols-2">
                        <div className="flex flex-col gap-4 py-8 sm:pr-10">
                            <h3 className="mkt-heading text-[32px] text-ink">Free</h3>
                            <p className="mkt-display text-[52px] leading-none text-ink">$0</p>
                            <p className="text-[17px] leading-relaxed text-ink-muted">
                                For everyone. Unlimited on your device, with a monthly allowance on the servers.
                            </p>
                            <Link
                                href="/sign-up"
                                className="mt-2 w-max rounded-full bg-ink px-6 py-3 text-[15px] font-medium text-vellum transition hover:bg-ink-soft"
                            >
                                Create a free account
                            </Link>
                        </div>
                        <div className="mkt-rule flex flex-col gap-4 border-t py-8 sm:border-t-0 sm:border-l sm:pl-10">
                            <h3 className="mkt-heading text-[32px] text-ink">Pro</h3>
                            <p className="mkt-display text-[52px] leading-none text-ink-muted">Invite only</p>
                            <p className="text-[17px] leading-relaxed text-ink-muted">
                                Higher server limits and unlimited saved voices. Not for sale during release 1; given to people helping us test.
                            </p>
                        </div>
                    </div>
                </Section>

                <Section number="2" title="What each plan includes">
                    <div className="overflow-x-auto" data-lenis-prevent>
                        <table className="w-full min-w-[560px] text-left text-[16px]">
                            <caption className="sr-only">What each plan includes</caption>
                            <thead>
                                <tr className="mkt-rule border-y text-ink-muted">
                                    <th scope="col" className="py-2.5 pr-6 font-normal">
                                        Included
                                    </th>
                                    <th scope="col" className="py-2.5 pr-6 font-normal">
                                        Free
                                    </th>
                                    <th scope="col" className="py-2.5 font-normal">
                                        Pro
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {ROWS.map((row) => (
                                    <tr key={row.label} className="mkt-rule border-b">
                                        <th scope="row" className="py-3 pr-6 font-normal text-ink">
                                            {row.label}
                                        </th>
                                        <td className="mkt-data py-3 pr-6 text-[14px] text-ink-muted">{row.free}</td>
                                        <td className="mkt-data py-3 text-[14px] text-ink-muted">{row.pro}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Prose>
                        <p>
                            Server limits exist because each request uses real computing time. A single server request stops at about five minutes of
                            processing, which is why even Pro has a per-request cap there.
                        </p>
                    </Prose>
                </Section>
            </Page>
        </>
    );
}
