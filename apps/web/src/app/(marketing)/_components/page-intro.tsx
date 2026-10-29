import type { ReactNode } from "react";
import { Divider } from "./frame";

/** Centred title block for the secondary pages. */
export const PageIntro = ({ title, kicker, children }: { title: string; kicker: string; children: ReactNode }) => (
    <>
        <header className="mx-auto flex max-w-3xl flex-col items-center px-5 pt-36 pb-14 text-center md:pt-44 md:pb-20">
            <span className="flex items-center gap-2 rounded-full bg-vellum-card py-1 pr-3.5 pl-1 text-[13px] text-ink-muted ring-1 ring-ink/10">
                <img src="/brand/angelite-seal.png" alt="" className="size-6 rounded-full" />
                {kicker}
            </span>
            <h1 className="mkt-display mt-7 text-[clamp(2.75rem,6.5vw,4.75rem)] text-ink">{title}</h1>
            <div className="mt-6 max-w-xl text-[18px] leading-relaxed text-ink-muted">{children}</div>
        </header>
        <Divider wave />
        <div className="h-8 md:h-12" />
    </>
);
