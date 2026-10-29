import Link from "next/link";
import { STACK } from "./stack-data";

// Ink section, styled after the code block in the brand guidelines: the real stack and its licenses.

export const OpenSourceBand = () => (
    <section className="px-3 py-16 md:px-4 md:py-24">
        <div className="mx-auto grid max-w-[1240px] gap-10 rounded-[32px] bg-ink p-6 text-vellum md:grid-cols-[1fr_1.15fr] md:p-12 lg:gap-16">
            <div className="flex flex-col justify-between gap-10">
                <div className="flex flex-col gap-5">
                    <p className="mkt-fraktur text-[40px] leading-none text-angelite">Open</p>
                    <h2 className="mkt-heading text-[clamp(2rem,4vw,3rem)]">Every model and library is open source</h2>
                    <p className="max-w-md text-[17px] leading-relaxed text-vellum/65">
                        Angelite is release 1 of the open-source program at Webrizen AI Labs. You can read how every sound is made, and run the same models
                        yourself.
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Link href="/open-source" className="rounded-full bg-vellum px-6 py-3 text-[15px] font-medium text-ink transition hover:bg-angelite">
                        See the full stack
                    </Link>
                    <Link
                        href="/about"
                        className="rounded-full px-6 py-3 text-[15px] font-medium text-vellum ring-1 ring-vellum/30 transition ring-inset hover:bg-vellum/10"
                    >
                        About the program
                    </Link>
                </div>
            </div>
            <div className="mkt-data overflow-hidden rounded-[20px] bg-ink-soft text-[13px] ring-1 ring-vellum/10" data-lenis-prevent>
                <div className="flex items-center gap-1.5 border-b border-vellum/10 px-5 py-3">
                    <span className="size-2.5 rounded-full bg-vellum/20" />
                    <span className="size-2.5 rounded-full bg-vellum/20" />
                    <span className="size-2.5 rounded-full bg-vellum/20" />
                    <span className="ml-3 text-vellum/50">angelite / stack</span>
                </div>
                <ul className="flex flex-col gap-2.5 overflow-x-auto px-5 py-5">
                    {STACK.map((item) => (
                        <li key={item.name} className="grid min-w-[440px] grid-cols-[170px_1fr_auto] gap-4 whitespace-nowrap">
                            <span className="text-vellum">{item.name}</span>
                            <span className="text-vellum/45">{item.role}</span>
                            <span className="text-angelite">{item.license}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    </section>
);
